/**
 * Formatea una fecha para consultas e inserciones en SQL Server (YYYY-MM-DD).
 * Extraído de la lógica original de server.js.
 * @param {string|Date|any} valor
 * @returns {string} Fecha normalizada YYYY-MM-DD o cadena vacía
 */
function formatearFechaSQL(valor) {
  if (!valor) return "";

  if (typeof valor === "string") {
    return valor.slice(0, 10);
  }

  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }

  return String(valor).slice(0, 10);
}

/**
 * Convierte fechas con formato YYYY-MM-DD al formato legible para PDF (DD/MM/YYYY).
 * Extraído de la lógica original de server.js.
 * @param {string|any} valor
 * @returns {string} Fecha formateada DD/MM/YYYY
 */
function formatearFechaPDF(valor) {
  if (!valor) return "";

  const texto = String(valor).trim();
  const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (coincidencia) {
    return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
  }

  return texto;
}

module.exports = {
  formatearFechaSQL,
  formatearFechaPDF
};
