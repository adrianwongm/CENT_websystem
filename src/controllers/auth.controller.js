const bcrypt = require("bcrypt");
const path = require("path");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const { obtenerUsuarioSesionHC } = require("../middlewares/auth.middleware");

/**
 * Renderiza la página de login (index.html).
 */
const renderLogin = (req, res) => {
  res.sendFile(path.join(PATHS.PUBLIC, "index.html"));
};

/**
 * Renderiza el panel administrativo (panel.html) validando sesión activa.
 */
const renderPanel = (req, res) => {
  if (!req.session?.usuario) {
    return res.redirect("/");
  }
  res.sendFile(path.join(PATHS.PUBLIC, "panel.html"));
};

/**
 * Procesa la autenticación de usuarios.
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  const pool = await getPool();
  const result = await pool
    .request()
    .input("username", sql.VarChar, username)
    .query(`
      SELECT 
        id,
        apellido1,
        apellido2,
        nombre1,
        nombre2,
        username,
        password,
        rol,
        estado
      FROM usuarios
      WHERE username = @username
    `);

  if (!result.recordset.length) {
    return res.status(401).json({
      ok: false,
      mensaje: "Usuario o contraseña incorrectos"
    });
  }

  const usuario = result.recordset[0];

  if (usuario.estado !== "ACTIVO") {
    return res.status(403).json({
      ok: false,
      mensaje: "Usuario inactivo"
    });
  }

  const coincide = await bcrypt.compare(password, usuario.password);
  if (!coincide) {
    return res.status(401).json({
      ok: false,
      mensaje: "Usuario o contraseña incorrectos"
    });
  }

  req.session.usuario = {
    id: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
    nombreCompleto: [
      usuario.apellido1,
      usuario.apellido2,
      usuario.nombre1,
      usuario.nombre2
    ]
      .filter(Boolean)
      .join(" ")
  };

  res.json({
    ok: true,
    mensaje: "Login correcto"
  });
};

/**
 * Cierra la sesión activa y redirige a la raíz.
 */
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

/**
 * Retorna la información del usuario autenticado en la sesión.
 */
const obtenerUsuarioActual = (req, res) => {
  const usuario = obtenerUsuarioSesionHC(req);

  return res.json({
    username: usuario.username,
    nombreCompleto: usuario.nombreCompleto,
    rol: usuario.rol
  });
};

/**
 * Test de conectividad a la base de datos SQL Server.
 */
const testDb = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      @@SERVERNAME AS servidor,
      DB_NAME() AS base_actual
  `);

  res.json({
    ok: true,
    data: result.recordset
  });
};

module.exports = {
  renderLogin,
  renderPanel,
  login,
  logout,
  obtenerUsuarioActual,
  testDb
};
