const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requirePermission, requireAnyPermission } = require("../middlewares/permissions.middleware");
const { uploadProductoArchivo } = require("../middlewares/upload.middleware");
const {
  listarProductos,
  obtenerSiguienteCodigoProducto,
  crearProducto,
  cambiarEstadoProducto,
  actualizarProducto,
  obtenerProductoPorId,
  importarProductosExcel,
  listarCategoriasProducto,
  crearCategoriaProducto,
  cambiarEstadoCategoriaProducto,
  listarInventario,
  listarDetalleEntradas,
  registrarEntradaInventario,
  listarSalidasInventario,
  registrarSalidaInventario,
  consultarKardex,
  obtenerDetalleCostoKardex
} = require("../controllers/inventario.controller");

const router = Router();

/* =========================================================================
   PRODUCTOS
   ========================================================================= */

router.get(
  "/api/productos",
  requireAuth,
  requireAnyPermission([
    "inventario.registrar_producto",
    "inventario.entrada",
    "inventario.salida",
    "inventario.stock",
    "inventario.traslados",
    "compras.ingresar",
    "compras.consultar",
    "descargos.registrar"
  ]),
  asyncHandler(listarProductos)
);

router.get(
  "/api/productos/siguiente-codigo",
  requireAuth,
  requirePermission("inventario.registrar_producto"),
  asyncHandler(obtenerSiguienteCodigoProducto)
);

router.post(
  "/api/productos",
  requireAuth,
  requirePermission("inventario.registrar_producto"),
  asyncHandler(crearProducto)
);

router.patch(
  "/api/productos/estado/:id",
  requireAuth,
  requirePermission("inventario.registrar_producto"),
  asyncHandler(cambiarEstadoProducto)
);

router.put(
  "/api/productos/:id",
  requireAuth,
  requirePermission("inventario.registrar_producto"),
  asyncHandler(actualizarProducto)
);

router.get(
  "/api/productos/:id",
  requireAuth,
  requireAnyPermission([
    "inventario.registrar_producto",
    "inventario.entrada",
    "inventario.salida",
    "inventario.stock",
    "inventario.traslados",
    "compras.ingresar",
    "compras.consultar",
    "descargos.registrar"
  ]),
  asyncHandler(obtenerProductoPorId)
);

router.post(
  "/api/import/productos",
  requireAuth,
  requirePermission("utilidades.importar"),
  uploadProductoArchivo.single("file"),
  asyncHandler(importarProductosExcel)
);

/* =========================================================================
   CATEGORÍAS DE PRODUCTO
   ========================================================================= */

router.get("/api/categorias-producto", requireAuth, asyncHandler(listarCategoriasProducto));
router.post("/api/categorias-producto", requireAuth, asyncHandler(crearCategoriaProducto));
router.patch("/api/categorias-producto/estado/:id", requireAuth, asyncHandler(cambiarEstadoCategoriaProducto));

/* =========================================================================
   INVENTARIO & MOVIMIENTOS
   ========================================================================= */

router.get(
  "/api/inventario",
  requireAuth,
  requireAnyPermission([
    "inventario.entrada",
    "inventario.salida",
    "inventario.stock",
    "inventario.traslados",
    "inventario.kardex",
    "descargos.registrar",
    "descargos.consultar",
    "descargos.consignacion"
  ]),
  asyncHandler(listarInventario)
);

router.get(
  "/api/detalle-entradas",
  requireAuth,
  requireAnyPermission([
    "inventario.entrada",
    "inventario.salida",
    "inventario.stock",
    "inventario.traslados",
    "inventario.kardex",
    "descargos.registrar",
    "descargos.consignacion"
  ]),
  asyncHandler(listarDetalleEntradas)
);

router.post(
  "/api/inventario/entrada",
  requireAuth,
  requirePermission("inventario.entrada"),
  asyncHandler(registrarEntradaInventario)
);

router.get(
  "/api/inventario/salidas",
  requireAuth,
  requirePermission("inventario.salida"),
  asyncHandler(listarSalidasInventario)
);

router.post(
  "/api/inventario/salida",
  requireAuth,
  requirePermission("inventario.salida"),
  asyncHandler(registrarSalidaInventario)
);

/* =========================================================================
   KARDEX & TRAZABILIDAD DE COSTOS
   ========================================================================= */

router.get(
  "/api/kardex",
  requireAuth,
  requirePermission("inventario.kardex"),
  asyncHandler(consultarKardex)
);

router.get(
  "/api/kardex/detalle-costo",
  requireAuth,
  requirePermission("inventario.kardex"),
  asyncHandler(obtenerDetalleCostoKardex)
);

module.exports = router;
