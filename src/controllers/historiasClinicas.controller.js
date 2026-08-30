const XLSX = require("xlsx");
const { getPool, sql } = require("../config/db");
const { obtenerUsuarioSesionHC } = require("../middlewares/auth.middleware");
const AppError = require("../utils/AppError");
const pdf001Service = require("../services/pdf001.service");
const pdf008Service = require("../services/pdf008.service");
const pdf018Service = require("../services/pdf018.service");

/* =========================================================
   FORMULARIO 001 - ADMISIÓN
   ========================================================= */

const generarPdf001 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const documento = await pdf001Service.generarPdf001({
    datos: req.body || {},
    usuarioSesion
  });

  res.status(201).json({
    ok: true,
    mensaje: "PDF generado y almacenado correctamente",
    documento
  });
};

const guardarBorrador001 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const formulario = await pdf001Service.guardarBorrador001({
    datos: req.body || {},
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Borrador del formulario 001 guardado correctamente",
    formulario
  });
};

const consultarBorrador001 = async (req, res) => {
  const pacienteId = Number(req.query.paciente_id);
  const fechaProcedimiento = String(req.query.fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const resultado = await pdf001Service.consultarBorrador001({
    pacienteId,
    fechaProcedimiento
  });

  res.json({
    ok: true,
    ...resultado
  });
};

const cerrarFormulario001 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const { paciente_id, documento_id, fecha_procedimiento } = req.body || {};

  const pacienteId = Number(paciente_id);
  const documentoId = Number(documento_id);
  const fechaProcedimiento = String(fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!Number.isInteger(documentoId) || documentoId <= 0) {
    throw new AppError("No se recibió un documento PDF válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const documento = await pdf001Service.cerrarFormulario001({
    pacienteId,
    documentoId,
    fechaProcedimiento,
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Formulario 001 cerrado correctamente",
    formulario: {
      pacienteId,
      codigoFormulario: "001",
      fechaProcedimiento,
      estado: "CERRADO"
    },
    documento
  });
};

const reabrirFormulario001 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const { paciente_id, fecha_procedimiento, motivo_reapertura } = req.body || {};

  const pacienteId = Number(paciente_id);
  const fechaProcedimiento = String(fecha_procedimiento || "").slice(0, 10);
  const motivoReapertura = String(motivo_reapertura || "").trim();

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  if (motivoReapertura.length < 5 || motivoReapertura.length > 500) {
    throw new AppError("El motivo de reapertura debe contener entre 5 y 500 caracteres", 400);
  }

  const formulario = await pdf001Service.reabrirFormulario001({
    pacienteId,
    fechaProcedimiento,
    motivoReapertura,
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Formulario 001 reabierto correctamente",
    formulario
  });
};

const consultarUltimoPdfBorrador001 = async (req, res) => {
  const pacienteId = Number(req.query.paciente_id);
  const fechaProcedimiento = String(req.query.fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const documento = await pdf001Service.consultarUltimoPdfBorrador001({
    pacienteId,
    fechaProcedimiento
  });

  if (!documento) {
    return res.json({ ok: true, existe: false, documento: null });
  }

  res.json({
    ok: true,
    existe: true,
    documento: {
      id: documento.id,
      pacienteId: documento.paciente_id,
      codigoFormulario: documento.codigo_formulario,
      nombreFormulario: documento.nombre_formulario,
      fechaProcedimiento: documento.fecha_procedimiento,
      version: documento.version,
      estado: documento.estado,
      nombreArchivo: documento.nombre_archivo,
      rutaRelativa: documento.ruta_relativa,
      creadoPorUsername: documento.creado_por_username,
      creadoPorNombre: documento.creado_por_nombre
    }
  });
};

/* =========================================================
   FORMULARIO 008 - EMERGENCIA
   ========================================================= */

const generarPdf008 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const documento = await pdf008Service.generarPdf008({
    datos: req.body || {},
    usuarioSesion
  });

  res.status(201).json({
    ok: true,
    mensaje: "PDF del formulario 008 generado y almacenado correctamente",
    documento
  });
};

