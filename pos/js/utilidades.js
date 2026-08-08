// ============== UTILIDADES: contraseña, configuración, usuarios, respaldos, auditoría, parámetros ==============
const _g = id => document.getElementById(id);

// ===== Parámetros del sistema =====
function cargarParametros() {
  _g("par-tasa").value = fmt(getTasa());
  _g("par-iva").value = (getIva() || 0).toFixed(0);
  _g("par-serie").value = DB.parametros.serie || "FACT";
}

function guardarParametros() {
  DB.parametros.tasaBCV = num(_g("par-tasa").value);
  DB.parametros.iva = num(_g("par-iva").value);
  DB.parametros.serie = _g("par-serie").value.trim() || "FACT";
  auditar("Parámetros actualizados", `Tasa BCV ${fmt(getTasa())} — IVA ${getIva()}%`);
  saveDB();
  recalcTotales();
  renderInventario();
  actualizarResultadoPrecio();
  _g("pos-caja-label").textContent = DB.parametros.caja;
  alert("Parámetros guardados correctamente.");
  closeWindow("parametros-window");
}

// ===== Configuración =====
function cargarConfig() {
  _g("cfg-empresa").value = DB.parametros.nombreEmpresa || "";
  _g("cfg-rif").value = DB.parametros.rif || "";
  _g("cfg-dir").value = DB.parametros.direccion || "";
  _g("cfg-tel").value = DB.parametros.telefono || "";
  _g("cfg-cajero").value = DB.parametros.cajero || "";
  _g("cfg-turno").value = DB.parametros.turno || 1;
  cargarCajas();
}

function guardarConfig() {
  DB.parametros.nombreEmpresa = _g("cfg-empresa").value.trim();
  DB.parametros.rif = _g("cfg-rif").value.trim();
  DB.parametros.direccion = _g("cfg-dir").value.trim();
  DB.parametros.telefono = _g("cfg-tel").value.trim();
  DB.parametros.cajero = _g("cfg-cajero").value.trim() || "ADMIN";
  DB.parametros.turno = num(_g("cfg-turno").value) || 1;
  auditar("Configuración actualizada", DB.parametros.nombreEmpresa);
  saveDB();
  sincronizarCajaActiva();
  _g("status-usuario").textContent = DB.parametros.cajero;
  _g("status-turno").textContent = DB.parametros.turno;
  _g("pos-caja-label").textContent = DB.parametros.caja;
  alert("Configuración guardada.");
  closeWindow("config-window");
}

