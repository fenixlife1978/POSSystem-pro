// ============== Render y lógica de los módulos ==============
const $ = id => document.getElementById(id);
const setVal = (id, v) => { const el = $(id); if (el) el.value = (Math.round(num(v) * 100) / 100).toFixed(2).replace(".", ","); };
const fmtV = v => fmt(v);

// ===== Pestañas =====
function setTab(btn) {
  const row = btn.parentElement;
  const scope = row.closest("[data-tabs]");
  if (!scope) return;
  row.querySelectorAll(".tab, .tab-title").forEach(t => t.classList.remove("tab-active"));
  btn.classList.add("tab-active");
  scope.querySelectorAll("[data-panel]").forEach(p => p.classList.toggle("hidden-panel", p.id !== btn.dataset.tabTarget));
}

// ===== CLIENTES =====
function renderClientes() {
  const body = $("clientes-body");
  if (!body) return;
  body.innerHTML = DB.clientes.map(c =>
    `<tr onclick="selectCliente('${c.codigo}')"><td>${c.codigo}</td><td>${c.nombre}</td></tr>`
  ).join("");
  if (DB.clientes.length) selectCliente(DB.clientes[0].codigo);
}

function selectCliente(cod) {
  const c = DB.clientes.find(x => x.codigo === cod);
  if (!c) return;
  selectClienteForm(c);
  document.querySelectorAll("#clientes-body tr").forEach(tr => tr.classList.remove("selected"));
  document.querySelectorAll("#clientes-body tr").forEach(tr => { if (tr.cells[0].textContent === cod) tr.classList.add("selected"); });
  const ventas = DB.ventas.filter(v => v.cliente === c.nombre);
  $("cli-ultima").textContent = ventas.length ? ventas[ventas.length - 1].fecha : "—";
  $("cli-total").textContent = fmt(ventas.reduce((s, v) => s + v.total, 0));
  $("cli-saldo").textContent = fmt(c.saldo || 0);
}

function selectClienteForm(c) {
  $("cli-cod").value = c.codigo || "";
  $("cli-rif").value = c.rif || "";
  const esJuridica = c.tipoPersona === "juridica" || /^[JG]-/.test(c.rif || "");
  $("cli-tipo-persona").value = esJuridica ? "juridica" : "natural";
  const m = /^([VEJG])\s*-?\s*([0-9]+-[0-9]+)$/.exec((c.rif || "").trim());
  if (m) {
    const dt = $("cli-doc-tipo"); if (dt) dt.value = m[1].toUpperCase() + "-";
    const dn = $("cli-doc-num"); if (dn) dn.value = m[2];
  } else {
    const dt = $("cli-doc-tipo"); if (dt) dt.value = /^[JG]-/.test(c.rif || "") ? "J-" : "V-";
    const dn = $("cli-doc-num"); if (dn) dn.value = (c.rif || "").replace(/^[VEJG]-?/, "");
  }
  $("cli-representante").value = c.representante || "";
  $("cli-nombre").value = c.nombre || "";
  $("cli-dir").value = c.direccion || "";
  $("cli-tel").value = c.telefono || "";
  $("cli-email").value = c.email || "";
  $("cli-cel").value = c.celular || "";
  $("cli-contacto").value = c.contacto || "";
  $("cli-tipo").value = c.tipo || "Contado";
  $("cli-lim").value = (c.limite || 0).toFixed(2).replace(".", ",");
  $("cli-dias").value = c.dias || 0;
  $("cli-vend").value = c.vendedor || "--- NINGUNO ---";
  $("cli-obs").value = c.observaciones || "";
  cambiarTipoPersona();
  cambiarTipoCliente();
}

function leerClienteForm() {
  const actual = DB.clientes.find(x => x.codigo === $("cli-cod").value.trim());
  const tipoPersona = $("cli-tipo-persona").value;
  const tipoDoc = $("cli-doc-tipo").value || "V-";
  const numDoc = $("cli-doc-num").value.trim();
  const rif = ($("cli-rif").value.trim() || (numDoc ? tipoDoc + numDoc : "")).replace(/\./g, "");
  return {
    codigo: $("cli-cod").value.trim(),
    rif,
    tipoPersona,
    representante: tipoPersona === "juridica" ? $("cli-representante").value.trim() : "",
    nombre: $("cli-nombre").value.trim(),
    direccion: $("cli-dir").value.trim(),
    telefono: $("cli-tel").value.trim(),
    email: $("cli-email").value.trim(),
    celular: $("cli-cel").value.trim(),
    contacto: $("cli-contacto").value.trim(),
    tipo: $("cli-tipo").value,
    limite: num($("cli-lim").value),
    dias: num($("cli-dias").value),
    vendedor: $("cli-vend").value,
    observaciones: $("cli-obs").value.trim(),
    saldo: actual ? (actual.saldo || 0) : 0
  };
}

function cambiarTipoPersona() {
  const esJ = $("cli-tipo-persona").value === "juridica";
  const dt = $("cli-doc-tipo");
  if (dt) dt.value = esJ ? "J-" : "V-";
  const label = $("cli-nombre-label");
  if (label) label.textContent = esJ ? "Razón Social:" : "Nombres y Apellidos:";
  const rl = $("cli-representante-label"); if (rl) rl.textContent = esJ ? "Representante Legal:" : "Apellido de Casada:";
  const ni = $("cli-natural-info"); if (ni) ni.classList.toggle("hidden-panel", esJ);
  const ji = $("cli-juridica-info"); if (ji) ji.classList.toggle("hidden-panel", !esJ);
  const extra = $("cli-fisc-extra-label"); if (extra) extra.style.display = esJ ? "" : "none";
  const extraIn = $("cli-fisc-extra-input"); if (extraIn) extraIn.style.display = esJ ? "" : "none";
}

function cambiarTipoCliente() {
  const mixto = $("cli-tipo").value === "Mixto";
  const lim = $("cli-lim");
  const dias = $("cli-dias");
  [lim, dias].forEach(el => { if (el) el.disabled = mixto; });
  if (mixto) {
    if (lim) lim.value = "0,00";
    if (dias) dias.value = "0";
  }
}

function validarDocVzla(rif) {
  const s = (rif || "").trim().replace(/[.\s]+/g, "");
  if (!s) return { ok: true, msg: "Sin documento (RIF opcional)" };
  const m = /^([VEJG])\s*-?\s*([0-9]+)(?:\s*-?\s*([0-9]))?$/.exec(s);
  if (!m) return { ok: false, msg: "Formato inválido. Use V-13313521 / E-12345678 o J-123456789-4" };
  const tipo = m[1].toUpperCase();
  const cuerpo = m[2];
  const esJuridico = tipo === "J" || tipo === "G";
  if (esJuridico) {
    if (cuerpo.length !== 9) return { ok: false, msg: "RIF J-/G- debe tener 9 dígitos" };
  } else {
    if (cuerpo.length < 6 || cuerpo.length > 8) return { ok: false, msg: "Cédula V-/E- debe tener entre 6 y 8 dígitos" };
  }
  return { ok: true, msg: "Documento válido" };
}

function nuevoCliente() {
  selectClienteForm({ codigo: genNro(DB.clientes, "codigo", "", 6), rif: "V-", tipoPersona: "natural", representante: "", nombre: "", direccion: "", telefono: "", email: "", celular: "", contacto: "", tipo: "Contado", limite: 0, dias: 0, vendedor: "--- NINGUNO ---", observaciones: "" });
  document.querySelectorAll("#clientes-body tr").forEach(tr => tr.classList.remove("selected"));
  $("cli-nombre").focus();
}

function guardarCliente() {
  const c = leerClienteForm();
  if (!c.codigo || !c.nombre) { alert("Ingrese al menos el código y el nombre/razón social del cliente"); return; }
  const valid = validarDocVzla(c.rif);
  if (!valid.ok) { alert("Documento inválido: " + valid.msg); return; }
  const idx = DB.clientes.findIndex(x => x.codigo === c.codigo);
  if (idx >= 0) DB.clientes[idx] = c; else DB.clientes.push(c);
  renderClientes();
  auditar(idx >= 0 ? "Cliente actualizado" : "Cliente creado", `${c.codigo} — ${c.nombre} (${c.rif})`);
  saveDB();
  selectCliente(c.codigo);
  alert(idx >= 0 ? "Cambios guardados con éxito." : "Cliente guardado con éxito.");
}

function eliminarCliente() {
  if (typeof rolPuedeModulo === "function" && !rolPuedeModulo("clientes-eliminar")) { alert("No tiene permisos para eliminar clientes."); return; }
  const cod = $("cli-cod").value.trim();
  if (!cod) return;
  if (!confirm(`¿Eliminar el cliente ${cod}?`)) return;
  DB.clientes = DB.clientes.filter(x => x.codigo !== cod);
  renderClientes();
  auditar("Cliente eliminado", cod);
  saveDB();
  if (DB.clientes.length) selectCliente(DB.clientes[0].codigo);
  else nuevoCliente();
}

function buscarCliente() {
  const campo = $("clientes-campo").value;
  const q = $("clientes-search").value.trim().toLowerCase();
  const rows = DB.clientes.filter(c => {
    const val = (campo === "Código" ? c.codigo : campo === "Nombre" ? c.nombre : c.rif) || "";
    return !q || val.toLowerCase().includes(q);
  });
  $("clientes-body").innerHTML = rows.map(c =>
    `<tr onclick="selectCliente('${c.codigo}')"><td>${c.codigo}</td><td>${c.nombre}</td></tr>`
  ).join("") || `<tr><td colspan="2" style="text-align:center;color:#888">Sin resultados</td></tr>`;
}

function seleccionarClienteEnPOS() {
  const c = DB.clientes.find(x => x.codigo === $("cli-cod").value.trim());
  if (!c) { alert("Seleccione un cliente de la lista"); return; }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set("cliente-codigo", c.codigo);
  set("cliente-nombre", c.nombre);
  set("cliente-direccion", c.direccion || "");
  const rif = c.rif || "";
  const m = /^([VEJ])\s*-/.exec(rif);
  if (m) {
    const tipo = document.getElementById("cliente-doc-tipo");
    if (tipo) tipo.value = m[1].toUpperCase() + "-";
    const num = rif.slice(m[0].length);
    set("cliente-rif", /^[VE]/i.test(m[1]) ? formatearCedulaVe(num) : num);
  } else {
    set("cliente-rif", rif);
  }
  set("cliente-telefono", c.telefono || "");
  const cred = document.getElementById("cliente-credito");
  if (cred) cred.checked = c.tipo === "Crédito";
  if (typeof toggleCredito === "function") toggleCredito();
  if (typeof actualizarClienteNuevoRow === "function") actualizarClienteNuevoRow(false);
  if (typeof mostrarSaldoCliente === "function") mostrarSaldoCliente(c);
  closeWindow("clientes-window");
  openModuleWindow("pos");
}

function imprimirClientes() {
  if (typeof rolPuedeModulo === "function" && !rolPuedeModulo("clientes-imprimir")) { alert("No tiene permisos para imprimir el listado de clientes."); return; }
  imprimirHTML("Listado de Clientes", ["Código", "Nombre", "RIF", "Teléfono", "Tipo"], DB.clientes.map(c => [c.codigo, c.nombre, c.rif, c.telefono, c.tipo]));
}
function exportarClientes() {
  if (typeof rolPuedeModulo === "function" && !rolPuedeModulo("clientes-exportar")) { alert("No tiene permisos para exportar clientes."); return; }
  exportarCSV("clientes", ["Codigo", "Nombre", "RIF", "Telefono", "Tipo"], DB.clientes.map(c => [c.codigo, c.nombre, c.rif, c.telefono, c.tipo]));
}

// ===== PRODUCTOS =====
function renderProductos() {
  const body = $("productos-body");
  if (!body) return;
  body.innerHTML = DB.productos.map(p =>
    `<tr onclick="selectProducto('${p.codigo}')"><td>${p.codigo}</td><td>${p.descripcion}</td></tr>`
  ).join("");
  if (DB.productos.length) selectProducto(DB.productos[0].codigo);
}

function selectProducto(cod) {
  const p = DB.productos.find(x => x.codigo === cod);
  if (!p) return;
  selectProductoForm(p);
  document.querySelectorAll("#productos-body tr").forEach(tr => tr.classList.remove("selected"));
  document.querySelectorAll("#productos-body tr").forEach(tr => { if (tr.cells[0].textContent === cod) tr.classList.add("selected"); });
}

