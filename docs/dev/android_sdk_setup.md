# Android SDK Setup

SDK location stays external to the repo.

## Required Paths (Windows)
- ANDROID_HOME=D:\Android\Sdk
- ANDROID_SDK_ROOT=D:\Android\Sdk (optional; deprecated but supported)

## Android Studio
- Settings > Appearance & Behavior > System Settings > Android SDK
- SDK Location: D:\Android\Sdk

## Repo Policy
- Do not place SDK files inside the repo.
- Only commit Android wrapper source (Gradle files, app/src, manifests).
