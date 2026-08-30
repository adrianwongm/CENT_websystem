const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  listarReclutadores,
  crearReclutador,
  cambiarEstadoReclutador
} = require("../controllers/reclutadores.controller");

const router = Router();

router.get("/api/reclutadores", requireAuth, asyncHandler(listarReclutadores));
router.post("/api/reclutadores", requireAuth, asyncHandler(crearReclutador));
router.patch("/api/reclutadores/estado/:id", requireAuth, asyncHandler(cambiarEstadoReclutador));

module.exports = router;
