package com.alqaseer.fieldtracker.service

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.alqaseer.fieldtracker.BuildConfig
import com.alqaseer.fieldtracker.data.AppPreferences
import com.alqaseer.fieldtracker.data.TelemetryRepository
import com.alqaseer.fieldtracker.worker.TelemetrySyncScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

object TrackingController {
    private const val ACTION_START = "com.alqaseer.fieldtracker.action.START"
    private const val ACTION_STOP = "com.alqaseer.fieldtracker.action.STOP"

    fun startTracking(context: Context) {
        val prefs = AppPreferences(context)
        val sessionId = UUID.randomUUID().toString()
        prefs.activeSessionId = sessionId

        val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val payload = JSONObject()
            .put("sessionId", sessionId)
            .put("startedAt", Instant.now().toString())
            .put("deviceId", deviceId)
            .put("appVersion", BuildConfig.VERSION_NAME)
            .put("platform", "android")

        val repository = TelemetryRepository(context)
        CoroutineScope(Dispatchers.IO).launch {
            repository.enqueueEvent("session_start", payload.toString())
            TelemetrySyncScheduler.enqueueOnce(context)
        }

        val intent = Intent(context, TrackingService::class.java).setAction(ACTION_START)
        ContextCompat.startForegroundService(context, intent)
    }

    fun stopTracking(context: Context) {
        val prefs = AppPreferences(context)
        val sessionId = prefs.activeSessionId
        if (sessionId.isNotBlank()) {
            val payload = JSONObject()
                .put("sessionId", sessionId)
                .put("stoppedAt", Instant.now().toString())

            val repository = TelemetryRepository(context)
            CoroutineScope(Dispatchers.IO).launch {
                repository.enqueueEvent("session_stop", payload.toString())
                TelemetrySyncScheduler.enqueueOnce(context)
            }
        }

        prefs.clearSession()
        val intent = Intent(context, TrackingService::class.java).setAction(ACTION_STOP)
        context.startService(intent)
    }
}
