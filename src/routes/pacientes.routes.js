const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { uploadPacienteArchivo, subirArchivoExcel } = require("../middlewares/upload.middleware");
const {
  listarPacientes,
  crearPaciente,
  listarPacientesActivos,
  listarPacientesNoAtendidos,
  marcarNoAtendido,
  reactivarPaciente,
  obtenerPacientePorId,
  guardarComplementarios,
  obtenerComplementarios,
  actualizarPaciente,
  importarPacientesExcel,
  subirArchivoPaciente,
  listarArchivosPaciente,
  descargarArchivoPaciente,
  eliminarArchivoPaciente
} = require("../controllers/pacientes.controller");

const router = Router();

router.get("/api/pacientes", requireAuth, asyncHandler(listarPacientes));
router.post("/api/pacientes", requireAuth, asyncHandler(crearPaciente));
router.get("/api/pacientes/activos", requireAuth, asyncHandler(listarPacientesActivos));
router.get("/api/pacientes/no-atendidos", requireAuth, asyncHandler(listarPacientesNoAtendidos));
router.patch("/api/pacientes/no-atendido/:id", requireAuth, asyncHandler(marcarNoAtendido));
router.patch("/api/pacientes/reactivar/:id", requireAuth, asyncHandler(reactivarPaciente));
router.get("/api/pacientes/:id", requireAuth, asyncHandler(obtenerPacientePorId));
router.put("/api/pacientes/:id", requireAuth, asyncHandler(actualizarPaciente));

// Datos complementarios del paciente
router.post("/api/pacientes/complementarios/:id", requireAuth, asyncHandler(guardarComplementarios));
router.get("/api/pacientes/complementarios/:id", requireAuth, asyncHandler(obtenerComplementarios));

// Archivos de pacientes
router.post(
  "/api/pacientes/:id/archivos",
  requireAuth,
  uploadPacienteArchivo.single("archivo"),
  asyncHandler(subirArchivoPaciente)
);
router.get("/api/pacientes/:id/archivos", requireAuth, asyncHandler(listarArchivosPaciente));
router.get("/api/pacientes/archivos/:archivoId/download", requireAuth, asyncHandler(descargarArchivoPaciente));
router.delete("/api/pacientes/archivos/:archivoId", requireAuth, asyncHandler(eliminarArchivoPaciente));

// Importación masiva Excel
router.post(
  "/api/import/pacientes",
  requireAuth,
  subirArchivoExcel.single("file"),
  asyncHandler(importarPacientesExcel)
);

module.exports = router;
