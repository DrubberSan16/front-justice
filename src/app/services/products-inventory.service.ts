import { api } from "@/app/http/api";
import { createLogTransact } from "@/app/services/log-transacts.service";

export type ProductRow = {
  id: string;
  codigo: string;
  nombre: string;
  bodega_id?: string | null;
  costo_promedio: string;
  precio_venta: string;
  porcentaje_utilidad: string;
  unidad_medida_id?: string | null;
};

type StockRow = {
  id: string;
  bodega_id: string;
  producto_id: string;
  stock_actual: string;
  stock_min_bodega: string;
  stock_max_bodega: string;
  stock_min_global: string;
  stock_contenedores: string;
  costo_promedio_bodega: string;
};

type MovementType = "INGRESO" | "SALIDA";

type MovementArgs = {
  tipo: MovementType;
  productoId: string;
  bodegaId: string;
  cantidad: number;
  costoUnitario: number;
  stockAnterior: number;
  stockNuevo: number;
  movimientoObservacion?: string;
  userName: string;
};

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

async function listAll(path: string): Promise<any[]> {
  const limit = 100;
  let page = 1;
  const acc: any[] = [];

  while (true) {
    const { data } = await api.get(path, { params: { page, limit } });
    const rows = asArray(data);
    acc.push(...rows);
    if (rows.length < limit) break;
    page += 1;
    if (page > 100) break;
  }

  return acc;
}

