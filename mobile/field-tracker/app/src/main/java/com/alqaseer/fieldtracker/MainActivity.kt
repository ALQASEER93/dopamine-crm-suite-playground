package com.alqaseer.fieldtracker

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import com.alqaseer.fieldtracker.data.AppPreferences
import com.alqaseer.fieldtracker.data.TelemetryRepository
import com.alqaseer.fieldtracker.service.TrackingController
import androidx.compose.material3.MaterialTheme
import com.alqaseer.fieldtracker.ui.MainScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val prefs = remember { AppPreferences(this) }
            val repository = remember { TelemetryRepository(this) }
            val permissionsGranted = remember { mutableStateOf(false) }

            val requestLauncher = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.RequestMultiplePermissions(),
            ) { result ->
                permissionsGranted.value = result.values.all { it }
            }

            val permissionRequester = rememberUpdatedState {
                val permissions = mutableListOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_BACKGROUND_LOCATION,
                    Manifest.permission.FOREGROUND_SERVICE,
                    Manifest.permission.FOREGROUND_SERVICE_LOCATION,
                )
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    permissions.add(Manifest.permission.POST_NOTIFICATIONS)
                }
                requestLauncher.launch(permissions.toTypedArray())
            }

            MaterialTheme {
                MainScreen(
                    prefs = prefs,
                    repository = repository,
                    permissionsGranted = permissionsGranted.value,
                    onRequestPermissions = { permissionRequester.value.invoke() },
                    onStartTracking = { TrackingController.startTracking(this) },
                    onStopTracking = { TrackingController.stopTracking(this) },
                    onSyncNow = { com.alqaseer.fieldtracker.worker.TelemetrySyncScheduler.enqueueOnce(this) },
                )
            }
        }
    }
}
