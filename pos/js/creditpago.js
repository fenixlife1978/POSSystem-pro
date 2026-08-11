// ============== CUENTAS POR COBRAR (CxC) Y CUENTAS POR PAGAR (CxP) ==============
const _cp = id => document.getElementById(id);
let cxcSel = null;   // cuenta por cobrar seleccionada
let cxpSel = null;   // cuenta por pagar seleccionada

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formasPagoDisponibles(extra) {
  const list = (typeof METODOS_PAGO !== "undefined" ? METODOS_PAGO : [])
    .filter(m => !m.credit)
    .map(m => m.label);
  (extra || []).forEach(e => { if (!list.includes(e)) list.push(e); });
  return list;
}

function monedaDeForma(forma) {
  const m = (typeof METODOS_PAGO !== "undefined" ? METODOS_PAGO : [])
    .find(x => x.label === forma);
  if (m) return m.moneda;
  return forma.includes("USD") ? "USD" : "Bs";
}

function fechaKey(f) {
  const p = String(f || "").split("/");
  return p.length === 3 ? `${p[2] || ""}${p[1] || ""}${p[0] || ""}` : "";
}

// Fecha de vencimiento: marca como "Vencida" si la deuda no está pagada
function estadoCuentaCXC(c) {
  if (c.saldo > 0 && c.vencimiento && fechaKey(c.vencimiento) < fechaKey(hoy())) return "Vencida";
  return c.estado || "Pendiente";
}
function estadoCuentaCXP(c) {
  if (c.saldo > 0 && c.vencimiento && fechaKey(c.vencimiento) < fechaKey(hoy())) return "Vencida";
  return c.estado || "Pendiente";
}

function claseEstado(estado) {
  const cls = { Pendiente: "est-pend", Parcial: "est-parc", Pagada: "est-pag", Vencida: "est-ven" };
  return cls[estado] || "";
}

// ---------------------------------------------------------------------------
// CUENTAS POR COBRAR
// ---------------------------------------------------------------------------
function crearCuentaCxC(cliente, nroFactura, montoBs, lineas) {
  const cli = DB.clientes.find(c => c.nombre === cliente);
  const dias = cli ? (num(cli.dias) || 30) : 30;
  let max = 0;
  (DB.cuentasCobrar || []).forEach(c => {
    const n = parseInt(String(c.id || "").replace(/\D/g, ""), 10);
    if (n > max) max = n;
  });
  const tasa = getTasa();
  const montoUsd = usdDeBs(montoBs);
  const cuenta = {
    id: "CXC" + String(max + 1).padStart(6, "0"),
    nro: nroFactura, fecha: hoy(), hora: hora12(), vencimiento: sumarDias(hoy(), dias),
    codigo: cli ? cli.codigo : "", nombre: cliente, rif: cli ? cli.rif : "",
    tasa: r2(tasa), total: r2(montoUsd), totalBs: r2(montoBs), pagado: 0, saldo: r2(montoUsd), estado: "Pendiente",
    lineas: (lineas || []).map(it => ({
      codigo: it.codigo, descripcion: it.descripcion,
      cantidad: it.cantidad, precio: it.precio, total: it.total
    }))
  };
  DB.cuentasCobrar.unshift(cuenta);
  return cuenta;
}

// Aplica un abono a las cuentas por cobrar del cliente (FIFO por fecha)
function aplicarPagoCuentasCobrar(nombre, monto) {
  const cuentas = DB.cuentasCobrar
    .filter(c => c.nombre === nombre && c.saldo > 0)
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  let rest = r2(monto);
  cuentas.forEach(c => {
    if (rest <= 0) return;
    const aplicar = r2(Math.min(rest, c.saldo));
    c.pagado = r2((c.pagado || 0) + aplicar);
    c.saldo = r2(c.saldo - aplicar);
    c.estado = c.saldo <= 0 ? "Pagada" : "Parcial";
    rest = r2(rest - aplicar);
  });
  return r2(monto - rest);
}

