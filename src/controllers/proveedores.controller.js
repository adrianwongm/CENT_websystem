const { getPool, sql } = require("../config/db");
const AppError = require("../utils/AppError");

/**
 * Listar todos los proveedores.
 */
const listarProveedores = async (req, res) => {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      id,
      nombre,
      ruc,
      correo,
      telefono,
      notas,
      estado,
      fecha_creacion
    FROM dbo.proveedores
    ORDER BY nombre ASC
  `);

  res.json(result.recordset);
};

/**
 * Crear un proveedor.
 */
const crearProveedor = async (req, res) => {
  const { nombre, ruc, correo, telefono, notas } = req.body;

  if (!nombre || !nombre.trim()) {
    throw new AppError("Ingrese el nombre del proveedor", 400);
  }

  if (!ruc || !ruc.trim()) {
    throw new AppError("Ingrese el RUC del proveedor", 400);
  }

  const pool = await getPool();

  try {
    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("ruc", sql.VarChar, ruc.trim())
      .input("correo", sql.VarChar, correo ? correo.trim() : null)
      .input("telefono", sql.VarChar, telefono ? telefono.trim() : null)
      .input("notas", sql.VarChar, notas ? notas.trim() : null)
      .query(`
        INSERT INTO dbo.proveedores (
          nombre,
          ruc,
          correo,
          telefono,
          notas
        )
        VALUES (
          @nombre,
          @ruc,
          @correo,
          @telefono,
          @notas
        )
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe un proveedor con ese RUC", 400);
    }
    throw error;
  }
};

/**
 * Editar un proveedor.
 */
const editarProveedor = async (req, res) => {
  const { id } = req.params;
  const { nombre, ruc, correo, telefono, notas } = req.body;

  if (!nombre || !nombre.trim()) {
    throw new AppError("Ingrese el nombre del proveedor", 400);
  }

  if (!ruc || !ruc.trim()) {
    throw new AppError("Ingrese el RUC del proveedor", 400);
  }

  const pool = await getPool();

  try {
    await pool.request()
      .input("id", sql.Int, Number(id))
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("ruc", sql.VarChar, ruc.trim())
      .input("correo", sql.VarChar, correo ? correo.trim() : null)
      .input("telefono", sql.VarChar, telefono ? telefono.trim() : null)
      .input("notas", sql.VarChar, notas ? notas.trim() : null)
      .query(`
        UPDATE dbo.proveedores
        SET
          nombre = @nombre,
          ruc = @ruc,
          correo = @correo,
          telefono = @telefono,
          notas = @notas
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe un proveedor con ese RUC", 400);
    }
    throw error;
  }
};

/**
 * Cambiar estado de un proveedor.
 */
const cambiarEstadoProveedor = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.proveedores
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
  listarProveedores,
  crearProveedor,
  editarProveedor,
  cambiarEstadoProveedor
};
