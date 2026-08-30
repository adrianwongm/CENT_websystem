const express = require("express");
const path = require("path");
const fs = require("fs");
const sessionConfig = require("./config/session");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middlewares globales de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones de usuario
app.use(sessionConfig);

// Archivos estáticos de frontend (panel, login, scripts, css)
app.use(express.static(path.join(__dirname, "..", "public")));

// Asegurar directorios de almacenamiento de archivos
const uploadPacientesDir = path.join(__dirname, "..", "uploads", "pacientes");
if (!fs.existsSync(uploadPacientesDir)) {
  fs.mkdirSync(uploadPacientesDir, { recursive: true });
}
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const profesionalesDir = path.join(__dirname, "..", "archivos_profesionales");
if (!fs.existsSync(profesionalesDir)) {
  fs.mkdirSync(profesionalesDir, { recursive: true });
}

// Montaje de rutas de la aplicación
app.use(routes);

// Manejador centralizado de errores
app.use(errorHandler);

module.exports = app;