// Registro central de abonos/cobros de deuda de clientes (usado por POS y CxC).
// La deuda se mantiene en USD; los pagos en Bs. se convierten con la tasa del sistema.
function registrarAbonoCliente(cli, pagos, origen) {
  const totalDeuda = num(cli.saldo) || 0;
  if (totalDeuda <= 0) return { error: "El cliente ya no tiene deuda pendiente." };
  const tasa = getTasa();
  const asignado = pagos.reduce((s, p) => s + (p.moneda === "USD" ? num(p.monto) : usdDeBs(num(p.monto))), 0);
  if (asignado <= 0) return { error: "Ingrese un monto a cobrar." };
  const nro = genNro(DB.abonos, "nro", "", 7);
  const ref = `ABO ${nro}`;
  const montoCobrado = r2(Math.min(asignado, totalDeuda));
  const saldoRestante = r2(totalDeuda - montoCobrado);
  const vuelto = asignado > totalDeuda ? r2(asignado - totalDeuda) : 0;

  DB.abonos.unshift({
    nro, fecha: hoy(), hora: hora12(), tasa: r2(tasa),
    cliente: cli.nombre, rif: cli.rif, codigo: cli.codigo,
    totalDeuda, montoCobrado, saldoRestante,
    forma: pagos.map(p => p.metodo).join(" + "),
    pagos
  });

  if (typeof asentAbono === "function") asentAbono(cli.nombre, ref, pagos);

  aplicarPagoCuentasCobrar(cli.nombre, montoCobrado);

  const pendientes = DB.cuentasCobrar.filter(c => c.nombre === cli.nombre).reduce((s, c) => s + (c.saldo || 0), 0);
  cli.saldo = r2(pendientes);

  pagos.forEach(p => {
    if (p.metodo === "Efectivo Bs.") movimientoCaja(origen + " (Efectivo Bs.)", ref, p.monto, 0, true);
    else if (p.metodo === "Efectivo USD (físico)") movimientoCaja(origen + " (Efectivo USD)", ref, 0, p.monto, true);
    else if (p.metodo !== "Crédito (CxC)") movimientoCaja(origen + " (" + p.metodo + ")", ref, p.moneda === "USD" ? 0 : p.monto, p.moneda === "USD" ? p.monto : 0, true);
  });

  auditar(origen, `Abono ${nro} — ${fmtUS(montoCobrado)} (${fmtBsEq(montoCobrado)}) — ${cli.nombre}`);
  return { ok: true, nro, ref, totalDeuda, montoCobrado, saldoRestante, vuelto, forma: pagos.map(p => p.metodo).join(" + ") };
}

function filtrarCxCData() {
  const q = (_cp("cxc-search").value || "").toLowerCase();
  const est = _cp("cxc-estado").value;
  const soloVenc = _cp("cxc-vencidas").checked;
  return DB.cuentasCobrar.filter(c => {
    if (q && !(String(c.nro || "").toLowerCase().includes(q) ||
      String(c.nombre || "").toLowerCase().includes(q) ||
      String(c.rif || "").toLowerCase().includes(q))) return false;
    const e = estadoCuentaCXC(c);
    if (est !== "Todos" && e !== est) return false;
    if (soloVenc && e !== "Vencida") return false;
    return true;
  });
}

