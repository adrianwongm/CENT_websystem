const { PDFDocument, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const { formatearFechaPDF } = require("../utils/dateUtils");
const { limpiarNombreArchivoHC } = require("../utils/fileUtils");
const { insertarImagenEnCampoPDF } = require("../utils/pdfImageHelper");
const AppError = require("../utils/AppError");

const CAMPOS_TEXTO_008 = [
  "paciente_h_clinica",
  "narchivo_paciente",
  "fecha_admision_paciente",
  "nombre_admisionista",
  "primer_apellido_paciente",
  "segundo_apellido_paciente",
  "primer_nombre_paciente",
  "segundo_nombre_paciente",
  "tipo_id_paciente",
  "estado_civil_paciente",
  "sexo_paciente",
  "telefono_fijo_paciente",
  "telefono_celular_paciente",
  "fecha_nacimiento_paciente",
  "lugar_nacimiento_paciente",
  "nacionalidad_paciente",
  "edad_paciente",
  "identificacion_etnica_paciente",
  "pueblos_paciente",
  "nivel_educacion_paciente",
  "estado_educacion_paciente",
  "empresa_trabajo_paciente",
  "ocupacion_paciente",
  "seguro_paciente",
  "provincia_paciente",
  "canton_paciente",
  "parroquia_paciente",
  "barrio_paciente",
  "calle_paciente",
  "calle_secundaria_paciente",
  "referencia_paciente",
  "nombres_completos_familiar",
  "parentesco_familiar",
  "direccion_familiar",
  "telefono_familiar",
  "fuente_informacion_paciente",
  "institucion_persona_entrega_paciente",
  "telefono_persona_entrega",
  "008_hora_inicio",
  "008_motivo_atencion",
  "008_antecedentes",
  "008_enfermedad_problema_actual_paciente",
  "008_presion_arterial",
  "008_pulso",
  "008_frecuencia_respiratoria",
  "008_pulsioximetria",
  "008_perimetro_cefalico",
  "008_peso_kg",
  "008_talla",
  "008_glicemia_capilar",
  "008_glassgow_ocular",
  "008_glassgow_verbal",
  "008_motora",
  "008_reaccion_pupila_der",
  "008_reaccion_pupila_izq",
  "008_t_llenado_capilar",
  "008_examen_fisico",
  "008_examenes",
  "008_diagnostico_presuntivo1",
  "008_diagnostico_presuntivo2",
  "008_diagnostico_presuntivo3",
  "008_cie_presuntivo1",
  "008_cie_presuntivo2",
  "008_cie_presuntivo3",
  "008_plan_medicamentos",
  "008_plan_via_dosis",
  "008_texto_egreso_establecimiento",
  "008_texto_egreso_observaciones",
  "008_fecha_termino_emergencia",
  "008_hora_termino_emergencia",
  "008_nombres_medico_emergencia",
  "008_primer_apellido_medico_emergencia",
  "008_segundo_apellido_medico_emergencia",
  "008_cedula_medico_emergencia"
];

const NOMBRES_ALTERNATIVOS_TEXTO_008 = {
  telefono_familiar: "undefined.telefono_familiar",
  telefono_persona_entrega: "undefined.telefono_persona_entrega",
  "008_presion_arterial": "undefined.008_presion_arterial",
  "008_pulso": "undefined.008_pulso",
  "008_frecuencia_respiratoria": "undefined.008_frecuencia_respiratoria",
  "008_pulsioximetria": "undefined.008_pulsioximetria",
  "008_perimetro_cefalico": "undefined.008_perimetro_cefalico",
  "008_peso_kg": "undefined.008_peso_kg",
  "008_talla": "undefined.008_talla",
  "008_glicemia_capilar": "undefined.008_glicemia_capilar",
  "008_glassgow_ocular": "undefined.008_glassgow_ocular",
  "008_glassgow_verbal": "undefined.008_glassgow_verbal",
  "008_motora": "undefined.008_motora",
  "008_reaccion_pupila_der": "undefined.008_reaccion_pupila_der",
  "008_reaccion_pupila_izq": "undefined.008_reaccion_pupila_izq",
  "008_diagnostico_presuntivo1": "undefined.008_diagnostico_presuntivo1",
  "008_diagnostico_presuntivo2": "undefined.008_diagnostico_presuntivo2",
  "008_diagnostico_presuntivo3": "undefined.008_diagnostico_presuntivo3",
  "008_cie_presuntivo1": "undefined.008_cie_presuntivo1",
  "008_cie_presuntivo2": "undefined.008_cie_presuntivo2",
  "008_cie_presuntivo3": "undefined.008_cie_presuntivo3",
  "008_nombres_medico_emergencia": "undefined.008_nombres_medico_emergencia",
  "008_primer_apellido_medico_emergencia": "undefined.008_primer_apellido_medico_emergencia",
  "008_segundo_apellido_medico_emergencia": "undefined.008_segundo_apellido_medico_emergencia"
};

const CAMPOS_CASILLAS_008 = [
  "historia_en_establecimiento_si",
  "historia_en_establecimiento_no",
  "casilla_llegada_ambulatorio",
  "casilla_llegada_ambulancia",
  "casilla_llegada_otro",
  "008_casilla_condicion_llegada_estable",
  "008_casilla_condicion_llegada_inestable",
  "008_casilla_condicion_llegada_fallecido",
  "008_casilla_antecedentes_1alergicos",
  "008_casilla_antecedentes_2clinicos",
  "008_casilla_antecedentes_3ginecologicos",
  "008_casilla_antecedentes_6quirurgicos",
  "008_casilla_antecedentes_7farmacologicos",
  "008_casilla_antecedentes_9familiares",
  "008_casilla_otros",
  "008_casilla_1piel",
  "008_casilla_2cabeza",
  "008_casilla_3ojos",
  "008_casilla_4oidos",
  "008_casilla_5nariz",
  "008_casilla_6boca",
  "008_casilla_7oro",
  "008_casilla_8cuello",
  "008_casilla_9axilas",
  "008_casilla_10torax",
  "008_casilla_11abdomen",
  "008_casilla_12columna",
  "008_casilla_13ingle",
  "008_casilla_14miembrosup",
  "008_casilla_15miembroinf",
  "008_casilla_biometria",
  "008_casilla_uroanalisis",
  "008_casilla_quimica",
  "008_casilla_electrolitos",
  "008_casilla_gasometria",
  "008_casilla_ecg",
  "008_casilla_endoscopipa",
  "008_casilla_rxtorax",
  "008_casilla_rxabdomen",
  "008_casilla_rxosea",
  "008_casilla_11ecografia",
  "008_casilla_12ecografia_elvica",
  "008_casilla_13tomografia",
  "008_casilla_14resonancia",
  "008_casilla_15interconsulta",
  "008_casilla_16otros",
  "008_casilla_egreso_vivo",
  "008_casilla_egreso_estable",
  "008_casilla_egreso_inestable",
  "008_casilla_egreso_fallecido",
  "008_casilla_egreso_alta",
  "008_casilla_egreso_consulta_externa",
  "008_casilla_egreso_observacion_emergencia",
  "008_casilla_egreso_hospitalizacion",
  "008_casilla_egreso_referencia",
  "008_casilla_egreso_derivacion"
];

const NOMBRES_ALTERNATIVOS_CASILLAS_008 = {
  historia_en_establecimiento_si: "undefined.historia_en_establecimiento_si",
  historia_en_establecimiento_no: "undefined.historia_en_establecimiento_no",
  casilla_llegada_ambulatorio: "undefined.casilla_llegada_ambulatorio",
  casilla_llegada_ambulancia: "undefined.casilla_llegada_ambulancia",
  casilla_llegada_otro: "undefined.casilla_llegada_otro",
  "008_casilla_condicion_llegada_estable": "undefined.008_casilla_condicion_llegada_estable",
  "008_casilla_condicion_llegada_inestable": "undefined.008_casilla_condicion_llegada_inestable",
  "008_casilla_condicion_llegada_fallecido": "undefined.008_casilla_condicion_llegada_fallecido",
  "008_casilla_antecedentes_2clinicos": "undefined.008_casilla_antecedentes_2clinicos",
  "008_casilla_antecedentes_3ginecologicos": "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_3ginecologicos",
  "008_casilla_antecedentes_6quirurgicos": "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_4quirurgicos",
  "008_casilla_antecedentes_7farmacologicos": "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_7farmacologicos",
  "008_casilla_antecedentes_9familiares": "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_9familiares",
  "008_casilla_otros": "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_10otros",
  "008_casilla_1piel": "undefined.008_casilla_1piel",
  "008_casilla_2cabeza": "undefined.008_casilla_2cabeza",
  "008_casilla_3ojos": "undefined.008_casilla_3ojos",
  "008_casilla_4oidos": "undefined.008_casilla_4oidos",
  "008_casilla_5nariz": "undefined.008_casilla_5nariz",
  "008_casilla_6boca": "undefined.008_casilla_6boca",
  "008_casilla_7oro": "undefined.008_casilla_7oro",
  "008_casilla_8cuello": "undefined.008_casilla_8cuello",
  "008_casilla_9axilas": "undefined.008_casilla_9axilas",
  "008_casilla_10torax": "undefined.008_casilla_10torax",
  "008_casilla_11abdomen": "undefined.008_casilla_11abdomen",
  "008_casilla_12columna": "undefined.008_casilla_12columna",
  "008_casilla_13ingle": "undefined.008_casilla_13ingle",
  "008_casilla_14miembrosup": "undefined.008_casilla_14miembrosup",
  "008_casilla_15miembroinf": "undefined.008_casilla_15miembroinf",
  "008_casilla_biometria": "undefined.008_casilla_biometria",
  "008_casilla_uroanalisis": "undefined.008_casilla_uroanalisis",
  "008_casilla_quimica": "undefined.008_casilla_quimica",
  "008_casilla_electrolitos": "undefined.008_casilla_electrolitos",
  "008_casilla_gasometria": "undefined.008_casilla_gasometria",
  "008_casilla_ecg": "undefined.008_casilla_ecg",
  "008_casilla_endoscopipa": "undefined.008_casilla_endoscopipa",
  "008_casilla_rxtorax": "undefined.008_casilla_rxtorax",
  "008_casilla_rxabdomen": "undefined.008_casilla_rxabdomen",
  "008_casilla_rxosea": "undefined.008_casilla_rxosea",
  "008_casilla_11ecografia": "undefined.008_casilla_11ecografia",
  "008_casilla_12ecografia_elvica": "undefined.008_casilla_12ecografia_elvica",
  "008_casilla_13tomografia": "undefined.008_casilla_13tomografia",
  "008_casilla_14resonancia": "undefined.008_casilla_14resonancia",
  "008_casilla_15interconsulta": "undefined.008_casilla_15interconsulta",
  "008_casilla_16otros": "undefined.008_casilla_16otros"
};

/**
 * Genera el documento PDF definitivo o borrador para el Formulario 008 Emergencia.
 * Extraído de la lógica original de server.js.
 */
async function generarPdf008({ datos = {}, usuarioSesion }) {
  if (!usuarioSesion?.username) {
    throw new AppError("No se pudo identificar al usuario activo", 401);
  }

  const pacienteId = Number(datos.paciente_id);
  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  const fechaProcedimiento = String(datos.fecha_admision_paciente || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const rutaPlantilla = path.join(PATHS.PLANTILLAS_HCLINICAS, "008prueba.pdf");
  if (!fs.existsSync(rutaPlantilla)) {
    throw new AppError("No se encontró la plantilla PDF 008prueba.pdf", 404);
  }

  const bytesPlantilla = fs.readFileSync(rutaPlantilla);
  const pdfDoc = await PDFDocument.load(bytesPlantilla);

  const formulario = pdfDoc.getForm();
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);

  pdfDoc.setSubject("Formulario 008 - Emergencia");
  pdfDoc.setAuthor("CENT Instituto Especializado en Hemodinamia del Ecuador");
  pdfDoc.setCreator("Sistema CENT");
  pdfDoc.setProducer("Sistema CENT");

  // Llenar campos de texto
  for (const nombreCampo of CAMPOS_TEXTO_008) {
    let valor = datos[nombreCampo] ?? "";

    if (
      nombreCampo === "fecha_admision_paciente" ||
      nombreCampo === "fecha_nacimiento_paciente" ||
      nombreCampo === "008_fecha_termino_emergencia"
    ) {
      valor = formatearFechaPDF(valor);
    }

    try {
      let campoPDF;
      try {
        campoPDF = formulario.getTextField(nombreCampo);
      } catch (errorNombreNormal) {
        const nombreAlternativo = NOMBRES_ALTERNATIVOS_TEXTO_008[nombreCampo];
        if (!nombreAlternativo) throw errorNombreNormal;
        campoPDF = formulario.getTextField(nombreAlternativo);
      }

      campoPDF.setText(String(valor));
    } catch (errorCampo) {
      console.warn(`El campo de texto PDF 008 "${nombreCampo}" no pudo llenarse:`, errorCampo.message);
    }
  }

  // Campo especial 008_sin_constantes
  try {
    const campoSinConstantes = formulario.getTextField("008_sin_constantes");
    const marcadoSinConstantes =
      datos["008_sin_constantes"] === true ||
      datos["008_sin_constantes"] === 1 ||
      datos["008_sin_constantes"] === "1" ||
      String(datos["008_sin_constantes"]).toLowerCase() === "true";

    campoSinConstantes.setText(marcadoSinConstantes ? "X" : "");
    campoSinConstantes.setAlignment(1);
  } catch (errorSinConstantes) {
    console.warn("No se pudo llenar 008_sin_constantes:", errorSinConstantes.message);
  }

  // Marcar casillas
  for (const nombreCampo of CAMPOS_CASILLAS_008) {
    try {
      let casilla;
      try {
        casilla = formulario.getCheckBox(nombreCampo);
      } catch (errorNombreNormal) {
        const nombreAlternativo = NOMBRES_ALTERNATIVOS_CASILLAS_008[nombreCampo];
        if (!nombreAlternativo) throw errorNombreNormal;
        casilla = formulario.getCheckBox(nombreAlternativo);
      }

      const valor = datos[nombreCampo];
      const marcado =
        valor === true ||
        valor === 1 ||
        valor === "1" ||
        String(valor).toLowerCase() === "true";

      if (marcado) {
        casilla.check();
      } else {
        casilla.uncheck();
      }
    } catch (errorCasilla) {
      console.warn(`La casilla PDF 008 "${nombreCampo}" no pudo procesarse:`, errorCasilla.message);
    }
  }

  const pool = await getPool();

  // Consultar firma y sello del médico
  const profesionalMedicoId = Number(datos["008_profesional_medico_id"] || 0);
  let profesionalMedico = null;

  if (profesionalMedicoId > 0) {
    const resultadoProfesional = await pool
      .request()
      .input("id", sql.Int, profesionalMedicoId)
      .query(`
        SELECT id, firma_ruta, sello_ruta, estado
        FROM dbo.profesionales_salud
        WHERE id = @id;
      `);

    profesionalMedico = resultadoProfesional.recordset?.[0] || null;
  }

  if (profesionalMedico?.firma_ruta) {
    await insertarImagenEnCampoPDF({
      pdfDoc,
      formulario,
      nombreCampo: "008_firma_medico_emergencia",
      rutaImagen: profesionalMedico.firma_ruta
    });
  }

  if (profesionalMedico?.sello_ruta) {
    await insertarImagenEnCampoPDF({
      pdfDoc,
      formulario,
      nombreCampo: "008_sello_medico_emergencia",
      rutaImagen: profesionalMedico.sello_ruta
    });
  }

  formulario.updateFieldAppearances(fuente);
  formulario.getFields().forEach((campo) => {
    try {
      campo.enableReadOnly();
    } catch (errorCampo) {
      console.warn(`No se pudo bloquear campo 008:`, errorCampo.message);
    }
  });
  formulario.updateFieldAppearances(fuente);

  // Verificar estado del borrador
  const verificacionEstado = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "008")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .query(`
      SELECT TOP 1 estado
      FROM dbo.hc_formularios_datos
      WHERE paciente_id = @paciente_id
        AND codigo_formulario = @codigo_formulario
        AND fecha_procedimiento = @fecha_procedimiento
      ORDER BY id DESC;
    `);

  const estadoFormulario = String(
    verificacionEstado.recordset?.[0]?.estado || ""
  ).toUpperCase();

  if (estadoFormulario && estadoFormulario !== "BORRADOR") {
    throw new AppError(
      "El formulario 008 está cerrado y ya no admite nuevas versiones.",
      409
    );
  }

  // Calcular siguiente versión
  const resultadoVersion = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "008")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .query(`
      SELECT ISNULL(MAX(version), 0) + 1 AS siguiente_version
      FROM dbo.hc_documentos
      WHERE paciente_id = @paciente_id
        AND codigo_formulario = @codigo_formulario
        AND fecha_procedimiento = @fecha_procedimiento;
    `);

  const version = Number(resultadoVersion.recordset?.[0]?.siguiente_version || 1);

  const [anio, mes, dia] = fechaProcedimiento.split("-");
  const numeroArchivoSeguro = limpiarNombreArchivoHC(datos.narchivo_paciente || "SIN_ARCHIVO");
  const cedulaSegura = limpiarNombreArchivoHC(datos.paciente_h_clinica || "SIN_CEDULA");
  const nombrePacienteSeguro = limpiarNombreArchivoHC(
    [
      datos.primer_apellido_paciente,
      datos.segundo_apellido_paciente,
      datos.primer_nombre_paciente,
      datos.segundo_nombre_paciente
    ]
      .filter(Boolean)
      .join(" ")
  );

  const carpetaPaciente = [numeroArchivoSeguro, cedulaSegura, nombrePacienteSeguro]
    .filter(Boolean)
    .join("_");

  const carpetaRelativa = path.join(anio, mes, dia, carpetaPaciente);
  const carpetaCompleta = path.join(PATHS.FORMULARIOS, carpetaRelativa);

  if (!fs.existsSync(carpetaCompleta)) {
    fs.mkdirSync(carpetaCompleta, { recursive: true });
  }

  const nombreBasePDF = limpiarNombreArchivoHC(
    [
      "008 EMERGENCIA",
      nombrePacienteSeguro || "SIN NOMBRE",
      numeroArchivoSeguro || "SIN ARCHIVO",
      `V${version}`
    ].join(" ")
  );

  const nombreVisible = `${nombreBasePDF}.pdf`;
  pdfDoc.setTitle(nombreVisible);

  const pdfFinal = await pdfDoc.save();
  const rutaCompleta = path.join(carpetaCompleta, nombreVisible);
  const rutaRelativa = path.join(carpetaRelativa, nombreVisible);

  fs.writeFileSync(rutaCompleta, Buffer.from(pdfFinal));

  try {
    const resultadoDocumento = await pool
      .request()
      .input("paciente_id", sql.Int, pacienteId)
      .input("codigo_formulario", sql.VarChar, "008")
      .input("nombre_formulario", sql.VarChar, "008 Emergencia")
      .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
      .input("version", sql.Int, version)
      .input("estado", sql.VarChar, "BORRADOR")
      .input("nombre_archivo", sql.VarChar, nombreVisible)
      .input("ruta_relativa", sql.VarChar, rutaRelativa)
      .input("creado_por_username", sql.VarChar, usuarioSesion.username)
      .input("creado_por_nombre", sql.VarChar, usuarioSesion.nombreCompleto)
      .query(`
        INSERT INTO dbo.hc_documentos (
          paciente_id,
          codigo_formulario,
          nombre_formulario,
          fecha_procedimiento,
          version,
          estado,
          nombre_archivo,
          ruta_relativa,
          creado_por_username,
          creado_por_nombre
        )
        OUTPUT INSERTED.id
        VALUES (
          @paciente_id,
          @codigo_formulario,
          @nombre_formulario,
          @fecha_procedimiento,
          @version,
          @estado,
          @nombre_archivo,
          @ruta_relativa,
          @creado_por_username,
          @creado_por_nombre
        );
      `);

    return {
      id: Number(resultadoDocumento.recordset?.[0]?.id),
      nombreArchivo: nombreVisible,
      version,
      estado: "BORRADOR"
    };
  } catch (errorSQL) {
    if (fs.existsSync(rutaCompleta)) {
      try {
        fs.unlinkSync(rutaCompleta);
      } catch (_) {}
    }
    throw errorSQL;
  }
}

