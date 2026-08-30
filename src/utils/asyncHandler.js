/**
 * Envuelve funciones asíncronas de controladores y middlewares para delegar
 * cualquier excepción no capturada directamente al middleware global de errores.
 * @param {Function} fn Controlador o middleware asíncrono
 * @returns {Function} Middleware de Express estándar
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
