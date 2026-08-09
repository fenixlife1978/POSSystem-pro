// ============== DATA STORE (memoria + localStorage) ==============
const DB = {
  parametros: {
    nombreEmpresa: "Mi Empresa, C.A.",
    rif: "J-12345678-9",
    direccion: "Av. Principal #45",
    telefono: "0212-555-0000",
    tasaBCV: 36.50,
    iva: 16,
    serie: "FACT",
    caja: "CAJA 01",
    cajero: "ADMIN",
    turno: 1,
    monedaCxC: "USD",
    categorias: ["REPUESTOS", "LUBRICANTES", "BATERIAS", "FRENOS", "LLANTAS", "SERVICIOS", "GENERAL"],
    subcategorias: ["FILTROS", "ACEITES", "BATERIAS", "FRENOS", "LLANTAS", "BUJIAS", "CORREAS", "SENSORES", "GENERAL"],
    marcas: ["GENERICO", "FRAM", "WEGA", "MOBIL", "SHELL", "MAC", "NGK", "BREMBO", "FIRESTONE", "MICHELIN", "ACDELCO", "BOSCH", "NAKATA", "FERODO"],
    presentaciones: ["UNIDAD", "CAJA", "LITRO", "KILO", "PIEZA", "PAQUETE", "GALON"],
    unidades: ["UND", "KG", "LT", "GR", "ML", "CAJ"]
  },
  usuarios: [
    { usuario: "ADMIN", nombre: "Administrador", clave: "admin", rol: "Administrador", activo: true },
    { usuario: "CAJERO", nombre: "Cajero", clave: "cajero", rol: "Cajero", activo: true }
  ],
  caja: {
    estado: "cerrada",
    cajero: "ADMIN",
    apertura: null,
    cierre: null,
    fondoBs: 0,
    fondoUSD: 0
  },
  cajas: [
    { id: "CAJA01", nombre: "CAJA 01", cajero: "ADMIN", estado: "cerrada", apertura: null, cierre: null, fondoBs: 0, fondoUSD: 0, cortesZ: 0 },
    { id: "CAJA02", nombre: "CAJA 02", cajero: "CAJERO", estado: "cerrada", apertura: null, cierre: null, fondoBs: 0, fondoUSD: 0, cortesZ: 0 }
  ],
  clientes: [
    { codigo: "000001", nombre: "CONSUMIDOR FINAL",       rif: "V-00000000-0", direccion: "", telefono: "", email: "", tipo: "Contado", limite: 0, dias: 0, vendedor: "--- NINGUNO ---", saldo: 0, tipoPersona: "natural", representante: "" },
    { codigo: "000002", nombre: "AUTOMOTRIZ EL VALLE, C.A.", rif: "J-123456789-4", direccion: "Av. Principal #45", telefono: "0212-555-1010", email: "", tipo: "Crédito", limite: 5000, dias: 30, vendedor: "JUAN PEREZ", saldo: 86.31, tipoPersona: "juridica", representante: "CARLOS PEREZ" },
    { codigo: "000003", nombre: "TRANSPORTES LA VEGA, C.A.", rif: "J-223344556-8", direccion: "Calle 5 #12", telefono: "0212-555-2020", email: "", tipo: "Crédito", limite: 8000, dias: 45, vendedor: "MARIA GONZALEZ", saldo: 123.29, tipoPersona: "juridica", representante: "LUIS RAMIREZ" },
    { codigo: "000004", nombre: "TALLER LOS AMIGOS",       rif: "V-11223344-5", direccion: "Urb. Industrial", telefono: "0212-555-3030", email: "", tipo: "Contado", limite: 0, dias: 0, vendedor: "--- NINGUNO ---", saldo: 0, tipoPersona: "natural", representante: "" },
    { codigo: "000005", nombre: "INVERSIONES DEL SUR, C.A.", rif: "J-998877665-6", direccion: "Calle Sur #8", telefono: "0212-555-4040", email: "", tipo: "Crédito", limite: 10000, dias: 60, vendedor: "JUAN PEREZ", saldo: 51.78, tipoPersona: "juridica", representante: "ANA TORRES" },
    { codigo: "000006", nombre: "CARROCERIAS ABC, C.A.",   rif: "J-445566778-9", direccion: "Zona Industrial", telefono: "0212-555-5050", email: "", tipo: "Crédito", limite: 6000, dias: 30, vendedor: "MARIA GONZALEZ", saldo: 0, tipoPersona: "juridica", representante: "PEDRO SILVA" },
    { codigo: "000007", nombre: "LUBRICENTRO EXPRESS",     rif: "V-33445566-7", direccion: "Av. Bolívar", telefono: "0212-555-6060", email: "", tipo: "Contado", limite: 0, dias: 0, vendedor: "--- NINGUNO ---", saldo: 0, tipoPersona: "natural", representante: "" },
    { codigo: "000008", nombre: "REPUESTOS ORIENTE, C.A.", rif: "J-556677889-0", direccion: "Av. Oriente", telefono: "0212-555-7070", email: "", tipo: "Crédito", limite: 7500, dias: 30, vendedor: "PEDRO MARTINEZ", saldo: 0, tipoPersona: "juridica", representante: "MARIA ROJAS" }
  ],
  productos: [
    { codigo: "FIL001", descripcion: "FILTRO DE ACEITE FRAM PH8A",       categoria: "REPUESTOS", marca: "FRAM",      precio: 120.00,  existencia: 45,  minimo: 10, reservado: 0, costoUSD: 2.40,  margenPct: 25, precioUSD: 3.29 },
    { codigo: "FIL002", descripcion: "FILTRO DE AIRE WEGA WAI-960",       categoria: "REPUESTOS", marca: "WEGA",      precio: 85.00,   existencia: 18,  minimo: 5,  reservado: 0, costoUSD: 1.70,  margenPct: 25, precioUSD: 2.33 },
    { codigo: "ACE001", descripcion: "ACEITE 10W-40 MOBIL 1L",            categoria: "LUBRICANTES",marca: "MOBIL",     precio: 280.00,  existencia: 32,  minimo: 10, reservado: 2, costoUSD: 5.60,  margenPct: 25, precioUSD: 7.67 },
    { codigo: "ACE002", descripcion: "ACEITE 5W-30 SHELL HELIX 1L",       categoria: "LUBRICANTES",marca: "SHELL",     precio: 290.00,  existencia: 15,  minimo: 5,  reservado: 1, costoUSD: 5.80,  margenPct: 25, precioUSD: 7.95 },
    { codigo: "BAT001", descripcion: "BATERIA 12V 42AH MAC GOLD",         categoria: "BATERIAS",   marca: "MAC",       precio: 1450.00, existencia: 8,   minimo: 3,  reservado: 1, costoUSD: 29.00, margenPct: 25, precioUSD: 39.73 },
    { codigo: "BAT002", descripcion: "BATERIA 12V 60AH MAC GOLD",         categoria: "BATERIAS",   marca: "MAC",       precio: 1850.00, existencia: 4,   minimo: 3,  reservado: 0, costoUSD: 37.00, margenPct: 25, precioUSD: 50.68 },
    { codigo: "BUJ001", descripcion: "BUJIA NGK BPR6ES",                  categoria: "REPUESTOS",  marca: "NGK",       precio: 35.00,   existencia: 120, minimo: 20, reservado: 5, costoUSD: 0.70,  margenPct: 25, precioUSD: 0.96 },
    { codigo: "BPF001", descripcion: "PASTILLAS DE FRENO DEL. BREMBO",    categoria: "FRENOS",     marca: "BREMBO",    precio: 680.00,  existencia: 22,  minimo: 5,  reservado: 2, costoUSD: 13.60, margenPct: 25, precioUSD: 18.63 },
    { codigo: "DIS001", descripcion: "DISCO DE FRENO DEL. BREMBO",        categoria: "FRENOS",     marca: "BREMBO",    precio: 950.00,  existencia: 0,   minimo: 4,  reservado: 0, costoUSD: 19.00, margenPct: 25, precioUSD: 26.03 },
    { codigo: "LLA001", descripcion: "LLANTA 175/70 R13",                 categoria: "LLANTAS",    marca: "FIRESTONE", precio: 1850.00, existencia: 12,  minimo: 4,  reservado: 0, costoUSD: 37.00, margenPct: 25, precioUSD: 50.68 },
    { codigo: "LLA002", descripcion: "LLANTA 185/65 R14",                 categoria: "LLANTAS",    marca: "MICHELIN",  precio: 2100.00, existencia: 10,  minimo: 4,  reservado: 0, costoUSD: 42.00, margenPct: 25, precioUSD: 57.53 },
    { codigo: "SER001", descripcion: "SERVICIO DE CAMBIO DE ACEITE",      categoria: "SERVICIOS",  marca: "PROPIO",    precio: 350.00,  existencia: 999,minimo: 0,  reservado: 0, costoUSD: 7.00,  margenPct: 25, precioUSD: 9.59 },
    { codigo: "SER002", descripcion: "SERVICIO DE ALINEACION",            categoria: "SERVICIOS",  marca: "PROPIO",    precio: 250.00,  existencia: 999,minimo: 0,  reservado: 0, costoUSD: 5.00,  margenPct: 25, precioUSD: 6.85 },
    { codigo: "SER003", descripcion: "SERVICIO DE BALANCEO",              categoria: "SERVICIOS",  marca: "PROPIO",    precio: 200.00,  existencia: 999,minimo: 0,  reservado: 0, costoUSD: 4.00,  margenPct: 25, precioUSD: 5.48 }
  ],
  cotizaciones: [
    { nro: "0000001", fecha: "23/05/2025", cliente: "CONSUMIDOR FINAL",       total: 1250.00, estado: "Pendiente", observaciones: "", lineas: [] },
    { nro: "0000002", fecha: "22/05/2025", cliente: "TALLER LOS AMIGOS",      total: 2680.00, estado: "Pendiente", observaciones: "", lineas: [] },
    { nro: "0000003", fecha: "21/05/2025", cliente: "AUTOMOTRIZ EL VALLE, C.A.", total: 5430.00, estado: "Aceptada", observaciones: "", lineas: [] },
    { nro: "0000004", fecha: "20/05/2025", cliente: "TRANSPORTES LA VEGA, C.A.", total: 3150.00, estado: "Pendiente", observaciones: "", lineas: [] },
    { nro: "0000005", fecha: "19/05/2025", cliente: "INVERSIONES DEL SUR, C.A.", total: 1780.00, estado: "Vencida", observaciones: "", lineas: [] }
  ],
  compras: [
    { nro: "0000001", fecha: "22/05/2025", proveedor: "DISTRIBUIDORA LUBRI, C.A.", total: 4880.00, estatus: "Pendiente", observaciones: "", lineas: [] },
    { nro: "0000002", fecha: "22/05/2025", proveedor: "REPUESTOS LA 24, C.A.",    total: 2320.00, estatus: "Recibida", observaciones: "", lineas: [] },
    { nro: "0000003", fecha: "21/05/2025", proveedor: "BATERIAS NACIONALES, C.A.", total: 3150.00, estatus: "Recibida", observaciones: "", lineas: [] },
    { nro: "0000004", fecha: "20/05/2025", proveedor: "IMPORTADORA ORIENTE, C.A.", total: 5680.00, estatus: "Recibida", observaciones: "", lineas: [] }
  ],
  devoluciones: [],
  proveedores: ["DISTRIBUIDORA LUBRI, C.A.", "REPUESTOS LA 24, C.A.", "BATERIAS NACIONALES, C.A.", "IMPORTADORA ORIENTE, C.A."],
  categoriasReporte: ["Ventas", "Compras", "Inventario", "Clientes", "Proveedores", "Caja y Bancos", "Productos", "Servicios"],
  reportes: ["Ventas del Día", "Ventas por Fecha", "Ventas por Cliente", "Ventas por Vendedor", "Ventas por Forma de Pago", "Ventas por Producto", "Ventas por Categoría", "Resumen de Ventas"],
  movimientosCaja: [
    { fecha: "23/05/2025", hora: "10:15 a.m.", tipo: "Venta en Efectivo Bs.",  ref: "FACT 0000001", ing: 450.00,  egr: 0.00,  ingUsd: 0, egrUsd: 0 },
    { fecha: "23/05/2025", hora: "10:05 a.m.", tipo: "Venta en Pago Móvil",    ref: "FACT 0000099", ing: 280.00,  egr: 0.00,  ingUsd: 0, egrUsd: 0 },
    { fecha: "23/05/2025", hora: "09:50 a.m.", tipo: "Retiro de Efectivo",     ref: "RET 0000001",  ing: 0.00,    egr: 200.00, ingUsd: 0, egrUsd: 0 },
    { fecha: "23/05/2025", hora: "09:30 a.m.", tipo: "Venta en Tarjeta/Punto", ref: "FACT 0000098", ing: 680.00,  egr: 0.00,  ingUsd: 0, egrUsd: 0 },
    { fecha: "23/05/2025", hora: "08:10 a.m.", tipo: "Apertura de Caja",       ref: "APERTURA",     ing: 1000.00, egr: 0.00,  ingUsd: 50, egrUsd: 0 }
  ],
  movimientosInv: [
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "FIL001", tipo: "Stock Inicial", cant: 45, ref: "INICIAL", saldo: 45 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "FIL002", tipo: "Stock Inicial", cant: 18, ref: "INICIAL", saldo: 18 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "ACE001", tipo: "Stock Inicial", cant: 32, ref: "INICIAL", saldo: 32 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "ACE002", tipo: "Stock Inicial", cant: 15, ref: "INICIAL", saldo: 15 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "BAT001", tipo: "Stock Inicial", cant: 8,  ref: "INICIAL", saldo: 8 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "BAT002", tipo: "Stock Inicial", cant: 4,  ref: "INICIAL", saldo: 4 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "BUJ001", tipo: "Stock Inicial", cant: 120, ref: "INICIAL", saldo: 120 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "BPF001", tipo: "Stock Inicial", cant: 22, ref: "INICIAL", saldo: 22 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "DIS001", tipo: "Stock Inicial", cant: 0,  ref: "INICIAL", saldo: 0 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "LLA001", tipo: "Stock Inicial", cant: 12, ref: "INICIAL", saldo: 12 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "LLA002", tipo: "Stock Inicial", cant: 10, ref: "INICIAL", saldo: 10 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "SER001", tipo: "Stock Inicial", cant: 999, ref: "INICIAL", saldo: 999 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "SER002", tipo: "Stock Inicial", cant: 999, ref: "INICIAL", saldo: 999 },
    { fecha: "01/01/2024", hora: "08:00 a.m.", producto: "SER003", tipo: "Stock Inicial", cant: 999, ref: "INICIAL", saldo: 999 }
  ],
  auditoria: [],
  respaldos: [],
  carrito: [],
  ventas: [],
  abonos: [
    { nro: "0000001", fecha: "20/07/2026", hora: "10:30 a.m.", cliente: "AUTOMOTRIZ EL VALLE, C.A.", rif: "J-123456789-4", codigo: "000002", tasa: 36.50, totalDeuda: 65.75, montoCobrado: 27.40, saldoRestante: 38.36, forma: "Efectivo Bs.", pagos: [{ metodo: "Efectivo Bs.", moneda: "Bs", monto: 1000.00, equivBs: 1000.00 }] },
    { nro: "0000002", fecha: "18/07/2026", hora: "04:05 p.m.", cliente: "INVERSIONES DEL SUR, C.A.", rif: "J-998877665-6", codigo: "000005", tasa: 36.50, totalDeuda: 133.97, montoCobrado: 54.79, saldoRestante: 79.18, forma: "Transferencia", pagos: [{ metodo: "Transferencia", moneda: "Bs", monto: 2000.00, equivBs: 2000.00 }] },
    { nro: "0000003", fecha: "25/07/2026", hora: "11:15 a.m.", cliente: "INVERSIONES DEL SUR, C.A.", rif: "J-998877665-6", codigo: "000005", tasa: 36.50, totalDeuda: 79.18, montoCobrado: 27.40, saldoRestante: 51.78, forma: "Pagomóvil", pagos: [{ metodo: "Pagomóvil", moneda: "Bs", monto: 1000.00, equivBs: 1000.00 }] },
    { nro: "0000004", fecha: "12/07/2026", hora: "01:00 p.m.", cliente: "INVERSIONES DEL SUR, C.A.", rif: "J-998877665-6", codigo: "000005", tasa: 36.50, totalDeuda: 26.30, montoCobrado: 26.30, saldoRestante: 0, forma: "Efectivo Bs.", pagos: [{ metodo: "Efectivo Bs.", moneda: "Bs", monto: 960.00, equivBs: 960.00 }] }
  ],
  cuentasCobrar: [
    { id: "CXC000001", nro: "FACT 0000101", fecha: "12/07/2026", hora: "10:15 a.m.", vencimiento: "11/08/2026", codigo: "000002", nombre: "AUTOMOTRIZ EL VALLE, C.A.", rif: "J-123456789-4", tasa: 36.50, total: 65.75, pagado: 27.40, saldo: 38.36, estado: "Parcial",
      lineas: [
        { codigo: "ACE001", descripcion: "ACEITE 10W-40 MOBIL 1L", cantidad: 5, precio: 280.00, total: 1400.00 },
        { codigo: "FIL001", descripcion: "FILTRO DE ACEITE FRAM PH8A", cantidad: 6, precio: 120.00, total: 720.00 },
        { codigo: "BUJ001", descripcion: "BUJIA NGK BPR6ES", cantidad: 8, precio: 35.00, total: 280.00 }
      ] },
    { id: "CXC000002", nro: "FACT 0000105", fecha: "20/07/2026", hora: "11:40 a.m.", vencimiento: "19/08/2026", codigo: "000002", nombre: "AUTOMOTRIZ EL VALLE, C.A.", rif: "J-123456789-4", tasa: 36.50, total: 47.95, pagado: 0, saldo: 47.95, estado: "Pendiente",
      lineas: [
        { codigo: "ACE002", descripcion: "ACEITE 5W-30 SHELL HELIX 1L", cantidad: 4, precio: 290.00, total: 1160.00 },
        { codigo: "FIL002", descripcion: "FILTRO DE AIRE WEGA WAI-960", cantidad: 4, precio: 85.00, total: 340.00 },
        { codigo: "SER002", descripcion: "SERVICIO DE ALINEACION", cantidad: 1, precio: 250.00, total: 250.00 }
      ] },
    { id: "CXC000003", nro: "FACT 0000102", fecha: "15/06/2026", hora: "09:05 a.m.", vencimiento: "30/07/2026", codigo: "000003", nombre: "TRANSPORTES LA VEGA, C.A.", rif: "J-223344556-8", tasa: 36.50, total: 90.41, pagado: 0, saldo: 90.41, estado: "Pendiente",
      lineas: [
        { codigo: "LLA001", descripcion: "LLANTA 175/70 R13", cantidad: 1, precio: 1850.00, total: 1850.00 },
        { codigo: "BAT001", descripcion: "BATERIA 12V 42AH MAC GOLD", cantidad: 1, precio: 1450.00, total: 1450.00 }
      ] },
    { id: "CXC000004", nro: "FACT 0000110", fecha: "01/06/2026", hora: "03:20 p.m.", vencimiento: "01/07/2026", codigo: "000003", nombre: "TRANSPORTES LA VEGA, C.A.", rif: "J-223344556-8", tasa: 36.50, total: 32.88, pagado: 0, saldo: 32.88, estado: "Pendiente",
      lineas: [
        { codigo: "DIS001", descripcion: "DISCO DE FRENO DEL. BREMBO", cantidad: 1, precio: 950.00, total: 950.00 },
        { codigo: "SER002", descripcion: "SERVICIO DE ALINEACION", cantidad: 1, precio: 250.00, total: 250.00 }
      ] },
    { id: "CXC000005", nro: "FACT 0000108", fecha: "05/07/2026", hora: "02:10 p.m.", vencimiento: "03/09/2026", codigo: "000005", nombre: "INVERSIONES DEL SUR, C.A.", rif: "J-998877665-6", tasa: 36.50, total: 133.97, pagado: 82.19, saldo: 51.78, estado: "Parcial",
      lineas: [
        { codigo: "LLA002", descripcion: "LLANTA 185/65 R14", cantidad: 1, precio: 2100.00, total: 2100.00 },
        { codigo: "BAT002", descripcion: "BATERIA 12V 60AH MAC GOLD", cantidad: 1, precio: 1850.00, total: 1850.00 },
        { codigo: "ACE001", descripcion: "ACEITE 10W-40 MOBIL 1L", cantidad: 2, precio: 280.00, total: 560.00 },
        { codigo: "FIL001", descripcion: "FILTRO DE ACEITE FRAM PH8A", cantidad: 2, precio: 120.00, total: 240.00 },
        { codigo: "BUJ001", descripcion: "BUJIA NGK BPR6ES", cantidad: 4, precio: 35.00, total: 140.00 }
      ] },
    { id: "CXC000006", nro: "FACT 0000115", fecha: "10/07/2026", hora: "12:30 p.m.", vencimiento: "08/08/2026", codigo: "000005", nombre: "INVERSIONES DEL SUR, C.A.", rif: "J-998877665-6", tasa: 36.50, total: 26.30, pagado: 26.30, saldo: 0, estado: "Pagada",
      lineas: [
        { codigo: "BPF001", descripcion: "PASTILLAS DE FRENO DEL. BREMBO", cantidad: 1, precio: 680.00, total: 680.00 },
        { codigo: "BUJ001", descripcion: "BUJIA NGK BPR6ES", cantidad: 8, precio: 35.00, total: 280.00 }
      ] }
  ],
  cuentasPagar: [
    { nro: "0000001", fecha: "20/07/2026", vencimiento: "19/08/2026", proveedor: "DISTRIBUIDORA LUBRI, C.A.", tasa: 36.50, total: 133.70, pagado: 0, saldo: 133.70, estado: "Pendiente",
      lineas: [
        { codigo: "ACE001", descripcion: "ACEITE 10W-40 MOBIL 1L", cantidad: 10, costo: 280.00, total: 2800.00 },
        { codigo: "ACE002", descripcion: "ACEITE 5W-30 SHELL HELIX 1L", cantidad: 6, costo: 290.00, total: 1740.00 },
        { codigo: "FIL002", descripcion: "FILTRO DE AIRE WEGA WAI-960", cantidad: 4, costo: 85.00, total: 340.00 }
      ] },
    { nro: "0000002", fecha: "20/07/2026", vencimiento: "19/08/2026", proveedor: "REPUESTOS LA 24, C.A.", tasa: 36.50, total: 63.56, pagado: 36.16, saldo: 27.40, estado: "Parcial",
      lineas: [
        { codigo: "FIL001", descripcion: "FILTRO DE ACEITE FRAM PH8A", cantidad: 8, costo: 120.00, total: 960.00 },
        { codigo: "FIL002", descripcion: "FILTRO DE AIRE WEGA WAI-960", cantidad: 16, costo: 85.00, total: 1360.00 }
      ] },
    { nro: "0000003", fecha: "15/07/2026", vencimiento: "14/08/2026", proveedor: "BATERIAS NACIONALES, C.A.", tasa: 36.50, total: 86.44, pagado: 86.44, saldo: 0, estado: "Pagada",
      lineas: [
        { codigo: "BAT001", descripcion: "BATERIA 12V 42AH MAC GOLD", cantidad: 2, costo: 1450.00, total: 2900.00 },
        { codigo: "FIL002", descripcion: "FILTRO DE AIRE WEGA WAI-960", cantidad: 3, costo: 85.00, total: 255.00 }
      ] },
    { nro: "0000004", fecha: "10/07/2026", vencimiento: "01/08/2026", proveedor: "IMPORTADORA ORIENTE, C.A.", tasa: 36.50, total: 155.62, pagado: 0, saldo: 155.62, estado: "Pendiente",
      lineas: [
        { codigo: "LLA001", descripcion: "LLANTA 175/70 R13", cantidad: 1, costo: 1850.00, total: 1850.00 },
        { codigo: "LLA002", descripcion: "LLANTA 185/65 R14", cantidad: 1, costo: 2100.00, total: 2100.00 },
        { codigo: "BPF001", descripcion: "PASTILLAS DE FRENO DEL. BREMBO", cantidad: 1, costo: 680.00, total: 680.00 },
        { codigo: "BUJ001", descripcion: "BUJIA NGK BPR6ES", cantidad: 30, costo: 35.00, total: 1050.00 }
      ] }
  ],
  pagosPagar: [
    { nro: "0000001", fecha: "22/07/2026", hora: "10:00 a.m.", proveedor: "REPUESTOS LA 24, C.A.", cuenta: "0000002", tasa: 36.50, monto: 36.16, forma: "Transferencia", referencia: "TRF-5588", observaciones: "" }
  ]
};