const guardarBorrador008 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const formulario = await pdf008Service.guardarBorrador008({
    datos: req.body || {},
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Borrador del formulario 008 guardado correctamente",
    formulario
  });
};

const consultarBorrador008 = async (req, res) => {
  const pacienteId = Number(req.query.paciente_id);
  const fechaProcedimiento = String(req.query.fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const resultado = await pdf008Service.consultarBorrador008({
    pacienteId,
    fechaProcedimiento
  });

  res.json({
    ok: true,
    ...resultado
  });
};

const cerrarFormulario008 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const { paciente_id, documento_id, fecha_procedimiento } = req.body || {};

  const pacienteId = Number(paciente_id);
  const documentoId = Number(documento_id);
  const fechaProcedimiento = String(fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!Number.isInteger(documentoId) || documentoId <= 0) {
    throw new AppError("No se recibió un documento PDF válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const documento = await pdf008Service.cerrarFormulario008({
    pacienteId,
    documentoId,
    fechaProcedimiento,
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Formulario 008 cerrado correctamente",
    formulario: {
      pacienteId,
      codigoFormulario: "008",
      fechaProcedimiento,
      estado: "CERRADO"
    },
    documento
  });
};

const reabrirFormulario008 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const { paciente_id, fecha_procedimiento, motivo_reapertura } = req.body || {};

  const pacienteId = Number(paciente_id);
  const fechaProcedimiento = String(fecha_procedimiento || "").slice(0, 10);
  const motivoReapertura = String(motivo_reapertura || "").trim();

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  if (motivoReapertura.length < 5 || motivoReapertura.length > 500) {
    throw new AppError("El motivo de reapertura debe contener entre 5 y 500 caracteres", 400);
  }

  const formulario = await pdf008Service.reabrirFormulario008({
    pacienteId,
    fechaProcedimiento,
    motivoReapertura,
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Formulario 008 reabierto correctamente",
    formulario
  });
};

/* =========================================================
   FORMULARIO 018 - PREANESTÉSICO
   ========================================================= */

const generarPdf018 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const documento = await pdf018Service.generarPdf018({
    datos: req.body || {},
    usuarioSesion
  });

  res.status(201).json({
    ok: true,
    mensaje: "PDF generado y almacenado correctamente",
    documento
  });
};

const guardarBorrador018 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const formulario = await pdf018Service.guardarBorrador018({
    datos: req.body || {},
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Borrador del formulario 018 guardado correctamente",
    formulario
  });
};

const consultarBorrador018 = async (req, res) => {
  const pacienteId = Number(req.query.paciente_id);
  const fechaProcedimiento = String(
    req.query.fecha_procedimiento || req.query.fecha_admision_paciente || ""
  ).slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const resultado = await pdf018Service.consultarBorrador018({
    pacienteId,
    fechaProcedimiento
  });

  res.json({
    ok: true,
    ...resultado
  });
};

const cerrarFormulario018 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const { paciente_id, documento_id, fecha_procedimiento } = req.body || {};

  const pacienteId = Number(paciente_id);
  const documentoId = Number(documento_id);
  const fechaProcedimiento = String(fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!Number.isInteger(documentoId) || documentoId <= 0) {
    throw new AppError("No se recibió un documento PDF válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const documento = await pdf018Service.cerrarFormulario018({
    pacienteId,
    documentoId,
    fechaProcedimiento,
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Formulario 018 cerrado correctamente",
    formulario: {
      pacienteId,
      codigoFormulario: "018",
      fechaProcedimiento,
      estado: "CERRADO"
    },
    documento
  });
};

const reabrirFormulario018 = async (req, res) => {
  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const { paciente_id, fecha_procedimiento, motivo_reapertura } = req.body || {};

  const pacienteId = Number(paciente_id);
  const fechaProcedimiento = String(fecha_procedimiento || "").slice(0, 10);
  const motivoReapertura = String(motivo_reapertura || "").trim();

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  if (motivoReapertura.length < 5 || motivoReapertura.length > 500) {
    throw new AppError("El motivo de reapertura debe contener entre 5 y 500 caracteres", 400);
  }

  const formulario = await pdf018Service.reabrirFormulario018({
    pacienteId,
    fechaProcedimiento,
    motivoReapertura,
    usuarioSesion
  });

  res.status(200).json({
    ok: true,
    mensaje: "Formulario 018 reabierto correctamente",
    formulario
  });
};

