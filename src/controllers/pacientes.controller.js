const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const { getPool, sql } = require("../config/db");
const { PATHS } = require("../config/constants");
const AppError = require("../utils/AppError");

/**
 * Listar todos los pacientes.
 */
const listarPacientes = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      p.*,
      r.apellido1 AS rec_apellido1,
      r.apellido2 AS rec_apellido2,
      r.nombre1 AS rec_nombre1,
      r.nombre2 AS rec_nombre2
    FROM dbo.pacientes p
    LEFT JOIN dbo.reclutadores r ON p.reclutador_id = r.id
    ORDER BY p.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Crear un paciente asignando automáticamente el correlativo de archivo en transacción.
 */
const crearPaciente = async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const r1 = await new sql.Request(transaction).query(`
      SELECT TOP 1 id, numero_actual
      FROM dbo.configuracion_archivo
      ORDER BY id DESC
    `);

    if (!r1.recordset.length) {
      throw new Error("No existe configuración de número de archivo.");
    }

    const cfg = r1.recordset[0];
    const archivo = cfg.numero_actual;

    const {
      cedulaPaciente,
      estadoCivil,
      sexo,
      telefonoFijo,
      telefonoCelular,
      correo,
      pacApellido1,
      pacApellido2,
      pacNombre1,
      pacNombre2,
      famApellido1,
      famApellido2,
      famNombre1,
      famNombre2,
      cedulaFamiliar,
      fechaNacimiento,
      edad,
      lugarNacimiento,
      fechaProcedimiento,
      reclutadorId,
      provincia,
      canton,
      parroquia,
      barrio,
      callePrincipal,
      calleSecundaria,
      referencia,
      ocupacion,
      parentescoFamiliar,
      direccionFamiliar,
      telefonoFamiliar,
      tipoSeguro,
      tipoAfiliado
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
        INSERT INTO dbo.pacientes (
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
        UPDATE dbo.configuracion_archivo
        SET numero_actual = @nuevoNumero
        WHERE id = @id
      `);

    await transaction.commit();

    res.json({ ok: true, archivo });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}
    throw error;
  }
};

/**
 * Listar pacientes con estado de atención ACTIVO junto a datos complementarios.
 */
const listarPacientesActivos = async (req, res) => {
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
    FROM dbo.pacientes p
    LEFT JOIN dbo.reclutadores r ON p.reclutador_id = r.id
    LEFT JOIN dbo.pacientes_complementarios pc ON p.id = pc.paciente_id
    WHERE p.estado_atencion = 'ACTIVO'
    ORDER BY p.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Listar pacientes con estado NO_ATENDIDO.
 */
const listarPacientesNoAtendidos = async (req, res) => {
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
    FROM dbo.pacientes p
    LEFT JOIN dbo.reclutadores r ON p.reclutador_id = r.id
    LEFT JOIN dbo.pacientes_complementarios pc ON p.id = pc.paciente_id
    WHERE p.estado_atencion = 'NO_ATENDIDO'
    ORDER BY p.id DESC
  `);

  res.json(result.recordset);
};

/**
 * Mover paciente al estado NO_ATENDIDO con motivo.
 */
const marcarNoAtendido = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .input("motivo", sql.VarChar, motivo || null)
    .query(`
      UPDATE dbo.pacientes
      SET
        estado_atencion = 'NO_ATENDIDO',
        motivo_no_atendido = @motivo
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/**
 * Reactivar un paciente previamente no atendido.
 */
const reactivarPaciente = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
    .query(`
      UPDATE dbo.pacientes
      SET
        estado_atencion = 'ACTIVO',
        motivo_no_atendido = NULL
      WHERE id = @id
    `);

  res.json({ ok: true });
};

/**
 * Consultar paciente específico por ID.
 */
const obtenerPacientePorId = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, Number(id))
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
      FROM dbo.pacientes p
      LEFT JOIN dbo.reclutadores r ON p.reclutador_id = r.id
      LEFT JOIN dbo.pacientes_complementarios pc ON p.id = pc.paciente_id
      WHERE p.id = @id
    `);

  if (!result.recordset.length) {
    throw new AppError("Paciente no encontrado", 404);
  }

  res.json(result.recordset[0]);
};

/**
 * Guardar o actualizar datos complementarios del paciente.
 */
