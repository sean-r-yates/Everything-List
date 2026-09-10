package local.shoppinglist.android;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;

final class ShoppingStore extends SQLiteOpenHelper {
    private static final String DB_NAME = "shopping-list-offline.db";
    private static final int DB_VERSION = 4;
    private static final int BIN_RETENTION_DAYS = 30;
    private static final int SYNC_LOG_RETENTION_DAYS = 90;
    private final Context context;

    ShoppingStore(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
        this.context = context.getApplicationContext();
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE profiles (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "uuid TEXT NOT NULL UNIQUE," +
            "name TEXT NOT NULL," +
            "accent TEXT NOT NULL DEFAULT '#b89d6b'," +
            "avatar_url TEXT," +
            "sort_order INTEGER NOT NULL DEFAULT 0," +
            "version INTEGER NOT NULL DEFAULT 1," +
            "deleted_at TEXT," +
            "deleted_by_device_id TEXT," +
            "created_at TEXT NOT NULL," +
            "updated_at TEXT NOT NULL" +
            ")");

        db.execSQL("CREATE TABLE items (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "uuid TEXT NOT NULL UNIQUE," +
            "profile_id INTEGER NOT NULL," +
            "list_type TEXT NOT NULL DEFAULT 'shopping'," +
            "url TEXT," +
            "source_domain TEXT," +
            "title TEXT NOT NULL," +
            "description TEXT," +
            "image_url TEXT," +
            "price_amount REAL," +
            "currency TEXT NOT NULL DEFAULT 'EUR'," +
            "status TEXT NOT NULL DEFAULT 'wanted'," +
            "tags TEXT NOT NULL DEFAULT ''," +
            "notes TEXT," +
            "priority INTEGER NOT NULL DEFAULT 0," +
            "order_status TEXT NOT NULL DEFAULT ''," +
            "carrier TEXT," +
            "tracking_number TEXT," +
            "tracking_url TEXT," +
            "ordered_at TEXT," +
            "estimated_delivery TEXT," +
            "order_notes TEXT," +
            "version INTEGER NOT NULL DEFAULT 1," +
            "deleted_at TEXT," +
            "deleted_by_device_id TEXT," +
            "purged_at TEXT," +
            "created_at TEXT NOT NULL," +
            "updated_at TEXT NOT NULL" +
            ")");

        db.execSQL("CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
        db.execSQL("CREATE TABLE devices (" +
            "id TEXT PRIMARY KEY," +
            "name TEXT NOT NULL," +
            "platform TEXT NOT NULL," +
            "trusted INTEGER NOT NULL DEFAULT 1," +
            "last_seen_at TEXT," +
            "created_at TEXT NOT NULL" +
            ")");
        db.execSQL("CREATE TABLE sync_changes (" +
            "id TEXT PRIMARY KEY," +
            "device_id TEXT NOT NULL," +
            "entity_type TEXT NOT NULL," +
            "entity_uuid TEXT NOT NULL," +
            "operation TEXT NOT NULL," +
            "summary TEXT NOT NULL," +
            "payload TEXT NOT NULL DEFAULT '{}'," +
            "created_at TEXT NOT NULL" +
            ")");
        db.execSQL("CREATE INDEX idx_items_profile_deleted ON items(profile_id, deleted_at, purged_at)");
        db.execSQL("CREATE INDEX idx_items_profile_type_deleted ON items(profile_id, list_type, deleted_at)");
        db.execSQL("CREATE INDEX idx_sync_changes_created ON sync_changes(created_at)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE profiles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
            seedProfileOrder(db);
        }
        if (oldVersion < 3) {
            db.execSQL("ALTER TABLE profiles ADD COLUMN deleted_by_device_id TEXT");
        }
        if (oldVersion < 4) {
            db.execSQL("ALTER TABLE items ADD COLUMN list_type TEXT NOT NULL DEFAULT 'shopping'");
            db.execSQL("CREATE INDEX IF NOT EXISTS idx_items_profile_type_deleted ON items(profile_id, list_type, deleted_at)");
        }
    }

    void ensureSeeded() {
        SQLiteDatabase db = getWritableDatabase();
        setMetaIfMissing(db, "local_device_id", UUID.randomUUID().toString());
        setMetaIfMissing(db, "bin_retention_days", String.valueOf(BIN_RETENTION_DAYS));
        setMetaIfMissing(db, "sync_log_retention_days", String.valueOf(SYNC_LOG_RETENTION_DAYS));

        String deviceId = localDeviceId();
        ContentValues device = new ContentValues();
        device.put("id", deviceId);
        device.put("name", android.os.Build.MODEL == null ? "Android phone" : android.os.Build.MODEL);
        device.put("platform", "android");
        device.put("trusted", 1);
        device.put("last_seen_at", now());
        device.put("created_at", now());
        db.insertWithOnConflict("devices", null, device, SQLiteDatabase.CONFLICT_REPLACE);

        try (Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL", null)) {
            if (cursor.moveToFirst() && cursor.getInt(0) == 0) {
                Profile profile = new Profile();
                profile.uuid = UUID.randomUUID().toString();
                profile.name = "Me";
                profile.accent = "#b89d6b";
                insertProfile(profile);
            }
        }
    }

    List<Profile> profiles() {
        List<Profile> profiles = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT * FROM profiles WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC, id ASC", null)) {
            while (cursor.moveToNext()) {
                profiles.add(profileFrom(cursor));
            }
        }
        return profiles;
    }