function selectProductoForm(p) {
  $("prod-cod").value = p.codigo || "";
  $("prod-barra").value = p.barra || "";
  $("prod-desc").value = p.descripcion || "";
  rellenarCampoSelect("prod-cat", "categorias", p.categoria || "GENERAL");
  rellenarCampoSelect("prod-subcat", "subcategorias", p.subcategoria || "");
  rellenarCampoSelect("prod-marca", "marcas", p.marca || "GENERICO");
  $("prod-nro-parte").value = p.nroParte || "";
  rellenarCampoSelect("prod-presentacion", "presentaciones", p.presentacion || "UNIDAD");
  rellenarCampoSelect("prod-unidad", "unidades", p.unidad || "UND");
  $("prod-compat").value = p.compatibilidad || "";
  $("prod-ubic").value = p.ubicacion || "";
  $("prod-inactivo").checked = !!p.inactivo;
  const existe = DB.productos.some(x => x.codigo === (p.codigo || ""));
  const stockIni = $("prod-stock-ini");
  stockIni.value = (p.stockIni !== undefined ? p.stockIni : p.existencia || 0).toFixed(2).replace(".", ",");
  stockIni.disabled = existe;
  $("prod-exist").textContent = fmt(p.existencia || 0);
  $("prod-reserv").textContent = fmt(p.reservado || 0);
  $("prod-disp").textContent = fmt((p.existencia || 0) - (p.reservado || 0));
  $("prod-min").value = p.minimo || 0;
  $("prod-tasa-hint").textContent = fmt(getTasa());
  setVal("prod-costo", p.costoUSD || 0);
  setVal("prod-margen", p.margenPct || 0);
  setVal("prod-precio-usd", p.precioUSD || 0);
  setVal("prod-precio-bs", p.precio || 0);
  const pr = p.precios || {};
  setVal("prod-mayor-usd", (pr.mayor && pr.mayor.usd) || 0);
  setVal("prod-mayor-bs", (pr.mayor && pr.mayor.bs) || 0);
  setVal("prod-mayor-margen", (pr.mayor && pr.mayor.margen) || 15);
  setVal("prod-oferta-usd", (pr.oferta && pr.oferta.usd) || 0);
  setVal("prod-oferta-bs", (pr.oferta && pr.oferta.bs) || 0);
  setVal("prod-oferta-margen", (pr.oferta && pr.oferta.margen) || 20);
  setVal("prod-promo-usd", (pr.promo && pr.promo.usd) || 0);
  setVal("prod-promo-bs", (pr.promo && pr.promo.bs) || 0);
  setVal("prod-promo-margen", (pr.promo && pr.promo.margen) || 25);
  actualizarResultadoPrecio();
}

// Select administrable (catálogo con agregar/eliminar). Conserva el valor actual aunque no esté en el catálogo.
function rellenarCampoSelect(selId, listaKey, valorActual) {
  const sel = $(selId);
  if (!sel) return;
  const lista = (DB.parametros[listaKey] || []).slice();
  const val = valorActual || "";
  if (val && lista.indexOf(val) === -1) lista.unshift(val);
  sel.innerHTML = lista.map(v => `<option>${v}</option>`).join("");
  sel.value = val;
  sel.dataset.lista = listaKey;
}

function agregarOpcionCampo(selId, listaKey) {
  const sel = $(selId);
  if (!sel) return;
  const nuevo = prompt("Ingrese la nueva opción:", "").trim();
  if (!nuevo) return;
  if (!DB.parametros[listaKey]) DB.parametros[listaKey] = [];
  if (DB.parametros[listaKey].indexOf(nuevo) === -1) DB.parametros[listaKey].push(nuevo);
  rellenarCampoSelect(selId, listaKey, nuevo);
  saveDB();
}

function eliminarOpcionCampo(selId, listaKey) {
  const sel = $(selId);
  if (!sel || !sel.value) return;
  if (!confirm(`¿Eliminar "${sel.value}" del catálogo de ${sel.dataset.lista || listaKey}?`)) return;
  DB.parametros[listaKey] = (DB.parametros[listaKey] || []).filter(v => v !== sel.value);
  rellenarCampoSelect(selId, listaKey, sel.value);
  saveDB();
}

function leerProductoForm() {
  const tasa = getTasa();
  const costo = num($("prod-costo").value);
  const margen = num($("prod-margen").value);
  let usd = num($("prod-precio-usd").value);
  let bs = num($("prod-precio-bs").value);
  if (usd <= 0 && bs > 0) usd = bs / tasa;
  if (usd <= 0) usd = costo > 0 ? costo / (1 - Math.min(margen, 99.99) / 100) : 0;
  const tier = k => {
    let tu = num($("prod-" + k + "-usd").value);
    let tb = num($("prod-" + k + "-bs").value);
    let tm = num($("prod-" + k + "-margen").value);
    const den = 1 - Math.min(Math.max(tm, 0), 99.99) / 100;
    if (tu <= 0 && tb > 0) tu = tb / tasa;
    if (tu <= 0 && costo > 0) tu = costo / den;
    if (tm <= 0 && costo > 0 && tu > 0) tm = ((tu - costo) / tu) * 100;
    return { usd: r2(tu), bs: r2(tu > 0 ? tu * tasa : tb), margen: r2(tm) };
  };
  return {
    codigo: $("prod-cod").value.trim(),
    barra: $("prod-barra").value.trim(),
    descripcion: $("prod-desc").value.trim(),
    categoria: $("prod-cat").value,
    subcategoria: $("prod-subcat").value.trim(),
    marca: $("prod-marca").value,
    nroParte: $("prod-nro-parte").value.trim(),
    presentacion: $("prod-presentacion").value,
    unidad: $("prod-unidad").value,
    compatibilidad: $("prod-compat").value.trim(),
    ubicacion: $("prod-ubic").value.trim(),
    inactivo: $("prod-inactivo").checked,
    stockIni: num($("prod-stock-ini").value),
    minimo: num($("prod-min").value),
    costoUSD: r2(costo),
    margenPct: r2(margen),
    precioUSD: r2(usd),
    precio: r2(usd * tasa),
    precios: { mayor: tier("mayor"), oferta: tier("oferta"), promo: tier("promo") }
  };
}

function nuevoProducto() {
  selectProductoForm({ codigo: genNro(DB.productos, "codigo", "", 6), barra: "", descripcion: "", categoria: "GENERAL", subcategoria: "", marca: "GENERICO", nroParte: "", presentacion: "UNIDAD", unidad: "UND", compatibilidad: "", ubicacion: "", inactivo: false, stockIni: 0, minimo: 0, costoUSD: 0, margenPct: 0, precioUSD: 0, precio: 0, existencia: 0, reservado: 0, precios: { mayor: { usd: 0, bs: 0, margen: 15 }, oferta: { usd: 0, bs: 0, margen: 20 }, promo: { usd: 0, bs: 0, margen: 25 } } });
  document.querySelectorAll("#productos-body tr").forEach(tr => tr.classList.remove("selected"));
  const si = $("prod-stock-ini");
  if (si) si.value = "";
  $("prod-desc").focus();
}

function guardarProducto() {
  const p = leerProductoForm();
  if (!p.codigo || !p.descripcion) { alert("Ingrese al menos el código y la descripción del producto"); return; }
  const idx = DB.productos.findIndex(x => x.codigo === p.codigo);
  if (idx >= 0) {
    const prev = DB.productos[idx];
    DB.productos[idx] = { ...prev, ...p, existencia: prev.existencia, reservado: prev.reservado, stockIni: prev.stockIni };
  } else {
    const stockIni = Math.max(0, num(p.stockIni) || 0);
    p.existencia = stockIni;
    p.reservado = 0;
    p.stockIni = stockIni;
    DB.productos.push(p);
    if (typeof movimientoInv === "function") movimientoInv(p.codigo, "Stock Inicial", stockIni, "INICIAL", stockIni);
  }
  renderProductos();
  renderInventario();
  auditar(idx >= 0 ? "Producto actualizado" : "Producto creado", `${p.codigo} — ${p.descripcion} — PVP Bs. ${fmt(p.precio)}`);
  saveDB();
  selectProducto(p.codigo);
  alert(idx >= 0 ? "Cambios guardados con éxito." : "Producto guardado con éxito.");
}

function eliminarProducto() {
  const cod = $("prod-cod").value.trim();
  if (!cod) return;
  if (!confirm(`¿Eliminar el producto ${cod}?`)) return;
  DB.productos = DB.productos.filter(x => x.codigo !== cod);
  renderProductos();
  renderInventario();
  auditar("Producto eliminado", cod);
  saveDB();
  if (DB.productos.length) selectProducto(DB.productos[0].codigo);
  else nuevoProducto();
}

function buscarProducto() {
  const campo = $("productos-campo").value;
  const q = $("productos-search").value.trim().toLowerCase();
  const rows = DB.productos.filter(p => {
    const val = (campo === "Código" ? p.codigo : campo === "Descripción" ? p.descripcion : p.barra) || "";
    return !q || val.toLowerCase().includes(q);
  });
  $("productos-body").innerHTML = rows.map(p =>
    `<tr onclick="selectProducto('${p.codigo}')"><td>${p.codigo}</td><td>${p.descripcion}</td></tr>`
  ).join("") || `<tr><td colspan="2" style="text-align:center;color:#888">Sin resultados</td></tr>`;
}

// ===== Precios tridireccionales (Markup sobre venta) =====
function actualizarResultadoPrecio() {
  const costo = num($("prod-costo").value);
  const margen = num($("prod-margen").value);
  const usd = num($("prod-precio-usd").value);
  const bs = num($("prod-precio-bs").value);
  const gan = (usd - costo) * (usd > 0 ? 1 : 0);
  $("prod-precio-result").innerHTML =
    `Costo: <b>$ ${fmt(costo)}</b> &nbsp;|&nbsp; Margen: <b>${fmt(margen)}%</b> &nbsp;|&nbsp; PVP: <b>$${fmt(usd)} / ${fmt(bs)} Bs.</b> &nbsp;|&nbsp; Ganancia: <b>$${fmt(gan)}</b>`;
}

function recalcPrecio(from) {
  const tasa = getTasa();
  let costo = num($("prod-costo").value);
  let margen = num($("prod-margen").value);
  let usd = num($("prod-precio-usd").value);
  let bs = num($("prod-precio-bs").value);
  const den = 1 - Math.min(Math.max(margen, 0), 99.99) / 100;
  if (from === "costo") { usd = den > 0 ? costo / den : 0; bs = usd * tasa; }
  else if (from === "margen") { usd = den > 0 ? costo / den : 0; bs = usd * tasa; }
  else if (from === "usd") { margen = usd > 0 && costo > 0 ? ((usd - costo) / usd) * 100 : 0; bs = usd * tasa; }
  else if (from === "bs") { usd = bs / tasa; margen = usd > 0 && costo > 0 ? ((usd - costo) / usd) * 100 : 0; }
  if (from !== "costo") setVal("prod-costo", costo);
  if (from !== "margen") setVal("prod-margen", margen);
  if (from !== "usd") setVal("prod-precio-usd", usd);
  if (from !== "bs") setVal("prod-precio-bs", bs);
  actualizarResultadoPrecio();
}

// Recalculo tridireccional de los precios especiales (Mayor / Oferta / Promoción)
function recalcPrecioTier(tier, from) {
  const tasa = getTasa();
  const costo = num($("prod-costo").value);
  const sel = (suf) => $("prod-" + tier + "-" + suf);
  let usd = num(sel("usd").value);
  let bs = num(sel("bs").value);
  let margen = num(sel("margen").value);
  const den = 1 - Math.min(Math.max(margen, 0), 99.99) / 100;
  if (from === "usd") { margen = usd > 0 && costo > 0 ? ((usd - costo) / usd) * 100 : 0; bs = usd * tasa; }
  else if (from === "bs") { usd = bs / tasa; margen = usd > 0 && costo > 0 ? ((usd - costo) / usd) * 100 : 0; }
  else if (from === "margen") { usd = costo > 0 && den > 0 ? costo / den : 0; bs = usd * tasa; }
  setVal("prod-" + tier + "-usd", usd);
  setVal("prod-" + tier + "-bs", bs);
  setVal("prod-" + tier + "-margen", margen);
}

function imprimirProductos() { imprimirHTML("Listado de Productos", ["Código", "Descripción", "Categoría", "Costo $", "PVP $", "PVP Bs.", "Existencia"], DB.productos.map(p => [p.codigo, p.descripcion, p.categoria, fmt(p.costoUSD || 0), fmt(p.precioUSD || 0), fmt(p.precio || 0), fmt(p.existencia || 0)])); }
function exportarProductos() { exportarCSV("productos", ["Codigo", "Descripcion", "Categoria", "CostoUSD", "PVPUSD", "PVPBs", "Existencia"], DB.productos.map(p => [p.codigo, p.descripcion, p.categoria, p.costoUSD || 0, p.precioUSD || 0, p.precio || 0, p.existencia || 0])); }

