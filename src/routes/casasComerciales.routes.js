const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  listarCasas,
  crearCasa,
  cambiarEstadoCasa,
  actualizarCasa
} = require("../controllers/casasComerciales.controller");

const router = Router();

router.get("/api/casas", requireAuth, asyncHandler(listarCasas));
router.post("/api/casas", requireAuth, asyncHandler(crearCasa));
router.patch("/api/casas/estado/:id", requireAuth, asyncHandler(cambiarEstadoCasa));
router.put("/api/casas/:id", requireAuth, asyncHandler(actualizarCasa));

module.exports = router;
