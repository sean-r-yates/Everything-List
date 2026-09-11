# EveryList

EveryList is a local-first app for keeping track of things you want, might buy, already bought, ordered, watched, played, or plan to visit. It started as a shopping list, then grew into one place for shopping, games, movies, shows, and locations.

The main idea is simple: each profile has its own lists, colours, tags, statuses, Bin, and item history, while the app itself stays private and useful offline.

## What It Does

EveryList can save items with a title, image, price or cost, link, description, notes, tags, priority, and status. Shopping items can also keep order details such as carrier, tracking link, estimated delivery, and order state.

The app includes fuzzy search and tag filtering, so tags like `tech`, `Tech`, or close matches are easier to find. It also checks for likely duplicates before saving a new link.

Deleted items go to the Bin first, where they can be restored or cleaned later. This keeps accidental deletes recoverable without letting the database grow forever.

## Versions

There are three ways to use EveryList:

- **Windows app:** the full desktop app with local SQLite storage, release installer, and Bluetooth sync support.
- **Android app:** a native offline phone app with its own local database, share-to-EveryList support, and sync tools.
- **Hosted web app:** a GitHub Pages version that runs fully in the browser and starts clean for each visitor.

The hosted web app does not include anyone's private database. Each browser keeps its own data locally.

## Data And Privacy

The Windows and Android apps store data on the device. The source repo does not include personal databases, logs, build folders, debug keys, old installers, or phone/PC data.

The hosted GitHub Pages version stores data in the visitor's browser. It does not have a server database and does not write back to GitHub.

## Sync

EveryList supports sync bundles for moving changes between devices. The Windows and Android apps also include Bluetooth sync support, which exchanges those bundles when both devices are nearby.

The sync model is local-first: each device can work independently, then merge changes later.

## Web Version

The GitHub Pages build lives in the `docs` folder. The repository also includes a root `index.html` fallback, so Pages can work whether GitHub is publishing from `/docs` or from the repository root.

If GitHub Pages shows this README instead of the app, Pages is probably publishing the root before the root `index.html` change was pushed, or it is set to the wrong folder. The best setup is:

- Branch: `main`
- Folder: `/docs`

Your Pages URL should then open the EveryList app directly.

## Building From Source

The local web app runs with Node.js 24 or newer. The Windows app uses Electron and builds an NSIS installer. The Android app can be opened and built from the `android` folder with Android Studio or compatible Android command-line tools.

The Windows Bluetooth helper is source-controlled as `desktop/native-bluetooth-sync.cs`. The compiled helper is generated locally during packaging and is not committed.

## Releases

Installers and APKs belong in GitHub Releases, not in the source repo. The local `release` folder is ignored by Git so release files can sit beside the source without being committed by accident.
