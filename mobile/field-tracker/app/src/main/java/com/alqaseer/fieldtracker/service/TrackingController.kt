package com.alqaseer.fieldtracker.service

import android.content.Context
import android.content.Intent
import android.os.Build
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
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.Date
import java.util.Locale
import java.util.TimeZone
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
            .put("startedAt", nowIso())
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
                .put("stoppedAt", nowIso())

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

    private fun nowIso(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Instant.now().toString()
        } else {
            val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            formatter.timeZone = TimeZone.getTimeZone("UTC")
            formatter.format(Date())
        }
    }
}
