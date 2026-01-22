package com.alqaseer.fieldtracker.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import com.alqaseer.fieldtracker.R
import com.alqaseer.fieldtracker.data.AppPreferences
import com.alqaseer.fieldtracker.data.TelemetryRepository
import com.alqaseer.fieldtracker.worker.TelemetrySyncScheduler
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TrackingService : Service() {
    private lateinit var fusedClient: FusedLocationProviderClient
    private val repository by lazy { TelemetryRepository(this) }
    private val prefs by lazy { AppPreferences(this) }
    private val serviceScope = CoroutineScope(Dispatchers.IO)

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val sessionId = prefs.activeSessionId
            if (sessionId.isBlank()) {
                return
            }

            result.locations.forEach { location ->
                handleLocation(sessionId, location)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startLocationUpdates()
            ACTION_STOP -> stopLocationUpdates()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopLocationUpdates()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15_000L)
            .setMinUpdateIntervalMillis(5_000L)
            .build()
        fusedClient.requestLocationUpdates(request, locationCallback, mainLooper)
    }

    private fun stopLocationUpdates() {
        fusedClient.removeLocationUpdates(locationCallback)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun handleLocation(sessionId: String, location: Location) {
        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
        serviceScope.launch {
            repository.enqueueLocation(
                sessionId = sessionId,
                lat = location.latitude,
                lng = location.longitude,
                accuracyM = location.accuracy.toDouble(),
                recordedAt = location.time,
                deviceId = deviceId,
            )
            TelemetrySyncScheduler.enqueueOnce(this@TrackingService)
        }
    }

    private fun buildNotification(): Notification {
        val channelId = "field_tracker"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Field Tracker",
                NotificationManager.IMPORTANCE_LOW,
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        return Notification.Builder(this, channelId)
            .setContentTitle("Tracking active")
            .setContentText("Background GPS reporting is running.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val ACTION_START = "com.alqaseer.fieldtracker.action.START"
        private const val ACTION_STOP = "com.alqaseer.fieldtracker.action.STOP"
        private const val NOTIFICATION_ID = 42
    }
}
