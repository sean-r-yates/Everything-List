const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { fork, spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SERVER_PORT = String(process.env.SHOPPING_LIST_PORT || 4173);
let mainWindow;
let serverProcess;
let bluetoothSelectTimer;
let bluetoothSelectionCallback = null;
let bluetoothSelectionDevices = new Map();
let nativeBluetoothProcess = null;
const shoppingListBluetoothName = /listy|tracklist|track list|lifelist|life list|shoppinglist|shopping list/i;
const androidBluetoothName = /android|phone|galaxy|pixel|motorola|moto|xiaomi|redmi|oneplus|oppo|vivo|honor|huawei|nothing/i;

app.setName("Listy");
app.setPath("userData", path.join(app.getPath("appData"), "TrackList"));
app.commandLine.appendSwitch("enable-experimental-web-platform-features");
app.commandLine.appendSwitch("enable-features", "UncachedGattDiscoveryForGattConnection");

function isAppOrigin(origin = "") {
  return origin.startsWith(`http://127.0.0.1:${SERVER_PORT}`) ||
    origin.startsWith(`http://localhost:${SERVER_PORT}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Listy",
    frame: false,
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#111214",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      experimentalFeatures: true,
      enableBlinkFeatures: "WebBluetooth"
    }
  });

  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details = {}) => {
    const origin = requestingOrigin || details.securityOrigin || "";
    return isAppOrigin(origin) && (permission === "bluetooth" || permission === "bluetoothScanning");
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback, details = {}) => {
    const origin = details.requestingOrigin || details.securityOrigin || "";
    callback(isAppOrigin(origin) && (permission === "bluetooth" || permission === "bluetoothScanning"));
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    return isAppOrigin(details.origin);
  });

  mainWindow.webContents.session.setBluetoothPairingHandler((_details, callback) => {
    callback({ confirmed: true });
  });

  mainWindow.webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
    event.preventDefault();
    bluetoothSelectionCallback = callback;
    bluetoothSelectionDevices = new Map(deviceList.filter((device) => device.deviceId).map((device) => [device.deviceId, device]));
    const candidates = deviceList.filter((device) => device.deviceId);
    const ranked = candidates
      .map((device) => ({ device, rank: bluetoothDeviceRank(device) }))
      .sort((a, b) => b.rank - a.rank);
    const named = ranked.find((entry) => entry.rank >= 3)?.device;
    clearTimeout(bluetoothSelectTimer);

    if (candidates.length) {
      console.log(
        "Bluetooth candidates:",
        candidates.map((device) => device.deviceName || "(unnamed)").join(", ")
      );
    }

    if (named) {
      finishBluetoothSelection(named.deviceId);
      return;
    }

    mainWindow.webContents.send("bluetooth:devices", {
      devices: ranked.map(({ device, rank }) => ({
        id: device.deviceId,
        name: device.deviceName || "Unnamed Bluetooth device",
        rank
      }))
    });

    bluetoothSelectTimer = setTimeout(() => {
      finishBluetoothSelection("");
    }, 45000);
  });

  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}/?desktop=1`);
}

ipcMain.handle("bluetooth:select-device", (_event, deviceId) => {
  const id = String(deviceId || "");
  if (!id || bluetoothSelectionDevices.has(id)) {
    finishBluetoothSelection(id);
  }
});

ipcMain.handle("bluetooth:cancel-selection", () => {
  finishBluetoothSelection("");
  cancelNativeBluetoothSync();
});

ipcMain.handle("bluetooth:native-sync", async (event, pcBundle) => {
  return runNativeBluetoothSync(String(pcBundle || ""), event.sender);
});

function bluetoothDeviceRank(device) {
  const name = device.deviceName || "";
  if (shoppingListBluetoothName.test(name)) return 3;
  if (androidBluetoothName.test(name)) return 2;
  if (name) return 1;
  return 0;
}

function finishBluetoothSelection(deviceId) {
  clearTimeout(bluetoothSelectTimer);
  const callback = bluetoothSelectionCallback;
  bluetoothSelectionCallback = null;
  bluetoothSelectionDevices = new Map();
  if (callback) {
    callback(deviceId || "");
  }
}

function nativeBluetoothHelperPath() {
  const helperPath = path.join(__dirname, "native-bluetooth-sync.exe");
  return helperPath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
}

function runNativeBluetoothSync(pcBundle, sender) {
  if (!pcBundle.trim()) {
    throw new Error("No PC sync bundle was created.");
  }
  if (nativeBluetoothProcess) {
    throw new Error("Bluetooth sync is already running.");
  }

  const helperPath = nativeBluetoothHelperPath();
  if (!existsSync(helperPath)) {
    throw new Error("Native Bluetooth helper is missing from this PC app build.");
  }

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let phoneBundle = "";
    let lastError = "";
    let settled = false;
    const child = spawn(helperPath, [], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    nativeBluetoothProcess = child;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      nativeBluetoothProcess = null;
      reject(error);
    };

    const sendStatus = (message) => {
      if (!message || sender.isDestroyed()) return;
      sender.send("bluetooth:native-status", { message });
    };

    const parseLine = (line) => {
      const text = line.trim();
      if (!text) return;
      try {
        const event = JSON.parse(text);
        if (event.type === "status") {
          sendStatus(event.message || "");
        } else if (event.type === "error") {
          lastError = event.message || "Native Bluetooth sync failed.";
          sendStatus(lastError);
        } else if (event.type === "bundle" && event.payloadBase64) {
          phoneBundle = Buffer.from(event.payloadBase64, "base64").toString("utf8");
        }
      } catch {
        stderr += text + "\n";
      }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop() || "";
      for (const line of lines) {
        parseLine(line);
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", fail);
    child.on("close", (code) => {
      nativeBluetoothProcess = null;
      parseLine(stdout);
      if (settled) return;
      settled = true;
      if (phoneBundle) {
        resolve({ phoneBundle });
        return;
      }
      const detail = lastError || stderr.trim();
      reject(new Error(detail || `Native Bluetooth sync stopped with code ${code}.`));
    });

    child.stdin.end(pcBundle);
  });
}

function cancelNativeBluetoothSync() {
  if (nativeBluetoothProcess && !nativeBluetoothProcess.killed) {
    nativeBluetoothProcess.kill();
  }
  nativeBluetoothProcess = null;
}

function windowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.handle("window:minimize", (event) => {
  windowFromEvent(event)?.minimize();
});

ipcMain.handle("window:toggle-maximize", (event) => {
  const window = windowFromEvent(event);
  if (!window) return;
  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

ipcMain.handle("window:close", (event) => {
  windowFromEvent(event)?.close();
});

ipcMain.handle("window:go-back", (event) => {
  const window = windowFromEvent(event);
  if (window?.webContents.canGoBack()) {
    window.webContents.goBack();
  }
});

ipcMain.handle("window:go-forward", (event) => {
  const window = windowFromEvent(event);
  if (window?.webContents.canGoForward()) {
    window.webContents.goForward();
  }
});

function startServer() {
  const serverPath = path.join(app.getAppPath(), "server.js");
  const dataDir = path.join(app.getPath("userData"), "data");

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: "0.0.0.0",
      PORT: SERVER_PORT,
      SHOPPING_LIST_DATA_DIR: dataDir
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });

  serverProcess.stdout?.on("data", (chunk) => {
    console.log(String(chunk).trim());
  });

  serverProcess.stderr?.on("data", (chunk) => {
    console.error(String(chunk).trim());
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox(
        "Listy server stopped",
        "The local database server stopped unexpectedly. Restart the app to try again."
      );
    }
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  serverProcess = null;
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${SERVER_PORT}`);
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  const addresses = lanAddresses();
  if (addresses.length) {
    console.log(`Android sync URL: ${addresses[0]}`);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  cancelNativeBluetoothSync();
  stopServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
