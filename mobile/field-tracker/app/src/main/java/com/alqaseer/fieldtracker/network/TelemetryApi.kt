package com.alqaseer.fieldtracker.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class TelemetryApi(private val baseUrl: String, private val token: String) {
    private val client = OkHttpClient()
    private val jsonMedia = "application/json".toMediaType()

    fun postSessionStart(payload: JSONObject) {
        postJson("$baseUrl/telemetry/session/start", payload)
    }

    fun postSessionStop(payload: JSONObject) {
        postJson("$baseUrl/telemetry/session/stop", payload)
    }

    fun postLocations(payloads: List<JSONObject>) {
        payloads.forEach { payload ->
            postJson("$baseUrl/telemetry/location", payload)
        }
    }

    private fun postJson(url: String, payload: JSONObject) {
        val request = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $token")
            .post(payload.toString().toRequestBody(jsonMedia))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val body = response.body?.string() ?: ""
                throw IllegalStateException("Request failed: ${response.code} $body")
            }
        }
    }
}