// ===== COTIZACIONES =====
let cotiTemp = [];
let cotiEditNro = null;

function fillClienteSelect(selId, seleccionado) {
  const sel = $(selId);
  if (!sel) return;
  sel.innerHTML = DB.clientes.map(c => `<option ${c.nombre === seleccionado ? "selected" : ""}>${c.nombre}</option>`).join("");
}

function renderCotizaciones() {
  const body = $("cotizaciones-body");
  if (!body) return;
  const rows = filtrarCotizacionesData();
  body.innerHTML = rows.map(c => {
    const cls = c.estado === "Pendiente" ? "selected" : "";
    return `<tr class="${cls}" onclick="selectCotizacion('${c.nro}', this)">
      <td>${c.nro}</td><td>${c.fecha}</td><td>${c.cliente}</td>
      <td style="text-align:right">${fmt(c.total)}</td><td>${c.estado}</td>
    </tr>`;
  }).join("");
  if (rows.length) selectCotizacion(rows[0].nro, body.querySelector("tr"));
  else { $("cotiz-detail-body").innerHTML = ""; $("cot-sub").textContent = $("cot-iva").textContent = $("cot-total").textContent = "0,00"; }
}

function filtrarCotizacionesData() {
  const q = ($("coti-search").value || "").trim().toLowerCase();
  const est = $("coti-estado").value;
  return DB.cotizaciones.filter(c =>
    (!q || c.nro.includes(q) || c.cliente.toLowerCase().includes(q)) &&
    (est === "Todos" || c.estado === est)
  );
}

function filtrarCotizaciones() { renderCotizaciones(); }

function selectCotizacion(nro, row) {
  document.querySelectorAll("#cotizaciones-body tr").forEach(tr => tr.classList.remove("selected"));
  if (row) row.classList.add("selected");
  const c = DB.cotizaciones.find(x => x.nro === nro);
  if (!c) return;
  const body = $("cotiz-detail-body");
  body.innerHTML = (c.lineas || []).map(d =>
    `<tr><td>${d.codigo}</td><td>${d.descripcion}</td><td style="text-align:right">${fmt(d.cantidad)}</td><td style="text-align:right">${fmt(d.precio)}</td><td style="text-align:right">${fmt(d.total)}</td></tr>`
  ).join("");
  const sub = (c.lineas || []).reduce((s, d) => s + d.total, 0);
  const iva = sub * (getIva() / 100);
  $("cot-sub").textContent = fmt(sub);
  $("cot-iva").textContent = fmt(iva);
  $("cot-total").textContent = fmt(sub + iva);
}

function nuevaCotizacion() {
  cotiTemp = [];
  cotiEditNro = null;
  $("coti-n-nro").value = genNro(DB.cotizaciones, "nro", "", 7);
  $("coti-n-fecha").value = hoy();
  fillClienteSelect("coti-n-cliente");
  $("coti-n-obs").value = "";
  renderCotizacionNueva();
  openModuleWindow("cotizacion-nueva");
}

function editarCotizacion() {
  const row = document.querySelector("#cotizaciones-body tr.selected");
  if (!row) { alert("Seleccione una cotización"); return; }
  const c = DB.cotizaciones.find(x => x.nro === row.cells[0].textContent);
  if (!c) return;
  cotiEditNro = c.nro;
  $("coti-n-nro").value = c.nro;
  $("coti-n-fecha").value = c.fecha;
  fillClienteSelect("coti-n-cliente", c.cliente);
  $("coti-n-obs").value = c.observaciones || "";
  cotiTemp = (c.lineas || []).map(l => ({ ...l }));
  renderCotizacionNueva();
  openModuleWindow("cotizacion-nueva");
}

let cotiSelectedCod = null;

function cotiProdMatches(p, q) {
  const hay = `${p.codigo} ${p.descripcion || ""}`.toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}

function buscarProductoCotizacion() {
  const term = $("coti-n-prod").value.trim().toLowerCase();
  const list = $("coti-n-prod-results");
  if (!term) { list.innerHTML = ""; list.style.display = "none"; return; }
  const prods = DB.productos.filter(p => cotiProdMatches(p, term)).slice(0, 10);
  list.innerHTML = prods.map((p, i) =>
    `<div class="prov-result" onmousedown="event.preventDefault();seleccionarProductoCotizacion(${i})">
       <b>${p.codigo}</b> — ${p.descripcion} <span class="usd-sub">Bs. ${fmt(p.precio || 0)} (${fmt((p.precio || 0) / (getTasa() || 1))} $)</span>
     </div>`).join("");
  list.style.display = prods.length ? "block" : "none";
}

function seleccionarProductoCotizacion(i) {
  const term = $("coti-n-prod").value.trim().toLowerCase();
  const prods = DB.productos.filter(p => cotiProdMatches(p, term)).slice(0, 10);
  const p = prods[i];
  if (!p) return;
  cotiSelectedCod = p.codigo;
  $("coti-n-prod").value = `${p.codigo} — ${p.descripcion}`;
  $("coti-n-prod-results").style.display = "none";
  if (!num($("coti-n-precio").value)) $("coti-n-precio").value = String((p.precio || 0).toFixed(2)).replace(".", ",");
  mostrarPrecioCotiUsd();
  $("coti-n-cant").focus();
  $("coti-n-cant").select();
}

function ocultarProductoCotiResults() {
  const list = $("coti-n-prod-results");
  if (list) list.style.display = "none";
}

function onProductoCotiKey(ev) {
  if (ev.key === "Enter") {
    ev.preventDefault();
    const list = $("coti-n-prod-results");
    if (list && list.children.length) seleccionarProductoCotizacion(0);
    else agregarLineaCotizacion();
  } else if (ev.key === "Escape") {
    ocultarProductoCotiResults();
  }
}

function mostrarPrecioCotiUsd() {
  const t = getTasa() || 1;
  $("coti-n-precio-usd").textContent = `= ${fmt(num($("coti-n-precio").value) / t)} $`;
}

function agregarLineaCotizacion() {
  const raw = $("coti-n-prod").value.trim();
  if (!raw) { alert("Busque y seleccione un producto"); return; }
  let p = cotiSelectedCod ? DB.productos.find(x => x.codigo === cotiSelectedCod) : null;
  if (!p || raw !== `${p.codigo} — ${p.descripcion}`) {
    const txt = raw.toLowerCase();
    p = DB.productos.find(x => x.codigo.toLowerCase() === txt) ||
        DB.productos.find(x => (x.descripcion || "").toLowerCase() === txt);
  }
  if (!p) { alert("Producto no encontrado"); return; }
  const cant = num($("coti-n-cant").value) || 1;
  const precio = num($("coti-n-precio").value) || p.precio || 0;
  const t = getTasa() || 1;
  cotiTemp.push({
    codigo: p.codigo, descripcion: p.descripcion, cantidad: cant,
    precio, precioUSD: precio / t,
    total: cant * precio, totalUSD: cant * precio / t
  });
  renderCotizacionNueva();
  cotiSelectedCod = null;
  $("coti-n-prod").value = ""; $("coti-n-cant").value = "1"; $("coti-n-precio").value = "";
  $("coti-n-precio-usd").textContent = "= 0,00 $";
  $("coti-n-prod").focus();
}

function renderCotizacionNueva() {
  const t = getTasa() || 1;
  $("coti-n-body").innerHTML = cotiTemp.map((d, i) =>
    `<tr><td>${d.codigo}</td><td>${d.descripcion}</td><td style="text-align:right">${fmt(d.cantidad)}</td>` +
    `<td style="text-align:right">${fmt(d.precio)}</td><td style="text-align:right">${fmt((d.precioUSD || d.precio / t))}</td>` +
    `<td style="text-align:right">${fmt(d.total)}</td><td style="text-align:right">${fmt(d.totalUSD || d.total / t)}</td>` +
    `<td><button class="btn-mini" onclick="quitarLineaCotizacion(${i})">✕</button></td></tr>`
  ).join("");
  const sub = cotiTemp.reduce((s, d) => s + d.total, 0);
  const iva = sub * (getIva() / 100);
  const descEl = document.getElementById("coti-n-desc-input");
  const desc = descEl ? (num(descEl.value) || 0) : 0;
  const total = sub + iva - desc;
  $("coti-n-sub").textContent = fmt(sub);
  $("coti-n-sub-usd").textContent = fmt(sub / t);
  $("coti-n-desc").textContent = fmt(desc);
  $("coti-n-desc-usd").textContent = fmt(desc / t);
  $("coti-n-iva").textContent = fmt(iva);
  $("coti-n-iva-usd").textContent = fmt(iva / t);
  $("coti-n-total").textContent = fmt(total);
  $("coti-n-total-usd").textContent = fmt(total / t);
}

function quitarLineaCotizacion(i) { cotiTemp.splice(i, 1); renderCotizacionNueva(); }

function guardarCotizacion() {
  if (!cotiTemp.length) { alert("Agregue al menos un producto"); return; }
  const sub = cotiTemp.reduce((s, d) => s + d.total, 0);
  const total = sub + sub * (getIva() / 100);
  const cot = {
    nro: $("coti-n-nro").value,
    fecha: $("coti-n-fecha").value,
    cliente: $("coti-n-cliente").value,
    observaciones: $("coti-n-obs").value,
    total, estado: "Pendiente",
    lineas: cotiTemp.map(l => ({ ...l }))
  };
  if (cotiEditNro) {
    const idx = DB.cotizaciones.findIndex(x => x.nro === cotiEditNro);
    if (idx >= 0) DB.cotizaciones[idx] = cot;
  } else {
    DB.cotizaciones.unshift(cot);
  }
  auditar("Cotización", `${cot.nro} — ${cot.cliente} — ${fmt(total)} Bs.`);
  saveDB();
  renderCotizaciones();
  closeWindow("cotizacion-nueva-window");
  alert(cotiEditNro ? "Cambios guardados con éxito." : "Cotización guardada con éxito.");
}

function eliminarCotizacion() {
  const row = document.querySelector("#cotizaciones-body tr.selected");
  if (!row) { alert("Seleccione una cotización"); return; }
  const nro = row.cells[0].textContent;
  if (!confirm(`¿Eliminar la cotización ${nro}?`)) return;
  DB.cotizaciones = DB.cotizaciones.filter(x => x.nro !== nro);
  auditar("Cotización eliminada", nro);
  saveDB();
  renderCotizaciones();
}

function convertirCotizacionVenta() {
  const row = document.querySelector("#cotizaciones-body tr.selected");
  if (!row) { alert("Seleccione una cotización"); return; }
  const nro = row.cells[0].textContent;
  const c = DB.cotizaciones.find(x => x.nro === nro);
  if (!c) return;
  DB.carrito = (c.lineas || []).map(l => ({ codigo: l.codigo, descripcion: l.descripcion, cantidad: l.cantidad, precio: l.precio, descuento: 0, total: l.cantidad * l.precio }));
  $("cliente-nombre").value = c.cliente;
  const cli = DB.clientes.find(x => x.nombre === c.cliente);
  if (cli) $("cliente-codigo").value = cli.codigo;
  $("observaciones").value = c.observaciones || "";
  c.estado = "Aceptada";
  auditar("Cotización convertida a venta", nro);
  saveDB();
  renderCotizaciones();
  renderCarrito();
  closeWindow("cotizaciones-window");
}

function imprimirCotizacion() {
  const row = document.querySelector("#cotizaciones-body tr.selected");
  if (!row) return alert("Seleccione una cotización");
  const c = DB.cotizaciones.find(x => x.nro === row.cells[0].textContent);
  imprimirCotizacionProfesional(c);
}

