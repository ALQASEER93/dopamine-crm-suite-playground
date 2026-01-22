package com.alqaseer.fieldtracker

import android.app.Application
import com.alqaseer.fieldtracker.worker.TelemetrySyncScheduler

class FieldTrackerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        TelemetrySyncScheduler.schedulePeriodic(this)
    }
}
