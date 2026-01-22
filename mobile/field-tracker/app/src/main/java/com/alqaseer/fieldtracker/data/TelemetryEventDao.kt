package com.alqaseer.fieldtracker.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TelemetryEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: TelemetryEventEntity)

    @Query("SELECT * FROM telemetry_events WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT :limit")
    suspend fun pending(limit: Int): List<TelemetryEventEntity>

    @Query("UPDATE telemetry_events SET synced_at = :syncedAt WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<String>, syncedAt: Long)

    @Query("SELECT COUNT(*) FROM telemetry_events WHERE synced_at IS NULL")
    fun pendingCount(): Flow<Int>
}
