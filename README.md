# Messages Image Cleaner

A small Electron + React Mac app for browsing files inside local Messages and User Notifications cache folders, then moving selected files to Trash.

## Run As A Mac Window

```sh
npm run mac
```

That opens the visual app window with file previews, file locations, largest-first sorting, type filters, selection, Finder reveal, and Trash actions.

For development with live reload:

```sh
npm run mac:dev
```

To create a clickable Mac app bundle:

```sh
npm run package:mac
```

The packaged app will be created under `release/`. Open `Messages Image Cleaner.app` from there.

## macOS Permissions

Messages and notification cache folders are protected by macOS privacy controls. If the app finds nothing or reports permission errors, grant Full Disk Access to the app you are running it from:

System Settings -> Privacy & Security -> Full Disk Access

For the packaged app, add `Messages Image Cleaner.app`. During development, that usually means granting access to Terminal, iTerm, or the Codex app.

## Scanned Folders

- `~/Library/Messages/Attachments`
- `~/Library/Messages/Caches`
- `~/Library/Group Containers/group.com.apple.UserNotifications/Library/UserNotifications/Remote/default`

Deletion uses macOS Trash through Electron, so files are not permanently removed immediately.
