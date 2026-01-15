package com.alqaseer.pwa.telemetry;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;

import org.json.JSONObject;

public class DeviceInfoHelper {
    public static String buildDeviceInfo(Context context) {
        try {
            JSONObject info = new JSONObject();
            info.put("manufacturer", Build.MANUFACTURER);
            info.put("model", Build.MODEL);
            info.put("brand", Build.BRAND);
            info.put("sdk", Build.VERSION.SDK_INT);
            info.put("os_version", Build.VERSION.RELEASE);
            info.put("platform", "android");
            String versionName = "unknown";
            try {
                PackageInfo pkg = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
                versionName = pkg.versionName;
            } catch (Exception ignored) {
                // Ignore package lookup failures.
            }
            info.put("app_version", versionName);
            return info.toString();
        } catch (Exception ignored) {
            return "{\"platform\":\"android\"}";
        }
    }
}
