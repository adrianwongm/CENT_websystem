const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { subirArchivoExcel } = require("../middlewares/upload.middleware");
const {
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
  // Estados
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
} = require("../controllers/historiasClinicas.controller");

const router = Router();

/* =========================================================
   FORMULARIO 001 - ADMISIÓN
   ========================================================= */
router.post("/api/hclinicas/001/generar-pdf", requireAuth, asyncHandler(generarPdf001));
router.post("/api/hclinicas/001/guardar-borrador", requireAuth, asyncHandler(guardarBorrador001));
router.get("/api/hclinicas/001/borrador", requireAuth, asyncHandler(consultarBorrador001));
router.post("/api/hclinicas/001/cerrar", requireAuth, asyncHandler(cerrarFormulario001));
router.post("/api/hclinicas/001/reabrir", requireAuth, asyncHandler(reabrirFormulario001));
router.get("/api/hclinicas/001/ultimo-pdf-borrador", requireAuth, asyncHandler(consultarUltimoPdfBorrador001));

/* =========================================================
   FORMULARIO 008 - EMERGENCIA
   ========================================================= */
router.post("/api/hclinicas/008/generar-pdf", requireAuth, asyncHandler(generarPdf008));
router.post("/api/hclinicas/008/guardar-borrador", requireAuth, asyncHandler(guardarBorrador008));
router.get("/api/hclinicas/008/borrador", requireAuth, asyncHandler(consultarBorrador008));
router.post("/api/hclinicas/008/cerrar", requireAuth, asyncHandler(cerrarFormulario008));
router.post("/api/hclinicas/008/reabrir", requireAuth, asyncHandler(reabrirFormulario008));

/* =========================================================
   FORMULARIO 018 - PREANESTÉSICO
   ========================================================= */
router.post("/api/hclinicas/018/generar-pdf", requireAuth, asyncHandler(generarPdf018));
router.post("/api/hclinicas/018/guardar-borrador", requireAuth, asyncHandler(guardarBorrador018));
router.get("/api/hclinicas/018/borrador", requireAuth, asyncHandler(consultarBorrador018));
router.post("/api/hclinicas/018/cerrar", requireAuth, asyncHandler(cerrarFormulario018));
router.post("/api/hclinicas/018/reabrir", requireAuth, asyncHandler(reabrirFormulario018));
router.get("/api/hclinicas/018/ultimo-pdf-borrador", requireAuth, asyncHandler(consultarUltimoPdfBorrador018));

/* =========================================================
   ESTADO GENERAL DE FORMULARIOS
   ========================================================= */
router.get("/api/hclinicas/formularios-estados", requireAuth, asyncHandler(consultarEstadosFormularios));

/* =========================================================
   DIAGNÓSTICOS CIE
   ========================================================= */
router.get("/api/diagnosticos-cie/plantilla", requireAuth, descargarPlantillaCIE);
router.get("/api/diagnosticos-cie", requireAuth, asyncHandler(listarDiagnosticosCIE));
router.post("/api/diagnosticos-cie", requireAuth, asyncHandler(crearDiagnosticoCIE));
router.get("/api/diagnosticos-cie/:id", requireAuth, asyncHandler(obtenerDiagnosticoPorId));
router.put("/api/diagnosticos-cie/:id", requireAuth, asyncHandler(editarDiagnosticoCIE));
router.patch("/api/diagnosticos-cie/estado/:id", requireAuth, asyncHandler(cambiarEstadoDiagnosticoCIE));
router.post(
  "/api/diagnosticos-cie/importar",
  requireAuth,
  subirArchivoExcel.single("archivo"),
  asyncHandler(importarDiagnosticosExcel)
);

/* =========================================================
   PROCEDIMIENTOS MÉDICOS
   ========================================================= */
router.get("/api/procedimientos-medicos/plantilla", requireAuth, descargarPlantillaProcedimientos);
router.get("/api/procedimientos-medicos", requireAuth, asyncHandler(listarProcedimientosMedicos));
router.post("/api/procedimientos-medicos", requireAuth, asyncHandler(crearProcedimientoMedico));
router.put("/api/procedimientos-medicos/:id", requireAuth, asyncHandler(editarProcedimientoMedico));
router.patch("/api/procedimientos-medicos/estado/:id", requireAuth, asyncHandler(cambiarEstadoProcedimientoMedico));
router.post(
  "/api/procedimientos-medicos/importar",
  requireAuth,
  subirArchivoExcel.single("archivo"),
  asyncHandler(importarProcedimientosExcel)
);

module.exports = router;