function renderCxC() {
  const resumen = _cp("cxc-vista").value === "resumen";
  const datos = filtrarCxCData();
  const body = _cp("cxc-body");
  const mon = m => `${fmtUS(m)}<br><span class="usd-sub">${fmtBsEq(m)}</span>`;
  if (resumen) {
    const porCliente = {};
    datos.forEach(c => {
      const k = c.nombre;
      if (!porCliente[k]) porCliente[k] = { nombre: k, rif: c.rif, cuentas: 0, total: 0, pagado: 0, saldo: 0, vencidas: 0 };
      const g = porCliente[k];
      g.cuentas++; g.total = r2(g.total + c.total); g.pagado = r2(g.pagado + (c.pagado || 0)); g.saldo = r2(g.saldo + (c.saldo || 0));
      if (estadoCuentaCXC(c) === "Vencida") g.vencidas++;
    });
    body.innerHTML = Object.values(porCliente).map(g =>
      `<tr class="cursor" onclick="verClienteCxC('${g.nombre.replace(/'/g, "\\'")}')">
        <td>${g.nombre}</td><td>${g.rif}</td><td style="text-align:right">${g.cuentas}</td>
        <td style="text-align:right">${mon(g.total)}</td><td style="text-align:right">${mon(g.pagado)}</td>
        <td style="text-align:right"><b>${mon(g.saldo)}</b></td>
        <td style="text-align:right">${g.vencidas}</td>
      </tr>`).join("") ||
      `<tr><td colspan="7" style="text-align:center;color:#888">Sin cuentas que coincidan con el filtro</td></tr>`;
  } else {
    body.innerHTML = datos.map(c => {
      const e = estadoCuentaCXC(c);
      return `<tr class="${cxcSel && cxcSel.id === c.id ? "selected" : ""} cursor" onclick="selectCxC('${c.id}', this)">
        <td>${c.nro}</td><td>${c.fecha}</td><td>${c.vencimiento}</td><td>${c.nombre}</td>
        <td style="text-align:right">${mon(c.total)}</td><td style="text-align:right">${mon(c.pagado || 0)}</td>
        <td style="text-align:right"><b>${mon(c.saldo)}</b></td>
        <td><span class="est-badge ${claseEstado(e)}">${e}</span></td>
      </tr>`;
    }).join("") ||
    `<tr><td colspan="8" style="text-align:center;color:#888">Sin cuentas que coincidan con el filtro</td></tr>`;
  }

  const cartera = DB.cuentasCobrar.reduce((s, c) => s + (c.saldo || 0), 0);
  const vencidas = DB.cuentasCobrar.filter(c => estadoCuentaCXC(c) === "Vencida").reduce((s, c) => s + (c.saldo || 0), 0);
  const cobradoHoy = DB.abonos.filter(a => a.fecha === hoy()).reduce((s, a) => s + (a.montoCobrado || 0), 0);
  _cp("cxc-sum-cartera").textContent = saldoDual(cartera);
  _cp("cxc-sum-vencidas").textContent = saldoDual(vencidas);
  _cp("cxc-sum-cobrado").textContent = saldoDual(cobradoHoy);

  if (cxcSel) {
    const act = DB.cuentasCobrar.find(c => c.id === cxcSel.id);
    if (act) selectCxC(act.id, null);
  }
}

function verClienteCxC(nombre) {
  _cp("cxc-search").value = nombre;
  _cp("cxc-vista").value = "detalle";
  renderCxC();
}

function selectCxC(id, row) {
  const c = DB.cuentasCobrar.find(x => x.id === id);
  if (!c) return;
  cxcSel = c;
  if (row) {
    _cp("cxc-body").querySelectorAll("tr").forEach(tr => tr.classList.remove("selected"));
    row.classList.add("selected");
  }
  _cp("cxc-fact-info").textContent = `Factura ${c.nro} — ${c.fecha} (venc. ${c.vencimiento}) — ${c.nombre}`;
  _cp("cxc-items-total").textContent = saldoDual(c.total);
  _cp("cxc-items-body").innerHTML = (c.lineas || []).map(l =>
    `<tr><td>${l.codigo}</td><td>${l.descripcion}</td><td style="text-align:right">${fmt(l.cantidad)}</td>
     <td style="text-align:right">${fmt(l.precio)}</td><td style="text-align:right">${fmt(l.total)}</td></tr>`).join("") ||
    `<tr><td colspan="5" style="text-align:center;color:#888">Sin detalle de ítems</td></tr>`;

  renderAbonosCliente(c.nombre);
}

function renderAbonosCliente(nombre) {
  _cp("cxc-abonos-title").textContent = `Historial de Cobros — ${nombre}`;
  const cli = DB.clientes.find(x => x.nombre === nombre);
  _cp("cxc-cli-line").textContent = cli
    ? `Límite: ${fmt(cli.limite || 0)} Bs. (${fmtUS(usdDeBs(cli.limite || 0))})  |  Plazo: ${cli.dias || 0} días  |  Saldo: ${saldoDual(cli.saldo || 0)}`
    : "";
  const abonos = DB.abonos.filter(a => a.cliente === nombre).slice(0, 50);
  _cp("cxc-abonos-body").innerHTML = abonos.map(a =>
    `<tr><td>ABO ${a.nro}</td><td>${a.fecha}</td><td>${a.hora}</td>
     <td style="text-align:right">${fmtUS(a.montoCobrado)}<br><span class="usd-sub">${fmtBsEq(a.montoCobrado)}</span></td><td>${a.forma}</td>
     <td style="text-align:right">${fmtUS(a.saldoRestante)}</td></tr>`).join("") ||
    `<tr><td colspan="6" style="text-align:center;color:#888">Sin cobros registrados</td></tr>`;
}

function filtrarCxC() { renderCxC(); }

