const { sql } = require("../config/db");

/**
 * Consume capas de costo de un producto bajo la metodología FIFO (Primeras Entradas, Primeras Salidas).
 * Utiliza bloqueos pesimistas (UPDLOCK, HOLDLOCK) dentro de una transacción SQL activa.
 * Extraído de la lógica original de server.js (sección descargos y movimientos).
 *
 * @param {Object} params
 * @param {sql.Transaction} params.transaction Transacción SQL obligatoria
 * @param {number} params.productoId ID del producto en catálogo
 * @param {string} params.bodega Bodega de donde se consume el stock
 * @param {number} params.cantidad Cantidad requerida a consumir
 * @param {string|null} [params.lote] Lote específico o null si el producto no maneja lote
 * @param {string|null} [params.codigoProveedor] Código del proveedor
 * @param {string|null} [params.casaComercial] Casa comercial asociada
 * @param {string} params.tipoMovimiento Tipo de movimiento (ej: 'DESCARGO', 'TRASLADO', 'SALIDA')
 * @param {string} params.documento Identificador o texto del documento (ej: número de descargo)
 * @param {number} params.documentoId ID de la fila en detalle (ej: descargos_detalle.id)
 * @param {string|null} [params.bodegaDestino] Bodega de destino si aplica
 * @param {string} params.usuario Nombre del usuario que autoriza o registra el movimiento
 * @param {string|null} [params.observacion] Observación adicional
 * @returns {Promise<{ capasConsumidas: Array, valorConocido: number, cantidadCostoPendiente: number }>}
 */
