#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_STUDIO_JBR="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

if [[ -z "${JAVA_HOME:-}" ]] || [[ ! -x "${JAVA_HOME:-}/bin/java" ]]; then
  if [[ -x "$ANDROID_STUDIO_JBR/bin/java" ]]; then
    export JAVA_HOME="$ANDROID_STUDIO_JBR"
  else
    echo "未找到可用的 JDK。请安装 Android Studio，或先设置 JAVA_HOME。" >&2
    exit 1
  fi
fi

if [[ -z "${ANDROID_HOME:-}" ]]; then
  DEFAULT_ANDROID_SDK="$HOME/Library/Android/sdk"
  if [[ -d "$DEFAULT_ANDROID_SDK" ]]; then
    export ANDROID_HOME="$DEFAULT_ANDROID_SDK"
  fi
fi

cd "$PROJECT_ROOT"
npm run build
npx cap sync android
