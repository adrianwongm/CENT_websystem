const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/permissions.middleware");
const { consultarControlExpiracion } = require("../controllers/expiracion.controller");

const router = Router();

router.get(
  "/api/control-expiracion",
  requireAuth,
  requirePermission("utilidades.control_expiracion"),
  asyncHandler(consultarControlExpiracion)
);

module.exports = router;
