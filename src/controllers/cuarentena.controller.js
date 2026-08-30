const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Listar stock en CUARENTENA con filtros y paginación.
 */
const listarCuarentena = async (req, res) => {
  const codigo = String(req.query.codigo || "").trim();
  const producto = String(req.query.producto || "").trim();
  const lote = String(req.query.lote || "").trim();
  const codigoProveedor = String(req.query.codigoProveedor || "").trim();
  const casaComercial = String(req.query.casaComercial || "").trim();
  const fechaDesde = String(req.query.fechaDesde || "").trim();
  const fechaHasta = String(req.query.fechaHasta || "").trim();

  let pagina = Number(req.query.pagina || 1);
  let limite = Number(req.query.limite || 10);

  if (!Number.isInteger(pagina) || pagina < 1) pagina = 1;
  if (!Number.isInteger(limite) || limite < 1) limite = 10;
  if (limite > 5000) limite = 5000;

  const offset = (pagina - 1) * limite;

  const ordenSolicitado = String(req.query.orden || "vencimiento_asc").trim().toLowerCase();
  const ordenesPermitidos = {
    vencimiento_asc: "vencimiento ASC, producto ASC",
    vencimiento_desc: "vencimiento DESC, producto ASC",
    producto_asc: "producto ASC, vencimiento ASC",
    producto_desc: "producto DESC, vencimiento ASC",
    codigo_asc: "codigo ASC, producto ASC",
    codigo_desc: "codigo DESC, producto ASC",
    cantidad_asc: "stock_lote ASC, producto ASC",
    cantidad_desc: "stock_lote DESC, producto ASC",
    lote_asc: "lote ASC, producto ASC",
    lote_desc: "lote DESC, producto ASC"
  };

  const orderBy = ordenesPermitidos[ordenSolicitado] || ordenesPermitidos.vencimiento_asc;
  const pool = await getPool();

  const configResult = await pool.request().query(`
    SELECT TOP 1 meses_aviso, dias_critico
    FROM dbo.configuracion_expiracion
    ORDER BY id ASC
  `);

  const mesesAviso = Number(configResult.recordset?.[0]?.meses_aviso || 3);
  const diasCritico = Number(configResult.recordset?.[0]?.dias_critico || 30);

  const result = await pool.request()
    .input("codigo", sql.VarChar, codigo)
    .input("producto", sql.VarChar, producto)
    .input("lote", sql.VarChar, lote)
    .input("codigoProveedor", sql.VarChar, codigoProveedor)
    .input("casaComercial", sql.VarChar, casaComercial)
    .input("fechaDesde", sql.VarChar, fechaDesde)
    .input("fechaHasta", sql.VarChar, fechaHasta)
    .input("mesesAviso", sql.Int, mesesAviso)
    .input("diasCritico", sql.Int, diasCritico)
    .input("offset", sql.Int, offset)
    .input("limite", sql.Int, limite)
    .query(`
      WITH LotesNumerados AS (
        SELECT
          de.id AS detalle_entrada_id,
          de.producto_id,
          de.codigo,
          de.codigoproveedor AS codigo_proveedor,
          de.producto,
          de.categoria,
          de.bodega,
          de.lote,
          de.vencimiento,
          de.casa_comercial,
          de.stock_lote,
          de.stock_minimo,
          de.ubicacion,
          de.responsable,
          de.observacion,
          de.origen_movimiento,
          ROW_NUMBER() OVER (
            PARTITION BY
              de.producto_id,
              de.bodega,
              ISNULL(de.lote, ''),
              ISNULL(de.codigoproveedor, ''),
              ISNULL(de.casa_comercial, '')
            ORDER BY de.id DESC
          ) AS rn
        FROM dbo.detalleEntradas de
        WHERE UPPER(LTRIM(RTRIM(de.bodega))) = 'CUARENTENA'
      ),
      CuarentenaActual AS (
        SELECT
          ln.detalle_entrada_id,
          i.id AS inventario_id,
          ln.producto_id,
          ln.codigo,
          ln.codigo_proveedor,
          ln.producto,
          ln.categoria,
          ln.lote,
          ln.vencimiento,
          ln.casa_comercial,
          CAST(ln.stock_lote AS DECIMAL(18,4)) AS stock_lote,
          COALESCE(NULLIF(ln.ubicacion, ''), i.ubicacion) AS ubicacion,
          ln.responsable,
          ln.observacion,
          DATEDIFF(DAY, CAST(GETDATE() AS DATE), ln.vencimiento) AS dias_restantes,
          CASE
            WHEN ln.vencimiento IS NULL THEN 'SIN FECHA'
            WHEN ln.vencimiento < CAST(GETDATE() AS DATE) THEN 'VENCIDO'
            WHEN ln.vencimiento <= DATEADD(DAY, @diasCritico, CAST(GETDATE() AS DATE)) THEN 'CRITICO'
            WHEN ln.vencimiento <= DATEADD(MONTH, @mesesAviso, CAST(GETDATE() AS DATE)) THEN 'PROXIMO'
            ELSE 'VIGENTE'
          END AS estado_expiracion
        FROM LotesNumerados ln
        INNER JOIN dbo.inventario i
          ON i.producto_id = ln.producto_id
          AND UPPER(LTRIM(RTRIM(i.bodega))) = 'CUARENTENA'
        WHERE ln.rn = 1
          AND ISNULL(ln.stock_lote, 0) > 0
      ),
      DatosFiltrados AS (
        SELECT *
        FROM CuarentenaActual
        WHERE
          (@codigo = '' OR codigo LIKE '%' + @codigo + '%')
          AND (@producto = '' OR producto LIKE '%' + @producto + '%')
          AND (@lote = '' OR ISNULL(lote, '') LIKE '%' + @lote + '%')
          AND (@codigoProveedor = '' OR ISNULL(codigo_proveedor, '') LIKE '%' + @codigoProveedor + '%')
          AND (@casaComercial = '' OR ISNULL(casa_comercial, '') LIKE '%' + @casaComercial + '%')
          AND (@fechaDesde = '' OR vencimiento >= TRY_CONVERT(DATE, @fechaDesde))
          AND (@fechaHasta = '' OR vencimiento <= TRY_CONVERT(DATE, @fechaHasta))
      )
      SELECT
        detalle_entrada_id,
        inventario_id,
        producto_id,
        codigo,
        codigo_proveedor,
        producto,
        categoria,
        lote,
        CONVERT(VARCHAR(10), vencimiento, 23) AS vencimiento,
        casa_comercial,
        stock_lote AS cantidad,
        'CUARENTENA' AS bodega,
        ubicacion,
        dias_restantes,
        estado_expiracion,
        responsable,
        observacion,
        COUNT(*) OVER() AS total_registros
      FROM DatosFiltrados
      ORDER BY ${orderBy}
      OFFSET @offset ROWS
      FETCH NEXT @limite ROWS ONLY;
    `);

  const registros = result.recordset || [];
  const totalRegistros = registros.length ? Number(registros[0].total_registros || 0) : 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

  const itemsLimpios = registros.map((r) => {
    const { total_registros, ...resto } = r;
    return resto;
  });

  res.json({
    ok: true,
    paginacion: {
      pagina,
      limite,
      total_registros: totalRegistros,
      total_paginas: totalPaginas
    },
    items: itemsLimpios
  });
};

