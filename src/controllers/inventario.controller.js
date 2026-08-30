const XLSX = require("xlsx");
const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/* =========================================================================
   CATÁLOGO DE PRODUCTOS
   ========================================================================= */

/**
 * Listar catálogo de productos.
 */
const listarProductos = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      codigo,
      referencia,
      producto,
      categoria,
      unidad,
      observacion,
      estado,
      fecha_creacion
    FROM dbo.productos
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Obtener siguiente código secuencial por categoría de producto.
 */
const obtenerSiguienteCodigoProducto = async (req, res) => {
  const { categoria } = req.query;

  if (!categoria) {
    throw new AppError("Categoría requerida", 400);
  }

  const pool = await getPool();

  const result = await pool.request()
    .input("nombre", sql.VarChar, categoria)
    .query(`
      SELECT TOP 1 prefijo, siguiente_numero
      FROM dbo.categorias_producto
      WHERE nombre = @nombre
        AND estado = 'ACTIVO'
    `);

  if (!result.recordset.length) {
    throw new AppError("Categoría no encontrada", 404);
  }

  const row = result.recordset[0];
  const codigo = `${row.prefijo}-${row.siguiente_numero}`;

  res.json({ codigo });
};

/**
 * Crear un nuevo producto en catálogo.
 */
const crearProducto = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { categoria, producto, unidad, referencia, observacion } = req.body;

    if (!categoria || !producto || !unidad) {
      throw new AppError("Complete todos los campos obligatorios", 400);
    }

    const productoFinal = producto.trim().toUpperCase();
    const unidadFinal = unidad.trim().toUpperCase();
    const referenciaFinal = String(referencia || "").trim().toUpperCase() || null;
    const observacionFinal = String(observacion || "").trim() || null;

    await transaction.begin();

    const categoriaResult = await new sql.Request(transaction)
      .input("nombre", sql.VarChar, categoria)
      .query(`
        SELECT TOP 1
          id,
          nombre,
          prefijo,
          siguiente_numero
        FROM dbo.categorias_producto
        WITH (UPDLOCK, HOLDLOCK)
        WHERE
          nombre = @nombre
          AND estado = 'ACTIVO'
      `);

    if (!categoriaResult.recordset.length) {
      throw new AppError("Categoría no válida o inactiva", 400);
    }

    const cat = categoriaResult.recordset[0];
    const codigo = `${cat.prefijo}-${cat.siguiente_numero}`;

    await new sql.Request(transaction)
      .input("id", sql.Int, cat.id)
      .query(`
        UPDATE dbo.categorias_producto
        SET siguiente_numero = siguiente_numero + 1
        WHERE id = @id
      `);

    await new sql.Request(transaction)
      .input("codigo", sql.VarChar, codigo)
      .input("referencia", sql.VarChar, referenciaFinal)
      .input("producto", sql.VarChar, productoFinal)
      .input("categoria", sql.VarChar, categoria)
      .input("unidad", sql.VarChar, unidadFinal)
      .input("observacion", sql.VarChar, observacionFinal)
      .query(`
        INSERT INTO dbo.productos (
          codigo,
          referencia,
          producto,
          categoria,
          unidad,
          observacion
        )
        VALUES (
          @codigo,
          @referencia,
          @producto,
          @categoria,
          @unidad,
          @observacion
        )
      `);

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session?.usuario?.username || "SISTEMA")
        .input("modulo", sql.VarChar, "PRODUCTOS")
        .input("accion", sql.VarChar, "CREAR PRODUCTO")
        .input("detalle", sql.VarChar, referenciaFinal ? `${codigo} | Ref: ${referenciaFinal} | ${productoFinal}` : `${codigo} | ${productoFinal}`)
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
      codigo,
      referencia: referenciaFinal
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/**
 * Cambiar estado de un producto (ACTIVO / INACTIVO).
 */
const cambiarEstadoProducto = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.productos
      SET estado =
        CASE
          WHEN estado = 'ACTIVO' THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/**
 * Actualizar datos de un producto.
 */
const actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { categoria, producto, unidad, referencia } = req.body;

  if (!categoria || !producto || !unidad) {
    throw new AppError("Datos incompletos", 400);
  }

  const referenciaFinal = String(referencia || "").trim().toUpperCase() || null;
  const pool = await getPool();

  await pool.request()
    .input("id", sql.Int, Number(id))
    .input("categoria", sql.VarChar, categoria)
    .input("producto", sql.VarChar, producto.trim().toUpperCase())
    .input("unidad", sql.VarChar, unidad.trim().toUpperCase())
    .input("referencia", sql.VarChar, referenciaFinal)
    .query(`
      UPDATE dbo.productos
      SET
        categoria = @categoria,
        producto = @producto,
        unidad = @unidad,
        referencia = @referencia
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/**
 * Obtener un producto por ID.
 */
const obtenerProductoPorId = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  const result = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      SELECT TOP 1
        id,
        codigo,
        referencia,
        producto,
        categoria,
        unidad,
        observacion,
        estado
      FROM dbo.productos
      WHERE id = @id
    `);

  if (!result.recordset.length) {
    throw new AppError("Producto no encontrado", 404);
  }

  res.json(result.recordset[0]);
};

/**
 * Importación masiva de productos vía Excel (.xlsx).
 */