// ============== HELPERS ==============
function num(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === "") return 0;
  let s = String(v).trim().replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lc = s.lastIndexOf(",");
    const ld = s.lastIndexOf(".");
    if (lc > ld) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const r2 = n => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const getTasa = () => num(DB.parametros.tasaBCV) || 1;
const getIva = () => num(DB.parametros.iva) || 0;

// Conversiones Bs <-> USD usando la tasa del sistema (moneda principal = USD)
const usdDeBs = b => r2(num(b) / getTasa());
const bsDeUsd = u => r2(num(u) * getTasa());
function fmtUS(u) { return "$ " + fmtVE(num(u), 2); }
function fmtBsEq(u) { return "Bs. " + fmtVE(bsDeUsd(u), 2); }
function saldoDual(u) { return fmtUS(u) + "  (" + fmtBsEq(u) + ")"; }

// Formatea montos/precios como XXX.XXX,XX (punto = miles, coma = decimales), independiente del locale del navegador.
function fmtVE(n, dec) {
  const d = dec === undefined || dec === null ? 2 : Math.max(0, Number(dec) || 0);
  let v = Number(n) || 0;
  const neg = v < 0;
  const s = Math.abs(v).toFixed(d);
  const idx = s.indexOf(".");
  const int = idx >= 0 ? s.slice(0, idx) : s;
  const decPart = idx >= 0 ? s.slice(idx + 1) : "";
  const miles = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + miles + (d > 0 ? "," + decPart : "");
}

