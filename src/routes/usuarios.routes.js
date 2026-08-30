const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  listarUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
  editarUsuario,
  cambiarPassword,
  catalogoPermisos,
  listarRoles,
  obtenerPermisosRol,
  guardarPermisosRol,
  obtenerPermisosUsuario,
  guardarPermisosUsuario,
  obtenerMisPermisos
} = require("../controllers/usuarios.controller");

const router = Router();

// Rutas de administración de usuarios
router.get("/api/usuarios", requireAuth, asyncHandler(listarUsuarios));
router.post("/api/usuarios", requireAuth, asyncHandler(crearUsuario));
router.patch("/api/usuarios/estado/:id", requireAuth, asyncHandler(cambiarEstadoUsuario));
router.put("/api/usuarios/:id", requireAuth, asyncHandler(editarUsuario));
router.patch("/api/usuarios/password/:id", requireAuth, asyncHandler(cambiarPassword));

// Rutas de matriz de permisos RBAC
router.get("/api/permisos/catalogo", requireAuth, asyncHandler(catalogoPermisos));
router.get("/api/permisos/roles", requireAuth, asyncHandler(listarRoles));
router.get("/api/permisos/rol/:rol", requireAuth, asyncHandler(obtenerPermisosRol));
router.put("/api/permisos/rol/:rol", requireAuth, asyncHandler(guardarPermisosRol));
router.get("/api/permisos/usuario/:id", requireAuth, asyncHandler(obtenerPermisosUsuario));
router.put("/api/permisos/usuario/:id", requireAuth, asyncHandler(guardarPermisosUsuario));
router.get("/api/permisos/mis-permisos", requireAuth, asyncHandler(obtenerMisPermisos));

module.exports = router;
