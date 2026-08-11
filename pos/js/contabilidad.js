// ============================================================================
// CONTABILIDAD: Libro Diario de Ingresos y Egresos (misma lógica que posven-pro)
// - Asientos automáticos: VENTA (ingreso), COBRO_DEUDA (ingreso), COMPRA/PAGO (egreso)
// - Asientos manuales: egresos de caja (Nómina, Servicios, Impuestos, Otros)
// ============================================================================
const _ct = id => document.getElementById(id);

const CONT_CATEG_GASTO = ["NOMINA", "SERVICIOS", "IMPUESTOS", "OTROS_GASTOS"];
const CONT_FORMAS = ["Efectivo Bs.", "Efectivo USD (físico)", "Pagomóvil", "Biopago", "Transferencia", "Zelle", "Tarjeta / Punto"];
const CONT_PAGE_SIZE = 20;

// Estado de filtros y paginación
let contFiltro = "hoy"; // hoy | ayer | mes | rango
let contDesde = hoy();
let contHasta = hoy();
let contBuscar = "";
let contPage = 1;

// ---- Asiento genérico ----
function asientoContable(tipo, categoria, concepto, montoUSD, metodo, referencia, fecha, hora) {
  const m = r2(num(montoUSD));
  if (m <= 0) return null;
  DB.libroDiario = DB.libroDiario || [];
  const asiento = {
    id: "ACC-" + Date.now().toString(36).toUpperCase().slice(-6),
    fecha: fecha || hoy(),
    hora: hora || hora12(),
    tipo,
    categoria,
    concepto: String(concepto || "").toUpperCase(),
    montoUSD: m,
    montoBS: r2(m * getTasa()),
    metodo: metodo || "Efectivo Bs.",
    referencia: referencia || "MANUAL"
  };
  DB.libroDiario.unshift(asiento);
  return asiento;
}

// ---- Asiento automático por VENTA (un ingreso por método de pago cobrado) ----
function asentVenta(venta) {
  (venta.pagos || []).forEach(p => {
    if (p.metodo === "Crédito (CxC)") return; // el crédito se registra al cobrarlo
    const montoUSD = p.moneda === "USD" ? num(p.monto) : usdDeBs(num(p.equiv) || num(p.monto));
    if (montoUSD <= 0) return;
    asientoContable("ingreso", "VENTA",
      `VENTA ${venta.nro} - CLIENTE: ${(venta.cliente || "CONSUMIDOR FINAL").toUpperCase()}`,
      montoUSD, p.metodo, venta.nro, venta.fecha, venta.hora);
  });
}

// ---- Asiento automático por ABONO / COBRO DE DEUDA ----
function asentAbono(cliente, ref, pagos) {
  (pagos || []).forEach(p => {
    if (p.metodo === "Crédito (CxC)") return;
    const montoUSD = p.moneda === "USD" ? num(p.monto) : usdDeBs(num(p.equiv) || num(p.monto));
    if (montoUSD <= 0) return;
    asientoContable("ingreso", "COBRO_DEUDA",
      `ABONO ${ref} - CLIENTE: ${(cliente || "").toUpperCase()}`,
      montoUSD, p.metodo, ref);
  });
}

// ---- Asiento automático por COMPRA de contado (egreso inmediato) ----
function asentCompra(c) {
  const montoUSD = num(c.totalUSDBcv) || usdDeBs(num(c.total));
  if (montoUSD <= 0) return;
  const forma = (c.pagos || []).length
    ? c.pagos.map(p => p.moneda === "USD" ? "Efectivo USD (físico)" : "Efectivo Bs.").join(" + ")
    : "Efectivo Bs.";
  asientoContable("egreso", "COMPRA",
    `COMPRA ${c.nro} - PROVEEDOR: ${(c.proveedor || "").toUpperCase()}`,
    montoUSD, forma, c.nro, c.fecha);
}

// ---- Asiento automático por PAGO A PROVEEDOR (CxP) ----
function asentPagoProv(proveedor, ref, montoUSD, forma) {
  asientoContable("egreso", "COMPRA",
    `PAGO ${ref} - PROVEEDOR: ${(proveedor || "").toUpperCase()}`,
    montoUSD, forma, ref);
}

// ---- Filtrado del libro diario ----
function _contFechaKey(f) {
  const p = String(f || "").split("/");
  return p.length === 3 ? (p[2] + p[1] + p[0]) : "";
}

