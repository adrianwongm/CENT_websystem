const { getPool, sql } = require("../config/db");
const { obtenerUsuarioSesionHC } = require("./auth.middleware");

/**
 * Middleware para requerir un permiso específico al usuario o su rol.
 * Si el usuario tiene rol ADMIN, se otorga acceso directo.
 * Extraído de la lógica original de server.js.
 * @param {string} codigoPermiso Código único del permiso a verificar
 */
function requirePermission(codigoPermiso) {
  return async function (req, res, next) {
    try {
      const usuarioSesion = obtenerUsuarioSesionHC(req);

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

      // ADMIN siempre conserva acceso total
      if (rol === "ADMIN") {
        return next();
      }

      const pool = await getPool();

      const resultado = await pool
        .request()
        .input("usuario_id", sql.Int, usuarioId)
        .input("rol", sql.VarChar(50), rol)
        .input("permiso_codigo", sql.VarChar(120), codigoPermiso)
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
            ON up.usuario_id = base.usuario_id
           AND up.permiso_codigo = base.permiso_codigo
          LEFT JOIN dbo.roles_permisos rp
            ON UPPER(LTRIM(RTRIM(rp.rol))) = UPPER(LTRIM(RTRIM(base.rol)))
           AND rp.permiso_codigo = base.permiso_codigo;
        `);

      const permitido = Number(resultado.recordset?.[0]?.permitido || 0) === 1;

      if (!permitido) {
        return res.status(403).json({
          error: "No tiene permiso para realizar esta acción.",
          permiso: codigoPermiso
        });
      }

      return next();
    } catch (error) {
      console.error("ERROR VERIFICANDO PERMISO:", codigoPermiso, error);
      return res.status(500).json({
        error: "No se pudo verificar el permiso del usuario."
      });
    }
  };
}

/**
 * Middleware para validar que el usuario cuente con al menos uno de los permisos provistos.
 * Si el usuario tiene rol ADMIN, se otorga acceso directo.
 * Extraído de la lógica original de server.js.
 * @param {string[]} codigosPermisos Lista de permisos válidos
 */
function requireAnyPermission(codigosPermisos) {
  return async function (req, res, next) {
    try {
      const usuarioSesion = obtenerUsuarioSesionHC(req);

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

      // ADMIN siempre conserva acceso total
      if (rol === "ADMIN") {
        return next();
      }

      if (!Array.isArray(codigosPermisos) || codigosPermisos.length === 0) {
        return res.status(403).json({
          error: "No tiene permisos configurados para esta acción."
        });
      }

      const pool = await getPool();

      const request = pool
        .request()
        .input("usuario_id", sql.Int, usuarioId)
        .input("rol", sql.VarChar(50), rol);

      const valores = [];

      codigosPermisos.forEach((codigo, index) => {
        const nombre = `permiso${index}`;
        request.input(nombre, sql.VarChar(120), codigo);
        valores.push(`(@${nombre})`);
      });

      const resultado = await request.query(`
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
         AND up.permiso_codigo = base.permiso_codigo
        LEFT JOIN dbo.roles_permisos rp
          ON UPPER(LTRIM(RTRIM(rp.rol))) = @rol
         AND rp.permiso_codigo = base.permiso_codigo;
      `);

      const tienePermiso = resultado.recordset.some(
        (fila) => Number(fila.permitido || 0) === 1
      );

      if (!tienePermiso) {
        return res.status(403).json({
          error: "No tiene permiso para realizar esta acción.",
          permisos_requeridos: codigosPermisos
        });
      }

      return next();
    } catch (error) {
      console.error("ERROR VERIFICANDO PERMISOS:", codigosPermisos, error);
      return res.status(500).json({
        error: "No se pudieron verificar los permisos del usuario."
      });
    }
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission
};