const importarProductosExcel = async (req, res) => {
  if (!req.file) {
    throw new AppError("No se recibió ningún archivo", 400);
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    if (!filas.length) {
      throw new AppError("El archivo está vacío", 400);
    }

    await transaction.begin();

    const errores = [];
    let insertados = 0;

    for (let i = 0; i < filas.length; i++) {
      const filaExcel = i + 2;
      const row = filas[i];

      const categoria = String(row.categoria || "").trim().toUpperCase();
      const producto = String(row.producto || "").trim().toUpperCase();
      const unidad = String(row.unidad || "").trim().toUpperCase();
      const observacion = String(row.observacion || "").trim();

      if (!categoria) {
        errores.push({ fila: filaExcel, error: "La categoría está vacía" });
        continue;
      }

      if (!producto) {
        errores.push({ fila: filaExcel, error: "El nombre del producto está vacío" });
        continue;
      }

      if (!unidad) {
        errores.push({ fila: filaExcel, error: "La unidad está vacía" });
        continue;
      }

      const categoriaResult = await new sql.Request(transaction)
        .input("nombre", sql.VarChar, categoria)
        .query(`
          SELECT TOP 1 id, nombre, prefijo, siguiente_numero
          FROM dbo.categorias_producto
          WHERE nombre = @nombre
            AND estado = 'ACTIVO'
        `);

      if (!categoriaResult.recordset.length) {
        errores.push({
          fila: filaExcel,
          error: `La categoría '${categoria}' no existe o está inactiva`
        });
        continue;
      }

      const existeProducto = await new sql.Request(transaction)
        .input("producto", sql.VarChar, producto)
        .query(`
          SELECT TOP 1 id
          FROM dbo.productos
          WHERE producto = @producto
        `);

      if (existeProducto.recordset.length) {
        errores.push({
          fila: filaExcel,
          error: `El producto '${producto}' ya existe`
        });
        continue;
      }

      const cat = categoriaResult.recordset[0];
      const codigo = `${cat.prefijo}-${cat.siguiente_numero}`;

      await new sql.Request(transaction)
        .input("id", sql.Int, cat.id)
        .query(`
          UPDATE dbo.categorias_producto
          SET siguiente_numero = siguiente_numero + 1
          WHERE id = @id
        `);

      await new sql.Request(transaction)
        .input("codigo", sql.VarChar, codigo)
        .input("producto", sql.VarChar, producto)
        .input("categoria", sql.VarChar, categoria)
        .input("unidad", sql.VarChar, unidad)
        .input("observacion", sql.VarChar, observacion || null)
        .query(`
          INSERT INTO dbo.productos (
            codigo,
            producto,
            categoria,
            unidad,
            observacion
          )
          VALUES (
            @codigo,
            @producto,
            @categoria,
            @unidad,
            @observacion
          )
        `);

      insertados++;
    }

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: "Importación finalizada",
      insertados,
      errores
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/* =========================================================================
   CATEGORÍAS DE PRODUCTOS
   ========================================================================= */

/**
 * Listar categorías de producto.
 */
const listarCategoriasProducto = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      nombre,
      prefijo,
      siguiente_numero,
      estado,
      fecha_creacion
    FROM dbo.categorias_producto
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Crear una nueva categoría de producto.
 */
const crearCategoriaProducto = async (req, res) => {
  const { nombre, prefijo } = req.body;

  if (!nombre || !prefijo) {
    throw new AppError("Datos incompletos", 400);
  }

  const pool = await getPool();

  try {
    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("prefijo", sql.VarChar, prefijo.trim().toUpperCase())
      .query(`
        INSERT INTO dbo.categorias_producto (nombre, prefijo, siguiente_numero)
        VALUES (@nombre, @prefijo, 1000)
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("La categoría o prefijo ya existe", 400);
    }
    throw error;
  }
};

/**
 * Cambiar estado de una categoría de producto.
 */
const cambiarEstadoCategoriaProducto = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.categorias_producto
      SET estado =
        CASE
          WHEN estado = 'ACTIVO' THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/* =========================================================================
   INVENTARIO, STOCK Y DETALLE DE ENTRADAS / LOTES
   ========================================================================= */

/**
 * Listar inventario general respetando los permisos de aislamiento de CUARENTENA.
 */
const listarInventario = async (req, res) => {
  const pool = await getPool();

  const usuarioId = Number(req.session?.usuario?.id || req.session?.usuarioId || 0) || null;
  const rol = String(req.session?.usuario?.rol || req.session?.rol || "").trim().toUpperCase();

  let puedeVerCuarentena = rol === "ADMIN";

  if (!puedeVerCuarentena) {
    const permisoResult = await pool.request()
      .input("rol", sql.VarChar, rol)
      .input("permiso", sql.VarChar, "utilidades.cuarentena_ver")
      .input("usuario_id", sql.Int, usuarioId)
      .query(`
        SELECT TOP 1
          CASE
            WHEN up.id IS NOT NULL THEN ISNULL(up.permitido, 0)
            WHEN rp.id IS NOT NULL THEN ISNULL(rp.permitido, 0)
            ELSE 0
          END AS permitido
        FROM (SELECT @permiso AS permiso_codigo) p
        LEFT JOIN dbo.usuarios_permisos up
          ON up.usuario_id = @usuario_id AND up.permiso_codigo = p.permiso_codigo
        LEFT JOIN dbo.roles_permisos rp
          ON UPPER(LTRIM(RTRIM(rp.rol))) = UPPER(LTRIM(RTRIM(@rol)))
          AND rp.permiso_codigo = p.permiso_codigo
      `);

    puedeVerCuarentena = Number(permisoResult.recordset?.[0]?.permitido || 0) === 1;
  }

  const filtroCuarentena = puedeVerCuarentena
    ? ""
    : "WHERE UPPER(LTRIM(RTRIM(i.bodega))) <> 'CUARENTENA'";

  const result = await pool.request().query(`
    SELECT
      i.id,
      i.producto_id,
      i.bodega,
      i.stock,
      i.stock_minimo,
      i.ubicacion,
      i.responsable,
      i.observacion,
      i.fecha_actualizacion,
      p.codigo,
      p.producto,
      p.categoria,
      p.unidad,
      p.estado
    FROM dbo.inventario i
    INNER JOIN dbo.productos p ON i.producto_id = p.id
    ${filtroCuarentena}
    ORDER BY i.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Listar lotes físicos detallados respetando aislamiento de CUARENTENA.
 */
const listarDetalleEntradas = async (req, res) => {
  const pool = await getPool();

  const usuarioId = Number(req.session?.usuario?.id || req.session?.usuarioId || 0) || null;
  const rol = String(req.session?.usuario?.rol || req.session?.rol || "").trim().toUpperCase();

  let puedeVerCuarentena = rol === "ADMIN";

  if (!puedeVerCuarentena) {
    const permisoResult = await pool.request()
      .input("rol", sql.VarChar, rol)
      .input("permiso", sql.VarChar, "utilidades.cuarentena_ver")
      .input("usuario_id", sql.Int, usuarioId)
      .query(`
        SELECT TOP 1
          CASE
            WHEN up.id IS NOT NULL THEN ISNULL(up.permitido, 0)
            WHEN rp.id IS NOT NULL THEN ISNULL(rp.permitido, 0)
            ELSE 0
          END AS permitido
        FROM (SELECT @permiso AS permiso_codigo) p
        LEFT JOIN dbo.usuarios_permisos up
          ON up.usuario_id = @usuario_id AND up.permiso_codigo = p.permiso_codigo
        LEFT JOIN dbo.roles_permisos rp
          ON UPPER(LTRIM(RTRIM(rp.rol))) = UPPER(LTRIM(RTRIM(@rol)))
          AND rp.permiso_codigo = p.permiso_codigo
      `);

    puedeVerCuarentena = Number(permisoResult.recordset?.[0]?.permitido || 0) === 1;
  }

  const filtroCuarentena = puedeVerCuarentena
    ? ""
    : "WHERE UPPER(LTRIM(RTRIM(ISNULL(de.bodega, '')))) <> 'CUARENTENA'";

  const result = await pool.request().query(`
    SELECT
      de.id,
      de.fecha_registro AS fecha,
      de.bodega,
      de.producto_id,
      de.codigo,
      de.codigoproveedor AS codigoProveedor,
      de.producto,
      de.categoria,
      de.cantidad,
      de.stock_lote AS stockLote,
      de.lote,
      de.vencimiento,
      de.casa_comercial AS casaComercial,
      de.stock_minimo AS stockMinimo,
      de.ubicacion,
      de.responsable,
      de.observacion
    FROM dbo.detalleEntradas de
    ${filtroCuarentena}
    ORDER BY de.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Registrar entrada manual de inventario con lote y capa de costo.
 */
const registrarEntradaInventario = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      bodega,
      producto_id,
      registrarLote,
      codigoProveedor,
      cantidad,
      lote,
      vencimiento,
      casaComercial,
      stockMinimo,
      ubicacion,
      responsable,
      observacion,
      estadoCosto,
      costoUnitario,
      motivoSinCosto
    } = req.body;

    const cantidadNumero = Number(cantidad);

    if (!bodega || !producto_id || !Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
      throw new AppError("Datos incompletos para la entrada", 400);
    }

    const manejaLote =
      registrarLote === true ||
      registrarLote === 1 ||
      registrarLote === "1" ||
      registrarLote === "true";

    if (manejaLote && (!codigoProveedor || !lote)) {
      throw new AppError("Complete código proveedor y lote", 400);
    }

    const estadoCostoFinal = String(estadoCosto || "PENDIENTE").trim().toUpperCase();
    const estadosPermitidos = ["CONOCIDO", "SIN_COSTO", "PENDIENTE"];

    if (!estadosPermitidos.includes(estadoCostoFinal)) {
      throw new AppError("Estado de costo no válido", 400);
    }

    let costoUnitarioFinal = null;
    let motivoSinCostoFinal = null;

    if (estadoCostoFinal === "CONOCIDO") {
      const costoNumero = Number(costoUnitario);
      if (!Number.isFinite(costoNumero) || costoNumero <= 0) {
        throw new AppError("Ingrese un costo unitario válido mayor a 0", 400);
      }
      costoUnitarioFinal = costoNumero;
    } else if (estadoCostoFinal === "SIN_COSTO") {
      costoUnitarioFinal = 0;
      motivoSinCostoFinal = String(motivoSinCosto || "").trim().toUpperCase();
      if (!motivoSinCostoFinal) {
        throw new AppError("Seleccione el motivo por el cual la entrada no tiene costo", 400);
      }
    }

    await transaction.begin();

    const productoResult = await new sql.Request(transaction)
      .input("id", sql.Int, Number(producto_id))
      .query(`
        SELECT TOP 1 id, codigo, producto, categoria, unidad
        FROM dbo.productos
        WHERE id = @id
      `);

    if (!productoResult.recordset.length) {
      throw new AppError("Producto no encontrado", 404);
    }

    const p = productoResult.recordset[0];

    const inventarioResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(producto_id))
      .input("bodega", sql.VarChar, String(bodega).trim())
      .query(`
        SELECT TOP 1 id, stock
        FROM dbo.inventario
        WITH (UPDLOCK, HOLDLOCK)
        WHERE producto_id = @producto_id
          AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
      `);

    let inventarioId = null;

    if (inventarioResult.recordset.length) {
      inventarioId = Number(inventarioResult.recordset[0].id);

      await new sql.Request(transaction)
        .input("id", sql.Int, inventarioId)
        .input("cantidad", sql.Int, cantidadNumero)
        .input("stock_minimo", sql.Int, Number(stockMinimo || 0))
        .input("ubicacion", sql.VarChar, ubicacion || null)
        .input("responsable", sql.VarChar, responsable || req.session?.usuario?.username || "SISTEMA")
        .input("observacion", sql.VarChar, observacion || null)
        .query(`
          UPDATE dbo.inventario
          SET
            stock = ISNULL(stock, 0) + @cantidad,
            stock_minimo = @stock_minimo,
            ubicacion = @ubicacion,
            responsable = @responsable,
            observacion = @observacion,
            fecha_actualizacion = GETDATE()
          WHERE id = @id
        `);
    } else {
      const inventarioInsert = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(producto_id))
        .input("bodega", sql.VarChar, String(bodega).trim())
        .input("stock", sql.Int, cantidadNumero)
        .input("stock_minimo", sql.Int, Number(stockMinimo || 0))
        .input("ubicacion", sql.VarChar, ubicacion || null)
        .input("responsable", sql.VarChar, responsable || req.session?.usuario?.username || "SISTEMA")
        .input("observacion", sql.VarChar, observacion || null)
        .query(`
          INSERT INTO dbo.inventario (
            producto_id, bodega, stock, stock_minimo, ubicacion, responsable, observacion
          )
          OUTPUT INSERTED.id
          VALUES (
            @producto_id, @bodega, @stock, @stock_minimo, @ubicacion, @responsable, @observacion
          )
        `);

      inventarioId = Number(inventarioInsert.recordset[0].id);
    }

    let detalleEntradaId = null;

    if (manejaLote) {
      let vencimientoFinal = vencimiento || null;
      let stockLoteFinal = cantidadNumero;

      const lotePrevioResult = await new sql.Request(transaction)
        .input("bodega", sql.VarChar, String(bodega).trim())
        .input("producto_id", sql.Int, Number(producto_id))
        .input("lote", sql.VarChar, String(lote).trim())
        .input("codigoproveedor", sql.VarChar, String(codigoProveedor).trim())
        .input("casa_comercial", sql.VarChar, String(casaComercial || "").trim())
        .query(`
          SELECT TOP 1 id, stock_lote, vencimiento
          FROM dbo.detalleEntradas
          WITH (UPDLOCK, HOLDLOCK)
          WHERE producto_id = @producto_id
            AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
            AND UPPER(LTRIM(RTRIM(ISNULL(lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
            AND UPPER(LTRIM(RTRIM(ISNULL(codigoproveedor, '')))) = UPPER(LTRIM(RTRIM(@codigoproveedor)))
            AND UPPER(LTRIM(RTRIM(ISNULL(casa_comercial, '')))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
          ORDER BY id DESC
        `);

      if (lotePrevioResult.recordset.length) {
        const lotePrevio = lotePrevioResult.recordset[0];
        stockLoteFinal = Number(lotePrevio.stock_lote || 0) + cantidadNumero;
        if (!vencimientoFinal && lotePrevio.vencimiento) {
          vencimientoFinal = lotePrevio.vencimiento;
        }
      }

      const insertDetalle = await new sql.Request(transaction)
        .input("bodega", sql.VarChar, String(bodega).trim())
        .input("producto_id", sql.Int, Number(producto_id))
        .input("codigo", sql.VarChar, p.codigo)
        .input("codigoproveedor", sql.VarChar, String(codigoProveedor).trim())
        .input("producto", sql.VarChar, p.producto)
        .input("categoria", sql.VarChar, p.categoria || null)
        .input("cantidad", sql.Int, cantidadNumero)
        .input("stock_lote", sql.Int, stockLoteFinal)
        .input("lote", sql.VarChar, String(lote).trim())
        .input("vencimiento", sql.Date, vencimientoFinal)
        .input("casa_comercial", sql.VarChar, casaComercial || null)
        .input("stock_minimo", sql.Int, Number(stockMinimo || 0))
        .input("ubicacion", sql.VarChar, ubicacion || null)
        .input("responsable", sql.VarChar, responsable || req.session?.usuario?.username || "SISTEMA")
        .input("observacion", sql.VarChar, observacion || null)
        .input("origen_movimiento", sql.VarChar, "ENTRADA_MANUAL")
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

      detalleEntradaId = Number(insertDetalle.recordset[0].id);
    }

    const insertCapaResult = await new sql.Request(transaction)
      .input("producto_id", sql.Int, Number(producto_id))
      .input("bodega", sql.VarChar, String(bodega).trim())
      .input("lote", sql.VarChar, manejaLote ? String(lote).trim() : null)
      .input("fecha_vencimiento", sql.Date, manejaLote ? (vencimiento || null) : null)
      .input("origen", sql.VarChar, "ENTRADA_MANUAL")
      .input("origen_id", sql.Int, detalleEntradaId)
      .input("estado_costo", sql.VarChar, estadoCostoFinal)
      .input("costo_unitario", sql.Decimal(18, 6), costoUnitarioFinal)
      .input("motivo_sin_costo", sql.VarChar, motivoSinCostoFinal)
      .input("cantidad_original", sql.Decimal(18, 4), cantidadNumero)
      .input("cantidad_disponible", sql.Decimal(18, 4), cantidadNumero)
      .input("observacion", sql.VarChar, observacion || null)
      .input("usuario_creacion", sql.VarChar, responsable || req.session?.usuario?.username || "SISTEMA")
      .input("codigo_proveedor", sql.VarChar, manejaLote ? String(codigoProveedor).trim() : null)
      .input("casa_comercial", sql.VarChar, manejaLote && casaComercial ? String(casaComercial).trim() : null)
      .query(`
        INSERT INTO dbo.capas_costo_inventario (
          producto_id, bodega, lote, fecha_vencimiento, origen, origen_id,
          estado_costo, costo_unitario, motivo_sin_costo, cantidad_original,
          cantidad_disponible, observacion, usuario_creacion, codigo_proveedor, casa_comercial
        )
        OUTPUT INSERTED.id
        VALUES (
          @producto_id, @bodega, @lote, @fecha_vencimiento, @origen, @origen_id,
          @estado_costo, @costo_unitario, @motivo_sin_costo, @cantidad_original,
          @cantidad_disponible, @observacion, @usuario_creacion, @codigo_proveedor, @casa_comercial
        )
      `);

    const capaId = Number(insertCapaResult.recordset[0].id);

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session?.usuario?.username || responsable || "SISTEMA")
        .input("modulo", sql.VarChar, "INVENTARIO")
        .input("accion", sql.VarChar, "ENTRADA INVENTARIO")
        .input("detalle", sql.VarChar, `${p.codigo} - Cant: ${cantidadNumero} - Bodega: ${bodega}`)
        .query(`
          INSERT INTO dbo.auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({
      ok: true,
      inventarioId,
      detalleEntradaId,
      capaId,
      estadoCosto: estadoCostoFinal,
      costoUnitario: costoUnitarioFinal
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/**
 * Listar salidas de inventario.
 */
const listarSalidasInventario = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      bodega,
      codigo,
      producto,
      categoria,
      cantidad,
      lote,
      codigoproveedor,
      fecha_expiracion,
      motivo,
      responsable,
      fecha_creacion
    FROM dbo.salidas_inventario
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Registrar salida manual de inventario con deducción de stock y capas de costo PEPS/FIFO.
 */
const registrarSalidaInventario = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      bodega,
      inventario_id,
      detalleLoteId,
      cantidad,
      motivo,
      responsable
    } = req.body;

    const cantidadNumero = Number(cantidad);
    const responsableFinal = String(
      responsable || req.session?.usuario?.username || ""
    ).trim();

    if (!bodega || !inventario_id || !Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
      throw new AppError("Datos incompletos para la salida", 400);
    }

    await transaction.begin();

    const inventarioResult = await new sql.Request(transaction)
      .input("id", sql.Int, Number(inventario_id))
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

    if (!inventarioResult.recordset.length) {
      throw new AppError("Producto no encontrado en inventario", 404);
    }

    const inv = inventarioResult.recordset[0];

    if (String(inv.bodega || "").trim().toUpperCase() !== String(bodega || "").trim().toUpperCase()) {
      throw new AppError("El producto no pertenece a la bodega seleccionada", 400);
    }

    if (Number(inv.stock || 0) < cantidadNumero) {
      throw new AppError(`Stock insuficiente para ${inv.producto}`, 400);
    }

    let lote = null;
    let codigoProveedor = null;
    let casaComercial = null;
    let fechaExp = null;
    let manejaLote = false;

    if (detalleLoteId !== null && detalleLoteId !== undefined && detalleLoteId !== "") {
      manejaLote = true;

      const loteBaseResult = await new sql.Request(transaction)
        .input("id", sql.Int, Number(detalleLoteId))
        .query(`
          SELECT TOP 1 id, producto_id, bodega, codigoproveedor, lote, vencimiento, casa_comercial
          FROM dbo.detalleEntradas
          WHERE id = @id
        `);

      if (!loteBaseResult.recordset.length) {
        throw new AppError("Lote no encontrado", 404);
      }

      const loteBase = loteBaseResult.recordset[0];

      if (Number(loteBase.producto_id) !== Number(inv.producto_id)) {
        throw new AppError("El lote seleccionado no pertenece al producto", 400);
      }

      const loteVigenteResult = await new sql.Request(transaction)
        .input("producto_id", sql.Int, Number(inv.producto_id))
        .input("bodega", sql.VarChar, String(inv.bodega).trim())
        .input("codigoproveedor", sql.VarChar, loteBase.codigoproveedor || "")
        .input("lote", sql.VarChar, loteBase.lote || "")
        .input("casa_comercial", sql.VarChar, loteBase.casa_comercial || "")
        .query(`
          SELECT TOP 1 id, codigoproveedor, lote, vencimiento, casa_comercial, stock_lote
          FROM dbo.detalleEntradas
          WITH (UPDLOCK, HOLDLOCK)
          WHERE producto_id = @producto_id
            AND UPPER(LTRIM(RTRIM(bodega))) = UPPER(LTRIM(RTRIM(@bodega)))
            AND UPPER(LTRIM(RTRIM(ISNULL(codigoproveedor, '')))) = UPPER(LTRIM(RTRIM(@codigoproveedor)))
            AND UPPER(LTRIM(RTRIM(ISNULL(lote, '')))) = UPPER(LTRIM(RTRIM(@lote)))
            AND UPPER(LTRIM(RTRIM(ISNULL(casa_comercial, '')))) = UPPER(LTRIM(RTRIM(@casa_comercial)))
          ORDER BY id DESC
        `);

      if (!loteVigenteResult.recordset.length) {
        throw new AppError("No se encontró saldo vigente para el lote", 400);
      }

      const loteData = loteVigenteResult.recordset[0];

      if (Number(loteData.stock_lote || 0) < cantidadNumero) {
        throw new AppError(`Stock insuficiente en lote para ${inv.producto}`, 400);
      }

      lote = loteData.lote || null;
      codigoProveedor = loteData.codigoproveedor || null;
      casaComercial = loteData.casa_comercial || null;
      fechaExp = loteData.vencimiento || null;

      await new sql.Request(transaction)
        .input("id", sql.Int, Number(loteData.id))
        .input("cantidad", sql.Int, cantidadNumero)
        .query(`
          UPDATE dbo.detalleEntradas
          SET stock_lote = ISNULL(stock_lote, 0) - @cantidad
          WHERE id = @id
        `);
    }

    const requestCapas = new sql.Request(transaction);
    requestCapas.input("producto_id", sql.Int, Number(inv.producto_id));
    requestCapas.input("bodega", sql.VarChar, String(inv.bodega).trim());
    requestCapas.input("lote", sql.VarChar, lote || "");
    requestCapas.input("codigo_proveedor", sql.VarChar, codigoProveedor || "");
    requestCapas.input("casa_comercial", sql.VarChar, casaComercial || "");

    const filtroTipoExistencia = manejaLote
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
        ${filtroTipoExistencia}
      ORDER BY
        c.fecha_entrada ASC,
        c.id ASC
    `);

    const capas = capasResult.recordset;
    const disponibleCapas = capas.reduce(
      (total, capa) => total + Number(capa.cantidad_disponible || 0),
      0
    );

    if (disponibleCapas < cantidadNumero) {
      throw new AppError(
        manejaLote
          ? `Las capas del lote de ${inv.producto} solo tienen ${disponibleCapas} unidades disponibles`
          : `Las capas sin lote de ${inv.producto} solo tienen ${disponibleCapas} unidades disponibles`,
        400
      );
    }

    await new sql.Request(transaction)
      .input("id", sql.Int, Number(inv.id))
      .input("cantidad", sql.Int, cantidadNumero)
      .query(`
        UPDATE dbo.inventario
        SET
          stock = ISNULL(stock, 0) - @cantidad,
          fecha_actualizacion = GETDATE()
        WHERE id = @id
      `);

    const salidaResult = await new sql.Request(transaction)
      .input("bodega", sql.VarChar, String(inv.bodega).trim())
      .input("codigo", sql.VarChar, inv.codigo)
      .input("producto", sql.VarChar, inv.producto)
      .input("categoria", sql.VarChar, inv.categoria || null)
      .input("cantidad", sql.Int, cantidadNumero)
      .input("lote", sql.VarChar, lote)
      .input("codigoproveedor", sql.VarChar, codigoProveedor)
      .input("fecha_expiracion", sql.Date, fechaExp)
      .input("motivo", sql.VarChar, motivo || null)
      .input("responsable", sql.VarChar, responsableFinal)
      .query(`
        INSERT INTO dbo.salidas_inventario (
          bodega, codigo, producto, categoria, cantidad,
          lote, codigoproveedor, fecha_expiracion, motivo, responsable
        )
        OUTPUT INSERTED.id
        VALUES (
          @bodega, @codigo, @producto, @categoria, @cantidad,
          @lote, @codigoproveedor, @fecha_expiracion, @motivo, @responsable
        )
      `);

    const salidaId = Number(salidaResult.recordset[0].id);

    let cantidadPendiente = cantidadNumero;
    let valorConocido = 0;
    let cantidadCostoPendiente = 0;
    const capasConsumidas = [];

    for (const capa of capas) {
      if (cantidadPendiente <= 0) break;

      const disponible = Number(capa.cantidad_disponible || 0);
      if (disponible <= 0) continue;

      const consumir = Math.min(disponible, cantidadPendiente);
      const nuevoSaldo = disponible - consumir;

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

      const valorMovimiento = costoUnitario === null ? null : consumir * costoUnitario;

      if (valorMovimiento === null) {
        cantidadCostoPendiente += consumir;
      } else {
        valorConocido += valorMovimiento;
      }

      await new sql.Request(transaction)
        .input("capa_id", sql.Int, Number(capa.id))
        .input("producto_id", sql.Int, Number(inv.producto_id))
        .input("tipo_movimiento", sql.VarChar, "SALIDA")
        .input("documento", sql.VarChar, `SALIDA-${salidaId}`)
        .input("documento_id", sql.Int, salidaId)
        .input("bodega_origen", sql.VarChar, inv.bodega)
        .input("bodega_destino", sql.VarChar, null)
        .input("lote", sql.VarChar, capa.lote || null)
        .input("cantidad", sql.Decimal(18, 4), consumir)
        .input("costo_unitario", sql.Decimal(18, 6), costoUnitario)
        .input("valor_movimiento", sql.Decimal(18, 6), valorMovimiento)
        .input("estado_costo", sql.VarChar, capa.estado_costo)
        .input("usuario", sql.VarChar, responsableFinal)
        .input("observacion", sql.VarChar, motivo || null)
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

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session?.usuario?.username || responsableFinal)
        .input("modulo", sql.VarChar, "INVENTARIO")
        .input("accion", sql.VarChar, "SALIDA INVENTARIO")
        .input("detalle", sql.VarChar, `SALIDA-${salidaId} / ${inv.codigo} / Cant: ${cantidadNumero}`)
        .query(`
          INSERT INTO dbo.auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({
      ok: true,
      salidaId,
      detalle_costos: {
        salida_id: salidaId,
        codigo: inv.codigo,
        producto: inv.producto,
        cantidad: cantidadNumero,
        valor_conocido: valorConocido,
        cantidad_costo_pendiente: cantidadCostoPendiente,
        capas: capasConsumidas
      }
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}

    throw error;
  }
};

/* =========================================================================
   KARDEX Y DETALLE DE COSTO
   ========================================================================= */

/**
 * Consultar Kardex integral unificado con cálculo de saldos y costos unitarios.
 */
const consultarKardex = async (req, res) => {
  const pool = await getPool();

  const usuarioId = Number(req.session?.usuario?.id || req.session?.usuarioId || 0) || null;
  const rol = String(req.session?.usuario?.rol || req.session?.rol || "").trim().toUpperCase();

  let puedeVerCuarentena = rol === "ADMIN";

  if (!puedeVerCuarentena) {
    const permisoResult = await pool.request()
      .input("rol", sql.VarChar, rol)
      .input("permiso", sql.VarChar, "utilidades.cuarentena_ver")
      .input("usuario_id", sql.Int, usuarioId)
      .query(`
        SELECT TOP 1
          CASE
            WHEN up.id IS NOT NULL THEN ISNULL(up.permitido, 0)
            WHEN rp.id IS NOT NULL THEN ISNULL(rp.permitido, 0)
            ELSE 0
          END AS permitido
        FROM (SELECT @permiso AS permiso_codigo) p
        LEFT JOIN dbo.usuarios_permisos up
          ON up.usuario_id = @usuario_id AND up.permiso_codigo = p.permiso_codigo
        LEFT JOIN dbo.roles_permisos rp
          ON UPPER(LTRIM(RTRIM(rp.rol))) = UPPER(LTRIM(RTRIM(@rol)))
          AND rp.permiso_codigo = p.permiso_codigo
      `);

    puedeVerCuarentena = Number(permisoResult.recordset?.[0]?.permitido || 0) === 1;
  }

  const compras = await pool.request().query(`
    SELECT
      cd.id,
      cd.compra_id,
      CONVERT(VARCHAR(19), c.fecha_compra, 120) AS fecha,
      c.fecha_creacion AS fecha_orden,
      c.numero_compra AS documento,
      'COMPRA' AS tipo_movimiento,
      cd.codigo,
      cd.producto,
      c.bodega,
      cd.cantidad AS entrada,
      0 AS salida,
      c.responsable,
      c.observacion,
      cd.lote,
      cd.fecha_vencimiento,
      cd.precio_unitario AS costo_unitario,
      (cd.cantidad * cd.precio_unitario) AS valor_movimiento,
      'CONOCIDO' AS estado_costo
    FROM dbo.compras_detalle cd
    INNER JOIN dbo.compras c ON cd.compra_id = c.id
  `);

  const entradasInventario = await pool.request().query(`
    SELECT
      de.id,
      de.id AS detalle_entrada_id,
      CONVERT(VARCHAR(19), de.fecha_registro, 120) AS fecha,
      de.fecha_registro AS fecha_orden,
      CONCAT('ENTRADA-', de.id) AS documento,
      'ENTRADA' AS tipo_movimiento,
      de.codigo,
      de.producto,
      de.bodega,
      de.cantidad AS entrada,
      0 AS salida,
      de.responsable,
      de.observacion,
      de.lote,
      de.vencimiento AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (de.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.detalleEntradas de
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN c.costo_unitario IS NOT NULL THEN c.costo_unitario END) AS cantidad_costos,
        COUNT(c.id) AS cantidad_capas,
        MIN(c.costo_unitario) AS costo_unico
      FROM dbo.capas_costo_inventario c
      WHERE c.origen = 'ENTRADA_MANUAL' AND c.origen_id = de.id
    ) cc
    WHERE ISNULL(de.origen_movimiento, 'ENTRADA_MANUAL') = 'ENTRADA_MANUAL'
  `);

  const salidas = await pool.request().query(`
    SELECT
      s.id,
      CONVERT(VARCHAR(19), s.fecha_creacion, 120) AS fecha,
      s.fecha_creacion AS fecha_orden,
      CONCAT('SALIDA-', s.id) AS documento,
      'SALIDA' AS tipo_movimiento,
      s.codigo,
      s.producto,
      s.bodega,
      0 AS entrada,
      s.cantidad AS salida,
      s.responsable,
      s.motivo AS observacion,
      s.lote,
      s.fecha_expiracion AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (s.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.salidas_inventario s
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'SALIDA' AND mcc.documento_id = s.id
    ) cc
  `);

  const descargos = await pool.request().query(`
    SELECT
      dd.id,
      CONVERT(VARCHAR(19), d.fecha_creacion, 120) AS fecha,
      d.fecha_creacion AS fecha_orden,
      d.numero_descargo AS documento,
      'DESCARGO' AS tipo_movimiento,
      dd.codigo,
      dd.producto,
      i.bodega,
      0 AS entrada,
      dd.cantidad AS salida,
      d.responsable,
      CONCAT('Paciente: ', d.nombre_paciente, ' | Proc: ', CONVERT(VARCHAR(10), d.fecha_procedimiento, 23)) AS observacion,
      dd.lote,
      dd.fecha_expiracion AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (dd.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.descargos_detalle dd
    INNER JOIN dbo.descargos d ON dd.descargo_id = d.id
    LEFT JOIN dbo.inventario i ON dd.inventario_id = i.id
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'DESCARGO' AND mcc.documento_id = dd.id
    ) cc
  `);

  const trasladosSalida = await pool.request().query(`
    SELECT
      td.id,
      CONVERT(VARCHAR(19), t.fecha_creacion, 120) AS fecha,
      t.fecha_creacion AS fecha_orden,
      t.numero_traslado AS documento,
      'TRASLADO SALIDA' AS tipo_movimiento,
      td.codigo,
      td.producto,
      t.bodega_origen AS bodega,
      0 AS entrada,
      td.cantidad AS salida,
      t.responsable,
      CONCAT('Hacia: ', t.bodega_destino, ' - ', ISNULL(t.observacion, '')) AS observacion,
      td.lote,
      td.vencimiento AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (td.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.traslados_detalle td
    INNER JOIN dbo.traslados t ON td.traslado_id = t.id
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'TRASLADO_SALIDA' AND mcc.documento_id = td.id
    ) cc
  `);

  const trasladosEntrada = await pool.request().query(`
    SELECT
      td.id,
      CONVERT(VARCHAR(19), t.fecha_creacion, 120) AS fecha,
      t.fecha_creacion AS fecha_orden,
      t.numero_traslado AS documento,
      'TRASLADO ENTRADA' AS tipo_movimiento,
      td.codigo,
      td.producto,
      t.bodega_destino AS bodega,
      td.cantidad AS entrada,
      0 AS salida,
      t.responsable,
      CONCAT('Desde: ', t.bodega_origen, ' - ', ISNULL(t.observacion, '')) AS observacion,
      td.lote,
      td.vencimiento AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (td.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.traslados_detalle td
    INNER JOIN dbo.traslados t ON td.traslado_id = t.id
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'TRASLADO_ENTRADA' AND mcc.documento_id = td.id
    ) cc
  `);

  const cuarentenaSalida = await pool.request().query(`
    SELECT
      mc.id,
      CONVERT(VARCHAR(19), mc.fecha_movimiento, 120) AS fecha,
      mc.fecha_movimiento AS fecha_orden,
      CONCAT('CUAR-', mc.id) AS documento,
      'CUARENTENA SALIDA' AS tipo_movimiento,
      mc.codigo,
      mc.producto,
      mc.bodega_origen AS bodega,
      0 AS entrada,
      mc.cantidad AS salida,
      mc.usuario_nombre AS responsable,
      CONCAT('Aislamiento: ', mc.motivo) AS observacion,
      mc.lote,
      NULL AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (mc.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.movimientos_cuarentena mc
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'CUARENTENA_SALIDA' AND mcc.documento_id = mc.id
    ) cc
    WHERE UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'INGRESO_CUARENTENA'
  `);

  const cuarentenaEntrada = await pool.request().query(`
    SELECT
      mc.id,
      CONVERT(VARCHAR(19), mc.fecha_movimiento, 120) AS fecha,
      mc.fecha_movimiento AS fecha_orden,
      CONCAT('CUAR-', mc.id) AS documento,
      'CUARENTENA ENTRADA' AS tipo_movimiento,
      mc.codigo,
      mc.producto,
      mc.bodega_destino AS bodega,
      mc.cantidad AS entrada,
      0 AS salida,
      mc.usuario_nombre AS responsable,
      CONCAT('Aislamiento: ', mc.motivo) AS observacion,
      mc.lote,
      NULL AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (mc.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.movimientos_cuarentena mc
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'CUARENTENA_ENTRADA' AND mcc.documento_id = mc.id
    ) cc
    WHERE UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'INGRESO_CUARENTENA'
  `);

  const liberacionSalida = await pool.request().query(`
    SELECT
      mc.id,
      CONVERT(VARCHAR(19), mc.fecha_movimiento, 120) AS fecha,
      mc.fecha_movimiento AS fecha_orden,
      CONCAT('LIB-', mc.id) AS documento,
      'LIBERACION SALIDA' AS tipo_movimiento,
      mc.codigo,
      mc.producto,
      mc.bodega_origen AS bodega,
      0 AS entrada,
      mc.cantidad AS salida,
      mc.usuario_nombre AS responsable,
      CONCAT('Liberación: ', mc.motivo) AS observacion,
      mc.lote,
      NULL AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (mc.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.movimientos_cuarentena mc
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'LIBERACION_SALIDA' AND mcc.documento_id = mc.id
    ) cc
    WHERE UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'LIBERACION'
  `);

  const liberacionEntrada = await pool.request().query(`
    SELECT
      mc.id,
      CONVERT(VARCHAR(19), mc.fecha_movimiento, 120) AS fecha,
      mc.fecha_movimiento AS fecha_orden,
      CONCAT('LIB-', mc.id) AS documento,
      'LIBERACION ENTRADA' AS tipo_movimiento,
      mc.codigo,
      mc.producto,
      mc.bodega_destino AS bodega,
      mc.cantidad AS entrada,
      0 AS salida,
      mc.usuario_nombre AS responsable,
      CONCAT('Liberación: ', mc.motivo) AS observacion,
      mc.lote,
      NULL AS fecha_vencimiento,
      cc.costo_unico AS costo_unitario,
      CASE WHEN cc.cantidad_costos = 1 AND cc.costo_unico IS NOT NULL THEN (mc.cantidad * cc.costo_unico) ELSE NULL END AS valor_movimiento,
      CASE WHEN cc.cantidad_capas = 0 THEN 'PENDIENTE' WHEN cc.cantidad_costos = 1 THEN 'CONOCIDO' ELSE 'MIXTO' END AS estado_costo
    FROM dbo.movimientos_cuarentena mc
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN mcc.costo_unitario IS NOT NULL THEN mcc.costo_unitario END) AS cantidad_costos,
        COUNT(mcc.id) AS cantidad_capas,
        MIN(mcc.costo_unitario) AS costo_unico
      FROM dbo.movimientos_capas_costo mcc
      WHERE mcc.tipo_movimiento = 'LIBERACION_ENTRADA' AND mcc.documento_id = mc.id
    ) cc
    WHERE UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'LIBERACION'
  `);

  let movimientos = [
    ...compras.recordset,
    ...entradasInventario.recordset,
    ...salidas.recordset,
    ...descargos.recordset,
    ...trasladosSalida.recordset,
    ...trasladosEntrada.recordset,
    ...cuarentenaSalida.recordset,
    ...cuarentenaEntrada.recordset,
    ...liberacionSalida.recordset,
    ...liberacionEntrada.recordset
  ];

  if (!puedeVerCuarentena) {
    movimientos = movimientos.filter(
      (m) => String(m.bodega || "").trim().toUpperCase() !== "CUARENTENA"
    );
  }

  movimientos.sort((a, b) => {
    const codigoA = String(a.codigo || "");
    const codigoB = String(b.codigo || "");
    if (codigoA !== codigoB) return codigoA.localeCompare(codigoB);

    const bodegaA = String(a.bodega || "");
    const bodegaB = String(b.bodega || "");
    if (bodegaA !== bodegaB) return bodegaA.localeCompare(bodegaB);

    const fechaA = new Date(a.fecha_orden || a.fecha).getTime();
    const fechaB = new Date(b.fecha_orden || b.fecha).getTime();
    if (!Number.isNaN(fechaA) && !Number.isNaN(fechaB) && fechaA !== fechaB) {
      return fechaA - fechaB;
    }

    return String(a.documento || "").localeCompare(String(b.documento || ""));
  });

  const saldos = {};
  for (const m of movimientos) {
    const clave = `${m.codigo || ""}__${m.bodega || ""}`;
    if (!saldos[clave]) saldos[clave] = 0;

    const entrada = Number(m.entrada || 0);
    const salida = Number(m.salida || 0);
    saldos[clave] += entrada - salida;
    m.saldo = saldos[clave];
  }

  res.json(movimientos);
};

/**
 * Obtener detalle de trazabilidad de costo de un movimiento Kardex.
 */
const obtenerDetalleCostoKardex = async (req, res) => {
  const { tipo, id } = req.query;

  if (!tipo || !id) {
    throw new AppError("Parámetros 'tipo' e 'id' requeridos", 400);
  }

  const tipoFinal = String(tipo).trim().toUpperCase();
  const documentoId = Number(id);
  const pool = await getPool();

  let movimientoCabecera = null;
  let tipoMovimientoCapas = null;

  if (tipoFinal === "COMPRA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          cd.id,
          c.numero_compra AS documento,
          cd.codigo,
          cd.producto,
          c.bodega,
          cd.cantidad,
          cd.lote,
          cd.precio_unitario AS costo_unitario,
          (cd.cantidad * cd.precio_unitario) AS valor_total,
          c.nombre_proveedor AS proveedor,
          c.numero_factura,
          c.responsable,
          c.fecha_compra AS fecha
        FROM dbo.compras_detalle cd
        INNER JOIN dbo.compras c ON cd.compra_id = c.id
        WHERE cd.id = @id
      `);

    if (!result.recordset.length) {
      throw new AppError("Detalle de compra no encontrado", 404);
    }

    const row = result.recordset[0];
    return res.json({
      ok: true,
      movimiento: {
        tipo: "COMPRA",
        id: row.id,
        documento: row.documento,
        codigo: row.codigo,
        producto: row.producto,
        bodega: row.bodega,
        cantidad: Number(row.cantidad || 0),
        lote: row.lote || null,
        responsable: row.responsable || null,
        fecha: row.fecha
      },
      detalle: [
        {
          capa_id: row.id,
          origen: "COMPRA",
          documento_origen: row.documento,
          numero_compra: row.documento,
          numero_factura: row.numero_factura || null,
          proveedor: row.proveedor || null,
          lote: row.lote || null,
          cantidad: Number(row.cantidad || 0),
          costo_unitario: Number(row.costo_unitario || 0),
          valor: Number(row.valor_total || 0),
          estado_costo: "CONOCIDO",
          motivo_sin_costo: null
        }
      ],
      resumen: {
        cantidad_total: Number(row.cantidad || 0),
        valor_conocido: Number(row.valor_total || 0),
        cantidad_costo_pendiente: 0,
        cantidad_capas: 1
      }
    });
  }

  if (tipoFinal === "ENTRADA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          de.id,
          CONCAT('ENTRADA-', de.id) AS documento,
          de.codigo,
          de.producto,
          de.bodega,
          de.cantidad,
          de.lote,
          de.responsable,
          de.fecha_registro AS fecha
        FROM dbo.detalleEntradas de
        WHERE de.id = @id
      `);

    if (!result.recordset.length) {
      throw new AppError("Entrada de inventario no encontrada", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "ENTRADA_MANUAL";
  } else if (tipoFinal === "SALIDA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          s.id,
          CONCAT('SALIDA-', s.id) AS documento,
          s.codigo,
          s.producto,
          s.bodega,
          s.cantidad,
          s.lote,
          s.motivo,
          s.responsable,
          s.fecha_creacion AS fecha
        FROM dbo.salidas_inventario s
        WHERE s.id = @id
      `);

    if (!result.recordset.length) {
      throw new AppError("Salida no encontrada", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "SALIDA";
  } else if (tipoFinal === "DESCARGO") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          dd.id,
          d.numero_descargo AS documento,
          dd.codigo,
          dd.producto,
          i.bodega,
          dd.cantidad,
          dd.lote,
          d.nombre_paciente AS paciente,
          d.responsable,
          d.fecha_creacion AS fecha
        FROM dbo.descargos_detalle dd
        INNER JOIN dbo.descargos d ON dd.descargo_id = d.id
        LEFT JOIN dbo.inventario i ON dd.inventario_id = i.id
        WHERE dd.id = @id
      `);

    if (!result.recordset.length) {
      throw new AppError("Descargo no encontrado", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "DESCARGO";
  } else if (tipoFinal === "TRASLADO SALIDA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          td.id,
          t.numero_traslado AS documento,
          td.codigo,
          td.producto,
          t.bodega_origen AS bodega,
          td.cantidad,
          td.lote,
          t.responsable,
          t.fecha_creacion AS fecha
        FROM dbo.traslados_detalle td
        INNER JOIN dbo.traslados t ON td.traslado_id = t.id
        WHERE td.id = @id
      `);

    if (!result.recordset.length) {
      throw new AppError("Detalle de traslado no encontrado", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "TRASLADO_SALIDA";
  } else if (tipoFinal === "TRASLADO ENTRADA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          td.id,
          t.numero_traslado AS documento,
          td.codigo,
          td.producto,
          t.bodega_destino AS bodega,
          td.cantidad,
          td.lote,
          t.responsable,
          t.fecha_creacion AS fecha
        FROM dbo.traslados_detalle td
        INNER JOIN dbo.traslados t ON td.traslado_id = t.id
        WHERE td.id = @id
      `);

    if (!result.recordset.length) {
      throw new AppError("Detalle de traslado no encontrado", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "TRASLADO_ENTRADA";
  } else if (tipoFinal === "CUARENTENA SALIDA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          mc.id,
          CONCAT('CUAR-', mc.id) AS documento,
          mc.codigo,
          mc.producto,
          mc.bodega_origen AS bodega,
          mc.cantidad,
          mc.lote,
          mc.motivo,
          mc.usuario_nombre AS responsable,
          mc.fecha_movimiento AS fecha
        FROM dbo.movimientos_cuarentena mc
        WHERE mc.id = @id AND UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'INGRESO_CUARENTENA'
      `);

    if (!result.recordset.length) {
      throw new AppError("Movimiento de cuarentena no encontrado", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "CUARENTENA_SALIDA";
  } else if (tipoFinal === "CUARENTENA ENTRADA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          mc.id,
          CONCAT('CUAR-', mc.id) AS documento,
          mc.codigo,
          mc.producto,
          mc.bodega_destino AS bodega,
          mc.cantidad,
          mc.lote,
          mc.motivo,
          mc.usuario_nombre AS responsable,
          mc.fecha_movimiento AS fecha
        FROM dbo.movimientos_cuarentena mc
        WHERE mc.id = @id AND UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'INGRESO_CUARENTENA'
      `);

    if (!result.recordset.length) {
      throw new AppError("Movimiento de cuarentena no encontrado", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "CUARENTENA_ENTRADA";
  } else if (tipoFinal === "LIBERACION SALIDA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          mc.id,
          CONCAT('LIB-', mc.id) AS documento,
          mc.codigo,
          mc.producto,
          mc.bodega_origen AS bodega,
          mc.cantidad,
          mc.lote,
          mc.motivo,
          mc.usuario_nombre AS responsable,
          mc.fecha_movimiento AS fecha
        FROM dbo.movimientos_cuarentena mc
        WHERE mc.id = @id AND UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'LIBERACION'
      `);

    if (!result.recordset.length) {
      throw new AppError("Liberación no encontrada", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "LIBERACION_SALIDA";
  } else if (tipoFinal === "LIBERACION ENTRADA") {
    const result = await pool.request()
      .input("id", sql.Int, documentoId)
      .query(`
        SELECT TOP 1
          mc.id,
          CONCAT('LIB-', mc.id) AS documento,
          mc.codigo,
          mc.producto,
          mc.bodega_destino AS bodega,
          mc.cantidad,
          mc.lote,
          mc.motivo,
          mc.usuario_nombre AS responsable,
          mc.fecha_movimiento AS fecha
        FROM dbo.movimientos_cuarentena mc
        WHERE mc.id = @id AND UPPER(LTRIM(RTRIM(mc.tipo_movimiento))) = 'LIBERACION'
      `);

    if (!result.recordset.length) {
      throw new AppError("Liberación no encontrada", 404);
    }

    movimientoCabecera = result.recordset[0];
    tipoMovimientoCapas = "LIBERACION_ENTRADA";
  }

  const movimientosResult = await pool.request()
    .input("documento_id", sql.Int, documentoId)
    .input("tipo_movimiento", sql.VarChar, tipoMovimientoCapas)
    .query(`
      ;WITH CadenaCapas AS (
        SELECT
          c.id AS capa_actual_id,
          c.id AS capa_raiz_id,
          c.capa_origen_id,
          c.origen,
          c.origen_id,
          c.motivo_sin_costo,
          c.referencia_documento,
          c.proveedor_id,
          0 AS nivel
        FROM dbo.capas_costo_inventario c

        UNION ALL

        SELECT
          cc.capa_actual_id,
          padre.id AS capa_raiz_id,
          padre.capa_origen_id,
          padre.origen,
          padre.origen_id,
          padre.motivo_sin_costo,
          padre.referencia_documento,
          padre.proveedor_id,
          cc.nivel + 1
        FROM CadenaCapas cc
        INNER JOIN dbo.capas_costo_inventario padre
          ON padre.id = cc.capa_origen_id
      ),
      CapaOriginal AS (
        SELECT
          capa_actual_id,
          capa_raiz_id,
          origen,
          origen_id,
          motivo_sin_costo,
          referencia_documento,
          proveedor_id,
          ROW_NUMBER() OVER (PARTITION BY capa_actual_id ORDER BY nivel DESC) AS rn
        FROM CadenaCapas
      )
      SELECT
        mcc.id AS movimiento_capa_id,
        mcc.capa_id,
        mcc.cantidad,
        mcc.costo_unitario,
        mcc.valor_movimiento,
        mcc.estado_costo,
        mcc.lote,
        mcc.fecha_movimiento,
        co.origen,
        co.origen_id,
        co.motivo_sin_costo,
        co.referencia_documento,
        co.proveedor_id,
        c.numero_compra,
        c.numero_factura,
        c.nombre_proveedor AS proveedor,
        CASE
          WHEN co.origen = 'ENTRADA_MANUAL' THEN CONCAT('ENTRADA-', co.origen_id)
          WHEN co.origen = 'COMPRA' THEN ISNULL(c.numero_compra, CONCAT('COMPRA-', co.origen_id))
          WHEN co.origen = 'INVENTARIO_INICIAL' THEN 'INVENTARIO INICIAL'
          ELSE CONCAT(ISNULL(co.origen, 'ORIGEN'), '-', ISNULL(CONVERT(VARCHAR(30), co.origen_id), ''))
        END AS documento_origen
      FROM dbo.movimientos_capas_costo mcc
      INNER JOIN CapaOriginal co
        ON co.capa_actual_id = mcc.capa_id AND co.rn = 1
      LEFT JOIN dbo.compras_detalle cd
        ON co.origen = 'COMPRA' AND cd.id = co.origen_id
      LEFT JOIN dbo.compras c
        ON c.id = cd.compra_id
      WHERE mcc.tipo_movimiento = @tipo_movimiento
        AND mcc.documento_id = @documento_id
      ORDER BY mcc.id ASC
      OPTION (MAXRECURSION 100)
    `);

  const movimientos = movimientosResult.recordset || [];

  let cantidadTotal = 0;
  let valorConocidoTotal = 0;
  let cantidadPendiente = 0;

  for (const movimiento of movimientos) {
    const cantidadMovimiento = Number(movimiento.cantidad || 0);
    cantidadTotal += cantidadMovimiento;

    if (movimiento.valor_movimiento !== null && movimiento.valor_movimiento !== undefined) {
      valorConocidoTotal += Number(movimiento.valor_movimiento);
    } else {
      cantidadPendiente += cantidadMovimiento;
    }
  }

  res.json({
    ok: true,
    movimiento: {
      tipo: tipoFinal,
      id: movimientoCabecera.id,
      documento: movimientoCabecera.documento,
      codigo: movimientoCabecera.codigo,
      producto: movimientoCabecera.producto,
      bodega: movimientoCabecera.bodega,
      cantidad: Number(movimientoCabecera.cantidad || 0),
      lote: movimientoCabecera.lote || null,
      motivo: movimientoCabecera.motivo || null,
      responsable: movimientoCabecera.responsable || null,
      fecha: movimientoCabecera.fecha
    },
    detalle: movimientos.map((m) => ({
      capa_id: Number(m.capa_id),
      origen: m.origen,
      documento_origen: m.documento_origen,
      numero_compra: m.numero_compra || null,
      numero_factura: m.numero_factura || null,
      proveedor: m.proveedor || null,
      lote: m.lote || null,
      cantidad: Number(m.cantidad || 0),
      costo_unitario: m.costo_unitario === null || m.costo_unitario === undefined ? null : Number(m.costo_unitario),
      valor: m.valor_movimiento === null || m.valor_movimiento === undefined ? null : Number(m.valor_movimiento),
      estado_costo: m.estado_costo,
      motivo_sin_costo: m.motivo_sin_costo || null
    })),
    resumen: {
      cantidad_total: cantidadTotal,
      valor_conocido: valorConocidoTotal,
      cantidad_costo_pendiente: cantidadPendiente,
      cantidad_capas: movimientos.length
    }
  });
};

module.exports = {
  listarProductos,
  obtenerSiguienteCodigoProducto,
  crearProducto,
  cambiarEstadoProducto,
  actualizarProducto,
  obtenerProductoPorId,
  importarProductosExcel,
  listarCategoriasProducto,
  crearCategoriaProducto,
  cambiarEstadoCategoriaProducto,
  listarInventario,
  listarDetalleEntradas,
  registrarEntradaInventario,
  listarSalidasInventario,
  registrarSalidaInventario,
  consultarKardex,
  obtenerDetalleCostoKardex
};
