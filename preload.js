const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  version: process.versions.electron,
  exportarPDF: (titulo, html) => ipcRenderer.invoke("pdf-export", { titulo, html })
});