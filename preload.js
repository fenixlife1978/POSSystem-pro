const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  version: process.versions.electron,
  exportarPDF: (titulo, html) => ipcRenderer.invoke("pdf-export", { titulo, html }),
  // Almacenamiento SQLite local (principal en Electron)
  sqlite: {
    load: () => ipcRenderer.invoke("sqlite-load"),
    save: (data) => ipcRenderer.invoke("sqlite-save", data),
    backup: (label) => ipcRenderer.invoke("sqlite-backup", label),
    status: () => ipcRenderer.invoke("sqlite-status")
  },
  // Red multi-terminal (LAN)
  net: {
    start: (port) => ipcRenderer.invoke("net-start", port),
    stop: () => ipcRenderer.invoke("net-stop"),
    status: () => ipcRenderer.invoke("net-status")
  }
});