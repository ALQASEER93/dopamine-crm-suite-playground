package com.alqaseer.fieldtracker.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.alqaseer.fieldtracker.data.AppPreferences
import com.alqaseer.fieldtracker.data.TelemetryRepository

@Composable
fun MainScreen(
    prefs: AppPreferences,
    repository: TelemetryRepository,
    permissionsGranted: Boolean,
    onRequestPermissions: () -> Unit,
    onStartTracking: () -> Unit,
    onStopTracking: () -> Unit,
    onSyncNow: () -> Unit,
) {
    val pendingLocations by repository.pendingLocationsCount().collectAsState(initial = 0)
    val pendingEvents by repository.pendingEventsCount().collectAsState(initial = 0)

    var baseUrl by remember { mutableStateOf(prefs.apiBaseUrl) }
    var token by remember { mutableStateOf(prefs.authToken) }
    var isTracking by remember { mutableStateOf(prefs.activeSessionId.isNotBlank()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Field Tracker", style = MaterialTheme.typography.headlineSmall)

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Permissions", style = MaterialTheme.typography.titleMedium)
                Text(if (permissionsGranted) "Location permissions granted" else "Location permissions required")
                Button(onClick = onRequestPermissions) {
                    Text("Request Permissions")
                }
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("API Settings", style = MaterialTheme.typography.titleMedium)
                OutlinedTextField(
                    value = baseUrl,
                    onValueChange = {
                        baseUrl = it
                        prefs.apiBaseUrl = it
                    },
                    label = { Text("API Base URL") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = token,
                    onValueChange = {
                        token = it
                        prefs.authToken = it
                    },
                    label = { Text("JWT Token") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Status", style = MaterialTheme.typography.titleMedium)
                Text(if (isTracking) "Tracking active" else "Tracking stopped")
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = {
                        onStartTracking()
                        isTracking = true
                    }) {
                        Text("Start Tracking")
                    }
                    Button(onClick = {
                        onStopTracking()
                        isTracking = false
                    }) {
                        Text("Stop Tracking")
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text("Offline events queued: $pendingEvents")
                Text("Offline locations queued: $pendingLocations")
                Button(onClick = onSyncNow) {
                    Text("Sync Now")
                }
            }
        }
    }
}
