package com.alqaseer.fieldtracker.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.alqaseer.fieldtracker.BuildConfig

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("field_tracker_prefs", Context.MODE_PRIVATE)

    var apiBaseUrl: String
        get() = prefs.getString(KEY_BASE_URL, BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL
        set(value) = prefs.edit { putString(KEY_BASE_URL, value.trim()) }

    var authToken: String
        get() = prefs.getString(KEY_AUTH_TOKEN, "") ?: ""
        set(value) = prefs.edit { putString(KEY_AUTH_TOKEN, value.trim()) }

    var activeSessionId: String
        get() = prefs.getString(KEY_SESSION_ID, "") ?: ""
        set(value) = prefs.edit { putString(KEY_SESSION_ID, value) }

    fun clearSession() {
        prefs.edit { remove(KEY_SESSION_ID) }
    }

    companion object {
        private const val KEY_BASE_URL = "api_base_url"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_SESSION_ID = "session_id"
    }
}
