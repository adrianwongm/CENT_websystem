const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  requirePermission,
  requireAnyPermission
} = require("../middlewares/permissions.middleware");
const {
  obtenerConfigArchivo,
  actualizarConfigArchivo,
  listarDesplegables,
  crearDesplegable,
  cambiarEstadoDesplegable,
  obtenerConfigExpiracion,
  actualizarConfigExpiracion
} = require("../controllers/config.controller");

const router = Router();

// Configuración secuencial de archivo
router.get("/api/config/archivo", requireAuth, asyncHandler(obtenerConfigArchivo));
router.put("/api/config/archivo", requireAuth, asyncHandler(actualizarConfigArchivo));

// Configuración de desplegables
router.get("/api/config/desplegables", requireAuth, asyncHandler(listarDesplegables));
router.post("/api/config/desplegables", requireAuth, asyncHandler(crearDesplegable));
router.patch("/api/config/desplegables/estado/:id", requireAuth, asyncHandler(cambiarEstadoDesplegable));

// Configuración de expiración
router.get(
  "/api/config/expiracion",
  requireAuth,
  requireAnyPermission([
    "configuraciones.lapso_expiracion",
    "utilidades.control_expiracion",
    "utilidades.cuarentena_ver"
  ]),
  asyncHandler(obtenerConfigExpiracion)
);

router.put(
  "/api/config/expiracion",
  requireAuth,
  requirePermission("configuraciones.lapso_expiracion"),
  asyncHandler(actualizarConfigExpiracion)
);

module.exports = router;
