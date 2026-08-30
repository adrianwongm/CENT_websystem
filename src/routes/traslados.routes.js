const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/permissions.middleware");
const {
  obtenerSiguienteNumeroTraslado,
  registrarTraslado,
  listarTraslados,
  obtenerDetalleTraslado
} = require("../controllers/traslados.controller");

const router = Router();

router.get(
  "/api/traslados/siguiente-numero",
  requireAuth,
  requirePermission("inventario.traslados"),
  asyncHandler(obtenerSiguienteNumeroTraslado)
);

router.post(
  "/api/traslados",
  requireAuth,
  requirePermission("inventario.traslados"),
  asyncHandler(registrarTraslado)
);

router.get("/api/traslados", requireAuth, asyncHandler(listarTraslados));
router.get("/api/traslados/:id", requireAuth, asyncHandler(obtenerDetalleTraslado));

module.exports = router;
