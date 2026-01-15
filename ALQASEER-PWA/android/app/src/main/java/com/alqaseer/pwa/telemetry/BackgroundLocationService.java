package com.alqaseer.pwa.telemetry;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BackgroundLocationService extends Service {
    private static final String TAG = "BackgroundLocationSvc";
    private static final String CHANNEL_ID = "telemetry_location_channel";
    private static final int NOTIFICATION_ID = 2001;
    private static final String PREFS_NAME = BackgroundLocationPlugin.getPrefsName();
    private static final String KEY_AUTH_TOKEN = "auth_token";
    private static final String KEY_API_BASE_URL = "api_base_url";
    private static final String KEY_INTERVAL_SECONDS = "interval_seconds";
    private static final String KEY_SOURCE = "source";
    private static final String EXTRA_AUTH_TOKEN = "auth_token";
    private static final String EXTRA_API_BASE_URL = "api_base_url";
    private static final String EXTRA_INTERVAL_SECONDS = "interval_seconds";
    private static final String EXTRA_SOURCE = "source";

    private static boolean running = false;

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private TelemetryQueueStore queueStore;
    private TelemetryUploader uploader;
    private SharedPreferences prefs;
    private ExecutorService executor;

    public static void start(Context context, int intervalSeconds, String authToken, String apiBaseUrl, String source) {
        Intent intent = new Intent(context, BackgroundLocationService.class);
        if (authToken != null) {
            intent.putExtra(EXTRA_AUTH_TOKEN, authToken);
        }
        if (apiBaseUrl != null) {
            intent.putExtra(EXTRA_API_BASE_URL, apiBaseUrl);
        }
        intent.putExtra(EXTRA_INTERVAL_SECONDS, intervalSeconds);
        if (source != null) {
            intent.putExtra(EXTRA_SOURCE, source);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, BackgroundLocationService.class);
        context.stopService(intent);
    }

    public static boolean isRunning() {
        return running;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
        queueStore = new TelemetryQueueStore(this);
        uploader = new TelemetryUploader();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        executor = Executors.newSingleThreadExecutor();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        updatePreferences(intent);
        startForeground(NOTIFICATION_ID, buildNotification());
        startLocationUpdates();
        running = true;
        if (executor != null) {
            executor.execute(this::flushQueue);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (fusedClient != null && locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
        }
        if (executor != null) {
            executor.shutdownNow();
        }
        running = false;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void updatePreferences(Intent intent) {
        if (intent == null) {
            return;
        }
        SharedPreferences.Editor editor = prefs.edit();
        if (intent.hasExtra(EXTRA_AUTH_TOKEN)) {
            editor.putString(KEY_AUTH_TOKEN, intent.getStringExtra(EXTRA_AUTH_TOKEN));
        }
        if (intent.hasExtra(EXTRA_API_BASE_URL)) {
            editor.putString(KEY_API_BASE_URL, intent.getStringExtra(EXTRA_API_BASE_URL));
        }
        if (intent.hasExtra(EXTRA_INTERVAL_SECONDS)) {
            editor.putInt(KEY_INTERVAL_SECONDS, intent.getIntExtra(EXTRA_INTERVAL_SECONDS, 30));
        }
        if (intent.hasExtra(EXTRA_SOURCE)) {
            editor.putString(KEY_SOURCE, intent.getStringExtra(EXTRA_SOURCE));
        }
        editor.apply();
    }

    private void startLocationUpdates() {
        int intervalSeconds = prefs.getInt(KEY_INTERVAL_SECONDS, 30);
        long intervalMillis = Math.max(intervalSeconds, 10) * 1000L;
        if (locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
        }
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMillis)
            .setMinUpdateIntervalMillis(intervalMillis)
            .setMaxUpdateDelayMillis(intervalMillis * 2)
            .build();
        locationCallback =
            new LocationCallback() {
                @Override
                public void onLocationResult(LocationResult result) {
                    if (result == null) {
                        return;
                    }
                    Location location = result.getLastLocation();
                    if (location != null) {
                        handleLocation(location);
                    }
                }
            };
        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    }

    private void handleLocation(Location location) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("lat", location.getLatitude());
            payload.put("lng", location.getLongitude());
            payload.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : null);
            payload.put("speed", location.hasSpeed() ? location.getSpeed() : null);
            payload.put("bearing", location.hasBearing() ? location.getBearing() : null);
            payload.put("ts", formatTimestamp(location.getTime()));
            payload.put("device_info", DeviceInfoHelper.buildDeviceInfo(this));
            payload.put("source", prefs.getString(KEY_SOURCE, "native_capacitor"));

            if (executor != null) {
                executor.execute(() -> {
                    boolean sent = sendPayload(payload);
                    Log.d(TAG, "Location " + location.getLatitude() + "," + location.getLongitude() + " sent=" + sent);
                    if (!sent) {
                        queueStore.enqueue(payload);
                    }
                });
            }
        } catch (Exception ignored) {
            // Best-effort location handling.
        }
    }

    private boolean sendPayload(JSONObject payload) {
        String baseUrl = prefs.getString(KEY_API_BASE_URL, null);
        String authToken = prefs.getString(KEY_AUTH_TOKEN, null);
        String endpoint = buildEndpoint(baseUrl);
        return uploader.upload(endpoint, authToken, payload);
    }

    private void flushQueue() {
        List<JSONObject> queued = queueStore.readAll();
        if (queued.isEmpty()) {
            return;
        }
        List<JSONObject> remaining = new ArrayList<>();
        for (JSONObject payload : queued) {
            if (!sendPayload(payload)) {
                remaining.add(payload);
            }
        }
        queueStore.overwrite(remaining);
    }

    private String buildEndpoint(String baseUrl) {
        if (baseUrl == null || baseUrl.trim().isEmpty()) {
            return null;
        }
        String trimmed = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        if (trimmed.endsWith("/telemetry/location")) {
            return trimmed;
        }
        return trimmed + "/telemetry/location";
    }

    private String formatTimestamp(long millis) {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formatter.format(new Date(millis));
    }

    private Notification buildNotification() {
        ensureChannel();
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ALQASEER Tracking")
            .setContentText("Background location tracking is active.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Background Location",
            NotificationManager.IMPORTANCE_LOW
        );
        manager.createNotificationChannel(channel);
    }
}