function abonarCxC() {
  if (!cxcSel) { alert("Seleccione primero una cuenta por cobrar."); return; }
  const cli = DB.clientes.find(x => x.nombre === cxcSel.nombre);
  if (!cli || (num(cli.saldo) || 0) <= 0) { alert("El cliente ya no tiene deuda pendiente."); return; }
  _cp("cxc-ab-cliente").value = cli.nombre;
  _cp("cxc-ab-rif").value = cli.rif || "";
  _cp("cxc-ab-deuda").textContent = saldoDual(cli.saldo || 0);
  _cp("cxc-ab-monto").value = (Math.min(cxcSel.saldo || 0, cli.saldo || 0)).toFixed(2).replace(".", ",");
  _cp("cxc-ab-ref").value = "";
  if (!_cp("cxc-ab-forma").options.length) {
    _cp("cxc-ab-forma").innerHTML = formasPagoDisponibles().map(f => `<option>${f}</option>`).join("");
  }
  _cp("cxc-ab-forma").value = "Efectivo USD (físico)";
  actualizarEquivAbono();
  openModuleWindow("cxc-abono");
}

// Equivalencia Bs./USD del monto a abonar según la forma de pago seleccionada.
// La deuda es FIJA en USD; solo la equivalencia en Bs. cambia con la tasa del día.
let _abonoLastForma = "";
function actualizarEquivAbono() {
  const forma = _cp("cxc-ab-forma");
  const monto = _cp("cxc-ab-monto");
  const el = _cp("cxc-ab-monto-usd");
  if (!forma || !monto || !el) return;
  const esUsd = monedaDeForma(forma.value) === "USD";
  const prev = _abonoLastForma;
  _abonoLastForma = forma.value;
  const val = num(monto.value);
  if (prev && prev !== forma.value && val > 0) {
    const prevUsd = monedaDeForma(prev) === "USD";
    monto.value = (prevUsd ? bsDeUsd(val) : usdDeBs(val)).toFixed(2).replace(".", ",");
  }
  const v = num(monto.value);
  el.textContent = esUsd ? fmtBsEq(v) : fmtUS(usdDeBs(v));
}

function guardarAbonoCxC() {
  const nombre = _cp("cxc-ab-cliente").value.trim();
  const cli = DB.clientes.find(x => x.nombre === nombre);
  if (!cli) { alert("Cliente no encontrado."); return; }
  const forma = _cp("cxc-ab-forma").value;
  const monto = num(_cp("cxc-ab-monto").value);
  if (monto <= 0) { alert("Ingrese un monto válido."); return; }
  const esUsd = monedaDeForma(forma) === "USD";
  const tasa = getTasa();
  const pagos = [{ metodo: forma, moneda: esUsd ? "USD" : "Bs", monto, equivBs: r2(esUsd ? monto * tasa : monto) }];
  const r = registrarAbonoCliente(cli, pagos, "Abono CxC");
  if (r.error) { alert(r.error); return; }
  saveDB();
  renderMovimientosCaja();
  renderCxC();
  closeWindow("cxc-abono-window");
  alert(`ABONO REGISTRADO\nCliente: ${cli.nombre}\nDeuda: ${saldoDual(r.totalDeuda)}\nAbonado: ${saldoDual(r.montoCobrado)}\nSaldo restante: ${saldoDual(r.saldoRestante)}`);
}

function cerrarAbonoCxC() { closeWindow("cxc-abono-window"); }

function imprimirCxC() {
  const resumen = _cp("cxc-vista").value === "resumen";
  const datos = resumen ? [] : filtrarCxCData();
  imprimirHTML("Cuentas por Cobrar", ["N° Factura", "Fecha", "Vencimiento", "Cliente", "Total $", "Pagado $", "Saldo $", "Estado"],
    datos.map(c => [c.nro, c.fecha, c.vencimiento, c.nombre, fmtUS(c.total), fmtUS(c.pagado || 0), fmtUS(c.saldo), estadoCuentaCXC(c)]));
}

function exportarCxC() {
  const datos = filtrarCxCData();
  exportarCSV("Cuentas por Cobrar", ["N° Factura", "Fecha", "Vencimiento", "Cliente", "RIF", "Total $", "Total Bs.", "Pagado $", "Saldo $", "Estado"],
    datos.map(c => [c.nro, c.fecha, c.vencimiento, c.nombre, c.rif, fmt(c.total), fmt(c.totalBs !== undefined ? c.totalBs : bsDeUsd(c.total)), fmt(c.pagado || 0), fmt(c.saldo), estadoCuentaCXC(c)]));
}