const consultarUltimoPdfBorrador018 = async (req, res) => {
  const pacienteId = Number(req.query.paciente_id);
  const fechaProcedimiento = String(
    req.query.fecha_procedimiento || req.query.fecha_admision_paciente || ""
  ).slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const documento = await pdf018Service.consultarUltimoPdfBorrador018({
    pacienteId,
    fechaProcedimiento
  });

  if (!documento) {
    return res.json({ ok: true, existe: false, documento: null });
  }

  res.json({
    ok: true,
    existe: true,
    documento: {
      id: documento.id,
      pacienteId: documento.paciente_id,
      codigoFormulario: documento.codigo_formulario,
      nombreFormulario: documento.nombre_formulario,
      fechaProcedimiento: documento.fecha_procedimiento,
      version: documento.version,
      estado: documento.estado,
      nombreArchivo: documento.nombre_archivo,
      rutaRelativa: documento.ruta_relativa,
      creadoPorUsername: documento.creado_por_username,
      creadoPorNombre: documento.creado_por_nombre
    }
  });
};

/* =========================================================
   ESTADO GENERAL DE FORMULARIOS POR PACIENTE Y FECHA
   ========================================================= */

const consultarEstadosFormularios = async (req, res) => {
  const pacienteId = Number(req.query.paciente_id);
  const fechaProcedimiento = String(req.query.fecha_procedimiento || "").slice(0, 10);

  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    throw new AppError("No se recibió un paciente válido", 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaProcedimiento)) {
    throw new AppError("La fecha del procedimiento no es válida", 400);
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("paciente_id", pacienteId)
    .input("fecha_procedimiento", fechaProcedimiento)
    .query(`
      WITH FormulariosOrdenados AS (
        SELECT
          codigo_formulario,
          estado,
          fecha_creacion,
          fecha_modificacion,
          fecha_cierre,
          ROW_NUMBER() OVER (
            PARTITION BY codigo_formulario
            ORDER BY COALESCE(fecha_modificacion, fecha_cierre, fecha_creacion) DESC, id DESC
          ) AS numero_fila
        FROM dbo.hc_formularios_datos
        WHERE paciente_id = @paciente_id
          AND fecha_procedimiento = @fecha_procedimiento
      )
      SELECT
        codigo_formulario,
        estado,
        fecha_creacion,
        fecha_modificacion,
        fecha_cierre
      FROM FormulariosOrdenados
      WHERE numero_fila = 1;
    `);

  const estados = {};
  for (const registro of resultado.recordset || []) {
    const codigo = String(registro.codigo_formulario || "").trim().toUpperCase();
    const estado = String(registro.estado || "PENDIENTE").trim().toUpperCase();

    if (codigo) {
      estados[codigo] = {
        estado,
        fechaCreacion: registro.fecha_creacion,
        fechaModificacion: registro.fecha_modificacion,
        fechaCierre: registro.fecha_cierre
      };
    }
  }

  res.json({
    ok: true,
    pacienteId,
    fechaProcedimiento,
    estados
  });
};

/* =========================================================
   DIAGNÓSTICOS CIE
   ========================================================= */

