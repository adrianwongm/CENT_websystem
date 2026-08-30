const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Listar todas las bodegas.
 */
const listarBodegas = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      nombre,
      ISNULL(estado, 'ACTIVO') AS estado,
      fecha_creacion
    FROM dbo.bodegas
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Crear una nueva bodega.
 */
const crearBodega = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    throw new AppError("Ingrese el nombre de la bodega", 400);
  }

  const pool = await getPool();

  try {
    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .query(`
        INSERT INTO dbo.bodegas (nombre)
        VALUES (@nombre)
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("La bodega ya existe", 400);
    }
    throw error;
  }
};

/**
 * Cambiar estado (ACTIVO / INACTIVO) de una bodega.
 */
const cambiarEstadoBodega = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.bodegas
      SET estado =
        CASE
          WHEN estado = 'ACTIVO' THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END
      WHERE id = @id
    `);

  res.json({ ok: true });
};

module.exports = {
  listarBodegas,
  crearBodega,
  cambiarEstadoBodega
};
