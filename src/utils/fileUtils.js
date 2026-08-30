/**
 * Limpia y normaliza el nombre de carpetas de pacientes para el almacenamiento en disco,
 * removiendo tildes, diacríticos y caracteres no permitidos en sistemas de archivos.
 * Extraído de la lógica original de server.js.
 * @param {string} texto
 * @returns {string} Nombre seguro de directorio en mayúsculas
 */
function limpiarNombreCarpeta(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase()
    .slice(0, 120);
}

/**
 * Limpia nombres de archivo para formularios e historias clínicas PDF,
 * asegurando caracteres válidos en Windows/Linux.
 * Extraído de la lógica original de server.js.
 * @param {string} valor
 * @returns {string} Nombre seguro de archivo
 */
function limpiarNombreArchivoHC(valor) {
  return String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

module.exports = {
  limpiarNombreCarpeta,
  limpiarNombreArchivoHC
};
