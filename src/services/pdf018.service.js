const { PDFDocument, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const { formatearFechaPDF } = require("../utils/dateUtils");
const { limpiarNombreArchivoHC } = require("../utils/fileUtils");
const { insertarImagenEnCampoPDF } = require("../utils/pdfImageHelper");
const AppError = require("../utils/AppError");

const CAMPOS_TEXTO_018 = [
  "paciente_h_clinica",
  "narchivo_paciente",
  "primer_apellido_paciente",
  "segundo_apellido_paciente",
  "primer_nombre_paciente",
  "segundo_nombre_paciente",
  "sexo_paciente",
  "edad_paciente",
  "008_diagnostico_presuntivo1",
  "008_diagnostico_presuntivo2",
  "008_cie_presuntivo1",
  "008_cie_presuntivo2",
  "018_procedimiento_propuesto",
  "018_anamnesis_diag1",
  "018_anamnesis_diag2",
  "018_anamnesis_diag3",
  "018_anamnesis_diag4",
  "018_anamnesis_diag5",
  "018_anamnesis_diag6",
  "018_anamnesis_diag7",
  "018_anamnesis_diag8",
  "018_anamnesis_diag9",
  "018_anamnesis_diag10",
  "018_anamnesis_tiempo1",
  "018_anamnesis_tiempo2",
  "018_anamnesis_tiempo3",
  "018_anamnesis_tiempo4",
  "018_anamnesis_tiempo5",
  "018_anamnesis_tiempo6",
  "018_anamnesis_tiempo7",
  "018_anamnesis_tiempo8",
  "018_anamnesis_tiempo9",
  "018_anamnesis_tiempo10",
  "018_anamnesis_tratamiento1",
  "018_anamnesis_tratamiento2",
  "018_anamnesis_tratamiento3",
  "018_anamnesis_tratamiento4",
  "018_anamnesis_tratamiento5",
  "018_anamnesis_tratamiento6",
  "018_anamnesis_tratamiento7",
  "018_anamnesis_tratamiento8",
  "018_anamnesis_tratamiento9",
  "018_anamnesis_tratamiento10",
  "018_anamnesis_anestesico1",
  "018_anamnesis_anestesico2",
  "018_anamnesis_anestesico3",
  "018_anamnesis_quirurgico1",
  "018_anamnesis_quirurgico2",
  "018_anamnesis_quirurgico3",
  "018_anamnesis_alergico1",
  "018_anamnesis_alergico2",
  "018_anamnesis_alergico3",
  "018_anamnesis_transfusiones1",
  "018_anamnesis_transfusiones2",
  "018_anamnesis_transfusiones3",
  "018_anamnesis_habitos1",
  "018_anamnesis_habitos2",
  "018_anamnesis_habitos3",
  "018_anamnesis_antecedentes_familiares1",
  "018_anamnesis_antecedentes_familiares2",
  "018_anamnesis_antecedentes_familiares3",
  "008_presion_arterial",
  "008_pulso",
  "008_frecuencia_respiratoria",
  "018_d_temperatura",
  "018_d_saturacion",
  "018_d_glasgow",
  "008_peso_kg",
  "008_talla",
  "018_d_imc",
  "018_d_aerea_otros",
  "018_d_torax",
  "018_d_corazon",
  "018_d_pulmones",
  "018_d_abdomen",
  "018_d_extremidades",
  "018_d_sistema_nervioso",
  "018_d_mets",
  "008_fecha_termino_emergencia",
  "018_e_hcto",
  "018_e_hb",
  "018_e_plaquetas",
  "018_e_tp",
  "018_e_ttp",
  "018_e_inr",
  "018_e_leucocitos",
  "018_e_glucosa",
  "018_e_urea",
  "018_e_creatinina",
  "018_e_otros",
  "018_e_na",
  "018_e_k",
  "018_e_cl",
  "018_e_ca",
  "018_e_mg",
  "018_j_hora_termino",
  "018_j_nombres_anestesiologo",
  "018_j_primer_apellido_anestesiologo",
  "018_j_segundo_apellido_anestesiologo",
  "018_j_cedula_anestesiologo"
];

const CAMPOS_CASILLAS_018 = [
  "018_d_casilla_apertura_bucal1",
  "018_d_casilla_apertura_bucal2",
  "018_d_casilla_apertura_bucal3",
  "018_d_casilla_apertura_bucal4",
  "018_d_casilla_tiromentoneana1",
  "018_d_casilla_tiromentoneana2",
  "018_d_casilla_tiromentoneana3",
  "018_d_casilla_mallampati1",
  "018_d_casilla_mallampati2",
  "018_d_casilla_mallampati3",
  "018_d_casilla_mallampati4",
  "018_d_casilla_protrusion1",
  "018_d_casilla_protrusion2",
  "018_d_casilla_protrusion3",
  "018_d_casilla_perimetro_cervical1",
  "018_d_casilla_perimetro_cervical2",
  "018_d_casilla_movilidad_cervical1",
  "018_d_casilla_movilidad_cervical2",
  "018_d_casilla_historia_intubacion1",
  "018_d_casilla_historia_intubacion2",
  "018_d_casilla_patologia_intubacion1",
  "018_d_casilla_patologia_intubacion2"
];

/**
 * Genera el documento PDF definitivo o borrador para el Formulario 018 Preanestésico.
 * Extraído de la lógica original de server.js.
 */
async function generarPdf018({ datos = {}, usuarioSesion }) {
  if (!usuarioSesion?.username) {
    throw new AppError("No se pudo identificar al usuario activo", 401);
  }

  const pacienteId = Number(datos.paciente_id);
  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  const fechaProcedimiento = String(
    datos.fecha_procedimiento || datos.fecha_admision_paciente || ""
  ).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const rutaPlantilla = path.join(PATHS.PLANTILLAS_HCLINICAS, "018_preanestesico.pdf");
  if (!fs.existsSync(rutaPlantilla)) {
    throw new AppError("No se encontró la plantilla PDF 018_preanestesico.pdf", 404);
  }

  const bytesPlantilla = fs.readFileSync(rutaPlantilla);
  const pdfDoc = await PDFDocument.load(bytesPlantilla);

  const formulario = pdfDoc.getForm();
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);

  pdfDoc.setTitle("Formulario 018 - Preanestésico");
  pdfDoc.setSubject("Formulario 018 - Evaluación Preanestésica");
  pdfDoc.setAuthor("CENT Instituto Especializado en Hemodinamia del Ecuador");
  pdfDoc.setCreator("Sistema CENT");
  pdfDoc.setProducer("Sistema CENT");

  // Llenar campos de texto
  for (const nombreCampo of CAMPOS_TEXTO_018) {
    try {
      let valor = datos[nombreCampo] ?? "";

      if (nombreCampo === "008_fecha_termino_emergencia") {
        valor = formatearFechaPDF(valor);
      }

      const campoPDF = formulario.getTextField(nombreCampo);
      campoPDF.setText(String(valor));
    } catch (errorCampo) {
      console.warn(`El campo de texto PDF 018 "${nombreCampo}" no pudo llenarse:`, errorCampo.message);
    }
  }

  // Marcar casillas
  for (const nombreCampo of CAMPOS_CASILLAS_018) {
    try {
      const casilla = formulario.getCheckBox(nombreCampo);
      const valor = datos[nombreCampo];
      const marcado =
        valor === true ||
        valor === 1 ||
        valor === "1" ||
        valor === "X" ||
        String(valor).toLowerCase() === "true";

      if (marcado) {
        casilla.check();
      } else {
        casilla.uncheck();
      }
    } catch (errorCasilla) {
      console.warn(`La casilla PDF 018 "${nombreCampo}" no pudo procesarse:`, errorCasilla.message);
    }
  }

  const pool = await getPool();

  // Consultar anestesiólogo
  const profesionalAnestesiologoId = Number(
    datos["018_profesional_anestesiologo_id"] || 0
  );
  let profesionalAnestesiologo = null;

  if (profesionalAnestesiologoId > 0) {
    const resultadoProfesional = await pool
      .request()
      .input("id", sql.Int, profesionalAnestesiologoId)
      .query(`
        SELECT id, firma_ruta, sello_ruta, estado
        FROM dbo.profesionales_salud
        WHERE id = @id;
      `);

    profesionalAnestesiologo = resultadoProfesional.recordset?.[0] || null;
  }

  if (profesionalAnestesiologo?.firma_ruta) {
    await insertarImagenEnCampoPDF({
      pdfDoc,
      formulario,
      nombreCampo: "018_j_firma_anestesiologo",
      rutaImagen: profesionalAnestesiologo.firma_ruta
    });
  }

  if (profesionalAnestesiologo?.sello_ruta) {
    await insertarImagenEnCampoPDF({
      pdfDoc,
      formulario,
      nombreCampo: "018_j_sello_anestesiologo",
      rutaImagen: profesionalAnestesiologo.sello_ruta
    });
  }

  formulario.updateFieldAppearances(fuente);
  formulario.getFields().forEach((campo) => {
    try {
      campo.enableReadOnly();
    } catch (errorCampo) {
      console.warn(`No se pudo bloquear el campo 018:`, errorCampo.message);
    }
  });
  formulario.updateFieldAppearances(fuente);

  // Verificar estado del borrador
  const verificacionEstado = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "018")
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
      "El formulario 018 está cerrado y ya no admite nuevas versiones.",
      409
    );
  }

  if (!estadoFormulario) {
    throw new AppError(
      "Debe guardar primero el borrador del Formulario 018",
      409
    );
  }

  // Calcular siguiente versión
  const resultadoVersion = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "018")
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
      "018 PREANESTESICO",
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
      .input("codigo_formulario", sql.VarChar, "018")
      .input("nombre_formulario", sql.VarChar, "018 Evaluación Preanestésica")
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
 * Guarda o actualiza el borrador del Formulario 018 en dbo.hc_formularios_datos.
 */