/**
 * Listar bodegas activas de destino disponibles para liberar cuarentena.
 */
const listarBodegasDestinoCuarentena = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      LTRIM(RTRIM(nombre)) AS nombre
    FROM dbo.bodegas
    WHERE
      UPPER(LTRIM(RTRIM(estado))) = 'ACTIVO'
      AND UPPER(LTRIM(RTRIM(nombre))) <> 'CUARENTENA'
    ORDER BY nombre ASC
  `);

  res.json({
    ok: true,
    bodegas: (result.recordset || []).map((item) => ({
      id: Number(item.id),
      nombre: item.nombre
    }))
  });
};

/**
 * Mover stock a CUARENTENA (aislamiento de insumos).
 */
const moverACuarentena = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      inventarioId,
      detalleEntradaId,
      cantidad,
      motivo,
      observacion
    } = req.body;

    const inventarioOrigenId = Number(inventarioId || 0);
    const detalleLoteId = Number(detalleEntradaId || 0);
    const cantidadMover = Number(cantidad || 0);
    const motivoFinal = String(motivo || "").trim();
    const observacionFinal = String(observacion || "").trim() || null;

    if (!inventarioOrigenId) throw new AppError("Inventario origen no válido.", 400);
    if (!detalleLoteId) throw new AppError("Debe seleccionar un lote válido.", 400);
    if (!Number.isFinite(cantidadMover) || cantidadMover <= 0) {
      throw new AppError("La cantidad a mover debe ser mayor a cero.", 400);
    }
    if (!motivoFinal) throw new AppError("Seleccione el motivo de cuarentena.", 400);

    const usuarioId = Number(req.session?.usuario?.id || req.session?.usuarioId || 0) || null;
    const usuarioNombre = String(
      req.session?.usuario?.username || req.session?.usuario?.nombreCompleto || "USUARIO"
    ).trim();

    await transaction.begin();

    const invOrigenResult = await new sql.Request(transaction)
      .input("id", sql.Int, inventarioOrigenId)
      .query(`
        SELECT TOP 1
          i.id,
          i.producto_id,
          i.bodega,
          i.stock,
          i.stock_minimo,
          i.ubicacion,
          p.codigo,
          p.producto,
          p.categoria,
          p.unidad
        FROM dbo.inventario i
        WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.productos p ON p.id = i.producto_id
        WHERE i.id = @id
      `);

    if (!invOrigenResult.recordset.length) {
      throw new AppError("Inventario origen no encontrado.", 404);
    }

    const invOrigen = invOrigenResult.recordset[0];
    const bodegaOrigen = String(invOrigen.bodega || "").trim();
    const bodegaDestino = "CUARENTENA";

    if (bodegaOrigen.toUpperCase() === "CUARENTENA") {
      throw new AppError("El producto ya se encuentra en CUARENTENA.", 400);
    }

    if (Number(invOrigen.stock || 0) < cantidadMover) {
      throw new AppError(`Stock general insuficiente para ${invOrigen.producto}.`, 400);
    }

    const loteBaseResult = await new sql.Request(transaction)
      .input("id", sql.Int, detalleLoteId)
      .query(`
        SELECT TOP 1
          id, bodega, producto_id, codigo, codigoproveedor,
          producto, categoria, lote, vencimiento, casa_comercial,
          stock_minimo, ubicacion
        FROM dbo.detalleEntradas
        WHERE id = @id
      `);

    if (!loteBaseResult.recordset.length) {
      throw new AppError("El lote seleccionado no fue encontrado.", 404);
    }

    const loteBase = loteBaseResult.recordset[0];

    if (Number(loteBase.producto_id) !== Number(invOrigen.producto_id)) {
      throw new AppError("El lote seleccionado no corresponde al producto.", 400);
    }

    if (String(loteBase.bodega || "").trim().toUpperCase() !== bodegaOrigen.toUpperCase()) {
      throw new AppError("El lote no pertenece a la bodega de origen.", 400);
    }

    const loteOrigenResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(invOrigen.producto_id))
      .input("bodega", sql.VarChar, bodegaOrigen)
      .input("lote", sql.VarChar, loteBase.lote || "")
      .input("codigoproveedor", sql.VarChar, loteBase.codigoproveedor || "")
      .input("casa_comercial", sql.VarChar, loteBase.casa_comercial || "")
      .query(`
        SELECT TOP 1
          id, bodega, producto_id, codigo, codigoproveedor,
          producto, categoria, cantidad, stock_lote, lote,
          vencimiento, casa_comercial, stock_minimo, ubicacion,
          responsable, observacion, origen_movimiento
        FROM dbo.detalleEntradas
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
          AND UPPER(LTRIM(RTRIM(ISNULL(lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
          AND UPPER(LTRIM(RTRIM(ISNULL(codigoproveedor, '')))) = UPPER(LTRIM(RTRIM(@codigoproveedor)))
          AND UPPER(LTRIM(RTRIM(ISNULL(casa_comercial, '')))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
        ORDER BY id DESC
      `);

    if (!loteOrigenResult.recordset.length) {
      throw new AppError("No se encontró saldo vigente para el lote origen.", 400);
    }

    const loteOrigen = loteOrigenResult.recordset[0];

    if (Number(loteOrigen.stock_lote || 0) < cantidadMover) {
      throw new AppError(`Stock insuficiente en el lote ${loteOrigen.lote || ""}.`, 400);
    }

    const lote = loteOrigen.lote || null;
    const vencimiento = loteOrigen.vencimiento || null;
    const casaComercial = loteOrigen.casa_comercial || null;
    const codigoProveedor = loteOrigen.codigoproveedor || null;
    const ubicacionOrigen = loteOrigen.ubicacion || invOrigen.ubicacion || null;

    const capasResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(invOrigen.producto_id))
      .input("bodega", sql.VarChar, bodegaOrigen)
      .input("lote", sql.VarChar, lote || "")
      .input("codigo_proveedor", sql.VarChar, codigoProveedor || "")
      .input("casa_comercial", sql.VarChar, casaComercial || "")
      .query(`
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
      throw new AppError(`Las capas de costo del lote solo tienen ${totalCapasDisponible} unidades disponibles.`, 400);
    }

    const invCuarentenaResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(invOrigen.producto_id))
      .input("bodega", sql.VarChar, bodegaDestino)
      .query(`
        SELECT TOP 1 id, stock, ubicacion
        FROM dbo.inventario
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
      `);

    let inventarioCuarentenaId = null;

    if (invCuarentenaResult.recordset.length) {
      const existente = invCuarentenaResult.recordset[0];
      inventarioCuarentenaId = Number(existente.id);

      await new sql.Request(transaction)
        .input("id", sql.Int, inventarioCuarentenaId)
        .input("cantidad", sql.Decimal(18, 4), cantidadMover)
        .input("responsable", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, `Ingreso a CUARENTENA: ${motivoFinal}${observacionFinal ? " - " + observacionFinal : ""}`)
        .query(`
          UPDATE dbo.inventario
          SET
            stock = ISNULL(stock, 0) + @cantidad,
            responsable = @responsable,
            observacion = @observacion,
            fecha_actualizacion = GETDATE()
          WHERE id = @id
        `);
    } else {
      const crearCuarentena = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("bodega", sql.VarChar, bodegaDestino)
        .input("stock", sql.Decimal(18, 4), cantidadMover)
        .input("stock_minimo", sql.Int, 0)
        .input("ubicacion", sql.VarChar, null)
        .input("responsable", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, `Ingreso a CUARENTENA: ${motivoFinal}${observacionFinal ? " - " + observacionFinal : ""}`)
        .query(`
          INSERT INTO dbo.inventario (
            producto_id, bodega, stock, stock_minimo, ubicacion, responsable, observacion
          )
          OUTPUT INSERTED.id
          VALUES (
            @producto_id, @bodega, @stock, @stock_minimo, @ubicacion, @responsable, @observacion
          )
        `);

      inventarioCuarentenaId = Number(crearCuarentena.recordset[0].id);
    }

    const descontarOrigen = await new sql.Request(transaction)
      .input("id", sql.Int, inventarioOrigenId)
      .input("cantidad", sql.Decimal(18, 4), cantidadMover)
      .query(`
        UPDATE dbo.inventario
        SET
          stock = ISNULL(stock, 0) - @cantidad,
          fecha_actualizacion = GETDATE()
        WHERE
          id = @id
          AND ISNULL(stock, 0) >= @cantidad
      `);

    if (!descontarOrigen.rowsAffected?.[0]) {
      throw new AppError("No fue posible descontar el inventario de origen.", 400);
    }

    const descontarLoteOrigen = await new sql.Request(transaction)
      .input("id", sql.Int, Number(loteOrigen.id))
      .input("cantidad", sql.Decimal(18, 4), cantidadMover)
      .query(`
        UPDATE dbo.detalleEntradas
        SET
          stock_lote = ISNULL(stock_lote, 0) - @cantidad
        WHERE
          id = @id
          AND ISNULL(stock_lote, 0) >= @cantidad
      `);

    if (!descontarLoteOrigen.rowsAffected?.[0]) {
      throw new AppError("No fue posible descontar el lote de origen.", 400);
    }

    const loteCuarentenaResult = await new sql.Request(transaction)
      .input("bodega", sql.VarChar, bodegaDestino)
      .input("producto_id", sql.Int, Number(invOrigen.producto_id))
      .input("lote", sql.VarChar, lote || "")
      .input("casa_comercial", sql.VarChar, casaComercial || "")
      .input("codigoproveedor", sql.VarChar, codigoProveedor || "")
      .query(`
        SELECT TOP 1 id, stock_lote
        FROM dbo.detalleEntradas
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
          AND UPPER(LTRIM(RTRIM(ISNULL(lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
          AND UPPER(LTRIM(RTRIM(ISNULL(casa_comercial, '')))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
          AND UPPER(LTRIM(RTRIM(ISNULL(codigoproveedor, '')))) = UPPER(LTRIM(RTRIM(@codigoproveedor)))
        ORDER BY id DESC
      `);

    let detalleCuarentenaId = null;

    if (loteCuarentenaResult.recordset.length) {
      detalleCuarentenaId = Number(loteCuarentenaResult.recordset[0].id);

      await new sql.Request(transaction)
        .input("id", sql.Int, detalleCuarentenaId)
        .input("cantidad", sql.Decimal(18, 4), cantidadMover)
        .input("vencimiento", sql.Date, vencimiento)
        .query(`
          UPDATE dbo.detalleEntradas
          SET
            stock_lote = ISNULL(stock_lote, 0) + @cantidad,
            vencimiento = ISNULL(@vencimiento, vencimiento)
          WHERE id = @id
        `);
    } else {
      const crearLoteCuarentena = await new sql.Request(transaction)
        .input("bodega", sql.VarChar, bodegaDestino)
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("codigo", sql.VarChar, invOrigen.codigo)
        .input("codigoproveedor", sql.VarChar, codigoProveedor)
        .input("producto", sql.VarChar, invOrigen.producto)
        .input("categoria", sql.VarChar, invOrigen.categoria || null)
        .input("cantidad", sql.Decimal(18, 4), cantidadMover)
        .input("stock_lote", sql.Decimal(18, 4), cantidadMover)
        .input("lote", sql.VarChar, lote)
        .input("vencimiento", sql.Date, vencimiento)
        .input("casa_comercial", sql.VarChar, casaComercial)
        .input("stock_minimo", sql.Int, 0)
        .input("ubicacion", sql.VarChar, null)
        .input("responsable", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, `Aislado desde ${bodegaOrigen}: ${motivoFinal}${observacionFinal ? " - " + observacionFinal : ""}`)
        .input("origen_movimiento", sql.VarChar, "INGRESO_CUARENTENA")
        .query(`
          INSERT INTO dbo.detalleEntradas (
            bodega, producto_id, codigo, codigoproveedor, producto, categoria,
            cantidad, stock_lote, lote, vencimiento, casa_comercial,
            stock_minimo, ubicacion, responsable, observacion, origen_movimiento
          )
          OUTPUT INSERTED.id
          VALUES (
            @bodega, @producto_id, @codigo, @codigoproveedor, @producto, @categoria,
            @cantidad, @stock_lote, @lote, @vencimiento, @casa_comercial,
            @stock_minimo, @ubicacion, @responsable, @observacion, @origen_movimiento
          )
        `);

      detalleCuarentenaId = Number(crearLoteCuarentena.recordset[0].id);
    }

    const movimientoResult = await new sql.Request(transaction)
      .input("tipo_movimiento", sql.VarChar, "INGRESO_CUARENTENA")
      .input("inventario_origen_id", sql.Int, inventarioOrigenId)
      .input("inventario_destino_id", sql.Int, inventarioCuarentenaId)
      .input("detalle_entrada_origen_id", sql.Int, Number(loteOrigen.id))
      .input("detalle_entrada_destino_id", sql.Int, detalleCuarentenaId)
      .input("codigo", sql.VarChar, invOrigen.codigo)
      .input("producto", sql.VarChar, invOrigen.producto)
      .input("lote", sql.VarChar, lote)
      .input("codigo_proveedor", sql.VarChar, codigoProveedor)
      .input("casa_comercial", sql.VarChar, casaComercial)
      .input("vencimiento", sql.Date, vencimiento)
      .input("cantidad", sql.Decimal(18, 4), cantidadMover)
      .input("bodega_origen", sql.VarChar, bodegaOrigen)
      .input("bodega_destino", sql.VarChar, bodegaDestino)
      .input("ubicacion_origen", sql.VarChar, ubicacionOrigen)
      .input("ubicacion_destino", sql.VarChar, null)
      .input("motivo", sql.VarChar, motivoFinal)
      .input("observacion", sql.VarChar, observacionFinal)
      .input("usuario_id", sql.Int, usuarioId)
      .input("usuario_nombre", sql.VarChar, usuarioNombre)
      .query(`
        INSERT INTO dbo.movimientos_cuarentena (
          tipo_movimiento, inventario_origen_id, inventario_destino_id,
          detalle_entrada_origen_id, detalle_entrada_destino_id,
          codigo, producto, lote, codigo_proveedor, casa_comercial, vencimiento,
          cantidad, bodega_origen, bodega_destino, ubicacion_origen, ubicacion_destino,
          motivo, observacion, usuario_id, usuario_nombre
        )
        OUTPUT INSERTED.id, INSERTED.fecha_movimiento
        VALUES (
          @tipo_movimiento, @inventario_origen_id, @inventario_destino_id,
          @detalle_entrada_origen_id, @detalle_entrada_destino_id,
          @codigo, @producto, @lote, @codigo_proveedor, @casa_comercial, @vencimiento,
          @cantidad, @bodega_origen, @bodega_destino, @ubicacion_origen, @ubicacion_destino,
          @motivo, @observacion, @usuario_id, @usuario_nombre
        )
      `);

    const movimientoId = Number(movimientoResult.recordset[0].id);
    const fechaMovimiento = movimientoResult.recordset[0].fecha_movimiento;

    let cantidadPendiente = cantidadMover;
    let valorConocido = 0;
    let cantidadCostoPendiente = 0;
    const capasMovidas = [];

    for (const capa of capasOrigen) {
      if (cantidadPendiente <= 0) break;

      const disponible = Number(capa.cantidad_disponible || 0);
      if (disponible <= 0) continue;

      const mover = Math.min(disponible, cantidadPendiente);
      const nuevoSaldo = disponible - mover;

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

      const valorMovimiento = costoUnitario === null ? null : mover * costoUnitario;

      if (valorMovimiento === null) {
        cantidadCostoPendiente += mover;
      } else {
        valorConocido += valorMovimiento;
      }

      const nuevaCapaResult = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("bodega", sql.VarChar, bodegaDestino)
        .input("lote", sql.VarChar, capa.lote || lote || null)
        .input("fecha_vencimiento", sql.Date, capa.fecha_vencimiento || vencimiento || null)
        .input("origen", sql.VarChar, "INGRESO_CUARENTENA")
        .input("origen_id", sql.Int, movimientoId)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("motivo_sin_costo", sql.VarChar, capa.motivo_sin_costo || null)
        .input("cantidad_original", sql.Decimal(18, 4), mover)
        .input("cantidad_disponible", sql.Decimal(18, 4), mover)
        .input("capa_origen_id", sql.Int, Number(capa.id))
        .input("proveedor_id", sql.Int, capa.proveedor_id || null)
        .input("referencia_documento", sql.VarChar, `CUARENTENA-${movimientoId}`)
        .input("observacion", sql.VarChar, `${motivoFinal}${observacionFinal ? " - " + observacionFinal : ""}`)
        .input("usuario_creacion", sql.VarChar, usuarioNombre)
        .input("fecha_entrada", sql.DateTime2, capa.fecha_entrada || fechaMovimiento)
        .input("codigo_proveedor", sql.VarChar, capa.codigo_proveedor || codigoProveedor || null)
        .input("casa_comercial", sql.VarChar, capa.casa_comercial || casaComercial || null)
        .query(`
          INSERT INTO dbo.capas_costo_inventario (
            producto_id, bodega, lote, fecha_vencimiento, origen, origen_id,
            estado_costo, costo_unitario, motivo_sin_costo, cantidad_original,
            cantidad_disponible, capa_origen_id, proveedor_id, referencia_documento,
            observacion, usuario_creacion, fecha_entrada, codigo_proveedor, casa_comercial
          )
          OUTPUT INSERTED.id
          VALUES (
            @producto_id, @bodega, @lote, @fecha_vencimiento, @origen, @origen_id,
            @estado_costo, @costo_unitario, @motivo_sin_costo, @cantidad_original,
            @cantidad_disponible, @capa_origen_id, @proveedor_id, @referencia_documento,
            @observacion, @usuario_creacion, @fecha_entrada, @codigo_proveedor, @casa_comercial
          )
        `);

      const capaDestinoId = Number(nuevaCapaResult.recordset[0].id);

      await new sql.Request(transaction)
        .input("capa_id", sql.Int, Number(capa.id))
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("tipo_movimiento", sql.VarChar, "CUARENTENA_SALIDA")
        .input("documento", sql.VarChar, `CUARENTENA-${movimientoId}`)
        .input("documento_id", sql.Int, movimientoId)
        .input("bodega_origen", sql.VarChar, bodegaOrigen)
        .input("bodega_destino", sql.VarChar, bodegaDestino)
        .input("lote", sql.VarChar, capa.lote || lote || null)
        .input("cantidad", sql.Decimal(18, 4), mover)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("usuario", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, motivoFinal)
        .query(`
          INSERT INTO dbo.movimientos_capas_costo (
            capa_id, producto_id, tipo_movimiento, documento, documento_id,
            bodega_origen, bodega_destino, lote, cantidad, costo_unitario,
            valor_movimiento, estado_costo, usuario, observacion
          )
          VALUES (
            @capa_id, @producto_id, @tipo_movimiento, @documento, @documento_id,
            @bodega_origen, @bodega_destino, @lote, @cantidad, @costo_unitario,
            @valor_movimiento, @estado_costo, @usuario, @observacion
          )
        `);

      await new sql.Request(transaction)
        .input("capa_id", sql.Int, capaDestinoId)
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("tipo_movimiento", sql.VarChar, "CUARENTENA_ENTRADA")
        .input("documento", sql.VarChar, `CUARENTENA-${movimientoId}`)
        .input("documento_id", sql.Int, movimientoId)
        .input("bodega_origen", sql.VarChar, bodegaOrigen)
        .input("bodega_destino", sql.VarChar, bodegaDestino)
        .input("lote", sql.VarChar, capa.lote || lote || null)
        .input("cantidad", sql.Decimal(18, 4), mover)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("usuario", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, motivoFinal)
        .query(`
          INSERT INTO dbo.movimientos_capas_costo (
            capa_id, producto_id, tipo_movimiento, documento, documento_id,
            bodega_origen, bodega_destino, lote, cantidad, costo_unitario,
            valor_movimiento, estado_costo, usuario, observacion
          )
          VALUES (
            @capa_id, @producto_id, @tipo_movimiento, @documento, @documento_id,
            @bodega_origen, @bodega_destino, @lote, @cantidad, @costo_unitario,
            @valor_movimiento, @estado_costo, @usuario, @observacion
          )
        `);

      capasMovidas.push({
        capa_origen_id: Number(capa.id),
        capa_destino_id: capaDestinoId,
        cantidad: mover,
        costo_unitario: costoUnitario,
        valor: valorMovimiento,
        estado_costo: capa.estado_costo
      });

      cantidadPendiente -= mover;
    }

    if (cantidadPendiente > 0.0001) {
      throw new AppError("No fue posible mover completamente las capas de costo.", 400);
    }

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, usuarioNombre)
        .input("modulo", sql.VarChar, "CUARENTENA")
        .input("accion", sql.VarChar, "MOVER A CUARENTENA")
        .input("detalle", sql.VarChar, `${invOrigen.codigo} | ${invOrigen.producto} | Lote: ${lote || "SIN LOTE"} | Cant: ${cantidadMover} | Motivo: ${motivoFinal}`)
        .query(`
          INSERT INTO dbo.auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: "Producto enviado a cuarentena correctamente.",
      movimiento_id: movimientoId,
      fecha_movimiento: fechaMovimiento,
      capas_costo: capasMovidas,
      resumen_costo: {
        cantidad: cantidadMover,
        valor_conocido: valorConocido,
        cantidad_costo_pendiente: cantidadCostoPendiente
      },
      producto: {
        codigo: invOrigen.codigo,
        nombre: invOrigen.producto,
        lote,
        vencimiento,
        cantidad: cantidadMover,
        origen: bodegaOrigen,
        destino: bodegaDestino
      }
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/**
 * Liberar stock desde CUARENTENA hacia una bodega operativa.
 */
const liberarCuarentena = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      inventarioId,
      detalleEntradaId,
      cantidad,
      destino,
      motivo,
      observacion
    } = req.body;

    const inventarioCuarentenaId = Number(inventarioId || 0);
    const detalleCuarentenaBaseId = Number(detalleEntradaId || 0);
    const cantidadLiberar = Number(cantidad || 0);
    const bodegaDestino = String(destino || "").trim();
    const motivoFinal = String(motivo || "Liberación autorizada").trim();
    const observacionFinal = String(observacion || "").trim() || null;

    if (!inventarioCuarentenaId) throw new AppError("Inventario de cuarentena no válido.", 400);
    if (!detalleCuarentenaBaseId) throw new AppError("Lote de cuarentena no válido.", 400);
    if (!Number.isFinite(cantidadLiberar) || cantidadLiberar <= 0) {
      throw new AppError("Ingrese una cantidad válida.", 400);
    }
    if (!bodegaDestino) throw new AppError("Seleccione la bodega destino.", 400);
    if (bodegaDestino.toUpperCase() === "CUARENTENA") {
      throw new AppError("La bodega destino no puede ser CUARENTENA.", 400);
    }

    const usuarioId = Number(req.session?.usuario?.id || req.session?.usuarioId || 0) || null;
    const usuarioNombre = String(
      req.session?.usuario?.username || req.session?.usuario?.nombreCompleto || "USUARIO"
    ).trim();

    await transaction.begin();

    const bodegaDestinoResult = await new sql.Request(transaction)
      .input("nombre", sql.VarChar, bodegaDestino)
      .query(`
        SELECT TOP 1 id, nombre, estado
        FROM dbo.bodegas
        WHERE
          UPPER(LTRIM(RTRIM(nombre))) = UPPER(LTRIM(RTRIM(@nombre)))
          AND UPPER(LTRIM(RTRIM(estado))) = 'ACTIVO'
          AND UPPER(LTRIM(RTRIM(nombre))) <> 'CUARENTENA'
      `);

    if (!bodegaDestinoResult.recordset.length) {
      throw new AppError("La bodega destino no existe o no se encuentra activa.", 400);
    }

    const bodegaDestinoReal = String(bodegaDestinoResult.recordset[0].nombre).trim();

    const invCuarentenaResult = await new sql.Request(transaction)
      .input("id", sql.Int, inventarioCuarentenaId)
      .query(`
        SELECT TOP 1
          i.id,
          i.producto_id,
          i.bodega,
          i.stock,
          i.stock_minimo,
          i.ubicacion,
          p.codigo,
          p.producto,
          p.categoria,
          p.unidad
        FROM dbo.inventario i
        WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.productos p ON p.id = i.producto_id
        WHERE i.id = @id
      `);

    if (!invCuarentenaResult.recordset.length) {
      throw new AppError("Inventario de cuarentena no encontrado.", 404);
    }

    const invCuarentena = invCuarentenaResult.recordset[0];

    if (String(invCuarentena.bodega || "").trim().toUpperCase() !== "CUARENTENA") {
      throw new AppError("El producto seleccionado no pertenece a CUARENTENA.", 400);
    }

    if (Number(invCuarentena.stock || 0) < cantidadLiberar) {
      throw new AppError("Stock general insuficiente en CUARENTENA.", 400);
    }

    const loteBaseResult = await new sql.Request(transaction)
      .input("id", sql.Int, detalleCuarentenaBaseId)
      .query(`
        SELECT TOP 1
          id, bodega, producto_id, codigo, codigoproveedor,
          producto, categoria, lote, vencimiento, casa_comercial,
          stock_minimo, ubicacion
        FROM dbo.detalleEntradas
        WHERE id = @id
      `);

    if (!loteBaseResult.recordset.length) {
      throw new AppError("Lote de cuarentena no encontrado.", 404);
    }

    const loteBase = loteBaseResult.recordset[0];

    if (String(loteBase.bodega || "").trim().toUpperCase() !== "CUARENTENA") {
      throw new AppError("El lote seleccionado no pertenece a CUARENTENA.", 400);
    }

    if (Number(loteBase.producto_id) !== Number(invCuarentena.producto_id)) {
      throw new AppError("El lote no corresponde al producto seleccionado.", 400);
    }

    const loteCuarentenaResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(loteBase.producto_id))
      .input("bodega", sql.VarChar, "CUARENTENA")
      .input("lote", sql.VarChar, loteBase.lote || "")
      .input("codigoproveedor", sql.VarChar, loteBase.codigoproveedor || "")
      .input("casa_comercial", sql.VarChar, loteBase.casa_comercial || "")
      .query(`
        SELECT TOP 1
          id, bodega, producto_id, codigo, codigoproveedor,
          producto, categoria, cantidad, stock_lote, lote,
          vencimiento, casa_comercial, stock_minimo, ubicacion,
          responsable, observacion, origen_movimiento
        FROM dbo.detalleEntradas
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = 'CUARENTENA'
          AND UPPER(LTRIM(RTRIM(ISNULL(lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
          AND UPPER(LTRIM(RTRIM(ISNULL(codigoproveedor, '')))) = UPPER(LTRIM(RTRIM(@codigoproveedor)))
          AND UPPER(LTRIM(RTRIM(ISNULL(casa_comercial, '')))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
        ORDER BY id DESC
      `);

    if (!loteCuarentenaResult.recordset.length) {
      throw new AppError("No se encontró el saldo vigente del lote en CUARENTENA.", 400);
    }

    const loteCuarentena = loteCuarentenaResult.recordset[0];

    if (Number(loteCuarentena.stock_lote || 0) < cantidadLiberar) {
      throw new AppError(`Stock insuficiente en el lote ${loteCuarentena.lote || ""}.`, 400);
    }

    const lote = loteCuarentena.lote || null;
    const vencimiento = loteCuarentena.vencimiento || null;
    const casaComercial = loteCuarentena.casa_comercial || null;
    const codigoProveedor = loteCuarentena.codigoproveedor || null;
    const ubicacionOrigen = loteCuarentena.ubicacion || invCuarentena.ubicacion || null;

    const capasResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
      .input("lote", sql.VarChar, lote || "")
      .query(`
        SELECT
          c.id, c.cantidad_disponible, c.estado_costo, c.costo_unitario,
          c.motivo_sin_costo, c.lote, c.fecha_vencimiento, c.fecha_entrada,
          c.proveedor_id, c.codigo_proveedor, c.casa_comercial,
          c.referencia_documento, c.origen, c.origen_id, c.capa_origen_id
        FROM dbo.capas_costo_inventario c
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          c.producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(c.bodega))) = 'CUARENTENA'
          AND UPPER(LTRIM(RTRIM(ISNULL(c.lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
          AND c.cantidad_disponible > 0
        ORDER BY
          c.fecha_entrada ASC,
          c.id ASC
      `);

    const capasCuarentena = capasResult.recordset || [];
    const totalCapasDisponible = capasCuarentena.reduce(
      (total, capa) => total + Number(capa.cantidad_disponible || 0),
      0
    );

    if (totalCapasDisponible < cantidadLiberar) {
      throw new AppError(`Las capas de costo del lote en CUARENTENA solo tienen ${totalCapasDisponible} unidades disponibles.`, 400);
    }

    const invDestinoResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
      .input("bodega", sql.VarChar, bodegaDestinoReal)
      .query(`
        SELECT TOP 1 id, stock, ubicacion
        FROM dbo.inventario
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
      `);

    let inventarioDestinoId = null;
    let ubicacionDestino = null;

    if (invDestinoResult.recordset.length) {
      const existente = invDestinoResult.recordset[0];
      inventarioDestinoId = Number(existente.id);
      ubicacionDestino = existente.ubicacion || null;

      await new sql.Request(transaction)
        .input("id", sql.Int, inventarioDestinoId)
        .input("cantidad", sql.Decimal(18, 4), cantidadLiberar)
        .input("responsable", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, `Liberado desde CUARENTENA${observacionFinal ? " - " + observacionFinal : ""}`)
        .query(`
          UPDATE dbo.inventario
          SET
            stock = ISNULL(stock, 0) + @cantidad,
            responsable = @responsable,
            observacion = @observacion,
            fecha_actualizacion = GETDATE()
          WHERE id = @id
        `);
    } else {
      const crearDestino = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
        .input("bodega", sql.VarChar, bodegaDestinoReal)
        .input("stock", sql.Decimal(18, 4), cantidadLiberar)
        .input("stock_minimo", sql.Int, Number(invCuarentena.stock_minimo || 0))
        .input("ubicacion", sql.VarChar, null)
        .input("responsable", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, `Liberado desde CUARENTENA${observacionFinal ? " - " + observacionFinal : ""}`)
        .query(`
          INSERT INTO dbo.inventario (
            producto_id, bodega, stock, stock_minimo, ubicacion, responsable, observacion
          )
          OUTPUT INSERTED.id
          VALUES (
            @producto_id, @bodega, @stock, @stock_minimo, @ubicacion, @responsable, @observacion
          )
        `);

      inventarioDestinoId = Number(crearDestino.recordset[0].id);
    }

    const descontarInventario = await new sql.Request(transaction)
      .input("id", sql.Int, inventarioCuarentenaId)
      .input("cantidad", sql.Decimal(18, 4), cantidadLiberar)
      .query(`
        UPDATE dbo.inventario
        SET
          stock = ISNULL(stock, 0) - @cantidad,
          fecha_actualizacion = GETDATE()
        WHERE
          id = @id
          AND ISNULL(stock, 0) >= @cantidad
      `);

    if (!descontarInventario.rowsAffected?.[0]) {
      throw new AppError("No fue posible descontar el inventario de CUARENTENA.", 400);
    }

    const descontarLote = await new sql.Request(transaction)
      .input("id", sql.Int, Number(loteCuarentena.id))
      .input("cantidad", sql.Decimal(18, 4), cantidadLiberar)
      .query(`
        UPDATE dbo.detalleEntradas
        SET
          stock_lote = ISNULL(stock_lote, 0) - @cantidad
        WHERE
          id = @id
          AND ISNULL(stock_lote, 0) >= @cantidad
      `);

    if (!descontarLote.rowsAffected?.[0]) {
      throw new AppError("No fue posible descontar el lote de CUARENTENA.", 400);
    }

    const loteDestinoResult = await new sql.Request(transaction)
      .input("bodega", sql.VarChar, bodegaDestinoReal)
      .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
      .input("lote", sql.VarChar, lote || "")
      .input("casa_comercial", sql.VarChar, casaComercial || "")
      .input("codigoproveedor", sql.VarChar, codigoProveedor || "")
      .query(`
        SELECT TOP 1 id, stock_lote, vencimiento
        FROM dbo.detalleEntradas
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
          AND UPPER(LTRIM(RTRIM(ISNULL(lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
          AND UPPER(LTRIM(RTRIM(ISNULL(casa_comercial, '')))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
          AND UPPER(LTRIM(RTRIM(ISNULL(codigoproveedor, '')))) = UPPER(LTRIM(RTRIM(@codigoproveedor)))
        ORDER BY id DESC
      `);

    let detalleDestinoId = null;

    if (loteDestinoResult.recordset.length) {
      detalleDestinoId = Number(loteDestinoResult.recordset[0].id);

      await new sql.Request(transaction)
        .input("id", sql.Int, detalleDestinoId)
        .input("cantidad", sql.Decimal(18, 4), cantidadLiberar)
        .input("vencimiento", sql.Date, vencimiento)
        .query(`
          UPDATE dbo.detalleEntradas
          SET
            stock_lote = ISNULL(stock_lote, 0) + @cantidad,
            vencimiento = ISNULL(@vencimiento, vencimiento)
          WHERE id = @id
        `);
    } else {
      const crearLote = await new sql.Request(transaction)
        .input("bodega", sql.VarChar, bodegaDestinoReal)
        .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
        .input("codigo", sql.VarChar, invCuarentena.codigo)
        .input("codigoproveedor", sql.VarChar, codigoProveedor)
        .input("producto", sql.VarChar, invCuarentena.producto)
        .input("categoria", sql.VarChar, invCuarentena.categoria || null)
        .input("cantidad", sql.Decimal(18, 4), cantidadLiberar)
        .input("stock_lote", sql.Decimal(18, 4), cantidadLiberar)
        .input("lote", sql.VarChar, lote)
        .input("vencimiento", sql.Date, vencimiento)
        .input("casa_comercial", sql.VarChar, casaComercial)
        .input("stock_minimo", sql.Int, Number(invCuarentena.stock_minimo || 0))
        .input("ubicacion", sql.VarChar, ubicacionDestino)
        .input("responsable", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, `Liberación desde CUARENTENA${observacionFinal ? " - " + observacionFinal : ""}`)
        .input("origen_movimiento", sql.VarChar, "LIBERACION_CUARENTENA")
        .query(`
          INSERT INTO dbo.detalleEntradas (
            bodega, producto_id, codigo, codigoproveedor, producto, categoria,
            cantidad, stock_lote, lote, vencimiento, casa_comercial,
            stock_minimo, ubicacion, responsable, observacion, origen_movimiento
          )
          OUTPUT INSERTED.id
          VALUES (
            @bodega, @producto_id, @codigo, @codigoproveedor, @producto, @categoria,
            @cantidad, @stock_lote, @lote, @vencimiento, @casa_comercial,
            @stock_minimo, @ubicacion, @responsable, @observacion, @origen_movimiento
          )
        `);

      detalleDestinoId = Number(crearLote.recordset[0].id);
    }

    const movimientoResult = await new sql.Request(transaction)
      .input("tipo_movimiento", sql.VarChar, "LIBERACION")
      .input("inventario_origen_id", sql.Int, inventarioCuarentenaId)
      .input("inventario_destino_id", sql.Int, inventarioDestinoId)
      .input("detalle_entrada_origen_id", sql.Int, Number(loteCuarentena.id))
      .input("detalle_entrada_destino_id", sql.Int, detalleDestinoId)
      .input("codigo", sql.VarChar, invCuarentena.codigo)
      .input("producto", sql.VarChar, invCuarentena.producto)
      .input("lote", sql.VarChar, lote)
      .input("codigo_proveedor", sql.VarChar, codigoProveedor)
      .input("casa_comercial", sql.VarChar, casaComercial)
      .input("vencimiento", sql.Date, vencimiento)
      .input("cantidad", sql.Decimal(18, 4), cantidadLiberar)
      .input("bodega_origen", sql.VarChar, "CUARENTENA")
      .input("bodega_destino", sql.VarChar, bodegaDestinoReal)
      .input("ubicacion_origen", sql.VarChar, ubicacionOrigen)
      .input("ubicacion_destino", sql.VarChar, ubicacionDestino)
      .input("motivo", sql.VarChar, motivoFinal)
      .input("observacion", sql.VarChar, observacionFinal)
      .input("usuario_id", sql.Int, usuarioId)
      .input("usuario_nombre", sql.VarChar, usuarioNombre)
      .query(`
        INSERT INTO dbo.movimientos_cuarentena (
          tipo_movimiento, inventario_origen_id, inventario_destino_id,
          detalle_entrada_origen_id, detalle_entrada_destino_id,
          codigo, producto, lote, codigo_proveedor, casa_comercial, vencimiento,
          cantidad, bodega_origen, bodega_destino, ubicacion_origen, ubicacion_destino,
          motivo, observacion, usuario_id, usuario_nombre
        )
        OUTPUT INSERTED.id, INSERTED.fecha_movimiento
        VALUES (
          @tipo_movimiento, @inventario_origen_id, @inventario_destino_id,
          @detalle_entrada_origen_id, @detalle_entrada_destino_id,
          @codigo, @producto, @lote, @codigo_proveedor, @casa_comercial, @vencimiento,
          @cantidad, @bodega_origen, @bodega_destino, @ubicacion_origen, @ubicacion_destino,
          @motivo, @observacion, @usuario_id, @usuario_nombre
        )
      `);

    const movimientoId = Number(movimientoResult.recordset[0].id);
    const fechaMovimiento = movimientoResult.recordset[0].fecha_movimiento;

    let cantidadPendiente = cantidadLiberar;
    let valorConocido = 0;
    let cantidadCostoPendiente = 0;
    const capasMovidas = [];

    for (const capa of capasCuarentena) {
      if (cantidadPendiente <= 0) break;

      const disponible = Number(capa.cantidad_disponible || 0);
      if (disponible <= 0) continue;

      const mover = Math.min(disponible, cantidadPendiente);
      const nuevoSaldo = disponible - mover;

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

      const valorMovimiento = costoUnitario === null ? null : mover * costoUnitario;

      if (valorMovimiento === null) {
        cantidadCostoPendiente += mover;
      } else {
        valorConocido += valorMovimiento;
      }

      const nuevaCapaResult = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
        .input("bodega", sql.VarChar, bodegaDestinoReal)
        .input("lote", sql.VarChar, capa.lote || lote || null)
        .input("fecha_vencimiento", sql.Date, capa.fecha_vencimiento || vencimiento || null)
        .input("origen", sql.VarChar, "LIBERACION_CUARENTENA")
        .input("origen_id", sql.Int, movimientoId)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("motivo_sin_costo", sql.VarChar, capa.motivo_sin_costo || null)
        .input("cantidad_original", sql.Decimal(18, 4), mover)
        .input("cantidad_disponible", sql.Decimal(18, 4), mover)
        .input("capa_origen_id", sql.Int, Number(capa.id))
        .input("proveedor_id", sql.Int, capa.proveedor_id || null)
        .input("referencia_documento", sql.VarChar, `LIBERACION-${movimientoId}`)
        .input("observacion", sql.VarChar, `${motivoFinal}${observacionFinal ? " - " + observacionFinal : ""}`)
        .input("usuario_creacion", sql.VarChar, usuarioNombre)
        .input("fecha_entrada", sql.DateTime2, capa.fecha_entrada || fechaMovimiento)
        .input("codigo_proveedor", sql.VarChar, capa.codigo_proveedor || codigoProveedor || null)
        .input("casa_comercial", sql.VarChar, capa.casa_comercial || casaComercial || null)
        .query(`
          INSERT INTO dbo.capas_costo_inventario (
            producto_id, bodega, lote, fecha_vencimiento, origen, origen_id,
            estado_costo, costo_unitario, motivo_sin_costo, cantidad_original,
            cantidad_disponible, capa_origen_id, proveedor_id, referencia_documento,
            observacion, usuario_creacion, fecha_entrada, codigo_proveedor, casa_comercial
          )
          OUTPUT INSERTED.id
          VALUES (
            @producto_id, @bodega, @lote, @fecha_vencimiento, @origen, @origen_id,
            @estado_costo, @costo_unitario, @motivo_sin_costo, @cantidad_original,
            @cantidad_disponible, @capa_origen_id, @proveedor_id, @referencia_documento,
            @observacion, @usuario_creacion, @fecha_entrada, @codigo_proveedor, @casa_comercial
          )
        `);

      const capaDestinoId = Number(nuevaCapaResult.recordset[0].id);

      await new sql.Request(transaction)
        .input("capa_id", sql.Int, Number(capa.id))
        .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
        .input("tipo_movimiento", sql.VarChar, "LIBERACION_SALIDA")
        .input("documento", sql.VarChar, `LIBERACION-${movimientoId}`)
        .input("documento_id", sql.Int, movimientoId)
        .input("bodega_origen", sql.VarChar, "CUARENTENA")
        .input("bodega_destino", sql.VarChar, bodegaDestinoReal)
        .input("lote", sql.VarChar, capa.lote || lote || null)
        .input("cantidad", sql.Decimal(18, 4), mover)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("usuario", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, motivoFinal)
        .query(`
          INSERT INTO dbo.movimientos_capas_costo (
            capa_id, producto_id, tipo_movimiento, documento, documento_id,
            bodega_origen, bodega_destino, lote, cantidad, costo_unitario,
            valor_movimiento, estado_costo, usuario, observacion
          )
          VALUES (
            @capa_id, @producto_id, @tipo_movimiento, @documento, @documento_id,
            @bodega_origen, @bodega_destino, @lote, @cantidad, @costo_unitario,
            @valor_movimiento, @estado_costo, @usuario, @observacion
          )
        `);

      await new sql.Request(transaction)
        .input("capa_id", sql.Int, capaDestinoId)
        .input("producto_id", sql.Int, Number(invCuarentena.producto_id))
        .input("tipo_movimiento", sql.VarChar, "LIBERACION_ENTRADA")
        .input("documento", sql.VarChar, `LIBERACION-${movimientoId}`)
        .input("documento_id", sql.Int, movimientoId)
        .input("bodega_origen", sql.VarChar, "CUARENTENA")
        .input("bodega_destino", sql.VarChar, bodegaDestinoReal)
        .input("lote", sql.VarChar, capa.lote || lote || null)
        .input("cantidad", sql.Decimal(18, 4), mover)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("usuario", sql.VarChar, usuarioNombre)
        .input("observacion", sql.VarChar, motivoFinal)
        .query(`
          INSERT INTO dbo.movimientos_capas_costo (
            capa_id, producto_id, tipo_movimiento, documento, documento_id,
            bodega_origen, bodega_destino, lote, cantidad, costo_unitario,
            valor_movimiento, estado_costo, usuario, observacion
          )
          VALUES (
            @capa_id, @producto_id, @tipo_movimiento, @documento, @documento_id,
            @bodega_origen, @bodega_destino, @lote, @cantidad, @costo_unitario,
            @valor_movimiento, @estado_costo, @usuario, @observacion
          )
        `);

      capasMovidas.push({
        capa_origen_id: Number(capa.id),
        capa_destino_id: capaDestinoId,
        cantidad: mover,
        costo_unitario: costoUnitario,
        valor: valorMovimiento,
        estado_costo: capa.estado_costo
      });

      cantidadPendiente -= mover;
    }

    if (cantidadPendiente > 0.0001) {
      throw new AppError("No fue posible liberar completamente las capas de costo.", 400);
    }

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, usuarioNombre)
        .input("modulo", sql.VarChar, "CUARENTENA")
        .input("accion", sql.VarChar, "LIBERAR DE CUARENTENA")
        .input("detalle", sql.VarChar, `${invCuarentena.codigo} | ${invCuarentena.producto} | Lote: ${lote || "SIN LOTE"} | Cantidad: ${cantidadLiberar} | Destino: ${bodegaDestinoReal}`)
        .query(`
          INSERT INTO dbo.auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: "Producto liberado de cuarentena correctamente.",
      movimiento_id: movimientoId,
      fecha_movimiento: fechaMovimiento,
      capas_costo: capasMovidas,
      resumen_costo: {
        cantidad: cantidadLiberar,
        valor_conocido: valorConocido,
        cantidad_costo_pendiente: cantidadCostoPendiente
      },
      producto: {
        codigo: invCuarentena.codigo,
        nombre: invCuarentena.producto,
        lote,
        vencimiento,
        cantidad: cantidadLiberar,
        origen: "CUARENTENA",
        destino: bodegaDestinoReal
      }
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

module.exports = {
  listarCuarentena,
  listarBodegasDestinoCuarentena,
  moverACuarentena,
  liberarCuarentena
};