// Formatea la cédula V-/E- con puntos: 13313521 -> 13.313.521 (XX.XXX.XXX)
function formatearCedulaVe(numDoc) {
  const s = String(numDoc == null ? "" : numDoc).trim();
  const m = s.match(/^([0-9]+?)(?:-([0-9]+))?$/);
  if (!m) return s;
  const cuerpo = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return m[2] !== undefined ? cuerpo + "-" + m[2] : cuerpo;
}

// Formatea el documento completo en el POS: solo personas naturales (V-/E-) llevan puntos
function formatoDocVzla(doc) {
  const m = String(doc || "").match(/^([VEJG])\s*-?\s*([0-9]+)(?:\s*-?\s*([0-9]))?$/i);
  if (!m) return doc;
  const tipo = m[1].toUpperCase();
  if (tipo !== "V" && tipo !== "E") return doc;
  return tipo + "-" + formatearCedulaVe(m[2] + (m[3] !== undefined ? "-" + m[3] : ""));
}

function hoy() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function hora12() {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "p.m." : "a.m.";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
function ahoraFechaHora() { return `${hoy()} ${hora12()}`; }

function sumarDias(fechaStr, dias) {
  const p = String(fechaStr || hoy()).split("/");
  const d = new Date(Number(p[2] || 2026), Number(p[1] || 1) - 1, Number(p[0] || 1) + (num(dias) || 0));
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function genNro(arr, campo, prefijo, len) {
  let max = 0;
  arr.forEach(x => {
    const n = parseInt(x[campo], 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return prefijo + String(max + 1).padStart(len, "0");
}

function auditar(accion, detalle) {
  DB.auditoria.unshift({ fecha: hoy(), hora: hora12(), usuario: DB.parametros.cajero || "ADMIN", accion, detalle });
  if (DB.auditoria.length > 2000) DB.auditoria.length = 2000;
  saveDB();
}

function movimientoCaja(tipo, ref, montoBs, montoUSD, esIngreso) {
  const m = { fecha: hoy(), hora: hora12(), tipo, ref, ing: 0, egr: 0, ingUsd: 0, egrUsd: 0, caja: cajaActual().nombre };
  if (esIngreso) { m.ing = r2(montoBs); m.ingUsd = r2(montoUSD); }
  else { m.egr = r2(montoBs); m.egrUsd = r2(montoUSD); }
  DB.movimientosCaja.unshift(m);
}

function cajaActual() {
  if (!DB.cajas || !DB.cajas.length) return DB.caja || { estado: "cerrada", cajero: "ADMIN", apertura: null, cierre: null, fondoBs: 0, fondoUSD: 0 };
  const cajero = (DB.parametros && DB.parametros.cajero) || "ADMIN";
  const asignada = DB.cajas.find(c => (c.cajero || "") === cajero);
  if (asignada) return asignada;
  const def = DB.cajas.find(c => (c.nombre || "") === (DB.parametros && DB.parametros.caja));
  return def || DB.cajas[0];
}

function cajaDeUsuario(usuario) {
  if (!DB.cajas || !DB.cajas.length) return DB.caja || null;
  return DB.cajas.find(c => (c.cajero || "") === usuario) || null;
}

function sincronizarCajaActiva() {
  const c = cajaActual();
  if (c) {
    DB.parametros.caja = c.nombre;
    DB.caja = c;
  }
}

function movimientoInv(producto, tipo, cant, ref, saldo) {
  DB.movimientosInv.unshift({ fecha: hoy(), hora: hora12(), producto, tipo, cant, ref, saldo });
}

function exportarCSV(nombre, headers, rows, total) {
  const esc = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const filas = rows.map(r => r.map(esc).join(";"));
  if (total !== null && total !== undefined) filas.push(["TOTAL", ...headers.slice(1).map(() => "").slice(0, -1), fmt(total)].map(esc).join(";"));
  const csv = [headers.map(esc).join(";"), ...filas].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre + ".csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
}

const _escHtml = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function _colNumero(h) {
  return /(bs|usd|total|cant|precio|saldo|monto|costo|iva|ing|egr|deuda|pvp|margen|dif|esperado|conteo|existencia|minimo|unidades|ventas|abono|devol|%|cantidad)/i.test(h || "");
}

function _basePrintCSS() {
  return `
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:11px;margin:22px;color:#1a1a1a}
    .cabecera{border-bottom:3px solid #0B3D91;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start}
    .empresa{font-size:18px;font-weight:bold;color:#0B3D91;letter-spacing:.4px}
    .empresa-data{font-size:10.5px;color:#333;margin-top:3px}
    .cab-titulo{text-align:right;font-size:14px;font-weight:bold;color:#0B3D91}
    .titulo{font-size:15px;font-weight:bold;color:#0B3D91;text-align:center;margin:4px 0 2px}
    .subtitulo{font-size:11px;color:#555;text-align:center;margin-bottom:4px}
    .meta{font-size:10px;color:#555;text-align:right;margin-bottom:8px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #b9c3d4;padding:4px 6px}
    thead th{background:#0B3D91;color:#fff;font-weight:bold;text-align:left}
    td.num,th.num{text-align:right}
    tbody tr:nth-child(even){background:#f2f5fb}
    tfoot .fila-total td{background:#e9eef9;font-weight:bold;font-size:12px;border-top:2px solid #0B3D91}
    .fila-total td.num{text-align:right}
    .ficha{border:1px solid #b9c3d4;padding:8px;margin:6px 0;font-size:10.5px}
    .ficha table{border:none}
    .ficha td{border:none;padding:2px 4px}
    .ficha .etq{color:#0B3D91;font-weight:bold;width:110px}
    .totales{width:auto;margin-left:auto;margin-top:8px;border-collapse:collapse}
    .totales td{padding:3px 10px;border:1px solid #b9c3d4}
    .totales .lbl{background:#e9eef9;font-weight:bold}
    .totales .gr{background:#0B3D91;color:#fff;font-weight:bold}
    .obs{margin-top:10px;font-size:10.5px}
    .cond{margin-top:12px;font-size:9.5px;color:#444;border-top:1px solid #ccc;padding-top:6px}
    .firmas{display:flex;justify-content:space-between;margin-top:34px;font-size:10.5px;text-align:center}
    .pie{margin-top:16px;font-size:9px;color:#666;border-top:1px solid #ccc;padding-top:6px;text-align:center}
    @media print{body{margin:10mm}}`;
}

function _cabeceraPrintHtml() {
  const p = DB.parametros || {};
  const nombre = _escHtml((p.nombreEmpresa || "MI EMPRESA, C.A.").toUpperCase());
  const rif = p.rif ? "RIF: " + _escHtml(p.rif) : "";
  const dir = p.direccion ? _escHtml(p.direccion) : "";
  const tel = p.telefono ? "Tel.: " + _escHtml(p.telefono) : "";
  const linea = [rif, dir, tel].filter(Boolean).join("  •  ");
  return `<div class="cabecera"><div>
      <div class="empresa">${nombre}</div>
      ${linea ? `<div class="empresa-data">${linea}</div>` : ""}
    </div></div>`;
}

function _metaPrintHtml(titulo, subtitulo) {
  const p = DB.parametros || {};
  const f = `${hoy()}  ${hora12()}`;
  return `<div class="titulo">${_escHtml(titulo)}</div>` +
    (subtitulo ? `<div class="subtitulo">${_escHtml(subtitulo)}</div>` : "") +
    `<div class="meta">Fecha: ${f} &nbsp;|&nbsp; Usuario: ${_escHtml(p.cajero || "ADMIN")}</div>`;
}

function _piePrintHtml() {
  const p = DB.parametros || {};
  return `<div class="pie">Documento generado electrónicamente por el Sistema POS de ${_escHtml(p.nombreEmpresa || "MI EMPRESA")} — La moneda principal del sistema es el Dólar (USD); los montos en Bolívares (Bs.) se muestran como equivalencia al cambio del sistema.</div>`;
}

function _abrirImpresion(titulo, bodyHtml) {
  const w = window.open("", "_blank", "width=900,height=640");
  if (!w) { alert("Permita ventanas emergentes para imprimir."); return; }
  w.document.write(`<html><head><title>${_escHtml(titulo)}</title>
    <style>${_basePrintCSS()}</style></head><body>
    ${_cabeceraPrintHtml()}
    ${bodyHtml}
    ${_piePrintHtml()}
    <script>window.print();<\/script></body></html>`);
  w.document.close();
}

function imprimirHTML(titulo, headers, rows, total, opts) {
  const subtitulo = (opts && opts.subtitulo) || "";
  const numClass = headers.map(h => _colNumero(h) ? " num" : "");
  const totalRow = (total !== null && total !== undefined)
    ? `<tfoot><tr class="fila-total"><td class="num" colspan="${headers.length}">TOTAL: ${fmt(total)} Bs.</td></tr></tfoot>`
    : "";
  const tbody = rows.map(r =>
    `<tr>${r.map((c, i) => `<td class="${numClass[i].trim()}">${c == null ? "" : _escHtml(c)}</td>`).join("")}</tr>`
  ).join("");
  const body = _metaPrintHtml(titulo, subtitulo) +
    `<table><thead><tr>${headers.map((h, i) => `<th class="${numClass[i].trim()}">${_escHtml(h)}</th>`).join("")}</tr></thead>` +
    `<tbody>${tbody}</tbody>${totalRow}</table>`;
  _abrirImpresion(titulo, body);
}

// Documento profesional personalizado (cotizaciones, facturas, etc.)
function imprimirDocumentoHTML(titulo, bodyHtml) {
  _abrirImpresion(titulo, bodyHtml);
}

// ============== PERSISTENCIA (localStorage) ==============
const DB_KEY = "pos_sistema_db_v1";

function normalizeDB() {
  if (!DB.parametros) DB.parametros = { nombreEmpresa: "Mi Empresa, C.A.", rif: "", tasaBCV: 36.50, iva: 16, serie: "FACT", caja: "CAJA 01", cajero: "ADMIN", turno: 1 };
  if (!DB.parametros.categorias) DB.parametros.categorias = ["REPUESTOS", "LUBRICANTES", "BATERIAS", "FRENOS", "LLANTAS", "SERVICIOS", "GENERAL"];
  if (!DB.parametros.subcategorias) DB.parametros.subcategorias = ["FILTROS", "ACEITES", "BATERIAS", "FRENOS", "LLANTAS", "BUJIAS", "CORREAS", "SENSORES", "GENERAL"];
  if (!DB.parametros.marcas) DB.parametros.marcas = ["GENERICO", "FRAM", "WEGA", "MOBIL", "SHELL", "MAC", "NGK", "BREMBO", "FIRESTONE", "MICHELIN", "ACDELCO", "BOSCH", "NAKATA", "FERODO"];
  if (!DB.parametros.presentaciones) DB.parametros.presentaciones = ["UNIDAD", "CAJA", "LITRO", "KILO", "PIEZA", "PAQUETE", "GALON"];
  if (!DB.parametros.unidades) DB.parametros.unidades = ["UND", "KG", "LT", "GR", "ML", "CAJ"];
  if (!DB.usuarios || !DB.usuarios.length) DB.usuarios = [{ usuario: "ADMIN", nombre: "Administrador", clave: "admin", rol: "Administrador", activo: true }];
  if (!DB.caja) DB.caja = { estado: "cerrada", cajero: "ADMIN", apertura: null, cierre: null, fondoBs: 0, fondoUSD: 0 };
  if (!DB.cajas || !DB.cajas.length) {
    DB.cajas = [{ id: "CAJA01", nombre: DB.parametros.caja || "CAJA 01", cajero: DB.caja.cajero || "ADMIN", estado: DB.caja.estado || "cerrada", apertura: DB.caja.apertura, cierre: DB.caja.cierre, fondoBs: DB.caja.fondoBs || 0, fondoUSD: DB.caja.fondoUSD || 0, cortesZ: 0 }];
  }
  if (!DB.movimientosInv) DB.movimientosInv = [];
  if (!DB.auditoria) DB.auditoria = [];
  if (!DB.respaldos) DB.respaldos = [];
  if (!DB.devoluciones) DB.devoluciones = [];
  if (!DB.ventas) DB.ventas = [];
  if (!DB.abonos) DB.abonos = [];
  if (!DB.cuentasCobrar) DB.cuentasCobrar = [];
  if (!DB.cuentasPagar) DB.cuentasPagar = [];
  if (!DB.pagosPagar) DB.pagosPagar = [];
  if (!DB.cierresCaja) DB.cierresCaja = [];
  (DB.productos || []).forEach(p => {
    if (p.costoUSD === undefined || p.margenPct === undefined || p.precioUSD === undefined) {
      const tasa = getTasa();
      const pu = p.precioUSD !== undefined ? p.precioUSD : (p.precio || 0) / tasa;
      const margen = p.margenPct !== undefined ? p.margenPct : 25;
      p.precioUSD = r2(pu);
      p.costoUSD = r2(p.costoUSD !== undefined ? p.costoUSD : pu * (1 - margen / 100));
      p.margenPct = r2(((p.precioUSD - p.costoUSD) / p.precioUSD) * 100 || 0);
      p.precio = r2(p.precioUSD * tasa);
    }
    if (p.stockIni === undefined) p.stockIni = p.existencia || 0;
    if (p.subcategoria === undefined) p.subcategoria = "";
    if (p.nroParte === undefined) p.nroParte = "";
    if (p.compatibilidad === undefined) p.compatibilidad = "";
    if (!p.precios || typeof p.precios !== "object") p.precios = {};
    ["mayor", "oferta", "promo"].forEach(k => {
      const defMargen = { mayor: 15, oferta: 20, promo: 25 }[k];
      if (!p.precios[k] || typeof p.precios[k] !== "object") p.precios[k] = { usd: 0, bs: 0, margen: defMargen };
      if (p.precios[k].usd === undefined) p.precios[k].usd = 0;
      if (p.precios[k].bs === undefined) p.precios[k].bs = 0;
      if (p.precios[k].margen === undefined) p.precios[k].margen = defMargen;
    });
  });
  (DB.clientes || []).forEach(c => { if (c.email === undefined) c.email = ""; if (c.saldo === undefined) c.saldo = 0; });
  (DB.movimientosCaja || []).forEach(m => { if (m.ingUsd === undefined) m.ingUsd = 0; if (m.egrUsd === undefined) m.egrUsd = 0; if (!m.caja) m.caja = cajaActual().nombre; });
  migrarCuentasUSD();
  DB.carrito = [];
  sincronizarCajaActiva();
}

// Migración única: convierte CxC/CxP, abonos y saldos de clientes guardados en Bs. a USD
function migrarCuentasUSD() {
  if (!DB.parametros || DB.parametros.monedaCxC === "USD") return;
  const tasa = getTasa();
  (DB.clientes || []).forEach(c => {
    if (c.saldoBs === undefined && c.saldo !== undefined) { c.saldoBs = num(c.saldo); c.saldo = r2(num(c.saldo) / tasa); }
  });
  (DB.cuentasCobrar || []).forEach(c => {
    if (c.totalBs === undefined) {
      c.totalBs = num(c.total); c.total = r2(num(c.total) / tasa);
      c.pagadoBs = num(c.pagado || 0); c.pagado = r2(num(c.pagado || 0) / tasa);
      c.saldoBs = num(c.saldo); c.saldo = r2(num(c.saldo) / tasa);
      c.tasa = tasa;
    }
  });
  (DB.abonos || []).forEach(a => {
    if (a.totalDeudaBs === undefined) {
      a.totalDeudaBs = num(a.totalDeuda); a.totalDeuda = r2(num(a.totalDeuda) / tasa);
      a.montoCobradoBs = num(a.montoCobrado); a.montoCobrado = r2(num(a.montoCobrado) / tasa);
      a.saldoRestanteBs = num(a.saldoRestante); a.saldoRestante = r2(num(a.saldoRestante) / tasa);
      a.tasa = tasa;
    }
  });
  (DB.cuentasPagar || []).forEach(c => {
    if (c.totalBs === undefined) {
      c.totalBs = num(c.total); c.total = r2(num(c.total) / tasa);
      c.pagadoBs = num(c.pagado || 0); c.pagado = r2(num(c.pagado || 0) / tasa);
      c.saldoBs = num(c.saldo); c.saldo = r2(num(c.saldo) / tasa);
      c.tasa = tasa;
    }
  });
  (DB.pagosPagar || []).forEach(p => {
    if (p.montoBs === undefined) { p.montoBs = num(p.monto); p.monto = r2(num(p.monto) / tasa); p.tasa = tasa; }
  });
  // Reconciliación: saldo del cliente = suma de sus cuentas por cobrar en USD
  (DB.clientes || []).forEach(cli => {
    cli.saldo = r2((DB.cuentasCobrar || []).filter(c => c.nombre === cli.nombre).reduce((s, c) => s + (c.saldo || 0), 0));
  });
  DB.parametros.monedaCxC = "USD";
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      Object.keys(DB).forEach(k => {
        if (saved[k] !== undefined) DB[k] = saved[k];
      });
    }
  } catch (e) { console.error("Error cargando datos guardados:", e); }
  normalizeDB();
}

function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { console.error("Error guardando datos:", e); }
}

function resetDemoData() {
  if (confirm("¿Restaurar los datos de ejemplo? Se perderán los cambios actuales.")) {
    localStorage.removeItem(DB_KEY);
    location.reload();
  }
}

loadDB();
