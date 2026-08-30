const fs = require("fs");
const path = require("path");
const { PATHS } = require("../config/constants");

/**
 * Inserta una imagen (firma o sello de profesional) dentro de un campo rectangular de un formulario PDF.
 * Extraído directamente de la función insertarImagenEnCampoPDF008 de server.js.
 *
 * @param {Object} params
 * @param {import('pdf-lib').PDFDocument} params.pdfDoc Documento PDF en memoria
 * @param {import('pdf-lib').PDFForm} params.formulario Formulario interactivo de pdf-lib
 * @param {string} params.nombreCampo Nombre del campo de texto donde se incrustará la imagen
 * @param {string} params.rutaImagen Ruta relativa o absoluta de la imagen
 * @returns {Promise<boolean>} Retorna true si se insertó con éxito, false en caso contrario
 */
async function insertarImagenEnCampoPDF({
  pdfDoc,
  formulario,
  nombreCampo,
  rutaImagen
}) {
  if (!rutaImagen) return false;

  try {
    const rutaAbsoluta = path.isAbsolute(rutaImagen)
      ? rutaImagen
      : path.resolve(PATHS.ROOT, rutaImagen);

    const carpetaPermitida = path.resolve(PATHS.ARCHIVOS_PROFESIONALES);

    if (!rutaAbsoluta.startsWith(carpetaPermitida)) {
      throw new Error("La ruta de la imagen no está permitida");
    }

    if (!fs.existsSync(rutaAbsoluta)) {
      throw new Error("No se encontró el archivo de imagen");
    }

    const campo = formulario.getTextField(nombreCampo);
    const widgets = campo.acroField.getWidgets();

    if (!widgets.length) {
      throw new Error("El campo no tiene una ubicación válida");
    }

    const widget = widgets[0];
    const rectangulo = widget.getRectangle();
    const referenciaPagina = widget.P();
    const paginas = pdfDoc.getPages();

    const pagina = paginas.find((paginaPDF) => {
      if (!referenciaPagina) return false;
      return (
        paginaPDF.ref === referenciaPagina ||
        paginaPDF.ref.toString() === referenciaPagina.toString()
      );
    });

    if (!pagina) {
      throw new Error(`No se pudo localizar la página de ${nombreCampo}`);
    }

    const bytesImagen = fs.readFileSync(rutaAbsoluta);
    const extension = path.extname(rutaAbsoluta).toLowerCase();

    let imagen;
    if (extension === ".png") {
      imagen = await pdfDoc.embedPng(bytesImagen);
    } else if (extension === ".jpg" || extension === ".jpeg") {
      imagen = await pdfDoc.embedJpg(bytesImagen);
    } else {
      throw new Error("La imagen debe ser PNG o JPG");
    }

    const escala = Math.min(
      rectangulo.width / imagen.width,
      rectangulo.height / imagen.height
    );

    const anchoImagen = imagen.width * escala;
    const altoImagen = imagen.height * escala;

    pagina.drawImage(imagen, {
      x: rectangulo.x + (rectangulo.width - anchoImagen) / 2,
      y: rectangulo.y + (rectangulo.height - altoImagen) / 2,
      width: anchoImagen,
      height: altoImagen
    });

    campo.setText("");

    widgets.forEach((widgetCampo) => {
      try {
        widgetCampo.getBorderStyle()?.setWidth(0);
      } catch (errorBorde) {
        console.warn(
          `No se pudo ocultar el borde de ${nombreCampo}:`,
          errorBorde.message
        );
      }
    });

    campo.enableReadOnly();
    return true;
  } catch (error) {
    console.warn(
      `No se pudo insertar la imagen en "${nombreCampo}":`,
      error.message
    );
    return false;
  }
}

module.exports = {
  insertarImagenEnCampoPDF
};