// Re-render disparado desde el POS tras un cobro de deuda
function renderAbonos() { renderCxC(); }

// ---------------------------------------------------------------------------
// CUENTAS POR PAGAR
// ---------------------------------------------------------------------------
function sincronizarCxP() {
  (DB.compras || []).forEach(c => {
    if (!DB.cuentasPagar.some(x => x.nro === c.nro)) {
      const totalBs = num(c.total);
      const pagadoBs = num(c.pagado) || 0;
      const saldoBs = c.pendiente !== undefined ? num(c.pendiente) : (totalBs - pagadoBs);
      if (saldoBs > 0) {
        const dias = c.diasCredito || ((c.tipo === "Credito" || c.tipo === "Mixto") ? 30 : 0);
        // Tasa BCV del día de la compra: el USD de la cuenta es FIJO y se calcula
        // con la tasa de ese día, nunca con la tasa actual del día de pago.
        const tasa = num(c.bcv_rate_at_purchase) || getTasa();
        const toUsd = b => (tasa > 0 ? num(b) / tasa : usdDeBs(b));
        DB.cuentasPagar.unshift({
          nro: c.nro, fecha: c.fecha, vencimiento: sumarDias(c.fecha, dias),
          proveedor: c.proveedor, tasa: r2(tasa),
          total: num(c.totalUSDBcv) || r2(toUsd(totalBs)),
          totalBs: r2(totalBs),
          pagado: num(c.pagadoUSDBcv) || r2(toUsd(pagadoBs)),
          saldo: num(c.pendienteUSD) || r2(toUsd(saldoBs)),
          estado: "Pendiente",
          lineas: (c.lineas || []).map(l => ({
            codigo: l.codigo, descripcion: l.descripcion,
            cantidad: l.cantidad, costo: l.costo || l.costoVES || 0, total: l.total
          }))
        });
      }
    }
  });
}

function filtrarCxPData() {
  const q = (_cp("cxp-search").value || "").toLowerCase();
  const est = _cp("cxp-estado").value;
  return DB.cuentasPagar.filter(c => {
    if (q && !(String(c.nro || "").toLowerCase().includes(q) ||
      String(c.proveedor || "").toLowerCase().includes(q))) return false;
    const e = estadoCuentaCXP(c);
    if (est !== "Todos" && e !== est) return false;
    return true;
  });
}

function renderCxP() {
  sincronizarCxP();
  const datos = filtrarCxPData();
  const mon = m => `${fmtUS(m)}<br><span class="usd-sub">${fmtBsEq(m)}</span>`;
  _cp("cxp-body").innerHTML = datos.map(c => {
    const e = estadoCuentaCXP(c);
    return `<tr class="${cxpSel && cxpSel.nro === c.nro ? "selected" : ""} cursor" onclick="selectCxP('${c.nro}', this)">
      <td>${c.nro}</td><td>${c.fecha}</td><td>${c.proveedor}</td>
      <td style="text-align:right">${mon(c.total)}</td><td style="text-align:right">${mon(c.pagado || 0)}</td>
      <td style="text-align:right"><b>${mon(c.saldo)}</b></td>
      <td><span class="est-badge ${claseEstado(e)}">${e}</span></td>
    </tr>`;
  }).join("") ||
  `<tr><td colspan="7" style="text-align:center;color:#888">Sin cuentas por pagar que coincidan con el filtro</td></tr>`;

  const totalPagar = DB.cuentasPagar.reduce((s, c) => s + (c.saldo || 0), 0);
  const vencidas = DB.cuentasPagar.filter(c => estadoCuentaCXP(c) === "Vencida").reduce((s, c) => s + (c.saldo || 0), 0);
  const pagadoHoy = DB.pagosPagar.filter(p => p.fecha === hoy()).reduce((s, p) => s + (p.monto || 0), 0);
  _cp("cxp-sum-total").textContent = saldoDual(totalPagar);
  _cp("cxp-sum-vencidas").textContent = saldoDual(vencidas);
  _cp("cxp-sum-pagado").textContent = saldoDual(pagadoHoy);

  if (cxpSel) {
    const act = DB.cuentasPagar.find(c => c.nro === cxpSel.nro);
    if (act) selectCxP(act.nro, null);
  }
}

