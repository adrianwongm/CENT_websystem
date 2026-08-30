const { getPool, sql } = require("../config/db");
const { obtenerUsuarioSesionHC } = require("../middlewares/auth.middleware");
const AppError = require("../utils/AppError");

/* =========================================================
   CONFIGURACIÓN DE NÚMERO DE ARCHIVO
   ========================================================= */

/**
 * Obtener la configuración actual del número secuencial de archivo.
 */
const obtenerConfigArchivo = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 1 id, numero_actual
    FROM dbo.configuracion_archivo
    ORDER BY id DESC
  `);

  if (!result.recordset.length) {
    throw new AppError("No existe configuración de archivo", 404);
  }

  res.json(result.recordset[0]);
};

/**
 * Actualizar el número secuencial de archivo.
 */
const actualizarConfigArchivo = async (req, res) => {
  const { numero_actual } = req.body;

  if (!numero_actual || Number(numero_actual) <= 0) {
    throw new AppError("Número no válido", 400);
  }

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 1 id
    FROM dbo.configuracion_archivo
    ORDER BY id DESC
  `);

  if (!result.recordset.length) {
    await pool
      .request()
      .input("numero_actual", sql.Int, Number(numero_actual))
      .query(`
        INSERT INTO dbo.configuracion_archivo (numero_actual)
        VALUES (@numero_actual)
      `);
  } else {
    const id = result.recordset[0].id;
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("numero_actual", sql.Int, Number(numero_actual))
      .query(`
        UPDATE dbo.configuracion_archivo
        SET numero_actual = @numero_actual
        WHERE id = @id
      `);
  }

  res.json({ ok: true });
};

/* =========================================================
   CONFIGURACIÓN DE DESPLEGABLES
   ========================================================= */

/**
 * Listar valores desplegables por tipo opcional.
 */
const listarDesplegables = async (req, res) => {
  const { tipo } = req.query;
  const pool = await getPool();

  let query = `
    SELECT id, tipo, valor, estado, fecha_creacion
    FROM dbo.config_desplegables
  `;
  const request = pool.request();

  if (tipo) {
    query += ` WHERE tipo = @tipo `;
    request.input("tipo", sql.VarChar, tipo);
  }

  query += ` ORDER BY id DESC `;

  const result = await request.query(query);
  res.json(result.recordset);
};

/**
 * Crear un nuevo valor desplegable.
 */
const crearDesplegable = async (req, res) => {
  const { tipo, valor } = req.body;

  if (!tipo || !valor) {
    throw new AppError("Datos incompletos", 400);
  }

  const pool = await getPool();
  await pool
    .request()
    .input("tipo", sql.VarChar, tipo)
    .input("valor", sql.VarChar, valor)
    .query(`
      INSERT INTO dbo.config_desplegables (tipo, valor)
      VALUES (@tipo, @valor)
    `);

  res.json({ ok: true });
};

/**
 * Cambiar estado ACTIVO / INACTIVO de un desplegable.
 */
const cambiarEstadoDesplegable = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.config_desplegables
      SET estado =
        CASE
          WHEN estado = 'ACTIVO' THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/* =========================================================
   CONFIGURACIÓN DE EXPIRACIÓN Y VENCIMIENTOS
   ========================================================= */

/**
 * Obtener configuración de aviso y días críticos de expiración.
 */
const obtenerConfigExpiracion = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 1
      id,
      meses_aviso,
      dias_critico,
      fecha_actualizacion,
      actualizado_por
    FROM dbo.configuracion_expiracion
    ORDER BY id ASC
  `);

  if (!result.recordset || result.recordset.length === 0) {
    return res.json({
      meses_aviso: 3,
      dias_critico: 30
    });
  }

  res.json(result.recordset[0]);
};

/**
 * Actualizar configuración de lapsos de expiración.
 */
const actualizarConfigExpiracion = async (req, res) => {
  const mesesAviso = Number(req.body.meses_aviso);
  const diasCritico = Number(req.body.dias_critico);

  if (!Number.isInteger(mesesAviso) || mesesAviso < 1 || mesesAviso > 24) {
    throw new AppError("El lapso de aviso debe estar entre 1 y 24 meses.", 400);
  }

  if (!Number.isInteger(diasCritico) || diasCritico < 1 || diasCritico > 365) {
    throw new AppError("Los días críticos deben estar entre 1 y 365.", 400);
  }

  const usuario = obtenerUsuarioSesionHC(req);
  const usuarioId = Number(usuario?.id || req.session?.usuario?.id || 0) || null;

  const pool = await getPool();
  const existe = await pool.request().query(`
    SELECT TOP 1 id
    FROM dbo.configuracion_expiracion
    ORDER BY id ASC
  `);

  if (existe.recordset.length) {
    const id = existe.recordset[0].id;

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("meses_aviso", sql.Int, mesesAviso)
      .input("dias_critico", sql.Int, diasCritico)
      .input("actualizado_por", sql.Int, usuarioId)
      .query(`
        UPDATE dbo.configuracion_expiracion
        SET
          meses_aviso = @meses_aviso,
          dias_critico = @dias_critico,
          actualizado_por = @actualizado_por,
          fecha_actualizacion = SYSDATETIME()
        WHERE id = @id
      `);
  } else {
    await pool
      .request()
      .input("meses_aviso", sql.Int, mesesAviso)
      .input("dias_critico", sql.Int, diasCritico)
      .input("actualizado_por", sql.Int, usuarioId)
      .query(`
        INSERT INTO dbo.configuracion_expiracion (
          meses_aviso,
          dias_critico,
          actualizado_por
        )
        VALUES (
          @meses_aviso,
          @dias_critico,
          @actualizado_por
        )
      `);
  }

  res.json({
    ok: true,
    mensaje: "Configuración de expiración guardada correctamente.",
    meses_aviso: mesesAviso,
    dias_critico: diasCritico
  });
};

module.exports = {
  obtenerConfigArchivo,
  actualizarConfigArchivo,
  listarDesplegables,
  crearDesplegable,
  cambiarEstadoDesplegable,
  obtenerConfigExpiracion,
  actualizarConfigExpiracion
};
