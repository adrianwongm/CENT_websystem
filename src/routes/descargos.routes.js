const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  obtenerSiguienteNumeroDescargo,
  registrarDescargo,
  listarDescargos,
  listarConsignacion,
  obtenerDetalleDescargo,
  listarPacientesConsolidados,
  obtenerDetalleConsolidado,
  enviarReporteConsignacion,
  listarConsignacionEnviados
} = require("../controllers/descargos.controller");

const router = Router();

router.get("/api/descargos/siguiente-numero", requireAuth, asyncHandler(obtenerSiguienteNumeroDescargo));
router.post("/api/descargos", requireAuth, asyncHandler(registrarDescargo));
router.get("/api/descargos", requireAuth, asyncHandler(listarDescargos));
router.get("/api/descargos/consignacion", requireAuth, asyncHandler(listarConsignacion));
router.get("/api/descargos/:id", requireAuth, asyncHandler(obtenerDetalleDescargo));

// Descargos Consolidados
router.get("/api/descargos-consolidados/pacientes", requireAuth, asyncHandler(listarPacientesConsolidados));
router.get("/api/descargos-consolidados/detalle", requireAuth, asyncHandler(obtenerDetalleConsolidado));

// Consignación: Envío y Auditoría
router.post("/api/descargos/consignacion/enviar", requireAuth, asyncHandler(enviarReporteConsignacion));
router.get("/api/descargos/consignacion/enviados", requireAuth, asyncHandler(listarConsignacionEnviados));

module.exports = router;
