#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_PROJECT="$PROJECT_ROOT/android"
APK_SOURCE="$ANDROID_PROJECT/app/build/outputs/apk/debug/app-debug.apk"
APK_OUTPUT_DIR="$PROJECT_ROOT/dist/android"
APK_OUTPUT="$APK_OUTPUT_DIR/Renogy-ONE-Vision-demo.apk"

cd "$PROJECT_ROOT"
source "$PROJECT_ROOT/scripts/sync-android.sh"

cd "$ANDROID_PROJECT"
./gradlew assembleDebug

mkdir -p "$APK_OUTPUT_DIR"
cp "$APK_SOURCE" "$APK_OUTPUT"

echo "APK 已生成：$APK_OUTPUT"
