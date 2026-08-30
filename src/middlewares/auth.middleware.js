/**
 * Middleware para validar que exista una sesión activa de usuario.
 * Extraído de la lógica original de server.js.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
}

/**
 * Obtiene la información normalizada del usuario activo desde la sesión.
 * Extraído de la lógica original de server.js.
 * @param {import('express').Request} req
 * @returns {{ id: number|null, username: string, nombreCompleto: string, rol: string }}
 */
function obtenerUsuarioSesionHC(req) {
  return {
    id: req.session?.usuario?.id || req.session?.usuarioId || req.session?.userId || null,
    username: String(
      req.session?.username ||
      req.session?.usuario?.username ||
      ""
    ).trim(),

    nombreCompleto: String(
      req.session?.nombreCompleto ||
      req.session?.usuario?.nombreCompleto ||
      req.session?.username ||
      ""
    ).trim(),

    rol: String(
      req.session?.rol ||
      req.session?.usuario?.rol ||
      ""
    ).trim().toUpperCase()
  };
}

module.exports = {
  requireAuth,
  obtenerUsuarioSesionHC
};