// ===== Gestor de Cajas =====
function cargarCajas() {
  const body = _g("cajas-body");
  if (!body) return;
  body.innerHTML = (DB.cajas || []).map(c =>
    `<tr onclick="selectCaja('${c.id}')" class="${c.id === cajaActual().id ? "selected" : ""}">
      <td>${c.nombre}</td>
      <td>${c.cajero || "—"}</td>
      <td>${c.estado === "abierta" ? "ABIERTA" : "CERRADA"}</td>
      <td>${c.estado === "abierta" ? `Apertura: ${c.apertura}` : ""}</td>
    </tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#888">Sin cajas</td></tr>`;
  llenarSelectCajeros();
  if (DB.cajas && DB.cajas.length) selectCaja(DB.cajas[0].id);
}

function llenarSelectCajeros() {
  const sel = _g("cfg-caja-cajero");
  if (!sel) return;
  const cajeros = DB.usuarios.filter(u => u.rol === "Cajero" || u.rol === "Administrador").map(u => u.usuario);
  sel.innerHTML = cajeros.map(u => `<option>${u}</option>`).join("");
}

function selectCaja(id) {
  const c = (DB.cajas || []).find(x => x.id === id);
  if (!c) return;
  _g("cfg-caja-nombre").value = c.nombre;
  _g("cfg-caja-cajero").value = c.cajero || "";
  document.querySelectorAll("#cajas-body tr").forEach(tr => tr.classList.toggle("selected", tr.cells[0].textContent === c.nombre));
}

function nuevaCaja() {
  _g("cfg-caja-nombre").value = "";
  _g("cfg-caja-cajero").value = "";
  document.querySelectorAll("#cajas-body tr").forEach(tr => tr.classList.remove("selected"));
  _g("cfg-caja-nombre").focus();
}

function guardarCaja() {
  const nombre = _g("cfg-caja-nombre").value.trim();
  if (!nombre) { alert("Ingrese el nombre de la caja"); return; }
  const cajero = _g("cfg-caja-cajero").value;
  const existing = (DB.cajas || []).find(x => x.nombre === nombre);
  if (existing) {
    const anterior = existing.cajero;
    existing.cajero = cajero;
    // Si otra caja tenía asignado ese cajero, se la quitamos
    (DB.cajas || []).forEach(c => { if (c !== existing && c.cajero === cajero) c.cajero = ""; });
    auditar("Caja actualizada", `${nombre} → Cajero ${cajero || "—"}`);
  } else {
    const id = "CAJA" + String((DB.cajas || []).length + 1).padStart(2, "0");
    (DB.cajas || []).forEach(c => { if (c.cajero === cajero) c.cajero = ""; });
    DB.cajas.push({ id, nombre, cajero, estado: "cerrada", apertura: null, cierre: null, fondoBs: 0, fondoUSD: 0, cortesZ: 0 });
    auditar("Caja creada", `${nombre} → Cajero ${cajero || "—"}`);
  }
  sincronizarCajaActiva();
  saveDB();
  cargarCajas();
  alert("Caja guardada correctamente.");
}

function eliminarCaja() {
  const nombre = _g("cfg-caja-nombre").value.trim();
  if (!nombre) return;
  if (!confirm(`¿Eliminar la caja ${nombre}?`)) return;
  DB.cajas = (DB.cajas || []).filter(x => x.nombre !== nombre);
  if (!DB.cajas.length) DB.cajas.push({ id: "CAJA01", nombre: "CAJA 01", cajero: "ADMIN", estado: "cerrada", apertura: null, cierre: null, fondoBs: 0, fondoUSD: 0, cortesZ: 0 });
  sincronizarCajaActiva();
  auditar("Caja eliminada", nombre);
  saveDB();
  cargarCajas();
}

// ===== Cambio de contraseña =====
function cargarPassUsuario() {
  const sel = _g("pass-usuario");
  sel.innerHTML = DB.usuarios.filter(u => u.activo !== false).map(u => `<option value="${u.usuario}">${u.usuario}</option>`).join("");
}

function guardarPassword() {
  const usuario = _g("pass-usuario").value;
  const actual = _g("pass-actual").value;
  const nueva = _g("pass-nueva").value;
  const confirm = _g("pass-confirm").value;
  const u = DB.usuarios.find(x => x.usuario === usuario);
  if (!u) { alert("Usuario no encontrado"); return; }
  if (u.clave !== actual) { alert("La contraseña actual es incorrecta"); return; }
  if (!nueva) { alert("Ingrese la nueva contraseña"); return; }
  if (nueva !== confirm) { alert("La confirmación no coincide"); return; }
  u.clave = nueva;
  auditar("Cambio de contraseña", usuario);
  saveDB();
  alert("Contraseña actualizada.");
  closeWindow("password-window");
}

// ===== Usuarios =====
function renderUsuarios() {
  _g("usuarios-body").innerHTML = DB.usuarios.map(u =>
    `<tr onclick="selectUsuario('${u.usuario}')" class="${u.activo === false ? "row-out" : ""}">
      <td>${u.usuario}</td><td>${u.nombre}</td><td>${u.rol}</td><td>${u.activo === false ? "No" : "Sí"}</td>
    </tr>`).join("");
  if (DB.usuarios.length) selectUsuario(DB.usuarios[0].usuario);
}

function selectUsuario(usuario) {
  const u = DB.usuarios.find(x => x.usuario === usuario);
  if (!u) return;
  _g("usu-usuario").value = u.usuario;
  _g("usu-nombre").value = u.nombre || "";
  _g("usu-rol").value = u.rol || "Cajero";
  _g("usu-clave").value = u.clave || "";
  _g("usu-activo").checked = u.activo !== false;
  document.querySelectorAll("#usuarios-body tr").forEach(tr => tr.classList.toggle("selected", tr.cells[0].textContent === usuario));
}

function nuevoUsuario() {
  _g("usu-usuario").value = ""; _g("usu-nombre").value = "";
  _g("usu-rol").value = "Cajero"; _g("usu-clave").value = "";
  _g("usu-activo").checked = true;
  document.querySelectorAll("#usuarios-body tr").forEach(tr => tr.classList.remove("selected"));
  _g("usu-usuario").focus();
}

function guardarUsuario() {
  const usuario = _g("usu-usuario").value.trim();
  const nombre = _g("usu-nombre").value.trim();
  if (!usuario) { alert("Ingrese el nombre de usuario"); return; }
  const idx = DB.usuarios.findIndex(x => x.usuario === usuario);
  const data = { usuario, nombre: nombre || usuario, rol: _g("usu-rol").value, clave: _g("usu-clave").value, activo: _g("usu-activo").checked };
  if (idx >= 0) DB.usuarios[idx] = { ...DB.usuarios[idx], ...data };
  else DB.usuarios.push(data);
  auditar(idx >= 0 ? "Usuario actualizado" : "Usuario creado", usuario);
  saveDB();
  renderUsuarios();
}

function eliminarUsuario() {
  const usuario = _g("usu-usuario").value.trim();
  if (!usuario) return;
  if (usuario === "ADMIN") { alert("No puede eliminar el usuario ADMIN"); return; }
  if (!confirm(`¿Eliminar el usuario ${usuario}?`)) return;
  DB.usuarios = DB.usuarios.filter(x => x.usuario !== usuario);
  auditar("Usuario eliminado", usuario);
  saveDB();
  renderUsuarios();
}

// ===== Respaldos =====
const BACKUP_PREFIX = "pos_backup_";

function renderRespaldos() {
  _g("respaldos-body").innerHTML = DB.respaldos.map(r =>
    `<tr>
      <td>${r.fecha}</td><td>${r.hora}</td><td>${r.registros}</td>
      <td>
        <button class="btn-mini" title="Restaurar" onclick="restaurarRespaldo('${r.id}')">↩</button>
        <button class="btn-mini" title="Descargar" onclick="descargarRespaldo('${r.id}')">⬇</button>
        <button class="btn-mini" title="Eliminar" onclick="eliminarRespaldo('${r.id}')">✕</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#888">No hay respaldos</td></tr>`;
}

function crearRespaldo() {
  const id = "B" + Date.now();
  const snapshot = JSON.parse(JSON.stringify(DB));
  try {
    localStorage.setItem(BACKUP_PREFIX + id, JSON.stringify(snapshot));
  } catch (e) { alert("No se pudo crear el respaldo (puede estar lleno el almacenamiento)."); return; }
  DB.respaldos.unshift({ id, fecha: hoy(), hora: hora12(), registros: (DB.productos.length + " productos / " + DB.clientes.length + " clientes / " + DB.ventas.length + " ventas") });
  auditar("Respaldo creado", id);
  saveDB();
  renderRespaldos();
  alert("Respaldo creado correctamente.");
}

function restaurarRespaldo(id) {
  if (!confirm(`¿Restaurar el respaldo ${id}? Se reemplazarán los datos actuales.`)) return;
  try {
    const raw = localStorage.getItem(BACKUP_PREFIX + id);
    if (!raw) { alert("No se encontró el respaldo"); return; }
    const saved = JSON.parse(raw);
    Object.keys(DB).forEach(k => { if (saved[k] !== undefined) DB[k] = saved[k]; });
    DB.carrito = [];
    saveDB();
    alert("Respaldo restaurado. La pantalla se actualizará.");
    location.reload();
  } catch (e) { alert("Error al restaurar el respaldo"); }
}

function descargarRespaldo(id) {
  let raw = null;
  if (id) raw = localStorage.getItem(BACKUP_PREFIX + id);
  else if (DB.respaldos.length) raw = localStorage.getItem(BACKUP_PREFIX + DB.respaldos[0].id);
  if (!raw) { alert("Seleccione un respaldo para descargar"); return; }
  const blob = new Blob([raw], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo_${id || DB.respaldos[0].id}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
}

function eliminarRespaldo(id) {
  if (!confirm(`¿Eliminar el respaldo ${id}?`)) return;
  localStorage.removeItem(BACKUP_PREFIX + id);
  DB.respaldos = DB.respaldos.filter(x => x.id !== id);
  auditar("Respaldo eliminado", id);
  saveDB();
  renderRespaldos();
}

// ===== Auditoría =====
function filtrarAuditoria() {
  const q = (_g("aud-filtro").value || "").toLowerCase().trim();
  const rows = DB.auditoria.filter(a => !q || a.accion.toLowerCase().includes(q) || a.detalle.toLowerCase().includes(q) || a.usuario.toLowerCase().includes(q));
  _g("aud-body").innerHTML = rows.slice(0, 500).map(a =>
    `<tr><td>${a.fecha}</td><td>${a.hora}</td><td>${a.usuario}</td><td>${a.accion}</td><td>${a.detalle}</td></tr>`
  ).join("") || `<tr><td colspan="5" style="text-align:center;color:#888">Sin registros</td></tr>`;
}

// ===== Carga de ventanas de utilidades =====
function cargarVentanaUtilidad(name, orig) {
  if (name === "parametros") cargarParametros();
  if (name === "config") cargarConfig();
  if (name === "password") { cargarPassUsuario(); _g("pass-actual").value = ""; _g("pass-nueva").value = ""; _g("pass-confirm").value = ""; }
  if (name === "usuarios") renderUsuarios();
  if (name === "respaldos") renderRespaldos();
  if (name === "auditoria") { _g("aud-filtro").value = ""; filtrarAuditoria(); }
  if (name === "caja") renderMovimientosCaja();
  if (orig) orig(name);
}

// Interceptar apertura de ventanas de utilidades/caja (después de que windows.js defina openModuleWindow)
document.addEventListener("DOMContentLoaded", () => {
  const orig = window.openModuleWindow;
  if (typeof orig !== "function") return;
  window.openModuleWindow = function(name) {
    if (["parametros", "config", "password", "usuarios", "respaldos", "auditoria", "caja"].includes(name)) {
      cargarVentanaUtilidad(name, orig);
    } else {
      orig(name);
    }
  };
});
