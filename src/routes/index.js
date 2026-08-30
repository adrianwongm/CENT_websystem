const { Router } = require("express");

const authRoutes = require("./auth.routes");
const usuariosRoutes = require("./usuarios.routes");
const reclutadoresRoutes = require("./reclutadores.routes");
const configRoutes = require("./config.routes");
const profesionalesRoutes = require("./profesionales.routes");
const pacientesRoutes = require("./pacientes.routes");
const historiasClinicasRoutes = require("./historiasClinicas.routes");
const bodegasRoutes = require("./bodegas.routes");
const casasComercialesRoutes = require("./casasComerciales.routes");
const proveedoresRoutes = require("./proveedores.routes");
const comprasRoutes = require("./compras.routes");
const trasladosRoutes = require("./traslados.routes");
const descargosRoutes = require("./descargos.routes");
const inventarioRoutes = require("./inventario.routes");
const cuarentenaRoutes = require("./cuarentena.routes");
const expiracionRoutes = require("./expiracion.routes");

const router = Router();

// Montaje de routers modulares
router.use(authRoutes);
router.use(usuariosRoutes);
router.use(reclutadoresRoutes);
router.use(configRoutes);
router.use(profesionalesRoutes);
router.use(pacientesRoutes);
router.use(historiasClinicasRoutes);
router.use(bodegasRoutes);
router.use(casasComercialesRoutes);
router.use(proveedoresRoutes);
router.use(comprasRoutes);
router.use(trasladosRoutes);
router.use(descargosRoutes);
router.use(inventarioRoutes);
router.use(cuarentenaRoutes);
router.use(expiracionRoutes);

module.exports = router;
