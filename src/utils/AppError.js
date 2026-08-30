class AppError extends Error {
  /**
   * @param {string} message Mensaje de error descriptivo
   * @param {number} statusCode Código de estado HTTP (por defecto 500)
   * @param {any} details Detalles adicionales u objeto de error original
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