    Profile getProfile(long id) {
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT * FROM profiles WHERE id = ? AND deleted_at IS NULL", new String[]{String.valueOf(id)})) {
            if (cursor.moveToFirst()) return profileFrom(cursor);
        }
        return null;
    }

    Profile profileByUuid(String uuid) {
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT * FROM profiles WHERE uuid = ?", new String[]{safe(uuid)})) {
            if (cursor.moveToFirst()) return profileFrom(cursor);
        }
        return null;
    }

    long insertProfile(Profile profile) {
        String time = now();
        ContentValues values = new ContentValues();
        values.put("uuid", profile.uuid == null ? UUID.randomUUID().toString() : profile.uuid);
        values.put("name", clean(profile.name, "New profile"));
        values.put("accent", empty(profile.accent) ? "#b89d6b" : profile.accent);
        values.put("avatar_url", safe(profile.avatarUrl));
        values.put("sort_order", nextProfileOrder());
        values.put("version", 1);
        values.put("created_at", time);
        values.put("updated_at", time);
        long id = getWritableDatabase().insert("profiles", null, values);
        Profile created = getProfile(id);
        if (created != null) {
            recordChange("profile", created.uuid, "create", "Created profile " + created.name, "{}");
        }
        return id;
    }

    void updateProfile(Profile profile) {
        Profile before = getProfile(profile.id);
        if (before == null) return;
        ContentValues values = new ContentValues();
        values.put("name", clean(profile.name, "New profile"));
        values.put("accent", empty(profile.accent) ? "#b89d6b" : profile.accent);
        values.put("avatar_url", safe(profile.avatarUrl));
        values.put("version", before.version + 1);
        values.put("updated_at", now());
        getWritableDatabase().update("profiles", values, "id = ? AND deleted_at IS NULL", new String[]{String.valueOf(profile.id)});
        Profile updated = getProfile(profile.id);
        if (updated != null) {
            recordChange("profile", updated.uuid, "update", "Updated profile " + updated.name, "{}");
        }
    }

    void reorderProfiles(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) return;
        List<Profile> existing = profiles();
        java.util.Map<Long, Profile> byId = new java.util.LinkedHashMap<>();
        for (Profile profile : existing) {
            byId.put(profile.id, profile);
        }

        List<Profile> changed = new ArrayList<>();
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            int sortOrder = 0;
            String time = now();
            for (Long id : orderedIds) {
                Profile profile = byId.get(id);
                if (profile == null) continue;
                if (profile.sortOrder != sortOrder) {
                    ContentValues values = new ContentValues();
                    values.put("sort_order", sortOrder);
                    values.put("version", profile.version + 1);
                    values.put("updated_at", time);
                    db.update("profiles", values, "id = ? AND deleted_at IS NULL", new String[]{String.valueOf(id)});
                    profile.sortOrder = sortOrder;
                    profile.version += 1;
                    changed.add(profile);
                }
                sortOrder++;
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }

        for (Profile profile : changed) {
            recordChange("profile", profile.uuid, "update", "Reordered profile " + profile.name, "{}");
        }
    }

    boolean deleteProfile(long id) {
        if (activeProfileCount() <= 1) return false;
        Profile profile = getProfile(id);
        if (profile == null) return false;
        String time = now();
        ContentValues values = new ContentValues();
        values.put("deleted_at", time);
        values.put("deleted_by_device_id", localDeviceId());
        values.put("version", profile.version + 1);
        values.put("updated_at", time);
        getWritableDatabase().update("profiles", values, "id = ? AND deleted_at IS NULL", new String[]{String.valueOf(id)});
        recordChange("profile", profile.uuid, "delete", "Deleted profile " + profile.name, "{}");
        return true;
    }

    int activeProfileCount() {
        return count("SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL");
    }

    List<Item> items(long profileId, String listType, String status, String search) {
        List<Item> items = new ArrayList<>();
        List<String> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT * FROM items WHERE profile_id = ? AND list_type = ? AND deleted_at IS NULL");
        args.add(String.valueOf(profileId));
        args.add(cleanListType(listType));
        if (!"all".equals(status)) {
            sql.append(" AND status = ?");
            args.add(status);
        }
        String needle = safe(search).trim().toLowerCase(Locale.ROOT);
        if (!needle.isEmpty()) {
            sql.append(" AND (" +
                "lower(title) LIKE ? OR lower(tags) LIKE ? OR lower(source_domain) LIKE ? OR " +
                "lower(url) LIKE ? OR lower(description) LIKE ? OR lower(notes) LIKE ? OR " +
                "lower(currency) LIKE ? OR lower(status) LIKE ? OR lower(order_status) LIKE ? OR " +
                "lower(carrier) LIKE ? OR lower(tracking_number) LIKE ? OR lower(tracking_url) LIKE ? OR " +
                "lower(order_notes) LIKE ?" +
                ")");
            String pattern = "%" + needle + "%";
            for (int i = 0; i < 13; i++) {
                args.add(pattern);
            }
        }
        sql.append(" ORDER BY created_at DESC, id DESC");

        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery(sql.toString(), args.toArray(new String[0]))) {
            while (cursor.moveToNext()) {
                items.add(itemFrom(cursor));
            }
        }
        return items;
    }

    List<Item> binItems() {
        List<Item> items = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery(
            "SELECT items.*, profiles.name AS profile_name FROM items LEFT JOIN profiles ON profiles.id = items.profile_id WHERE items.deleted_at IS NOT NULL AND items.purged_at IS NULL ORDER BY items.deleted_at DESC, items.id DESC",
            null
        )) {
            while (cursor.moveToNext()) {
                items.add(itemFrom(cursor));
            }
        }
        return items;
    }

    long saveItem(Item item) {
        if (item.id > 0) {
            updateItem(item);
            return item.id;
        }
        return insertItem(item);
    }

    long insertItem(Item item) {
        String time = now();
        ContentValues values = valuesForItem(item);
        values.put("uuid", item.uuid == null ? UUID.randomUUID().toString() : item.uuid);
        values.put("version", 1);
        values.put("created_at", time);
        values.put("updated_at", time);
        long id = getWritableDatabase().insert("items", null, values);
        Item created = item(id);
        recordChange("item", created.uuid, "create", "Added " + created.title, "{}");
        return id;
    }

    void updateItem(Item item) {
        Item before = item(item.id);
        if (before == null) return;
        ContentValues values = valuesForItem(item);
        values.put("version", before.version + 1);
        values.put("updated_at", now());
        getWritableDatabase().update("items", values, "id = ? AND deleted_at IS NULL", new String[]{String.valueOf(item.id)});
        Item updated = item(item.id);
        recordChange("item", updated.uuid, "update", "Updated " + updated.title, "{}");
    }

    Item item(long id) {
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT * FROM items WHERE id = ? AND deleted_at IS NULL", new String[]{String.valueOf(id)})) {
            if (cursor.moveToFirst()) return itemFrom(cursor);
        }
        return null;
    }

    List<Item> duplicateItems(long profileId, String listType, String url, String title, long excludeId) {
        String targetUrl = comparableUrl(url);
        String targetTitle = comparableTitle(title);
        List<Item> matches = new ArrayList<>();
        if (targetUrl.isEmpty() && targetTitle.isEmpty()) return matches;

        for (Item item : items(profileId, cleanListType(listType), "all", "")) {
            if (item.id == excludeId) continue;
            if (duplicateMatch(item, targetUrl, targetTitle)) {
                matches.add(item);
                if (matches.size() >= 5) break;
            }
        }
        return matches;
    }

    private boolean duplicateMatch(Item item, String targetUrl, String targetTitle) {
        String itemUrl = comparableUrl(item.url);
        if (!targetUrl.isEmpty() && !itemUrl.isEmpty() && targetUrl.equals(itemUrl)) {
            return true;
        }

        String itemTitle = comparableTitle(item.title);
        if (targetTitle.isEmpty() || itemTitle.isEmpty()) {
            return false;
        }
        return targetTitle.equals(itemTitle) || titleOverlapScore(targetTitle, itemTitle) >= 0.82;
    }

    private double titleOverlapScore(String left, String right) {
        Set<String> leftTokens = titleTokens(left);
        Set<String> rightTokens = titleTokens(right);
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) return 0;

        int overlap = 0;
        for (String token : leftTokens) {
            if (rightTokens.contains(token)) overlap++;
        }
        return (double) overlap / (double) Math.min(leftTokens.size(), rightTokens.size());
    }

    private Set<String> titleTokens(String value) {
        Set<String> tokens = new HashSet<>();
        for (String token : safe(value).split("\\s+")) {
            if (token.length() > 2) tokens.add(token);
        }
        return tokens;
    }

    private String comparableTitle(String value) {
        return safe(value)
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^\\p{L}\\p{N}]+", " ")
            .trim();
    }

    private String comparableUrl(String value) {
        String text = safe(value).toLowerCase(Locale.ROOT).trim();
        if (text.isEmpty()) return "";

        int hash = text.indexOf('#');
        if (hash >= 0) text = text.substring(0, hash);
        text = text.replaceFirst("^https?://", "").replaceFirst("^www\\.", "");

        String base = text;
        String query = "";
        int queryStart = text.indexOf('?');
        if (queryStart >= 0) {
            base = text.substring(0, queryStart);
            query = text.substring(queryStart + 1);
        }
        base = base.replaceAll("/+$", "");

        List<String> kept = new ArrayList<>();
        if (!query.isEmpty()) {
            for (String part : query.split("&")) {
                String key = part.split("=", 2)[0].toLowerCase(Locale.ROOT);
                if (!key.startsWith("utm_") &&
                    !"fbclid".equals(key) &&
                    !"gclid".equals(key) &&
                    !"igshid".equals(key) &&
                    !"mc_cid".equals(key) &&
                    !"mc_eid".equals(key) &&
                    !"ref".equals(key) &&
                    !"tag".equals(key) &&
                    !"ascsubtag".equals(key) &&
                    !"linkcode".equals(key) &&
                    !"camp".equals(key) &&
                    !"creative".equals(key)) {
                    kept.add(part);
                }
            }
        }

        StringBuilder result = new StringBuilder(base);
        for (int i = 0; i < kept.size(); i++) {
            result.append(i == 0 ? "?" : "&").append(kept.get(i));
        }
        return result.toString();
    }

    Item itemByUuid(String uuid) {
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery(
            "SELECT items.*, profiles.uuid AS profile_uuid FROM items LEFT JOIN profiles ON profiles.id = items.profile_id WHERE items.uuid = ?",
            new String[]{safe(uuid)}
        )) {
            if (cursor.moveToFirst()) return itemFrom(cursor);
        }
        return null;
    }

    void deleteItem(long id) {
        Item item = item(id);
        if (item == null) return;
        String time = now();
        ContentValues values = new ContentValues();
        values.put("deleted_at", time);
        values.put("deleted_by_device_id", localDeviceId());
        values.put("version", item.version + 1);
        values.put("updated_at", time);
        getWritableDatabase().update("items", values, "id = ? AND deleted_at IS NULL", new String[]{String.valueOf(id)});
        recordChange("item", item.uuid, "delete", "Moved " + item.title + " to Bin", "{}");
    }

    void restoreItem(long id) {
        Item deleted = deletedItem(id);
        if (deleted == null) return;
        ContentValues values = new ContentValues();
        values.putNull("deleted_at");
        values.putNull("deleted_by_device_id");
        values.putNull("purged_at");
        values.put("version", deleted.version + 1);
        values.put("updated_at", now());
        getWritableDatabase().update("items", values, "id = ?", new String[]{String.valueOf(id)});
        recordChange("item", deleted.uuid, "restore", "Restored " + deleted.title, "{}");
    }

    void purgeItem(long id) {
        Item deleted = deletedItem(id);
        if (deleted == null) return;
        String time = now();
        ContentValues values = new ContentValues();
        values.putNull("url");
        values.putNull("source_domain");
        values.putNull("description");
        values.putNull("image_url");
        values.putNull("price_amount");
        values.put("tags", "");
        values.putNull("notes");
        values.put("order_status", "");
        values.putNull("carrier");
        values.putNull("tracking_number");
        values.putNull("tracking_url");
        values.putNull("ordered_at");
        values.putNull("estimated_delivery");
        values.putNull("order_notes");
        values.put("purged_at", time);
        values.put("version", deleted.version + 1);
        values.put("updated_at", time);
        getWritableDatabase().update("items", values, "id = ? AND deleted_at IS NOT NULL", new String[]{String.valueOf(id)});
        recordChange("item", deleted.uuid, "purge", "Permanently cleared " + deleted.title, "{}");
    }

    Item deletedItem(long id) {
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery(
            "SELECT * FROM items WHERE id = ? AND deleted_at IS NOT NULL AND purged_at IS NULL",
            new String[]{String.valueOf(id)}
        )) {
            if (cursor.moveToFirst()) return itemFrom(cursor);
        }
        return null;
    }

    int cleanupOldBin() {
        String cutoff = daysAgo(BIN_RETENTION_DAYS);
        List<Item> old = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery(
            "SELECT * FROM items WHERE deleted_at IS NOT NULL AND purged_at IS NULL AND deleted_at < ?",
            new String[]{cutoff}
        )) {
            while (cursor.moveToNext()) old.add(itemFrom(cursor));
        }
        for (Item item : old) purgeItem(item.id);
        pruneSyncChanges();
        return old.size();
    }

    List<Change> syncHistory() {
        List<Change> changes = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT * FROM sync_changes ORDER BY created_at DESC LIMIT 100", null)) {
            while (cursor.moveToNext()) {
                Change change = new Change();
                change.id = text(cursor, "id");
                change.operation = text(cursor, "operation");
                change.summary = text(cursor, "summary");
                change.createdAt = text(cursor, "created_at");
                changes.add(change);
            }
        }
        return changes;
    }

    StorageStats storageStats() {
        StorageStats stats = new StorageStats();
        File dbFile = context.getDatabasePath(DB_NAME);
        stats.databaseBytes = dbFile.exists() ? dbFile.length() : 0;
        stats.binCount = count("SELECT COUNT(*) FROM items WHERE deleted_at IS NOT NULL AND purged_at IS NULL");
        stats.tombstoneCount = count("SELECT COUNT(*) FROM items WHERE deleted_at IS NOT NULL AND purged_at IS NOT NULL");
        stats.syncChangeCount = count("SELECT COUNT(*) FROM sync_changes");
        return stats;
    }

    void compact() {
        pruneSyncChanges();
        SQLiteDatabase db = getWritableDatabase();
        db.execSQL("VACUUM");
    }

    String exportSyncBundle() throws JSONException {
        JSONObject bundle = new JSONObject();
        bundle.put("format", "shoppinglist.sync.v1");
        bundle.put("bundleId", UUID.randomUUID().toString());
        bundle.put("exportedAt", now());

        JSONObject device = new JSONObject();
        device.put("id", localDeviceId());
        device.put("name", android.os.Build.MODEL == null ? "Android phone" : android.os.Build.MODEL);
        device.put("platform", "android");
        bundle.put("device", device);

        JSONArray profileRows = new JSONArray();
        for (Profile profile : allProfilesForSync()) {
            profileRows.put(profileToJson(profile));
        }
        bundle.put("profiles", profileRows);

        JSONArray itemRows = new JSONArray();
        for (Item item : allItemsForSync()) {
            itemRows.put(itemToJson(item));
        }
        bundle.put("items", itemRows);

        JSONArray changeRows = new JSONArray();
        for (Change change : syncHistory()) {
            JSONObject row = new JSONObject();
            row.put("id", change.id);
            row.put("operation", change.operation);
            row.put("summary", change.summary);
            row.put("createdAt", change.createdAt);
            changeRows.put(row);
        }
        bundle.put("changes", changeRows);
        return bundle.toString(2);
    }

    SyncImportResult importSyncBundle(String json) throws JSONException {
        JSONObject bundle = new JSONObject(json);
        if (!"shoppinglist.sync.v1".equals(bundle.optString("format"))) {
            throw new JSONException("Unsupported sync bundle.");
        }

        JSONObject device = bundle.optJSONObject("device");
        registerRemoteDevice(device);

        SyncImportResult result = new SyncImportResult();
        result.remoteDeviceId = device == null ? "" : safe(device.optString("id"));
        result.remoteDeviceName = device == null ? "another device" : clean(device.optString("name"), "another device");

        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            Map<String, Long> importedProfileIds = new HashMap<>();
            JSONArray profileRows = bundle.optJSONArray("profiles");
            if (profileRows != null) {
                for (int i = 0; i < profileRows.length(); i++) {
                    importProfile(profileRows.getJSONObject(i), result, importedProfileIds);
                }
            }

            Map<String, Long> profileIds = profileUuidToLocalId();
            profileIds.putAll(importedProfileIds);
            JSONArray itemRows = bundle.optJSONArray("items");
            if (itemRows != null) {
                for (int i = 0; i < itemRows.length(); i++) {
                    importItem(itemRows.getJSONObject(i), profileIds, result);
                }
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }

        recordChange(
            "sync",
            bundle.optString("bundleId", UUID.randomUUID().toString()),
            "import",
            "Imported sync bundle from " + result.remoteDeviceName,
            "{}"
        );
        return result;
    }

    private List<Profile> allProfilesForSync() {
        List<Profile> rows = new ArrayList<>();
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT * FROM profiles ORDER BY sort_order ASC, created_at ASC, id ASC",
            null
        )) {
            while (cursor.moveToNext()) rows.add(profileFrom(cursor));
        }
        return rows;
    }

    private List<Item> allItemsForSync() {
        List<Item> rows = new ArrayList<>();
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT items.*, profiles.uuid AS profile_uuid FROM items LEFT JOIN profiles ON profiles.id = items.profile_id ORDER BY items.updated_at ASC, items.id ASC",
            null
        )) {
            while (cursor.moveToNext()) rows.add(itemFrom(cursor));
        }
        return rows;
    }

    private JSONObject profileToJson(Profile profile) throws JSONException {
        JSONObject row = new JSONObject();
        row.put("uuid", profile.uuid);
        row.put("name", profile.name);
        row.put("accent", profile.accent);
        row.put("avatarUrl", profile.avatarUrl);
        row.put("sortOrder", profile.sortOrder);
        row.put("version", profile.version);
        row.put("deletedAt", profile.deletedAt);
        row.put("deletedByDeviceId", profile.deletedByDeviceId);
        row.put("createdAt", profile.createdAt);
        row.put("updatedAt", profile.updatedAt);
        return row;
    }

    private JSONObject itemToJson(Item item) throws JSONException {
        JSONObject row = new JSONObject();
        row.put("uuid", item.uuid);
        row.put("profileUuid", item.profileUuid);
        row.put("listType", cleanListType(item.listType));
        row.put("url", item.url);
        row.put("sourceDomain", item.sourceDomain);
        row.put("title", item.title);
        row.put("description", item.description);
        row.put("imageUrl", item.imageUrl);
        if (item.priceAmount == null) row.put("priceAmount", JSONObject.NULL);
        else row.put("priceAmount", item.priceAmount);
        row.put("currency", item.currency);
        row.put("status", item.status);
        row.put("tags", tagsToJson(item.tags));
        row.put("notes", item.notes);
        row.put("priority", item.priority);
        row.put("orderStatus", item.orderStatus);
        row.put("carrier", item.carrier);
        row.put("trackingNumber", item.trackingNumber);
        row.put("trackingUrl", item.trackingUrl);
        row.put("orderedAt", item.orderedAt);
        row.put("estimatedDelivery", item.estimatedDelivery);
        row.put("orderNotes", item.orderNotes);
        row.put("version", item.version);
        row.put("deletedAt", item.deletedAt);
        row.put("deletedByDeviceId", item.deletedByDeviceId);
        row.put("purgedAt", item.purgedAt);
        row.put("createdAt", item.createdAt);
        row.put("updatedAt", item.updatedAt);
        return row;
    }

    private void importProfile(JSONObject row, SyncImportResult result, Map<String, Long> importedProfileIds) {
        String uuid = safe(row.optString("uuid"));
        if (uuid.isEmpty()) {
            result.skipped++;
            return;
        }
        String profileName = clean(row.optString("name"), "New profile");
        Profile localByUuid = profileByUuid(uuid);
        Profile nameMatch = profileByName(normalizedProfileName(profileName), localByUuid == null ? -1 : localByUuid.id);
        Profile local = localByUuid;
        if (localByUuid != null && nameMatch != null && localByUuid.id != nameMatch.id) {
            mergeDuplicateProfile(nameMatch.id, localByUuid.id);
            local = nameMatch;
            result.profilesUpdated++;
        } else if (localByUuid == null && empty(row.optString("deletedAt")) && nameMatch != null) {
            local = nameMatch;
        }

        ContentValues values = syncProfileValues(row, uuid);
        if (local == null) {
            long id = getWritableDatabase().insert("profiles", null, values);
            importedProfileIds.put(uuid, id);
            result.profilesAdded++;
            return;
        }
        importedProfileIds.put(uuid, local.id);
        if (incomingWins(row.optString("updatedAt"), row.optLong("version", 1), local.updatedAt, local.version)) {
            getWritableDatabase().update("profiles", values, "id = ?", new String[]{String.valueOf(local.id)});
            result.profilesUpdated++;
        }
    }

    private Profile profileByName(String normalizedName, long excludedId) {
        if (normalizedName.isEmpty()) return null;
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT * FROM profiles WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC, id ASC", null)) {
            while (cursor.moveToNext()) {
                Profile profile = profileFrom(cursor);
                if (profile.id != excludedId && normalizedProfileName(profile.name).equals(normalizedName)) {
                    return profile;
                }
            }
        }
        return null;
    }

    private void mergeDuplicateProfile(long primaryId, long duplicateId) {
        if (primaryId == duplicateId) return;
        SQLiteDatabase db = getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put("profile_id", primaryId);
        db.update("items", values, "profile_id = ?", new String[]{String.valueOf(duplicateId)});
        db.delete("profiles", "id = ?", new String[]{String.valueOf(duplicateId)});
    }

    private void importItem(JSONObject row, Map<String, Long> profileIds, SyncImportResult result) {
        String uuid = safe(row.optString("uuid"));
        String profileUuid = safe(row.optString("profileUuid"));
        Long localProfileId = profileIds.get(profileUuid);
        if (uuid.isEmpty() || localProfileId == null) {
            result.skipped++;
            return;
        }
        Item local = itemByUuid(uuid);
        ContentValues values = syncItemValues(row, uuid, localProfileId);
        if (local == null) {
            getWritableDatabase().insert("items", null, values);
            result.itemsAdded++;
            return;
        }
        if (incomingWins(row.optString("updatedAt"), row.optLong("version", 1), local.updatedAt, local.version)) {
            getWritableDatabase().update("items", values, "id = ?", new String[]{String.valueOf(local.id)});
            result.itemsUpdated++;
        }
    }

    private ContentValues syncProfileValues(JSONObject row, String uuid) {
        String createdAt = syncDate(row.optString("createdAt"), now());
        String updatedAt = syncDate(row.optString("updatedAt"), createdAt);
        ContentValues values = new ContentValues();
        values.put("uuid", uuid);
        values.put("name", clean(row.optString("name"), "New profile"));
        values.put("accent", cleanColor(row.optString("accent"), "#b89d6b"));
        putNullable(values, "avatar_url", row.optString("avatarUrl"));
        values.put("sort_order", row.optInt("sortOrder", nextProfileOrder()));
        values.put("version", Math.max(1, row.optLong("version", 1)));
        putNullable(values, "deleted_at", row.optString("deletedAt"));
        putNullable(values, "deleted_by_device_id", row.optString("deletedByDeviceId"));
        values.put("created_at", createdAt);
        values.put("updated_at", updatedAt);
        return values;
    }

    private ContentValues syncItemValues(JSONObject row, String uuid, long profileId) {
        String createdAt = syncDate(row.optString("createdAt"), now());
        String updatedAt = syncDate(row.optString("updatedAt"), createdAt);
        ContentValues values = new ContentValues();
        values.put("uuid", uuid);
        values.put("profile_id", profileId);
        String listType = cleanListType(row.optString("listType"));
        values.put("list_type", listType);
        values.put("url", safe(row.optString("url")));
        values.put("source_domain", safe(row.optString("sourceDomain")));
        values.put("title", clean(row.optString("title"), "Untitled item"));
        values.put("description", safe(row.optString("description")));
        values.put("image_url", safe(row.optString("imageUrl")));
        Object price = row.opt("priceAmount");
        if (price == null || price == JSONObject.NULL || String.valueOf(price).trim().isEmpty()) values.putNull("price_amount");
        else values.put("price_amount", row.optDouble("priceAmount"));
        values.put("currency", cleanCurrency(row.optString("currency"), "EUR"));
        values.put("status", cleanStatus(row.optString("status"), listType));
        values.put("tags", joinTags(row));
        values.put("notes", safe(row.optString("notes")));
        values.put("priority", Math.max(0, Math.min(5, row.optInt("priority", 0))));
        values.put("order_status", safe(row.optString("orderStatus")));
        values.put("carrier", safe(row.optString("carrier")));
        values.put("tracking_number", safe(row.optString("trackingNumber")));
        values.put("tracking_url", safe(row.optString("trackingUrl")));
        values.put("ordered_at", safe(row.optString("orderedAt")));
        values.put("estimated_delivery", safe(row.optString("estimatedDelivery")));
        values.put("order_notes", safe(row.optString("orderNotes")));
        values.put("version", Math.max(1, row.optLong("version", 1)));
        putNullable(values, "deleted_at", row.optString("deletedAt"));
        putNullable(values, "deleted_by_device_id", row.optString("deletedByDeviceId"));
        putNullable(values, "purged_at", row.optString("purgedAt"));
        values.put("created_at", createdAt);
        values.put("updated_at", updatedAt);
        return values;
    }

    private Map<String, Long> profileUuidToLocalId() {
        Map<String, Long> ids = new HashMap<>();
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT id, uuid FROM profiles", null)) {
            while (cursor.moveToNext()) {
                ids.put(cursor.getString(1), cursor.getLong(0));
            }
        }
        return ids;
    }

    private void registerRemoteDevice(JSONObject device) {
        if (device == null) return;
        String id = safe(device.optString("id"));
        if (id.isEmpty() || id.equals(localDeviceId())) return;
        ContentValues values = new ContentValues();
        values.put("id", id);
        values.put("name", clean(device.optString("name"), "Linked device"));
        values.put("platform", clean(device.optString("platform"), "unknown"));
        values.put("trusted", 1);
        values.put("last_seen_at", now());
        values.put("created_at", now());
        getWritableDatabase().insertWithOnConflict("devices", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    private boolean incomingWins(String incomingUpdatedAt, long incomingVersion, String localUpdatedAt, long localVersion) {
        long incomingTime = timestamp(incomingUpdatedAt);
        long localTime = timestamp(localUpdatedAt);
        if (incomingTime > 0 && localTime > 0 && incomingTime != localTime) {
            return incomingTime > localTime;
        }
        return incomingVersion > localVersion;
    }

    private JSONArray tagsToJson(String value) {
        JSONArray tags = new JSONArray();
        for (String tag : splitTags(value)) {
            tags.put(tag);
        }
        return tags;
    }

    private String joinTags(JSONObject row) {
        JSONArray tags = row.optJSONArray("tags");
        if (tags == null) {
            return safe(row.optString("tags"));
        }
        List<String> values = new ArrayList<>();
        for (int i = 0; i < tags.length(); i++) {
            String tag = safe(tags.optString(i));
            if (!tag.isEmpty()) values.add(tag);
        }
        return android.text.TextUtils.join(", ", values);
    }

    private List<String> splitTags(String value) {
        List<String> tags = new ArrayList<>();
        String cleaned = safe(value);
        if (cleaned.isEmpty()) return tags;
        if (cleaned.startsWith("[")) {
            try {
                JSONArray json = new JSONArray(cleaned);
                for (int i = 0; i < json.length(); i++) {
                    String tag = safe(json.optString(i));
                    if (!tag.isEmpty()) tags.add(tag);
                }
                return tags;
            } catch (JSONException ignored) {
                // Fall through to the text splitter.
            }
        }
        String[] parts = cleaned.replace("#", " ").split(cleaned.contains(",") || cleaned.contains(";") ? "[,;]" : "\\s+");
        for (String part : parts) {
            String tag = safe(part);
            if (!tag.isEmpty()) tags.add(tag);
        }
        return tags;
    }

    private void putNullable(ContentValues values, String key, String value) {
        String text = safe(value);
        if (text.isEmpty()) values.putNull(key);
        else values.put(key, text);
    }

    private String syncDate(String value, String fallback) {
        String text = safe(value);
        return text.isEmpty() ? fallback : text;
    }

    private long timestamp(String value) {
        String text = safe(value);
        if (text.isEmpty()) return 0;
        String[] patterns = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd HH:mm:ss"
        };
        for (String pattern : patterns) {
            try {
                SimpleDateFormat format = new SimpleDateFormat(pattern, Locale.US);
                format.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date date = format.parse(text);
                if (date != null) return date.getTime();
            } catch (Exception ignored) {
            }
        }
        return 0;
    }

    private String cleanColor(String value, String fallback) {
        String text = safe(value);
        return text.matches("^#[0-9a-fA-F]{6}$") ? text : fallback;
    }

    private String cleanCurrency(String value, String fallback) {
        String text = safe(value).toUpperCase(Locale.ROOT);
        return text.matches("^[A-Z]{3}$") ? text : fallback;
    }

    private String cleanListType(String value) {
        String text = safe(value).toLowerCase(Locale.ROOT);
        return ("games".equals(text) || "shows".equals(text) || "locations".equals(text) || "shopping".equals(text))
            ? text
            : "shopping";
    }

    private String cleanStatus(String value, String listType) {
        String text = safe(value).toLowerCase(Locale.ROOT);
        String type = cleanListType(listType);
        if ("shopping".equals(type)) {
            return ("wanted".equals(text) || "maybe".equals(text) || "bought".equals(text) || "ordered".equals(text))
                ? text
                : "wanted";
        }
        if ("games".equals(type)) {
            return ("wanted".equals(text) || "playing".equals(text) || "finished".equals(text) || "dropped".equals(text) || "bought".equals(text))
                ? text
                : "wanted";
        }
        if ("shows".equals(type)) {
            return ("want_to_watch".equals(text) || "watching".equals(text) || "finished".equals(text) || "dropped".equals(text))
                ? text
                : "want_to_watch";
        }
        return ("want_to_go".equals(text) || "planned".equals(text) || "visited".equals(text))
            ? text
            : "want_to_go";
    }

    private void pruneSyncChanges() {
        getWritableDatabase().delete("sync_changes", "created_at < ?", new String[]{daysAgo(SYNC_LOG_RETENTION_DAYS)});
    }

    private int count(String sql) {
        try (Cursor cursor = getReadableDatabase().rawQuery(sql, null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    private ContentValues valuesForItem(Item item) {
        ContentValues values = new ContentValues();
        String listType = cleanListType(item.listType);
        values.put("profile_id", item.profileId);
        values.put("list_type", listType);
        values.put("url", safe(item.url));
        values.put("source_domain", safe(item.sourceDomain));
        values.put("title", clean(item.title, "Untitled item"));
        values.put("description", safe(item.description));
        values.put("image_url", safe(item.imageUrl));
        if (item.priceAmount == null) values.putNull("price_amount");
        else values.put("price_amount", item.priceAmount);
        values.put("currency", empty(item.currency) ? "EUR" : item.currency.toUpperCase(Locale.ROOT));
        values.put("status", cleanStatus(item.status, listType));
        values.put("tags", safe(item.tags));
        values.put("notes", safe(item.notes));
        values.put("priority", item.priority);
        values.put("order_status", safe(item.orderStatus));
        values.put("carrier", safe(item.carrier));
        values.put("tracking_number", safe(item.trackingNumber));
        values.put("tracking_url", safe(item.trackingUrl));
        values.put("ordered_at", safe(item.orderedAt));
        values.put("estimated_delivery", safe(item.estimatedDelivery));
        values.put("order_notes", safe(item.orderNotes));
        return values;
    }

    private void recordChange(String entityType, String entityUuid, String operation, String summary, String payload) {
        ContentValues values = new ContentValues();
        values.put("id", UUID.randomUUID().toString());
        values.put("device_id", localDeviceId());
        values.put("entity_type", entityType);
        values.put("entity_uuid", entityUuid);
        values.put("operation", operation);
        values.put("summary", summary);
        values.put("payload", payload == null ? "{}" : payload);
        values.put("created_at", now());
        getWritableDatabase().insert("sync_changes", null, values);
    }

    String localDeviceId() {
        String id = meta("local_device_id");
        if (empty(id)) {
            id = UUID.randomUUID().toString();
            setMeta("local_device_id", id);
        }
        return id;
    }

    private String meta(String key) {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT value FROM app_meta WHERE key = ?", new String[]{key})) {
            return cursor.moveToFirst() ? cursor.getString(0) : "";
        }
    }

    private void setMeta(String key, String value) {
        ContentValues values = new ContentValues();
        values.put("key", key);
        values.put("value", value);
        getWritableDatabase().insertWithOnConflict("app_meta", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    private void setMetaIfMissing(SQLiteDatabase db, String key, String value) {
        try (Cursor cursor = db.rawQuery("SELECT value FROM app_meta WHERE key = ?", new String[]{key})) {
            if (cursor.moveToFirst()) return;
        }
        ContentValues values = new ContentValues();
        values.put("key", key);
        values.put("value", value);
        db.insert("app_meta", null, values);
    }

    private Profile profileFrom(Cursor cursor) {
        Profile profile = new Profile();
        profile.id = integer(cursor, "id");
        profile.uuid = text(cursor, "uuid");
        profile.name = text(cursor, "name");
        profile.accent = text(cursor, "accent");
        profile.avatarUrl = text(cursor, "avatar_url");
        profile.sortOrder = (int) integer(cursor, "sort_order");
        profile.version = integer(cursor, "version");
        profile.deletedAt = text(cursor, "deleted_at");
        profile.deletedByDeviceId = text(cursor, "deleted_by_device_id");
        profile.createdAt = text(cursor, "created_at");
        profile.updatedAt = text(cursor, "updated_at");
        return profile;
    }

    private int nextProfileOrder() {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM profiles", null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    private void seedProfileOrder(SQLiteDatabase db) {
        try (Cursor cursor = db.rawQuery("SELECT id FROM profiles ORDER BY created_at ASC, id ASC", null)) {
            int sortOrder = 0;
            while (cursor.moveToNext()) {
                ContentValues values = new ContentValues();
                values.put("sort_order", sortOrder++);
                db.update("profiles", values, "id = ?", new String[]{String.valueOf(cursor.getLong(0))});
            }
        }
    }

    private Item itemFrom(Cursor cursor) {
        Item item = new Item();
        item.id = integer(cursor, "id");
        item.uuid = text(cursor, "uuid");
        item.profileId = integer(cursor, "profile_id");
        item.profileUuid = optionalText(cursor, "profile_uuid");
        item.profileName = optionalText(cursor, "profile_name");
        item.listType = optionalText(cursor, "list_type");
        if (item.listType.isEmpty()) item.listType = "shopping";
        item.url = text(cursor, "url");
        item.sourceDomain = text(cursor, "source_domain");
        item.title = text(cursor, "title");
        item.description = text(cursor, "description");
        item.imageUrl = text(cursor, "image_url");
        item.priceAmount = cursor.isNull(cursor.getColumnIndexOrThrow("price_amount"))
            ? null
            : cursor.getDouble(cursor.getColumnIndexOrThrow("price_amount"));
        item.currency = text(cursor, "currency");
        item.status = text(cursor, "status");
        item.tags = text(cursor, "tags");
        item.notes = text(cursor, "notes");
        item.priority = (int) integer(cursor, "priority");
        item.orderStatus = text(cursor, "order_status");
        item.carrier = text(cursor, "carrier");
        item.trackingNumber = text(cursor, "tracking_number");
        item.trackingUrl = text(cursor, "tracking_url");
        item.orderedAt = text(cursor, "ordered_at");
        item.estimatedDelivery = text(cursor, "estimated_delivery");
        item.orderNotes = text(cursor, "order_notes");
        item.version = integer(cursor, "version");
        item.deletedAt = text(cursor, "deleted_at");
        item.deletedByDeviceId = text(cursor, "deleted_by_device_id");
        item.purgedAt = text(cursor, "purged_at");
        item.createdAt = text(cursor, "created_at");
        item.updatedAt = text(cursor, "updated_at");
        return item;
    }

    private static long integer(Cursor cursor, String column) {
        return cursor.getLong(cursor.getColumnIndexOrThrow(column));
    }

    private static String text(Cursor cursor, String column) {
        int index = cursor.getColumnIndexOrThrow(column);
        return cursor.isNull(index) ? "" : cursor.getString(index);
    }

    private static String optionalText(Cursor cursor, String column) {
        int index = cursor.getColumnIndex(column);
        return index < 0 || cursor.isNull(index) ? "" : cursor.getString(index);
    }

    private static String now() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    private static String daysAgo(int days) {
        long millis = System.currentTimeMillis() - (days * 24L * 60L * 60L * 1000L);
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(millis));
    }

    private static String clean(String value, String fallback) {
        String text = safe(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private static String safe(String value) {
        return value == null ? "" : value.replace('\u0000', ' ').trim();
    }

    private static boolean empty(String value) {
        return safe(value).isEmpty();
    }

    private static String normalizedProfileName(String value) {
        return safe(value).replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    static final class Profile {
        long id;
        String uuid;
        String name;
        String accent;
        String avatarUrl;
        int sortOrder;
        long version;
        String deletedAt = "";
        String deletedByDeviceId = "";
        String createdAt;
        String updatedAt;
    }

    static final class Item {
        long id;
        String uuid;
        long profileId;
        String profileUuid = "";
        String profileName = "";
        String listType = "shopping";
        String url = "";
        String sourceDomain = "";
        String title = "";
        String description = "";
        String imageUrl = "";
        Double priceAmount;
        String currency = "EUR";
        String status = "wanted";
        String tags = "";
        String notes = "";
        int priority;
        String orderStatus = "";
        String carrier = "";
        String trackingNumber = "";
        String trackingUrl = "";
        String orderedAt = "";
        String estimatedDelivery = "";
        String orderNotes = "";
        long version;
        String deletedAt = "";
        String deletedByDeviceId = "";
        String purgedAt = "";
        String createdAt = "";
        String updatedAt = "";
    }

    static final class Change {
        String id;
        String operation;
        String summary;
        String createdAt;
    }

    static final class StorageStats {
        long databaseBytes;
        int binCount;
        int tombstoneCount;
        int syncChangeCount;
    }

    static final class SyncImportResult {
        String remoteDeviceId = "";
        String remoteDeviceName = "another device";
        int profilesAdded;
        int profilesUpdated;
        int itemsAdded;
        int itemsUpdated;
        int skipped;

        int changedCount() {
            return profilesAdded + profilesUpdated + itemsAdded + itemsUpdated;
        }
    }
}