/**
 * Guarda o actualiza el borrador del Formulario 008.
 */
async function guardarBorrador008({ datos = {}, usuarioSesion }) {
  if (!usuarioSesion?.username) {
    throw new AppError("No se pudo identificar al usuario activo", 401);
  }

  const pacienteId = Number(datos.paciente_id);
  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  const fechaProcedimiento = String(datos.fecha_admision_paciente || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha de admisión no es válida", 400);
  }

  const pool = await getPool();

  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "008")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .input("datos_json", sql.NVarChar(sql.MAX), JSON.stringify(datos))
    .input("usuario_username", sql.VarChar, usuarioSesion.username)
    .input("usuario_nombre", sql.VarChar, usuarioSesion.nombreCompleto || "")
    .query(`
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @formulario_id INT;
        DECLARE @estado_actual NVARCHAR(20);

        SELECT
          @formulario_id = id,
          @estado_actual = estado
        FROM dbo.hc_formularios_datos WITH (UPDLOCK, HOLDLOCK)
        WHERE paciente_id = @paciente_id
          AND codigo_formulario = @codigo_formulario
          AND fecha_procedimiento = @fecha_procedimiento;

        IF @formulario_id IS NOT NULL AND @estado_actual <> 'BORRADOR'
        BEGIN
          THROW 51030, 'El formulario 008 está cerrado y ya no puede modificarse.', 1;
        END;

        IF @formulario_id IS NULL
        BEGIN
          INSERT INTO dbo.hc_formularios_datos (
            paciente_id,
            codigo_formulario,
            fecha_procedimiento,
            datos_json,
            estado,
            creado_por_username,
            creado_por_nombre,
            fecha_creacion
          )
          VALUES (
            @paciente_id,
            @codigo_formulario,
            @fecha_procedimiento,
            @datos_json,
            'BORRADOR',
            @usuario_username,
            @usuario_nombre,
            SYSUTCDATETIME()
          );

          SET @formulario_id = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
          UPDATE dbo.hc_formularios_datos
          SET
            datos_json = @datos_json,
            modificado_por_username = @usuario_username,
            modificado_por_nombre = @usuario_nombre,
            fecha_modificacion = SYSUTCDATETIME()
          WHERE id = @formulario_id
            AND estado = 'BORRADOR';

          IF @@ROWCOUNT <> 1
          BEGIN
            THROW 51031, 'El formulario 008 ya no se encuentra disponible para edición.', 1;
          END;
        END;

        COMMIT TRANSACTION;

        SELECT
          id,
          paciente_id,
          codigo_formulario,
          fecha_procedimiento,
          estado,
          creado_por_username,
          creado_por_nombre,
          fecha_creacion,
          modificado_por_username,
          modificado_por_nombre,
          fecha_modificacion,
          cerrado_por_username,
          cerrado_por_nombre,
          fecha_cierre
        FROM dbo.hc_formularios_datos
        WHERE id = @formulario_id;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH;
    `);

  return resultado.recordset?.[0] || null;
}

