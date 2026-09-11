# GitHub Upload Notes

This folder is a clean source-only copy of EveryList for GitHub.

Excluded from this copy:

- Local app databases and test databases.
- Server logs and browser/test cache folders.
- Built installers, APKs, unpacked desktop builds, release files, and Android build output.
- `node_modules` and downloaded SDK/tool cache folders.
- Debug signing keys and other local build credentials.

The real working app folder is still `outputs/shopping-list-local-site`. Upload this `listy-github-safe` folder instead.

Installer files in `release/` are ignored by Git. Attach them to a GitHub Release if you want people to download them.

Before publishing, review any new files you add with:

```powershell
git status
rg -n --hidden -g "!node_modules/**" -g "!android/app/build/**" -g "!dist/**" "C:\\Users\\|api[_-]?key|secret|password|BEGIN .*PRIVATE|ghp_|sk-"
```

The Windows Bluetooth helper binary is intentionally ignored. Its source is in `desktop/native-bluetooth-sync.cs`, and `npm run dist:win` rebuilds the helper before packaging.
