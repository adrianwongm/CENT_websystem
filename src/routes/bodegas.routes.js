const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  listarBodegas,
  crearBodega,
  cambiarEstadoBodega
} = require("../controllers/bodegas.controller");

const router = Router();

router.get("/api/bodegas", requireAuth, asyncHandler(listarBodegas));
router.post("/api/bodegas", requireAuth, asyncHandler(crearBodega));
router.patch("/api/bodegas/estado/:id", requireAuth, asyncHandler(cambiarEstadoBodega));

module.exports = router;