/**
 * Consulta el borrador JSON actual de Formulario 008.
 */
async function consultarBorrador008({ pacienteId, fechaProcedimiento }) {
  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("codigo_formulario", sql.VarChar, "008")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .query(`
      SELECT TOP 1
        id,
        paciente_id,
        codigo_formulario,
        fecha_procedimiento,
        datos_json,
        estado,
        creado_por_username,
        creado_por_nombre,
        fecha_creacion,
        modificado_por_username,
        modificado_por_nombre,
        fecha_modificacion,
        cerrado_por_username,
        cerrado_por_nombre,
        fecha_cierre
      FROM dbo.hc_formularios_datos
      WHERE paciente_id = @paciente_id
        AND codigo_formulario = @codigo_formulario
        AND fecha_procedimiento = @fecha_procedimiento
      ORDER BY id DESC;
    `);

  const registro = resultado.recordset?.[0];
  if (!registro) return { existe: false, formulario: null };

  let datosFormulario = {};
  try {
    datosFormulario = JSON.parse(registro.datos_json || "{}");
  } catch (_) {
    datosFormulario = {};
  }

  return {
    existe: true,
    formulario: {
      id: registro.id,
      pacienteId: registro.paciente_id,
      codigoFormulario: registro.codigo_formulario,
      fechaProcedimiento: registro.fecha_procedimiento,
      estado: registro.estado,
      datos: datosFormulario,
      creadoPorUsername: registro.creado_por_username,
      creadoPorNombre: registro.creado_por_nombre,
      fechaCreacion: registro.fecha_creacion,
      modificadoPorUsername: registro.modificado_por_username,
      modificadoPorNombre: registro.modificado_por_nombre,
      fechaModificacion: registro.fecha_modificacion,
      cerradoPorUsername: registro.cerrado_por_username,
      cerradoPorNombre: registro.cerrado_por_nombre,
      fechaCierre: registro.fecha_cierre
    }
  };
}

