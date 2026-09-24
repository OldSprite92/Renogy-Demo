# Android APK 构建说明

## 目标设备

- Samsung Galaxy Tab S9 FE+
- 12.4 英寸，2560 × 1600（16:10）
- 应用锁定横屏并采用沉浸式全屏展示

## 一键生成可安装 APK

```bash
npm ci
npm run android:apk
```

生成文件：

```text
dist/android/Renogy-ONE-Vision-demo.apk
```

构建脚本会依次完成 Next.js 静态导出、Capacitor 资源同步和 Android Debug APK 编译。在 macOS 上如果没有全局 JDK，会自动使用 Android Studio 自带的 JDK。

## 安装到平板

在平板上开启“开发者选项”和“USB 调试”，通过 USB 连接后执行：

```bash
~/Library/Android/sdk/platform-tools/adb install -r dist/android/Renogy-ONE-Vision-demo.apk
```

也可以把 APK 发送到平板，在系统文件管理器中点击安装；首次侧载时需要允许对应应用“安装未知应用”。

## Android Studio

```bash
npm run android:open
```

应用包名为 `com.renogy.onevision.demo`，最低支持 Android 7（API 24），当前目标 SDK 为 Android 16（API 36）。网页资源随 APK 一起安装，核心演示无需网络连接或本地服务器。

当前一键产物使用 Android Debug 签名，适合现场侧载演示。如果后续需要上架应用商店或长期分发，再配置独立的 Release keystore。