const descargarPlantillaCIE = (req, res) => {
  const datosPlantilla = [
    { codigo: "I10", descripcion: "Hipertensión esencial primaria" },
    { codigo: "E11.9", descripcion: "Diabetes mellitus tipo 2 sin complicaciones" }
  ];

  const hoja = XLSX.utils.json_to_sheet(datosPlantilla, {
    header: ["codigo", "descripcion"]
  });
  hoja["!cols"] = [{ wch: 20 }, { wch: 80 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "DIAGNOSTICOS");

  const archivo = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="PLANTILLA_DIAGNOSTICOS_CIE.xlsx"'
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(archivo);
};

const listarDiagnosticosCIE = async (req, res) => {
  const busqueda = String(req.query.buscar || "").trim();
  const soloActivos = String(req.query.soloActivos || "").toLowerCase() === "true";

  if (busqueda.length > 0 && busqueda.length < 2) {
    return res.json({ ok: true, diagnosticos: [] });
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("texto", busqueda)
    .input("busqueda", `%${busqueda}%`)
    .query(`
      SELECT TOP 200
        id,
        codigo,
        descripcion,
        estado,
        fecha_creacion
      FROM dbo.diagnosticos_cie
      WHERE
        (
          @texto = ''
          OR codigo LIKE @busqueda
          OR descripcion LIKE @busqueda
        )
        ${soloActivos ? "AND estado = 'ACTIVO'" : ""}
      ORDER BY
        CASE
          WHEN codigo = @texto THEN 0
          WHEN codigo LIKE @texto + '%' THEN 1
          WHEN descripcion LIKE @texto + '%' THEN 2
          ELSE 3
        END,
        codigo,
        descripcion;
    `);

  res.json({
    ok: true,
    diagnosticos: resultado.recordset || []
  });
};

const obtenerDiagnosticoPorId = async (req, res) => {
  const diagnosticoId = Number(req.params.id);

  if (!Number.isInteger(diagnosticoId) || diagnosticoId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("id", diagnosticoId)
    .query(`
      SELECT id, codigo, descripcion, estado, fecha_creacion
      FROM dbo.diagnosticos_cie
      WHERE id = @id;
    `);

  const diagnostico = resultado.recordset?.[0];
  if (!diagnostico) {
    throw new AppError("No se encontró el diagnóstico", 404);
  }

  res.json({ ok: true, diagnostico });
};

const crearDiagnosticoCIE = async (req, res) => {
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const descripcion = String(req.body.descripcion || "").trim();

  if (!codigo || !descripcion) {
    throw new AppError("El código y la descripción son obligatorios", 400);
  }

  if (codigo.length > 20 || descripcion.length > 500) {
    throw new AppError("El código no debe superar 20 caracteres y la descripción 500", 400);
  }

  const pool = await getPool();

  try {
    const resultado = await pool
      .request()
      .input("codigo", codigo)
      .input("descripcion", descripcion)
      .query(`
        INSERT INTO dbo.diagnosticos_cie (codigo, descripcion, estado)
        OUTPUT INSERTED.id
        VALUES (@codigo, @descripcion, 'ACTIVO');
      `);

    res.status(201).json({
      ok: true,
      mensaje: "Diagnóstico registrado correctamente",
      diagnosticoId: resultado.recordset?.[0]?.id
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe un diagnóstico con ese código", 409);
    }
    throw error;
  }
};

const editarDiagnosticoCIE = async (req, res) => {
  const diagnosticoId = Number(req.params.id);
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const descripcion = String(req.body.descripcion || "").trim();

  if (!Number.isInteger(diagnosticoId) || diagnosticoId <= 0) {
    throw new AppError("Identificador de diagnóstico no válido", 400);
  }

  if (!codigo || !descripcion) {
    throw new AppError("El código y la descripción son obligatorios", 400);
  }

  const pool = await getPool();

  try {
    const resultado = await pool
      .request()
      .input("id", diagnosticoId)
      .input("codigo", codigo)
      .input("descripcion", descripcion)
      .query(`
        UPDATE dbo.diagnosticos_cie
        SET codigo = @codigo, descripcion = @descripcion
        WHERE id = @id;
      `);

    if (resultado.rowsAffected[0] === 0) {
      throw new AppError("No se encontró el diagnóstico", 404);
    }

    res.json({ ok: true, mensaje: "Diagnóstico actualizado correctamente" });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe otro diagnóstico con ese código", 409);
    }
    throw error;
  }
};

const cambiarEstadoDiagnosticoCIE = async (req, res) => {
  const diagnosticoId = Number(req.params.id);

  if (!Number.isInteger(diagnosticoId) || diagnosticoId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("id", diagnosticoId)
    .query(`
      UPDATE dbo.diagnosticos_cie
      SET estado =
        CASE
          WHEN estado = 'ACTIVO' THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END
      OUTPUT INSERTED.estado
      WHERE id = @id;
    `);

  const nuevoEstado = resultado.recordset?.[0]?.estado;
  if (!nuevoEstado) {
    throw new AppError("No se encontró el diagnóstico", 404);
  }

  res.json({
    ok: true,
    estado: nuevoEstado,
    mensaje:
      nuevoEstado === "ACTIVO"
        ? "Diagnóstico activado correctamente"
        : "Diagnóstico inactivado correctamente"
  });
};

const importarDiagnosticosExcel = async (req, res) => {
  if (!req.file?.buffer) {
    throw new AppError("Seleccione un archivo Excel", 400);
  }

  const libro = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
  const nombreHoja = libro.SheetNames?.[0];

  if (!nombreHoja) {
    throw new AppError("El archivo Excel no contiene hojas", 400);
  }

  const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], { defval: "", raw: false });
  if (!filas.length) {
    throw new AppError("El archivo no contiene diagnósticos", 400);
  }

  const obtenerValor = (fila, permitidos) => {
    const claves = Object.keys(fila);
    const encontrada = claves.find((c) => {
      const norm = String(c).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      return permitidos.includes(norm);
    });
    return encontrada ? fila[encontrada] : "";
  };

  const diagnosticosProcesados = [];
  const erroresDetalle = [];
  const codigosVistos = new Set();

  filas.forEach((fila, idx) => {
    const num = idx + 2;
    const codigo = String(obtenerValor(fila, ["codigo", "codigo_cie", "cie"]) || "").trim().toUpperCase();
    const descripcion = String(obtenerValor(fila, ["descripcion", "diagnostico", "nombre"]) || "").trim();

    if (!codigo && !descripcion) return;
    if (!codigo) {
      erroresDetalle.push({ fila: num, error: "Código CIE vacío" });
      return;
    }
    if (!descripcion) {
      erroresDetalle.push({ fila: num, codigo, error: "Descripción vacía" });
      return;
    }
    if (codigo.length > 20 || descripcion.length > 500) {
      erroresDetalle.push({ fila: num, codigo, error: "Longitud no válida" });
      return;
    }
    if (codigosVistos.has(codigo)) {
      erroresDetalle.push({ fila: num, codigo, error: "Código repetido en archivo" });
      return;
    }

    codigosVistos.add(codigo);
    diagnosticosProcesados.push({ fila: num, codigo, descripcion });
  });

  if (!diagnosticosProcesados.length) {
    return res.status(400).json({
      error: "No se encontraron diagnósticos válidos",
      errores: erroresDetalle
    });
  }

  const pool = await getPool();
  const transaccion = new sql.Transaction(pool);

  try {
    await transaccion.begin();
    let insertados = 0;
    let omitidos = 0;

    for (const d of diagnosticosProcesados) {
      const result = await new sql.Request(transaccion)
        .input("codigo", sql.NVarChar(20), d.codigo)
        .input("descripcion", sql.NVarChar(500), d.descripcion)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.diagnosticos_cie WHERE codigo = @codigo)
          BEGIN
            INSERT INTO dbo.diagnosticos_cie (codigo, descripcion, estado)
            VALUES (@codigo, @descripcion, 'ACTIVO');
            SELECT CAST(1 AS BIT) AS insertado;
          END
          ELSE
          BEGIN
            SELECT CAST(0 AS BIT) AS insertado;
          END;
        `);

      if (result.recordset?.[0]?.insertado) insertados++;
      else omitidos++;
    }

    await transaccion.commit();

    res.json({
      ok: true,
      mensaje: "Importación finalizada",
      totalFilas: filas.length,
      filasValidas: diagnosticosProcesados.length,
      insertados,
      omitidosDuplicados: omitidos,
      errores: erroresDetalle.length,
      erroresDetalle: erroresDetalle.slice(0, 100)
    });
  } catch (error) {
    try {
      await transaccion.rollback();
    } catch (_) {}
    throw error;
  }
};

/* =========================================================
   PROCEDIMIENTOS MÉDICOS
   ========================================================= */

const listarProcedimientosMedicos = async (req, res) => {
  const busqueda = String(req.query.buscar || "").trim();
  const soloActivos = String(req.query.soloActivos || "").toLowerCase() === "true";

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("texto", busqueda)
    .input("busqueda", `%${busqueda}%`)
    .query(`
      SELECT TOP 200 id, nombre, estado, fecha_creacion
      FROM dbo.procedimientos_medicos
      WHERE
        (
          @texto = ''
          OR nombre LIKE @busqueda
        )
        ${soloActivos ? "AND estado = 'ACTIVO'" : ""}
      ORDER BY
        CASE
          WHEN nombre = @texto THEN 0
          WHEN nombre LIKE @texto + '%' THEN 1
          ELSE 2
        END,
        nombre;
    `);

  res.json({
    ok: true,
    procedimientos: resultado.recordset || []
  });
};

const descargarPlantillaProcedimientos = (req, res) => {
  const datosPlantilla = [
    { nombre: "CORONARIOGRAFÍA" },
    { nombre: "ANGIOPLASTIA CORONARIA" },
    { nombre: "IMPLANTE DE MARCAPASOS" }
  ];

  const hoja = XLSX.utils.json_to_sheet(datosPlantilla, { header: ["nombre"] });
  hoja["!cols"] = [{ wch: 70 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "PROCEDIMIENTOS");

  const archivo = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="PLANTILLA_PROCEDIMIENTOS_MEDICOS.xlsx"'
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(archivo);
};

const crearProcedimientoMedico = async (req, res) => {
  const nombre = String(req.body.nombre || "").trim().toUpperCase();

  if (!nombre) {
    throw new AppError("El nombre del procedimiento es obligatorio", 400);
  }

  if (nombre.length > 300) {
    throw new AppError("El nombre no puede superar 300 caracteres", 400);
  }

  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const creadoPor = Number(usuarioSesion.id || 0) || null;

  const pool = await getPool();

  try {
    const resultado = await pool
      .request()
      .input("nombre", sql.NVarChar(300), nombre)
      .input("creado_por", sql.Int, creadoPor)
      .query(`
        INSERT INTO dbo.procedimientos_medicos (nombre, estado, creado_por)
        OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.estado
        VALUES (@nombre, 'ACTIVO', @creado_por);
      `);

    res.status(201).json({
      ok: true,
      mensaje: "Procedimiento registrado correctamente",
      procedimiento: resultado.recordset?.[0] || null
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe un procedimiento con ese nombre", 409);
    }
    throw error;
  }
};

const editarProcedimientoMedico = async (req, res) => {
  const procedimientoId = Number(req.params.id);
  const nombre = String(req.body.nombre || "").trim().toUpperCase();

  if (!Number.isInteger(procedimientoId) || procedimientoId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  if (!nombre || nombre.length > 300) {
    throw new AppError("Nombre no válido (máximo 300 caracteres)", 400);
  }

  const pool = await getPool();

  try {
    const resultado = await pool
      .request()
      .input("id", sql.Int, procedimientoId)
      .input("nombre", sql.NVarChar(300), nombre)
      .query(`
        UPDATE dbo.procedimientos_medicos
        SET nombre = @nombre
        WHERE id = @id;
      `);

    if (resultado.rowsAffected[0] === 0) {
      throw new AppError("No se encontró el procedimiento", 404);
    }

    res.json({ ok: true, mensaje: "Procedimiento actualizado correctamente" });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe otro procedimiento con ese nombre", 409);
    }
    throw error;
  }
};

const cambiarEstadoProcedimientoMedico = async (req, res) => {
  const procedimientoId = Number(req.params.id);

  if (!Number.isInteger(procedimientoId) || procedimientoId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("id", sql.Int, procedimientoId)
    .query(`
      UPDATE dbo.procedimientos_medicos
      SET estado =
        CASE
          WHEN estado = 'ACTIVO' THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END
      OUTPUT INSERTED.estado
      WHERE id = @id;
    `);

  const nuevoEstado = resultado.recordset?.[0]?.estado;
  if (!nuevoEstado) {
    throw new AppError("No se encontró el procedimiento", 404);
  }

  res.json({
    ok: true,
    estado: nuevoEstado,
    mensaje:
      nuevoEstado === "ACTIVO"
        ? "Procedimiento activado correctamente"
        : "Procedimiento inactivado correctamente"
  });
};

const importarProcedimientosExcel = async (req, res) => {
  if (!req.file?.buffer) {
    throw new AppError("Seleccione un archivo Excel", 400);
  }

  const libro = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
  const nombreHoja = libro.SheetNames?.[0];

  if (!nombreHoja) {
    throw new AppError("El archivo Excel no contiene hojas", 400);
  }

  const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], { defval: "", raw: false });
  if (!filas.length) {
    throw new AppError("El archivo no contiene procedimientos", 400);
  }

  const obtenerNombre = (fila) => {
    const claves = Object.keys(fila);
    const encontrada = claves.find((c) => {
      const norm = String(c).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      return ["nombre", "procedimiento", "nombre_procedimiento"].includes(norm);
    });
    return encontrada ? fila[encontrada] : "";
  };

  const procesados = [];
  const errores = [];
  const vistos = new Set();

  filas.forEach((f, idx) => {
    const num = idx + 2;
    const nombre = String(obtenerNombre(f) || "").trim().toUpperCase();

    if (!nombre) {
      errores.push({ fila: num, error: "Nombre del procedimiento vacío" });
      return;
    }
    if (nombre.length > 300) {
      errores.push({ fila: num, nombre, error: "Supera 300 caracteres" });
      return;
    }
    if (vistos.has(nombre)) {
      errores.push({ fila: num, nombre, error: "Procedimiento repetido en archivo" });
      return;
    }

    vistos.add(nombre);
    procesados.push({ fila: num, nombre });
  });

  if (!procesados.length) {
    return res.status(400).json({
      error: "No se encontraron procedimientos válidos",
      errores
    });
  }

  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const creadoPor = Number(usuarioSesion.id || 0) || null;

  const pool = await getPool();
  const transaccion = new sql.Transaction(pool);

  try {
    await transaccion.begin();
    let insertados = 0;
    let omitidos = 0;

    for (const p of procesados) {
      const result = await new sql.Request(transaccion)
        .input("nombre", sql.NVarChar(300), p.nombre)
        .input("creado_por", sql.Int, creadoPor)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.procedimientos_medicos WHERE nombre = @nombre)
          BEGIN
            INSERT INTO dbo.procedimientos_medicos (nombre, estado, creado_por)
            VALUES (@nombre, 'ACTIVO', @creado_por);
            SELECT CAST(1 AS BIT) AS insertado;
          END
          ELSE
          BEGIN
            SELECT CAST(0 AS BIT) AS insertado;
          END;
        `);

      if (result.recordset?.[0]?.insertado) insertados++;
      else omitidos++;
    }

    await transaccion.commit();

    res.json({
      ok: true,
      mensaje: "Importación finalizada",
      totalFilas: filas.length,
      filasValidas: procesados.length,
      insertados,
      omitidosDuplicados: omitidos,
      errores: errores.length,
      erroresDetalle: errores.slice(0, 100)
    });
  } catch (error) {
    try {
      await transaccion.rollback();
    } catch (_) {}
    throw error;
  }
};

module.exports = {
  // 001
  generarPdf001,
  guardarBorrador001,
  consultarBorrador001,
  cerrarFormulario001,
  reabrirFormulario001,
  consultarUltimoPdfBorrador001,
  // 008
  generarPdf008,
  guardarBorrador008,
  consultarBorrador008,
  cerrarFormulario008,
  reabrirFormulario008,
  // 018
  generarPdf018,
  guardarBorrador018,
  consultarBorrador018,
  cerrarFormulario018,
  reabrirFormulario018,
  consultarUltimoPdfBorrador018,
  // Estados generales
  consultarEstadosFormularios,
  // CIE
  descargarPlantillaCIE,
  listarDiagnosticosCIE,
  obtenerDiagnosticoPorId,
  crearDiagnosticoCIE,
  editarDiagnosticoCIE,
  cambiarEstadoDiagnosticoCIE,
  importarDiagnosticosExcel,
  // Procedimientos
  listarProcedimientosMedicos,
  descargarPlantillaProcedimientos,
  crearProcedimientoMedico,
  editarProcedimientoMedico,
  cambiarEstadoProcedimientoMedico,
  importarProcedimientosExcel
};
