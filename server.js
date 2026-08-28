const multer = require("multer");
const XLSX = require("xlsx");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const nodemailer = require("nodemailer");

const express = require("express");
const path = require("path");
const session = require("express-session");
const sql = require("mssql/msnodesqlv8");
const bcrypt = require("bcrypt");
require("dotenv").config();

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const fs = require("fs");

const { jsPDF } = require("jspdf");
const { autoTable } = require("jspdf-autotable");

const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "clave_secreta",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

app.use(express.static(path.join(__dirname, "public")));

const uploadDir = path.join(__dirname, "uploads", "pacientes");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const dbConfig = {
  connectionString:
    "Driver={ODBC Driver 18 for SQL Server};" +
    "Server=localhost\\SQLEXPRESS;" +
    "Database=CENT;" +
    "Trusted_Connection=Yes;" +
    "TrustServerCertificate=Yes;" +
    "Encrypt=Yes;",
  driver: "msnodesqlv8",
  connectionTimeout: 5000,
  requestTimeout: 5000
};


const { PDFDocument, StandardFonts } = require("pdf-lib");

const RUTA_PROFESIONALES = path.join(
  __dirname,
  "archivos_profesionales"
);

if (!fs.existsSync(RUTA_PROFESIONALES)) {
  fs.mkdirSync(RUTA_PROFESIONALES, {
    recursive: true
  });
}

const almacenamientoProfesionales =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      try {
        const profesionalId = String(
          req.params.id || ""
        ).trim();

        if (
          !profesionalId ||
          !/^\d+$/.test(profesionalId)
        ) {
          return callback(
            new Error(
              "El identificador del profesional no es válido"
            )
          );
        }

        const carpetaProfesional = path.join(
          RUTA_PROFESIONALES,
          profesionalId
        );

        if (
          !fs.existsSync(carpetaProfesional)
        ) {
          fs.mkdirSync(
            carpetaProfesional,
            {
              recursive: true
            }
          );
        }

        callback(
          null,
          carpetaProfesional
        );
      } catch (error) {
        callback(error);
      }
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extensionOriginal =
        path.extname(
          file.originalname
        ).toLowerCase();

      let extensionFinal;

      if (
        file.mimetype === "image/png"
      ) {
        extensionFinal = ".png";
      } else if (
        file.mimetype === "image/jpeg"
      ) {
        extensionFinal = ".jpg";
      } else {
        extensionFinal =
          extensionOriginal;
      }

      const nombreArchivo =
        file.fieldname === "firma"
          ? `firma${extensionFinal}`
          : `sello${extensionFinal}`;

      callback(
        null,
        nombreArchivo
      );
    }
  });

  function filtroImagenProfesional(
  req,
  file,
  callback
) {
  const tiposPermitidos = [
    "image/png",
    "image/jpeg"
  ];

  if (
    !tiposPermitidos.includes(
      file.mimetype
    )
  ) {
    return callback(
      new Error(
        "Solo se permiten imágenes PNG o JPG"
      )
    );
  }

  callback(null, true);
}

const subirImagenesProfesional =
  multer({
    storage:
      almacenamientoProfesionales,

    fileFilter:
      filtroImagenProfesional,

    limits: {
      fileSize:
        5 * 1024 * 1024
    }
  });

  const cargarFirmaYSello =
  subirImagenesProfesional.fields([
    {
      name: "firma",
      maxCount: 1
    },
    {
      name: "sello",
      maxCount: 1
    }
  ]);

async function getPool() {
  return sql.connect(dbConfig);
}



function requireAuth(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
}

function limpiarNombreCarpeta(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase()
    .slice(0, 120);
}



const storagePacientes = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const pacienteId = Number(req.params.id);
      const pool = await getPool();

      const result = await pool.request()
        .input("id", sql.Int, pacienteId)
        .query(`
          SELECT TOP 1
            archivo,
            pac_apellido1,
            pac_apellido2,
            pac_nombre1,
            pac_nombre2
          FROM pacientes
          WHERE id = @id
        `);

      if (!result.recordset.length) {
        return cb(new Error("Paciente no encontrado"));
      }

      const p = result.recordset[0];

      req.numeroArchivoPaciente = p.archivo || pacienteId;

      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      const nombreCarpeta = limpiarNombreCarpeta(nombrePaciente || `PACIENTE_${pacienteId}`);
      const carpetaPaciente = path.join(uploadDir, nombreCarpeta);

      if (!fs.existsSync(carpetaPaciente)) {
        fs.mkdirSync(carpetaPaciente, { recursive: true });
      }

      req.carpetaPacienteRelativa = `/uploads/pacientes/${nombreCarpeta}`;
      req.carpetaPacienteFisica = carpetaPaciente;

      cb(null, carpetaPaciente);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80);

    const numeroArchivo = String(req.numeroArchivoPaciente || req.params.id)
    .replace(/[^\w-]+/g, "_");

    const nombre = `ARCHIVO_${numeroArchivo}_${Date.now()}_${base}${ext}`;
    cb(null, nombre);
  }
});

const fileFilterPacientes = (req, file, cb) => {
  const permitidos = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ];

  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido"));
  }
};

const uploadPacienteArchivo = multer({
  storage: storagePacientes,
  fileFilter: fileFilterPacientes,
  limits: { fileSize: 15 * 1024 * 1024 }
});

const subirArchivoDiagnosticosCIE = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const extensionesPermitidas = [
      ".xlsx",
      ".xls"
    ];

    if (!extensionesPermitidas.includes(extension)) {
      return callback(
        new Error(
          "Solo se permiten archivos Excel .xlsx o .xls"
        )
      );
    }

    callback(null, true);
  }
});

/*HELPER PARA ENVIAR CORREO */
async function enviarCorreo({ to, subject, text, html, attachments = [] }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Faltan variables MAIL_USER o MAIL_PASS en .env");
  }

  return await mailTransporter.sendMail({
    from: `"CENT Hemodinamia" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments
  });
}

/*PLANTILLA PARA ENVIAR CORREO CONSIGNACION */
function obtenerPlantillaReporteBase64() {
  const rutaPlantilla = path.join(__dirname, "public", "images", "plantilla_reporte.png");

  if (!fs.existsSync(rutaPlantilla)) {
    throw new Error("No se encontró la plantilla_reporte.png en public/images");
  }

  const fileBuffer = fs.readFileSync(rutaPlantilla);
  return fileBuffer.toString("base64");
}

/*FUNCION PARA FORMATEAR LA FECHA Y QUE SALGA LA FECHA CORRECTA */
function formatearFechaSQL(valor) {
  if (!valor) return "";

  if (typeof valor === "string") {
    return valor.slice(0, 10);
  }

  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }

  return String(valor).slice(0, 10);
}

/*HELPER PARA GENERAR PDF CONSIGNACIONES */
function generarPdfConsignacionBase64({ casaComercial, registros }) {
  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const plantillaBase64 = obtenerPlantillaReporteBase64();

  const drawBackground = () => {
    doc.addImage(plantillaBase64, "PNG", 0, 0, pageWidth, pageHeight);
  };

const filas = (registros || []).map(item => [
  item.fecha_procedimiento || "",
  item.nombre_paciente || "",
  item.codigo || "",
  item.codigo_proveedor || "",
  item.producto || "",
  String(item.cantidad || 0),
  item.lote || "",
  item.fecha_expiracion || ""
]);

  autoTable(doc, {
    startY: 210,
    head: [[
      "Fecha proc.",
      "Paciente",
      "Código",
      "Cód. proveedor",
      "Producto",
      "Cant.",
      "Lote",
      "F. Exp."
    ]],
    body: filas.length ? filas : [["", "", "", "", "No hay detalle", "", "", ""]],
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [150, 150, 150],
      lineWidth: 0.3,
      valign: "middle"
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: "bold"
    },
    margin: {
      top: 210,
      left: 28,
      right: 28,
      bottom: 60
    },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 95 },
      2: { cellWidth: 42 },
      3: { cellWidth: 58 },
      4: { cellWidth: 110 },
      5: { cellWidth: 30, halign: "center" },
      6: { cellWidth: 45 },
      7: { cellWidth: 45 }
    },
    willDrawPage: function () {
      drawBackground();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("REPORTE INSUMOS UTILIZADOS EN CONSIGNACIÓN", pageWidth / 2, 92, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Casa comercial: ${casaComercial || ""}`, 50, 135);
      doc.text(`Total de registros: ${(registros || []).length}`, 50, 153);

      if (registros && registros.length) {
        const fechas = registros
        .map(x => x.fecha_procedimiento || "")
        .filter(Boolean)
        .sort();

        const fechaMin = fechas.length ? fechas[fechas.length - 1] : "";
        const fechaMax = fechas.length ? fechas[0] : "";

        doc.text(`Rango de fechas: ${fechaMin}${fechaMin !== fechaMax ? " a " + fechaMax : ""}`, 50, 171);
      }
    }
  });

  return Buffer.from(doc.output("arraybuffer"));
}

function formatearFechaPDF(valor) {
  if (!valor) return "";

  const texto = String(valor).trim();

  const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (coincidencia) {
    return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
  }

  return texto;
}

function obtenerUsuarioSesionHC(req) {
  return {
    username: String(
      req.session?.username ||
      req.session?.usuario?.username ||
      ""
    ).trim(),

    nombreCompleto: String(
      req.session?.nombreCompleto ||
      req.session?.usuario?.nombreCompleto ||
      req.session?.username ||
      ""
    ).trim(),

    rol: String(
      req.session?.rol ||
      req.session?.usuario?.rol ||
      ""
    ).trim().toUpperCase()
  };
}

function limpiarNombreArchivoHC(valor) {
  return String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/*prueba para enviar correo */
app.get("/api/test-correo", requireAuth, async (req, res) => {
  try {
    await enviarCorreo({
      to: process.env.MAIL_USER,
      subject: "Prueba de correo CENT",
      text: "Este es un correo de prueba enviado desde el sistema."
    });

    res.json({ ok: true, mensaje: "Correo enviado correctamente" });
  } catch (error) {
    console.error("ERROR TEST CORREO:", error);
    res.status(500).json({ error: error.message || "Error enviando correo" });
  }
});


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/panel", (req, res) => {
  if (!req.session.usuario) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "public", "panel.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/*app.get("/api/usuario", requireAuth, (req, res) => {
  res.json(req.session.usuario);
});*/

app.get(
  "/api/usuario",
  requireAuth,
  (req, res) => {
    const usuario =
      obtenerUsuarioSesionHC(req);

    return res.json({
      username:
        usuario.username,

      nombreCompleto:
        usuario.nombreCompleto,

      rol:
        usuario.rol
    });
  }
);

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const pool = await getPool();

    const result = await pool.request()
      .input("username", sql.VarChar, username)
      .query(`
        SELECT 
          id,
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          username,
          password,
          rol,
          estado
        FROM usuarios
        WHERE username = @username
      `);

    if (!result.recordset.length) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario o contraseña incorrectos"
      });
    }

    const usuario = result.recordset[0];

    if (usuario.estado !== "ACTIVO") {
      return res.status(403).json({
        ok: false,
        mensaje: "Usuario inactivo"
      });
    }

    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario o contraseña incorrectos"
      });
    }

    req.session.usuario = {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      nombreCompleto: [
        usuario.apellido1,
        usuario.apellido2,
        usuario.nombre1,
        usuario.nombre2
      ].filter(Boolean).join(" ")
    };

    res.json({
      ok: true,
      mensaje: "Login correcto"
    });
  } catch (error) {
    console.error("ERROR LOGIN:", error);
    res.status(500).json({
      ok: false,
      mensaje: "Error del servidor"
    });
  }
});

app.get("/test-db", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        @@SERVERNAME AS servidor,
        DB_NAME() AS base_actual
    `);

    res.json({
      ok: true,
      data: result.recordset
    });
  } catch (error) {
    console.error("ERROR TEST-DB:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================
   USUARIOS
========================= */

app.get("/api/usuarios", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        id,
        apellido1,
        apellido2,
        nombre1,
        nombre2,
        username,
        rol,
        estado,
        fecha_creacion
      FROM usuarios
      ORDER BY id DESC
    `);

    res.json(result.recordset);

  } catch (error) {
    console.error("ERROR LISTAR USUARIOS:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});


app.post("/api/usuarios", async (req, res) => {

  try {

    const {
      apellido1,
      apellido2,
      nombre1,
      nombre2,
      username,
      password,
      rol
    } = req.body;

    if (!apellido1 || !nombre1 || !username || !password) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const hash = await bcrypt.hash(password, 10);

    const pool = await getPool();

    await pool.request()
      .input("apellido1", sql.VarChar, apellido1)
      .input("apellido2", sql.VarChar, apellido2)
      .input("nombre1", sql.VarChar, nombre1)
      .input("nombre2", sql.VarChar, nombre2)
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, hash)
      .input("rol", sql.VarChar, rol || "USUARIO")
      .query(`
        INSERT INTO usuarios (
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          username,
          password,
          rol
        )
        VALUES (
          @apellido1,
          @apellido2,
          @nombre1,
          @nombre2,
          @username,
          @password,
          @rol
        )
      `);

    res.json({ ok: true });

  } catch (error) {

    console.error("ERROR CREAR USUARIO:", error);

    if (error.number === 2627) {
      return res.status(400).json({
        error: "El usuario ya existe"
      });
    }

    res.status(500).json({ error: "Error al crear usuario" });

  }

});


app.patch("/api/usuarios/estado/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE usuarios
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });

  } catch (error) {

    console.error("ERROR CAMBIAR ESTADO:", error);

    res.status(500).json({ error: "Error al cambiar estado" });

  }

});

/* =========================
   USUARIOS
========================= */

/*app.get("/api/usuarios", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        id,
        apellido1,
        apellido2,
        nombre1,
        nombre2,
        username,
        rol,
        estado,
        fecha_creacion
      FROM usuarios
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR USUARIOS:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});*/

app.post("/api/usuarios", requireAuth, async (req, res) => {
  try {
    const {
      apellido1,
      apellido2,
      nombre1,
      nombre2,
      username,
      password,
      rol,
      estado
    } = req.body;

    if (!apellido1 || !nombre1 || !username || !password || !rol || !estado) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const hash = await bcrypt.hash(password, 10);
    const pool = await getPool();

    await pool.request()
      .input("apellido1", sql.VarChar, apellido1)
      .input("apellido2", sql.VarChar, apellido2 || null)
      .input("nombre1", sql.VarChar, nombre1)
      .input("nombre2", sql.VarChar, nombre2 || null)
      .input("username", sql.VarChar, username)
      .input("password", sql.VarChar, hash)
      .input("rol", sql.VarChar, rol)
      .input("estado", sql.VarChar, estado)
      .query(`
        INSERT INTO usuarios (
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          username,
          password,
          rol,
          estado
        )
        VALUES (
          @apellido1,
          @apellido2,
          @nombre1,
          @nombre2,
          @username,
          @password,
          @rol,
          @estado
        )
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CREAR USUARIO:", error);

    if (error.number === 2627) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    res.status(500).json({ error: error.message || "Error al crear usuario" });
  }
});

app.patch("/api/usuarios/estado/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE usuarios
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CAMBIAR ESTADO:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});

app.put("/api/usuarios/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      apellido1,
      apellido2,
      nombre1,
      nombre2,
      username,
      rol,
      estado
    } = req.body;

    if (!apellido1 || !nombre1 || !username || !rol || !estado) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .input("apellido1", sql.VarChar, apellido1)
      .input("apellido2", sql.VarChar, apellido2 || null)
      .input("nombre1", sql.VarChar, nombre1)
      .input("nombre2", sql.VarChar, nombre2 || null)
      .input("username", sql.VarChar, username)
      .input("rol", sql.VarChar, rol)
      .input("estado", sql.VarChar, estado)
      .input("actualizado_por", sql.VarChar, req.session.usuario.username)
      .query(`
        UPDATE usuarios
        SET
          apellido1 = @apellido1,
          apellido2 = @apellido2,
          nombre1 = @nombre1,
          nombre2 = @nombre2,
          username = @username,
          rol = @rol,
          estado = @estado,
          actualizado_por = @actualizado_por,
          fecha_actualizacion = GETDATE()
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR EDITAR USUARIO:", error);
    res.status(500).json({ error: "Error al editar usuario" });
  }
});

app.patch("/api/usuarios/password/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaPassword } = req.body;

    if (!nuevaPassword) {
      return res.status(400).json({ error: "Nueva contraseña requerida" });
    }

    const hash = await bcrypt.hash(nuevaPassword, 10);
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .input("password", sql.VarChar, hash)
      .input("actualizado_por", sql.VarChar, req.session.usuario.username)
      .query(`
        UPDATE usuarios
        SET
          password = @password,
          actualizado_por = @actualizado_por,
          fecha_actualizacion = GETDATE()
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CAMBIAR PASSWORD:", error);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

/* =========================
   CONFIGURACION # ARCHIVO
========================= */

app.get("/api/config/archivo", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP 1 id, numero_actual
      FROM configuracion_archivo
      ORDER BY id DESC
    `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "No existe configuración de archivo" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("ERROR OBTENER CONFIG ARCHIVO:", error);
    res.status(500).json({ error: "Error al obtener configuración" });
  }
});

app.put("/api/config/archivo", requireAuth, async (req, res) => {
  try {
    const { numero_actual } = req.body;

    if (!numero_actual || Number(numero_actual) <= 0) {
      return res.status(400).json({ error: "Número no válido" });
    }

    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP 1 id
      FROM configuracion_archivo
      ORDER BY id DESC
    `);

    if (!result.recordset.length) {
      await pool.request()
        .input("numero_actual", sql.Int, Number(numero_actual))
        .query(`
          INSERT INTO configuracion_archivo (numero_actual)
          VALUES (@numero_actual)
        `);
    } else {
      const id = result.recordset[0].id;

      await pool.request()
        .input("id", sql.Int, id)
        .input("numero_actual", sql.Int, Number(numero_actual))
        .query(`
          UPDATE configuracion_archivo
          SET numero_actual = @numero_actual
          WHERE id = @id
        `);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR ACTUALIZAR CONFIG ARCHIVO:", error);
    res.status(500).json({ error: "Error al actualizar configuración" });
  }
});

/* =========================
   RECLUTADORES
========================= */

app.get("/api/reclutadores", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        id,
        apellido1,
        apellido2,
        nombre1,
        nombre2,
        cedula,
        estado,
        fecha_creacion
      FROM reclutadores
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR RECLUTADORES:", error);
    res.status(500).json({ error: "Error al obtener reclutadores" });
  }
});

app.post("/api/reclutadores", requireAuth, async (req, res) => {
  try {
    const {
      primerApellido,
      segundoApellido,
      primerNombre,
      segundoNombre,
      cedula
    } = req.body;

    if (!primerApellido || !segundoApellido || !primerNombre || !segundoNombre || !cedula) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const pool = await getPool();

    await pool.request()
      .input("apellido1", sql.VarChar, primerApellido)
      .input("apellido2", sql.VarChar, segundoApellido)
      .input("nombre1", sql.VarChar, primerNombre)
      .input("nombre2", sql.VarChar, segundoNombre)
      .input("cedula", sql.VarChar, cedula)
      .query(`
        INSERT INTO reclutadores (
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          cedula
        )
        VALUES (
          @apellido1,
          @apellido2,
          @nombre1,
          @nombre2,
          @cedula
        )
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CREAR RECLUTADOR:", error);

    if (error.number === 2627) {
      return res.status(400).json({ error: "La cédula ya existe" });
    }

    res.status(500).json({ error: "Error al crear reclutador" });
  }
});

app.patch("/api/reclutadores/estado/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE reclutadores
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CAMBIAR ESTADO RECLUTADOR:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});

app.get("/api/pacientes", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        p.*,
        r.apellido1 AS rec_apellido1,
        r.apellido2 AS rec_apellido2,
        r.nombre1 AS rec_nombre1,
        r.nombre2 AS rec_nombre2
      FROM pacientes p
      LEFT JOIN reclutadores r ON p.reclutador_id = r.id
      ORDER BY p.id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR PACIENTES:", error);
    res.status(500).json({ error: "Error al obtener pacientes" });
  }
});

app.post("/api/pacientes", requireAuth, async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const r1 = await new sql.Request(transaction).query(`
      SELECT TOP 1 id, numero_actual
      FROM configuracion_archivo
      ORDER BY id DESC
    `);

    const cfg = r1.recordset[0];
    const archivo = cfg.numero_actual;

    const {
      cedulaPaciente, estadoCivil, sexo, telefonoFijo, telefonoCelular, correo,
      pacApellido1, pacApellido2, pacNombre1, pacNombre2,
      famApellido1, famApellido2, famNombre1, famNombre2,
      cedulaFamiliar, fechaNacimiento, edad, lugarNacimiento, fechaProcedimiento,
      reclutadorId, provincia, canton, parroquia, barrio, callePrincipal,
      calleSecundaria, referencia, ocupacion, parentescoFamiliar,
      direccionFamiliar, telefonoFamiliar, tipoSeguro, tipoAfiliado
    } = req.body;

    await new sql.Request(transaction)
      .input("archivo", sql.Int, archivo)
      .input("cedulaPaciente", sql.VarChar, cedulaPaciente)
      .input("estadoCivil", sql.VarChar, estadoCivil)
      .input("sexo", sql.VarChar, sexo)
      .input("telefonoFijo", sql.VarChar, telefonoFijo)
      .input("telefonoCelular", sql.VarChar, telefonoCelular)
      .input("correo", sql.VarChar, correo)
      .input("pacApellido1", sql.VarChar, pacApellido1)
      .input("pacApellido2", sql.VarChar, pacApellido2)
      .input("pacNombre1", sql.VarChar, pacNombre1)
      .input("pacNombre2", sql.VarChar, pacNombre2)
      .input("famApellido1", sql.VarChar, famApellido1)
      .input("famApellido2", sql.VarChar, famApellido2)
      .input("famNombre1", sql.VarChar, famNombre1)
      .input("famNombre2", sql.VarChar, famNombre2)
      .input("cedulaFamiliar", sql.VarChar, cedulaFamiliar)
      .input("fechaNacimiento", sql.Date, fechaNacimiento)
      .input("edad", sql.Int, edad)
      .input("lugarNacimiento", sql.VarChar, lugarNacimiento)
      .input("fechaProcedimiento", sql.Date, fechaProcedimiento)
      .input("reclutadorId", sql.Int, reclutadorId || null)
      .input("provincia", sql.VarChar, provincia)
      .input("canton", sql.VarChar, canton)
      .input("parroquia", sql.VarChar, parroquia)
      .input("barrio", sql.VarChar, barrio)
      .input("callePrincipal", sql.VarChar, callePrincipal)
      .input("calleSecundaria", sql.VarChar, calleSecundaria)
      .input("referencia", sql.VarChar, referencia)
      .input("ocupacion", sql.VarChar, ocupacion)
      .input("parentescoFamiliar", sql.VarChar, parentescoFamiliar)
      .input("direccionFamiliar", sql.VarChar, direccionFamiliar)
      .input("telefonoFamiliar", sql.VarChar, telefonoFamiliar)
      .input("tipoSeguro", sql.VarChar, tipoSeguro)
      .input("tipoAfiliado", sql.VarChar, tipoAfiliado)
      .query(`
        INSERT INTO pacientes (
          archivo, cedula_paciente, estado_civil, sexo, telefono_fijo, telefono_celular, correo,
          pac_apellido1, pac_apellido2, pac_nombre1, pac_nombre2,
          fam_apellido1, fam_apellido2, fam_nombre1, fam_nombre2,
          cedula_familiar, fecha_nacimiento, edad, lugar_nacimiento, fecha_procedimiento,
          reclutador_id, provincia, canton, parroquia, barrio,
          calle_principal, calle_secundaria, referencia, ocupacion,
          parentesco_familiar, direccion_familiar, telefono_familiar, tipo_seguro, tipo_afiliado
        )
        VALUES (
          @archivo, @cedulaPaciente, @estadoCivil, @sexo, @telefonoFijo, @telefonoCelular, @correo,
          @pacApellido1, @pacApellido2, @pacNombre1, @pacNombre2,
          @famApellido1, @famApellido2, @famNombre1, @famNombre2,
          @cedulaFamiliar, @fechaNacimiento, @edad, @lugarNacimiento, @fechaProcedimiento,
          @reclutadorId, @provincia, @canton, @parroquia, @barrio,
          @callePrincipal, @calleSecundaria, @referencia, @ocupacion,
          @parentescoFamiliar, @direccionFamiliar, @telefonoFamiliar, @tipoSeguro, @tipoAfiliado
        )
      `);

    await new sql.Request(transaction)
      .input("nuevoNumero", sql.Int, archivo + 1)
      .input("id", sql.Int, cfg.id)
      .query(`
        UPDATE configuracion_archivo
        SET numero_actual = @nuevoNumero
        WHERE id = @id
      `);

    await transaction.commit();

    res.json({ ok: true, archivo });
  } catch (error) {
    await transaction.rollback();
    console.error("ERROR CREAR PACIENTE:", error);
    res.status(500).json({ error: "Error al guardar paciente" });
  }
});

app.get("/api/pacientes/activos", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        p.*,
        r.apellido1 AS rec_apellido1,
        r.apellido2 AS rec_apellido2,
        r.nombre1 AS rec_nombre1,
        r.nombre2 AS rec_nombre2,

        pc.dispensario,
        pc.organizacion,
        pc.cvv,
        pc.t_procedimiento,
        pc.stent_utilizado,
        pc.mes,
        pc.anio,
        pc.cirujano,
        pc.anestesiologo,
        pc.radiologo,
        pc.habitacion,
        pc.alta,
        pc.uso_sala,
        pc.laboratorios,
        pc.hospitalizacion,
        pc.alimentacion,
        pc.cuidados

      FROM pacientes p
      LEFT JOIN reclutadores r ON p.reclutador_id = r.id
      LEFT JOIN pacientes_complementarios pc ON p.id = pc.paciente_id
      WHERE p.estado_atencion = 'ACTIVO'
      ORDER BY p.id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR PACIENTES ACTIVOS:", error);
    res.status(500).json({ error: "Error al obtener pacientes activos" });
  }
});

app.get("/api/pacientes/no-atendidos", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        p.*,
        r.apellido1 AS rec_apellido1,
        r.apellido2 AS rec_apellido2,
        r.nombre1 AS rec_nombre1,
        r.nombre2 AS rec_nombre2,

        pc.dispensario,
        pc.organizacion,
        pc.cvv,
        pc.t_procedimiento,
        pc.stent_utilizado,
        pc.mes,
        pc.anio,
        pc.cirujano,
        pc.anestesiologo,
        pc.radiologo,
        pc.habitacion,
        pc.alta,
        pc.uso_sala,
        pc.laboratorios,
        pc.hospitalizacion,
        pc.alimentacion,
        pc.cuidados

      FROM pacientes p
      LEFT JOIN reclutadores r ON p.reclutador_id = r.id
      LEFT JOIN pacientes_complementarios pc ON p.id = pc.paciente_id
      WHERE p.estado_atencion = 'NO_ATENDIDO'
      ORDER BY p.id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR PACIENTES NO ATENDIDOS:", error);
    res.status(500).json({ error: "Error al obtener pacientes no atendidos" });
  }
});

app.patch("/api/pacientes/no-atendido/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .input("motivo", sql.VarChar, motivo || null)
      .query(`
        UPDATE pacientes
        SET
          estado_atencion = 'NO_ATENDIDO',
          motivo_no_atendido = @motivo
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR MOVER A NO ATENDIDO:", error);
    res.status(500).json({ error: "Error al mover paciente" });
  }
});

app.patch("/api/pacientes/reactivar/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE pacientes
        SET
          estado_atencion = 'ACTIVO',
          motivo_no_atendido = NULL
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR REACTIVAR PACIENTE:", error);
    res.status(500).json({ error: "Error al reactivar paciente" });
  }
});

app.get("/api/pacientes/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT TOP 1
          p.*,
          r.apellido1 AS rec_apellido1,
          r.apellido2 AS rec_apellido2,
          r.nombre1 AS rec_nombre1,
          r.nombre2 AS rec_nombre2,

          pc.dispensario,
          pc.organizacion,
          pc.cvv,
          pc.t_procedimiento,
          pc.stent_utilizado,
          pc.mes,
          pc.anio,
          pc.cirujano,
          pc.anestesiologo,
          pc.radiologo,
          pc.habitacion,
          pc.alta,
          pc.uso_sala,
          pc.laboratorios,
          pc.hospitalizacion,
          pc.alimentacion,
          pc.cuidados

        FROM pacientes p
        LEFT JOIN reclutadores r ON p.reclutador_id = r.id
        LEFT JOIN pacientes_complementarios pc ON p.id = pc.paciente_id
        WHERE p.id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("ERROR OBTENER PACIENTE:", error);
    res.status(500).json({ error: "Error al obtener paciente" });
  }
});

app.post("/api/pacientes/complementarios/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      dispensario,
      organizacion,
      cvv,
      tProcedimiento,
      stentUtilizado,
      mes,
      anio,
      cirujano,
      anestesiologo,
      radiologo,
      habitacion,
      alta,
      usoSala,
      laboratorios,
      hospitalizacion,
      alimentacion,
      cuidados
    } = req.body;

    const pool = await getPool();

    const existe = await pool.request()
      .input("paciente_id", sql.Int, id)
      .query(`
        SELECT id
        FROM pacientes_complementarios
        WHERE paciente_id = @paciente_id
      `);

    if (existe.recordset.length) {
      await pool.request()
        .input("paciente_id", sql.Int, id)
        .input("dispensario", sql.VarChar, dispensario || null)
        .input("organizacion", sql.VarChar, organizacion || null)
        .input("cvv", sql.VarChar, cvv || null)
        .input("t_procedimiento", sql.VarChar, tProcedimiento || null)
        .input("stent_utilizado", sql.VarChar, stentUtilizado || null)
        .input("mes", sql.VarChar, mes || null)
        .input("anio", sql.Int, anio || null)
        .input("cirujano", sql.VarChar, cirujano || null)
        .input("anestesiologo", sql.VarChar, anestesiologo || null)
        .input("radiologo", sql.VarChar, radiologo || null)
        .input("habitacion", sql.VarChar, habitacion || null)
        .input("alta", sql.Date, alta || null)
        .input("uso_sala", sql.Bit, usoSala ? 1 : 0)
        .input("laboratorios", sql.Bit, laboratorios ? 1 : 0)
        .input("hospitalizacion", sql.Bit, hospitalizacion ? 1 : 0)
        .input("alimentacion", sql.Bit, alimentacion ? 1 : 0)
        .input("cuidados", sql.Bit, cuidados ? 1 : 0)
        .query(`
          UPDATE pacientes_complementarios
          SET
            dispensario = @dispensario,
            organizacion = @organizacion,
            cvv = @cvv,
            t_procedimiento = @t_procedimiento,
            stent_utilizado = @stent_utilizado,
            mes = @mes,
            anio = @anio,
            cirujano = @cirujano,
            anestesiologo = @anestesiologo,
            radiologo = @radiologo,
            habitacion = @habitacion,
            alta = @alta,
            uso_sala = @uso_sala,
            laboratorios = @laboratorios,
            hospitalizacion = @hospitalizacion,
            alimentacion = @alimentacion,
            cuidados = @cuidados,
            fecha_actualizacion = GETDATE()
          WHERE paciente_id = @paciente_id
        `);
    } else {
      await pool.request()
        .input("paciente_id", sql.Int, id)
        .input("dispensario", sql.VarChar, dispensario || null)
        .input("organizacion", sql.VarChar, organizacion || null)
        .input("cvv", sql.VarChar, cvv || null)
        .input("t_procedimiento", sql.VarChar, tProcedimiento || null)
        .input("stent_utilizado", sql.VarChar, stentUtilizado || null)
        .input("mes", sql.VarChar, mes || null)
        .input("anio", sql.Int, anio || null)
        .input("cirujano", sql.VarChar, cirujano || null)
        .input("anestesiologo", sql.VarChar, anestesiologo || null)
        .input("radiologo", sql.VarChar, radiologo || null)
        .input("habitacion", sql.VarChar, habitacion || null)
        .input("alta", sql.Date, alta || null)
        .input("uso_sala", sql.Bit, usoSala ? 1 : 0)
        .input("laboratorios", sql.Bit, laboratorios ? 1 : 0)
        .input("hospitalizacion", sql.Bit, hospitalizacion ? 1 : 0)
        .input("alimentacion", sql.Bit, alimentacion ? 1 : 0)
        .input("cuidados", sql.Bit, cuidados ? 1 : 0)
        .query(`
          INSERT INTO pacientes_complementarios (
            paciente_id,
            dispensario,
            organizacion,
            cvv,
            t_procedimiento,
            stent_utilizado,
            mes,
            anio,
            cirujano,
            anestesiologo,
            radiologo,
            habitacion,
            alta,
            uso_sala,
            laboratorios,
            hospitalizacion,
            alimentacion,
            cuidados
          )
          VALUES (
            @paciente_id,
            @dispensario,
            @organizacion,
            @cvv,
            @t_procedimiento,
            @stent_utilizado,
            @mes,
            @anio,
            @cirujano,
            @anestesiologo,
            @radiologo,
            @habitacion,
            @alta,
            @uso_sala,
            @laboratorios,
            @hospitalizacion,
            @alimentacion,
            @cuidados
          )
        `);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR GUARDAR COMPLEMENTARIOS:", error);
    res.status(500).json({ error: "Error al guardar datos complementarios" });
  }
});

app.get("/api/pacientes/complementarios/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input("paciente_id", sql.Int, id)
      .query(`
        SELECT *
        FROM pacientes_complementarios
        WHERE paciente_id = @paciente_id
      `);

    res.json(result.recordset[0] || {});
  } catch (error) {
    console.error("ERROR OBTENER COMPLEMENTARIOS:", error);
    res.status(500).json({ error: "Error al obtener datos complementarios" });
  }
});

app.post("/api/import/pacientes", requireAuth, upload.single("file"), async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "No se recibió ningún archivo"
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true
    });

    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    if (!filas.length) {
      return res.status(400).json({
        ok: false,
        error: "El archivo está vacío"
      });
    }

    await transaction.begin();

    const cfgResult = await new sql.Request(transaction).query(`
      SELECT TOP 1 id, numero_actual
      FROM configuracion_archivo
      ORDER BY id DESC
    `);

    if (!cfgResult.recordset.length) {
      throw new Error("No existe configuración de archivo");
    }

    const cfg = cfgResult.recordset[0];
    let numeroArchivoActual = Number(cfg.numero_actual);

    const errores = [];
    let insertados = 0;

    for (let i = 0; i < filas.length; i++) {
      const filaExcel = i + 2;
      const row = filas[i];

      const cedulaPaciente = String(row.cedulaPaciente || "").trim();
      const estadoCivil = String(row.estadoCivil || "").trim();
      const sexo = String(row.sexo || "").trim();
      const telefonoFijo = String(row.telefonoFijo || "").trim();
      const telefonoCelular = String(row.telefonoCelular || "").trim();
      const correo = String(row.correo || "").trim();

      const pacApellido1 = String(row.pacApellido1 || "").trim().toUpperCase();
      const pacApellido2 = String(row.pacApellido2 || "").trim().toUpperCase();
      const pacNombre1 = String(row.pacNombre1 || "").trim().toUpperCase();
      const pacNombre2 = String(row.pacNombre2 || "").trim().toUpperCase();

      const famApellido1 = String(row.famApellido1 || "").trim().toUpperCase();
      const famApellido2 = String(row.famApellido2 || "").trim().toUpperCase();
      const famNombre1 = String(row.famNombre1 || "").trim().toUpperCase();
      const famNombre2 = String(row.famNombre2 || "").trim().toUpperCase();

      const cedulaFamiliar = String(row.cedulaFamiliar || "").trim();
      const fechaNacimiento = row.fechaNacimiento || null;
      const edad = row.edad !== "" ? Number(row.edad) : null;
      const lugarNacimiento = String(row.lugarNacimiento || "").trim().toUpperCase();
      const fechaProcedimiento = row.fechaProcedimiento || null;

      const reclutadorId = row.reclutadorId !== "" ? Number(row.reclutadorId) : null;
      const provincia = String(row.provincia || "").trim().toUpperCase();
      const canton = String(row.canton || "").trim().toUpperCase();
      const parroquia = String(row.parroquia || "").trim().toUpperCase();
      const barrio = String(row.barrio || "").trim().toUpperCase();
      const callePrincipal = String(row.callePrincipal || "").trim().toUpperCase();
      const calleSecundaria = String(row.calleSecundaria || "").trim().toUpperCase();
      const referencia = String(row.referencia || "").trim();
      const ocupacion = String(row.ocupacion || "").trim().toUpperCase();
      const parentescoFamiliar = String(row.parentescoFamiliar || "").trim().toUpperCase();
      const direccionFamiliar = String(row.direccionFamiliar || "").trim();
      const telefonoFamiliar = String(row.telefonoFamiliar || "").trim();
      const tipoSeguro = String(row.tipoSeguro || "").trim().toUpperCase();
      const tipoAfiliado = String(row.tipoAfiliado || "").trim().toUpperCase();

      if (!cedulaPaciente) {
        errores.push({ fila: filaExcel, error: "La cédula del paciente está vacía" });
        continue;
      }

      if (!/^\d{10}$/.test(cedulaPaciente)) {
        errores.push({ fila: filaExcel, error: "La cédula del paciente debe tener 10 dígitos" });
        continue;
      }

      if (!pacApellido1) {
        errores.push({ fila: filaExcel, error: "El primer apellido del paciente está vacío" });
        continue;
      }

      if (!pacNombre1) {
        errores.push({ fila: filaExcel, error: "El primer nombre del paciente está vacío" });
        continue;
      }

      if (cedulaFamiliar && !/^\d{10}$/.test(cedulaFamiliar)) {
        errores.push({ fila: filaExcel, error: "La cédula del familiar debe tener 10 dígitos" });
        continue;
      }

      if (edad !== null && (Number.isNaN(edad) || edad < 0)) {
        errores.push({ fila: filaExcel, error: "La edad no es válida" });
        continue;
      }

      const existePaciente = await new sql.Request(transaction)
        .input("cedula_paciente", sql.VarChar, cedulaPaciente)
        .query(`
          SELECT TOP 1 id
          FROM pacientes
          WHERE cedula_paciente = @cedula_paciente
        `);

      if (existePaciente.recordset.length) {
        errores.push({
          fila: filaExcel,
          error: `Ya existe un paciente con la cédula ${cedulaPaciente}`
        });
        continue;
      }

      if (reclutadorId !== null) {
        const existeReclutador = await new sql.Request(transaction)
          .input("id", sql.Int, reclutadorId)
          .query(`
            SELECT TOP 1 id
            FROM reclutadores
            WHERE id = @id
          `);

        if (!existeReclutador.recordset.length) {
          errores.push({
            fila: filaExcel,
            error: `El reclutadorId ${reclutadorId} no existe`
          });
          continue;
        }
      }

      await new sql.Request(transaction)
        .input("archivo", sql.Int, numeroArchivoActual)
        .input("cedulaPaciente", sql.VarChar, cedulaPaciente)
        .input("estadoCivil", sql.VarChar, estadoCivil || null)
        .input("sexo", sql.VarChar, sexo || null)
        .input("telefonoFijo", sql.VarChar, telefonoFijo || null)
        .input("telefonoCelular", sql.VarChar, telefonoCelular || null)
        .input("correo", sql.VarChar, correo || null)
        .input("pacApellido1", sql.VarChar, pacApellido1)
        .input("pacApellido2", sql.VarChar, pacApellido2 || null)
        .input("pacNombre1", sql.VarChar, pacNombre1)
        .input("pacNombre2", sql.VarChar, pacNombre2 || null)
        .input("famApellido1", sql.VarChar, famApellido1 || null)
        .input("famApellido2", sql.VarChar, famApellido2 || null)
        .input("famNombre1", sql.VarChar, famNombre1 || null)
        .input("famNombre2", sql.VarChar, famNombre2 || null)
        .input("cedulaFamiliar", sql.VarChar, cedulaFamiliar || null)
        .input("fechaNacimiento", sql.Date, fechaNacimiento || null)
        .input("edad", sql.Int, edad)
        .input("lugarNacimiento", sql.VarChar, lugarNacimiento || null)
        .input("fechaProcedimiento", sql.Date, fechaProcedimiento || null)
        .input("reclutadorId", sql.Int, reclutadorId)
        .input("provincia", sql.VarChar, provincia || null)
        .input("canton", sql.VarChar, canton || null)
        .input("parroquia", sql.VarChar, parroquia || null)
        .input("barrio", sql.VarChar, barrio || null)
        .input("callePrincipal", sql.VarChar, callePrincipal || null)
        .input("calleSecundaria", sql.VarChar, calleSecundaria || null)
        .input("referencia", sql.VarChar, referencia || null)
        .input("ocupacion", sql.VarChar, ocupacion || null)
        .input("parentescoFamiliar", sql.VarChar, parentescoFamiliar || null)
        .input("direccionFamiliar", sql.VarChar, direccionFamiliar || null)
        .input("telefonoFamiliar", sql.VarChar, telefonoFamiliar || null)
        .input("tipoSeguro", sql.VarChar, tipoSeguro || null)
        .input("tipoAfiliado", sql.VarChar, tipoAfiliado || null)
        .query(`
          INSERT INTO pacientes (
            archivo, cedula_paciente, estado_civil, sexo, telefono_fijo, telefono_celular, correo,
            pac_apellido1, pac_apellido2, pac_nombre1, pac_nombre2,
            fam_apellido1, fam_apellido2, fam_nombre1, fam_nombre2,
            cedula_familiar, fecha_nacimiento, edad, lugar_nacimiento, fecha_procedimiento,
            reclutador_id, provincia, canton, parroquia, barrio,
            calle_principal, calle_secundaria, referencia, ocupacion,
            parentesco_familiar, direccion_familiar, telefono_familiar, tipo_seguro, tipo_afiliado
          )
          VALUES (
            @archivo, @cedulaPaciente, @estadoCivil, @sexo, @telefonoFijo, @telefonoCelular, @correo,
            @pacApellido1, @pacApellido2, @pacNombre1, @pacNombre2,
            @famApellido1, @famApellido2, @famNombre1, @famNombre2,
            @cedulaFamiliar, @fechaNacimiento, @edad, @lugarNacimiento, @fechaProcedimiento,
            @reclutadorId, @provincia, @canton, @parroquia, @barrio,
            @callePrincipal, @calleSecundaria, @referencia, @ocupacion,
            @parentescoFamiliar, @direccionFamiliar, @telefonoFamiliar, @tipoSeguro, @tipoAfiliado
          )
        `);

      numeroArchivoActual++;
      insertados++;
    }

    await new sql.Request(transaction)
      .input("id", sql.Int, cfg.id)
      .input("numero_actual", sql.Int, numeroArchivoActual)
      .query(`
        UPDATE configuracion_archivo
        SET numero_actual = @numero_actual
        WHERE id = @id
      `);

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: "Importación finalizada",
      insertados,
      errores,
      nuevoNumeroArchivo: numeroArchivoActual
    });

  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    console.error("ERROR IMPORTAR PACIENTES:", error);

    res.status(500).json({
      ok: false,
      error: error.message || "Error al importar pacientes"
    });
  }
});


app.get("/api/config/desplegables", requireAuth, async (req, res) => {
  try {
    const { tipo } = req.query;
    const pool = await getPool();

    let query = `
      SELECT id, tipo, valor, estado, fecha_creacion
      FROM config_desplegables
    `;
    const request = pool.request();

    if (tipo) {
      query += ` WHERE tipo = @tipo `;
      request.input("tipo", sql.VarChar, tipo);
    }

    query += ` ORDER BY id DESC `;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR DESPLEGABLES:", error);
    res.status(500).json({ error: "Error al obtener desplegables" });
  }
});

app.post("/api/config/desplegables", requireAuth, async (req, res) => {
  try {
    const { tipo, valor } = req.body;

    if (!tipo || !valor) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const pool = await getPool();

    await pool.request()
      .input("tipo", sql.VarChar, tipo)
      .input("valor", sql.VarChar, valor)
      .query(`
        INSERT INTO config_desplegables (tipo, valor)
        VALUES (@tipo, @valor)
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CREAR DESPLEGABLE:", error);
    res.status(500).json({ error: "Error al crear desplegable" });
  }
});

app.patch("/api/config/desplegables/estado/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE config_desplegables
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR ESTADO DESPLEGABLE:", error);
    res.status(500).json({ error: "Error al cambiar estado del desplegable" });
  }
});

app.get("/api/config/expiracion",

  requireAuth,

  requireAnyPermission([
    "configuraciones.lapso_expiracion",
    "utilidades.control_expiracion",
    "utilidades.cuarentena_ver"
  ]),

  async (req, res) => {
    try {

      const pool =
        await getPool();

      const result =
        await pool
          .request()
          .query(`
            SELECT TOP 1
              id,
              meses_aviso,
              dias_critico,
              fecha_actualizacion,
              actualizado_por
            FROM dbo.configuracion_expiracion
            ORDER BY id ASC
          `);

      if (
        !result.recordset ||
        result.recordset.length === 0
      ) {

        return res.json({
          meses_aviso: 3,
          dias_critico: 30
        });

      }

      res.json(
        result.recordset[0]
      );

    } catch (error) {

      console.error(
        "ERROR GET CONFIG EXPIRACION:",
        error
      );

      res.status(500).json({
        error:
          "No se pudo cargar la configuración de expiración."
      });

    }
  }
);

app.put("/api/config/expiracion",

  requireAuth,

  requirePermission(
    "configuraciones.lapso_expiracion"
  ),

  async (req, res) => {
    try {

      const mesesAviso =
        Number(
          req.body.meses_aviso
        );

      const diasCritico =
        Number(
          req.body.dias_critico
        );

      if (
        !Number.isInteger(
          mesesAviso
        ) ||
        mesesAviso < 1 ||
        mesesAviso > 24
      ) {

        return res.status(400).json({
          error:
            "El lapso de aviso debe estar entre 1 y 24 meses."
        });

      }

      if (
        !Number.isInteger(
          diasCritico
        ) ||
        diasCritico < 1 ||
        diasCritico > 365
      ) {

        return res.status(400).json({
          error:
            "Los días críticos deben estar entre 1 y 365."
        });

      }

      const usuario =
        obtenerUsuarioSesionHC(req);

      const usuarioId =
        Number(
          usuario?.id ||
          req.session?.usuarioId ||
          req.session?.userId ||
          0
        ) || null;

      const pool =
        await getPool();

      const existe =
        await pool
          .request()
          .query(`
            SELECT TOP 1 id
            FROM dbo.configuracion_expiracion
            ORDER BY id ASC
          `);

      if (
        existe.recordset.length
      ) {

        const id =
          existe.recordset[0].id;

        await pool
          .request()
          .input(
            "id",
            sql.Int,
            id
          )
          .input(
            "meses_aviso",
            sql.Int,
            mesesAviso
          )
          .input(
            "dias_critico",
            sql.Int,
            diasCritico
          )
          .input(
            "actualizado_por",
            sql.Int,
            usuarioId
          )
          .query(`
            UPDATE dbo.configuracion_expiracion
            SET
              meses_aviso = @meses_aviso,
              dias_critico = @dias_critico,
              actualizado_por = @actualizado_por,
              fecha_actualizacion = SYSDATETIME()
            WHERE id = @id
          `);

      } else {

        await pool
          .request()
          .input(
            "meses_aviso",
            sql.Int,
            mesesAviso
          )
          .input(
            "dias_critico",
            sql.Int,
            diasCritico
          )
          .input(
            "actualizado_por",
            sql.Int,
            usuarioId
          )
          .query(`
            INSERT INTO dbo.configuracion_expiracion (
              meses_aviso,
              dias_critico,
              actualizado_por
            )
            VALUES (
              @meses_aviso,
              @dias_critico,
              @actualizado_por
            )
          `);

      }

      res.json({
        ok: true,
        mensaje:
          "Configuración de expiración guardada correctamente.",
        meses_aviso:
          mesesAviso,
        dias_critico:
          diasCritico
      });

    } catch (error) {

      console.error(
        "ERROR PUT CONFIG EXPIRACION:",
        error
      );

      res.status(500).json({
        error:
          "No se pudo guardar la configuración de expiración."
      });

    }
  }
);

app.put("/api/pacientes/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      cedulaPaciente, estadoCivil, sexo, telefonoFijo, telefonoCelular, correo,
      pacApellido1, pacApellido2, pacNombre1, pacNombre2,
      famApellido1, famApellido2, famNombre1, famNombre2,
      cedulaFamiliar, fechaNacimiento, edad, lugarNacimiento, fechaProcedimiento,
      reclutadorId, provincia, canton, parroquia, barrio, callePrincipal,
      calleSecundaria, referencia, ocupacion, parentescoFamiliar,
      direccionFamiliar, telefonoFamiliar, tipoSeguro, tipoAfiliado
    } = req.body;

    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .input("cedulaPaciente", sql.VarChar, cedulaPaciente)
      .input("estadoCivil", sql.VarChar, estadoCivil)
      .input("sexo", sql.VarChar, sexo)
      .input("telefonoFijo", sql.VarChar, telefonoFijo)
      .input("telefonoCelular", sql.VarChar, telefonoCelular)
      .input("correo", sql.VarChar, correo)
      .input("pacApellido1", sql.VarChar, pacApellido1)
      .input("pacApellido2", sql.VarChar, pacApellido2)
      .input("pacNombre1", sql.VarChar, pacNombre1)
      .input("pacNombre2", sql.VarChar, pacNombre2)
      .input("famApellido1", sql.VarChar, famApellido1)
      .input("famApellido2", sql.VarChar, famApellido2)
      .input("famNombre1", sql.VarChar, famNombre1)
      .input("famNombre2", sql.VarChar, famNombre2)
      .input("cedulaFamiliar", sql.VarChar, cedulaFamiliar)
      .input("fechaNacimiento", sql.Date, fechaNacimiento)
      .input("edad", sql.Int, edad)
      .input("lugarNacimiento", sql.VarChar, lugarNacimiento)
      .input("fechaProcedimiento", sql.Date, fechaProcedimiento)
      .input("reclutadorId", sql.Int, reclutadorId || null)
      .input("provincia", sql.VarChar, provincia)
      .input("canton", sql.VarChar, canton)
      .input("parroquia", sql.VarChar, parroquia)
      .input("barrio", sql.VarChar, barrio)
      .input("callePrincipal", sql.VarChar, callePrincipal)
      .input("calleSecundaria", sql.VarChar, calleSecundaria)
      .input("referencia", sql.VarChar, referencia)
      .input("ocupacion", sql.VarChar, ocupacion)
      .input("parentescoFamiliar", sql.VarChar, parentescoFamiliar)
      .input("direccionFamiliar", sql.VarChar, direccionFamiliar)
      .input("telefonoFamiliar", sql.VarChar, telefonoFamiliar)
      .input("tipoSeguro", sql.VarChar, tipoSeguro)
      .input("tipoAfiliado", sql.VarChar, tipoAfiliado)
      .query(`
        UPDATE pacientes
        SET
          cedula_paciente = @cedulaPaciente,
          estado_civil = @estadoCivil,
          sexo = @sexo,
          telefono_fijo = @telefonoFijo,
          telefono_celular = @telefonoCelular,
          correo = @correo,

          pac_apellido1 = @pacApellido1,
          pac_apellido2 = @pacApellido2,
          pac_nombre1 = @pacNombre1,
          pac_nombre2 = @pacNombre2,

          fam_apellido1 = @famApellido1,
          fam_apellido2 = @famApellido2,
          fam_nombre1 = @famNombre1,
          fam_nombre2 = @famNombre2,

          cedula_familiar = @cedulaFamiliar,
          fecha_nacimiento = @fechaNacimiento,
          edad = @edad,
          lugar_nacimiento = @lugarNacimiento,
          fecha_procedimiento = @fechaProcedimiento,
          reclutador_id = @reclutadorId,

          provincia = @provincia,
          canton = @canton,
          parroquia = @parroquia,
          barrio = @barrio,
          calle_principal = @callePrincipal,
          calle_secundaria = @calleSecundaria,
          referencia = @referencia,
          ocupacion = @ocupacion,
          parentesco_familiar = @parentescoFamiliar,
          direccion_familiar = @direccionFamiliar,
          telefono_familiar = @telefonoFamiliar,
          tipo_seguro = @tipoSeguro,
          tipo_afiliado = @tipoAfiliado
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR EDITAR PACIENTE:", error);
    res.status(500).json({ error: "Error al actualizar paciente" });
  }
});

/* =========================
   001 admision   ruta para generar pdf
========================= */

app.post("/api/hclinicas/001/generar-pdf",requireAuth,async (req, res) => {
    let rutaCompletaCreada = "";

    try {
      const datos = req.body || {};

      /* =========================================
         1. VALIDAR USUARIO Y PACIENTE
      ========================================= */

      const usuarioSesion = obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error: "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(datos.paciente_id);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error: "No se recibió un paciente válido"
        });
      }

      const fechaProcedimiento = String(
        datos.fecha_admision_paciente || ""
      ).slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      /* =========================================
         2. LOCALIZAR Y CARGAR LA PLANTILLA
      ========================================= */

      const rutaPlantilla = path.join(
        __dirname,
        "plantillas_hclinicas",
        "001_admision_plantilla.pdf"
      );

      if (!fs.existsSync(rutaPlantilla)) {
        return res.status(404).json({
          error:
            "No se encontró la plantilla PDF del formulario 001"
        });
      }

      const bytesPlantilla =
        fs.readFileSync(rutaPlantilla);

      const pdfDoc = await PDFDocument.load(
        bytesPlantilla
      );
      /*pdfDoc.setTitle(`001 ADMISIÓN - ${datos.narchivo_paciente || "SIN ARCHIVO"}`);*/
const nombrePacienteTitulo = [
  datos.primer_apellido_paciente,
  datos.segundo_apellido_paciente,
  datos.primer_nombre_paciente,
  datos.segundo_nombre_paciente
]
  .filter(valor => String(valor || "").trim() !== "")
  .join(" ")
  .trim();

pdfDoc.setTitle(
  nombrePacienteTitulo || "001 ADMISIÓN"
);
      
pdfDoc.setSubject("Formulario 001 - Admisión");
pdfDoc.setAuthor("CENT Instituto Especializado en Hemodinamia del Ecuador");
pdfDoc.setCreator("Sistema CENT");
pdfDoc.setProducer("Sistema CENT");

      const formulario = pdfDoc.getForm();

      const fuente = await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

      /* =========================================
         3. CAMPOS QUE SE LLENARÁN
      ========================================= */

      const camposPermitidos = [
        "paciente_h_clinica",
        "narchivo_paciente",
        "fecha_admision_paciente",
        "nombre_admisionista",
        "primer_apellido_paciente",
        "segundo_apellido_paciente",
        "primer_nombre_paciente",
        "segundo_nombre_paciente",
        "tipo_id_paciente",
        "estado_civil_paciente",
        "sexo_paciente",
        "telefono_fijo_paciente",
        "telefono_celular_paciente",
        "correo_paciente",
        "fecha_nacimiento_paciente",
        "lugar_nacimiento_paciente",
        "nacionalidad_paciente",
        "edad_paciente",
        "provincia_paciente",
        "canton_paciente",
        "parroquia_paciente",
        "barrio_paciente",
        "calle_paciente",
        "calle_secundaria_paciente",
        "referencia_paciente",
        "identificacion_etnica_paciente",
        "nacionalidad_etnica_paciente",
        "pueblos_paciente",
        "nivel_educacion_paciente",
        "estado_educacion_paciente",
        "ocupacion_paciente",
        "empresa_trabajo_paciente",
        "seguro_paciente",
        "tipo_bono_paciente",
        "nombres_completos_familiar",
        "parentesco_familiar",
        "direccion_familiar",
        "telefono_familiar"
      ];

      /*
        Estos nombres alternativos quedan como respaldo
        porque pdf-lib anteriormente detectó algunos campos
        con el prefijo interno "undefined.".
      */
      const nombresAlternativosPDF001 = {
        segundo_apellido_paciente:
          "undefined.segundo_apellido_paciente",

        segundo_nombre_paciente:
          "undefined.segundo_nombre_paciente",

        nivel_educacion_paciente:
          "undefined.nivel_educacion_paciente",

        estado_educacion_paciente:
          "undefined.estado_educacion_paciente"
      };

      /* =========================================
         4. LLENAR LOS CAMPOS DEL PDF
      ========================================= */

      for (const nombreCampo of camposPermitidos) {
        let valor = datos[nombreCampo] ?? "";

        if (
          nombreCampo ===
            "fecha_admision_paciente" ||
          nombreCampo ===
            "fecha_nacimiento_paciente"
        ) {
          valor = formatearFechaPDF(valor);
        }

        try {
          let campoPDF;

          /*
            Primero intenta encontrar el campo usando
            el nombre normal de la plantilla.
          */
          try {
            campoPDF = formulario.getTextField(
              nombreCampo
            );
          } catch (errorNombreNormal) {
            const nombreAlternativo =
              nombresAlternativosPDF001[
                nombreCampo
              ];

            if (!nombreAlternativo) {
              throw errorNombreNormal;
            }

            campoPDF = formulario.getTextField(
              nombreAlternativo
            );
          }

          campoPDF.setText(
            String(valor)
          );

        } catch (errorCampo) {
          console.warn(
            `El campo PDF "${nombreCampo}" no pudo llenarse:`,
            errorCampo.message
          );
        }
      }

      /*
        Genera la apariencia visible de los textos
        antes de aplanar el formulario.
      */
      formulario.updateFieldAppearances(
        fuente
      );

      /* =========================================
         5. APLANAR EL PDF
      ========================================= */

      /*
        Convierte los campos en contenido fijo.

        Esto evita que puedan editarse directamente.
        La posibilidad de seleccionar el texto también
        puede depender del visor PDF utilizado.
      */
      formulario.getFields().forEach(campo => {
  try {
    campo.enableReadOnly();
  } catch (errorCampo) {
    console.warn(
      `No se pudo bloquear el campo "${
        campo?.getName?.() || "SIN NOMBRE"
      }":`,
      errorCampo.message
    );
  }
});



      formulario.updateFieldAppearances(fuente);

formulario.getFields().forEach(campo => {
  try {
    campo.enableReadOnly();
  } catch (errorCampo) {
    console.warn(
      `No se pudo bloquear el campo "${
        campo?.getName?.() || "SIN NOMBRE"
      }":`,
      errorCampo.message
    );
  }
});

// Aquí ya no debe estar pdfDoc.save()



      /* =========================================
         6. CONSTRUIR CARPETA DEL PACIENTE
      ========================================= */

      const [anio, mes, dia] =
        fechaProcedimiento.split("-");

      const numeroArchivoSeguro =
        limpiarNombreArchivoHC(
          datos.narchivo_paciente ||
          "SIN_ARCHIVO"
        );

      const cedulaSegura =
        limpiarNombreArchivoHC(
          datos.paciente_h_clinica ||
          "SIN_CEDULA"
        );

      const nombrePacienteSeguro =
        limpiarNombreArchivoHC(
          [
            datos.primer_apellido_paciente,
            datos.segundo_apellido_paciente,
            datos.primer_nombre_paciente,
            datos.segundo_nombre_paciente
          ]
            .filter(Boolean)
            .join(" ")
        );

      const carpetaPaciente = [
        numeroArchivoSeguro,
        cedulaSegura,
        nombrePacienteSeguro
      ]
        .filter(Boolean)
        .join("_");

      /* =========================================
         7. CALCULAR SIGUIENTE VERSIÓN
      ========================================= */

      const pool = await getPool();

      const verificacionEstado = await pool
  .request()
  .input(
    "paciente_id",
    pacienteId
  )
  .input(
    "codigo_formulario",
    "001"
  )
  .input(
    "fecha_procedimiento",
    fechaProcedimiento
  )
  .query(`
    SELECT TOP 1
      estado
    FROM dbo.hc_formularios_datos
    WHERE paciente_id = @paciente_id
      AND codigo_formulario =
        @codigo_formulario
      AND fecha_procedimiento =
        @fecha_procedimiento
    ORDER BY id DESC;
  `);

const estadoFormulario = String(
  verificacionEstado.recordset?.[0]
    ?.estado || ""
).toUpperCase();

if (
  estadoFormulario &&
  estadoFormulario !== "BORRADOR"
) {
  return res.status(409).json({
    error:
      "No se puede generar otro PDF",
    detalle:
      "El formulario 001 está cerrado y ya no admite nuevas versiones."
  });
}

      const resultadoVersion = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "001"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .query(`
          SELECT
            ISNULL(MAX(version), 0) + 1
              AS siguiente_version
          FROM dbo.hc_documentos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario =
              @codigo_formulario
            AND fecha_procedimiento =
              @fecha_procedimiento
        `);

      const version = Number(
        resultadoVersion.recordset[0]
          ?.siguiente_version || 1
      );

      /* =========================================
         8. GUARDAR EL ARCHIVO FÍSICO
      ========================================= */

      const carpetaRelativa = path.join(
        anio,
        mes,
        dia,
        carpetaPaciente
      );

      const carpetaCompleta = path.join(
        __dirname,
        "formularios",
        carpetaRelativa
      );

      fs.mkdirSync(
        carpetaCompleta,
        {
          recursive: true
        }
      );

      const nombreBasePDF = limpiarNombreArchivoHC(
  [
    "001 ADMISION",
    nombrePacienteSeguro || "SIN NOMBRE",
    numeroArchivoSeguro || "SIN ARCHIVO",
    `V${version}`
  ].join(" ")
);

const nombreVisible = `${nombreBasePDF}.pdf`;

/*
  El archivo físico tendrá exactamente el mismo nombre
  que se muestra en el sistema.
*/
const nombreFisico = nombreVisible;

/*
  El título interno del PDF será exactamente igual
  al nombre con el que se guarda.
*/
pdfDoc.setTitle(nombreVisible);

pdfDoc.setSubject(
  "Formulario 001 - Admisión"
);

pdfDoc.setAuthor(
  "CENT Instituto Especializado en Hemodinamia del Ecuador"
);

pdfDoc.setCreator("Sistema CENT");
pdfDoc.setProducer("Sistema CENT");

/*
  Guardamos el PDF después de establecer su título.
*/
const pdfFinal = await pdfDoc.save();

      const rutaCompleta = path.join(
        carpetaCompleta,
        nombreFisico
      );

      rutaCompletaCreada = rutaCompleta;

      fs.writeFileSync(
        rutaCompleta,
        Buffer.from(pdfFinal)
      );

      const rutaRelativa = path.join(
        carpetaRelativa,
        nombreFisico
      );

      /* =========================================
         9. REGISTRAR EL DOCUMENTO EN SQL
      ========================================= */

      const resultadoDocumento = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "001"
        )
        .input(
          "nombre_formulario",
          "001 Admisión"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "version",
          version
        )
        .input(
          "estado",
          "BORRADOR"
        )
        .input(
          "nombre_archivo",
          nombreVisible
        )
        .input(
          "ruta_relativa",
          rutaRelativa
        )
        .input(
          "creado_por_username",
          usuarioSesion.username
        )
        .input(
          "creado_por_nombre",
          usuarioSesion.nombreCompleto
        )
        .query(`
          INSERT INTO dbo.hc_documentos (
            paciente_id,
            codigo_formulario,
            nombre_formulario,
            fecha_procedimiento,
            version,
            estado,
            nombre_archivo,
            ruta_relativa,
            creado_por_username,
            creado_por_nombre
          )
          OUTPUT INSERTED.id
          VALUES (
            @paciente_id,
            @codigo_formulario,
            @nombre_formulario,
            @fecha_procedimiento,
            @version,
            @estado,
            @nombre_archivo,
            @ruta_relativa,
            @creado_por_username,
            @creado_por_nombre
          )
        `);

      const documentoId =
        resultadoDocumento.recordset[0].id;

      /* =========================================
         10. RESPUESTA FINAL
      ========================================= */

      return res.status(201).json({
        ok: true,
        mensaje:
          "PDF generado y almacenado correctamente",

        documento: {
          id: documentoId,
          nombreArchivo: nombreVisible,
          version,
          estado: "BORRADOR"
        }
      });

    } catch (error) {
      console.error(
        "ERROR GENERANDO PDF 001:",
        error
      );

      /*
        Si el PDF se escribió en la carpeta, pero falló
        después el registro SQL, se elimina para evitar
        dejar un archivo huérfano.
      */
      if (
        rutaCompletaCreada &&
        fs.existsSync(rutaCompletaCreada)
      ) {
        try {
          fs.unlinkSync(
            rutaCompletaCreada
          );

          console.log(
            "Archivo físico eliminado después del error:",
            rutaCompletaCreada
          );
        } catch (errorEliminar) {
          console.error(
            "No se pudo eliminar el archivo incompleto:",
            errorEliminar
          );
        }
      }

      return res.status(500).json({
        error:
          "No se pudo generar el PDF del formulario 001",

        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

app.post("/api/hclinicas/001/cerrar",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId =
        Number(datos.paciente_id);

      const documentoId =
        Number(datos.documento_id);

      const fechaProcedimiento = String(
        datos.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !Number.isInteger(documentoId) ||
        documentoId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un documento PDF válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "documento_id",
          documentoId
        )
        .input(
          "codigo_formulario",
          "001"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "cerrado_por_username",
          usuarioSesion.username
        )
        .input(
          "cerrado_por_nombre",
          usuarioSesion.nombreCompleto
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            /* =====================================
               1. COMPROBAR EL FORMULARIO EDITABLE
            ===================================== */

            IF NOT EXISTS (
              SELECT 1
              FROM dbo.hc_formularios_datos
              WHERE paciente_id = @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
            )
            BEGIN
              THROW 51001,
                'No existe un borrador del formulario 001 para cerrar.',
                1;
            END;

            IF EXISTS (
              SELECT 1
              FROM dbo.hc_formularios_datos
              WHERE paciente_id = @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
                AND estado <> 'BORRADOR'
            )
            BEGIN
              THROW 51002,
                'El formulario ya no se encuentra en estado BORRADOR.',
                1;
            END;

            /* =====================================
               2. COMPROBAR EL PDF GENERADO
            ===================================== */

            IF NOT EXISTS (
              SELECT 1
              FROM dbo.hc_documentos
              WHERE id = @documento_id
                AND paciente_id = @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
                AND estado = 'BORRADOR'
            )
            BEGIN
              THROW 51003,
                'El PDF seleccionado no corresponde al formulario o ya fue cerrado.',
                1;
            END;

            /* =====================================
               3. CERRAR LOS DATOS EDITABLES
            ===================================== */

            UPDATE dbo.hc_formularios_datos
            SET
              estado = 'CERRADO',
              cerrado_por_username =
                @cerrado_por_username,
              cerrado_por_nombre =
                @cerrado_por_nombre,
              fecha_cierre = SYSUTCDATETIME(),
              modificado_por_username =
                @cerrado_por_username,
              modificado_por_nombre =
                @cerrado_por_nombre,
              fecha_modificacion =
                SYSUTCDATETIME()
            WHERE paciente_id = @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
              AND estado = 'BORRADOR';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51004,
                'No se pudo cerrar el formulario editable.',
                1;
            END;

            /* =====================================
               4. CERRAR EL PDF DEFINITIVO
            ===================================== */

            UPDATE dbo.hc_documentos
            SET
              estado = 'CERRADO',
              cerrado_por_username =
                @cerrado_por_username,
              cerrado_por_nombre =
                @cerrado_por_nombre,
              fecha_cierre = SYSUTCDATETIME()
            WHERE id = @documento_id
              AND paciente_id = @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
              AND estado = 'BORRADOR';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51005,
                'No se pudo cerrar el documento PDF.',
                1;
            END;

            COMMIT TRANSACTION;

            SELECT
              d.id,
              d.nombre_archivo,
              d.version,
              d.estado,
              d.cerrado_por_username,
              d.cerrado_por_nombre,
              d.fecha_cierre
            FROM dbo.hc_documentos d
            WHERE d.id = @documento_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      const documento =
        resultado.recordset?.[0];

      return res.status(200).json({
        ok: true,
        mensaje:
          "Formulario 001 cerrado correctamente",
        formulario: {
          pacienteId,
          codigoFormulario: "001",
          fechaProcedimiento,
          estado: "CERRADO"
        },
        documento
      });

    } catch (error) {
      console.error(
        "ERROR CERRANDO FORMULARIO 001:",
        error
      );

      const mensajeSQL =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      let estadoHTTP = 500;

      if (
        mensajeSQL.includes(
          "No existe un borrador"
        ) ||
        mensajeSQL.includes(
          "ya no se encuentra en estado BORRADOR"
        ) ||
        mensajeSQL.includes(
          "no corresponde al formulario"
        ) ||
        mensajeSQL.includes(
          "ya fue cerrado"
        )
      ) {
        estadoHTTP = 409;
      }

      return res.status(estadoHTTP).json({
        error:
          "No se pudo cerrar el formulario 001",
        detalle: mensajeSQL
      });
    }
  }
);

app.post("/api/hclinicas/001/reabrir",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      /*
        La seguridad verdadera se aplica aquí.
        Aunque alguien manipule panel.js, el servidor
        rechazará la petición si no es ADMIN.
      */
      if (usuarioSesion.rol !== "ADMIN") {
        return res.status(403).json({
          error:
            "Acceso denegado",
          detalle:
            "Solo un usuario ADMIN puede reabrir formularios cerrados."
        });
      }

      const pacienteId =
        Number(datos.paciente_id);

      const fechaProcedimiento = String(
        datos.fecha_procedimiento || ""
      ).slice(0, 10);

      const motivoReapertura = String(
        datos.motivo_reapertura || ""
      ).trim();

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      if (motivoReapertura.length < 5) {
        return res.status(400).json({
          error:
            "Debe registrar el motivo de la reapertura"
        });
      }

      if (motivoReapertura.length > 500) {
        return res.status(400).json({
          error:
            "El motivo de reapertura no puede superar los 500 caracteres"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "001"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "reabierto_por_username",
          usuarioSesion.username
        )
        .input(
          "reabierto_por_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .input(
          "motivo_reapertura",
          motivoReapertura
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @formulario_id INT;
            DECLARE @estado_actual NVARCHAR(20);

            SELECT
              @formulario_id = id,
              @estado_actual = estado
            FROM dbo.hc_formularios_datos
              WITH (UPDLOCK, HOLDLOCK)
            WHERE paciente_id = @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;

            IF @formulario_id IS NULL
            BEGIN
              THROW 51030,
                'No existe el formulario 001 solicitado.',
                1;
            END;

            IF @estado_actual <> 'CERRADO'
            BEGIN
              THROW 51031,
                'El formulario 001 no se encuentra en estado CERRADO.',
                1;
            END;

            UPDATE dbo.hc_formularios_datos
            SET
              estado = 'BORRADOR',

              reabierto_por_username =
                @reabierto_por_username,

              reabierto_por_nombre =
                @reabierto_por_nombre,

              fecha_reapertura =
               SYSUTCDATETIME(),

              motivo_reapertura =
                @motivo_reapertura,

              modificado_por_username =
                @reabierto_por_username,

              modificado_por_nombre =
                @reabierto_por_nombre,

              fecha_modificacion =
                SYSUTCDATETIME()
            WHERE id = @formulario_id
              AND estado = 'CERRADO';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51032,
                'No se pudo reabrir el formulario 001.',
                1;
            END;

            /*
              No modificamos hc_documentos.

              El PDF que ya fue cerrado permanece como
              evidencia histórica. Cuando el formulario
              se vuelva a cerrar se generará una versión
              nueva del PDF.
            */

            COMMIT TRANSACTION;

            SELECT
              id,
              paciente_id,
              codigo_formulario,
              fecha_procedimiento,
              estado,
              reabierto_por_username,
              reabierto_por_nombre,
              fecha_reapertura,
              motivo_reapertura
            FROM dbo.hc_formularios_datos
            WHERE id = @formulario_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        ok: true,
        mensaje:
          "Formulario 001 reabierto correctamente",
        formulario:
          resultado.recordset?.[0] || null
      });

    } catch (error) {
      console.error(
        "ERROR REABRIENDO FORMULARIO 001:",
        error
      );

      const mensaje =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      let estadoHTTP = 500;

      if (
        mensaje.includes(
          "No existe el formulario"
        )
      ) {
        estadoHTTP = 404;
      }

      if (
        mensaje.includes(
          "no se encuentra en estado CERRADO"
        )
      ) {
        estadoHTTP = 409;
      }

      return res.status(estadoHTTP).json({
        error:
          "No se pudo reabrir el formulario 001",
        detalle: mensaje
      });
    }
  }
);


/* =========================
   BODEGAS
========================= */

app.get("/api/bodegas", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        id,
        nombre,
        ISNULL(estado, 'ACTIVO') AS estado,
        fecha_creacion
      FROM bodegas
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR BODEGAS:", error);
    res.status(500).json({
      error: error.message || "Error al obtener bodegas"
    });
  }
});

app.post("/api/bodegas", requireAuth, async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "Ingrese el nombre de la bodega" });
    }

    const pool = await getPool();

    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .query(`
        INSERT INTO bodegas (nombre)
        VALUES (@nombre)
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CREAR BODEGA:", error);

    if (error.number === 2627) {
      return res.status(400).json({ error: "La bodega ya existe" });
    }

    res.status(500).json({ error: "Error al crear bodega" });
  }
});

app.patch("/api/bodegas/estado/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE bodegas
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CAMBIAR ESTADO BODEGA:", error);
    res.status(500).json({ error: "Error al cambiar estado de la bodega" });
  }
});

/*app.get("/api/casas", requireAuth, async (req, res) => {

 const pool = await getPool();

 const result = await pool.request().query(`
 SELECT id,nombre,estado
 FROM casas_comerciales
 ORDER BY nombre
 `);

 res.json(result.recordset);

});*/

app.get("/api/casas", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        id,
        nombre,
        ruc,
        correos,
        ISNULL(estado, 'ACTIVO') AS estado,
        fecha_creacion
      FROM casas_comerciales
      ORDER BY nombre ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR CASAS COMERCIALES:", error);
    res.status(500).json({ error: "Error al obtener casas comerciales" });
  }
});

app.post("/api/casas", requireAuth, async (req, res) => {
  try {
    const { nombre, ruc, correos } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "Ingrese el nombre de la casa comercial" });
    }

    const pool = await getPool();

    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("ruc", sql.VarChar, ruc ? ruc.trim() : null)
      .input("correos", sql.VarChar, correos ? correos.trim() : null)
      .query(`
        INSERT INTO casas_comerciales (nombre, ruc, correos)
        VALUES (@nombre, @ruc, @correos)
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CREAR CASA COMERCIAL:", error);

    if (error.number === 2627) {
      return res.status(400).json({ error: "La casa comercial ya existe" });
    }

    res.status(500).json({ error: "Error al crear casa comercial" });
  }
});

app.patch("/api/casas/estado/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        UPDATE casas_comerciales
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CAMBIAR ESTADO CASA COMERCIAL:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});


app.put("/api/casas/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ruc, correos } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "Ingrese el nombre de la casa comercial" });
    }

    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, Number(id))
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("ruc", sql.VarChar, ruc ? ruc.trim() : null)
      .input("correos", sql.VarChar, correos ? correos.trim() : null)
      .query(`
        UPDATE casas_comerciales
        SET
          nombre = @nombre,
          ruc = @ruc,
          correos = @correos
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR EDITAR CASA COMERCIAL:", error);

    if (error.number === 2627) {
      return res.status(400).json({ error: "La casa comercial ya existe" });
    }

    res.status(500).json({ error: "Error al actualizar casa comercial" });
  }
});

app.get("/api/descargos/siguiente-numero", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("tipo", sql.VarChar, "DESCARGO")
      .query(`
        SELECT TOP 1 siguiente_numero
        FROM config_numeradores
        WHERE tipo = @tipo
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Numerador de descargo no configurado" });
    }

    const numero = result.recordset[0].siguiente_numero;
    res.json({ numero: `DSCRG-${numero}` });
  } catch (error) {
    console.error("ERROR SIGUIENTE NUMERO DESCARGO:", error);
    res.status(500).json({ error: "Error al obtener número de descargo" });
  }
});

/* =========================================================
   REGISTRAR DESCARGO
   ========================================================= */

app.post("/api/descargos",

  requireAuth,

  async (req, res) => {

    const pool =
      await getPool();

    const transaction =
      new sql.Transaction(pool);


    try {

      const {
        origen,
        fechaProcedimiento,
        pacienteId,
        archivo,
        responsable,
        detalle
      } = req.body;


      const responsableFinal =
        String(
          responsable ||
          req.session.usuario?.username ||
          ""
        ).trim();


      /* =====================================================
         1. VALIDACIONES GENERALES
         ===================================================== */

      if (
        !origen ||
        !fechaProcedimiento ||
        !pacienteId ||
        !archivo
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos principales incompletos"
          });

      }


      if (
        !Array.isArray(detalle) ||
        !detalle.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "Debe agregar al menos un producto"
          });

      }


      await transaction.begin();


      /* =====================================================
         2. OBTENER Y RESERVAR NUMERACIÓN
         ===================================================== */

      const numeradorResult =
        await new sql.Request(transaction)

          .input(
            "tipo",
            sql.VarChar,
            "DESCARGO"
          )

          .query(`

            SELECT TOP 1

              id,
              siguiente_numero

            FROM dbo.config_numeradores
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE
              tipo = @tipo

          `);


      if (
        !numeradorResult
          .recordset
          .length
      ) {

        throw new Error(
          "Numerador de descargo no configurado"
        );

      }


      const numerador =
        numeradorResult
          .recordset[0];


      const numeroTexto =
        `DSCRG-${numerador.siguiente_numero}`;


      await new sql.Request(transaction)

        .input(
          "id",
          sql.Int,
          numerador.id
        )

        .query(`

          UPDATE dbo.config_numeradores

          SET
            siguiente_numero =
              siguiente_numero + 1

          WHERE
            id = @id

        `);


      /* =====================================================
         3. VALIDAR PACIENTE
         ===================================================== */

      const pacienteResult =
        await new sql.Request(transaction)

          .input(
            "id",
            sql.Int,
            Number(pacienteId)
          )

          .query(`

            SELECT TOP 1

              id,
              archivo,

              LTRIM(
                RTRIM(

                  ISNULL(
                    pac_apellido1,
                    ''
                  )
                  + ' ' +

                  ISNULL(
                    pac_apellido2,
                    ''
                  )
                  + ' ' +

                  ISNULL(
                    pac_nombre1,
                    ''
                  )
                  + ' ' +

                  ISNULL(
                    pac_nombre2,
                    ''
                  )

                )
              ) AS nombre_paciente

            FROM dbo.pacientes

            WHERE
              id = @id

          `);


      if (
        !pacienteResult
          .recordset
          .length
      ) {

        throw new Error(
          "Paciente no encontrado"
        );

      }


      /* =====================================================
         4. INSERTAR CABECERA DEL DESCARGO
         ===================================================== */

      const encabezadoResult =
        await new sql.Request(transaction)

          .input(
            "numero_descargo",
            sql.VarChar,
            numeroTexto
          )

          .input(
            "archivo",
            sql.Int,
            Number(archivo)
          )

          .input(
            "paciente_id",
            sql.Int,
            Number(pacienteId)
          )

          .input(
            "nombre_paciente",
            sql.VarChar,
            pacienteResult
              .recordset[0]
              .nombre_paciente ||
            null
          )

          .input(
            "origen",
            sql.VarChar,
            origen
          )

          .input(
            "fecha_procedimiento",
            sql.Date,
            fechaProcedimiento
          )

          .input(
            "responsable",
            sql.VarChar,
            responsableFinal
          )

          .input(
            "observacion",
            sql.VarChar,
            null
          )

          .query(`

            INSERT INTO dbo.descargos (

              numero_descargo,
              archivo,
              paciente_id,
              nombre_paciente,
              origen,
              fecha_procedimiento,
              responsable,
              observacion

            )

            OUTPUT
              INSERTED.id

            VALUES (

              @numero_descargo,
              @archivo,
              @paciente_id,
              @nombre_paciente,
              @origen,
              @fecha_procedimiento,
              @responsable,
              @observacion

            )

          `);


      const descargoId =
        Number(
          encabezadoResult
            .recordset[0]
            .id
        );


      /*
        Este arreglo solamente se devuelve
        para poder comprobar la prueba.
      */
      const resumenCapasDescargo =
        [];


      /* =====================================================
         5. PROCESAR CADA PRODUCTO
         ===================================================== */

      for (
        const item of detalle
      ) {

        const inventarioId =
          Number(
            item.inventarioId ||
            item.inventarioIndex ||
            0
          );


        const cantidad =
          Number(
            item.cantidad ||
            0
          );


        const detalleLoteId =
          item.detalleLoteId ??
          item.detalleLoteIndex ??
          null;


        if (
          !inventarioId ||
          !Number.isFinite(cantidad) ||
          cantidad <= 0
        ) {

          throw new Error(
            "Detalle de producto no válido"
          );

        }


        /* ===================================================
           5.1 INVENTARIO FÍSICO
           =================================================== */

        const stockResult =
          await new sql.Request(transaction)

            .input(
              "id",
              sql.Int,
              inventarioId
            )

            .query(`

              SELECT TOP 1

                i.id,
                i.producto_id,
                i.stock,
                i.bodega,

                p.codigo,
                p.producto,
                p.categoria

              FROM dbo.inventario i
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              INNER JOIN dbo.productos p
                ON p.id =
                   i.producto_id

              WHERE
                i.id = @id

            `);


        if (
          !stockResult
            .recordset
            .length
        ) {

          throw new Error(
            `Producto no encontrado en inventario: ${
              item.producto || ""
            }`
          );

        }


        const inv =
          stockResult
            .recordset[0];


        /* ===================================================
           DESCARGOS SOLO DE BODEGA CENT
           =================================================== */

        if (
          String(inv.bodega || "")
            .trim()
            .toUpperCase()
          !==
          "BODEGA CENT"
        ) {

          throw new Error(
            `El producto ${inv.producto} no pertenece a BODEGA CENT`
          );

        }


        if (
          Number(
            inv.stock ||
            0
          ) <
          cantidad
        ) {

          throw new Error(
            `Stock insuficiente para ${inv.producto}`
          );

        }


        /* ===================================================
           DATOS DEL LOTE
           =================================================== */

        let lote =
          null;

        let fechaExp =
          null;

        let casaComercial =
          null;

        let codigoProveedor =
          null;

        let manejaLote =
          false;


        /* ===================================================
           5.2 SI SELECCIONÓ LOTE
           =================================================== */

        if (
          detalleLoteId !== null &&
          detalleLoteId !== -1 &&
          detalleLoteId !== ""
        ) {

          manejaLote =
            true;


          const loteBaseResult =
            await new sql.Request(transaction)

              .input(
                "id",
                sql.Int,
                Number(
                  detalleLoteId
                )
              )

              .query(`

                SELECT TOP 1

                  id,
                  producto_id,
                  bodega,
                  codigoproveedor,
                  casa_comercial,
                  lote,
                  vencimiento

                FROM dbo.detalleEntradas

                WHERE
                  id = @id

              `);


          if (
            !loteBaseResult
              .recordset
              .length
          ) {

            throw new Error(
              `Lote no encontrado para ${inv.producto}`
            );

          }


          const loteBase =
            loteBaseResult
              .recordset[0];


          if (
            Number(
              loteBase.producto_id
            )
            !==
            Number(
              inv.producto_id
            )
          ) {

            throw new Error(
              `El lote seleccionado no pertenece a ${inv.producto}`
            );

          }


          if (
            String(
              loteBase.bodega ||
              ""
            )
              .trim()
              .toUpperCase()
            !==
            String(
              inv.bodega ||
              ""
            )
              .trim()
              .toUpperCase()
          ) {

            throw new Error(
              `El lote seleccionado no pertenece a ${inv.bodega}`
            );

          }


          /* ===============================================
             BUSCAR ESTADO VIGENTE DEL LOTE
             =============================================== */

          const loteVigenteResult =
            await new sql.Request(transaction)

              .input(
                "producto_id",
                sql.Int,
                Number(
                  inv.producto_id
                )
              )

              .input(
                "bodega",
                sql.VarChar,
                inv.bodega
              )

              .input(
                "codigoproveedor",
                sql.VarChar,
                loteBase.codigoproveedor ||
                ""
              )

              .input(
                "lote",
                sql.VarChar,
                loteBase.lote ||
                ""
              )

              .input(
                "casa_comercial",
                sql.VarChar,
                loteBase.casa_comercial ||
                ""
              )

              .query(`

                SELECT TOP 1

                  id,
                  lote,
                  vencimiento,
                  stock_lote,
                  codigoproveedor,
                  casa_comercial

                FROM dbo.detalleEntradas
                  WITH (
                    UPDLOCK,
                    HOLDLOCK
                  )

                WHERE

                  producto_id =
                    @producto_id

                  AND UPPER(
                        LTRIM(
                          RTRIM(bodega)
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@bodega)
                        )
                      )

                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              codigoproveedor,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @codigoproveedor
                          )
                        )
                      )

                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              lote,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@lote)
                        )
                      )

                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              casa_comercial,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @casa_comercial
                          )
                        )
                      )

                ORDER BY
                  id DESC

              `);


          if (
            !loteVigenteResult
              .recordset
              .length
          ) {

            throw new Error(
              `No se encontró saldo vigente para el lote de ${inv.producto}`
            );

          }


          const loteData =
            loteVigenteResult
              .recordset[0];


          if (
            Number(
              loteData.stock_lote ||
              0
            ) <
            cantidad
          ) {

            throw new Error(
              `Stock insuficiente en lote para ${inv.producto}`
            );

          }


          lote =
            loteData.lote ||
            null;


          fechaExp =
            loteData.vencimiento ||
            null;


          codigoProveedor =
            loteData.codigoproveedor ||
            null;


          casaComercial =
            loteData.casa_comercial ||
            null;


          /* ===============================================
             DESCONTAR LOTE FÍSICO
             =============================================== */

          await new sql.Request(transaction)

            .input(
              "id",
              sql.Int,
              Number(
                loteData.id
              )
            )

            .input(
              "cantidad",
              sql.Int,
              cantidad
            )

            .query(`

              UPDATE dbo.detalleEntradas

              SET
                stock_lote =
                  ISNULL(
                    stock_lote,
                    0
                  ) -
                  @cantidad

              WHERE
                id = @id

            `);

        }


        /* ===================================================
           5.3 BUSCAR CAPAS DE COSTO DISPONIBLES
           =================================================== */

        const requestCapas =
          new sql.Request(
            transaction
          );


        requestCapas.input(
          "producto_id",
          sql.Int,
          Number(
            inv.producto_id
          )
        );


        requestCapas.input(
          "bodega",
          sql.VarChar,
          inv.bodega
        );


        requestCapas.input(
          "lote",
          sql.VarChar,
          lote || ""
        );


        requestCapas.input(
          "codigo_proveedor",
          sql.VarChar,
          codigoProveedor || ""
        );


        requestCapas.input(
          "casa_comercial",
          sql.VarChar,
          casaComercial || ""
        );


        const filtroCapa =
          manejaLote

            ? `

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(
                            c.lote,
                            ''
                          )
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(
                          @lote
                        )
                      )
                    )


                AND
                (
                  c.codigo_proveedor IS NULL

                  OR UPPER(
                       LTRIM(
                         RTRIM(
                           c.codigo_proveedor
                         )
                       )
                     ) =
                     UPPER(
                       LTRIM(
                         RTRIM(
                           @codigo_proveedor
                         )
                       )
                     )
                )


                AND
                (
                  c.casa_comercial IS NULL

                  OR UPPER(
                       LTRIM(
                         RTRIM(
                           c.casa_comercial
                         )
                       )
                     ) =
                     UPPER(
                       LTRIM(
                         RTRIM(
                           @casa_comercial
                         )
                       )
                     )
                )

              `

            : `

                AND
                (
                  c.lote IS NULL

                  OR LTRIM(
                       RTRIM(c.lote)
                     ) = ''
                )

              `;


        const capasResult =
          await requestCapas
            .query(`

              SELECT

                c.id,

                c.cantidad_disponible,

                c.estado_costo,

                c.costo_unitario,

                c.motivo_sin_costo,

                c.lote,

                c.fecha_entrada,

                c.origen,

                c.origen_id

              FROM dbo.capas_costo_inventario c
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              WHERE

                c.producto_id =
                  @producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(c.bodega)
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@bodega)
                      )
                    )

                AND
                  c.cantidad_disponible > 0

                ${filtroCapa}

              ORDER BY

                c.fecha_entrada ASC,

                c.id ASC

            `);


        const capas =
          capasResult
            .recordset;


        const disponibleCapas =
          capas.reduce(
            (
              total,
              capa
            ) =>
              total +
              Number(
                capa.cantidad_disponible ||
                0
              ),
            0
          );


        if (
          disponibleCapas <
          cantidad
        ) {

          throw new Error(

            manejaLote

              ? `Las capas del lote de ${inv.producto} solo tienen ${disponibleCapas} unidades disponibles`

              : `Las capas sin lote de ${inv.producto} solo tienen ${disponibleCapas} unidades disponibles`

          );

        }


        /* ===================================================
           5.4 DESCONTAR STOCK GENERAL

           Siempre directo.
           =================================================== */

        await new sql.Request(transaction)

          .input(
            "id",
            sql.Int,
            inventarioId
          )

          .input(
            "cantidad",
            sql.Int,
            cantidad
          )

          .query(`

            UPDATE dbo.inventario

            SET

              stock =
                ISNULL(
                  stock,
                  0
                ) -
                @cantidad,

              fecha_actualizacion =
                GETDATE()

            WHERE
              id = @id

          `);


        /* ===================================================
           5.5 INSERTAR DETALLE DEL DESCARGO

           OBTENEMOS descargos_detalle.id
           =================================================== */

        const detalleResult =
          await new sql.Request(transaction)

            .input(
              "descargo_id",
              sql.Int,
              descargoId
            )

            .input(
              "numero_descargo",
              sql.VarChar,
              numeroTexto
            )

            .input(
              "inventario_id",
              sql.Int,
              inventarioId
            )

            .input(
              "codigo",
              sql.VarChar,
              inv.codigo
            )

            .input(
              "producto",
              sql.VarChar,
              inv.producto
            )

            .input(
              "categoria",
              sql.VarChar,
              inv.categoria ||
              null
            )

            .input(
              "cantidad",
              sql.Int,
              cantidad
            )

            .input(
              "lote",
              sql.VarChar,
              lote
            )

            .input(
              "fecha_expiracion",
              sql.Date,
              fechaExp
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              casaComercial
            )

            .input(
              "codigo_proveedor",
              sql.VarChar,
              codigoProveedor
            )

            .input(
              "observacion",
              sql.VarChar,
              item.observacion ||
              null
            )

            .query(`

              INSERT INTO dbo.descargos_detalle (

                descargo_id,
                numero_descargo,
                inventario_id,
                codigo,
                producto,
                categoria,
                cantidad,
                lote,
                fecha_expiracion,
                casa_comercial,
                codigo_proveedor,
                observacion

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @descargo_id,
                @numero_descargo,
                @inventario_id,
                @codigo,
                @producto,
                @categoria,
                @cantidad,
                @lote,
                @fecha_expiracion,
                @casa_comercial,
                @codigo_proveedor,
                @observacion

              )

            `);


        const descargoDetalleId =
          Number(
            detalleResult
              .recordset[0]
              .id
          );


        /* ===================================================
           5.6 CONSUMIR CAPAS FIFO
           =================================================== */

        let cantidadPendiente =
          cantidad;


        let valorConocido =
          0;


        let cantidadCostoPendiente =
          0;


        const capasConsumidas =
          [];


        for (
          const capa of capas
        ) {

          if (
            cantidadPendiente <= 0
          ) {
            break;
          }


          const disponible =
            Number(
              capa.cantidad_disponible ||
              0
            );


          if (
            disponible <= 0
          ) {
            continue;
          }


          const consumir =
            Math.min(
              disponible,
              cantidadPendiente
            );


          const nuevoSaldo =
            disponible -
            consumir;


          /* =============================================
             ACTUALIZAR CAPA
             ============================================= */

          await new sql.Request(transaction)

            .input(
              "id",
              sql.Int,
              Number(capa.id)
            )

            .input(
              "cantidad_disponible",
              sql.Decimal(18, 4),
              nuevoSaldo
            )

            .query(`

              UPDATE dbo.capas_costo_inventario

              SET
                cantidad_disponible =
                  @cantidad_disponible

              WHERE
                id = @id

            `);


          const costoUnitario =

            capa.costo_unitario === null ||
            capa.costo_unitario === undefined

              ? null

              : Number(
                  capa.costo_unitario
                );


          const valorMovimiento =

            costoUnitario === null

              ? null

              : consumir *
                costoUnitario;


          if (
            valorMovimiento === null
          ) {

            cantidadCostoPendiente +=
              consumir;

          }

          else {

            valorConocido +=
              valorMovimiento;

          }


          /* =============================================
             HISTORIAL ECONÓMICO
             ============================================= */

          await new sql.Request(transaction)

            .input(
              "capa_id",
              sql.Int,
              Number(capa.id)
            )

            .input(
              "producto_id",
              sql.Int,
              Number(
                inv.producto_id
              )
            )

            .input(
              "tipo_movimiento",
              sql.VarChar,
              "DESCARGO"
            )

            .input(
              "documento",
              sql.VarChar,
              numeroTexto
            )

            /*
              IMPORTANTE:

              Para DESCARGO usamos
              descargos_detalle.id.

              Así cada producto del
              descargo puede conocer
              exactamente sus capas.
            */
            .input(
              "documento_id",
              sql.Int,
              descargoDetalleId
            )

            .input(
              "bodega_origen",
              sql.VarChar,
              inv.bodega
            )

            .input(
              "bodega_destino",
              sql.VarChar,
              null
            )

            .input(
              "lote",
              sql.VarChar,
              capa.lote ||
              null
            )

            .input(
              "cantidad",
              sql.Decimal(18, 4),
              consumir
            )

            .input(
              "costo_unitario",
              sql.Decimal(18, 6),
              costoUnitario
            )

            .input(
              "valor_movimiento",
              sql.Decimal(18, 6),
              valorMovimiento
            )

            .input(
              "estado_costo",
              sql.VarChar,
              capa.estado_costo
            )

            .input(
              "usuario",
              sql.VarChar,
              responsableFinal
            )

            .input(
              "observacion",
              sql.VarChar,
              item.observacion ||
              null
            )

            .query(`

              INSERT INTO dbo.movimientos_capas_costo (

                capa_id,
                producto_id,

                tipo_movimiento,

                documento,
                documento_id,

                bodega_origen,
                bodega_destino,

                lote,

                cantidad,

                costo_unitario,
                valor_movimiento,
                estado_costo,

                usuario,
                observacion

              )

              VALUES (

                @capa_id,
                @producto_id,

                @tipo_movimiento,

                @documento,
                @documento_id,

                @bodega_origen,
                @bodega_destino,

                @lote,

                @cantidad,

                @costo_unitario,
                @valor_movimiento,
                @estado_costo,

                @usuario,
                @observacion

              )

            `);


          capasConsumidas.push({

            capa_id:
              Number(capa.id),

            cantidad:
              consumir,

            costo_unitario:
              costoUnitario,

            valor:
              valorMovimiento,

            estado_costo:
              capa.estado_costo

          });


          cantidadPendiente -=
            consumir;

        }


        if (
          cantidadPendiente >
          0.0001
        ) {

          throw new Error(
            `No fue posible distribuir completamente el descargo de ${inv.producto} entre las capas`
          );

        }


        resumenCapasDescargo.push({

          descargo_detalle_id:
            descargoDetalleId,

          codigo:
            inv.codigo,

          producto:
            inv.producto,

          cantidad:
            cantidad,

          valor_conocido:
            valorConocido,

          cantidad_costo_pendiente:
            cantidadCostoPendiente,

          capas:
            capasConsumidas

        });

      }


      /* =====================================================
         6. AUDITORÍA
         ===================================================== */

      try {

        await new sql.Request(transaction)

          .input(
            "usuario",
            sql.VarChar,
            req.session.usuario
              .username
          )

          .input(
            "modulo",
            sql.VarChar,
            "DESCARGOS"
          )

          .input(
            "accion",
            sql.VarChar,
            "REGISTRAR DESCARGO"
          )

          .input(
            "detalle",
            sql.VarChar,
            `Descargo ${numeroTexto}`
          )

          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         7. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        numero_descargo:
          numeroTexto,

        descargo_id:
          descargoId,

        detalle_costos:
          resumenCapasDescargo

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR REGISTRAR DESCARGO:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al registrar descargo"

        });

    }

  }
);

app.get("/api/descargos", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
    
     SELECT
      d.id,
      d.numero_descargo,
      d.nombre_paciente,
      d.fecha_procedimiento,
      d.origen,
      d.archivo,
      d.responsable,
      d.fecha_creacion,
      p.pac_apellido1,
      p.pac_apellido2,
      p.pac_nombre1,
      p.pac_nombre2
    FROM descargos d
    INNER JOIN pacientes p ON d.paciente_id = p.id
    ORDER BY d.id DESC
  `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR DESCARGOS:", error);
    res.status(500).json({ error: "Error al obtener descargos" });
  }
});

app.get("/api/descargos/consignacion", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        dd.id,
        dd.descargo_id,
        dd.numero_descargo,
        dd.codigo,
        dd.producto,
        dd.categoria,
        dd.cantidad,
        dd.lote,
        dd.fecha_expiracion,
        dd.casa_comercial,
        dd.codigo_proveedor,
        dd.observacion,
        d.nombre_paciente,
        d.fecha_procedimiento,
        d.responsable,
        d.archivo,
        d.origen
      FROM dbo.descargos_detalle dd
      INNER JOIN dbo.descargos d
        ON d.id = dd.descargo_id
      WHERE
        dd.casa_comercial IS NOT NULL
        AND LTRIM(RTRIM(dd.casa_comercial)) <> ''
        AND ISNULL(dd.reporte_enviado, 0) = 0
      ORDER BY d.fecha_procedimiento DESC, dd.id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR CONSIGNACION DESCARGOS:", error);
    res.status(500).json({ error: "Error al obtener insumos de consignación" });
  }
});

app.get("/api/descargos/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const encabezado = await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT TOP 1
          d.*,
          p.pac_apellido1,
          p.pac_apellido2,
          p.pac_nombre1,
          p.pac_nombre2
        FROM descargos d
        INNER JOIN pacientes p ON d.paciente_id = p.id
        WHERE d.id = @id
      `);

    if (!encabezado.recordset.length) {
      return res.status(404).json({ error: "Descargo no encontrado" });
    }

    const detalle = await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT
          codigo,
          producto,
          categoria,
          cantidad,
          lote,
          fecha_expiracion,
          numero_descargo,
          observacion
        FROM dbo.descargos_detalle
        WHERE descargo_id = @id
        ORDER BY id ASC
      `);

    res.json({
      encabezado: encabezado.recordset[0],
      detalle: detalle.recordset
    });
  } catch (error) {
    console.error("ERROR DETALLE DESCARGO:", error);
    res.status(500).json({ error: "Error al obtener detalle del descargo" });
  }
});

app.get("/api/descargos-consolidados/pacientes", requireAuth, async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: "Fecha requerida" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("fecha", sql.Date, fecha)
      .query(`
        SELECT DISTINCT
          d.paciente_id,
          d.archivo,
          d.nombre_paciente
        FROM descargos d
        WHERE CAST(d.fecha_procedimiento AS DATE) = @fecha
        ORDER BY d.nombre_paciente
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR PACIENTES CONSOLIDADOS:", error);
    res.status(500).json({ error: "Error al obtener pacientes consolidados" });
  }
});

app.get("/api/descargos-consolidados/detalle", requireAuth, async (req, res) => {
  try {
    const { fecha, pacienteId } = req.query;

    if (!fecha || !pacienteId) {
      return res.status(400).json({ error: "Fecha y paciente requeridos" });
    }

    const pool = await getPool();

    const encabezadoResult = await pool.request()
      .input("fecha", sql.Date, fecha)
      .input("paciente_id", sql.Int, Number(pacienteId))
      .query(`
        SELECT TOP 1
          d.paciente_id,
          d.archivo,
          d.nombre_paciente,
          d.fecha_procedimiento
        FROM descargos d
        WHERE CAST(d.fecha_procedimiento AS DATE) = @fecha
          AND d.paciente_id = @paciente_id
      `);

    if (!encabezadoResult.recordset.length) {
      return res.status(404).json({ error: "No se encontró consolidado para ese paciente y fecha" });
    }

    const detalleResult = await pool.request()
      .input("fecha", sql.Date, fecha)
      .input("paciente_id", sql.Int, Number(pacienteId))
      .query(`
        SELECT
          d.numero_descargo,
          d.origen,
          d.responsable,
          dd.codigo,
          dd.producto,
          dd.categoria,
          dd.cantidad,
          dd.lote,
          dd.fecha_expiracion,
          dd.observacion
        FROM descargos d
        INNER JOIN descargos_detalle dd ON d.id = dd.descargo_id
        WHERE CAST(d.fecha_procedimiento AS DATE) = @fecha
          AND d.paciente_id = @paciente_id
        ORDER BY d.id ASC, dd.id ASC
      `);

    res.json({
      encabezado: encabezadoResult.recordset[0],
      detalle: detalleResult.recordset
    });
  } catch (error) {
    console.error("ERROR DETALLE CONSOLIDADO DESCARGOS:", error);
    res.status(500).json({ error: "Error al obtener detalle consolidado" });
  }
});


app.get("/api/productos",

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

  async (req, res) => {

    try {

      const pool =
        await getPool();


      const result =
        await pool
          .request()
          .query(`

            SELECT

              id,
              codigo,
              referencia,
              producto,
              categoria,
              unidad,
              observacion,
              estado,
              fecha_creacion

            FROM dbo.productos

            ORDER BY
              id DESC

          `);


      res.json(
        result.recordset
      );


    } catch (error) {

      console.error(
        "ERROR LISTAR PRODUCTOS:",
        error
      );


      res
        .status(500)
        .json({
          error:
            "Error al obtener productos"
        });

    }

  }
);

app.get("/api/productos/siguiente-codigo",
  requireAuth,
  requirePermission(
    "inventario.registrar_producto"
  ),
  async (req, res) => {
  try {
    const { categoria } = req.query;

    if (!categoria) {
      return res.status(400).json({ error: "Categoría requerida" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("nombre", sql.VarChar, categoria)
      .query(`
        SELECT TOP 1 prefijo, siguiente_numero
        FROM categorias_producto
        WHERE nombre = @nombre
          AND estado = 'ACTIVO'
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const row = result.recordset[0];
    const codigo = `${row.prefijo}-${row.siguiente_numero}`;

    res.json({ codigo });
  } catch (error) {
    console.error("ERROR SIGUIENTE CODIGO PRODUCTO:", error);
    res.status(500).json({ error: "Error al obtener código" });
  }
});

app.post("/api/productos",

  requireAuth,

  requirePermission(
    "inventario.registrar_producto"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(
        pool
      );


    try {

      const {
        categoria,
        producto,
        unidad,
        referencia,
        observacion
      } = req.body;


      /* =========================================
         VALIDACIONES
         referencia NO es obligatoria
         ========================================= */

      if (
        !categoria ||
        !producto ||
        !unidad
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos incompletos"
          });

      }


      const productoFinal =
        String(
          producto
        )
          .trim()
          .toUpperCase();


      const unidadFinal =
        String(
          unidad
        )
          .trim()
          .toUpperCase();


      const referenciaFinal =
        String(
          referencia || ""
        )
          .trim()
          .toUpperCase()
        || null;


      const observacionFinal =
        String(
          observacion || ""
        ).trim()
        || null;


      await transaction.begin();


      /* =========================================
         OBTENER CATEGORÍA Y NUMERADOR
         ========================================= */

      const categoriaResult =
        await new sql.Request(
          transaction
        )
          .input(
            "nombre",
            sql.VarChar,
            categoria
          )
          .query(`

            SELECT TOP 1

              id,
              nombre,
              prefijo,
              siguiente_numero

            FROM dbo.categorias_producto
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              nombre = @nombre

              AND estado =
                  'ACTIVO'

          `);


      if (
        !categoriaResult
          .recordset
          .length
      ) {

        throw new Error(
          "Categoría no válida"
        );

      }


      const cat =
        categoriaResult
          .recordset[0];


      const codigo =
        `${cat.prefijo}-${cat.siguiente_numero}`;


      /* =========================================
         ACTUALIZAR NUMERADOR
         ========================================= */

      await new sql.Request(
        transaction
      )
        .input(
          "id",
          sql.Int,
          cat.id
        )
        .query(`

          UPDATE dbo.categorias_producto

          SET
            siguiente_numero =
              siguiente_numero + 1

          WHERE
            id = @id

        `);


      /* =========================================
         INSERTAR PRODUCTO
         ========================================= */

      await new sql.Request(
        transaction
      )
        .input(
          "codigo",
          sql.VarChar,
          codigo
        )
        .input(
          "referencia",
          sql.VarChar,
          referenciaFinal
        )
        .input(
          "producto",
          sql.VarChar,
          productoFinal
        )
        .input(
          "categoria",
          sql.VarChar,
          categoria
        )
        .input(
          "unidad",
          sql.VarChar,
          unidadFinal
        )
        .input(
          "observacion",
          sql.VarChar,
          observacionFinal
        )
        .query(`

          INSERT INTO dbo.productos (

            codigo,
            referencia,
            producto,
            categoria,
            unidad,
            observacion

          )

          VALUES (

            @codigo,
            @referencia,
            @producto,
            @categoria,
            @unidad,
            @observacion

          )

        `);


      /* =========================================
         AUDITORÍA
         ========================================= */

      try {

        await new sql.Request(
          transaction
        )
          .input(
            "usuario",
            sql.VarChar,
            req.session.usuario
              .username
          )
          .input(
            "modulo",
            sql.VarChar,
            "PRODUCTOS"
          )
          .input(
            "accion",
            sql.VarChar,
            "CREAR PRODUCTO"
          )
          .input(
            "detalle",
            sql.VarChar,
            referenciaFinal

              ? `${codigo} | Ref: ${referenciaFinal} | ${productoFinal}`

              : `${codigo} | ${productoFinal}`
          )
          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      await transaction.commit();


      res.json({

        ok: true,

        codigo,

        referencia:
          referenciaFinal

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR CREAR PRODUCTO:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al crear producto"

        });

    }

  }
);

app.patch("/api/productos/estado/:id",
  requireAuth,
  requirePermission(
    "inventario.registrar_producto"
  ),
  async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        UPDATE productos
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CAMBIAR ESTADO PRODUCTO:", error);
    res.status(500).json({ error: "Error al cambiar estado del producto" });
  }
});

app.put("/api/productos/:id",

  requireAuth,

  requirePermission(
    "inventario.registrar_producto"
  ),

  async (req, res) => {

    try {

      const { id } =
        req.params;


      const {
        categoria,
        producto,
        unidad,
        referencia
      } = req.body;


      if (
        !categoria ||
        !producto ||
        !unidad
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos incompletos"
          });

      }


      const referenciaFinal =
        String(
          referencia || ""
        )
          .trim()
          .toUpperCase()
        || null;


      const pool =
        await getPool();


      await pool
        .request()

        .input(
          "id",
          sql.Int,
          Number(id)
        )

        .input(
          "categoria",
          sql.VarChar,
          categoria
        )

        .input(
          "producto",
          sql.VarChar,
          producto
            .trim()
            .toUpperCase()
        )

        .input(
          "unidad",
          sql.VarChar,
          unidad
            .trim()
            .toUpperCase()
        )

        .input(
          "referencia",
          sql.VarChar,
          referenciaFinal
        )

        .query(`

          UPDATE dbo.productos

          SET

            categoria =
              @categoria,

            producto =
              @producto,

            unidad =
              @unidad,

            referencia =
              @referencia

          WHERE
            id = @id

        `);


      res.json({
        ok: true
      });


    } catch (error) {

      console.error(
        "ERROR EDITAR PRODUCTO:",
        error
      );


      res
        .status(500)
        .json({
          error:
            "Error al actualizar producto"
        });

    }

  }
);

app.get("/api/productos/:id",

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

  async (req, res) => {

    try {

      const { id } =
        req.params;


      const pool =
        await getPool();


      const result =
        await pool
          .request()

          .input(
            "id",
            sql.Int,
            Number(id)
          )

          .query(`

            SELECT TOP 1

              id,
              codigo,
              referencia,
              producto,
              categoria,
              unidad,
              observacion,
              estado

            FROM dbo.productos

            WHERE
              id = @id

          `);


      if (
        !result
          .recordset
          .length
      ) {

        return res
          .status(404)
          .json({
            error:
              "Producto no encontrado"
          });

      }


      res.json(
        result.recordset[0]
      );


    } catch (error) {

      console.error(
        "ERROR OBTENER PRODUCTO:",
        error
      );


      res
        .status(500)
        .json({
          error:
            "Error al obtener producto"
        });

    }

  }
);

app.post("/api/import/productos",
  requireAuth,
  requirePermission(
    "utilidades.importar"
  ),
  upload.single("file"),
  async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "No se recibió ningún archivo"
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    if (!filas.length) {
      return res.status(400).json({
        ok: false,
        error: "El archivo está vacío"
      });
    }

    await transaction.begin();

    const errores = [];
    let insertados = 0;

    for (let i = 0; i < filas.length; i++) {
      const filaExcel = i + 2; // porque la fila 1 es encabezado
      const row = filas[i];

      const categoria = String(row.categoria || "").trim().toUpperCase();
      const producto = String(row.producto || "").trim().toUpperCase();
      const unidad = String(row.unidad || "").trim().toUpperCase();
      const observacion = String(row.observacion || "").trim();

      if (!categoria) {
        errores.push({ fila: filaExcel, error: "La categoría está vacía" });
        continue;
      }

      if (!producto) {
        errores.push({ fila: filaExcel, error: "El nombre del producto está vacío" });
        continue;
      }

      if (!unidad) {
        errores.push({ fila: filaExcel, error: "La unidad está vacía" });
        continue;
      }

      // validar categoría
      const categoriaResult = await new sql.Request(transaction)
        .input("nombre", sql.VarChar, categoria)
        .query(`
          SELECT TOP 1 id, nombre, prefijo, siguiente_numero
          FROM categorias_producto
          WHERE nombre = @nombre
            AND estado = 'ACTIVO'
        `);

      if (!categoriaResult.recordset.length) {
        errores.push({
          fila: filaExcel,
          error: `La categoría '${categoria}' no existe o está inactiva`
        });
        continue;
      }

      // validar producto duplicado dentro de la base
      const existeProducto = await new sql.Request(transaction)
        .input("producto", sql.VarChar, producto)
        .query(`
          SELECT TOP 1 id
          FROM productos
          WHERE producto = @producto
        `);

      if (existeProducto.recordset.length) {
        errores.push({
          fila: filaExcel,
          error: `El producto '${producto}' ya existe`
        });
        continue;
      }

      const cat = categoriaResult.recordset[0];
      const codigo = `${cat.prefijo}-${cat.siguiente_numero}`;

      // avanzar numerador
      await new sql.Request(transaction)
        .input("id", sql.Int, cat.id)
        .query(`
          UPDATE categorias_producto
          SET siguiente_numero = siguiente_numero + 1
          WHERE id = @id
        `);

      // insertar producto
      await new sql.Request(transaction)
        .input("codigo", sql.VarChar, codigo)
        .input("producto", sql.VarChar, producto)
        .input("categoria", sql.VarChar, categoria)
        .input("unidad", sql.VarChar, unidad)
        .input("observacion", sql.VarChar, observacion || null)
        .query(`
          INSERT INTO productos (
            codigo,
            producto,
            categoria,
            unidad,
            observacion
          )
          VALUES (
            @codigo,
            @producto,
            @categoria,
            @unidad,
            @observacion
          )
        `);

      insertados++;
    }

    await transaction.commit();

    res.json({
      ok: true,
      mensaje: "Importación finalizada",
      insertados,
      errores
    });

  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    console.error("ERROR IMPORTAR PRODUCTOS:", error);

    res.status(500).json({
      ok: false,
      error: error.message || "Error al importar productos"
    });
  }
});

/* =========================================
   LISTAR INVENTARIO

   CUARENTENA:
   - ADMIN siempre puede verla.
   - Usuario con utilidades.cuarentena_ver
     puede verla.
   - Usuario sin ese permiso NO recibe
     registros de CUARENTENA.
   ========================================= */

app.get("/api/inventario",

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

  async (req, res) => {

    try {

      const pool =
        await getPool();


      /* =========================================
         USUARIO ACTUAL
         ========================================= */

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);


      const usuarioId =
        Number(
          usuarioSesion?.id ||
          req.session?.usuario?.id ||
          req.session?.usuarioId ||
          0
        ) || null;


      const rol =
        String(
          usuarioSesion?.rol ||
          req.session?.usuario?.rol ||
          req.session?.rol ||
          ""
        )
          .trim()
          .toUpperCase();


      /* =========================================
         ¿PUEDE VER CUARENTENA?
         ========================================= */

      let puedeVerCuarentena =
        rol === "ADMIN";


      if (
        !puedeVerCuarentena
      ) {

        const permisoRequest =
          pool.request();


        permisoRequest.input(
          "rol",
          sql.VarChar,
          rol
        );


        permisoRequest.input(
          "permiso",
          sql.VarChar,
          "utilidades.cuarentena_ver"
        );


        permisoRequest.input(
          "usuario_id",
          sql.Int,
          usuarioId
        );


        const permisoResult =
          await permisoRequest.query(`

            SELECT TOP 1

              CASE

                /*
                  Si existe una regla específica
                  para el usuario, esa tiene
                  prioridad.
                */
                WHEN up.id IS NOT NULL
                THEN
                  ISNULL(
                    up.permitido,
                    0
                  )

                /*
                  Si no hay regla del usuario,
                  heredamos el permiso del rol.
                */
                WHEN rp.id IS NOT NULL
                THEN
                  ISNULL(
                    rp.permitido,
                    0
                  )

                ELSE
                  0

              END AS permitido

            FROM (
              SELECT
                @permiso
                  AS permiso_codigo
            ) p

            LEFT JOIN dbo.usuarios_permisos up
              ON up.usuario_id =
                 @usuario_id

              AND up.permiso_codigo =
                  p.permiso_codigo

            LEFT JOIN dbo.roles_permisos rp
              ON UPPER(
                   LTRIM(
                     RTRIM(
                       rp.rol
                     )
                   )
                 ) =
                 UPPER(
                   LTRIM(
                     RTRIM(
                       @rol
                     )
                   )
                 )

              AND rp.permiso_codigo =
                  p.permiso_codigo

          `);


        puedeVerCuarentena =
          Number(
            permisoResult
              .recordset?.[0]
              ?.permitido ||
            0
          ) === 1;

      }


      /* =========================================
         FILTRO DE SEGURIDAD
         ========================================= */

      const filtroCuarentena =
        puedeVerCuarentena
          ? ""
          : `
              WHERE
                UPPER(
                  LTRIM(
                    RTRIM(
                      i.bodega
                    )
                  )
                ) <> 'CUARENTENA'
            `;


      /* =========================================
         CONSULTA INVENTARIO
         ========================================= */

      const result =
        await pool
          .request()
          .query(`

            SELECT

              i.id,

              i.producto_id,

              i.bodega,

              i.stock,

              i.stock_minimo,

              i.ubicacion,

              i.responsable,

              i.observacion,

              i.fecha_actualizacion,

              p.codigo,

              p.producto,

              p.categoria,

              p.unidad,

              p.estado

            FROM dbo.inventario i

            INNER JOIN dbo.productos p
              ON i.producto_id =
                 p.id

            ${filtroCuarentena}

            ORDER BY
              i.id DESC

          `);


      res.json(
        result.recordset
      );


    } catch (error) {

      console.error(
        "ERROR LISTAR INVENTARIO:",
        error
      );


      res.status(500).json({
        error:
          "Error al obtener inventario"
      });

    }

  }
);

/* =========================================
   LISTAR DETALLE DE ENTRADAS / LOTES

   CUARENTENA:
   - ADMIN siempre puede verla.
   - Usuario con utilidades.cuarentena_ver
     puede verla.
   - Usuario sin ese permiso NO recibe
     lotes de CUARENTENA.
   ========================================= */

app.get("/api/detalle-entradas",

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

  async (req, res) => {

    try {

      const pool =
        await getPool();


      /* =========================================
         USUARIO ACTUAL
         ========================================= */

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);


      const usuarioId =
        Number(
          usuarioSesion?.id ||
          req.session?.usuario?.id ||
          req.session?.usuarioId ||
          0
        ) || null;


      const rol =
        String(
          usuarioSesion?.rol ||
          req.session?.usuario?.rol ||
          req.session?.rol ||
          ""
        )
          .trim()
          .toUpperCase();


      /* =========================================
         ¿PUEDE VER CUARENTENA?
         ========================================= */

      let puedeVerCuarentena =
        rol === "ADMIN";


      if (!puedeVerCuarentena) {

        const permisoResult =
          await pool
            .request()

            .input(
              "rol",
              sql.VarChar,
              rol
            )

            .input(
              "permiso",
              sql.VarChar,
              "utilidades.cuarentena_ver"
            )

            .input(
              "usuario_id",
              sql.Int,
              usuarioId
            )

            .query(`

              SELECT TOP 1

                CASE

                  /*
                    La configuración específica
                    del usuario tiene prioridad.
                  */
                  WHEN up.id IS NOT NULL
                  THEN
                    ISNULL(
                      up.permitido,
                      0
                    )


                  /*
                    Si no existe configuración
                    individual, heredamos del rol.
                  */
                  WHEN rp.id IS NOT NULL
                  THEN
                    ISNULL(
                      rp.permitido,
                      0
                    )


                  ELSE
                    0

                END AS permitido


              FROM (
                SELECT
                  @permiso
                    AS permiso_codigo
              ) p


              LEFT JOIN dbo.usuarios_permisos up
                ON up.usuario_id =
                   @usuario_id

                AND up.permiso_codigo =
                    p.permiso_codigo


              LEFT JOIN dbo.roles_permisos rp
                ON UPPER(
                     LTRIM(
                       RTRIM(
                         rp.rol
                       )
                     )
                   ) =
                   UPPER(
                     LTRIM(
                       RTRIM(
                         @rol
                       )
                     )
                   )

                AND rp.permiso_codigo =
                    p.permiso_codigo

            `);


        puedeVerCuarentena =
          Number(
            permisoResult
              .recordset?.[0]
              ?.permitido ||
            0
          ) === 1;

      }


      /* =========================================
         FILTRO DE SEGURIDAD
         ========================================= */

      const filtroCuarentena =
        puedeVerCuarentena
          ? ""
          : `

              WHERE
                UPPER(
                  LTRIM(
                    RTRIM(
                      ISNULL(
                        de.bodega,
                        ''
                      )
                    )
                  )
                ) <> 'CUARENTENA'

            `;


      /* =========================================
         CONSULTA DE LOTES
         ========================================= */

      const result =
        await pool
          .request()
          .query(`

            SELECT

              de.id,

              de.fecha_registro
                AS fecha,

              de.bodega,

              de.producto_id,

              de.codigo,

              de.codigoproveedor
                AS codigoProveedor,

              de.producto,

              de.categoria,

              de.cantidad,

              de.stock_lote
                AS stockLote,

              de.lote,

              de.vencimiento,

              de.casa_comercial
                AS casaComercial,

              de.stock_minimo
                AS stockMinimo,

              de.ubicacion,

              de.responsable,

              de.observacion

            FROM dbo.detalleEntradas de

            ${filtroCuarentena}

            ORDER BY
              de.id DESC

          `);


      res.json(
        result.recordset
      );


    } catch (error) {

      console.error(
        "ERROR LISTAR DETALLE ENTRADAS:",
        error
      );


      res.status(500).json({
        error:
          "Error al obtener lotes"
      });

    }

  }
);

/* =========================================================
   ENTRADA DE INVENTARIO
   ========================================================= */

app.post("/api/inventario/entrada",

  requireAuth,

  requirePermission(
    "inventario.entrada"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(
        pool
      );


    try {

      const {

        bodega,
        producto_id,
        registrarLote,
        codigoProveedor,
        cantidad,
        lote,
        vencimiento,
        casaComercial,
        stockMinimo,
        ubicacion,
        responsable,
        observacion,

        /* NUEVO */
        estadoCosto,
        costoUnitario,
        motivoSinCosto

      } = req.body;


      /* =====================================================
         1. VALIDACIONES BÁSICAS
         ===================================================== */

      const cantidadNumero =
        Number(
          cantidad
        );


      if (
        !bodega ||
        !producto_id ||
        !Number.isFinite(
          cantidadNumero
        ) ||
        cantidadNumero <= 0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos incompletos para la entrada"
          });

      }


      const manejaLote =
        registrarLote === true ||
        registrarLote === 1 ||
        registrarLote === "1" ||
        registrarLote === "true";


      if (
        manejaLote &&
        (
          !codigoProveedor ||
          !lote
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Complete código proveedor y lote"
          });

      }


      /* =====================================================
         2. VALIDACIÓN DEL COSTO
         ===================================================== */

      const estadoCostoFinal =
        String(
          estadoCosto ||
          "PENDIENTE"
        )
          .trim()
          .toUpperCase();


      const estadosPermitidos =
        [
          "CONOCIDO",
          "SIN_COSTO",
          "PENDIENTE"
        ];


      if (
        !estadosPermitidos.includes(
          estadoCostoFinal
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Estado de costo no válido"
          });

      }


      let costoUnitarioFinal =
        null;


      let motivoSinCostoFinal =
        null;


      if (
        estadoCostoFinal ===
        "CONOCIDO"
      ) {

        const costoNumero =
          Number(
            costoUnitario
          );


        if (
          !Number.isFinite(
            costoNumero
          ) ||
          costoNumero <= 0
        ) {

          return res
            .status(400)
            .json({
              error:
                "Ingrese un costo unitario válido mayor a 0"
            });

        }


        costoUnitarioFinal =
          costoNumero;

      }


      else if (
        estadoCostoFinal ===
        "SIN_COSTO"
      ) {

        costoUnitarioFinal =
          0;


        motivoSinCostoFinal =
          String(
            motivoSinCosto ||
            ""
          )
            .trim()
            .toUpperCase();


        if (
          !motivoSinCostoFinal
        ) {

          return res
            .status(400)
            .json({
              error:
                "Seleccione el motivo por el cual la entrada no tiene costo"
            });

        }

      }


      else {

        /* PENDIENTE */

        costoUnitarioFinal =
          null;

        motivoSinCostoFinal =
          null;

      }


      /* =====================================================
         3. INICIAR TRANSACCIÓN
         ===================================================== */

      await transaction.begin();


      /* =====================================================
         4. PRODUCTO
         ===================================================== */

      const productoResult =
        await new sql.Request(
          transaction
        )
          .input(
            "id",
            sql.Int,
            Number(
              producto_id
            )
          )
          .query(`

            SELECT TOP 1

              id,
              codigo,
              producto,
              categoria,
              unidad

            FROM dbo.productos

            WHERE
              id = @id

          `);


      if (
        !productoResult
          .recordset
          .length
      ) {

        throw new Error(
          "Producto no encontrado"
        );

      }


      const p =
        productoResult
          .recordset[0];


      /* =====================================================
         5. INVENTARIO GENERAL
         ===================================================== */

      const inventarioResult =
        await new sql.Request(
          transaction
        )
          .input(
            "producto_id",
            sql.Int,
            Number(
              producto_id
            )
          )
          .input(
            "bodega",
            sql.VarChar,
            String(
              bodega
            ).trim()
          )
          .query(`

            SELECT TOP 1

              id,
              stock

            FROM dbo.inventario
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE
              producto_id =
                @producto_id

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        bodega
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @bodega
                      )
                    )
                  )

          `);


      let inventarioId =
        null;


      /* =====================================================
         6. INVENTARIO YA EXISTE
         ===================================================== */

      if (
        inventarioResult
          .recordset
          .length
      ) {

        inventarioId =
          Number(
            inventarioResult
              .recordset[0]
              .id
          );


        await new sql.Request(
          transaction
        )
          .input(
            "id",
            sql.Int,
            inventarioId
          )
          .input(
            "cantidad",
            sql.Int,
            cantidadNumero
          )
          .input(
            "stock_minimo",
            sql.Int,
            Number(
              stockMinimo ||
              0
            )
          )
          .input(
            "ubicacion",
            sql.VarChar,
            ubicacion ||
            null
          )
          .input(
            "responsable",
            sql.VarChar,
            responsable ||
            req.session.usuario.username
          )
          .input(
            "observacion",
            sql.VarChar,
            observacion ||
            null
          )
          .query(`

            UPDATE dbo.inventario

            SET

              stock =
                ISNULL(
                  stock,
                  0
                ) +
                @cantidad,

              stock_minimo =
                @stock_minimo,

              ubicacion =
                @ubicacion,

              responsable =
                @responsable,

              observacion =
                @observacion,

              fecha_actualizacion =
                GETDATE()

            WHERE
              id = @id

          `);

      }


      /* =====================================================
         7. INVENTARIO NUEVO
         ===================================================== */

      else {

        const inventarioInsert =
          await new sql.Request(
            transaction
          )
            .input(
              "producto_id",
              sql.Int,
              Number(
                producto_id
              )
            )
            .input(
              "bodega",
              sql.VarChar,
              String(
                bodega
              ).trim()
            )
            .input(
              "stock",
              sql.Int,
              cantidadNumero
            )
            .input(
              "stock_minimo",
              sql.Int,
              Number(
                stockMinimo ||
                0
              )
            )
            .input(
              "ubicacion",
              sql.VarChar,
              ubicacion ||
              null
            )
            .input(
              "responsable",
              sql.VarChar,
              responsable ||
              req.session.usuario.username
            )
            .input(
              "observacion",
              sql.VarChar,
              observacion ||
              null
            )
            .query(`

              INSERT INTO dbo.inventario (

                producto_id,
                bodega,
                stock,
                stock_minimo,
                ubicacion,
                responsable,
                observacion

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @producto_id,
                @bodega,
                @stock,
                @stock_minimo,
                @ubicacion,
                @responsable,
                @observacion

              )

            `);


        inventarioId =
          Number(
            inventarioInsert
              .recordset[0]
              .id
          );

      }


      /* =====================================================
         8. CONTROL FÍSICO DEL LOTE
         ===================================================== */

      let vencimientoFinal =
        manejaLote
          ? (
              vencimiento ||
              null
            )
          : null;


      let stockLoteFinal =
        0;


      if (
        manejaLote
      ) {

        const lotePrevioResult =
          await new sql.Request(
            transaction
          )
            .input(
              "producto_id",
              sql.Int,
              Number(
                producto_id
              )
            )
            .input(
              "bodega",
              sql.VarChar,
              String(
                bodega
              ).trim()
            )
            .input(
              "codigoproveedor",
              sql.VarChar,
              String(
                codigoProveedor
              ).trim()
            )
            .input(
              "lote",
              sql.VarChar,
              String(
                lote
              ).trim()
            )
            .query(`

              SELECT TOP 1

                id,
                stock_lote,
                vencimiento

              FROM dbo.detalleEntradas
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              WHERE

                producto_id =
                  @producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          bodega
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(
                          @bodega
                        )
                      )
                    )

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(
                            codigoproveedor,
                            ''
                          )
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(
                          @codigoproveedor
                        )
                      )
                    )

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(
                            lote,
                            ''
                          )
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(
                          @lote
                        )
                      )
                    )

              ORDER BY
                id DESC

            `);


        if (
          lotePrevioResult
            .recordset
            .length
        ) {

          const lotePrevio =
            lotePrevioResult
              .recordset[0];


          if (
            !vencimientoFinal &&
            lotePrevio.vencimiento
          ) {

            vencimientoFinal =
              lotePrevio.vencimiento;

          }


          stockLoteFinal =
            Number(
              lotePrevio.stock_lote ||
              0
            ) +
            cantidadNumero;

        }


        else {

          if (
            !vencimientoFinal
          ) {

            throw new Error(
              "Ingrese la fecha de vencimiento para un lote nuevo"
            );

          }


          stockLoteFinal =
            cantidadNumero;

        }

      }


      /* =====================================================
         9. MOVIMIENTO EN detalleEntradas

         Ahora obtenemos el ID de la fila creada.
         ===================================================== */

      const detalleInsert =
        await new sql.Request(
          transaction
        )
          .input(
            "bodega",
            sql.VarChar,
            String(
              bodega
            ).trim()
          )
          .input(
            "producto_id",
            sql.Int,
            Number(
              producto_id
            )
          )
          .input(
            "codigo",
            sql.VarChar,
            p.codigo
          )
          .input(
            "codigoProveedor",
            sql.VarChar,
            manejaLote
              ? String(
                  codigoProveedor
                ).trim()
              : null
          )
          .input(
            "producto",
            sql.VarChar,
            p.producto
          )
          .input(
            "categoria",
            sql.VarChar,
            p.categoria ||
            null
          )
          .input(
            "cantidad",
            sql.Int,
            cantidadNumero
          )
          .input(
            "stock_lote",
            sql.Int,
            stockLoteFinal
          )
          .input(
            "lote",
            sql.VarChar,
            manejaLote
              ? String(
                  lote
                ).trim()
              : null
          )
          .input(
            "vencimiento",
            sql.Date,
            vencimientoFinal
          )
          .input(
            "casa_comercial",
            sql.VarChar,
            manejaLote
              ? (
                  casaComercial ||
                  null
                )
              : null
          )
          .input(
            "stock_minimo",
            sql.Int,
            Number(
              stockMinimo ||
              0
            )
          )
          .input(
            "ubicacion",
            sql.VarChar,
            ubicacion ||
            null
          )
          .input(
            "responsable",
            sql.VarChar,
            responsable ||
            req.session.usuario.username
          )
          .input(
            "observacion",
            sql.VarChar,
            observacion ||
            null
          )
          .input(
            "origen_movimiento",
            sql.VarChar,
            "ENTRADA_MANUAL"
          )
          .query(`

            INSERT INTO dbo.detalleEntradas (

              bodega,
              producto_id,
              codigo,
              codigoproveedor,
              producto,
              categoria,
              cantidad,
              stock_lote,
              lote,
              vencimiento,
              casa_comercial,
              stock_minimo,
              ubicacion,
              responsable,
              observacion,
              origen_movimiento

            )

            OUTPUT
              INSERTED.id

            VALUES (

              @bodega,
              @producto_id,
              @codigo,
              @codigoProveedor,
              @producto,
              @categoria,
              @cantidad,
              @stock_lote,
              @lote,
              @vencimiento,
              @casa_comercial,
              @stock_minimo,
              @ubicacion,
              @responsable,
              @observacion,
              @origen_movimiento

            )

          `);


      const detalleEntradaId =
        Number(
          detalleInsert
            .recordset[0]
            .id
        );


      /* =====================================================
         10. CREAR CAPA DE COSTO

         IMPORTANTE:
         SIEMPRE se crea una capa.

         Aunque:
         - no tenga lote
         - no sepamos el costo
         - sea una donación
         ===================================================== */

      await new sql.Request(
        transaction
      )
        .input(
          "producto_id",
          sql.Int,
          Number(
            producto_id
          )
        )
        .input(
          "bodega",
          sql.VarChar,
          String(
            bodega
          ).trim()
        )
        .input(
          "lote",
          sql.VarChar,
          manejaLote
            ? String(
                lote
              ).trim()
            : null
        )
        .input(
          "fecha_vencimiento",
          sql.Date,
          vencimientoFinal
        )
        .input(
          "origen",
          sql.VarChar,
          "ENTRADA_MANUAL"
        )
        .input(
          "origen_id",
          sql.Int,
          detalleEntradaId
        )
        .input(
          "estado_costo",
          sql.VarChar,
          estadoCostoFinal
        )
        .input(
          "costo_unitario",
          sql.Decimal(
            18,
            6
          ),
          costoUnitarioFinal
        )
        .input(
          "motivo_sin_costo",
          sql.VarChar,
          motivoSinCostoFinal
        )
        .input(
          "cantidad_original",
          sql.Decimal(
            18,
            4
          ),
          cantidadNumero
        )
        .input(
          "cantidad_disponible",
          sql.Decimal(
            18,
            4
          ),
          cantidadNumero
        )
        .input(
          "observacion",
          sql.VarChar,
          observacion ||
          null
        )
        .input(
          "usuario_creacion",
          sql.VarChar,
          req.session.usuario.username
        )
        .query(`

          INSERT INTO dbo.capas_costo_inventario (

            producto_id,
            bodega,
            lote,
            fecha_vencimiento,

            origen,
            origen_id,

            estado_costo,
            costo_unitario,
            motivo_sin_costo,

            cantidad_original,
            cantidad_disponible,

            observacion,
            usuario_creacion

          )

          VALUES (

            @producto_id,
            @bodega,
            @lote,
            @fecha_vencimiento,

            @origen,
            @origen_id,

            @estado_costo,
            @costo_unitario,
            @motivo_sin_costo,

            @cantidad_original,
            @cantidad_disponible,

            @observacion,
            @usuario_creacion

          )

        `);


      /* =====================================================
         NOTA IMPORTANTE

         Aquí deliberadamente NO recalculamos
         inventario.stock sumando solamente lotes.

         El stock general ya fue incrementado arriba.

         Esto permite:

         Producto X:
         5 unidades con lote
         +
         10 unidades sin lote

         inventario.stock = 15

         sin perder las 10 unidades sin lote.
         ===================================================== */


      /* =====================================================
         11. AUDITORÍA
         ===================================================== */

      try {

        let detalleCosto =
          "Costo pendiente";


        if (
          estadoCostoFinal ===
          "CONOCIDO"
        ) {

          detalleCosto =
            `Costo unitario: $${Number(
              costoUnitarioFinal
            ).toFixed(2)}`;

        }


        else if (
          estadoCostoFinal ===
          "SIN_COSTO"
        ) {

          detalleCosto =
            `Sin costo (${motivoSinCostoFinal})`;

        }


        await new sql.Request(
          transaction
        )
          .input(
            "usuario",
            sql.VarChar,
            req.session.usuario.username
          )
          .input(
            "modulo",
            sql.VarChar,
            "INVENTARIO"
          )
          .input(
            "accion",
            sql.VarChar,
            "ENTRADA INVENTARIO"
          )
          .input(
            "detalle",
            sql.VarChar,
            `${
              p.codigo
            } - ${
              p.producto
            } / ${
              bodega
            } / +${
              cantidadNumero
            } / ${
              detalleCosto
            }`
          )
          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         12. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        inventarioId,

        detalleEntradaId,

        estadoCosto:
          estadoCostoFinal,

        costoUnitario:
          costoUnitarioFinal

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR ENTRADA INVENTARIO:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al registrar entrada"

        });

    }

  }
);

app.get("/api/inventario/salidas",
  requireAuth,
  requirePermission(
    "inventario.salida"
  ),
  async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        id,
        bodega,
        codigo,
        producto,
        categoria,
        cantidad,
        lote,
        codigoproveedor,
        fecha_expiracion,
        motivo,
        responsable,
        fecha_creacion
      FROM dbo.salidas_inventario
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR SALIDAS:", error);
    res.status(500).json({ error: "Error al obtener salidas" });
  }
});

/* =========================================================
   SALIDA DE INVENTARIO
   ========================================================= */

app.post("/api/inventario/salida",

  requireAuth,

  requirePermission(
    "inventario.salida"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(pool);


    try {

      const {
        bodega,
        inventario_id,
        detalleLoteId,
        cantidad,
        motivo,
        responsable
      } = req.body;


      const cantidadNumero =
        Number(cantidad);


      const responsableFinal =
        String(
          responsable ||
          req.session.usuario?.username ||
          ""
        ).trim();


      /* =====================================================
         1. VALIDACIONES
         ===================================================== */

      if (
        !bodega ||
        !inventario_id ||
        !Number.isFinite(cantidadNumero) ||
        cantidadNumero <= 0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos incompletos para la salida"
          });

      }


      await transaction.begin();


      /* =====================================================
         2. INVENTARIO FÍSICO
         ===================================================== */

      const inventarioResult =
        await new sql.Request(transaction)

          .input(
            "id",
            sql.Int,
            Number(inventario_id)
          )

          .query(`

            SELECT TOP 1

              i.id,
              i.producto_id,
              i.bodega,
              i.stock,

              p.codigo,
              p.producto,
              p.categoria

            FROM dbo.inventario i
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            INNER JOIN dbo.productos p
              ON p.id =
                 i.producto_id

            WHERE
              i.id = @id

          `);


      if (
        !inventarioResult
          .recordset
          .length
      ) {

        throw new Error(
          "Producto no encontrado en inventario"
        );

      }


      const inv =
        inventarioResult
          .recordset[0];


      /* =====================================================
         3. VALIDAR BODEGA
         ===================================================== */

      if (
        String(inv.bodega || "")
          .trim()
          .toUpperCase()
        !==
        String(bodega || "")
          .trim()
          .toUpperCase()
      ) {

        throw new Error(
          "El producto no pertenece a la bodega seleccionada"
        );

      }


      /* =====================================================
         4. VALIDAR STOCK GENERAL
         ===================================================== */

      if (
        Number(inv.stock || 0) <
        cantidadNumero
      ) {

        throw new Error(
          `Stock insuficiente para ${inv.producto}`
        );

      }


      /* =====================================================
         DATOS DEL LOTE FÍSICO
         ===================================================== */

      let lote =
        null;

      let codigoProveedor =
        null;

      let casaComercial =
        null;

      let fechaExp =
        null;

      let manejaLote =
        false;


      /* =====================================================
         5. SI EL USUARIO SELECCIONÓ LOTE
         ===================================================== */

      if (
        detalleLoteId !== null &&
        detalleLoteId !== undefined &&
        detalleLoteId !== ""
      ) {

        manejaLote =
          true;


        const loteBaseResult =
          await new sql.Request(transaction)

            .input(
              "id",
              sql.Int,
              Number(detalleLoteId)
            )

            .query(`

              SELECT TOP 1

                id,
                producto_id,
                bodega,
                codigoproveedor,
                lote,
                vencimiento,
                casa_comercial

              FROM dbo.detalleEntradas

              WHERE
                id = @id

            `);


        if (
          !loteBaseResult
            .recordset
            .length
        ) {

          throw new Error(
            "Lote no encontrado"
          );

        }


        const loteBase =
          loteBaseResult
            .recordset[0];


        if (
          Number(loteBase.producto_id)
          !==
          Number(inv.producto_id)
        ) {

          throw new Error(
            "El lote seleccionado no pertenece al producto"
          );

        }


        if (
          String(loteBase.bodega || "")
            .trim()
            .toUpperCase()
          !==
          String(inv.bodega || "")
            .trim()
            .toUpperCase()
        ) {

          throw new Error(
            "El lote seleccionado no pertenece a la bodega"
          );

        }


        /* ===================================================
           BUSCAR ESTADO VIGENTE DEL LOTE
           =================================================== */

        const loteVigenteResult =
          await new sql.Request(transaction)

            .input(
              "producto_id",
              sql.Int,
              Number(inv.producto_id)
            )

            .input(
              "bodega",
              sql.VarChar,
              String(inv.bodega).trim()
            )

            .input(
              "codigoproveedor",
              sql.VarChar,
              loteBase.codigoproveedor || ""
            )

            .input(
              "lote",
              sql.VarChar,
              loteBase.lote || ""
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              loteBase.casa_comercial || ""
            )

            .query(`

              SELECT TOP 1

                id,
                codigoproveedor,
                lote,
                vencimiento,
                casa_comercial,
                stock_lote

              FROM dbo.detalleEntradas
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              WHERE

                producto_id =
                  @producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(bodega)
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@bodega)
                      )
                    )

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(
                            codigoproveedor,
                            ''
                          )
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(
                          @codigoproveedor
                        )
                      )
                    )

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(lote, '')
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@lote)
                      )
                    )

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(
                            casa_comercial,
                            ''
                          )
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(
                          @casa_comercial
                        )
                      )
                    )

              ORDER BY
                id DESC

            `);


        if (
          !loteVigenteResult
            .recordset
            .length
        ) {

          throw new Error(
            "No se encontró saldo vigente para el lote"
          );

        }


        const loteData =
          loteVigenteResult
            .recordset[0];


        if (
          Number(
            loteData.stock_lote || 0
          ) <
          cantidadNumero
        ) {

          throw new Error(
            `Stock insuficiente en lote para ${inv.producto}`
          );

        }


        lote =
          loteData.lote || null;


        codigoProveedor =
          loteData.codigoproveedor ||
          null;


        casaComercial =
          loteData.casa_comercial ||
          null;


        fechaExp =
          loteData.vencimiento ||
          null;


        /* ===================================================
           6. DESCONTAR STOCK DEL LOTE FÍSICO
           =================================================== */

        await new sql.Request(transaction)

          .input(
            "id",
            sql.Int,
            Number(loteData.id)
          )

          .input(
            "cantidad",
            sql.Int,
            cantidadNumero
          )

          .query(`

            UPDATE dbo.detalleEntradas

            SET
              stock_lote =
                ISNULL(
                  stock_lote,
                  0
                ) -
                @cantidad

            WHERE
              id = @id

          `);

      }


      /* =====================================================
         7. BUSCAR CAPAS DISPONIBLES

         CON LOTE:
         solo capas del lote físicamente usado.

         SIN LOTE:
         solo capas sin lote.

         Dentro de la selección se consume FIFO.
         ===================================================== */

      const requestCapas =
        new sql.Request(
          transaction
        );


      requestCapas.input(
        "producto_id",
        sql.Int,
        Number(inv.producto_id)
      );


      requestCapas.input(
        "bodega",
        sql.VarChar,
        String(inv.bodega).trim()
      );


      requestCapas.input(
        "lote",
        sql.VarChar,
        lote || ""
      );


      requestCapas.input(
        "codigo_proveedor",
        sql.VarChar,
        codigoProveedor || ""
      );


      requestCapas.input(
        "casa_comercial",
        sql.VarChar,
        casaComercial || ""
      );


      const filtroTipoExistencia =
        manejaLote

          ? `

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          c.lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )

              /*
                Si la capa tiene registrados
                proveedor/casa, exigimos que
                coincidan con la existencia física.

                Si están NULL por datos de prueba
                antiguos, el lote sigue permitiendo
                localizarla.
              */

              AND
              (
                c.codigo_proveedor IS NULL

                OR UPPER(
                     LTRIM(
                       RTRIM(
                         c.codigo_proveedor
                       )
                     )
                   ) =
                   UPPER(
                     LTRIM(
                       RTRIM(
                         @codigo_proveedor
                       )
                     )
                   )
              )

              AND
              (
                c.casa_comercial IS NULL

                OR UPPER(
                     LTRIM(
                       RTRIM(
                         c.casa_comercial
                       )
                     )
                   ) =
                   UPPER(
                     LTRIM(
                       RTRIM(
                         @casa_comercial
                       )
                     )
                   )
              )

            `

          : `

              AND
              (
                c.lote IS NULL

                OR LTRIM(
                     RTRIM(c.lote)
                   ) = ''
              )

            `;


      const capasResult =
        await requestCapas.query(`

          SELECT

            c.id,

            c.cantidad_disponible,

            c.estado_costo,

            c.costo_unitario,

            c.motivo_sin_costo,

            c.lote,

            c.fecha_vencimiento,

            c.fecha_entrada,

            c.origen,

            c.origen_id

          FROM dbo.capas_costo_inventario c
            WITH (
              UPDLOCK,
              HOLDLOCK
            )

          WHERE

            c.producto_id =
              @producto_id

            AND UPPER(
                  LTRIM(
                    RTRIM(c.bodega)
                  )
                ) =
                UPPER(
                  LTRIM(
                    RTRIM(@bodega)
                  )
                )

            AND c.cantidad_disponible > 0

            ${filtroTipoExistencia}

          ORDER BY

            c.fecha_entrada ASC,

            c.id ASC

        `);


      const capas =
        capasResult.recordset;


      const totalDisponibleCapas =
        capas.reduce(
          (suma, capa) =>
            suma +
            Number(
              capa.cantidad_disponible ||
              0
            ),
          0
        );


      if (
        totalDisponibleCapas <
        cantidadNumero
      ) {

        throw new Error(
          manejaLote
            ? `Las capas de costo del lote seleccionado solo tienen ${totalDisponibleCapas} unidades disponibles.`
            : `Las capas de costo sin lote solo tienen ${totalDisponibleCapas} unidades disponibles.`
        );

      }


      /* =====================================================
         8. DESCONTAR STOCK GENERAL

         SIEMPRE directamente.

         No se recalcula desde lotes porque un
         producto puede mezclar existencia
         con lote y sin lote.
         ===================================================== */

      await new sql.Request(transaction)

        .input(
          "id",
          sql.Int,
          Number(inventario_id)
        )

        .input(
          "cantidad",
          sql.Int,
          cantidadNumero
        )

        .query(`

          UPDATE dbo.inventario

          SET

            stock =
              ISNULL(stock, 0)
              -
              @cantidad,

            fecha_actualizacion =
              GETDATE()

          WHERE
            id = @id

        `);


      /* =====================================================
         9. REGISTRAR SALIDA Y OBTENER ID
         ===================================================== */

      const salidaResult =
        await new sql.Request(transaction)

          .input(
            "inventario_id",
            sql.Int,
            Number(inventario_id)
          )

          .input(
            "producto_id",
            sql.Int,
            Number(inv.producto_id)
          )

          .input(
            "bodega",
            sql.VarChar,
            inv.bodega
          )

          .input(
            "codigo",
            sql.VarChar,
            inv.codigo
          )

          .input(
            "producto",
            sql.VarChar,
            inv.producto
          )

          .input(
            "categoria",
            sql.VarChar,
            inv.categoria || null
          )

          .input(
            "cantidad",
            sql.Int,
            cantidadNumero
          )

          .input(
            "lote",
            sql.VarChar,
            lote
          )

          .input(
            "codigoproveedor",
            sql.VarChar,
            codigoProveedor
          )

          .input(
            "fecha_expiracion",
            sql.Date,
            fechaExp
          )

          .input(
            "motivo",
            sql.VarChar,
            motivo || null
          )

          .input(
            "responsable",
            sql.VarChar,
            responsableFinal
          )

          .query(`

            INSERT INTO dbo.salidas_inventario (

              inventario_id,
              producto_id,
              bodega,
              codigo,
              producto,
              categoria,
              cantidad,
              lote,
              codigoproveedor,
              fecha_expiracion,
              motivo,
              responsable

            )

            OUTPUT
              INSERTED.id

            VALUES (

              @inventario_id,
              @producto_id,
              @bodega,
              @codigo,
              @producto,
              @categoria,
              @cantidad,
              @lote,
              @codigoproveedor,
              @fecha_expiracion,
              @motivo,
              @responsable

            )

          `);


      const salidaId =
        Number(
          salidaResult
            .recordset[0]
            .id
        );


      const documentoSalida =
        `SALIDA-${salidaId}`;


      /* =====================================================
         10. CONSUMIR CAPAS
         ===================================================== */

      let cantidadPendiente =
        cantidadNumero;


      let valorConocidoSalida =
        0;


      let cantidadCostoPendiente =
        0;


      const detalleCapasConsumidas =
        [];


      for (
        const capa of capas
      ) {

        if (
          cantidadPendiente <= 0
        ) {
          break;
        }


        const disponible =
          Number(
            capa.cantidad_disponible ||
            0
          );


        if (
          disponible <= 0
        ) {
          continue;
        }


        const consumir =
          Math.min(
            disponible,
            cantidadPendiente
          );


        const nuevoSaldoCapa =
          disponible -
          consumir;


        /* =====================================
           ACTUALIZAR CAPA
           ===================================== */

        await new sql.Request(transaction)

          .input(
            "id",
            sql.Int,
            Number(capa.id)
          )

          .input(
            "nuevo_saldo",
            sql.Decimal(18, 4),
            nuevoSaldoCapa
          )

          .query(`

            UPDATE dbo.capas_costo_inventario

            SET
              cantidad_disponible =
                @nuevo_saldo

            WHERE
              id = @id

          `);


        /* =====================================
           COSTO DE ESTA PORCIÓN
           ===================================== */

        const costoCapa =
          capa.costo_unitario === null ||
          capa.costo_unitario === undefined

            ? null

            : Number(
                capa.costo_unitario
              );


        const valorPorcion =
          costoCapa === null

            ? null

            : consumir *
              costoCapa;


        if (
          valorPorcion !== null
        ) {

          valorConocidoSalida +=
            valorPorcion;

        }

        else {

          cantidadCostoPendiente +=
            consumir;

        }


        /* =====================================
           REGISTRAR HISTORIAL ECONÓMICO
           ===================================== */

        await new sql.Request(transaction)

          .input(
            "capa_id",
            sql.Int,
            Number(capa.id)
          )

          .input(
            "producto_id",
            sql.Int,
            Number(inv.producto_id)
          )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "SALIDA"
          )

          .input(
            "documento",
            sql.VarChar,
            documentoSalida
          )

          .input(
            "documento_id",
            sql.Int,
            salidaId
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            inv.bodega
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            null
          )

          .input(
            "lote",
            sql.VarChar,
            capa.lote || null
          )

          .input(
            "cantidad",
            sql.Decimal(18, 4),
            consumir
          )

          .input(
            "costo_unitario",
            sql.Decimal(18, 6),
            costoCapa
          )

          .input(
            "valor_movimiento",
            sql.Decimal(18, 6),
            valorPorcion
          )

          .input(
            "estado_costo",
            sql.VarChar,
            capa.estado_costo
          )

          .input(
            "usuario",
            sql.VarChar,
            responsableFinal
          )

          .input(
            "observacion",
            sql.VarChar,
            motivo || null
          )

          .query(`

            INSERT INTO dbo.movimientos_capas_costo (

              capa_id,
              producto_id,

              tipo_movimiento,

              documento,
              documento_id,

              bodega_origen,
              bodega_destino,

              lote,

              cantidad,

              costo_unitario,
              valor_movimiento,
              estado_costo,

              usuario,
              observacion

            )

            VALUES (

              @capa_id,
              @producto_id,

              @tipo_movimiento,

              @documento,
              @documento_id,

              @bodega_origen,
              @bodega_destino,

              @lote,

              @cantidad,

              @costo_unitario,
              @valor_movimiento,
              @estado_costo,

              @usuario,
              @observacion

            )

          `);


        detalleCapasConsumidas.push({

          capa_id:
            Number(capa.id),

          cantidad:
            consumir,

          costo_unitario:
            costoCapa,

          valor:
            valorPorcion,

          estado_costo:
            capa.estado_costo

        });


        cantidadPendiente -=
          consumir;

      }


      if (
        cantidadPendiente > 0.0001
      ) {

        throw new Error(
          "No fue posible distribuir completamente la salida entre las capas de costo"
        );

      }


      /* =====================================================
         11. AUDITORÍA
         ===================================================== */

      try {

        let textoCosto =
          `Costo conocido salida: $${valorConocidoSalida.toFixed(2)}`;


        if (
          cantidadCostoPendiente > 0
        ) {

          textoCosto +=
            ` / ${cantidadCostoPendiente} unidad(es) con costo pendiente`;

        }


        await new sql.Request(transaction)

          .input(
            "usuario",
            sql.VarChar,
            req.session.usuario.username
          )

          .input(
            "modulo",
            sql.VarChar,
            "INVENTARIO"
          )

          .input(
            "accion",
            sql.VarChar,
            "SALIDA INVENTARIO"
          )

          .input(
            "detalle",
            sql.VarChar,
            `${inv.codigo} - ${inv.producto} / ${bodega} / -${cantidadNumero} / ${textoCosto}`
          )

          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         12. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        salida_id:
          salidaId,

        documento:
          documentoSalida,

        cantidad:
          cantidadNumero,

        valor_conocido:
          valorConocidoSalida,

        cantidad_costo_pendiente:
          cantidadCostoPendiente,

        capas_consumidas:
          detalleCapasConsumidas

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR SALIDA INVENTARIO:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al registrar salida"

        });

    }

  }
);
/* =========================================
   ENDPOINT DE KARDEX
   ========================================= */

app.get("/api/kardex",

  requireAuth,

  requirePermission(
    "inventario.kardex"
  ),

  async (req, res) => {

    try {

      const pool =
        await getPool();


      /* =========================================
         1. COMPRAS
         ========================================= */

      const compras =
        await pool.request().query(`

          SELECT

            CONVERT(
              VARCHAR(10),
              c.fecha_compra,
              23
            ) AS fecha,

            c.fecha_compra
              AS fecha_orden,

            'COMPRA'
              AS tipo,

            c.numero_compra
              AS documento,

            c.bodega,

            cd.codigo,

            cd.producto,

            cd.cantidad
              AS entrada,

            0
              AS salida,

            CAST(
              cd.precio_unitario
              AS DECIMAL(18,4)
            ) AS costo_unitario

          FROM dbo.compras_detalle cd

          INNER JOIN dbo.compras c
            ON c.id =
               cd.compra_id

        `);


      /* =========================================
         2. ENTRADAS MANUALES

         IMPORTANTE:
         detalleEntradas puede contener:

         ENTRADA_MANUAL
         COMPRA
         TRASLADO
         CUARENTENA
         LIBERACION_CUARENTENA

         Únicamente ENTRADA_MANUAL
         constituye aquí una entrada Kardex.
         ========================================= */

      const entradasInventario =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        de.fecha_registro,
        23
      ) AS fecha,

      de.fecha_registro
        AS fecha_orden,

      'ENTRADA'
        AS tipo,

      CONCAT(
        'ENTRADA-',
        de.id
      ) AS documento,

      de.bodega,

      de.codigo,

      de.producto,

      de.cantidad
        AS entrada,

      0
        AS salida,


      /* ========================================
         COSTO REAL DE ESTA ENTRADA

         Se obtiene de la capa creada
         específicamente por esta entrada.
         ======================================== */

      CAST(
        CASE

          WHEN cci.estado_costo =
               'CONOCIDO'
          THEN
            cci.costo_unitario

          WHEN cci.estado_costo =
               'SIN_COSTO'
          THEN
            0

          ELSE
            NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      cci.estado_costo,

      cci.motivo_sin_costo,

      cci.id
        AS capa_costo_id


    FROM dbo.detalleEntradas de


    LEFT JOIN dbo.capas_costo_inventario cci

      ON cci.origen =
         'ENTRADA_MANUAL'

      AND cci.origen_id =
          de.id


    WHERE

      de.origen_movimiento =
        'ENTRADA_MANUAL'

  `);

      /* =========================================
   3. SALIDAS MANUALES

   El costo real se obtiene de los
   movimientos de capas consumidos por
   cada salida.

   Una salida puede consumir una o varias
   capas con costos distintos.
   ========================================= */

const salidas =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        s.fecha_creacion,
        23
      ) AS fecha,

      s.fecha_creacion
        AS fecha_orden,

      'SALIDA'
        AS tipo,

      CONCAT(
        'SALIDA-',
        s.id
      ) AS documento,

      s.id
        AS documento_id,

      s.bodega,

      s.codigo,

      s.producto,

      0
        AS entrada,

      s.cantidad
        AS salida,


      /* =====================================
         COSTO UNITARIO

         Si todos los consumos tienen
         un único costo, se muestra.

         Si existen varios costos,
         queda NULL para mostrar
         "Ver detalle".
         ===================================== */

      CAST(
        CASE

          WHEN mc.cantidad_costos = 1
          THEN mc.costo_unico

          ELSE NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      /* =====================================
         VALOR REAL DEL MOVIMIENTO
         ===================================== */

      CAST(
        mc.valor_total
        AS DECIMAL(18,4)
      ) AS valor_movimiento_directo,


      /* =====================================
         CANTIDAD DE COSTOS DIFERENTES
         ===================================== */

      ISNULL(
        mc.cantidad_costos,
        0
      ) AS cantidad_costos,


      /* =====================================
         CANTIDAD DE CAPAS CONSUMIDAS

         Esto sirve incluso si dos capas
         diferentes tienen el mismo costo.
         ===================================== */

      ISNULL(
        mc.cantidad_capas,
        0
      ) AS cantidad_capas


    FROM dbo.salidas_inventario s


    OUTER APPLY
    (

      SELECT

        SUM(
          mcc.valor_movimiento
        ) AS valor_total,


        COUNT(
          DISTINCT
          CASE

            WHEN mcc.costo_unitario
                 IS NOT NULL

            THEN mcc.costo_unitario

          END
        ) AS cantidad_costos,


        COUNT(
          mcc.id
        ) AS cantidad_capas,


        MIN(
          mcc.costo_unitario
        ) AS costo_unico


      FROM dbo.movimientos_capas_costo mcc


      WHERE

        mcc.tipo_movimiento =
          'SALIDA'

        AND mcc.documento_id =
            s.id

    ) mc


  `);


   /* =========================================
   4. DESCARGOS

   El costo real proviene de las capas
   consumidas por cada descargos_detalle.
   ========================================= */

const descargos =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        dd.fecha_creacion,
        23
      ) AS fecha,

      dd.fecha_creacion
        AS fecha_orden,

      'DESCARGO'
        AS tipo,

      dd.numero_descargo
        AS documento,


      /* =====================================
         IMPORTANTE

         documento_id aquí es
         descargos_detalle.id

         porque cada producto del descargo
         puede consumir capas diferentes.
         ===================================== */

      dd.id
        AS documento_id,


      /* =====================================
         BODEGA FÍSICA
         ===================================== */

      i.bodega
        AS bodega,


      /* =====================================
         ÁREA DEL DESCARGO
         ===================================== */

      d.origen
        AS area_origen,


      dd.codigo,

      dd.producto,

      0
        AS entrada,

      dd.cantidad
        AS salida,


      /* =====================================
         COSTO UNITARIO

         Si todos los consumos tienen
         un único costo, se muestra.

         Si existen varios costos,
         queda NULL para mostrar
         "Ver detalle".
         ===================================== */

      CAST(
        CASE

          WHEN mc.cantidad_costos = 1
          THEN mc.costo_unico

          ELSE NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      /* =====================================
         VALOR REAL DEL DESCARGO
         ===================================== */

      CAST(
        mc.valor_total
        AS DECIMAL(18,4)
      ) AS valor_movimiento_directo,


      /* =====================================
         CANTIDAD DE COSTOS DIFERENTES
         ===================================== */

      ISNULL(
        mc.cantidad_costos,
        0
      ) AS cantidad_costos,


      /* =====================================
         CANTIDAD DE CAPAS CONSUMIDAS
         ===================================== */

      ISNULL(
        mc.cantidad_capas,
        0
      ) AS cantidad_capas


    FROM dbo.descargos_detalle dd


    INNER JOIN dbo.descargos d

      ON d.id =
         dd.descargo_id


    INNER JOIN dbo.inventario i

      ON i.id =
         dd.inventario_id


    OUTER APPLY
    (

      SELECT

        SUM(
          mcc.valor_movimiento
        ) AS valor_total,


        COUNT(
          DISTINCT
          CASE

            WHEN mcc.costo_unitario
                 IS NOT NULL

            THEN mcc.costo_unitario

          END
        ) AS cantidad_costos,


        COUNT(
          mcc.id
        ) AS cantidad_capas,


        MIN(
          mcc.costo_unitario
        ) AS costo_unico


      FROM dbo.movimientos_capas_costo mcc


      WHERE

        mcc.tipo_movimiento =
          'DESCARGO'

        AND mcc.documento_id =
            dd.id

    ) mc

  `);

      

      /* =========================================
   5. TRASLADOS - SALIDA

   El valor sale de las capas económicas
   trasladadas desde la bodega origen.
   ========================================= */

              const trasladosSalida =
                await pool.request().query(`

                  SELECT

                    CONVERT(
                      VARCHAR(10),
                      t.fecha_creacion,
                      23
                    ) AS fecha,

                    t.fecha_creacion
                      AS fecha_orden,

                    'TRASLADO SALIDA'
                      AS tipo,

                    t.numero_traslado
                      AS documento,


                    /* =====================================
                      IMPORTANTE

                      El movimiento de capas utiliza
                      traslados_detalle.id
                      ===================================== */

                    td.id
                      AS documento_id,


                    t.bodega_origen
                      AS bodega,


                    td.codigo,

                    td.producto,


                    0
                      AS entrada,


                    td.cantidad
                      AS salida,


                    /* =====================================
                      COSTO UNITARIO

                      Una sola composición de costo:
                      mostramos costo.

                      Varias capas:
                      NULL → Ver detalle.
                      ===================================== */

                    CAST(
                      CASE

                        WHEN mc.cantidad_costos = 1
                        THEN mc.costo_unico

                        ELSE NULL

                      END
                      AS DECIMAL(18,4)
                    ) AS costo_unitario,


                    /* =====================================
                      VALOR TOTAL QUE SALE
                      ===================================== */

                    CAST(
                      mc.valor_total
                      AS DECIMAL(18,4)
                    ) AS valor_movimiento_directo,


                    ISNULL(
                      mc.cantidad_costos,
                      0
                    ) AS cantidad_costos,


                    ISNULL(
                      mc.cantidad_capas,
                      0
                    ) AS cantidad_capas


                  FROM dbo.traslados_detalle td


                  INNER JOIN dbo.traslados t

                    ON t.id =
                      td.traslado_id


                  OUTER APPLY
                  (

                    SELECT

                      SUM(
                        mcc.valor_movimiento
                      ) AS valor_total,


                      COUNT(
                        DISTINCT
                        CASE

                          WHEN mcc.costo_unitario
                              IS NOT NULL

                          THEN mcc.costo_unitario

                        END
                      ) AS cantidad_costos,


                      COUNT(
                        mcc.id
                      ) AS cantidad_capas,


                      MIN(
                        mcc.costo_unitario
                      ) AS costo_unico


                    FROM dbo.movimientos_capas_costo mcc


                    WHERE

                      mcc.tipo_movimiento =
                        'TRASLADO_SALIDA'

                      AND mcc.documento_id =
                          td.id

                  ) mc

                `);

      /* =========================================
   6. TRASLADOS - ENTRADA

   Las mismas unidades y el mismo valor
   económico entran a la bodega destino.
   ========================================= */

        const trasladosEntrada =
          await pool.request().query(`

            SELECT

              CONVERT(
                VARCHAR(10),
                t.fecha_creacion,
                23
              ) AS fecha,

              t.fecha_creacion
                AS fecha_orden,

              'TRASLADO ENTRADA'
                AS tipo,

              t.numero_traslado
                AS documento,


              td.id
                AS documento_id,


              t.bodega_destino
                AS bodega,


              td.codigo,

              td.producto,


              td.cantidad
                AS entrada,


              0
                AS salida,


              /* =====================================
                COSTO UNITARIO
                ===================================== */

              CAST(
                CASE

                  WHEN mc.cantidad_costos = 1
                  THEN mc.costo_unico

                  ELSE NULL

                END
                AS DECIMAL(18,4)
              ) AS costo_unitario,


              /* =====================================
                VALOR TOTAL QUE ENTRA
                ===================================== */

              CAST(
                mc.valor_total
                AS DECIMAL(18,4)
              ) AS valor_movimiento_directo,


              ISNULL(
                mc.cantidad_costos,
                0
              ) AS cantidad_costos,


              ISNULL(
                mc.cantidad_capas,
                0
              ) AS cantidad_capas


            FROM dbo.traslados_detalle td


            INNER JOIN dbo.traslados t

              ON t.id =
                td.traslado_id


            OUTER APPLY
            (

              SELECT

                SUM(
                  mcc.valor_movimiento
                ) AS valor_total,


                COUNT(
                  DISTINCT
                  CASE

                    WHEN mcc.costo_unitario
                        IS NOT NULL

                    THEN mcc.costo_unitario

                  END
                ) AS cantidad_costos,


                COUNT(
                  mcc.id
                ) AS cantidad_capas,


                MIN(
                  mcc.costo_unitario
                ) AS costo_unico


              FROM dbo.movimientos_capas_costo mcc


              WHERE

                mcc.tipo_movimiento =
                  'TRASLADO_ENTRADA'

                AND mcc.documento_id =
                    td.id

            ) mc

          `);


      /* =========================================
   7. MOVER A CUARENTENA
      SALIDA DE BODEGA ORIGEN

   El costo se obtiene de las capas
   económicas movidas a CUARENTENA.
   ========================================= */

const cuarentenaSalida =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        mc.fecha_movimiento,
        23
      ) AS fecha,

      mc.fecha_movimiento
        AS fecha_orden,

      'CUARENTENA SALIDA'
        AS tipo,

      CONCAT(
        'CUAR-',
        mc.id
      ) AS documento,


      /* =====================================
         ID DEL MOVIMIENTO DE CUARENTENA

         movimientos_capas_costo.documento_id
         guarda movimientos_cuarentena.id
         ===================================== */

      mc.id
        AS documento_id,


      mc.bodega_origen
        AS bodega,

      mc.codigo,

      mc.producto,

      0
        AS entrada,

      mc.cantidad
        AS salida,


      /* =====================================
         COSTO UNITARIO

         Una sola composición de costo:
         mostramos el costo.

         Varias capas/costos:
         NULL para poder mostrar Ver detalle.
         ===================================== */

      CAST(
        CASE

          WHEN cc.cantidad_costos = 1
          THEN cc.costo_unico

          ELSE NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      /* =====================================
         VALOR ECONÓMICO REAL
         ===================================== */

      CAST(
        cc.valor_total
        AS DECIMAL(18,4)
      ) AS valor_movimiento_directo,


      ISNULL(
        cc.cantidad_costos,
        0
      ) AS cantidad_costos,


      ISNULL(
        cc.cantidad_capas,
        0
      ) AS cantidad_capas


    FROM dbo.movimientos_cuarentena mc


    OUTER APPLY
    (

      SELECT

        SUM(
          mcc.valor_movimiento
        ) AS valor_total,


        COUNT(
          DISTINCT
          CASE

            WHEN mcc.costo_unitario
                 IS NOT NULL

            THEN mcc.costo_unitario

          END
        ) AS cantidad_costos,


        COUNT(
          mcc.id
        ) AS cantidad_capas,


        MIN(
          mcc.costo_unitario
        ) AS costo_unico


      FROM dbo.movimientos_capas_costo mcc


      WHERE

        mcc.tipo_movimiento =
          'CUARENTENA_SALIDA'

        AND mcc.documento_id =
            mc.id

    ) cc


    WHERE

      UPPER(
        LTRIM(
          RTRIM(
            mc.tipo_movimiento
          )
        )
      ) =
      'INGRESO'

  `);

  /* =========================================
   8. MOVER A CUARENTENA
      ENTRADA A CUARENTENA

   Conserva exactamente el mismo valor
   que salió de la bodega origen.
   ========================================= */

const cuarentenaEntrada =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        mc.fecha_movimiento,
        23
      ) AS fecha,

      mc.fecha_movimiento
        AS fecha_orden,

      'CUARENTENA ENTRADA'
        AS tipo,

      CONCAT(
        'CUAR-',
        mc.id
      ) AS documento,


      mc.id
        AS documento_id,


      mc.bodega_destino
        AS bodega,

      mc.codigo,

      mc.producto,

      mc.cantidad
        AS entrada,

      0
        AS salida,


      CAST(
        CASE

          WHEN cc.cantidad_costos = 1
          THEN cc.costo_unico

          ELSE NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      CAST(
        cc.valor_total
        AS DECIMAL(18,4)
      ) AS valor_movimiento_directo,


      ISNULL(
        cc.cantidad_costos,
        0
      ) AS cantidad_costos,


      ISNULL(
        cc.cantidad_capas,
        0
      ) AS cantidad_capas


    FROM dbo.movimientos_cuarentena mc


    OUTER APPLY
    (

      SELECT

        SUM(
          mcc.valor_movimiento
        ) AS valor_total,


        COUNT(
          DISTINCT
          CASE

            WHEN mcc.costo_unitario
                 IS NOT NULL

            THEN mcc.costo_unitario

          END
        ) AS cantidad_costos,


        COUNT(
          mcc.id
        ) AS cantidad_capas,


        MIN(
          mcc.costo_unitario
        ) AS costo_unico


      FROM dbo.movimientos_capas_costo mcc


      WHERE

        mcc.tipo_movimiento =
          'CUARENTENA_ENTRADA'

        AND mcc.documento_id =
            mc.id

    ) cc


    WHERE

      UPPER(
        LTRIM(
          RTRIM(
            mc.tipo_movimiento
          )
        )
      ) =
      'INGRESO'

  `);

  /* =========================================
   9. LIBERACIÓN
      SALIDA DE CUARENTENA
   ========================================= */

const liberacionSalida =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        mc.fecha_movimiento,
        23
      ) AS fecha,

      mc.fecha_movimiento
        AS fecha_orden,

      'LIBERACION SALIDA'
        AS tipo,

      CONCAT(
        'LIB-',
        mc.id
      ) AS documento,


      mc.id
        AS documento_id,


      mc.bodega_origen
        AS bodega,

      mc.codigo,

      mc.producto,

      0
        AS entrada,

      mc.cantidad
        AS salida,


      CAST(
        CASE

          WHEN cc.cantidad_costos = 1
          THEN cc.costo_unico

          ELSE NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      CAST(
        cc.valor_total
        AS DECIMAL(18,4)
      ) AS valor_movimiento_directo,


      ISNULL(
        cc.cantidad_costos,
        0
      ) AS cantidad_costos,


      ISNULL(
        cc.cantidad_capas,
        0
      ) AS cantidad_capas


    FROM dbo.movimientos_cuarentena mc


    OUTER APPLY
    (

      SELECT

        SUM(
          mcc.valor_movimiento
        ) AS valor_total,


        COUNT(
          DISTINCT
          CASE

            WHEN mcc.costo_unitario
                 IS NOT NULL

            THEN mcc.costo_unitario

          END
        ) AS cantidad_costos,


        COUNT(
          mcc.id
        ) AS cantidad_capas,


        MIN(
          mcc.costo_unitario
        ) AS costo_unico


      FROM dbo.movimientos_capas_costo mcc


      WHERE

        mcc.tipo_movimiento =
          'LIBERACION_SALIDA'

        AND mcc.documento_id =
            mc.id

    ) cc


    WHERE

      UPPER(
        LTRIM(
          RTRIM(
            mc.tipo_movimiento
          )
        )
      ) =
      'LIBERACION'

  `);

  /* =========================================
   10. LIBERACIÓN
       ENTRADA A BODEGA DESTINO
   ========================================= */

const liberacionEntrada =
  await pool.request().query(`

    SELECT

      CONVERT(
        VARCHAR(10),
        mc.fecha_movimiento,
        23
      ) AS fecha,

      mc.fecha_movimiento
        AS fecha_orden,

      'LIBERACION ENTRADA'
        AS tipo,

      CONCAT(
        'LIB-',
        mc.id
      ) AS documento,


      mc.id
        AS documento_id,


      mc.bodega_destino
        AS bodega,

      mc.codigo,

      mc.producto,

      mc.cantidad
        AS entrada,

      0
        AS salida,


      CAST(
        CASE

          WHEN cc.cantidad_costos = 1
          THEN cc.costo_unico

          ELSE NULL

        END
        AS DECIMAL(18,4)
      ) AS costo_unitario,


      CAST(
        cc.valor_total
        AS DECIMAL(18,4)
      ) AS valor_movimiento_directo,


      ISNULL(
        cc.cantidad_costos,
        0
      ) AS cantidad_costos,


      ISNULL(
        cc.cantidad_capas,
        0
      ) AS cantidad_capas


    FROM dbo.movimientos_cuarentena mc


    OUTER APPLY
    (

      SELECT

        SUM(
          mcc.valor_movimiento
        ) AS valor_total,


        COUNT(
          DISTINCT
          CASE

            WHEN mcc.costo_unitario
                 IS NOT NULL

            THEN mcc.costo_unitario

          END
        ) AS cantidad_costos,


        COUNT(
          mcc.id
        ) AS cantidad_capas,


        MIN(
          mcc.costo_unitario
        ) AS costo_unico


      FROM dbo.movimientos_capas_costo mcc


      WHERE

        mcc.tipo_movimiento =
          'LIBERACION_ENTRADA'

        AND mcc.documento_id =
            mc.id

    ) cc


    WHERE

      UPPER(
        LTRIM(
          RTRIM(
            mc.tipo_movimiento
          )
        )
      ) =
      'LIBERACION'

  `);


      /* =========================================
         11. UNIR TODOS LOS MOVIMIENTOS

         IMPORTANTE:

         COMPRA
         -> compras

         ENTRADA
         -> ENTRADA_MANUAL

         SALIDA
         -> salidas_inventario

         DESCARGO
         -> descargos

         TRASLADO
         -> traslados

         CUARENTENA / LIBERACIÓN
         -> movimientos_cuarentena

         Así no duplicamos movimientos.
         ========================================= */

      const movimientos = [

        ...compras.recordset,

        ...entradasInventario.recordset,

        ...salidas.recordset,

        ...descargos.recordset,

        ...trasladosSalida.recordset,

        ...trasladosEntrada.recordset,

        ...cuarentenaSalida.recordset,

        ...cuarentenaEntrada.recordset,

        ...liberacionSalida.recordset,

        ...liberacionEntrada.recordset

      ];


      /* =========================================
         12. ORDENAR MOVIMIENTOS

         1. Producto
         2. Bodega
         3. Fecha/hora real
         4. Documento
         ========================================= */

      movimientos.sort(
        (a, b) => {

          const codigoA =
            String(
              a.codigo || ""
            );


          const codigoB =
            String(
              b.codigo || ""
            );


          if (
            codigoA !== codigoB
          ) {

            return codigoA.localeCompare(
              codigoB
            );

          }


          const bodegaA =
            String(
              a.bodega || ""
            );


          const bodegaB =
            String(
              b.bodega || ""
            );


          if (
            bodegaA !== bodegaB
          ) {

            return bodegaA.localeCompare(
              bodegaB
            );

          }


          const fechaA =
            new Date(
              a.fecha_orden ||
              a.fecha
            ).getTime();


          const fechaB =
            new Date(
              b.fecha_orden ||
              b.fecha
            ).getTime();


          if (
            !Number.isNaN(fechaA) &&
            !Number.isNaN(fechaB) &&
            fechaA !== fechaB
          ) {

            return fechaA -
              fechaB;

          }


          return String(
            a.documento || ""
          ).localeCompare(
            String(
              b.documento || ""
            )
          );

        }
      );


      /* =========================================
   13. CALCULAR SALDOS

   IMPORTANTE:

   Ya NO existe un único costo vigente
   por producto + bodega.

   Cada movimiento utiliza SU propio costo.

   Ejemplo:

   COMPRA
   5 unidades × $10.50

   ENTRADA MANUAL
   7 unidades × $5.00

   La entrada manual NO hereda $10.50.
   ========================================= */

const saldoPorProducto = {};


/*
  Por ahora llevamos también un valor
  acumulado PROVISIONAL.

  Más adelante será sustituido por el
  historial exacto de movimientos de capas.
*/
const valorAcumuladoPorProducto = {};


const resultado =
  movimientos.map(
    m => {

      const key =
        `${
          String(
            m.codigo || ""
          )
        }||${
          String(
            m.bodega || ""
          )
        }`;


      /* =====================================
         INICIALIZAR SALDO
         ===================================== */

      if (
        saldoPorProducto[key] ===
        undefined
      ) {

        saldoPorProducto[key] =
          0;

      }


      if (
        valorAcumuladoPorProducto[key] ===
        undefined
      ) {

        valorAcumuladoPorProducto[key] =
          0;

      }


      /* =====================================
         CANTIDADES
         ===================================== */

      const entrada =
        Number(
          m.entrada ||
          0
        );


      const salida =
        Number(
          m.salida ||
          0
        );


      /* =====================================
         COSTO PROPIO DEL MOVIMIENTO

         NO heredamos costos anteriores.
         ===================================== */

      const costoUnitario =

        m.costo_unitario === null ||
        m.costo_unitario === undefined

          ? null

          : Number(
              m.costo_unitario
            );


      /* =====================================
         ACTUALIZAR SALDO FÍSICO
         ===================================== */

      saldoPorProducto[key] +=
        entrada;


      saldoPorProducto[key] -=
        salida;


      /* =====================================
         VALOR DEL MOVIMIENTO
         ===================================== */

      const cantidadMovimiento =
        entrada > 0
          ? entrada
          : salida;


   const valorMovimiento =

  m.valor_movimiento_directo !== null &&
  m.valor_movimiento_directo !== undefined

    ? Number(
        m.valor_movimiento_directo
      )

    : costoUnitario === null

      ? null

      : cantidadMovimiento *
        costoUnitario;


      /* =====================================
         VALOR ACUMULADO PROVISIONAL

         IMPORTANTE:

         Esto funciona correctamente para
         movimientos que YA tienen su costo
         individual.

         Cuando conectemos:

         SALIDA
         DESCARGO
         TRASLADO
         CUARENTENA
         LIBERACIÓN

         con movimientos de capas, este saldo
         pasará a ser completamente exacto.
         ===================================== */

      if (
        valorMovimiento !== null
      ) {

        if (
          entrada > 0
        ) {

          valorAcumuladoPorProducto[key] +=
            valorMovimiento;

        }


        if (
          salida > 0
        ) {

          valorAcumuladoPorProducto[key] -=
            valorMovimiento;

        }

      }


      /* Evitar pequeños residuos decimales */
      if (
        Math.abs(
          valorAcumuladoPorProducto[key]
        ) < 0.000001
      ) {

        valorAcumuladoPorProducto[key] =
          0;

      }


      return {

        fecha:
          m.fecha,

        tipo:
          m.tipo,

        documento:
          m.documento,

          documento_id:
          m.documento_id || null,

        cantidad_costos:
          Number(
            m.cantidad_costos || 0
          ),

          cantidad_capas:
            Number(
              m.cantidad_capas || 0
            ),

        bodega:
          m.bodega ||
          "",

        area_origen:
          m.area_origen ||
          "",

        codigo:
          m.codigo ||
          "",

        producto:
          m.producto ||
          "",

        entrada,

        salida,

        saldo:
          saldoPorProducto[key],

        costo_unitario:
          costoUnitario,

        valor_movimiento:
          valorMovimiento,

        valor_saldo:
          valorAcumuladoPorProducto[key]

      };

    }
  );
      /* =========================================
         14. RESPUESTA
         ========================================= */

      res.json(
        resultado
      );


    } catch (error) {

      console.error(
        "ERROR KARDEX:",
        error
      );


      res.status(500).json({
        error:
          "Error al obtener kardex"
      });

    }

  }
);

/* =========================================================
   DETALLE DE COSTO KARDEX
   ========================================================= */

app.get("/api/kardex/detalle-costo",

  requireAuth,

  requirePermission(
    "inventario.kardex"
  ),

  async (req, res) => {

    try {

      const {
        tipo,
        id
      } = req.query;


      const tipoFinal =
        String(
          tipo ||
          ""
        )
          .trim()
          .toUpperCase();


      const documentoId =
        Number(
          id
        );


      /* =====================================================
         1. VALIDAR
         ===================================================== */

      if (
        !tipoFinal ||
        !Number.isFinite(
          documentoId
        ) ||
        documentoId <= 0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos incompletos para consultar el detalle"
          });

      }


      const tiposPermitidos = [

        "SALIDA",

        "DESCARGO",

        "TRASLADO SALIDA",

        "TRASLADO ENTRADA",

        "CUARENTENA SALIDA",

        "CUARENTENA ENTRADA",

        "LIBERACION SALIDA",

        "LIBERACION ENTRADA"

      ];


      if (
        !tiposPermitidos.includes(
          tipoFinal
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Tipo de movimiento no válido"
          });

      }


      const pool =
        await getPool();


      let movimientoCabecera =
        null;


      let tipoMovimientoCapas =
        null;


      /* =====================================================
         2. SALIDA
         ===================================================== */

      if (
        tipoFinal ===
        "SALIDA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                s.id,

                CONCAT(
                  'SALIDA-',
                  s.id
                ) AS documento,

                s.codigo,

                s.producto,

                s.bodega,

                s.cantidad,

                s.lote,

                s.motivo,

                s.responsable,

                s.fecha_creacion
                  AS fecha

              FROM dbo.salidas_inventario s

              WHERE
                s.id = @id

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Salida no encontrada"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "SALIDA";

      }


      /* =====================================================
         3. DESCARGO
         ===================================================== */

      if (
        tipoFinal ===
        "DESCARGO"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                dd.id,

                dd.numero_descargo
                  AS documento,

                dd.codigo,

                dd.producto,

                i.bodega,

                dd.cantidad,

                dd.lote,

                d.origen
                  AS area_origen,

                d.responsable,

                d.observacion
                  AS motivo,

                dd.fecha_creacion
                  AS fecha

              FROM dbo.descargos_detalle dd

              INNER JOIN dbo.descargos d

                ON d.id =
                   dd.descargo_id


              INNER JOIN dbo.inventario i

                ON i.id =
                   dd.inventario_id


              WHERE
                dd.id = @id

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Detalle de descargo no encontrado"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "DESCARGO";

      }


      /* =====================================================
         4. TRASLADO SALIDA
         ===================================================== */

      if (
        tipoFinal ===
        "TRASLADO SALIDA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                td.id,

                t.numero_traslado
                  AS documento,

                td.codigo,

                td.producto,

                t.bodega_origen
                  AS bodega,

                td.cantidad,

                td.lote,

                t.responsable,

                t.observacion
                  AS motivo,

                t.fecha_creacion
                  AS fecha

              FROM dbo.traslados_detalle td

              INNER JOIN dbo.traslados t

                ON t.id =
                   td.traslado_id

              WHERE
                td.id = @id

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Detalle de traslado no encontrado"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "TRASLADO_SALIDA";

      }


      /* =====================================================
         5. TRASLADO ENTRADA
         ===================================================== */

      if (
        tipoFinal ===
        "TRASLADO ENTRADA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                td.id,

                t.numero_traslado
                  AS documento,

                td.codigo,

                td.producto,

                t.bodega_destino
                  AS bodega,

                td.cantidad,

                td.lote,

                t.responsable,

                t.observacion
                  AS motivo,

                t.fecha_creacion
                  AS fecha

              FROM dbo.traslados_detalle td

              INNER JOIN dbo.traslados t

                ON t.id =
                   td.traslado_id

              WHERE
                td.id = @id

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Detalle de traslado no encontrado"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "TRASLADO_ENTRADA";

      }


      /* =====================================================
         6. CUARENTENA SALIDA
         ===================================================== */

      if (
        tipoFinal ===
        "CUARENTENA SALIDA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                mc.id,

                CONCAT(
                  'CUAR-',
                  mc.id
                ) AS documento,

                mc.codigo,

                mc.producto,

                mc.bodega_origen
                  AS bodega,

                mc.cantidad,

                mc.lote,

                mc.motivo,

                mc.usuario_nombre
                  AS responsable,

                mc.fecha_movimiento
                  AS fecha

              FROM dbo.movimientos_cuarentena mc

              WHERE

                mc.id = @id

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          mc.tipo_movimiento
                        )
                      )
                    ) =
                    'INGRESO'

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Movimiento de cuarentena no encontrado"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "CUARENTENA_SALIDA";

      }


      /* =====================================================
         7. CUARENTENA ENTRADA
         ===================================================== */

      if (
        tipoFinal ===
        "CUARENTENA ENTRADA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                mc.id,

                CONCAT(
                  'CUAR-',
                  mc.id
                ) AS documento,

                mc.codigo,

                mc.producto,

                mc.bodega_destino
                  AS bodega,

                mc.cantidad,

                mc.lote,

                mc.motivo,

                mc.usuario_nombre
                  AS responsable,

                mc.fecha_movimiento
                  AS fecha

              FROM dbo.movimientos_cuarentena mc

              WHERE

                mc.id = @id

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          mc.tipo_movimiento
                        )
                      )
                    ) =
                    'INGRESO'

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Movimiento de cuarentena no encontrado"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "CUARENTENA_ENTRADA";

      }


      /* =====================================================
         8. LIBERACION SALIDA
         ===================================================== */

      if (
        tipoFinal ===
        "LIBERACION SALIDA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                mc.id,

                CONCAT(
                  'LIB-',
                  mc.id
                ) AS documento,

                mc.codigo,

                mc.producto,

                mc.bodega_origen
                  AS bodega,

                mc.cantidad,

                mc.lote,

                mc.motivo,

                mc.usuario_nombre
                  AS responsable,

                mc.fecha_movimiento
                  AS fecha

              FROM dbo.movimientos_cuarentena mc

              WHERE

                mc.id = @id

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          mc.tipo_movimiento
                        )
                      )
                    ) =
                    'LIBERACION'

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Liberación no encontrada"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "LIBERACION_SALIDA";

      }


      /* =====================================================
         9. LIBERACION ENTRADA
         ===================================================== */

      if (
        tipoFinal ===
        "LIBERACION ENTRADA"
      ) {

        const result =
          await pool
            .request()

            .input(
              "id",
              sql.Int,
              documentoId
            )

            .query(`

              SELECT TOP 1

                mc.id,

                CONCAT(
                  'LIB-',
                  mc.id
                ) AS documento,

                mc.codigo,

                mc.producto,

                mc.bodega_destino
                  AS bodega,

                mc.cantidad,

                mc.lote,

                mc.motivo,

                mc.usuario_nombre
                  AS responsable,

                mc.fecha_movimiento
                  AS fecha

              FROM dbo.movimientos_cuarentena mc

              WHERE

                mc.id = @id

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          mc.tipo_movimiento
                        )
                      )
                    ) =
                    'LIBERACION'

            `);


        if (
          !result.recordset.length
        ) {

          return res
            .status(404)
            .json({
              error:
                "Liberación no encontrada"
            });

        }


        movimientoCabecera =
          result.recordset[0];


        tipoMovimientoCapas =
          "LIBERACION_ENTRADA";

      }


      /* =====================================================
         10. MOVIMIENTOS DE CAPAS

         Aquí seguimos capa_origen_id hacia atrás
         hasta encontrar el origen REAL:

         ENTRADA_MANUAL
         COMPRA
         INVENTARIO_INICIAL
         etc.
         ===================================================== */

      const movimientosResult =
        await pool
          .request()

          .input(
            "documento_id",
            sql.Int,
            documentoId
          )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            tipoMovimientoCapas
          )

          .query(`

            ;WITH CadenaCapas AS
            (

              /* =========================================
                 CAPA ACTUAL
                 ========================================= */

              SELECT

                c.id
                  AS capa_actual_id,

                c.id
                  AS capa_raiz_id,

                c.capa_origen_id,

                c.origen,

                c.origen_id,

                c.motivo_sin_costo,

                c.referencia_documento,

                c.proveedor_id,

                0
                  AS nivel


              FROM dbo.capas_costo_inventario c


              UNION ALL


              /* =========================================
                 SUBIR POR capa_origen_id
                 ========================================= */

              SELECT

                cc.capa_actual_id,

                padre.id
                  AS capa_raiz_id,

                padre.capa_origen_id,

                padre.origen,

                padre.origen_id,

                padre.motivo_sin_costo,

                padre.referencia_documento,

                padre.proveedor_id,

                cc.nivel + 1


              FROM CadenaCapas cc


              INNER JOIN dbo.capas_costo_inventario padre

                ON padre.id =
                   cc.capa_origen_id

            ),


            CapaOriginal AS
            (

              SELECT

                capa_actual_id,

                capa_raiz_id,

                origen,

                origen_id,

                motivo_sin_costo,

                referencia_documento,

                proveedor_id,


                ROW_NUMBER() OVER
                (
                  PARTITION BY
                    capa_actual_id

                  ORDER BY
                    nivel DESC
                ) AS rn


              FROM CadenaCapas

            )


            SELECT

              mcc.id
                AS movimiento_capa_id,

              mcc.capa_id,

              mcc.cantidad,

              mcc.costo_unitario,

              mcc.valor_movimiento,

              mcc.estado_costo,

              mcc.lote,

              mcc.fecha_movimiento,


              /* =====================================
                 ORIGEN ORIGINAL
                 ===================================== */

              co.origen,

              co.origen_id,

              co.motivo_sin_costo,

              co.referencia_documento,

              co.proveedor_id,


              /* =====================================
                 COMPRA ORIGINAL
                 ===================================== */

              c.numero_compra
                AS numero_compra,

              c.numero_factura
                AS numero_factura,

              c.nombre_proveedor
                AS proveedor,


              /* =====================================
                 DOCUMENTO ORIGINAL
                 ===================================== */

              CASE

                WHEN co.origen =
                     'ENTRADA_MANUAL'

                THEN CONCAT(
                       'ENTRADA-',
                       co.origen_id
                     )


                WHEN co.origen =
                     'COMPRA'

                THEN ISNULL(
                       c.numero_compra,
                       CONCAT(
                         'COMPRA-',
                         co.origen_id
                       )
                     )


                WHEN co.origen =
                     'INVENTARIO_INICIAL'

                THEN
                  'INVENTARIO INICIAL'


                ELSE

                  CONCAT(

                    ISNULL(
                      co.origen,
                      'ORIGEN'
                    ),

                    '-',

                    ISNULL(
                      CONVERT(
                        VARCHAR(30),
                        co.origen_id
                      ),
                      ''
                    )

                  )

              END
                AS documento_origen


            FROM dbo.movimientos_capas_costo mcc


            INNER JOIN CapaOriginal co

              ON co.capa_actual_id =
                 mcc.capa_id

              AND co.rn = 1


            LEFT JOIN dbo.compras_detalle cd

              ON co.origen =
                 'COMPRA'

              AND cd.id =
                  co.origen_id


            LEFT JOIN dbo.compras c

              ON c.id =
                 cd.compra_id


            WHERE

              mcc.tipo_movimiento =
                @tipo_movimiento

              AND mcc.documento_id =
                  @documento_id


            ORDER BY

              mcc.id ASC


            OPTION (
              MAXRECURSION 100
            )

          `);


      const movimientos =
        movimientosResult
          .recordset ||
        [];


      /* =====================================================
         11. TOTALES
         ===================================================== */

      let cantidadTotal =
        0;


      let valorConocidoTotal =
        0;


      let cantidadPendiente =
        0;


      for (
        const movimiento of movimientos
      ) {

        const cantidadMovimiento =
          Number(
            movimiento.cantidad ||
            0
          );


        cantidadTotal +=
          cantidadMovimiento;


        if (
          movimiento.valor_movimiento !== null &&
          movimiento.valor_movimiento !== undefined
        ) {

          valorConocidoTotal +=
            Number(
              movimiento.valor_movimiento
            );

        }

        else {

          cantidadPendiente +=
            cantidadMovimiento;

        }

      }


      /* =====================================================
         12. RESPUESTA
         ===================================================== */

      res.json({

        ok:
          true,


        movimiento: {

          tipo:
            tipoFinal,

          id:
            movimientoCabecera.id,

          documento:
            movimientoCabecera.documento,

          codigo:
            movimientoCabecera.codigo,

          producto:
            movimientoCabecera.producto,

          bodega:
            movimientoCabecera.bodega,

          area_origen:
            movimientoCabecera.area_origen ||
            null,

          cantidad:
            Number(
              movimientoCabecera.cantidad ||
              0
            ),

          lote:
            movimientoCabecera.lote ||
            null,

          motivo:
            movimientoCabecera.motivo ||
            null,

          responsable:
            movimientoCabecera.responsable ||
            null,

          fecha:
            movimientoCabecera.fecha

        },


        detalle:
          movimientos.map(

            movimiento => ({

              capa_id:
                Number(
                  movimiento.capa_id
                ),

              origen:
                movimiento.origen,

              documento_origen:
                movimiento.documento_origen,

              numero_compra:
                movimiento.numero_compra ||
                null,

              numero_factura:
                movimiento.numero_factura ||
                null,

              proveedor:
                movimiento.proveedor ||
                null,

              lote:
                movimiento.lote ||
                null,

              cantidad:
                Number(
                  movimiento.cantidad ||
                  0
                ),

              costo_unitario:

                movimiento.costo_unitario === null ||
                movimiento.costo_unitario === undefined

                  ? null

                  : Number(
                      movimiento.costo_unitario
                    ),

              valor:

                movimiento.valor_movimiento === null ||
                movimiento.valor_movimiento === undefined

                  ? null

                  : Number(
                      movimiento.valor_movimiento
                    ),

              estado_costo:
                movimiento.estado_costo,

              motivo_sin_costo:
                movimiento.motivo_sin_costo ||
                null

            })

          ),


        resumen: {

          cantidad_total:
            cantidadTotal,

          valor_conocido:
            valorConocidoTotal,

          cantidad_costo_pendiente:
            cantidadPendiente,

          cantidad_capas:
            movimientos.length

        }

      });


    } catch (error) {

      console.error(
        "ERROR DETALLE COSTO KARDEX:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al obtener detalle del costo"

        });

    }

  }

);

/* =========================
   CATEGORIAS PRODUCTO
========================= */

app.get("/api/categorias-producto", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        id,
        nombre,
        prefijo,
        siguiente_numero,
        estado,
        fecha_creacion
      FROM categorias_producto
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR CATEGORIAS PRODUCTO:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

app.post("/api/categorias-producto", requireAuth, async (req, res) => {
  try {
    const { nombre, prefijo } = req.body;

    if (!nombre || !prefijo) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const pool = await getPool();

    await pool.request()
      .input("nombre", sql.VarChar, nombre.trim().toUpperCase())
      .input("prefijo", sql.VarChar, prefijo.trim().toUpperCase())
      .query(`
        INSERT INTO categorias_producto (nombre, prefijo, siguiente_numero)
        VALUES (@nombre, @prefijo, 1000)
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CREAR CATEGORIA PRODUCTO:", error);

    if (error.number === 2627) {
      return res.status(400).json({ error: "La categoría o prefijo ya existe" });
    }

    res.status(500).json({ error: "Error al crear categoría" });
  }
});

app.patch("/api/categorias-producto/estado/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        UPDATE categorias_producto
        SET estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END
        WHERE id = @id
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR ESTADO CATEGORIA PRODUCTO:", error);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});

/*=========================
===========================
     TRASLADOS
===========================
==========================*/

/*SIGUIENTE NUMERO DE TRASLADO */
app.get("/api/traslados/siguiente-numero",
  requireAuth,
  requirePermission("inventario.traslados"),
  async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP 1 numero_traslado
      FROM traslados
      ORDER BY id DESC
    `);

    let siguiente = 1000;

    if (result.recordset.length) {
      const ultimo = String(result.recordset[0].numero_traslado || "");
      const match = ultimo.match(/TRSLD-(\d+)/i);
      if (match) {
        siguiente = Number(match[1]) + 1;
      }
    }

    res.json({ numero: `TRSLD-${siguiente}` });
  } catch (error) {
    console.error("ERROR SIGUIENTE NUMERO TRASLADO:", error);
    res.status(500).json({ error: "Error al obtener número de traslado" });
  }
});


/* REGISTRAR TRASLADO */
/* =========================================================
   REGISTRAR TRASLADO
   - Protegido por inventario.traslados
   - Descuenta stock de bodega origen
   - Aumenta stock de bodega destino
   - Controla lotes
   - Marca nuevos lotes como TRASLADO
   ========================================================= */

/* =========================================================
   REGISTRAR TRASLADO ENTRE BODEGAS
   ========================================================= */

/* =========================================================
   REGISTRAR TRASLADO ENTRE BODEGAS
   CON TRASLADO DE CAPAS DE COSTO

   IMPORTANTE:
   CUARENTENA NO SE MANEJA DESDE ESTA RUTA.
   ========================================================= */

app.post("/api/traslados",

  requireAuth,

  requirePermission(
    "inventario.traslados"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(
        pool
      );


    try {

      const {
        numero,
        origen,
        destino,
        responsable,
        observacion,
        detalle
      } = req.body;


      /* =====================================================
         1. NORMALIZAR
         ===================================================== */

      const bodegaOrigen =
        String(
          origen || ""
        ).trim();


      const bodegaDestino =
        String(
          destino || ""
        ).trim();


      const responsableFinal =
        String(
          responsable ||
          req.session?.usuario?.username ||
          ""
        ).trim();


      const observacionFinal =
        String(
          observacion || ""
        ).trim() ||
        null;


      /* =====================================================
         2. VALIDACIONES GENERALES
         ===================================================== */

      if (
        !bodegaOrigen ||
        !bodegaDestino
      ) {

        return res
          .status(400)
          .json({
            error:
              "Seleccione bodega origen y destino"
          });

      }


      if (
        bodegaOrigen.toUpperCase() ===
        bodegaDestino.toUpperCase()
      ) {

        return res
          .status(400)
          .json({
            error:
              "La bodega origen y destino no pueden ser iguales"
          });

      }


      /* =====================================================
         3. PROTEGER CUARENTENA

         CUARENTENA solo puede manejarse mediante:

         POST /api/cuarentena/mover
         POST /api/cuarentena/liberar

         Nunca mediante un traslado normal.
         ===================================================== */

      if (
        bodegaOrigen.toUpperCase() ===
          "CUARENTENA"

        ||

        bodegaDestino.toUpperCase() ===
          "CUARENTENA"
      ) {

        return res
          .status(400)
          .json({
            error:
              "CUARENTENA no puede utilizarse en traslados normales. Use el módulo de Cuarentena."
          });

      }


      if (
        !responsableFinal
      ) {

        return res
          .status(400)
          .json({
            error:
              "Responsable requerido"
          });

      }


      if (
        !Array.isArray(detalle) ||
        !detalle.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "Debe agregar al menos un producto"
          });

      }


      /* =====================================================
         4. INICIAR TRANSACCIÓN
         ===================================================== */

      await transaction.begin();


      /* =====================================================
         5. NÚMERO DEL TRASLADO
         ===================================================== */

      let numeroFinal =

        numero &&
        String(numero).trim()

          ? String(numero).trim()

          : null;


      if (!numeroFinal) {

        const ultimoResult =
          await new sql.Request(
            transaction
          )
            .query(`

              SELECT TOP 1

                numero_traslado

              FROM dbo.traslados
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              ORDER BY
                id DESC

            `);


        let siguiente =
          1000;


        if (
          ultimoResult
            .recordset
            .length
        ) {

          const ultimo =
            String(
              ultimoResult
                .recordset[0]
                .numero_traslado ||
              ""
            );


          const match =
            ultimo.match(
              /TRSLD-(\d+)/i
            );


          if (match) {

            siguiente =
              Number(
                match[1]
              ) + 1;

          }

        }


        numeroFinal =
          `TRSLD-${siguiente}`;

      }


      /* =====================================================
         6. CABECERA DEL TRASLADO
         ===================================================== */

      const trasladoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "numero_traslado",
            sql.VarChar,
            numeroFinal
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            bodegaOrigen
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            bodegaDestino
          )

          .input(
            "responsable",
            sql.VarChar,
            responsableFinal
          )

          .input(
            "observacion",
            sql.VarChar,
            observacionFinal
          )

          .query(`

            INSERT INTO dbo.traslados (

              numero_traslado,
              bodega_origen,
              bodega_destino,
              responsable,
              observacion

            )

            OUTPUT

              INSERTED.id,
              INSERTED.fecha_creacion

            VALUES (

              @numero_traslado,
              @bodega_origen,
              @bodega_destino,
              @responsable,
              @observacion

            )

          `);


      const trasladoId =
        Number(
          trasladoResult
            .recordset[0]
            .id
        );


      const fechaCreacion =
        trasladoResult
          .recordset[0]
          .fecha_creacion;


      const resumenCostos =
        [];


      /* =====================================================
         7. PROCESAR CADA PRODUCTO
         ===================================================== */

      for (
        const det of detalle
      ) {

        const inventarioOrigenId =
          Number(
            det.inventarioId ||
            0
          );


        const cantidad =
          Number(
            det.cantidad ||
            0
          );


        const detalleEntradaId =

          det.detalleEntradaId !== null &&
          det.detalleEntradaId !== undefined &&
          det.detalleEntradaId !== ""

            ? Number(
                det.detalleEntradaId
              )

            : null;


        if (
          !inventarioOrigenId ||
          !Number.isFinite(cantidad) ||
          cantidad <= 0
        ) {

          throw new Error(
            "Detalle de traslado no válido"
          );

        }


        /* ===================================================
           8. INVENTARIO ORIGEN
           =================================================== */

        const invOrigenResult =
          await new sql.Request(
            transaction
          )

            .input(
              "id",
              sql.Int,
              inventarioOrigenId
            )

            .query(`

              SELECT TOP 1

                i.id,
                i.producto_id,
                i.bodega,
                i.stock,
                i.stock_minimo,
                i.ubicacion,

                p.codigo,
                p.producto,
                p.categoria,
                p.unidad

              FROM dbo.inventario i
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              INNER JOIN dbo.productos p

                ON p.id =
                   i.producto_id

              WHERE
                i.id = @id

            `);


        if (
          !invOrigenResult
            .recordset
            .length
        ) {

          throw new Error(
            `Inventario origen no encontrado para ${
              det.producto || ""
            }`
          );

        }


        const invOrigen =
          invOrigenResult
            .recordset[0];


        /* ===================================================
           9. VALIDAR BODEGA ORIGEN
           =================================================== */

        if (
          String(
            invOrigen.bodega ||
            ""
          )
            .trim()
            .toUpperCase()
          !==
          bodegaOrigen
            .toUpperCase()
        ) {

          throw new Error(
            `El producto ${invOrigen.producto} no pertenece a la bodega origen`
          );

        }


        /* ===================================================
           10. SEGUNDA PROTECCIÓN CUARENTENA

           Evita manipulación directa del payload.
           =================================================== */

        if (
          String(
            invOrigen.bodega || ""
          )
            .trim()
            .toUpperCase() ===
          "CUARENTENA"
        ) {

          throw new Error(
            "Los productos de CUARENTENA deben liberarse desde el módulo de Cuarentena."
          );

        }


        /* ===================================================
           11. VALIDAR STOCK GENERAL
           =================================================== */

        if (
          Number(
            invOrigen.stock ||
            0
          ) <
          cantidad
        ) {

          throw new Error(
            `Stock insuficiente para ${invOrigen.producto}`
          );

        }


        /* ===================================================
           12. DATOS DEL LOTE
           =================================================== */

        let lote =
          null;


        let vencimiento =
          null;


        let casaComercial =
          null;


        let codigoProveedor =
          null;


        let manejaLote =
          false;


        let loteOrigenVigenteId =
          null;


        /* ===================================================
           13. PRODUCTO CON LOTE
           =================================================== */

        if (
          detalleEntradaId !== null &&
          !Number.isNaN(
            detalleEntradaId
          )
        ) {

          manejaLote =
            true;


          const loteBaseResult =
            await new sql.Request(
              transaction
            )

              .input(
                "id",
                sql.Int,
                detalleEntradaId
              )

              .query(`

                SELECT TOP 1

                  id,
                  bodega,
                  producto_id,
                  codigo,
                  producto,
                  lote,
                  vencimiento,
                  casa_comercial,
                  codigoproveedor,
                  stock_lote

                FROM dbo.detalleEntradas

                WHERE
                  id = @id

              `);


          if (
            !loteBaseResult
              .recordset
              .length
          ) {

            throw new Error(
              `Lote no encontrado para ${invOrigen.producto}`
            );

          }


          const loteBase =
            loteBaseResult
              .recordset[0];


          if (
            Number(
              loteBase.producto_id
            )
            !==
            Number(
              invOrigen.producto_id
            )
          ) {

            throw new Error(
              `El lote seleccionado no pertenece a ${invOrigen.producto}`
            );

          }


          if (
            String(
              loteBase.bodega ||
              ""
            )
              .trim()
              .toUpperCase()
            !==
            bodegaOrigen
              .toUpperCase()
          ) {

            throw new Error(
              `El lote seleccionado no pertenece a ${bodegaOrigen}`
            );

          }


          /* =================================================
             14. ESTADO VIGENTE DEL LOTE
             ================================================= */

          const loteOrigenResult =
            await new sql.Request(
              transaction
            )

              .input(
                "producto_id",
                sql.Int,
                Number(
                  invOrigen.producto_id
                )
              )

              .input(
                "bodega",
                sql.VarChar,
                bodegaOrigen
              )

              .input(
                "lote",
                sql.VarChar,
                loteBase.lote ||
                ""
              )

              .input(
                "codigoproveedor",
                sql.VarChar,
                loteBase.codigoproveedor ||
                ""
              )

              .input(
                "casa_comercial",
                sql.VarChar,
                loteBase.casa_comercial ||
                ""
              )

              .query(`

                SELECT TOP 1

                  id,
                  lote,
                  vencimiento,
                  casa_comercial,
                  codigoproveedor,
                  stock_lote

                FROM dbo.detalleEntradas
                  WITH (
                    UPDLOCK,
                    HOLDLOCK
                  )

                WHERE

                  producto_id =
                    @producto_id


                  AND UPPER(
                        LTRIM(
                          RTRIM(bodega)
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@bodega)
                        )
                      )


                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              lote,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@lote)
                        )
                      )


                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              codigoproveedor,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @codigoproveedor
                          )
                        )
                      )


                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              casa_comercial,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @casa_comercial
                          )
                        )
                      )

                ORDER BY
                  id DESC

              `);


          if (
            !loteOrigenResult
              .recordset
              .length
          ) {

            throw new Error(
              `No se encontró saldo vigente del lote de ${invOrigen.producto}`
            );

          }


          const loteOrigen =
            loteOrigenResult
              .recordset[0];


          if (
            Number(
              loteOrigen.stock_lote ||
              0
            )
            <
            cantidad
          ) {

            throw new Error(
              `Stock insuficiente en lote para ${invOrigen.producto}`
            );

          }


          loteOrigenVigenteId =
            Number(
              loteOrigen.id
            );


          lote =
            loteOrigen.lote ||
            null;


          vencimiento =
            loteOrigen.vencimiento ||
            null;


          casaComercial =
            loteOrigen
              .casa_comercial ||
            null;


          codigoProveedor =
            loteOrigen
              .codigoproveedor ||
            null;

        }


        /* ===================================================
           15. BUSCAR CAPAS DE COSTO EN ORIGEN
           =================================================== */

        const requestCapas =
          new sql.Request(
            transaction
          );


        requestCapas.input(
          "producto_id",
          sql.Int,
          Number(
            invOrigen.producto_id
          )
        );


        requestCapas.input(
          "bodega",
          sql.VarChar,
          bodegaOrigen
        );


        requestCapas.input(
          "lote",
          sql.VarChar,
          lote || ""
        );


        requestCapas.input(
          "codigo_proveedor",
          sql.VarChar,
          codigoProveedor || ""
        );


        requestCapas.input(
          "casa_comercial",
          sql.VarChar,
          casaComercial || ""
        );


        const filtroCapas =
          manejaLote

            ? `

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          ISNULL(
                            c.lote,
                            ''
                          )
                        )
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@lote)
                      )
                    )


                AND
                (
                  c.codigo_proveedor IS NULL

                  OR UPPER(
                       LTRIM(
                         RTRIM(
                           c.codigo_proveedor
                         )
                       )
                     ) =
                     UPPER(
                       LTRIM(
                         RTRIM(
                           @codigo_proveedor
                         )
                       )
                     )
                )


                AND
                (
                  c.casa_comercial IS NULL

                  OR UPPER(
                       LTRIM(
                         RTRIM(
                           c.casa_comercial
                         )
                       )
                     ) =
                     UPPER(
                       LTRIM(
                         RTRIM(
                           @casa_comercial
                         )
                       )
                     )
                )

              `

            : `

                AND
                (
                  c.lote IS NULL

                  OR LTRIM(
                       RTRIM(c.lote)
                     ) = ''
                )

              `;


        const capasResult =
          await requestCapas
            .query(`

              SELECT

                c.id,

                c.cantidad_disponible,

                c.estado_costo,

                c.costo_unitario,

                c.motivo_sin_costo,

                c.lote,

                c.fecha_vencimiento,

                c.fecha_entrada,

                c.proveedor_id,

                c.codigo_proveedor,

                c.casa_comercial,

                c.referencia_documento,

                c.origen,

                c.origen_id

              FROM dbo.capas_costo_inventario c
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              WHERE

                c.producto_id =
                  @producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(c.bodega)
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@bodega)
                      )
                    )

                AND
                  c.cantidad_disponible > 0

                ${filtroCapas}

              ORDER BY

                c.fecha_entrada ASC,

                c.id ASC

            `);


        const capasOrigen =
          capasResult
            .recordset ||
          [];


        const totalDisponibleCapas =
          capasOrigen.reduce(

            (
              total,
              capa
            ) =>

              total +
              Number(
                capa.cantidad_disponible ||
                0
              ),

            0

          );


        if (
          totalDisponibleCapas <
          cantidad
        ) {

          throw new Error(

            manejaLote

              ? `Las capas del lote de ${invOrigen.producto} solo tienen ${totalDisponibleCapas} unidades disponibles`

              : `Las capas sin lote de ${invOrigen.producto} solo tienen ${totalDisponibleCapas} unidades disponibles`

          );

        }


        /* ===================================================
           16. BUSCAR INVENTARIO DESTINO
           =================================================== */

        const invDestinoResult =
          await new sql.Request(
            transaction
          )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "bodega",
              sql.VarChar,
              bodegaDestino
            )

            .query(`

              SELECT TOP 1

                id,
                stock,
                ubicacion

              FROM dbo.inventario
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              WHERE

                producto_id =
                  @producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(bodega)
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@bodega)
                      )
                    )

            `);


        let inventarioDestinoId =
          null;


        /* ===================================================
           17. DESCONTAR STOCK GENERAL ORIGEN

           Siempre directo.
           Nunca recalculamos inventario.stock
           únicamente desde lotes.
           =================================================== */

        const descontarOrigen =
          await new sql.Request(
            transaction
          )

            .input(
              "id",
              sql.Int,
              inventarioOrigenId
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              cantidad
            )

            .query(`

              UPDATE dbo.inventario

              SET

                stock =
                  ISNULL(
                    stock,
                    0
                  ) -
                  @cantidad,

                fecha_actualizacion =
                  GETDATE()

              WHERE

                id = @id

                AND ISNULL(
                      stock,
                      0
                    ) >=
                    @cantidad

            `);


        if (
          !descontarOrigen
            .rowsAffected?.[0]
        ) {

          throw new Error(
            `No fue posible descontar el stock de ${invOrigen.producto}`
          );

        }


        /* ===================================================
           18. SUMAR STOCK GENERAL DESTINO
           =================================================== */

        if (
          invDestinoResult
            .recordset
            .length
        ) {

          inventarioDestinoId =
            Number(
              invDestinoResult
                .recordset[0]
                .id
            );


          await new sql.Request(
            transaction
          )

            .input(
              "id",
              sql.Int,
              inventarioDestinoId
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              cantidad
            )

            .input(
              "stock_minimo",
              sql.Int,
              Number(
                invOrigen.stock_minimo ||
                0
              )
            )

            .input(
              "responsable",
              sql.VarChar,
              responsableFinal
            )

            .input(
              "observacion",
              sql.VarChar,
              observacionFinal
            )

            .query(`

              UPDATE dbo.inventario

              SET

                stock =
                  ISNULL(
                    stock,
                    0
                  ) +
                  @cantidad,

                stock_minimo =
                  @stock_minimo,

                responsable =
                  @responsable,

                observacion =
                  @observacion,

                fecha_actualizacion =
                  GETDATE()

              WHERE
                id = @id

            `);

        }

        else {

          const nuevoInventarioResult =
            await new sql.Request(
              transaction
            )

              .input(
                "producto_id",
                sql.Int,
                Number(
                  invOrigen.producto_id
                )
              )

              .input(
                "bodega",
                sql.VarChar,
                bodegaDestino
              )

              .input(
                "stock",
                sql.Decimal(
                  18,
                  4
                ),
                cantidad
              )

              .input(
                "stock_minimo",
                sql.Int,
                Number(
                  invOrigen.stock_minimo ||
                  0
                )
              )

              .input(
                "ubicacion",
                sql.VarChar,
                null
              )

              .input(
                "responsable",
                sql.VarChar,
                responsableFinal
              )

              .input(
                "observacion",
                sql.VarChar,
                observacionFinal
              )

              .query(`

                INSERT INTO dbo.inventario (

                  producto_id,
                  bodega,
                  stock,
                  stock_minimo,
                  ubicacion,
                  responsable,
                  observacion

                )

                OUTPUT
                  INSERTED.id

                VALUES (

                  @producto_id,
                  @bodega,
                  @stock,
                  @stock_minimo,
                  @ubicacion,
                  @responsable,
                  @observacion

                )

              `);


          inventarioDestinoId =
            Number(
              nuevoInventarioResult
                .recordset[0]
                .id
            );

        }


        /* ===================================================
           19. MOVER LOTE FÍSICO
           =================================================== */

        if (
          manejaLote &&
          lote
        ) {

          const descontarLoteOrigen =
            await new sql.Request(
              transaction
            )

              .input(
                "id",
                sql.Int,
                loteOrigenVigenteId
              )

              .input(
                "cantidad",
                sql.Decimal(
                  18,
                  4
                ),
                cantidad
              )

              .query(`

                UPDATE dbo.detalleEntradas

                SET

                  stock_lote =
                    ISNULL(
                      stock_lote,
                      0
                    ) -
                    @cantidad

                WHERE

                  id = @id

                  AND ISNULL(
                        stock_lote,
                        0
                      ) >=
                      @cantidad

              `);


          if (
            !descontarLoteOrigen
              .rowsAffected?.[0]
          ) {

            throw new Error(
              `No fue posible descontar el lote de ${invOrigen.producto}`
            );

          }


          /* =================================================
             20. BUSCAR LOTE DESTINO
             ================================================= */

          const loteDestinoResult =
            await new sql.Request(
              transaction
            )

              .input(
                "bodega",
                sql.VarChar,
                bodegaDestino
              )

              .input(
                "producto_id",
                sql.Int,
                Number(
                  invOrigen.producto_id
                )
              )

              .input(
                "lote",
                sql.VarChar,
                lote
              )

              .input(
                "casa_comercial",
                sql.VarChar,
                casaComercial || ""
              )

              .input(
                "codigoproveedor",
                sql.VarChar,
                codigoProveedor || ""
              )

              .query(`

                SELECT TOP 1

                  id,
                  stock_lote

                FROM dbo.detalleEntradas
                  WITH (
                    UPDLOCK,
                    HOLDLOCK
                  )

                WHERE

                  producto_id =
                    @producto_id


                  AND UPPER(
                        LTRIM(
                          RTRIM(bodega)
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@bodega)
                        )
                      )


                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              lote,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@lote)
                        )
                      )


                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              casa_comercial,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @casa_comercial
                          )
                        )
                      )


                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              codigoproveedor,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @codigoproveedor
                          )
                        )
                      )

                ORDER BY
                  id DESC

              `);


          if (
            loteDestinoResult
              .recordset
              .length
          ) {

            await new sql.Request(
              transaction
            )

              .input(
                "id",
                sql.Int,
                Number(
                  loteDestinoResult
                    .recordset[0]
                    .id
                )
              )

              .input(
                "cantidad",
                sql.Decimal(
                  18,
                  4
                ),
                cantidad
              )

              .input(
                "vencimiento",
                sql.Date,
                vencimiento ||
                null
              )

              .query(`

                UPDATE dbo.detalleEntradas

                SET

                  stock_lote =
                    ISNULL(
                      stock_lote,
                      0
                    ) +
                    @cantidad,

                  vencimiento =
                    ISNULL(
                      @vencimiento,
                      vencimiento
                    )

                WHERE
                  id = @id

              `);

          }

          else {

            await new sql.Request(
              transaction
            )

              .input(
                "bodega",
                sql.VarChar,
                bodegaDestino
              )

              .input(
                "producto_id",
                sql.Int,
                Number(
                  invOrigen.producto_id
                )
              )

              .input(
                "codigo",
                sql.VarChar,
                invOrigen.codigo
              )

              .input(
                "codigoproveedor",
                sql.VarChar,
                codigoProveedor ||
                null
              )

              .input(
                "producto",
                sql.VarChar,
                invOrigen.producto
              )

              .input(
                "categoria",
                sql.VarChar,
                invOrigen.categoria ||
                null
              )

              .input(
                "cantidad",
                sql.Decimal(
                  18,
                  4
                ),
                cantidad
              )

              .input(
                "stock_lote",
                sql.Decimal(
                  18,
                  4
                ),
                cantidad
              )

              .input(
                "lote",
                sql.VarChar,
                lote
              )

              .input(
                "vencimiento",
                sql.Date,
                vencimiento ||
                null
              )

              .input(
                "casa_comercial",
                sql.VarChar,
                casaComercial ||
                null
              )

              .input(
                "stock_minimo",
                sql.Int,
                Number(
                  invOrigen.stock_minimo ||
                  0
                )
              )

              .input(
                "ubicacion",
                sql.VarChar,
                null
              )

              .input(
                "responsable",
                sql.VarChar,
                responsableFinal
              )

              .input(
                "observacion",
                sql.VarChar,
                `Traslado desde ${bodegaOrigen}${
                  observacionFinal
                    ? " - " +
                      observacionFinal
                    : ""
                }`
              )

              .input(
                "origen_movimiento",
                sql.VarChar,
                "TRASLADO"
              )

              .query(`

                INSERT INTO dbo.detalleEntradas (

                  bodega,
                  producto_id,
                  codigo,
                  codigoproveedor,
                  producto,
                  categoria,
                  cantidad,
                  stock_lote,
                  lote,
                  vencimiento,
                  casa_comercial,
                  stock_minimo,
                  ubicacion,
                  responsable,
                  observacion,
                  origen_movimiento

                )

                VALUES (

                  @bodega,
                  @producto_id,
                  @codigo,
                  @codigoproveedor,
                  @producto,
                  @categoria,
                  @cantidad,
                  @stock_lote,
                  @lote,
                  @vencimiento,
                  @casa_comercial,
                  @stock_minimo,
                  @ubicacion,
                  @responsable,
                  @observacion,
                  @origen_movimiento

                )

              `);

          }

        }


        /* ===================================================
           21. REGISTRAR DETALLE DEL TRASLADO
           =================================================== */

        const detalleTrasladoResult =
          await new sql.Request(
            transaction
          )

            .input(
              "traslado_id",
              sql.Int,
              trasladoId
            )

            .input(
              "inventario_origen_id",
              sql.Int,
              inventarioOrigenId
            )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "detalle_entrada_id",
              sql.Int,
              detalleEntradaId
            )

            .input(
              "codigo",
              sql.VarChar,
              invOrigen.codigo
            )

            .input(
              "producto",
              sql.VarChar,
              invOrigen.producto
            )

            .input(
              "categoria",
              sql.VarChar,
              invOrigen.categoria ||
              null
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              cantidad
            )

            .input(
              "lote",
              sql.VarChar,
              lote ||
              null
            )

            .input(
              "vencimiento",
              sql.Date,
              vencimiento ||
              null
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              casaComercial ||
              null
            )

            .input(
              "codigo_proveedor",
              sql.VarChar,
              codigoProveedor ||
              null
            )

            .query(`

              INSERT INTO dbo.traslados_detalle (

                traslado_id,
                inventario_origen_id,
                producto_id,
                detalle_entrada_id,
                codigo,
                producto,
                categoria,
                cantidad,
                lote,
                vencimiento,
                casa_comercial,
                codigo_proveedor

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @traslado_id,
                @inventario_origen_id,
                @producto_id,
                @detalle_entrada_id,
                @codigo,
                @producto,
                @categoria,
                @cantidad,
                @lote,
                @vencimiento,
                @casa_comercial,
                @codigo_proveedor

              )

            `);


        const trasladoDetalleId =
          Number(
            detalleTrasladoResult
              .recordset[0]
              .id
          );


        /* ===================================================
           22. TRASLADAR CAPAS ECONÓMICAS
           =================================================== */

        let cantidadPendiente =
          cantidad;


        let valorConocido =
          0;


        let cantidadCostoPendiente =
          0;


        const capasTrasladadas =
          [];


        for (
          const capa of capasOrigen
        ) {

          if (
            cantidadPendiente <= 0
          ) {

            break;

          }


          const disponible =
            Number(
              capa.cantidad_disponible ||
              0
            );


          if (
            disponible <= 0
          ) {

            continue;

          }


          const mover =
            Math.min(
              disponible,
              cantidadPendiente
            );


          const nuevoSaldoOrigen =
            disponible -
            mover;


          /* ===============================================
             22.1 REDUCIR CAPA ORIGEN
             =============================================== */

          await new sql.Request(
            transaction
          )

            .input(
              "id",
              sql.Int,
              Number(
                capa.id
              )
            )

            .input(
              "nuevo_saldo",
              sql.Decimal(
                18,
                4
              ),
              nuevoSaldoOrigen
            )

            .query(`

              UPDATE dbo.capas_costo_inventario

              SET

                cantidad_disponible =
                  @nuevo_saldo

              WHERE
                id = @id

            `);


          const costoUnitario =

            capa.costo_unitario === null ||
            capa.costo_unitario === undefined

              ? null

              : Number(
                  capa.costo_unitario
                );


          const valorMovimiento =

            costoUnitario === null

              ? null

              : mover *
                costoUnitario;


          if (
            valorMovimiento === null
          ) {

            cantidadCostoPendiente +=
              mover;

          }

          else {

            valorConocido +=
              valorMovimiento;

          }


          /* ===============================================
             22.2 CREAR CAPA DESTINO
             =============================================== */

          const nuevaCapaResult =
            await new sql.Request(
              transaction
            )

              .input(
                "producto_id",
                sql.Int,
                Number(
                  invOrigen.producto_id
                )
              )

              .input(
                "bodega",
                sql.VarChar,
                bodegaDestino
              )

              .input(
                "lote",
                sql.VarChar,
                capa.lote ||
                lote ||
                null
              )

              .input(
                "fecha_vencimiento",
                sql.Date,
                capa.fecha_vencimiento ||
                vencimiento ||
                null
              )

              .input(
                "origen",
                sql.VarChar,
                "TRASLADO"
              )

              .input(
                "origen_id",
                sql.Int,
                trasladoDetalleId
              )

              .input(
                "estado_costo",
                sql.VarChar,
                capa.estado_costo
              )

              .input(
                "costo_unitario",
                sql.Decimal(
                  18,
                  6
                ),
                costoUnitario
              )

              .input(
                "motivo_sin_costo",
                sql.VarChar,
                capa.motivo_sin_costo ||
                null
              )

              .input(
                "cantidad_original",
                sql.Decimal(
                  18,
                  4
                ),
                mover
              )

              .input(
                "cantidad_disponible",
                sql.Decimal(
                  18,
                  4
                ),
                mover
              )

              .input(
                "capa_origen_id",
                sql.Int,
                Number(
                  capa.id
                )
              )

              .input(
                "proveedor_id",
                sql.Int,
                capa.proveedor_id ||
                null
              )

              .input(
                "referencia_documento",
                sql.VarChar,
                numeroFinal
              )

              .input(
                "observacion",
                sql.VarChar,
                `Traslado desde ${bodegaOrigen} hacia ${bodegaDestino}${
                  observacionFinal
                    ? " - " +
                      observacionFinal
                    : ""
                }`
              )

              .input(
                "usuario_creacion",
                sql.VarChar,
                responsableFinal
              )

              .input(
                "fecha_entrada",
                sql.DateTime2,
                capa.fecha_entrada ||
                fechaCreacion
              )

              .input(
                "codigo_proveedor",
                sql.VarChar,
                capa.codigo_proveedor ||
                codigoProveedor ||
                null
              )

              .input(
                "casa_comercial",
                sql.VarChar,
                capa.casa_comercial ||
                casaComercial ||
                null
              )

              .query(`

                INSERT INTO dbo.capas_costo_inventario (

                  producto_id,
                  bodega,
                  lote,
                  fecha_vencimiento,

                  origen,
                  origen_id,

                  estado_costo,
                  costo_unitario,
                  motivo_sin_costo,

                  cantidad_original,
                  cantidad_disponible,

                  capa_origen_id,

                  proveedor_id,
                  referencia_documento,

                  observacion,
                  usuario_creacion,
                  fecha_entrada,

                  codigo_proveedor,
                  casa_comercial

                )

                OUTPUT
                  INSERTED.id

                VALUES (

                  @producto_id,
                  @bodega,
                  @lote,
                  @fecha_vencimiento,

                  @origen,
                  @origen_id,

                  @estado_costo,
                  @costo_unitario,
                  @motivo_sin_costo,

                  @cantidad_original,
                  @cantidad_disponible,

                  @capa_origen_id,

                  @proveedor_id,
                  @referencia_documento,

                  @observacion,
                  @usuario_creacion,
                  @fecha_entrada,

                  @codigo_proveedor,
                  @casa_comercial

                )

              `);


          const capaDestinoId =
            Number(
              nuevaCapaResult
                .recordset[0]
                .id
            );


          /* ===============================================
             22.3 MOVIMIENTO CAPA SALIDA
             =============================================== */

          await new sql.Request(
            transaction
          )

            .input(
              "capa_id",
              sql.Int,
              Number(
                capa.id
              )
            )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "tipo_movimiento",
              sql.VarChar,
              "TRASLADO_SALIDA"
            )

            .input(
              "documento",
              sql.VarChar,
              numeroFinal
            )

            .input(
              "documento_id",
              sql.Int,
              trasladoDetalleId
            )

            .input(
              "bodega_origen",
              sql.VarChar,
              bodegaOrigen
            )

            .input(
              "bodega_destino",
              sql.VarChar,
              bodegaDestino
            )

            .input(
              "lote",
              sql.VarChar,
              capa.lote ||
              lote ||
              null
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              mover
            )

            .input(
              "costo_unitario",
              sql.Decimal(
                18,
                6
              ),
              costoUnitario
            )

            .input(
              "valor_movimiento",
              sql.Decimal(
                18,
                6
              ),
              valorMovimiento
            )

            .input(
              "estado_costo",
              sql.VarChar,
              capa.estado_costo
            )

            .input(
              "usuario",
              sql.VarChar,
              responsableFinal
            )

            .input(
              "observacion",
              sql.VarChar,
              observacionFinal
            )

            .query(`

              INSERT INTO dbo.movimientos_capas_costo (

                capa_id,
                producto_id,
                tipo_movimiento,
                documento,
                documento_id,
                bodega_origen,
                bodega_destino,
                lote,
                cantidad,
                costo_unitario,
                valor_movimiento,
                estado_costo,
                usuario,
                observacion

              )

              VALUES (

                @capa_id,
                @producto_id,
                @tipo_movimiento,
                @documento,
                @documento_id,
                @bodega_origen,
                @bodega_destino,
                @lote,
                @cantidad,
                @costo_unitario,
                @valor_movimiento,
                @estado_costo,
                @usuario,
                @observacion

              )

            `);


          /* ===============================================
             22.4 MOVIMIENTO CAPA ENTRADA
             =============================================== */

          await new sql.Request(
            transaction
          )

            .input(
              "capa_id",
              sql.Int,
              capaDestinoId
            )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "tipo_movimiento",
              sql.VarChar,
              "TRASLADO_ENTRADA"
            )

            .input(
              "documento",
              sql.VarChar,
              numeroFinal
            )

            .input(
              "documento_id",
              sql.Int,
              trasladoDetalleId
            )

            .input(
              "bodega_origen",
              sql.VarChar,
              bodegaOrigen
            )

            .input(
              "bodega_destino",
              sql.VarChar,
              bodegaDestino
            )

            .input(
              "lote",
              sql.VarChar,
              capa.lote ||
              lote ||
              null
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              mover
            )

            .input(
              "costo_unitario",
              sql.Decimal(
                18,
                6
              ),
              costoUnitario
            )

            .input(
              "valor_movimiento",
              sql.Decimal(
                18,
                6
              ),
              valorMovimiento
            )

            .input(
              "estado_costo",
              sql.VarChar,
              capa.estado_costo
            )

            .input(
              "usuario",
              sql.VarChar,
              responsableFinal
            )

            .input(
              "observacion",
              sql.VarChar,
              observacionFinal
            )

            .query(`

              INSERT INTO dbo.movimientos_capas_costo (

                capa_id,
                producto_id,
                tipo_movimiento,
                documento,
                documento_id,
                bodega_origen,
                bodega_destino,
                lote,
                cantidad,
                costo_unitario,
                valor_movimiento,
                estado_costo,
                usuario,
                observacion

              )

              VALUES (

                @capa_id,
                @producto_id,
                @tipo_movimiento,
                @documento,
                @documento_id,
                @bodega_origen,
                @bodega_destino,
                @lote,
                @cantidad,
                @costo_unitario,
                @valor_movimiento,
                @estado_costo,
                @usuario,
                @observacion

              )

            `);


          capasTrasladadas.push({

            capa_origen_id:
              Number(
                capa.id
              ),

            capa_destino_id:
              capaDestinoId,

            cantidad:
              mover,

            costo_unitario:
              costoUnitario,

            valor:
              valorMovimiento,

            estado_costo:
              capa.estado_costo

          });


          cantidadPendiente -=
            mover;

        }


        if (
          cantidadPendiente >
          0.0001
        ) {

          throw new Error(
            `No fue posible trasladar completamente las capas de ${invOrigen.producto}`
          );

        }


        resumenCostos.push({

          traslado_detalle_id:
            trasladoDetalleId,

          codigo:
            invOrigen.codigo,

          producto:
            invOrigen.producto,

          cantidad,

          valor_conocido:
            valorConocido,

          cantidad_costo_pendiente:
            cantidadCostoPendiente,

          capas:
            capasTrasladadas

        });

      }


      /* =====================================================
         23. AUDITORÍA
         ===================================================== */

      try {

        await new sql.Request(
          transaction
        )

          .input(
            "usuario",
            sql.VarChar,
            req.session?.usuario?.username ||
            responsableFinal
          )

          .input(
            "modulo",
            sql.VarChar,
            "TRASLADOS"
          )

          .input(
            "accion",
            sql.VarChar,
            "REGISTRAR TRASLADO"
          )

          .input(
            "detalle",
            sql.VarChar,
            `${numeroFinal} / ${bodegaOrigen} → ${bodegaDestino}`
          )

          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         24. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        numero_traslado:
          numeroFinal,

        traslado_id:
          trasladoId,

        fecha_creacion:
          fechaCreacion,

        detalle_costos:
          resumenCostos

      });


    } catch (error) {

      /* =====================================================
         ROLLBACK
         ===================================================== */

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR REGISTRAR TRASLADO:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al registrar traslado"

        });

    }

  }
);

/* LISTA TRASLADOS*/
app.get("/api/traslados", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        id,
        numero_traslado,
        fecha_creacion,
        bodega_origen,
        bodega_destino,
        responsable,
        observacion
      FROM traslados
      ORDER BY id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR TRASLADOS:", error);
    res.status(500).json({ error: error.message || "Error al obtener traslados" });
  }
});

/*DETALLE TRASLADO */
app.get("/api/traslados/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const encabezado = await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT TOP 1
          id,
          numero_traslado,
          fecha_creacion,
          bodega_origen,
          bodega_destino,
          responsable,
          observacion
        FROM traslados
        WHERE id = @id
      `);

    if (!encabezado.recordset.length) {
      return res.status(404).json({ error: "Traslado no encontrado" });
    }

    const detalle = await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT
          codigo,
          producto,
          codigo_proveedor AS codigoProveedor,
          lote,
          vencimiento,
          cantidad,
          categoria,
          casa_comercial AS casaComercial
        FROM traslados_detalle
        WHERE traslado_id = @id
        ORDER BY id ASC
      `);

    res.json({
      encabezado: encabezado.recordset[0],
      detalle: detalle.recordset
    });
  } catch (error) {
    console.error("ERROR DETALLE TRASLADO:", error);
    res.status(500).json({ error: error.message || "Error al obtener detalle del traslado" });
  }
});

/* SUBIR - LISTAR - DESCARGAR Y ELIMINAR ARCHIVOS DE PACIENTES*/
app.post("/api/pacientes/:id/archivos", requireAuth, uploadPacienteArchivo.single("archivo"), async (req, res) => {
  try {
    const pacienteId = Number(req.params.id);

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    const pool = await getPool();

    const pacienteExiste = await pool.request()
      .input("id", sql.Int, pacienteId)
      .query(`
        SELECT TOP 1 id
        FROM pacientes
        WHERE id = @id
      `);

    if (!pacienteExiste.recordset.length) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    await pool.request()
      .input("paciente_id", sql.Int, pacienteId)
      .input("nombre_original", sql.VarChar, req.file.originalname)
      .input("nombre_guardado", sql.VarChar, req.file.filename)
      .input("ruta_archivo", sql.VarChar, `${req.carpetaPacienteRelativa}/${req.file.filename}`)
      .input("extension", sql.VarChar, path.extname(req.file.originalname).replace(".", "").toLowerCase())
      .input("tipo_mime", sql.VarChar, req.file.mimetype)
      .input("tamanio_bytes", sql.BigInt, req.file.size)
      .input("subido_por", sql.VarChar, req.session.usuario.username)
      .query(`
        INSERT INTO pacientes_archivos (
          paciente_id,
          nombre_original,
          nombre_guardado,
          ruta_archivo,
          extension,
          tipo_mime,
          tamanio_bytes,
          subido_por
        )
        VALUES (
          @paciente_id,
          @nombre_original,
          @nombre_guardado,
          @ruta_archivo,
          @extension,
          @tipo_mime,
          @tamanio_bytes,
          @subido_por
        )
      `);

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR SUBIR ARCHIVO PACIENTE:", error);
    res.status(500).json({ error: error.message || "Error al subir archivo" });
  }
});

app.get("/api/pacientes/:id/archivos", requireAuth, async (req, res) => {
  try {
    const pacienteId = Number(req.params.id);
    const pool = await getPool();

    const result = await pool.request()
      .input("paciente_id", sql.Int, pacienteId)
      .query(`
        SELECT
          id,
          paciente_id,
          nombre_original,
          nombre_guardado,
          ruta_archivo,
          extension,
          tipo_mime,
          tamanio_bytes,
          subido_por,
          fecha_subida
        FROM pacientes_archivos
        WHERE paciente_id = @paciente_id
        ORDER BY id DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR ARCHIVOS PACIENTE:", error);
    res.status(500).json({ error: "Error al obtener archivos" });
  }
});

app.get("/api/pacientes/archivos/:archivoId/download", requireAuth, async (req, res) => {
  try {
    const archivoId = Number(req.params.archivoId);
    const pool = await getPool();

    const result = await pool.request()
      .input("id", sql.Int, archivoId)
      .query(`
        SELECT TOP 1
          nombre_original,
          nombre_guardado
        FROM pacientes_archivos
        WHERE id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    const archivo = result.recordset[0];
    const rutaCompleta = path.join(uploadDir, archivo.nombre_guardado);

    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({ error: "El archivo no existe en el servidor" });
    }

    res.download(rutaCompleta, archivo.nombre_original);
  } catch (error) {
    console.error("ERROR DESCARGAR ARCHIVO PACIENTE:", error);
    res.status(500).json({ error: "Error al descargar archivo" });
  }
});

app.delete("/api/pacientes/archivos/:archivoId", requireAuth, async (req, res) => {
  try {
    const archivoId = Number(req.params.archivoId);
    const pool = await getPool();

    const result = await pool.request()
      .input("id", sql.Int, archivoId)
      .query(`
        SELECT TOP 1
          id,
          nombre_guardado,
          ruta_archivo
        FROM pacientes_archivos
        WHERE id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    const archivo = result.recordset[0];

    const rutaRelativa = String(archivo.ruta_archivo || "").replace(/^\/+/, "");
    const rutaCompleta = path.join(__dirname, ...rutaRelativa.split("/"));

    await pool.request()
      .input("id", sql.Int, archivoId)
      .query(`
        DELETE FROM pacientes_archivos
        WHERE id = @id
      `);

    if (fs.existsSync(rutaCompleta)) {
      fs.unlinkSync(rutaCompleta);
    }

    try {
      await pool.request()
        .input("usuario", sql.VarChar, req.session.usuario.username)
        .input("modulo", sql.VarChar, "PACIENTES")
        .input("accion", sql.VarChar, "ELIMINAR ARCHIVO PACIENTE")
        .input("detalle", sql.VarChar, `Archivo ID ${archivoId}`)
        .query(`
          INSERT INTO auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    res.json({ ok: true });
  } catch (error) {
    console.error("ERROR ELIMINAR ARCHIVO PACIENTE:", error);
    res.status(500).json({ error: "Error al eliminar archivo" });
  }
});

/*ENDPOINT PARA ENVIAR CONSIGNACION */
app.post("/api/descargos/consignacion/enviar", requireAuth, async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "Seleccione al menos un registro" });
    }

    await transaction.begin();

    const idsNumericos = ids
      .map(x => Number(x))
      .filter(x => !Number.isNaN(x) && x > 0);

    if (!idsNumericos.length) {
      throw new Error("IDs no válidos");
    }

    const idsSql = idsNumericos.join(",");

    const result = await new sql.Request(transaction).query(`
    SELECT
  dd.id,
  dd.descargo_id,
  dd.numero_descargo,
  dd.codigo,
  dd.producto,
  dd.categoria,
  dd.cantidad,
  dd.lote,
  CONVERT(VARCHAR(10), dd.fecha_expiracion, 23) AS fecha_expiracion,
  dd.casa_comercial,
  dd.codigo_proveedor,
  dd.observacion,
  d.nombre_paciente,
  CONVERT(VARCHAR(10), d.fecha_procedimiento, 23) AS fecha_procedimiento,
  d.responsable,
  d.archivo,
  d.origen,
  c.correos
      FROM dbo.descargos_detalle dd
      INNER JOIN dbo.descargos d
        ON d.id = dd.descargo_id
      INNER JOIN dbo.casas_comerciales c
        ON LTRIM(RTRIM(UPPER(c.nombre))) = LTRIM(RTRIM(UPPER(dd.casa_comercial)))
      WHERE dd.id IN (${idsSql})
        AND ISNULL(dd.reporte_enviado, 0) = 0
    `);

    const registros = result.recordset || [];

    if (!registros.length) {
      throw new Error("No se encontraron registros pendientes para enviar");
    }

    const grupos = {};
    for (const item of registros) {
      const casa = String(item.casa_comercial || "").trim();
      if (!casa) continue;
      if (!grupos[casa]) grupos[casa] = [];
      grupos[casa].push(item);
    }

    const casas = Object.keys(grupos);
    if (!casas.length) {
      throw new Error("No hay registros con casa comercial válida");
    }

    for (const casa of casas) {
      const itemsCasa = grupos[casa];
      const correosRaw = String(itemsCasa[0].correos || "").trim();

      if (!correosRaw) {
        throw new Error(`La casa comercial ${casa} no tiene correos registrados`);
      }

      const destinatarios = correosRaw
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
        .join(", ");

      const pdfBuffer = generarPdfConsignacionBase64({
        casaComercial: casa,
        registros: itemsCasa
      });

      const subject = `INSUMOS UTILIZADOS CENT - ${casa}`;

      const textoPlano = `Estimados señores de ${casa}:

Por medio de la presente, solicitamos su gentil apoyo para proceder con la facturación de los insumos utilizados bajo modalidad de consignación en nuestra institución.

A continuación, detallamos la información para su validación y proceso:

Datos de la institución:

Razón social: CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S.
RUC: 0993399290001
Dirección: Rumichaca 3304 Argentina y club sport Emelec
Ciudad: Guayaquil
Teléfono: 0990838306
Correo: cent.hemodinamia@gmail.com

Agradeceremos emitir la factura a nombre de CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S., 0993399290001, y remitirla al correo cent.hemodinamia@gmail.com.

Muchas gracias por su atención y pronta gestión.

Atentamente,
SISTEMA AUTOMATICO CENT
`;

      const html = `
        <p>Estimados señores de <strong>${casa}</strong>:</p>

        <p>Por medio de la presente, solicitamos su gentil apoyo para proceder con la facturación de los insumos utilizados bajo modalidad de consignación en nuestra institución.</p>

        <p>A continuación, detallamos la información para su validación y proceso:</p>

        <p><strong>Datos de la institución:</strong></p>

        <p>
          Razón social: CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S.<br>
          RUC: 0993399290001<br>
          Dirección: Rumichaca 3304 Argentina y club sport Emelec<br>
          Ciudad: Guayaquil<br>
          Teléfono: 0990838306<br>
          Correo: cent.hemodinamia@gmail.com
        </p>

        <p>
          Agradeceremos emitir la factura a nombre de
          <strong>CENT INSTITUTO ESPECIALIZADO EN HEMODINAMIA DEL ECUADOR. S.A.S.</strong>,
          <strong>0993399290001</strong>,
          y remitirla al correo <strong>cent.hemodinamia@gmail.com</strong>.
        </p>

        <p>Muchas gracias por su atención y pronta gestión.</p>

        <p>
          Atentamente,<br>
          SISTEMA AUTOMATICO CENT<br>
        </p>
      `;

      await enviarCorreo({
        to: destinatarios,
        subject,
        text: textoPlano,
        html,
        attachments: [
          {
            filename: `INSUMOS_CONSIGNACION_${String(casa).replace(/[\\/:*?"<>|]+/g, "_")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          }
        ]
      });

      const idsCasa = itemsCasa.map(x => Number(x.id)).join(",");

      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session.usuario.username)
        .query(`
          UPDATE dbo.descargos_detalle
          SET
            reporte_enviado = 1,
            fecha_envio_reporte = GETDATE(),
            enviado_por = @usuario
          WHERE id IN (${idsCasa})
        `);
    }

    try {
      await new sql.Request(transaction)
        .input("usuario", sql.VarChar, req.session.usuario.username)
        .input("modulo", sql.VarChar, "DESCARGOS")
        .input("accion", sql.VarChar, "ENVIAR REPORTE CONSIGNACION")
        .input("detalle", sql.VarChar, `Registros enviados: ${idsNumericos.join(",")}`)
        .query(`
          INSERT INTO auditoria_eventos (usuario, modulo, accion, detalle)
          VALUES (@usuario, @modulo, @accion, @detalle)
        `);
    } catch (_) {}

    await transaction.commit();

    res.json({ ok: true, enviados: idsNumericos.length });
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    console.error("ERROR ENVIAR CONSIGNACION:", error);
    res.status(500).json({ error: error.message || "Error al enviar reporte de consignación" });
  }
});

/*ENDPOINT HISTORIAL DESCARGOS ENVIADOS POR CORREO */
app.get("/api/descargos/consignacion/enviados", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        dd.id,
        dd.descargo_id,
        dd.numero_descargo,
        dd.codigo,
        dd.producto,
        dd.categoria,
        dd.cantidad,
        dd.lote,
        CONVERT(VARCHAR(10), dd.fecha_expiracion, 23) AS fecha_expiracion,
        dd.casa_comercial,
        dd.codigo_proveedor,
        dd.observacion,
        d.nombre_paciente,
        CONVERT(VARCHAR(10), d.fecha_procedimiento, 23) AS fecha_procedimiento,
        d.responsable,
        d.archivo,
        d.origen,
        CONVERT(VARCHAR(10), dd.fecha_envio_reporte, 23) AS fecha_envio_reporte,
        dd.enviado_por
      FROM dbo.descargos_detalle dd
      INNER JOIN dbo.descargos d
        ON d.id = dd.descargo_id
      WHERE ISNULL(dd.reporte_enviado, 0) = 1
      ORDER BY dd.fecha_envio_reporte DESC, dd.id DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("ERROR LISTAR CONSIGNACION ENVIADA:", error);
    res.status(500).json({ error: "Error al obtener historial de consignación enviada" });
  }
});

/* ENDPOINT LISTAR PROVEEDORES */
app.get("/api/proveedores",
  requireAuth,
  requireAnyPermission([
    "compras.ingresar",
    "compras.proveedores_registrar",
    "compras.proveedores_consultar"
  ]),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          id,
          nombre,
          ruc,
          correo,
          telefono,
          notas,
          estado,
          fecha_creacion
        FROM proveedores
        ORDER BY nombre ASC
      `);

      res.json(result.recordset);
    } catch (error) {
      console.error("ERROR LISTAR PROVEEDORES:", error);
      res.status(500).json({
        error: "Error al obtener proveedores"
      });
    }
  }
);


/* ENDPOINT CREAR PROVEEDORES */
app.post("/api/proveedores",
  requireAuth,
  requirePermission(
    "compras.proveedores_registrar"
  ),
  async (req, res) => {
    try {
      const {
        nombre,
        ruc,
        correo,
        telefono,
        notas
      } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          error: "Ingrese el nombre del proveedor"
        });
      }

      if (!ruc || !ruc.trim()) {
        return res.status(400).json({
          error: "Ingrese el RUC del proveedor"
        });
      }

      const pool = await getPool();

      await pool.request()
        .input(
          "nombre",
          sql.VarChar,
          nombre.trim().toUpperCase()
        )
        .input(
          "ruc",
          sql.VarChar,
          ruc.trim()
        )
        .input(
          "correo",
          sql.VarChar,
          correo ? correo.trim() : null
        )
        .input(
          "telefono",
          sql.VarChar,
          telefono ? telefono.trim() : null
        )
        .input(
          "notas",
          sql.VarChar,
          notas ? notas.trim() : null
        )
        .query(`
          INSERT INTO proveedores (
            nombre,
            ruc,
            correo,
            telefono,
            notas
          )
          VALUES (
            @nombre,
            @ruc,
            @correo,
            @telefono,
            @notas
          )
        `);

      res.json({
        ok: true
      });

    } catch (error) {
      console.error(
        "ERROR CREAR PROVEEDOR:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(400).json({
          error:
            "Ya existe un proveedor con ese RUC"
        });
      }

      res.status(500).json({
        error: "Error al crear proveedor"
      });
    }
  }
);


/* ENDPOINT EDITAR PROVEEDOR */
app.put("/api/proveedores/:id",
  requireAuth,
  requirePermission(
    "compras.proveedores_registrar"
  ),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        nombre,
        ruc,
        correo,
        telefono,
        notas
      } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          error: "Ingrese el nombre del proveedor"
        });
      }

      if (!ruc || !ruc.trim()) {
        return res.status(400).json({
          error: "Ingrese el RUC del proveedor"
        });
      }

      const pool = await getPool();

      await pool.request()
        .input(
          "id",
          sql.Int,
          Number(id)
        )
        .input(
          "nombre",
          sql.VarChar,
          nombre.trim().toUpperCase()
        )
        .input(
          "ruc",
          sql.VarChar,
          ruc.trim()
        )
        .input(
          "correo",
          sql.VarChar,
          correo ? correo.trim() : null
        )
        .input(
          "telefono",
          sql.VarChar,
          telefono ? telefono.trim() : null
        )
        .input(
          "notas",
          sql.VarChar,
          notas ? notas.trim() : null
        )
        .query(`
          UPDATE proveedores
          SET
            nombre = @nombre,
            ruc = @ruc,
            correo = @correo,
            telefono = @telefono,
            notas = @notas
          WHERE id = @id
        `);

      res.json({
        ok: true
      });

    } catch (error) {
      console.error(
        "ERROR EDITAR PROVEEDOR:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(400).json({
          error:
            "Ya existe un proveedor con ese RUC"
        });
      }

      res.status(500).json({
        error:
          "Error al actualizar proveedor"
      });
    }
  }
);


/* ENDPOINT CAMBIAR ESTADO DE PROVEEDOR */
app.patch("/api/proveedores/estado/:id",
  requireAuth,
  requirePermission(
    "compras.proveedores_registrar"
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pool = await getPool();

      await pool.request()
        .input(
          "id",
          sql.Int,
          Number(id)
        )
        .query(`
          UPDATE proveedores
          SET estado =
            CASE
              WHEN estado = 'ACTIVO'
                THEN 'INACTIVO'
              ELSE 'ACTIVO'
            END
          WHERE id = @id
        `);

      res.json({
        ok: true
      });

    } catch (error) {
      console.error(
        "ERROR CAMBIAR ESTADO PROVEEDOR:",
        error
      );

      res.status(500).json({
        error:
          "Error al cambiar estado del proveedor"
      });
    }
  }
);

/* SIGUIENTE NÚMERO DE COMPRA */
app.get("/api/compras/siguiente-numero",
  requireAuth,
  requirePermission(
    "compras.ingresar"
  ),
  async (req, res) => {
    try {
      const pool = await getPool();

      const result =
        await pool.request().query(`
          SELECT TOP 1
            numero_compra
          FROM compras
          ORDER BY id DESC
        `);

      let siguiente = 1000;

      if (
        result.recordset.length
      ) {
        const ultimo =
          String(
            result.recordset[0]
              .numero_compra || ""
          );

        const match =
          ultimo.match(
            /COMP-(\d+)/i
          );

        if (match) {
          siguiente =
            Number(match[1]) + 1;
        }
      }

      res.json({
        numero:
          `COMP-${siguiente}`
      });

    } catch (error) {
      console.error(
        "ERROR SIGUIENTE NUMERO COMPRA:",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener siguiente número de compra"
      });
    }
  }
);


/* =========================================================
   REGISTRAR COMPRA
   ========================================================= */

app.post("/api/compras",

  requireAuth,

  requirePermission(
    "compras.ingresar"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(
        pool
      );


    try {

      const {
        numero_compra,
        proveedor_id,
        numero_factura,
        fecha_compra,
        bodega,
        responsable,
        observacion,
        subtotal_0,
        subtotal_15,
        iva_15,
        total,
        detalle
      } = req.body;


      const bodegaFinal =
        String(
          bodega || ""
        ).trim();


      const responsableFinal =
        String(
          responsable ||
          req.session.usuario?.username ||
          ""
        ).trim();


      /* =====================================================
         1. VALIDACIONES PRINCIPALES
         ===================================================== */

      if (
        !proveedor_id ||
        !numero_factura ||
        !fecha_compra ||
        !bodegaFinal
      ) {

        return res
          .status(400)
          .json({
            error:
              "Datos principales incompletos"
          });

      }


      if (
        !Array.isArray(detalle) ||
        !detalle.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "Debe agregar al menos un artículo"
          });

      }


      await transaction.begin();


      /* =====================================================
         2. VALIDAR BODEGA
         ===================================================== */

      const bodegaResult =
        await new sql.Request(
          transaction
        )
          .input(
            "nombre",
            sql.VarChar,
            bodegaFinal
          )
          .query(`

            SELECT TOP 1

              id,
              nombre,
              estado

            FROM dbo.bodegas

            WHERE

              UPPER(
                LTRIM(
                  RTRIM(nombre)
                )
              ) =
              UPPER(
                LTRIM(
                  RTRIM(@nombre)
                )
              )

              AND UPPER(
                    LTRIM(
                      RTRIM(estado)
                    )
                  ) =
                  'ACTIVO'

              AND UPPER(
                    LTRIM(
                      RTRIM(nombre)
                    )
                  ) <>
                  'CUARENTENA'

          `);


      if (
        !bodegaResult
          .recordset
          .length
      ) {

        throw new Error(
          "La bodega seleccionada no existe, está inactiva o no admite compras."
        );

      }


      const nombreBodegaReal =
        String(
          bodegaResult
            .recordset[0]
            .nombre
        ).trim();


      /* =====================================================
         3. VALIDAR PROVEEDOR
         ===================================================== */

      const proveedorResult =
        await new sql.Request(
          transaction
        )
          .input(
            "id",
            sql.Int,
            Number(proveedor_id)
          )
          .query(`

            SELECT TOP 1

              id,
              nombre,
              ruc,
              estado

            FROM dbo.proveedores

            WHERE
              id = @id

          `);


      if (
        !proveedorResult
          .recordset
          .length
      ) {

        throw new Error(
          "Proveedor no encontrado"
        );

      }


      const proveedor =
        proveedorResult
          .recordset[0];


      if (
        String(
          proveedor.estado || ""
        )
          .trim()
          .toUpperCase()
        !== "ACTIVO"
      ) {

        throw new Error(
          "El proveedor está inactivo"
        );

      }


      /* =====================================================
         4. NÚMERO DE COMPRA
         ===================================================== */

      const numeroFinal =

        numero_compra &&
        String(numero_compra).trim()

          ? String(
              numero_compra
            ).trim()

          : `COMP-${Date.now()}`;


      /* =====================================================
         5. INSERTAR CABECERA DE COMPRA
         ===================================================== */

      const compraResult =
        await new sql.Request(
          transaction
        )
          .input(
            "numero_compra",
            sql.VarChar,
            numeroFinal
          )
          .input(
            "proveedor_id",
            sql.Int,
            Number(proveedor.id)
          )
          .input(
            "nombre_proveedor",
            sql.VarChar,
            proveedor.nombre
          )
          .input(
            "ruc_proveedor",
            sql.VarChar,
            proveedor.ruc
          )
          .input(
            "numero_factura",
            sql.VarChar,
            String(
              numero_factura
            ).trim()
          )
          .input(
            "fecha_compra",
            sql.Date,
            fecha_compra
          )
          .input(
            "bodega",
            sql.VarChar,
            nombreBodegaReal
          )
          .input(
            "subtotal_0",
            sql.Decimal(18, 2),
            Number(
              subtotal_0 || 0
            )
          )
          .input(
            "subtotal_15",
            sql.Decimal(18, 2),
            Number(
              subtotal_15 || 0
            )
          )
          .input(
            "iva_15",
            sql.Decimal(18, 2),
            Number(
              iva_15 || 0
            )
          )
          .input(
            "total",
            sql.Decimal(18, 2),
            Number(
              total || 0
            )
          )
          .input(
            "responsable",
            sql.VarChar,
            responsableFinal
          )
          .input(
            "observacion",
            sql.VarChar,
            observacion || null
          )
          .query(`

            INSERT INTO dbo.compras (

              numero_compra,
              proveedor_id,
              nombre_proveedor,
              ruc_proveedor,
              numero_factura,
              fecha_compra,
              bodega,
              subtotal_0,
              subtotal_15,
              iva_15,
              total,
              responsable,
              observacion

            )

            OUTPUT
              INSERTED.id

            VALUES (

              @numero_compra,
              @proveedor_id,
              @nombre_proveedor,
              @ruc_proveedor,
              @numero_factura,
              @fecha_compra,
              @bodega,
              @subtotal_0,
              @subtotal_15,
              @iva_15,
              @total,
              @responsable,
              @observacion

            )

          `);


      const compraId =
        Number(
          compraResult
            .recordset[0]
            .id
        );


      /* =====================================================
         6. RECORRER ARTÍCULOS
         ===================================================== */

      for (
        const item of detalle
      ) {

        const productoId =
          Number(
            item.producto_id || 0
          );


        const cantidad =
          Number(
            item.cantidad || 0
          );


        const precioUnitario =
          Number(
            item.precio_unitario
          );


        const lote =
          String(
            item.lote || ""
          ).trim();


        const codigoProveedor =
          String(
            item.codigo_vendedor || ""
          ).trim();


        const manejaLote =
          lote !== "";


        if (
          !productoId ||
          !Number.isFinite(cantidad) ||
          cantidad <= 0 ||
          !Number.isFinite(precioUnitario) ||
          precioUnitario < 0
        ) {

          throw new Error(
            "Detalle de compra no válido"
          );

        }


        /* ===================================================
           7. PRODUCTO
           =================================================== */

        const productoResult =
          await new sql.Request(
            transaction
          )
            .input(
              "id",
              sql.Int,
              productoId
            )
            .query(`

              SELECT TOP 1

                id,
                codigo,
                producto,
                categoria,
                unidad

              FROM dbo.productos

              WHERE
                id = @id

            `);


        if (
          !productoResult
            .recordset
            .length
        ) {

          throw new Error(
            "Producto no encontrado"
          );

        }


        const prod =
          productoResult
            .recordset[0];


        /* ===================================================
           8. INSERTAR DETALLE DE COMPRA

           AHORA CAPTURAMOS EL ID EXACTO
           =================================================== */

        const detalleCompraResult =
          await new sql.Request(
            transaction
          )
            .input(
              "compra_id",
              sql.Int,
              compraId
            )
            .input(
              "producto_id",
              sql.Int,
              productoId
            )
            .input(
              "codigo",
              sql.VarChar,
              prod.codigo
            )
            .input(
              "producto",
              sql.VarChar,
              prod.producto
            )
            .input(
              "categoria",
              sql.VarChar,
              prod.categoria || null
            )
            .input(
              "cantidad",
              sql.Int,
              cantidad
            )
            .input(
              "precio_unitario",
              sql.Decimal(18, 4),
              precioUnitario
            )
            .input(
              "aplica_iva",
              sql.Bit,
              item.aplica_iva
                ? 1
                : 0
            )
            .input(
              "subtotal",
              sql.Decimal(18, 2),
              Number(
                item.subtotal || 0
              )
            )
            .input(
              "iva",
              sql.Decimal(18, 2),
              Number(
                item.iva || 0
              )
            )
            .input(
              "total",
              sql.Decimal(18, 2),
              Number(
                item.total || 0
              )
            )
            .input(
              "lote",
              sql.VarChar,
              lote || null
            )
            .input(
              "codigo_vendedor",
              sql.VarChar,
              codigoProveedor || null
            )
            .input(
              "fecha_vencimiento",
              sql.Date,
              item.fecha_vencimiento || null
            )
            .query(`

              INSERT INTO dbo.compras_detalle (

                compra_id,
                producto_id,
                codigo,
                producto,
                categoria,
                cantidad,
                precio_unitario,
                aplica_iva,
                subtotal,
                iva,
                total,
                lote,
                codigo_vendedor,
                fecha_vencimiento

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @compra_id,
                @producto_id,
                @codigo,
                @producto,
                @categoria,
                @cantidad,
                @precio_unitario,
                @aplica_iva,
                @subtotal,
                @iva,
                @total,
                @lote,
                @codigo_vendedor,
                @fecha_vencimiento

              )

            `);


        const detalleCompraId =
          Number(
            detalleCompraResult
              .recordset[0]
              .id
          );


        /* ===================================================
           9. BUSCAR INVENTARIO
           =================================================== */

        const inventarioExistente =
          await new sql.Request(
            transaction
          )
            .input(
              "producto_id",
              sql.Int,
              productoId
            )
            .input(
              "bodega",
              sql.VarChar,
              nombreBodegaReal
            )
            .query(`

              SELECT TOP 1

                id,
                stock,
                stock_minimo,
                ubicacion

              FROM dbo.inventario
                WITH (
                  UPDLOCK,
                  HOLDLOCK
                )

              WHERE

                producto_id =
                  @producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(bodega)
                      )
                    ) =
                    UPPER(
                      LTRIM(
                        RTRIM(@bodega)
                      )
                    )

            `);


        let inventarioId =
          null;


        /* ===================================================
           10. INVENTARIO EXISTENTE

           IMPORTANTE:
           SIEMPRE sumamos la compra al stock general,
           tenga lote o no tenga lote.
           =================================================== */

        if (
          inventarioExistente
            .recordset
            .length
        ) {

          inventarioId =
            Number(
              inventarioExistente
                .recordset[0]
                .id
            );


          await new sql.Request(
            transaction
          )
            .input(
              "id",
              sql.Int,
              inventarioId
            )
            .input(
              "cantidad",
              sql.Int,
              cantidad
            )
            .input(
              "responsable",
              sql.VarChar,
              responsableFinal
            )
            .input(
              "observacion",
              sql.VarChar,
              `Compra ${numeroFinal}`
            )
            .query(`

              UPDATE dbo.inventario

              SET

                stock =
                  ISNULL(
                    stock,
                    0
                  ) +
                  @cantidad,

                responsable =
                  @responsable,

                observacion =
                  @observacion,

                fecha_actualizacion =
                  GETDATE()

              WHERE
                id = @id

            `);

        }


        /* ===================================================
           11. INVENTARIO NUEVO

           También comienza directamente
           con la cantidad comprada.
           =================================================== */

        else {

          const inventarioInsert =
            await new sql.Request(
              transaction
            )
              .input(
                "producto_id",
                sql.Int,
                productoId
              )
              .input(
                "bodega",
                sql.VarChar,
                nombreBodegaReal
              )
              .input(
                "stock",
                sql.Int,
                cantidad
              )
              .input(
                "stock_minimo",
                sql.Int,
                0
              )
              .input(
                "ubicacion",
                sql.VarChar,
                null
              )
              .input(
                "responsable",
                sql.VarChar,
                responsableFinal
              )
              .input(
                "observacion",
                sql.VarChar,
                `Compra ${numeroFinal}`
              )
              .query(`

                INSERT INTO dbo.inventario (

                  producto_id,
                  bodega,
                  stock,
                  stock_minimo,
                  ubicacion,
                  responsable,
                  observacion

                )

                OUTPUT
                  INSERTED.id

                VALUES (

                  @producto_id,
                  @bodega,
                  @stock,
                  @stock_minimo,
                  @ubicacion,
                  @responsable,
                  @observacion

                )

              `);


          inventarioId =
            Number(
              inventarioInsert
                .recordset[0]
                .id
            );

        }


        /* ===================================================
           12. CONTROL FÍSICO DE LOTE

           El lote sigue teniendo su saldo físico.

           NO determina las capas económicas.
           =================================================== */

        let vencimientoFinal =
          manejaLote
            ? (
                item.fecha_vencimiento ||
                null
              )
            : null;


        if (
          manejaLote
        ) {

          const lotePrevioResult =
            await new sql.Request(
              transaction
            )
              .input(
                "bodega",
                sql.VarChar,
                nombreBodegaReal
              )
              .input(
                "producto_id",
                sql.Int,
                productoId
              )
              .input(
                "lote",
                sql.VarChar,
                lote
              )
              .input(
                "codigoproveedor",
                sql.VarChar,
                codigoProveedor
              )
              .input(
                "casa_comercial",
                sql.VarChar,
                proveedor.nombre || ""
              )
              .query(`

                SELECT TOP 1

                  id,
                  stock_lote,
                  vencimiento

                FROM dbo.detalleEntradas
                  WITH (
                    UPDLOCK,
                    HOLDLOCK
                  )

                WHERE

                  producto_id =
                    @producto_id

                  AND UPPER(
                        LTRIM(
                          RTRIM(bodega)
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@bodega)
                        )
                      )

                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              lote,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(@lote)
                        )
                      )

                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              codigoproveedor,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @codigoproveedor
                          )
                        )
                      )

                  AND UPPER(
                        LTRIM(
                          RTRIM(
                            ISNULL(
                              casa_comercial,
                              ''
                            )
                          )
                        )
                      ) =
                      UPPER(
                        LTRIM(
                          RTRIM(
                            @casa_comercial
                          )
                        )
                      )

                ORDER BY
                  id DESC

              `);


          let stockLoteFinal =
            cantidad;


          if (
            lotePrevioResult
              .recordset
              .length
          ) {

            const lotePrevio =
              lotePrevioResult
                .recordset[0];


            stockLoteFinal =

              Number(
                lotePrevio.stock_lote ||
                0
              )

              +

              cantidad;


            if (
              !vencimientoFinal &&
              lotePrevio.vencimiento
            ) {

              vencimientoFinal =
                lotePrevio.vencimiento;

            }

          }

          else {

            if (
              !vencimientoFinal
            ) {

              throw new Error(
                `Ingrese fecha de vencimiento para el lote ${lote} de ${prod.producto}`
              );

            }

          }


          /* =================================================
             REGISTRAR NUEVO ESTADO DEL LOTE
             ================================================= */

          await new sql.Request(
            transaction
          )
            .input(
              "bodega",
              sql.VarChar,
              nombreBodegaReal
            )
            .input(
              "producto_id",
              sql.Int,
              productoId
            )
            .input(
              "codigo",
              sql.VarChar,
              prod.codigo
            )
            .input(
              "codigoproveedor",
              sql.VarChar,
              codigoProveedor || null
            )
            .input(
              "producto",
              sql.VarChar,
              prod.producto
            )
            .input(
              "categoria",
              sql.VarChar,
              prod.categoria || null
            )
            .input(
              "cantidad",
              sql.Int,
              cantidad
            )
            .input(
              "stock_lote",
              sql.Int,
              stockLoteFinal
            )
            .input(
              "lote",
              sql.VarChar,
              lote
            )
            .input(
              "vencimiento",
              sql.Date,
              vencimientoFinal
            )
            .input(
              "casa_comercial",
              sql.VarChar,
              proveedor.nombre || null
            )
            .input(
              "stock_minimo",
              sql.Int,
              Number(
                inventarioExistente
                  .recordset?.[0]
                  ?.stock_minimo ||
                0
              )
            )
            .input(
              "ubicacion",
              sql.VarChar,
              inventarioExistente
                .recordset?.[0]
                ?.ubicacion ||
              null
            )
            .input(
              "responsable",
              sql.VarChar,
              responsableFinal
            )
            .input(
              "observacion",
              sql.VarChar,
              `Compra ${numeroFinal}`
            )
            .input(
              "origen_movimiento",
              sql.VarChar,
              "COMPRA"
            )
            .query(`

              INSERT INTO dbo.detalleEntradas (

                bodega,
                producto_id,
                codigo,
                codigoproveedor,
                producto,
                categoria,
                cantidad,
                stock_lote,
                lote,
                vencimiento,
                casa_comercial,
                stock_minimo,
                ubicacion,
                responsable,
                observacion,
                origen_movimiento

              )

              VALUES (

                @bodega,
                @producto_id,
                @codigo,
                @codigoproveedor,
                @producto,
                @categoria,
                @cantidad,
                @stock_lote,
                @lote,
                @vencimiento,
                @casa_comercial,
                @stock_minimo,
                @ubicacion,
                @responsable,
                @observacion,
                @origen_movimiento

              )

            `);

        }


        /* ===================================================
           13. CREAR CAPA DE COSTO

           MUY IMPORTANTE:

           Se crea UNA NUEVA CAPA POR CADA
           línea de compra.

           Nunca se fusiona por:

           - producto
           - lote
           - proveedor
           - precio

           Cada adquisición mantiene su identidad.
           =================================================== */


        /*
          En una compra normal:

          precio > 0
          -> CONOCIDO

          Si existe una línea de compra a $0:
          -> SIN_COSTO
          -> BONIFICACION

          Esto permite registrar, por ejemplo,
          unidades bonificadas por un proveedor.
        */

        const estadoCostoCapa =
          precioUnitario > 0
            ? "CONOCIDO"
            : "SIN_COSTO";


        const motivoSinCostoCapa =
          precioUnitario === 0
            ? "BONIFICACION"
            : null;


        await new sql.Request(
          transaction
        )
          .input(
            "producto_id",
            sql.Int,
            productoId
          )
          .input(
            "bodega",
            sql.VarChar,
            nombreBodegaReal
          )
          .input(
            "lote",
            sql.VarChar,
            manejaLote
              ? lote
              : null
          )
          .input(
            "fecha_vencimiento",
            sql.Date,
            manejaLote
              ? vencimientoFinal
              : null
          )
          .input(
            "origen",
            sql.VarChar,
            "COMPRA"
          )
          .input(
            "origen_id",
            sql.Int,
            detalleCompraId
          )
          .input(
            "estado_costo",
            sql.VarChar,
            estadoCostoCapa
          )
          .input(
            "costo_unitario",
            sql.Decimal(
              18,
              6
            ),
            precioUnitario
          )
          .input(
            "motivo_sin_costo",
            sql.VarChar,
            motivoSinCostoCapa
          )
          .input(
            "cantidad_original",
            sql.Decimal(
              18,
              4
            ),
            cantidad
          )
          .input(
            "cantidad_disponible",
            sql.Decimal(
              18,
              4
            ),
            cantidad
          )
          .input(
            "proveedor_id",
            sql.Int,
            Number(
              proveedor.id
            )
          )
          .input(
            "referencia_documento",
            sql.VarChar,
            String(
              numero_factura
            ).trim()
          )
          .input(
            "observacion",
            sql.VarChar,
            `Compra ${numeroFinal}`
          )
          .input(
            "usuario_creacion",
            sql.VarChar,
            responsableFinal
          )
          .input(
            "fecha_entrada",
            sql.DateTime2,
            new Date(
              `${fecha_compra}T12:00:00`
            )
          )
          .query(`

            INSERT INTO dbo.capas_costo_inventario (

              producto_id,
              bodega,

              lote,
              fecha_vencimiento,

              origen,
              origen_id,

              estado_costo,
              costo_unitario,
              motivo_sin_costo,

              cantidad_original,
              cantidad_disponible,

              proveedor_id,
              referencia_documento,

              observacion,
              usuario_creacion,
              fecha_entrada

            )

            VALUES (

              @producto_id,
              @bodega,

              @lote,
              @fecha_vencimiento,

              @origen,
              @origen_id,

              @estado_costo,
              @costo_unitario,
              @motivo_sin_costo,

              @cantidad_original,
              @cantidad_disponible,

              @proveedor_id,
              @referencia_documento,

              @observacion,
              @usuario_creacion,
              @fecha_entrada

            )

          `);


        /*
          IMPORTANTE:

          YA NO hacemos aquí:

          inventario.stock =
          SUM(stock_lote)

          porque un mismo producto puede tener:

          10 unidades con lote
          +
          5 unidades sin lote

          Stock físico correcto = 15.
        */

      }


      /* =====================================================
         14. AUDITORÍA
         ===================================================== */

      try {

        await new sql.Request(
          transaction
        )
          .input(
            "usuario",
            sql.VarChar,
            req.session.usuario.username
          )
          .input(
            "modulo",
            sql.VarChar,
            "COMPRAS"
          )
          .input(
            "accion",
            sql.VarChar,
            "REGISTRAR COMPRA"
          )
          .input(
            "detalle",
            sql.VarChar,
            numeroFinal
          )
          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         15. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        numero_compra:
          numeroFinal,

        compra_id:
          compraId

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR REGISTRAR COMPRA:",
        error
      );


      if (
        error.number === 2627 ||
        error.number === 2601
      ) {

        return res
          .status(400)
          .json({

            error:
              "Ya existe una compra con esa factura para ese proveedor"

          });

      }


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al registrar compra"

        });

    }

  }
);


/* LISTAR COMPRAS */
app.get("/api/compras",
  requireAuth,
  requirePermission(
    "compras.consultar"
  ),
  async (req, res) => {
    try {
      const pool =
        await getPool();

      const result =
        await pool.request().query(`
          SELECT
            id,
            numero_compra,
            proveedor_id,
            nombre_proveedor,
            ruc_proveedor,
            numero_factura,
            CONVERT(
              VARCHAR(10),
              fecha_compra,
              23
            ) AS fecha_compra,
            bodega,
            subtotal_0,
            subtotal_15,
            iva_15,
            total,
            responsable,
            observacion,
            fecha_creacion
          FROM compras
          ORDER BY id DESC
        `);

      res.json(
        result.recordset
      );

    } catch (error) {
      console.error(
        "ERROR LISTAR COMPRAS:",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener compras"
      });
    }
  }
);


/* DETALLE DE COMPRA */
app.get("/api/compras/:id",
  requireAuth,
  requirePermission(
    "compras.consultar"
  ),
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const pool =
        await getPool();

      const encabezado =
        await pool.request()
          .input(
            "id",
            sql.Int,
            Number(id)
          )
          .query(`
            SELECT TOP 1
              id,
              numero_compra,
              proveedor_id,
              nombre_proveedor,
              ruc_proveedor,
              numero_factura,
              CONVERT(
                VARCHAR(10),
                fecha_compra,
                23
              ) AS fecha_compra,
              bodega,
              subtotal_0,
              subtotal_15,
              iva_15,
              total,
              responsable,
              observacion,
              fecha_creacion
            FROM compras
            WHERE id = @id
          `);

      if (
        !encabezado
          .recordset.length
      ) {
        return res
          .status(404)
          .json({
            error:
              "Compra no encontrada"
          });
      }

      const detalle =
        await pool.request()
          .input(
            "compra_id",
            sql.Int,
            Number(id)
          )
          .query(`
            SELECT
              id,
              compra_id,
              producto_id,
              codigo,
              producto,
              categoria,
              cantidad,
              precio_unitario,
              aplica_iva,
              subtotal,
              iva,
              total,
              lote,
              codigo_vendedor,
              CONVERT(
                VARCHAR(10),
                fecha_vencimiento,
                23
              ) AS fecha_vencimiento
            FROM compras_detalle
            WHERE
              compra_id =
                @compra_id
            ORDER BY id ASC
          `);

      res.json({
        encabezado:
          encabezado.recordset[0],
        detalle:
          detalle.recordset
      });

    } catch (error) {
      console.error(
        "ERROR DETALLE COMPRA:",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener detalle de compra"
      });
    }
  }
);



app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

app.get("/api/hclinicas/pacientes/:pacienteId/documentos",requireAuth,async (req, res) => {
    try {
      const pacienteId = Number(req.params.pacienteId);

      if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
        return res.status(400).json({
          error: "Paciente no válido"
        });
      }

      const fechaProcedimiento = String(
        req.query.fecha || ""
      ).trim();

      const pool = await getPool();

      const request = pool
        .request()
        .input("paciente_id", pacienteId);

      let filtroFecha = "";

      if (fechaProcedimiento) {
        request.input(
          "fecha_procedimiento",
          fechaProcedimiento
        );

        filtroFecha = `
          AND d.fecha_procedimiento = @fecha_procedimiento
        `;
      }

      const resultado = await request.query(`
        SELECT
          d.id,
          d.paciente_id,
          d.codigo_formulario,
          d.nombre_formulario,
          d.fecha_procedimiento,
          d.version,
          d.estado,
          d.nombre_archivo,
          d.creado_por_username,
          d.creado_por_nombre,
          d.fecha_creacion
        FROM dbo.hc_documentos d
        WHERE d.paciente_id = @paciente_id
          ${filtroFecha}
          AND d.estado <> 'ANULADO'
        ORDER BY
          d.codigo_formulario,
          d.version DESC,
          d.fecha_creacion DESC
      `);

      return res.json({
        ok: true,
        documentos: resultado.recordset
      });
    } catch (error) {
      console.error(
        "ERROR LISTANDO DOCUMENTOS DEL PACIENTE:",
        error
      );

      return res.status(500).json({
        error: "No se pudieron obtener los documentos"
      });
    }
  }
);

app.get("/api/hclinicas/documentos/:id/ver",requireAuth,async (req, res) => {
    try {
      const documentoId = Number(req.params.id);

      if (!Number.isInteger(documentoId) || documentoId <= 0) {
        return res.status(400).send("Documento no válido");
      }

      const usuario = obtenerUsuarioSesionHC(req);
      const pool = await getPool();

      const resultado = await pool
        .request()
        .input("documento_id", documentoId)
        .input("username", usuario.username)
        .query(`
          SELECT TOP 1
            d.id,
            d.nombre_archivo,
            d.ruta_relativa,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM dbo.hc_documentos_permisos p
                WHERE p.documento_id = d.id
                  AND p.username = @username
                  AND p.puede_ver = 1
              ) THEN 1
              ELSE 0
            END AS tiene_permiso
          FROM dbo.hc_documentos d
          WHERE d.id = @documento_id
        `);

      const documento = resultado.recordset[0];

      if (!documento) {
        return res.status(404).send("Documento no encontrado");
      }

      const esAdmin = usuario.rol === "ADMIN";

      if (!esAdmin && Number(documento.tiene_permiso) !== 1) {
        return res.status(403).send(
          "No tiene permiso para visualizar este documento"
        );
      }

      const rutaBase = path.join(__dirname, "formularios");

      const rutaArchivo = path.resolve(
        rutaBase,
        documento.ruta_relativa
      );

      if (!rutaArchivo.startsWith(path.resolve(rutaBase))) {
        return res.status(400).send("Ruta de documento no válida");
      }

      if (!fs.existsSync(rutaArchivo)) {
        console.error("ARCHIVO NO ENCONTRADO:", rutaArchivo);

        return res.status(404).send(
          "El archivo PDF no existe en el servidor"
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${documento.nombre_archivo}"`
      );

      return res.sendFile(rutaArchivo);
    } catch (error) {
      console.error(
        "ERROR VISUALIZANDO DOCUMENTO HC:",
        error
      );

      return res.status(500).send(
        "No se pudo visualizar el documento"
      );
    }
  }
);

app.get("/api/hclinicas/documentos/:id/descargar",requireAuth,async (req, res) => {
    try {
      const documentoId = Number(req.params.id);

      if (!Number.isInteger(documentoId) || documentoId <= 0) {
        return res.status(400).send("Documento no válido");
      }

      const usuario = obtenerUsuarioSesionHC(req);
      const pool = await getPool();

      const resultado = await pool
        .request()
        .input("documento_id", documentoId)
        .input("username", usuario.username)
        .query(`
          SELECT TOP 1
            d.id,
            d.nombre_archivo,
            d.ruta_relativa,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM dbo.hc_documentos_permisos p
                WHERE p.documento_id = d.id
                  AND p.username = @username
                  AND p.puede_descargar = 1
              ) THEN 1
              ELSE 0
            END AS tiene_permiso
          FROM dbo.hc_documentos d
          WHERE d.id = @documento_id
        `);

      const documento = resultado.recordset[0];

      if (!documento) {
        return res.status(404).send("Documento no encontrado");
      }

      const esAdmin = usuario.rol === "ADMIN";

      if (!esAdmin && Number(documento.tiene_permiso) !== 1) {
        return res.status(403).send(
          "No tiene permiso para descargar este documento"
        );
      }

      const rutaBase = path.join(__dirname, "formularios");

      const rutaArchivo = path.resolve(
        rutaBase,
        documento.ruta_relativa
      );

      if (!rutaArchivo.startsWith(path.resolve(rutaBase))) {
        return res.status(400).send("Ruta de documento no válida");
      }

      if (!fs.existsSync(rutaArchivo)) {
        return res.status(404).send(
          "El archivo PDF no existe en el servidor"
        );
      }

      return res.download(
        rutaArchivo,
        documento.nombre_archivo
      );
    } catch (error) {
      console.error(
        "ERROR DESCARGANDO DOCUMENTO HC:",
        error
      );

      return res.status(500).send(
        "No se pudo descargar el documento"
      );
    }
  }
);

/*001 admision */
app.post("/api/hclinicas/001/guardar-borrador",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      const fechaProcedimiento = String(
        datos.fecha_admision_paciente || ""
      ).slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha de admisión no es válida"
        });
      }

      const pool = await getPool();

      const resultadoGuardado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "001"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "datos_json",
          JSON.stringify(datos)
        )
        .input(
          "usuario_username",
          usuarioSesion.username
        )
        .input(
          "usuario_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @formulario_id INT;
            DECLARE @estado_actual NVARCHAR(20);

            SELECT
              @formulario_id = id,
              @estado_actual = estado
            FROM dbo.hc_formularios_datos
              WITH (UPDLOCK, HOLDLOCK)
            WHERE paciente_id = @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;

            /*
              Si ya existe y dejó de ser borrador,
              no puede modificarse.
            */
            IF @formulario_id IS NOT NULL
               AND @estado_actual <> 'BORRADOR'
            BEGIN
              THROW 51020,
                'El formulario 001 está cerrado y ya no puede modificarse.',
                1;
            END;

            /*
              Crear un nuevo borrador.
            */
            IF @formulario_id IS NULL
            BEGIN
              INSERT INTO dbo.hc_formularios_datos (
                paciente_id,
                codigo_formulario,
                fecha_procedimiento,
                datos_json,
                estado,
                creado_por_username,
                creado_por_nombre,
                fecha_creacion
              )
              VALUES (
                @paciente_id,
                @codigo_formulario,
                @fecha_procedimiento,
                @datos_json,
                'BORRADOR',
                @usuario_username,
                @usuario_nombre,
                SYSUTCDATETIME()
              );

              SET @formulario_id =
                SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
              /*
                Actualizar solamente si continúa
                en estado BORRADOR.
              */
              UPDATE dbo.hc_formularios_datos
              SET
                datos_json = @datos_json,
                modificado_por_username =
                  @usuario_username,
                modificado_por_nombre =
                  @usuario_nombre,
                fecha_modificacion =
                  SYSUTCDATETIME()
              WHERE id = @formulario_id
                AND estado = 'BORRADOR';

              IF @@ROWCOUNT <> 1
              BEGIN
                THROW 51021,
                  'El formulario 001 ya no se encuentra disponible para edición.',
                  1;
              END;
            END;

            COMMIT TRANSACTION;

            SELECT
              id,
              paciente_id,
              codigo_formulario,
              fecha_procedimiento,
              estado,
              creado_por_username,
              creado_por_nombre,
              fecha_creacion,
              modificado_por_username,
              modificado_por_nombre,
              fecha_modificacion,
              cerrado_por_username,
              cerrado_por_nombre,
              fecha_cierre
            FROM dbo.hc_formularios_datos
            WHERE id = @formulario_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        ok: true,
        mensaje:
          "Borrador guardado correctamente",
        formulario:
          resultadoGuardado.recordset?.[0] ||
          null
      });

    } catch (error) {
      console.error(
        "ERROR GUARDANDO BORRADOR 001:",
        error
      );

      const mensaje =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      const estadoHTTP =
        mensaje.includes("está cerrado") ||
        mensaje.includes(
          "ya no se encuentra disponible"
        )
          ? 409
          : 500;

      return res.status(estadoHTTP).json({
        error:
          "No se pudo guardar el borrador del formulario 001",
        detalle: mensaje
      });
    }
  }
);

app.get("/api/hclinicas/001/borrador",requireAuth,async (req, res) => {
    try {
      const pacienteId = Number(
        req.query.paciente_id
      );

      const fechaProcedimiento = String(
        req.query.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "001"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .query(`
          SELECT TOP 1
            id,
            paciente_id,
            codigo_formulario,
            fecha_procedimiento,
            datos_json,
            estado,
            creado_por_username,
            creado_por_nombre,
            fecha_creacion,
            modificado_por_username,
            modificado_por_nombre,
            fecha_modificacion,
            cerrado_por_username,
            cerrado_por_nombre,
            fecha_cierre
          FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario =
              @codigo_formulario
            AND fecha_procedimiento =
              @fecha_procedimiento
          ORDER BY id DESC;
        `);

      const registro =
        resultado.recordset?.[0];

      if (!registro) {
        return res.json({
          ok: true,
          existe: false,
          formulario: null
        });
      }

      let datosFormulario = {};

      try {
        datosFormulario = JSON.parse(
          registro.datos_json || "{}"
        );
      } catch (errorJSON) {
        console.error(
          "ERROR LEYENDO JSON FORMULARIO 001:",
          errorJSON
        );

        datosFormulario = {};
      }

      return res.json({
        ok: true,
        existe: true,
        formulario: {
          id: registro.id,
          pacienteId:
            registro.paciente_id,
          codigoFormulario:
            registro.codigo_formulario,
          fechaProcedimiento:
            registro.fecha_procedimiento,
          estado:
            registro.estado,
          datos:
            datosFormulario,

          creadoPorUsername:
            registro.creado_por_username,
          creadoPorNombre:
            registro.creado_por_nombre,
          fechaCreacion:
            registro.fecha_creacion,

          modificadoPorUsername:
            registro.modificado_por_username,
          modificadoPorNombre:
            registro.modificado_por_nombre,
          fechaModificacion:
            registro.fecha_modificacion,

          cerradoPorUsername:
            registro.cerrado_por_username,
          cerradoPorNombre:
            registro.cerrado_por_nombre,
          fechaCierre:
            registro.fecha_cierre
        }
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO BORRADOR 001:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo consultar el formulario 001",
        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

/* formulario 008 emergencia */
app.post("/api/hclinicas/008/guardar-borrador",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      const fechaProcedimiento = String(
        datos.fecha_admision_paciente || ""
      ).slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha de admisión no es válida"
        });
      }

      const pool = await getPool();

      const resultadoGuardado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "008"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "datos_json",
          JSON.stringify(datos)
        )
        .input(
          "usuario_username",
          usuarioSesion.username
        )
        .input(
          "usuario_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @formulario_id INT;
            DECLARE @estado_actual NVARCHAR(20);

            SELECT
              @formulario_id = id,
              @estado_actual = estado
            FROM dbo.hc_formularios_datos
              WITH (UPDLOCK, HOLDLOCK)
            WHERE paciente_id = @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;

            /*
              Si ya existe y dejó de ser borrador,
              no puede modificarse.
            */
            IF @formulario_id IS NOT NULL
               AND @estado_actual <> 'BORRADOR'
            BEGIN
              THROW 51030,
                'El formulario 008 está cerrado y ya no puede modificarse.',
                1;
            END;

            /*
              Crear un nuevo borrador.
            */
            IF @formulario_id IS NULL
            BEGIN
              INSERT INTO dbo.hc_formularios_datos (
                paciente_id,
                codigo_formulario,
                fecha_procedimiento,
                datos_json,
                estado,
                creado_por_username,
                creado_por_nombre,
                fecha_creacion
              )
              VALUES (
                @paciente_id,
                @codigo_formulario,
                @fecha_procedimiento,
                @datos_json,
                'BORRADOR',
                @usuario_username,
                @usuario_nombre,
                SYSUTCDATETIME()
              );

              SET @formulario_id =
                SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
              /*
                Actualizar solamente si continúa
                en estado BORRADOR.
              */
              UPDATE dbo.hc_formularios_datos
              SET
                datos_json = @datos_json,
                modificado_por_username =
                  @usuario_username,
                modificado_por_nombre =
                  @usuario_nombre,
                fecha_modificacion =
                  SYSUTCDATETIME()
              WHERE id = @formulario_id
                AND estado = 'BORRADOR';

              IF @@ROWCOUNT <> 1
              BEGIN
                THROW 51031,
                  'El formulario 008 ya no se encuentra disponible para edición.',
                  1;
              END;
            END;

            COMMIT TRANSACTION;

            SELECT
              id,
              paciente_id,
              codigo_formulario,
              fecha_procedimiento,
              estado,
              creado_por_username,
              creado_por_nombre,
              fecha_creacion,
              modificado_por_username,
              modificado_por_nombre,
              fecha_modificacion,
              cerrado_por_username,
              cerrado_por_nombre,
              fecha_cierre
            FROM dbo.hc_formularios_datos
            WHERE id = @formulario_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        ok: true,
        mensaje:
          "Borrador del formulario 008 guardado correctamente",
        formulario:
          resultadoGuardado.recordset?.[0] ||
          null
      });

    } catch (error) {
      console.error(
        "ERROR GUARDANDO BORRADOR 008:",
        error
      );

      const mensaje =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      const estadoHTTP =
        mensaje.includes("está cerrado") ||
        mensaje.includes(
          "ya no se encuentra disponible"
        )
          ? 409
          : 500;

      return res.status(estadoHTTP).json({
        error:
          "No se pudo guardar el borrador del formulario 008",
        detalle: mensaje
      });
    }
  }
);

app.get("/api/hclinicas/008/borrador",requireAuth,async (req, res) => {
    try {
      const pacienteId = Number(
        req.query.paciente_id
      );

      const fechaProcedimiento = String(
        req.query.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "008"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .query(`
          SELECT TOP 1
            id,
            paciente_id,
            codigo_formulario,
            fecha_procedimiento,
            datos_json,
            estado,
            creado_por_username,
            creado_por_nombre,
            fecha_creacion,
            modificado_por_username,
            modificado_por_nombre,
            fecha_modificacion,
            cerrado_por_username,
            cerrado_por_nombre,
            fecha_cierre
          FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario =
              @codigo_formulario
            AND fecha_procedimiento =
              @fecha_procedimiento
          ORDER BY id DESC;
        `);

      const registro =
        resultado.recordset?.[0];

      if (!registro) {
        return res.json({
          ok: true,
          existe: false,
          formulario: null
        });
      }

      let datosFormulario = {};

      try {
        datosFormulario = JSON.parse(
          registro.datos_json || "{}"
        );
      } catch (errorJSON) {
        console.error(
          "ERROR LEYENDO JSON FORMULARIO 008:",
          errorJSON
        );

        datosFormulario = {};
      }

      return res.json({
        ok: true,
        existe: true,
        formulario: {
          id: registro.id,

          pacienteId:
            registro.paciente_id,

          codigoFormulario:
            registro.codigo_formulario,

          fechaProcedimiento:
            registro.fecha_procedimiento,

          estado:
            registro.estado,

          datos:
            datosFormulario,

          creadoPorUsername:
            registro.creado_por_username,

          creadoPorNombre:
            registro.creado_por_nombre,

          fechaCreacion:
            registro.fecha_creacion,

          modificadoPorUsername:
            registro.modificado_por_username,

          modificadoPorNombre:
            registro.modificado_por_nombre,

          fechaModificacion:
            registro.fecha_modificacion,

          cerradoPorUsername:
            registro.cerrado_por_username,

          cerradoPorNombre:
            registro.cerrado_por_nombre,

          fechaCierre:
            registro.fecha_cierre
        }
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO BORRADOR 008:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo consultar el formulario 008",
        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

app.post("/api/hclinicas/008/generar-pdf",requireAuth,async (req, res) => {
    let rutaCompletaCreada = "";

    try {
      const datos = req.body || {};

      /* =========================================
         1. VALIDAR USUARIO, PACIENTE Y FECHA
         ========================================= */

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      const fechaProcedimiento = String(
        datos.fecha_admision_paciente || ""
      ).slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      /* =========================================
         2. CARGAR LA PLANTILLA
         ========================================= */

      const rutaPlantilla = path.join(
        __dirname,
        "plantillas_hclinicas",
        "008prueba.pdf"
      );

      if (!fs.existsSync(rutaPlantilla)) {
        return res.status(404).json({
          error:
            "No se encontró la plantilla PDF 008prueba.pdf"
        });
      }

      const bytesPlantilla =
        fs.readFileSync(rutaPlantilla);

      const pdfDoc = await PDFDocument.load(
        bytesPlantilla
      );

      const formulario =
        pdfDoc.getForm();

      const fuente = await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

      pdfDoc.setSubject(
        "Formulario 008 - Emergencia"
      );

      pdfDoc.setAuthor(
        "CENT Instituto Especializado en Hemodinamia del Ecuador"
      );

      pdfDoc.setCreator("Sistema CENT");
      pdfDoc.setProducer("Sistema CENT");

      /* =========================================
         3. CAMPOS DE TEXTO DEL PDF
         ========================================= */

      const camposTexto = [
        "paciente_h_clinica",
        "narchivo_paciente",
        "fecha_admision_paciente",
        "nombre_admisionista",
        "primer_apellido_paciente",
        "segundo_apellido_paciente",
        "primer_nombre_paciente",
        "segundo_nombre_paciente",
        "tipo_id_paciente",
        "estado_civil_paciente",
        "sexo_paciente",
        "telefono_fijo_paciente",
        "telefono_celular_paciente",
        "fecha_nacimiento_paciente",
        "lugar_nacimiento_paciente",
        "nacionalidad_paciente",
        "edad_paciente",
        "identificacion_etnica_paciente",
        "pueblos_paciente",
        "nivel_educacion_paciente",
        "estado_educacion_paciente",
        "empresa_trabajo_paciente",
        "ocupacion_paciente",
        "seguro_paciente",
        "provincia_paciente",
        "canton_paciente",
        "parroquia_paciente",
        "barrio_paciente",
        "calle_paciente",
        "calle_secundaria_paciente",
        "referencia_paciente",
        "nombres_completos_familiar",
        "parentesco_familiar",
        "direccion_familiar",
        "telefono_familiar",

        "fuente_informacion_paciente",
        "institucion_persona_entrega_paciente",
        "telefono_persona_entrega",
        "008_hora_inicio",
        "008_motivo_atencion",
        "008_antecedentes",
        "008_enfermedad_problema_actual_paciente",

        "008_presion_arterial",
        "008_pulso",
        "008_frecuencia_respiratoria",
        "008_pulsioximetria",
        "008_perimetro_cefalico",
        "008_peso_kg",
        "008_talla",
        "008_glicemia_capilar",
        "008_glassgow_ocular",
        "008_glassgow_verbal",
        "008_motora",
        "008_reaccion_pupila_der",
        "008_reaccion_pupila_izq",
        "008_t_llenado_capilar",

        "008_examen_fisico",
        "008_examenes",

        "008_diagnostico_presuntivo1",
        "008_diagnostico_presuntivo2",
        "008_diagnostico_presuntivo3",
        "008_cie_presuntivo1",
        "008_cie_presuntivo2",
        "008_cie_presuntivo3",

        "008_plan_medicamentos",
        "008_plan_via_dosis",

        "008_texto_egreso_establecimiento",
        "008_texto_egreso_observaciones",
        "008_fecha_termino_emergencia",
        "008_hora_termino_emergencia",

        "008_nombres_medico_emergencia",
        "008_primer_apellido_medico_emergencia",
        "008_segundo_apellido_medico_emergencia",
        "008_cedula_medico_emergencia"
      ];

       const nombresAlternativosTextoPDF008 = {
        telefono_familiar:
          "undefined.telefono_familiar",

        telefono_persona_entrega:
          "undefined.telefono_persona_entrega",

        "008_presion_arterial":
          "undefined.008_presion_arterial",

        "008_pulso":
          "undefined.008_pulso",

        "008_frecuencia_respiratoria":
          "undefined.008_frecuencia_respiratoria",

        "008_pulsioximetria":
          "undefined.008_pulsioximetria",

        "008_perimetro_cefalico":
          "undefined.008_perimetro_cefalico",

        "008_peso_kg":
          "undefined.008_peso_kg",

        "008_talla":
          "undefined.008_talla",

        "008_glicemia_capilar":
          "undefined.008_glicemia_capilar",

        "008_glassgow_ocular":
          "undefined.008_glassgow_ocular",

        "008_glassgow_verbal":
          "undefined.008_glassgow_verbal",

        "008_motora":
          "undefined.008_motora",

        "008_reaccion_pupila_der":
          "undefined.008_reaccion_pupila_der",

        "008_reaccion_pupila_izq":
          "undefined.008_reaccion_pupila_izq",

        "008_diagnostico_presuntivo1":
          "undefined.008_diagnostico_presuntivo1",

        "008_diagnostico_presuntivo2":
          "undefined.008_diagnostico_presuntivo2",

        "008_diagnostico_presuntivo3":
          "undefined.008_diagnostico_presuntivo3",

        "008_cie_presuntivo1":
          "undefined.008_cie_presuntivo1",

        "008_cie_presuntivo2":
          "undefined.008_cie_presuntivo2",

        "008_cie_presuntivo3":
          "undefined.008_cie_presuntivo3",

        "008_nombres_medico_emergencia":
          "undefined.008_nombres_medico_emergencia",

        "008_primer_apellido_medico_emergencia":
          "undefined.008_primer_apellido_medico_emergencia",

        "008_segundo_apellido_medico_emergencia":
          "undefined.008_segundo_apellido_medico_emergencia"
};

try {
  const campoSinConstantes =
    formulario.getTextField(
      "008_sin_constantes"
    );

  const marcadoSinConstantes =
    datos["008_sin_constantes"] === true ||
    datos["008_sin_constantes"] === 1 ||
    datos["008_sin_constantes"] === "1" ||
    String(
      datos["008_sin_constantes"]
    ).toLowerCase() === "true";

  campoSinConstantes.setText(
    marcadoSinConstantes
      ? "X"
      : ""
  );

  campoSinConstantes.setAlignment(
    1
  );

} catch (errorSinConstantes) {
  console.warn(
    "No se pudo llenar 008_sin_constantes:",
    errorSinConstantes.message
  );
}

      /* =========================================
         4. CASILLAS DEL PDF
         ========================================= */

      const camposCasillas = [
        "historia_en_establecimiento_si",
        "historia_en_establecimiento_no",

        "casilla_llegada_ambulatorio",
        "casilla_llegada_ambulancia",
        "casilla_llegada_otro",

        "008_casilla_condicion_llegada_estable",
        "008_casilla_condicion_llegada_inestable",
        "008_casilla_condicion_llegada_fallecido",

        "008_casilla_antecedentes_1alergicos",
        "008_casilla_antecedentes_2clinicos",
        "008_casilla_antecedentes_3ginecologicos",
        /*"008_casilla_antecedentes_4traumatologicos",*/
        /*"008_casilla_antecedentes_5pediatricos",*/
        "008_casilla_antecedentes_6quirurgicos",
        "008_casilla_antecedentes_7farmacologicos",
        /*"008_casilla_antecedentes_8habitos",*/
        "008_casilla_antecedentes_9familiares",
       /* "008_casilla_antecedentes_8armacologicos",*/
        "008_casilla_otros",

        /*"008_sin_constantes",*/

        "008_casilla_1piel",
        "008_casilla_2cabeza",
        "008_casilla_3ojos",
        "008_casilla_4oidos",
        "008_casilla_5nariz",
        "008_casilla_6boca",
        "008_casilla_7oro",
        "008_casilla_8cuello",
        "008_casilla_9axilas",
        "008_casilla_10torax",
        "008_casilla_11abdomen",
        "008_casilla_12columna",
        "008_casilla_13ingle",
        "008_casilla_14miembrosup",
        "008_casilla_15miembroinf",

        "008_casilla_biometria",
        "008_casilla_uroanalisis",
        "008_casilla_quimica",
        "008_casilla_electrolitos",
        "008_casilla_gasometria",
        "008_casilla_ecg",
        "008_casilla_endoscopipa",
        "008_casilla_rxtorax",
        "008_casilla_rxabdomen",
        "008_casilla_rxosea",
        "008_casilla_11ecografia",
        "008_casilla_12ecografia_elvica",
        "008_casilla_13tomografia",
        "008_casilla_14resonancia",
        "008_casilla_15interconsulta",
        "008_casilla_16otros",

        "008_casilla_egreso_vivo",
        "008_casilla_egreso_estable",
        "008_casilla_egreso_inestable",
        "008_casilla_egreso_fallecido",
        "008_casilla_egreso_alta",
        "008_casilla_egreso_consulta_externa",
        "008_casilla_egreso_observacion_emergencia",
        "008_casilla_egreso_hospitalizacion",
        "008_casilla_egreso_referencia",
        "008_casilla_egreso_derivacion"
      ];

      const nombresAlternativosCasillasPDF008 = {
        historia_en_establecimiento_si:
          "undefined.historia_en_establecimiento_si",

        historia_en_establecimiento_no:
          "undefined.historia_en_establecimiento_no",

        casilla_llegada_ambulatorio:
          "undefined.casilla_llegada_ambulatorio",

        casilla_llegada_ambulancia:
          "undefined.casilla_llegada_ambulancia",

        casilla_llegada_otro:
          "undefined.casilla_llegada_otro",

        "008_casilla_condicion_llegada_estable":
          "undefined.008_casilla_condicion_llegada_estable",

        "008_casilla_condicion_llegada_inestable":
          "undefined.008_casilla_condicion_llegada_inestable",

        "008_casilla_condicion_llegada_fallecido":
          "undefined.008_casilla_condicion_llegada_fallecido",

        "008_casilla_antecedentes_2clinicos":
          "undefined.008_casilla_antecedentes_2clinicos",

        "008_casilla_antecedentes_3ginecologicos":
          "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_3ginecologicos",

        /*
          En la plantilla PDF el campo está nombrado
          como 4quirurgicos.
        */
        "008_casilla_antecedentes_6quirurgicos":
          "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_4quirurgicos",

        "008_casilla_antecedentes_7farmacologicos":
        "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_7farmacologicos",

        "008_casilla_antecedentes_9familiares":
          "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_9familiares",

        "008_casilla_otros":
          "008_casilla_antecedentes_1alergicos.008_casilla_antecedentes_10otros",

        "008_casilla_1piel":
          "undefined.008_casilla_1piel",

        "008_casilla_2cabeza":
          "undefined.008_casilla_2cabeza",

        "008_casilla_3ojos":
          "undefined.008_casilla_3ojos",

        "008_casilla_4oidos":
          "undefined.008_casilla_4oidos",

        "008_casilla_5nariz":
          "undefined.008_casilla_5nariz",

        "008_casilla_6boca":
          "undefined.008_casilla_6boca",

        "008_casilla_7oro":
          "undefined.008_casilla_7oro",

        "008_casilla_8cuello":
          "undefined.008_casilla_8cuello",

        "008_casilla_9axilas":
          "undefined.008_casilla_9axilas",

        "008_casilla_10torax":
          "undefined.008_casilla_10torax",

        "008_casilla_11abdomen":
          "undefined.008_casilla_11abdomen",

        "008_casilla_12columna":
          "undefined.008_casilla_12columna",

        "008_casilla_13ingle":
          "undefined.008_casilla_13ingle",

        "008_casilla_14miembrosup":
          "undefined.008_casilla_14miembrosup",

        "008_casilla_15miembroinf":
          "undefined.008_casilla_15miembroinf",

        "008_casilla_biometria":
          "undefined.008_casilla_biometria",

        "008_casilla_uroanalisis":
          "undefined.008_casilla_uroanalisis",

        "008_casilla_quimica":
          "undefined.008_casilla_quimica",

        "008_casilla_electrolitos":
          "undefined.008_casilla_electrolitos",

        "008_casilla_gasometria":
          "undefined.008_casilla_gasometria",

        "008_casilla_ecg":
          "undefined.008_casilla_ecg",

        "008_casilla_endoscopipa":
          "undefined.008_casilla_endoscopipa",

        "008_casilla_rxtorax":
          "undefined.008_casilla_rxtorax",

        "008_casilla_rxabdomen":
          "undefined.008_casilla_rxabdomen",

        "008_casilla_rxosea":
          "undefined.008_casilla_rxosea",

        "008_casilla_11ecografia":
          "undefined.008_casilla_11ecografia",

        "008_casilla_12ecografia_elvica":
          "undefined.008_casilla_12ecografia_elvica",

        "008_casilla_13tomografia":
          "undefined.008_casilla_13tomografia",

        "008_casilla_14resonancia":
          "undefined.008_casilla_14resonancia",

        "008_casilla_15interconsulta":
          "undefined.008_casilla_15interconsulta",

        "008_casilla_16otros":
          "undefined.008_casilla_16otros"
      };

      /* =========================================
         5. LLENAR CAMPOS DE TEXTO
         ========================================= */

      for (
        const nombreCampo
        of camposTexto
      ) {
        let valor =
          datos[nombreCampo] ?? "";

        if (
          nombreCampo ===
            "fecha_admision_paciente" ||
          nombreCampo ===
            "fecha_nacimiento_paciente" ||
          nombreCampo ===
            "008_fecha_termino_emergencia"
        ) {
          valor = formatearFechaPDF(
            valor
          );
        }

        try {
  let campoPDF;

          try {
            /*
              Primero busca el campo con el nombre normal.
            */
            campoPDF = formulario.getTextField(
              nombreCampo
            );

          } catch (errorNombreNormal) {
            /*
              Si Nitro le agregó "undefined.", utilizamos
              el nombre interno alternativo.
            */
            const nombreAlternativo =
              nombresAlternativosTextoPDF008[
                nombreCampo
              ];

            if (!nombreAlternativo) {
              throw errorNombreNormal;
            }

            campoPDF = formulario.getTextField(
              nombreAlternativo
            );
          }

          campoPDF.setText(
            String(valor)
          );

        } catch (errorCampo) {
          console.warn(
            `El campo de texto PDF "${nombreCampo}" no pudo llenarse:`,
            errorCampo.message
          );
        }
      }

      /* =========================================
         6. MARCAR O DESMARCAR CASILLAS
         ========================================= */

      for (
        const nombreCampo
        of camposCasillas
      ) {
        try {
  let casilla;

              try {
                /*
                  Primero intenta con el nombre normal.
                */
                casilla = formulario.getCheckBox(
                  nombreCampo
                );

              } catch (errorNombreNormal) {
                /*
                  Si Nitro modificó el nombre interno, utiliza
                  el nombre alternativo real de la plantilla.
                */
                const nombreAlternativo =
                  nombresAlternativosCasillasPDF008[
                    nombreCampo
                  ];

                if (!nombreAlternativo) {
                  throw errorNombreNormal;
                }

                casilla = formulario.getCheckBox(
                  nombreAlternativo
                );
              }

              const valor =
                datos[nombreCampo];

              const marcado =
                valor === true ||
                valor === 1 ||
                valor === "1" ||
                String(valor)
                  .toLowerCase() === "true";

              if (marcado) {
                casilla.check();
              } else {
                casilla.uncheck();
              }

            } catch (errorCasilla) {
              console.warn(
                `La casilla PDF "${nombreCampo}" no pudo procesarse:`,
                errorCasilla.message
              );
            }      }

      /* =========================================
         7. CONSULTAR FIRMA Y SELLO DEL MÉDICO
         ========================================= */

      const profesionalMedicoId = Number(
        datos[
          "008_profesional_medico_id"
        ] || 0
      );

      let profesionalMedico = null;

      const pool = await getPool();

      if (profesionalMedicoId > 0) {
        const resultadoProfesional =
          await pool
            .request()
            .input(
              "id",
              profesionalMedicoId
            )
            .query(`
              SELECT
                id,
                firma_ruta,
                sello_ruta,
                estado
              FROM dbo.profesionales_salud
              WHERE id = @id;
            `);

        profesionalMedico =
          resultadoProfesional
            .recordset?.[0] || null;
      }

      if (
        profesionalMedico?.firma_ruta
      ) {
        await insertarImagenEnCampoPDF008({
          pdfDoc,
          formulario,
          nombreCampo:
            "008_firma_medico_emergencia",
          rutaImagen:
            profesionalMedico.firma_ruta
        });
      }

      if (
        profesionalMedico?.sello_ruta
      ) {
        await insertarImagenEnCampoPDF008({
          pdfDoc,
          formulario,
          nombreCampo:
            "008_sello_medico_emergencia",
          rutaImagen:
            profesionalMedico.sello_ruta
        });
      }

      /* =========================================
         8. ACTUALIZAR APARIENCIAS Y BLOQUEAR
         ========================================= */

      formulario.updateFieldAppearances(
        fuente
      );

      formulario
        .getFields()
        .forEach(campo => {
          try {
            campo.enableReadOnly();
          } catch (errorCampo) {
            console.warn(
              `No se pudo bloquear el campo "${
                campo?.getName?.() ||
                "SIN NOMBRE"
              }":`,
              errorCampo.message
            );
          }
        });

      formulario.updateFieldAppearances(
        fuente
      );

      /* =========================================
         9. VERIFICAR ESTADO DEL BORRADOR
         ========================================= */

      const verificacionEstado =
        await pool
          .request()
          .input(
            "paciente_id",
            pacienteId
          )
          .input(
            "codigo_formulario",
            "008"
          )
          .input(
            "fecha_procedimiento",
            fechaProcedimiento
          )
          .query(`
            SELECT TOP 1
              estado
            FROM dbo.hc_formularios_datos
            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
            ORDER BY id DESC;
          `);

      const estadoFormulario = String(
        verificacionEstado
          .recordset?.[0]?.estado || ""
      ).toUpperCase();

      if (
        estadoFormulario &&
        estadoFormulario !== "BORRADOR"
      ) {
        return res.status(409).json({
          error:
            "No se puede generar otro PDF",
          detalle:
            "El formulario 008 está cerrado y ya no admite nuevas versiones."
        });
      }

      /* =========================================
         10. CALCULAR SIGUIENTE VERSIÓN
         ========================================= */

      const resultadoVersion =
        await pool
          .request()
          .input(
            "paciente_id",
            pacienteId
          )
          .input(
            "codigo_formulario",
            "008"
          )
          .input(
            "fecha_procedimiento",
            fechaProcedimiento
          )
          .query(`
            SELECT
              ISNULL(MAX(version), 0) + 1
                AS siguiente_version
            FROM dbo.hc_documentos
            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;
          `);

      const version = Number(
        resultadoVersion
          .recordset?.[0]
          ?.siguiente_version || 1
      );

      /* =========================================
         11. CONSTRUIR LA CARPETA
         ========================================= */

      const [
        anio,
        mes,
        dia
      ] = fechaProcedimiento.split("-");

      const numeroArchivoSeguro =
        limpiarNombreArchivoHC(
          datos.narchivo_paciente ||
          "SIN_ARCHIVO"
        );

      const cedulaSegura =
        limpiarNombreArchivoHC(
          datos.paciente_h_clinica ||
          "SIN_CEDULA"
        );

      const nombrePacienteSeguro =
        limpiarNombreArchivoHC(
          [
            datos.primer_apellido_paciente,
            datos.segundo_apellido_paciente,
            datos.primer_nombre_paciente,
            datos.segundo_nombre_paciente
          ]
            .filter(Boolean)
            .join(" ")
        );

      const carpetaPaciente = [
        numeroArchivoSeguro,
        cedulaSegura,
        nombrePacienteSeguro
      ]
        .filter(Boolean)
        .join("_");

      const carpetaRelativa = path.join(
        anio,
        mes,
        dia,
        carpetaPaciente
      );

      const carpetaCompleta = path.join(
        __dirname,
        "formularios",
        carpetaRelativa
      );

      fs.mkdirSync(
        carpetaCompleta,
        {
          recursive: true
        }
      );

      /* =========================================
         12. NOMBRE DEL DOCUMENTO
         ========================================= */

      const nombreBasePDF =
        limpiarNombreArchivoHC(
          [
            "008 EMERGENCIA",
            nombrePacienteSeguro ||
              "SIN NOMBRE",
            numeroArchivoSeguro ||
              "SIN ARCHIVO",
            `V${version}`
          ].join(" ")
        );

      const nombreVisible =
        `${nombreBasePDF}.pdf`;

      const nombreFisico =
        nombreVisible;

      pdfDoc.setTitle(
        nombreVisible
      );

      pdfDoc.setSubject(
        "Formulario 008 - Emergencia"
      );

      /*
        Guardar solamente después de llenar,
        insertar imágenes y bloquear campos.
      */
      const pdfFinal =
        await pdfDoc.save();

      const rutaCompleta = path.join(
        carpetaCompleta,
        nombreFisico
      );

      rutaCompletaCreada =
        rutaCompleta;

      fs.writeFileSync(
        rutaCompleta,
        Buffer.from(pdfFinal)
      );

      const rutaRelativa = path.join(
        carpetaRelativa,
        nombreFisico
      );

      /* =========================================
         13. REGISTRAR DOCUMENTO EN SQL
         ========================================= */

      const resultadoDocumento =
        await pool
          .request()
          .input(
            "paciente_id",
            pacienteId
          )
          .input(
            "codigo_formulario",
            "008"
          )
          .input(
            "nombre_formulario",
            "008 Emergencia"
          )
          .input(
            "fecha_procedimiento",
            fechaProcedimiento
          )
          .input(
            "version",
            version
          )
          .input(
            "estado",
            "BORRADOR"
          )
          .input(
            "nombre_archivo",
            nombreVisible
          )
          .input(
            "ruta_relativa",
            rutaRelativa
          )
          .input(
            "creado_por_username",
            usuarioSesion.username
          )
          .input(
            "creado_por_nombre",
            usuarioSesion.nombreCompleto
          )
          .query(`
            INSERT INTO dbo.hc_documentos (
              paciente_id,
              codigo_formulario,
              nombre_formulario,
              fecha_procedimiento,
              version,
              estado,
              nombre_archivo,
              ruta_relativa,
              creado_por_username,
              creado_por_nombre
            )
            OUTPUT INSERTED.id
            VALUES (
              @paciente_id,
              @codigo_formulario,
              @nombre_formulario,
              @fecha_procedimiento,
              @version,
              @estado,
              @nombre_archivo,
              @ruta_relativa,
              @creado_por_username,
              @creado_por_nombre
            );
          `);

      const documentoId =
        resultadoDocumento
          .recordset?.[0]?.id;

      return res.status(201).json({
        ok: true,
        mensaje:
          "PDF 008 generado y almacenado correctamente",

        documento: {
          id: documentoId,
          nombreArchivo:
            nombreVisible,
          version,
          estado: "BORRADOR"
        }
      });

    } catch (error) {
      console.error(
        "ERROR GENERANDO PDF 008:",
        error
      );

      if (
        rutaCompletaCreada &&
        fs.existsSync(
          rutaCompletaCreada
        )
      ) {
        try {
          fs.unlinkSync(
            rutaCompletaCreada
          );
        } catch (errorEliminar) {
          console.error(
            "No se pudo eliminar el PDF 008 incompleto:",
            errorEliminar
          );
        }
      }

      return res.status(500).json({
        error:
          "No se pudo generar el PDF del formulario 008",

        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

app.post("/api/hclinicas/008/cerrar",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      const documentoId = Number(
        datos.documento_id
      );

      const fechaProcedimiento = String(
        datos.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !Number.isInteger(documentoId) ||
        documentoId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un documento PDF válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "documento_id",
          documentoId
        )
        .input(
          "codigo_formulario",
          "008"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "cerrado_por_username",
          usuarioSesion.username
        )
        .input(
          "cerrado_por_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            /* =====================================
               1. COMPROBAR BORRADOR DEL 008
               ===================================== */

            IF NOT EXISTS (
              SELECT 1
              FROM dbo.hc_formularios_datos
              WHERE paciente_id =
                  @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
            )
            BEGIN
              THROW 51041,
                'No existe un borrador del formulario 008 para cerrar.',
                1;
            END;

            IF EXISTS (
              SELECT 1
              FROM dbo.hc_formularios_datos
              WHERE paciente_id =
                  @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
                AND estado <> 'BORRADOR'
            )
            BEGIN
              THROW 51042,
                'El formulario 008 ya no se encuentra en estado BORRADOR.',
                1;
            END;

            /* =====================================
               2. COMPROBAR EL PDF SELECCIONADO
               ===================================== */

            IF NOT EXISTS (
              SELECT 1
              FROM dbo.hc_documentos
              WHERE id = @documento_id
                AND paciente_id =
                  @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
                AND estado = 'BORRADOR'
            )
            BEGIN
              THROW 51043,
                'El PDF seleccionado no corresponde al formulario 008 o ya fue cerrado.',
                1;
            END;

            /* =====================================
               3. CERRAR LOS DATOS EDITABLES
               ===================================== */

            UPDATE dbo.hc_formularios_datos
            SET
              estado = 'CERRADO',

              cerrado_por_username =
                @cerrado_por_username,

              cerrado_por_nombre =
                @cerrado_por_nombre,

              fecha_cierre =
                SYSUTCDATETIME(),

              modificado_por_username =
                @cerrado_por_username,

              modificado_por_nombre =
                @cerrado_por_nombre,

              fecha_modificacion =
                SYSUTCDATETIME()

            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
              AND estado = 'BORRADOR';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51044,
                'No se pudo cerrar el formulario editable 008.',
                1;
            END;

            /* =====================================
               4. CERRAR EL PDF DEFINITIVO
               ===================================== */

            UPDATE dbo.hc_documentos
            SET
              estado = 'CERRADO',

              cerrado_por_username =
                @cerrado_por_username,

              cerrado_por_nombre =
                @cerrado_por_nombre,

              fecha_cierre =
                SYSUTCDATETIME()

            WHERE id = @documento_id
              AND paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
              AND estado = 'BORRADOR';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51045,
                'No se pudo cerrar el documento PDF 008.',
                1;
            END;

            COMMIT TRANSACTION;

            SELECT
              d.id,
              d.nombre_archivo,
              d.version,
              d.estado,
              d.cerrado_por_username,
              d.cerrado_por_nombre,
              d.fecha_cierre
            FROM dbo.hc_documentos d
            WHERE d.id = @documento_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      const documento =
        resultado.recordset?.[0] || null;

      return res.status(200).json({
        ok: true,

        mensaje:
          "Formulario 008 cerrado correctamente",

        formulario: {
          pacienteId,
          codigoFormulario: "008",
          fechaProcedimiento,
          estado: "CERRADO"
        },

        documento
      });

    } catch (error) {
      console.error(
        "ERROR CERRANDO FORMULARIO 008:",
        error
      );

      const mensajeSQL =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      let estadoHTTP = 500;

      if (
        mensajeSQL.includes(
          "No existe un borrador"
        ) ||
        mensajeSQL.includes(
          "ya no se encuentra en estado BORRADOR"
        ) ||
        mensajeSQL.includes(
          "no corresponde al formulario 008"
        ) ||
        mensajeSQL.includes(
          "ya fue cerrado"
        )
      ) {
        estadoHTTP = 409;
      }

      return res.status(estadoHTTP).json({
        error:
          "No se pudo cerrar el formulario 008",

        detalle:
          mensajeSQL
      });
    }
  }
);

app.post("/api/hclinicas/008/reabrir",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      if (usuarioSesion.rol !== "ADMIN") {
        return res.status(403).json({
          error:
            "Acceso denegado",

          detalle:
            "Solo un usuario ADMIN puede reabrir formularios cerrados."
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      const fechaProcedimiento = String(
        datos.fecha_procedimiento || ""
      ).slice(0, 10);

      const motivoReapertura = String(
        datos.motivo_reapertura || ""
      ).trim();

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      if (motivoReapertura.length < 5) {
        return res.status(400).json({
          error:
            "Debe registrar el motivo de la reapertura"
        });
      }

      if (motivoReapertura.length > 500) {
        return res.status(400).json({
          error:
            "El motivo de reapertura no puede superar los 500 caracteres"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "008"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "reabierto_por_username",
          usuarioSesion.username
        )
        .input(
          "reabierto_por_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .input(
          "motivo_reapertura",
          motivoReapertura
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @formulario_id INT;
            DECLARE @estado_actual NVARCHAR(20);

            SELECT
              @formulario_id = id,
              @estado_actual = estado

            FROM dbo.hc_formularios_datos
              WITH (UPDLOCK, HOLDLOCK)

            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;

            IF @formulario_id IS NULL
            BEGIN
              THROW 51050,
                'No existe el formulario 008 solicitado.',
                1;
            END;

            IF @estado_actual <> 'CERRADO'
            BEGIN
              THROW 51051,
                'El formulario 008 no se encuentra en estado CERRADO.',
                1;
            END;

            UPDATE dbo.hc_formularios_datos
            SET
              estado = 'BORRADOR',

              reabierto_por_username =
                @reabierto_por_username,

              reabierto_por_nombre =
                @reabierto_por_nombre,

              fecha_reapertura =
                SYSUTCDATETIME(),

              motivo_reapertura =
                @motivo_reapertura,

              modificado_por_username =
                @reabierto_por_username,

              modificado_por_nombre =
                @reabierto_por_nombre,

              fecha_modificacion =
                SYSUTCDATETIME()

            WHERE id = @formulario_id
              AND estado = 'CERRADO';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51052,
                'No se pudo reabrir el formulario 008.',
                1;
            END;

            /*
              Los PDF anteriormente cerrados no se modifican.
              Permanecen como evidencia histórica.

              Después de corregir el formulario se podrá
              generar una nueva versión del PDF.
            */

            COMMIT TRANSACTION;

            SELECT
              id,
              paciente_id,
              codigo_formulario,
              fecha_procedimiento,
              estado,
              reabierto_por_username,
              reabierto_por_nombre,
              fecha_reapertura,
              motivo_reapertura

            FROM dbo.hc_formularios_datos
            WHERE id = @formulario_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        ok: true,

        mensaje:
          "Formulario 008 reabierto correctamente",

        formulario:
          resultado.recordset?.[0] || null
      });

    } catch (error) {
      console.error(
        "ERROR REABRIENDO FORMULARIO 008:",
        error
      );

      const mensaje =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      let estadoHTTP = 500;

      if (
        mensaje.includes(
          "No existe el formulario"
        )
      ) {
        estadoHTTP = 404;
      }

      if (
        mensaje.includes(
          "no se encuentra en estado CERRADO"
        )
      ) {
        estadoHTTP = 409;
      }

      return res.status(estadoHTTP).json({
        error:
          "No se pudo reabrir el formulario 008",

        detalle:
          mensaje
      });
    }
  }
);


/*CAMBIA EL ESTADO DEL FORMULARIO */
app.get("/api/hclinicas/formularios-estados",requireAuth,async (req, res) => {
    try {
      const pacienteId = Number(
        req.query.paciente_id
      );

      const fechaProcedimiento = String(
        req.query.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error: "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .query(`
          /*
            Obtenemos el último registro de cada
            formulario para el paciente y la fecha.
          */
          WITH FormulariosOrdenados AS (
            SELECT
              codigo_formulario,
              estado,
              fecha_creacion,
              fecha_modificacion,
              fecha_cierre,

              ROW_NUMBER() OVER (
                PARTITION BY codigo_formulario
                ORDER BY
                  COALESCE(
                    fecha_modificacion,
                    fecha_cierre,
                    fecha_creacion
                  ) DESC,
                  id DESC
              ) AS numero_fila

            FROM dbo.hc_formularios_datos

            WHERE paciente_id = @paciente_id
              AND fecha_procedimiento =
                @fecha_procedimiento
          )

          SELECT
            codigo_formulario,
            estado,
            fecha_creacion,
            fecha_modificacion,
            fecha_cierre

          FROM FormulariosOrdenados

          WHERE numero_fila = 1;
        `);

      const estados = {};

      for (
        const registro of
        resultado.recordset || []
      ) {
        const codigo = String(
          registro.codigo_formulario || ""
        )
          .trim()
          .toUpperCase();

        const estado = String(
          registro.estado || "PENDIENTE"
        )
          .trim()
          .toUpperCase();

        if (codigo) {
          estados[codigo] = {
            estado,
            fechaCreacion:
              registro.fecha_creacion,
            fechaModificacion:
              registro.fecha_modificacion,
            fechaCierre:
              registro.fecha_cierre
          };
        }
      }

      return res.json({
        ok: true,
        pacienteId,
        fechaProcedimiento,
        estados
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO ESTADOS DE FORMULARIOS:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron consultar los estados de los formularios",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*RUTA PARA DESCARGAR PLANTILLA DE DIAGNOSTICOS CIE */
app.get("/api/diagnosticos-cie/plantilla",requireAuth,async (req, res) => {
    try {
      const datosPlantilla = [
        {
          codigo: "I10",
          descripcion:
            "Hipertensión esencial primaria"
        },
        {
          codigo: "E11.9",
          descripcion:
            "Diabetes mellitus tipo 2 sin complicaciones"
        }
      ];

      const hoja = XLSX.utils.json_to_sheet(
        datosPlantilla,
        {
          header: [
            "codigo",
            "descripcion"
          ]
        }
      );

      hoja["!cols"] = [
        {
          wch: 20
        },
        {
          wch: 80
        }
      ];

      const libro =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "DIAGNOSTICOS"
      );

      const archivo = XLSX.write(
        libro,
        {
          type: "buffer",
          bookType: "xlsx"
        }
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="PLANTILLA_DIAGNOSTICOS_CIE.xlsx"'
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return res.send(archivo);

    } catch (error) {
      console.error(
        "ERROR GENERANDO PLANTILLA CIE:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo generar la plantilla",
        detalle:
          error.message || String(error)
      });
    }
  }
);

app.get("/api/diagnosticos-cie/:id",requireAuth,async (req, res) => {
    try {
      const diagnosticoId = Number(req.params.id);

      if (
        !Number.isInteger(diagnosticoId) ||
        diagnosticoId <= 0
      ) {
        return res.status(400).json({
          error: "Identificador no válido"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input("id", diagnosticoId)
        .query(`
          SELECT
            id,
            codigo,
            descripcion,
            estado,
            fecha_creacion
          FROM dbo.diagnosticos_cie
          WHERE id = @id;
        `);

      const diagnostico =
        resultado.recordset?.[0];

      if (!diagnostico) {
        return res.status(404).json({
          error: "No se encontró el diagnóstico"
        });
      }

      return res.json({
        ok: true,
        diagnostico
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO DIAGNÓSTICO CIE:",
        error
      );

      return res.status(500).json({
        error: "No se pudo consultar el diagnóstico",
        detalle: error.message || String(error)
      });
    }
  }
);

/*api de busqueda de diagnosticos para emergencia008 */
app.get("/api/diagnosticos-cie",requireAuth,async (req, res) => {
    try {
      const busqueda = String(
        req.query.buscar || ""
      ).trim();

      const soloActivos =
        String(
          req.query.soloActivos || ""
        ).toLowerCase() === "true";

      if (
        busqueda.length > 0 &&
        busqueda.length < 2
      ) {
        return res.json({
          ok: true,
          diagnosticos: []
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "texto",
          busqueda
        )
        .input(
          "busqueda",
          `%${busqueda}%`
        )
        .query(`
          SELECT TOP 200
            id,
            codigo,
            descripcion,
            estado,
            fecha_creacion
          FROM dbo.diagnosticos_cie
          WHERE
            (
              @texto = ''
              OR codigo LIKE @busqueda
              OR descripcion LIKE @busqueda
            )

            ${
              soloActivos
                ? "AND estado = 'ACTIVO'"
                : ""
            }

          ORDER BY
            CASE
              WHEN codigo = @texto THEN 0
              WHEN codigo LIKE @texto + '%' THEN 1
              WHEN descripcion LIKE @texto + '%' THEN 2
              ELSE 3
            END,
            codigo,
            descripcion;
        `);

      return res.json({
        ok: true,
        diagnosticos:
          resultado.recordset || []
      });

    } catch (error) {
      console.error(
        "ERROR LISTANDO DIAGNÓSTICOS CIE:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar los diagnósticos",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*REGISTRAR DIAGNOSTICO INDIVIDUAL */
app.post("/api/diagnosticos-cie",requireAuth,async (req, res) => {
    try {
      const codigo = String(
        req.body.codigo || ""
      )
        .trim()
        .toUpperCase();

      const descripcion = String(
        req.body.descripcion || ""
      ).trim();

      if (!codigo || !descripcion) {
        return res.status(400).json({
          error:
            "El código y la descripción son obligatorios"
        });
      }

      if (codigo.length > 20) {
        return res.status(400).json({
          error:
            "El código no puede superar 20 caracteres"
        });
      }

      if (descripcion.length > 500) {
        return res.status(400).json({
          error:
            "La descripción no puede superar 500 caracteres"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "codigo",
          codigo
        )
        .input(
          "descripcion",
          descripcion
        )
        .query(`
          INSERT INTO dbo.diagnosticos_cie (
            codigo,
            descripcion,
            estado
          )
          OUTPUT INSERTED.id
          VALUES (
            @codigo,
            @descripcion,
            'ACTIVO'
          );
        `);

      return res.status(201).json({
        ok: true,
        mensaje:
          "Diagnóstico registrado correctamente",
        diagnosticoId:
          resultado.recordset?.[0]?.id
      });

    } catch (error) {
      console.error(
        "ERROR REGISTRANDO DIAGNÓSTICO CIE:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(409).json({
          error:
            "Ya existe un diagnóstico con ese código"
        });
      }

      return res.status(500).json({
        error:
          "No se pudo registrar el diagnóstico",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*RUTA PARA IMPORTAR DIAGNOSTICOS MASIVAMENTE */
app.post("/api/diagnosticos-cie/importar",requireAuth,(req, res) => {
    subirArchivoDiagnosticosCIE.single(
      "archivo"
    )(
      req,
      res,
      async errorCarga => {
        if (errorCarga) {
          console.error(
            "ERROR RECIBIENDO EXCEL CIE:",
            errorCarga
          );

          return res.status(400).json({
            error:
              errorCarga.message ||
              "No se pudo recibir el archivo"
          });
        }

        let transaccion;

        try {
          if (!req.file?.buffer) {
            return res.status(400).json({
              error:
                "Seleccione un archivo Excel"
            });
          }

          const libro = XLSX.read(
            req.file.buffer,
            {
              type: "buffer",
              cellDates: false
            }
          );

          const nombrePrimeraHoja =
            libro.SheetNames?.[0];

          if (!nombrePrimeraHoja) {
            return res.status(400).json({
              error:
                "El archivo Excel no contiene hojas"
            });
          }

          const hoja =
            libro.Sheets[
              nombrePrimeraHoja
            ];

          const filas =
            XLSX.utils.sheet_to_json(
              hoja,
              {
                defval: "",
                raw: false
              }
            );

          if (!filas.length) {
            return res.status(400).json({
              error:
                "El archivo no contiene diagnósticos"
            });
          }

          const obtenerValor = (
            fila,
            nombresPermitidos
          ) => {
            const claves =
              Object.keys(fila);

            const claveEncontrada =
              claves.find(clave => {
                const claveNormalizada =
                  String(clave)
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(
                      /[\u0300-\u036f]/g,
                      ""
                    )
                    .replace(
                      /\s+/g,
                      "_"
                    );

                return nombresPermitidos.includes(
                  claveNormalizada
                );
              });

            return claveEncontrada
              ? fila[claveEncontrada]
              : "";
          };

          const diagnosticosProcesados = [];
          const erroresDetalle = [];
          const codigosArchivo = new Set();

          filas.forEach(
            (fila, indice) => {
              const numeroFila =
                indice + 2;

              const codigo = String(
                obtenerValor(
                  fila,
                  [
                    "codigo",
                    "codigo_cie",
                    "cie"
                  ]
                ) || ""
              )
                .trim()
                .toUpperCase();

              const descripcion = String(
                obtenerValor(
                  fila,
                  [
                    "descripcion",
                    "diagnostico",
                    "nombre"
                  ]
                ) || ""
              )
                .trim();

              if (
                !codigo &&
                !descripcion
              ) {
                return;
              }

              if (!codigo) {
                erroresDetalle.push({
                  fila: numeroFila,
                  error:
                    "Código CIE vacío"
                });

                return;
              }

              if (!descripcion) {
                erroresDetalle.push({
                  fila: numeroFila,
                  codigo,
                  error:
                    "Descripción vacía"
                });

                return;
              }

              if (codigo.length > 20) {
                erroresDetalle.push({
                  fila: numeroFila,
                  codigo,
                  error:
                    "El código supera 20 caracteres"
                });

                return;
              }

              if (
                descripcion.length > 500
              ) {
                erroresDetalle.push({
                  fila: numeroFila,
                  codigo,
                  error:
                    "La descripción supera 500 caracteres"
                });

                return;
              }

              if (
                codigosArchivo.has(codigo)
              ) {
                erroresDetalle.push({
                  fila: numeroFila,
                  codigo,
                  error:
                    "Código repetido dentro del archivo"
                });

                return;
              }

              codigosArchivo.add(codigo);

              diagnosticosProcesados.push({
                fila: numeroFila,
                codigo,
                descripcion
              });
            }
          );

          if (
            !diagnosticosProcesados.length
          ) {
            return res.status(400).json({
              error:
                "No se encontraron diagnósticos válidos",
              errores:
                erroresDetalle
            });
          }

          const pool = await getPool();

          transaccion =
            new sql.Transaction(pool);

          await transaccion.begin();

          let insertados = 0;
          let omitidosDuplicados = 0;

          for (
            const diagnostico
            of diagnosticosProcesados
          ) {
            const resultado =
              await new sql.Request(
                transaccion
              )
                .input(
                  "codigo",
                  sql.NVarChar(20),
                  diagnostico.codigo
                )
                .input(
                  "descripcion",
                  sql.NVarChar(500),
                  diagnostico.descripcion
                )
                .query(`
                  IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.diagnosticos_cie
                    WHERE codigo = @codigo
                  )
                  BEGIN
                    INSERT INTO dbo.diagnosticos_cie (
                      codigo,
                      descripcion,
                      estado
                    )
                    VALUES (
                      @codigo,
                      @descripcion,
                      'ACTIVO'
                    );

                    SELECT
                      CAST(1 AS BIT)
                        AS insertado;
                  END
                  ELSE
                  BEGIN
                    SELECT
                      CAST(0 AS BIT)
                        AS insertado;
                  END;
                `);

            const fueInsertado =
              resultado.recordset?.[0]
                ?.insertado;

            if (fueInsertado) {
              insertados++;
            } else {
              omitidosDuplicados++;
            }
          }

          await transaccion.commit();

          transaccion = null;

          return res.json({
            ok: true,
            mensaje:
              "Importación finalizada",
            totalFilas:
              filas.length,
            filasValidas:
              diagnosticosProcesados.length,
            insertados,
            omitidosDuplicados,
            errores:
              erroresDetalle.length,
            erroresDetalle:
              erroresDetalle.slice(0, 100)
          });

        } catch (error) {
          if (transaccion) {
            try {
              await transaccion.rollback();
            } catch (
              errorRollback
            ) {
              console.error(
                "ERROR REVERTIENDO IMPORTACIÓN CIE:",
                errorRollback
              );
            }
          }

          console.error(
            "ERROR IMPORTANDO DIAGNÓSTICOS CIE:",
            error
          );

          return res.status(500).json({
            error:
              "No se pudieron importar los diagnósticos",
            detalle:
              error.message ||
              String(error)
          });
        }
      }
    );
  }
);

/*RUTA PARA EDITAR DIAGNOSTICOS */
app.put("/api/diagnosticos-cie/:id",requireAuth,async (req, res) => {
    try {
      const diagnosticoId =
        Number(req.params.id);

      const codigo = String(
        req.body.codigo || ""
      )
        .trim()
        .toUpperCase();

      const descripcion = String(
        req.body.descripcion || ""
      ).trim();

      if (
        !Number.isInteger(diagnosticoId) ||
        diagnosticoId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identificador de diagnóstico no válido"
        });
      }

      if (!codigo || !descripcion) {
        return res.status(400).json({
          error:
            "El código y la descripción son obligatorios"
        });
      }

      if (codigo.length > 20) {
        return res.status(400).json({
          error:
            "El código no puede superar 20 caracteres"
        });
      }

      if (descripcion.length > 500) {
        return res.status(400).json({
          error:
            "La descripción no puede superar 500 caracteres"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          diagnosticoId
        )
        .input(
          "codigo",
          codigo
        )
        .input(
          "descripcion",
          descripcion
        )
        .query(`
          UPDATE dbo.diagnosticos_cie
          SET
            codigo = @codigo,
            descripcion = @descripcion
          WHERE id = @id;
        `);

      if (
        resultado.rowsAffected[0] === 0
      ) {
        return res.status(404).json({
          error:
            "No se encontró el diagnóstico"
        });
      }

      return res.json({
        ok: true,
        mensaje:
          "Diagnóstico actualizado correctamente"
      });

    } catch (error) {
      console.error(
        "ERROR EDITANDO DIAGNÓSTICO CIE:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(409).json({
          error:
            "Ya existe otro diagnóstico con ese código"
        });
      }

      return res.status(500).json({
        error:
          "No se pudo actualizar el diagnóstico",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*RUTA PARA ACTIVAR O INACTIVAR DIAGNOSTICOS */
app.patch("/api/diagnosticos-cie/estado/:id",requireAuth,async (req, res) => {
    try {
      const diagnosticoId =
        Number(req.params.id);

      if (
        !Number.isInteger(diagnosticoId) ||
        diagnosticoId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identificador no válido"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          diagnosticoId
        )
        .query(`
          UPDATE dbo.diagnosticos_cie
          SET
            estado =
              CASE
                WHEN estado = 'ACTIVO'
                  THEN 'INACTIVO'
                ELSE 'ACTIVO'
              END
          OUTPUT
            INSERTED.estado
          WHERE id = @id;
        `);

      const nuevoEstado =
        resultado.recordset?.[0]?.estado;

      if (!nuevoEstado) {
        return res.status(404).json({
          error:
            "No se encontró el diagnóstico"
        });
      }

      return res.json({
        ok: true,
        estado: nuevoEstado,
        mensaje:
          nuevoEstado === "ACTIVO"
            ? "Diagnóstico activado correctamente"
            : "Diagnóstico inactivado correctamente"
      });

    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO CIE:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cambiar el estado",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*las APIs del catálogo de profesionales */

/*lista de categorias y especialidades */
app.get("/api/profesionales-categorias",requireAuth,async (req, res) => {
    try {
      const pool = await getPool();

      const resultado = await pool
        .request()
        .query(`
          SELECT
            id,
            nombre,
            estado
          FROM dbo.profesionales_categorias
          ORDER BY nombre;
        `);

      return res.json({
        ok: true,
        categorias: resultado.recordset || []
      });
    } catch (error) {
      console.error(
        "ERROR LISTANDO CATEGORÍAS:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar las categorías",
        detalle:
          error.message || String(error)
      });
    }
  }
);

app.get("/api/profesionales-especialidades",requireAuth,async (req, res) => {
    try {
      const pool = await getPool();

      const resultado = await pool
        .request()
        .query(`
          SELECT
            id,
            nombre,
            estado
          FROM dbo.profesionales_especialidades
          ORDER BY nombre;
        `);

      return res.json({
        ok: true,
        especialidades:
          resultado.recordset || []
      });
    } catch (error) {
      console.error(
        "ERROR LISTANDO ESPECIALIDADES:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar las especialidades",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*listar y buscar profesionales */
app.get("/api/profesionales-salud",requireAuth,async (req, res) => {
    try {
      const buscar = String(
        req.query.buscar || ""
      ).trim();

      const soloActivos =
        String(
          req.query.soloActivos || ""
        ).toLowerCase() === "true";

      const pool = await getPool();

      const solicitud = pool
        .request()
        .input(
          "buscar",
          `%${buscar}%`
        );

      const resultado =
        await solicitud.query(`
          SELECT TOP 100
            p.id,
            p.primer_nombre,
            p.segundo_nombre,
            p.primer_apellido,
            p.segundo_apellido,
            p.tipo_identificacion,
            p.cedula,
            p.categoria_id,
            c.nombre AS categoria,
            p.especialidad_id,
            e.nombre AS especialidad,
            p.registro_profesional,
            p.firma_ruta,
            p.sello_ruta,
            p.estado,
            p.fecha_creacion,
            p.fecha_modificacion,

            LTRIM(RTRIM(
              CONCAT(
                p.primer_nombre,
                ' ',
                ISNULL(p.segundo_nombre, ''),
                ' ',
                p.primer_apellido,
                ' ',
                ISNULL(p.segundo_apellido, '')
              )
            )) AS nombre_completo

          FROM dbo.profesionales_salud p

          INNER JOIN
            dbo.profesionales_categorias c
            ON c.id = p.categoria_id

          INNER JOIN
            dbo.profesionales_especialidades e
            ON e.id = p.especialidad_id

          WHERE
            (
              @buscar = '%%'
              OR p.cedula LIKE @buscar
              OR p.primer_nombre LIKE @buscar
              OR p.segundo_nombre LIKE @buscar
              OR p.primer_apellido LIKE @buscar
              OR p.segundo_apellido LIKE @buscar
              OR c.nombre LIKE @buscar
              OR e.nombre LIKE @buscar
              OR CONCAT(
                p.primer_nombre,
                ' ',
                ISNULL(p.segundo_nombre, ''),
                ' ',
                p.primer_apellido,
                ' ',
                ISNULL(p.segundo_apellido, '')
              ) LIKE @buscar
            )

            ${
              soloActivos
                ? "AND p.estado = 'ACTIVO'"
                : ""
            }

          ORDER BY
            p.primer_apellido,
            p.segundo_apellido,
            p.primer_nombre,
            p.segundo_nombre;
        `);

      return res.json({
        ok: true,
        profesionales:
          resultado.recordset || []
      });
    } catch (error) {
      console.error(
        "ERROR LISTANDO PROFESIONALES:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar los profesionales",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*registrar un profesional */
app.post("/api/profesionales-salud",requireAuth,async (req, res) => {
    try {
      const {
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        tipoIdentificacion,
        cedula,
        categoriaId,
        especialidadId,
        registroProfesional
      } = req.body;

      const primerNombreLimpio =
        String(primerNombre || "")
          .trim()
          .toUpperCase();

      const segundoNombreLimpio =
        String(segundoNombre || "")
          .trim()
          .toUpperCase();

      const primerApellidoLimpio =
        String(primerApellido || "")
          .trim()
          .toUpperCase();

      const segundoApellidoLimpio =
        String(segundoApellido || "")
          .trim()
          .toUpperCase();

      const cedulaLimpia =
        String(cedula || "").trim();

      const tipoIdentificacionLimpio =
        String(
          tipoIdentificacion || "CÉDULA"
        )
          .trim()
          .toUpperCase();

      const registroLimpio =
        String(
          registroProfesional || ""
        )
          .trim()
          .toUpperCase();

      if (
        !primerNombreLimpio ||
        !primerApellidoLimpio ||
        !cedulaLimpia ||
        !Number(categoriaId) ||
        !Number(especialidadId)
      ) {
        return res.status(400).json({
          error:
            "Completa los datos obligatorios del profesional"
        });
      }

      if (
        tipoIdentificacionLimpio ===
          "CÉDULA" &&
        !/^\d{10}$/.test(cedulaLimpia)
      ) {
        return res.status(400).json({
          error:
            "La cédula debe contener 10 dígitos"
        });
      }

      const usuarioSesion = {
        username:
          req.session?.usuario?.username ||
          req.session?.username ||
          "",

        nombreCompleto:
          req.session?.usuario
            ?.nombreCompleto ||
          req.session?.nombreCompleto ||
          ""
      };

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "primer_nombre",
          primerNombreLimpio
        )
        .input(
          "segundo_nombre",
          segundoNombreLimpio || null
        )
        .input(
          "primer_apellido",
          primerApellidoLimpio
        )
        .input(
          "segundo_apellido",
          segundoApellidoLimpio || null
        )
        .input(
          "tipo_identificacion",
          tipoIdentificacionLimpio
        )
        .input(
          "cedula",
          cedulaLimpia
        )
        .input(
          "categoria_id",
          Number(categoriaId)
        )
        .input(
          "especialidad_id",
          Number(especialidadId)
        )
        .input(
          "registro_profesional",
          registroLimpio || null
        )
        .input(
          "creado_por_username",
          usuarioSesion.username
        )
        .input(
          "creado_por_nombre",
          usuarioSesion.nombreCompleto
        )
        .query(`
          INSERT INTO dbo.profesionales_salud (
            primer_nombre,
            segundo_nombre,
            primer_apellido,
            segundo_apellido,
            tipo_identificacion,
            cedula,
            categoria_id,
            especialidad_id,
            registro_profesional,
            estado,
            creado_por_username,
            creado_por_nombre
          )
          OUTPUT INSERTED.id
          VALUES (
            @primer_nombre,
            @segundo_nombre,
            @primer_apellido,
            @segundo_apellido,
            @tipo_identificacion,
            @cedula,
            @categoria_id,
            @especialidad_id,
            @registro_profesional,
            'ACTIVO',
            @creado_por_username,
            @creado_por_nombre
          );
        `);

      const profesionalId =
        resultado.recordset?.[0]?.id;

      return res.status(201).json({
        ok: true,
        mensaje:
          "Profesional registrado correctamente",
        profesionalId
      });
    } catch (error) {
      console.error(
        "ERROR REGISTRANDO PROFESIONAL:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(409).json({
          error:
            "Ya existe un profesional con esa cédula"
        });
      }

      return res.status(500).json({
        error:
          "No se pudo registrar el profesional",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*editar profesional */
app.put("/api/profesionales-salud/:id",requireAuth,async (req, res) => {
    try {
      const profesionalId =
        Number(req.params.id);

      if (
        !Number.isInteger(profesionalId) ||
        profesionalId <= 0
      ) {
        return res.status(400).json({
          error:
            "El identificador del profesional no es válido"
        });
      }

      const {
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        tipoIdentificacion,
        cedula,
        categoriaId,
        especialidadId,
        registroProfesional
      } = req.body;

      const primerNombreLimpio =
        String(primerNombre || "")
          .trim()
          .toUpperCase();

      const segundoNombreLimpio =
        String(segundoNombre || "")
          .trim()
          .toUpperCase();

      const primerApellidoLimpio =
        String(primerApellido || "")
          .trim()
          .toUpperCase();

      const segundoApellidoLimpio =
        String(segundoApellido || "")
          .trim()
          .toUpperCase();

      const cedulaLimpia =
        String(cedula || "").trim();

      if (
        !primerNombreLimpio ||
        !primerApellidoLimpio ||
        !cedulaLimpia ||
        !Number(categoriaId) ||
        !Number(especialidadId)
      ) {
        return res.status(400).json({
          error:
            "Completa los datos obligatorios"
        });
      }

      const usuarioSesion = {
        username:
          req.session?.usuario?.username ||
          req.session?.username ||
          "",

        nombreCompleto:
          req.session?.usuario
            ?.nombreCompleto ||
          req.session?.nombreCompleto ||
          ""
      };

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          profesionalId
        )
        .input(
          "primer_nombre",
          primerNombreLimpio
        )
        .input(
          "segundo_nombre",
          segundoNombreLimpio || null
        )
        .input(
          "primer_apellido",
          primerApellidoLimpio
        )
        .input(
          "segundo_apellido",
          segundoApellidoLimpio || null
        )
        .input(
          "tipo_identificacion",
          String(
            tipoIdentificacion || "CÉDULA"
          )
            .trim()
            .toUpperCase()
        )
        .input(
          "cedula",
          cedulaLimpia
        )
        .input(
          "categoria_id",
          Number(categoriaId)
        )
        .input(
          "especialidad_id",
          Number(especialidadId)
        )
        .input(
          "registro_profesional",
          String(
            registroProfesional || ""
          )
            .trim()
            .toUpperCase() || null
        )
        .input(
          "modificado_por_username",
          usuarioSesion.username
        )
        .input(
          "modificado_por_nombre",
          usuarioSesion.nombreCompleto
        )
        .query(`
          UPDATE dbo.profesionales_salud
          SET
            primer_nombre =
              @primer_nombre,

            segundo_nombre =
              @segundo_nombre,

            primer_apellido =
              @primer_apellido,

            segundo_apellido =
              @segundo_apellido,

            tipo_identificacion =
              @tipo_identificacion,

            cedula =
              @cedula,

            categoria_id =
              @categoria_id,

            especialidad_id =
              @especialidad_id,

            registro_profesional =
              @registro_profesional,

            fecha_modificacion =
              SYSUTCDATETIME(),

            modificado_por_username =
              @modificado_por_username,

            modificado_por_nombre =
              @modificado_por_nombre

          WHERE id = @id;
        `);

      if (resultado.rowsAffected[0] === 0) {
        return res.status(404).json({
          error:
            "No se encontró el profesional"
        });
      }

      return res.json({
        ok: true,
        mensaje:
          "Profesional actualizado correctamente"
      });
    } catch (error) {
      console.error(
        "ERROR EDITANDO PROFESIONAL:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(409).json({
          error:
            "Ya existe otro profesional con esa cédula"
        });
      }

      return res.status(500).json({
        error:
          "No se pudo actualizar el profesional",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*activar o inactivar profesional */
app.patch("/api/profesionales-salud/estado/:id",requireAuth,async (req, res) => {
    try {
      const profesionalId =
        Number(req.params.id);

      if (
        !Number.isInteger(profesionalId) ||
        profesionalId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identificador no válido"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          profesionalId
        )
        .query(`
          UPDATE dbo.profesionales_salud
          SET
            estado =
              CASE
                WHEN estado = 'ACTIVO'
                  THEN 'INACTIVO'
                ELSE 'ACTIVO'
              END,

            fecha_modificacion =
              SYSUTCDATETIME()

          OUTPUT INSERTED.estado

          WHERE id = @id;
        `);

      const nuevoEstado =
        resultado.recordset?.[0]?.estado;

      if (!nuevoEstado) {
        return res.status(404).json({
          error:
            "No se encontró el profesional"
        });
      }

      return res.json({
        ok: true,
        estado: nuevoEstado,
        mensaje:
          `Profesional ${nuevoEstado.toLowerCase()} correctamente`
      });
    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cambiar el estado",
        detalle:
          error.message || String(error)
      });
    }
  }
);

/*susbir firma y sello */
app.post("/api/profesionales-salud/:id/imagenes",requireAuth,(req, res) => {
    cargarFirmaYSello(
      req,
      res,
      async errorCarga => {
        if (errorCarga) {
          console.error(
            "ERROR SUBIENDO IMÁGENES:",
            errorCarga
          );

          return res.status(400).json({
            error:
              errorCarga.message ||
              "No se pudieron subir las imágenes"
          });
        }

        try {
          const profesionalId =
            Number(req.params.id);

          if (
            !Number.isInteger(
              profesionalId
            ) ||
            profesionalId <= 0
          ) {
            return res.status(400).json({
              error:
                "Identificador no válido"
            });
          }

          const archivoFirma =
            req.files?.firma?.[0];

          const archivoSello =
            req.files?.sello?.[0];

          if (
            !archivoFirma &&
            !archivoSello
          ) {
            return res.status(400).json({
              error:
                "Selecciona una firma o un sello"
            });
          }

          const rutaFirma =
            archivoFirma
              ? path.relative(
                  __dirname,
                  archivoFirma.path
                )
              : null;

          const rutaSello =
            archivoSello
              ? path.relative(
                  __dirname,
                  archivoSello.path
                )
              : null;

          const pool = await getPool();

          const solicitud = pool
            .request()
            .input(
              "id",
              profesionalId
            );

          let consulta = `
            UPDATE dbo.profesionales_salud
            SET
          `;

          const cambios = [];

          if (rutaFirma) {
            solicitud.input(
              "firma_ruta",
              rutaFirma
            );

            cambios.push(
              "firma_ruta = @firma_ruta"
            );
          }

          if (rutaSello) {
            solicitud.input(
              "sello_ruta",
              rutaSello
            );

            cambios.push(
              "sello_ruta = @sello_ruta"
            );
          }

          cambios.push(
            "fecha_modificacion = SYSUTCDATETIME()"
          );

          consulta +=
            cambios.join(", ") +
            " WHERE id = @id;";

          const resultado =
            await solicitud.query(
              consulta
            );

          if (
            resultado.rowsAffected[0] ===
            0
          ) {
            return res.status(404).json({
              error:
                "No se encontró el profesional"
            });
          }

          return res.json({
            ok: true,
            mensaje:
              "Firma y sello guardados correctamente",
            firmaRuta: rutaFirma,
            selloRuta: rutaSello
          });
        } catch (error) {
          console.error(
            "ERROR GUARDANDO RUTAS:",
            error
          );

          return res.status(500).json({
            error:
              "No se pudieron guardar la firma o el sello",
            detalle:
              error.message ||
              String(error)
          });
        }
      }
    );
  }
);

/*consultar un profesional por id */
app.get("/api/profesionales-salud/:id",requireAuth,async (req, res) => {
    try {
      const profesionalId =
        Number(req.params.id);

      if (
        !Number.isInteger(profesionalId) ||
        profesionalId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identificador no válido"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          profesionalId
        )
        .query(`
          SELECT
            p.id,
            p.primer_nombre,
            p.segundo_nombre,
            p.primer_apellido,
            p.segundo_apellido,
            p.tipo_identificacion,
            p.cedula,
            p.categoria_id,
            c.nombre AS categoria,
            p.especialidad_id,
            e.nombre AS especialidad,
            p.registro_profesional,
            p.firma_ruta,
            p.sello_ruta,
            p.estado
          FROM dbo.profesionales_salud p

          INNER JOIN
            dbo.profesionales_categorias c
            ON c.id = p.categoria_id

          INNER JOIN
            dbo.profesionales_especialidades e
            ON e.id = p.especialidad_id

          WHERE p.id = @id;
        `);

      const profesional =
        resultado.recordset?.[0];

      if (!profesional) {
        return res.status(404).json({
          error:
            "No se encontró el profesional"
        });
      }

      return res.json({
        ok: true,
        profesional
      });
    } catch (error) {
      console.error(
        "ERROR CONSULTANDO PROFESIONAL:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo consultar el profesional",
        detalle:
          error.message || String(error)
      });
    }
  }
);




app.get("/api/profesionales-salud/:id/firma",requireAuth,async (req, res) => {
    try {
      const profesionalId =
        Number(req.params.id);

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input("id", profesionalId)
        .query(`
          SELECT firma_ruta
          FROM dbo.profesionales_salud
          WHERE id = @id;
        `);

      const rutaRelativa =
        resultado.recordset?.[0]
          ?.firma_ruta;

      if (!rutaRelativa) {
        return res.status(404).json({
          error:
            "El profesional no tiene firma"
        });
      }

      const rutaAbsoluta = path.resolve(
        __dirname,
        rutaRelativa
      );

      if (
        !rutaAbsoluta.startsWith(
          path.resolve(
            RUTA_PROFESIONALES
          )
        ) ||
        !fs.existsSync(rutaAbsoluta)
      ) {
        return res.status(404).json({
          error:
            "No se encontró la firma"
        });
      }

      return res.sendFile(rutaAbsoluta);

    } catch (error) {
      console.error(
        "ERROR MOSTRANDO FIRMA:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo mostrar la firma"
      });
    }
  }
);

app.get("/api/profesionales-salud/:id/sello",requireAuth,async (req, res) => {
    try {
      const profesionalId =
        Number(req.params.id);

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input("id", profesionalId)
        .query(`
          SELECT sello_ruta
          FROM dbo.profesionales_salud
          WHERE id = @id;
        `);

      const rutaRelativa =
        resultado.recordset?.[0]
          ?.sello_ruta;

      if (!rutaRelativa) {
        return res.status(404).json({
          error:
            "El profesional no tiene sello"
        });
      }

      const rutaAbsoluta = path.resolve(
        __dirname,
        rutaRelativa
      );

      if (
        !rutaAbsoluta.startsWith(
          path.resolve(
            RUTA_PROFESIONALES
          )
        ) ||
        !fs.existsSync(rutaAbsoluta)
      ) {
        return res.status(404).json({
          error:
            "No se encontró el sello"
        });
      }

      return res.sendFile(rutaAbsoluta);

    } catch (error) {
      console.error(
        "ERROR MOSTRANDO SELLO:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo mostrar el sello"
      });
    }
  }
);

/*funcion para firma y sello de medico en 008 emergencia */
async function insertarImagenEnCampoPDF008({
  pdfDoc,
  formulario,
  nombreCampo,
  rutaImagen
}) {
  if (!rutaImagen) return false;

  try {
    const rutaAbsoluta = path.resolve(
      __dirname,
      rutaImagen
    );

    const carpetaPermitida = path.resolve(
      RUTA_PROFESIONALES
    );

    if (
      !rutaAbsoluta.startsWith(
        carpetaPermitida
      )
    ) {
      throw new Error(
        "La ruta de la imagen no está permitida"
      );
    }

    if (!fs.existsSync(rutaAbsoluta)) {
      throw new Error(
        "No se encontró el archivo de imagen"
      );
    }

    const campo =
      formulario.getTextField(
        nombreCampo
      );

    const widgets =
      campo.acroField.getWidgets();

    if (!widgets.length) {
      throw new Error(
        "El campo no tiene una ubicación válida"
      );
    }

    const widget = widgets[0];
    const rectangulo =
      widget.getRectangle();

    const referenciaPagina =
      widget.P();

    const paginas = pdfDoc.getPages();

    const pagina = paginas.find(
      paginaPDF => {
        if (!referenciaPagina) {
          return false;
        }

        return (
          paginaPDF.ref ===
            referenciaPagina ||
          paginaPDF.ref.toString() ===
            referenciaPagina.toString()
        );
      }
    );

    if (!pagina) {
      throw new Error(
        `No se pudo localizar la página de ${nombreCampo}`
      );
    }

    const bytesImagen =
      fs.readFileSync(rutaAbsoluta);

    const extension = path
      .extname(rutaAbsoluta)
      .toLowerCase();

    let imagen;

    if (extension === ".png") {
      imagen = await pdfDoc.embedPng(
        bytesImagen
      );
    } else if (
      extension === ".jpg" ||
      extension === ".jpeg"
    ) {
      imagen = await pdfDoc.embedJpg(
        bytesImagen
      );
    } else {
      throw new Error(
        "La imagen debe ser PNG o JPG"
      );
    }

    const escala = Math.min(
      rectangulo.width / imagen.width,
      rectangulo.height / imagen.height
    );

    const anchoImagen =
      imagen.width * escala;

    const altoImagen =
      imagen.height * escala;

    pagina.drawImage(imagen, {
      x:
        rectangulo.x +
        (
          rectangulo.width -
          anchoImagen
        ) / 2,

      y:
        rectangulo.y +
        (
          rectangulo.height -
          altoImagen
        ) / 2,

      width: anchoImagen,
      height: altoImagen
    });

    campo.setText("");

    widgets.forEach(widgetCampo => {
      try {
        widgetCampo
          .getBorderStyle()
          ?.setWidth(0);
      } catch (errorBorde) {
        console.warn(
          `No se pudo ocultar el borde de ${nombreCampo}:`,
          errorBorde.message
        );
      }
    });

    campo.enableReadOnly();

    return true;

  } catch (error) {
    console.warn(
      `No se pudo insertar la imagen en "${nombreCampo}":`,
      error.message
    );

    return false;
  }
}


/*ruta para verificar los camposdel pdf en la carpeta de pdf plantillas */
app.get(
  "/api/hclinicas/018/inspeccionar-campos",
  requireAuth,
  async (req, res) => {
    try {
      const rutaPlantilla = path.join(
        __dirname,
        "plantillas_hclinicas",
        "018_preanestesico.pdf"
      );

      if (!fs.existsSync(rutaPlantilla)) {
        return res.status(404).json({
          error:
            "No se encontró la plantilla del formulario 018"
        });
      }

      const bytesPlantilla =
        fs.readFileSync(rutaPlantilla);

      const pdfDoc = await PDFDocument.load(
        bytesPlantilla
      );

      const formulario =
        pdfDoc.getForm();

      const campos = formulario
        .getFields()
        .map((campo, indice) => {
          let nombre = "SIN_NOMBRE";
          let tipo = "DESCONOCIDO";

          try {
            nombre =
              campo.getName() ||
              "SIN_NOMBRE";
          } catch {
            nombre = "ERROR_NOMBRE";
          }

          try {
            tipo =
              campo.constructor?.name ||
              "DESCONOCIDO";
          } catch {
            tipo = "ERROR_TIPO";
          }

          return {
            numero: indice + 1,
            nombre,
            tipo
          };
        });

      console.log(
        "\n=============================="
      );

      console.log(
        "CAMPOS REALES DEL PDF 018"
      );

      console.log(
        "==============================\n"
      );

      campos.forEach(campo => {
        console.log(
          `${campo.numero}. [${campo.tipo}] ${campo.nombre}`
        );
      });

      console.log(
        `\nTOTAL CAMPOS: ${campos.length}\n`
      );

      return res.json({
        ok: true,
        total: campos.length,
        campos
      });

    } catch (error) {
      console.error(
        "ERROR INSPECCIONANDO PDF 018:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron inspeccionar los campos del PDF 018",

        detalle:
          error.message ||
          String(error)
      });
    }
  }
);



/* =========================================================
   NOMBRES DE PROCEDIMIENTOS MÉDICOS
========================================================= */


/* LISTAR Y BUSCAR PROCEDIMIENTOS */
app.get(
  "/api/procedimientos-medicos",
  requireAuth,
  async (req, res) => {
    try {
      const busqueda = String(
        req.query.buscar || ""
      ).trim();

      const soloActivos =
        String(
          req.query.soloActivos || ""
        ).toLowerCase() === "true";

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "texto",
          busqueda
        )
        .input(
          "busqueda",
          `%${busqueda}%`
        )
        .query(`
          SELECT TOP 300
            id,
            nombre,
            estado,
            fecha_creacion,
            creado_por
          FROM dbo.procedimientos_medicos
          WHERE
            (
              @texto = ''
              OR nombre LIKE @busqueda
            )

            ${
              soloActivos
                ? "AND estado = 'ACTIVO'"
                : ""
            }

          ORDER BY
            CASE
              WHEN nombre = @texto THEN 0
              WHEN nombre LIKE @texto + '%' THEN 1
              ELSE 2
            END,
            nombre;
        `);

      return res.json({
        ok: true,
        procedimientos:
          resultado.recordset || []
      });

    } catch (error) {
      console.error(
        "ERROR LISTANDO PROCEDIMIENTOS:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar los procedimientos",
        detalle:
          error.message || String(error)
      });
    }
  }
);


/* DESCARGAR PLANTILLA EXCEL */
app.get(
  "/api/procedimientos-medicos/plantilla",
  requireAuth,
  async (req, res) => {
    try {
      const datosPlantilla = [
        {
          nombre:
            "CORONARIOGRAFÍA"
        },
        {
          nombre:
            "ANGIOPLASTIA CORONARIA"
        },
        {
          nombre:
            "IMPLANTE DE MARCAPASOS"
        }
      ];

      const hoja =
        XLSX.utils.json_to_sheet(
          datosPlantilla,
          {
            header: ["nombre"]
          }
        );

      hoja["!cols"] = [
        {
          wch: 70
        }
      ];

      const libro =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "PROCEDIMIENTOS"
      );

      const archivo = XLSX.write(
        libro,
        {
          type: "buffer",
          bookType: "xlsx"
        }
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="PLANTILLA_PROCEDIMIENTOS_MEDICOS.xlsx"'
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return res.send(archivo);

    } catch (error) {
      console.error(
        "ERROR GENERANDO PLANTILLA DE PROCEDIMIENTOS:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo generar la plantilla",
        detalle:
          error.message || String(error)
      });
    }
  }
);


/* REGISTRAR PROCEDIMIENTO INDIVIDUAL */
app.post(
  "/api/procedimientos-medicos",
  requireAuth,
  async (req, res) => {
    try {
      const nombre = String(
        req.body.nombre || ""
      )
        .trim()
        .toUpperCase();

      if (!nombre) {
        return res.status(400).json({
          error:
            "El nombre del procedimiento es obligatorio"
        });
      }

      if (nombre.length > 300) {
        return res.status(400).json({
          error:
            "El nombre no puede superar 300 caracteres"
        });
      }

      const creadoPor =
        Number(
          req.session?.usuario?.id ||
          req.session?.usuarioId ||
          req.session?.userId ||
          0
        ) || null;

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "nombre",
          sql.NVarChar(300),
          nombre
        )
        .input(
          "creado_por",
          sql.Int,
          creadoPor
        )
        .query(`
          INSERT INTO dbo.procedimientos_medicos (
            nombre,
            estado,
            creado_por
          )
          OUTPUT
            INSERTED.id,
            INSERTED.nombre,
            INSERTED.estado
          VALUES (
            @nombre,
            'ACTIVO',
            @creado_por
          );
        `);

      return res.status(201).json({
        ok: true,
        mensaje:
          "Procedimiento registrado correctamente",
        procedimiento:
          resultado.recordset?.[0] || null
      });

    } catch (error) {
      console.error(
        "ERROR REGISTRANDO PROCEDIMIENTO:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(409).json({
          error:
            "Ya existe un procedimiento con ese nombre"
        });
      }

      return res.status(500).json({
        error:
          "No se pudo registrar el procedimiento",
        detalle:
          error.message || String(error)
      });
    }
  }
);


/* IMPORTAR PROCEDIMIENTOS DESDE EXCEL */
app.post(
  "/api/procedimientos-medicos/importar",
  requireAuth,
  (req, res) => {
    subirArchivoDiagnosticosCIE.single(
      "archivo"
    )(
      req,
      res,
      async errorCarga => {
        if (errorCarga) {
          console.error(
            "ERROR RECIBIENDO EXCEL DE PROCEDIMIENTOS:",
            errorCarga
          );

          return res.status(400).json({
            error:
              errorCarga.message ||
              "No se pudo recibir el archivo"
          });
        }

        let transaccion;

        try {
          if (!req.file?.buffer) {
            return res.status(400).json({
              error:
                "Seleccione un archivo Excel"
            });
          }

          const libro = XLSX.read(
            req.file.buffer,
            {
              type: "buffer",
              cellDates: false
            }
          );

          const nombrePrimeraHoja =
            libro.SheetNames?.[0];

          if (!nombrePrimeraHoja) {
            return res.status(400).json({
              error:
                "El archivo Excel no contiene hojas"
            });
          }

          const hoja =
            libro.Sheets[
              nombrePrimeraHoja
            ];

          const filas =
            XLSX.utils.sheet_to_json(
              hoja,
              {
                defval: "",
                raw: false
              }
            );

          if (!filas.length) {
            return res.status(400).json({
              error:
                "El archivo no contiene procedimientos"
            });
          }

          const obtenerNombre = fila => {
            const claves =
              Object.keys(fila);

            const claveEncontrada =
              claves.find(clave => {
                const claveNormalizada =
                  String(clave)
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(
                      /[\u0300-\u036f]/g,
                      ""
                    )
                    .replace(
                      /\s+/g,
                      "_"
                    );

                return [
                  "nombre",
                  "procedimiento",
                  "nombre_procedimiento"
                ].includes(
                  claveNormalizada
                );
              });

            return claveEncontrada
              ? fila[claveEncontrada]
              : "";
          };

          const procedimientosProcesados = [];
          const erroresDetalle = [];
          const nombresArchivo = new Set();

          filas.forEach(
            (fila, indice) => {
              const numeroFila =
                indice + 2;

              const nombre = String(
                obtenerNombre(fila) || ""
              )
                .trim()
                .toUpperCase();

              if (!nombre) {
                erroresDetalle.push({
                  fila: numeroFila,
                  error:
                    "Nombre del procedimiento vacío"
                });

                return;
              }

              if (nombre.length > 300) {
                erroresDetalle.push({
                  fila: numeroFila,
                  nombre,
                  error:
                    "El nombre supera 300 caracteres"
                });

                return;
              }

              if (
                nombresArchivo.has(nombre)
              ) {
                erroresDetalle.push({
                  fila: numeroFila,
                  nombre,
                  error:
                    "Procedimiento repetido dentro del archivo"
                });

                return;
              }

              nombresArchivo.add(nombre);

              procedimientosProcesados.push({
                fila: numeroFila,
                nombre
              });
            }
          );

          if (
            !procedimientosProcesados.length
          ) {
            return res.status(400).json({
              error:
                "No se encontraron procedimientos válidos",
              errores:
                erroresDetalle
            });
          }

          const creadoPor =
            Number(
              req.session?.usuario?.id ||
              req.session?.usuarioId ||
              req.session?.userId ||
              0
            ) || null;

          const pool = await getPool();

          transaccion =
            new sql.Transaction(pool);

          await transaccion.begin();

          let insertados = 0;
          let omitidosDuplicados = 0;

          for (
            const procedimiento
            of procedimientosProcesados
          ) {
            const resultado =
              await new sql.Request(
                transaccion
              )
                .input(
                  "nombre",
                  sql.NVarChar(300),
                  procedimiento.nombre
                )
                .input(
                  "creado_por",
                  sql.Int,
                  creadoPor
                )
                .query(`
                  IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.procedimientos_medicos
                    WHERE nombre = @nombre
                  )
                  BEGIN
                    INSERT INTO dbo.procedimientos_medicos (
                      nombre,
                      estado,
                      creado_por
                    )
                    VALUES (
                      @nombre,
                      'ACTIVO',
                      @creado_por
                    );

                    SELECT
                      CAST(1 AS BIT)
                        AS insertado;
                  END
                  ELSE
                  BEGIN
                    SELECT
                      CAST(0 AS BIT)
                        AS insertado;
                  END;
                `);

            const fueInsertado =
              resultado.recordset?.[0]
                ?.insertado;

            if (fueInsertado) {
              insertados++;
            } else {
              omitidosDuplicados++;
            }
          }

          await transaccion.commit();

          transaccion = null;

          return res.json({
            ok: true,
            mensaje:
              "Importación finalizada",
            totalFilas:
              filas.length,
            filasValidas:
              procedimientosProcesados.length,
            insertados,
            omitidosDuplicados,
            errores:
              erroresDetalle.length,
            erroresDetalle:
              erroresDetalle.slice(0, 100)
          });

        } catch (error) {
          if (transaccion) {
            try {
              await transaccion.rollback();
            } catch (
              errorRollback
            ) {
              console.error(
                "ERROR REVERTIENDO IMPORTACIÓN:",
                errorRollback
              );
            }
          }

          console.error(
            "ERROR IMPORTANDO PROCEDIMIENTOS:",
            error
          );

          return res.status(500).json({
            error:
              "No se pudieron importar los procedimientos",
            detalle:
              error.message || String(error)
          });
        }
      }
    );
  }
);


/* EDITAR PROCEDIMIENTO */
app.put(
  "/api/procedimientos-medicos/:id",
  requireAuth,
  async (req, res) => {
    try {
      const procedimientoId =
        Number(req.params.id);

      const nombre = String(
        req.body.nombre || ""
      )
        .trim()
        .toUpperCase();

      if (
        !Number.isInteger(
          procedimientoId
        ) ||
        procedimientoId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identificador no válido"
        });
      }

      if (!nombre) {
        return res.status(400).json({
          error:
            "El nombre del procedimiento es obligatorio"
        });
      }

      if (nombre.length > 300) {
        return res.status(400).json({
          error:
            "El nombre no puede superar 300 caracteres"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          sql.Int,
          procedimientoId
        )
        .input(
          "nombre",
          sql.NVarChar(300),
          nombre
        )
        .query(`
          UPDATE dbo.procedimientos_medicos
          SET nombre = @nombre
          WHERE id = @id;
        `);

      if (
        resultado.rowsAffected[0] === 0
      ) {
        return res.status(404).json({
          error:
            "No se encontró el procedimiento"
        });
      }

      return res.json({
        ok: true,
        mensaje:
          "Procedimiento actualizado correctamente"
      });

    } catch (error) {
      console.error(
        "ERROR EDITANDO PROCEDIMIENTO:",
        error
      );

      if (
        error.number === 2627 ||
        error.number === 2601
      ) {
        return res.status(409).json({
          error:
            "Ya existe otro procedimiento con ese nombre"
        });
      }

      return res.status(500).json({
        error:
          "No se pudo actualizar el procedimiento",
        detalle:
          error.message || String(error)
      });
    }
  }
);


/* ACTIVAR O INACTIVAR PROCEDIMIENTO */
app.patch(
  "/api/procedimientos-medicos/estado/:id",
  requireAuth,
  async (req, res) => {
    try {
      const procedimientoId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          procedimientoId
        ) ||
        procedimientoId <= 0
      ) {
        return res.status(400).json({
          error:
            "Identificador no válido"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "id",
          sql.Int,
          procedimientoId
        )
        .query(`
          UPDATE dbo.procedimientos_medicos
          SET
            estado =
              CASE
                WHEN estado = 'ACTIVO'
                  THEN 'INACTIVO'
                ELSE 'ACTIVO'
              END
          OUTPUT
            INSERTED.estado
          WHERE id = @id;
        `);

      const nuevoEstado =
        resultado.recordset?.[0]?.estado;

      if (!nuevoEstado) {
        return res.status(404).json({
          error:
            "No se encontró el procedimiento"
        });
      }

      return res.json({
        ok: true,
        estado: nuevoEstado,
        mensaje:
          nuevoEstado === "ACTIVO"
            ? "Procedimiento activado correctamente"
            : "Procedimiento inactivado correctamente"
      });

    } catch (error) {
      console.error(
        "ERROR CAMBIANDO ESTADO DEL PROCEDIMIENTO:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cambiar el estado",
        detalle:
          error.message || String(error)
      });
    }
  }
);



/* =========================================================
   018 formulario preanestesico
========================================================= */
/*guardar borrador del formiulario 018 */
app.post("/api/hclinicas/018/guardar-borrador",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      /*
        El Formulario 018 guarda la fecha como
        fecha_procedimiento.

        Dejamos fecha_admision_paciente como
        respaldo por compatibilidad.
      */
      const fechaProcedimiento = String(
        datos.fecha_procedimiento ||
        datos.fecha_admision_paciente ||
        ""
      ).slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultadoGuardado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "018"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "datos_json",
          JSON.stringify(datos)
        )
        .input(
          "usuario_username",
          usuarioSesion.username
        )
        .input(
          "usuario_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @formulario_id INT;
            DECLARE @estado_actual NVARCHAR(20);

            SELECT
              @formulario_id = id,
              @estado_actual = estado
            FROM dbo.hc_formularios_datos
              WITH (UPDLOCK, HOLDLOCK)
            WHERE paciente_id = @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;

            /*
              Si ya existe y dejó de ser borrador,
              no puede modificarse.
            */
            IF @formulario_id IS NOT NULL
               AND @estado_actual <> 'BORRADOR'
            BEGIN
              THROW 51040,
                'El formulario 018 está cerrado y ya no puede modificarse.',
                1;
            END;

            /*
              Crear un nuevo borrador.
            */
            IF @formulario_id IS NULL
            BEGIN
              INSERT INTO dbo.hc_formularios_datos (
                paciente_id,
                codigo_formulario,
                fecha_procedimiento,
                datos_json,
                estado,
                creado_por_username,
                creado_por_nombre,
                fecha_creacion
              )
              VALUES (
                @paciente_id,
                @codigo_formulario,
                @fecha_procedimiento,
                @datos_json,
                'BORRADOR',
                @usuario_username,
                @usuario_nombre,
                SYSUTCDATETIME()
              );

              SET @formulario_id =
                SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
              /*
                Actualizar solamente si continúa
                en estado BORRADOR.
              */
              UPDATE dbo.hc_formularios_datos
              SET
                datos_json = @datos_json,
                modificado_por_username =
                  @usuario_username,
                modificado_por_nombre =
                  @usuario_nombre,
                fecha_modificacion =
                  SYSUTCDATETIME()
              WHERE id = @formulario_id
                AND estado = 'BORRADOR';

              IF @@ROWCOUNT <> 1
              BEGIN
                THROW 51041,
                  'El formulario 018 ya no se encuentra disponible para edición.',
                  1;
              END;
            END;

            COMMIT TRANSACTION;

            SELECT
              id,
              paciente_id,
              codigo_formulario,
              fecha_procedimiento,
              estado,
              creado_por_username,
              creado_por_nombre,
              fecha_creacion,
              modificado_por_username,
              modificado_por_nombre,
              fecha_modificacion,
              cerrado_por_username,
              cerrado_por_nombre,
              fecha_cierre
            FROM dbo.hc_formularios_datos
            WHERE id = @formulario_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        ok: true,
        mensaje:
          "Borrador del formulario 018 guardado correctamente",
        formulario:
          resultadoGuardado.recordset?.[0] ||
          null
      });

    } catch (error) {
      console.error(
        "ERROR GUARDANDO BORRADOR 018:",
        error
      );

      const mensaje =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      const estadoHTTP =
        mensaje.includes("está cerrado") ||
        mensaje.includes(
          "ya no se encuentra disponible"
        )
          ? 409
          : 500;

      return res.status(estadoHTTP).json({
        error:
          "No se pudo guardar el borrador del formulario 018",
        detalle: mensaje
      });
    }
  }
);


/*consultar borrador del formulario 018 */
app.get("/api/hclinicas/018/borrador",requireAuth,async (req, res) => {
    try {
      const pacienteId = Number(
        req.query.paciente_id
      );

      const fechaProcedimiento = String(
        req.query.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "018"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .query(`
          SELECT TOP 1
            id,
            paciente_id,
            codigo_formulario,
            fecha_procedimiento,
            datos_json,
            estado,
            creado_por_username,
            creado_por_nombre,
            fecha_creacion,
            modificado_por_username,
            modificado_por_nombre,
            fecha_modificacion,
            cerrado_por_username,
            cerrado_por_nombre,
            fecha_cierre
          FROM dbo.hc_formularios_datos
          WHERE paciente_id = @paciente_id
            AND codigo_formulario =
              @codigo_formulario
            AND fecha_procedimiento =
              @fecha_procedimiento
          ORDER BY id DESC;
        `);

      const registro =
        resultado.recordset?.[0];

      if (!registro) {
        return res.json({
          ok: true,
          existe: false,
          formulario: null
        });
      }

      let datosFormulario = {};

      try {
        datosFormulario = JSON.parse(
          registro.datos_json || "{}"
        );
      } catch (errorJSON) {
        console.error(
          "ERROR LEYENDO JSON FORMULARIO 018:",
          errorJSON
        );

        datosFormulario = {};
      }

      return res.json({
        ok: true,
        existe: true,
        formulario: {
          id: registro.id,

          pacienteId:
            registro.paciente_id,

          codigoFormulario:
            registro.codigo_formulario,

          fechaProcedimiento:
            registro.fecha_procedimiento,

          estado:
            registro.estado,

          datos:
            datosFormulario,

          creadoPorUsername:
            registro.creado_por_username,

          creadoPorNombre:
            registro.creado_por_nombre,

          fechaCreacion:
            registro.fecha_creacion,

          modificadoPorUsername:
            registro.modificado_por_username,

          modificadoPorNombre:
            registro.modificado_por_nombre,

          fechaModificacion:
            registro.fecha_modificacion,

          cerradoPorUsername:
            registro.cerrado_por_username,

          cerradoPorNombre:
            registro.cerrado_por_nombre,

          fechaCierre:
            registro.fecha_cierre
        }
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO BORRADOR 018:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo consultar el formulario 018",
        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

app.post("/api/hclinicas/018/generar-pdf",requireAuth,async (req, res) => {
    let rutaCompletaCreada = "";

    try {
      const datos = req.body || {};

      /* =========================================
         1. VALIDAR USUARIO, PACIENTE Y FECHA
         ========================================= */

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      const fechaProcedimiento = String(
        datos.fecha_procedimiento ||
        datos.fecha_admision_paciente ||
        ""
      ).slice(0, 10);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      /* =========================================
         2. CARGAR PLANTILLA 018
         ========================================= */

      const rutaPlantilla = path.join(
        __dirname,
        "plantillas_hclinicas",
        "018_preanestesico.pdf"
      );

      if (!fs.existsSync(rutaPlantilla)) {
        return res.status(404).json({
          error:
            "No se encontró la plantilla PDF 018_preanestesico.pdf"
        });
      }

      const bytesPlantilla =
        fs.readFileSync(rutaPlantilla);

      const pdfDoc =
        await PDFDocument.load(
          bytesPlantilla
        );

      const formulario =
        pdfDoc.getForm();

      const fuente =
        await pdfDoc.embedFont(
          StandardFonts.Helvetica
        );

      pdfDoc.setTitle(
        "Formulario 018 - Preanestésico"
      );

      pdfDoc.setSubject(
        "Formulario 018 - Evaluación Preanestésica"
      );

      pdfDoc.setAuthor(
        "CENT Instituto Especializado en Hemodinamia del Ecuador"
      );

      pdfDoc.setCreator(
        "Sistema CENT"
      );

      pdfDoc.setProducer(
        "Sistema CENT"
      );

      /* =========================================
         3. CAMPOS DE TEXTO
         ========================================= */

      const camposTexto = [
        "paciente_h_clinica",
        "narchivo_paciente",
        "primer_apellido_paciente",
        "segundo_apellido_paciente",
        "primer_nombre_paciente",
        "segundo_nombre_paciente",
        "sexo_paciente",
        "edad_paciente",

        "008_diagnostico_presuntivo1",
        "008_diagnostico_presuntivo2",
        "008_cie_presuntivo1",
        "008_cie_presuntivo2",

        "018_procedimiento_propuesto",

        "018_anamnesis_diag1",
        "018_anamnesis_diag2",
        "018_anamnesis_diag3",
        "018_anamnesis_diag4",
        "018_anamnesis_diag5",
        "018_anamnesis_diag6",
        "018_anamnesis_diag7",
        "018_anamnesis_diag8",
        "018_anamnesis_diag9",
        "018_anamnesis_diag10",

        "018_anamnesis_tiempo1",
        "018_anamnesis_tiempo2",
        "018_anamnesis_tiempo3",
        "018_anamnesis_tiempo4",
        "018_anamnesis_tiempo5",
        "018_anamnesis_tiempo6",
        "018_anamnesis_tiempo7",
        "018_anamnesis_tiempo8",
        "018_anamnesis_tiempo9",
        "018_anamnesis_tiempo10",

        "018_anamnesis_tratamiento1",
        "018_anamnesis_tratamiento2",
        "018_anamnesis_tratamiento3",
        "018_anamnesis_tratamiento4",
        "018_anamnesis_tratamiento5",
        "018_anamnesis_tratamiento6",
        "018_anamnesis_tratamiento7",
        "018_anamnesis_tratamiento8",
        "018_anamnesis_tratamiento9",
        "018_anamnesis_tratamiento10",

        "018_anamnesis_anestesico1",
        "018_anamnesis_anestesico2",
        "018_anamnesis_anestesico3",

        "018_anamnesis_quirurgico1",
        "018_anamnesis_quirurgico2",
        "018_anamnesis_quirurgico3",

        "018_anamnesis_alergico1",
        "018_anamnesis_alergico2",
        "018_anamnesis_alergico3",

        "018_anamnesis_transfusiones1",
        "018_anamnesis_transfusiones2",
        "018_anamnesis_transfusiones3",

        "018_anamnesis_habitos1",
        "018_anamnesis_habitos2",
        "018_anamnesis_habitos3",

        "018_anamnesis_antecedentes_familiares1",
        "018_anamnesis_antecedentes_familiares2",
        "018_anamnesis_antecedentes_familiares3",

        "008_presion_arterial",
        "008_pulso",
        "008_frecuencia_respiratoria",

        "018_d_temperatura",
        "018_d_saturacion",
        "018_d_glasgow",

        "008_peso_kg",
        "008_talla",
        "018_d_imc",

        "018_d_aerea_otros",

        "018_d_torax",
        "018_d_corazon",
        "018_d_pulmones",
        "018_d_abdomen",
        "018_d_extremidades",
        "018_d_sistema_nervioso",
        "018_d_mets",

        "008_fecha_termino_emergencia",

        "018_e_hcto",
        "018_e_hb",
        "018_e_plaquetas",
        "018_e_tp",
        "018_e_ttp",
        "018_e_inr",
        "018_e_leucocitos",
        "018_e_glucosa",
        "018_e_urea",
        "018_e_creatinina",
        "018_e_otros",
        "018_e_na",
        "018_e_k",
        "018_e_cl",
        "018_e_ca",
        "018_e_mg",

        "018_j_hora_termino",
        "018_j_nombres_anestesiologo",
        "018_j_primer_apellido_anestesiologo",
        "018_j_segundo_apellido_anestesiologo",
        "018_j_cedula_anestesiologo"
      ];

      /* =========================================
         4. LLENAR CAMPOS DE TEXTO
         ========================================= */

      for (
        const nombreCampo
        of camposTexto
      ) {
        try {
          let valor =
            datos[nombreCampo] ?? "";

          /*
            Campo de fecha del PDF 018.
          */
          if (
            nombreCampo ===
            "008_fecha_termino_emergencia"
          ) {
            valor =
              formatearFechaPDF(
                valor
              );
          }

          const campoPDF =
            formulario.getTextField(
              nombreCampo
            );

          campoPDF.setText(
            String(valor)
          );

        } catch (errorCampo) {
          console.warn(
            `El campo de texto PDF "${nombreCampo}" no pudo llenarse:`,
            errorCampo.message
          );
        }
      }

      /* =========================================
         5. CASILLAS DE VÍA AÉREA
         ========================================= */

      const camposCasillas = [
        "018_d_casilla_apertura_bucal1",
        "018_d_casilla_apertura_bucal2",
        "018_d_casilla_apertura_bucal3",
        "018_d_casilla_apertura_bucal4",

        "018_d_casilla_tiromentoneana1",
        "018_d_casilla_tiromentoneana2",
        "018_d_casilla_tiromentoneana3",

        "018_d_casilla_mallampati1",
        "018_d_casilla_mallampati2",
        "018_d_casilla_mallampati3",
        "018_d_casilla_mallampati4",

        "018_d_casilla_protrusion1",
        "018_d_casilla_protrusion2",
        "018_d_casilla_protrusion3",

        "018_d_casilla_perimetro_cervical1",
        "018_d_casilla_perimetro_cervical2",

        "018_d_casilla_movilidad_cervical1",
        "018_d_casilla_movilidad_cervical2",

        "018_d_casilla_historia_intubacion1",
        "018_d_casilla_historia_intubacion2",

        "018_d_casilla_patologia_intubacion1",
        "018_d_casilla_patologia_intubacion2"
      ];

      for (
        const nombreCampo
        of camposCasillas
      ) {
        try {
          const casilla =
            formulario.getCheckBox(
              nombreCampo
            );

          const valor =
            datos[nombreCampo];

          const marcado =
            valor === true ||
            valor === 1 ||
            valor === "1" ||
            valor === "X" ||
            String(valor)
              .toLowerCase() ===
              "true";

          if (marcado) {
            casilla.check();
          } else {
            casilla.uncheck();
          }

        } catch (errorCasilla) {
          console.warn(
            `La casilla PDF "${nombreCampo}" no pudo procesarse:`,
            errorCasilla.message
          );
        }
      }

      /* =========================================
         6. CONSULTAR ANESTESIÓLOGO
         ========================================= */

      const profesionalAnestesiologoId =
        Number(
          datos[
            "018_profesional_anestesiologo_id"
          ] || 0
        );

      let profesionalAnestesiologo =
        null;

      const pool =
        await getPool();

      if (
        profesionalAnestesiologoId > 0
      ) {
        const resultadoProfesional =
          await pool
            .request()
            .input(
              "id",
              profesionalAnestesiologoId
            )
            .query(`
              SELECT
                id,
                firma_ruta,
                sello_ruta,
                estado
              FROM dbo.profesionales_salud
              WHERE id = @id;
            `);

        profesionalAnestesiologo =
          resultadoProfesional
            .recordset?.[0] ||
          null;
      }

      /* =========================================
         7. INSERTAR FIRMA Y SELLO
         ========================================= */

      if (
        profesionalAnestesiologo
          ?.firma_ruta
      ) {
        await insertarImagenEnCampoPDF008({
          pdfDoc,
          formulario,

          nombreCampo:
            "018_j_firma_anestesiologo",

          rutaImagen:
            profesionalAnestesiologo
              .firma_ruta
        });
      }

      if (
        profesionalAnestesiologo
          ?.sello_ruta
      ) {
        await insertarImagenEnCampoPDF008({
          pdfDoc,
          formulario,

          nombreCampo:
            "018_j_sello_anestesiologo",

          rutaImagen:
            profesionalAnestesiologo
              .sello_ruta
        });
      }

      /* =========================================
         8. ACTUALIZAR APARIENCIAS Y BLOQUEAR
         ========================================= */

      formulario.updateFieldAppearances(
        fuente
      );

      formulario
        .getFields()
        .forEach(campo => {
          try {
            campo.enableReadOnly();
          } catch (errorCampo) {
            console.warn(
              `No se pudo bloquear el campo "${
                campo?.getName?.() ||
                "SIN NOMBRE"
              }":`,
              errorCampo.message
            );
          }
        });

      formulario.updateFieldAppearances(
        fuente
      );

      /*
        IMPORTANTE:
        NO utilizar form.flatten().
      */

      /* =========================================
         9. VERIFICAR ESTADO DEL FORMULARIO
         ========================================= */

      const verificacionEstado =
        await pool
          .request()
          .input(
            "paciente_id",
            pacienteId
          )
          .input(
            "codigo_formulario",
            "018"
          )
          .input(
            "fecha_procedimiento",
            fechaProcedimiento
          )
          .query(`
            SELECT TOP 1
              estado
            FROM dbo.hc_formularios_datos
            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
            ORDER BY id DESC;
          `);

      const estadoFormulario =
        String(
          verificacionEstado
            .recordset?.[0]
            ?.estado || ""
        ).toUpperCase();

      if (
        estadoFormulario &&
        estadoFormulario !==
          "BORRADOR"
      ) {
        return res.status(409).json({
          error:
            "No se puede generar otro PDF",

          detalle:
            "El formulario 018 está cerrado y ya no admite nuevas versiones."
        });
      }

      /*
        El PDF solamente puede generarse
        después de existir un borrador.
      */
      if (!estadoFormulario) {
        return res.status(409).json({
          error:
            "Debe guardar primero el borrador del Formulario 018"
        });
      }

      /* =========================================
         10. CALCULAR SIGUIENTE VERSIÓN
         ========================================= */

      const resultadoVersion =
        await pool
          .request()
          .input(
            "paciente_id",
            pacienteId
          )
          .input(
            "codigo_formulario",
            "018"
          )
          .input(
            "fecha_procedimiento",
            fechaProcedimiento
          )
          .query(`
            SELECT
              ISNULL(MAX(version), 0) + 1
                AS siguiente_version
            FROM dbo.hc_documentos
            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;
          `);

      const version =
        Number(
          resultadoVersion
            .recordset?.[0]
            ?.siguiente_version || 1
        );

      /* =========================================
         11. CONSTRUIR CARPETA
         ========================================= */

      const [
        anio,
        mes,
        dia
      ] =
        fechaProcedimiento.split("-");

      const numeroArchivoSeguro =
  limpiarNombreArchivoHC(
    datos.narchivo_paciente ||
    "SIN_ARCHIVO"
  );

const cedulaPacienteSegura =
  limpiarNombreArchivoHC(
    datos.cedula_paciente ||
    "SIN_CEDULA"
  );

const nombrePacienteSeguro =
  limpiarNombreArchivoHC(
    [
      datos.primer_apellido_paciente,
      datos.segundo_apellido_paciente,
      datos.primer_nombre_paciente,
      datos.segundo_nombre_paciente
    ]
      .filter(Boolean)
      .join(" ")
  );

const carpetaPaciente = [
  numeroArchivoSeguro,
  cedulaPacienteSegura,
  nombrePacienteSeguro
]
  .filter(Boolean)
  .join("_");

      const carpetaRelativa =
        path.join(
          anio,
          mes,
          dia,
          carpetaPaciente
        );

      const carpetaCompleta =
        path.join(
          __dirname,
          "formularios",
          carpetaRelativa
        );

      fs.mkdirSync(
        carpetaCompleta,
        {
          recursive: true
        }
      );

      /* =========================================
         12. NOMBRE DEL PDF
         ========================================= */

      const nombreBasePDF =
        limpiarNombreArchivoHC(
          [
            "018 PREANESTESICO",

            nombrePacienteSeguro ||
              "SIN NOMBRE",

            numeroArchivoSeguro ||
              "SIN ARCHIVO",

            `V${version}`
          ].join(" ")
        );

      const nombreVisible =
        `${nombreBasePDF}.pdf`;

      const nombreFisico =
        nombreVisible;

      pdfDoc.setTitle(
        nombreVisible
      );

      pdfDoc.setSubject(
        "Formulario 018 - Evaluación Preanestésica"
      );

      /*
        Guardar únicamente después de:
        - llenar textos
        - marcar casillas
        - insertar firma
        - insertar sello
        - bloquear campos
      */
      const pdfFinal =
        await pdfDoc.save();

      const rutaCompleta =
        path.join(
          carpetaCompleta,
          nombreFisico
        );

      rutaCompletaCreada =
        rutaCompleta;

      fs.writeFileSync(
        rutaCompleta,
        Buffer.from(pdfFinal)
      );

      const rutaRelativa =
        path.join(
          carpetaRelativa,
          nombreFisico
        );

      /* =========================================
         13. REGISTRAR DOCUMENTO EN SQL
         ========================================= */

      const resultadoDocumento =
        await pool
          .request()
          .input(
            "paciente_id",
            pacienteId
          )
          .input(
            "codigo_formulario",
            "018"
          )
          .input(
            "nombre_formulario",
            "018 Preanestésico"
          )
          .input(
            "fecha_procedimiento",
            fechaProcedimiento
          )
          .input(
            "version",
            version
          )
          .input(
            "estado",
            "BORRADOR"
          )
          .input(
            "nombre_archivo",
            nombreVisible
          )
          .input(
            "ruta_relativa",
            rutaRelativa
          )
          .input(
            "creado_por_username",
            usuarioSesion.username
          )
          .input(
            "creado_por_nombre",
            usuarioSesion.nombreCompleto
          )
          .query(`
            INSERT INTO dbo.hc_documentos (
              paciente_id,
              codigo_formulario,
              nombre_formulario,
              fecha_procedimiento,
              version,
              estado,
              nombre_archivo,
              ruta_relativa,
              creado_por_username,
              creado_por_nombre
            )
            OUTPUT INSERTED.id
            VALUES (
              @paciente_id,
              @codigo_formulario,
              @nombre_formulario,
              @fecha_procedimiento,
              @version,
              @estado,
              @nombre_archivo,
              @ruta_relativa,
              @creado_por_username,
              @creado_por_nombre
            );
          `);

      const documentoId =
        resultadoDocumento
          .recordset?.[0]?.id;

      return res.status(201).json({
        ok: true,

        mensaje:
          "PDF 018 generado y almacenado correctamente",

        documento: {
          id: documentoId,

          nombreArchivo:
            nombreVisible,

          version,

          estado:
            "BORRADOR"
        }
      });

    } catch (error) {
      console.error(
        "ERROR GENERANDO PDF 018:",
        error
      );

      /*
        Si se creó el archivo físico
        pero ocurrió un error antes de
        registrar correctamente el documento,
        se elimina.
      */
      if (
        rutaCompletaCreada &&
        fs.existsSync(
          rutaCompletaCreada
        )
      ) {
        try {
          fs.unlinkSync(
            rutaCompletaCreada
          );

        } catch (errorEliminar) {
          console.error(
            "No se pudo eliminar el PDF 018 incompleto:",
            errorEliminar
          );
        }
      }

      return res.status(500).json({
        error:
          "No se pudo generar el PDF del formulario 018",

        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

app.post("/api/hclinicas/018/cerrar",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      const documentoId = Number(
        datos.documento_id
      );

      const fechaProcedimiento = String(
        datos.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !Number.isInteger(documentoId) ||
        documentoId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un documento PDF válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "documento_id",
          documentoId
        )
        .input(
          "codigo_formulario",
          "018"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "cerrado_por_username",
          usuarioSesion.username
        )
        .input(
          "cerrado_por_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            /* =====================================
               1. COMPROBAR BORRADOR DEL 018
               ===================================== */

            IF NOT EXISTS (
              SELECT 1
              FROM dbo.hc_formularios_datos
              WHERE paciente_id =
                  @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
            )
            BEGIN
              THROW 51141,
                'No existe un borrador del formulario 018 para cerrar.',
                1;
            END;

            IF EXISTS (
              SELECT 1
              FROM dbo.hc_formularios_datos
              WHERE paciente_id =
                  @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
                AND estado <> 'BORRADOR'
            )
            BEGIN
              THROW 51142,
                'El formulario 018 ya no se encuentra en estado BORRADOR.',
                1;
            END;

            /* =====================================
               2. COMPROBAR EL PDF SELECCIONADO
               ===================================== */

            IF NOT EXISTS (
              SELECT 1
              FROM dbo.hc_documentos
              WHERE id = @documento_id
                AND paciente_id =
                  @paciente_id
                AND codigo_formulario =
                  @codigo_formulario
                AND fecha_procedimiento =
                  @fecha_procedimiento
                AND estado = 'BORRADOR'
            )
            BEGIN
              THROW 51143,
                'El PDF seleccionado no corresponde al formulario 018 o ya fue cerrado.',
                1;
            END;

            /* =====================================
               3. CERRAR DATOS EDITABLES
               ===================================== */

            UPDATE dbo.hc_formularios_datos
            SET
              estado = 'CERRADO',

              cerrado_por_username =
                @cerrado_por_username,

              cerrado_por_nombre =
                @cerrado_por_nombre,

              fecha_cierre =
                SYSUTCDATETIME(),

              modificado_por_username =
                @cerrado_por_username,

              modificado_por_nombre =
                @cerrado_por_nombre,

              fecha_modificacion =
                SYSUTCDATETIME()

            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
              AND estado = 'BORRADOR';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51144,
                'No se pudo cerrar el formulario editable 018.',
                1;
            END;

            /* =====================================
               4. CERRAR EL PDF DEFINITIVO
               ===================================== */

            UPDATE dbo.hc_documentos
            SET
              estado = 'CERRADO',

              cerrado_por_username =
                @cerrado_por_username,

              cerrado_por_nombre =
                @cerrado_por_nombre,

              fecha_cierre =
                SYSUTCDATETIME()

            WHERE id = @documento_id
              AND paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento
              AND estado = 'BORRADOR';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51145,
                'No se pudo cerrar el documento PDF 018.',
                1;
            END;

            COMMIT TRANSACTION;

            SELECT
              d.id,
              d.nombre_archivo,
              d.version,
              d.estado,
              d.cerrado_por_username,
              d.cerrado_por_nombre,
              d.fecha_cierre
            FROM dbo.hc_documentos d
            WHERE d.id = @documento_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      const documento =
        resultado.recordset?.[0] || null;

      return res.status(200).json({
        ok: true,

        mensaje:
          "Formulario 018 cerrado correctamente",

        formulario: {
          pacienteId,
          codigoFormulario: "018",
          fechaProcedimiento,
          estado: "CERRADO"
        },

        documento
      });

    } catch (error) {
      console.error(
        "ERROR CERRANDO FORMULARIO 018:",
        error
      );

      const mensajeSQL =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      let estadoHTTP = 500;

      if (
        mensajeSQL.includes(
          "No existe un borrador"
        ) ||
        mensajeSQL.includes(
          "ya no se encuentra en estado BORRADOR"
        ) ||
        mensajeSQL.includes(
          "no corresponde al formulario 018"
        ) ||
        mensajeSQL.includes(
          "ya fue cerrado"
        )
      ) {
        estadoHTTP = 409;
      }

      return res.status(estadoHTTP).json({
        error:
          "No se pudo cerrar el formulario 018",

        detalle:
          mensajeSQL
      });
    }
  }
);

app.post("/api/hclinicas/018/reabrir",requireAuth,async (req, res) => {
    try {
      const datos = req.body || {};

      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (!usuarioSesion.username) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      if (usuarioSesion.rol !== "ADMIN") {
        return res.status(403).json({
          error:
            "Acceso denegado",

          detalle:
            "Solo un usuario ADMIN puede reabrir formularios cerrados."
        });
      }

      const pacienteId = Number(
        datos.paciente_id
      );

      const fechaProcedimiento = String(
        datos.fecha_procedimiento || ""
      ).slice(0, 10);

      const motivoReapertura = String(
        datos.motivo_reapertura || ""
      ).trim();

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      if (motivoReapertura.length < 5) {
        return res.status(400).json({
          error:
            "Debe registrar el motivo de la reapertura"
        });
      }

      if (motivoReapertura.length > 500) {
        return res.status(400).json({
          error:
            "El motivo de reapertura no puede superar los 500 caracteres"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "018"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .input(
          "reabierto_por_username",
          usuarioSesion.username
        )
        .input(
          "reabierto_por_nombre",
          usuarioSesion.nombreCompleto || ""
        )
        .input(
          "motivo_reapertura",
          motivoReapertura
        )
        .query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DECLARE @formulario_id INT;
            DECLARE @estado_actual NVARCHAR(20);

            SELECT
              @formulario_id = id,
              @estado_actual = estado

            FROM dbo.hc_formularios_datos
              WITH (UPDLOCK, HOLDLOCK)

            WHERE paciente_id =
                @paciente_id
              AND codigo_formulario =
                @codigo_formulario
              AND fecha_procedimiento =
                @fecha_procedimiento;

            IF @formulario_id IS NULL
            BEGIN
              THROW 51150,
                'No existe el formulario 018 solicitado.',
                1;
            END;

            IF @estado_actual <> 'CERRADO'
            BEGIN
              THROW 51151,
                'El formulario 018 no se encuentra en estado CERRADO.',
                1;
            END;

            UPDATE dbo.hc_formularios_datos
            SET
              estado = 'BORRADOR',

              reabierto_por_username =
                @reabierto_por_username,

              reabierto_por_nombre =
                @reabierto_por_nombre,

              fecha_reapertura =
                SYSUTCDATETIME(),

              motivo_reapertura =
                @motivo_reapertura,

              modificado_por_username =
                @reabierto_por_username,

              modificado_por_nombre =
                @reabierto_por_nombre,

              fecha_modificacion =
                SYSUTCDATETIME()

            WHERE id = @formulario_id
              AND estado = 'CERRADO';

            IF @@ROWCOUNT <> 1
            BEGIN
              THROW 51152,
                'No se pudo reabrir el formulario 018.',
                1;
            END;

            /*
              Los PDF anteriormente cerrados
              permanecen como evidencia histórica.

              Para cerrar nuevamente el formulario,
              se deberá generar un PDF nuevo.
            */

            COMMIT TRANSACTION;

            SELECT
              id,
              paciente_id,
              codigo_formulario,
              fecha_procedimiento,
              estado,
              reabierto_por_username,
              reabierto_por_nombre,
              fecha_reapertura,
              motivo_reapertura

            FROM dbo.hc_formularios_datos
            WHERE id = @formulario_id;

          END TRY

          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        ok: true,

        mensaje:
          "Formulario 018 reabierto correctamente",

        formulario:
          resultado.recordset?.[0] || null
      });

    } catch (error) {
      console.error(
        "ERROR REABRIENDO FORMULARIO 018:",
        error
      );

      const mensaje =
        error?.originalError?.info?.message ||
        error?.precedingErrors?.[0]?.message ||
        error?.message ||
        String(error);

      let estadoHTTP = 500;

      if (
        mensaje.includes(
          "No existe el formulario"
        )
      ) {
        estadoHTTP = 404;
      }

      if (
        mensaje.includes(
          "no se encuentra en estado CERRADO"
        )
      ) {
        estadoHTTP = 409;
      }

      return res.status(estadoHTTP).json({
        error:
          "No se pudo reabrir el formulario 018",

        detalle:
          mensaje
      });
    }
  }
);

app.get("/api/hclinicas/018/ultimo-pdf-borrador",requireAuth,async (req, res) => {
    try {
      const pacienteId = Number(
        req.query.paciente_id
      );

      const fechaProcedimiento = String(
        req.query.fecha_procedimiento || ""
      ).slice(0, 10);

      if (
        !Number.isInteger(pacienteId) ||
        pacienteId <= 0
      ) {
        return res.status(400).json({
          error:
            "No se recibió un paciente válido"
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaProcedimiento
        )
      ) {
        return res.status(400).json({
          error:
            "La fecha del procedimiento no es válida"
        });
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input(
          "paciente_id",
          pacienteId
        )
        .input(
          "codigo_formulario",
          "018"
        )
        .input(
          "fecha_procedimiento",
          fechaProcedimiento
        )
        .query(`
          SELECT TOP 1
            id,
            paciente_id,
            codigo_formulario,
            nombre_formulario,
            fecha_procedimiento,
            version,
            estado,
            nombre_archivo,
            ruta_relativa,
            creado_por_username,
            creado_por_nombre
          FROM dbo.hc_documentos
          WHERE paciente_id =
              @paciente_id
            AND codigo_formulario =
              @codigo_formulario
            AND fecha_procedimiento =
              @fecha_procedimiento
            AND estado = 'BORRADOR'
          ORDER BY
            version DESC,
            id DESC;
        `);

      const documento =
        resultado.recordset?.[0] || null;

      if (!documento) {
        return res.json({
          ok: true,
          existe: false,
          documento: null
        });
      }

      return res.json({
        ok: true,
        existe: true,

        documento: {
          id:
            documento.id,

          pacienteId:
            documento.paciente_id,

          codigoFormulario:
            documento.codigo_formulario,

          nombreFormulario:
            documento.nombre_formulario,

          fechaProcedimiento:
            documento.fecha_procedimiento,

          version:
            documento.version,

          estado:
            documento.estado,

          nombreArchivo:
            documento.nombre_archivo,

          rutaRelativa:
            documento.ruta_relativa,

          creadoPorUsername:
            documento.creado_por_username,

          creadoPorNombre:
            documento.creado_por_nombre
        }
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO ÚLTIMO PDF BORRADOR 018:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo consultar el último PDF del formulario 018",

        detalle:
          error.message ||
          String(error)
      });
    }
  }
);

/*PERMISIOS ROL ROLES */
/* =========================================================
   CATÁLOGO GENERAL DE PERMISOS
   ========================================================= */

app.get(
  "/api/permisos/catalogo",
  requireAuth,
  async (req, res) => {
    try {
      const pool = await getPool();

      const result = await pool.request().query(`
        SELECT
          id,
          codigo,
          nombre,
          modulo,
          permiso_padre,
          orden,
          activo
        FROM dbo.permisos_sistema
        WHERE activo = 1
        ORDER BY orden, id;
      `);

      res.json(result.recordset);

    } catch (error) {
      console.error(
        "ERROR CATÁLOGO PERMISOS:",
        error
      );

      res.status(500).json({
        error:
          "No se pudo obtener el catálogo de permisos"
      });
    }
  }
);

/* =========================================================
   ROLES EXISTENTES
   ========================================================= */

app.get(
  "/api/permisos/roles",
  requireAuth,
  async (req, res) => {
    try {
      const pool =
        await getPool();

      /*
        Tomamos roles desde:
        1. roles que ya tengan permisos configurados
        2. roles existentes en usuarios

        Y además incluimos los roles base
        actuales del sistema.
      */
      const result =
        await pool.request().query(`
          SELECT DISTINCT rol
          FROM (
            SELECT
              UPPER(
                LTRIM(
                  RTRIM(rol)
                )
              ) AS rol
            FROM dbo.usuarios
            WHERE
              rol IS NOT NULL
              AND LTRIM(
                RTRIM(rol)
              ) <> ''

            UNION

            SELECT
              UPPER(
                LTRIM(
                  RTRIM(rol)
                )
              ) AS rol
            FROM dbo.roles_permisos
            WHERE
              rol IS NOT NULL
              AND LTRIM(
                RTRIM(rol)
              ) <> ''

            UNION

            SELECT 'ADMIN'
            UNION
            SELECT 'INVENTARIO'
            UNION
            SELECT 'DESCARGOS'
            UNION
            SELECT 'AUDITORIA'
          ) roles
          WHERE rol IS NOT NULL
          ORDER BY rol;
        `);

      res.json(
        result.recordset.map(
          x => x.rol
        )
      );

    } catch (error) {
      console.error(
        "ERROR LISTANDO ROLES:",
        error
      );

      res.status(500).json({
        error:
          "No se pudieron obtener los roles"
      });
    }
  }
);

/* =========================================================
   CONSULTAR PERMISOS DE UN ROL
   ========================================================= */

app.get(
  "/api/permisos/rol/:rol",
  requireAuth,
  async (req, res) => {
    try {
      const rol = String(
        req.params.rol || ""
      )
        .trim()
        .toUpperCase();

      if (!rol) {
        return res.status(400).json({
          error:
            "Rol no válido"
        });
      }

      const pool = await getPool();

      const result = await pool
        .request()
        .input(
          "rol",
          sql.VarChar,
          rol
        )
        .query(`
          SELECT
            p.codigo,
            p.nombre,
            p.modulo,
            p.permiso_padre,
            p.orden,
            ISNULL(rp.permitido, 0)
              AS permitido
          FROM dbo.permisos_sistema p
          LEFT JOIN dbo.roles_permisos rp
            ON rp.permiso_codigo = p.codigo
            AND rp.rol = @rol
          WHERE p.activo = 1
          ORDER BY p.orden, p.id;
        `);

      res.json({
        rol,
        permisos:
          result.recordset
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO PERMISOS DE ROL:",
        error
      );

      res.status(500).json({
        error:
          "No se pudieron obtener los permisos del rol"
      });
    }
  }
);

/* =========================================================
   GUARDAR PERMISOS DE UN ROL
   ========================================================= */

app.put(
  "/api/permisos/rol/:rol",
  requireAuth,
  async (req, res) => {
    const pool = await getPool();
    const transaction =
      new sql.Transaction(pool);

    try {
      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (
        String(
          usuarioSesion.rol || ""
        ).toUpperCase() !== "ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Solo ADMIN puede modificar permisos"
        });
      }

      const rol = String(
        req.params.rol || ""
      )
        .trim()
        .toUpperCase();

      const permisos =
        Array.isArray(req.body?.permisos)
          ? req.body.permisos
          : [];

      if (!rol) {
        return res.status(400).json({
          error:
            "Rol no válido"
        });
      }

      /*
        ADMIN no se modifica desde aquí.
        Lo dejamos siempre con acceso total.
      */
      if (rol === "ADMIN") {
        return res.status(400).json({
          error:
            "Los permisos del rol ADMIN son permanentes"
        });
      }

      await transaction.begin();

      /*
        Eliminamos configuración anterior.
      */
      await new sql.Request(transaction)
        .input(
          "rol",
          sql.VarChar,
          rol
        )
        .query(`
          DELETE FROM dbo.roles_permisos
          WHERE rol = @rol;
        `);

      /*
        Insertamos solamente los permisos
        seleccionados.
      */
      for (const codigo of permisos) {
        const codigoLimpio =
          String(codigo || "").trim();

        if (!codigoLimpio) {
          continue;
        }

        await new sql.Request(transaction)
          .input(
            "rol",
            sql.VarChar,
            rol
          )
          .input(
            "permiso_codigo",
            sql.VarChar,
            codigoLimpio
          )
          .input(
            "actualizado_por",
            sql.VarChar,
            usuarioSesion.username
          )
          .query(`
            IF EXISTS (
              SELECT 1
              FROM dbo.permisos_sistema
              WHERE codigo =
                @permiso_codigo
                AND activo = 1
            )
            BEGIN
              INSERT INTO dbo.roles_permisos (
                rol,
                permiso_codigo,
                permitido,
                actualizado_por,
                fecha_actualizacion
              )
              VALUES (
                @rol,
                @permiso_codigo,
                1,
                @actualizado_por,
                SYSDATETIME()
              );
            END;
          `);
      }

      await transaction.commit();

      res.json({
        ok: true,
        mensaje:
          `Permisos del rol ${rol} guardados correctamente`
      });

    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {}

      console.error(
        "ERROR GUARDANDO PERMISOS DE ROL:",
        error
      );

      res.status(500).json({
        error:
          "No se pudieron guardar los permisos del rol"
      });
    }
  }
);

/* =========================================================
   CONSULTAR PERMISOS DE UN USUARIO
   ========================================================= */

app.get(
  "/api/permisos/usuario/:id",
  requireAuth,
  async (req, res) => {
    try {
      const usuarioId = Number(
        req.params.id
      );

      if (
        !Number.isInteger(usuarioId) ||
        usuarioId <= 0
      ) {
        return res.status(400).json({
          error:
            "Usuario no válido"
        });
      }

      const pool = await getPool();

      const usuarioResult =
        await pool
          .request()
          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )
          .query(`
            SELECT TOP 1
              id,
              username,
              rol,
              estado
            FROM dbo.usuarios
            WHERE id = @usuario_id;
          `);

      if (
        !usuarioResult.recordset.length
      ) {
        return res.status(404).json({
          error:
            "Usuario no encontrado"
        });
      }

      const usuario =
        usuarioResult.recordset[0];

      const permisosResult =
        await pool
          .request()
          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )
          .input(
            "rol",
            sql.VarChar,
            String(
              usuario.rol || ""
            ).toUpperCase()
          )
          .query(`
            SELECT
              p.codigo,
              p.nombre,
              p.modulo,
              p.permiso_padre,
              p.orden,

              CASE
                WHEN up.id IS NOT NULL
                  THEN up.permitido
                WHEN rp.id IS NOT NULL
                  THEN rp.permitido
                ELSE 0
              END AS permitido_efectivo,

              CASE
                WHEN up.id IS NULL
                  THEN NULL
                ELSE up.permitido
              END AS permiso_usuario,

              ISNULL(
                rp.permitido,
                0
              ) AS permiso_rol

            FROM dbo.permisos_sistema p

            LEFT JOIN dbo.roles_permisos rp
              ON rp.permiso_codigo =
                p.codigo
              AND rp.rol = @rol

            LEFT JOIN dbo.usuarios_permisos up
              ON up.permiso_codigo =
                p.codigo
              AND up.usuario_id =
                @usuario_id

            WHERE p.activo = 1

            ORDER BY
              p.orden,
              p.id;
          `);

      res.json({
        usuario: {
          id:
            usuario.id,

          username:
            usuario.username,

          rol:
            usuario.rol,

          estado:
            usuario.estado
        },

        permisos:
          permisosResult.recordset
      });

    } catch (error) {
      console.error(
        "ERROR CONSULTANDO PERMISOS DE USUARIO:",
        error
      );

      res.status(500).json({
        error:
          "No se pudieron consultar los permisos del usuario"
      });
    }
  }
);

/* =========================================================
   GUARDAR EXCEPCIONES DE UN USUARIO
   ========================================================= */

app.put(
  "/api/permisos/usuario/:id",
  requireAuth,
  async (req, res) => {
    const pool = await getPool();
    const transaction =
      new sql.Transaction(pool);

    try {
      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      if (
        String(
          usuarioSesion.rol || ""
        ).toUpperCase() !== "ADMIN"
      ) {
        return res.status(403).json({
          error:
            "Solo ADMIN puede modificar permisos individuales"
        });
      }

      const usuarioId = Number(
        req.params.id
      );

      if (
        !Number.isInteger(usuarioId) ||
        usuarioId <= 0
      ) {
        return res.status(400).json({
          error:
            "Usuario no válido"
        });
      }

      /*
        Esperaremos:
        {
          permisos: [
            {
              codigo: "inventario.kardex",
              valor: 1
            },
            {
              codigo: "inventario.salida",
              valor: 0
            }
          ]
        }

        Si un permiso no viene en la lista,
        significa HEREDAR.
      */
      const permisos =
        Array.isArray(req.body?.permisos)
          ? req.body.permisos
          : [];

      await transaction.begin();

      /*
        Primero borramos todas las excepciones
        previas del usuario.
      */
      await new sql.Request(transaction)
        .input(
          "usuario_id",
          sql.Int,
          usuarioId
        )
        .query(`
          DELETE FROM dbo.usuarios_permisos
          WHERE usuario_id =
            @usuario_id;
        `);

      for (const item of permisos) {
        const codigo =
          String(
            item?.codigo || ""
          ).trim();

        if (!codigo) {
          continue;
        }

        const permitido =
          item?.valor === true ||
          item?.valor === 1 ||
          item?.valor === "1";

        await new sql.Request(transaction)
          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )
          .input(
            "permiso_codigo",
            sql.VarChar,
            codigo
          )
          .input(
            "permitido",
            sql.Bit,
            permitido ? 1 : 0
          )
          .input(
            "actualizado_por",
            sql.VarChar,
            usuarioSesion.username
          )
          .query(`
            IF EXISTS (
              SELECT 1
              FROM dbo.permisos_sistema
              WHERE codigo =
                @permiso_codigo
                AND activo = 1
            )
            BEGIN
              INSERT INTO dbo.usuarios_permisos (
                usuario_id,
                permiso_codigo,
                permitido,
                actualizado_por,
                fecha_actualizacion
              )
              VALUES (
                @usuario_id,
                @permiso_codigo,
                @permitido,
                @actualizado_por,
                SYSDATETIME()
              );
            END;
          `);
      }

      await transaction.commit();

      res.json({
        ok: true,
        mensaje:
          "Permisos individuales guardados correctamente"
      });

    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {}

      console.error(
        "ERROR GUARDANDO PERMISOS DE USUARIO:",
        error
      );

      res.status(500).json({
        error:
          "No se pudieron guardar los permisos individuales"
      });
    }
  }
);

/* =========================================================
   PERMISOS EFECTIVOS DEL USUARIO ACTIVO
   ========================================================= */

app.get(
  "/api/permisos/mis-permisos",
  requireAuth,
  async (req, res) => {
    try {
      const usuarioSesion =
        obtenerUsuarioSesionHC(req);

      const usuarioId = Number(
        usuarioSesion.id ||
        req.session.usuario?.id ||
        0
      );

      const rol =
        String(
          usuarioSesion.rol ||
          req.session.usuario?.rol ||
          ""
        )
          .trim()
          .toUpperCase();

      /*
        ADMIN siempre tiene acceso total.
      */
      if (rol === "ADMIN") {
        const pool =
          await getPool();

        const result =
          await pool.request().query(`
            SELECT codigo
            FROM dbo.permisos_sistema
            WHERE activo = 1
            ORDER BY orden;
          `);

        return res.json({
          usuarioId,
          rol,
          permisos:
            result.recordset.map(
              x => x.codigo
            )
        });
      }

      if (!usuarioId || !rol) {
        return res.status(401).json({
          error:
            "No se pudo identificar al usuario activo"
        });
      }

      const pool =
        await getPool();

      const result =
        await pool
          .request()
          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )
          .input(
            "rol",
            sql.VarChar,
            rol
          )
          .query(`
            SELECT
              p.codigo,

              CASE
                WHEN up.id IS NOT NULL
                  THEN up.permitido

                WHEN rp.id IS NOT NULL
                  THEN rp.permitido

                ELSE 0
              END AS permitido

            FROM dbo.permisos_sistema p

            LEFT JOIN dbo.roles_permisos rp
              ON rp.permiso_codigo =
                p.codigo
              AND rp.rol =
                @rol

            LEFT JOIN dbo.usuarios_permisos up
              ON up.permiso_codigo =
                p.codigo
              AND up.usuario_id =
                @usuario_id

            WHERE p.activo = 1;
          `);

      const permisos =
        result.recordset
          .filter(
            x =>
              Number(x.permitido) === 1
          )
          .map(
            x => x.codigo
          );

      res.json({
        usuarioId,
        rol,
        permisos
      });

    } catch (error) {
      console.error(
        "ERROR OBTENIENDO MIS PERMISOS:",
        error
      );

      res.status(500).json({
        error:
          "No se pudieron obtener los permisos del usuario activo"
      });
    }
  }
);

function requirePermission(codigoPermiso) {
  return async function (
    req,
    res,
    next
  ) {
    try {
      /*
        Obtenemos el usuario actual
        desde la sesión.
      */
      const usuarioSesion =
        typeof obtenerUsuarioSesionHC === "function"
          ? obtenerUsuarioSesionHC(req)
          : null;

      const usuarioId =
        Number(
          usuarioSesion?.id ||
          req.session?.usuario?.id ||
          req.session?.user?.id ||
          0
        );

      const rol =
        String(
          usuarioSesion?.rol ||
          req.session?.usuario?.rol ||
          req.session?.user?.rol ||
          ""
        )
          .trim()
          .toUpperCase();

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            error:
              "Sesión no válida."
          });
      }

      /*
        ADMIN siempre conserva
        acceso total.
      */
      if (rol === "ADMIN") {
        return next();
      }

      const pool =
        await getPool();

      /*
        Primero buscamos si existe
        una excepción individual.

        Si existe:
          1 = permitir
          0 = denegar

        Si no existe:
          heredamos del rol.
      */
      const resultado =
        await pool
          .request()
          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )
          .input(
            "rol",
            sql.VarChar(50),
            rol
          )
          .input(
            "permiso_codigo",
            sql.VarChar(120),
            codigoPermiso
          )
          .query(`
            SELECT
              CASE
                WHEN up.permitido IS NOT NULL
                  THEN up.permitido

                WHEN rp.permitido IS NOT NULL
                  THEN rp.permitido

                ELSE 0
              END AS permitido

            FROM (
              SELECT
                @usuario_id AS usuario_id,
                @rol AS rol,
                @permiso_codigo AS permiso_codigo
            ) base

            LEFT JOIN dbo.usuarios_permisos up
              ON up.usuario_id =
                base.usuario_id
             AND up.permiso_codigo =
                base.permiso_codigo

            LEFT JOIN dbo.roles_permisos rp
              ON UPPER(
                   LTRIM(
                     RTRIM(rp.rol)
                   )
                 ) =
                 UPPER(
                   LTRIM(
                     RTRIM(base.rol)
                   )
                 )
             AND rp.permiso_codigo =
                base.permiso_codigo;
          `);

      const permitido =
        Number(
          resultado.recordset?.[0]
            ?.permitido || 0
        ) === 1;

      if (!permitido) {
        return res
          .status(403)
          .json({
            error:
              "No tiene permiso para realizar esta acción.",
            permiso:
              codigoPermiso
          });
      }

      return next();

    } catch (error) {
      console.error(
        "ERROR VERIFICANDO PERMISO:",
        codigoPermiso,
        error
      );

      return res
        .status(500)
        .json({
          error:
            "No se pudo verificar el permiso del usuario."
        });
    }
  };
}

function requireAnyPermission(codigosPermisos) {
  return async function (req, res, next) {
    try {
      const usuarioSesion =
        typeof obtenerUsuarioSesionHC === "function"
          ? obtenerUsuarioSesionHC(req)
          : null;

      const usuarioId = Number(
        usuarioSesion?.id ||
        req.session?.usuario?.id ||
        req.session?.user?.id ||
        0
      );

      const rol = String(
        usuarioSesion?.rol ||
        req.session?.usuario?.rol ||
        req.session?.user?.rol ||
        ""
      )
        .trim()
        .toUpperCase();

      if (!usuarioId) {
        return res.status(401).json({
          error: "Sesión no válida."
        });
      }

      /*
        ADMIN siempre tiene acceso total.
      */
      if (rol === "ADMIN") {
        return next();
      }

      if (
        !Array.isArray(codigosPermisos) ||
        codigosPermisos.length === 0
      ) {
        return res.status(403).json({
          error: "No tiene permisos configurados para esta acción."
        });
      }

      const pool = await getPool();

      /*
        Creamos parámetros @permiso0,
        @permiso1, etc.
      */
      const request = pool
        .request()
        .input(
          "usuario_id",
          sql.Int,
          usuarioId
        )
        .input(
          "rol",
          sql.VarChar(50),
          rol
        );

      const valores = [];

      codigosPermisos.forEach(
        (codigo, index) => {
          const nombre =
            `permiso${index}`;

          request.input(
            nombre,
            sql.VarChar(120),
            codigo
          );

          valores.push(
            `(@${nombre})`
          );
        }
      );

      const resultado =
        await request.query(`
          SELECT
            base.permiso_codigo,

            CASE
              WHEN up.permitido IS NOT NULL
                THEN up.permitido

              WHEN rp.permitido IS NOT NULL
                THEN rp.permitido

              ELSE 0
            END AS permitido

          FROM (
            VALUES
              ${valores.join(",")}
          ) base(permiso_codigo)

          LEFT JOIN dbo.usuarios_permisos up
            ON up.usuario_id = @usuario_id
           AND up.permiso_codigo =
               base.permiso_codigo

          LEFT JOIN dbo.roles_permisos rp
            ON UPPER(
                 LTRIM(
                   RTRIM(rp.rol)
                 )
               ) = @rol
           AND rp.permiso_codigo =
               base.permiso_codigo;
        `);

      const tienePermiso =
        resultado.recordset.some(
          fila =>
            Number(
              fila.permitido || 0
            ) === 1
        );

      if (!tienePermiso) {
        return res.status(403).json({
          error:
            "No tiene permiso para realizar esta acción.",
          permisos_requeridos:
            codigosPermisos
        });
      }

      return next();

    } catch (error) {
      console.error(
        "ERROR VERIFICANDO PERMISOS:",
        codigosPermisos,
        error
      );

      return res.status(500).json({
        error:
          "No se pudieron verificar los permisos del usuario."
      });
    }
  };
}

/* =========================================================
   MOVER PRODUCTO / LOTE A CUARENTENA
   ========================================================= */

/* =========================================================
   MOVER PRODUCTO A CUARENTENA
   ========================================================= */

/* =========================================================
   MOVER PRODUCTO / LOTE A CUARENTENA
   CON TRASLADO DE CAPAS DE COSTO
   ========================================================= */

app.post("/api/cuarentena/mover",

  requireAuth,

  requirePermission(
    "utilidades.cuarentena_mover"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(
        pool
      );


    try {

      const {
        inventarioId,
        detalleEntradaId,
        cantidad,
        motivo,
        observacion
      } = req.body;


      /* =====================================================
         1. NORMALIZAR
         ===================================================== */

      const inventarioOrigenId =
        Number(
          inventarioId ||
          0
        );


      const detalleLoteId =
        Number(
          detalleEntradaId ||
          0
        );


      const cantidadMover =
        Number(
          cantidad ||
          0
        );


      const motivoFinal =
        String(
          motivo ||
          ""
        ).trim();


      const observacionFinal =
        String(
          observacion ||
          ""
        ).trim() ||
        null;


      /* =====================================================
         2. VALIDACIONES
         ===================================================== */

      if (
        !inventarioOrigenId
      ) {

        return res
          .status(400)
          .json({
            error:
              "Inventario origen no válido."
          });

      }


      if (
        !detalleLoteId
      ) {

        return res
          .status(400)
          .json({
            error:
              "Debe seleccionar un lote válido."
          });

      }


      if (
        !Number.isFinite(
          cantidadMover
        ) ||
        cantidadMover <= 0
      ) {

        return res
          .status(400)
          .json({
            error:
              "La cantidad a mover debe ser mayor a cero."
          });

      }


      if (
        !motivoFinal
      ) {

        return res
          .status(400)
          .json({
            error:
              "Seleccione el motivo de cuarentena."
          });

      }


      /* =====================================================
         3. USUARIO
         ===================================================== */

      const usuarioSesion =
        obtenerUsuarioSesionHC(
          req
        );


      const usuarioId =
        Number(
          usuarioSesion?.id ||
          req.session?.usuario?.id ||
          req.session?.usuarioId ||
          0
        ) || null;


      const usuarioNombre =
        String(
          usuarioSesion?.username ||
          usuarioSesion?.nombreCompleto ||
          req.session?.usuario?.username ||
          req.session?.usuario?.nombreCompleto ||
          "USUARIO"
        ).trim();


      /* =====================================================
         4. INICIAR TRANSACCIÓN
         ===================================================== */

      await transaction.begin();


      /* =====================================================
         5. INVENTARIO ORIGEN
         ===================================================== */

      const invOrigenResult =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            inventarioOrigenId
          )

          .query(`

            SELECT TOP 1

              i.id,
              i.producto_id,
              i.bodega,
              i.stock,
              i.stock_minimo,
              i.ubicacion,

              p.codigo,
              p.producto,
              p.categoria,
              p.unidad

            FROM dbo.inventario i
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            INNER JOIN dbo.productos p

              ON p.id =
                 i.producto_id

            WHERE
              i.id = @id

          `);


      if (
        !invOrigenResult
          .recordset
          .length
      ) {

        throw new Error(
          "Inventario origen no encontrado."
        );

      }


      const invOrigen =
        invOrigenResult
          .recordset[0];


      const bodegaOrigen =
        String(
          invOrigen.bodega ||
          ""
        ).trim();


      const bodegaDestino =
        "CUARENTENA";


      if (
        bodegaOrigen
          .toUpperCase() ===
        "CUARENTENA"
      ) {

        throw new Error(
          "El producto ya se encuentra en CUARENTENA."
        );

      }


      if (
        Number(
          invOrigen.stock ||
          0
        ) <
        cantidadMover
      ) {

        throw new Error(
          `Stock general insuficiente para ${invOrigen.producto}.`
        );

      }


      /* =====================================================
         6. LEER LOTE BASE
         ===================================================== */

      const loteBaseResult =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            detalleLoteId
          )

          .query(`

            SELECT TOP 1

              id,
              bodega,
              producto_id,
              codigo,
              codigoproveedor,
              producto,
              categoria,
              lote,
              vencimiento,
              casa_comercial,
              stock_minimo,
              ubicacion

            FROM dbo.detalleEntradas

            WHERE
              id = @id

          `);


      if (
        !loteBaseResult
          .recordset
          .length
      ) {

        throw new Error(
          "El lote seleccionado no fue encontrado."
        );

      }


      const loteBase =
        loteBaseResult
          .recordset[0];


      if (
        Number(
          loteBase.producto_id
        ) !==
        Number(
          invOrigen.producto_id
        )
      ) {

        throw new Error(
          "El lote seleccionado no corresponde al producto."
        );

      }


      if (
        String(
          loteBase.bodega ||
          ""
        )
          .trim()
          .toUpperCase()
        !==
        bodegaOrigen
          .toUpperCase()
      ) {

        throw new Error(
          "El lote seleccionado no pertenece a la bodega origen."
        );

      }


      /* =====================================================
         7. ESTADO VIGENTE DEL LOTE
         ===================================================== */

      const loteOrigenResult =
        await new sql.Request(
          transaction
        )

          .input(
            "producto_id",
            sql.Int,
            Number(
              loteBase.producto_id
            )
          )

          .input(
            "bodega",
            sql.VarChar,
            bodegaOrigen
          )

          .input(
            "lote",
            sql.VarChar,
            loteBase.lote ||
            ""
          )

          .input(
            "codigoproveedor",
            sql.VarChar,
            loteBase.codigoproveedor ||
            ""
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            loteBase.casa_comercial ||
            ""
          )

          .query(`

            SELECT TOP 1

              id,
              producto_id,
              lote,
              vencimiento,
              casa_comercial,
              codigoproveedor,
              stock_lote,
              ubicacion

            FROM dbo.detalleEntradas
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              producto_id =
                @producto_id


              AND UPPER(
                    LTRIM(
                      RTRIM(bodega)
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@bodega)
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          codigoproveedor,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @codigoproveedor
                      )
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          casa_comercial,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @casa_comercial
                      )
                    )
                  )

            ORDER BY
              id DESC

          `);


      if (
        !loteOrigenResult
          .recordset
          .length
      ) {

        throw new Error(
          "No se encontró el estado vigente del lote."
        );

      }


      const loteOrigen =
        loteOrigenResult
          .recordset[0];


      if (
        Number(
          loteOrigen.stock_lote ||
          0
        ) <
        cantidadMover
      ) {

        throw new Error(
          `Stock insuficiente en el lote ${loteOrigen.lote || ""}.`
        );

      }


      const lote =
        loteOrigen.lote ||
        null;


      const vencimiento =
        loteOrigen.vencimiento ||
        null;


      const casaComercial =
        loteOrigen
          .casa_comercial ||
        null;


      const codigoProveedor =
        loteOrigen
          .codigoproveedor ||
        null;


      const ubicacionOrigen =
        loteOrigen.ubicacion ||
        invOrigen.ubicacion ||
        null;


      const ubicacionDestino =
        null;


      /* =====================================================
         8. BUSCAR CAPAS ECONÓMICAS DEL LOTE
         ===================================================== */

      const capasResult =
        await new sql.Request(
          transaction
        )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invOrigen.producto_id
            )
          )

          .input(
            "bodega",
            sql.VarChar,
            bodegaOrigen
          )

          .input(
            "lote",
            sql.VarChar,
            lote ||
            ""
          )

          .input(
            "codigo_proveedor",
            sql.VarChar,
            codigoProveedor ||
            ""
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            casaComercial ||
            ""
          )

          .query(`

            SELECT

              c.id,

              c.cantidad_disponible,

              c.estado_costo,

              c.costo_unitario,

              c.motivo_sin_costo,

              c.lote,

              c.fecha_vencimiento,

              c.fecha_entrada,

              c.proveedor_id,

              c.codigo_proveedor,

              c.casa_comercial,

              c.referencia_documento,

              c.origen,

              c.origen_id

            FROM dbo.capas_costo_inventario c
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              c.producto_id =
                @producto_id


              AND UPPER(
                    LTRIM(
                      RTRIM(c.bodega)
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@bodega)
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          c.lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )


              AND
              (
                c.codigo_proveedor
                  IS NULL

                OR UPPER(
                     LTRIM(
                       RTRIM(
                         c.codigo_proveedor
                       )
                     )
                   ) =
                   UPPER(
                     LTRIM(
                       RTRIM(
                         @codigo_proveedor
                       )
                     )
                   )
              )


              AND
              (
                c.casa_comercial
                  IS NULL

                OR UPPER(
                     LTRIM(
                       RTRIM(
                         c.casa_comercial
                       )
                     )
                   ) =
                   UPPER(
                     LTRIM(
                       RTRIM(
                         @casa_comercial
                       )
                     )
                   )
              )


              AND c.cantidad_disponible > 0


            ORDER BY

              c.fecha_entrada ASC,

              c.id ASC

          `);


      const capasOrigen =
        capasResult.recordset ||
        [];


      const totalCapasDisponible =
        capasOrigen.reduce(
          (
            total,
            capa
          ) =>

            total +
            Number(
              capa.cantidad_disponible ||
              0
            ),

          0
        );


      if (
        totalCapasDisponible <
        cantidadMover
      ) {

        throw new Error(
          `Las capas de costo del lote solo tienen ${totalCapasDisponible} unidades disponibles.`
        );

      }


      /* =====================================================
         9. INVENTARIO DESTINO
         ===================================================== */

      const invDestinoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invOrigen.producto_id
            )
          )

          .input(
            "bodega",
            sql.VarChar,
            bodegaDestino
          )

          .query(`

            SELECT TOP 1

              id,
              stock

            FROM dbo.inventario
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              producto_id =
                @producto_id

              AND UPPER(
                    LTRIM(
                      RTRIM(bodega)
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@bodega)
                    )
                  )

          `);


      let inventarioDestinoId =
        null;


      if (
        invDestinoResult
          .recordset
          .length
      ) {

        inventarioDestinoId =
          Number(
            invDestinoResult
              .recordset[0]
              .id
          );


        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            inventarioDestinoId
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadMover
          )

          .input(
            "responsable",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "observacion",
            sql.VarChar,
            `Ingreso a cuarentena - ${motivoFinal}${
              observacionFinal
                ? " - " + observacionFinal
                : ""
            }`
          )

          .query(`

            UPDATE dbo.inventario

            SET

              stock =
                ISNULL(
                  stock,
                  0
                ) +
                @cantidad,

              responsable =
                @responsable,

              observacion =
                @observacion,

              fecha_actualizacion =
                GETDATE()

            WHERE
              id = @id

          `);

      }

      else {

        const insertInvDestino =
          await new sql.Request(
            transaction
          )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "bodega",
              sql.VarChar,
              bodegaDestino
            )

            .input(
              "stock",
              sql.Decimal(
                18,
                4
              ),
              cantidadMover
            )

            .input(
              "stock_minimo",
              sql.Int,
              Number(
                invOrigen.stock_minimo ||
                0
              )
            )

            .input(
              "ubicacion",
              sql.VarChar,
              ubicacionDestino
            )

            .input(
              "responsable",
              sql.VarChar,
              usuarioNombre
            )

            .input(
              "observacion",
              sql.VarChar,
              `Ingreso a cuarentena - ${motivoFinal}${
                observacionFinal
                  ? " - " + observacionFinal
                  : ""
              }`
            )

            .query(`

              INSERT INTO dbo.inventario (

                producto_id,
                bodega,
                stock,
                stock_minimo,
                ubicacion,
                responsable,
                observacion

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @producto_id,
                @bodega,
                @stock,
                @stock_minimo,
                @ubicacion,
                @responsable,
                @observacion

              )

            `);


        inventarioDestinoId =
          Number(
            insertInvDestino
              .recordset[0]
              .id
          );

      }


      /* =====================================================
         10. DESCONTAR STOCK GENERAL ORIGEN
         ===================================================== */

      const updateStockOrigen =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            inventarioOrigenId
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadMover
          )

          .query(`

            UPDATE dbo.inventario

            SET

              stock =
                ISNULL(
                  stock,
                  0
                ) -
                @cantidad,

              fecha_actualizacion =
                GETDATE()

            WHERE

              id = @id

              AND ISNULL(
                    stock,
                    0
                  ) >=
                  @cantidad

          `);


      if (
        !updateStockOrigen
          .rowsAffected?.[0]
      ) {

        throw new Error(
          "No fue posible descontar el inventario de origen."
        );

      }


      /* =====================================================
         11. DESCONTAR LOTE ORIGEN
         ===================================================== */

      const updateLoteOrigen =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            Number(
              loteOrigen.id
            )
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadMover
          )

          .query(`

            UPDATE dbo.detalleEntradas

            SET

              stock_lote =
                ISNULL(
                  stock_lote,
                  0
                ) -
                @cantidad

            WHERE

              id = @id

              AND ISNULL(
                    stock_lote,
                    0
                  ) >=
                  @cantidad

          `);


      if (
        !updateLoteOrigen
          .rowsAffected?.[0]
      ) {

        throw new Error(
          "No fue posible descontar el stock del lote."
        );

      }


      /* =====================================================
         12. LOTE DESTINO
         ===================================================== */

      const loteDestinoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "bodega",
            sql.VarChar,
            bodegaDestino
          )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invOrigen.producto_id
            )
          )

          .input(
            "lote",
            sql.VarChar,
            lote ||
            ""
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            casaComercial ||
            ""
          )

          .input(
            "codigoproveedor",
            sql.VarChar,
            codigoProveedor ||
            ""
          )

          .query(`

            SELECT TOP 1

              id,
              stock_lote

            FROM dbo.detalleEntradas
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              producto_id =
                @producto_id


              AND UPPER(
                    LTRIM(
                      RTRIM(bodega)
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@bodega)
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          casa_comercial,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @casa_comercial
                      )
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          codigoproveedor,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @codigoproveedor
                      )
                    )
                  )

            ORDER BY
              id DESC

          `);


      let detalleEntradaDestinoId =
        null;


      if (
        loteDestinoResult
          .recordset
          .length
      ) {

        detalleEntradaDestinoId =
          Number(
            loteDestinoResult
              .recordset[0]
              .id
          );


        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            detalleEntradaDestinoId
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadMover
          )

          .input(
            "vencimiento",
            sql.Date,
            vencimiento
          )

          .query(`

            UPDATE dbo.detalleEntradas

            SET

              stock_lote =
                ISNULL(
                  stock_lote,
                  0
                ) +
                @cantidad,

              vencimiento =
                ISNULL(
                  @vencimiento,
                  vencimiento
                )

            WHERE
              id = @id

          `);

      }

      else {

        const insertLoteDestino =
          await new sql.Request(
            transaction
          )

            .input(
              "bodega",
              sql.VarChar,
              bodegaDestino
            )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "codigo",
              sql.VarChar,
              invOrigen.codigo
            )

            .input(
              "codigoproveedor",
              sql.VarChar,
              codigoProveedor
            )

            .input(
              "producto",
              sql.VarChar,
              invOrigen.producto
            )

            .input(
              "categoria",
              sql.VarChar,
              invOrigen.categoria ||
              null
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              cantidadMover
            )

            .input(
              "stock_lote",
              sql.Decimal(
                18,
                4
              ),
              cantidadMover
            )

            .input(
              "lote",
              sql.VarChar,
              lote
            )

            .input(
              "vencimiento",
              sql.Date,
              vencimiento
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              casaComercial
            )

            .input(
              "stock_minimo",
              sql.Int,
              Number(
                invOrigen.stock_minimo ||
                0
              )
            )

            .input(
              "ubicacion",
              sql.VarChar,
              ubicacionDestino
            )

            .input(
              "responsable",
              sql.VarChar,
              usuarioNombre
            )

            .input(
              "observacion",
              sql.VarChar,
              `Ingreso a cuarentena desde ${bodegaOrigen} - ${motivoFinal}${
                observacionFinal
                  ? " - " + observacionFinal
                  : ""
              }`
            )

            .input(
              "origen_movimiento",
              sql.VarChar,
              "CUARENTENA"
            )

            .query(`

              INSERT INTO dbo.detalleEntradas (

                bodega,
                producto_id,
                codigo,
                codigoproveedor,
                producto,
                categoria,
                cantidad,
                stock_lote,
                lote,
                vencimiento,
                casa_comercial,
                stock_minimo,
                ubicacion,
                responsable,
                observacion,
                origen_movimiento

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @bodega,
                @producto_id,
                @codigo,
                @codigoproveedor,
                @producto,
                @categoria,
                @cantidad,
                @stock_lote,
                @lote,
                @vencimiento,
                @casa_comercial,
                @stock_minimo,
                @ubicacion,
                @responsable,
                @observacion,
                @origen_movimiento

              )

            `);


        detalleEntradaDestinoId =
          Number(
            insertLoteDestino
              .recordset[0]
              .id
          );

      }


      /* =====================================================
         13. REGISTRAR MOVIMIENTO DE CUARENTENA
         ===================================================== */

      const movimientoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "INGRESO"
          )

          .input(
            "inventario_origen_id",
            sql.Int,
            inventarioOrigenId
          )

          .input(
            "inventario_destino_id",
            sql.Int,
            inventarioDestinoId
          )

          .input(
            "detalle_entrada_origen_id",
            sql.Int,
            Number(
              loteOrigen.id
            )
          )

          .input(
            "detalle_entrada_destino_id",
            sql.Int,
            detalleEntradaDestinoId
          )

          .input(
            "codigo",
            sql.VarChar,
            invOrigen.codigo
          )

          .input(
            "producto",
            sql.VarChar,
            invOrigen.producto
          )

          .input(
            "lote",
            sql.VarChar,
            lote
          )

          .input(
            "codigo_proveedor",
            sql.VarChar,
            codigoProveedor
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            casaComercial
          )

          .input(
            "vencimiento",
            sql.Date,
            vencimiento
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadMover
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            bodegaOrigen
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            bodegaDestino
          )

          .input(
            "ubicacion_origen",
            sql.VarChar,
            ubicacionOrigen
          )

          .input(
            "ubicacion_destino",
            sql.VarChar,
            ubicacionDestino
          )

          .input(
            "motivo",
            sql.VarChar,
            motivoFinal
          )

          .input(
            "observacion",
            sql.VarChar,
            observacionFinal
          )

          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )

          .input(
            "usuario_nombre",
            sql.VarChar,
            usuarioNombre
          )

          .query(`

            INSERT INTO dbo.movimientos_cuarentena (

              tipo_movimiento,
              inventario_origen_id,
              inventario_destino_id,
              detalle_entrada_origen_id,
              detalle_entrada_destino_id,
              codigo,
              producto,
              lote,
              codigo_proveedor,
              casa_comercial,
              vencimiento,
              cantidad,
              bodega_origen,
              bodega_destino,
              ubicacion_origen,
              ubicacion_destino,
              motivo,
              observacion,
              usuario_id,
              usuario_nombre

            )

            OUTPUT

              INSERTED.id,
              INSERTED.fecha_movimiento

            VALUES (

              @tipo_movimiento,
              @inventario_origen_id,
              @inventario_destino_id,
              @detalle_entrada_origen_id,
              @detalle_entrada_destino_id,
              @codigo,
              @producto,
              @lote,
              @codigo_proveedor,
              @casa_comercial,
              @vencimiento,
              @cantidad,
              @bodega_origen,
              @bodega_destino,
              @ubicacion_origen,
              @ubicacion_destino,
              @motivo,
              @observacion,
              @usuario_id,
              @usuario_nombre

            )

          `);


      const movimientoId =
        Number(
          movimientoResult
            .recordset[0]
            .id
        );


      const fechaMovimiento =
        movimientoResult
          .recordset[0]
          .fecha_movimiento;


      /* =====================================================
         14. TRASLADAR CAPAS DE COSTO
         ===================================================== */

      let cantidadPendiente =
        cantidadMover;


      const capasMovidas =
        [];


      for (
        const capa of capasOrigen
      ) {

        if (
          cantidadPendiente <=
          0
        ) {
          break;
        }


        const disponible =
          Number(
            capa.cantidad_disponible ||
            0
          );


        if (
          disponible <= 0
        ) {
          continue;
        }


        const mover =
          Math.min(
            disponible,
            cantidadPendiente
          );


        const nuevoSaldo =
          disponible -
          mover;


        /* ===============================================
           REDUCIR CAPA ORIGEN
           =============================================== */

        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            Number(
              capa.id
            )
          )

          .input(
            "saldo",
            sql.Decimal(
              18,
              4
            ),
            nuevoSaldo
          )

          .query(`

            UPDATE dbo.capas_costo_inventario

            SET
              cantidad_disponible =
                @saldo

            WHERE
              id = @id

          `);


        const costoUnitario =

          capa.costo_unitario === null ||
          capa.costo_unitario === undefined

            ? null

            : Number(
                capa.costo_unitario
              );


        const valorMovimiento =

          costoUnitario === null

            ? null

            : mover *
              costoUnitario;


        /* ===============================================
           CREAR CAPA EN CUARENTENA
           =============================================== */

        const nuevaCapaResult =
          await new sql.Request(
            transaction
          )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invOrigen.producto_id
              )
            )

            .input(
              "bodega",
              sql.VarChar,
              "CUARENTENA"
            )

            .input(
              "lote",
              sql.VarChar,
              capa.lote ||
              lote ||
              null
            )

            .input(
              "fecha_vencimiento",
              sql.Date,
              capa.fecha_vencimiento ||
              vencimiento ||
              null
            )

            .input(
              "origen",
              sql.VarChar,
              "CUARENTENA"
            )

            .input(
              "origen_id",
              sql.Int,
              movimientoId
            )

            .input(
              "estado_costo",
              sql.VarChar,
              capa.estado_costo
            )

            .input(
              "costo_unitario",
              sql.Decimal(
                18,
                6
              ),
              costoUnitario
            )

            .input(
              "motivo_sin_costo",
              sql.VarChar,
              capa.motivo_sin_costo ||
              null
            )

            .input(
              "cantidad_original",
              sql.Decimal(
                18,
                4
              ),
              mover
            )

            .input(
              "cantidad_disponible",
              sql.Decimal(
                18,
                4
              ),
              mover
            )

            .input(
              "capa_origen_id",
              sql.Int,
              Number(
                capa.id
              )
            )

            .input(
              "proveedor_id",
              sql.Int,
              capa.proveedor_id ||
              null
            )

            .input(
              "referencia_documento",
              sql.VarChar,
              `CUARENTENA-${movimientoId}`
            )

            .input(
              "observacion",
              sql.VarChar,
              `${motivoFinal}${
                observacionFinal
                  ? " - " +
                    observacionFinal
                  : ""
              }`
            )

            .input(
              "usuario_creacion",
              sql.VarChar,
              usuarioNombre
            )

            .input(
              "fecha_entrada",
              sql.DateTime2,
              capa.fecha_entrada ||
              fechaMovimiento
            )

            .input(
              "codigo_proveedor",
              sql.VarChar,
              capa.codigo_proveedor ||
              codigoProveedor ||
              null
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              capa.casa_comercial ||
              casaComercial ||
              null
            )

            .query(`

              INSERT INTO dbo.capas_costo_inventario (

                producto_id,
                bodega,
                lote,
                fecha_vencimiento,
                origen,
                origen_id,
                estado_costo,
                costo_unitario,
                motivo_sin_costo,
                cantidad_original,
                cantidad_disponible,
                capa_origen_id,
                proveedor_id,
                referencia_documento,
                observacion,
                usuario_creacion,
                fecha_entrada,
                codigo_proveedor,
                casa_comercial

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @producto_id,
                @bodega,
                @lote,
                @fecha_vencimiento,
                @origen,
                @origen_id,
                @estado_costo,
                @costo_unitario,
                @motivo_sin_costo,
                @cantidad_original,
                @cantidad_disponible,
                @capa_origen_id,
                @proveedor_id,
                @referencia_documento,
                @observacion,
                @usuario_creacion,
                @fecha_entrada,
                @codigo_proveedor,
                @casa_comercial

              )

            `);


        const capaDestinoId =
          Number(
            nuevaCapaResult
              .recordset[0]
              .id
          );


        /* ===============================================
           MOVIMIENTO CAPA - SALIDA
           =============================================== */

        await new sql.Request(
          transaction
        )

          .input(
            "capa_id",
            sql.Int,
            Number(
              capa.id
            )
          )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invOrigen.producto_id
            )
          )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "CUARENTENA_SALIDA"
          )

          .input(
            "documento",
            sql.VarChar,
            `CUARENTENA-${movimientoId}`
          )

          .input(
            "documento_id",
            sql.Int,
            movimientoId
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            bodegaOrigen
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "lote",
            sql.VarChar,
            capa.lote ||
            lote ||
            null
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            mover
          )

          .input(
            "costo_unitario",
            sql.Decimal(
              18,
              6
            ),
            costoUnitario
          )

          .input(
            "valor_movimiento",
            sql.Decimal(
              18,
              6
            ),
            valorMovimiento
          )

          .input(
            "estado_costo",
            sql.VarChar,
            capa.estado_costo
          )

          .input(
            "usuario",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "observacion",
            sql.VarChar,
            motivoFinal
          )

          .query(`

            INSERT INTO dbo.movimientos_capas_costo (

              capa_id,
              producto_id,
              tipo_movimiento,
              documento,
              documento_id,
              bodega_origen,
              bodega_destino,
              lote,
              cantidad,
              costo_unitario,
              valor_movimiento,
              estado_costo,
              usuario,
              observacion

            )

            VALUES (

              @capa_id,
              @producto_id,
              @tipo_movimiento,
              @documento,
              @documento_id,
              @bodega_origen,
              @bodega_destino,
              @lote,
              @cantidad,
              @costo_unitario,
              @valor_movimiento,
              @estado_costo,
              @usuario,
              @observacion

            )

          `);


        /* ===============================================
           MOVIMIENTO CAPA - ENTRADA
           =============================================== */

        await new sql.Request(
          transaction
        )

          .input(
            "capa_id",
            sql.Int,
            capaDestinoId
          )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invOrigen.producto_id
            )
          )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "CUARENTENA_ENTRADA"
          )

          .input(
            "documento",
            sql.VarChar,
            `CUARENTENA-${movimientoId}`
          )

          .input(
            "documento_id",
            sql.Int,
            movimientoId
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            bodegaOrigen
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "lote",
            sql.VarChar,
            capa.lote ||
            lote ||
            null
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            mover
          )

          .input(
            "costo_unitario",
            sql.Decimal(
              18,
              6
            ),
            costoUnitario
          )

          .input(
            "valor_movimiento",
            sql.Decimal(
              18,
              6
            ),
            valorMovimiento
          )

          .input(
            "estado_costo",
            sql.VarChar,
            capa.estado_costo
          )

          .input(
            "usuario",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "observacion",
            sql.VarChar,
            motivoFinal
          )

          .query(`

            INSERT INTO dbo.movimientos_capas_costo (

              capa_id,
              producto_id,
              tipo_movimiento,
              documento,
              documento_id,
              bodega_origen,
              bodega_destino,
              lote,
              cantidad,
              costo_unitario,
              valor_movimiento,
              estado_costo,
              usuario,
              observacion

            )

            VALUES (

              @capa_id,
              @producto_id,
              @tipo_movimiento,
              @documento,
              @documento_id,
              @bodega_origen,
              @bodega_destino,
              @lote,
              @cantidad,
              @costo_unitario,
              @valor_movimiento,
              @estado_costo,
              @usuario,
              @observacion

            )

          `);


        capasMovidas.push({

          capa_origen_id:
            Number(
              capa.id
            ),

          capa_destino_id:
            capaDestinoId,

          cantidad:
            mover,

          costo_unitario:
            costoUnitario,

          valor:
            valorMovimiento

        });


        cantidadPendiente -=
          mover;

      }


      if (
        cantidadPendiente >
        0.0001
      ) {

        throw new Error(
          "No fue posible mover completamente las capas de costo a cuarentena."
        );

      }


      /* =====================================================
         15. AUDITORÍA
         ===================================================== */

      try {

        await new sql.Request(
          transaction
        )

          .input(
            "usuario",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "modulo",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "accion",
            sql.VarChar,
            "MOVER A CUARENTENA"
          )

          .input(
            "detalle",
            sql.VarChar,
            `${
              invOrigen.codigo
            } | ${
              invOrigen.producto
            } | Lote: ${
              lote ||
              "SIN LOTE"
            } | Cantidad: ${
              cantidadMover
            } | Desde: ${
              bodegaOrigen
            }`
          )

          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         16. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        mensaje:
          "Producto movido a cuarentena correctamente.",

        movimiento_id:
          movimientoId,

        fecha_movimiento:
          fechaMovimiento,

        capas_costo:
          capasMovidas,

        producto: {

          codigo:
            invOrigen.codigo,

          nombre:
            invOrigen.producto,

          lote,

          vencimiento,

          cantidad:
            cantidadMover,

          origen:
            bodegaOrigen,

          destino:
            bodegaDestino

        }

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR MOVER A CUARENTENA:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "Error al mover producto a cuarentena."

        });

    }

  }
);

/* =========================================================
   CONTROL DE FECHAS DE EXPIRACIÓN
   ========================================================= */

app.get("/api/control-expiracion",

  requireAuth,

  requirePermission(
    "utilidades.control_expiracion"
  ),

  async (req, res) => {

    try {

      /* =========================================
         FILTROS
         ========================================= */

      const codigo =
        String(
          req.query.codigo || ""
        ).trim();

      const producto =
        String(
          req.query.producto || ""
        ).trim();

      const bodega =
        String(
          req.query.bodega || ""
        ).trim();

      const lote =
        String(
          req.query.lote || ""
        ).trim();

      const codigoProveedor =
        String(
          req.query.codigoProveedor || ""
        ).trim();

      const casaComercial =
        String(
          req.query.casaComercial || ""
        ).trim();

      const estado =
        String(
          req.query.estado || ""
        )
          .trim()
          .toUpperCase();

      const fechaDesde =
        String(
          req.query.fechaDesde || ""
        ).trim();

      const fechaHasta =
        String(
          req.query.fechaHasta || ""
        ).trim();


      /* =========================================
         PAGINACIÓN
         ========================================= */

      let pagina =
        Number(
          req.query.pagina || 1
        );

      let limite =
        Number(
          req.query.limite || 10
        );


      if (
        !Number.isInteger(pagina) ||
        pagina < 1
      ) {
        pagina = 1;
      }


      if (
        !Number.isInteger(limite) ||
        limite < 1
      ) {
        limite = 10;
      }


      /*
        Para la pantalla utilizaremos 10.
        Dejamos máximo 5000 para reutilizar
        posteriormente la consulta al exportar.
      */
      if (limite > 5000) {
        limite = 5000;
      }


      const offset =
        (pagina - 1) *
        limite;


      /* =========================================
         ORDENAMIENTO
         ========================================= */

      const ordenSolicitado =
        String(
          req.query.orden ||
          "vencimiento_asc"
        )
          .trim()
          .toLowerCase();


      const ordenesPermitidos = {

        vencimiento_asc:
          "vencimiento ASC, producto ASC",

        vencimiento_desc:
          "vencimiento DESC, producto ASC",

        producto_asc:
          "producto ASC, vencimiento ASC",

        producto_desc:
          "producto DESC, vencimiento ASC",

        codigo_asc:
          "codigo ASC, producto ASC",

        codigo_desc:
          "codigo DESC, producto ASC",

        cantidad_asc:
          "stock_lote ASC, producto ASC",

        cantidad_desc:
          "stock_lote DESC, producto ASC",

        lote_asc:
          "lote ASC, producto ASC",

        lote_desc:
          "lote DESC, producto ASC"
      };


      const orderBy =
        ordenesPermitidos[
          ordenSolicitado
        ] ||
        ordenesPermitidos
          .vencimiento_asc;


      /* =========================================
         CONFIGURACIÓN DE VENCIMIENTOS
         ========================================= */

      const pool =
        await getPool();


      const configResult =
        await pool
          .request()
          .query(`
            SELECT TOP 1
              meses_aviso,
              dias_critico
            FROM dbo.configuracion_expiracion
            ORDER BY id ASC
          `);


      const mesesAviso =
        Number(
          configResult
            .recordset?.[0]
            ?.meses_aviso || 3
        );


      const diasCritico =
        Number(
          configResult
            .recordset?.[0]
            ?.dias_critico || 30
        );


      /* =========================================
         CONSULTA
         ========================================= */

      const request =
        pool
          .request()
          .input(
            "codigo",
            sql.VarChar,
            codigo
          )
          .input(
            "producto",
            sql.VarChar,
            producto
          )
          .input(
            "bodega",
            sql.VarChar,
            bodega
          )
          .input(
            "lote",
            sql.VarChar,
            lote
          )
          .input(
            "codigoProveedor",
            sql.VarChar,
            codigoProveedor
          )
          .input(
            "casaComercial",
            sql.VarChar,
            casaComercial
          )
          .input(
            "estado",
            sql.VarChar,
            estado
          )
          .input(
            "fechaDesde",
            sql.VarChar,
            fechaDesde
          )
          .input(
            "fechaHasta",
            sql.VarChar,
            fechaHasta
          )
          .input(
            "mesesAviso",
            sql.Int,
            mesesAviso
          )
          .input(
            "diasCritico",
            sql.Int,
            diasCritico
          )
          .input(
            "offset",
            sql.Int,
            offset
          )
          .input(
            "limite",
            sql.Int,
            limite
          );


      const result =
        await request.query(`

          /* =====================================
             1. OBTENER EL REGISTRO MÁS RECIENTE
                DE CADA LOTE

             Esto evita mostrar repetido un lote
             que ha tenido varias entradas.
             ===================================== */

          WITH LotesNumerados AS (

            SELECT

              de.id
                AS detalle_entrada_id,

              de.producto_id,

              de.codigo,

              de.codigoproveedor
                AS codigo_proveedor,

              de.producto,

              de.categoria,

              de.bodega,

              de.lote,

              de.vencimiento,

              de.casa_comercial,

              de.stock_lote,

              de.stock_minimo,

              de.ubicacion,

              de.responsable,

              de.origen_movimiento,

              ROW_NUMBER() OVER (

                PARTITION BY
                  de.producto_id,
                  de.bodega,
                  ISNULL(
                    de.lote,
                    ''
                  ),
                  ISNULL(
                    de.codigoproveedor,
                    ''
                  ),
                  ISNULL(
                    de.casa_comercial,
                    ''
                  )

                ORDER BY
                  de.id DESC

              ) AS rn

            FROM dbo.detalleEntradas de

            WHERE
              de.lote IS NOT NULL

              AND LTRIM(
                    RTRIM(
                      de.lote
                    )
                  ) <> ''

              AND de.vencimiento
                  IS NOT NULL

          ),


          /* =====================================
             2. TOMAR EL STOCK ACTUAL DEL LOTE
             ===================================== */

          LotesActuales AS (

            SELECT

              ln.detalle_entrada_id,

              i.id
                AS inventario_id,

              ln.producto_id,

              ln.codigo,

              ln.codigo_proveedor,

              ln.producto,

              ln.categoria,

              ln.bodega,

              ln.lote,

              ln.vencimiento,

              ln.casa_comercial,

              CAST(
                ln.stock_lote
                AS DECIMAL(18,4)
              ) AS stock_lote,

              COALESCE(
                NULLIF(
                  ln.ubicacion,
                  ''
                ),
                i.ubicacion
              ) AS ubicacion,

              ln.responsable,

              ln.origen_movimiento,

              DATEDIFF(
                DAY,
                CAST(GETDATE() AS DATE),
                ln.vencimiento
              ) AS dias_restantes,

              CASE

                WHEN
                  ln.vencimiento <
                  CAST(
                    GETDATE()
                    AS DATE
                  )
                THEN
                  'VENCIDO'


                WHEN
                  ln.vencimiento <=
                  DATEADD(
                    DAY,
                    @diasCritico,
                    CAST(
                      GETDATE()
                      AS DATE
                    )
                  )
                THEN
                  'CRITICO'


                WHEN
                  ln.vencimiento <=
                  DATEADD(
                    MONTH,
                    @mesesAviso,
                    CAST(
                      GETDATE()
                      AS DATE
                    )
                  )
                THEN
                  'PROXIMO'


                ELSE
                  'VIGENTE'

              END AS estado_expiracion

            FROM LotesNumerados ln

            INNER JOIN dbo.inventario i
              ON i.producto_id =
                 ln.producto_id

              AND i.bodega =
                  ln.bodega

            WHERE
              ln.rn = 1

              AND ISNULL(
                    ln.stock_lote,
                    0
                  ) > 0

              /*
                CUARENTENA NO SE MUESTRA
                EN EL CONTROL NORMAL.
              */
              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ln.bodega
                      )
                    )
                  ) <> 'CUARENTENA'

          ),


          /* =====================================
             3. FILTROS
             ===================================== */

          DatosFiltrados AS (

            SELECT *

            FROM LotesActuales

            WHERE

              (
                @codigo = ''
                OR codigo LIKE
                   '%' +
                   @codigo +
                   '%'
              )

              AND
              (
                @producto = ''
                OR producto LIKE
                   '%' +
                   @producto +
                   '%'
              )

              AND
              (
                @bodega = ''
                OR bodega =
                   @bodega
              )

              AND
              (
                @lote = ''
                OR lote LIKE
                   '%' +
                   @lote +
                   '%'
              )

              AND
              (
                @codigoProveedor = ''
                OR ISNULL(
                     codigo_proveedor,
                     ''
                   ) LIKE
                   '%' +
                   @codigoProveedor +
                   '%'
              )

              AND
              (
                @casaComercial = ''
                OR ISNULL(
                     casa_comercial,
                     ''
                   ) LIKE
                   '%' +
                   @casaComercial +
                   '%'
              )

              AND
              (
                @estado = ''
                OR estado_expiracion =
                   @estado
              )

              AND
              (
                @fechaDesde = ''
                OR vencimiento >=
                   TRY_CONVERT(
                     DATE,
                     @fechaDesde
                   )
              )

              AND
              (
                @fechaHasta = ''
                OR vencimiento <=
                   TRY_CONVERT(
                     DATE,
                     @fechaHasta
                   )
              )

          )


          /* =====================================
             4. RESULTADO PAGINADO
             ===================================== */

          SELECT

            detalle_entrada_id,
            inventario_id,
            producto_id,

            codigo,
            codigo_proveedor,

            producto,
            categoria,

            lote,

            CONVERT(
              VARCHAR(10),
              vencimiento,
              23
            ) AS vencimiento,

            casa_comercial,

            stock_lote
              AS cantidad,

            bodega,

            ubicacion,

            dias_restantes,

            estado_expiracion,

            responsable,

            origen_movimiento,

            COUNT(*) OVER()
              AS total_registros

          FROM DatosFiltrados

          ORDER BY
            ${orderBy}

          OFFSET
            @offset ROWS

          FETCH NEXT
            @limite ROWS ONLY;

        `);


      const items =
        result.recordset || [];


      const totalRegistros =
        items.length
          ? Number(
              items[0]
                .total_registros ||
              0
            )
          : 0;


      const totalPaginas =
        Math.max(
          1,
          Math.ceil(
            totalRegistros /
            limite
          )
        );


      /*
        Quitamos total_registros
        de cada fila porque ya lo
        devolvemos una sola vez.
      */
      const itemsLimpios =
        items.map(item => {

          const {
            total_registros,
            ...resto
          } = item;

          return resto;

        });


      /* =========================================
         RESUMEN GLOBAL

         Este resumen luego nos servirá
         para el Dashboard.
         ========================================= */

     const resumenResult =
  await pool
    .request()
    .input(
      "mesesAviso",
      sql.Int,
      mesesAviso
    )
    .input(
      "diasCritico",
      sql.Int,
      diasCritico
    )
    .query(`

      WITH LotesNumerados AS (

        SELECT

          de.id
            AS detalle_entrada_id,

          de.producto_id,

          de.codigo,

          de.codigoproveedor
            AS codigo_proveedor,

          de.producto,

          de.categoria,

          de.bodega,

          de.lote,

          de.vencimiento,

          de.casa_comercial,

          de.stock_lote,

          de.stock_minimo,

          de.ubicacion,

          de.responsable,

          de.origen_movimiento,

          ROW_NUMBER() OVER (

            PARTITION BY
              de.producto_id,
              de.bodega,
              ISNULL(de.lote, ''),
              ISNULL(de.codigoproveedor, ''),
              ISNULL(de.casa_comercial, '')

            ORDER BY
              de.id DESC

          ) AS rn

        FROM dbo.detalleEntradas de

        WHERE

          de.lote IS NOT NULL

          AND LTRIM(
                RTRIM(
                  de.lote
                )
              ) <> ''

          AND de.vencimiento
              IS NOT NULL

      ),


      LotesActuales AS (

        SELECT

          ln.detalle_entrada_id,

          i.id
            AS inventario_id,

          ln.producto_id,

          ln.codigo,

          ln.codigo_proveedor,

          ln.producto,

          ln.bodega,

          ln.lote,

          ln.vencimiento,

          ln.casa_comercial,

          ln.stock_lote,

          CASE

            WHEN
              ln.vencimiento <
              CAST(GETDATE() AS DATE)
            THEN
              'VENCIDO'


            WHEN
              ln.vencimiento <=
              DATEADD(
                DAY,
                @diasCritico,
                CAST(GETDATE() AS DATE)
              )
            THEN
              'CRITICO'


            WHEN
              ln.vencimiento <=
              DATEADD(
                MONTH,
                @mesesAviso,
                CAST(GETDATE() AS DATE)
              )
            THEN
              'PROXIMO'


            ELSE
              'VIGENTE'

          END
            AS estado_expiracion

        FROM LotesNumerados ln

        INNER JOIN dbo.inventario i
          ON i.producto_id =
             ln.producto_id

          AND i.bodega =
              ln.bodega

        WHERE

          ln.rn = 1

          AND ISNULL(
                ln.stock_lote,
                0
              ) > 0

          AND UPPER(
                LTRIM(
                  RTRIM(
                    ln.bodega
                  )
                )
              ) <> 'CUARENTENA'

      )


      SELECT

        SUM(
          CASE
            WHEN estado_expiracion = 'VENCIDO'
            THEN 1
            ELSE 0
          END
        ) AS vencidos,

        SUM(
          CASE
            WHEN estado_expiracion = 'CRITICO'
            THEN 1
            ELSE 0
          END
        ) AS criticos,

        SUM(
          CASE
            WHEN estado_expiracion = 'PROXIMO'
            THEN 1
            ELSE 0
          END
        ) AS proximos,

        SUM(
          CASE
            WHEN estado_expiracion = 'VIGENTE'
            THEN 1
            ELSE 0
          END
        ) AS vigentes

      FROM LotesActuales;

    `);
      const resumenBD =
        resumenResult
          .recordset?.[0] ||
        {};


      /* =========================================
         RESPUESTA
         ========================================= */

      res.json({

        ok: true,

        configuracion: {
          meses_aviso:
            mesesAviso,

          dias_critico:
            diasCritico
        },

        resumen: {
          vencidos:
            Number(
              resumenBD.vencidos ||
              0
            ),

          criticos:
            Number(
              resumenBD.criticos ||
              0
            ),

          proximos:
            Number(
              resumenBD.proximos ||
              0
            ),

          vigentes:
            Number(
              resumenBD.vigentes ||
              0
            )
        },

        paginacion: {
          pagina,
          limite,
          total_registros:
            totalRegistros,
          total_paginas:
            totalPaginas
        },

        items:
          itemsLimpios

      });


    } catch (error) {

      console.error(
        "ERROR CONTROL EXPIRACION:",
        error
      );


      res.status(500).json({
        error:
          error.message ||
          "No se pudo cargar el control de fechas de expiración."
      });

    }

  }
);

/* =========================================================
   LISTAR STOCK EN CUARENTENA
   ========================================================= */

app.get("/api/cuarentena",

  requireAuth,

  requirePermission(
    "utilidades.cuarentena_ver"
  ),

  async (req, res) => {

    try {

      /* =========================================
         FILTROS
         ========================================= */

      const codigo =
        String(
          req.query.codigo || ""
        ).trim();

      const producto =
        String(
          req.query.producto || ""
        ).trim();

      const lote =
        String(
          req.query.lote || ""
        ).trim();

      const codigoProveedor =
        String(
          req.query.codigoProveedor || ""
        ).trim();

      const casaComercial =
        String(
          req.query.casaComercial || ""
        ).trim();

      const fechaDesde =
        String(
          req.query.fechaDesde || ""
        ).trim();

      const fechaHasta =
        String(
          req.query.fechaHasta || ""
        ).trim();


      /* =========================================
         PAGINACIÓN
         ========================================= */

      let pagina =
        Number(
          req.query.pagina || 1
        );

      let limite =
        Number(
          req.query.limite || 10
        );


      if (
        !Number.isInteger(pagina) ||
        pagina < 1
      ) {
        pagina = 1;
      }


      if (
        !Number.isInteger(limite) ||
        limite < 1
      ) {
        limite = 10;
      }


      if (limite > 5000) {
        limite = 5000;
      }


      const offset =
        (pagina - 1) *
        limite;


      /* =========================================
         ORDEN
         ========================================= */

      const ordenSolicitado =
        String(
          req.query.orden ||
          "vencimiento_asc"
        )
          .trim()
          .toLowerCase();


      const ordenesPermitidos = {

        vencimiento_asc:
          "vencimiento ASC, producto ASC",

        vencimiento_desc:
          "vencimiento DESC, producto ASC",

        producto_asc:
          "producto ASC, vencimiento ASC",

        producto_desc:
          "producto DESC, vencimiento ASC",

        codigo_asc:
          "codigo ASC, producto ASC",

        codigo_desc:
          "codigo DESC, producto ASC",

        cantidad_asc:
          "stock_lote ASC, producto ASC",

        cantidad_desc:
          "stock_lote DESC, producto ASC",

        lote_asc:
          "lote ASC, producto ASC",

        lote_desc:
          "lote DESC, producto ASC"

      };


      const orderBy =
        ordenesPermitidos[
          ordenSolicitado
        ] ||
        ordenesPermitidos
          .vencimiento_asc;


      const pool =
        await getPool();


      /* =========================================
         CONFIGURACIÓN DE EXPIRACIÓN
         ========================================= */

      const configResult =
        await pool
          .request()
          .query(`
            SELECT TOP 1
              meses_aviso,
              dias_critico
            FROM dbo.configuracion_expiracion
            ORDER BY id ASC
          `);


      const mesesAviso =
        Number(
          configResult
            .recordset?.[0]
            ?.meses_aviso || 3
        );


      const diasCritico =
        Number(
          configResult
            .recordset?.[0]
            ?.dias_critico || 30
        );


      /* =========================================
         CONSULTA CUARENTENA
         ========================================= */

      const result =
        await pool
          .request()

          .input(
            "codigo",
            sql.VarChar,
            codigo
          )

          .input(
            "producto",
            sql.VarChar,
            producto
          )

          .input(
            "lote",
            sql.VarChar,
            lote
          )

          .input(
            "codigoProveedor",
            sql.VarChar,
            codigoProveedor
          )

          .input(
            "casaComercial",
            sql.VarChar,
            casaComercial
          )

          .input(
            "fechaDesde",
            sql.VarChar,
            fechaDesde
          )

          .input(
            "fechaHasta",
            sql.VarChar,
            fechaHasta
          )

          .input(
            "mesesAviso",
            sql.Int,
            mesesAviso
          )

          .input(
            "diasCritico",
            sql.Int,
            diasCritico
          )

          .input(
            "offset",
            sql.Int,
            offset
          )

          .input(
            "limite",
            sql.Int,
            limite
          )

          .query(`

            WITH LotesNumerados AS (

              SELECT

                de.id
                  AS detalle_entrada_id,

                de.producto_id,

                de.codigo,

                de.codigoproveedor
                  AS codigo_proveedor,

                de.producto,

                de.categoria,

                de.bodega,

                de.lote,

                de.vencimiento,

                de.casa_comercial,

                de.stock_lote,

                de.stock_minimo,

                de.ubicacion,

                de.responsable,

                de.observacion,

                de.origen_movimiento,

                ROW_NUMBER() OVER (

                  PARTITION BY
                    de.producto_id,
                    de.bodega,
                    ISNULL(
                      de.lote,
                      ''
                    ),
                    ISNULL(
                      de.codigoproveedor,
                      ''
                    ),
                    ISNULL(
                      de.casa_comercial,
                      ''
                    )

                  ORDER BY
                    de.id DESC

                ) AS rn

              FROM dbo.detalleEntradas de

              WHERE

                UPPER(
                  LTRIM(
                    RTRIM(
                      de.bodega
                    )
                  )
                ) = 'CUARENTENA'

            ),


            CuarentenaActual AS (

              SELECT

                ln.detalle_entrada_id,

                i.id
                  AS inventario_id,

                ln.producto_id,

                ln.codigo,

                ln.codigo_proveedor,

                ln.producto,

                ln.categoria,

                ln.lote,

                ln.vencimiento,

                ln.casa_comercial,

                CAST(
                  ln.stock_lote
                  AS DECIMAL(18,4)
                ) AS stock_lote,

                COALESCE(
                  NULLIF(
                    ln.ubicacion,
                    ''
                  ),
                  i.ubicacion
                ) AS ubicacion,

                ln.responsable,

                ln.observacion,

                DATEDIFF(
                  DAY,
                  CAST(GETDATE() AS DATE),
                  ln.vencimiento
                ) AS dias_restantes,

                CASE

                  WHEN
                    ln.vencimiento IS NULL
                  THEN
                    'SIN FECHA'

                  WHEN
                    ln.vencimiento <
                    CAST(GETDATE() AS DATE)
                  THEN
                    'VENCIDO'

                  WHEN
                    ln.vencimiento <=
                    DATEADD(
                      DAY,
                      @diasCritico,
                      CAST(GETDATE() AS DATE)
                    )
                  THEN
                    'CRITICO'

                  WHEN
                    ln.vencimiento <=
                    DATEADD(
                      MONTH,
                      @mesesAviso,
                      CAST(GETDATE() AS DATE)
                    )
                  THEN
                    'PROXIMO'

                  ELSE
                    'VIGENTE'

                END
                  AS estado_expiracion

              FROM LotesNumerados ln

              INNER JOIN dbo.inventario i
                ON i.producto_id =
                   ln.producto_id

                AND UPPER(
                      LTRIM(
                        RTRIM(
                          i.bodega
                        )
                      )
                    ) =
                    'CUARENTENA'

              WHERE

                ln.rn = 1

                AND ISNULL(
                      ln.stock_lote,
                      0
                    ) > 0

            ),


            DatosFiltrados AS (

              SELECT *

              FROM CuarentenaActual

              WHERE

                (
                  @codigo = ''
                  OR codigo LIKE
                     '%' +
                     @codigo +
                     '%'
                )

                AND
                (
                  @producto = ''
                  OR producto LIKE
                     '%' +
                     @producto +
                     '%'
                )

                AND
                (
                  @lote = ''
                  OR ISNULL(
                       lote,
                       ''
                     ) LIKE
                     '%' +
                     @lote +
                     '%'
                )

                AND
                (
                  @codigoProveedor = ''
                  OR ISNULL(
                       codigo_proveedor,
                       ''
                     ) LIKE
                     '%' +
                     @codigoProveedor +
                     '%'
                )

                AND
                (
                  @casaComercial = ''
                  OR ISNULL(
                       casa_comercial,
                       ''
                     ) LIKE
                     '%' +
                     @casaComercial +
                     '%'
                )

                AND
                (
                  @fechaDesde = ''
                  OR vencimiento >=
                     TRY_CONVERT(
                       DATE,
                       @fechaDesde
                     )
                )

                AND
                (
                  @fechaHasta = ''
                  OR vencimiento <=
                     TRY_CONVERT(
                       DATE,
                       @fechaHasta
                     )
                )

            )


            SELECT

              detalle_entrada_id,
              inventario_id,
              producto_id,

              codigo,
              codigo_proveedor,
              producto,
              categoria,
              lote,

              CONVERT(
                VARCHAR(10),
                vencimiento,
                23
              ) AS vencimiento,

              casa_comercial,

              stock_lote
                AS cantidad,

              'CUARENTENA'
                AS bodega,

              ubicacion,

              dias_restantes,

              estado_expiracion,

              responsable,

              observacion,

              COUNT(*) OVER()
                AS total_registros

            FROM DatosFiltrados

            ORDER BY
              ${orderBy}

            OFFSET
              @offset ROWS

            FETCH NEXT
              @limite ROWS ONLY;

          `);


      const registros =
        result.recordset || [];


      const totalRegistros =
        registros.length
          ? Number(
              registros[0]
                .total_registros || 0
            )
          : 0;


      const totalPaginas =
        Math.max(
          1,
          Math.ceil(
            totalRegistros /
            limite
          )
        );


      const items =
        registros.map(
          item => {

            const {
              total_registros,
              ...resto
            } = item;

            return resto;

          }
        );


      res.json({

        ok: true,

        paginacion: {
          pagina,
          limite,
          total_registros:
            totalRegistros,
          total_paginas:
            totalPaginas
        },

        items

      });


    } catch (error) {

      console.error(
        "ERROR LISTAR CUARENTENA:",
        error
      );


      res.status(500).json({
        error:
          error.message ||
          "No se pudo cargar el stock de cuarentena."
      });

    }

  }
);

/* =========================================================
   BODEGAS DISPONIBLES PARA LIBERAR CUARENTENA
   ========================================================= */

app.get("/api/cuarentena/bodegas-destino",

  requireAuth,

  requirePermission(
    "utilidades.cuarentena_liberar"
  ),

  async (req, res) => {

    try {

      const pool =
        await getPool();


      const result =
        await pool
          .request()
          .query(`

            SELECT
              id,
              LTRIM(
                RTRIM(
                  nombre
                )
              ) AS nombre

            FROM dbo.bodegas

            WHERE
              UPPER(
                LTRIM(
                  RTRIM(
                    estado
                  )
                )
              ) = 'ACTIVO'

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        nombre
                      )
                    )
                  ) <> 'CUARENTENA'

            ORDER BY
              nombre ASC

          `);


      res.json({

        ok: true,

        bodegas:
          (result.recordset || [])
            .map(
              item => ({
                id:
                  Number(item.id),

                nombre:
                  item.nombre
              })
            )

      });


    } catch (error) {

      console.error(
        "ERROR BODEGAS DESTINO CUARENTENA:",
        error
      );


      res.status(500).json({
        error:
          "No se pudieron cargar las bodegas disponibles."
      });

    }

  }
);


/* =========================================================
   LIBERAR PRODUCTO DE CUARENTENA
   ========================================================= */

/* =========================================================
   LIBERAR PRODUCTO DE CUARENTENA
   CON MOVIMIENTO DE CAPAS DE COSTO

   FLUJO ECONÓMICO:

   CUARENTENA
      ↓
   LIBERACION_SALIDA
      ↓
   nueva capa en bodega destino
      ↓
   LIBERACION_ENTRADA

   El costo NO cambia.
   ========================================================= */

app.post("/api/cuarentena/liberar",

  requireAuth,

  requirePermission(
    "utilidades.cuarentena_liberar"
  ),

  async (req, res) => {

    const pool =
      await getPool();


    const transaction =
      new sql.Transaction(
        pool
      );


    try {

      const {
        inventarioId,
        detalleEntradaId,
        cantidad,
        destino,
        motivo,
        observacion
      } = req.body;


      /* =====================================================
         1. NORMALIZAR
         ===================================================== */

      const inventarioCuarentenaId =
        Number(
          inventarioId ||
          0
        );


      const detalleCuarentenaBaseId =
        Number(
          detalleEntradaId ||
          0
        );


      const cantidadLiberar =
        Number(
          cantidad ||
          0
        );


      const bodegaDestino =
        String(
          destino ||
          ""
        ).trim();


      const motivoFinal =
        String(
          motivo ||
          "Liberación autorizada"
        ).trim();


      const observacionFinal =
        String(
          observacion ||
          ""
        ).trim() ||
        null;


      /* =====================================================
         2. VALIDACIONES INICIALES
         ===================================================== */

      if (
        !inventarioCuarentenaId
      ) {

        return res
          .status(400)
          .json({
            error:
              "Inventario de cuarentena no válido."
          });

      }


      if (
        !detalleCuarentenaBaseId
      ) {

        return res
          .status(400)
          .json({
            error:
              "Lote de cuarentena no válido."
          });

      }


      if (
        !Number.isFinite(
          cantidadLiberar
        ) ||
        cantidadLiberar <= 0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Ingrese una cantidad válida."
          });

      }


      if (
        !bodegaDestino
      ) {

        return res
          .status(400)
          .json({
            error:
              "Seleccione la bodega destino."
          });

      }


      if (
        bodegaDestino
          .toUpperCase() ===
        "CUARENTENA"
      ) {

        return res
          .status(400)
          .json({
            error:
              "La bodega destino no puede ser CUARENTENA."
          });

      }


      /* =====================================================
         3. USUARIO
         ===================================================== */

      const usuarioSesion =
        obtenerUsuarioSesionHC(
          req
        );


      const usuarioId =
        Number(
          usuarioSesion?.id ||
          req.session?.usuario?.id ||
          req.session?.usuarioId ||
          0
        ) || null;


      const usuarioNombre =
        String(
          usuarioSesion?.username ||
          usuarioSesion?.nombreCompleto ||
          req.session?.usuario?.username ||
          req.session?.usuario?.nombreCompleto ||
          "USUARIO"
        ).trim();


      /* =====================================================
         4. INICIAR TRANSACCIÓN
         ===================================================== */

      await transaction.begin();


      /* =====================================================
         5. VALIDAR BODEGA DESTINO
         ===================================================== */

      const bodegaDestinoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "nombre",
            sql.VarChar,
            bodegaDestino
          )

          .query(`

            SELECT TOP 1

              id,
              nombre,
              estado

            FROM dbo.bodegas

            WHERE

              UPPER(
                LTRIM(
                  RTRIM(nombre)
                )
              ) =
              UPPER(
                LTRIM(
                  RTRIM(@nombre)
                )
              )

              AND UPPER(
                    LTRIM(
                      RTRIM(estado)
                    )
                  ) =
                  'ACTIVO'

              AND UPPER(
                    LTRIM(
                      RTRIM(nombre)
                    )
                  ) <>
                  'CUARENTENA'

          `);


      if (
        !bodegaDestinoResult
          .recordset
          .length
      ) {

        throw new Error(
          "La bodega destino no existe o no se encuentra activa."
        );

      }


      const bodegaDestinoReal =
        String(
          bodegaDestinoResult
            .recordset[0]
            .nombre
        ).trim();


      /* =====================================================
         6. INVENTARIO DE CUARENTENA
         ===================================================== */

      const invCuarentenaResult =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            inventarioCuarentenaId
          )

          .query(`

            SELECT TOP 1

              i.id,
              i.producto_id,
              i.bodega,
              i.stock,
              i.stock_minimo,
              i.ubicacion,

              p.codigo,
              p.producto,
              p.categoria,
              p.unidad

            FROM dbo.inventario i
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            INNER JOIN dbo.productos p

              ON p.id =
                 i.producto_id

            WHERE
              i.id = @id

          `);


      if (
        !invCuarentenaResult
          .recordset
          .length
      ) {

        throw new Error(
          "Inventario de cuarentena no encontrado."
        );

      }


      const invCuarentena =
        invCuarentenaResult
          .recordset[0];


      if (
        String(
          invCuarentena.bodega ||
          ""
        )
          .trim()
          .toUpperCase()
        !==
        "CUARENTENA"
      ) {

        throw new Error(
          "El producto seleccionado no pertenece a CUARENTENA."
        );

      }


      /* =====================================================
         7. VALIDAR STOCK GENERAL DE CUARENTENA
         ===================================================== */

      if (
        Number(
          invCuarentena.stock ||
          0
        )
        <
        cantidadLiberar
      ) {

        throw new Error(
          "Stock general insuficiente en CUARENTENA."
        );

      }


      /* =====================================================
         8. LEER LOTE BASE
         ===================================================== */

      const loteBaseResult =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            detalleCuarentenaBaseId
          )

          .query(`

            SELECT TOP 1

              id,
              bodega,
              producto_id,
              codigo,
              codigoproveedor,
              producto,
              categoria,
              lote,
              vencimiento,
              casa_comercial,
              stock_minimo,
              ubicacion

            FROM dbo.detalleEntradas

            WHERE
              id = @id

          `);


      if (
        !loteBaseResult
          .recordset
          .length
      ) {

        throw new Error(
          "Lote de cuarentena no encontrado."
        );

      }


      const loteBase =
        loteBaseResult
          .recordset[0];


      /* =====================================================
         9. VALIDAR LOTE BASE
         ===================================================== */

      if (
        String(
          loteBase.bodega ||
          ""
        )
          .trim()
          .toUpperCase()
        !==
        "CUARENTENA"
      ) {

        throw new Error(
          "El lote seleccionado no pertenece a CUARENTENA."
        );

      }


      if (
        Number(
          loteBase.producto_id
        )
        !==
        Number(
          invCuarentena.producto_id
        )
      ) {

        throw new Error(
          "El lote no corresponde al producto seleccionado."
        );

      }


      /* =====================================================
         10. BUSCAR ESTADO VIGENTE DEL LOTE EN CUARENTENA
         ===================================================== */

      const loteCuarentenaResult =
        await new sql.Request(
          transaction
        )

          .input(
            "producto_id",
            sql.Int,
            Number(
              loteBase.producto_id
            )
          )

          .input(
            "bodega",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "lote",
            sql.VarChar,
            loteBase.lote ||
            ""
          )

          .input(
            "codigoproveedor",
            sql.VarChar,
            loteBase.codigoproveedor ||
            ""
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            loteBase.casa_comercial ||
            ""
          )

          .query(`

            SELECT TOP 1

              id,
              bodega,
              producto_id,
              codigo,
              codigoproveedor,
              producto,
              categoria,
              cantidad,
              stock_lote,
              lote,
              vencimiento,
              casa_comercial,
              stock_minimo,
              ubicacion,
              responsable,
              observacion,
              origen_movimiento

            FROM dbo.detalleEntradas
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              producto_id =
                @producto_id


              AND UPPER(
                    LTRIM(
                      RTRIM(bodega)
                    )
                  ) =
                  'CUARENTENA'


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          codigoproveedor,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @codigoproveedor
                      )
                    )
                  )


              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          casa_comercial,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @casa_comercial
                      )
                    )
                  )

            ORDER BY
              id DESC

          `);


      if (
        !loteCuarentenaResult
          .recordset
          .length
      ) {

        throw new Error(
          "No se encontró el saldo vigente del lote en CUARENTENA."
        );

      }


      const loteCuarentena =
        loteCuarentenaResult
          .recordset[0];


      /* =====================================================
         11. VALIDAR STOCK DEL LOTE
         ===================================================== */

      if (
        Number(
          loteCuarentena.stock_lote ||
          0
        )
        <
        cantidadLiberar
      ) {

        throw new Error(
          `Stock insuficiente en el lote ${loteCuarentena.lote || ""}.`
        );

      }


      const lote =
        loteCuarentena.lote ||
        null;


      const vencimiento =
        loteCuarentena.vencimiento ||
        null;


      const casaComercial =
        loteCuarentena
          .casa_comercial ||
        null;


      const codigoProveedor =
        loteCuarentena
          .codigoproveedor ||
        null;


      const ubicacionOrigen =
        loteCuarentena.ubicacion ||
        invCuarentena.ubicacion ||
        null;


      /* =====================================================
         12. BUSCAR CAPAS ECONÓMICAS EN CUARENTENA

         Se seleccionan:

         producto
         + bodega CUARENTENA
         + lote
         + cantidad disponible

         y se consumen FIFO.
         ===================================================== */

      const capasResult =
        await new sql.Request(
          transaction
        )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invCuarentena.producto_id
            )
          )

          .input(
            "lote",
            sql.VarChar,
            lote ||
            ""
          )

          .query(`

            SELECT

              c.id,

              c.cantidad_disponible,

              c.estado_costo,

              c.costo_unitario,

              c.motivo_sin_costo,

              c.lote,

              c.fecha_vencimiento,

              c.fecha_entrada,

              c.proveedor_id,

              c.codigo_proveedor,

              c.casa_comercial,

              c.referencia_documento,

              c.origen,

              c.origen_id,

              c.capa_origen_id

            FROM dbo.capas_costo_inventario c
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              c.producto_id =
                @producto_id

              AND UPPER(
                    LTRIM(
                      RTRIM(c.bodega)
                    )
                  ) =
                  'CUARENTENA'

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          c.lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )

              AND c.cantidad_disponible > 0

            ORDER BY

              c.fecha_entrada ASC,

              c.id ASC

          `);


      const capasCuarentena =
        capasResult
          .recordset ||
        [];


      const totalCapasDisponible =
        capasCuarentena.reduce(

          (
            total,
            capa
          ) =>

            total +
            Number(
              capa.cantidad_disponible ||
              0
            ),

          0

        );


      if (
        totalCapasDisponible <
        cantidadLiberar
      ) {

        throw new Error(
          `Las capas de costo del lote en CUARENTENA solo tienen ${totalCapasDisponible} unidades disponibles.`
        );

      }


      /* =====================================================
         13. BUSCAR INVENTARIO DESTINO
         ===================================================== */

      const invDestinoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invCuarentena.producto_id
            )
          )

          .input(
            "bodega",
            sql.VarChar,
            bodegaDestinoReal
          )

          .query(`

            SELECT TOP 1

              id,
              stock,
              ubicacion

            FROM dbo.inventario
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              producto_id =
                @producto_id

              AND UPPER(
                    LTRIM(
                      RTRIM(bodega)
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@bodega)
                    )
                  )

          `);


      let inventarioDestinoId =
        null;


      let ubicacionDestino =
        null;


      /* =====================================================
         14. INVENTARIO DESTINO YA EXISTE
         ===================================================== */

      if (
        invDestinoResult
          .recordset
          .length
      ) {

        const existente =
          invDestinoResult
            .recordset[0];


        inventarioDestinoId =
          Number(
            existente.id
          );


        ubicacionDestino =
          existente.ubicacion ||
          null;


        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            inventarioDestinoId
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadLiberar
          )

          .input(
            "responsable",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "observacion",
            sql.VarChar,
            `Liberado desde CUARENTENA${
              observacionFinal
                ? " - " +
                  observacionFinal
                : ""
            }`
          )

          .query(`

            UPDATE dbo.inventario

            SET

              stock =
                ISNULL(
                  stock,
                  0
                ) +
                @cantidad,

              responsable =
                @responsable,

              observacion =
                @observacion,

              fecha_actualizacion =
                GETDATE()

            WHERE
              id = @id

          `);

      }


      /* =====================================================
         15. CREAR INVENTARIO DESTINO
         ===================================================== */

      else {

        const crearDestino =
          await new sql.Request(
            transaction
          )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invCuarentena.producto_id
              )
            )

            .input(
              "bodega",
              sql.VarChar,
              bodegaDestinoReal
            )

            .input(
              "stock",
              sql.Decimal(
                18,
                4
              ),
              cantidadLiberar
            )

            .input(
              "stock_minimo",
              sql.Int,
              Number(
                invCuarentena.stock_minimo ||
                0
              )
            )

            .input(
              "ubicacion",
              sql.VarChar,
              null
            )

            .input(
              "responsable",
              sql.VarChar,
              usuarioNombre
            )

            .input(
              "observacion",
              sql.VarChar,
              `Liberado desde CUARENTENA${
                observacionFinal
                  ? " - " +
                    observacionFinal
                  : ""
              }`
            )

            .query(`

              INSERT INTO dbo.inventario (

                producto_id,
                bodega,
                stock,
                stock_minimo,
                ubicacion,
                responsable,
                observacion

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @producto_id,
                @bodega,
                @stock,
                @stock_minimo,
                @ubicacion,
                @responsable,
                @observacion

              )

            `);


        inventarioDestinoId =
          Number(
            crearDestino
              .recordset[0]
              .id
          );

      }


      /* =====================================================
         16. DESCONTAR STOCK GENERAL DE CUARENTENA

         Directamente.

         NO se recalcula inventario.stock
         únicamente desde lotes.
         ===================================================== */

      const descontarInventario =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            inventarioCuarentenaId
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadLiberar
          )

          .query(`

            UPDATE dbo.inventario

            SET

              stock =
                ISNULL(
                  stock,
                  0
                ) -
                @cantidad,

              fecha_actualizacion =
                GETDATE()

            WHERE

              id = @id

              AND ISNULL(
                    stock,
                    0
                  ) >=
                  @cantidad

          `);


      if (
        !descontarInventario
          .rowsAffected?.[0]
      ) {

        throw new Error(
          "No fue posible descontar el inventario de CUARENTENA."
        );

      }


      /* =====================================================
         17. DESCONTAR LOTE FÍSICO DE CUARENTENA
         ===================================================== */

      const descontarLote =
        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            Number(
              loteCuarentena.id
            )
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadLiberar
          )

          .query(`

            UPDATE dbo.detalleEntradas

            SET

              stock_lote =
                ISNULL(
                  stock_lote,
                  0
                ) -
                @cantidad

            WHERE

              id = @id

              AND ISNULL(
                    stock_lote,
                    0
                  ) >=
                  @cantidad

          `);


      if (
        !descontarLote
          .rowsAffected?.[0]
      ) {

        throw new Error(
          "No fue posible descontar el lote de CUARENTENA."
        );

      }


      /* =====================================================
         18. BUSCAR MISMO LOTE EN DESTINO
         ===================================================== */

      const loteDestinoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "bodega",
            sql.VarChar,
            bodegaDestinoReal
          )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invCuarentena.producto_id
            )
          )

          .input(
            "lote",
            sql.VarChar,
            lote ||
            ""
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            casaComercial ||
            ""
          )

          .input(
            "codigoproveedor",
            sql.VarChar,
            codigoProveedor ||
            ""
          )

          .query(`

            SELECT TOP 1

              id,
              stock_lote,
              vencimiento

            FROM dbo.detalleEntradas
              WITH (
                UPDLOCK,
                HOLDLOCK
              )

            WHERE

              producto_id =
                @producto_id

              AND UPPER(
                    LTRIM(
                      RTRIM(bodega)
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@bodega)
                    )
                  )

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          lote,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(@lote)
                    )
                  )

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          casa_comercial,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @casa_comercial
                      )
                    )
                  )

              AND UPPER(
                    LTRIM(
                      RTRIM(
                        ISNULL(
                          codigoproveedor,
                          ''
                        )
                      )
                    )
                  ) =
                  UPPER(
                    LTRIM(
                      RTRIM(
                        @codigoproveedor
                      )
                    )
                  )

            ORDER BY
              id DESC

          `);


      let detalleDestinoId =
        null;


      /* =====================================================
         19. LOTE YA EXISTE EN DESTINO
         ===================================================== */

      if (
        loteDestinoResult
          .recordset
          .length
      ) {

        detalleDestinoId =
          Number(
            loteDestinoResult
              .recordset[0]
              .id
          );


        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            detalleDestinoId
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadLiberar
          )

          .input(
            "vencimiento",
            sql.Date,
            vencimiento
          )

          .query(`

            UPDATE dbo.detalleEntradas

            SET

              stock_lote =
                ISNULL(
                  stock_lote,
                  0
                ) +
                @cantidad,

              vencimiento =
                ISNULL(
                  @vencimiento,
                  vencimiento
                )

            WHERE
              id = @id

          `);

      }


      /* =====================================================
         20. CREAR LOTE EN DESTINO
         ===================================================== */

      else {

        const crearLote =
          await new sql.Request(
            transaction
          )

            .input(
              "bodega",
              sql.VarChar,
              bodegaDestinoReal
            )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invCuarentena.producto_id
              )
            )

            .input(
              "codigo",
              sql.VarChar,
              invCuarentena.codigo
            )

            .input(
              "codigoproveedor",
              sql.VarChar,
              codigoProveedor
            )

            .input(
              "producto",
              sql.VarChar,
              invCuarentena.producto
            )

            .input(
              "categoria",
              sql.VarChar,
              invCuarentena.categoria ||
              null
            )

            .input(
              "cantidad",
              sql.Decimal(
                18,
                4
              ),
              cantidadLiberar
            )

            .input(
              "stock_lote",
              sql.Decimal(
                18,
                4
              ),
              cantidadLiberar
            )

            .input(
              "lote",
              sql.VarChar,
              lote
            )

            .input(
              "vencimiento",
              sql.Date,
              vencimiento
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              casaComercial
            )

            .input(
              "stock_minimo",
              sql.Int,
              Number(
                invCuarentena.stock_minimo ||
                0
              )
            )

            .input(
              "ubicacion",
              sql.VarChar,
              ubicacionDestino
            )

            .input(
              "responsable",
              sql.VarChar,
              usuarioNombre
            )

            .input(
              "observacion",
              sql.VarChar,
              `Liberación desde CUARENTENA${
                observacionFinal
                  ? " - " +
                    observacionFinal
                  : ""
              }`
            )

            .input(
              "origen_movimiento",
              sql.VarChar,
              "LIBERACION_CUARENTENA"
            )

            .query(`

              INSERT INTO dbo.detalleEntradas (

                bodega,
                producto_id,
                codigo,
                codigoproveedor,
                producto,
                categoria,
                cantidad,
                stock_lote,
                lote,
                vencimiento,
                casa_comercial,
                stock_minimo,
                ubicacion,
                responsable,
                observacion,
                origen_movimiento

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @bodega,
                @producto_id,
                @codigo,
                @codigoproveedor,
                @producto,
                @categoria,
                @cantidad,
                @stock_lote,
                @lote,
                @vencimiento,
                @casa_comercial,
                @stock_minimo,
                @ubicacion,
                @responsable,
                @observacion,
                @origen_movimiento

              )

            `);


        detalleDestinoId =
          Number(
            crearLote
              .recordset[0]
              .id
          );

      }


      /* =====================================================
         21. REGISTRAR HISTORIAL DE LIBERACIÓN

         Lo hacemos ANTES de mover las capas
         porque necesitamos movimientoId.
         ===================================================== */

      const movimientoResult =
        await new sql.Request(
          transaction
        )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "LIBERACION"
          )

          .input(
            "inventario_origen_id",
            sql.Int,
            inventarioCuarentenaId
          )

          .input(
            "inventario_destino_id",
            sql.Int,
            inventarioDestinoId
          )

          .input(
            "detalle_entrada_origen_id",
            sql.Int,
            Number(
              loteCuarentena.id
            )
          )

          .input(
            "detalle_entrada_destino_id",
            sql.Int,
            detalleDestinoId
          )

          .input(
            "codigo",
            sql.VarChar,
            invCuarentena.codigo
          )

          .input(
            "producto",
            sql.VarChar,
            invCuarentena.producto
          )

          .input(
            "lote",
            sql.VarChar,
            lote
          )

          .input(
            "codigo_proveedor",
            sql.VarChar,
            codigoProveedor
          )

          .input(
            "casa_comercial",
            sql.VarChar,
            casaComercial
          )

          .input(
            "vencimiento",
            sql.Date,
            vencimiento
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            cantidadLiberar
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            bodegaDestinoReal
          )

          .input(
            "ubicacion_origen",
            sql.VarChar,
            ubicacionOrigen
          )

          .input(
            "ubicacion_destino",
            sql.VarChar,
            ubicacionDestino
          )

          .input(
            "motivo",
            sql.VarChar,
            motivoFinal
          )

          .input(
            "observacion",
            sql.VarChar,
            observacionFinal
          )

          .input(
            "usuario_id",
            sql.Int,
            usuarioId
          )

          .input(
            "usuario_nombre",
            sql.VarChar,
            usuarioNombre
          )

          .query(`

            INSERT INTO dbo.movimientos_cuarentena (

              tipo_movimiento,
              inventario_origen_id,
              inventario_destino_id,
              detalle_entrada_origen_id,
              detalle_entrada_destino_id,

              codigo,
              producto,
              lote,
              codigo_proveedor,
              casa_comercial,
              vencimiento,
              cantidad,

              bodega_origen,
              bodega_destino,

              ubicacion_origen,
              ubicacion_destino,

              motivo,
              observacion,

              usuario_id,
              usuario_nombre

            )

            OUTPUT

              INSERTED.id,
              INSERTED.fecha_movimiento

            VALUES (

              @tipo_movimiento,
              @inventario_origen_id,
              @inventario_destino_id,
              @detalle_entrada_origen_id,
              @detalle_entrada_destino_id,

              @codigo,
              @producto,
              @lote,
              @codigo_proveedor,
              @casa_comercial,
              @vencimiento,
              @cantidad,

              @bodega_origen,
              @bodega_destino,

              @ubicacion_origen,
              @ubicacion_destino,

              @motivo,
              @observacion,

              @usuario_id,
              @usuario_nombre

            )

          `);


      const movimientoId =
        Number(
          movimientoResult
            .recordset[0]
            .id
        );


      const fechaMovimiento =
        movimientoResult
          .recordset[0]
          .fecha_movimiento;


      /* =====================================================
         22. MOVER CAPAS ECONÓMICAS
         ===================================================== */

      let cantidadPendiente =
        cantidadLiberar;


      let valorConocido =
        0;


      let cantidadCostoPendiente =
        0;


      const capasMovidas =
        [];


      for (
        const capa of
        capasCuarentena
      ) {

        if (
          cantidadPendiente <= 0
        ) {

          break;

        }


        const disponible =
          Number(
            capa.cantidad_disponible ||
            0
          );


        if (
          disponible <= 0
        ) {

          continue;

        }


        const mover =
          Math.min(
            disponible,
            cantidadPendiente
          );


        const nuevoSaldo =
          disponible -
          mover;


        /* ===============================================
           22.1 REDUCIR CAPA DE CUARENTENA
           =============================================== */

        await new sql.Request(
          transaction
        )

          .input(
            "id",
            sql.Int,
            Number(
              capa.id
            )
          )

          .input(
            "saldo",
            sql.Decimal(
              18,
              4
            ),
            nuevoSaldo
          )

          .query(`

            UPDATE dbo.capas_costo_inventario

            SET

              cantidad_disponible =
                @saldo

            WHERE
              id = @id

          `);


        const costoUnitario =

          capa.costo_unitario === null ||
          capa.costo_unitario === undefined

            ? null

            : Number(
                capa.costo_unitario
              );


        const valorMovimiento =

          costoUnitario === null

            ? null

            : mover *
              costoUnitario;


        if (
          valorMovimiento === null
        ) {

          cantidadCostoPendiente +=
            mover;

        }

        else {

          valorConocido +=
            valorMovimiento;

        }


        /* ===============================================
           22.2 CREAR NUEVA CAPA EN DESTINO
           =============================================== */

        const nuevaCapaResult =
          await new sql.Request(
            transaction
          )

            .input(
              "producto_id",
              sql.Int,
              Number(
                invCuarentena.producto_id
              )
            )

            .input(
              "bodega",
              sql.VarChar,
              bodegaDestinoReal
            )

            .input(
              "lote",
              sql.VarChar,
              capa.lote ||
              lote ||
              null
            )

            .input(
              "fecha_vencimiento",
              sql.Date,
              capa.fecha_vencimiento ||
              vencimiento ||
              null
            )

            .input(
              "origen",
              sql.VarChar,
              "LIBERACION_CUARENTENA"
            )

            .input(
              "origen_id",
              sql.Int,
              movimientoId
            )

            .input(
              "estado_costo",
              sql.VarChar,
              capa.estado_costo
            )

            .input(
              "costo_unitario",
              sql.Decimal(
                18,
                6
              ),
              costoUnitario
            )

            .input(
              "motivo_sin_costo",
              sql.VarChar,
              capa.motivo_sin_costo ||
              null
            )

            .input(
              "cantidad_original",
              sql.Decimal(
                18,
                4
              ),
              mover
            )

            .input(
              "cantidad_disponible",
              sql.Decimal(
                18,
                4
              ),
              mover
            )

            .input(
              "capa_origen_id",
              sql.Int,
              Number(
                capa.id
              )
            )

            .input(
              "proveedor_id",
              sql.Int,
              capa.proveedor_id ||
              null
            )

            .input(
              "referencia_documento",
              sql.VarChar,
              `LIBERACION-${movimientoId}`
            )

            .input(
              "observacion",
              sql.VarChar,
              `${motivoFinal}${
                observacionFinal
                  ? " - " +
                    observacionFinal
                  : ""
              }`
            )

            .input(
              "usuario_creacion",
              sql.VarChar,
              usuarioNombre
            )

            .input(
              "fecha_entrada",
              sql.DateTime2,
              capa.fecha_entrada ||
              fechaMovimiento
            )

            .input(
              "codigo_proveedor",
              sql.VarChar,
              capa.codigo_proveedor ||
              codigoProveedor ||
              null
            )

            .input(
              "casa_comercial",
              sql.VarChar,
              capa.casa_comercial ||
              casaComercial ||
              null
            )

            .query(`

              INSERT INTO dbo.capas_costo_inventario (

                producto_id,
                bodega,
                lote,
                fecha_vencimiento,

                origen,
                origen_id,

                estado_costo,
                costo_unitario,
                motivo_sin_costo,

                cantidad_original,
                cantidad_disponible,

                capa_origen_id,

                proveedor_id,
                referencia_documento,

                observacion,
                usuario_creacion,
                fecha_entrada,

                codigo_proveedor,
                casa_comercial

              )

              OUTPUT
                INSERTED.id

              VALUES (

                @producto_id,
                @bodega,
                @lote,
                @fecha_vencimiento,

                @origen,
                @origen_id,

                @estado_costo,
                @costo_unitario,
                @motivo_sin_costo,

                @cantidad_original,
                @cantidad_disponible,

                @capa_origen_id,

                @proveedor_id,
                @referencia_documento,

                @observacion,
                @usuario_creacion,
                @fecha_entrada,

                @codigo_proveedor,
                @casa_comercial

              )

            `);


        const capaDestinoId =
          Number(
            nuevaCapaResult
              .recordset[0]
              .id
          );


        /* ===============================================
           22.3 MOVIMIENTO ECONÓMICO
                LIBERACION_SALIDA
           =============================================== */

        await new sql.Request(
          transaction
        )

          .input(
            "capa_id",
            sql.Int,
            Number(
              capa.id
            )
          )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invCuarentena.producto_id
            )
          )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "LIBERACION_SALIDA"
          )

          .input(
            "documento",
            sql.VarChar,
            `LIBERACION-${movimientoId}`
          )

          .input(
            "documento_id",
            sql.Int,
            movimientoId
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            bodegaDestinoReal
          )

          .input(
            "lote",
            sql.VarChar,
            capa.lote ||
            lote ||
            null
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            mover
          )

          .input(
            "costo_unitario",
            sql.Decimal(
              18,
              6
            ),
            costoUnitario
          )

          .input(
            "valor_movimiento",
            sql.Decimal(
              18,
              6
            ),
            valorMovimiento
          )

          .input(
            "estado_costo",
            sql.VarChar,
            capa.estado_costo
          )

          .input(
            "usuario",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "observacion",
            sql.VarChar,
            motivoFinal
          )

          .query(`

            INSERT INTO dbo.movimientos_capas_costo (

              capa_id,
              producto_id,
              tipo_movimiento,

              documento,
              documento_id,

              bodega_origen,
              bodega_destino,

              lote,
              cantidad,

              costo_unitario,
              valor_movimiento,

              estado_costo,

              usuario,
              observacion

            )

            VALUES (

              @capa_id,
              @producto_id,
              @tipo_movimiento,

              @documento,
              @documento_id,

              @bodega_origen,
              @bodega_destino,

              @lote,
              @cantidad,

              @costo_unitario,
              @valor_movimiento,

              @estado_costo,

              @usuario,
              @observacion

            )

          `);


        /* ===============================================
           22.4 MOVIMIENTO ECONÓMICO
                LIBERACION_ENTRADA
           =============================================== */

        await new sql.Request(
          transaction
        )

          .input(
            "capa_id",
            sql.Int,
            capaDestinoId
          )

          .input(
            "producto_id",
            sql.Int,
            Number(
              invCuarentena.producto_id
            )
          )

          .input(
            "tipo_movimiento",
            sql.VarChar,
            "LIBERACION_ENTRADA"
          )

          .input(
            "documento",
            sql.VarChar,
            `LIBERACION-${movimientoId}`
          )

          .input(
            "documento_id",
            sql.Int,
            movimientoId
          )

          .input(
            "bodega_origen",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "bodega_destino",
            sql.VarChar,
            bodegaDestinoReal
          )

          .input(
            "lote",
            sql.VarChar,
            capa.lote ||
            lote ||
            null
          )

          .input(
            "cantidad",
            sql.Decimal(
              18,
              4
            ),
            mover
          )

          .input(
            "costo_unitario",
            sql.Decimal(
              18,
              6
            ),
            costoUnitario
          )

          .input(
            "valor_movimiento",
            sql.Decimal(
              18,
              6
            ),
            valorMovimiento
          )

          .input(
            "estado_costo",
            sql.VarChar,
            capa.estado_costo
          )

          .input(
            "usuario",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "observacion",
            sql.VarChar,
            motivoFinal
          )

          .query(`

            INSERT INTO dbo.movimientos_capas_costo (

              capa_id,
              producto_id,
              tipo_movimiento,

              documento,
              documento_id,

              bodega_origen,
              bodega_destino,

              lote,
              cantidad,

              costo_unitario,
              valor_movimiento,

              estado_costo,

              usuario,
              observacion

            )

            VALUES (

              @capa_id,
              @producto_id,
              @tipo_movimiento,

              @documento,
              @documento_id,

              @bodega_origen,
              @bodega_destino,

              @lote,
              @cantidad,

              @costo_unitario,
              @valor_movimiento,

              @estado_costo,

              @usuario,
              @observacion

            )

          `);


        capasMovidas.push({

          capa_origen_id:
            Number(
              capa.id
            ),

          capa_destino_id:
            capaDestinoId,

          cantidad:
            mover,

          costo_unitario:
            costoUnitario,

          valor:
            valorMovimiento,

          estado_costo:
            capa.estado_costo

        });


        cantidadPendiente -=
          mover;

      }


      /* =====================================================
         23. VALIDAR QUE TODO FUE MOVIDO
         ===================================================== */

      if (
        cantidadPendiente >
        0.0001
      ) {

        throw new Error(
          "No fue posible liberar completamente las capas de costo."
        );

      }


      /* =====================================================
         24. AUDITORÍA
         ===================================================== */

      try {

        await new sql.Request(
          transaction
        )

          .input(
            "usuario",
            sql.VarChar,
            usuarioNombre
          )

          .input(
            "modulo",
            sql.VarChar,
            "CUARENTENA"
          )

          .input(
            "accion",
            sql.VarChar,
            "LIBERAR DE CUARENTENA"
          )

          .input(
            "detalle",
            sql.VarChar,
            `${
              invCuarentena.codigo
            } | ${
              invCuarentena.producto
            } | Lote: ${
              lote ||
              "SIN LOTE"
            } | Cantidad: ${
              cantidadLiberar
            } | Destino: ${
              bodegaDestinoReal
            }`
          )

          .query(`

            INSERT INTO dbo.auditoria_eventos (

              usuario,
              modulo,
              accion,
              detalle

            )

            VALUES (

              @usuario,
              @modulo,
              @accion,
              @detalle

            )

          `);

      } catch (_) {}


      /* =====================================================
         25. COMMIT
         ===================================================== */

      await transaction.commit();


      res.json({

        ok: true,

        mensaje:
          "Producto liberado de cuarentena correctamente.",

        movimiento_id:
          movimientoId,

        fecha_movimiento:
          fechaMovimiento,

        capas_costo:
          capasMovidas,

        resumen_costo: {

          cantidad:
            cantidadLiberar,

          valor_conocido:
            valorConocido,

          cantidad_costo_pendiente:
            cantidadCostoPendiente

        },

        producto: {

          codigo:
            invCuarentena.codigo,

          nombre:
            invCuarentena.producto,

          lote,

          vencimiento,

          cantidad:
            cantidadLiberar,

          origen:
            "CUARENTENA",

          destino:
            bodegaDestinoReal

        }

      });


    } catch (error) {

      try {

        await transaction.rollback();

      } catch (_) {}


      console.error(
        "ERROR LIBERAR CUARENTENA:",
        error
      );


      res
        .status(500)
        .json({

          error:
            error.message ||
            "No se pudo liberar el producto de cuarentena."

        });

    }

  }
);