function contSetPeriodo() {
  if (contFiltro === "rango") {
    contDesde = _ct("cont-desde").value || contDesde || hoy();
    contHasta = _ct("cont-hasta").value || contHasta || hoy();
    return { desde: contDesde, hasta: contHasta };
  }
  if (contFiltro === "ayer") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const ayer = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    contDesde = contHasta = ayer;
    return { desde: ayer, hasta: ayer };
  }
  if (contFiltro === "mes") {
    const d = new Date();
    const first = `01/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const last = `${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    contDesde = first; contHasta = last;
    return { desde: first, hasta: last };
  }
  contDesde = contHasta = hoy();
  return { desde: hoy(), hasta: hoy() };
}

function contFiltrados() {
  const rango = contSetPeriodo();
  const kDesde = _contFechaKey(rango.desde);
  const kHasta = _contFechaKey(rango.hasta);
  const q = contBuscar.toLowerCase();
  return (DB.libroDiario || []).filter(e => {
    const k = _contFechaKey(e.fecha);
    if (kDesde && k < kDesde) return false;
    if (kHasta && k > kHasta) return false;
    if (q && !(e.concepto || "").toLowerCase().includes(q) && !(e.categoria || "").toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
}

// ---- Render ----
function renderContabilidad() {
  const datos = contFiltrados();
  const totalIng = datos.filter(e => e.tipo === "ingreso").reduce((s, e) => s + (e.montoUSD || 0), 0);
  const totalEgr = datos.filter(e => e.tipo === "egreso").reduce((s, e) => s + (e.montoUSD || 0), 0);
  const balance = r2(totalIng - totalEgr);

  if (_ct("cont-kpi-ing")) _ct("cont-kpi-ing").innerHTML = fmtUS(totalIng) + `<br><span class="usd-sub">${fmtBsEq(totalIng)}</span>`;
  if (_ct("cont-kpi-egr")) _ct("cont-kpi-egr").innerHTML = fmtUS(totalEgr) + `<br><span class="usd-sub">${fmtBsEq(totalEgr)}</span>`;
  if (_ct("cont-kpi-bal")) _ct("cont-kpi-bal").innerHTML = fmtUS(balance) + `<br><span class="usd-sub">${fmtBsEq(balance)}</span>`;
  if (_ct("cont-kpi-bal")) _ct("cont-kpi-bal").style.color = balance >= 0 ? "" : "#f87171";

  const pag = Math.ceil(datos.length / CONT_PAGE_SIZE) || 1;
  if (contPage > pag) contPage = pag;
  const inicio = (contPage - 1) * CONT_PAGE_SIZE;
  const visibles = datos.slice(inicio, inicio + CONT_PAGE_SIZE);

  const fila = e => {
    const dir = e.tipo === "ingreso" ? "ingreso" : "egreso";
    const monedaCelda = e.tipo === "ingreso"
      ? `<td class="num" style="color:#16a34a;font-weight:bold">${fmtUS(e.montoUSD)}</td><td class="num">—</td>`
      : `<td class="num">—</td><td class="num" style="color:#dc2626;font-weight:bold">-${fmtUS(e.montoUSD)}</td>`;
    const acciones =
      `<button class="btn-mini" title="Ver detalle / Auditoría" onclick="contVerAsiento('${e.id}')">👁</button>` +
      (e.referencia === "MANUAL"
        ? `<button class="btn-mini" title="Eliminar asiento manual" onclick="contEliminarAsiento('${e.id}')">✕</button>` : "");
    return `<tr>
        <td>${e.fecha}<br><span class="usd-sub">${e.hora}</span></td>
        <td><b>${e.concepto}</b><br><span class="usd-sub">${e.categoria.replace(/_/g, " ")}${e.referencia !== "MANUAL" ? " · " + e.referencia : ""}</span></td>
        <td><span class="est-badge cont-metodo">${_escHtml(e.metodo)}</span></td>
        ${monedaCelda}
        <td class="center">${acciones}</td>
      </tr>`;
  };

  _ct("cont-body").innerHTML = visibles.map(fila).join("") ||
    `<tr><td colspan="6" style="text-align:center;color:#888;padding:28px">Sin movimientos en este periodo</td></tr>`;

  const totPages = Math.ceil(datos.length / CONT_PAGE_SIZE);
  _ct("cont-pag-label").textContent = `Página ${contPage} de ${(totPages || 1)} | Total ${datos.length} movimientos`;
  _ct("cont-pag-prev").disabled = contPage <= 1;
  _ct("cont-pag-next").disabled = contPage >= (totPages || 1);
}

function cargarVentanaContabilidad() {
  const sel = _ct("cont-periodo");
  if (sel && !sel.dataset.ready) {
    sel.innerHTML = `<option value="hoy">Hoy</option><option value="ayer">Ayer</option><option value="mes">Mes Actual</option><option value="rango">Rango Personalizado</option>`;
    sel.dataset.ready = "1";
  }
  const metodo = _ct("cont-gasto-forma");
  if (metodo && !metodo.dataset.ready) {
    metodo.innerHTML = CONT_FORMAS.map(f => `<option>${f}</option>`).join("");
    metodo.dataset.ready = "1";
  }
  const cat = _ct("cont-gasto-categoria");
  if (cat && !cat.dataset.ready) {
    cat.innerHTML = CONT_CATEG_GASTO.map(c => `<option value="${c}">${c === "NOMINA" ? "Nómina (Sueldos y Salarios)" : c === "SERVICIOS" ? "Servicios Básicos (Luz, Agua, Internet)" : c === "IMPUESTOS" ? "Impuestos / Tasas" : "Gastos Administrativos / Otros"}</option>`).join("");
    cat.dataset.ready = "1";
  }
  contSetPeriodo();
  if (_ct("cont-desde") && !_ct("cont-desde").value) _ct("cont-desde").value = contDesde;
  if (_ct("cont-hasta") && !_ct("cont-hasta").value) _ct("cont-hasta").value = contHasta;
  renderContabilidad();
}

function contCambiarPeriodo() {
  contFiltro = _ct("cont-periodo").value;
  const rangoRow = _ct("cont-rango-row");
  if (rangoRow) rangoRow.style.display = contFiltro === "rango" ? "" : "none";
  if (contFiltro === "rango") {
    if (!_ct("cont-desde").value) _ct("cont-desde").value = contDesde || hoy();
    if (!_ct("cont-hasta").value) _ct("cont-hasta").value = contHasta || hoy();
  } else {
    contSetPeriodo();
  }
  contPage = 1;
  renderContabilidad();
}

function contBuscarTexto() { contBuscar = _ct("cont-search").value.trim(); contPage = 1; renderContabilidad(); }

function contPrevPage() { if (contPage > 1) { contPage--; renderContabilidad(); } }
function contNextPage() { contPage++; renderContabilidad(); }

// ---- Gasto manual (egreso) ----
function contNuevoGasto() {
  if (typeof cargarVentanaContabilidad === "function") cargarVentanaContabilidad();
  _ct("cont-gasto-categoria").value = "NOMINA";
  _ct("cont-gasto-concepto").value = "";
  _ct("cont-gasto-monto").value = "";
  _ct("cont-gasto-forma").value = "Efectivo Bs.";
  _ct("cont-gasto-usd").textContent = "";
  openModuleWindow("cont-gasto");
}

function contActualizarEquivGasto() {
  const monto = num(_ct("cont-gasto-monto").value);
  const esUsd = monedaDeForma(_ct("cont-gasto-forma").value) === "USD";
  _ct("cont-gasto-usd").textContent = esUsd
    ? `Bs. ${fmt(bsDeUsd(monto))}`
    : `$ ${fmt(usdDeBs(monto))}`;
}

function contGuardarGasto() {
  const categoria = _ct("cont-gasto-categoria").value;
  const concepto = _ct("cont-gasto-concepto").value.trim();
  const montoEntrada = num(_ct("cont-gasto-monto").value);
  const forma = _ct("cont-gasto-forma").value;
  if (!concepto) { alert("Indique el concepto detallado del gasto."); return; }
  if (montoEntrada <= 0) { alert("Indique un monto válido."); return; }

  const esUsd = monedaDeForma(forma) === "USD";
  const montoUSD = r2(esUsd ? montoEntrada : usdDeBs(montoEntrada));
  const asiento = asientoContable("egreso", categoria, concepto, montoUSD, forma, "MANUAL");
  if (!asiento) { alert("El monto debe ser mayor a cero."); return; }

  const montoBs = r2(esUsd ? bsDeUsd(montoEntrada) : montoEntrada);
  const montoUsdMov = r2(esUsd ? montoEntrada : usdDeBs(montoEntrada));
  if (typeof movimientoCaja === "function") movimientoCaja("Egreso Manual (" + forma + ")", asiento.id, montoBs, montoUsdMov, false);
  if (typeof auditar === "function") auditar("Egreso manual", `${fmtUS(montoUsdMov)} (${fmtBsEq(montoUsdMov)}) — ${concepto} [${categoria}]`);
  saveDB();
  renderContabilidad();
  closeWindow("cont-gasto-window");
  alert("EGRESO REGISTRADO\nAsiento: " + asiento.id + "\nConcepto: " + concepto + "\nMonto: " + fmtUS(montoUsdMov) + " (" + fmtBsEq(montoUsdMov) + ")\nCategoría: " + categoria);
}

function contCerrarGasto() { closeWindow("cont-gasto-window"); }

// ---- Detalle / Auditoría ----
function contVerAsiento(id) {
  const e = (DB.libroDiario || []).find(x => x.id === id);
  if (!e) { alert("No se encontró el asiento."); return; }
  _ct("cont-det-titulo").textContent = "AUDITORÍA DE MOVIMIENTO: " + e.id;
  _ct("cont-det-categoria").textContent = e.categoria.replace(/_/g, " ");
  _ct("cont-det-fecha").textContent = e.fecha + " " + e.hora;
  _ct("cont-det-concepto").textContent = e.concepto;
  _ct("cont-det-usd").textContent = fmtUS(e.montoUSD);
  _ct("cont-det-bs").textContent = fmtBsEq(e.montoUSD);
  _ct("cont-det-metodo").textContent = e.metodo + (e.referencia !== "MANUAL" ? " · Ref. " + e.referencia : " · Manual");

  // Desglose de ítems para asientos referenciados
  let items = [];
  try {
    if (e.categoria === "VENTA") {
      const v = DB.ventas.find(x => x.nro === e.referencia);
      if (v) items = (v.lineas || []).map(l => ({ cant: l.cantidad, desc: l.descripcion, total: l.total }));
    } else if (e.categoria === "COBRO_DEUDA") {
      const ab = DB.abonos.find(x => x.nro === String(e.referencia || "").replace("ABO ", ""));
      if (ab) items = (ab.pagos || []).map(p => ({ cant: 1, desc: p.metodo, total: p.moneda === "USD" ? p.monto : usdDeBs(num(p.monto)) }));
    } else if (e.categoria === "COMPRA") {
      const c = DB.compras.find(x => x.nro === e.referencia);
      if (c) items = (c.lineas || []).map(l => ({ cant: l.cantidad, desc: l.descripcion, total: l.total }));
    }
  } catch (_err) { items = []; }

  _ct("cont-det-items-body").innerHTML = items.length ? items.map(it =>
    `<tr><td>${fmt(it.cant || 0)}</td><td>${it.desc}</td><td style="text-align:right">${fmtUS(num(it.total))}</td></tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;color:#888">Sin desglose de ítems disponible</td></tr>`;
  _ct("cont-det-items-wrap").style.display = items.length ? "" : "none";
  openModuleWindow("cont-detalle");
}

function contCerrarDetalle() { closeWindow("cont-detalle-window"); }

function contEliminarAsiento(id) {
  const e = (DB.libroDiario || []).find(x => x.id === id);
  if (!e) return;
  if (!confirm(`¿Eliminar el asiento manual ${id}?\n${e.concepto}`)) return;
  DB.libroDiario = DB.libroDiario.filter(x => x.id !== id);
  if (typeof auditar === "function") auditar("Asiento manual eliminado", id);
  saveDB();
  renderContabilidad();
}

// ---- Impresión del Libro Diario ----
function contImprimir() {
  const datos = contFiltrados();
  if (!datos.length) return alert("No hay movimientos para imprimir en este periodo.");
  const totalIng = datos.filter(e => e.tipo === "ingreso").reduce((s, e) => s + (e.montoUSD || 0), 0);
  const totalEgr = datos.filter(e => e.tipo === "egreso").reduce((s, e) => s + (e.montoUSD || 0), 0);
  const rows = datos.map(e => [
    e.fecha + " " + e.hora, e.concepto, e.categoria.replace(/_/g, " "), e.metodo,
    e.tipo === "ingreso" ? "$ " + fmt(e.montoUSD) : "",
    e.tipo === "egreso" ? "-$ " + fmt(e.montoUSD) : ""
  ]);
  const rango = contSetPeriodo();
  rows.push(["TOTAL", "", "", "", "$ " + fmt(totalIng), "-$ " + fmt(totalEgr)]);
  rows.push(["BALANCE NETO", "", "", "", "", "$ " + fmt(r2(totalIng - totalEgr))]);
  imprimirHTML("Libro Diario de Contabilidad (Ingresos y Egresos)",
    ["Fecha", "Concepto", "Categoría", "Método", "Ingreso", "Egreso"], rows, null,
    { subtitulo: `Desde ${rango.desde} hasta ${rango.hasta} · ${datos.length} movimientos · Moneda: USD` });
}

// Interceptar apertura para renderizar al abrir
document.addEventListener("DOMContentLoaded", () => {
  const orig = window.openModuleWindow;
  if (typeof orig !== "function") return;
  window.openModuleWindow = function(name) {
    if (name === "contabilidad" && typeof cargarVentanaContabilidad === "function") {
      cargarVentanaContabilidad();
    }
    return orig(name);
  };
});