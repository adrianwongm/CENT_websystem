const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Obtener el siguiente número secuencial de traslado (ej: TRSLD-1001).
 */
const obtenerSiguienteNumeroTraslado = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT TOP 1 numero_traslado
    FROM dbo.traslados
    ORDER BY id DESC
  `);

  let siguiente = 1000;

  if (result.recordset.length) {
    const ultimo = String(result.recordset[0].numero_traslado || "");
    const match = ultimo.match(/TRSLD-(\d+)/i);
    if (match) {
      siguiente = Number(match[1]) + 1;
    }
  }

  res.json({ numero: `TRSLD-${siguiente}` });
};

/**
 * Registrar traslado entre bodegas con movimiento de stock, lotes y capas de costo PEPS/FIFO.
 */
const registrarTraslado = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      numero,
      origen,
      destino,
      responsable,
      observacion,
      detalle
    } = req.body;

    /* =====================================================
       1. NORMALIZAR
       ===================================================== */
    const bodegaOrigen = String(origen || "").trim();
    const bodegaDestino = String(destino || "").trim();
    const responsableFinal = String(
      responsable || req.session?.usuario?.username || ""
    ).trim();
    const observacionFinal = String(observacion || "").trim() || null;

    /* =====================================================
       2. VALIDACIONES GENERALES
       ===================================================== */
    if (!bodegaOrigen || !bodegaDestino) {
      throw new AppError("Seleccione bodega origen y destino", 400);
    }

    if (bodegaOrigen.toUpperCase() === bodegaDestino.toUpperCase()) {
      throw new AppError("La bodega origen y destino no pueden ser iguales", 400);
    }

    /* =====================================================
       3. PROTEGER CUARENTENA
       ===================================================== */
    if (
      bodegaOrigen.toUpperCase() === "CUARENTENA" ||
      bodegaDestino.toUpperCase() === "CUARENTENA"
    ) {
      throw new AppError("CUARENTENA no puede utilizarse en traslados normales. Use el módulo de Cuarentena.", 400);
    }

    if (!responsableFinal) {
      throw new AppError("Responsable requerido", 400);
    }

    if (!Array.isArray(detalle) || !detalle.length) {
      throw new AppError("Debe agregar al menos un producto", 400);
    }

    /* =====================================================
       4. INICIAR TRANSACCIÓN
       ===================================================== */
    await transaction.begin();

    /* =====================================================
       5. NÚMERO DEL TRASLADO
       ===================================================== */
    let numeroFinal =
      numero && String(numero).trim()
        ? String(numero).trim()
        : null;

    if (!numeroFinal) {
      const ultimoResult = await new sql.Request(transaction).query(`
        SELECT TOP 1
          numero_traslado
        FROM dbo.traslados
        WITH (UPDLOCK, HOLDLOCK)
        ORDER BY id DESC
      `);

      let siguiente = 1000;

      if (ultimoResult.recordset.length) {
        const ultimo = String(ultimoResult.recordset[0].numero_traslado || "");
        const match = ultimo.match(/TRSLD-(\d+)/i);
        if (match) {
          siguiente = Number(match[1]) + 1;
        }
      }

      numeroFinal = `TRSLD-${siguiente}`;
    }

    /* =====================================================
       6. CABECERA DEL TRASLADO
       ===================================================== */
    const trasladoResult = await new sql.Request(transaction)
      .input("numero_traslado", sql.VarChar, numeroFinal)
      .input("bodega_origen", sql.VarChar, bodegaOrigen)
      .input("bodega_destino", sql.VarChar, bodegaDestino)
      .input("responsable", sql.VarChar, responsableFinal)
      .input("observacion", sql.VarChar, observacionFinal)
      .query(`
        INSERT INTO dbo.traslados (
          numero_traslado,
          bodega_origen,
          bodega_destino,
          responsable,
          observacion
        )
        OUTPUT
          INSERTED.id,
          INSERTED.fecha_creacion
        VALUES (
          @numero_traslado,
          @bodega_origen,
          @bodega_destino,
          @responsable,
          @observacion
        )
      `);

    const trasladoId = Number(trasladoResult.recordset[0].id);
    const fechaCreacion = trasladoResult.recordset[0].fecha_creacion;
    const resumenCostos = [];

    /* =====================================================
       7. PROCESAR CADA PRODUCTO
       ===================================================== */
    for (const det of detalle) {
      const inventarioOrigenId = Number(det.inventarioId || 0);
      const cantidad = Number(det.cantidad || 0);
      const detalleEntradaId =
        det.detalleEntradaId !== null &&
        det.detalleEntradaId !== undefined &&
        det.detalleEntradaId !== ""
          ? Number(det.detalleEntradaId)
          : null;

      if (!inventarioOrigenId || !Number.isFinite(cantidad) || cantidad <= 0) {
        throw new AppError("Detalle de traslado no válido", 400);
      }

      /* ===================================================
         8. INVENTARIO ORIGEN
         =================================================== */
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
        throw new AppError(`Inventario origen no encontrado para ${det.producto || ""}`, 404);
      }

      const invOrigen = invOrigenResult.recordset[0];

      /* ===================================================
         9. VALIDAR BODEGA ORIGEN
         =================================================== */
      if (
        String(invOrigen.bodega || "").trim().toUpperCase() !==
        bodegaOrigen.toUpperCase()
      ) {
        throw new AppError(`El producto ${invOrigen.producto} no pertenece a la bodega origen`, 400);
      }

      /* ===================================================
         10. SEGUNDA PROTECCIÓN CUARENTENA
         =================================================== */
      if (String(invOrigen.bodega || "").trim().toUpperCase() === "CUARENTENA") {
        throw new AppError("Los productos de CUARENTENA deben liberarse desde el módulo de Cuarentena.", 400);
      }

      /* ===================================================
         11. VALIDAR STOCK GENERAL
         =================================================== */
      if (Number(invOrigen.stock || 0) < cantidad) {
        throw new AppError(`Stock insuficiente para ${invOrigen.producto}`, 400);
      }

      /* ===================================================
         12. DATOS DEL LOTE
         =================================================== */
      let lote = null;
      let vencimiento = null;
      let casaComercial = null;
      let codigoProveedor = null;
      let manejaLote = false;
      let loteOrigenVigenteId = null;

      /* ===================================================
         13. PRODUCTO CON LOTE
         =================================================== */
      if (detalleEntradaId !== null && !Number.isNaN(detalleEntradaId)) {
        manejaLote = true;

        const loteBaseResult = await new sql.Request(transaction)
          .input("id", sql.Int, detalleEntradaId)
          .query(`
            SELECT TOP 1
              id,
              bodega,
              producto_id,
              codigo,
              producto,
              lote,
              vencimiento,
              casa_comercial,
              codigoproveedor,
              stock_lote
            FROM dbo.detalleEntradas
            WHERE id = @id
          `);

        if (!loteBaseResult.recordset.length) {
          throw new AppError(`Lote no encontrado para ${invOrigen.producto}`, 404);
        }

        const loteBase = loteBaseResult.recordset[0];

        if (Number(loteBase.producto_id) !== Number(invOrigen.producto_id)) {
          throw new AppError(`El lote seleccionado no pertenece a ${invOrigen.producto}`, 400);
        }

        if (
          String(loteBase.bodega || "").trim().toUpperCase() !==
          bodegaOrigen.toUpperCase()
        ) {
          throw new AppError(`El lote seleccionado no pertenece a ${bodegaOrigen}`, 400);
        }

        /* 14. ESTADO VIGENTE DEL LOTE */
        const loteOrigenResult = await new sql.Request(transaction)
          .input("producto_id", sql.Int, Number(invOrigen.producto_id))
          .input("bodega", sql.VarChar, bodegaOrigen)
          .input("lote", sql.VarChar, loteBase.lote || "")
          .input("codigoproveedor", sql.VarChar, loteBase.codigoproveedor || "")
          .input("casa_comercial", sql.VarChar, loteBase.casa_comercial || "")
          .query(`
            SELECT TOP 1
              id,
              lote,
              vencimiento,
              casa_comercial,
              codigoproveedor,
              stock_lote
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
          throw new AppError(`No se encontró saldo vigente del lote de ${invOrigen.producto}`, 400);
        }

        const loteOrigen = loteOrigenResult.recordset[0];

        if (Number(loteOrigen.stock_lote || 0) < cantidad) {
          throw new AppError(`Stock insuficiente en lote para ${invOrigen.producto}`, 400);
        }

        loteOrigenVigenteId = Number(loteOrigen.id);
        lote = loteOrigen.lote || null;
        vencimiento = loteOrigen.vencimiento || null;
        casaComercial = loteOrigen.casa_comercial || null;
        codigoProveedor = loteOrigen.codigoproveedor || null;
      }

      /* ===================================================
         15. BUSCAR CAPAS DE COSTO EN ORIGEN
         =================================================== */
      const requestCapas = new sql.Request(transaction);
      requestCapas.input("producto_id", sql.Int, Number(invOrigen.producto_id));
      requestCapas.input("bodega", sql.VarChar, bodegaOrigen);
      requestCapas.input("lote", sql.VarChar, lote || "");
      requestCapas.input("codigo_proveedor", sql.VarChar, codigoProveedor || "");
      requestCapas.input("casa_comercial", sql.VarChar, casaComercial || "");

      const filtroCapas = manejaLote
        ? `
            AND UPPER(LTRIM(RTRIM(ISNULL(c.lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
            AND (
              c.codigo_proveedor IS NULL
              OR UPPER(LTRIM(RTRIM(c.codigo_proveedor))) = UPPER(LTRIM(RTRIM(@codigo_proveedor)))
            )
            AND (
              c.casa_comercial IS NULL
              OR UPPER(LTRIM(RTRIM(c.casa_comercial))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
            )
          `
        : `
            AND (
              c.lote IS NULL
              OR LTRIM(RTRIM(c.lote)) = ''
            )
          `;

      const capasResult = await requestCapas.query(`
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
          AND c.cantidad_disponible > 0
          ${filtroCapas}
        ORDER BY
          c.fecha_entrada ASC,
          c.id ASC
      `);

      const capasOrigen = capasResult.recordset || [];
      const totalDisponibleCapas = capasOrigen.reduce(
        (total, capa) => total + Number(capa.cantidad_disponible || 0),
        0
      );

      if (totalDisponibleCapas < cantidad) {
        throw new AppError(
          manejaLote
            ? `Las capas del lote de ${invOrigen.producto} solo tienen ${totalDisponibleCapas} unidades disponibles`
            : `Las capas sin lote de ${invOrigen.producto} solo tienen ${totalDisponibleCapas} unidades disponibles`,
          400
        );
      }

      /* ===================================================
         16. BUSCAR INVENTARIO DESTINO
         =================================================== */
      const invDestinoResult = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("bodega", sql.VarChar, bodegaDestino)
        .query(`
          SELECT TOP 1
            id,
            stock,
            ubicacion
          FROM dbo.inventario
          WITH (UPDLOCK, HOLDLOCK)
          WHERE
            producto_id = @producto_id
            AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
        `);

      let inventarioDestinoId = null;

      /* ===================================================
         17. DESCONTAR STOCK GENERAL ORIGEN
         =================================================== */
      const descontarOrigen = await new sql.Request(transaction)
        .input("id", sql.Int, inventarioOrigenId)
        .input("cantidad", sql.Decimal(18, 4), cantidad)
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
        throw new AppError(`No fue posible descontar el stock de ${invOrigen.producto}`, 400);
      }

      /* ===================================================
         18. SUMAR STOCK GENERAL DESTINO
         =================================================== */
      if (invDestinoResult.recordset.length) {
        inventarioDestinoId = Number(invDestinoResult.recordset[0].id);

        await new sql.Request(transaction)
          .input("id", sql.Int, inventarioDestinoId)
          .input("cantidad", sql.Decimal(18, 4), cantidad)
          .input("stock_minimo", sql.Int, Number(invOrigen.stock_minimo || 0))
          .input("responsable", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, observacionFinal)
          .query(`
            UPDATE dbo.inventario
            SET
              stock = ISNULL(stock, 0) + @cantidad,
              stock_minimo = @stock_minimo,
              responsable = @responsable,
              observacion = @observacion,
              fecha_actualizacion = GETDATE()
            WHERE id = @id
          `);
      } else {
        const nuevoInventarioResult = await new sql.Request(transaction)
          .input("producto_id", sql.Int, Number(invOrigen.producto_id))
          .input("bodega", sql.VarChar, bodegaDestino)
          .input("stock", sql.Decimal(18, 4), cantidad)
          .input("stock_minimo", sql.Int, Number(invOrigen.stock_minimo || 0))
          .input("ubicacion", sql.VarChar, null)
          .input("responsable", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, observacionFinal)
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
            OUTPUT INSERTED.id
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

        inventarioDestinoId = Number(nuevoInventarioResult.recordset[0].id);
      }

      /* ===================================================
         19. MOVER LOTE FÍSICO
         =================================================== */
      if (manejaLote && lote) {
        const descontarLoteOrigen = await new sql.Request(transaction)
          .input("id", sql.Int, loteOrigenVigenteId)
          .input("cantidad", sql.Decimal(18, 4), cantidad)
          .query(`
            UPDATE dbo.detalleEntradas
            SET
              stock_lote = ISNULL(stock_lote, 0) - @cantidad
            WHERE
              id = @id
              AND ISNULL(stock_lote, 0) >= @cantidad
          `);

        if (!descontarLoteOrigen.rowsAffected?.[0]) {
          throw new AppError(`No fue posible descontar el lote de ${invOrigen.producto}`, 400);
        }

        /* 20. BUSCAR LOTE DESTINO */
        const loteDestinoResult = await new sql.Request(transaction)
          .input("bodega", sql.VarChar, bodegaDestino)
          .input("producto_id", sql.Int, Number(invOrigen.producto_id))
          .input("lote", sql.VarChar, lote)
          .input("casa_comercial", sql.VarChar, casaComercial || "")
          .input("codigoproveedor", sql.VarChar, codigoProveedor || "")
          .query(`
            SELECT TOP 1
              id,
              stock_lote
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

        if (loteDestinoResult.recordset.length) {
          await new sql.Request(transaction)
            .input("id", sql.Int, Number(loteDestinoResult.recordset[0].id))
            .input("cantidad", sql.Decimal(18, 4), cantidad)
            .input("vencimiento", sql.Date, vencimiento || null)
            .query(`
              UPDATE dbo.detalleEntradas
              SET
                stock_lote = ISNULL(stock_lote, 0) + @cantidad,
                vencimiento = ISNULL(@vencimiento, vencimiento)
              WHERE id = @id
            `);
        } else {
          await new sql.Request(transaction)
            .input("bodega", sql.VarChar, bodegaDestino)
            .input("producto_id", sql.Int, Number(invOrigen.producto_id))
            .input("codigo", sql.VarChar, invOrigen.codigo)
            .input("codigoproveedor", sql.VarChar, codigoProveedor || null)
            .input("producto", sql.VarChar, invOrigen.producto)
            .input("categoria", sql.VarChar, invOrigen.categoria || null)
            .input("cantidad", sql.Decimal(18, 4), cantidad)
            .input("stock_lote", sql.Decimal(18, 4), cantidad)
            .input("lote", sql.VarChar, lote)
            .input("vencimiento", sql.Date, vencimiento || null)
            .input("casa_comercial", sql.VarChar, casaComercial || null)
            .input("stock_minimo", sql.Int, Number(invOrigen.stock_minimo || 0))
            .input("ubicacion", sql.VarChar, null)
            .input("responsable", sql.VarChar, responsableFinal)
            .input("observacion", sql.VarChar, `Traslado desde ${bodegaOrigen}${observacionFinal ? " - " + observacionFinal : ""}`)
            .input("origen_movimiento", sql.VarChar, "TRASLADO")
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
      }

      /* ===================================================
         21. REGISTRAR DETALLE DEL TRASLADO
         =================================================== */
      const detalleTrasladoResult = await new sql.Request(transaction)
        .input("traslado_id", sql.Int, trasladoId)
        .input("inventario_origen_id", sql.Int, inventarioOrigenId)
        .input("producto_id", sql.Int, Number(invOrigen.producto_id))
        .input("detalle_entrada_id", sql.Int, detalleEntradaId)
        .input("codigo", sql.VarChar, invOrigen.codigo)
        .input("producto", sql.VarChar, invOrigen.producto)
        .input("categoria", sql.VarChar, invOrigen.categoria || null)
        .input("cantidad", sql.Decimal(18, 4), cantidad)
        .input("lote", sql.VarChar, lote || null)
        .input("vencimiento", sql.Date, vencimiento || null)
        .input("casa_comercial", sql.VarChar, casaComercial || null)
        .input("codigo_proveedor", sql.VarChar, codigoProveedor || null)
        .query(`
          INSERT INTO dbo.traslados_detalle (
            traslado_id,
            inventario_origen_id,
            producto_id,
            detalle_entrada_id,
            codigo,
            producto,
            categoria,
            cantidad,
            lote,
            vencimiento,
            casa_comercial,
            codigo_proveedor
          )
          OUTPUT INSERTED.id
          VALUES (
            @traslado_id,
            @inventario_origen_id,
            @producto_id,
            @detalle_entrada_id,
            @codigo,
            @producto,
            @categoria,
            @cantidad,
            @lote,
            @vencimiento,
            @casa_comercial,
            @codigo_proveedor
          )
        `);

      const trasladoDetalleId = Number(detalleTrasladoResult.recordset[0].id);

      /* ===================================================
         22. TRASLADAR CAPAS ECONÓMICAS
         =================================================== */
      let cantidadPendiente = cantidad;
      let valorConocido = 0;
      let cantidadCostoPendiente = 0;
      const capasTrasladadas = [];

      for (const capa of capasOrigen) {
        if (cantidadPendiente <= 0) {
          break;
        }

        const disponible = Number(capa.cantidad_disponible || 0);
        if (disponible <= 0) {
          continue;
        }

        const mover = Math.min(disponible, cantidadPendiente);
        const nuevoSaldoOrigen = disponible - mover;

        /* 22.1 REDUCIR CAPA ORIGEN */
        await new sql.Request(transaction)
          .input("id", sql.Int, Number(capa.id))
          .input("nuevo_saldo", sql.Decimal(18, 4), nuevoSaldoOrigen)
          .query(`
            UPDATE dbo.capas_costo_inventario
            SET cantidad_disponible = @nuevo_saldo
            WHERE id = @id
          `);

        const costoUnitario =
          capa.costo_unitario === null || capa.costo_unitario === undefined
            ? null
            : Number(capa.costo_unitario);

        const valorMovimiento =
          costoUnitario === null ? null : mover * costoUnitario;

        if (valorMovimiento === null) {
          cantidadCostoPendiente += mover;
        } else {
          valorConocido += valorMovimiento;
        }

        /* 22.2 CREAR CAPA DESTINO */
        const nuevaCapaResult = await new sql.Request(transaction)
          .input("producto_id", sql.Int, Number(invOrigen.producto_id))
          .input("bodega", sql.VarChar, bodegaDestino)
          .input("lote", sql.VarChar, capa.lote || lote || null)
          .input("fecha_vencimiento", sql.Date, capa.fecha_vencimiento || vencimiento || null)
          .input("origen", sql.VarChar, "TRASLADO")
          .input("origen_id", sql.Int, trasladoDetalleId)
          .input("estado_costo", sql.VarChar, capa.estado_costo)
          .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
          .input("motivo_sin_costo", sql.VarChar, capa.motivo_sin_costo || null)
          .input("cantidad_original", sql.Decimal(18, 4), mover)
          .input("cantidad_disponible", sql.Decimal(18, 4), mover)
          .input("capa_origen_id", sql.Int, Number(capa.id))
          .input("proveedor_id", sql.Int, capa.proveedor_id || null)
          .input("referencia_documento", sql.VarChar, numeroFinal)
          .input("observacion", sql.VarChar, `Traslado desde ${bodegaOrigen} hacia ${bodegaDestino}${observacionFinal ? " - " + observacionFinal : ""}`)
          .input("usuario_creacion", sql.VarChar, responsableFinal)
          .input("fecha_entrada", sql.DateTime2, capa.fecha_entrada || fechaCreacion)
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

        /* 22.3 MOVIMIENTO CAPA SALIDA */
        await new sql.Request(transaction)
          .input("capa_id", sql.Int, Number(capa.id))
          .input("producto_id", sql.Int, Number(invOrigen.producto_id))
          .input("tipo_movimiento", sql.VarChar, "TRASLADO_SALIDA")
          .input("documento", sql.VarChar, numeroFinal)
          .input("documento_id", sql.Int, trasladoDetalleId)
          .input("bodega_origen", sql.VarChar, bodegaOrigen)
          .input("bodega_destino", sql.VarChar, bodegaDestino)
          .input("lote", sql.VarChar, capa.lote || lote || null)
          .input("cantidad", sql.Decimal(18, 4), mover)
          .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
          .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
          .input("estado_costo", sql.VarChar, capa.estado_costo)
          .input("usuario", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, observacionFinal)
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

        /* 22.4 MOVIMIENTO CAPA ENTRADA */
        await new sql.Request(transaction)
          .input("capa_id", sql.Int, capaDestinoId)
          .input("producto_id", sql.Int, Number(invOrigen.producto_id))
          .input("tipo_movimiento", sql.VarChar, "TRASLADO_ENTRADA")
          .input("documento", sql.VarChar, numeroFinal)
          .input("documento_id", sql.Int, trasladoDetalleId)
          .input("bodega_origen", sql.VarChar, bodegaOrigen)
          .input("bodega_destino", sql.VarChar, bodegaDestino)
          .input("lote", sql.VarChar, capa.lote || lote || null)
          .input("cantidad", sql.Decimal(18, 4), mover)
          .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
          .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
          .input("estado_costo", sql.VarChar, capa.estado_costo)
          .input("usuario", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, observacionFinal)
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

        capasTrasladadas.push({
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
        throw new AppError(`No fue posible trasladar completamente las capas de ${invOrigen.producto}`, 400);
      }

      resumenCostos.push({
        traslado_detalle_id: trasladoDetalleId,
        codigo: invOrigen.codigo,
        producto: invOrigen.producto,
        cantidad,
        valor_conocido: valorConocido,
        cantidad_costo_pendiente: cantidadCostoPendiente,
        capas: capasTrasladadas
      });
    }

    /* =====================================================
       23. AUDITORÍA
       ===================================================== */
    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session?.usuario?.username || responsableFinal)
        .input("modulo", sql.VarChar, "TRASLADOS")
        .input("accion", sql.VarChar, "REGISTRAR TRASLADO")
        .input("detalle", sql.VarChar, `${numeroFinal} / ${bodegaOrigen} → ${bodegaDestino}`)
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
      numero_traslado: numeroFinal,
      traslado_id: trasladoId,
      fecha_creacion: fechaCreacion,
      detalle_costos: resumenCostos
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/**
 * Listar traslados registrados.
 */
const listarTraslados = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      numero_traslado,
      fecha_creacion,
      bodega_origen,
      bodega_destino,
      responsable,
      observacion
    FROM dbo.traslados
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Obtener detalle y cabecera de un traslado.
 */
const obtenerDetalleTraslado = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  const encabezado = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      SELECT TOP 1
        id,
        numero_traslado,
        fecha_creacion,
        bodega_origen,
        bodega_destino,
        responsable,
        observacion
      FROM dbo.traslados
      WHERE id = @id
    `);

  if (!encabezado.recordset.length) {
    throw new AppError("Traslado no encontrado", 404);
  }

  const detalle = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      SELECT
        codigo,
        producto,
        codigo_proveedor AS codigoProveedor,
        lote,
        vencimiento,
        cantidad,
        categoria,
        casa_comercial AS casaComercial
      FROM dbo.traslados_detalle
      WHERE traslado_id = @id
      ORDER BY id ASC
    `);

  res.json({
    encabezado: encabezado.recordset[0],
    detalle: detalle.recordset
  });
};

module.exports = {
  obtenerSiguienteNumeroTraslado,
  registrarTraslado,
  listarTraslados,
  obtenerDetalleTraslado
};
