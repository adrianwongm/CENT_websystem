const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable");
const fs = require("fs");
const path = require("path");
const { PATHS } = require("../config/constants");

/**
 * Obtiene la imagen de fondo base del reporte de consignación en Base64.
 * @returns {string}
 */
function obtenerPlantillaReporteBase64() {
  const rutaPlantilla = path.join(
    PATHS.PUBLIC,
    "images",
    "plantilla_reporte.png"
  );

  if (!fs.existsSync(rutaPlantilla)) {
    throw new Error(
      "No se encontró la plantilla_reporte.png en public/images"
    );
  }

  const fileBuffer = fs.readFileSync(rutaPlantilla);
  return fileBuffer.toString("base64");
}

/**
 * Genera el reporte PDF de insumos de consignación utilizando jsPDF y autoTable.
 * Extraído de la lógica original de server.js.
 * @param {Object} params
 * @param {string} params.casaComercial Nombre de la casa comercial
 * @param {Array} params.registros Listado de consumos de consignación
 * @returns {Buffer} Buffer binario del PDF generado
 */
function generarPdfConsignacionBase64({ casaComercial, registros }) {
  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const plantillaBase64 = obtenerPlantillaReporteBase64();

  const drawBackground = () => {
    doc.addImage(plantillaBase64, "PNG", 0, 0, pageWidth, pageHeight);
  };

  const filas = (registros || []).map((item) => [
    item.fecha_procedimiento || "",
    item.nombre_paciente || "",
    item.codigo || "",
    item.codigo_proveedor || "",
    item.producto || "",
    String(item.cantidad || 0),
    item.lote || "",
    item.fecha_expiracion || ""
  ]);

  autoTable.default ? autoTable.default(doc, getAutoTableOptions()) : autoTable(doc, getAutoTableOptions());

  function getAutoTableOptions() {
    return {
      startY: 210,
      head: [
        [
          "Fecha proc.",
          "Paciente",
          "Código",
          "Cód. proveedor",
          "Producto",
          "Cant.",
          "Lote",
          "F. Exp."
        ]
      ],
      body: filas.length
        ? filas
        : [["", "", "", "", "No hay detalle", "", "", ""]],
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        valign: "middle"
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold"
      },
      margin: {
        top: 210,
        left: 28,
        right: 28,
        bottom: 60
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 95 },
        2: { cellWidth: 42 },
        3: { cellWidth: 58 },
        4: { cellWidth: 110 },
        5: { cellWidth: 30, halign: "center" },
        6: { cellWidth: 45 },
        7: { cellWidth: 45 }
      },
      willDrawPage: function () {
        drawBackground();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(
          "REPORTE INSUMOS UTILIZADOS EN CONSIGNACIÓN",
          pageWidth / 2,
          92,
          { align: "center" }
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text(`Casa comercial: ${casaComercial || ""}`, 50, 135);
        doc.text(
          `Total de registros: ${(registros || []).length}`,
          50,
          153
        );

        if (registros && registros.length) {
          const fechas = registros
            .map((x) => x.fecha_procedimiento || "")
            .filter(Boolean)
            .sort();

          const fechaMin = fechas.length ? fechas[fechas.length - 1] : "";
          const fechaMax = fechas.length ? fechas[0] : "";

          doc.text(
            `Rango de fechas: ${fechaMin}${
              fechaMin !== fechaMax ? " a " + fechaMax : ""
            }`,
            50,
            171
          );
        }
      }
    };
  }

  return Buffer.from(doc.output("arraybuffer"));
}

module.exports = {
  obtenerPlantillaReporteBase64,
  generarPdfConsignacionBase64
};
