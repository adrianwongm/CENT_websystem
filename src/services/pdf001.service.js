const { PDFDocument, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const { formatearFechaPDF } = require("../utils/dateUtils");
const { limpiarNombreArchivoHC } = require("../utils/fileUtils");
const AppError = require("../utils/AppError");

const CAMPOS_PERMITIDOS_001 = [
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
  "correo_paciente",
  "fecha_nacimiento_paciente",
  "lugar_nacimiento_paciente",
  "nacionalidad_paciente",
  "edad_paciente",
  "provincia_paciente",
  "canton_paciente",
  "parroquia_paciente",
  "barrio_paciente",
  "calle_paciente",
  "calle_secundaria_paciente",
  "referencia_paciente",
  "identificacion_etnica_paciente",
  "nacionalidad_etnica_paciente",
  "pueblos_paciente",
  "nivel_educacion_paciente",
  "estado_educacion_paciente",
  "ocupacion_paciente",
  "empresa_trabajo_paciente",
  "seguro_paciente",
  "tipo_bono_paciente",
  "nombres_completos_familiar",
  "parentesco_familiar",
  "direccion_familiar",
  "telefono_familiar"
];

const NOMBRES_ALTERNATIVOS_001 = {
  segundo_apellido_paciente: "undefined.segundo_apellido_paciente",
  segundo_nombre_paciente: "undefined.segundo_nombre_paciente",
  nivel_educacion_paciente: "undefined.nivel_educacion_paciente",
  estado_educacion_paciente: "undefined.estado_educacion_paciente"
};

/**
 * Genera el documento PDF definitivo o borrador para el Formulario 001 Admisión.
 * Extraído de la lógica original de server.js.
 */
async function generarPdf001({ datos = {}, usuarioSesion }) {
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

  const rutaPlantilla = path.join(PATHS.PLANTILLAS_HCLINICAS, "001_admision_plantilla.pdf");
  if (!fs.existsSync(rutaPlantilla)) {
    throw new AppError("No se encontró la plantilla PDF del formulario 001", 404);
  }

  const bytesPlantilla = fs.readFileSync(rutaPlantilla);
  const pdfDoc = await PDFDocument.load(bytesPlantilla);

  const nombrePacienteTitulo = [
    datos.primer_apellido_paciente,
    datos.segundo_apellido_paciente,
    datos.primer_nombre_paciente,
    datos.segundo_nombre_paciente
  ]
    .filter((v) => String(v || "").trim() !== "")
    .join(" ")
    .trim();

  pdfDoc.setTitle(nombrePacienteTitulo || "001 ADMISIÓN");
  pdfDoc.setSubject("Formulario 001 - Admisión");
  pdfDoc.setAuthor("CENT Instituto Especializado en Hemodinamia del Ecuador");
  pdfDoc.setCreator("Sistema CENT");
  pdfDoc.setProducer("Sistema CENT");

  const formulario = pdfDoc.getForm();
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const nombreCampo of CAMPOS_PERMITIDOS_001) {
    let valor = datos[nombreCampo] ?? "";

    if (
      nombreCampo === "fecha_admision_paciente" ||
      nombreCampo === "fecha_nacimiento_paciente"
    ) {
      valor = formatearFechaPDF(valor);
    }

    try {
      let campoPDF;
      try {
        campoPDF = formulario.getTextField(nombreCampo);
      } catch (errorNormal) {
        const nombreAlt = NOMBRES_ALTERNATIVOS_001[nombreCampo];
        if (!nombreAlt) throw errorNormal;
        campoPDF = formulario.getTextField(nombreAlt);
      }

      campoPDF.setText(String(valor));
    } catch (errCampo) {
      console.warn(`No se pudo llenar el campo 001 "${nombreCampo}":`, errCampo.message);
    }
  }

  formulario.updateFieldAppearances(fuente);
  formulario.getFields().forEach((campo) => {
    try {
      campo.enableReadOnly();
    } catch (errReadOnly) {
      console.warn(`No se pudo bloquear el campo 001:`, errReadOnly.message);
    }
  });
  formulario.updateFieldAppearances(fuente);

  const pool = await getPool();

  // Validar estado del borrador
  const verificacionEstado = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "001")
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
      "El formulario 001 está cerrado y ya no admite nuevas versiones.",
      409
    );
  }

  // Calcular versión siguiente
  const resultadoVersion = await pool
    .request()
    .input("paciente_id", sql.Int, pacienteId)
    .input("codigo_formulario", sql.VarChar, "001")
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
  const nombrePacienteSeguro = limpiarNombreArchivoHC(nombrePacienteTitulo || "SIN_NOMBRE");

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
      "001 ADMISION",
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
    const resultadoDoc = await pool
      .request()
      .input("paciente_id", sql.Int, pacienteId)
      .input("codigo_formulario", sql.VarChar, "001")
      .input("nombre_formulario", sql.VarChar, "001 Admisión")
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
      id: Number(resultadoDoc.recordset?.[0]?.id),
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
 * Guarda o actualiza el borrador editable del Formulario 001 en dbo.hc_formularios_datos.
 */
async function guardarBorrador001({ datos = {}, usuarioSesion }) {
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
    .input("codigo_formulario", sql.VarChar, "001")
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
          THROW 51020, 'El formulario 001 está cerrado y ya no puede modificarse.', 1;
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
            THROW 51021, 'El formulario 001 ya no se encuentra disponible para edición.', 1;
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
 * Consulta el borrador JSON actual de Formulario 001.
 */
async function consultarBorrador001({ pacienteId, fechaProcedimiento }) {
  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("codigo_formulario", sql.VarChar, "001")
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
 * Cierra definitivamente el Formulario 001 y el documento PDF asociado.
 */
async function cerrarFormulario001({
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
    .input("codigo_formulario", sql.VarChar, "001")
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
          THROW 51001, 'No existe un borrador del formulario 001 para cerrar.', 1;
        END;

        IF EXISTS (
          SELECT 1 FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario = @codigo_formulario
            AND fecha_procedimiento = @fecha_procedimiento
            AND estado <> 'BORRADOR'
        )
        BEGIN
          THROW 51002, 'El formulario 001 ya no se encuentra en estado BORRADOR.', 1;
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
          THROW 51003, 'El PDF seleccionado no corresponde al formulario 001 o ya fue cerrado.', 1;
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
          THROW 51004, 'No se pudo cerrar el formulario editable 001.', 1;
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
          THROW 51005, 'No se pudo cerrar el documento PDF 001.', 1;
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
 * Reabre un Formulario 001 cerrado previamente (exclusivo para usuarios ADMIN).
 */
async function reabrirFormulario001({
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
    .input("codigo_formulario", sql.VarChar, "001")
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
          THROW 51010, 'No existe el formulario 001 solicitado.', 1;
        END;

        IF @estado_actual <> 'CERRADO'
        BEGIN
          THROW 51011, 'El formulario 001 no se encuentra en estado CERRADO.', 1;
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
        WHERE id = @formulario_id;

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
 * Consulta el último PDF en estado BORRADOR del Formulario 001.
 */
async function consultarUltimoPdfBorrador001({ pacienteId, fechaProcedimiento }) {
  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("paciente_id", sql.Int, Number(pacienteId))
    .input("codigo_formulario", sql.VarChar, "001")
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
  generarPdf001,
  guardarBorrador001,
  consultarBorrador001,
  cerrarFormulario001,
  reabrirFormulario001,
  consultarUltimoPdfBorrador001
};
