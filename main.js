const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "pos", "index.html"));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// Exporta un documento HTML a PDF real (diálogo para guardar archivo).
ipcMain.handle("pdf-export", async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const titulo = (payload && payload.titulo) || "Documento";
  const html = payload && payload.html;
  if (typeof html !== "string" || !html.trim()) {
    return { ok: false, msg: "Sin contenido para exportar." };
  }
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await pdfWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    const pdf = await pdfWin.webContents.printToPDF({ printBackground: true });
    const safe = (String(titulo).replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 80)) || "documento";
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: safe + ".pdf",
      filters: [{ name: "Documento PDF", extensions: ["pdf"] }]
    });
    if (canceled || !filePath) return { ok: false, msg: "Operación cancelada." };
    await fs.writeFile(filePath, pdf);
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, msg: "Error al generar el PDF: " + String(e && e.message || e) };
  } finally {
    pdfWin.destroy();
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});