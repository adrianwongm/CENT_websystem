const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Obtener el siguiente número secuencial de compra (ej: COMP-1001).
 */
const obtenerSiguienteNumeroCompra = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT TOP 1
      numero_compra
    FROM dbo.compras
    ORDER BY id DESC
  `);

  let siguiente = 1000;

  if (result.recordset.length) {
    const ultimo = String(result.recordset[0].numero_compra || "");
    const match = ultimo.match(/COMP-(\d+)/i);
    if (match) {
      siguiente = Number(match[1]) + 1;
    }
  }

  res.json({
    numero: `COMP-${siguiente}`
  });
};

/**
 * Registrar compra con detalles, actualización de inventario y capas de costo PEPS/FIFO.
 */
const registrarCompra = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      numero_compra,
      proveedor_id,
      numero_factura,
      fecha_compra,
      bodega,
      responsable,
      observacion,
      subtotal_0,
      subtotal_15,
      iva_15,
      total,
      detalle
    } = req.body;

    const bodegaFinal = String(bodega || "").trim();
    const responsableFinal = String(
      responsable || req.session.usuario?.username || ""
    ).trim();

    /* =====================================================
       1. VALIDACIONES PRINCIPALES
       ===================================================== */
    if (!proveedor_id || !numero_factura || !fecha_compra || !bodegaFinal) {
      throw new AppError("Datos principales incompletos", 400);
    }

    if (!Array.isArray(detalle) || !detalle.length) {
      throw new AppError("Debe agregar al menos un artículo", 400);
    }

    await transaction.begin();

    /* =====================================================
       2. VALIDAR BODEGA
       ===================================================== */
    const bodegaResult = await new sql.Request(transaction)
      .input("nombre", sql.VarChar, bodegaFinal)
      .query(`
        SELECT TOP 1
          id,
          nombre,
          estado
        FROM dbo.bodegas
        WHERE
          UPPER(LTRIM(RTRIM(nombre))) = UPPER(LTRIM(RTRIM(@nombre)))
          AND UPPER(LTRIM(RTRIM(estado))) = 'ACTIVO'
          AND UPPER(LTRIM(RTRIM(nombre))) <> 'CUARENTENA'
      `);

    if (!bodegaResult.recordset.length) {
      throw new AppError("La bodega seleccionada no existe, está inactiva o no admite compras.", 400);
    }

    const nombreBodegaReal = String(bodegaResult.recordset[0].nombre).trim();

    /* =====================================================
       3. VALIDAR PROVEEDOR
       ===================================================== */
    const proveedorResult = await new sql.Request(transaction)
      .input("id", sql.Int, Number(proveedor_id))
      .query(`
        SELECT TOP 1
          id,
          nombre,
          ruc,
          estado
        FROM dbo.proveedores
        WHERE id = @id
      `);

    if (!proveedorResult.recordset.length) {
      throw new AppError("Proveedor no encontrado", 404);
    }

    const proveedor = proveedorResult.recordset[0];

    if (String(proveedor.estado || "").trim().toUpperCase() !== "ACTIVO") {
      throw new AppError("El proveedor está inactivo", 400);
    }

    /* =====================================================
       4. NÚMERO DE COMPRA
       ===================================================== */
    const numeroFinal =
      numero_compra && String(numero_compra).trim()
        ? String(numero_compra).trim()
        : `COMP-${Date.now()}`;

    /* =====================================================
       5. INSERTAR CABECERA DE COMPRA
       ===================================================== */
    const compraResult = await new sql.Request(transaction)
      .input("numero_compra", sql.VarChar, numeroFinal)
      .input("proveedor_id", sql.Int, Number(proveedor.id))
      .input("nombre_proveedor", sql.VarChar, proveedor.nombre)
      .input("ruc_proveedor", sql.VarChar, proveedor.ruc)
      .input("numero_factura", sql.VarChar, String(numero_factura).trim())
      .input("fecha_compra", sql.Date, fecha_compra)
      .input("bodega", sql.VarChar, nombreBodegaReal)
      .input("subtotal_0", sql.Decimal(18, 2), Number(subtotal_0 || 0))
      .input("subtotal_15", sql.Decimal(18, 2), Number(subtotal_15 || 0))
      .input("iva_15", sql.Decimal(18, 2), Number(iva_15 || 0))
      .input("total", sql.Decimal(18, 2), Number(total || 0))
      .input("responsable", sql.VarChar, responsableFinal)
      .input("observacion", sql.VarChar, observacion || null)
      .query(`
        INSERT INTO dbo.compras (
          numero_compra,
          proveedor_id,
          nombre_proveedor,
          ruc_proveedor,
          numero_factura,
          fecha_compra,
          bodega,
          subtotal_0,
          subtotal_15,
          iva_15,
          total,
          responsable,
          observacion
        )
        OUTPUT INSERTED.id
        VALUES (
          @numero_compra,
          @proveedor_id,
          @nombre_proveedor,
          @ruc_proveedor,
          @numero_factura,
          @fecha_compra,
          @bodega,
          @subtotal_0,
          @subtotal_15,
          @iva_15,
          @total,
          @responsable,
          @observacion
        )
      `);

    const compraId = Number(compraResult.recordset[0].id);

    /* =====================================================
       6. RECORRER ARTÍCULOS
       ===================================================== */
    for (const item of detalle) {
      const productoId = Number(item.producto_id || 0);
      const cantidad = Number(item.cantidad || 0);
      const precioUnitario = Number(item.precio_unitario);
      const lote = String(item.lote || "").trim();
      const codigoProveedor = String(item.codigo_vendedor || "").trim();
      const manejaLote = lote !== "";

      if (
        !productoId ||
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(precioUnitario) ||
        precioUnitario < 0
      ) {
        throw new AppError("Detalle de compra no válido", 400);
      }

      /* ===================================================
         7. PRODUCTO
         =================================================== */
      const productoResult = await new sql.Request(transaction)
        .input("id", sql.Int, productoId)
        .query(`
          SELECT TOP 1
            id,
            codigo,
            producto,
            categoria,
            unidad
          FROM dbo.productos
          WHERE id = @id
        `);

      if (!productoResult.recordset.length) {
        throw new AppError("Producto no encontrado", 404);
      }

      const prod = productoResult.recordset[0];

      /* ===================================================
         8. INSERTAR DETALLE DE COMPRA
         =================================================== */
      const detalleCompraResult = await new sql.Request(transaction)
        .input("compra_id", sql.Int, compraId)
        .input("producto_id", sql.Int, productoId)
        .input("codigo", sql.VarChar, prod.codigo)
        .input("producto", sql.VarChar, prod.producto)
        .input("categoria", sql.VarChar, prod.categoria || null)
        .input("cantidad", sql.Int, cantidad)
        .input("precio_unitario", sql.Decimal(18, 4), precioUnitario)
        .input("aplica_iva", sql.Bit, item.aplica_iva ? 1 : 0)
        .input("subtotal", sql.Decimal(18, 2), Number(item.subtotal || 0))
        .input("iva", sql.Decimal(18, 2), Number(item.iva || 0))
        .input("total", sql.Decimal(18, 2), Number(item.total || 0))
        .input("lote", sql.VarChar, lote || null)
        .input("codigo_vendedor", sql.VarChar, codigoProveedor || null)
        .input("fecha_vencimiento", sql.Date, item.fecha_vencimiento || null)
        .query(`
          INSERT INTO dbo.compras_detalle (
            compra_id,
            producto_id,
            codigo,
            producto,
            categoria,
            cantidad,
            precio_unitario,
            aplica_iva,
            subtotal,
            iva,
            total,
            lote,
            codigo_vendedor,
            fecha_vencimiento
          )
          OUTPUT INSERTED.id
          VALUES (
            @compra_id,
            @producto_id,
            @codigo,
            @producto,
            @categoria,
            @cantidad,
            @precio_unitario,
            @aplica_iva,
            @subtotal,
            @iva,
            @total,
            @lote,
            @codigo_vendedor,
            @fecha_vencimiento
          )
        `);

      const detalleCompraId = Number(detalleCompraResult.recordset[0].id);

      /* ===================================================
         9. BUSCAR INVENTARIO GENERAL
         =================================================== */
      const inventarioExistente = await new sql.Request(transaction)
        .input("producto_id", sql.Int, productoId)
        .input("bodega", sql.VarChar, nombreBodegaReal)
        .query(`
          SELECT TOP 1
            id,
            stock,
            stock_minimo,
            ubicacion
          FROM dbo.inventario
          WITH (UPDLOCK, HOLDLOCK)
          WHERE
            producto_id = @producto_id
            AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
        `);

      if (inventarioExistente.recordset.length) {
        const inventarioId = Number(inventarioExistente.recordset[0].id);

        await new sql.Request(transaction)
          .input("id", sql.Int, inventarioId)
          .input("cantidad", sql.Int, cantidad)
          .input("responsable", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, `Compra ${numeroFinal}`)
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
        await new sql.Request(transaction)
          .input("producto_id", sql.Int, productoId)
          .input("bodega", sql.VarChar, nombreBodegaReal)
          .input("stock", sql.Int, cantidad)
          .input("stock_minimo", sql.Int, 0)
          .input("ubicacion", sql.VarChar, null)
          .input("responsable", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, `Compra ${numeroFinal}`)
          .query(`
            INSERT INTO dbo.inventario (
              producto_id,
              bodega,
              stock,
              stock_minimo,
              ubicacion,
              responsable,
              observacion
            )
            VALUES (
              @producto_id,
              @bodega,
              @stock,
              @stock_minimo,
              @ubicacion,
              @responsable,
              @observacion
            )
          `);
      }

      /* ===================================================
         12. CONTROL FÍSICO DE LOTE
         =================================================== */
      let vencimientoFinal = manejaLote ? (item.fecha_vencimiento || null) : null;

      if (manejaLote) {
        const lotePrevioResult = await new sql.Request(transaction)
          .input("bodega", sql.VarChar, nombreBodegaReal)
          .input("producto_id", sql.Int, productoId)
          .input("lote", sql.VarChar, lote)
          .input("codigoproveedor", sql.VarChar, codigoProveedor)
          .input("casa_comercial", sql.VarChar, proveedor.nombre || "")
          .query(`
            SELECT TOP 1
              id,
              stock_lote,
              vencimiento
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

        let stockLoteFinal = cantidad;

        if (lotePrevioResult.recordset.length) {
          const lotePrevio = lotePrevioResult.recordset[0];
          stockLoteFinal = Number(lotePrevio.stock_lote || 0) + cantidad;
          if (!vencimientoFinal && lotePrevio.vencimiento) {
            vencimientoFinal = lotePrevio.vencimiento;
          }
        } else {
          if (!vencimientoFinal) {
            throw new AppError(`Ingrese fecha de vencimiento para el lote ${lote} de ${prod.producto}`, 400);
          }
        }

        /* REGISTRAR NUEVO ESTADO DEL LOTE */
        await new sql.Request(transaction)
          .input("bodega", sql.VarChar, nombreBodegaReal)
          .input("producto_id", sql.Int, productoId)
          .input("codigo", sql.VarChar, prod.codigo)
          .input("codigoproveedor", sql.VarChar, codigoProveedor || null)
          .input("producto", sql.VarChar, prod.producto)
          .input("categoria", sql.VarChar, prod.categoria || null)
          .input("cantidad", sql.Int, cantidad)
          .input("stock_lote", sql.Int, stockLoteFinal)
          .input("lote", sql.VarChar, lote)
          .input("vencimiento", sql.Date, vencimientoFinal)
          .input("casa_comercial", sql.VarChar, proveedor.nombre || null)
          .input("stock_minimo", sql.Int, Number(inventarioExistente.recordset?.[0]?.stock_minimo || 0))
          .input("ubicacion", sql.VarChar, inventarioExistente.recordset?.[0]?.ubicacion || null)
          .input("responsable", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, `Compra ${numeroFinal}`)
          .input("origen_movimiento", sql.VarChar, "COMPRA")
          .query(`
            INSERT INTO dbo.detalleEntradas (
              bodega,
              producto_id,
              codigo,
              codigoproveedor,
              producto,
              categoria,
              cantidad,
              stock_lote,
              lote,
              vencimiento,
              casa_comercial,
              stock_minimo,
              ubicacion,
              responsable,
              observacion,
              origen_movimiento
            )
            VALUES (
              @bodega,
              @producto_id,
              @codigo,
              @codigoproveedor,
              @producto,
              @categoria,
              @cantidad,
              @stock_lote,
              @lote,
              @vencimiento,
              @casa_comercial,
              @stock_minimo,
              @ubicacion,
              @responsable,
              @observacion,
              @origen_movimiento
            )
          `);
      }

      /* ===================================================
         13. CREAR CAPA DE COSTO (PEPS/FIFO)
         =================================================== */
      const estadoCostoCapa = precioUnitario > 0 ? "CONOCIDO" : "SIN_COSTO";
      const motivoSinCostoCapa = precioUnitario === 0 ? "BONIFICACION" : null;

      await new sql.Request(transaction)
        .input("producto_id", sql.Int, productoId)
        .input("bodega", sql.VarChar, nombreBodegaReal)
        .input("lote", sql.VarChar, manejaLote ? lote : null)
        .input("fecha_vencimiento", sql.Date, manejaLote ? vencimientoFinal : null)
        .input("origen", sql.VarChar, "COMPRA")
        .input("origen_id", sql.Int, detalleCompraId)
        .input("estado_costo", sql.VarChar, estadoCostoCapa)
        .input("costo_unitario", sql.Decimal(18, 6), precioUnitario)
        .input("motivo_sin_costo", sql.VarChar, motivoSinCostoCapa)
        .input("cantidad_original", sql.Decimal(18, 4), cantidad)
        .input("cantidad_disponible", sql.Decimal(18, 4), cantidad)
        .input("proveedor_id", sql.Int, Number(proveedor.id))
        .input("referencia_documento", sql.VarChar, String(numero_factura).trim())
        .input("observacion", sql.VarChar, `Compra ${numeroFinal}`)
        .input("usuario_creacion", sql.VarChar, responsableFinal)
        .input("fecha_entrada", sql.DateTime2, new Date(`${fecha_compra}T12:00:00`))
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
            proveedor_id,
            referencia_documento,
            observacion,
            usuario_creacion,
            fecha_entrada
          )
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
            @proveedor_id,
            @referencia_documento,
            @observacion,
            @usuario_creacion,
            @fecha_entrada
          )
        `);
    }

    /* =====================================================
       14. AUDITORÍA
       ===================================================== */
    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session.usuario.username)
        .input("modulo", sql.VarChar, "COMPRAS")
        .input("accion", sql.VarChar, "REGISTRAR COMPRA")
        .input("detalle", sql.VarChar, numeroFinal)
        .query(`
          INSERT INTO dbo.auditoria_eventos (
            usuario,
            modulo,
            accion,
            detalle
          )
          VALUES (
            @usuario,
            @modulo,
            @accion,
            @detalle
          )
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({
      ok: true,
      numero_compra: numeroFinal,
      compra_id: compraId
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe una compra con esa factura para ese proveedor", 400);
    }

    throw error;
  }
};