async function guardarBorrador018({ datos = {}, usuarioSesion }) {
  if (!usuarioSesion?.username) {
    throw new AppError("No se pudo identificar al usuario activo", 401);
  }

  const pacienteId = Number(datos.paciente_id);
  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  const fechaProcedimiento = String(
    datos.fecha_procedimiento || datos.fecha_admision_paciente || ""
  ).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const pool = await getPool();

  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "018")
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
          THROW 51040, 'El formulario 018 está cerrado y ya no puede modificarse.', 1;
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
            THROW 51041, 'El formulario 018 ya no se encuentra disponible para edición.', 1;
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
 * Consulta el borrador JSON actual de Formulario 018.
 */
async function consultarBorrador018({ pacienteId, fechaProcedimiento }) {
  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("codigo_formulario", sql.VarChar, "018")
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
 * Cierra definitivamente el Formulario 018 y el documento PDF.
 */
async function cerrarFormulario018({
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
    .input("codigo_formulario", sql.VarChar, "018")
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
          THROW 51141, 'No existe un borrador del formulario 018 para cerrar.', 1;
        END;

        IF EXISTS (
          SELECT 1 FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario = @codigo_formulario
            AND fecha_procedimiento = @fecha_procedimiento
            AND estado <> 'BORRADOR'
        )
        BEGIN
          THROW 51142, 'El formulario 018 ya no se encuentra en estado BORRADOR.', 1;
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
          THROW 51143, 'El PDF seleccionado no corresponde al formulario 018 o ya fue cerrado.', 1;
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
          THROW 51144, 'No se pudo cerrar el formulario editable 018.', 1;
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
          THROW 51145, 'No se pudo cerrar el documento PDF 018.', 1;
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
 * Reabre un Formulario 018 cerrado previamente (exclusivo para usuarios ADMIN).
 */
async function reabrirFormulario018({
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
    .input("codigo_formulario", sql.VarChar, "018")
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
          THROW 51050, 'No existe el formulario 018 solicitado.', 1;
        END;

        IF @estado_actual <> 'CERRADO'
        BEGIN
          THROW 51051, 'El formulario 018 no se encuentra en estado CERRADO.', 1;
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
          THROW 51052, 'No se pudo reabrir el formulario 018.', 1;
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

/**
 * Consulta el último PDF en estado BORRADOR del Formulario 018.
 */
async function consultarUltimoPdfBorrador018({ pacienteId, fechaProcedimiento }) {
  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("codigo_formulario", sql.VarChar, "018")
    .input("fecha_procedimiento", sql.Date, fechaProcedimiento)
    .query(`
      SELECT TOP 1
        id,
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
      FROM dbo.hc_documentos
      WHERE paciente_id = @paciente_id
        AND codigo_formulario = @codigo_formulario
        AND fecha_procedimiento = @fecha_procedimiento
        AND estado = 'BORRADOR'
      ORDER BY version DESC, id DESC;
    `);

  return resultado.recordset?.[0] || null;
}

module.exports = {
  generarPdf018,
  guardarBorrador018,
  consultarBorrador018,
  cerrarFormulario018,
  reabrirFormulario018,
  consultarUltimoPdfBorrador018
};
