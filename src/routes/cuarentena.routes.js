const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/permissions.middleware");
const {
  listarCuarentena,
  listarBodegasDestinoCuarentena,
  moverACuarentena,
  liberarCuarentena
} = require("../controllers/cuarentena.controller");

const router = Router();

router.get(
  "/api/cuarentena",
  requireAuth,
  requirePermission("utilidades.cuarentena_ver"),
  asyncHandler(listarCuarentena)
);

router.get(
  "/api/cuarentena/bodegas-destino",
  requireAuth,
  requirePermission("utilidades.cuarentena_liberar"),
  asyncHandler(listarBodegasDestinoCuarentena)
);

router.post(
  "/api/cuarentena/mover",
  requireAuth,
  requirePermission("utilidades.cuarentena_mover"),
  asyncHandler(moverACuarentena)
);

router.post(
  "/api/cuarentena/liberar",
  requireAuth,
  requirePermission("utilidades.cuarentena_liberar"),
  asyncHandler(liberarCuarentena)
);

module.exports = router;