function imprimirCotizacionProfesional(c) {
  if (!c) return;
  const tasa = getTasa() || 1;
  const sub = (c.lineas || []).reduce((s, l) => s + num(l.total), 0);
  const iva = r2(sub * getIva() / 100);
  const total = r2(sub + iva);
  const cli = DB.clientes.find(x => x.nombre === c.cliente);
  const validez = num(DB.parametros.validezCotizacion) || 15;
  const venc = sumarDias(c.fecha, validez);

  const filas = (c.lineas || []).map((l, i) =>
    `<tr><td class="num">${i + 1}</td><td>${_escHtml(l.codigo)}</td><td>${_escHtml(l.descripcion)}</td>` +
    `<td class="num">${fmt(l.cantidad)}</td><td class="num">${fmt(l.precio)}</td><td class="num">${fmt(l.total)}</td></tr>`
  ).join("") || `<tr><td colspan="6" style="text-align:center;color:#888">Sin líneas</td></tr>`;

  const body =
    _metaPrintHtml(`COTIZACIÓN ${c.nro}`, `Fecha: ${c.fecha}  ·  Válida hasta: ${venc}`) +
    `<div class="ficha"><table>` +
      `<tr><td class="etq">Cliente:</td><td><b>${_escHtml(c.cliente)}</b></td><td class="etq">RIF / C.I.:</td><td>${_escHtml(cli ? cli.rif : "")}</td></tr>` +
      `<tr><td class="etq">Dirección:</td><td colspan="3">${_escHtml(cli ? cli.direccion : "")}</td></tr>` +
    `</table></div>` +
    `<table>` +
      `<thead><tr><th class="num">N°</th><th>Código</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Total Bs.</th></tr></thead>` +
      `<tbody>${filas}</tbody>` +
    `</table>` +
    `<table class="totales">` +
      `<tr><td class="lbl">Sub-Total</td><td class="num">${fmt(sub)}</td></tr>` +
      `<tr><td class="lbl">I.V.A. (${getIva()}%)</td><td class="num">${fmt(iva)}</td></tr>` +
      `<tr><td class="gr">TOTAL</td><td class="num">${fmt(total)} Bs.</td></tr>` +
      `<tr><td class="lbl">Total (USD)</td><td class="num">$ ${fmt(total / tasa)}</td></tr>` +
    `</table>` +
    (c.observaciones ? `<div class="obs"><b>Observaciones:</b><br>${_escHtml(c.observaciones)}</div>` : "") +
    `<div class="cond">CONDICIONES GENERALES:<br>` +
      `1. Precios sujetos a cambios por variación de la tasa BCV.<br>` +
      `2. Esta cotización tiene una validez de ${validez} días calendario.<br>` +
      `3. La forma y condiciones de pago serán acordadas con el cliente.<br>` +
      `4. Los productos cuentan con garantía de fábrica.</div>` +
    `<div class="firmas">` +
      `<div>______________________<br>Elaborado por</div>` +
      `<div>______________________<br>Autorizado por</div>` +
      `<div>______________________<br>Aceptado por el Cliente</div>` +
    `</div>`;

  imprimirDocumentoHTML("Cotización " + c.nro, body);
}

// ===== DEVOLUCIONES =====
let devTemp = [];
let devVenta = null;

function devEstadoVenta(v) {
  if (!v) return "disponible";
  const dLineas = v.devueltoLineas || {};
  const totalCant = (v.lineas || []).reduce((s, l) => s + num(l.cantidad), 0);
  const devuelto = Object.values(dLineas).reduce((s, x) => s + num(x), 0);
  if (v.estadoDevolucion === "total" || (totalCant > 0 && devuelto >= totalCant - 0.001)) return "devuelta";
  if (devuelto > 0) return "parcial";
  return "disponible";
}

function devRestanteLinea(v, codigo) {
  if (!v) return 0;
  const l = (v.lineas || []).find(x => x.codigo === codigo);
  const orig = l ? num(l.cantidad) : 0;
  const devuelto = (v.devueltoLineas && v.devueltoLineas[codigo]) || 0;
  return r2(orig - devuelto);
}

function nuevaDevolucion() {
  devTemp = [];
  devVenta = null;
  $("dev-nro").value = genNro(DB.devoluciones, "nro", "DEV-", 6);
  $("dev-fecha").value = hoy();
  $("dev-factura").value = "";
  $("dev-cliente").value = "";
  $("dev-cant").value = "1";
  $("dev-pago-monto").value = "";
  $("dev-pago-metodo").innerHTML = "";
  $("dev-prod").innerHTML = '<option value="">— Seleccione una factura —</option>';
  $("dev-fact-search").value = "";
  renderFacturasDev();
  renderDevVentaInfo();
  renderDevVentaLines();
  renderDevHistorial();
  renderDevNueva();
  setDevFormLocked(false);
  openModuleWindow("devoluciones");
  const sf = $("dev-fact-search"); if (sf) sf.focus();
}

function renderFacturasDev() {
  const list = $("dev-fact-list");
  if (!list) return;
  const q = ($("dev-fact-search").value || "").trim().toLowerCase();
  const rows = DB.ventas.slice().reverse().filter(v =>
    !q || String(v.nro).includes(q) || (v.cliente || "").toLowerCase().includes(q));
  const labels = { devuelta: "DEVUELTA", parcial: "PARCIAL", disponible: "DISPONIBLE" };
  list.innerHTML = rows.map(v => {
    const est = devEstadoVenta(v);
    return `<div class="dev-fact-item ${devVenta && devVenta.nro === v.nro ? "selected" : ""}" onclick="selectFacturaDev('${v.nro}')">
      <span class="fact-nro">${v.nro}</span>
      <span>${fmt(v.total)} Bs.</span>
      <span class="dev-badge ${est}">${labels[est]}</span>
    </div>`;
  }).join("") || `<div class="dev-empty">No hay facturas que coincidan</div>`;
}

function selectFacturaDev(nro) {
  const v = DB.ventas.find(x => x.nro === nro);
  if (!v) return;
  const est = devEstadoVenta(v);
  const bloqueada = est !== "disponible";
  devVenta = v;
  devTemp = [];
  $("dev-factura").value = v.nro;
  $("dev-cliente").value = v.cliente || "CONSUMIDOR FINAL";
  renderFacturasDev();
  renderDevVentaInfo();
  renderDevVentaLines();
  renderDevHistorial();
  setDevFormLocked(bloqueada);
  if (bloqueada) {
    if (!confirm("Esta factura ya tiene devoluciones registradas y queda bloqueada solo para consulta. ¿Ver información?")) { devVenta = null; renderDevVentaInfo(); renderDevHistorial(); return; }
    const sel = $("dev-prod");
    if (sel) sel.innerHTML = '<option value="">— Factura bloqueada —</option>';
    renderDevNueva();
  } else {
    renderDevProd();
    renderDevNueva();
    renderDevPago();
  }
}

function renderDevVentaInfo() {
  const el = $("dev-venta-info");
  if (!el) return;
  if (!devVenta) { el.innerHTML = `<div class="dev-empty">Seleccione una factura en el panel izquierdo.</div>`; return; }
  const v = devVenta;
  const est = devEstadoVenta(v);
  const labels = { devuelta: "DEVUELTA", parcial: "PARCIAL", disponible: "DISPONIBLE" };
  const pagos = (v.pagos || []).map(p => `${p.metodo}: ${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)}`).join(" · ") || "—";
  const dev = (v.devoluciones || []).length;
  const montoDev = v.montoDevuelto || 0;
  el.innerHTML = `<b>${DB.parametros.serie} ${v.nro}</b> — ${v.fecha} ${v.hora} <span class="dev-badge ${est}">${labels[est]}</span><br>` +
    `Cliente: <b>${v.cliente || "CONSUMIDOR FINAL"}</b><br>` +
    `Pagos recibidos: ${pagos}<br>` +
    `Total facturado: <b>${fmt(v.total)} Bs.</b>` +
    (dev ? `<br>Devoluciones registradas: <b>${dev}</b> · Monto devuelto: <b>${fmt(montoDev)} Bs.</b>` : "");
  if (est !== "disponible") {
    el.innerHTML += `<div class="dev-locked">Factura BLOQUEADA para consulta — no admite más devoluciones.</div>`;
  }
}

