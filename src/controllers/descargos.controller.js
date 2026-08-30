const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");
const { generarPdfConsignacionBase64 } = require("../services/consignacionPdf.service");
const { enviarCorreo } = require("../services/mail.service");

/**
 * Obtener el siguiente número correlativo de descargo (ej: DSCRG-1001).
 */
const obtenerSiguienteNumeroDescargo = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request()
    .input("tipo", sql.VarChar, "DESCARGO")
    .query(`
      SELECT TOP 1 siguiente_numero
      FROM dbo.config_numeradores
      WHERE tipo = @tipo
    `);

  if (!result.recordset.length) {
    throw new AppError("Numerador de descargo no configurado", 404);
  }

  const numero = result.recordset[0].siguiente_numero;
  res.json({ numero: `DSCRG-${numero}` });
};

/**
 * Registrar un nuevo descargo clínico/quirúrgico con consumo de inventario y capas de costo PEPS/FIFO.
 */
const registrarDescargo = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      paciente_id,
      nombre_paciente,
      fecha_procedimiento,
      origen,
      responsable,
      detalle
    } = req.body;

    const responsableFinal = String(
      responsable || req.session?.usuario?.username || ""
    ).trim();

    /* =====================================================
       1. VALIDACIONES GENERALES
       ===================================================== */
    if (!paciente_id || !fecha_procedimiento || !origen || !responsableFinal) {
      throw new AppError("Datos principales incompletos", 400);
    }

    if (!Array.isArray(detalle) || !detalle.length) {
      throw new AppError("Debe agregar al menos un insumo", 400);
    }

    /* =====================================================
       2. INICIAR TRANSACCIÓN
       ===================================================== */
    await transaction.begin();

    /* =====================================================
       3. NUMERADOR ATÓMICO CON BLOQUEO (UPDLOCK, HOLDLOCK)
       ===================================================== */
    const numeradorResult = await new sql.Request(transaction)
      .input("tipo", sql.VarChar, "DESCARGO")
      .query(`
        SELECT TOP 1 siguiente_numero
        FROM dbo.config_numeradores
        WITH (UPDLOCK, HOLDLOCK)
        WHERE tipo = @tipo
      `);

    if (!numeradorResult.recordset.length) {
      throw new AppError("Numerador de descargo no configurado", 400);
    }

    const numeroActual = Number(numeradorResult.recordset[0].siguiente_numero);
    const numeroTexto = `DSCRG-${numeroActual}`;

    await new sql.Request(transaction)
      .input("tipo", sql.VarChar, "DESCARGO")
      .input("nuevoNumero", sql.Int, numeroActual + 1)
      .query(`
        UPDATE dbo.config_numeradores
        SET siguiente_numero = @nuevoNumero
        WHERE tipo = @tipo
      `);

    /* =====================================================
       4. INSERTAR CABECERA DEL DESCARGO
       ===================================================== */
    const descargoResult = await new sql.Request(transaction)
      .input("numero_descargo", sql.VarChar, numeroTexto)
      .input("paciente_id", sql.Int, Number(paciente_id))
      .input("archivo", sql.VarChar, req.body.archivo || null)
      .input("nombre_paciente", sql.VarChar, nombre_paciente)
      .input("fecha_procedimiento", sql.Date, fecha_procedimiento)
      .input("origen", sql.VarChar, origen)
      .input("responsable", sql.VarChar, responsableFinal)
      .query(`
        INSERT INTO dbo.descargos (
          numero_descargo,
          paciente_id,
          archivo,
          nombre_paciente,
          fecha_procedimiento,
          origen,
          responsable
        )
        OUTPUT INSERTED.id
        VALUES (
          @numero_descargo,
          @paciente_id,
          @archivo,
          @nombre_paciente,
          @fecha_procedimiento,
          @origen,
          @responsable
        )
      `);

    const descargoId = Number(descargoResult.recordset[0].id);
    const resumenCostos = [];

    /* =====================================================
       5. RECORRER CADA INSUMO
       ===================================================== */
    for (const item of detalle) {
      const inventarioId = Number(item.inventario_id);
      const cantidad = Number(item.cantidad);

      if (!inventarioId || !Number.isFinite(cantidad) || cantidad <= 0) {
        throw new AppError("Detalle de descargo inválido", 400);
      }

      /* 5.1 BUSCAR INVENTARIO CON BLOQUEO */
      const invResult = await new sql.Request(transaction)
        .input("id", sql.Int, inventarioId)
        .query(`
          SELECT TOP 1
            i.id,
            i.producto_id,
            i.bodega,
            i.stock,
            p.codigo,
            p.producto,
            p.categoria
          FROM dbo.inventario i
          WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.productos p ON p.id = i.producto_id
          WHERE i.id = @id
        `);

      if (!invResult.recordset.length) {
        throw new AppError(`Inventario no encontrado para ID ${inventarioId}`, 404);
      }

      const inv = invResult.recordset[0];

      if (Number(inv.stock || 0) < cantidad) {
        throw new AppError(`Stock insuficiente para ${inv.producto}`, 400);
      }

      let lote = null;
      let fechaExp = null;
      let casaComercial = null;
      let codigoProveedor = null;
      let manejaLote = false;

      /* 5.2 SI EL INSUMO SELECCIONÓ UN LOTE FÍSICO ESPECÍFICO */
      if (item.detalleEntradaId) {
        manejaLote = true;

        const loteResult = await new sql.Request(transaction)
          .input("id", sql.Int, Number(item.detalleEntradaId))
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
            WHERE id = @id
          `);

        if (!loteResult.recordset.length) {
          throw new AppError(`Lote no encontrado para ${inv.producto}`, 404);
        }

        const loteData = loteResult.recordset[0];

        if (Number(loteData.stock_lote || 0) < cantidad) {
          throw new AppError(`Stock insuficiente en lote para ${inv.producto}`, 400);
        }

        lote = loteData.lote || null;
        fechaExp = loteData.vencimiento || null;
        casaComercial = loteData.casa_comercial || null;
        codigoProveedor = loteData.codigoproveedor || null;

        /* DESCONTAR LOTE FÍSICO */
        await new sql.Request(transaction)
          .input("id", sql.Int, Number(loteData.id))
          .input("cantidad", sql.Int, cantidad)
          .query(`
            UPDATE dbo.detalleEntradas
            SET stock_lote = ISNULL(stock_lote, 0) - @cantidad
            WHERE id = @id
          `);
      }

      /* 5.3 BUSCAR CAPAS DE COSTO DISPONIBLES */
      const requestCapas = new sql.Request(transaction);
      requestCapas.input("producto_id", sql.Int, Number(inv.producto_id));
      requestCapas.input("bodega", sql.VarChar, inv.bodega);
      requestCapas.input("lote", sql.VarChar, lote || "");
      requestCapas.input("codigo_proveedor", sql.VarChar, codigoProveedor || "");
      requestCapas.input("casa_comercial", sql.VarChar, casaComercial || "");

      const filtroCapa = manejaLote
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

      const capas = capasResult.recordset;
      const disponibleCapas = capas.reduce(
        (total, capa) => total + Number(capa.cantidad_disponible || 0),
        0
      );

      if (disponibleCapas < cantidad) {
        throw new AppError(
          manejaLote
            ? `Las capas del lote de ${inv.producto} solo tienen ${disponibleCapas} unidades disponibles`
            : `Las capas sin lote de ${inv.producto} solo tienen ${disponibleCapas} unidades disponibles`,
          400
        );
      }

      /* 5.4 DESCONTAR STOCK GENERAL */
      await new sql.Request(transaction)
        .input("id", sql.Int, inventarioId)
        .input("cantidad", sql.Int, cantidad)
        .query(`
          UPDATE dbo.inventario
          SET
            stock = ISNULL(stock, 0) - @cantidad,
            fecha_actualizacion = GETDATE()
          WHERE id = @id
        `);

      /* 5.5 INSERTAR DETALLE DEL DESCARGO */
      const detalleResult = await new sql.Request(transaction)
        .input("descargo_id", sql.Int, descargoId)
        .input("numero_descargo", sql.VarChar, numeroTexto)
        .input("inventario_id", sql.Int, inventarioId)
        .input("codigo", sql.VarChar, inv.codigo)
        .input("producto", sql.VarChar, inv.producto)
        .input("categoria", sql.VarChar, inv.categoria || null)
        .input("cantidad", sql.Int, cantidad)
        .input("lote", sql.VarChar, lote)
        .input("fecha_expiracion", sql.Date, fechaExp)
        .input("casa_comercial", sql.VarChar, casaComercial)
        .input("codigo_proveedor", sql.VarChar, codigoProveedor)
        .input("observacion", sql.VarChar, item.observacion || null)
        .query(`
          INSERT INTO dbo.descargos_detalle (
            descargo_id,
            numero_descargo,
            inventario_id,
            codigo,
            producto,
            categoria,
            cantidad,
            lote,
            fecha_expiracion,
            casa_comercial,
            codigo_proveedor,
            observacion
          )
          OUTPUT INSERTED.id
          VALUES (
            @descargo_id,
            @numero_descargo,
            @inventario_id,
            @codigo,
            @producto,
            @categoria,
            @cantidad,
            @lote,
            @fecha_expiracion,
            @casa_comercial,
            @codigo_proveedor,
            @observacion
          )
        `);

      const descargoDetalleId = Number(detalleResult.recordset[0].id);

      /* 5.6 CONSUMIR CAPAS FIFO */
      let cantidadPendiente = cantidad;
      let valorConocido = 0;
      let cantidadCostoPendiente = 0;
      const capasConsumidas = [];

      for (const capa of capas) {
        if (cantidadPendiente <= 0) {
          break;
        }

        const disponible = Number(capa.cantidad_disponible || 0);
        if (disponible <= 0) {
          continue;
        }

        const consumir = Math.min(disponible, cantidadPendiente);
        const nuevoSaldo = disponible - consumir;

        /* ACTUALIZAR CAPA */
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

        /* HISTORIAL ECONÓMICO */
        await new sql.Request(transaction)
          .input("capa_id", sql.Int, Number(capa.id))
          .input("producto_id", sql.Int, Number(inv.producto_id))
          .input("tipo_movimiento", sql.VarChar, "DESCARGO")
          .input("documento", sql.VarChar, numeroTexto)
          .input("documento_id", sql.Int, descargoDetalleId)
          .input("bodega_origen", sql.VarChar, inv.bodega)
          .input("bodega_destino", sql.VarChar, null)
          .input("lote", sql.VarChar, capa.lote || null)
          .input("cantidad", sql.Decimal(18, 4), consumir)
          .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
          .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
          .input("estado_costo", sql.VarChar, capa.estado_costo)
          .input("usuario", sql.VarChar, responsableFinal)
          .input("observacion", sql.VarChar, item.observacion || null)
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
        throw new AppError(`No fue posible consumir completamente el costo de ${inv.producto}`, 400);
      }

      resumenCostos.push({
        descargo_detalle_id: descargoDetalleId,
        codigo: inv.codigo,
        producto: inv.producto,
        cantidad,
        valor_conocido: valorConocido,
        cantidad_costo_pendiente: cantidadCostoPendiente,
        capas: capasConsumidas
      });
    }

    /* =====================================================
       6. AUDITORÍA
       ===================================================== */
    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session?.usuario?.username || responsableFinal)
        .input("modulo", sql.VarChar, "DESCARGOS")
        .input("accion", sql.VarChar, "REGISTRAR DESCARGO")
        .input("detalle", sql.VarChar, numeroTexto)
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
      numero_descargo: numeroTexto,
      descargo_id: descargoId,
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
 * Listar todos los descargos con datos de paciente.
 */
const listarDescargos = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      d.id,
      d.numero_descargo,
      d.nombre_paciente,
      d.fecha_procedimiento,
      d.origen,
      d.archivo,
      d.responsable,
      d.fecha_creacion,
      p.pac_apellido1,
      p.pac_apellido2,
      p.pac_nombre1,
      p.pac_nombre2
    FROM dbo.descargos d
    INNER JOIN dbo.pacientes p ON d.paciente_id = p.id
    ORDER BY d.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Listar insumos de consignación pendientes de reporte.
 */
const listarConsignacion = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      dd.id,
      dd.descargo_id,
      dd.numero_descargo,
      dd.codigo,
      dd.producto,
      dd.categoria,
      dd.cantidad,
      dd.lote,
      dd.fecha_expiracion,
      dd.casa_comercial,
      dd.codigo_proveedor,
      dd.observacion,
      d.nombre_paciente,
      d.fecha_procedimiento,
      d.responsable,
      d.archivo,
      d.origen
    FROM dbo.descargos_detalle dd
    INNER JOIN dbo.descargos d ON d.id = dd.descargo_id
    WHERE
      dd.casa_comercial IS NOT NULL
      AND LTRIM(RTRIM(dd.casa_comercial)) <> ''
      AND ISNULL(dd.reporte_enviado, 0) = 0
    ORDER BY d.fecha_procedimiento DESC, dd.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Obtener detalle y cabecera de un descargo específico.
 */
const obtenerDetalleDescargo = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  const encabezado = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      SELECT TOP 1
        d.*,
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      FROM dbo.descargos d
      INNER JOIN dbo.pacientes p ON d.paciente_id = p.id
      WHERE d.id = @id
    `);

  if (!encabezado.recordset.length) {
    throw new AppError("Descargo no encontrado", 404);
  }

  const detalle = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      SELECT
        codigo,
        producto,
        categoria,
        cantidad,
        lote,
        fecha_expiracion,
        numero_descargo,
        observacion
      FROM dbo.descargos_detalle
      WHERE descargo_id = @id
      ORDER BY id ASC
    `);

  res.json({
    encabezado: encabezado.recordset[0],
    detalle: detalle.recordset
  });
};

/**
 * Listar pacientes con descargos consolidados en una fecha dada.
 */
const listarPacientesConsolidados = async (req, res) => {
  const { fecha } = req.query;

  if (!fecha) {
    throw new AppError("Fecha requerida", 400);
  }

  const pool = await getPool();

  const result = await pool.request()
    .input("fecha", sql.Date, fecha)
    .query(`
      SELECT DISTINCT
        d.paciente_id,
        d.archivo,
        d.nombre_paciente
      FROM dbo.descargos d
      WHERE CAST(d.fecha_procedimiento AS DATE) = @fecha
      ORDER BY d.nombre_paciente
    `);

  res.json(result.recordset);
};

/**
 * Obtener detalle consolidado de descargos por paciente y fecha.
 */
const obtenerDetalleConsolidado = async (req, res) => {
  const { fecha, pacienteId } = req.query;

  if (!fecha || !pacienteId) {
    throw new AppError("Fecha y paciente requeridos", 400);
  }

  const pool = await getPool();

  const encabezadoResult = await pool.request()
    .input("fecha", sql.Date, fecha)
    .input("paciente_id", sql.Int, Number(pacienteId))
    .query(`
      SELECT TOP 1
        d.paciente_id,
        d.archivo,
        d.nombre_paciente,
        d.fecha_procedimiento
      FROM dbo.descargos d
      WHERE CAST(d.fecha_procedimiento AS DATE) = @fecha
        AND d.paciente_id = @paciente_id
    `);

  if (!encabezadoResult.recordset.length) {
    throw new AppError("No se encontró consolidado para ese paciente y fecha", 404);
  }

  const detalleResult = await pool.request()
    .input("fecha", sql.Date, fecha)
    .input("paciente_id", sql.Int, Number(pacienteId))
    .query(`
      SELECT
        d.numero_descargo,
        d.origen,
        d.responsable,
        dd.codigo,
        dd.producto,
        dd.categoria,
        dd.cantidad,
        dd.lote,
        dd.fecha_expiracion,
        dd.observacion
      FROM dbo.descargos d
      INNER JOIN dbo.descargos_detalle dd ON d.id = dd.descargo_id
      WHERE CAST(d.fecha_procedimiento AS DATE) = @fecha
        AND d.paciente_id = @paciente_id
      ORDER BY d.id ASC, dd.id ASC
    `);

  res.json({
    encabezado: encabezadoResult.recordset[0],
    detalle: detalleResult.recordset
  });
};

/**
 * Enviar reporte por correo a casas comerciales de insumos utilizados en consignación.
 */
const enviarReporteConsignacion = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      throw new AppError("Seleccione al menos un registro", 400);
    }

    await transaction.begin();

    const idsNumericos = ids
      .map((x) => Number(x))
      .filter((x) => !Number.isNaN(x) && x > 0);

    if (!idsNumericos.length) {
      throw new AppError("IDs no válidos", 400);
    }

    const idsSql = idsNumericos.join(",");

    const result = await new sql.Request(transaction).query(`
      SELECT
        dd.id,
        dd.descargo_id,
        dd.numero_descargo,
        dd.codigo,
        dd.producto,
        dd.categoria,
        dd.cantidad,
        dd.lote,
        CONVERT(VARCHAR(10), dd.fecha_expiracion, 23) AS fecha_expiracion,
        dd.casa_comercial,
        dd.codigo_proveedor,
        dd.observacion,
        d.nombre_paciente,
        CONVERT(VARCHAR(10), d.fecha_procedimiento, 23) AS fecha_procedimiento,
        d.responsable,
        d.archivo,
        d.origen,
        c.correos
      FROM dbo.descargos_detalle dd
      INNER JOIN dbo.descargos d ON d.id = dd.descargo_id
      INNER JOIN dbo.casas_comerciales c
        ON LTRIM(RTRIM(UPPER(c.nombre))) = LTRIM(RTRIM(UPPER(dd.casa_comercial)))
      WHERE dd.id IN (${idsSql})
        AND ISNULL(dd.reporte_enviado, 0) = 0
    `);

    const registros = result.recordset || [];

    if (!registros.length) {
      throw new AppError("No se encontraron registros pendientes para enviar", 400);
    }

    const grupos = {};
    for (const item of registros) {
      const casa = String(item.casa_comercial || "").trim();
      if (!casa) continue;
      if (!grupos[casa]) grupos[casa] = [];
      grupos[casa].push(item);
    }

    const casas = Object.keys(grupos);
    if (!casas.length) {
      throw new AppError("No hay registros con casa comercial válida", 400);
    }

    for (const casa of casas) {
      const itemsCasa = grupos[casa];
      const correosRaw = String(itemsCasa[0].correos || "").trim();

      if (!correosRaw) {
        throw new AppError(`La casa comercial ${casa} no tiene correos registrados`, 400);
      }

      const destinatarios = correosRaw
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .join(", ");

      const pdfBuffer = generarPdfConsignacionBase64({
        casaComercial: casa,
        registros: itemsCasa
      });

      const subject = `INSUMOS UTILIZADOS CENT - ${casa}`;

      const textoPlano = `Estimados señores de ${casa}:

Por medio de la presente, solicitamos su gentil apoyo para proceder con la facturación de los insumos utilizados bajo modalidad de consignación en nuestra institución.

A continuación, detallamos la información para su validación y proceso:

Datos de la institución:

Razón social: CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S.
RUC: 0993399290001
Dirección: Rumichaca 3304 Argentina y club sport Emelec
Ciudad: Guayaquil
Teléfono: 0990838306
Correo: cent.hemodinamia@gmail.com

Agradeceremos emitir la factura a nombre de CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S., 0993399290001, y remitirla al correo cent.hemodinamia@gmail.com.

Muchas gracias por su atención y pronta gestión.

Atentamente,
SISTEMA AUTOMATICO CENT
`;

      const html = `
        <p>Estimados señores de <strong>${casa}</strong>:</p>

        <p>Por medio de la presente, solicitamos su gentil apoyo para proceder con la facturación de los insumos utilizados bajo modalidad de consignación en nuestra institución.</p>

        <p>A continuación, detallamos la información para su validación y proceso:</p>

        <p><strong>Datos de la institución:</strong></p>

        <p>
          Razón social: CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S.<br>
          RUC: 0993399290001<br>
          Dirección: Rumichaca 3304 Argentina y club sport Emelec<br>
          Ciudad: Guayaquil<br>
          Teléfono: 0990838306<br>
          Correo: cent.hemodinamia@gmail.com
        </p>

        <p>
          Agradeceremos emitir la factura a nombre de
          <strong>CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S.</strong>,
          <strong>0993399290001</strong>,
          y remitirla al correo <strong>cent.hemodinamia@gmail.com</strong>.
        </p>

        <p>Muchas gracias por su atención y pronta gestión.</p>

        <p>
          Atentamente,<br>
          SISTEMA AUTOMATICO CENT<br>
        </p>
      `;

      await enviarCorreo({
        to: destinatarios,
        subject,
        text: textoPlano,
        html,
        attachments: [
          {
            filename: `INSUMOS_CONSIGNACION_${String(casa).replace(/[\\/:*?"<>|]+/g, "_")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      });

      const idsCasa = itemsCasa.map((x) => Number(x.id)).join(",");

      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session.usuario.username)
        .query(`
          UPDATE dbo.descargos_detalle
          SET
            reporte_enviado = 1,
            fecha_envio_reporte = GETDATE(),
            enviado_por = @usuario
          WHERE id IN (${idsCasa})
        `);
    }

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session.usuario.username)
        .input("modulo", sql.VarChar, "DESCARGOS")
        .input("accion", sql.VarChar, "ENVIAR REPORTE CONSIGNACION")
        .input("detalle", sql.VarChar, `Registros enviados: ${idsNumericos.join(",")}`)
        .query(`
          INSERT INTO dbo.auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({ ok: true, enviados: idsNumericos.length });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/**
 * Listar historial de descargos de consignación ya enviados por correo.
 */
const listarConsignacionEnviados = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      dd.id,
      dd.descargo_id,
      dd.numero_descargo,
      dd.codigo,
      dd.producto,
      dd.categoria,
      dd.cantidad,
      dd.lote,
      CONVERT(VARCHAR(10), dd.fecha_expiracion, 23) AS fecha_expiracion,
      dd.casa_comercial,
      dd.codigo_proveedor,
      dd.observacion,
      d.nombre_paciente,
      CONVERT(VARCHAR(10), d.fecha_procedimiento, 23) AS fecha_procedimiento,
      d.responsable,
      d.archivo,
      d.origen,
      CONVERT(VARCHAR(10), dd.fecha_envio_reporte, 23) AS fecha_envio_reporte,
      dd.enviado_por
    FROM dbo.descargos_detalle dd
    INNER JOIN dbo.descargos d ON d.id = dd.descargo_id
    WHERE ISNULL(dd.reporte_enviado, 0) = 1
    ORDER BY dd.fecha_envio_reporte DESC, dd.id DESC
  `);

  res.json(result.recordset);
};

module.exports = {
  obtenerSiguienteNumeroDescargo,
  registrarDescargo,
  listarDescargos,
  listarConsignacion,
  obtenerDetalleDescargo,
  listarPacientesConsolidados,
  obtenerDetalleConsolidado,
  enviarReporteConsignacion,
  listarConsignacionEnviados
};
