package com.alqaseer.pwa.telemetry;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }, alias = "background"),
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class BackgroundLocationPlugin extends Plugin {
    private static final String PREFS_NAME = "telemetry_prefs";
    private static final String KEY_AUTH_TOKEN = "auth_token";
    private static final String KEY_API_BASE_URL = "api_base_url";
    private static final String KEY_INTERVAL_SECONDS = "interval_seconds";

    private SharedPreferences prefs;

    @Override
    public void load() {
        prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void configure(PluginCall call) {
        String authToken = call.getString("authToken");
        String apiBaseUrl = call.getString("apiBaseUrl");
        Integer intervalSeconds = call.getInt("intervalSeconds");

        SharedPreferences.Editor editor = prefs.edit();
        if (authToken != null) {
            editor.putString(KEY_AUTH_TOKEN, authToken);
        }
        if (apiBaseUrl != null) {
            editor.putString(KEY_API_BASE_URL, apiBaseUrl);
        }
        if (intervalSeconds != null && intervalSeconds > 0) {
            editor.putInt(KEY_INTERVAL_SECONDS, intervalSeconds);
        }
        editor.apply();
        call.resolve();
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "permissionsCallback");
            return;
        }
        int intervalSeconds = call.getInt("intervalSeconds", prefs.getInt(KEY_INTERVAL_SECONDS, 30));
        String authToken = call.getString("authToken", prefs.getString(KEY_AUTH_TOKEN, null));
        String apiBaseUrl = call.getString("apiBaseUrl", prefs.getString(KEY_API_BASE_URL, null));
        String source = call.getString("source", "native_capacitor");
        BackgroundLocationService.start(getContext(), intervalSeconds, authToken, apiBaseUrl, source);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        BackgroundLocationService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject payload = new JSObject();
        payload.put("running", BackgroundLocationService.isRunning());
        call.resolve(payload);
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Location permission denied.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("background") != PermissionState.GRANTED) {
            call.reject("Background location permission denied.");
            return;
        }
        start(call);
    }

    @Override
    public boolean hasRequiredPermissions() {
        boolean hasLocation = getPermissionState("location") == PermissionState.GRANTED;
        if (!hasLocation) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return getPermissionState("background") == PermissionState.GRANTED;
        }
        return true;
    }

    @NonNull
    public static String getPrefsName() {
        return PREFS_NAME;
    }
}
