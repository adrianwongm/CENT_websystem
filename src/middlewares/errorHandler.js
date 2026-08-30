const AppError = require("../utils/AppError");

/**
 * Middleware centralizado de manejo de errores para Express.
 * Captura excepciones operacionales, errores de SQL Server y de subida de archivos,
 * devolviendo respuestas JSON consistentes con códigos de estado HTTP adecuados.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let mensaje = err.message || "Error interno del servidor";
  let detalle = err.details || null;

  // Error de clave duplicada en SQL Server (Violación de restricción UNIQUE o PRIMARY KEY)
  if (err.number === 2627) {
    statusCode = 400;
    if (!err.isOperational) {
      mensaje = "El registro ya existe en el sistema";
    }
  }

  // Errores de Multer (tamaño excedido, campos inválidos)
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      mensaje = "El archivo supera el tamaño máximo permitido";
    }
  }

  // Detección de mensajes de error emitidos por transacciones de Historias Clínicas (Formularios 001, 008, 018)
  const mensajeSQL =
    err?.originalError?.info?.message ||
    err?.precedingErrors?.[0]?.message ||
    err?.message ||
    "";

  if (
    mensajeSQL.includes("No existe un borrador") ||
    mensajeSQL.includes("ya no se encuentra en estado BORRADOR") ||
    mensajeSQL.includes("no corresponde al formulario") ||
    mensajeSQL.includes("ya fue cerrado") ||
    mensajeSQL.includes("no se encuentra en estado CERRADO")
  ) {
    statusCode = 409;
    detalle = mensajeSQL;
  } else if (mensajeSQL.includes("No existe el formulario")) {
    statusCode = 404;
    detalle = mensajeSQL;
  }

  // Logging según severidad
  if (statusCode >= 500) {
    console.error("🔴 [SERVER ERROR]:", err);
  } else {
    console.warn(`🟡 [CLIENT ERROR ${statusCode}]:`, mensaje);
  }

  const respuesta = {
    ok: false,
    error: mensaje
  };

  if (detalle) {
    respuesta.detalle = detalle;
  }

  if (process.env.NODE_ENV === "development" && statusCode >= 500) {
    respuesta.stack = err.stack;
  }

  return res.status(statusCode).json(respuesta);
}

module.exports = errorHandler;