/**
 * Cierra definitivamente el Formulario 008 y el PDF asociado.
 */
async function cerrarFormulario008({
  pacienteId,
  documentoId,
  fechaProcedimiento,
  usuarioSesion
}) {
  const pool = await getPool();

  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("documento_id", sql.Int, Number(documentoId))
    .input("codigo_formulario", sql.VarChar, "008")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .input("cerrado_por_username", sql.VarChar, usuarioSesion.username)
    .input("cerrado_por_nombre", sql.VarChar, usuarioSesion.nombreCompleto || "")
    .query(`
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
          SELECT 1 FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario = @codigo_formulario
            AND fecha_procedimiento = @fecha_procedimiento
        )
        BEGIN
          THROW 51041, 'No existe un borrador del formulario 008 para cerrar.', 1;
        END;

        IF EXISTS (
          SELECT 1 FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario = @codigo_formulario
            AND fecha_procedimiento = @fecha_procedimiento
            AND estado <> 'BORRADOR'
        )
        BEGIN
          THROW 51042, 'El formulario 008 ya no se encuentra en estado BORRADOR.', 1;
        END;

        IF NOT EXISTS (
          SELECT 1 FROM dbo.hc_documentos
          WHERE id = @documento_id
            AND paciente_id = @paciente_id
            AND codigo_formulario = @codigo_formulario
            AND fecha_procedimiento = @fecha_procedimiento
            AND estado = 'BORRADOR'
        )
        BEGIN
          THROW 51043, 'El PDF seleccionado no corresponde al formulario 008 o ya fue cerrado.', 1;
        END;

        UPDATE dbo.hc_formularios_datos
        SET
          estado = 'CERRADO',
          cerrado_por_username = @cerrado_por_username,
          cerrado_por_nombre = @cerrado_por_nombre,
          fecha_cierre = SYSUTCDATETIME(),
          modificado_por_username = @cerrado_por_username,
          modificado_por_nombre = @cerrado_por_nombre,
          fecha_modificacion = SYSUTCDATETIME()
        WHERE paciente_id = @paciente_id
          AND codigo_formulario = @codigo_formulario
          AND fecha_procedimiento = @fecha_procedimiento
          AND estado = 'BORRADOR';

        IF @@ROWCOUNT <> 1
        BEGIN
          THROW 51044, 'No se pudo cerrar el formulario editable 008.', 1;
        END;

        UPDATE dbo.hc_documentos
        SET
          estado = 'CERRADO',
          cerrado_por_username = @cerrado_por_username,
          cerrado_por_nombre = @cerrado_por_nombre,
          fecha_cierre = SYSUTCDATETIME()
        WHERE id = @documento_id
          AND paciente_id = @paciente_id
          AND codigo_formulario = @codigo_formulario
          AND fecha_procedimiento = @fecha_procedimiento
          AND estado = 'BORRADOR';

        IF @@ROWCOUNT <> 1
        BEGIN
          THROW 51045, 'No se pudo cerrar el documento PDF 008.', 1;
        END;

        COMMIT TRANSACTION;

        SELECT
          d.id,
          d.nombre_archivo,
          d.version,
          d.estado,
          d.cerrado_por_username,
          d.cerrado_por_nombre,
          d.fecha_cierre
        FROM dbo.hc_documentos d
        WHERE d.id = @documento_id;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH;
    `);

  return resultado.recordset?.[0] || null;
}

