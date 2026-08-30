const { Router } = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth.middleware");
const { cargarFirmaYSello } = require("../middlewares/upload.middleware");
const {
  listarCategorias,
  listarEspecialidades,
  listarProfesionales,
  crearProfesional,
  editarProfesional,
  cambiarEstadoProfesional,
  guardarImagenesProfesional,
  obtenerProfesionalPorId,
  obtenerFirmaProfesional,
  obtenerSelloProfesional
} = require("../controllers/profesionales.controller");

const router = Router();

router.get("/api/profesionales-categorias", requireAuth, asyncHandler(listarCategorias));
router.get("/api/profesionales-especialidades", requireAuth, asyncHandler(listarEspecialidades));
router.get("/api/profesionales-salud", requireAuth, asyncHandler(listarProfesionales));
router.post("/api/profesionales-salud", requireAuth, asyncHandler(crearProfesional));
router.put("/api/profesionales-salud/:id", requireAuth, asyncHandler(editarProfesional));
router.patch("/api/profesionales-salud/estado/:id", requireAuth, asyncHandler(cambiarEstadoProfesional));

// Carga y consulta de imágenes (firma y sello)
router.post(
  "/api/profesionales-salud/:id/imagenes",
  requireAuth,
  (req, res, next) => {
    cargarFirmaYSello(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message || "No se pudieron subir las imágenes"
        });
      }
      next();
    });
  },
  asyncHandler(guardarImagenesProfesional)
);

router.get("/api/profesionales-salud/:id", requireAuth, asyncHandler(obtenerProfesionalPorId));
router.get("/api/profesionales-salud/:id/firma", requireAuth, asyncHandler(obtenerFirmaProfesional));
router.get("/api/profesionales-salud/:id/sello", requireAuth, asyncHandler(obtenerSelloProfesional));

module.exports = router;
