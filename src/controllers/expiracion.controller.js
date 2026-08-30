const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Control centralizado de fechas de expiración de insumos y medicamentos.
 */
const consultarControlExpiracion = async (req, res) => {
  const codigo = String(req.query.codigo || "").trim();
  const producto = String(req.query.producto || "").trim();
  const bodega = String(req.query.bodega || "").trim();
  const lote = String(req.query.lote || "").trim();
  const codigoProveedor = String(req.query.codigoProveedor || "").trim();
  const casaComercial = String(req.query.casaComercial || "").trim();
  const estado = String(req.query.estado || "").trim().toUpperCase();
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

  const request = pool.request()
    .input("codigo", sql.VarChar, codigo)
    .input("producto", sql.VarChar, producto)
    .input("bodega", sql.VarChar, bodega)
    .input("lote", sql.VarChar, lote)
    .input("codigoProveedor", sql.VarChar, codigoProveedor)
    .input("casaComercial", sql.VarChar, casaComercial)
    .input("estado", sql.VarChar, estado)
    .input("fechaDesde", sql.VarChar, fechaDesde)
    .input("fechaHasta", sql.VarChar, fechaHasta)
    .input("mesesAviso", sql.Int, mesesAviso)
    .input("diasCritico", sql.Int, diasCritico)
    .input("offset", sql.Int, offset)
    .input("limite", sql.Int, limite);

  const result = await request.query(`
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
      WHERE de.lote IS NOT NULL
        AND LTRIM(RTRIM(de.lote)) <> ''
        AND de.vencimiento IS NOT NULL
    ),
    LotesActuales AS (
      SELECT
        ln.detalle_entrada_id,
        i.id AS inventario_id,
        ln.producto_id,
        ln.codigo,
        ln.codigo_proveedor,
        ln.producto,
        ln.categoria,
        ln.bodega,
        ln.lote,
        ln.vencimiento,
        ln.casa_comercial,
        CAST(ln.stock_lote AS DECIMAL(18,4)) AS stock_lote,
        COALESCE(NULLIF(ln.ubicacion, ''), i.ubicacion) AS ubicacion,
        ln.responsable,
        ln.origen_movimiento,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), ln.vencimiento) AS dias_restantes,
        CASE
          WHEN ln.vencimiento < CAST(GETDATE() AS DATE) THEN 'VENCIDO'
          WHEN ln.vencimiento <= DATEADD(DAY, @diasCritico, CAST(GETDATE() AS DATE)) THEN 'CRITICO'
          WHEN ln.vencimiento <= DATEADD(MONTH, @mesesAviso, CAST(GETDATE() AS DATE)) THEN 'PROXIMO'
          ELSE 'VIGENTE'
        END AS estado_expiracion
      FROM LotesNumerados ln
      INNER JOIN dbo.inventario i
        ON i.producto_id = ln.producto_id
        AND i.bodega = ln.bodega
      WHERE ln.rn = 1
        AND ISNULL(ln.stock_lote, 0) > 0
        AND UPPER(LTRIM(RTRIM(ln.bodega))) <> 'CUARENTENA'
    ),
    DatosFiltrados AS (
      SELECT *
      FROM LotesActuales
      WHERE
        (@codigo = '' OR codigo LIKE '%' + @codigo + '%')
        AND (@producto = '' OR producto LIKE '%' + @producto + '%')
        AND (@bodega = '' OR bodega = @bodega)
        AND (@lote = '' OR lote LIKE '%' + @lote + '%')
        AND (@codigoProveedor = '' OR ISNULL(codigo_proveedor, '') LIKE '%' + @codigoProveedor + '%')
        AND (@casaComercial = '' OR ISNULL(casa_comercial, '') LIKE '%' + @casaComercial + '%')
        AND (@estado = '' OR estado_expiracion = @estado)
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
      bodega,
      ubicacion,
      dias_restantes,
      estado_expiracion,
      responsable,
      origen_movimiento,
      COUNT(*) OVER() AS total_registros
    FROM DatosFiltrados
    ORDER BY ${orderBy}
    OFFSET @offset ROWS
    FETCH NEXT @limite ROWS ONLY;
  `);

  const items = result.recordset || [];
  const totalRegistros = items.length ? Number(items[0].total_registros || 0) : 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

  const itemsLimpios = items.map((item) => {
    const { total_registros, ...resto } = item;
    return resto;
  });

  const resumenResult = await pool.request()
    .input("mesesAviso", sql.Int, mesesAviso)
    .input("diasCritico", sql.Int, diasCritico)
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
        WHERE de.lote IS NOT NULL
          AND LTRIM(RTRIM(de.lote)) <> ''
          AND de.vencimiento IS NOT NULL
      ),
      LotesActuales AS (
        SELECT
          ln.detalle_entrada_id,
          i.id AS inventario_id,
          ln.producto_id,
          ln.codigo,
          ln.codigo_proveedor,
          ln.producto,
          ln.bodega,
          ln.lote,
          ln.vencimiento,
          ln.casa_comercial,
          ln.stock_lote,
          CASE
            WHEN ln.vencimiento < CAST(GETDATE() AS DATE) THEN 'VENCIDO'
            WHEN ln.vencimiento <= DATEADD(DAY, @diasCritico, CAST(GETDATE() AS DATE)) THEN 'CRITICO'
            WHEN ln.vencimiento <= DATEADD(MONTH, @mesesAviso, CAST(GETDATE() AS DATE)) THEN 'PROXIMO'
            ELSE 'VIGENTE'
          END AS estado_expiracion
        FROM LotesNumerados ln
        INNER JOIN dbo.inventario i
          ON i.producto_id = ln.producto_id
          AND i.bodega = ln.bodega
        WHERE ln.rn = 1
          AND ISNULL(ln.stock_lote, 0) > 0
          AND UPPER(LTRIM(RTRIM(ln.bodega))) <> 'CUARENTENA'
      )
      SELECT
        SUM(CASE WHEN estado_expiracion = 'VENCIDO' THEN 1 ELSE 0 END) AS vencidos,
        SUM(CASE WHEN estado_expiracion = 'CRITICO' THEN 1 ELSE 0 END) AS criticos,
        SUM(CASE WHEN estado_expiracion = 'PROXIMO' THEN 1 ELSE 0 END) AS proximos,
        SUM(CASE WHEN estado_expiracion = 'VIGENTE' THEN 1 ELSE 0 END) AS vigentes
      FROM LotesActuales;
    `);

  const resumenBD = resumenResult.recordset?.[0] || {};

  res.json({
    ok: true,
    configuracion: {
      meses_aviso: mesesAviso,
      dias_critico: diasCritico
    },
    resumen: {
      vencidos: Number(resumenBD.vencidos || 0),
      criticos: Number(resumenBD.criticos || 0),
      proximos: Number(resumenBD.proximos || 0),
      vigentes: Number(resumenBD.vigentes || 0)
    },
    paginacion: {
      pagina,
      limite,
      total_registros: totalRegistros,
      total_paginas: totalPaginas
    },
    items: itemsLimpios
  });
};

module.exports = {
  consultarControlExpiracion
};