async function consumirCapasFIFO({
  transaction,
  productoId,
  bodega,
  cantidad,
  lote = null,
  codigoProveedor = null,
  casaComercial = null,
  tipoMovimiento = "DESCARGO",
  documento,
  documentoId,
  bodegaDestino = null,
  usuario,
  observacion = null
}) {
  if (!transaction) {
    throw new Error("Se requiere una transacción SQL activa para consumir capas.");
  }

  const manejaLote = Boolean(lote && String(lote).trim() !== "");

  const requestCapas = new sql.Request(transaction)
    .input("producto_id", sql.Int, Number(productoId))
    .input("bodega", sql.VarChar, String(bodega).trim());

  let filtroCapa = "";

  if (manejaLote) {
    requestCapas.input("lote", sql.VarChar, String(lote).trim());
    filtroCapa = `
      AND UPPER(LTRIM(RTRIM(ISNULL(c.lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
    `;
  } else {
    filtroCapa = `
      AND (c.lote IS NULL OR LTRIM(RTRIM(c.lote)) = '')
    `;
  }

  if (codigoProveedor) {
    requestCapas.input("codigo_proveedor", sql.VarChar, String(codigoProveedor).trim());
    filtroCapa += `
      AND (c.codigo_proveedor IS NULL OR UPPER(LTRIM(RTRIM(c.codigo_proveedor))) = UPPER(LTRIM(RTRIM(@codigo_proveedor))))
    `;
  }

  if (casaComercial) {
    requestCapas.input("casa_comercial", sql.VarChar, String(casaComercial).trim());
    filtroCapa += `
      AND (c.casa_comercial IS NULL OR UPPER(LTRIM(RTRIM(c.casa_comercial))) = UPPER(LTRIM(RTRIM(@casa_comercial))))
    `;
  }

  const capasResult = await requestCapas.query(`
    SELECT
      c.id,
      c.cantidad_disponible,
      c.estado_costo,
      c.costo_unitario,
      c.motivo_sin_costo,
      c.lote,
      c.fecha_entrada,
      c.origen,
      c.origen_id
    FROM dbo.capas_costo_inventario c
      WITH (UPDLOCK, HOLDLOCK)
    WHERE
      c.producto_id = @producto_id
      AND UPPER(LTRIM(RTRIM(c.bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
      AND c.cantidad_disponible > 0
      ${filtroCapa}
    ORDER BY
      c.fecha_entrada ASC,
      c.id ASC
  `);

  const capas = capasResult.recordset || [];

  const disponibleCapas = capas.reduce(
    (total, capa) => total + Number(capa.cantidad_disponible || 0),
    0
  );

  if (disponibleCapas < cantidad) {
    throw new Error(
      manejaLote
        ? `Las capas del lote solo tienen ${disponibleCapas} unidades disponibles (se requerían ${cantidad})`
        : `Las capas sin lote solo tienen ${disponibleCapas} unidades disponibles (se requerían ${cantidad})`
    );
  }

  let cantidadPendiente = cantidad;
  let valorConocido = 0;
  let cantidadCostoPendiente = 0;
  const capasConsumidas = [];

  for (const capa of capas) {
    if (cantidadPendiente <= 0) break;

    const disponible = Number(capa.cantidad_disponible || 0);
    if (disponible <= 0) continue;

    const consumir = Math.min(disponible, cantidadPendiente);
    const nuevoSaldo = disponible - consumir;

    // Actualizar cantidad_disponible en la capa
    await new sql.Request(transaction)
      .input("id", sql.Int, Number(capa.id))
      .input("cantidad_disponible", sql.Decimal(18, 4), nuevoSaldo)
      .query(`
        UPDATE dbo.capas_costo_inventario
        SET cantidad_disponible = @cantidad_disponible
        WHERE id = @id
      `);

    const costoUnitario =
      capa.costo_unitario === null || capa.costo_unitario === undefined
        ? null
        : Number(capa.costo_unitario);

    const valorMovimiento =
      costoUnitario === null ? null : consumir * costoUnitario;

    if (valorMovimiento === null) {
      cantidadCostoPendiente += consumir;
    } else {
      valorConocido += valorMovimiento;
    }

    // Registrar historial en movimientos_capas_costo
    await new sql.Request(transaction)
      .input("capa_id", sql.Int, Number(capa.id))
      .input("producto_id", sql.Int, Number(productoId))
      .input("tipo_movimiento", sql.VarChar, tipoMovimiento)
      .input("documento", sql.VarChar, documento)
      .input("documento_id", sql.Int, documentoId)
      .input("bodega_origen", sql.VarChar, String(bodega).trim())
      .input("bodega_destino", sql.VarChar, bodegaDestino ? String(bodegaDestino).trim() : null)
      .input("lote", sql.VarChar, capa.lote || lote || null)
      .input("cantidad", sql.Decimal(18, 4), consumir)
      .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
      .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
      .input("estado_costo", sql.VarChar, capa.estado_costo)
      .input("usuario", sql.VarChar, usuario)
      .input("observacion", sql.VarChar, observacion || null)
      .query(`
        INSERT INTO dbo.movimientos_capas_costo (
          capa_id,
          producto_id,
          tipo_movimiento,
          documento,
          documento_id,
          bodega_origen,
          bodega_destino,
          lote,
          cantidad,
          costo_unitario,
          valor_movimiento,
          estado_costo,
          usuario,
          observacion
        )
        VALUES (
          @capa_id,
          @producto_id,
          @tipo_movimiento,
          @documento,
          @documento_id,
          @bodega_origen,
          @bodega_destino,
          @lote,
          @cantidad,
          @costo_unitario,
          @valor_movimiento,
          @estado_costo,
          @usuario,
          @observacion
        )
      `);

    capasConsumidas.push({
      capa_id: Number(capa.id),
      cantidad: consumir,
      costo_unitario: costoUnitario,
      valor: valorMovimiento,
      estado_costo: capa.estado_costo
    });

    cantidadPendiente -= consumir;
  }

  if (cantidadPendiente > 0.0001) {
    throw new Error(
      `No fue posible distribuir completamente la cantidad entre las capas de costo disponibles.`
    );
  }

  return {
    capasConsumidas,
    valorConocido,
    cantidadCostoPendiente
  };
}

/**
 * Traslada capas de costo entre bodegas (ejemplo hacia CUARENTENA o traslados).
 * Disminuye la capa origen y genera una nueva capa en la bodega destino con referencia a la original.
 * Extraído de la lógica original de server.js.
 */