/**
 * Listar todas las compras registradas.
 */
const listarCompras = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      numero_compra,
      proveedor_id,
      nombre_proveedor,
      ruc_proveedor,
      numero_factura,
      CONVERT(VARCHAR(10), fecha_compra, 23) AS fecha_compra,
      bodega,
      subtotal_0,
      subtotal_15,
      iva_15,
      total,
      responsable,
      observacion,
      fecha_creacion
    FROM dbo.compras
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Obtener detalle y cabecera de una compra específica.
 */
const obtenerDetalleCompra = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  const encabezado = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      SELECT TOP 1
        id,
        numero_compra,
        proveedor_id,
        nombre_proveedor,
        ruc_proveedor,
        numero_factura,
        CONVERT(VARCHAR(10), fecha_compra, 23) AS fecha_compra,
        bodega,
        subtotal_0,
        subtotal_15,
        iva_15,
        total,
        responsable,
        observacion,
        fecha_creacion
      FROM dbo.compras
      WHERE id = @id
    `);

  if (!encabezado.recordset.length) {
    throw new AppError("Compra no encontrada", 404);
  }

  const detalle = await pool.request()
    .input("compra_id", sql.Int, Number(id))
    .query(`
      SELECT
        id,
        compra_id,
        producto_id,
        codigo,
        producto,
        categoria,
        cantidad,
        precio_unitario,
        aplica_iva,
        subtotal,
        iva,
        total,
        lote,
        codigo_vendedor,
        CONVERT(VARCHAR(10), fecha_vencimiento, 23) AS fecha_vencimiento
      FROM dbo.compras_detalle
      WHERE compra_id = @compra_id
      ORDER BY id ASC
    `);

  res.json({
    encabezado: encabezado.recordset[0],
    detalle: detalle.recordset
  });
};

module.exports = {
  obtenerSiguienteNumeroCompra,
  registrarCompra,
  listarCompras,
  obtenerDetalleCompra
};
