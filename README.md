# Listy

Listy is a local-first app for shopping, games, movies, shows, and locations. It supports universal profiles, status tabs, fuzzy tag filtering, duplicate detection, link scraping, manual editing, Bin restore, sync bundles, and Bluetooth sync between the Windows and Android apps.

## What Is Safe To Upload

This repository is source only. It should not contain personal databases, logs, installers, APKs, build output, debug signing keys, or downloaded tool caches.

The app creates a fresh database for each user after install.

## Local Web App

Requirements:

- Node.js 24 or newer

Run:

```powershell
npm install
npm start
```

Then open:

```text
http://localhost:4173
```

Local web data is stored at:

```text
data/shopping-list.sqlite
```

That folder is ignored by Git and should not be uploaded.

## Windows App

Requirements:

- Windows
- Node.js 24 or newer
- Visual Studio Build Tools with `csc.exe`, or the .NET SDK

Build:

```powershell
npm install
npm run dist:win
```

The Windows installer is created in:

```text
dist/
```

The build script compiles `desktop/native-bluetooth-sync.cs` into the local helper binary needed by Bluetooth sync. The compiled `.exe` is ignored by Git.

The installed Windows app stores data in the existing Windows app-data folder used by earlier Listy/TrackList builds, so old local PC data is preserved on your machine. That data is not bundled into new installers.

## Android App

Requirements:

- Android Studio or Android command-line build tools
- Android SDK 35
- JDK 17 or newer

Open the `android` folder in Android Studio and build a debug APK, or use Gradle if it is installed:

```powershell
cd android
gradle assembleDebug
```

Android build output is ignored by Git. Do not commit APKs or debug keystores.

## GitHub Pages Web Version

The hosted web version is browser-only. It does not use the Node/SQLite server and it does not include your private data.

Build the GitHub Pages files:

```powershell
npm run build:web
```

This writes the static site into:

```text
docs/
```

To host it on GitHub Pages:

1. Push this repository to GitHub.
2. Open the repository settings.
3. Go to Pages.
4. Choose "Deploy from a branch".
5. Select the main branch and the `/docs` folder.

Each visitor gets their own browser-local Listy data. Product scraping in the hosted version is limited because static pages cannot read many shop pages directly; users can still edit title, image, price, description, tags, and status manually.

## Release Files

Safe installer files can be kept locally in:

```text
release/
```

That folder is ignored by Git. Upload installers and APKs to GitHub Releases, not into the source repository.

This clean copy currently includes local release files for:

```text
release/Listy Setup 1.6.9.exe
release/Listy Android 1.6.9.apk
```

## Sync

Windows and Android keep independent local databases. Export/import sync bundles can merge changes between them, and Bluetooth sync can exchange those bundles directly when both devices are nearby.

The offline sync plan is tracked in:

```text
docs/offline-sync-roadmap.md
```
