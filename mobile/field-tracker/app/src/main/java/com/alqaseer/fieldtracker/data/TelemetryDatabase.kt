package com.alqaseer.fieldtracker.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [TelemetryLocationEntity::class, TelemetryEventEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class TelemetryDatabase : RoomDatabase() {
    abstract fun locationDao(): TelemetryLocationDao
    abstract fun eventDao(): TelemetryEventDao

    companion object {
        @Volatile
        private var instance: TelemetryDatabase? = null

        fun getInstance(context: Context): TelemetryDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    TelemetryDatabase::class.java,
                    "telemetry.db",
                ).build().also { instance = it }
            }
        }
    }
}
