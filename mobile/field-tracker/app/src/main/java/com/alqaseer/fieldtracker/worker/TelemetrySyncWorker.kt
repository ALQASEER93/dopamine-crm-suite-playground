package com.alqaseer.fieldtracker.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.alqaseer.fieldtracker.data.AppPreferences
import com.alqaseer.fieldtracker.data.TelemetryRepository
import com.alqaseer.fieldtracker.network.TelemetryApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.os.Build
import java.time.Instant
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

class TelemetrySyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val prefs = AppPreferences(applicationContext)
        val token = prefs.authToken
        val baseUrl = prefs.apiBaseUrl
        if (token.isBlank() || baseUrl.isBlank()) {
            return Result.failure()
        }

        val api = TelemetryApi(baseUrl, token)
        val repository = TelemetryRepository(applicationContext)

        return withContext(Dispatchers.IO) {
            try {
                val pendingEvents = repository.pendingEventBatch(25)
                val syncedEvents = mutableListOf<String>()
                for (event in pendingEvents) {
                    val payload = JSONObject(event.payloadJson)
                    when (event.type) {
                        "session_start" -> api.postSessionStart(payload)
                        "session_stop" -> api.postSessionStop(payload)
                    }
                    syncedEvents.add(event.id)
                }
                repository.markEventsSynced(syncedEvents)

                val pendingLocations = repository.pendingLocationBatch(50)
                val locationPayloads = pendingLocations.map { location ->
                    val recordedAtIso = formatRecordedAt(location.recordedAt)
                    JSONObject()
                        .put("sessionId", location.sessionId)
                        .put("lat", location.lat)
                        .put("lng", location.lng)
                        .put("accuracy", location.accuracyM)
                        .put("recordedAt", recordedAtIso)
                        .put("deviceId", location.deviceId)
                }
                api.postLocations(locationPayloads)
                repository.markLocationsSynced(pendingLocations.map { it.id })

                Result.success()
            } catch (_error: Exception) {
                Result.retry()
            }
        }
    }

    private fun formatRecordedAt(epochMillis: Long): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Instant.ofEpochMilli(epochMillis).toString()
        } else {
            val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            formatter.timeZone = TimeZone.getTimeZone("UTC")
            formatter.format(Date(epochMillis))
        }
    }
}
