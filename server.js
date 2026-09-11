const { createServer } = require("node:http");
const { DatabaseSync } = require("node:sqlite");
const { existsSync, mkdirSync, statSync } = require("node:fs");
const { readFile } = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = process.env.SHOPPING_LIST_DATA_DIR || path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "shopping-list.sqlite");
const DEFAULT_BIN_RETENTION_DAYS = 30;
const DEFAULT_SYNC_LOG_RETENTION_DAYS = 90;

const LIST_TYPES = new Set(["shopping", "games", "shows", "locations"]);
const DEFAULT_LIST_TYPE = "shopping";
const LIST_STATUSES = {
  shopping: new Set(["wanted", "maybe", "bought", "ordered"]),
  games: new Set(["wanted", "playing", "finished", "dropped", "bought"]),
  shows: new Set(["want_to_watch", "watching", "finished", "dropped"]),
  locations: new Set(["want_to_go", "planned", "visited"])
};
const DEFAULT_STATUS_BY_TYPE = {
  shopping: "wanted",
  games: "wanted",
  shows: "want_to_watch",
  locations: "want_to_go"
};
const ORDER_STATUSES = new Set([
  "",
  "placed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "delayed",
  "cancelled"
]);

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT,
    name TEXT NOT NULL,
    accent TEXT NOT NULL DEFAULT '#b89d6b',
    avatar_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    deleted_by_device_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    list_type TEXT NOT NULL DEFAULT 'shopping',
    url TEXT,
    source_domain TEXT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price_amount REAL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'wanted',
    tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    order_status TEXT NOT NULL DEFAULT '',
    carrier TEXT,
    tracking_number TEXT,
    tracking_url TEXT,
    ordered_at TEXT,
    estimated_delivery TEXT,
    order_notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    deleted_by_device_id TEXT,
    purged_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    trusted INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sync_changes (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_uuid TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_acks (
    change_id TEXT NOT NULL REFERENCES sync_changes(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    acked_at TEXT NOT NULL,
    PRIMARY KEY (change_id, device_id)
  );
`);

migrateDatabase();
seedDatabase();

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (request.method === "OPTIONS") {
      sendEmpty(response, 204);
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(request, response, requestUrl);
      return;
    }

    await serveStatic(requestUrl, response);
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Server error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`EveryList running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

function migrateDatabase() {
  ensureColumn("profiles", "uuid", "TEXT");
  ensureColumn("profiles", "version", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("profiles", "deleted_at", "TEXT");
  ensureColumn("profiles", "deleted_by_device_id", "TEXT");
  ensureColumn("profiles", "rail_light", "TEXT NOT NULL DEFAULT '#3f4e57'");
  ensureColumn("profiles", "rail_dark", "TEXT NOT NULL DEFAULT '#20282d'");
  ensureColumn("profiles", "sort_order", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("profiles", "updated_at", "TEXT");
  ensureColumn("items", "uuid", "TEXT");
  ensureColumn("items", "list_type", "TEXT NOT NULL DEFAULT 'shopping'");
  ensureColumn("items", "version", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("items", "deleted_at", "TEXT");
  ensureColumn("items", "deleted_by_device_id", "TEXT");
  ensureColumn("items", "purged_at", "TEXT");

  fillMissingUuids("profiles");
  fillMissingUuids("items");
  seedProfileOrder();
  db.prepare("UPDATE profiles SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''").run();

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_uuid ON profiles(uuid);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_items_uuid ON items(uuid);
    CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON profiles(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted_at, purged_at);
    CREATE INDEX IF NOT EXISTS idx_items_profile_type_deleted ON items(profile_id, list_type, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_sync_changes_created ON sync_changes(created_at);
    CREATE INDEX IF NOT EXISTS idx_sync_changes_entity ON sync_changes(entity_type, entity_uuid);
  `);

  upsertMeta("bin_retention_days", String(DEFAULT_BIN_RETENTION_DAYS));
  upsertMeta("sync_log_retention_days", String(DEFAULT_SYNC_LOG_RETENTION_DAYS));
  registerLocalDevice();
}

function ensureColumn(table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((column) => column.name === name)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
  }
}

function fillMissingUuids(table) {
  const rows = db.prepare(`SELECT id FROM ${table} WHERE uuid IS NULL OR uuid = ''`).all();
  const update = db.prepare(`UPDATE ${table} SET uuid = ? WHERE id = ?`);
  for (const row of rows) {
    update.run(randomUUID(), row.id);
  }
}

function seedProfileOrder() {
  const stats = db.prepare("SELECT COUNT(*) AS count, COALESCE(MAX(sort_order), 0) AS maxOrder FROM profiles").get();
  if (stats.count <= 1 || stats.maxOrder > 0) {
    return;
  }
  const rows = db.prepare("SELECT id FROM profiles ORDER BY created_at ASC, id ASC").all();
  const update = db.prepare("UPDATE profiles SET sort_order = ? WHERE id = ? AND (sort_order IS NULL OR sort_order = 0)");
  rows.forEach((row, index) => update.run(index, row.id));
}

function nextProfileOrder() {
  return db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM profiles").get().next || 0;
}

function registerLocalDevice() {
  const id = getLocalDeviceId();
  db.prepare(
    `INSERT INTO devices (id, name, platform, trusted, last_seen_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        platform = excluded.platform,
        last_seen_at = excluded.last_seen_at`
  ).run(id, os.hostname() || "Windows PC", "windows", nowIso());
  return id;
}

function getLocalDeviceId() {
  const existing = getMeta("local_device_id");
  if (existing) {
    return existing;
  }
  const id = randomUUID();
  setMeta("local_device_id", id);
  return id;
}

function getMeta(key) {
  return db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key)?.value || "";
}

function setMeta(key, value) {
  db.prepare(
    `INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

function upsertMeta(key, value) {
  if (!getMeta(key)) {
    setMeta(key, value);
  }
}

function seedDatabase() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM profiles").get();
  if (row.count === 0) {
    const result = db
      .prepare("INSERT INTO profiles (uuid, name, accent, sort_order, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), "Me", "#b89d6b", 0, nowIso());
    recordChange("profile", getProfile(result.lastInsertRowid).uuid, "create", getProfile(result.lastInsertRowid), "Created profile Me");
  }
}

async function handleApi(request, response, requestUrl) {
  const method = request.method || "GET";
  const segments = requestUrl.pathname.split("/").filter(Boolean);

  if (method === "GET" && requestUrl.pathname === "/api/state") {
    sendJson(response, 200, {
      profiles: listProfiles(),
      items: listItems(),
      device: localDeviceInfo()
    });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/bin") {
    sendJson(response, 200, {
      items: listDeletedItems()
    });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/sync/history") {
    sendJson(response, 200, {
      changes: listSyncHistory()
    });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/storage") {
    sendJson(response, 200, storageInfo());
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/device-info") {
    sendJson(response, 200, {
      port: PORT,
      lanUrls: lanUrls(),
      device: localDeviceInfo()
    });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/sync/bundle") {
    sendJson(response, 200, exportSyncBundle());
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/sync/import") {
    const body = await readJson(request);
    sendJson(response, 200, importSyncBundle(body.bundle || body));
    return;
  }

  if (requestUrl.pathname === "/api/profiles" && method === "POST") {
    const body = await readJson(request);
    const profile = createProfile(body);
    sendJson(response, 201, profile);
    return;
  }

  if (segments[1] === "profiles" && segments[2]) {
    const id = toId(segments[2]);

    if (segments[3] === "restore" && method === "POST") {
      sendJson(response, 200, restoreProfile(id));
      return;
    }

    if (method === "PUT") {
      const body = await readJson(request);
      sendJson(response, 200, updateProfile(id, body));
      return;
    }

    if (method === "DELETE") {
      deleteProfile(id);
      sendJson(response, 200, { ok: true });
      return;
    }
  }

  if (requestUrl.pathname === "/api/items" && method === "POST") {
    const body = await readJson(request);
    const item = createItem(body);
    sendJson(response, 201, item);
    return;
  }

  if (requestUrl.pathname === "/api/items/duplicates" && method === "POST") {
    const body = await readJson(request);
    sendJson(response, 200, { items: findDuplicateItems(body) });
    return;
  }

  if (requestUrl.pathname === "/api/items/from-url" && method === "POST") {
    const body = await readJson(request);
    const profileId = requireProfileId(body.profileId);
    const scraped = await scrapeProduct(body.url);
    const item = createItem({
      profileId,
      listType: cleanListType(body.listType),
      url: scraped.url,
      sourceDomain: scraped.sourceDomain,
      title: scraped.title || "Untitled item",
      description: scraped.description || "",
      imageUrl: scraped.imageUrl || "",
      priceAmount: scraped.priceAmount,
      currency: scraped.currency || "EUR",
      status: defaultStatusForListType(body.listType),
      tags: scraped.tags
    });
    sendJson(response, 201, {
      item,
      scrape: {
        found: scraped.found,
        missing: scraped.missing,
        sourceDomain: scraped.sourceDomain
      }
    });
    return;
  }

  if (requestUrl.pathname === "/api/scrape" && method === "POST") {
    const body = await readJson(request);
    const scraped = await scrapeProduct(body.url);
    sendJson(response, 200, scraped);
    return;
  }

  if (segments[1] === "items" && segments[2]) {
    const id = toId(segments[2]);

    if (segments[3] === "restore" && method === "POST") {
      sendJson(response, 200, restoreItem(id));
      return;
    }

    if (segments[3] === "purge" && method === "DELETE") {
      purgeDeletedItem(id);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (method === "PUT") {
      const body = await readJson(request);
      sendJson(response, 200, updateItem(id, body));
      return;
    }

    if (method === "DELETE") {
      deleteItem(id);
      sendJson(response, 200, { ok: true });
      return;
    }
  }

  if (requestUrl.pathname === "/api/bin/cleanup" && method === "POST") {
    const body = await readJson(request);
    sendJson(response, 200, cleanupDeletedItems(body));
    return;
  }

  if (requestUrl.pathname === "/api/maintenance/compact" && method === "POST") {
    sendJson(response, 200, compactDatabase());
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function serveStatic(requestUrl, response) {
  const safePath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decoded = decodeURIComponent(safePath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decoded));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(response, 403, "Forbidden", "text/plain");
    return;
  }

  try {
    const file = await readFile(filePath);
    sendBuffer(response, 200, file, contentType(filePath));
  } catch {
    const fallback = await readFile(path.join(PUBLIC_DIR, "index.html"));
    sendBuffer(response, 200, fallback, "text/html; charset=utf-8");
  }
}

function listProfiles() {
  return db
    .prepare("SELECT * FROM profiles WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC, id ASC")
    .all()
    .map(rowToProfile);
}

function createProfile(body) {
  const name = cleanText(body.name, 64) || "New profile";
  const accent = cleanAccent(body.accent) || pickAccent();
  const avatarUrl = cleanUrlText(body.avatarUrl);
  const railLight = cleanAccent(body.railLight) || "#3f4e57";
  const railDark = cleanAccent(body.railDark) || "#20282d";
  const sortOrder = nextProfileOrder();
  const result = db
    .prepare("INSERT INTO profiles (uuid, name, accent, avatar_url, rail_light, rail_dark, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), name, accent, avatarUrl, railLight, railDark, sortOrder, nowIso());
  const profile = getProfile(result.lastInsertRowid);
  recordChange("profile", profile.uuid, "create", profile, `Created profile ${profile.name}`);
  return profile;
}

function updateProfile(id, body) {
  ensureProfile(id);
  const name = cleanText(body.name, 64) || "New profile";
  const accent = cleanAccent(body.accent) || "#b89d6b";
  const avatarUrl = cleanUrlText(body.avatarUrl);
  const railLight = cleanAccent(body.railLight) || "#3f4e57";
  const railDark = cleanAccent(body.railDark) || "#20282d";
  db.prepare(
    `UPDATE profiles
      SET name = ?,
          accent = ?,
          avatar_url = ?,
          rail_light = ?,
          rail_dark = ?,
          version = version + 1,
          updated_at = ?
      WHERE id = ?`
  ).run(
    name,
    accent,
    avatarUrl,
    railLight,
    railDark,
    nowIso(),
    id
  );
  const profile = getProfile(id);
  recordChange("profile", profile.uuid, "update", profile, `Updated profile ${profile.name}`);
  return profile;
}

function deleteProfile(id) {
  ensureProfile(id);
  const count = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE deleted_at IS NULL").get().count;
  if (count <= 1) {
    throw httpError(400, "You need at least one profile.");
  }
  const profile = getProfile(id);
  const deletedAt = nowIso();
  db.prepare(
    `UPDATE profiles
      SET deleted_at = ?,
          deleted_by_device_id = ?,
          version = version + 1,
          updated_at = ?
      WHERE id = ?`
  ).run(deletedAt, getLocalDeviceId(), deletedAt, id);
  db.prepare(
    `UPDATE items
      SET deleted_at = COALESCE(deleted_at, ?),
          deleted_by_device_id = COALESCE(deleted_by_device_id, ?),
          version = version + 1,
          updated_at = ?
      WHERE profile_id = ? AND deleted_at IS NULL`
  ).run(deletedAt, getLocalDeviceId(), deletedAt, id);
  recordChange("profile", profile.uuid, "delete", { ...profile, deletedAt }, `Deleted profile ${profile.name}`);
}

function restoreProfile(id) {
  const profile = getDeletedProfile(id);
  const restoredAt = nowIso();
  db.prepare(
    `UPDATE profiles
      SET deleted_at = NULL,
          deleted_by_device_id = NULL,
          version = version + 1,
          updated_at = ?
      WHERE id = ?`
  ).run(restoredAt, id);
  db.prepare(
    `UPDATE items
      SET deleted_at = NULL,
          deleted_by_device_id = NULL,
          version = version + 1,
          updated_at = ?
      WHERE profile_id = ?
        AND deleted_at = ?
        AND purged_at IS NULL`
  ).run(restoredAt, id, profile.deletedAt);
  const restored = getProfile(id);
  recordChange("profile", restored.uuid, "restore", restored, `Restored profile ${restored.name}`);
  return restored;
}

function getProfile(id) {
  const row = db.prepare("SELECT * FROM profiles WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!row) {
    throw httpError(404, "Profile not found.");
  }
  return rowToProfile(row);
}

function getDeletedProfile(id) {
  const row = db.prepare("SELECT * FROM profiles WHERE id = ? AND deleted_at IS NOT NULL").get(id);
  if (!row) {
    throw httpError(404, "Deleted profile not found.");
  }
  return rowToProfile(row);
}

function ensureProfile(id) {
  getProfile(id);
}

function listItems() {
  return db
    .prepare("SELECT * FROM items WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC")
    .all()
    .map(rowToItem);
}

function findDuplicateItems(body = {}) {
  const profileId = requireProfileId(body.profileId);
  const listType = cleanListType(body.listType);
  const excludeId = Number.parseInt(body.excludeId || 0, 10) || 0;
  const targetUrl = comparableUrl(body.url);
  const targetTitle = comparableTitle(body.title);

  if (!targetUrl && !targetTitle) {
    return [];
  }

  return db
    .prepare(
      "SELECT * FROM items WHERE profile_id = ? AND list_type = ? AND deleted_at IS NULL ORDER BY updated_at DESC, id DESC"
    )
    .all(profileId, listType)
    .map(rowToItem)
    .filter((item) => item.id !== excludeId)
    .map((item) => {
      const match = duplicateMatch(item, targetUrl, targetTitle);
      return match ? { ...item, duplicateReason: match.reason, duplicateScore: match.score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.duplicateScore - a.duplicateScore || b.id - a.id)
    .slice(0, 5);
}

function duplicateMatch(item, targetUrl, targetTitle) {
  const itemUrl = comparableUrl(item.url);
  if (targetUrl && itemUrl && targetUrl === itemUrl) {
    return { score: 100, reason: "Same link" };
  }

  const itemTitle = comparableTitle(item.title);
  if (!targetTitle || !itemTitle) {
    return null;
  }

  if (targetTitle === itemTitle) {
    return { score: 90, reason: "Same title" };
  }

  const score = titleOverlapScore(targetTitle, itemTitle);
  return score >= 0.82 ? { score: Math.round(score * 80), reason: "Similar title" } : null;
}

function titleOverlapScore(left, right) {
  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 2));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length > 2));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function comparableTitle(value) {
  return normalize(cleanText(value, 180));
}

function comparableUrl(value) {
  const raw = cleanUrlText(value);
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "");

    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("utm_") ||
        ["fbclid", "gclid", "igshid", "mc_cid", "mc_eid", "ref", "tag", "ascsubtag", "linkcode", "camp", "creative"].includes(lower)
      ) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();
    return `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    return normalize(raw).replace(/^https? /, "").replace(/^www /, "");
  }
}

function listDeletedItems() {
  return db
    .prepare(
      `SELECT items.*, profiles.name AS profile_name
        FROM items
        LEFT JOIN profiles ON profiles.id = items.profile_id
        WHERE items.deleted_at IS NOT NULL AND items.purged_at IS NULL
        ORDER BY items.deleted_at DESC, items.id DESC`
    )
    .all()
    .map(rowToItem);
}

function createItem(body) {
  const profileId = requireProfileId(body.profileId);
  const data = sanitizeItem(body);

  const result = db
    .prepare(
      `INSERT INTO items (
        uuid, profile_id, list_type, url, source_domain, title, description, image_url,
        price_amount, currency, status, tags, notes, priority,
        order_status, carrier, tracking_number, tracking_url,
        ordered_at, estimated_delivery, order_notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      profileId,
      data.listType,
      data.url,
      data.sourceDomain,
      data.title,
      data.description,
      data.imageUrl,
      data.priceAmount,
      data.currency,
      data.status,
      JSON.stringify(data.tags),
      data.notes,
      data.priority,
      data.orderStatus,
      data.carrier,
      data.trackingNumber,
      data.trackingUrl,
      data.orderedAt,
      data.estimatedDelivery,
      data.orderNotes,
      nowIso()
    );

  const item = getItem(result.lastInsertRowid);
  recordChange("item", item.uuid, "create", item, `Added ${item.title}`);
  return item;
}

function updateItem(id, body) {
  getItem(id);
  const profileId = requireProfileId(body.profileId);
  const data = sanitizeItem(body);

  db.prepare(
    `UPDATE items
      SET profile_id = ?,
          list_type = ?,
          url = ?,
          source_domain = ?,
          title = ?,
          description = ?,
          image_url = ?,
          price_amount = ?,
          currency = ?,
          status = ?,
          tags = ?,
          notes = ?,
          priority = ?,
          order_status = ?,
          carrier = ?,
          tracking_number = ?,
          tracking_url = ?,
          ordered_at = ?,
          estimated_delivery = ?,
          order_notes = ?,
          version = version + 1,
          updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`
  ).run(
    profileId,
    data.listType,
    data.url,
    data.sourceDomain,
    data.title,
    data.description,
    data.imageUrl,
    data.priceAmount,
    data.currency,
    data.status,
    JSON.stringify(data.tags),
    data.notes,
    data.priority,
    data.orderStatus,
    data.carrier,
    data.trackingNumber,
    data.trackingUrl,
    data.orderedAt,
    data.estimatedDelivery,
    data.orderNotes,
    nowIso(),
    id
  );

  const item = getItem(id);
  recordChange("item", item.uuid, "update", item, `Updated ${item.title}`);
  return item;
}

function deleteItem(id) {
  const item = getItem(id);
  const deletedAt = nowIso();
  db.prepare(
    `UPDATE items
      SET deleted_at = ?,
          deleted_by_device_id = ?,
          version = version + 1,
          updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`
  ).run(deletedAt, getLocalDeviceId(), deletedAt, id);
  recordChange("item", item.uuid, "delete", { ...item, deletedAt }, `Moved ${item.title} to Bin`);
}

function getItem(id) {
  const row = db.prepare("SELECT * FROM items WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!row) {
    throw httpError(404, "Item not found.");
  }
  return rowToItem(row);
}

function getDeletedItem(id) {
  const row = db.prepare("SELECT * FROM items WHERE id = ? AND deleted_at IS NOT NULL AND purged_at IS NULL").get(id);
  if (!row) {
    throw httpError(404, "Bin item not found.");
  }
  return rowToItem(row);
}

function restoreItem(id) {
  const item = getDeletedItem(id);
  const restoredAt = nowIso();
  db.prepare(
    `UPDATE items
      SET deleted_at = NULL,
          deleted_by_device_id = NULL,
          purged_at = NULL,
          version = version + 1,
          updated_at = ?
      WHERE id = ?`
  ).run(restoredAt, id);
  const restored = getItem(id);
  recordChange("item", restored.uuid, "restore", restored, `Restored ${restored.title}`);
  return restored;
}

function purgeDeletedItem(id) {
  const item = getDeletedItem(id);
  purgeItemDetails(id, nowIso());
  recordChange("item", item.uuid, "purge", { id: item.id, uuid: item.uuid, deletedAt: item.deletedAt }, `Permanently cleared ${item.title}`);
}

function cleanupDeletedItems(body = {}) {
  const retentionDays = clampInteger(body.retentionDays ?? Number(getMeta("bin_retention_days")), 1, 365);
  const cutoff = daysAgoIso(retentionDays);
  const rows = db
    .prepare("SELECT id FROM items WHERE deleted_at IS NOT NULL AND purged_at IS NULL AND deleted_at < ?")
    .all(cutoff);
  const purgedAt = nowIso();
  for (const row of rows) {
    purgeItemDetails(row.id, purgedAt);
  }
  pruneSyncChanges();
  return {
    ok: true,
    purgedItems: rows.length,
    retentionDays,
    storage: storageInfo()
  };
}

function purgeItemDetails(id, purgedAt) {
  db.prepare(
    `UPDATE items
      SET url = NULL,
          source_domain = NULL,
          description = NULL,
          image_url = NULL,
          price_amount = NULL,
          tags = '[]',
          notes = NULL,
          order_status = '',
          carrier = NULL,
          tracking_number = NULL,
          tracking_url = NULL,
          ordered_at = NULL,
          estimated_delivery = NULL,
          order_notes = NULL,
          purged_at = ?,
          version = version + 1,
          updated_at = ?
      WHERE id = ? AND deleted_at IS NOT NULL`
  ).run(purgedAt, purgedAt, id);
}

function compactDatabase() {
  pruneSyncChanges();
  db.exec("PRAGMA optimize");
  db.exec("VACUUM");
  return {
    ok: true,
    storage: storageInfo()
  };
}

function sanitizeItem(body) {
  const listType = cleanListType(body.listType);
  const status = cleanStatusForListType(body.status, listType);
  const orderStatus = ORDER_STATUSES.has(String(body.orderStatus || "").toLowerCase())
    ? String(body.orderStatus || "").toLowerCase()
    : "";

  return {
    listType,
    url: cleanUrlText(body.url),
    sourceDomain: cleanText(body.sourceDomain, 128) || domainFromUrl(body.url),
    title: cleanText(body.title, 180) || "Untitled item",
    description: cleanText(body.description, 2000),
    imageUrl: cleanUrlText(body.imageUrl),
    priceAmount: parseNullableNumber(body.priceAmount),
    currency: cleanCurrency(body.currency) || "EUR",
    status,
    tags: sanitizeTags(body.tags),
    notes: cleanText(body.notes, 2000),
    priority: clampInteger(body.priority, 0, 5),
    orderStatus: listType === "shopping" && status === "ordered" ? orderStatus || "placed" : orderStatus,
    carrier: cleanText(body.carrier, 120),
    trackingNumber: cleanText(body.trackingNumber, 160),
    trackingUrl: cleanUrlText(body.trackingUrl),
    orderedAt: cleanDate(body.orderedAt),
    estimatedDelivery: cleanDate(body.estimatedDelivery),
    orderNotes: cleanText(body.orderNotes, 2000)
  };
}

function cleanListType(value) {
  const type = cleanText(value, 32).toLowerCase();
  return LIST_TYPES.has(type) ? type : DEFAULT_LIST_TYPE;
}

function cleanStatusForListType(value, listType) {
  const type = cleanListType(listType);
  const status = cleanText(value, 40).toLowerCase();
  return LIST_STATUSES[type].has(status) ? status : defaultStatusForListType(type);
}

function defaultStatusForListType(value) {
  const type = cleanListType(value);
  return DEFAULT_STATUS_BY_TYPE[type] || "wanted";
}

function rowToProfile(row) {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    accent: row.accent,
    avatarUrl: row.avatar_url || "",
    railLight: row.rail_light || "#3f4e57",
    railDark: row.rail_dark || "#20282d",
    sortOrder: row.sort_order || 0,
    version: row.version || 1,
    deletedAt: row.deleted_at || "",
    deletedByDeviceId: row.deleted_by_device_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

function rowToItem(row) {
  return {
    id: row.id,
    uuid: row.uuid,
    profileId: row.profile_id,
    profileUuid: row.profile_uuid || "",
    profileName: row.profile_name || "",
    listType: cleanListType(row.list_type),
    url: row.url || "",
    sourceDomain: row.source_domain || "",
    title: row.title,
    description: row.description || "",
    imageUrl: row.image_url || "",
    priceAmount: row.price_amount,
    currency: row.currency || "EUR",
    status: row.status,
    tags: safeJsonArray(row.tags),
    notes: row.notes || "",
    priority: row.priority || 0,
    orderStatus: row.order_status || "",
    carrier: row.carrier || "",
    trackingNumber: row.tracking_number || "",
    trackingUrl: row.tracking_url || "",
    orderedAt: row.ordered_at || "",
    estimatedDelivery: row.estimated_delivery || "",
    orderNotes: row.order_notes || "",
    version: row.version || 1,
    deletedAt: row.deleted_at || "",
    deletedByDeviceId: row.deleted_by_device_id || "",
    purgedAt: row.purged_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function recordChange(entityType, entityUuid, operation, payload, summary) {
  db.prepare(
    `INSERT INTO sync_changes (
      id, device_id, entity_type, entity_uuid, operation, payload, summary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    getLocalDeviceId(),
    entityType,
    entityUuid,
    operation,
    JSON.stringify(payload || {}),
    cleanText(summary, 240) || `${operation} ${entityType}`,
    nowIso()
  );
}

function listSyncHistory(limit = 100) {
  return db
    .prepare(
      `SELECT sync_changes.*, devices.name AS device_name
        FROM sync_changes
        LEFT JOIN devices ON devices.id = sync_changes.device_id
        ORDER BY sync_changes.created_at DESC
        LIMIT ?`
    )
    .all(clampInteger(limit, 1, 250))
    .map((row) => ({
      id: row.id,
      deviceId: row.device_id,
      deviceName: row.device_name || "This device",
      entityType: row.entity_type,
      entityUuid: row.entity_uuid,
      operation: row.operation,
      summary: row.summary,
      createdAt: row.created_at
    }));
}

function storageInfo() {
  const dbBytes = existsSync(DB_PATH) ? statSync(DB_PATH).size : 0;
  const binCount = db.prepare("SELECT COUNT(*) AS count FROM items WHERE deleted_at IS NOT NULL AND purged_at IS NULL").get().count;
  const tombstoneCount = db.prepare("SELECT COUNT(*) AS count FROM items WHERE deleted_at IS NOT NULL AND purged_at IS NOT NULL").get().count;
  const syncChangeCount = db.prepare("SELECT COUNT(*) AS count FROM sync_changes").get().count;
  return {
    databaseBytes: dbBytes,
    binCount,
    tombstoneCount,
    syncChangeCount,
    binRetentionDays: Number(getMeta("bin_retention_days") || DEFAULT_BIN_RETENTION_DAYS),
    syncLogRetentionDays: Number(getMeta("sync_log_retention_days") || DEFAULT_SYNC_LOG_RETENTION_DAYS)
  };
}

function localDeviceInfo() {
  const id = getLocalDeviceId();
  const device = db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
  return {
    id,
    name: device?.name || os.hostname() || "Windows PC",
    platform: device?.platform || "windows",
    lastSeenAt: device?.last_seen_at || ""
  };
}

function exportSyncBundle() {
  return {
    format: "shoppinglist.sync.v1",
    bundleId: randomUUID(),
    exportedAt: nowIso(),
    device: localDeviceInfo(),
    profiles: listAllProfilesForSync(),
    items: listAllItemsForSync(),
    changes: listSyncHistory(250)
  };
}

function importSyncBundle(input) {
  const bundle = typeof input === "string" ? JSON.parse(input) : input;
  if (!bundle || bundle.format !== "shoppinglist.sync.v1") {
    throw httpError(400, "Unsupported sync bundle.");
  }

  const remoteDevice = registerRemoteDevice(bundle.device);
  const result = {
    ok: true,
    remoteDevice,
    profilesAdded: 0,
    profilesUpdated: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
    skipped: 0
  };

  db.exec("BEGIN IMMEDIATE");
  try {
    const profileIdOverrides = new Map();
    for (const profile of Array.isArray(bundle.profiles) ? bundle.profiles : []) {
      importSyncProfile(profile, result, profileIdOverrides);
    }

    const profileIds = profileUuidToLocalId(profileIdOverrides);
    for (const item of Array.isArray(bundle.items) ? bundle.items : []) {
      importSyncItem(item, profileIds, result);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const changedCount =
    result.profilesAdded + result.profilesUpdated + result.itemsAdded + result.itemsUpdated;
  recordChange(
    "sync",
    cleanText(bundle.bundleId, 80) || randomUUID(),
    "import",
    result,
    `Imported ${changedCount} sync change${changedCount === 1 ? "" : "s"} from ${remoteDevice.name}`
  );
  return {
    ...result,
    changedCount
  };
}

function listAllProfilesForSync() {
  return db
    .prepare("SELECT * FROM profiles ORDER BY sort_order ASC, created_at ASC, id ASC")
    .all()
    .map(rowToProfile);
}

function listAllItemsForSync() {
  return db
    .prepare(
      `SELECT items.*, profiles.uuid AS profile_uuid
        FROM items
        LEFT JOIN profiles ON profiles.id = items.profile_id
        ORDER BY items.updated_at ASC, items.id ASC`
    )
    .all()
    .map(rowToItem);
}

function registerRemoteDevice(device = {}) {
  const id = cleanText(device?.id, 80);
  const name = cleanText(device?.name, 120) || "Linked device";
  const platform = cleanText(device?.platform, 40) || "unknown";
  if (!id || id === getLocalDeviceId()) {
    return { id: id || "", name, platform };
  }
  db.prepare(
    `INSERT INTO devices (id, name, platform, trusted, last_seen_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        platform = excluded.platform,
        last_seen_at = excluded.last_seen_at`
  ).run(id, name, platform, nowIso());
  return { id, name, platform };
}

function importSyncProfile(row, result, profileIdOverrides = null) {
  const uuid = cleanText(row?.uuid, 80);
  if (!uuid) {
    result.skipped += 1;
    return;
  }

  const profileName = cleanText(row?.name, 64) || "New profile";
  const localByUuid = db.prepare("SELECT * FROM profiles WHERE uuid = ?").get(uuid);
  const nameMatch = findActiveProfileByName(profileName, localByUuid?.id);
  let local = localByUuid;

  if (localByUuid && nameMatch && localByUuid.id !== nameMatch.id) {
    mergeDuplicateProfile(nameMatch, localByUuid);
    local = nameMatch;
    result.profilesUpdated += 1;
  } else if (!localByUuid && !cleanSyncTimestamp(row?.deletedAt) && nameMatch) {
    local = nameMatch;
  }

  const profile = normalizeSyncProfile(row, uuid, local);
  if (!local) {
    const inserted = db.prepare(
      `INSERT INTO profiles (
        uuid, name, accent, avatar_url, rail_light, rail_dark, sort_order,
        version, deleted_at, deleted_by_device_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      profile.uuid,
      profile.name,
      profile.accent,
      profile.avatarUrl,
      profile.railLight,
      profile.railDark,
      profile.sortOrder,
      profile.version,
      profile.deletedAt,
      profile.deletedByDeviceId,
      profile.createdAt,
      profile.updatedAt
    );
    profileIdOverrides?.set(uuid, Number(inserted.lastInsertRowid));
    result.profilesAdded += 1;
    return;
  }

  profileIdOverrides?.set(uuid, local.id);
  if (!incomingWins(profile.updatedAt, profile.version, local.updated_at, local.version || 1)) {
    return;
  }
  db.prepare(
    `UPDATE profiles
      SET uuid = ?,
          name = ?,
          accent = ?,
          avatar_url = ?,
          rail_light = ?,
          rail_dark = ?,
          sort_order = ?,
          version = ?,
          deleted_at = ?,
          deleted_by_device_id = ?,
          created_at = ?,
          updated_at = ?
      WHERE id = ?`
  ).run(
    profile.uuid,
    profile.name,
    profile.accent,
    profile.avatarUrl,
    profile.railLight,
    profile.railDark,
    profile.sortOrder,
    profile.version,
    profile.deletedAt,
    profile.deletedByDeviceId,
    profile.createdAt,
    profile.updatedAt,
    local.id
  );
  result.profilesUpdated += 1;
}

function findActiveProfileByName(name, excludeId = null) {
  const target = normalizeProfileName(name);
  if (!target) {
    return null;
  }
  return db
    .prepare("SELECT * FROM profiles WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC, id ASC")
    .all()
    .find((profile) => profile.id !== excludeId && normalizeProfileName(profile.name) === target) || null;
}

function mergeDuplicateProfile(primary, duplicate) {
  if (!primary || !duplicate || primary.id === duplicate.id) {
    return;
  }
  db.prepare("UPDATE items SET profile_id = ? WHERE profile_id = ?").run(primary.id, duplicate.id);
  db.prepare("DELETE FROM profiles WHERE id = ?").run(duplicate.id);
}

function normalizeProfileName(value) {
  return cleanText(value, 64).replace(/\s+/g, " ").toLowerCase();
}

function importSyncItem(row, profileIds, result) {
  const uuid = cleanText(row?.uuid, 80);
  const profileUuid = cleanText(row?.profileUuid, 80);
  const profileId = profileIds.get(profileUuid);
  if (!uuid || !profileId) {
    result.skipped += 1;
    return;
  }

  const local = db.prepare("SELECT * FROM items WHERE uuid = ?").get(uuid);
  const item = normalizeSyncItem(row, uuid, profileId);
  if (!local) {
    db.prepare(
      `INSERT INTO items (
        uuid, profile_id, list_type, url, source_domain, title, description, image_url,
        price_amount, currency, status, tags, notes, priority,
        order_status, carrier, tracking_number, tracking_url,
        ordered_at, estimated_delivery, order_notes,
        version, deleted_at, deleted_by_device_id, purged_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      item.uuid,
      item.profileId,
      item.listType,
      item.url,
      item.sourceDomain,
      item.title,
      item.description,
      item.imageUrl,
      item.priceAmount,
      item.currency,
      item.status,
      JSON.stringify(item.tags),
      item.notes,
      item.priority,
      item.orderStatus,
      item.carrier,
      item.trackingNumber,
      item.trackingUrl,
      item.orderedAt,
      item.estimatedDelivery,
      item.orderNotes,
      item.version,
      item.deletedAt,
      item.deletedByDeviceId,
      item.purgedAt,
      item.createdAt,
      item.updatedAt
    );
    result.itemsAdded += 1;
    return;
  }

  if (!incomingWins(item.updatedAt, item.version, local.updated_at, local.version || 1)) {
    return;
  }
  db.prepare(
    `UPDATE items
      SET profile_id = ?,
          list_type = ?,
          url = ?,
          source_domain = ?,
          title = ?,
          description = ?,
          image_url = ?,
          price_amount = ?,
          currency = ?,
          status = ?,
          tags = ?,
          notes = ?,
          priority = ?,
          order_status = ?,
          carrier = ?,
          tracking_number = ?,
          tracking_url = ?,
          ordered_at = ?,
          estimated_delivery = ?,
          order_notes = ?,
          version = ?,
          deleted_at = ?,
          deleted_by_device_id = ?,
          purged_at = ?,
          created_at = ?,
          updated_at = ?
      WHERE id = ?`
  ).run(
    item.profileId,
    item.listType,
    item.url,
    item.sourceDomain,
    item.title,
    item.description,
    item.imageUrl,
    item.priceAmount,
    item.currency,
    item.status,
    JSON.stringify(item.tags),
    item.notes,
    item.priority,
    item.orderStatus,
    item.carrier,
    item.trackingNumber,
    item.trackingUrl,
    item.orderedAt,
    item.estimatedDelivery,
    item.orderNotes,
    item.version,
    item.deletedAt,
    item.deletedByDeviceId,
    item.purgedAt,
    item.createdAt,
    item.updatedAt,
    local.id
  );
  result.itemsUpdated += 1;
}

function normalizeSyncProfile(row, uuid, local = null) {
  const createdAt = cleanSyncTimestamp(row?.createdAt) || local?.created_at || nowIso();
  const updatedAt = cleanSyncTimestamp(row?.updatedAt) || createdAt;
  return {
    uuid,
    name: cleanText(row?.name, 64) || "New profile",
    accent: cleanAccent(row?.accent) || local?.accent || "#b89d6b",
    avatarUrl: cleanUrlText(row?.avatarUrl) || "",
    railLight: cleanAccent(row?.railLight) || local?.rail_light || "#3f4e57",
    railDark: cleanAccent(row?.railDark) || local?.rail_dark || "#20282d",
    sortOrder: clampInteger(row?.sortOrder ?? local?.sort_order ?? nextProfileOrder(), 0, 9999),
    version: Math.max(1, Number.parseInt(row?.version || local?.version || 1, 10)),
    deletedAt: cleanSyncTimestamp(row?.deletedAt) || null,
    deletedByDeviceId: cleanText(row?.deletedByDeviceId, 80) || null,
    createdAt,
    updatedAt
  };
}

function normalizeSyncItem(row, uuid, profileId) {
  const listType = cleanListType(row?.listType);
  const status = cleanStatusForListType(row?.status, listType);
  const orderStatus = ORDER_STATUSES.has(String(row?.orderStatus || "").toLowerCase())
    ? String(row.orderStatus || "").toLowerCase()
    : "";
  const createdAt = cleanSyncTimestamp(row?.createdAt) || nowIso();
  const updatedAt = cleanSyncTimestamp(row?.updatedAt) || createdAt;
  return {
    uuid,
    profileId,
    listType,
    url: cleanUrlText(row?.url),
    sourceDomain: cleanText(row?.sourceDomain, 128) || domainFromUrl(row?.url),
    title: cleanText(row?.title, 180) || "Untitled item",
    description: cleanText(row?.description, 2000),
    imageUrl: cleanUrlText(row?.imageUrl),
    priceAmount: parseNullableNumber(row?.priceAmount),
    currency: cleanCurrency(row?.currency) || "EUR",
    status,
    tags: sanitizeTags(row?.tags),
    notes: cleanText(row?.notes, 2000),
    priority: clampInteger(row?.priority, 0, 5),
    orderStatus: listType === "shopping" && status === "ordered" ? orderStatus || "placed" : orderStatus,
    carrier: cleanText(row?.carrier, 120),
    trackingNumber: cleanText(row?.trackingNumber, 160),
    trackingUrl: cleanUrlText(row?.trackingUrl),
    orderedAt: cleanDate(row?.orderedAt),
    estimatedDelivery: cleanDate(row?.estimatedDelivery),
    orderNotes: cleanText(row?.orderNotes, 2000),
    version: Math.max(1, Number.parseInt(row?.version || 1, 10)),
    deletedAt: cleanSyncTimestamp(row?.deletedAt) || null,
    deletedByDeviceId: cleanText(row?.deletedByDeviceId, 80) || null,
    purgedAt: cleanSyncTimestamp(row?.purgedAt) || null,
    createdAt,
    updatedAt
  };
}

function profileUuidToLocalId(overrides = new Map()) {
  const ids = new Map(db.prepare("SELECT id, uuid FROM profiles").all().map((row) => [row.uuid, row.id]));
  for (const [uuid, id] of overrides) {
    if (uuid && id) {
      ids.set(uuid, id);
    }
  }
  return ids;
}

function incomingWins(incomingUpdatedAt, incomingVersion, localUpdatedAt, localVersion) {
  const incomingTime = Date.parse(incomingUpdatedAt || "");
  const localTime = Date.parse(localUpdatedAt || "");
  if (Number.isFinite(incomingTime) && Number.isFinite(localTime) && incomingTime !== localTime) {
    return incomingTime > localTime;
  }
  return Number(incomingVersion || 1) > Number(localVersion || 1);
}

function cleanSyncTimestamp(value) {
  const text = cleanText(value, 64);
  return Number.isFinite(Date.parse(text)) ? text : "";
}

function pruneSyncChanges() {
  const retentionDays = Number(getMeta("sync_log_retention_days") || DEFAULT_SYNC_LOG_RETENTION_DAYS);
  const cutoff = daysAgoIso(retentionDays);
  db.prepare("DELETE FROM sync_changes WHERE created_at < ?").run(cutoff);
}

async function scrapeProduct(rawUrl) {
  const parsedUrl = parseHttpUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(parsedUrl.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw httpError(400, `The site responded with HTTP ${response.status}.`);
    }

    const contentTypeHeader = response.headers.get("content-type") || "";
    if (!contentTypeHeader.includes("text/html") && !contentTypeHeader.includes("application/xhtml")) {
      throw httpError(400, "That link did not return an HTML page.");
    }

    const finalUrl = new URL(response.url || parsedUrl.href);
    const html = (await response.text()).slice(0, 3_000_000);
    const meta = extractMetadata(html, finalUrl.href);
    const price = firstPrice(meta.priceAmount, priceFromHtml(html));
    const currency = meta.currency || price.currency || "EUR";

    const result = {
      url: finalUrl.href,
      sourceDomain: finalUrl.hostname.replace(/^www\./, ""),
      title: meta.title || "",
      description: meta.description || "",
      imageUrl: meta.imageUrl || "",
      priceAmount: price.amount,
      currency,
      tags: guessTags([meta.title, meta.description, finalUrl.hostname, finalUrl.pathname].join(" ")),
      found: [],
      missing: []
    };

    for (const field of ["title", "imageUrl", "priceAmount", "description"]) {
      if (result[field] === null || result[field] === undefined || result[field] === "") {
        result.missing.push(field);
      } else {
        result.found.push(field);
      }
    }

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw httpError(408, "The site took too long to respond. You can still add it manually.");
    }
    if (error.statusCode) {
      throw error;
    }
    throw httpError(400, `Could not read that site: ${error.message || String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function extractMetadata(html, baseUrl) {
  const metaTags = Array.from(html.matchAll(/<meta\b[^>]*>/gi)).map((match) => readAttributes(match[0]));
  const linkTags = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map((match) => readAttributes(match[0]));
  const jsonLd = extractJsonLd(html);
  const productNode = findProductNode(jsonLd);

  const title =
    metaValue(metaTags, ["og:title", "twitter:title", "title"]) ||
    fromJsonLd(productNode, "name") ||
    extractTitle(html);
  const description =
    metaValue(metaTags, ["og:description", "twitter:description", "description"]) ||
    fromJsonLd(productNode, "description");
  const image =
    metaValue(metaTags, ["og:image", "og:image:url", "twitter:image", "twitter:image:src", "image"]) ||
    imageFromJsonLd(productNode) ||
    linkValue(linkTags, ["image_src", "preload"], "image");
  const priceAmount =
    metaValue(metaTags, [
      "product:price:amount",
      "og:price:amount",
      "price",
      "twitter:data1",
      "twitter:data2"
    ]) || offerValue(productNode, ["price", "lowPrice", "highPrice"]);
  const currency =
    metaValue(metaTags, ["product:price:currency", "og:price:currency", "priceCurrency"]) ||
    offerValue(productNode, ["priceCurrency"]);

  return {
    title: cleanScrapedText(title),
    description: cleanScrapedText(description),
    imageUrl: absolutizeUrl(cleanScrapedText(image), baseUrl),
    priceAmount: cleanScrapedText(priceAmount),
    currency: cleanCurrency(currency)
  };
}

function readAttributes(tag) {
  const attributes = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = re.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[2] || match[3] || match[4] || "");
  }
  return attributes;
}

function metaValue(tags, keys) {
  const lookupKeys = keys.map((key) => key.toLowerCase());
  for (const tag of tags) {
    const tagKey = String(tag.property || tag.name || tag.itemprop || "").toLowerCase();
    if (lookupKeys.includes(tagKey) && tag.content) {
      return tag.content;
    }
  }
  return "";
}

function linkValue(tags, rels, requiredAs) {
  for (const tag of tags) {
    const rel = String(tag.rel || "").toLowerCase();
    const as = String(tag.as || "").toLowerCase();
    if (rels.includes(rel) && (!requiredAs || as === requiredAs) && tag.href) {
      return tag.href;
    }
  }
  return "";
}

function extractTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(stripTags(match[1])) : "";
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    const text = decodeEntities(match[1]).trim().replace(/^<!--/, "").replace(/-->$/, "").trim();
    if (!text) {
      continue;
    }
    try {
      blocks.push(JSON.parse(text));
    } catch {
      const balanced = text.match(/\{[\s\S]*\}/);
      if (balanced) {
        try {
          blocks.push(JSON.parse(balanced[0]));
        } catch {
          // Ignore malformed JSON-LD blocks; many shops include tracking snippets here.
        }
      }
    }
  }
  return blocks;
}

function findProductNode(values) {
  const queue = [...values];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") {
      continue;
    }
    const type = node["@type"];
    const typeValues = Array.isArray(type) ? type : [type];
    if (typeValues.some((value) => String(value).toLowerCase() === "product")) {
      return node;
    }
    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }
    if (node["@graph"]) {
      queue.push(node["@graph"]);
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }
  return null;
}

function fromJsonLd(node, key) {
  if (!node || typeof node !== "object") {
    return "";
  }
  const value = node[key];
  if (Array.isArray(value)) {
    return value.find(Boolean) || "";
  }
  if (value && typeof value === "object") {
    return value.name || value.text || "";
  }
  return value || "";
}

function imageFromJsonLd(node) {
  if (!node || typeof node !== "object") {
    return "";
  }
  const value = node.image;
  if (Array.isArray(value)) {
    return imageValue(value[0]);
  }
  return imageValue(value);
}

function imageValue(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "object") {
    return value.url || value.contentUrl || value["@id"] || "";
  }
  return value;
}

function offerValue(node, keys) {
  if (!node || typeof node !== "object" || !node.offers) {
    return "";
  }
  const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
  for (const offer of offers) {
    if (!offer || typeof offer !== "object") {
      continue;
    }
    for (const key of keys) {
      const value = offer[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return "";
}

function firstPrice(...values) {
  for (const value of values) {
    const parsed = parsePrice(value);
    if (parsed.amount !== null) {
      return parsed;
    }
  }
  return { amount: null, currency: "" };
}

function priceFromHtml(html) {
  const text = stripTags(html).replace(/\s+/g, " ").slice(0, 500_000);
  const patterns = [
    /\u20ac\s*[0-9][0-9., ]{0,14}/i,
    /[0-9][0-9., ]{0,14}\s*(?:\u20ac|EUR)\b/i,
    /(?:price|amount|salePrice|currentPrice)["'\s:=]+["']?(?:\u20ac\s*)?[0-9][0-9., ]{0,14}(?:\s*(?:EUR|\u20ac))?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return "";
}

function parsePrice(value) {
  if (value === null || value === undefined || value === "") {
    return { amount: null, currency: "" };
  }
  const text = stripTags(String(value)).replace(/\s+/g, " ").trim();
  const match = text.match(/(EUR|USD|GBP|CHF|CAD|AUD|JPY|\u20ac|\$|\u00a3)?\s*([0-9][0-9., ]{0,14})(?:\s*(EUR|USD|GBP|CHF|CAD|AUD|JPY))?/i);
  if (!match) {
    return { amount: null, currency: "" };
  }
  const amount = parseLocaleNumber(match[2]);
  if (amount === null) {
    return { amount: null, currency: "" };
  }
  const currencyToken = (match[1] || match[3] || "").toUpperCase();
  return {
    amount,
    currency:
      currencyToken === "\u20ac"
        ? "EUR"
        : currencyToken === "$"
          ? "USD"
          : currencyToken === "\u00a3"
            ? "GBP"
            : cleanCurrency(currencyToken)
  };
}

function parseLocaleNumber(value) {
  let text = String(value).replace(/\s/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");

  if (comma > -1 && dot > -1) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma > -1) {
    const decimals = text.length - comma - 1;
    text = decimals === 3 ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (dot > -1) {
    const decimals = text.length - dot - 1;
    if (decimals === 3) {
      text = text.replace(/\./g, "");
    }
  }

  const number = Number(text);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

function guessTags(text) {
  const normalized = normalize(text);
  const rules = [
    ["tech", ["laptop", "pc", "computer", "phone", "tablet", "monitor", "keyboard", "mouse", "ssd", "cpu", "gpu", "headset", "console", "camera", "charger", "usb", "gaming"]],
    ["furniture", ["chair", "desk", "sofa", "table", "stool", "bed", "shelf", "wardrobe", "cabinet", "dresser"]],
    ["decor", ["decor", "lamp", "rug", "carpet", "wall", "poster", "frame", "cushion", "curtain", "mirror", "vase", "art"]],
    ["kitchen", ["kitchen", "pan", "pot", "knife", "mug", "plate", "blender", "toaster", "coffee", "air fryer"]],
    ["clothing", ["shirt", "hoodie", "jeans", "jacket", "shoes", "trainer", "dress", "coat", "socks"]],
    ["office", ["office", "stationery", "notebook", "pen", "planner", "printer"]],
    ["gaming", ["gaming", "xbox", "playstation", "switch", "steam", "controller", "gamepad"]],
    ["gift", ["gift", "present"]]
  ];

  const tags = [];
  for (const [tag, words] of rules) {
    if (words.some((word) => normalized.includes(word))) {
      tags.push(tag);
    }
  }
  return tags;
}

function sanitizeTags(tags) {
  const raw = Array.isArray(tags) ? tags : String(tags || "").split(",");
  const seen = new Set();
  const clean = [];
  for (const value of raw) {
    const tag = cleanText(value, 36);
    const key = normalize(tag);
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    clean.push(tag);
  }
  return clean.slice(0, 16);
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseHttpUrl(value) {
  const urlText = String(value || "").trim();
  if (!urlText) {
    throw httpError(400, "Paste a link first.");
  }
  let parsed;
  try {
    parsed = new URL(urlText);
  } catch {
    throw httpError(400, "That does not look like a valid link.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw httpError(400, "Only http and https links are supported.");
  }
  return parsed;
}

function cleanText(value, max = 500) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanScrapedText(value) {
  return cleanText(decodeEntities(stripTags(value || "")), 2000);
}

function cleanCurrency(value) {
  const token = cleanText(value, 8).toUpperCase();
  if (/^[A-Z]{3}$/.test(token)) {
    return token;
  }
  return "";
}

function cleanAccent(value) {
  const token = cleanText(value, 16);
  return /^#[0-9a-f]{6}$/i.test(token) ? token : "";
}

function cleanUrlText(value) {
  const text = cleanText(value, 2048);
  if (!text) {
    return "";
  }
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function cleanDate(value) {
  const text = cleanText(value, 32);
  if (!text) {
    return "";
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function parseNullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.max(min, Math.min(max, number));
}

function nowIso() {
  return new Date().toISOString();
}

function daysAgoIso(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Number(days || 0));
  return date.toISOString();
}

function toId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, "Invalid id.");
  }
  return id;
}

function requireProfileId(value) {
  const id = toId(value);
  ensureProfile(id);
  return id;
}

function domainFromUrl(value) {
  const url = cleanUrlText(value);
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function absolutizeUrl(value, baseUrl) {
  if (!value) {
    return "";
  }
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
  };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity) => {
    if (entity[0] === "#") {
      const number =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : full;
    }
    return named[entity.toLowerCase()] || full;
  });
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickAccent() {
  const colors = ["#b89d6b", "#5f7a6d", "#b26b5f", "#5e6f91", "#8f6ba8", "#4f857f"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function lanUrls() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${PORT}`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream"
  );
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 10_000_000) {
      throw httpError(413, "Request is too large.");
    }
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw httpError(400, "Invalid JSON.");
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders()
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, text, type) {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    ...corsHeaders()
  });
  response.end(text);
}

function sendBuffer(response, status, buffer, type) {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    ...corsHeaders()
  });
  response.end(buffer);
}

function sendEmpty(response, status) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    ...corsHeaders()
  });
  response.end();
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
