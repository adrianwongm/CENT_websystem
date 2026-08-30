const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Listar todos los reclutadores.
 */
const listarReclutadores = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      id,
      apellido1,
      apellido2,
      nombre1,
      nombre2,
      cedula,
      estado,
      fecha_creacion
    FROM dbo.reclutadores
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Crear un nuevo reclutador.
 */
const crearReclutador = async (req, res) => {
  const {
    primerApellido,
    segundoApellido,
    primerNombre,
    segundoNombre,
    cedula
  } = req.body;

  if (!primerApellido || !segundoApellido || !primerNombre || !segundoNombre || !cedula) {
    throw new AppError("Datos incompletos", 400);
  }

  const pool = await getPool();

  try {
    await pool
      .request()
      .input("apellido1", sql.VarChar, primerApellido)
      .input("apellido2", sql.VarChar, segundoApellido)
      .input("nombre1", sql.VarChar, primerNombre)
      .input("nombre2", sql.VarChar, segundoNombre)
      .input("cedula", sql.VarChar, cedula)
      .query(`
        INSERT INTO dbo.reclutadores (
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          cedula
        )
        VALUES (
          @apellido1,
          @apellido2,
          @nombre1,
          @nombre2,
          @cedula
        )
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("La cédula ya existe", 400);
    }
    throw error;
  }
};

/**
 * Alternar estado ACTIVO / INACTIVO de un reclutador.
 */
const cambiarEstadoReclutador = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.reclutadores
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
  listarReclutadores,
  crearReclutador,
  cambiarEstadoReclutador
};
