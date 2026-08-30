const mailTransporter = require("../config/mail");

/**
 * Helper centralizado para envío de correos electrónicos vía Nodemailer.
 * Extraído de la lógica original de server.js.
 * @param {Object} opciones
 * @param {string} opciones.to Destinatario(s)
 * @param {string} opciones.subject Asunto del correo
 * @param {string} [opciones.text] Texto plano
 * @param {string} [opciones.html] Contenido HTML
 * @param {Array} [opciones.attachments] Adjuntos
 */
async function enviarCorreo({ to, subject, text, html, attachments = [] }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Faltan variables MAIL_USER o MAIL_PASS en .env");
  }

  return await mailTransporter.sendMail({
    from: `"CENT Hemodinamia" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments
  });
}

module.exports = {
  enviarCorreo
};
