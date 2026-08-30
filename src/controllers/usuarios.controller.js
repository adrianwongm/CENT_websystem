const bcrypt = require("bcrypt");
const { getPool, sql } = require("../config/db");
const { obtenerUsuarioSesionHC } = require("../middlewares/auth.middleware");
const AppError = require("../utils/AppError");

/**
 * Listar todos los usuarios registrados.
 */
const listarUsuarios = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      id,
      apellido1,
      apellido2,
      nombre1,
      nombre2,
      username,
      rol,
      estado,
      fecha_creacion
    FROM dbo.usuarios
    ORDER BY id DESC
  `);

  res.json(result.recordset);
};

/**
 * Crear un nuevo usuario con contraseña hasheada.
 */
const crearUsuario = async (req, res) => {
  const {
    apellido1,
    apellido2,
    nombre1,
    nombre2,
    username,
    password,
    rol,
    estado
  } = req.body;

  if (!apellido1 || !nombre1 || !username || !password || !rol || !estado) {
    throw new AppError("Datos incompletos", 400);
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();

  try {
    await pool
      .request()
      .input("apellido1", sql.VarChar, apellido1)
      .input("apellido2", sql.VarChar, apellido2 || null)
      .input("nombre1", sql.VarChar, nombre1)
      .input("nombre2", sql.VarChar, nombre2 || null)
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, hash)
      .input("rol", sql.VarChar, rol)
      .input("estado", sql.VarChar, estado)
      .query(`
        INSERT INTO dbo.usuarios (
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          username,
          password,
          rol,
          estado
        )
        VALUES (
          @apellido1,
          @apellido2,
          @nombre1,
          @nombre2,
          @username,
          @password,
          @rol,
          @estado
        )
      `);

    res.json({ ok: true });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("El usuario ya existe", 400);
    }
    throw error;
  }
};

/**
 * Alternar estado ACTIVO / INACTIVO de un usuario.
 */
const cambiarEstadoUsuario = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.usuarios
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
 * Editar la información básica de un usuario.
 */
const editarUsuario = async (req, res) => {
  const { id } = req.params;
  const {
    apellido1,
    apellido2,
    nombre1,
    nombre2,
    username,
    rol,
    estado
  } = req.body;

  if (!apellido1 || !nombre1 || !username || !rol || !estado) {
    throw new AppError("Datos incompletos", 400);
  }

  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .input("apellido1", sql.VarChar, apellido1)
    .input("apellido2", sql.VarChar, apellido2 || null)
    .input("nombre1", sql.VarChar, nombre1)
    .input("nombre2", sql.VarChar, nombre2 || null)
    .input("username", sql.VarChar, username)
    .input("rol", sql.VarChar, rol)
    .input("estado", sql.VarChar, estado)
    .input("actualizado_por", sql.VarChar, usuarioSesion.username)
    .query(`
      UPDATE dbo.usuarios
      SET
        apellido1 = @apellido1,
        apellido2 = @apellido2,
        nombre1 = @nombre1,
        nombre2 = @nombre2,
        username = @username,
        rol = @rol,
        estado = @estado,
        actualizado_por = @actualizado_por,
        fecha_actualizacion = GETDATE()
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/**
 * Modificar la contraseña de un usuario.
 */
const cambiarPassword = async (req, res) => {
  const { id } = req.params;
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    throw new AppError("Nueva contraseña requerida", 400);
  }

  const hash = await bcrypt.hash(nuevaPassword, 10);
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .input("password", sql.VarChar, hash)
    .input("actualizado_por", sql.VarChar, usuarioSesion.username)
    .query(`
      UPDATE dbo.usuarios
      SET
        password = @password,
        actualizado_por = @actualizado_por,
        fecha_actualizacion = GETDATE()
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/* =========================================================
   PERMISOS RBAC
   ========================================================= */

/**
 * Catálogo general de permisos del sistema.
 */
const catalogoPermisos = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      id,
      codigo,
      nombre,
      modulo,
      permiso_padre,
      orden,
      activo
    FROM dbo.permisos_sistema
    WHERE activo = 1
    ORDER BY orden, id;
  `);

  res.json(result.recordset);
};

/**
 * Listar roles existentes con permisos o usuarios asociados.
 */
