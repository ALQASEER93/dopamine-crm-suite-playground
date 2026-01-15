package com.alqaseer.pwa;

import android.os.Bundle;

import com.alqaseer.pwa.telemetry.BackgroundLocationPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(BackgroundLocationPlugin.class);
    }
}