function selectCxP(nro, row) {
  const c = DB.cuentasPagar.find(x => x.nro === nro);
  if (!c) return;
  cxpSel = c;
  if (row) {
    _cp("cxp-body").querySelectorAll("tr").forEach(tr => tr.classList.remove("selected"));
    row.classList.add("selected");
  }
  _cp("cxp-comp-info").textContent = `Compra ${c.nro} — ${c.fecha} (venc. ${c.vencimiento}) — ${c.proveedor}`;
  _cp("cxp-comp-total").textContent = saldoDual(c.total);
  _cp("cxp-items-body").innerHTML = (c.lineas || []).map(l =>
    `<tr><td>${l.codigo}</td><td>${l.descripcion}</td><td style="text-align:right">${fmt(l.cantidad)}</td>
     <td style="text-align:right">${fmt(l.costo)}</td><td style="text-align:right">${fmt(l.total)}</td></tr>`).join("") ||
    `<tr><td colspan="5" style="text-align:center;color:#888">Sin detalle de ítems</td></tr>`;
  renderPagosProveedor(c.proveedor);
}

function renderPagosProveedor(proveedor) {
  _cp("cxp-pagos-title").textContent = `Historial de Pagos — ${proveedor}`;
  const pagos = DB.pagosPagar.filter(p => p.proveedor === proveedor).slice(0, 50);
  _cp("cxp-pagos-body").innerHTML = pagos.map(p =>
    `<tr><td>PAG ${p.nro}</td><td>${p.fecha}</td><td>${p.forma}</td><td>${p.referencia || "—"}</td>
     <td style="text-align:right">${fmtUS(p.monto)}</td></tr>`).join("") ||
    `<tr><td colspan="5" style="text-align:center;color:#888">Sin pagos registrados</td></tr>`;
}

function filtrarCxP() { renderCxP(); }

function abrirPagoCxP() {
  if (!cxpSel) { alert("Seleccione primero una cuenta por pagar."); return; }
  if ((cxpSel.saldo || 0) <= 0) { alert("Esta cuenta ya está liquidada."); return; }
  _cp("cxp-pg-proveedor").value = cxpSel.proveedor;
  _cp("cxp-pg-cuenta").value = cxpSel.nro;
  _cp("cxp-pg-saldo").textContent = saldoDual(cxpSel.saldo || 0);
  _cp("cxp-pg-monto").value = (cxpSel.saldo || 0).toFixed(2).replace(".", ",");
  _cp("cxp-pg-fecha").value = hoy();
  _cp("cxp-pg-ref").value = "";
  _cp("cxp-pg-obs").value = "";
  if (!_cp("cxp-pg-forma").options.length) {
    _cp("cxp-pg-forma").innerHTML = formasPagoDisponibles(["Cheque"]).map(f => `<option>${f}</option>`).join("");
  }
  _cp("cxp-pg-forma").value = "Efectivo USD (físico)";
  actualizarEquivPagoCxP();
  openModuleWindow("cxp-pago");
}

// Equivalencia Bs./USD del monto a pagar según la forma de pago seleccionada.
// La deuda es FIJA en USD; solo la equivalencia en Bs. cambia con la tasa del día.
let _cxpLastForma = "";
function actualizarEquivPagoCxP() {
  const forma = _cp("cxp-pg-forma");
  const monto = _cp("cxp-pg-monto");
  const el = _cp("cxp-pg-monto-usd");
  if (!forma || !monto || !el) return;
  const esUsd = monedaDeForma(forma.value) === "USD";
  const prev = _cxpLastForma;
  _cxpLastForma = forma.value;
  const val = num(monto.value);
  if (prev && prev !== forma.value && val > 0) {
    const prevUsd = monedaDeForma(prev) === "USD";
    monto.value = (prevUsd ? bsDeUsd(val) : usdDeBs(val)).toFixed(2).replace(".", ",");
  }
  const v = num(monto.value);
  el.textContent = esUsd ? fmtBsEq(v) : fmtUS(usdDeBs(v));
}

function aplicarPagoCuentasPagar(proveedor, monto) {
  const cuentas = DB.cuentasPagar
    .filter(c => c.proveedor === proveedor && c.saldo > 0)
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  let rest = r2(monto);
  cuentas.forEach(c => {
    if (rest <= 0) return;
    const aplicar = r2(Math.min(rest, c.saldo));
    c.pagado = r2((c.pagado || 0) + aplicar);
    c.saldo = r2(c.saldo - aplicar);
    c.estado = c.saldo <= 0 ? "Pagada" : "Parcial";
    rest = r2(rest - aplicar);
  });
  return r2(monto - rest);
}

