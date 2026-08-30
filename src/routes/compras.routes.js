const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/permissions.middleware");
const {
  obtenerSiguienteNumeroCompra,
  registrarCompra,
  listarCompras,
  obtenerDetalleCompra
} = require("../controllers/compras.controller");

const router = Router();

router.get(
  "/api/compras/siguiente-numero",
  requireAuth,
  requirePermission("compras.ingresar"),
  asyncHandler(obtenerSiguienteNumeroCompra)
);

router.post(
  "/api/compras",
  requireAuth,
  requirePermission("compras.ingresar"),
  asyncHandler(registrarCompra)
);

router.get(
  "/api/compras",
  requireAuth,
  requirePermission("compras.consultar"),
  asyncHandler(listarCompras)
);

router.get(
  "/api/compras/:id",
  requireAuth,
  requirePermission("compras.consultar"),
  asyncHandler(obtenerDetalleCompra)
);

module.exports = router;
