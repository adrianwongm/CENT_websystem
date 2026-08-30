const path = require("path");
const fs = require("fs");

const ROOT_DIR = path.resolve(__dirname, "../../");

const PATHS = {
  ROOT: ROOT_DIR,
  PUBLIC: path.join(ROOT_DIR, "public"),
  UPLOADS: path.join(ROOT_DIR, "uploads"),
  UPLOADS_PACIENTES: path.join(ROOT_DIR, "uploads", "pacientes"),
  ARCHIVOS_PROFESIONALES: path.join(ROOT_DIR, "archivos_profesionales"),
  PLANTILLAS_HCLINICAS: path.join(ROOT_DIR, "plantillas_hclinicas"),
  FORMULARIOS: path.join(ROOT_DIR, "formularios")
};

// Crear directorios requeridos de almacenamiento físico si no existen
[
  PATHS.UPLOADS,
  PATHS.UPLOADS_PACIENTES,
  PATHS.ARCHIVOS_PROFESIONALES,
  PATHS.FORMULARIOS
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

module.exports = {
  ROOT_DIR,
  PATHS
};