const listarRoles = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DISTINCT rol
    FROM (
      SELECT
        UPPER(LTRIM(RTRIM(rol))) AS rol
      FROM dbo.usuarios
      WHERE rol IS NOT NULL AND LTRIM(RTRIM(rol)) <> ''

      UNION

      SELECT
        UPPER(LTRIM(RTRIM(rol))) AS rol
      FROM dbo.roles_permisos
      WHERE rol IS NOT NULL AND LTRIM(RTRIM(rol)) <> ''

      UNION SELECT 'ADMIN'
      UNION SELECT 'INVENTARIO'
      UNION SELECT 'DESCARGOS'
      UNION SELECT 'AUDITORIA'
    ) roles
    WHERE rol IS NOT NULL
    ORDER BY rol;
  `);

  res.json(result.recordset.map((x) => x.rol));
};

/**
 * Consultar permisos asignados a un rol específico.
 */
const obtenerPermisosRol = async (req, res) => {
  const rol = String(req.params.rol || "").trim().toUpperCase();

  if (!rol) {
    throw new AppError("Rol no válido", 400);
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("rol", sql.VarChar, rol)
    .query(`
      SELECT
        p.codigo,
        p.nombre,
        p.modulo,
        p.permiso_padre,
        p.orden,
        ISNULL(rp.permitido, 0) AS permitido
      FROM dbo.permisos_sistema p
      LEFT JOIN dbo.roles_permisos rp
        ON rp.permiso_codigo = p.codigo
        AND rp.rol = @rol
      WHERE p.activo = 1
      ORDER BY p.orden, p.id;
    `);

  res.json({
    rol,
    permisos: result.recordset
  });
};

/**
 * Guardar o actualizar la matriz de permisos de un rol (exclusivo ADMIN).
 */
const guardarPermisosRol = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);

  if (String(usuarioSesion.rol || "").toUpperCase() !== "ADMIN") {
    throw new AppError("Solo ADMIN puede modificar permisos", 403);
  }

  const rol = String(req.params.rol || "").trim().toUpperCase();
  const permisos = Array.isArray(req.body?.permisos) ? req.body.permisos : [];

  if (!rol) {
    throw new AppError("Rol no válido", 400);
  }

  if (rol === "ADMIN") {
    throw new AppError("Los permisos del rol ADMIN son permanentes", 400);
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    await new sql.Request(transaction)
      .input("rol", sql.VarChar, rol)
      .query(`DELETE FROM dbo.roles_permisos WHERE rol = @rol;`);

    for (const codigo of permisos) {
      const codigoLimpio = String(codigo || "").trim();
      if (!codigoLimpio) continue;

      await new sql.Request(transaction)
        .input("rol", sql.VarChar, rol)
        .input("permiso_codigo", sql.VarChar, codigoLimpio)
        .input("actualizado_por", sql.VarChar, usuarioSesion.username)
        .query(`
          IF EXISTS (
            SELECT 1 FROM dbo.permisos_sistema
            WHERE codigo = @permiso_codigo AND activo = 1
          )
          BEGIN
            INSERT INTO dbo.roles_permisos (
              rol,
              permiso_codigo,
              permitido,
              actualizado_por,
              fecha_actualizacion
            )
            VALUES (
              @rol,
              @permiso_codigo,
              1,
              @actualizado_por,
              SYSDATETIME()
            );
          END;
        `);
    }

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: `Permisos del rol ${rol} guardados correctamente`
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}
    throw error;
  }
};

/**
 * Consultar permisos y excepciones individuales de un usuario.
 */
const obtenerPermisosUsuario = async (req, res) => {
  const usuarioId = Number(req.params.id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new AppError("Usuario no válido", 400);
  }

  const pool = await getPool();
  const usuarioResult = await pool
    .request()
    .input("usuario_id", sql.Int, usuarioId)
    .query(`
      SELECT TOP 1 id, username, rol, estado
      FROM dbo.usuarios
      WHERE id = @usuario_id;
    `);

  if (!usuarioResult.recordset.length) {
    throw new AppError("Usuario no encontrado", 404);
  }

  const usuario = usuarioResult.recordset[0];

  const permisosResult = await pool
    .request()
    .input("usuario_id", sql.Int, usuarioId)
    .input("rol", sql.VarChar, String(usuario.rol || "").toUpperCase())
    .query(`
      SELECT
        p.codigo,
        p.nombre,
        p.modulo,
        p.permiso_padre,
        p.orden,
        CASE
          WHEN up.id IS NOT NULL THEN up.permitido
          WHEN rp.id IS NOT NULL THEN rp.permitido
          ELSE 0
        END AS permitido_efectivo,
        CASE
          WHEN up.id IS NULL THEN NULL
          ELSE up.permitido
        END AS permiso_usuario,
        ISNULL(rp.permitido, 0) AS permiso_rol
      FROM dbo.permisos_sistema p
      LEFT JOIN dbo.roles_permisos rp
        ON rp.permiso_codigo = p.codigo
        AND rp.rol = @rol
      LEFT JOIN dbo.usuarios_permisos up
        ON up.permiso_codigo = p.codigo
        AND up.usuario_id = @usuario_id
      WHERE p.activo = 1
      ORDER BY p.orden, p.id;
    `);

  res.json({
    usuario: {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      estado: usuario.estado
    },
    permisos: permisosResult.recordset
  });
};

/**
 * Guardar excepciones individuales de un usuario (exclusivo ADMIN).
 */
const guardarPermisosUsuario = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);

  if (String(usuarioSesion.rol || "").toUpperCase() !== "ADMIN") {
    throw new AppError("Solo ADMIN puede modificar permisos individuales", 403);
  }

  const usuarioId = Number(req.params.id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new AppError("Usuario no válido", 400);
  }

  const permisos = Array.isArray(req.body?.permisos) ? req.body.permisos : [];
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    await new sql.Request(transaction)
      .input("usuario_id", sql.Int, usuarioId)
      .query(`DELETE FROM dbo.usuarios_permisos WHERE usuario_id = @usuario_id;`);

    for (const item of permisos) {
      const codigo = String(item?.codigo || "").trim();
      if (!codigo) continue;

      const permitido =
        item?.valor === true || item?.valor === 1 || item?.valor === "1";

      await new sql.Request(transaction)
        .input("usuario_id", sql.Int, usuarioId)
        .input("permiso_codigo", sql.VarChar, codigo)
        .input("permitido", sql.Bit, permitido ? 1 : 0)
        .input("actualizado_por", sql.VarChar, usuarioSesion.username)
        .query(`
          IF EXISTS (
            SELECT 1 FROM dbo.permisos_sistema
            WHERE codigo = @permiso_codigo AND activo = 1
          )
          BEGIN
            INSERT INTO dbo.usuarios_permisos (
              usuario_id,
              permiso_codigo,
              permitido,
              actualizado_por,
              fecha_actualizacion
            )
            VALUES (
              @usuario_id,
              @permiso_codigo,
              @permitido,
              @actualizado_por,
              SYSDATETIME()
            );
          END;
        `);
    }

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: "Permisos individuales guardados correctamente"
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}
    throw error;
  }
};

/**
 * Obtener permisos efectivos del usuario activo en sesión.
 */
const obtenerMisPermisos = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const usuarioId = Number(usuarioSesion.id || req.session?.usuario?.id || 0);
  const rol = String(usuarioSesion.rol || req.session?.usuario?.rol || "").trim().toUpperCase();

  const pool = await getPool();

  if (rol === "ADMIN") {
    const result = await pool.request().query(`
      SELECT codigo
      FROM dbo.permisos_sistema
      WHERE activo = 1
      ORDER BY orden;
    `);

    return res.json({
      usuarioId,
      rol,
      permisos: result.recordset.map((x) => x.codigo)
    });
  }

  if (!usuarioId || !rol) {
    throw new AppError("No se pudo identificar al usuario activo", 401);
  }

  const result = await pool
    .request()
    .input("usuario_id", sql.Int, usuarioId)
    .input("rol", sql.VarChar, rol)
    .query(`
      SELECT
        p.codigo,
        CASE
          WHEN up.id IS NOT NULL THEN up.permitido
          WHEN rp.id IS NOT NULL THEN rp.permitido
          ELSE 0
        END AS permitido
      FROM dbo.permisos_sistema p
      LEFT JOIN dbo.roles_permisos rp
        ON rp.permiso_codigo = p.codigo
        AND rp.rol = @rol
      LEFT JOIN dbo.usuarios_permisos up
        ON up.permiso_codigo = p.codigo
        AND up.usuario_id = @usuario_id
      WHERE p.activo = 1;
    `);

  const permisos = result.recordset
    .filter((x) => Number(x.permitido) === 1)
    .map((x) => x.codigo);

  res.json({
    usuarioId,
    rol,
    permisos
  });
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
  editarUsuario,
  cambiarPassword,
  catalogoPermisos,
  listarRoles,
  obtenerPermisosRol,
  guardarPermisosRol,
  obtenerPermisosUsuario,
  guardarPermisosUsuario,
  obtenerMisPermisos
};
