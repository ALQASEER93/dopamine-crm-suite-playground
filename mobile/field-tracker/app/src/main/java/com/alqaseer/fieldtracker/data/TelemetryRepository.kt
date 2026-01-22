package com.alqaseer.fieldtracker.data

import android.content.Context
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class TelemetryRepository(context: Context) {
    private val db = TelemetryDatabase.getInstance(context)
    private val locations = db.locationDao()
    private val events = db.eventDao()

    fun pendingLocationsCount(): Flow<Int> = locations.pendingCount()

    fun pendingEventsCount(): Flow<Int> = events.pendingCount()

    suspend fun enqueueLocation(
        sessionId: String,
        lat: Double,
        lng: Double,
        accuracyM: Double?,
        recordedAt: Long,
        deviceId: String?,
    ) {
        val now = System.currentTimeMillis()
        locations.insert(
            TelemetryLocationEntity(
                id = UUID.randomUUID().toString(),
                sessionId = sessionId,
                lat = lat,
                lng = lng,
                accuracyM = accuracyM,
                recordedAt = recordedAt,
                deviceId = deviceId,
                createdAt = now,
                syncedAt = null,
            ),
        )
    }

    suspend fun enqueueEvent(type: String, payloadJson: String) {
        val now = System.currentTimeMillis()
        events.insert(
            TelemetryEventEntity(
                id = UUID.randomUUID().toString(),
                type = type,
                payloadJson = payloadJson,
                createdAt = now,
                syncedAt = null,
            ),
        )
    }

    suspend fun pendingLocationBatch(limit: Int): List<TelemetryLocationEntity> {
        return locations.pending(limit)
    }

    suspend fun pendingEventBatch(limit: Int): List<TelemetryEventEntity> {
        return events.pending(limit)
    }

    suspend fun markLocationsSynced(ids: List<String>) {
        if (ids.isNotEmpty()) {
            locations.markSynced(ids, System.currentTimeMillis())
        }
    }

    suspend fun markEventsSynced(ids: List<String>) {
        if (ids.isNotEmpty()) {
            events.markSynced(ids, System.currentTimeMillis())
        }
    }
}
