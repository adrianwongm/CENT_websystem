const path = require("path");
const fs = require("fs");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const { obtenerUsuarioSesionHC } = require("../middlewares/auth.middleware");
const AppError = require("../utils/AppError");

/**
 * Listar categorías de profesionales de la salud.
 */
const listarCategorias = async (req, res) => {
  const pool = await getPool();
  const resultado = await pool.request().query(`
    SELECT id, nombre, estado
    FROM dbo.profesionales_categorias
    ORDER BY nombre;
  `);

  res.json({
    ok: true,
    categorias: resultado.recordset || []
  });
};

/**
 * Listar especialidades médicas.
 */
const listarEspecialidades = async (req, res) => {
  const pool = await getPool();
  const resultado = await pool.request().query(`
    SELECT id, nombre, estado
    FROM dbo.profesionales_especialidades
    ORDER BY nombre;
  `);

  res.json({
    ok: true,
    especialidades: resultado.recordset || []
  });
};

/**
 * Listar y buscar profesionales de la salud.
 */
const listarProfesionales = async (req, res) => {
  const buscar = String(req.query.buscar || "").trim();
  const soloActivos = String(req.query.soloActivos || "").toLowerCase() === "true";

  const pool = await getPool();
  const solicitud = pool.request().input("buscar", `%${buscar}%`);

  const resultado = await solicitud.query(`
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
    INNER JOIN dbo.profesionales_categorias c ON c.id = p.categoria_id
    INNER JOIN dbo.profesionales_especialidades e ON e.id = p.especialidad_id
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
      ${soloActivos ? "AND p.estado = 'ACTIVO'" : ""}
    ORDER BY
      p.primer_apellido,
      p.segundo_apellido,
      p.primer_nombre,
      p.segundo_nombre;
  `);

  res.json({
    ok: true,
    profesionales: resultado.recordset || []
  });
};

/**
 * Registrar un nuevo profesional de la salud.
 */
