# Offline Sync Roadmap

This rebuild moves Listy toward independent PC and Android data with Bluetooth sync.

## Phase 1 - PC Sync Foundation

- Add stable UUIDs for profiles and items.
- Add local device identity.
- Replace hard item deletes with Bin soft deletes.
- Keep tiny tombstone records after Bin cleanup so future devices do not resurrect deleted items.
- Add sync change records for creates, edits, deletes, restores, and purges.
- Add Settings controls for Bin, Sync History, old Bin cleanup, and database compaction.

## Phase 2 - Android Offline App

- Rebuild Android as a native app with its own SQLite database.
- Mirror the PC schema: profiles, items, devices, sync changes, Bin, and tombstones.
- Keep product adding/editing available offline, with best-effort scraping when Android has internet access.
- Add local Settings, Bin, Sync History, and storage cleanup.

## Phase 3 - File Sync Test Transport

- Done: Android and PC can export/import full sync bundles.
- Sync bundles include device identity, profiles, items, Bin/tombstone state, and recent sync history.
- Imports merge by stable UUID and newest update timestamp.
- Acknowledgement-based pruning still belongs with Bluetooth transport.

## Phase 4 - Bluetooth Sync

- Done: Android can advertise a temporary Bluetooth sync service from Settings.
- Done: the PC app can connect over Web Bluetooth and exchange the same sync bundles.
- Next: add a short verification code before trusting a new phone.
- Next: add resumable chunk acknowledgements for very large bundles.
- Next: record successful peer acknowledgements so old change logs can be compacted more aggressively.

## Cleanup Rules

- Bin keeps full deleted item details for 30 days by default.
- Cleanup clears old Bin item details but leaves a tombstone.
- Sync changes keep 90 days by default until acknowledgement-based pruning is added.
- Technical logs should rotate separately from the sync change table.
