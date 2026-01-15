package com.alqaseer.pwa.telemetry;

import android.content.Context;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;

public class TelemetryQueueStore {
    private final File queueFile;

    public TelemetryQueueStore(Context context) {
        this.queueFile = new File(context.getFilesDir(), "telemetry_queue.jsonl");
    }

    public synchronized void enqueue(JSONObject payload) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(queueFile, true))) {
            writer.write(payload.toString());
            writer.newLine();
        } catch (Exception ignored) {
            // Best-effort queue persistence.
        }
    }

    public synchronized List<JSONObject> readAll() {
        List<JSONObject> items = new ArrayList<>();
        if (!queueFile.exists()) {
            return items;
        }
        try (BufferedReader reader = new BufferedReader(new FileReader(queueFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (!line.isEmpty()) {
                    items.add(new JSONObject(line));
                }
            }
        } catch (Exception ignored) {
            return items;
        }
        return items;
    }

    public synchronized void overwrite(List<JSONObject> payloads) {
        if (payloads.isEmpty()) {
            if (queueFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                queueFile.delete();
            }
            return;
        }
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(queueFile, false))) {
            for (JSONObject payload : payloads) {
                writer.write(payload.toString());
                writer.newLine();
            }
        } catch (Exception ignored) {
            // Best-effort queue persistence.
        }
    }
}
