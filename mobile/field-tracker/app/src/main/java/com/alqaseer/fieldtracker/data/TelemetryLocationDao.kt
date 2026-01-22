package com.alqaseer.fieldtracker.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TelemetryLocationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(location: TelemetryLocationEntity)

    @Query("SELECT * FROM telemetry_locations WHERE synced_at IS NULL ORDER BY recorded_at ASC LIMIT :limit")
    suspend fun pending(limit: Int): List<TelemetryLocationEntity>

    @Query("UPDATE telemetry_locations SET synced_at = :syncedAt WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<String>, syncedAt: Long)

    @Query("SELECT COUNT(*) FROM telemetry_locations WHERE synced_at IS NULL")
    fun pendingCount(): Flow<Int>
}
