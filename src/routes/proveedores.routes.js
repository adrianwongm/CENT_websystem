const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requirePermission, requireAnyPermission } = require("../middlewares/permissions.middleware");
const {
  listarProveedores,
  crearProveedor,
  editarProveedor,
  cambiarEstadoProveedor
} = require("../controllers/proveedores.controller");

const router = Router();

router.get(
  "/api/proveedores",
  requireAuth,
  requireAnyPermission([
    "compras.ingresar",
    "compras.proveedores_registrar",
    "compras.proveedores_consultar"
  ]),
  asyncHandler(listarProveedores)
);

router.post(
  "/api/proveedores",
  requireAuth,
  requirePermission("compras.proveedores_registrar"),
  asyncHandler(crearProveedor)
);

router.put(
  "/api/proveedores/:id",
  requireAuth,
  requirePermission("compras.proveedores_registrar"),
  asyncHandler(editarProveedor)
);

router.patch(
  "/api/proveedores/estado/:id",
  requireAuth,
  requirePermission("compras.proveedores_registrar"),
  asyncHandler(cambiarEstadoProveedor)
);

module.exports = router;
