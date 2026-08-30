const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const { limpiarNombreCarpeta } = require("../utils/fileUtils");

/* =========================================================
   1. SUBIDAS EN MEMORIA (Excel / Archivos en Buffer)
   ========================================================= */

/**
 * Instancia genérica en memoria (Buffer) con límite de 10MB.
 */
const uploadMemoria = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * Instancia para importación de productos desde Excel en memoria.
 */
const uploadProductoArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * Instancia para importación de archivos Excel con validación de extensión (.xlsx, .xls).
 */
const subirArchivoExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const extensionesPermitidas = [".xlsx", ".xls"];

    if (!extensionesPermitidas.includes(extension)) {
      return callback(
        new Error("Solo se permiten archivos Excel .xlsx o .xls")
      );
    }

    callback(null, true);
  }
});

/* =========================================================
   2. ALMACENAMIENTO DE ARCHIVOS DE PACIENTES (DISCO)
   ========================================================= */

const storagePacientes = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const pacienteId = Number(req.params.id);
      const pool = await getPool();

      const result = await pool
        .request()
        .input("id", sql.Int, pacienteId)
        .query(`
          SELECT TOP 1
            archivo,
            pac_apellido1,
            pac_apellido2,
            pac_nombre1,
            pac_nombre2
          FROM pacientes
          WHERE id = @id
        `);

      if (!result.recordset.length) {
        return cb(new Error("Paciente no encontrado"));
      }

      const p = result.recordset[0];
      req.numeroArchivoPaciente = p.archivo || pacienteId;

      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ]
        .filter(Boolean)
        .join(" ");

      const nombreCarpeta = limpiarNombreCarpeta(
        nombrePaciente || `PACIENTE_${pacienteId}`
      );
      const carpetaPaciente = path.join(PATHS.UPLOADS_PACIENTES, nombreCarpeta);

      if (!fs.existsSync(carpetaPaciente)) {
        fs.mkdirSync(carpetaPaciente, { recursive: true });
      }

      req.carpetaPacienteRelativa = `/uploads/pacientes/${nombreCarpeta}`;
      req.carpetaPacienteFisica = carpetaPaciente;

      cb(null, carpetaPaciente);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80);

    const numeroArchivo = String(
      req.numeroArchivoPaciente || req.params.id
    ).replace(/[^\w-]+/g, "_");

    const nombre = `ARCHIVO_${numeroArchivo}_${Date.now()}_${base}${ext}`;
    cb(null, nombre);
  }
});

const fileFilterPacientes = (req, file, cb) => {
  const permitidos = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ];

  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido"));
  }
};

const uploadPacienteArchivo = multer({
  storage: storagePacientes,
  fileFilter: fileFilterPacientes,
  limits: { fileSize: 15 * 1024 * 1024 }
});

/* =========================================================
   3. ALMACENAMIENTO DE FIRMAS Y SELLOS DE PROFESIONALES (DISCO)
   ========================================================= */

const almacenamientoProfesionales = multer.diskStorage({
  destination: (req, file, callback) => {
    try {
      const profesionalId = String(req.params.id || "").trim();

      if (!profesionalId || !/^\d+$/.test(profesionalId)) {
        return callback(
          new Error("El identificador del profesional no es válido")
        );
      }

      const carpetaProfesional = path.join(
        PATHS.ARCHIVOS_PROFESIONALES,
        profesionalId
      );

      if (!fs.existsSync(carpetaProfesional)) {
        fs.mkdirSync(carpetaProfesional, { recursive: true });
      }

      callback(null, carpetaProfesional);
    } catch (error) {
      callback(error);
    }
  },

  filename: (req, file, callback) => {
    const extensionOriginal = path
      .extname(file.originalname)
      .toLowerCase();

    let extensionFinal;

    if (file.mimetype === "image/png") {
      extensionFinal = ".png";
    } else if (file.mimetype === "image/jpeg") {
      extensionFinal = ".jpg";
    } else {
      extensionFinal = extensionOriginal;
    }

    const nombreArchivo =
      file.fieldname === "firma"
        ? `firma${extensionFinal}`
        : `sello${extensionFinal}`;

    callback(null, nombreArchivo);
  }
});

function filtroImagenProfesional(req, file, callback) {
  const tiposPermitidos = ["image/png", "image/jpeg"];

  if (!tiposPermitidos.includes(file.mimetype)) {
    return callback(new Error("Solo se permiten imágenes PNG o JPG"));
  }

  callback(null, true);
}

const subirImagenesProfesional = multer({
  storage: almacenamientoProfesionales,
  fileFilter: filtroImagenProfesional,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const cargarFirmaYSello = subirImagenesProfesional.fields([
  { name: "firma", maxCount: 1 },
  { name: "sello", maxCount: 1 }
]);

module.exports = {
  uploadMemoria,
  upload: uploadMemoria,
  uploadProductoArchivo,
  subirArchivoExcel,
  uploadExcel: subirArchivoExcel,
  uploadPacienteArchivo,
  subirImagenesProfesional,
  cargarFirmaYSello
};
