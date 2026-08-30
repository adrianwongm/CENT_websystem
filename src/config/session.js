const session = require("express-session");
require("dotenv").config();

const sessionConfig = session({
  secret: process.env.SESSION_SECRET || "clave_secreta",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 horas por defecto
  }
});

module.exports = sessionConfig;
