const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Listar todas las casas comerciales.
 */
const listarCasas = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      nombre,
      ruc,
      correos,
      ISNULL(estado, 'ACTIVO') AS estado,
      fecha_creacion
    FROM dbo.casas_comerciales
    ORDER BY nombre ASC
  `);

  res.json(result.recordset);
};

/**
 * Crear una nueva casa comercial.
 */
const crearCasa = async (req, res) => {
  const { nombre, ruc, correos } = req.body;

  if (!nombre || !nombre.trim()) {
    throw new AppError("Ingrese el nombre de la casa comercial", 400);
  }

  const pool = await getPool();

  try {
    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("ruc", sql.VarChar, ruc ? ruc.trim() : null)
      .input("correos", sql.VarChar, correos ? correos.trim() : null)
      .query(`
        INSERT INTO dbo.casas_comerciales (nombre, ruc, correos)
        VALUES (@nombre, @ruc, @correos)
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("La casa comercial ya existe", 400);
    }
    throw error;
  }
};

/**
 * Cambiar estado (ACTIVO / INACTIVO) de una casa comercial.
 */
const cambiarEstadoCasa = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.casas_comerciales
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
 * Actualizar una casa comercial.
 */
const actualizarCasa = async (req, res) => {
  const { id } = req.params;
  const { nombre, ruc, correos } = req.body;

  if (!nombre || !nombre.trim()) {
    throw new AppError("Ingrese el nombre de la casa comercial", 400);
  }

  const pool = await getPool();

  try {
    await pool.request()
      .input("id", sql.Int, Number(id))
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("ruc", sql.VarChar, ruc ? ruc.trim() : null)
      .input("correos", sql.VarChar, correos ? correos.trim() : null)
      .query(`
        UPDATE dbo.casas_comerciales
        SET
          nombre = @nombre,
          ruc = @ruc,
          correos = @correos
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("La casa comercial ya existe", 400);
    }
    throw error;
  }
};

module.exports = {
  listarCasas,
  crearCasa,
  cambiarEstadoCasa,
  actualizarCasa
};
