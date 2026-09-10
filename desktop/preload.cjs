const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shoppingListDesktop", {
  isDesktop: true,
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  goBack: () => ipcRenderer.invoke("window:go-back"),
  goForward: () => ipcRenderer.invoke("window:go-forward"),
  nativeBluetoothSync: (pcBundle) => ipcRenderer.invoke("bluetooth:native-sync", pcBundle),
  selectBluetoothDevice: (deviceId) => ipcRenderer.invoke("bluetooth:select-device", deviceId),
  cancelBluetoothSelection: () => ipcRenderer.invoke("bluetooth:cancel-selection"),
  onNativeBluetoothStatus: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("bluetooth:native-status", listener);
    return () => ipcRenderer.removeListener("bluetooth:native-status", listener);
  },
  onBluetoothDevices: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("bluetooth:devices", listener);
    return () => ipcRenderer.removeListener("bluetooth:devices", listener);
  }
});
