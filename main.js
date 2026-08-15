const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const net = require("net");

// Fija el nombre de la aplicación ANTES de que se resuelva el userData.
// Sin esto, al lanzar con `electron .` Electron usa "Electron" como carpeta de datos.
app.setName("POSsystem pro");

// ---------------------------------------------------------------------------
// ALMACENAMIENTO: archivo SQLite .db real en disco.
// Se usa sql.js (SQLite compilado a WASM): corre en el proceso main sin
// necesidad de compilar binarios nativos (mejor-sqlite3 necesitaba rebuild
// por ABI y no había toolchain). El contenido del sistema se guarda en una
// tabla kv (JSON) y todo el archivo .db se persiste en disco.
// ---------------------------------------------------------------------------
let SQL = null;          // constructor sql.js (inicializado de forma perezosa)
const DB_KEY = "db";

function getDbPath() {
  const p = path.join(app.getPath("userData"), "pos_sistema.db");
  return p;
}

// Carga sql.js (WASM) una sola vez.
function sqlReady() {
  if (SQL) return Promise.resolve(SQL);
  return require("sql.js")().then(S => { SQL = S; return S; });
}

async function dbExists() {
  try { await fs.access(getDbPath()); return true; } catch (e) { return false; }
}

// Lee el snapshot (JSON) desde el .db. Devuelve null si no existe.
async function sqliteLoad() {
  try {
    if (!await dbExists()) return null;
    const INFO_SQL = "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)";
    const buf = await fs.readFile(getDbPath());
    const S = await sqlReady();
    const db = new S.Database(new Uint8Array(buf));
    db.exec(INFO_SQL);
    const r = db.exec("SELECT value FROM kv WHERE key = ?", [DB_KEY]);
    db.close();
    if (!r.length || !r[0].values.length) return null;
    return JSON.parse(r[0].values[0][0]);
  } catch (e) {
    console.error("Error leyendo .db:", e);
    return null;
  }
}

// Guarda el snapshot (JSON) en el .db y lo escribe en disco.
async function sqliteSave(data) {
  try {
    if (data === undefined || data === null) return { ok: false, msg: "Datos inválidos" };
    const S = await sqlReady();
    const db = new S.Database();
    db.run("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.run("INSERT INTO kv(key, value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      [DB_KEY, JSON.stringify(data)]);
    const bytes = db.export();
    db.close();
    const dir = path.dirname(getDbPath());
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(getDbPath(), Buffer.from(bytes));
    return { ok: true, size: bytes.length };
  } catch (e) {
    console.error("Error escribiendo .db:", e);
    return { ok: false, msg: String(e && e.message || e) };
  }
}

// Copia del archivo .db a la carpeta de respaldos con marca de tiempo.
async function sqliteBackup(label) {
  const src = getDbPath();
  const bkDir = path.join(app.getPath("userData"), "backups");
  try {
    if (!await dbExists()) return { ok: false, msg: "Aún no hay base de datos" };
    await fs.mkdir(bkDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const tag = label ? label.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "-") : "auto";
    const dest = path.join(bkDir, `pos_sistema_${tag}_${ts}.db`);
    await fs.copyFile(src, dest);
    return { ok: true, filePath: dest };
  } catch (e) {
    return { ok: false, msg: String(e && e.message || e) };
  }
}

// Reinicio total: elimina el archivo .db principal y toda la carpeta de respaldos.
async function sqliteClear() {
  try {
    const p = getDbPath();
    if (await dbExists()) await fs.unlink(p);
    // Borrar también los respaldos .db en disco (la carpeta "backups").
    const bkDir = path.join(app.getPath("userData"), "backups");
    try { await fs.rm(bkDir, { recursive: true, force: true }); } catch (e) {}
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: String(e && e.message || e) };
  }
}

function sqliteStatus() {
  let size = 0;
  const p = getDbPath();
  try { size = fs.statSync(p).size; } catch (e) { size = 0; }
  return {
    ok: true,
    engine: "sql.js (SQLite WASM)",
    path: p,
    exists: size > 0,
    size,
    node: process.versions.node,
    electron: process.versions.electron
  };
}

// ---------------------------------------------------------------------------
// SERVIDOR HTTP (multi-terminal). Configurable, APAGADO por defecto.
// ---------------------------------------------------------------------------
let httpServer = null;
const DEFAULT_HTTP_PORT = 8753;

function startHttpServer(port) {
  if (httpServer) return { ok: true, port };
  const http = require("http");
  const server = http.createServer((req, res) => {
    const send = (code, payload) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
      return res.end();
    }
    try {
      if (req.method === "GET" && req.url === "/api/status") {
        return send(200, { ok: true, service: "pos-network", time: new Date().toISOString(), status: sqliteStatus() });
      }
      if (req.method === "GET" && req.url === "/api/health") {
        return send(200, { ok: true });
      }
      // Baja el snapshot (JSON) para los clientes.
      if (req.method === "GET" && req.url === "/api/db") {
        return sqliteLoad().then(data =>
          send(200, { ok: true, db: data })
        ).catch(() => send(500, { ok: false, msg: "Error leyendo .db" }));
      }
      // Sube el snapshot (JSON) escrito por un cliente.
      if (req.method === "POST" && req.url === "/api/db") {
        let body = "";
        req.on("data", c => { if (body.length < 200 * 1024 * 1024) body += c; });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            return sqliteSave(parsed).then(r => send(r.ok ? 200 : 500, r));
          } catch (e) {
            return send(400, { ok: false, msg: "JSON inválido" });
          }
        });
        return;
      }
      return send(404, { ok: false, msg: "Ruta no encontrada" });
    } catch (e) {
      return send(500, { ok: false, msg: String(e && e.message || e) });
    }
  });
  return new Promise(resolve => {
    server.on("error", e => resolve({ ok: false, msg: String(e && e.message || e) }));
    server.listen(port, "0.0.0.0", () => {
      httpServer = server;
      console.log("Servidor red POS activo en puerto", port);
      resolve({ ok: true, port });
    });
  });
}

function ensureHttp(port) {
  if (httpServer) return Promise.resolve({ ok: true, port });
  return startHttpServer(port || DEFAULT_HTTP_PORT);
}

// ---------------------------------------------------------------------------
// VENTANA
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
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

ipcMain.handle("sqlite-load", () => sqliteLoad());
ipcMain.handle("sqlite-save", (_e, data) => sqliteSave(data));
ipcMain.handle("sqlite-backup", (_e, label) => sqliteBackup(label || "manual"));
ipcMain.handle("sqlite-clear", () => sqliteClear());
ipcMain.handle("sqlite-status", () => sqliteStatus());
ipcMain.handle("net-start", (_e, port) => {
  // Agarra el puerto libre si uno está en uso.
  return ensureHttp(port || DEFAULT_HTTP_PORT);
});
ipcMain.handle("net-stop", () => {
  if (httpServer) {
    try { httpServer.close(); } catch (e) {}
    httpServer = null;
  }
  return { running: false, port: 0 };
});
ipcMain.handle("net-status", () => {
  let ip = [];
  const os = require("os");
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(name => {
    (ifaces[name] || []).forEach(iface => {
      if (iface.family === "IPv4" && !iface.internal) ip.push(iface.address);
    });
  });
  return { running: !!httpServer, port: httpServer ? httpServer.address().port : 0, ip };
});

// ---------------------------------------------------------------------------
// CICLO DE VIDA
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Al cerrar la app se cierra el servidor de red si estuviera activo.
app.on("before-quit", () => {
  if (httpServer) { try { httpServer.close(); } catch (e) {} }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});