function parseNumber(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const raw = String(v).replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function toText(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function fetchProductsWithStock() {
  const [productos, bodegas, stocks] = await Promise.all([
    listAll("/kpi_inventory/productos"),
    listAll("/kpi_inventory/bodegas"),
    listAll("/kpi_inventory/stock-bodega"),
  ]);

  const stockByProduct = new Map<string, number>();
  for (const s of stocks) {
    const current = stockByProduct.get(s.producto_id) ?? 0;
    stockByProduct.set(s.producto_id, current + parseNumber(s.stock_actual));
  }

  return {
    productos: productos as ProductRow[],
    bodegas,
    stocks: stocks as StockRow[],
    stockByProduct,
  };
}

async function registerMovementAndKardex(args: MovementArgs) {
  const now = new Date().toISOString();
  const subtotal = args.cantidad * args.costoUnitario;

  const movPayload: any = {
    status: "ACTIVE",
    tipo_movimiento: args.tipo,
    fecha_movimiento: now,
    tipo_cambio: "1",
    total_costos: String(subtotal),
    estado: "CONFIRMADO",
    observacion: args.movimientoObservacion ?? `${args.tipo} de inventario`,
  };

  if (args.tipo === "INGRESO") movPayload.bodega_destino_id = args.bodegaId;
  if (args.tipo === "SALIDA") movPayload.bodega_origen_id = args.bodegaId;

  const { data: movimiento } = await api.post("/kpi_inventory/movimientos-inventario", movPayload);

  const { data: detalle } = await api.post("/kpi_inventory/movimientos-inventario-det", {
    status: "ACTIVE",
    movimiento_id: movimiento?.id,
    producto_id: args.productoId,
    cantidad: String(args.cantidad),
    costo_unitario: String(args.costoUnitario),
    subtotal_costo: String(subtotal),
    observacion: args.movimientoObservacion ?? null,
  });

  await api.post("/kpi_inventory/kardex", {
    status: "ACTIVE",
    fecha: now,
    bodega_id: args.bodegaId,
    producto_id: args.productoId,
    movimiento_id: movimiento?.id ?? null,
    movimiento_det_id: detalle?.id ?? null,
    tipo_movimiento: args.tipo,
    entrada_cantidad: String(args.tipo === "INGRESO" ? args.cantidad : 0),
    salida_cantidad: String(args.tipo === "SALIDA" ? args.cantidad : 0),
    costo_unitario: String(args.costoUnitario),
    costo_total: String(subtotal),
    saldo_cantidad: String(args.stockNuevo),
    saldo_costo_promedio: String(args.costoUnitario),
    saldo_valorizado: String(args.stockNuevo * args.costoUnitario),
    observacion: args.movimientoObservacion ?? null,
  });

  await createLogTransact({
    moduleMicroservice: "kpi_inventory",
    status: "ACTIVE",
    typeLog: args.tipo === "INGRESO" ? "PRODUCT_ENTRY" : "PRODUCT_EXIT",
    description: `${args.tipo} producto=${args.productoId} bodega=${args.bodegaId} cantidad=${args.cantidad} (${args.stockAnterior} -> ${args.stockNuevo})`,
    createdBy: args.userName,
  });
}

export async function performManualMovement(payload: {
  productoId: string;
  bodegaId: string;
  cantidad: number;
  costoUnitario: number;
  tipo: MovementType;
  observacion?: string;
  userName: string;
}) {
  const stocks = (await listAll("/kpi_inventory/stock-bodega")) as StockRow[];
  const current = stocks.find((s) => s.producto_id === payload.productoId && s.bodega_id === payload.bodegaId);

  const stockAnterior = parseNumber(current?.stock_actual, 0);
  const signedQty = payload.tipo === "INGRESO" ? payload.cantidad : -payload.cantidad;
  const stockNuevo = stockAnterior + signedQty;

  if (stockNuevo < 0) {
    throw new Error("No existe stock suficiente para realizar la salida.");
  }

  if (!current) {
    const { data: createdStock } = await api.post("/kpi_inventory/stock-bodega", {
      status: "ACTIVE",
      bodega_id: payload.bodegaId,
      producto_id: payload.productoId,
      stock_actual: String(Math.max(stockNuevo, 0)),
      stock_min_bodega: "0",
      stock_max_bodega: "0",
      stock_min_global: "0",
      stock_contenedores: "0",
      costo_promedio_bodega: String(payload.costoUnitario),
    });

    await registerMovementAndKardex({
      tipo: payload.tipo,
      productoId: payload.productoId,
      bodegaId: payload.bodegaId,
      cantidad: payload.cantidad,
      costoUnitario: payload.costoUnitario,
      stockAnterior: 0,
      stockNuevo: parseNumber(createdStock?.stock_actual, stockNuevo),
      movimientoObservacion: payload.observacion,
      userName: payload.userName,
    });

    return;
  }

  await api.patch(`/kpi_inventory/stock-bodega/${current.id}`, {
    stock_actual: String(stockNuevo),
    costo_promedio_bodega: String(payload.costoUnitario),
  });

  await registerMovementAndKardex({
    tipo: payload.tipo,
    productoId: payload.productoId,
    bodegaId: payload.bodegaId,
    cantidad: payload.cantidad,
    costoUnitario: payload.costoUnitario,
    stockAnterior,
    stockNuevo,
    movimientoObservacion: payload.observacion,
    userName: payload.userName,
  });
}

function normalizeHeader(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rowVal(row: Record<string, any>, headers: string[]): any {
  for (const h of headers) {
    const key = Object.keys(row).find((k) => normalizeHeader(k) === h);
    if (key) return row[key];
  }
  return null;
}

export async function bulkUpsertFromRows(rows: Record<string, any>[], userName: string) {
  const sucursales = await listAll("/kpi_inventory/sucursales");
  const bodegas = await listAll("/kpi_inventory/bodegas");
  const lineas = await listAll("/kpi_inventory/lineas");
  const categorias = await listAll("/kpi_inventory/categorias");
  const unidades = await listAll("/kpi_inventory/unidades-medida");
  const productos = await listAll("/kpi_inventory/productos");
  const stocks = (await listAll("/kpi_inventory/stock-bodega")) as StockRow[];

  const stats = { creados: 0, actualizados: 0, ingresos: 0, salidas: 0 };

  for (const row of rows) {
    const codSucursal = toText(rowVal(row, ["cod sucursal"]));
    const nomSucursal = toText(rowVal(row, ["sucursal"]));
    const codBodega = toText(rowVal(row, ["cod bodega"]));
    const nomBodega = toText(rowVal(row, ["bodega"]));
    const nomLinea = toText(rowVal(row, ["linea"]));
    const nomCategoria = toText(rowVal(row, ["categoria"]));
    const codItem = toText(rowVal(row, ["cod item"])).replace(/^'+/, "");
    const nomItem = toText(rowVal(row, ["item"]));
    const costoPromedio = parseNumber(rowVal(row, ["costo promedio", "costo"]), 0);
    const precio = parseNumber(rowVal(row, ["precio"]), 0);
    const utilidad = parseNumber(rowVal(row, [" utilidad", "utilidad", "% utilidad"]), 0);
    const tipoUnidad = toText(rowVal(row, ["tipo de unidad"]));
    const porContenedoresRaw = toText(rowVal(row, ["por contenedores"]));
    const stock = parseNumber(rowVal(row, ["stock"]), 0);
    const stockMinBodega = parseNumber(rowVal(row, ["stock min bodega", "stock m n bodega"]), 0);
    const stockMaxBodega = parseNumber(rowVal(row, ["stock max bodega", "stock m x bodega"]), 0);
    const stockContenedores = parseNumber(rowVal(row, ["stock contenedores"]), 0);
    const stockMin = parseNumber(rowVal(row, ["stock minimo", "stock m nimo"]), 0);

    if (!codSucursal || !codBodega || !codItem || !nomItem) continue;

    let sucursal = sucursales.find((s) => s.codigo === codSucursal);
    if (!sucursal) {
      const { data } = await api.post("/kpi_inventory/sucursales", {
        status: "ACTIVE",
        codigo: codSucursal,
        nombre: nomSucursal || codSucursal,
      });
      sucursal = data;
      sucursales.push(data);
    }

    let bodega = bodegas.find((b) => b.codigo === codBodega && b.sucursal_id === sucursal.id);
    if (!bodega) {
      const { data } = await api.post("/kpi_inventory/bodegas", {
        status: "ACTIVE",
        sucursal_id: sucursal.id,
        codigo: codBodega,
        nombre: nomBodega || codBodega,
        es_principal: false,
      });
      bodega = data;
      bodegas.push(data);
    }

    let linea = lineas.find((l) => l.nombre === nomLinea);
    if (!linea) {
      const { data } = await api.post("/kpi_inventory/lineas", {
        status: "ACTIVE",
        codigo: nomLinea || `L-${Date.now()}`,
        nombre: nomLinea || "GENERAL",
      });
      linea = data;
      lineas.push(data);
    }

    let categoria = categorias.find((c) => c.nombre === nomCategoria);
    if (!categoria) {
      const { data } = await api.post("/kpi_inventory/categorias", {
        status: "ACTIVE",
        nombre: nomCategoria || "GENERAL",
      });
      categoria = data;
      categorias.push(data);
    }

    let unidad = unidades.find((u) => u.nombre === tipoUnidad);
    if (!unidad) {
      const { data } = await api.post("/kpi_inventory/unidades-medida", {
        status: "ACTIVE",
        nombre: tipoUnidad || "UNIDAD",
        es_base: true,
      });
      unidad = data;
      unidades.push(data);
    }

    const porContenedores = porContenedoresRaw.toUpperCase() === "S";

    let producto = productos.find((p) => p.codigo === codItem);
    if (!producto) {
      const { data } = await api.post("/kpi_inventory/productos", {
        status: "ACTIVE",
        codigo: codItem,
        nombre: nomItem,
        linea_id: linea.id,
        categoria_id: categoria.id,
        unidad_medida_id: unidad.id,
        por_contenedores: porContenedores,
        es_servicio: false,
        requiere_lote: false,
        requiere_serie: false,
        ultimo_costo: String(costoPromedio),
        costo_promedio: String(costoPromedio),
        precio_venta: String(precio),
        porcentaje_utilidad: String(utilidad),
      });
      producto = data;
      productos.push(data);
      stats.creados += 1;
    } else {
      await api.patch(`/kpi_inventory/productos/${producto.id}`, {
        nombre: nomItem,
        linea_id: linea.id,
        categoria_id: categoria.id,
        unidad_medida_id: unidad.id,
        por_contenedores: porContenedores,
        ultimo_costo: String(costoPromedio),
        costo_promedio: String(costoPromedio),
        precio_venta: String(precio),
        porcentaje_utilidad: String(utilidad),
      });
      stats.actualizados += 1;
    }

    let stockRow = stocks.find((s) => s.bodega_id === bodega.id && s.producto_id === producto.id);
    const stockAnterior = parseNumber(stockRow?.stock_actual, 0);

    if (!stockRow) {
      const { data } = await api.post("/kpi_inventory/stock-bodega", {
        status: "ACTIVE",
        bodega_id: bodega.id,
        producto_id: producto.id,
        stock_actual: String(stock),
        stock_min_bodega: String(stockMinBodega),
        stock_max_bodega: String(stockMaxBodega),
        stock_min_global: String(stockMin),
        stock_contenedores: String(stockContenedores),
        costo_promedio_bodega: String(costoPromedio),
      });
      stockRow = data;
      stocks.push(data);
    } else {
      await api.patch(`/kpi_inventory/stock-bodega/${stockRow.id}`, {
        stock_actual: String(stock),
        stock_min_bodega: String(stockMinBodega),
        stock_max_bodega: String(stockMaxBodega),
        stock_min_global: String(stockMin),
        stock_contenedores: String(stockContenedores),
        costo_promedio_bodega: String(costoPromedio),
      });
      stockRow.stock_actual = String(stock);
    }

    const delta = stock - stockAnterior;
    if (delta !== 0) {
      const tipo: MovementType = delta > 0 ? "INGRESO" : "SALIDA";
      await registerMovementAndKardex({
        tipo,
        productoId: producto.id,
        bodegaId: bodega.id,
        cantidad: Math.abs(delta),
        costoUnitario: costoPromedio,
        stockAnterior,
        stockNuevo: stock,
        movimientoObservacion: "Ajuste por carga masiva XLSX",
        userName,
      });
      if (delta > 0) stats.ingresos += 1;
      else stats.salidas += 1;
    }
  }

  return stats;
}
