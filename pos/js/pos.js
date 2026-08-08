// ============== POS - Lógica del Punto de Venta ==============
const fmt = n => (Number(n) || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUsd = n => "$ " + fmt(n);

const METODOS_PAGO = [
  { id: "efectivo_bs",  label: "Efectivo Bs.",      moneda: "Bs",  credit: false },
  { id: "efectivo_usd", label: "Efectivo USD (físico)", moneda: "USD", credit: false },
  { id: "pagomovil",    label: "Pagomóvil",         moneda: "Bs",  credit: false },
  { id: "biopago",      label: "Biopago",           moneda: "Bs",  credit: false },
  { id: "transferencia",label: "Transferencia",     moneda: "Bs",  credit: false },
  { id: "zelle",        label: "Zelle",             moneda: "USD", credit: false },
  { id: "tarjeta_punto",label: "Tarjeta / Punto",   moneda: "Bs",  credit: false },
  { id: "credito",      label: "Crédito (CxC)",     moneda: "Bs",  credit: true }
];

function findProductoByCodigo(cod) {
  cod = (cod || "").trim();
  if (!cod) return null;
  return DB.productos.find(p => p.codigo === cod || (p.barra && p.barra === cod));
}

function cajaAbierta() {
  const c = (typeof cajaActual === "function") ? cajaActual() : null;
  return !!(c && c.estado === "abierta");
}

function precioUSDReal(prod, precioBs) {
  if (!prod) return r2((precioBs || 0) / getTasa());
  if (prod.precioUSD !== undefined && r2(precioBs) === r2(prod.precio)) return r2(prod.precioUSD);
  return r2((precioBs || 0) / getTasa());
}

function agregarLineaCarrito(cod, descripcion, cant, precioReal, precioUSD, desc) {
  if (!cajaAbierta()) { alert("PRIMERO DEBE APERTURAR LA CAJA"); return; }
  const totalLinea = (cant * precioReal) * (1 - desc / 100);
  const linea = { codigo: cod, descripcion, cantidad: cant, precio: precioReal, precioUSD, descuento: desc, total: totalLinea };
  const exist = DB.carrito.find(i => i.codigo === cod);
  if (exist) {
    exist.cantidad += cant;
    exist.descuento = desc;
    exist.total = (exist.cantidad * exist.precio) * (1 - desc / 100);
  } else {
    DB.carrito.push(linea);
  }
  renderCarrito();
}

function agregarProductoDirecto(p, cant, precio, desc) {
  if (!p) return;
  const cantN = cant || 1;
  const precioReal = precio && precio > 0 ? precio : p.precio;
  agregarLineaCarrito(p.codigo, p.descripcion, cantN, precioReal, precioUSDReal(p, precioReal), desc || 0);
}

function focusProdCodigo() {
  const el = document.getElementById("prod-codigo");
  if (el) el.focus();
}

function addToCart() {
  const codEl = document.getElementById("prod-codigo");
  if (!codEl) { alert("Agregue el producto desde Buscar Producto (F3)"); return; }
  const cod = codEl.value.trim();
  if (!cod) { alert("Ingrese un código de producto"); return; }
  const cant = num(document.getElementById("prod-cantidad").value) || 1;
  const precio = num(document.getElementById("prod-precio").value);
  const desc = num(document.getElementById("prod-descuento").value);
  const p = findProductoByCodigo(cod);
  const descripcion = p ? p.descripcion : "(Producto no encontrado)";
  const precioReal = p && precio === 0 ? p.precio : precio;
  const precioUSD = p ? precioUSDReal(p, precioReal) : precioReal / getTasa();
  agregarLineaCarrito(cod, descripcion, cant, precioReal, precioUSD, desc);
  clearProductInput();
  focusProdCodigo();
}

function renderCarrito() {
  const tbody = document.getElementById("detalle-venta-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const tasa = getTasa();
  DB.carrito.forEach((it, idx) => {
    const usd = it.precioUSD !== undefined ? it.precioUSD : it.precio / tasa;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.codigo}</td>
      <td>${it.descripcion}</td>
      <td style="text-align:right">${fmt(it.cantidad)}</td>
      <td style="text-align:right">${fmt(usd)} $</td>
      <td style="text-align:right">${fmt(it.precio)}</td>
      <td style="text-align:right">${fmt(it.descuento)}</td>
      <td style="text-align:right">${fmt(it.total)}</td>
      <td style="text-align:center">
        <button class="btn-mini" title="Modificar cantidad" onclick="abrirQtyEdit(${idx})">⟲</button>
        <button class="btn-mini" title="Quitar" onclick="quitarLinea(${idx})">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  recalcTotales();
}

function quitarLinea(idx) {
  DB.carrito.splice(idx, 1);
  renderCarrito();
}

// ===== Modal de cantidad =====
let qtyTemp = null;

function abrirQtyAdd(p) {
  qtyTemp = { p, idx: -1 };
  document.getElementById("qty-product").textContent = `${p.codigo} — ${p.descripcion}`;
  document.getElementById("qty-input").value = "1";
  document.getElementById("qty-hint").textContent = `Precio unitario: ${fmt(p.precio)} Bs. (${fmt((p.precio || 0) / getTasa())} $)`;
  document.getElementById("qty-modal").classList.remove("hidden");
  const inp = document.getElementById("qty-input");
  inp.focus();
  inp.select();
}

function abrirQtyEdit(idx) {
  const it = DB.carrito[idx];
  if (!it) return;
  qtyTemp = { p: null, idx };
  const prod = findProductoByCodigo(it.codigo);
  document.getElementById("qty-product").textContent = `${it.codigo} — ${it.descripcion}`;
  document.getElementById("qty-input").value = String(it.cantidad);
  document.getElementById("qty-hint").textContent = prod ? `Precio unitario: ${fmt(prod.precio)} Bs.` : "";
  document.getElementById("qty-modal").classList.remove("hidden");
  const inp = document.getElementById("qty-input");
  inp.focus();
  inp.select();
}

function ajustarQty(delta) {
  const inp = document.getElementById("qty-input");
  const v = num(inp.value) || 0;
  inp.value = String(Math.max(0, v + delta));
  inp.focus();
}

function confirmarQty() {
  const cant = num(document.getElementById("qty-input").value) || 1;
  if (cant <= 0) { alert("La cantidad debe ser mayor a 0"); return; }
  if (qtyTemp && qtyTemp.idx >= 0) {
    const it = DB.carrito[qtyTemp.idx];
    if (it) {
      it.cantidad = cant;
      it.total = (cant * it.precio) * (1 - (it.descuento || 0) / 100);
      renderCarrito();
    }
    cerrarQty();
    focusProdCodigo();
  } else if (qtyTemp && qtyTemp.p) {
    const p = qtyTemp.p;
    agregarProductoDirecto(p, cant, p.precio, 0);
    cerrarQty();
    const buscarW = document.getElementById("buscar-window");
    if (buscarW && !buscarW.classList.contains("hidden")) {
      setTimeout(() => { const inp = document.getElementById("buscar-input"); if (inp) inp.focus(); }, 0);
    } else {
      focusProdCodigo();
    }
  }
}

function cerrarQty() {
  document.getElementById("qty-modal").classList.add("hidden");
  qtyTemp = null;
}

function qtyVisible() {
  const m = document.getElementById("qty-modal");
  return m && !m.classList.contains("hidden");
}

function calcTotals() {
  const bruto = DB.carrito.reduce((s, i) => s + (i.cantidad * i.precio), 0);
  const desc = DB.carrito.reduce((s, i) => s + (i.cantidad * i.precio) * (i.descuento / 100), 0);
  const sub = bruto - desc;
  const iva = sub * (getIva() / 100);
  return { bruto, desc, sub, iva, total: sub + iva };
}

function recalcTotales() {
  const t = calcTotals();
  const tasa = getTasa();
  document.getElementById("t-bruto").textContent = fmt(t.bruto);
  document.getElementById("t-desc").textContent = fmt(t.desc);
  document.getElementById("t-sub").textContent = fmt(t.sub);
  document.getElementById("t-iva").textContent = fmt(t.iva);
  document.getElementById("t-total").textContent = fmt(t.total);
  document.getElementById("t-total-usd").textContent = fmt(t.total / tasa) + " $";
  document.getElementById("iva-amount").textContent = fmt(t.iva);
  document.getElementById("total-pagar").textContent = fmt(t.total);
  document.getElementById("total-pagar-usd").textContent = "( " + fmt(t.total / tasa) + " $ )";
  document.getElementById("iva-label").textContent = `I.V.A. (${getIva()} %)`;
  const cob = document.getElementById("cobrar-total");
  if (cob) cob.textContent = fmt(t.total);
}

function clearProductInput() {
  ["prod-codigo", "prod-cantidad", "prod-precio", "prod-descuento"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = id === "prod-cantidad" ? "1" : id === "prod-descuento" ? "0" : "";
  });
}

function newSale() {
  if (DB.carrito.length && !confirm("¿Desea iniciar una nueva venta? Se perderá el contenido actual.")) return;
  DB.carrito = [];
  renderCarrito();
  clearProductInput();
  document.getElementById("cliente-codigo").value = "000001";
  document.getElementById("cliente-nombre").value = "CONSUMIDOR FINAL";
  ocultarClientePos();
  document.getElementById("cliente-direccion").value = "";
  document.getElementById("cliente-rif").value = "";
  const tipo = document.getElementById("cliente-doc-tipo");
  if (tipo) tipo.value = "V-";
  document.getElementById("cliente-telefono").value = "";
  document.getElementById("observaciones").value = "";
  const cred = document.getElementById("cliente-credito");
  if (cred) cred.checked = false;
  toggleCredito();
  actualizarClienteNuevoRow(false);
  mostrarSaldoCliente();
}

function cancelSale() {
  if (!DB.carrito.length) { alert("No hay venta activa para anular"); return; }
  if (confirm("¿Está seguro de anular la venta actual?")) {
    DB.carrito = [];
    renderCarrito();
  }
}

function applyDiscount() {
  if (!DB.carrito.length) { alert("Agregue productos antes de aplicar descuento"); return; }
  const d = num(prompt("Porcentaje de descuento general:", "0"));
  DB.carrito.forEach(it => it.descuento = d);
  DB.carrito.forEach(it => it.total = (it.cantidad * it.precio) * (1 - d / 100));
  renderCarrito();
}

// ============== VENTANA DE PAGO (Calculadora) ==============
let pagoTemp = [];

// Cliente cuya deuda se está cobrando (null = venta normal)
let cobroDeudaCliente = null;

function cobrarDeudaCliente() {
  const cli = saldoClienteActual();
  if (!cli) { alert("Seleccione primero un cliente con deuda pendiente."); return; }
  const saldo = num(cli.saldo) || 0;
  if (saldo <= 0) { alert("Este cliente no tiene deuda pendiente (saldo a favor o cero)."); return; }
  if (DB.carrito.length) { alert("Finalice o anule la venta actual antes de cobrar una deuda."); return; }
  cobroDeudaCliente = cli;
  renderPagoWindow("mixto");
  openModuleWindow("pago");
}

function montoTotalPago() {
  if (cobroDeudaCliente) return num(cobroDeudaCliente.saldo) || 0;
  return calcTotals().total;
}

function pay(preseleccion) {
  if (!DB.carrito.length) { alert("No hay productos en la venta"); return; }
  renderPagoWindow(preseleccion);
  openModuleWindow("pago");
}

function renderPagoWindow(preseleccion) {
  const t = calcTotals();
  const tasa = getTasa();
  const enCobro = !!cobroDeudaCliente;
  const total = enCobro ? montoTotalPago() : t.total;
  document.getElementById("pago-total").textContent = fmt(total);
  document.getElementById("pago-total-usd").textContent = "( " + fmt(total / tasa) + " $ )";
  document.getElementById("pago-tasa").textContent = fmt(tasa);

  const titulo = document.getElementById("pago-titulo");
  if (titulo) titulo.textContent = enCobro ? `COBRO DE DEUDA — ${cobroDeudaCliente.nombre}:` : "TOTAL A PAGAR:";

  const cliente = DB.clientes.find(c => c.nombre === document.getElementById("cliente-nombre").value.trim());
  const credBox = document.getElementById("cliente-credito");
  const esCredito = !enCobro && ((credBox && credBox.checked) || (!!cliente && (cliente.tipo === "Crédito" || cliente.tipo === "Mixto")));

  const sel = document.getElementById("pago-metodo");
  if (sel) {
    sel.innerHTML = METODOS_PAGO.map(m =>
      `<option value="${m.id}" ${m.credit && !esCredito ? "disabled" : ""}>${m.label}${m.credit && !esCredito ? " (sin crédito)" : ""}</option>`
    ).join("");
    if (preseleccion && preseleccion !== "mixto") sel.value = preseleccion;
    if (!sel.value || (sel.selectedOptions && sel.selectedOptions[0] && sel.selectedOptions[0].disabled)) sel.value = "efectivo_bs";
  }

  pagoTemp = [];
  const monto = document.getElementById("pago-monto");
  if (monto) monto.value = "";
  actualizarEquivMonto();

  const credBtn = document.getElementById("pago-credito-btn");
  if (credBtn) credBtn.disabled = !esCredito;

  const confirmBtn = document.getElementById("pago-confirmar");
  if (confirmBtn) confirmBtn.textContent = enCobro ? "✅ Registrar Cobro" : "✅ Finalizar Venta";

  renderPagoBody();
  updatePagoTotales();

  if (monto) setTimeout(() => monto.focus(), 60);
}

function actualizarEquivMonto() {
  const monto = document.getElementById("pago-monto");
  const sel = document.getElementById("pago-metodo");
  const el = document.getElementById("pago-monto-usd");
  if (!monto || !sel || !el) return;
  const m = METODOS_PAGO.find(x => x.id === sel.value);
  const val = num(monto.value);
  const equiv = m && m.moneda === "USD" ? val * getTasa() : val;
  el.textContent = fmt(equiv) + " $";
}

function agregarPago() {
  const sel = document.getElementById("pago-metodo");
  const monto = document.getElementById("pago-monto");
  if (!sel || !monto) return;
  const m = METODOS_PAGO.find(x => x.id === sel.value);
  const val = num(monto.value);
  if (!m || val <= 0) { alert("Ingrese un monto válido"); if (monto) monto.focus(); return; }
  pagoTemp.push({
    id: m.id, label: m.label, moneda: m.moneda,
    monto: r2(val), equiv: r2(m.moneda === "USD" ? val * getTasa() : val)
  });
  monto.value = "";
  actualizarEquivMonto();
  renderPagoBody();
  updatePagoTotales();
  monto.focus();
}

function agregarPagoCredito() {
  if (cobroDeudaCliente) return;
  const t = calcTotals();
  pagoTemp = [{ id: "credito", label: "Crédito (CxC)", moneda: "Bs", monto: r2(t.total), equiv: r2(t.total) }];
  renderPagoBody();
  updatePagoTotales();
  const btn = document.getElementById("pago-confirmar");
  if (btn) btn.focus();
}

function quitarPago(idx) {
  pagoTemp.splice(idx, 1);
  renderPagoBody();
  updatePagoTotales();
}

function renderPagoBody() {
  const body = document.getElementById("pago-body");
  if (!body) return;
  body.innerHTML = pagoTemp.map((p, i) =>
    `<tr>
      <td>${p.label}</td>
      <td style="text-align:center">${p.moneda}</td>
      <td style="text-align:right">${fmt(p.monto)}</td>
      <td style="text-align:right">${fmt(p.equiv)}</td>
      <td style="text-align:center"><button class="btn-mini" onclick="quitarPago(${i})">✕</button></td>
    </tr>`
  ).join("") || `<tr><td colspan="5" style="text-align:center;color:#888">Agregue métodos de pago hasta cubrir el total</td></tr>`;
}

function llenarPagoBs() {
  const total = montoTotalPago();
  pagoTemp = [{ id: "efectivo_bs", label: "Efectivo Bs.", moneda: "Bs", monto: r2(total), equiv: r2(total) }];
  renderPagoBody();
  updatePagoTotales();
  const btn = document.getElementById("pago-confirmar");
  if (btn) btn.focus();
}

function llenarPagoUsd() {
  const total = montoTotalPago();
  const usd = r2(total / getTasa());
  pagoTemp = [{ id: "efectivo_usd", label: "Efectivo USD (físico)", moneda: "USD", monto: usd, equiv: r2(usd * getTasa()) }];
  renderPagoBody();
  updatePagoTotales();
  const btn = document.getElementById("pago-confirmar");
  if (btn) btn.focus();
}

function updatePagoTotales() {
  const total = montoTotalPago();
  let asignado = 0;
  let credito = 0;
  pagoTemp.forEach(p => {
    if (p.id === "credito") credito += p.equiv;
    else asignado += p.equiv;
  });

  const faltante = Math.max(0, r2(total - asignado - credito));
  const vuelto = asignado > total - credito ? r2(asignado - (total - credito)) : 0;

  document.getElementById("pago-asignado").textContent = fmt(asignado);
  document.getElementById("pago-faltante").textContent = fmt(faltante);
  document.getElementById("pago-vuelto").textContent = fmt(vuelto);
  document.getElementById("pago-usados").textContent = pagoTemp.map(p => `${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)} ${p.moneda}`).join(", ") || "—";

  const btn = document.getElementById("pago-confirmar");
  const enCobro = !!cobroDeudaCliente;
  const ok = enCobro ? (asignado > 0 || credito > 0) : (faltante === 0 && (asignado > 0 || credito > 0));
  btn.disabled = !ok;
  btn.title = ok ? "" : (faltante > 0 ? `Faltan ${fmt(faltante)} Bs.` : "Ingrese un monto");
}

function confirmPago() {
  if (cobroDeudaCliente) { confirmarCobroDeuda(); return; }
  const t = calcTotals();
  const tasa = getTasa();
  const nro = genNro(DB.ventas, "nro", "", 7);
  const ref = `${DB.parametros.serie} ${nro}`;
  const cliente = document.getElementById("cliente-nombre").value.trim();
  const observaciones = document.getElementById("observaciones").value.trim();
  const pagos = pagoTemp.map(p => ({
    metodo: p.label, moneda: p.moneda, monto: p.monto, equivBs: p.equiv
  }));

  const credito = pagos.filter(p => p.metodo === "Crédito (CxC)").reduce((s, p) => s + p.monto, 0);

  // Cliente nuevo creado desde el POS: se registra automáticamente en el módulo de clientes
  registrarClienteNuevoDesdePOS();

  const totalBs = r2(t.total);
  const venta = {
    nro, fecha: hoy(), hora: hora12(), forma: pagos.map(p => p.metodo).join(" + "),
    cliente, observaciones, descuento: r2(t.desc), subtotal: r2(t.sub), iva: r2(t.iva), total: totalBs,
    tasa: r2(tasa), pagos, lineas: DB.carrito.map(it => ({ ...it }))
  };
  DB.ventas.push(venta);

  // Acreditar saldo al cliente cuando la venta se registró a crédito
  if (credito > 0) {
    const cli = DB.clientes.find(c => c.nombre === cliente);
    if (cli) {
      cli.saldo = r2((cli.saldo || 0) + credito);
      mostrarSaldoCliente(cli);
    }
    if (typeof crearCuentaCxC === "function") crearCuentaCxC(cliente, ref, credito, DB.carrito);
  }

  // Descontar stock y registrar kardex
  DB.carrito.forEach(it => {
    const p = DB.productos.find(x => x.codigo === it.codigo);
    if (!p) return;
    const esServ = typeof esServicio === "function" && esServicio(p);
    const comps = (p.componentes || []);
    if (esServ && comps.length) {
      comps.forEach(c => {
        const prod = DB.productos.find(x => x.codigo === c.codigo);
        if (!prod) return;
        const cant = (num(c.cantidad) || 1) * it.cantidad;
        prod.existencia = Math.max(0, (prod.existencia || 0) - cant);
        const movs = DB.movimientosInv.filter(m => m.producto === prod.codigo);
        const saldo = (movs.length ? movs[0].saldo : prod.existencia + cant) - cant;
        movimientoInv(prod.codigo, "Venta", -cant, `${ref} · ${p.descripcion}`, r2(saldo));
      });
      return;
    }
    p.existencia = Math.max(0, (p.existencia || 0) - it.cantidad);
    const movs = DB.movimientosInv.filter(m => m.producto === p.codigo);
    const saldo = (movs.length ? movs[0].saldo : p.existencia + it.cantidad) - it.cantidad;
    movimientoInv(p.codigo, "Venta", -it.cantidad, ref, r2(saldo));
  });

  // Movimientos de caja por método físico / bancario
  const hasEfectivoBs = pagos.some(p => p.metodo === "Efectivo Bs.");
  const hasEfectivoUsd = pagos.some(p => p.metodo === "Efectivo USD (físico)");
  pagos.forEach(p => {
    if (p.metodo === "Efectivo Bs.") movimientoCaja("Venta en Efectivo Bs.", ref, p.monto, 0, true);
    else if (p.metodo === "Efectivo USD (físico)") movimientoCaja("Venta en Efectivo USD", ref, 0, p.monto, true);
    else if (p.metodo !== "Crédito (CxC)") movimientoCaja("Venta en " + p.metodo, ref, p.monto, 0, true);
  });
  const _h = hasEfectivoBs || hasEfectivoUsd; // reservado

  auditar("Venta", `Factura ${nro} — ${fmt(totalBs)} Bs. — ${cliente} [${pagos.map(p => p.metodo).join(", ")}]`);

  saveDB();
  renderInventario();
  renderMovimientosCaja();
  if (typeof renderCxC === "function") renderCxC();

  const resumen = pagos.map(p => `• ${p.metodo}: ${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)} ${p.moneda}`).join("\n");
  const vuelto = num(document.getElementById("pago-vuelto").textContent);
  alert(`VENTA REGISTRADA\nFactura ${ref}\nTotal: Bs. ${fmt(totalBs)}\n\n${resumen}${vuelto > 0 ? `\n\nVuelto: Bs. ${fmt(vuelto)}` : ""}`);

  DB.carrito = [];
  renderCarrito();
  limpiarClientePOS();
  closeWindow("pago-window");
  abrirUltimaFactura();
}

// ===== Última factura / reimpresión de tickets =====
function ventasDelDia() {
  return DB.ventas.filter(v => v.fecha === hoy());
}

function abrirUltimaFactura() {
  openModuleWindow("ultima-factura");
  renderUltimasFacturas();
  if (DB.ventas.length) {
    const ultima = DB.ventas[DB.ventas.length - 1];
    selectUltimaFactura(ultima.nro, document.querySelector(`#uf-body tr[data-nro="${ultima.nro}"]`));
  }
}

function renderUltimasFacturas() {
  const body = document.getElementById("uf-body");
  if (!body) return;
  const q = (document.getElementById("uf-search").value || "").trim().toLowerCase();
  const rows = ventasDelDia().filter(v => !q || v.nro.includes(q) || (v.cliente || "").toLowerCase().includes(q));
  const estOf = v => (typeof devEstadoVenta === "function") ? devEstadoVenta(v) : "disponible";
  const badge = est => est === "devuelta" ? '<span class="dev-badge devuelta">DEVUELTA</span>'
    : est === "parcial" ? '<span class="dev-badge parcial">PARCIAL</span>' : "";
  body.innerHTML = rows.map(v =>
    `<tr data-nro="${v.nro}" onclick="selectUltimaFactura('${v.nro}', this)">
      <td>${v.nro} ${badge(estOf(v))}</td><td>${v.hora}</td><td>${v.cliente}</td><td style="text-align:right">${fmt(v.total)}</td>
    </tr>`).join("") ||
    `<tr><td colspan="4" style="text-align:center;color:#888">No hay facturas del día</td></tr>`;
}

function selectUltimaFactura(nro, row) {
  document.querySelectorAll("#uf-body tr").forEach(tr => tr.classList.remove("selected"));
  if (row) row.classList.add("selected");
  const v = DB.ventas.find(x => x.nro === nro);
  if (!v) return;
  document.getElementById("uf-detail-body").innerHTML = (v.lineas || []).map(l =>
    `<tr><td>${l.codigo}</td><td>${l.descripcion}</td><td style="text-align:right">${fmt(l.cantidad)}</td><td style="text-align:right">${fmt(l.precio)}</td><td style="text-align:right">${fmt(l.total)}</td></tr>`
  ).join("") || `<tr><td colspan="5" style="text-align:center;color:#888">Sin líneas</td></tr>`;
  const pagos = (v.pagos || []).map(p => `${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)} ${p.moneda}`).join(" · ") || "—";
  document.getElementById("uf-info").innerHTML =
    `<b>${DB.parametros.serie} ${v.nro}</b><br>` +
    `Fecha: ${v.fecha} ${v.hora}<br>Cliente: ${v.cliente}<br>Pagos: ${pagos}`;
  document.getElementById("uf-totals").innerHTML =
    `<div>Sub-Total: <b>${fmt(v.subtotal)}</b></div>` +
    `<div>Descuento: <b>${fmt(v.descuento)}</b></div>` +
    `<div>I.V.A. (${getIva()}%): <b>${fmt(v.iva)}</b></div>` +
    `<div class="cotiz-total-row">TOTAL: <b>${fmt(v.total)}</b></div>`;
  window._ufSeleccionada = v;
}

function imprimirUltimaFactura() {
  const v = window._ufSeleccionada || (DB.ventas.length ? DB.ventas[DB.ventas.length - 1] : null);
  if (!v) { alert("No hay factura seleccionada"); return; }
  imprimirTicket(v);
}

function imprimirTicket(v) {
  const tasa = v.tasa || getTasa();
  const lineas = (v.lineas || []).map(l =>
    `<tr><td>${l.codigo}</td><td>${l.descripcion}</td><td>${fmt(l.cantidad)}</td><td>${fmt(l.precio)}</td><td>${fmt(l.total)}</td></tr>`
  ).join("");
  const pagos = (v.pagos || []).map(p =>
    `<tr><td>${p.metodo}</td><td style="text-align:right">${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)} ${p.moneda}</td></tr>`
  ).join("");
  const w = window.open("", "_blank", "width=320,height=600");
  if (!w) { alert("Permita ventanas emergentes para imprimir."); return; }
  w.document.write(`<html><head><title>Ticket ${v.nro}</title>
    <style>
      body{font-family:'Courier New',monospace;font-size:12px;margin:8px;width:288px}
      .c{text-align:center}
      table{width:100%;border-collapse:collapse}
      td{padding:2px 4px}
      .b{border-top:1px dashed #000;border-bottom:1px dashed #000;font-weight:bold}
      .t{font-size:16px;font-weight:bold;text-align:right;padding:4px}
    </style></head><body>
    <div class="c"><b>${DB.parametros.nombreEmpresa || "Mi Empresa"}</b><br>RIF: ${DB.parametros.rif || ""}<br><b>${DB.parametros.serie} ${v.nro}</b><br>${v.fecha} ${v.hora}</div>
    <br>
    <div>Cliente: ${v.cliente}</div>
    <table>
      <thead><tr class="b"><td>Cód</td><td>Descripción</td><td>Cant</td><td>Precio</td><td>Total</td></tr></thead>
      <tbody>${lineas}</tbody>
    </table>
    <table>
      <tr><td>Sub-Total</td><td style="text-align:right">${fmt(v.subtotal)}</td></tr>
      <tr><td>Descuento</td><td style="text-align:right">${fmt(v.descuento)}</td></tr>
      <tr><td>I.V.A. ${getIva()}%</td><td style="text-align:right">${fmt(v.iva)}</td></tr>
    </table>
    <div class="t">TOTAL: ${fmt(v.total)} Bs.</div>
    <div class="t">${fmt((v.total || 0) / tasa)} $</div>
    <table>${pagos}</table>
    <div class="c" style="margin-top:8px">¡Gracias por su compra!</div>
    <script>window.print();<\/script></body></html>`);
  w.document.close();
}

function confirmarCobroDeuda() {
  const cli = cobroDeudaCliente;
  if (!cli) return;

  const pagos = pagoTemp.map(p => ({
    metodo: p.label, moneda: p.moneda, monto: p.monto, equivBs: p.equiv
  }));

  const r = typeof registrarAbonoCliente === "function"
    ? registrarAbonoCliente(cli, pagos, "Cobro de deuda")
    : null;
  if (!r) return;
  if (r.error) { alert(r.error); pagoTemp = []; cobroDeudaCliente = null; closeWindow("pago-window"); return; }

  saveDB();
  renderMovimientosCaja();
  mostrarSaldoCliente(cli);
  if (typeof renderCxC === "function") renderCxC();

  const resumen = pagos.map(p => `• ${p.metodo}: ${p.moneda === "USD" ? "$ " : ""}${fmt(p.monto)} ${p.moneda}`).join("\n");
  alert(`COBRO DE DEUDA REGISTRADO\nCliente: ${cli.nombre}\nDeuda: Bs. ${fmt(r.totalDeuda)}\nAbonado: Bs. ${fmt(r.montoCobrado)}\nSaldo restante: Bs. ${fmt(r.saldoRestante)}\n\n${resumen}${r.vuelto > 0 ? `\n\nVuelto: Bs. ${fmt(r.vuelto)}` : ""}`);

  pagoTemp = [];
  cobroDeudaCliente = null;
  closeWindow("pago-window");
  focusProdCodigo();
}

function limpiarClientePOS() {
  ocultarClientePos();
  document.getElementById("cliente-codigo").value = "";
  document.getElementById("cliente-nombre").value = "";
  document.getElementById("cliente-direccion").value = "";
  document.getElementById("cliente-rif").value = "";
  const tipo = document.getElementById("cliente-doc-tipo");
  if (tipo) tipo.value = "V-";
  document.getElementById("cliente-telefono").value = "";
  document.getElementById("observaciones").value = "";
  const cred = document.getElementById("cliente-credito");
  if (cred) cred.checked = false;
  toggleCredito();
  actualizarClienteNuevoRow(false);
  mostrarSaldoCliente();
}

// ============== CLIENTE Y BÚSQUEDA ==============
function docIdentidadCompleto() {
  const tipo = document.getElementById("cliente-doc-tipo").value || "V-";
  const num = document.getElementById("cliente-rif").value.trim();
  return num ? (tipo + num) : "";
}

// Rellena los campos del cliente en el POS a partir de un cliente de DB
function aplicarClientePOS(cli) {
  if (!cli) { actualizarClienteNuevoRow(true); mostrarSaldoCliente(null); return; }
  actualizarClienteNuevoRow(false);
  document.getElementById("cliente-codigo").value = cli.codigo;
  document.getElementById("cliente-nombre").value = cli.nombre;
  document.getElementById("cliente-direccion").value = cli.direccion || "";
  document.getElementById("cliente-telefono").value = cli.telefono || "";
  const doc = cli.rif || "";
  const m = String(doc).match(/^([VJEG])-(.*)$/i);
  const tipo = document.getElementById("cliente-doc-tipo");
  if (tipo && m) tipo.value = m[1].toUpperCase() + "-";
  document.getElementById("cliente-rif").value = m ? m[2] : doc;
  const cred = document.getElementById("cliente-credito");
  if (cred) cred.checked = cli.tipo === "Crédito" || cli.tipo === "Mixto";
  toggleCredito();
  mostrarSaldoCliente(cli);
}

function buscarClientePorDocumento() {
  const doc = docIdentidadCompleto();
  if (!doc) { actualizarClienteNuevoRow(false); mostrarSaldoCliente(null); return; }
  const norm = s => (s || "").replace(/\s+/g, "").toUpperCase();
  const cli = DB.clientes.find(c => norm(c.rif) === norm(doc));
  if (cli) {
    aplicarClientePOS(cli);
  } else {
    actualizarClienteNuevoRow(true);
    document.getElementById("cliente-codigo").value = "";
    document.getElementById("cliente-nombre").value = "";
    document.getElementById("cliente-direccion").value = "";
    document.getElementById("cliente-telefono").value = "";
    mostrarSaldoCliente(null);
  }
  mostrarSaldoCliente(cli);
}

// Búsqueda de clientes por nombre (palabras clave dentro del nombre/apellidos)
let posClienteMatches = [];
function buscarClientePos() {
  const q = (document.getElementById("cliente-nombre").value || "").trim();
  const box = document.getElementById("cliente-pos-results");
  if (!q) { ocultarClientePos(); return; }
  const palabras = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = DB.clientes.filter(c => {
    const nombre = String(c.nombre || "").toLowerCase();
    const otros = (String(c.codigo || "") + " " + String(c.rif || "")).toLowerCase();
    if (palabras.every(p => nombre.includes(p))) return true;
    if (palabras.every(p => otros.includes(p))) return true;
    return false;
  }).slice(0, 10);
  posClienteMatches = matches;
  if (!matches.length) { ocultarClientePos(); return; }
  box.innerHTML = matches.map((c, i) =>
    `<button type="button" onmousedown="event.preventDefault()" onclick="seleccionarClientePos(${i})">${c.codigo} — ${c.nombre}${c.rif ? " (" + c.rif + ")" : ""}</button>`
  ).join("");
  box.classList.add("show");
}

function ocultarClientePos() {
  const box = document.getElementById("cliente-pos-results");
  if (box) { box.classList.remove("show"); box.innerHTML = ""; }
  posClienteMatches = [];
}

function onClientePosKey(e) {
  if (e.key === "Enter") { e.preventDefault(); if (posClienteMatches.length) seleccionarClientePos(0); }
  else if (e.key === "Escape") ocultarClientePos();
}

function seleccionarClientePos(i) {
  const cli = posClienteMatches[i];
  if (!cli) return;
  aplicarClientePOS(cli);
  ocultarClientePos();
}

function actualizarClienteNuevoRow(show) {
  const row = document.getElementById("cliente-nuevo-row");
  if (!row) return;
  row.style.display = show ? "" : "none";
  const box = document.getElementById("cliente-nuevo");
  if (box) box.checked = false;
}

function clienteNuevoMarcado() {
  const row = document.getElementById("cliente-nuevo-row");
  if (!row || row.style.display === "none") return false;
  const box = document.getElementById("cliente-nuevo");
  return !!(box && box.checked);
}

// Registra automáticamente en el módulo de clientes el cliente creado desde el POS
function registrarClienteNuevoDesdePOS() {
  if (!clienteNuevoMarcado()) return null;
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const doc = docIdentidadCompleto();
  if (!nombre) { alert("Debe ingresar el nombre del cliente para registrarlo."); return null; }
  const cred = document.getElementById("cliente-credito");
  const cli = {
    codigo: genNro(DB.clientes, "codigo", "", 6),
    rif: doc,
    tipoPersona: /^[JG]-/.test(doc) ? "juridica" : "natural",
    representante: "",
    nombre,
    direccion: document.getElementById("cliente-direccion").value.trim(),
    telefono: document.getElementById("cliente-telefono").value.trim(),
    email: "", celular: "", contacto: "",
    tipo: (cred && cred.checked) ? "Crédito" : "Contado",
    limite: 0, dias: 0,
    vendedor: "--- NINGUNO ---",
    observaciones: "",
    saldo: 0
  };
  DB.clientes.push(cli);
  auditar("Cliente creado", `${cli.codigo} — ${cli.nombre} (${cli.rif})`);
  saveDB();
  if (typeof renderClientes === "function") renderClientes();
  return cli;
}

function saldoClienteActual() {
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const doc = docIdentidadCompleto();
  const norm = s => (s || "").replace(/\s+/g, "").toUpperCase();
  return DB.clientes.find(c => (c.nombre === nombre) || (doc && norm(c.rif) === norm(doc)));
}

function mostrarSaldoCliente(cli) {
  const el = document.getElementById("cliente-saldo");
  const btn = document.getElementById("btn-cobrar-deuda");
  if (!el) return;
  const c = cli || saldoClienteActual();
  if (!c) {
    el.textContent = "0,00"; el.className = "saldo-badge saldo-cero";
    if (btn) btn.style.display = "none";
    return;
  }
  const saldo = num(c.saldo) || 0;
  const signo = saldo > 0 ? "saldo-deudor" : (saldo < 0 ? "saldo-favor" : "saldo-cero");
  el.textContent = (saldo > 0 ? "+ " : "") + fmt(Math.abs(saldo)) + (saldo > 0 ? " Deudor" : saldo < 0 ? " A Favor" : " Cero");
  el.className = "saldo-badge " + signo;
  if (btn) btn.style.display = saldo > 0 ? "" : "none";
}

function toggleCredito() {
  const box = document.getElementById("cliente-credito");
  const esCredito = !!(box && box.checked);
  const btn = document.getElementById("pago-credito-btn");
  if (btn) {
    btn.disabled = !esCredito;
    btn.title = esCredito ? "Vender a crédito" : "Marque la casilla Crédito para vender a crédito";
  }
  const badge = document.getElementById("cliente-saldo");
  if (badge) badge.style.display = esCredito ? "" : "";
}

function openClientSearch() {
  openModule("clientes");
}

function openProductSearch(targetId) {
  window._buscarTarget = targetId || null;
  openModuleWindow("buscar");
}

let buscarRows = [];
let buscarIndex = -1;

function renderProductSearch(q) {
  const tbody = document.getElementById("buscar-body");
  if (!tbody) return;
  q = (q || "").trim();
  const filtro = q.toLowerCase();
  const palabras = filtro.split(/\s+/).filter(Boolean);
  const rows = DB.productos.filter(p => {
    if (!q) return true;
    const s = [
      p.codigo || "", p.barra || "", p.descripcion || "",
      p.categoria || "", p.marca || ""
    ].map(x => x.toLowerCase());
    if (s.some(x => x === filtro)) return true;
    if (s.some(x => x.includes(filtro))) return true;
    return palabras.length > 1 && palabras.every(pal => s.some(x => x.includes(pal)));
  });
  buscarRows = rows;
  buscarIndex = rows.length ? 0 : -1;
  tbody.innerHTML = rows.map((p, i) =>
    `<tr class="${i === buscarIndex ? "buscar-active" : ""}" data-i="${i}">
      <td>${p.codigo}</td>
      <td>${p.descripcion}${typeof esServicio === "function" && esServicio(p) ? ' <span style="color:#0284c7">[SERVICIO]</span>' : ""}</td>
      <td>${p.categoria || ""}</td>
      <td style="text-align:right">${typeof stockVirtualServicio === "function" && esServicio(p) ? fmt(stockVirtualServicio(p)) : fmt(p.existencia)}</td>
      <td style="text-align:right">${fmt(p.precio)} Bs.<br><span class="usd-sub">${fmt((p.precio || 0) / getTasa())} $</span></td>
      <td style="text-align:center"><button class="btn-mini" title="Agregar al carrito" onclick="addSearchedProduct('${p.codigo}')">+</button></td>
    </tr>`).join("") ||
    `<tr><td colspan="6" style="text-align:center;color:#888">Sin resultados</td></tr>`;
  resaltarBuscarRow();
}

function resaltarBuscarRow() {
  const tbody = document.getElementById("buscar-body");
  if (!tbody) return;
  tbody.querySelectorAll("tr").forEach(tr => tr.classList.toggle("buscar-active", +tr.dataset.i === buscarIndex));
  const active = tbody.querySelector(`tr[data-i="${buscarIndex}"]`);
  if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
}

function moverBuscar(delta) {
  if (!buscarRows.length) return;
  buscarIndex = (buscarIndex + delta + buscarRows.length) % buscarRows.length;
  resaltarBuscarRow();
}

function seleccionarBuscar() {
  const p = buscarRows[buscarIndex];
  if (p) addSearchedProduct(p.codigo);
}

function actualizarPrecioUsd() {
  const inp = document.getElementById("prod-precio");
  const el = document.getElementById("prod-precio-usd");
  if (!inp || !el) return;
  const v = num(inp.value) / getTasa();
  el.textContent = fmt(v) + " $";
}

function addSearchedProduct(cod) {
  const p = DB.productos.find(x => x.codigo === cod);
  if (!p) return;
  const target = window._buscarTarget;
  if (target && document.getElementById(target)) {
    document.getElementById(target).value = p.codigo;
    const precioInput = document.getElementById(target.replace("-cod", "-precio").replace("-costo", "-costo"));
    if (target === "comp-n-cod") {
      const c = document.getElementById("comp-n-costo");
      if (c) c.value = (p.costoUSD || 0).toFixed(2).replace(".", ",");
    } else if (precioInput) {
      precioInput.value = (p.precio || 0).toFixed(2).replace(".", ",");
    }
    window._buscarTarget = null;
    closeWindow("buscar-window");
    document.getElementById(target).focus();
    return;
  }
  window._buscarTarget = null;
  abrirQtyAdd(p);
}

function exitApp() {
  if (typeof logout === "function") { logout(); return; }
  if (confirm("¿Desea salir del sistema?")) {
    document.querySelectorAll(".window").forEach(w => w.classList.add("hidden"));
  }
}

function openModule(name) {
  if (typeof openModuleWindow === "function") openModuleWindow(name);
}

function closeWindow(id) {
  document.getElementById(id).classList.add("hidden");
}

// ===== Navegación por teclado =====
function camposActivos() {
  const wins = document.querySelectorAll(".window");
  let cont = null;
  for (let i = wins.length - 1; i >= 0; i--) {
    const w = wins[i];
    if (!w.classList.contains("hidden")) { cont = w; break; }
  }
  cont = cont || document.getElementById("pos-window") || document.body;
  const sel = "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])";
  return Array.prototype.slice.call(cont.querySelectorAll(sel)).filter(el => el.offsetParent !== null || el === document.activeElement);
}

function navegarCampo(dir) {
  const campos = camposActivos();
  const ae = document.activeElement;
  let idx = campos.indexOf(ae);
  if (idx === -1) idx = dir > 0 ? -1 : campos.length;
  idx += dir;
  if (idx < 0) idx = campos.length - 1;
  if (idx >= campos.length) idx = 0;
  if (campos[idx]) campos[idx].focus();
}

function cerrarVentanaActiva() {
  const wins = Array.prototype.slice.call(document.querySelectorAll(".window"))
    .filter(w => !w.classList.contains("hidden") && w.id !== "pos-window");
  if (wins.length) {
    const top = wins[wins.length - 1];
    closeWindow(top.id);
    if (top.id === "buscar-window") window._buscarTarget = null;
    const cod = document.getElementById("prod-codigo");
    if (cod) cod.focus();
  }
}

// ===== Atajos de teclado F2-F12 + navegación =====
document.addEventListener("keydown", function(e) {
  if (!document.body.classList.contains("logged-in")) return;
  const k = e.key;
  const ae = document.activeElement;
  const tag = ae && (ae.tagName || "");
  const inInput = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

  // Delete actúa como retroceso (borra carácter anterior)
  if (k === "Delete" && tag === "INPUT" && ae.type !== "number" && !e.altKey && !e.ctrlKey && !e.shiftKey) {
    const s = ae.selectionStart, en = ae.selectionEnd;
    if (s !== null && s === en) {
      e.preventDefault();
      if (s > 0) {
        ae.value = ae.value.slice(0, s - 1) + ae.value.slice(s);
        ae.setSelectionRange(s - 1, s - 1);
        ae.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  // Modal de cantidad: flechas ajustan, Enter acepta, Esc cierra
  if (qtyVisible()) {
    if (k === "Escape") { e.preventDefault(); cerrarQty(); return; }
    if (ae && ae.id === "qty-input" && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      if (k === "ArrowUp") { e.preventDefault(); ajustarQty(1); return; }
      if (k === "ArrowDown") { e.preventDefault(); ajustarQty(-1); return; }
      if (k === "Enter") { e.preventDefault(); confirmarQty(); return; }
    }
  }

  // Esc cierra la ventana activa (modal, búsqueda, etc.)
  if (k === "Escape") { e.preventDefault(); cerrarVentanaActiva(); return; }

  // Navegación con flechas + Enter en el buscador de productos (F3)
  if (ae && ae.id === "buscar-input" && !e.altKey && !e.ctrlKey && !e.shiftKey) {
    if (k === "ArrowDown") { e.preventDefault(); moverBuscar(1); return; }
    if (k === "ArrowUp") { e.preventDefault(); moverBuscar(-1); return; }
    if (k === "PageDown") { e.preventDefault(); moverBuscar(10); return; }
    if (k === "PageUp") { e.preventDefault(); moverBuscar(-10); return; }
    if (k === "Home") { e.preventDefault(); buscarIndex = 0; resaltarBuscarRow(); return; }
    if (k === "End") { e.preventDefault(); buscarIndex = buscarRows.length - 1; resaltarBuscarRow(); return; }
    if (k === "Enter") { e.preventDefault(); seleccionarBuscar(); return; }
  }

  // Flechas Arriba/Abajo navegan entre campos
  if (!e.altKey && !e.ctrlKey && !e.shiftKey && (k === "ArrowUp" || k === "ArrowDown") && inInput) {
    e.preventDefault();
    navegarCampo(k === "ArrowDown" ? 1 : -1);
    return;
  }

  if (!e.altKey && !e.ctrlKey && !e.shiftKey) {
    const K = k.toUpperCase();
    const posOk = m => (typeof rolPuedeModulo !== "function" || rolPuedeModulo(m));
    if (K === "F2")  { if (posOk("pos")) { e.preventDefault(); newSale(); } }
    if (K === "F3")  { if (posOk("buscar")) { e.preventDefault(); openProductSearch(); } }
    if (K === "F4")  { if (posOk("buscar")) { e.preventDefault(); openClientSearch(); } }
    if (K === "F5")  { if (posOk("cotizaciones")) { e.preventDefault(); openModule("cotizaciones"); } }
    if (K === "F6")  { if (posOk("devoluciones")) { e.preventDefault(); nuevaDevolucion(); } }
    if (K === "F7")  { if (posOk("pos")) { e.preventDefault(); cancelSale(); } }
    if (K === "F8")  { if (posOk("pos")) { e.preventDefault(); applyDiscount(); } }
    if (K === "F9")  { if (posOk("pago")) { e.preventDefault(); pay("efectivo_bs"); } }
    if (K === "F10") { if (posOk("pago")) { e.preventDefault(); pay("tarjeta_punto"); } }
    if (K === "F11") { if (posOk("pago")) { e.preventDefault(); pay("mixto"); } }
    if (K === "F12") { if (posOk("pos")) { e.preventDefault(); exitApp(); } }
    if (posOk("pos") && k === "Enter" && document.activeElement.id && document.activeElement.id.startsWith("prod-")) {
      e.preventDefault(); addToCart();
    }
  }
});

// Autocompletar precio al escribir código
document.addEventListener("DOMContentLoaded", () => {
  const codInput = document.getElementById("prod-codigo");
  if (codInput) {
    codInput.addEventListener("blur", () => {
      const p = findProductoByCodigo(codInput.value.trim());
      if (p) {
        document.getElementById("prod-precio").value = p.precio.toFixed(2).replace(".", ",");
        document.getElementById("prod-cantidad").value = "1";
        actualizarPrecioUsd();
      }
    });
  }
  const pagoSel = document.getElementById("pago-metodo");
  if (pagoSel) pagoSel.addEventListener("change", actualizarEquivMonto);
  updateDateTime();
  setInterval(updateDateTime, 60000);
  toggleCredito();
  mostrarSaldoCliente();
});

function updateDateTime() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "p.m." : "a.m.";
  h = h % 12 || 12;
  const el = document.getElementById("pos-datetime");
  if (el) el.innerHTML = `${dd}/${mm}/${yyyy}&nbsp;&nbsp;${h}:${m} ${ampm}`;
}
