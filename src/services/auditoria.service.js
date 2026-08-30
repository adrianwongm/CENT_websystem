const { getPool, sql } = require("../config/db");

/**
 * Registra un evento de auditoría en dbo.auditoria_eventos.
 * Extraído de la lógica original de server.js.
 * @param {Object} params
 * @param {string} params.usuario Nombre de usuario que realiza la acción
 * @param {string} params.modulo Módulo del sistema (ej: DESCARGOS, INVENTARIO, CUARENTENA)
 * @param {string} params.accion Acción ejecutada (ej: REGISTRAR DESCARGO, MOVER CUARENTENA)
 * @param {string} params.detalle Detalles descriptivos del evento
 * @param {sql.Transaction} [params.transaction] Transacción SQL activa opcional
 */
async function registrarAuditoria({
  usuario,
  modulo,
  accion,
  detalle,
  transaction = null
}) {
  try {
    const pool = transaction ? null : await getPool();
    const request = transaction
      ? new sql.Request(transaction)
      : pool.request();

    await request
      .input("usuario", sql.VarChar, String(usuario || "SISTEMA").slice(0, 100))
      .input("modulo", sql.VarChar, String(modulo || "").slice(0, 100))
      .input("accion", sql.VarChar, String(accion || "").slice(0, 100))
      .input("detalle", sql.VarChar, String(detalle || "").slice(0, 500))
      .query(`
        INSERT INTO dbo.auditoria_eventos (
          usuario,
          modulo,
          accion,
          detalle
        )
        VALUES (
          @usuario,
          @modulo,
          @accion,
          @detalle
        )
      `);
  } catch (error) {
    // La auditoría no debe romper la transacción principal
    console.warn("⚠️ No se pudo registrar auditoría:", error.message);
  }
}

module.exports = {
  registrarAuditoria
};