async function trasladarCapasCosto({
  transaction,
  productoId,
  bodegaOrigen,
  bodegaDestino,
  cantidadMover,
  lote,
  vencimiento = null,
  codigoProveedor = null,
  casaComercial = null,
  origen = "TRASLADO",
  origenId,
  referenciaDocumento,
  motivo,
  observacion = null,
  usuarioNombre,
  fechaMovimiento = new Date()
}) {
  if (!transaction) {
    throw new Error("Se requiere una transacción SQL activa para trasladar capas.");
  }

  const request = new sql.Request(transaction)
    .input("producto_id", sql.Int, Number(productoId))
    .input("bodega", sql.VarChar, String(bodegaOrigen).trim())
    .input("lote", sql.VarChar, lote || "")
    .input("codigo_proveedor", sql.VarChar, codigoProveedor || "")
    .input("casa_comercial", sql.VarChar, casaComercial || "");

  const capasResult = await request.query(`
    SELECT
      c.id,
      c.cantidad_disponible,
      c.estado_costo,
      c.costo_unitario,
      c.motivo_sin_costo,
      c.lote,
      c.fecha_vencimiento,
      c.fecha_entrada,
      c.proveedor_id,
      c.codigo_proveedor,
      c.casa_comercial,
      c.referencia_documento,
      c.origen,
      c.origen_id
    FROM dbo.capas_costo_inventario c
      WITH (UPDLOCK, HOLDLOCK)
    WHERE
      c.producto_id = @producto_id
      AND UPPER(LTRIM(RTRIM(c.bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
      AND UPPER(LTRIM(RTRIM(ISNULL(c.lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
      AND (
        c.codigo_proveedor IS NULL
        OR UPPER(LTRIM(RTRIM(c.codigo_proveedor))) = UPPER(LTRIM(RTRIM(@codigo_proveedor)))
      )
      AND (
        c.casa_comercial IS NULL
        OR UPPER(LTRIM(RTRIM(c.casa_comercial))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
      )
      AND c.cantidad_disponible > 0
    ORDER BY
      c.fecha_entrada ASC,
      c.id ASC
  `);

  const capasOrigen = capasResult.recordset || [];
  const totalCapasDisponible = capasOrigen.reduce(
    (total, capa) => total + Number(capa.cantidad_disponible || 0),
    0
  );

  if (totalCapasDisponible < cantidadMover) {
    throw new Error(
      `Las capas de costo del lote solo tienen ${totalCapasDisponible} unidades disponibles para mover.`
    );
  }

  let cantidadPendiente = cantidadMover;
  const capasMovidas = [];

  for (const capa of capasOrigen) {
    if (cantidadPendiente <= 0) break;

    const disponible = Number(capa.cantidad_disponible || 0);
    if (disponible <= 0) continue;

    const mover = Math.min(disponible, cantidadPendiente);
    const nuevoSaldo = disponible - mover;

    // 1. Reducir capa origen
    await new sql.Request(transaction)
      .input("id", sql.Int, Number(capa.id))
      .input("saldo", sql.Decimal(18, 4), nuevoSaldo)
      .query(`
        UPDATE dbo.capas_costo_inventario
        SET cantidad_disponible = @saldo
        WHERE id = @id
      `);

    const costoUnitario =
      capa.costo_unitario === null || capa.costo_unitario === undefined
        ? null
        : Number(capa.costo_unitario);

    const valorMovimiento =
      costoUnitario === null ? null : mover * costoUnitario;

    // 2. Crear capa en bodega destino
    const nuevaCapaResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(productoId))
      .input("bodega", sql.VarChar, String(bodegaDestino).trim())
      .input("lote", sql.VarChar, capa.lote || lote || null)
      .input("fecha_vencimiento", sql.Date, capa.fecha_vencimiento || vencimiento || null)
      .input("origen", sql.VarChar, origen)
      .input("origen_id", sql.Int, origenId)
      .input("estado_costo", sql.VarChar, capa.estado_costo)
      .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
      .input("motivo_sin_costo", sql.VarChar, capa.motivo_sin_costo || null)
      .input("cantidad_original", sql.Decimal(18, 4), mover)
      .input("cantidad_disponible", sql.Decimal(18, 4), mover)
      .input("capa_origen_id", sql.Int, Number(capa.id))
      .input("proveedor_id", sql.Int, capa.proveedor_id || null)
      .input("referencia_documento", sql.VarChar, referenciaDocumento)
      .input("observacion", sql.VarChar, `${motivo || ""}${observacion ? " - " + observacion : ""}`)
      .input("usuario_creacion", sql.VarChar, usuarioNombre)
      .input("fecha_entrada", sql.DateTime2, capa.fecha_entrada || fechaMovimiento)
      .input("codigo_proveedor", sql.VarChar, capa.codigo_proveedor || codigoProveedor || null)
      .input("casa_comercial", sql.VarChar, capa.casa_comercial || casaComercial || null)
      .query(`
        INSERT INTO dbo.capas_costo_inventario (
          producto_id,
          bodega,
          lote,
          fecha_vencimiento,
          origen,
          origen_id,
          estado_costo,
          costo_unitario,
          motivo_sin_costo,
          cantidad_original,
          cantidad_disponible,
          capa_origen_id,
          proveedor_id,
          referencia_documento,
          observacion,
          usuario_creacion,
          fecha_entrada,
          codigo_proveedor,
          casa_comercial
        )
        OUTPUT INSERTED.id
        VALUES (
          @producto_id,
          @bodega,
          @lote,
          @fecha_vencimiento,
          @origen,
          @origen_id,
          @estado_costo,
          @costo_unitario,
          @motivo_sin_costo,
          @cantidad_original,
          @cantidad_disponible,
          @capa_origen_id,
          @proveedor_id,
          @referencia_documento,
          @observacion,
          @usuario_creacion,
          @fecha_entrada,
          @codigo_proveedor,
          @casa_comercial
        )
      `);

    const capaDestinoId = Number(nuevaCapaResult.recordset[0].id);

    // 3. Registrar movimiento económico
    await new sql.Request(transaction)
      .input("capa_id", sql.Int, Number(capa.id))
      .input("producto_id", sql.Int, Number(productoId))
      .input("tipo_movimiento", sql.VarChar, origen)
      .input("documento", sql.VarChar, referenciaDocumento)
      .input("documento_id", sql.Int, origenId)
      .input("bodega_origen", sql.VarChar, String(bodegaOrigen).trim())
      .input("bodega_destino", sql.VarChar, String(bodegaDestino).trim())
      .input("lote", sql.VarChar, capa.lote || lote || null)
      .input("cantidad", sql.Decimal(18, 4), mover)
      .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
      .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
      .input("estado_costo", sql.VarChar, capa.estado_costo)
      .input("usuario", sql.VarChar, usuarioNombre)
      .input("observacion", sql.VarChar, `${motivo || ""}${observacion ? " - " + observacion : ""}`)
      .query(`
        INSERT INTO dbo.movimientos_capas_costo (
          capa_id,
          producto_id,
          tipo_movimiento,
          documento,
          documento_id,
          bodega_origen,
          bodega_destino,
          lote,
          cantidad,
          costo_unitario,
          valor_movimiento,
          estado_costo,
          usuario,
          observacion
        )
        VALUES (
          @capa_id,
          @producto_id,
          @tipo_movimiento,
          @documento,
          @documento_id,
          @bodega_origen,
          @bodega_destino,
          @lote,
          @cantidad,
          @costo_unitario,
          @valor_movimiento,
          @estado_costo,
          @usuario,
          @observacion
        )
      `);

    capasMovidas.push({
      capa_origen_id: Number(capa.id),
      capa_destino_id: capaDestinoId,
      cantidad: mover,
      costo_unitario: costoUnitario,
      valor_movimiento: valorMovimiento,
      estado_costo: capa.estado_costo
    });

    cantidadPendiente -= mover;
  }

  return capasMovidas;
}

module.exports = {
  consumirCapasFIFO,
  trasladarCapasCosto
};