function guardarPagoCxP() {
  if (!cxpSel) { alert("Seleccione una cuenta por pagar."); return; }
  const proveedor = _cp("cxp-pg-proveedor").value.trim();
  const forma = _cp("cxp-pg-forma").value;
  const esUsd = monedaDeForma(forma) === "USD";
  const tasa = getTasa();
  const montoEntrada = num(_cp("cxp-pg-monto").value);
  if (montoEntrada <= 0) { alert("Ingrese un monto a pagar."); return; }
  const montoUsd = r2(esUsd ? montoEntrada : usdDeBs(montoEntrada));
  const montoBs = r2(esUsd ? bsDeUsd(montoEntrada) : montoEntrada);
  if (montoUsd <= 0) { alert("Ingrese un monto a pagar."); return; }
  const saldoProv = DB.cuentasPagar.filter(c => c.proveedor === proveedor).reduce((s, c) => s + (c.saldo || 0), 0);
  if (saldoProv <= 0) { alert("Este proveedor no tiene deuda pendiente."); return; }
  const aplicar = r2(Math.min(montoUsd, saldoProv));
  const vuelto = montoUsd > saldoProv ? r2(montoUsd - saldoProv) : 0;
  const fecha = _cp("cxp-pg-fecha").value || hoy();
  const referencia = _cp("cxp-pg-ref").value.trim();
  const observaciones = _cp("cxp-pg-obs").value.trim();

  aplicarPagoCuentasPagar(proveedor, aplicar);

  const nro = genNro(DB.pagosPagar, "nro", "", 7);
  const ref = `PAG ${nro}`;
  DB.pagosPagar.unshift({
    nro, fecha, hora: hora12(), proveedor, cuenta: cxpSel.nro,
    monto: aplicar, montoBs: r2(bsDeUsd(aplicar)), tasa: r2(tasa), forma, referencia, observaciones
  });

  if (typeof asentPagoProv === "function") asentPagoProv(proveedor, ref, aplicar, forma);

  const bsMov = r2(esUsd ? bsDeUsd(montoEntrada) : montoEntrada);
  const usdMov = r2(esUsd ? montoEntrada : usdDeBs(montoEntrada));
  movimientoCaja("Pago a Proveedor", ref, bsMov, usdMov, false);
  auditar("Pago a proveedor", `Pago ${nro} — ${fmtUS(aplicar)} (${fmtBsEq(aplicar)}) — ${proveedor}`);
  saveDB();
  renderMovimientosCaja();
  renderCxP();
  closeWindow("cxp-pago-window");
  alert(`PAGO REGISTRADO\nProveedor: ${proveedor}\nMonto: ${fmtUS(aplicar)}\nForma: ${forma}\nSaldo pendiente del proveedor: ${saldoDual(r2(saldoProv - aplicar))}${vuelto > 0 ? `\nVuelto: ${fmtUS(vuelto)}` : ""}`);
}

function cerrarPagoCxP() { closeWindow("cxp-pago-window"); }

function imprimirCxP() {
  const datos = filtrarCxPData();
  imprimirHTML("Cuentas por Pagar", ["N° Compra", "Fecha", "Proveedor", "Total $", "Pagado $", "Saldo $", "Estado"],
    datos.map(c => [c.nro, c.fecha, c.proveedor, fmtUS(c.total), fmtUS(c.pagado || 0), fmtUS(c.saldo), estadoCuentaCXP(c)]));
}

function exportarCxP() {
  const datos = filtrarCxPData();
  exportarCSV("Cuentas por Pagar", ["N° Compra", "Fecha", "Vencimiento", "Proveedor", "Total $", "Total Bs.", "Pagado $", "Saldo $", "Estado"],
    datos.map(c => [c.nro, c.fecha, c.vencimiento, c.proveedor, fmt(c.total), fmt(c.totalBs !== undefined ? c.totalBs : bsDeUsd(c.total)), fmt(c.pagado || 0), fmt(c.saldo), estadoCuentaCXP(c)]));
}

// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cxc-window")) renderCxC();
  if (document.getElementById("cxp-window")) renderCxP();
});