const crearProfesional = async (req, res) => {
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

  const primerNombreLimpio = String(primerNombre || "").trim().toUpperCase();
  const segundoNombreLimpio = String(segundoNombre || "").trim().toUpperCase();
  const primerApellidoLimpio = String(primerApellido || "").trim().toUpperCase();
  const segundoApellidoLimpio = String(segundoApellido || "").trim().toUpperCase();
  const cedulaLimpia = String(cedula || "").trim();
  const tipoIdentificacionLimpio = String(tipoIdentificacion || "CÉDULA").trim().toUpperCase();
  const registroLimpio = String(registroProfesional || "").trim().toUpperCase();

  if (
    !primerNombreLimpio ||
    !primerApellidoLimpio ||
    !cedulaLimpia ||
    !Number(categoriaId) ||
    !Number(especialidadId)
  ) {
    throw new AppError("Completa los datos obligatorios del profesional", 400);
  }

  if (tipoIdentificacionLimpio === "CÉDULA" && !/^\d{10}$/.test(cedulaLimpia)) {
    throw new AppError("La cédula debe contener 10 dígitos", 400);
  }

  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const pool = await getPool();

  try {
    const resultado = await pool
      .request()
      .input("primer_nombre", primerNombreLimpio)
      .input("segundo_nombre", segundoNombreLimpio || null)
      .input("primer_apellido", primerApellidoLimpio)
      .input("segundo_apellido", segundoApellidoLimpio || null)
      .input("tipo_identificacion", tipoIdentificacionLimpio)
      .input("cedula", cedulaLimpia)
      .input("categoria_id", Number(categoriaId))
      .input("especialidad_id", Number(especialidadId))
      .input("registro_profesional", registroLimpio || null)
      .input("creado_por_username", usuarioSesion.username)
      .input("creado_por_nombre", usuarioSesion.nombreCompleto)
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

    res.status(201).json({
      ok: true,
      mensaje: "Profesional registrado correctamente",
      profesionalId: resultado.recordset?.[0]?.id
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe un profesional con esa cédula", 409);
    }
    throw error;
  }
};

/**
 * Editar datos de un profesional de la salud.
 */
const editarProfesional = async (req, res) => {
  const profesionalId = Number(req.params.id);

  if (!Number.isInteger(profesionalId) || profesionalId <= 0) {
    throw new AppError("El identificador del profesional no es válido", 400);
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

  const primerNombreLimpio = String(primerNombre || "").trim().toUpperCase();
  const segundoNombreLimpio = String(segundoNombre || "").trim().toUpperCase();
  const primerApellidoLimpio = String(primerApellido || "").trim().toUpperCase();
  const segundoApellidoLimpio = String(segundoApellido || "").trim().toUpperCase();
  const cedulaLimpia = String(cedula || "").trim();

  if (
    !primerNombreLimpio ||
    !primerApellidoLimpio ||
    !cedulaLimpia ||
    !Number(categoriaId) ||
    !Number(especialidadId)
  ) {
    throw new AppError("Completa los datos obligatorios", 400);
  }

  const usuarioSesion = obtenerUsuarioSesionHC(req);
  const pool = await getPool();

  try {
    const resultado = await pool
      .request()
      .input("id", profesionalId)
      .input("primer_nombre", primerNombreLimpio)
      .input("segundo_nombre", segundoNombreLimpio || null)
      .input("primer_apellido", primerApellidoLimpio)
      .input("segundo_apellido", segundoApellidoLimpio || null)
      .input("tipo_identificacion", String(tipoIdentificacion || "CÉDULA").trim().toUpperCase())
      .input("cedula", cedulaLimpia)
      .input("categoria_id", Number(categoriaId))
      .input("especialidad_id", Number(especialidadId))
      .input("registro_profesional", String(registroProfesional || "").trim().toUpperCase() || null)
      .input("modificado_por_username", usuarioSesion.username)
      .input("modificado_por_nombre", usuarioSesion.nombreCompleto)
      .query(`
        UPDATE dbo.profesionales_salud
        SET
          primer_nombre = @primer_nombre,
          segundo_nombre = @segundo_nombre,
          primer_apellido = @primer_apellido,
          segundo_apellido = @segundo_apellido,
          tipo_identificacion = @tipo_identificacion,
          cedula = @cedula,
          categoria_id = @categoria_id,
          especialidad_id = @especialidad_id,
          registro_profesional = @registro_profesional,
          fecha_modificacion = SYSUTCDATETIME(),
          modificado_por_username = @modificado_por_username,
          modificado_por_nombre = @modificado_por_nombre
        WHERE id = @id;
      `);

    if (resultado.rowsAffected[0] === 0) {
      throw new AppError("No se encontró el profesional", 404);
    }

    res.json({
      ok: true,
      mensaje: "Profesional actualizado correctamente"
    });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      throw new AppError("Ya existe otro profesional con esa cédula", 409);
    }
    throw error;
  }
};

/**
 * Alternar estado ACTIVO / INACTIVO de un profesional de la salud.
 */
const cambiarEstadoProfesional = async (req, res) => {
  const profesionalId = Number(req.params.id);

  if (!Number.isInteger(profesionalId) || profesionalId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("id", profesionalId)
    .query(`
      UPDATE dbo.profesionales_salud
      SET
        estado =
          CASE
            WHEN estado = 'ACTIVO' THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END,
        fecha_modificacion = SYSUTCDATETIME()
      OUTPUT INSERTED.estado
      WHERE id = @id;
    `);

  const nuevoEstado = resultado.recordset?.[0]?.estado;
  if (!nuevoEstado) {
    throw new AppError("No se encontró el profesional", 404);
  }

  res.json({
    ok: true,
    estado: nuevoEstado,
    mensaje: `Profesional ${nuevoEstado.toLowerCase()} correctamente`
  });
};

/**
 * Guardar rutas de firma y sello cargadas para un profesional.
 */
const guardarImagenesProfesional = async (req, res) => {
  const profesionalId = Number(req.params.id);

  if (!Number.isInteger(profesionalId) || profesionalId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  const archivoFirma = req.files?.firma?.[0];
  const archivoSello = req.files?.sello?.[0];

  if (!archivoFirma && !archivoSello) {
    throw new AppError("Selecciona una firma o un sello", 400);
  }

  const rutaFirma = archivoFirma
    ? path.relative(PATHS.ROOT, archivoFirma.path)
    : null;

  const rutaSello = archivoSello
    ? path.relative(PATHS.ROOT, archivoSello.path)
    : null;

  const pool = await getPool();
  const solicitud = pool.request().input("id", profesionalId);

  let consulta = `UPDATE dbo.profesionales_salud SET `;
  const cambios = [];

  if (rutaFirma) {
    solicitud.input("firma_ruta", rutaFirma);
    cambios.push("firma_ruta = @firma_ruta");
  }

  if (rutaSello) {
    solicitud.input("sello_ruta", rutaSello);
    cambios.push("sello_ruta = @sello_ruta");
  }

  cambios.push("fecha_modificacion = SYSUTCDATETIME()");
  consulta += cambios.join(", ") + " WHERE id = @id;";

  const resultado = await solicitud.query(consulta);

  if (resultado.rowsAffected[0] === 0) {
    throw new AppError("No se encontró el profesional", 404);
  }

  res.json({
    ok: true,
    mensaje: "Firma y sello guardados correctamente",
    firmaRuta: rutaFirma,
    selloRuta: rutaSello
  });
};

/**
 * Consultar un profesional por su ID.
 */
const obtenerProfesionalPorId = async (req, res) => {
  const profesionalId = Number(req.params.id);

  if (!Number.isInteger(profesionalId) || profesionalId <= 0) {
    throw new AppError("Identificador no válido", 400);
  }

  const pool = await getPool();
  const resultado = await pool
    .request()
    .input("id", profesionalId)
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
      INNER JOIN dbo.profesionales_categorias c ON c.id = p.categoria_id
      INNER JOIN dbo.profesionales_especialidades e ON e.id = p.especialidad_id
      WHERE p.id = @id;
    `);

  const profesional = resultado.recordset?.[0];
  if (!profesional) {
    throw new AppError("No se encontró el profesional", 404);
  }

  res.json({
    ok: true,
    profesional
  });
};

/**
 * Servir el archivo físico de la firma digital de un profesional.
 */
const obtenerFirmaProfesional = async (req, res) => {
  const profesionalId = Number(req.params.id);
  const pool = await getPool();

  const resultado = await pool
    .request()
    .input("id", profesionalId)
    .query(`
      SELECT firma_ruta
      FROM dbo.profesionales_salud
      WHERE id = @id;
    `);

  const rutaRelativa = resultado.recordset?.[0]?.firma_ruta;
  if (!rutaRelativa) {
    throw new AppError("El profesional no tiene firma", 404);
  }

  const rutaAbsoluta = path.resolve(PATHS.ROOT, rutaRelativa);
  const carpetaPermitida = path.resolve(PATHS.ARCHIVOS_PROFESIONALES);

  if (!rutaAbsoluta.startsWith(carpetaPermitida) || !fs.existsSync(rutaAbsoluta)) {
    throw new AppError("No se encontró la firma", 404);
  }

  res.sendFile(rutaAbsoluta);
};

/**
 * Servir el archivo físico del sello digital de un profesional.
 */
const obtenerSelloProfesional = async (req, res) => {
  const profesionalId = Number(req.params.id);
  const pool = await getPool();

  const resultado = await pool
    .request()
    .input("id", profesionalId)
    .query(`
      SELECT sello_ruta
      FROM dbo.profesionales_salud
      WHERE id = @id;
    `);

  const rutaRelativa = resultado.recordset?.[0]?.sello_ruta;
  if (!rutaRelativa) {
    throw new AppError("El profesional no tiene sello", 404);
  }

  const rutaAbsoluta = path.resolve(PATHS.ROOT, rutaRelativa);
  const carpetaPermitida = path.resolve(PATHS.ARCHIVOS_PROFESIONALES);

  if (!rutaAbsoluta.startsWith(carpetaPermitida) || !fs.existsSync(rutaAbsoluta)) {
    throw new AppError("No se encontró el sello", 404);
  }

  res.sendFile(rutaAbsoluta);
};

module.exports = {
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
};