function renderDevHistorial() {
  const el = $("dev-historial");
  if (!el) return;
  const v = devVenta;
  const nros = (v && v.devoluciones) || [];
  if (!nros.length) { el.innerHTML = ""; return; }
  const devs = nros.map(nro => DB.devoluciones.find(d => d.nro === nro)).filter(Boolean);
  if (!devs.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="dev-hist-titulo">Devoluciones realizadas sobre esta factura (items devueltos y reembolsos)</div>` +
    devs.map(d => {
      const lineas = (d.lineas || []).map(l =>
        `<tr><td>${l.codigo}</td><td>${l.descripcion}</td><td class="r">${fmt(l.cantidad)}</td><td class="r">${fmt(l.precio)}</td><td class="r">${fmt(l.total)}</td></tr>`).join("") ||
        `<tr><td colspan="5" class="dev-empty">Sin líneas</td></tr>`;
      const pagos = (d.pagos || []).map(p =>
        `<tr><td>${p.metodo}</td><td class="r">${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)}</td><td class="r">Bs. ${fmt(p.equivBs || 0)}</td></tr>`).join("") ||
        `<tr><td colspan="3" class="dev-empty">Sin pagos</td></tr>`;
      return `<div class="dev-hist-item">
        <div class="dev-hist-head"><b>${d.nro}</b> — ${d.fecha} ${d.hora || ""}${d.motivo ? ` — Motivo: ${d.motivo}` : ""}</div>
        <table class="grid"><thead><tr><th>Código</th><th>Descripción</th><th class="r">Cant. devuelta</th><th class="r">Precio</th><th class="r">Total</th></tr></thead><tbody>${lineas}</tbody></table>
        <table class="grid"><thead><tr><th>Método de Reembolso</th><th class="r">Monto</th><th class="r">Equiv. Bs.</th></tr></thead><tbody>${pagos}</tbody></table>
      </div>`;
    }).join("");
}

function setDevFormLocked(locked) {
  ["dev-prod", "dev-cant", "dev-motivo", "dev-pago-metodo", "dev-pago-monto"].forEach(id => {
    const el = $(id);
    if (el) el.disabled = locked;
  });
  const add = $("dev-agregar-btn");
  if (add) add.disabled = locked;
  const reg = $("dev-registrar-btn");
  if (reg) reg.disabled = locked;
}

function renderDevVentaLines() {
  const body = $("dev-venta-lines");
  if (!body) return;
  if (!devVenta) { body.innerHTML = ""; return; }
  body.innerHTML = (devVenta.lineas || []).map(l => {
    const d = (devVenta.devueltoLineas && devVenta.devueltoLineas[l.codigo]) || 0;
    return `<tr><td>${l.codigo}</td><td>${l.descripcion}</td><td class="r">${fmt(l.cantidad)}</td><td class="r">${fmt(l.precio)}</td><td class="r">${fmt(l.total)}</td><td class="r">${fmt(d)}</td></tr>`;
  }).join("") || `<tr><td colspan="6" class="dev-empty">Sin líneas</td></tr>`;
}

function renderDevProd() {
  const sel = $("dev-prod");
  if (!sel) return;
  if (!devVenta) { sel.innerHTML = '<option value="">— Seleccione una factura —</option>'; return; }
  const opts = (devVenta.lineas || []).map((l, i) => {
    const rest = devRestanteLinea(devVenta, l.codigo);
    if (rest <= 0) return "";
    return `<option value="${l.codigo}">${l.codigo} — ${l.descripcion} (disponible ${fmt(rest)})</option>`;
  }).join("");
  sel.innerHTML = opts || '<option value="">— Sin productos disponibles —</option>';
}

function agregarLineaDevolucion() {
  if (!devVenta) { alert("Seleccione primero una factura/venta."); return; }
  const cod = $("dev-prod").value;
  if (!cod) { alert("Seleccione un producto de la factura."); return; }
  const cant = num($("dev-cant").value);
  if (!cant || cant <= 0) { alert("Ingrese una cantidad válida."); return; }
  const l = (devVenta.lineas || []).find(x => x.codigo === cod);
  const rest = devRestanteLinea(devVenta, cod);
  const enTemp = devTemp.filter(d => d.codigo === cod).reduce((s, d) => s + num(d.cantidad), 0);
  if (cant + enTemp > rest) { alert(`Solo quedan ${fmt(rest - enTemp)} unidades por devolver de este producto.`); return; }
  devTemp.push({
    codigo: cod,
    descripcion: l ? l.descripcion : "(Sin descripción)",
    cantidad: cant,
    precio: l ? l.precio : 0,
    total: r2(cant * (l ? l.precio : 0))
  });
  renderDevNueva();
  $("dev-cant").value = "1";
  $("dev-cant").focus();
}

function renderDevNueva() {
  $("dev-body").innerHTML = devTemp.map((d, i) =>
    `<tr><td>${d.codigo}</td><td>${d.descripcion}</td><td class="r">${fmt(d.cantidad)}</td><td class="r">${fmt(d.precio)}</td><td class="r">${fmt(d.total)}</td><td><button class="btn-mini" onclick="quitarLineaDevolucion(${i})">✕</button></td></tr>`
  ).join("") || `<tr><td colspan="6" class="dev-empty">Sin productos a devolver</td></tr>`;
  const sub = devTemp.reduce((s, d) => s + d.total, 0);
  const iva = sub * (getIva() / 100);
  $("dev-sub").textContent = fmt(sub);
  $("dev-iva").textContent = fmt(iva);
  $("dev-total").textContent = fmt(sub + iva);
  renderDevPago();
}

function quitarLineaDevolucion(i) { devTemp.splice(i, 1); renderDevNueva(); }

function renderDevPago() {
  const sel = $("dev-pago-metodo");
  if (!sel) return;
  if (!sel.options.length) {
    (METODOS_PAGO || []).filter(m => !m.credit).forEach(m => {
      const o = document.createElement("option");
      o.value = m.label; o.textContent = m.label;
      sel.appendChild(o);
    });
  }
  const total = num($("dev-total").textContent);
  const mm = (METODOS_PAGO || []).find(x => x.label === sel.value);
  const monto = $("dev-pago-monto");
  if (monto) {
    if (mm && mm.moneda === "USD") monto.value = total > 0 ? r2(total / (getTasa() || 1)).toFixed(2).replace(".", ",") : "";
    else monto.value = total > 0 ? total.toFixed(2).replace(".", ",") : "";
  }
  updateDevPagoHint();
}

function updateDevPagoHint() {
  const hint = $("dev-pago-hint");
  if (!hint) return;
  const total = num($("dev-total").textContent);
  const met = $("dev-pago-metodo") ? $("dev-pago-metodo").value : "";
  const m = (METODOS_PAGO || []).find(x => x.label === met);
  if (m && m.moneda === "USD") {
    hint.textContent = total > 0
      ? `Total a devolver: Bs. ${fmt(total)} ≈ $ ${fmt(r2(total / (getTasa() || 1)))} — ingrese el monto en USD`
      : "";
    return;
  }
  hint.textContent = total > 0 ? `Total a devolver: ${fmt(total)} Bs.` : "";
}

function registrarDevolucion() {
  if (!devVenta) { alert("Seleccione la factura a devolver."); return; }
  if (!devTemp.length) { alert("Agregue al menos un producto a devolver."); return; }
  const sub = devTemp.reduce((s, d) => s + d.total, 0);
  const total = r2(sub + sub * (getIva() / 100));
  const metodo = $("dev-pago-metodo").value;
  const monto = num($("dev-pago-monto").value);
  if (!metodo) { alert("Seleccione el método de pago de la devolución."); return; }
  if (!monto || monto <= 0) { alert("Ingrese el monto a devolver."); return; }
  const mm = (METODOS_PAGO || []).find(x => x.label === metodo);
  const moneda = mm ? mm.moneda : "Bs";
  if (moneda === "USD") {
    const esperadoUsd = r2(total / (getTasa() || 1));
    if (Math.abs(monto - esperadoUsd) > 0.02) {
      alert(`El monto en USD ($ ${fmt(monto)}) debe coincidir con el total (Bs. ${fmt(total)} ≈ $ ${fmt(esperadoUsd)}).`);
      return;
    }
  } else if (Math.abs(monto - total) > 0.01) {
    alert(`El monto a devolver (${fmt(monto)}) debe coincidir con el total (${fmt(total)}).`);
    return;
  }
  const nro = $("dev-nro").value;
  const dev = {
    nro, fecha: $("dev-fecha").value, hora: hora12(),
    cliente: $("dev-cliente").value || "CONSUMIDOR FINAL",
    factura: devVenta.nro,
    motivo: $("dev-motivo").value,
    metodo,
    moneda,
    pagos: [{ metodo, moneda, monto: r2(monto), equivBs: r2(moneda === "USD" ? monto * getTasa() : monto) }],
    total: r2(total),
    totalBs: r2(total),
    totalUsd: r2(moneda === "USD" ? monto : total / (getTasa() || 1)),
    esParcial: true,
    lineas: devTemp.map(l => ({ ...l }))
  };
  DB.devoluciones.unshift(dev);

  // Bloquear la venta: registrar lo devuelto (quedará solo para consulta)
  devVenta.devueltoLineas = devVenta.devueltoLineas || {};
  devTemp.forEach(d => {
    devVenta.devueltoLineas[d.codigo] = r2((devVenta.devueltoLineas[d.codigo] || 0) + num(d.cantidad));
  });
  devVenta.montoDevuelto = r2((devVenta.montoDevuelto || 0) + total);
  devVenta.devoluciones = devVenta.devoluciones || [];
  devVenta.devoluciones.push(nro);
  const est = devEstadoVenta(devVenta);
  devVenta.estadoDevolucion = est === "devuelta" ? "total" : "parcial";

  // Reingreso de inventario
  devTemp.forEach(d => {
    const p = DB.productos.find(x => x.codigo === d.codigo);
    if (!p) return;
    p.existencia = (p.existencia || 0) + d.cantidad;
    const movs = DB.movimientosInv.filter(m => m.producto === p.codigo);
    const saldo = (movs.length ? movs[0].saldo : 0) + d.cantidad;
    movimientoInv(p.codigo, "Devolución", d.cantidad, dev.nro, r2(saldo));
  });

  // Egreso de caja por método de pago (para el arqueo)
  dev.pagos.forEach(p => {
    if (p.metodo === "Efectivo Bs.") movimientoCaja("Devolución (Efectivo Bs.)", dev.nro, p.monto, 0, false);
    else if (p.metodo === "Efectivo USD (físico)") movimientoCaja("Devolución (Efectivo USD)", dev.nro, 0, p.monto, false);
    else if (p.metodo !== "Crédito (CxC)") movimientoCaja("Devolución (" + p.metodo + ")", dev.nro, p.moneda === "USD" ? 0 : p.monto, p.moneda === "USD" ? p.monto : 0, false);
  });

  auditar("Devolución registrada", `${dev.nro} — Factura ${dev.factura} — ${dev.cliente} — ${fmt(total)} Bs.`);
  saveDB();
  renderInventario();
  devTemp = [];
  renderDevNueva();
  renderFacturasDev();
  renderDevVentaInfo();
  renderDevVentaLines();
  renderDevHistorial();
  setDevFormLocked(true);
  alert(`Devolución ${dev.nro} registrada sobre la factura ${dev.factura}.\nTotal devuelto: ${fmt(total)} Bs.`);
  $("dev-nro").value = genNro(DB.devoluciones, "nro", "DEV-", 6);
}

function anularDevolucion() {
  if (!devTemp.length) { alert("No hay devolución en proceso para anular."); return; }
  if (!confirm("¿Anular la devolución en proceso?")) return;
  devTemp = [];
  renderDevNueva();
  auditar("Devolución anulada", "(en proceso)");
}

function imprimirDevolucion() {
  if (!devTemp.length) return alert("No hay líneas para imprimir");
  const total = num($("dev-total").textContent);
  imprimirHTML("Devolución" + (devVenta ? " — Factura " + devVenta.nro : ""),
    ["Código", "Descripción", "Cantidad", "Precio", "Total"],
    devTemp.map(d => [d.codigo, d.descripcion, fmt(d.cantidad), fmt(d.precio), fmt(d.total)])
      .concat([["TOTAL", "", "", "", fmt(total)]])
  );
}

// ===== COMPRAS =====
let compTemp = [];
let compProdMatches = [];

function decimalesCompra() {
  const d = num($("comp-n-dec") ? $("comp-n-dec").value : "2");
  return d === 3 || d === 4 ? d : 2;
}
function fmtComp(n) {
  const d = decimalesCompra();
  return fmtVE(n, d);
}
function costoCostoBCV(costo) {
  const tasa = tasaCompraActual();
  const bcv = tasaBcvCompra();
  return bcv > 0 ? costo * tasa / bcv : costo;
}

function renderCompras() {
  const body = $("compras-body");
  if (!body) return;
  const rows = filtrarComprasData();
  body.innerHTML = rows.map(c => {
    const cls = c.estatus === "Pendiente" ? "selected" : "";
    const tipo = c.tipo || "Contado";
    return `<tr class="${cls}" onclick="selectCompra('${c.nro}', this)">
      <td>${c.nro}</td><td>${c.fecha}</td><td>${c.proveedor}</td>
      <td style="text-align:right">${fmt(c.total)}</td><td>${tipo}</td>
      <td style="text-align:right">${fmt(c.pagado || 0)}</td>
      <td style="text-align:right">${fmt(c.pendiente !== undefined ? c.pendiente : c.total - (c.pagado || 0))}</td>
      <td>${c.estatus}</td>
    </tr>`;
  }).join("");
  if (rows.length) selectCompra(rows[0].nro, body.querySelector("tr"));
}

function filtrarComprasData() {
  const q = ($("compra-search").value || "").trim().toLowerCase();
  const est = $("compra-estado").value;
  return DB.compras.filter(c =>
    (!q || c.nro.includes(q) || c.proveedor.toLowerCase().includes(q)) &&
    (est === "Todos" || c.estatus === est)
  );
}

function filtrarCompras() { renderCompras(); }

function selectCompra(nro, row) {
  document.querySelectorAll("#compras-body tr").forEach(tr => tr.classList.remove("selected"));
  if (row) row.classList.add("selected");
  const c = DB.compras.find(x => x.nro === nro);
  if (!c) return;
  const lineas = c.lineas || [];
  $("compras-detail-body").innerHTML = lineas.map(d =>
    `<tr>
      <td>${d.codigo}</td><td>${d.descripcion}</td>
      <td style="text-align:right">${fmt(d.cantidad)}</td>
      <td style="text-align:right">${fmt(d.costo)}</td>
      <td style="text-align:center">${d.exentoIva ? "✓" : "—"}</td>
      <td style="text-align:right">${fmt(d.total)}</td>
      <td style="text-align:right">${fmt(d.iva || 0)}</td>
      <td style="text-align:right">${fmt(d.totalLinea || (d.total + (d.iva || 0)))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="8" style="text-align:center;color:#888">Sin líneas registradas</td></tr>`;

  const pagos = (c.pagos || []).map(p => `${p.moneda}: ${fmt(p.monto)}`).join(" · ");
  const tipo = c.tipo || "Contado";
  const pagado = num(c.pagado) || 0;
  const pendiente = c.pendiente !== undefined ? num(c.pendiente) : (num(c.total) - pagado);
  $("compra-detail-info").innerHTML =
    `<div><b>${c.nro}</b> — ${c.fecha} — <b>${c.proveedor}</b></div>` +
    `<div>Tipo: ${tipo}${(tipo === "Credito" || tipo === "Mixto") && c.diasCredito ? ` · Días de crédito: ${c.diasCredito}` : ""}${pagos ? ` · Pagos: ${pagos}` : ""}${c.observaciones ? ` · Obs.: ${c.observaciones}` : ""}</div>`;

  const sub = lineas.reduce((s, d) => s + (d.total || 0), 0);
  const iva = lineas.reduce((s, d) => s + (d.iva || 0), 0);
  $("comp-sub").textContent = fmt(sub);
  $("comp-iva").textContent = fmt(iva);
  $("comp-total").textContent = fmt(num(c.total) || sub + iva);
  $("comp-pagado").textContent = fmt(pagado);
  $("comp-pendiente").textContent = fmt(Math.max(0, pendiente));
}

function nuevaCompra() {
  compTemp = [];
  $("comp-n-nro").value = genNro(DB.compras, "nro", "", 7);
  $("comp-n-fecha").value = hoy();
  $("comp-n-proveedor").value = "";
  ocultarSugerenciasProveedor();
  $("comp-n-obs").value = "";
  $("comp-n-tasa-bcv").value = getTasa().toFixed(2).replace(".", ",");
  $("comp-n-monedacompra").value = "USDT";
  $("comp-n-tasa-compra").value = "";
  $("comp-n-costeo").value = DB.parametros.costeo || "promedio";
  $("comp-n-tipo").value = "Contado";
  $("comp-n-dias").value = DB.parametros.diasCreditoCompra || 30;
  $("comp-n-pagob").value = "";
  $("comp-n-pagousd").value = "";
  $("comp-n-dec").value = String(DB.parametros.decimalesCosto || 2);
  $("comp-n-prod").value = "";
  $("comp-n-cant").value = "1";
  $("comp-n-costo").value = "";
  $("comp-n-prev").value = "";
  $("comp-n-pond").value = "";
  ocultarProductosCompra();
  cambiarMonedaCompra();
  cambiarTipoCompra();
  renderCompraNueva();
  openModuleWindow("compra-nueva");
  $("comp-n-prod").focus();
}

function monedaCompraActual() { return $("comp-n-monedacompra").value || "USDT"; }
function tasaBcvCompra() { return num($("comp-n-tasa-bcv").value) || getTasa(); }
function tasaCompraActual() {
  const t = num($("comp-n-tasa-compra").value);
  return t > 0 ? t : tasaBcvCompra();
}

function buscarProveedorCompra() {
  const input = $("comp-n-proveedor");
  const q = (input.value || "").trim().toLowerCase();
  const box = $("comp-n-prov-results");
  if (!q) { ocultarSugerenciasProveedor(); return; }
  const matches = DB.proveedores.filter(p => String(p).toLowerCase().includes(q)).slice(0, 10);
  window._provMatches = matches;
  if (!matches.length) { ocultarSugerenciasProveedor(); return; }
  box.innerHTML = matches.map((p, i) =>
    `<button type="button" onmousedown="event.preventDefault()" onclick="seleccionarProveedorCompra(${i})">${p}</button>`
  ).join("");
  box.classList.add("show");
}

function seleccionarProveedorCompra(i) {
  const m = (window._provMatches || [])[i];
  if (!m) return;
  $("comp-n-proveedor").value = m;
  ocultarSugerenciasProveedor();
  $("comp-n-prod").focus();
}

function ocultarSugerenciasProveedor() {
  const box = $("comp-n-prov-results");
  box.classList.remove("show");
  box.innerHTML = "";
}

function cambiarMonedaCompra() {
  const m = monedaCompraActual();
  const tasaCompra = $("comp-n-tasa-compra");
  const costoInput = $("comp-n-costo");
  if (m === "BCV") {
    tasaCompra.value = $("comp-n-tasa-bcv").value;
    costoInput.placeholder = "En USD al tipo BCV";
  } else {
    if (!num(tasaCompra.value)) tasaCompra.value = $("comp-n-tasa-bcv").value;
    costoInput.placeholder = "En USDT (paralelo)";
  }
}

function buscarProductoCompra() {
  const q = ($("comp-n-prod").value || "").trim();
  const box = $("comp-n-prod-results");
  if (!q) { ocultarProductosCompra(); return; }
  const filtro = q.toLowerCase();
  const palabras = filtro.split(/\s+/).filter(Boolean);
  const matches = DB.productos.filter(p => {
    const s = [p.codigo, p.barra, p.descripcion, p.categoria, p.marca].map(x => String(x || "").toLowerCase());
    if (s.some(x => x === filtro)) return true;
    if (s.some(x => x.includes(filtro))) return true;
    return palabras.length > 1 && palabras.every(pal => s.some(x => x.includes(pal)));
  }).slice(0, 12);
  compProdMatches = matches;
  if (!matches.length) { ocultarProductosCompra(); return; }
  box.innerHTML = matches.map((p, i) =>
    `<button type="button" onmousedown="event.preventDefault()" onclick="seleccionarProductoCompra(${i})">${p.codigo} — ${p.descripcion}</button>`
  ).join("");
  box.classList.add("show");
}

function seleccionarProductoCompra(i) {
  const p = compProdMatches[i];
  if (!p) return;
  $("comp-n-prod").value = p.codigo;
  ocultarProductosCompra();
  if (!num($("comp-n-costo").value)) {
    $("comp-n-costo").value = String((p.costoUSD || 0).toFixed(2)).replace(".", ",");
  }
  mostrarCostosProductoCompra();
}

function onProductoCompraKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (compProdMatches.length) seleccionarProductoCompra(0);
    else agregarLineaCompra();
  } else if (e.key === "Escape") {
    ocultarProductosCompra();
  }
}

function ocultarProductosCompra() {
  const box = $("comp-n-prod-results");
  box.classList.remove("show");
  box.innerHTML = "";
  compProdMatches = [];
}

function cambiarDecimalesCompra() {
  const d = decimalesCompra();
  DB.parametros.decimalesCosto = d;
  saveDB();
  mostrarCostosProductoCompra();
  renderCompraNueva();
}

function mostrarCostosProductoCompra() {
  const cod = $("comp-n-prod").value.trim();
  const p = DB.productos.find(x => x.codigo === cod);
  if (!p) { $("comp-n-prev").value = ""; $("comp-n-pond").value = ""; renderCompraNueva(); return; }
  const costoAnt = num(p.costoUSD) || 0;
  const stockAnt = num(p.existencia) || 0;
  const cant = num($("comp-n-cant").value) || 1;
  const costo = num($("comp-n-costo").value);
  let pond = costoAnt;
  if (costo > 0) {
    const costoBCV = costoCostoBCV(costo);
    if (stockAnt + cant > 0) pond = (costoAnt * stockAnt + costoBCV * cant) / (stockAnt + cant);
    else pond = costoBCV;
  }
  $("comp-n-prev").value = fmtComp(costoAnt);
  $("comp-n-pond").value = fmtComp(pond);
  renderCompraNueva();
}

function agregarLineaCompra() {
  const cod = $("comp-n-prod").value.trim();
  const p = DB.productos.find(x => x.codigo === cod);
  if (!cod) { alert("Ingrese o seleccione un producto"); return; }
  if (!p) { alert("Producto no encontrado en el catálogo"); return; }
  const cant = num($("comp-n-cant").value) || 1;
  if (cant <= 0) { alert("La cantidad debe ser mayor a 0"); return; }
  const costo = num($("comp-n-costo").value) || (p.costoUSD || 0);
  if (costo <= 0) { alert("Ingrese un costo mayor a 0"); return; }
  const exento = $("comp-n-exento").checked;
  const tasa = tasaCompraActual();
  const bcv = tasaBcvCompra();
  const costoVES = costo * tasa;
  const costoBCV = bcv > 0 ? costoVES / bcv : costo;
  const total = r2(costoVES * cant);
  const ivaPct = exento ? 0 : getIva();
  const iva = r2(total * ivaPct / 100);
  compTemp.push({
    codigo: cod, descripcion: p.descripcion,
    cantidad: cant, costo: r2(costo), costoVES: r2(costoVES), costoBCV: r2(costoBCV),
    exentoIva: !!exento, ivaPct,
    total: r2(total), iva: r2(iva), totalLinea: r2(total + iva)
  });
  renderCompraNueva();
  $("comp-n-prod").value = ""; $("comp-n-cant").value = "1"; $("comp-n-costo").value = "";
  $("comp-n-prev").value = ""; $("comp-n-pond").value = "";
  $("comp-n-exento").checked = false;
  ocultarProductosCompra();
  $("comp-n-prod").focus();
}

function cambiarExentoCompra(i, checked) {
  const d = compTemp[i];
  if (!d) return;
  d.exentoIva = !!checked;
  d.ivaPct = checked ? 0 : getIva();
  d.iva = r2(d.total * d.ivaPct / 100);
  d.totalLinea = r2(d.total + d.iva);
  renderCompraNueva();
}

function totalFacturaBsCompra() {
  return r2(compTemp.reduce((s, d) => s + d.total, 0) + compTemp.reduce((s, d) => s + d.iva, 0));
}

function recalcPagosCompra(totalFactura) {
  const t = $("comp-n-tipo").value;
  const tasa = tasaCompraActual();
  let pagado = 0;
  if (t === "Contado") pagado = totalFactura;
  else if (t === "Mixto") pagado = r2(num($("comp-n-pagob").value) + num($("comp-n-pagousd").value) * tasa);
  $("comp-n-pagado").textContent = fmtComp(pagado);
  $("comp-n-pendiente").textContent = fmtComp(r2(totalFactura - pagado));
  return { totalFactura, pagado, pendiente: r2(totalFactura - pagado) };
}

function recalcTotalesCompra() {
  const bcv = tasaBcvCompra();
  const totalFactura = totalFacturaBsCompra();
  $("comp-n-total").textContent = fmtComp(totalFactura);
  $("comp-n-total-usd").textContent = fmtComp(bcv > 0 ? totalFactura / bcv : 0) + " $";
  recalcPagosCompra(totalFactura);
}

function recalcPagoMixto(origen) {
  const tasa = tasaCompraActual();
  const b = num($("comp-n-pagob").value);
  const u = num($("comp-n-pagousd").value);
  if (origen === "bs" && b > 0) {
    $("comp-n-pagousd").value = String(r2(b / tasa).toFixed(2)).replace(".", ",");
  } else if (origen === "usd" && u > 0) {
    $("comp-n-pagob").value = String(r2(u * tasa).toFixed(2)).replace(".", ",");
  }
  recalcTotalesCompra();
}

function cambiarTipoCompra() {
  const t = $("comp-n-tipo").value;
  $("comp-n-cond-fields").style.display = (t === "Credito" || t === "Mixto") ? "" : "none";
  $("comp-n-mixto-fields").style.display = t === "Mixto" ? "" : "none";
  recalcTotalesCompra();
}

function renderCompraNueva() {
  const body = $("comp-n-body");
  if (!body) return;
  body.innerHTML = compTemp.map((d, i) =>
    `<tr>
      <td>${d.codigo}</td><td>${d.descripcion}</td>
      <td>${fmtComp(d.cantidad)}</td>
      <td>${fmtComp(d.costo)}</td>
      <td><input type="checkbox" ${d.exentoIva ? "checked" : ""} onchange="cambiarExentoCompra(${i}, this.checked)"></td>
      <td>${fmtComp(d.total)}</td>
      <td>${fmtComp(d.iva)}</td>
      <td>${fmtComp(d.totalLinea)}</td>
      <td><button class="btn-mini" onclick="quitarLineaCompra(${i})">✕</button></td>
    </tr>`
  ).join("") ||
  `<tr><td colspan="9" style="text-align:center;color:#888">Sin productos agregados</td></tr>`;
  recalcTotalesCompra();
}

function quitarLineaCompra(i) { compTemp.splice(i, 1); renderCompraNueva(); }

function aplicarCompraInventario(c, recibida) {
  const costeo = c.costeo || DB.parametros.costeo || "promedio";
  (c.lineas || []).forEach(d => {
    const p = DB.productos.find(x => x.codigo === d.codigo);
    if (!p) return;
    if (recibida) {
      const stockAnt = num(p.existencia) || 0;
      p.existencia = stockAnt + d.cantidad;
      const movs = DB.movimientosInv.filter(m => m.producto === p.codigo);
      const saldo = (movs.length ? movs[0].saldo : 0) + d.cantidad;
      movimientoInv(p.codigo, "Compra", d.cantidad, c.nro, r2(saldo));
      const costoBase = num(d.costoBCV) || num(d.costo) || 0;
      if (costoBase > 0) {
        if (costeo === "promedio" && stockAnt > 0) {
          p.costoUSD = r2(((num(p.costoUSD) * stockAnt) + (costoBase * d.cantidad)) / p.existencia);
        } else {
          p.costoUSD = r2(costoBase);
        }
      }
    } else if (num(d.costoBCV) > 0) {
      p.costoUSD = r2(d.costoBCV);
    }
  });
}

function guardarCompra() {
  if (!compTemp.length) { alert("Agregue al menos un producto"); return; }
  const proveedor = $("comp-n-proveedor").value.trim();
  if (!proveedor) { alert("Seleccione el proveedor"); return; }
  const tipo = $("comp-n-tipo").value;
  const res = recalcPagosCompra(totalFacturaBsCompra());
  const compra = {
    nro: $("comp-n-nro").value,
    fecha: $("comp-n-fecha").value,
    proveedor,
    observaciones: $("comp-n-obs").value,
    cost_supplier_currency: monedaCompraActual(),
    purchase_rate_type: monedaCompraActual(),
    purchase_rate_value: tasaCompraActual(),
    bcv_rate_at_purchase: tasaBcvCompra(),
    costeo: $("comp-n-costeo").value,
    tipo,
    diasCredito: tipo === "Contado" ? 0 : (num($("comp-n-dias").value) || 30),
    pagos: tipo === "Mixto" ? [
      { moneda: "Bs", monto: num($("comp-n-pagob").value) },
      { moneda: "USD", monto: num($("comp-n-pagousd").value) }
    ].filter(p => p.monto > 0) : [],
    pagado: res.pagado,
    pendiente: res.pendiente,
    total: res.totalFactura,
    estatus: "Recibida",
    lineas: compTemp.map(l => ({ ...l }))
  };
  DB.compras.unshift(compra);
  aplicarCompraInventario(compra, true);
  if (!(DB.proveedores || []).some(x => String(x).toLowerCase() === String(proveedor).toLowerCase())) {
    DB.proveedores = DB.proveedores || [];
    DB.proveedores.push(proveedor);
  }
  auditar("Compra recibida", `${compra.nro} — ${compra.proveedor} — ${fmt(compra.total)} Bs.`);
  if (typeof sincronizarCxP === "function") sincronizarCxP();
  saveDB();
  renderCompras();
  renderInventario();
  if (typeof renderCxP === "function") renderCxP();
  closeWindow("compra-nueva-window");
  alert("Compra recibida y guardada con éxito.");
}

function recibirCompra() {
  const row = document.querySelector("#compras-body tr.selected");
  if (!row) { alert("Seleccione una compra"); return; }
  const nro = row.cells[0].textContent;
  const c = DB.compras.find(x => x.nro === nro);
  if (!c) return;
  if (c.estatus === "Recibida") { alert("La compra ya fue recibida"); return; }
  c.estatus = "Recibida";
  aplicarCompraInventario(c, true);
  auditar("Compra recibida", nro);
  if (typeof sincronizarCxP === "function") sincronizarCxP();
  saveDB();
  renderCompras();
  renderInventario();
  if (typeof renderCxP === "function") renderCxP();
}

function imprimirCompra() {
  const row = document.querySelector("#compras-body tr.selected");
  if (!row) return alert("Seleccione una compra");
  const c = DB.compras.find(x => x.nro === row.cells[0].textContent);
  imprimirHTML(`Compra ${c.nro} — ${c.proveedor}`, ["Código", "Descripción", "Cantidad", "Costo", "Total"], (c.lineas || []).map(l => [l.codigo, l.descripcion, fmt(l.cantidad), fmt(l.costo), fmt(l.total)]));
}

// ===== INVENTARIO =====
function renderInventario() {
  const body = $("inventario-body");
  if (!body) return;
  const rows = filtrarInventarioData();
  body.innerHTML = rows.map(p => {
    const disponible = p.existencia - p.reservado;
    let cls = "";
    if (p.existencia === 0) cls = "row-out";
    else if (p.existencia <= p.minimo) cls = "row-low";
    return `<tr class="${cls}" ondblclick="abrirKardex('${p.codigo}')">
      <td>${p.codigo}</td><td>${p.descripcion}</td>
      <td style="text-align:right">${fmt(p.existencia)}</td>
      <td style="text-align:right">${fmt(p.reservado)}</td>
      <td style="text-align:right">${fmt(disponible)}</td>
      <td style="text-align:right">${fmt(p.minimo)}</td>
      <td style="text-align:right">${fmt(p.precio)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" style="text-align:center;color:#888">Sin resultados</td></tr>`;
  // Poblar categorías una sola vez
  if ($("inv-cat").options.length <= 1) {
    const cats = [...new Set(DB.productos.map(p => p.categoria))];
    $("inv-cat").innerHTML = `<option>Todas</option>` + cats.map(c => `<option>${c}</option>`).join("");
  }
}

function filtrarInventarioData() {
  const cat = $("inv-cat").value;
  const q = ($("inv-search").value || "").trim().toLowerCase();
  const soloBaja = $("inv-solo-baja").checked;
  return DB.productos.filter(p =>
    (cat === "Todas" || p.categoria === cat) &&
    (!q || p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)) &&
    (!soloBaja || p.existencia <= p.minimo)
  );
}

function filtrarInventario() { renderInventario(); }

// ===== AJUSTE DE INVENTARIO =====
function abrirAjuste() {
  $("ajuste-codigo").value = ""; $("ajuste-nombre").textContent = "";
  $("ajuste-actual").textContent = "0,00"; $("ajuste-cantidad").value = "";
  $("ajuste-tipo").value = "Nuevo Stock"; $("ajuste-resultado").textContent = "0,00";
  $("ajuste-motivo").value = "";
  openModuleWindow("ajuste");
}

function cargarAjusteProducto() {
  const cod = $("ajuste-codigo").value.trim();
  const p = DB.productos.find(x => x.codigo === cod);
  if (p) {
    $("ajuste-nombre").textContent = p.descripcion;
    $("ajuste-actual").textContent = fmt(p.existencia);
  } else {
    $("ajuste-nombre").textContent = cod ? "(No encontrado)" : "";
    $("ajuste-actual").textContent = "0,00";
  }
  actualizarAjusteResultado();
}

function actualizarAjusteResultado() {
  const p = DB.productos.find(x => x.codigo === $("ajuste-codigo").value.trim());
  const actual = p ? p.existencia : 0;
  const tipo = $("ajuste-tipo").value;
  const q = num($("ajuste-cantidad").value);
  let res = actual;
  if (tipo === "Nuevo Stock") res = q;
  else if (tipo === "Entrada (+)") res = actual + q;
  else if (tipo === "Salida (−)") res = actual - q;
  $("ajuste-resultado").textContent = fmt(res);
}

function confirmarAjuste() {
  const cod = $("ajuste-codigo").value.trim();
  const p = DB.productos.find(x => x.codigo === cod);
  if (!p) { alert("Producto no encontrado"); return; }
  const tipo = $("ajuste-tipo").value;
  const q = num($("ajuste-cantidad").value);
  const motivo = $("ajuste-motivo").value.trim() || tipo;
  const actual = p.existencia;
  let nuevo = actual;
  if (tipo === "Nuevo Stock") nuevo = q;
  else if (tipo === "Entrada (+)") nuevo = actual + q;
  else if (tipo === "Salida (−)") nuevo = actual - q;
  if (nuevo < 0) { alert("El stock no puede quedar negativo"); return; }
  p.existencia = nuevo;
  movimientoInv(p.codigo, "Ajuste", r2(nuevo - actual), motivo, r2(nuevo));
  auditar("Ajuste de inventario", `${p.codigo} — ${motivo}: ${fmt(actual)} → ${fmt(nuevo)}`);
  saveDB();
  renderInventario();
  alert(`Ajuste aplicado.\n${p.descripcion}: ${fmt(actual)} → ${fmt(nuevo)}`);
  closeWindow("ajuste-window");
}

// ===== KARDEX =====
function abrirKardex(codigo) {
  const sel = $("kardex-producto");
  sel.innerHTML = DB.productos.map(p => `<option value="${p.codigo}" ${p.codigo === codigo ? "selected" : ""}>${p.codigo} — ${p.descripcion}</option>`).join("");
  renderKardex();
  openModuleWindow("kardex");
}

function renderKardex() {
  const cod = $("kardex-producto").value;
  const movs = DB.movimientosInv.filter(m => m.producto === cod).slice().reverse();
  $("kardex-body").innerHTML = movs.map(m =>
    `<tr><td>${m.fecha}</td><td>${m.hora}</td><td>${m.tipo}</td><td style="text-align:right">${fmt(m.cant)}</td><td>${m.ref}</td><td style="text-align:right">${fmt(m.saldo)}</td></tr>`
  ).join("") || `<tr><td colspan="6" style="text-align:center;color:#888">Sin movimientos</td></tr>`;
  const entradas = movs.filter(m => m.cant > 0).reduce((s, m) => s + m.cant, 0);
  const salidas = movs.filter(m => m.cant < 0).reduce((s, m) => s + m.cant, 0);
  const p = DB.productos.find(x => x.codigo === cod);
  $("kardex-totals").textContent = `Entradas: ${fmt(entradas)} | Salidas: ${fmt(-salidas)} | Existencia: ${fmt(p ? p.existencia : 0)}`;
}

function imprimirInventario() { imprimirHTML("Existencias Actuales", ["Código", "Descripción", "Existencia", "Reservada", "Disponible", "Mínimo"], DB.productos.map(p => [p.codigo, p.descripcion, fmt(p.existencia), fmt(p.reservado), fmt(p.existencia - p.reservado), fmt(p.minimo)])); }
function exportarInventario() { exportarCSV("existencias", ["Codigo", "Descripcion", "Existencia", "Reservada", "Disponible", "Minimo"], DB.productos.map(p => [p.codigo, p.descripcion, p.existencia, p.reservado, p.existencia - p.reservado, p.minimo])); }

// ===== REPORTES =====
let lastReport = null;
const REP_DESC = {
  "Ventas del Día": "Muestra las ventas realizadas hoy.",
  "Ventas por Fecha": "Ventas en el rango de fechas indicado.",
  "Ventas por Cliente": "Total vendido a cada cliente.",
  "Ventas por Vendedor": "Total vendido por vendedor.",
  "Ventas por Forma de Pago": "Total por método de pago.",
  "Ventas por Producto": "Cantidades y montos por producto.",
  "Ventas por Categoría": "Ventas agrupadas por categoría.",
  "Resumen de Ventas": "Totales generales del período.",
  "Historial de Cierres de Caja": "Cierres registrados por caja. Por defecto muestra el día de hoy; use Desde/Hasta para periodos."
};

function renderReportes() {
  const cat = $("rep-cat");
  const lst = $("rep-list");
  if (!cat || !lst) return;
  cat.innerHTML = DB.categoriasReporte.map((c, i) =>
    `<li class="${i === 0 ? "selected" : ""}" onclick="selectRepCat(this, '${c}')">${c}</li>`).join("");
  const selCaja = $("rep-caja");
  if (selCaja && !selCaja.dataset.ready) {
    selCaja.innerHTML = `<option>Todas</option>` + (DB.cajas || []).map(c => `<option>${c.nombre}</option>`).join("");
    selCaja.dataset.ready = "1";
  }
  selectRepCat(cat.querySelector("li"), "Ventas");
}

function selectRepCat(li, name) {
  document.querySelectorAll("#rep-cat li").forEach(x => x.classList.remove("selected"));
  li.classList.add("selected");
  const map = {
    "Ventas": ["Ventas del Día", "Ventas por Fecha", "Ventas por Cliente", "Ventas por Vendedor", "Ventas por Forma de Pago", "Ventas por Producto", "Ventas por Categoría", "Resumen de Ventas"],
    "Compras": ["Compras del Día", "Compras por Proveedor"],
    "Inventario": ["Existencias Actuales", "Productos con Stock Bajo", "Movimientos de Inventario"],
    "Clientes": ["Listado de Clientes", "Clientes con Deuda"],
    "Proveedores": ["Listado de Proveedores"],
    "Caja y Bancos": ["Movimientos de Caja", "Historial de Cierres de Caja", "Resumen Diario"],
    "Productos": ["Listado de Productos", "Precios de Venta"],
    "Servicios": ["Servicios Realizados"]
  };
  const lst = $("rep-list");
  const list = map[name] || [];
  lst.innerHTML = list.map(r => `<li class="${r === "Ventas del Día" ? "selected" : ""}" onclick="selectRep(this)">${r}</li>`).join("");
  const sel = lst.querySelector("li.selected");
  if (sel) $("rep-descripcion").textContent = REP_DESC[sel.textContent] || "Seleccione un reporte.";
  window._repCat = name;
}

function selectRep(li) {
  document.querySelectorAll("#rep-list li").forEach(x => x.classList.remove("selected"));
  li.classList.add("selected");
  $("rep-descripcion").textContent = REP_DESC[li.textContent] || "Seleccione un reporte.";
}

function fechaEnRango(fecha, desde, hasta) {
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

function generarReporte() {
  const li = document.querySelector("#rep-list li.selected");
  if (!li) return null;
  const nombre = li.textContent;
  const desde = ($("rep-desde").value || "").trim();
  const hasta = ($("rep-hasta").value || "").trim();
  const forma = $("rep-forma").value;
  const cajaFiltro = $("rep-caja").value;
  const hoyDia = hoy();
  const ventas = DB.ventas.filter(v => fechaEnRango(v.fecha, desde, hasta));
  let headers, rows;
  let totalReporte = null;

  const enForma = v => (forma === "Todas" || (v.pagos || [{ metodo: v.forma }]).some(p => p.metodo.includes(forma)));
  const enCaja = m => (cajaFiltro === "Todas" || (m.caja || "") === cajaFiltro);

  switch (nombre) {
    case "Ventas del Día":
      headers = ["Factura", "Hora", "Cliente", "Forma", "Total Bs."];
      rows = ventas.filter(v => v.fecha === hoyDia).map(v => [v.nro, v.hora, v.cliente, v.forma, fmt(v.total)]);
      totalReporte = ventas.filter(v => v.fecha === hoyDia).reduce((s, v) => s + v.total, 0);
      break;
    case "Ventas por Fecha": {
      const agg = {};
      ventas.forEach(v => { agg[v.fecha] = (agg[v.fecha] || 0) + v.total; });
      headers = ["Fecha", "Cantidad", "Total Bs."];
      rows = Object.entries(agg).map(([f, t]) => [f, ventas.filter(v => v.fecha === f).length, fmt(t)]);
      totalReporte = Object.values(agg).reduce((s, t) => s + t, 0);
      break;
    }
    case "Ventas por Cliente": {
      const agg = {};
      ventas.forEach(v => { agg[v.cliente] = (agg[v.cliente] || 0) + v.total; });
      headers = ["Cliente", "N° Ventas", "Total Bs."];
      rows = Object.entries(agg).map(([c, t]) => [c, ventas.filter(v => v.cliente === c).length, fmt(t)]);
      totalReporte = Object.values(agg).reduce((s, t) => s + t, 0);
      break;
    }
    case "Ventas por Vendedor": {
      const agg = {};
      ventas.forEach(v => {
        const cli = DB.clientes.find(c => c.nombre === v.cliente);
        const vend = cli ? (cli.vendedor || "--- NINGUNO ---") : "--- NINGUNO ---";
        if (!agg[vend]) agg[vend] = { n: 0, t: 0 };
        agg[vend].n += 1;
        agg[vend].t += v.total;
      });
      headers = ["Vendedor", "N° Ventas", "Total Bs."];
      rows = Object.entries(agg).map(([vend, a]) => [vend, a.n, fmt(a.t)]);
      totalReporte = Object.values(agg).reduce((s, a) => s + a.t, 0);
      break;
    }
    case "Ventas por Forma de Pago": {
      const agg = {};
      ventas.forEach(v => (v.pagos || [{ metodo: v.forma, equivBs: v.total }]).forEach(p => {
        agg[p.metodo] = (agg[p.metodo] || 0) + (p.equivBs || p.monto || 0);
      }));
      headers = ["Método", "Total Bs."];
      rows = Object.entries(agg).map(([m, t]) => [m, fmt(t)]);
      totalReporte = Object.values(agg).reduce((s, t) => s + t, 0);
      break;
    }
    case "Ventas por Producto": {
      const agg = {};
      ventas.forEach(v => (v.lineas || []).forEach(l => {
        const k = l.codigo;
        if (!agg[k]) agg[k] = { desc: l.descripcion, cant: 0, total: 0 };
        agg[k].cant += l.cantidad;
        agg[k].total += l.total;
      }));
      headers = ["Código", "Descripción", "Cantidad", "Total Bs."];
      rows = Object.entries(agg).map(([k, a]) => [k, a.desc, fmt(a.cant), fmt(a.total)]);
      totalReporte = Object.values(agg).reduce((s, a) => s + a.total, 0);
      break;
    }
    case "Ventas por Categoría": {
      const agg = {};
      ventas.forEach(v => (v.lineas || []).forEach(l => {
        const p = DB.productos.find(x => x.codigo === l.codigo);
        const cat = p ? p.categoria : "OTROS";
        agg[cat] = (agg[cat] || 0) + l.total;
      }));
      headers = ["Categoría", "Total Bs."];
      rows = Object.entries(agg).map(([c, t]) => [c, fmt(t)]);
      totalReporte = Object.values(agg).reduce((s, t) => s + t, 0);
      break;
    }
    case "Resumen de Ventas":
      headers = ["Concepto", "Valor Bs."];
      rows = [
        ["N° de Ventas", ventas.length],
        ["Subtotal", fmt(ventas.reduce((s, v) => s + v.subtotal, 0))],
        ["IVA", fmt(ventas.reduce((s, v) => s + v.iva, 0))],
        ["Descuentos", fmt(ventas.reduce((s, v) => s + v.descuento, 0))],
        ["TOTAL", fmt(ventas.reduce((s, v) => s + v.total, 0))]
      ];
      totalReporte = null; // ya incluye su propia fila TOTAL
      break;
    case "Compras del Día":
      headers = ["N°", "Proveedor", "Total Bs.", "Estatus"];
      rows = DB.compras.filter(c => c.fecha === hoyDia).map(c => [c.nro, c.proveedor, fmt(c.total), c.estatus]);
      totalReporte = DB.compras.filter(c => c.fecha === hoyDia).reduce((s, c) => s + num(c.total), 0);
      break;
    case "Compras por Proveedor": {
      const agg = {};
      DB.compras.forEach(c => { agg[c.proveedor] = (agg[c.proveedor] || 0) + num(c.total); });
      headers = ["Proveedor", "Total Bs."];
      rows = Object.entries(agg).map(([p, t]) => [p, fmt(t)]);
      totalReporte = Object.values(agg).reduce((s, t) => s + t, 0);
      break;
    }
    case "Existencias Actuales":
      headers = ["Código", "Descripción", "Existencia", "Precio Bs."];
      rows = DB.productos.map(p => [p.codigo, p.descripcion, fmt(p.existencia), fmt(p.precio)]);
      totalReporte = DB.productos.reduce((s, p) => s + num(p.precio), 0);
      break;
    case "Productos con Stock Bajo":
      headers = ["Código", "Descripción", "Existencia", "Mínimo"];
      rows = DB.productos.filter(p => p.existencia <= p.minimo).map(p => [p.codigo, p.descripcion, fmt(p.existencia), fmt(p.minimo)]);
      totalReporte = null;
      break;
    case "Movimientos de Inventario":
      headers = ["Fecha", "Producto", "Tipo", "Cantidad", "Ref"];
      rows = DB.movimientosInv.map(m => [m.fecha, m.producto, m.tipo, fmt(m.cant), m.ref]);
      totalReporte = null;
      break;
    case "Listado de Clientes":
      headers = ["Código", "Nombre", "RIF", "Tipo"];
      rows = DB.clientes.map(c => [c.codigo, c.nombre, c.rif, c.tipo]);
      totalReporte = null;
      break;
    case "Clientes con Deuda": {
      const agg = {};
      DB.ventas.filter(v => (v.forma || "").includes("Crédito")).forEach(v => { agg[v.cliente] = (agg[v.cliente] || 0) + v.total; });
      headers = ["Cliente", "Deuda Bs."];
      rows = Object.entries(agg).map(([c, t]) => [c, fmt(t)]);
      totalReporte = Object.values(agg).reduce((s, t) => s + t, 0);
      break;
    }
    case "Listado de Proveedores":
      headers = ["Proveedor"];
      rows = DB.proveedores.map(p => [p]);
      totalReporte = null;
      break;
    case "Movimientos de Caja": {
      headers = ["Fecha", "Hora", "Caja", "Tipo", "Ref", "Ing. Bs", "Egr. Bs", "Ing. $", "Egr. $"];
      const movs = DB.movimientosCaja.filter(m => fechaEnRango(m.fecha, desde, hasta) && enCaja(m));
      rows = movs.map(m => [m.fecha, m.hora, m.caja || "", m.tipo, m.ref, fmt(m.ing), fmt(m.egr), m.ingUsd ? "$ " + fmt(m.ingUsd) : "", m.egrUsd ? "$ " + fmt(m.egrUsd) : ""]);
      totalReporte = movs.reduce((s, m) => s + num(m.ing) - num(m.egr), 0);
      break;
    }
    case "Historial de Cierres de Caja": {
      headers = ["Fecha", "Hora Cierre", "Caja", "Cajero", "Esperado Bs", "Conteo Bs", "Dif. Bs", "Conteo USD", "Conciliación"];
      const desdeC = desde || hoyDia;
      const hastaC = hasta || hoyDia;
      const cierres = DB.cierresCaja.filter(c => fechaEnRango(c.fecha, desdeC, hastaC) && (cajaFiltro === "Todas" || c.caja === cajaFiltro));
      rows = cierres.map(c => [c.fecha, (c.horaCierre || "").split(" ")[1] || c.horaCierre, c.caja, c.cajero, fmt(c.esperadoBs), fmt(c.conteoBs), fmt(c.diffBs), "$ " + fmt(c.conteoUsd), c.conciliado]);
      totalReporte = null;
      break;
    }
    case "Resumen Diario":
      headers = ["Concepto", "Bs.", "USD"];
      rows = [
        ["Ventas Efectivo Bs.", fmt(DB.movimientosCaja.filter(m => m.tipo === "Venta en Efectivo Bs.").reduce((s, m) => s + m.ing, 0)), "—"],
        ["Ventas Efectivo USD", "—", "$ " + fmt(DB.movimientosCaja.filter(m => m.tipo === "Venta en Efectivo USD").reduce((s, m) => s + m.ingUsd, 0))],
        ["Total Ventas", fmt(DB.ventas.reduce((s, v) => s + v.total, 0)), "—"]
      ];
      totalReporte = null;
      break;
    case "Listado de Productos":
      headers = ["Código", "Descripción", "Categoría", "Precio Bs."];
      rows = DB.productos.map(p => [p.codigo, p.descripcion, p.categoria, fmt(p.precio)]);
      totalReporte = DB.productos.reduce((s, p) => s + num(p.precio), 0);
      break;
    case "Precios de Venta":
      headers = ["Código", "Descripción", "Costo $", "PVP $", "PVP Bs.", "Margen %"];
      rows = DB.productos.map(p => [p.codigo, p.descripcion, fmt(p.costoUSD), fmt(p.precioUSD), fmt(p.precio), fmt(p.margenPct)]);
      totalReporte = DB.productos.reduce((s, p) => s + num(p.precio), 0);
      break;
    case "Servicios Realizados":
      headers = ["Código", "Descripción", "Precio Bs."];
      rows = DB.productos.filter(p => p.categoria === "SERVICIOS").map(p => [p.codigo, p.descripcion, fmt(p.precio)]);
      totalReporte = DB.productos.filter(p => p.categoria === "SERVICIOS").reduce((s, p) => s + num(p.precio), 0);
      break;
    default:
      return null;
  }
  return { nombre, headers, rows, total: totalReporte };
}

function verReporte() {
  const r = generarReporte();
  if (!r) { alert("Seleccione un reporte"); return; }
  lastReport = r;
  $("rep-vista-titulo").textContent = `${r.nombre}  (desde ${$("rep-desde").value || "—"} hasta ${$("rep-hasta").value || "—"})`;
  $("rep-vista-table").innerHTML =
    `<thead><tr>${r.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>` +
    `<tbody>${r.rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>` +
    (r.total !== null ? `<tfoot><tr><td colspan="${r.headers.length}" style="text-align:right;font-weight:bold">TOTAL: ${fmt(r.total)} Bs.</td></tr></tfoot>` : "");
  openModuleWindow("reporte-vista");
}

function imprimirReporte() {
  const r = lastReport || generarReporte();
  if (!r) return alert("Genere primero el reporte (Vista Previa)");
  imprimirHTML(r.nombre, r.headers, r.rows, r.total);
}

function exportarReporte() {
  const r = lastReport || generarReporte();
  if (!r) return alert("Genere primero el reporte (Vista Previa)");
  exportarCSV(r.nombre.toLowerCase().replace(/\s+/g, "_"), r.headers, r.rows, r.total);
}

// ===== Inicialización =====
document.addEventListener("DOMContentLoaded", () => {
  renderClientes();
  renderProductos();
  renderCotizaciones();
  renderCompras();
  renderInventario();
  renderReportes();
  $("status-usuario").textContent = DB.parametros.cajero || "ADMIN";
  $("status-turno").textContent = DB.parametros.turno || 1;
  if (typeof sincronizarCajaActiva === "function") sincronizarCajaActiva();
  $("pos-caja-label").textContent = DB.parametros.caja || "CAJA 01";
  const cotiProd = $("coti-n-prod");
  if (cotiProd) cotiProd.addEventListener("blur", () => {
    if (!cotiSelectedCod && cotiProd.value.trim()) {
      const p = DB.productos.find(x => x.codigo === cotiProd.value.trim());
      if (p && !num($("coti-n-precio").value)) $("coti-n-precio").value = p.precio.toFixed(2).replace(".", ",");
    }
    ocultarProductoCotiResults();
  });
  const compCod = $("comp-n-prod");
  if (compCod) compCod.addEventListener("blur", () => {
    const p = DB.productos.find(x => x.codigo === compCod.value.trim());
    if (p && !num($("comp-n-costo").value)) $("comp-n-costo").value = String((p.costoUSD || 0).toFixed(2)).replace(".", ",");
  });
  // Enlace de pestañas
  document.querySelectorAll("[data-tabs] .tab, [data-tabs] .tab-title").forEach(t => {
    t.addEventListener("click", () => setTab(t));
  });
});

