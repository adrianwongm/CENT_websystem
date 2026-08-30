const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  renderLogin,
  renderPanel,
  login,
  logout,
  obtenerUsuarioActual,
  testDb
} = require("../controllers/auth.controller");

const router = Router();

// Rutas de navegación principal
router.get("/", renderLogin);
router.get("/panel", renderPanel);

// Rutas de sesión
router.post("/login", asyncHandler(login));
router.get("/logout", logout);
router.get("/api/usuario", requireAuth, obtenerUsuarioActual);
router.get("/test-db", asyncHandler(testDb));

module.exports = router;