const guardarComplementarios = async (req, res) => {
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
  const existe = await pool
    .request()
    .input("paciente_id", sql.Int, Number(id))
    .query(`
      SELECT id FROM dbo.pacientes_complementarios
      WHERE paciente_id = @paciente_id
    `);

  const request = pool
    .request()
    .input("paciente_id", sql.Int, Number(id))
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
    .input("cuidados", sql.Bit, cuidados ? 1 : 0);

  if (existe.recordset.length) {
    await request.query(`
      UPDATE dbo.pacientes_complementarios
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
    await request.query(`
      INSERT INTO dbo.pacientes_complementarios (
        paciente_id, dispensario, organizacion, cvv, t_procedimiento, stent_utilizado,
        mes, anio, cirujano, anestesiologo, radiologo, habitacion, alta,
        uso_sala, laboratorios, hospitalizacion, alimentacion, cuidados
      )
      VALUES (
        @paciente_id, @dispensario, @organizacion, @cvv, @t_procedimiento, @stent_utilizado,
        @mes, @anio, @cirujano, @anestesiologo, @radiologo, @habitacion, @alta,
        @uso_sala, @laboratorios, @hospitalizacion, @alimentacion, @cuidados
      )
    `);
  }

  res.json({ ok: true });
};

/**
 * Obtener datos complementarios de un paciente.
 */
const obtenerComplementarios = async (req, res) => {
  const { id } = req.params;
  const pool = await getPool();

  const result = await pool
    .request()
    .input("paciente_id", sql.Int, Number(id))
    .query(`
      SELECT * FROM dbo.pacientes_complementarios
      WHERE paciente_id = @paciente_id
    `);

  res.json(result.recordset[0] || {});
};

/**
 * Actualizar datos de un paciente.
 */
const actualizarPaciente = async (req, res) => {
  const { id } = req.params;
  const {
    cedulaPaciente,
    estadoCivil,
    sexo,
    telefonoFijo,
    telefonoCelular,
    correo,
    pacApellido1,
    pacApellido2,
    pacNombre1,
    pacNombre2,
    famApellido1,
    famApellido2,
    famNombre1,
    famNombre2,
    cedulaFamiliar,
    fechaNacimiento,
    edad,
    lugarNacimiento,
    fechaProcedimiento,
    reclutadorId,
    provincia,
    canton,
    parroquia,
    barrio,
    callePrincipal,
    calleSecundaria,
    referencia,
    ocupacion,
    parentescoFamiliar,
    direccionFamiliar,
    telefonoFamiliar,
    tipoSeguro,
    tipoAfiliado
  } = req.body;

  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, Number(id))
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
      UPDATE dbo.pacientes
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
};

/**
 * Importación masiva de pacientes desde archivo Excel (.xlsx).
 */
const importarPacientesExcel = async (req, res) => {
  if (!req.file) {
    throw new AppError("No se recibió ningún archivo", 400);
  }

  const workbook = XLSX.read(req.file.buffer, {
    type: "buffer",
    cellDates: true
  });

  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

  if (!filas.length) {
    throw new AppError("El archivo está vacío", 400);
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const cfgResult = await new sql.Request(transaction).query(`
      SELECT TOP 1 id, numero_actual
      FROM dbo.configuracion_archivo
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
          SELECT TOP 1 id FROM dbo.pacientes WHERE cedula_paciente = @cedula_paciente
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
          .query(`SELECT TOP 1 id FROM dbo.reclutadores WHERE id = @id`);

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
          INSERT INTO dbo.pacientes (
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
        UPDATE dbo.configuracion_archivo
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
    try {
      await transaction.rollback();
    } catch (_) {}
    throw error;
  }
};

/**
 * Subir un archivo adjunto a un paciente.

 */
const subirArchivoPaciente = async (req, res) => {
  const pacienteId = Number(req.params.id);

  if (!req.file) {
    throw new AppError("No se recibió archivo", 400);
  }

  const pool = await getPool();

  const pacienteExiste = await pool.request()
    .input("id", sql.Int, pacienteId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.pacientes
      WHERE id = @id
    `);

  if (!pacienteExiste.recordset.length) {
    throw new AppError("Paciente no encontrado", 404);
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
      INSERT INTO dbo.pacientes_archivos (
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
};

/**
 * Listar archivos adjuntos de un paciente.
 */
const listarArchivosPaciente = async (req, res) => {
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
      FROM dbo.pacientes_archivos
      WHERE paciente_id = @paciente_id
      ORDER BY id DESC
    `);

  res.json(result.recordset);
};

/**
 * Descargar un archivo de paciente.
 */
const descargarArchivoPaciente = async (req, res) => {
  const archivoId = Number(req.params.archivoId);
  const pool = await getPool();

  const result = await pool.request()
    .input("id", sql.Int, archivoId)
    .query(`
      SELECT TOP 1
        nombre_original,
        nombre_guardado
      FROM dbo.pacientes_archivos
      WHERE id = @id
    `);

  if (!result.recordset.length) {
    throw new AppError("Archivo no encontrado", 404);
  }

  const archivo = result.recordset[0];
  const rutaCompleta = path.join(PATHS.UPLOADS, archivo.nombre_guardado);

  if (!fs.existsSync(rutaCompleta)) {
    throw new AppError("El archivo no existe en el servidor", 404);
  }

  res.download(rutaCompleta, archivo.nombre_original);
};

/**
 * Eliminar un archivo de paciente.
 */
const eliminarArchivoPaciente = async (req, res) => {
  const archivoId = Number(req.params.archivoId);
  const pool = await getPool();

  const result = await pool.request()
    .input("id", sql.Int, archivoId)
    .query(`
      SELECT TOP 1
        id,
        nombre_guardado,
        ruta_archivo
      FROM dbo.pacientes_archivos
      WHERE id = @id
    `);

  if (!result.recordset.length) {
    throw new AppError("Archivo no encontrado", 404);
  }

  const archivo = result.recordset[0];
  const rutaRelativa = String(archivo.ruta_archivo || "").replace(/^\/+/, "");
  const rutaCompleta = path.join(PATHS.ROOT, ...rutaRelativa.split("/"));

  await pool.request()
    .input("id", sql.Int, archivoId)
    .query(`
      DELETE FROM dbo.pacientes_archivos
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
        INSERT INTO dbo.auditoria_eventos (usuario, modulo, accion, detalle)
        VALUES (@usuario, @modulo, @accion, @detalle)
      `);
  } catch (_) {}

  res.json({ ok: true });
};

module.exports = {
  listarPacientes,
  crearPaciente,
  listarPacientesActivos,
  listarPacientesNoAtendidos,
  marcarNoAtendido,
  reactivarPaciente,
  subirArchivoPaciente,
  listarArchivosPaciente,
  descargarArchivoPaciente,
  eliminarArchivoPaciente,
  obtenerPacientePorId,
  guardarComplementarios,
  obtenerComplementarios,
  actualizarPaciente,
  importarPacientesExcel
};

