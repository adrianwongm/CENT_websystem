const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

async function generarPdfPrueba008() {
  try {
    const rutaPlantilla = path.join(
      __dirname,
      "plantillas_hclinicas",
      "008prueba.pdf"
    );

    const rutaSalida = path.join(
      __dirname,
      "plantillas_hclinicas",
      "008prueba_generado.pdf"
    );

    if (!fs.existsSync(rutaPlantilla)) {
      console.error("No se encontró la plantilla:");
      console.error(rutaPlantilla);
      return;
    }

    const pdfBytes = fs.readFileSync(rutaPlantilla);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();

    form
      .getTextField("paciente_h_clinica")
      .setText("1312007030");

    form
      .getTextField("primer_apellido_paciente")
      .setText("PEREZ");

    form
      .getTextField("fecha_admision_paciente")
      .setText("30/07/2026");

    form
      .getTextField("narchivo_paciente")
      .setText("000125");

    form
      .getTextField("enfermedad_problemaactual_paciente")
      .setText(
        "paciente de 39 años de edad, con antecedentes patológicos personales de trauma craneo encefalico por accidente de transito, niega alergias medicamentosas. acude a esta casa de salud acompañado por su familiar posterior a presentar cuadro clínico de inicio súbito hace aproximadamente 5 horas, caracterizado por cefalea occipital de intensidad eva 9/10, descrita como pulsátil e incapacitante, asociada a amaurosis con ceguera transitoria del ojo izquierdo, fotopsías, hipoacusia de predominio izquierdo, náuseas, vómitos en dos ocasiones, mareo rotatorio, disartria, parestesias en hemicuerpo derecho, hemiparesia derecha de predominio crural y somnolencia progresiva. familiar refiere que la paciente presentó dificultad para articular palabras, desorientación temporal y enlentecimiento psicomotor previo a su ingreso. a la valoración clínica inicial se evidencia paciente en regular estado general, bradipsíquica, con facies álgica, taquipneica, saturación de oxígeno levemente disminuida, presión arterial de 205/107 mmhg y manifestaciones clínicas altamente sugestivas de evento neurovascular agudo secundario a probable aneurisma cerebral, con glasgow 11/15 (o3 v3 m5). en virtud del déficit neurológico focal, la alteración del nivel de conciencia y la presencia de trastornos visuales y auditivos de inicio agudo, se decide su ingreso hospitalario para monitorización clínica continua y manejo clinico"
      );

    form.updateFieldAppearances();

    const pdfFinal = await pdfDoc.save();

    fs.writeFileSync(rutaSalida, pdfFinal);

    console.log("PDF 008 generado correctamente:");
    console.log(rutaSalida);
  } catch (error) {
    console.error("Error generando el PDF 008:", error);
  }
}

generarPdfPrueba008();