/**
 * Reabre un Formulario 008 cerrado previamente (exclusivo para usuarios ADMIN).
 */
async function reabrirFormulario008({
  pacienteId,
  fechaProcedimiento,
  motivoReapertura,
  usuarioSesion
}) {
  if (usuarioSesion?.rol !== "ADMIN") {
    throw new AppError("Solo un usuario ADMIN puede reabrir formularios cerrados.", 403);
  }

  const pool = await getPool();

  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("codigo_formulario", sql.VarChar, "008")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .input("reabierto_por_username", sql.VarChar, usuarioSesion.username)
    .input("reabierto_por_nombre", sql.VarChar, usuarioSesion.nombreCompleto || "")
    .input("motivo_reapertura", sql.VarChar, motivoReapertura)
    .query(`
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @formulario_id INT;
        DECLARE @estado_actual NVARCHAR(20);

        SELECT
          @formulario_id = id,
          @estado_actual = estado
        FROM dbo.hc_formularios_datos WITH (UPDLOCK, HOLDLOCK)
        WHERE paciente_id = @paciente_id
          AND codigo_formulario = @codigo_formulario
          AND fecha_procedimiento = @fecha_procedimiento;

        IF @formulario_id IS NULL
        BEGIN
          THROW 51050, 'No existe el formulario 008 solicitado.', 1;
        END;

        IF @estado_actual <> 'CERRADO'
        BEGIN
          THROW 51051, 'El formulario 008 no se encuentra en estado CERRADO.', 1;
        END;

        UPDATE dbo.hc_formularios_datos
        SET
          estado = 'BORRADOR',
          reabierto_por_username = @reabierto_por_username,
          reabierto_por_nombre = @reabierto_por_nombre,
          fecha_reapertura = SYSUTCDATETIME(),
          motivo_reapertura = @motivo_reapertura,
          modificado_por_username = @reabierto_por_username,
          modificado_por_nombre = @reabierto_por_nombre,
          fecha_modificacion = SYSUTCDATETIME()
        WHERE id = @formulario_id
          AND estado = 'CERRADO';

        IF @@ROWCOUNT <> 1
        BEGIN
          THROW 51052, 'No se pudo reabrir el formulario 008.', 1;
        END;

        COMMIT TRANSACTION;

        SELECT
          id,
          paciente_id,
          codigo_formulario,
          fecha_procedimiento,
          estado,
          reabierto_por_username,
          reabierto_por_nombre,
          fecha_reapertura,
          motivo_reapertura
        FROM dbo.hc_formularios_datos
        WHERE id = @formulario_id;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH;
    `);

  return resultado.recordset?.[0] || null;
}

module.exports = {
  generarPdf008,
  guardarBorrador008,
  consultarBorrador008,
  cerrarFormulario008,
  reabrirFormulario008
};
