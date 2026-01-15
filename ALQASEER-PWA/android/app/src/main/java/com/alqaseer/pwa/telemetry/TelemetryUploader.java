package com.alqaseer.pwa.telemetry;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import android.util.Log;

import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

public class TelemetryUploader {
    private static final String TAG = "TelemetryUploader";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    private final OkHttpClient client;

    public TelemetryUploader() {
        client = new OkHttpClient.Builder()
            .callTimeout(15, TimeUnit.SECONDS)
            .connectTimeout(10, TimeUnit.SECONDS)
            .build();
    }

    public boolean upload(String endpointUrl, String authToken, JSONObject payload) {
        if (endpointUrl == null || endpointUrl.trim().isEmpty()) {
            Log.w(TAG, "Missing telemetry endpoint URL.");
            return false;
        }
        try {
            RequestBody body = RequestBody.create(payload.toString(), JSON);
            Request.Builder builder = new Request.Builder()
                .url(endpointUrl)
                .post(body);
            if (authToken != null && !authToken.isEmpty()) {
                builder.addHeader("Authorization", "Bearer " + authToken);
            }
            Request request = builder.build();
            try (Response response = client.newCall(request).execute()) {
                boolean ok = response.isSuccessful();
                Log.d(TAG, "POST " + endpointUrl + " -> " + response.code());
                return ok;
            }
        } catch (Exception ex) {
            Log.w(TAG, "Upload failed", ex);
            return false;
        }
    }
}
