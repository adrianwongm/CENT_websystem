let usuarioActivo = "";
let rolUsuarioActivo = "";
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");
const menuLinks = document.querySelectorAll(".menu-link[data-section]");
const submenuLinks = document.querySelectorAll(".submenu-link");
const submenuToggles = document.querySelectorAll(".submenu-toggle");
const tituloSeccion = document.getElementById("tituloSeccion");
const subtituloSeccion = document.getElementById("subtituloSeccion");
const panelBox = document.getElementById("panelBox");
const cards = document.getElementById("cards");
/*const usuarioActivo = window.usuarioActivo || "";*/
/*console.log("Usuario activo:", usuarioActivo);*/


let paginaControlExpiracion = 1;
let totalPaginasControlExpiracion = 1;
let itemsControlExpiracion = [];

let paginaCuarentena = 1;
let totalPaginasCuarentena = 1;
let itemsCuarentena = [];

/*para los permisos rol roles */
let catalogoPermisosSistema = [];
let rolPermisosActual = "";
let usuarioPermisosActual = null;

let permisosUsuarioActual =
  new Set();


let productosActivosEntrada = [];
let productoEntradaSeleccionado = null;

/*variables para paginar la lista de prodcutos general */
let paginaProductosGeneral = 1;
const productosPorPagina = 10;

let modalCuarentenaPadreOriginal = null;
let modalCuarentenaSiguienteOriginal = null;

/*variable global formulario 008 */
let datosAutomaticosFormulario008 = {};
/* Esta variable guardará el ID del último PDF generado y después nos permitirá cerrar el formulario.*/
let documentoPDF008Actual = null;

let proveedorEnEdicion = null;
let proveedoresCompra = [];
let proveedorCompraSeleccionado = null;
let productosGlobal = [];
let productoCompraSeleccionado = null;
let detalleCompraTemporal = [];

let productosEntrada;

let productoEditandoId = null;

let pacienteComplementarioId = null;

let pacienteEditandoId = null;

let contadorCategorias = {
  "MEDICAMENTOS": 1000,
  "DESCARTABLES": 1000,
  "INSUMOS CASA COMERCIAL": 1000,
  "LIMPIEZA": 1000
};

let pacientesAdmision = [];
let editPacienteAdmisionIndex = -1;

let reclutadores = [];

/*let numeroArchivoActual = 850;*/

let pacientes = [];
let editIndex = -1;

let productos = [];
let editProductoIndex = -1;

let casasComerciales = [];
let inventario = [];
let detalle_Entradas = [];
let salidasInventario = [];


let productoSalidaSeleccionadoIndex = -1;
let productoEntradaSeleccionadoIndex = -1;

let trasladosInventario = [];
let detalleTrasladoTemporal = [];
let productoTrasladoSeleccionadoIndex = -1;
let contadorTraslado = 1000;

let descargosRegistrados = [];
let detalleDescargoTemporal = [];
let productoDescargoSeleccionadoIndex = -1;
let contadorDescargo = 1000;

let pacientesHistoriasClinicas = [];
let pacienteHistoriaClinicaSeleccionado = null;

let pacientesDocumentosHC = [];
let pacienteDocumentosHCSeleccionado = null;


let permisosRoles = {

  ADMIN: {
    inventario: true,
    descargos: true,
    pacientes: true,
    usuarios: true,
    configuraciones: true
  },

  INVENTARIO: {
    inventario: true,
    descargos: false,
    pacientes: false,
    usuarios: false,
    configuraciones: false
  },

  DESCARGOS: {
    inventario: false,
    descargos: true,
    pacientes: true,
    usuarios: false,
    configuraciones: false
  },

  AUDITORIA: {
    inventario: true,
    descargos: true,
    pacientes: true,
    usuarios: false,
    configuraciones: false
  }

};




const bodegas = [
  {
    id: 1,
    nombre: "BODEGA MATRIZ"
  },
  {
    id: 2,
    nombre: "BODEGA CENT"
  }
];

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

submenuToggles.forEach(toggle => {
  toggle.addEventListener("click", () => {
    const group = toggle.closest(".menu-group");
    group.classList.toggle("open");
  });
});



function autocompletarResponsable(idCampo) {
  const input = document.getElementById(idCampo);
  if (!input) return;

  input.value = usuarioActivo;
  input.readOnly = true;
}

function validarCedula10Digitos(valor) {
  return /^\d{10}$/.test(String(valor || "").trim());
}

/*function calcularEdadDesdeFecha(fechaNacimiento) {
  if (!fechaNacimiento) return "";

  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return edad >= 0 ? edad : "";
}*/
function calcularEdadDesdeFecha(fecha) {
  if (!fecha) return "";

  const hoy = new Date();
  const nacimiento = new Date(fecha + "T00:00:00");

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return edad >= 0 ? edad : "";
}

function obtenerNombreCompletoReclutador(r) {
  return [
    r.primerApellido,
    r.segundoApellido,
    r.primerNombre,
    r.segundoNombre
  ].filter(Boolean).join(" ");
}

/*async function poblarSelectReclutadores(selectId, incluirVacio = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch("/api/reclutadores");
    const reclutadores = await res.json();

    let html = incluirVacio ? `<option value="">Seleccione</option>` : "";

    html += reclutadores
      .filter(r => r.estado === "ACTIVO")
      .map(r => {
        const nombreCompleto = [
          r.apellido1,
          r.apellido2,
          r.nombre1,
          r.nombre2
        ].filter(Boolean).join(" ");

        return `<option value="${r.id}">${nombreCompleto}</option>`;
      }).join("");

    select.innerHTML = html;
  } catch (error) {
    console.error("Error cargando reclutadores en select:", error);
    select.innerHTML = incluirVacio ? `<option value="">Seleccione</option>` : "";
  }
}*/
async function poblarSelectReclutadores(selectId, incluirVacio = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch("/api/reclutadores");
    const reclutadores = await res.json();

    let html = incluirVacio ? `<option value="">Seleccione</option>` : "";

    html += (reclutadores || [])
      .filter(r => r.estado === "ACTIVO")
      .map(r => {
        const nombreCompleto = [
          r.apellido1,
          r.apellido2,
          r.nombre1,
          r.nombre2
        ].filter(Boolean).join(" ");

        return `<option value="${r.id}">${nombreCompleto}</option>`;
      })
      .join("");

    select.innerHTML = html;
  } catch (error) {
    console.error("Error cargando reclutadores:", error);
    select.innerHTML = incluirVacio ? `<option value="">Seleccione</option>` : "";
  }
}

async function poblarSelectBodegas(selectId, incluirVacio = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch("/api/bodegas");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      select.innerHTML = incluirVacio ? `<option value="">Seleccione</option>` : "";
      return;
    }

    const bodegas = (Array.isArray(data) ? data : []).filter(b => b.estado === "ACTIVO");

    let html = incluirVacio ? `<option value="">Seleccione</option>` : "";
    html += bodegas.map(b => `<option value="${b.nombre}">${b.nombre}</option>`).join("");

    select.innerHTML = html;
  } catch (error) {
    console.error("Error cargando bodegas:", error);
    select.innerHTML = incluirVacio ? `<option value="">Seleccione</option>` : "";
  }
}

function generarNumeroArchivo() {
  return numeroArchivoActual;
}

function generarNumeroDescargo() {
  return `DSCRG-${contadorDescargo}`;
}

function obtenerNombreCompletoPacienteAdmision(p) {
  return [
    p.pacApellido1,
    p.pacApellido2,
    p.pacNombre1,
    p.pacNombre2
  ].filter(Boolean).join(" ");
}

async function cargarPacientesActivosDesdeSQL() {
  try {
    const res = await fetch("/api/pacientes/activos");
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error cargando pacientes activos:", error);
    return [];
  }
}

/*NUEVA FUNCION PARA OBTENER SIGUIENTE NUMERO */
async function obtenerSiguienteNumeroTrasladoDesdeSQL() {
  try {
    const res = await fetch("/api/traslados/siguiente-numero");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return "TRSLD-1000";
    return data.numero || "TRSLD-1000";
  } catch (error) {
    console.error("Error obteniendo número de traslado:", error);
    return "TRSLD-1000";
  }
}

async function obtenerPacientesPorFechaProcedimiento(fecha) {
  const pacientes = await cargarPacientesActivosDesdeSQL();

  return pacientes.filter(p => {
    const fechaProc = p.fecha_procedimiento
      ? String(p.fecha_procedimiento).slice(0, 10)
      : "";

    return fechaProc === fecha;
  });
}

async function poblarPacientesDescargo(fecha) {
  const select = document.getElementById("descPaciente");
  if (!select) return;

  const pacientes = await obtenerPacientesPorFechaProcedimiento(fecha);

  let html = `<option value="">Seleccione</option>`;

  html += pacientes.map(p => {
    const nombreCompleto = [
      p.pac_apellido1,
      p.pac_apellido2,
      p.pac_nombre1,
      p.pac_nombre2
    ].filter(Boolean).join(" ");

    return `
      <option value="${p.id}">
        ${p.archivo} - ${nombreCompleto}
      </option>
    `;
  }).join("");

  select.innerHTML = html;
}

async function obtenerPacientePorId(id) {
  if (!id) return null;

  try {
    const res = await fetch(`/api/pacientes/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return null;
    return data;
  } catch (error) {
    console.error("Error obteniendo paciente por id:", error);
    return null;
  }
}

function obtenerLotesDisponiblesDescargo(codigo, producto) {
  const movimientos = detalle_Entradas.filter(item =>
    String(item.bodega || "").trim() === "BODEGA CENT" &&
    String(item.codigo || "").trim() === String(codigo || "").trim() &&
    String(item.producto || "").trim() === String(producto || "").trim() &&
    String(item.lote || "").trim() !== ""
  );

  const mapa = new Map();

  movimientos.forEach(item => {
    const key = [
      String(item.producto_id || ""),
      String(item.bodega || "").trim(),
      String(item.codigoProveedor || "").trim().toLowerCase(),
      String(item.lote || "").trim().toLowerCase()
    ].join("||");

    const actual = mapa.get(key);

    if (!actual || Number(item.id || 0) > Number(actual.id || 0)) {
      mapa.set(key, item);
    }
  });

  return Array.from(mapa.values()).filter(item => Number(item.stockLote || 0) > 0);
}

async function guardarBodegaSistema(e) {
  e.preventDefault();

  const nombre = document.getElementById("bodegaNombre").value.trim().toUpperCase();

  if (!nombre) {
    alert("Ingrese el nombre de la bodega");
    return;
  }

  try {
    const res = await fetch("/api/bodegas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nombre })
    });

    const data = await res.json().catch(() => ({}));
    console.log("Respuesta guardar bodega:", data);

    if (!res.ok) {
      alert(data.error || `Error HTTP ${res.status}`);
      return;
    }

    alert("Bodega guardada correctamente");
    document.getElementById("formBodegaSistema").reset();

    await cargarBodegasSistema();
  } catch (error) {
    console.error("Error guardando bodega:", error);
    alert("Error al conectar con el servidor");
  }
}

async function cargarBodegasSistema(filtro = "") {
  const tbody = document.getElementById("tablaBodegasSistemaBody");
  console.log("tablaBodegasSistemaBody:", tbody);

  if (!tbody) return;

  try {
    const res = await fetch("/api/bodegas");
    const data = await res.json().catch(() => ({}));

    console.log("Respuesta /api/bodegas:", data);

    if (!res.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">Error al cargar bodegas</td>
        </tr>
      `;
      return;
    }

    const listaBase = Array.isArray(data) ? data : [];
    const texto = filtro.toLowerCase().trim();

    const lista = listaBase.filter(b =>
      String(b.nombre || "").toLowerCase().includes(texto) ||
      String(b.estado || "").toLowerCase().includes(texto)
    );

    console.log("Lista de bodegas filtrada:", lista);

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">No hay bodegas registradas</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(b => `
      <tr>
        <td>${b.nombre}</td>
        <td>${b.estado}</td>
        <td>${b.fecha_creacion ? String(b.fecha_creacion).slice(0, 10) : ""}</td>
        <td>
          <button class="btn-table edit" onclick="toggleBodegaSistema(${b.id})">
            ${b.estado === "ACTIVO" ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error cargando bodegas:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">Error al cargar bodegas</td>
      </tr>
    `;
  }
}

async function toggleBodegaSistema(id) {
  try {
    const res = await fetch(`/api/bodegas/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado de la bodega");
      return;
    }

    const buscar = document.getElementById("buscarBodegaSistema");
    cargarBodegasSistema(buscar ? buscar.value : "");
  } catch (error) {
    console.error("Error cambiando estado bodega:", error);
    alert("Error al conectar con el servidor");
  }
}

async function inicializarModuloPermisos() {
  await cargarCatalogoPermisosSistema();

  configurarTabsPermisos();

  await cargarRolesPermisos();

  await cargarUsuariosPermisos();

  const selectRol =
    document.getElementById(
      "selectRolPermisos"
    );

  if (selectRol) {
    selectRol.onchange = async () => {
      rolPermisosActual =
        selectRol.value;

      await cargarPermisosRol(
        rolPermisosActual
      );
    };
  }

  const selectUsuario =
    document.getElementById(
      "selectUsuarioPermisos"
    );

  if (selectUsuario) {
    selectUsuario.onchange =
      async () => {
        const usuarioId =
          Number(
            selectUsuario.value || 0
          );

        if (!usuarioId) {
          usuarioPermisosActual =
            null;

          document.getElementById(
            "contenedorPermisosUsuario"
          ).innerHTML = `
            <div class="empty-row">
              Seleccione un usuario para configurar permisos individuales.
            </div>
          `;

          document.getElementById(
            "infoUsuarioPermisos"
          ).style.display =
            "none";

          document.getElementById(
            "btnGuardarPermisosUsuario"
          ).disabled =
            true;

          return;
        }

        await cargarPermisosUsuario(
          usuarioId
        );
      };
  }

  document
    .getElementById(
      "btnGuardarPermisosRol"
    )
    ?.addEventListener(
      "click",
      guardarPermisosRol
    );

  document
    .getElementById(
      "btnGuardarPermisosUsuario"
    )
    ?.addEventListener(
      "click",
      guardarPermisosUsuario
    );
}

function configurarTabsPermisos() {
  const tabRol =
    document.getElementById(
      "tabPermisosRol"
    );

  const tabUsuario =
    document.getElementById(
      "tabPermisosUsuario"
    );

  const panelRol =
    document.getElementById(
      "panelPermisosRol"
    );

  const panelUsuario =
    document.getElementById(
      "panelPermisosUsuario"
    );

  if (
    !tabRol ||
    !tabUsuario ||
    !panelRol ||
    !panelUsuario
  ) {
    return;
  }

  tabRol.onclick = () => {
    tabRol.classList.add(
      "activo"
    );

    tabUsuario.classList.remove(
      "activo"
    );

    panelRol.style.display =
      "block";

    panelUsuario.style.display =
      "none";
  };

  tabUsuario.onclick = () => {
    tabUsuario.classList.add(
      "activo"
    );

    tabRol.classList.remove(
      "activo"
    );

    panelUsuario.style.display =
      "block";

    panelRol.style.display =
      "none";
  };
}

async function cargarCatalogoPermisosSistema() {
  try {
    const res =
      await fetch(
        "/api/permisos/catalogo"
      );

    const data =
      await res
        .json()
        .catch(() => []);

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudo cargar el catálogo de permisos"
      );
    }

    catalogoPermisosSistema =
      Array.isArray(data)
        ? data
        : [];

  } catch (error) {
    console.error(
      "ERROR CATÁLOGO PERMISOS:",
      error
    );

    catalogoPermisosSistema = [];
  }
}

async function cargarRolesPermisos() {
  const select =
    document.getElementById(
      "selectRolPermisos"
    );

  if (!select) return;

  try {
    const res =
      await fetch(
        "/api/permisos/roles"
      );

    const roles =
      await res
        .json()
        .catch(() => []);

    if (!res.ok) {
      throw new Error(
        "No se pudieron cargar los roles"
      );
    }

    select.innerHTML = `
      <option value="">
        Seleccione un rol
      </option>
      ${
        roles
          .map(
            rol => `
              <option value="${rol}">
                ${rol}
              </option>
            `
          )
          .join("")
      }
    `;

  } catch (error) {
    console.error(
      "ERROR CARGANDO ROLES:",
      error
    );
  }
}

async function cargarUsuariosPermisos() {
  const select =
    document.getElementById(
      "selectUsuarioPermisos"
    );

  if (!select) return;

  try {
    const res =
      await fetch(
        "/api/usuarios"
      );

    const usuarios =
      await res
        .json()
        .catch(() => []);

    if (!res.ok) {
      throw new Error(
        "No se pudieron cargar los usuarios"
      );
    }

    select.innerHTML = `
      <option value="">
        Seleccione un usuario
      </option>
      ${
        (Array.isArray(usuarios)
          ? usuarios
          : []
        )
          .map(usuario => {
            const nombre =
              [
                usuario.apellido1,
                usuario.apellido2,
                usuario.nombre1,
                usuario.nombre2
              ]
                .filter(Boolean)
                .join(" ");

            return `
              <option
                value="${usuario.id}"
              >
                ${nombre || usuario.username}
                - ${usuario.rol || ""}
              </option>
            `;
          })
          .join("")
      }
    `;

  } catch (error) {
    console.error(
      "ERROR CARGANDO USUARIOS PARA PERMISOS:",
      error
    );
  }
}

function inicializarModuloBodegas() {
  const form = document.getElementById("formBodegaSistema");
  const buscar = document.getElementById("buscarBodegaSistema");

  console.log("Inicializando módulo bodegas");
  console.log("form:", form);
  console.log("buscar:", buscar);

  if (!form) return;

  cargarBodegasSistema();

  form.addEventListener("submit", guardarBodegaSistema);

  if (buscar) {
    buscar.addEventListener("input", () => {
      cargarBodegasSistema(buscar.value);
    });
  }
}

const contenido = {
  dashboard: {

  titulo: "Dashboard",

  subtitulo: "Resumen general del sistema",

  html: `

    <!-- =========================================
         ALERTA DE EXPIRACIÓN
         ========================================= -->

    <div
      id="dashboardAlertaExpiracion"
      class="dashboard-alerta-expiracion dashboard-alerta-cargando"
    >

      <div class="dashboard-alerta-baliza">

        <span class="baliza-luz baliza-roja"></span>

        <span class="baliza-luz baliza-azul"></span>

      </div>


      <div class="dashboard-alerta-contenido">


        <!-- ICONO -->

        <div class="dashboard-alerta-icono">

          <i class="fa-solid fa-triangle-exclamation"></i>

        </div>


        <!-- INFORMACIÓN -->

        <div class="dashboard-alerta-info">

          <h3
            id="dashboardAlertaExpTitulo"
          >
            Control de vencimientos
          </h3>


          <p
            id="dashboardAlertaExpTexto"
          >
            Consultando fechas de expiración...
          </p>


          <div
            id="dashboardAlertaExpResumen"
            class="dashboard-alerta-resumen"
          ></div>

        </div>


        <!-- BOTÓN -->

        <div class="dashboard-alerta-accion">

          <button
            type="button"
            id="btnDashboardVerExpiracion"
            class="dashboard-btn-expiracion"
            onclick="abrirControlExpiracionDesdeDashboard()"
          >

            Revisar ahora

            <i class="fa-solid fa-arrow-right"></i>

          </button>

        </div>

      </div>

    </div>


    <!-- =========================================
         CONTENIDO NORMAL DEL DASHBOARD
         ========================================= -->

    <div class="dashboard-bienvenida">

      <h2>
        Dashboard
      </h2>

      <p>
        Bienvenido al panel principal del sistema CENT.
        Desde aquí puedes acceder a pacientes,
        inventario, reportes, quirófano y usuarios.
      </p>

    </div>

  `

},

  "pacientes-admision": {
  titulo: "Admisión de pacientes",
  subtitulo: "Registro de pacientes",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>ADMISION DE PACIENTES</h2>

        <form id="formAdmisionPaciente" class="patient-form">
          <div class="form-grid">

            <div>
              <label># Archivo</label>
              <input type="text" id="admArchivo" readonly>
            </div>

            <div>
              <label>Cédula paciente</label>
              <input type="text" id="admCedulaPaciente" maxlength="10" required>
            </div>

            <div>
              <label>Estado civil</label>
              <select id="admEstadoCivil" required>
                <option value="">Seleccione</option>
                <option value="soltero">soltero</option>
                <option value="casado">casado</option>
                <option value="divorciado">divorciado</option>
                <option value="viudo">viudo</option>
                <option value="union libre">union libre</option>
              </select>
            </div>

            <div>
              <label>Sexo</label>
              <select id="admSexo" required>
                <option value="">Seleccione</option>
                <option value="H">H</option>
                <option value="M">M</option>
              </select>
            </div>

            <div>
              <label>Teléfono fijo</label>
              <input type="text" id="admTelefonoFijo" required>
            </div>

            <div>
              <label>Teléfono celular</label>
              <input type="text" id="admTelefonoCelular" required>
            </div>

            <div class="full-width">
              <label>Correo</label>
              <input type="email" id="admCorreo" required>
            </div>

            <div>
              <label>Primer apellido paciente</label>
              <input type="text" id="admPacApellido1" required>
            </div>

            <div>
              <label>Segundo apellido paciente</label>
              <input type="text" id="admPacApellido2" required>
            </div>

            <div>
              <label>Primer nombre paciente</label>
              <input type="text" id="admPacNombre1" required>
            </div>

            <div>
              <label>Segundo nombre paciente</label>
              <input type="text" id="admPacNombre2" required>
            </div>

            <div>
              <label>Primer apellido familiar</label>
              <input type="text" id="admFamApellido1" required>
            </div>

            <div>
              <label>Segundo apellido familiar</label>
              <input type="text" id="admFamApellido2" required>
            </div>

            <div>
              <label>Primer nombre familiar</label>
              <input type="text" id="admFamNombre1" required>
            </div>

            <div>
              <label>Segundo nombre familiar</label>
              <input type="text" id="admFamNombre2" required>
            </div>

            <div>
              <label>Cédula familiar</label>
              <input type="text" id="admCedulaFamiliar" maxlength="10" required>
            </div>

            <div>
              <label>Fecha nacimiento</label>
              <input type="date" id="admFechaNacimiento" required>
            </div>

            <div>
              <label>Edad</label>
              <input type="text" id="admEdad" readonly>
            </div>

            <div>
              <label>Lugar nacimiento</label>
              <input type="text" id="admLugarNacimiento" required>
            </div>

            <div>
              <label>Fecha procedimiento</label>
              <input type="date" id="admFechaProcedimiento" required>
            </div>

            <div>
              <label>Reclutador</label>
              <select id="admReclutador" required></select>
            </div>

            <div>
              <label>Provincia</label>
              <input type="text" id="admProvincia" required>
            </div>

            <div>
              <label>Cantón</label>
              <input type="text" id="admCanton" required>
            </div>

            <div>
              <label>Parroquia</label>
              <input type="text" id="admParroquia" required>
            </div>

            <div>
              <label>Barrio</label>
              <input type="text" id="admBarrio" required>
            </div>

            <div>
              <label>Calle principal</label>
              <input type="text" id="admCallePrincipal" required>
            </div>

            <div>
              <label>Calle secundaria</label>
              <input type="text" id="admCalleSecundaria" required>
            </div>

            <div>
              <label>Referencia</label>
              <input type="text" id="admReferencia" required>
            </div>

            <div>
              <label>Ocupación</label>
              <input type="text" id="admOcupacion" required>
            </div>

            <div>
              <label>Parentesco familiar</label>
              <input type="text" id="admParentescoFamiliar" required>
            </div>

            <div>
              <label>Dirección familiar</label>
              <input type="text" id="admDireccionFamiliar" required>
            </div>

            <div>
              <label>Teléfono familiar</label>
              <input type="text" id="admTelefonoFamiliar" required>
            </div>

            <div>
              <label>Tipo de seguro</label>
              <select id="admTipoSeguro" required>
                <option value="">Seleccione</option>
                <option value="IESS CAMPESINO">IESS CAMPESINO</option>
                <option value="IESS GENERAL">IESS GENERAL</option>
                <option value="ISSFA">ISSFA</option>
                <option value="ISSPOL">ISSPOL</option>
                <option value="MSP">MSP</option>
                <option value="PRIVADO">PRIVADO</option>
              </select>
            </div>

            <div>
              <label>Tipo de afiliado</label>
              <select id="admTipoAfiliado" required>
                <option value="">Seleccione</option>
                <option value="JEFE DE FAMILIA">JEFE DE FAMILIA</option>
                <option value="JUBILADO">JUBILADO</option>
                <option value="CON DERECHO">CON DERECHO</option>
              </select>
            </div>

          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" id="btnGuardarAdmision">Guardar</button>
            <button type="button" class="btn-secondary" id="btnCancelarAdmision" style="display:none;">Cancelar edición</button>
          </div>
        </form>
      </div>

    </div>
  `
},

"pacientes-lista": {
  titulo: "Lista de pacientes",
  subtitulo: "Pacientes admisionados",
  html: `
    <div class="table-card">
      <div class="table-header">
        <h2>Lista de pacientes</h2>
        <input type="text" id="buscarPacienteAdmision" placeholder="Buscar paciente...">
      </div>

      <div class="form-actions" style="margin-bottom:16px;">
        <button type="button" class="btn-secondary" id="btnExportarPacientesExcel">Exportar Excel</button>
      </div>

      <div class="table-responsive">
        <table class="patient-table">
          <thead>
            <tr>
              <th># Archivo</th>
              <th>Paciente</th>
              <th>Cédula</th>
              <th>Fecha procedimiento</th>
              <th>Reclutador</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tablaPacientesAdmisionBody">
            <tr>
              <td colspan="6" class="empty-row">No hay pacientes registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
},

"pacientes-no-atendidos": {
  titulo: "Pacientes no atendidos",
  subtitulo: "Pacientes retirados de la lista principal",
  html: `
    <div class="table-card">
      <div class="table-header">
        <h2>Pacientes no atendidos</h2>
        <input type="text" id="buscarPacienteNoAtendido" placeholder="Buscar paciente no atendido...">
      </div>

      <div class="form-actions" style="margin-bottom:16px;">
        <button type="button" class="btn-secondary" id="btnExportarNoAtendidosExcel">Exportar Excel</button>
      </div>

      <div class="table-responsive">
        <table class="patient-table">
          <thead>
            <tr>
              <th># Archivo</th>
              <th>Paciente</th>
              <th>Cédula</th>
              <th>Fecha procedimiento</th>
              <th>Motivo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tablaPacientesNoAtendidosBody">
            <tr>
              <td colspan="6" class="empty-row">No hay pacientes no atendidos</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
},

"config-desplegables": {
  titulo: "Registrar desplegables",
  subtitulo: "Administración de listas configurables",
  html: `
    <div class="inventario-wrap">
      <div class="form-card">
        <h2>REGISTRAR DESPLEGABLE</h2>

        <form id="formDesplegableConfig" class="patient-form">
          <div class="form-grid">
            <div>
              <label>Tipo de entrada</label>
              <select id="cfgTipoDesplegable" required>
                <option value="">Seleccione</option>
                <option value="T/procedimiento">T/procedimiento</option>
                <option value="Cirujano">Cirujano</option>
                <option value="Anestesiologo">Anestesiologo</option>
                <option value="Radiologo">Radiologo</option>
                <option value="Habitacion">Habitacion</option>
              </select>
            </div>

            <div>
              <label>Valor</label>
              <input type="text" id="cfgValorDesplegable" required>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h2>Desplegables registrados</h2>
          <input type="text" id="buscarDesplegableConfig" placeholder="Buscar desplegable...">
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaDesplegablesConfigBody">
              <tr>
                <td colspan="4" class="empty-row">No hay desplegables registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
},

  pacientes: {
    titulo: "Pacientes",
    subtitulo: "Gestión integral de pacientes",
    html: `
      <div class="pacientes-wrap">
        <div class="form-card">
          <h2>Registro de Paciente</h2>

          <form id="formPaciente" class="patient-form">
            <div class="form-grid">
              <div>
                <label>Historia Clínica</label>
                <input type="text" id="hc" placeholder="Ej: 1001" required>
              </div>

              <div>
                <label>Nombre Completo</label>
                <input type="text" id="nombre" placeholder="Ingrese nombre completo" required>
              </div>

              <div>
                <label>Cédula</label>
                <input type="text" id="cedula" placeholder="Ingrese cédula">
              </div>

              <div>
                <label>Fecha de Nacimiento</label>
                <input type="date" id="fechaNacimiento">
              </div>

              <div>
                <label>Sexo</label>
                <select id="sexo">
                  <option value="">Seleccione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              <div>
                <label>Teléfono</label>
                <input type="text" id="telefono" placeholder="Ingrese teléfono">
              </div>

              <div class="full-width">
                <label>Dirección</label>
                <input type="text" id="direccion" placeholder="Ingrese dirección">
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" id="btnGuardarPaciente">Guardar paciente</button>
              <button type="button" class="btn-secondary" id="btnCancelarEdicion" style="display:none;">Cancelar edición</button>
            </div>
          </form>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h2>Pacientes Registrados</h2>
            <input type="text" id="buscarPaciente" placeholder="Buscar paciente...">
          </div>

          <div class="table-responsive">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>HC</th>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Sexo</th>
                  <th>Teléfono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="tablaPacientesBody">
                <tr>
                  <td colspan="6" class="empty-row">No hay pacientes registrados</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  },

"inventario-productos": {
  titulo: "Lista general de productos",
  subtitulo: "Registro y consulta de productos del sistema",

  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>REGISTRAR PRODUCTO</h2>

        <form id="formProductoGeneral" class="patient-form">

          <div class="form-grid">

            <div>
              <label>Categoría</label>

              <select
                id="prodCategoria"
                required
              >
                <option value="">
                  Seleccione
                </option>
              </select>
            </div>


            <div>
              <label>Código interno</label>

              <input
                type="text"
                id="prodCodigo"
                readonly
                required
              >
            </div>


            <div class="full-width">
              <label>Nombre del producto</label>

              <input
                type="text"
                id="prodNombre"
                required
              >
            </div>


            <div>
              <label>Unidad</label>

              <input
                type="text"
                id="prodUnidad"
                placeholder="Ej: UNIDAD, CAJA, FRASCO"
                required
              >
            </div>


            <div>
              <label>Referencia / Código de fábrica</label>

              <input
                type="text"
                id="prodReferencia"
                placeholder="Ej: REF-ABC123"
                autocomplete="off"
              >

              <small
                style="
                  display:block;
                  margin-top:5px;
                  opacity:0.65;
                  font-size:11px;
                "
              >
                Campo opcional
              </small>
            </div>

          </div>


          <div class="form-actions">

            <button
              type="submit"
              class="btn-primary"
              id="btnGuardarProducto"
            >
              Guardar producto
            </button>


            <button
              type="button"
              class="btn-secondary"
              id="btnCancelarProductoEdicion"
              style="display:none;"
            >
              Cancelar edición
            </button>

          </div>

        </form>
      </div>


      <div class="table-card">

        <div class="table-header">

          <h2>
            Lista general de productos
          </h2>

          <input
            type="text"
            id="buscarInventario"
            placeholder="Buscar por código, referencia, producto..."
          >

        </div>


        <div class="table-responsive">

          <table class="patient-table">

            <thead>
              <tr>

                <th>
                  Código
                </th>

                <th>
                  Referencia
                </th>

                <th>
                  Categoría
                </th>

                <th>
                  Producto
                </th>

                <th>
                  Unidad
                </th>

                <th>
                  Estado
                </th>

                <th>
                  Acciones
                </th>

              </tr>
            </thead>


            <tbody id="tablaProductosGeneralBody">

              <tr>

                <td
                  colspan="7"
                  class="empty-row"
                >
                  No hay productos registrados
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>
  `
},

"config-casas": {
  titulo: "Casas comerciales",
  subtitulo: "Registro de proveedores",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>Registrar Casa Comercial</h2>

        <form id="formCasaComercial" class="patient-form">
          <div class="form-grid">

            <div>
              <label>Nombre</label>
              <input type="text" id="casaNombre" placeholder="Nombre de la casa comercial" required>
              <input type="hidden" id="casaId">
            </div>

            <div>
              <label>RUC</label>
              <input type="text" id="casaRuc" placeholder="RUC">
            </div>

            <div class="full-width">
              <label>Correos</label>
              <input type="text" id="casaCorreos" placeholder="correo1@empresa.com, correo2@empresa.com">
            </div>

          </div>

         
          <div class="form-actions">
          <button type="submit" class="btn-primary" id="btnGuardarCasa">Guardar casa comercial</button>
          <button type="button" class="btn-secondary" id="btnCancelarCasa" style="display:none;">Cancelar</button>
          </div>
        </form>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h2>Casas comerciales registradas</h2>
          <input type="text" id="buscarCasa" placeholder="Buscar...">
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC</th>
                <th>Correos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaCasasBody">
              <tr>
                <td colspan="5" class="empty-row">No hay casas comerciales registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"inventario-entrada": {
  titulo: "Entrada",
  subtitulo: "Ingreso de stock por bodega",

  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>Registrar Entrada</h2>

        <form
          id="formEntradaInventario"
          class="patient-form"
          autocomplete="off"
        >

          <div class="form-grid">

            <div class="full-width">
              <label>Bodega</label>
              <select
                id="entradaBodega"
                required
              ></select>
            </div>


            <div class="full-width product-search-box">
              <label>Buscar producto</label>

              <input
                type="text"
                id="buscarProductoEntrada"
                placeholder="Escriba código, referencia o nombre del producto"
              >

              <div
                id="resultadosProductoEntrada"
                class="resultados-busqueda"
              ></div>
            </div>


            <div>
              <label>Código</label>
              <input
                type="text"
                id="entradaCodigo"
                readonly
              >
            </div>


            <div>
              <label>Producto</label>
              <input
                type="text"
                id="entradaProductoNombre"
                readonly
              >
            </div>


            <div>
              <label>Cantidad</label>
              <input
                type="number"
                id="entradaCantidad"
                min="1"
                step="1"
                required
              >
            </div>


            <div>
              <label>Stock mínimo</label>
              <input
                type="number"
                id="entradaStockMinimo"
                min="0"
              >
            </div>


            <div>
              <label>Ubicación</label>
              <input
                type="text"
                id="entradaUbicacion"
              >
            </div>


            <!-- ==========================================
                 VALORACIÓN
                 ========================================== -->

            <div>
              <label>Estado del costo</label>

              <select id="entradaEstadoCosto">

                <option value="PENDIENTE">
                  Costo pendiente / desconocido
                </option>

                <option value="CONOCIDO">
                  Costo conocido
                </option>

                <option value="SIN_COSTO">
                  Sin costo
                </option>

              </select>
            </div>


            <div id="bloqueCostoUnitarioEntrada">
              <label>Costo unitario</label>

              <input
                type="number"
                id="entradaCostoUnitario"
                min="0"
                step="0.000001"
                placeholder="Ej: 125.50"
                disabled
              >
            </div>


            <div
              id="bloqueMotivoSinCostoEntrada"
              style="display:none;"
            >
              <label>Motivo sin costo</label>

              <select id="entradaMotivoSinCosto">

                <option value="">
                  Seleccione
                </option>

                <option value="DONACION">
                  Donación
                </option>

                <option value="BONIFICACION">
                  Bonificación
                </option>

                <option value="MUESTRA">
                  Muestra
                </option>

                <option value="REGALO">
                  Regalo
                </option>

                <option value="OTRO">
                  Otro
                </option>

              </select>
            </div>


            <div>
              <label>Valor de esta entrada</label>

              <input
                type="text"
                id="entradaValorTotal"
                value="Pendiente de valoración"
                readonly
              >
            </div>


            <!-- ==========================================
                 LOTE
                 ========================================== -->

            <div>
              <label class="check-label">

                <input
                  type="checkbox"
                  id="entradaRegistrarLote"
                >

                <span>
                  Registrar lote
                </span>

              </label>
            </div>


            <div
              id="bloqueLoteEntrada"
              class="full-width lote-block"
              style="display:none;"
            >

              <div class="form-grid">

                <div>
                  <label>Casa comercial</label>
                  <select id="entradaCasa"></select>
                </div>


                <div>
                  <label>Código proveedor</label>

                  <input
                    type="text"
                    id="entradaCodigoProveedor"
                    placeholder="Código del proveedor"
                  >
                </div>


                <div>
                  <label>Lote</label>

                  <input
                    type="text"
                    id="entradaLote"
                    placeholder="Lote"
                  >
                </div>


                <div>
                  <label>Fecha de vencimiento</label>

                  <input
                    type="date"
                    id="entradaVencimiento"
                  >
                </div>

              </div>

            </div>


            <div>
              <label>Responsable</label>

              <input
                type="text"
                id="entradaResponsable"
                required
              >
            </div>


            <div class="full-width">
              <label>Observación</label>

              <input
                type="text"
                id="entradaObservacion"
              >
            </div>

          </div>


          <div class="form-actions">

            <button
              type="submit"
              class="btn-primary"
            >
              Registrar entrada
            </button>

          </div>

        </form>
      </div>


      <div class="table-card">

        <div class="table-header">

          <h2>
            Stock cargado recientemente
          </h2>

          <input
            type="text"
            id="buscarInventario"
            placeholder="Buscar..."
          >

        </div>


        <div class="table-responsive">

          <table class="patient-table">

            <thead>
              <tr>
                <th>Bodega</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock</th>
                <th>Ubicación</th>
              </tr>
            </thead>

            <tbody id="tablaInventarioBody">

              <tr>
                <td
                  colspan="5"
                  class="empty-row"
                >
                  No hay stock registrado
                </td>
              </tr>

            </tbody>

          </table>

        </div>
      </div>

    </div>
  `
},

"inventario-salida": {
  titulo: "Salida de Inventario",
  subtitulo: "Descuento de stock por bodega",
  html: `
      <div class="inventario-wrap">
        <div class="form-card">
          <h2>Registrar Salida</h2>

          <form id="formSalidaInventario" class="patient-form" autocomplete="off">
            <div class="form-grid">
              <div class="full-width">
                <label>Bodega</label>
                <select id="salidaBodega" required></select>
              </div>

              <div class="full-width product-search-box">
                <label>Buscar producto</label>
                <input type="text" id="buscarProductoSalida" placeholder="Escriba código o nombre del producto">
                <div id="resultadosProductoSalida" class="resultados-busqueda"></div>
              </div>

              <div>
                <label>Código</label>
                <input type="text" id="salidaCodigo" readonly>
              </div>

              <div>
                <label>Producto seleccionado</label>
                <input type="text" id="salidaProductoNombre" readonly>
              </div>

              <div>
                <label>Stock Actual</label>
                <input type="number" id="salidaStockActual" readonly>
              </div>

              <div id="bloqueLoteSalida" class="full-width" style="display:none;">
                <label>Seleccionar lote</label>
                <select id="salidaLoteSelect"></select>
              </div>

              <div>
                <label>Cantidad de Salida</label>
                <input type="number" id="salidaCantidad" min="1" placeholder="Ingrese cantidad" required>
              </div>

              <div>
                <label>Responsable</label>
                <input type="text" id="salidaResponsable" placeholder="Nombre del responsable" required>
              </div>

              <div class="full-width">
                <label>Motivo</label>
                <input type="text" id="salidaMotivo" placeholder="Ej: Consumo en quirófano" required>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary">Registrar salida</button>
            </div>
          </form>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h2>Historial de Salidas</h2>
            <input type="text" id="buscarSalida" placeholder="Buscar salida...">
          </div>

          <div class="table-responsive">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Bodega</th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Lote</th>
                  <th>Cantidad</th>
                  <th>Motivo</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody id="tablaSalidasBody">
                <tr>
                  <td colspan="8" class="empty-row">No hay salidas registradas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
},

"inventario-stock": {
  titulo: "Stock",
  subtitulo: "Consulta de existencias por bodega",
  html: `
    <div class="table-card">
      <div class="table-header">
        <h2>Stock Actual</h2>
        <div class="stock-filtros">
          <select id="filtroBodegaStock"></select>
          <input type="text" id="buscarStock" placeholder="Buscar en stock...">
        </div>
      </div>

      <div class="form-actions" style="margin-bottom:16px;">
        <button type="button" class="btn-secondary" id="btnExportarStockExcel">Exportar Excel</button>
      </div>

      <div class="table-responsive">
        <table class="patient-table">
          <thead>
            <tr>
              <th>Bodega</th>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Stock mínimo</th>
              <th>Estado</th>
              <th>Lotes</th>
            </tr>
          </thead>
          <tbody id="tablaStockBody">
            <tr>
              <td colspan="8" class="empty-row">No hay productos en stock</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
},

"inventario-traslados": {
  titulo: "Traslados",
  subtitulo: "Movimiento de stock entre bodegas",
  html: `
    <div class="inventario-wrap">

  <div class="form-card">
    <h2>REGISTRAR TRASLADO</h2>

    <form id="formTrasladoInventario" class="patient-form" autocomplete="off">
      <div class="form-grid">

        <div>
          <label># Traslado</label>
          <input type="text" id="trasladoNumero" readonly>
        </div>

        <div>
          <label>Bodega origen</label>
          <select id="trasladoBodegaOrigen" required>
            <option value="">Seleccione</option>
          </select>
        </div>

        <div>
          <label>Bodega destino</label>
          <select id="trasladoBodegaDestino" required>
            <option value="">Seleccione</option>
          </select>
        </div>

        <div>
          <label>Responsable</label>
          <input type="text" id="trasladoResponsable" required>
        </div>

        <div class="full-width">
          <label>Observación</label>
          <input type="text" id="trasladoObservacion" placeholder="Observación general del traslado">
        </div>

      </div>

      <hr style="margin:20px 0; border-color: rgba(255,255,255,0.08);">

      <h3 style="margin-bottom:16px;">Agregar productos al traslado</h3>

      <div class="form-grid">

        <div class="full-width product-search-box">
          <label>Buscar producto</label>
          <input type="text" id="buscarProductoTraslado" placeholder="Escriba código o nombre del producto">
          <div id="resultadosProductoTraslado" class="resultados-busqueda"></div>
        </div>

        <div>
          <label>Código</label>
          <input type="text" id="trasladoCodigo" readonly>
        </div>

        <div>
          <label>Producto</label>
          <input type="text" id="trasladoProductoNombre" readonly>
        </div>

        <div>
          <label>Categoría</label>
          <input type="text" id="trasladoCategoria" readonly>
        </div>

        <div>
          <label>Stock actual</label>
          <input type="number" id="trasladoStockActual" readonly>
        </div>

        <div id="bloqueLoteTraslado" class="full-width" style="display:none;">
          <label>Seleccionar lote</label>
          <select id="trasladoLoteSelect"></select>
        </div>

        <div>
          <label>Lote</label>
          <input type="text" id="trasladoLoteTexto" readonly>
        </div>

        <div>
          <label>Fecha expiración</label>
          <input type="text" id="trasladoVencimientoTexto" readonly>
        </div>

        <div>
          <label>Cantidad</label>
          <input type="number" id="trasladoCantidad" min="1">
        </div>

      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btnAgregarDetalleTraslado">Agregar producto</button>
      </div>

      <div class="table-card" style="margin-top:18px;">
        <div class="table-header">
          <h2>Detalle del traslado</h2>
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Código proveedor</th>
                <th>Lote</th>
                <th>Fecha expiración</th>
                <th>Cant</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaDetalleTrasladoBody">
              <tr>
                <td colspan="8" class="empty-row">No hay productos agregados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="form-actions" style="margin-top:18px;">
        <button type="submit" class="btn-primary">Registrar traslado</button>
      </div>
    </form>
  </div>

  <div class="form-card" style="margin-top:22px;">
    <h2>CONSULTAR TRASLADOS</h2>

    <div class="patient-form">
      <div class="form-grid">

        <div>
          <label for="filtroFechaTraslado">Fecha</label>
          <input type="date" id="filtroFechaTraslado">
        </div>

        <div>
          <label for="filtroOrigenTraslado">Bodega origen</label>
          <select id="filtroOrigenTraslado">
            <option value="">Todas</option>
          </select>
        </div>

        <div>
          <label for="filtroDestinoTraslado">Bodega destino</label>
          <select id="filtroDestinoTraslado">
            <option value="">Todas</option>
          </select>
        </div>

        <div>
          <label for="filtroNumeroTraslado">Número de traslado</label>
          <input type="text" id="filtroNumeroTraslado" placeholder="Ej: TRSLD-1001">
        </div>

      </div>

      <div class="form-actions" style="margin-top:18px;">
        <button type="button" class="btn-secondary" id="btnLimpiarFiltrosTraslados">
          Limpiar filtros
        </button>

        <button type="button" class="btn-primary" id="btnExportarTrasladosExcel">
          <i class="fa-solid fa-file-excel"></i> Exportar Excel
        </button>
      </div>
    </div>

    <div class="table-card" style="margin-top:18px;">
      <div class="table-header">
        <h2>Historial de Traslados</h2>
      </div>

      <div class="table-responsive">
        <table class="patient-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Bodega origen</th>
              <th>Bodega destino</th>
              <th>Número de traslado</th>
            </tr>
          </thead>
          <tbody id="tablaTrasladosBody">
            <tr>
              <td colspan="4" class="empty-row">No hay traslados registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

</div>
  `
},

"inventario-kardex": {
  titulo: "Kardex",
  subtitulo: "Consulta de movimientos y valorización de inventario",
  html: `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>KARDEX DE INVENTARIO</h2>
        </div>

        <form class="patient-form" style="margin-bottom:18px;">
          <div class="form-grid">
            <div>
              <label>Producto</label>
              <input type="text" id="filtroKardexProducto" placeholder="Código o nombre del producto">
            </div>

            <div>
              <label>Bodega</label>
              <select id="filtroKardexBodega">
                <option value="">Todas</option>
              </select>
            </div>

            <div>
              <label>Fecha desde</label>
              <input type="date" id="filtroKardexFechaDesde">
            </div>

            <div>
              <label>Fecha hasta</label>
              <input type="date" id="filtroKardexFechaHasta">
            </div>

            <div>
              <label>Corte hasta fecha</label>
              <input type="date" id="filtroKardexCorte">
            </div>

            <div class="full-width">
              <label>Tipo de movimiento</label>
              <div id="filtroKardexTipos" class="checks-inline">
              
              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="COMPRA"
                >
                Compra
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="SALIDA"
                >
                Salida
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="DESCARGO"
                >
                Descargo
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="TRASLADO SALIDA"
                >
                Traslado salida
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="TRASLADO ENTRADA"
                >
                Traslado entrada
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="CUARENTENA SALIDA"
                >
                Cuarentena salida
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="CUARENTENA ENTRADA"
                >
                Cuarentena entrada
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="LIBERACION SALIDA"
                >
                Liberación salida
              </label>

              <label>
                <input
                  type="checkbox"
                  class="check-tipo-kardex"
                  value="LIBERACION ENTRADA"
                >
                Liberación entrada
              </label>
              </div>
            </div>
          </div>
        </form>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnLimpiarFiltrosKardex">
            Limpiar filtros
          </button>

          <button type="button" class="btn-primary" id="btnExportarKardexExcel">
            <i class="fa-solid fa-file-excel"></i> Exportar Excel
          </button>
        </div>

        <div id="resumenKardex" style="margin-bottom:18px; color: rgba(255,255,255,0.82);">
          Consulte movimientos y valorización del inventario.
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Bodega</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Saldo</th>
                <th>Costo unit.</th>
                <th>Valor mov.</th>
                <th>Valor saldo</th>
              </tr>
            </thead>
            <tbody id="tablaKardexBody">
              <tr>
                <td colspan="12" class="empty-row">No hay movimientos para mostrar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"compras-proveedores-registrar": {
  titulo: "Registrar proveedores",
  subtitulo: "Creación y edición de proveedores",
  html: `
    <div class="inventario-wrap">
      <div class="form-card">
        <h2>REGISTRAR PROVEEDOR</h2>

        <form id="formProveedor" class="patient-form" autocomplete="off">
          <input type="hidden" id="proveedorId">

          <div class="form-grid">
            <div>
              <label>Nombre *</label>
              <input type="text" id="proveedorNombre" required>
            </div>

            <div>
              <label>RUC *</label>
              <input type="text" id="proveedorRuc" required>
            </div>

            <div>
              <label>Correo</label>
              <input type="text" id="proveedorCorreo">
            </div>

            <div>
              <label>Teléfono</label>
              <input type="text" id="proveedorTelefono">
            </div>

            <div class="full-width">
              <label>Notas</label>
              <input type="text" id="proveedorNotas">
            </div>
          </div>

          <div class="form-actions" style="margin-top:18px;">
            <button type="submit" class="btn-primary" id="btnGuardarProveedor">Guardar proveedor</button>
            <button type="button" class="btn-secondary" id="btnCancelarEdicionProveedor" style="display:none;">
              Cancelar edición
            </button>
          </div>
        </form>
      </div>
    </div>
  `
},

"compras-proveedores-consultar": {
  titulo: "Consultar proveedores",
  subtitulo: "Listado y filtros de proveedores",
  html: `
    <div class="inventario-wrap">
      <div class="table-card">
        <div class="table-header">
          <h2>CONSULTAR PROVEEDORES</h2>
        </div>

        <form class="patient-form" style="margin-bottom:18px;">
          <div class="form-grid">
            <div>
              <label>Nombre</label>
              <input type="text" id="filtroProveedorNombre" placeholder="Nombre del proveedor">
            </div>

            <div>
              <label>RUC</label>
              <input type="text" id="filtroProveedorRuc" placeholder="RUC">
            </div>
          </div>
        </form>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnLimpiarFiltrosProveedores">Limpiar filtros</button>
          <button type="button" class="btn-primary" id="btnExportarProveedoresExcel">
            <i class="fa-solid fa-file-excel"></i> Exportar Excel
          </button>
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Notas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaProveedoresBody">
              <tr>
                <td colspan="7" class="empty-row">No hay proveedores registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
},

"compras-ingresar": {
  titulo: "Ingresar compras",
  subtitulo: "Registro de compras y afectación a inventario",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>INGRESAR COMPRA</h2>

        <form id="formCompra" class="patient-form" autocomplete="off">
          <div class="form-grid">

            <div>
              <label># Compra</label>
              <input type="text" id="compraNumero" readonly>
            </div>

            <div>
              <label>Bodega *</label>
              <select id="compraBodega" required>
                <option value="">Seleccione</option>
              </select>
            </div>

            <div class="full-width product-search-box">
              <label>Buscar proveedor (nombre o RUC) *</label>
              <input type="text" id="buscarProveedorCompra" placeholder="Escriba nombre o RUC del proveedor">
              <div id="resultadosProveedorCompra" class="resultados-busqueda"></div>
            </div>

            <div>
              <label>Proveedor</label>
              <input type="text" id="compraProveedorNombre" readonly>
            </div>

            <div>
              <label>RUC proveedor</label>
              <input type="text" id="compraProveedorRuc" readonly>
            </div>

            <div>
              <label>N° Factura *</label>
              <input type="text" id="compraNumeroFactura" required>
            </div>

            <div>
              <label>Fecha compra *</label>
              <input type="date" id="compraFecha" required>
            </div>

            <div>
              <label>Responsable</label>
              <input type="text" id="compraResponsable" required>
            </div>

            <div class="full-width">
              <label>Observación</label>
              <input type="text" id="compraObservacion">
            </div>

          </div>

          <hr style="margin:20px 0; border-color: rgba(255,255,255,0.08);">

          <h3 style="margin-bottom:16px;">Agregar artículos a la compra</h3>

          <div class="form-grid">

            <div class="full-width product-search-box">
              <label>Buscar producto</label>
              <input type="text" id="buscarProductoCompra" placeholder="Escriba código o nombre del producto">
              <div id="resultadosProductoCompra" class="resultados-busqueda"></div>
            </div>

            <div>
              <label>Código</label>
              <input type="text" id="compraCodigoProducto" readonly>
            </div>

            <div>
              <label>Producto</label>
              <input type="text" id="compraProductoNombre" readonly>
            </div>

            <div>
              <label>Categoría</label>
              <input type="text" id="compraCategoriaProducto" readonly>
            </div>

            <div>
              <label>Cantidad *</label>
              <input type="number" id="compraCantidad" min="1">
            </div>

            <div>
              <label>Precio unitario *</label>
              <input type="number" id="compraPrecioUnitario" min="0" step="0.0001">
            </div>

            <div>
              <label>Aplica IVA 15%</label>
              <select id="compraAplicaIva">
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>

            <div>
              <label>Lote</label>
              <input type="text" id="compraLote">
            </div>

            <div>
              <label>Código vendedor</label>
              <input type="text" id="compraCodigoVendedor">
            </div>

            <div>
              <label>Fecha vencimiento</label>
              <input type="date" id="compraFechaVencimiento">
            </div>

            <div>
              <label>Subtotal</label>
              <input type="number" id="compraSubtotalLinea" readonly>
            </div>

            <div>
              <label>IVA</label>
              <input type="number" id="compraIvaLinea" readonly>
            </div>

            <div>
              <label>Total</label>
              <input type="number" id="compraTotalLinea" readonly>
            </div>

          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" id="btnAgregarDetalleCompra">Agregar artículo</button>
          </div>

          <div class="table-card" style="margin-top:18px;">
            <div class="table-header">
              <h2>Detalle de la compra</h2>
            </div>

            <div class="table-responsive">
              <table class="patient-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>P. Unit.</th>
                    <th>IVA</th>
                    <th>Subtotal</th>
                    <th>Total</th>
                    <th>Lote</th>
                    <th>F. Venc.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="tablaDetalleCompraBody">
                  <tr>
                    <td colspan="10" class="empty-row">No hay artículos agregados</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="form-card" style="margin-top:18px;">
            <h2>RESUMEN</h2>
            <div class="form-grid">
              <div>
                <label>Subtotal 0%</label>
                <input type="number" id="compraSubtotal0" readonly>
              </div>

              <div>
                <label>Subtotal 15%</label>
                <input type="number" id="compraSubtotal15" readonly>
              </div>

              <div>
                <label>IVA 15%</label>
                <input type="number" id="compraIva15" readonly>
              </div>

              <div>
                <label>Total</label>
                <input type="number" id="compraTotalGeneral" readonly>
              </div>
            </div>
          </div>

          <div class="form-actions" style="margin-top:18px;">
            <button type="submit" class="btn-primary">Registrar compra</button>
          </div>
        </form>
      </div>

    </div>
  `
},

"compras-consultar": {
  titulo: "Consultar compras",
  subtitulo: "Historial y detalle de compras registradas",
  html: `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>CONSULTAR COMPRAS</h2>
        </div>

        <form class="patient-form" style="margin-bottom:18px;">
          <div class="form-grid">
            <div>
              <label>Fecha desde</label>
              <input type="date" id="filtroCompraFechaDesde">
            </div>

            <div>
              <label>Fecha hasta</label>
              <input type="date" id="filtroCompraFechaHasta">
            </div>

            <div>
              <label>Proveedor</label>
              <input type="text" id="filtroCompraProveedor" placeholder="Nombre del proveedor">
            </div>

            <div>
              <label>RUC proveedor</label>
              <input type="text" id="filtroCompraRuc" placeholder="RUC proveedor">
            </div>

            <div>
              <label>Artículo comprado</label>
              <input type="text" id="filtroCompraArticulo" placeholder="Producto comprado">
            </div>
          </div>
        </form>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnLimpiarFiltrosCompras">
            Limpiar filtros
          </button>

          <button type="button" class="btn-primary" id="btnExportarComprasExcel">
            <i class="fa-solid fa-file-excel"></i> Exportar Excel
          </button>
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th># Compra</th>
                <th>Factura</th>
                <th>Proveedor</th>
                <th>RUC</th>
                <th>Bodega</th>
                <th>Total</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody id="tablaComprasBody">
              <tr>
                <td colspan="8" class="empty-row">No hay compras registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"descargos-registrar": {
  titulo: "Registrar descargo",
  subtitulo: "Descargo de productos por paciente",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>REGISTRAR DESCARGO</h2>

        <form id="formDescargo" class="patient-form" autocomplete="off">
          <div class="form-grid">

            <div>
              <label># Descargo</label>
              <input type="text" id="descNumero" readonly>
            </div>

            <div>
              <label>Locación</label>
              <select id="descOrigen" required>
                <option value="">Seleccione</option>
                <option value="PRE">PRE</option>
                <option value="QUIROFANO">QUIROFANO</option>
                <option value="POST">POST</option>
                <option value="HOSPITALIZACION">HOSPITALIZACION</option>
                <option value="UCI">UCI</option>
              </select>
            </div>

            <div>
              <label>Fecha de procedimiento</label>
              <input type="date" id="descFechaProcedimiento" required>
            </div>

            <div>
              <label>Paciente</label>
              <select id="descPaciente" required>
                <option value="">Seleccione</option>
              </select>
            </div>

            <div>
              <label># Archivo</label>
              <input type="text" id="descArchivo" readonly>
            </div>

            <div>
              <label>Responsable</label>
              <input type="text" id="descResponsable" required>
            </div>

          </div>

          <hr style="margin:20px 0; border-color: rgba(255,255,255,0.08);">

          <h3 style="margin-bottom:16px;">Agregar productos al descargo</h3>

          <div class="form-grid">

            <div class="full-width product-search-box">
              <label>Buscar producto</label>
              <input type="text" id="buscarProductoDescargo" placeholder="Escriba código o nombre del producto">
              <div id="resultadosProductoDescargo" class="resultados-busqueda"></div>
            </div>

            <div>
              <label>Código</label>
              <input type="text" id="descCodigo" readonly>
            </div>

            <div>
              <label>Producto</label>
              <input type="text" id="descProductoNombre" readonly>
            </div>

            <div>
              <label>Categoría</label>
              <input type="text" id="descCategoria" readonly>
            </div>

            <div>
              <label>Stock actual</label>
              <input type="number" id="descStockActual" readonly>
            </div>

            <div id="bloqueLoteDescargo" class="full-width" style="display:none;">
              <label>Seleccionar lote</label>
              <select id="descLoteSelect"></select>
            </div>

            <div>
              <label>Lote</label>
              <input type="text" id="descLoteTexto" readonly>
            </div>

            <div>
              <label>Fecha expiración</label>
              <input type="text" id="descVencimientoTexto" readonly>
            </div>

            <div>
              <label>Cantidad</label>
              <input type="number" id="descCantidad" min="1">
            </div>

            <div class="full-width">
              <label>Obs</label>
              <input type="text" id="descObsProducto">
            </div>

          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" id="btnAgregarDetalleDescargo">Agregar producto</button>
          </div>

          <div class="table-card" style="margin-top:18px;">
            <div class="table-header">
              <h2>Detalle del descargo</h2>
            </div>

            <div class="table-responsive">
              <table class="patient-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Cant</th>
                    <th>Lote</th>
                    <th>Fecha expiración</th>
                    <th>Obs</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="tablaDetalleDescargoBody">
                  <tr>
                    <td colspan="8" class="empty-row">No hay productos agregados</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="form-actions" style="margin-top:18px;">
            <button type="submit" class="btn-primary">Registrar descargo</button>
          </div>
        </form>
      </div>

    </div>
  `
},

"descargos-consultar": {
  titulo: "Consultar descargos",
  subtitulo: "Listado consolidado de descargos",
  html: `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>CONSULTAR DESCARGOS</h2>
        </div>

        <div class="form-grid" style="margin-bottom:18px;">
          <div>
            <label>Fecha de procedimiento</label>
            <input type="date" id="filtroDescFecha">
          </div>

          <div>
            <label>Paciente</label>
            <input type="text" id="filtroDescPaciente" placeholder="Paciente">
          </div>

          <div>
            <label># Archivo</label>
            <input type="text" id="filtroDescArchivo" placeholder="# Archivo">
          </div>

          <div>
            <label># Descargo</label>
            <input type="text" id="filtroDescNumero" placeholder="# Descargo">
          </div>
        </div>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnExportarDescargosExcel">
          <i class="fa-solid fa-file-excel"></i>Exportar Excel
          
      
        </button>



        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Fecha procedimiento</th>
                <th>Paciente</th>
                <th># Archivo</th>
                <th># Descargo</th>
              </tr>
            </thead>
            <tbody id="tablaDescargosBody">
              <tr>
                <td colspan="4" class="empty-row">No hay descargos registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"descargos-consolidados": {
  titulo: "Consultar descargos consolidados",
  subtitulo: "Consulta consolidada por fecha y paciente",
  html: `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>CONSULTAR DESCARGOS CONSOLIDADOS</h2>
        </div>

        <form class="patient-form" style="margin-bottom:18px;">
         <div class="form-grid">
          <div>
          <label>Fecha de procedimiento</label>
          <input type="date" id="filtroConsolidadoFecha">
          </div>

          <div>
          <label>Paciente</label>
          <select id="filtroConsolidadoPaciente">
          <option value="">Seleccione</option>
          </select>
          </div>
          </div>
          </form>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnGenerarPdfConsolidado">
            <i class="bx bxs-file-pdf"></i> Generar PDF
          </button>
        </div>

        <div id="resumenConsolidadoDescargo" style="margin-bottom:18px; color: rgba(255,255,255,0.82);">
          Seleccione una fecha y un paciente para ver el consolidado.
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th># Descargo</th>
                <th>Origen</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Lote</th>
                <th>Fecha expiración</th>
                <th>Obs</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody id="tablaDescargosConsolidadosBody">
              <tr>
                <td colspan="10" class="empty-row">No hay información para mostrar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"descargos-consignacion": {
  titulo: "Revisión insumos consignación",
  subtitulo: "Consulta y envío de insumos utilizados por casa comercial",
  html: `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>REVISIÓN INSUMOS CONSIGNACIÓN</h2>
        </div>

        <form class="patient-form" style="margin-bottom:18px;">
          <div class="form-grid">
            <div>
              <label>Fecha de procedimiento</label>
              <input type="date" id="filtroConsigFecha">
            </div>

            <div>
              <label>Paciente</label>
              <input type="text" id="filtroConsigPaciente" placeholder="Nombre del paciente">
            </div>

            <div>
              <label>Casa comercial</label>
              <input type="text" id="filtroConsigCasa" placeholder="Casa comercial">
            </div>

            <div>
              <label>Código</label>
              <input type="text" id="filtroConsigCodigo" placeholder="Código">
            </div>

            <div>
              <label>Código proveedor</label>
              <input type="text" id="filtroConsigCodigoProveedor" placeholder="Código proveedor">
            </div>
          </div>
        </form>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnLimpiarFiltrosConsignacion">
            Limpiar filtros
          </button>

          <button type="button" class="btn-primary" id="btnEnviarCorreoConsignacion">
            Enviar correo
          </button>
        </div>

        <div id="resumenConsignacionDescargo" style="margin-bottom:18px; color: rgba(255,255,255,0.82);">
          Seleccione uno o varios registros para generar y enviar el reporte por casa comercial.
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Sel</th>
                <th>Fecha proc.</th>
                <th>Paciente</th>
                <th>Casa comercial</th>
                <th>Código</th>
                <th>Código proveedor</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Lote</th>
                <th>Fecha expiración</th>
              </tr>
            </thead>
            <tbody id="tablaConsignacionBody">
              <tr>
                <td colspan="10" class="empty-row">No hay registros pendientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"descargos-consignacion-enviados": {
  titulo: "Historial consignación enviada",
  subtitulo: "Consulta de reportes de consignación ya enviados",
  html: `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>HISTORIAL CONSIGNACIÓN ENVIADA</h2>
        </div>

        <form class="patient-form" style="margin-bottom:18px;">
          <div class="form-grid">
            <div>
              <label>Fecha procedimiento</label>
              <input type="date" id="filtroConsigEnvFechaProc">
            </div>

            <div>
              <label>Fecha envío</label>
              <input type="date" id="filtroConsigEnvFechaEnvio">
            </div>

            <div>
              <label>Paciente</label>
              <input type="text" id="filtroConsigEnvPaciente" placeholder="Nombre del paciente">
            </div>

            <div>
              <label>Casa comercial</label>
              <input type="text" id="filtroConsigEnvCasa" placeholder="Casa comercial">
            </div>

            <div>
              <label>Código</label>
              <input type="text" id="filtroConsigEnvCodigo" placeholder="Código">
            </div>

            <div>
              <label>Código proveedor</label>
              <input type="text" id="filtroConsigEnvCodigoProveedor" placeholder="Código proveedor">
            </div>
          </div>
        </form>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnLimpiarFiltrosConsignacionEnviada">
            Limpiar filtros
          </button>
        </div>

        <div id="resumenConsignacionEnviada" style="margin-bottom:18px; color: rgba(255,255,255,0.82);">
          Historial de registros de consignación ya enviados por correo.
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Fecha proc.</th>
                <th>Paciente</th>
                <th>Casa comercial</th>
                <th>Código</th>
                <th>Código proveedor</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Lote</th>
                <th>F. Exp.</th>
                <th>Fecha envío</th>
                <th>Enviado por</th>
              </tr>
            </thead>
            <tbody id="tablaConsignacionEnviadaBody">
              <tr>
                <td colspan="11" class="empty-row">No hay registros enviados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

  "reportes-pacientes": {
    titulo: "Reporte de Pacientes",
    subtitulo: "Consultas y filtros",
    html: `
      <h2>Reporte de Pacientes</h2>
      <p>Aquí podrás visualizar reportes relacionados con pacientes y admisiones.</p>
    `
  },

  "reportes-inventario": {
    titulo: "Reporte de Inventario",
    subtitulo: "Movimientos y existencias",
    html: `
      <h2>Reporte de Inventario</h2>
      <p>Consulta reportes de ingresos, salidas, stock y movimientos de productos.</p>
    `
  },

  "reportes-quirofano": {
    titulo: "Reporte de Quirófano",
    subtitulo: "Actividad y consumos",
    html: `
      <h2>Reporte de Quirófano</h2>
      <p>Consulta reportes de uso de insumos, registros y actividad del módulo quirófano.</p>
    `
  },

  quirofano: {
    titulo: "Quirófano",
    subtitulo: "Registro y control de insumos",
    html: `
      <h2>Quirófano</h2>
      <p>Gestiona registros, insumos utilizados y movimientos relacionados con quirófano.</p>
    `
  },

  "campanas-reclutadores": {
  titulo: "Reclutadores",
  subtitulo: "Registro de reclutadores",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>RECLUTADORES</h2>

        <form id="formReclutador" class="patient-form">
          <div class="form-grid">
            <div>
              <label>Primer apellido</label>
              <input type="text" id="recApellido1" required>
            </div>

            <div>
              <label>Segundo apellido</label>
              <input type="text" id="recApellido2" required>
            </div>

            <div>
              <label>Primer nombre</label>
              <input type="text" id="recNombre1" required>
            </div>

            <div>
              <label>Segundo nombre</label>
              <input type="text" id="recNombre2" required>
            </div>

            <div>
              <label># Cédula</label>
              <input type="text" id="recCedula" maxlength="10" required>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Guardar reclutador</button>
          </div>
        </form>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h2>Lista de reclutadores</h2>
          <input type="text" id="buscarReclutador" placeholder="Buscar reclutador...">
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Nombre completo</th>
                <th>Cédula</th>
              </tr>
            </thead>
            <tbody id="tablaReclutadoresBody">
              <tr>
                <td colspan="2" class="empty-row">No hay reclutadores registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

  usuarios: {
    titulo: "Usuarios",
    subtitulo: "Administración y permisos",
    html: `
      <h2>Usuarios</h2>
      <p>Administra usuarios, accesos, roles y permisos dentro del sistema.</p>
    `
  },

  "usuarios-registrar": {
  titulo: "Registrar usuario",
  subtitulo: "Creación de usuarios del sistema",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>REGISTRAR USUARIO</h2>

        <form id="formUsuarioSistema" class="patient-form">
          <div class="form-grid">

            <div>
              <label>Primer apellido</label>
              <input type="text" id="usrApellido1" required>
            </div>

            <div>
              <label>Segundo apellido</label>
              <input type="text" id="usrApellido2" required>
            </div>

            <div>
              <label>Primer nombre</label>
              <input type="text" id="usrNombre1" required>
            </div>

            <div>
              <label>Segundo nombre</label>
              <input type="text" id="usrNombre2" required>
            </div>

            <div>
              <label>Usuario</label>
              <input type="text" id="usrUsername" required>
            </div>

            <div>
              <label>Contraseña</label>
              <input type="password" id="usrPassword" required>
            </div>

            <div>
              <label>Rol</label>
              <select id="usrRol" required>
                <option value="">Seleccione</option>
                <option value="ADMIN">ADMIN</option>
                <option value="INVENTARIO">INVENTARIO</option>
                <option value="DESCARGOS">DESCARGOS</option>
                <option value="AUDITORIA">AUDITORIA</option>
              </select>
            </div>

            <div>
              <label>Estado</label>
              <select id="usrEstado" required>
                <option value="">Seleccione</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>

          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" id="btnGuardarUsuarioSistema">Guardar usuario</button>
            <button type="button" class="btn-secondary" id="btnCancelarUsuarioSistema" style="display:none;">Cancelar edición</button>
          </div>
        </form>
      </div>

    </div>
  `
},

"usuarios-lista": {
  titulo: "Lista de usuarios",
  subtitulo: "Usuarios registrados en el sistema",
  html: `
    <div class="table-card">
      <div class="table-header">
        <h2>Lista de usuarios</h2>
        <input type="text" id="buscarUsuarioSistema" placeholder="Buscar usuario...">
      </div>

      <div class="form-actions" style="margin-bottom:16px;">
        <button type="button" class="btn-secondary" id="btnExportarUsuariosExcel">Exportar Excel</button>
      </div>

      <div class="table-responsive">
        <table class="patient-table">
          <thead>
            <tr>
              <th>Nombre completo</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tablaUsuariosSistemaBody">
            <tr>
              <td colspan="5" class="empty-row">No hay usuarios registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
},


  "config-archivo": {
  titulo: "# Archivo",
  subtitulo: "Configuración de numeración",
  html: `
    <div class="inventario-wrap">
      <div class="form-card">
        <h2>CONFIGURACIÓN # ARCHIVO</h2>

        <form id="formConfigArchivo" class="patient-form">
          <div class="form-grid">
            <div>
              <label>Número actual</label>
              <input type="text" id="cfgArchivoActual" readonly>
            </div>

            <div>
              <label>Nuevo número inicial</label>
              <input type="number" id="cfgNuevoArchivo" min="1" required>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Actualizar</button>
          </div>
        </form>
      </div>
    </div>
    `
   },

"config-permisos": {
  titulo: "Permisos",
  subtitulo: "Configuración de accesos del sistema",
  html: `
    <div class="permisos-panel">

      <div class="permisos-tabs">
        <button
          type="button"
          id="tabPermisosRol"
          class="permisos-tab activo"
        >
          <i class="fa-solid fa-users-gear"></i>
          Permisos por rol
        </button>

        <button
          type="button"
          id="tabPermisosUsuario"
          class="permisos-tab"
        >
          <i class="fa-solid fa-user-shield"></i>
          Permisos por usuario
        </button>
      </div>

      <div
        id="panelPermisosRol"
        class="permisos-contenido"
      >
        <div class="permisos-cabecera">
          <div>
            <h2>Permisos por rol</h2>
            <p>
              Seleccione los accesos base que tendrá cada rol.
            </p>
          </div>

          <div class="permisos-selector">
            <label for="selectRolPermisos">
              Rol
            </label>

            <select id="selectRolPermisos">
              <option value="">
                Seleccione un rol
              </option>
            </select>
          </div>
        </div>

        <div
          id="contenedorPermisosRol"
          class="permisos-arbol"
        >
          <div class="empty-row">
            Seleccione un rol para configurar sus permisos.
          </div>
        </div>

        <div class="permisos-acciones">
          <button
            type="button"
            id="btnGuardarPermisosRol"
            class="btn-primary"
            disabled
          >
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar permisos del rol
          </button>
        </div>
      </div>

      <div
        id="panelPermisosUsuario"
        class="permisos-contenido"
        style="display:none;"
      >
        <div class="permisos-cabecera">
          <div>
            <h2>Permisos por usuario</h2>
            <p>
              Configure excepciones individuales sobre el rol base.
            </p>
          </div>

          <div class="permisos-selector">
            <label for="selectUsuarioPermisos">
              Usuario
            </label>

            <select id="selectUsuarioPermisos">
              <option value="">
                Seleccione un usuario
              </option>
            </select>
          </div>
        </div>

        <div
          id="infoUsuarioPermisos"
          class="permisos-info-usuario"
          style="display:none;"
        ></div>

        <div
          id="contenedorPermisosUsuario"
          class="permisos-arbol"
        >
          <div class="empty-row">
            Seleccione un usuario para configurar permisos individuales.
          </div>
        </div>

        <div class="permisos-acciones">
          <button
            type="button"
            id="btnGuardarPermisosUsuario"
            class="btn-primary"
            disabled
          >
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar permisos del usuario
          </button>
        </div>
      </div>

    </div>
  `
},

/*pantalla profesionales de menu configuraciones */
"config-profesionales-salud": {
  titulo: "Profesionales de salud",
  subtitulo:
    "Registro de profesionales, especialidades, firma y sello",

  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2 id="tituloFormularioProfesional">
          REGISTRAR PROFESIONAL DE SALUD
        </h2>

        <form
          id="formProfesionalSalud"
          class="patient-form"
        >
          <input
            type="hidden"
            id="profesionalSaludId"
          >

          <div class="form-grid">

            <div>
              <label for="profPrimerNombre">
                Primer nombre *
              </label>

              <input
                type="text"
                id="profPrimerNombre"
                maxlength="100"
                required
              >
            </div>

            <div>
              <label for="profSegundoNombre">
                Segundo nombre
              </label>

              <input
                type="text"
                id="profSegundoNombre"
                maxlength="100"
              >
            </div>

            <div>
              <label for="profPrimerApellido">
                Primer apellido *
              </label>

              <input
                type="text"
                id="profPrimerApellido"
                maxlength="100"
                required
              >
            </div>

            <div>
              <label for="profSegundoApellido">
                Segundo apellido
              </label>

              <input
                type="text"
                id="profSegundoApellido"
                maxlength="100"
              >
            </div>

            <div>
              <label for="profTipoIdentificacion">
                Tipo de identificación *
              </label>

              <select
                id="profTipoIdentificacion"
                required
              >
                <option value="CÉDULA">
                  CÉDULA
                </option>

                <option value="PASAPORTE">
                  PASAPORTE
                </option>
              </select>
            </div>

            <div>
              <label for="profCedula">
                Identificación *
              </label>

              <input
                type="text"
                id="profCedula"
                maxlength="20"
                required
              >
            </div>

            <div>
              <label for="profCategoria">
                Categoría *
              </label>

              <select
                id="profCategoria"
                required
              >
                <option value="">
                  Cargando categorías...
                </option>
              </select>
            </div>

            <div>
              <label for="profEspecialidad">
                Especialidad o función *
              </label>

              <select
                id="profEspecialidad"
                required
              >
                <option value="">
                  Cargando especialidades...
                </option>
              </select>
            </div>

            <div class="full-width">
              <label for="profRegistroProfesional">
                Registro profesional
              </label>

              <input
                type="text"
                id="profRegistroProfesional"
                maxlength="50"
                placeholder="Opcional"
              >
            </div>

            <div>
              <label for="profFirma">
                Firma
              </label>

              <input
                type="file"
                id="profFirma"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              >

              <small>
                Formato PNG o JPG. Preferiblemente PNG
                con fondo transparente.
              </small>

              <div
                id="vistaPreviaFirmaProfesional"
                style="
                  display:none;
                  margin-top:10px;
                  min-height:100px;
                "
              ></div>
            </div>

            <div>
              <label for="profSello">
                Sello
              </label>

              <input
                type="file"
                id="profSello"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              >

              <small>
                Formato PNG o JPG. Máximo 5 MB.
              </small>

              <div
                id="vistaPreviaSelloProfesional"
                style="
                  display:none;
                  margin-top:10px;
                  min-height:100px;
                "
              ></div>
            </div>

          </div>

          <div class="form-actions">

            <button
              type="submit"
              class="btn-primary"
              id="btnGuardarProfesional"
            >
              <i class="fa-solid fa-floppy-disk"></i>
              Guardar profesional
            </button>

            <button
              type="button"
              class="btn-secondary"
              id="btnCancelarEdicionProfesional"
              style="display:none;"
            >
              Cancelar edición
            </button>

          </div>

          <div
            id="mensajeProfesionalSalud"
            style="margin-top:15px;"
          ></div>

        </form>
      </div>


      <div class="table-card">

        <div class="table-header">

          <div>
            <h2>Lista de profesionales</h2>
            <p>
              Busque por nombre, apellido, identificación,
              categoría o especialidad.
            </p>
          </div>

          <input
            type="text"
            id="buscarProfesionalSalud"
            placeholder="Buscar profesional..."
            autocomplete="off"
          >

        </div>

        <div class="table-responsive">

          <table class="patient-table">

            <thead>
              <tr>
                <th>Profesional</th>
                <th>Identificación</th>
                <th>Categoría</th>
                <th>Especialidad</th>
                <th>Firma</th>
                <th>Sello</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody id="tablaProfesionalesSaludBody">
              <tr>
                <td colspan="8" class="empty-row">
                  Cargando profesionales...
                </td>
              </tr>
            </tbody>

          </table>

        </div>
      </div>

    </div>
  `
},

/*pantalla diagnosticos cie de menu configuraciones */
"config-diagnosticos-cie": {
  titulo: "Diagnósticos CIE",
  subtitulo:
    "Administración del catálogo de diagnósticos",

  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2 id="tituloFormularioDiagnosticoCIE">
          REGISTRAR DIAGNÓSTICO CIE
        </h2>

        <form
          id="formDiagnosticoCIE"
          class="patient-form"
        >
          <input
            type="hidden"
            id="diagnosticoCieId"
          >

          <div class="form-grid">

            <div>
              <label for="diagnosticoCieCodigo">
                Código CIE *
              </label>

              <input
                type="text"
                id="diagnosticoCieCodigo"
                maxlength="20"
                placeholder="Ejemplo: I10"
                required
              >
            </div>

            <div>
              <label for="diagnosticoCieDescripcion">
                Descripción *
              </label>

              <input
                type="text"
                id="diagnosticoCieDescripcion"
                maxlength="500"
                placeholder="Descripción del diagnóstico"
                required
              >
            </div>

          </div>

          <div class="form-actions">

            <button
              type="submit"
              class="btn-primary"
              id="btnGuardarDiagnosticoCIE"
            >
              <i class="fa-solid fa-floppy-disk"></i>
              Guardar diagnóstico
            </button>

            <button
              type="button"
              class="btn-secondary"
              id="btnCancelarEdicionDiagnosticoCIE"
              style="display:none;"
            >
              Cancelar edición
            </button>

          </div>

          <div
            id="mensajeDiagnosticoCIE"
            style="margin-top:15px;"
          ></div>

        </form>
      </div>


      <div class="form-card">

        <h2>IMPORTAR DIAGNÓSTICOS CIE</h2>

        <div class="patient-form">

          <div class="form-grid">

            <div class="full-width">

              <label>
                Archivo Excel de diagnósticos
              </label>

              <p>
                El archivo debe contener las columnas
                <strong>codigo</strong> y
                <strong>descripcion</strong>.
              </p>

              <div
                class="form-actions"
                style="justify-content:flex-start;"
              >

                <button
                  type="button"
                  class="btn-secondary"
                  id="btnDescargarPlantillaCIE"
                >
                  <i class="fa-solid fa-file-excel"></i>
                  Descargar plantilla
                </button>

                <button
                  type="button"
                  class="btn-primary"
                  id="btnSeleccionarArchivoCIE"
                >
                  <i class="fa-solid fa-upload"></i>
                  Seleccionar archivo
                </button>

                <input
                  type="file"
                  id="archivoImportarCIE"
                  accept=".xlsx,.xls"
                  style="display:none;"
                >

              </div>

              <div
                id="nombreArchivoImportarCIE"
                style="margin-top:12px;"
              >
                Ningún archivo seleccionado.
              </div>

              <div
                class="form-actions"
                style="justify-content:flex-start;"
              >
                <button
                  type="button"
                  class="btn-primary"
                  id="btnEjecutarImportacionCIE"
                  disabled
                >
                  Importar diagnósticos
                </button>
              </div>

              <div
                id="resultadoImportacionCIE"
                style="
                  display:none;
                  margin-top:15px;
                "
              ></div>

            </div>

          </div>

        </div>

      </div>


      <div class="table-card">

        <div class="table-header">

          <div>
            <h2>Lista de diagnósticos CIE</h2>
            <p>
              Busque por código o descripción.
            </p>
          </div>

          <input
            type="text"
            id="buscarDiagnosticoCIE"
            placeholder="Buscar código o diagnóstico..."
            autocomplete="off"
          >

        </div>

        <div class="table-responsive">

          <table class="patient-table">

            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody id="tablaDiagnosticosCIEBody">
              <tr>
                <td colspan="4" class="empty-row">
                  Escriba un código o una descripción
                  para buscar.
                </td>
              </tr>
            </tbody>

          </table>

        </div>
      </div>

    </div>
  `
},

/*pantalla procedimientos medicos de menu configuraciones */
"config-procedimientos-medicos": {
  titulo: "Nombres de procedimientos",

  html: `
    <div class="configuracion-contenedor">

      <div class="configuracion-encabezado">
       

          <p>
            Registre, edite e importe los procedimientos médicos
            que estarán disponibles en los formularios clínicos.
          </p>
        
      </div>


      <div class="configuracion-grid">

        <!-- REGISTRO INDIVIDUAL -->
        <div class="configuracion-tarjeta">

          <h3>
            <i class="fa-solid fa-notes-medical"></i>
            Registrar procedimiento
          </h3>

          <form
            id="formProcedimientoMedico"
            autocomplete="off"
          >
            <input
              type="hidden"
              id="procedimientoMedicoId"
            >

            <div class="campo-grupo">
              <label for="nombreProcedimientoMedico">
                Nombre del procedimiento
              </label>

              <input
                type="text"
                id="nombreProcedimientoMedico"
                maxlength="300"
                placeholder="Ejemplo: CORONARIOGRAFÍA"
                required
              >
            </div>

            <div class="acciones-formulario">

              <button
                type="submit"
                id="btnGuardarProcedimientoMedico"
                class="btn-primario"
              >
                <i class="fa-solid fa-floppy-disk"></i>
                Guardar procedimiento
              </button>

              <button
                type="button"
                id="btnCancelarEdicionProcedimiento"
                class="btn-secundario"
                style="display: none;"
              >
                <i class="fa-solid fa-xmark"></i>
                Cancelar edición
              </button>

            </div>
          </form>

        </div>


        <!-- IMPORTACIÓN -->
        <div class="configuracion-tarjeta">

          <h3>
            <i class="fa-solid fa-file-excel"></i>
            Importación masiva
          </h3>

          <p>
            Descargue la plantilla, complete los nombres
            e importe el archivo Excel.
          </p>

          <div class="acciones-formulario">

            <button
              type="button"
              id="btnDescargarPlantillaProcedimientos"
              class="btn-secundario"
            >
              <i class="fa-solid fa-download"></i>
              Descargar plantilla
            </button>

            <label
              for="archivoProcedimientosMedicos"
              class="btn-primario"
              style="cursor: pointer;"
            >
              <i class="fa-solid fa-file-arrow-up"></i>
              Seleccionar Excel
            </label>

            <input
              type="file"
              id="archivoProcedimientosMedicos"
              accept=".xlsx,.xls"
              hidden
            >

          </div>

          <div
            id="nombreArchivoProcedimientos"
            class="texto-ayuda"
          >
            Ningún archivo seleccionado
          </div>

          <div class="acciones-formulario">

            <button
              type="button"
              id="btnImportarProcedimientos"
              class="btn-primario"
              disabled
            >
              <i class="fa-solid fa-file-import"></i>
              Importar procedimientos
            </button>

          </div>

          <div
            id="resultadoImportacionProcedimientos"
            class="mensaje-resultado"
            style="display: none;"
          ></div>

        </div>

      </div>


      <!-- LISTADO -->
      <div class="configuracion-tarjeta">

        <div class="tabla-encabezado">

          <div>
            <h3>
              <i class="fa-solid fa-list"></i>
              Procedimientos registrados
            </h3>
          </div>

          <div class="buscador-contenedor">

            <input
              type="search"
              id="buscarProcedimientoMedico"
              placeholder="Buscar procedimiento..."
              autocomplete="off"
            >

          </div>

        </div>


        <div class="tabla-responsive">

          <table class="tabla-configuracion">

            <thead>
              <tr>
                <th>Nombre del procedimiento</th>
                <th>Estado</th>
               
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody id="tbodyProcedimientosMedicos">

              <tr>
                <td colspan="4">
                  Cargando procedimientos...
                </td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>
  `
},

"pacientes-complementarios": {
  titulo: "Datos complementarios",
  subtitulo: "Información adicional del paciente",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>DATOS COMPLEMENTARIOS DEL PACIENTE</h2>

        <form id="formPacienteComplementario" class="patient-form">

          <div class="form-grid">

            <div>
              <label># Archivo</label>
              <input type="text" id="compArchivo" readonly>
            </div>

            <div>
              <label>Paciente</label>
              <input type="text" id="compPacienteNombre" readonly>
            </div>

            <div>
              <label>Dispensario</label>
              <input type="text" id="compDispensario">
            </div>

            <div>
              <label>Organización</label>
              <input type="text" id="compOrganizacion">
            </div>

            <div>
              <label>CVV</label>
              <input type="text" id="compCVV">
            </div>

            <div>
              <label>T/procedimiento</label>
              <select id="compTProcedimiento">
                <option value="">Seleccione</option>
              </select>
            </div>

            <div>
              <label># STENT UTILIZADO</label>
              <input type="text" id="compStentUtilizado">
            </div>

            <div>
              <label>Mes</label>
              <select id="compMes">
                <option value="">Seleccione</option>
                <option value="ENERO">ENERO</option>
                <option value="FEBRERO">FEBRERO</option>
                <option value="MARZO">MARZO</option>
                <option value="ABRIL">ABRIL</option>
                <option value="MAYO">MAYO</option>
                <option value="JUNIO">JUNIO</option>
                <option value="JULIO">JULIO</option>
                <option value="AGOSTO">AGOSTO</option>
                <option value="SEPTIEMBRE">SEPTIEMBRE</option>
                <option value="OCTUBRE">OCTUBRE</option>
                <option value="NOVIEMBRE">NOVIEMBRE</option>
                <option value="DICIEMBRE">DICIEMBRE</option>
              </select>
            </div>

            <div>
              <label>Año</label>
              <input type="number" id="compAnio" min="2000" max="2100">
            </div>

            <div>
              <label>Cirujano</label>
              <select id="compCirujano">
                <option value="">Seleccione</option>
              </select>
            </div>

            <div>
              <label>Anestesiologo</label>
              <select id="compAnestesiologo">
                <option value="">Seleccione</option>
              </select>
            </div>

            <div>
              <label>Radiologo</label>
              <select id="compRadiologo">
                <option value="">Seleccione</option>
              </select>
            </div>

            <div>
              <label>Habitación</label>
              <select id="compHabitacion">
                <option value="">Seleccione</option>
              </select>
            </div>

            <div>
              <label>Alta</label>
              <input type="date" id="compAlta">
            </div>

            <div class="full-width">
              <div class="form-grid">

                <label class="check-label">
                  <input type="checkbox" id="compUsoSala">
                  <span>USO DE SALA</span>
                </label>

                <label class="check-label">
                  <input type="checkbox" id="compLaboratorios">
                  <span>LABORATORIOS</span>
                </label>

                <label class="check-label">
                  <input type="checkbox" id="compHospitalizacion">
                  <span>HOSPITALIZACION</span>
                </label>

                <label class="check-label">
                  <input type="checkbox" id="compAlimentacion">
                  <span>ALIMENTACION</span>
                </label>

                <label class="check-label">
                  <input type="checkbox" id="compCuidados">
                  <span>CUIDADOS</span>
                </label>

              </div>
            </div>

          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Guardar datos complementarios</button>
            <button type="button" class="btn-secondary" id="btnVolverListaPacientes">Volver</button>
          </div>

        </form>
      </div>

    </div>
  `
},

"historias-clinicas": {
  titulo: "Historias clínicas",

  html: `
    <div class="table-card">

      <div class="table-header">
        <div>
          <h2>Historias clínicas</h2>
          <p>
            Seleccione la fecha del procedimiento y luego el paciente.
          </p>
        </div>
      </div>

      <div class="form-grid">

        <div class="form-group">
          <label for="hcFechaProcedimiento">
            Fecha del procedimiento
          </label>

          <input
            type="date"
            id="hcFechaProcedimiento"
          >
        </div>

        <div class="form-group">
          <label for="hcPaciente">
            Paciente
          </label>

          <select id="hcPaciente" disabled>
            <option value="">
              Primero seleccione una fecha
            </option>
          </select>
        </div>

      </div>

      <div
        id="hcDatosPaciente"
        style="display:none; margin-top:20px;"
      ></div>

      <div
        id="hcListaFormularios"
        style="display:none; margin-top:20px;"
      ></div>

    </div>
    
    
  `
  
},
"hc-documentos-generados": {
  titulo: "Documentos generados",

  html: `
    <div class="table-card">

      <div class="table-header">
        <div>
          <h2>Documentos generados</h2>
          <p>
            Busque un paciente para consultar todos sus formularios almacenados.
          </p>
        </div>
      </div>

      <div class="form-grid">

        <div class="form-group">
          <label for="hcDocsFechaProcedimiento">
            Fecha del procedimiento
          </label>

          <input
            type="date"
            id="hcDocsFechaProcedimiento"
          >
        </div>

        <div class="form-group">
          <label for="hcDocsPaciente">
            Paciente
          </label>

          <select id="hcDocsPaciente" disabled>
            <option value="">
              Primero seleccione una fecha
            </option>
          </select>
        </div>

      </div>

      <div
        id="hcDocsDatosPaciente"
        style="display:none; margin-top:20px;"
      ></div>

      <div
        id="hcDocumentosGenerados"
        style="margin-top:20px;"
      >
        <div class="empty-row">
          Seleccione una fecha y un paciente.
        </div>
      </div>

    </div>
  `
},

"config-historias-clinicas": {
  titulo: "Configurar H. Clínicas",

  html: `
    <div class="table-card">

      <div class="table-header">
        <div>
          <h2>Configurar H. Clínicas</h2>
          <p>
            Administre formularios, plantillas PDF y campos automáticos.
          </p>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn-primary"
          id="btnConfigFormulariosHC"
        >
          <i class="fa-solid fa-file-medical"></i>
          Formularios clínicos
        </button>

        <button
          type="button"
          class="btn-secondary"
          id="btnRegistrarConsentimientoHC"
        >
          <i class="fa-solid fa-file-signature"></i>
          Registrar consentimiento informado
        </button>
      </div>

      <div
        id="contenidoConfigHC"
        style="margin-top:20px;"
      ></div>

    </div>
  `
},


"config-bodegas": {
  titulo: "Bodegas",
  subtitulo: "Administración de bodegas del sistema",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>REGISTRAR BODEGA</h2>

        <form id="formBodegaSistema" class="patient-form">
          <div class="form-grid">
            <div class="full-width">
              <label>Nombre de la bodega</label>
              <input type="text" id="bodegaNombre" placeholder="Ej: BODEGA HOSPITALIZACION" required>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Guardar bodega</button>
          </div>
        </form>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h2>Lista de bodegas</h2>
          <input type="text" id="buscarBodegaSistema" placeholder="Buscar bodega...">
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Fecha creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaBodegasSistemaBody">
              <tr>
                <td colspan="4" class="empty-row">No hay bodegas registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"config-categorias-producto": {
  titulo: "Categorías producto",
  subtitulo: "Administración de categorías de productos",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>REGISTRAR CATEGORÍA DE PRODUCTO</h2>

        <form id="formCategoriaProductoSistema" class="patient-form">
          <div class="form-grid">
            <div>
              <label>Nombre</label>
              <input type="text" id="catProdNombre" required>
            </div>

            <div>
              <label>Prefijo</label>
              <input type="text" id="catProdPrefijo" maxlength="10" required>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Guardar categoría</button>
          </div>
        </form>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h2>Lista de categorías</h2>
          <input type="text" id="buscarCategoriaProducto" placeholder="Buscar categoría...">
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Prefijo</th>
                <th>Siguiente número</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaCategoriasProductoBody">
              <tr>
                <td colspan="5" class="empty-row">No hay categorías registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
},

"config-lapso-expiracion": {
  titulo: "Lapso aviso fecha expiración",
  subtitulo: "Configuración de alertas para productos próximos a vencer",
  html: `
    <div class="config-expiracion-container">

      <div class="config-expiracion-card">

        <div class="form-group">

          <label for="configExpMeses">
            Avisar productos que venzan dentro de
          </label>

          <div class="input-unidad">

            <input
              id="configExpMeses"
              type="number"
              min="1"
              max="24"
              value="3"
            >

            <span>
              meses
            </span>

          </div>

          <small>
            Por ejemplo: si configura 3 meses,
            el sistema mostrará como próximos a vencer
            los lotes cuya fecha de expiración esté
            dentro de los próximos 3 meses.
          </small>

        </div>


        <div class="form-group">

          <label for="configExpDiasCritico">
            Considerar crítico cuando falten
          </label>

          <div class="input-unidad">

            <input
              id="configExpDiasCritico"
              type="number"
              min="1"
              max="365"
              value="30"
            >

            <span>
              días
            </span>

          </div>

          <small>
            Los productos cuya fecha de expiración
            esté dentro de este período aparecerán
            como alerta crítica.
          </small>

        </div>


        <div class="config-expiracion-ejemplo">

          <strong>
            Clasificación automática
          </strong>

          <div class="exp-ejemplo exp-vencido">
            ⛔ Vencido
          </div>

          <div class="exp-ejemplo exp-critico">
            🔴 Crítico
          </div>

          <div class="exp-ejemplo exp-proximo">
            🟠 Próximo a vencer
          </div>

          <div class="exp-ejemplo exp-vigente">
            🟢 Vigente
          </div>

        </div>


        <div class="form-actions">

          <button
            type="button"
            id="btnGuardarConfigExpiracion"
            class="btn-primary"
            onclick="guardarConfiguracionExpiracion()"
          >
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar configuración
          </button>

        </div>

      </div>

    </div>
  `
},

"utilidades-importar": {
  titulo: "Importar datos",
  subtitulo: "Carga masiva desde archivos Excel",
  html: `
    <div class="inventario-wrap">

      <div class="form-card">
        <h2>IMPORTAR DATOS</h2>

        <div class="patient-form">
          <div class="form-grid">

            <div class="full-width">
              <label>Importar lista de productos</label>
              <div class="form-actions" style="justify-content:flex-start;">
                <a class="btn-secondary" href="/templates/PLANTILLA_IMPORTAR_PRODUCTOS.xlsx" download>
                  Descargar plantilla productos
                </a>
                <button type="button" class="btn-primary" id="btnImportarProductos">
                  Importar lista de productos
                </button>
                <input type="file" id="fileImportProductos" accept=".xlsx,.xls" style="display:none;">
              </div>
              <pre id="importProductosResultado" class="empty-row" style="display:none; margin-top:12px; text-align:left;"></pre>
            </div>

            <div class="full-width">
              <label>Importar lista de pacientes</label>
              <div class="form-actions" style="justify-content:flex-start;">
                <a class="btn-secondary" href="/templates/PLANTILLA_IMPORTAR_PACIENTES.xlsx" download>
                  Descargar plantilla pacientes
                </a>
                <button type="button" class="btn-primary" id="btnImportarPacientes">
                  Importar lista de pacientes
                </button>
                <input type="file" id="fileImportPacientes" accept=".xlsx,.xls" style="display:none;">
              </div>
              <pre id="importPacientesResultado" class="empty-row" style="display:none; margin-top:12px; text-align:left;"></pre>
            </div>

          </div>
        </div>
      </div>

    </div>
  `
},

"utilidades-control-expiracion": {
  titulo: "Control fecha expiración",
  subtitulo: "Supervisión de lotes y fechas de vencimiento",
  html: `
    <div class="inventario-wrap control-exp-wrap">

      <!-- ======================================
           RESUMEN
           ====================================== -->

      <div class="exp-resumen-grid">

        <div
          class="exp-resumen-card exp-card-vencido"
          onclick="filtrarEstadoExpiracion('VENCIDO')"
        >
          <div class="exp-resumen-icono">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>

          <div>
            <span>Vencidos</span>
            <strong id="expResumenVencidos">0</strong>
          </div>
        </div>


        <div
          class="exp-resumen-card exp-card-critico"
          onclick="filtrarEstadoExpiracion('CRITICO')"
        >
          <div class="exp-resumen-icono">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>

          <div>
            <span>Críticos</span>
            <strong id="expResumenCriticos">0</strong>
          </div>
        </div>


        <div
          class="exp-resumen-card exp-card-proximo"
          onclick="filtrarEstadoExpiracion('PROXIMO')"
        >
          <div class="exp-resumen-icono">
            <i class="fa-solid fa-clock"></i>
          </div>

          <div>
            <span>Próximos a vencer</span>
            <strong id="expResumenProximos">0</strong>
          </div>
        </div>


        <div
          class="exp-resumen-card exp-card-vigente"
          onclick="filtrarEstadoExpiracion('VIGENTE')"
        >
          <div class="exp-resumen-icono">
            <i class="fa-solid fa-circle-check"></i>
          </div>

          <div>
            <span>Vigentes</span>
            <strong id="expResumenVigentes">0</strong>
          </div>
        </div>

      </div>


      <!-- ======================================
           FILTROS
           ====================================== -->

      <div class="exp-filtros-card">

        <div class="exp-filtros-header">

          <div>
            <h2>
              <i class="fa-solid fa-filter"></i>
              Filtros de búsqueda
            </h2>

            <p>
              Utilice uno o varios filtros para localizar lotes específicos.
            </p>
          </div>

        </div>


        <div class="exp-filtros-grid">

          <div class="exp-field">
            <label for="expFiltroCodigo">
              Código producto
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-barcode"></i>

              <input
                type="text"
                id="expFiltroCodigo"
                placeholder="Ej. CARD000123"
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroProducto">
              Producto
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-box"></i>

              <input
                type="text"
                id="expFiltroProducto"
                placeholder="Nombre del producto..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroBodega">
              Bodega
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-warehouse"></i>

              <input
                type="text"
                id="expFiltroBodega"
                placeholder="Nombre de bodega..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroLote">
              Lote
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-layer-group"></i>

              <input
                type="text"
                id="expFiltroLote"
                placeholder="Número de lote..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroCodigoProveedor">
              Código proveedor
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-tag"></i>

              <input
                type="text"
                id="expFiltroCodigoProveedor"
                placeholder="Código del proveedor..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroCasaComercial">
              Casa comercial
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-building"></i>

              <input
                type="text"
                id="expFiltroCasaComercial"
                placeholder="Casa comercial..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroEstado">
              Estado
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-signal"></i>

              <select id="expFiltroEstado">
                <option value="">Todos</option>
                <option value="VENCIDO">Vencido</option>
                <option value="CRITICO">Crítico</option>
                <option value="PROXIMO">Próximo a vencer</option>
                <option value="VIGENTE">Vigente</option>
              </select>
            </div>
          </div>


          <div class="exp-field">
            <label for="expOrden">
              Ordenar por
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-arrow-down-a-z"></i>

              <select id="expOrden">

                <option value="vencimiento_asc">
                  Vencimiento más próximo
                </option>

                <option value="vencimiento_desc">
                  Vencimiento más lejano
                </option>

                <option value="producto_asc">
                  Producto A - Z
                </option>

                <option value="producto_desc">
                  Producto Z - A
                </option>

                <option value="codigo_asc">
                  Código A - Z
                </option>

                <option value="codigo_desc">
                  Código Z - A
                </option>

                <option value="cantidad_desc">
                  Mayor cantidad
                </option>

                <option value="cantidad_asc">
                  Menor cantidad
                </option>

              </select>
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroFechaDesde">
              Vencimiento desde
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-calendar-days"></i>

              <input
                type="date"
                id="expFiltroFechaDesde"
              >
            </div>
          </div>


          <div class="exp-field">
            <label for="expFiltroFechaHasta">
              Vencimiento hasta
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-calendar-check"></i>

              <input
                type="date"
                id="expFiltroFechaHasta"
              >
            </div>
          </div>

        </div>


        <div class="exp-filtros-actions">

          <button
            type="button"
            class="exp-btn exp-btn-buscar"
            onclick="buscarControlExpiracion()"
          >
            <i class="fa-solid fa-magnifying-glass"></i>
            Buscar
          </button>


          <button
            type="button"
            class="exp-btn exp-btn-secundario"
            onclick="limpiarFiltrosControlExpiracion()"
          >
            <i class="fa-solid fa-broom"></i>
            Limpiar filtros
          </button>


          <button
            type="button"
            class="exp-btn exp-btn-secundario"
            onclick="exportarControlExpiracionExcel()"
          >
            <i class="fa-solid fa-file-excel"></i>
            Exportar Excel
          </button>

        </div>

      </div>


      <!-- ======================================
           TABLA
           ====================================== -->

      <div class="exp-tabla-card">

        <div class="exp-tabla-header">

          <div>
            <h2>
              <i class="fa-solid fa-list-check"></i>
              Items con fecha de expiración
            </h2>

            <p>
              Lotes registrados con stock disponible.
            </p>
          </div>


          <div
            id="expInfoPaginacion"
            class="exp-total-registros"
          >
            0 registro(s)
          </div>

        </div>


        <div class="table-responsive">

          <table
            class="patient-table exp-table"
          >

            <thead>

              <tr>
                <th>Código</th>
                <th>Cód. proveedor</th>
                <th>Producto</th>
                <th>Lote</th>
                <th>Vencimiento</th>
                <th>Días restantes</th>
                <th>Estado</th>
                <th>Casa comercial</th>
                <th>Cantidad</th>
                <th>Bodega</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>

            </thead>


            <tbody
              id="tablaControlExpiracionBody"
            >

              <tr>
                <td
                  colspan="12"
                  class="empty-row"
                >
                  Cargando...
                </td>
              </tr>

            </tbody>

          </table>

        </div>


        <div class="exp-paginacion">

          <button
            type="button"
            id="btnExpAnterior"
            class="exp-btn exp-btn-secundario"
            onclick="cambiarPaginaControlExpiracion(-1)"
          >
            <i class="fa-solid fa-chevron-left"></i>
            Anterior
          </button>


          <span id="expPaginaTexto">
            Página 1 de 1
          </span>


          <button
            type="button"
            id="btnExpSiguiente"
            class="exp-btn exp-btn-secundario"
            onclick="cambiarPaginaControlExpiracion(1)"
          >
            Siguiente
            <i class="fa-solid fa-chevron-right"></i>
          </button>

        </div>

      </div>


      <!-- ======================================
           MODAL CUARENTENA
           ====================================== -->

      <!-- ======================================
     MODAL MOVER A CUARENTENA
     ====================================== -->

<div
  id="modalMoverCuarentena"
  class="kardex-modal-overlay"
  style="display:none;"
>

  <div class="kardex-modal-card cuarentena-modal-card">

    <div class="kardex-modal-header">

      <div>

        <h2>
          <i class="fa-solid fa-triangle-exclamation"></i>
          Mover a cuarentena
        </h2>

        <p>
          Separe temporalmente este lote del inventario operativo.
        </p>

      </div>


      <button
        type="button"
        class="kardex-modal-close"
        onclick="cerrarModalMoverCuarentena()"
        title="Cerrar"
      >
        ×
      </button>

    </div>


    <div class="kardex-modal-body">


      <!-- ======================================
           INFORMACIÓN DEL PRODUCTO
           ====================================== -->

      <div
        id="cuarentenaInfoProducto"
        class="cuarentena-producto-info"
      ></div>


      <!-- ======================================
           IDS INTERNOS
           ====================================== -->

      <input
        type="hidden"
        id="cuarentenaInventarioId"
      >

      <input
        type="hidden"
        id="cuarentenaDetalleEntradaId"
      >


      <!-- ======================================
           FORMULARIO
           ====================================== -->

      <div class="cuarentena-modal-grid">


        <div class="cuarentena-modal-field">

          <label for="cuarentenaCantidad">
            Cantidad a mover
          </label>

          <input
            type="number"
            id="cuarentenaCantidad"
            min="1"
            step="1"
          >

        </div>


        <div class="cuarentena-modal-field">

          <label for="cuarentenaMotivo">
            Motivo
          </label>

          <select id="cuarentenaMotivo">

            <option value="">
              Seleccione...
            </option>

            <option value="Producto vencido">
              Producto vencido
            </option>

            <option value="Próximo a vencer">
              Próximo a vencer
            </option>

            <option value="Empaque deteriorado">
              Empaque deteriorado
            </option>

            <option value="Alerta sanitaria">
              Alerta sanitaria
            </option>

            <option value="Producto observado">
              Producto observado
            </option>

            <option value="Retiro preventivo">
              Retiro preventivo
            </option>

            <option value="Otro">
              Otro
            </option>

          </select>

        </div>


        <div class="cuarentena-modal-field full-width">

          <label for="cuarentenaObservacion">
            Observación
          </label>

          <textarea
            id="cuarentenaObservacion"
            rows="4"
            placeholder="Detalle adicional..."
          ></textarea>

        </div>

      </div>


      <!-- ======================================
           ACCIONES
           ====================================== -->

      <div class="cuarentena-modal-actions">

        <button
          type="button"
          class="btn-secondary"
          onclick="cerrarModalMoverCuarentena()"
        >
          Cancelar
        </button>


        <button
          type="button"
          id="btnConfirmarMoverCuarentena"
          class="btn-primary"
          onclick="confirmarMoverCuarentena()"
        >
          <i class="fa-solid fa-box-archive"></i>
          Confirmar movimiento
        </button>

      </div>


    </div>

  </div>

</div>
  `
},

"utilidades-cuarentena": {
  titulo: "Cuarentena",
  subtitulo: "Control de productos aislados del inventario operativo",
  html: `
    <div class="inventario-wrap control-exp-wrap">

      <div class="exp-filtros-card">

        <div class="exp-filtros-header">

          <div>
            <h2>
              <i class="fa-solid fa-shield-virus"></i>
              Items en cuarentena
            </h2>

            <p>
              Consulte los lotes separados del inventario operativo.
            </p>
          </div>

        </div>


        <div class="exp-filtros-grid">

          <div class="exp-field">
            <label>
              Código producto
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-barcode"></i>

              <input
                type="text"
                id="cuarFiltroCodigo"
                placeholder="Código del producto..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label>
              Producto
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-box"></i>

              <input
                type="text"
                id="cuarFiltroProducto"
                placeholder="Nombre del producto..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label>
              Lote
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-layer-group"></i>

              <input
                type="text"
                id="cuarFiltroLote"
                placeholder="Número de lote..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label>
              Código proveedor
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-tag"></i>

              <input
                type="text"
                id="cuarFiltroCodigoProveedor"
                placeholder="Código proveedor..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label>
              Casa comercial
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-building"></i>

              <input
                type="text"
                id="cuarFiltroCasaComercial"
                placeholder="Casa comercial..."
              >
            </div>
          </div>


          <div class="exp-field">
            <label>
              Ordenar por
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-arrow-down-a-z"></i>

              <select id="cuarOrden">

                <option value="vencimiento_asc">
                  Vencimiento más próximo
                </option>

                <option value="vencimiento_desc">
                  Vencimiento más lejano
                </option>

                <option value="producto_asc">
                  Producto A - Z
                </option>

                <option value="producto_desc">
                  Producto Z - A
                </option>

                <option value="codigo_asc">
                  Código A - Z
                </option>

                <option value="codigo_desc">
                  Código Z - A
                </option>

                <option value="cantidad_desc">
                  Mayor cantidad
                </option>

                <option value="cantidad_asc">
                  Menor cantidad
                </option>

              </select>
            </div>
          </div>


          <div class="exp-field">
            <label>
              Vencimiento desde
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-calendar-days"></i>

              <input
                type="date"
                id="cuarFiltroFechaDesde"
              >
            </div>
          </div>


          <div class="exp-field">
            <label>
              Vencimiento hasta
            </label>

            <div class="exp-input-icon">
              <i class="fa-solid fa-calendar-check"></i>

              <input
                type="date"
                id="cuarFiltroFechaHasta"
              >
            </div>
          </div>

        </div>


        <div class="exp-filtros-actions">

          <button
            type="button"
            class="exp-btn exp-btn-buscar"
            onclick="buscarCuarentena()"
          >
            <i class="fa-solid fa-magnifying-glass"></i>
            Buscar
          </button>


          <button
            type="button"
            class="exp-btn exp-btn-secundario"
            onclick="limpiarFiltrosCuarentena()"
          >
            <i class="fa-solid fa-broom"></i>
            Limpiar filtros
          </button>


          <button
            type="button"
            class="exp-btn exp-btn-secundario"
            onclick="exportarCuarentenaExcel()"
          >
            <i class="fa-solid fa-file-excel"></i>
            Exportar Excel
          </button>

        </div>

      </div>


      <div class="exp-tabla-card">

        <div class="exp-tabla-header">

          <div>
            <h2>
              <i class="fa-solid fa-box-archive"></i>
              Stock en cuarentena
            </h2>

            <p>
              Estos productos no forman parte del stock operativo disponible.
            </p>
          </div>


          <div
            id="cuarInfoPaginacion"
            class="exp-total-registros"
          >
            0 registro(s)
          </div>

        </div>


        <div class="table-responsive">

          <table class="patient-table exp-table">

            <thead>

              <tr>
                <th>Código</th>
                <th>Cód. proveedor</th>
                <th>Producto</th>
                <th>Lote</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Casa comercial</th>
                <th>Cantidad</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>

            </thead>


            <tbody id="tablaCuarentenaBody">

              <tr>
                <td
                  colspan="10"
                  class="empty-row"
                >
                  Cargando...
                </td>
              </tr>

            </tbody>

          </table>

        </div>


        <div class="exp-paginacion">

          <button
            type="button"
            id="btnCuarAnterior"
            class="exp-btn exp-btn-secundario"
            onclick="cambiarPaginaCuarentena(-1)"
          >
            <i class="fa-solid fa-chevron-left"></i>
            Anterior
          </button>


          <span id="cuarPaginaTexto">
            Página 1 de 1
          </span>


          <button
            type="button"
            id="btnCuarSiguiente"
            class="exp-btn exp-btn-secundario"
            onclick="cambiarPaginaCuarentena(1)"
          >
            Siguiente
            <i class="fa-solid fa-chevron-right"></i>
          </button>

        </div>

      </div>

      <div
  id="modalLiberarCuarentena"
  class="modal"
  style="display:none;"
>

  <div class="modal-content">

    <div class="modal-header">

      <h2>
        <i class="fa-solid fa-box-open"></i>
        Liberar de cuarentena
      </h2>

      <button
        type="button"
        class="modal-close"
        onclick="cerrarModalLiberarCuarentena()"
      >
        ×
      </button>

    </div>


    <div id="liberarCuarentenaInfo"></div>


    <input
      type="hidden"
      id="liberarCuarentenaInventarioId"
    >

    <input
      type="hidden"
      id="liberarCuarentenaDetalleId"
    >


    <div class="patient-form">

      <div class="form-grid">

        <div>

          <label>
            Cantidad a liberar
          </label>

          <input
            type="number"
            id="liberarCuarentenaCantidad"
            min="1"
          >

        </div>


        <div>

          <label>
            Bodega destino
          </label>

          <select
            id="liberarCuarentenaDestino"
          >

            <option value="">
              Seleccione...
            </option>

          </select>

        </div>


        <div>

          <label>
            Motivo de liberación
          </label>

          <select
            id="liberarCuarentenaMotivo"
          >

            <option value="">
              Seleccione...
            </option>

            <option value="Producto revisado y autorizado">
              Producto revisado y autorizado
            </option>

            <option value="Producto apto para uso">
              Producto apto para uso
            </option>

            <option value="Liberación por control de calidad">
              Liberación por control de calidad
            </option>

            <option value="Corrección de movimiento">
              Corrección de movimiento
            </option>

            <option value="Otro">
              Otro
            </option>

          </select>

        </div>


        <div class="full-width">

          <label>
            Observación
          </label>

          <textarea
            id="liberarCuarentenaObservacion"
            rows="3"
            placeholder="Detalle de la liberación..."
          ></textarea>

        </div>

      </div>


      <div class="form-actions">

        <button
          type="button"
          class="btn-secondary"
          onclick="cerrarModalLiberarCuarentena()"
        >
          Cancelar
        </button>


        <button
          type="button"
          id="btnConfirmarLiberarCuarentena"
          class="btn-primary"
          onclick="confirmarLiberarCuarentena()"
        >
          <i class="fa-solid fa-check"></i>
          Confirmar liberación
        </button>

      </div>

    </div>

  </div>

</div>

    </div>
  `
},
   
};

function limpiarActivos() {
  menuLinks.forEach(link => link.classList.remove("active"));
  submenuLinks.forEach(link => link.classList.remove("active"));
}

function formatearResultadoImportacion(data) {
  if (!data) return "Sin respuesta del servidor";

  const lineas = [];

  if (data.ok) {
    lineas.push("Importación finalizada correctamente");
  } else {
    lineas.push("La importación terminó con error");
  }

  if (typeof data.insertados !== "undefined") {
    lineas.push(`Insertados: ${data.insertados}`);
  }

  if (Array.isArray(data.errores)) {
    lineas.push(`Errores: ${data.errores.length}`);

    if (data.errores.length) {
      lineas.push("");
      lineas.push("Detalle de errores:");

      data.errores.forEach(err => {
        lineas.push(`- Fila ${err.fila}: ${err.error}`);
      });
    }
  }

  if (data.error) {
    lineas.push("");
    lineas.push(`Error: ${data.error}`);
  }

  if (data.mensaje) {
    lineas.push("");
    lineas.push(data.mensaje);
  }

  return lineas.join("\n");
}

async function inicializarModuloImportarDatos() {
  const btnProd = document.getElementById("btnImportarProductos");
  const fileProd = document.getElementById("fileImportProductos");
  const outProd = document.getElementById("importProductosResultado");

  const btnPac = document.getElementById("btnImportarPacientes");
  const filePac = document.getElementById("fileImportPacientes");
  const outPac = document.getElementById("importPacientesResultado");

  if (btnProd && fileProd && outProd) {
    btnProd.addEventListener("click", () => fileProd.click());

    fileProd.addEventListener("change", async () => {
      if (!fileProd.files?.length) return;

      try {
        const fd = new FormData();
        fd.append("file", fileProd.files[0]);

        const resp = await fetch("/api/import/productos", {
          method: "POST",
          body: fd
        });

        const data = await resp.json().catch(() => ({}));

        outProd.style.display = "block";
        outProd.textContent = formatearResultadoImportacion(data);

        if (!resp.ok && !data.error) {
          outProd.textContent += `\n\nHTTP ${resp.status}`;
        }
      } catch (error) {
        console.error("Error importando productos:", error);
        outProd.style.display = "block";
        outProd.textContent = "Error al conectar con el servidor";
      }

      fileProd.value = "";
    });
  }

  if (btnPac && filePac && outPac) {
    btnPac.addEventListener("click", () => filePac.click());

    filePac.addEventListener("change", async () => {
      if (!filePac.files?.length) return;

      try {
        const fd = new FormData();
        fd.append("file", filePac.files[0]);

        const resp = await fetch("/api/import/pacientes", {
          method: "POST",
          body: fd
        });

        const data = await resp.json().catch(() => ({}));

        outPac.style.display = "block";
        outPac.textContent = formatearResultadoImportacion(data);

        if (!resp.ok && !data.error) {
          outPac.textContent += `\n\nHTTP ${resp.status}`;
        }
      } catch (error) {
        console.error("Error importando pacientes:", error);
        outPac.style.display = "block";
        outPac.textContent = "Error al conectar con el servidor";
      }

      filePac.value = "";
    });
  }
}





/* =========================
   PACIENTES
========================= */

function renderTablaPacientes(filtro = "") {
  const tbody = document.getElementById("tablaPacientesBody");
  if (!tbody) return;

  const texto = filtro.toLowerCase().trim();

  const lista = pacientes.filter(p =>
    p.hc.toLowerCase().includes(texto) ||
    p.nombre.toLowerCase().includes(texto) ||
    (p.cedula || "").toLowerCase().includes(texto)
  );

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">No hay pacientes registrados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((p, index) => `
    <tr>
      <td>${p.hc}</td>
      <td>${p.nombre}</td>
      <td>${p.cedula || ""}</td>
      <td>${p.sexo || ""}</td>
      <td>${p.telefono || ""}</td>
      <td>
        <div class="table-actions">
          <button class="btn-table edit" data-index="${index}">Editar</button>
          <button class="btn-table delete" data-index="${index}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-table.edit").forEach(btn => {
    btn.addEventListener("click", () => cargarPacienteEnFormulario(Number(btn.dataset.index), filtro));
  });

  document.querySelectorAll(".btn-table.delete").forEach(btn => {
    btn.addEventListener("click", () => eliminarPaciente(Number(btn.dataset.index), filtro));
  });
}



/*async function guardarBorradorFormulario001() {
  const boton = document.getElementById(
    "btnGuardarBorrador001"
  );

  try {
    const datos = obtenerDatosFormulario001();

    if (!datos.paciente_id) {
      throw new Error("Debe seleccionar un paciente");
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "Debe ingresar la fecha de admisión"
      );
    }

    if (boton) {
      boton.disabled = true;
      boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const respuesta = await fetch(
      "/api/hclinicas/001/guardar-borrador",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo guardar el borrador"
      );
    }

    alert(resultado.mensaje);

  } catch (error) {
    console.error(
      "ERROR GUARDANDO BORRADOR 001:",
      error
    );

    alert(
      error.message ||
      "No se pudo guardar el borrador"
    );
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Guardar borrador
      `;
    }
  }
}*/

async function guardarBorradorFormulario001() {
  const botonGuardar =
    document.getElementById(
      "btnGuardarBorrador001"
    );

  try {
    const datos =
      obtenerDatosFormulario001();

    if (!datos.paciente_id) {
      throw new Error(
        "No se pudo identificar al paciente"
      );
    }

    if (
      !datos.fecha_admision_paciente
    ) {
      throw new Error(
        "Debe ingresar la fecha de admisión"
      );
    }

    if (botonGuardar) {
      botonGuardar.disabled = true;

      botonGuardar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/001/guardar-borrador",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body:
          JSON.stringify(datos)
      }
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo guardar el borrador"
      );
    }

    alert(
      "Borrador guardado correctamente"
    );

  } catch (error) {
    console.error(
      "ERROR GUARDANDO BORRADOR 001:",
      error
    );

    alert(
      error.message ||
      "No se pudo guardar el borrador"
    );

  } finally {
    if (botonGuardar) {
      /*
        Solo se reactiva si el formulario
        no está marcado como cerrado.
      */
      const formularioCerrado =
        document.getElementById(
          "avisoFormulario001Cerrado"
        );

      if (!formularioCerrado) {
        botonGuardar.disabled = false;

        botonGuardar.innerHTML = `
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar borrador
        `;
      }
    }
  }
}

async function cerrarFormulario001() {
  const confirmado = confirm(
    "¿Está seguro de cerrar definitivamente el formulario 001?\n\n" +
    "Después de cerrarlo ya no podrá modificarlo como borrador."
  );

  if (!confirmado) {
    return;
  }

  const botonCerrar = document.getElementById(
    "btnCerrarFormulario001"
  );

  const botonGuardar = document.getElementById(
    "btnGuardarBorrador001"
  );

  const botonGenerar = document.getElementById(
    "btnGenerarPDF001"
  );

  let cerradoExitosamente = false;

  try {
    const datos = obtenerDatosFormulario001();

    if (!datos.paciente_id) {
      throw new Error(
        "No se pudo identificar al paciente"
      );
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "Debe ingresar la fecha de admisión"
      );
    }

    /*
      Bloquear temporalmente los botones mientras
      se ejecuta todo el proceso.
    */
    if (botonCerrar) {
      botonCerrar.disabled = true;
      botonCerrar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Cerrando formulario...
      `;
    }

    if (botonGuardar) {
      botonGuardar.disabled = true;
    }

    if (botonGenerar) {
      botonGenerar.disabled = true;
    }

    /* =========================================
       1. GUARDAR LOS ÚLTIMOS DATOS DEL BORRADOR
    ========================================= */

    const respuestaBorrador = await fetch(
      "/api/hclinicas/001/guardar-borrador",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
      }
    );

    const resultadoBorrador =
      await respuestaBorrador
        .json()
        .catch(() => ({}));

    if (!respuestaBorrador.ok) {
      throw new Error(
        resultadoBorrador.detalle ||
        resultadoBorrador.error ||
        "No se pudo guardar la información antes del cierre"
      );
    }

    /* =========================================
       2. GENERAR EL PDF DEFINITIVO
    ========================================= */

    const respuestaPDF = await fetch(
      "/api/hclinicas/001/generar-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
      }
    );

    const resultadoPDF = await respuestaPDF
      .json()
      .catch(() => ({}));

    if (!respuestaPDF.ok) {
      throw new Error(
        resultadoPDF.detalle ||
        resultadoPDF.error ||
        "No se pudo generar el PDF antes del cierre"
      );
    }

    const documentoId =
      Number(resultadoPDF.documento?.id);

    if (
      !Number.isInteger(documentoId) ||
      documentoId <= 0
    ) {
      throw new Error(
        "El servidor no devolvió un documento PDF válido"
      );
    }

    /* =========================================
       3. CERRAR EL FORMULARIO Y EL PDF
    ========================================= */

    const respuestaCierre = await fetch(
      "/api/hclinicas/001/cerrar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paciente_id: Number(datos.paciente_id),
          documento_id: documentoId,
          fecha_procedimiento:
            datos.fecha_admision_paciente
        })
      }
    );

    const resultadoCierre = await respuestaCierre
      .json()
      .catch(() => ({}));

    if (!respuestaCierre.ok) {
      throw new Error(
        resultadoCierre.detalle ||
        resultadoCierre.error ||
        "No se pudo cerrar el formulario"
      );
    }

    cerradoExitosamente = true;

    bloquearFormulario001Cerrado();

    alert(
      "Formulario 001 cerrado correctamente.\n\n" +
      `Documento: ${
        resultadoCierre.documento?.nombre_archivo ||
        resultadoPDF.documento?.nombreArchivo ||
        ""
      }\n` +
      `Versión: ${
        resultadoCierre.documento?.version ||
        resultadoPDF.documento?.version ||
        ""
      }\n` +
      "Estado: CERRADO"
    );

  } catch (error) {
    console.error(
      "ERROR CERRANDO FORMULARIO 001:",
      error
    );

    alert(
      error.message ||
      "No se pudo cerrar el formulario 001"
    );

  } finally {
    /*
      Si el cierre falló, restauramos los botones.
      Si fue exitoso, permanecen bloqueados.
    */
    if (!cerradoExitosamente) {
      if (botonCerrar) {
        botonCerrar.disabled = false;
        botonCerrar.innerHTML = `
          <i class="fa-solid fa-lock"></i>
          Cerrar formulario
        `;
      }

      if (botonGuardar) {
        botonGuardar.disabled = false;
      }

      if (botonGenerar) {
        botonGenerar.disabled = false;
      }
    }
  }
}


function bloquearFormulario001Cerrado(
  informacion = {}
) {
  const formulario =
    document.getElementById(
      "formHC001"
    );

  if (!formulario) {
    return;

    const botonCerrar =
  document.getElementById(
    "btnCerrarFormulario008"
  );

if (botonCerrar) {
  botonCerrar.innerHTML = `
    <i class="fa-solid fa-lock"></i>
    Formulario cerrado
  `;

  botonCerrar.disabled = true;
}
  }

  formulario
    .querySelectorAll(
      "input, select, textarea"
    )
    .forEach(campo => {
      campo.disabled = true;
    });

  const botonGuardar =
    document.getElementById(
      "btnGuardarBorrador001"
    );

  const botonGenerar =
    document.getElementById(
      "btnGenerarPDF001"
    );

  const botonCerrar =
    document.getElementById(
      "btnCerrarFormulario001"
    );

  if (botonGuardar) {
    botonGuardar.disabled = true;
  }

  if (botonGenerar) {
    botonGenerar.disabled = true;
  }

  if (botonCerrar) {
    botonCerrar.disabled = true;

    botonCerrar.innerHTML = `
      <i class="fa-solid fa-lock"></i>
      Formulario cerrado
    `;
  }

  const avisoExistente =
    document.getElementById(
      "avisoFormulario001Cerrado"
    );

  if (avisoExistente) {
    return;
  }

  const aviso =
    document.createElement("div");

  aviso.id =
    "avisoFormulario001Cerrado";

  aviso.style.cssText = `
    margin: 0 0 18px 0;
    padding: 14px 16px;
    border: 1px solid #8b1e1e;
    border-radius: 8px;
    background: rgba(139, 30, 30, 0.12);
    color: inherit;
    font-weight: 600;
    line-height: 1.5;
  `;

  let detalleCierre = "";

  if (informacion.cerradoPor) {
    detalleCierre += `
      <br>
      <small>
        Cerrado por:
        ${escaparHTML001(
          informacion.cerradoPor
        )}
      </small>
    `;
  }

  if (informacion.fechaCierre) {
    let fechaMostrada =
      informacion.fechaCierre;

    const fechaObjeto =
      new Date(
        informacion.fechaCierre
      );

    if (
      !Number.isNaN(
        fechaObjeto.getTime()
      )
    ) {
      fechaMostrada =
        fechaObjeto.toLocaleString(
          "es-EC"
        );
    }

    detalleCierre += `
      <br>
      <small>
        Fecha de cierre:
        ${escaparHTML001(
          fechaMostrada
        )}
      </small>
    `;
  }

  const botonReabrir =
    rolUsuarioActivo === "ADMIN"
      ? `
        <div style="margin-top:14px;">
          <button
            type="button"
            id="btnReabrirFormulario001"
            class="btn-secondary"
          >
            <i class="fa-solid fa-lock-open"></i>
            Reabrir formulario
          </button>
        </div>
      `
      : "";

  aviso.innerHTML = `
    <i class="fa-solid fa-lock"></i>
    Este formulario se encuentra cerrado y
    ya no puede modificarse.

    ${detalleCierre}
    ${botonReabrir}
  `;

  formulario.prepend(aviso);

  const botonReabrirElemento =
    document.getElementById(
      "btnReabrirFormulario001"
    );

  if (botonReabrirElemento) {
    botonReabrirElemento.addEventListener(
      "click",
      reabrirFormulario001
    );
  }
}

async function reabrirFormulario001() {
  if (rolUsuarioActivo !== "ADMIN") {
    alert(
      "Solo un usuario ADMIN puede reabrir este formulario."
    );
    return;
  }

  const pacienteId =
    pacienteHistoriaClinicaSeleccionado?.id;

  const fechaProcedimiento =
    obtenerFechaProcedimientoPacienteHC(
      pacienteHistoriaClinicaSeleccionado
    );

  if (!pacienteId) {
    alert(
      "No se pudo identificar al paciente."
    );
    return;
  }

  if (!fechaProcedimiento) {
    alert(
      "No se pudo identificar la fecha del procedimiento."
    );
    return;
  }

  const motivo = prompt(
    "Ingrese el motivo de la reapertura del formulario 001:"
  );

  if (motivo === null) {
    return;
  }

  const motivoLimpio =
    String(motivo).trim();

  if (motivoLimpio.length < 5) {
    alert(
      "Debe ingresar un motivo de al menos 5 caracteres."
    );
    return;
  }

  const confirmado = confirm(
    "¿Confirma la reapertura del formulario 001?\n\n" +
    "El PDF cerrado permanecerá guardado como historial."
  );

  if (!confirmado) {
    return;
  }

  const botonReabrir =
    document.getElementById(
      "btnReabrirFormulario001"
    );

  try {
    if (botonReabrir) {
      botonReabrir.disabled = true;

      botonReabrir.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Reabriendo...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/001/reabrir",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          paciente_id:
            Number(pacienteId),

          fecha_procedimiento:
            fechaProcedimiento,

          motivo_reapertura:
            motivoLimpio
        })
      }
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo reabrir el formulario"
      );
    }

    habilitarFormulario001Reabierto();

    alert(
      "Formulario 001 reabierto correctamente.\n\n" +
      "Ya puede realizar las correcciones necesarias."
    );

  } catch (error) {
    console.error(
      "ERROR REABRIENDO FORMULARIO 001:",
      error
    );

    alert(
      error.message ||
      "No se pudo reabrir el formulario 001"
    );

    if (botonReabrir) {
      botonReabrir.disabled = false;

      botonReabrir.innerHTML = `
        <i class="fa-solid fa-lock-open"></i>
        Reabrir formulario
      `;
    }
  }
}

function habilitarFormulario001Reabierto() {
  const formulario =
    document.getElementById(
      "formHC001"
    );

  if (!formulario) {
    return;
  }

  formulario
    .querySelectorAll(
      "input, select, textarea"
    )
    .forEach(campo => {
      campo.disabled = false;
    });

  const aviso =
    document.getElementById(
      "avisoFormulario001Cerrado"
    );

  if (aviso) {
    aviso.remove();
  }

  const botonGuardar =
    document.getElementById(
      "btnGuardarBorrador001"
    );

  const botonGenerar =
    document.getElementById(
      "btnGenerarPDF001"
    );

  const botonCerrar =
    document.getElementById(
      "btnCerrarFormulario001"
    );

  if (botonGuardar) {
    botonGuardar.disabled = false;

    botonGuardar.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Guardar borrador
    `;
  }

  if (botonGenerar) {
    botonGenerar.disabled = false;

    botonGenerar.innerHTML = `
      <i class="fa-solid fa-file-pdf"></i>
      Generar PDF
    `;
  }

  if (botonCerrar) {
    botonCerrar.disabled = false;

    botonCerrar.innerHTML = `
      <i class="fa-solid fa-lock"></i>
      Cerrar formulario
    `;
  }
}

function escaparHTML001(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function limpiarFormularioPaciente() {
  const form = document.getElementById("formPaciente");
  if (form) form.reset();
  editIndex = -1;

  const btnGuardar = document.getElementById("btnGuardarPaciente");
  const btnCancelar = document.getElementById("btnCancelarEdicion");

  if (btnGuardar) btnGuardar.textContent = "Guardar paciente";
  if (btnCancelar) btnCancelar.style.display = "none";
}

function cargarPacienteEnFormulario(index, filtroActual = "") {
  const p = pacientes[index];
  if (!p) return;

  document.getElementById("hc").value = p.hc || "";
  document.getElementById("nombre").value = p.nombre || "";
  document.getElementById("cedula").value = p.cedula || "";
  document.getElementById("fechaNacimiento").value = p.fechaNacimiento || "";
  document.getElementById("sexo").value = p.sexo || "";
  document.getElementById("telefono").value = p.telefono || "";
  document.getElementById("direccion").value = p.direccion || "";

  editIndex = index;

  document.getElementById("btnGuardarPaciente").textContent = "Actualizar paciente";
  document.getElementById("btnCancelarEdicion").style.display = "inline-flex";

  renderTablaPacientes(filtroActual);
}

function eliminarPaciente(index, filtroActual = "") {
  if (!confirm("¿Desea eliminar este paciente?")) return;
  pacientes.splice(index, 1);
  if (editIndex === index) limpiarFormularioPaciente();
  renderTablaPacientes(filtroActual);
}

function inicializarModuloPacientes() {
  const form = document.getElementById("formPaciente");
  const inputBuscar = document.getElementById("buscarPaciente");
  const btnCancelar = document.getElementById("btnCancelarEdicion");

  if (!form) return;

  renderTablaPacientes();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nuevoPaciente = {
      hc: document.getElementById("hc").value.trim(),
      nombre: document.getElementById("nombre").value.trim(),
      cedula: document.getElementById("cedula").value.trim(),
      fechaNacimiento: document.getElementById("fechaNacimiento").value,
      sexo: document.getElementById("sexo").value,
      telefono: document.getElementById("telefono").value.trim(),
      direccion: document.getElementById("direccion").value.trim()
    };

    if (!nuevoPaciente.hc || !nuevoPaciente.nombre) {
      alert("Historia clínica y nombre son obligatorios");
      return;
    }

    if (editIndex >= 0) {
      pacientes[editIndex] = nuevoPaciente;
    } else {
      pacientes.push(nuevoPaciente);
    }

    limpiarFormularioPaciente();
    renderTablaPacientes(inputBuscar.value);
  });

  inputBuscar.addEventListener("input", () => {
    renderTablaPacientes(inputBuscar.value);
  });

  btnCancelar.addEventListener("click", () => {
    limpiarFormularioPaciente();
  });
}

async function datosComplementariosPaciente(id) {
  pacienteComplementarioId = id;
  cambiarContenido("pacientes-complementarios")
}

async function poblarSelectConfigDesplegable(selectId, tipo, incluirVacio = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch(`/api/config/desplegables?tipo=${encodeURIComponent(tipo)}`);
    const items = await res.json();

    let html = incluirVacio ? `<option value="">Seleccione</option>` : "";

    html += (items || [])
      .filter(x => x.estado === "ACTIVO")
      .map(x => `<option value="${x.valor}">${x.valor}</option>`)
      .join("");

    select.innerHTML = html;
  } catch (error) {
    console.error(`Error cargando desplegable ${tipo}:`, error);
    select.innerHTML = incluirVacio ? `<option value="">Seleccione</option>` : "";
  }
}

/* =========================
   DATOS COMPLEMENTARIOS DE PACIENTES DE ADMISION
========================= */
async function inicializarModuloPacienteComplementario() {
  const form = document.getElementById("formPacienteComplementario");
  const btnVolver = document.getElementById("btnVolverListaPacientes");

  if (!form || !pacienteComplementarioId) return;

  try {
    const resPaciente = await fetch(`/api/pacientes/${pacienteComplementarioId}`);
    const paciente = await resPaciente.json().catch(() => ({}));

    if (!resPaciente.ok) {
      alert(paciente.error || "Error al cargar paciente");
      cambiarContenido("pacientes-lista");
      return;
    }

    const nombrePaciente = [
      paciente.pac_apellido1,
      paciente.pac_apellido2,
      paciente.pac_nombre1,
      paciente.pac_nombre2
    ].filter(Boolean).join(" ");

    document.getElementById("compArchivo").value = paciente.archivo || "";
    document.getElementById("compPacienteNombre").value = nombrePaciente;

    await poblarSelectConfigDesplegable("compTProcedimiento", "T/procedimiento");
    await poblarSelectConfigDesplegable("compCirujano", "Cirujano");
    await poblarSelectConfigDesplegable("compAnestesiologo", "Anestesiologo");
    await poblarSelectConfigDesplegable("compRadiologo", "Radiologo");
    await poblarSelectConfigDesplegable("compHabitacion", "Habitacion");

    const resComp = await fetch(`/api/pacientes/complementarios/${pacienteComplementarioId}`);
    const comp = await resComp.json().catch(() => ({}));

    if (comp && Object.keys(comp).length) {
      document.getElementById("compDispensario").value = comp.dispensario || "";
      document.getElementById("compOrganizacion").value = comp.organizacion || "";
      document.getElementById("compCVV").value = comp.cvv || "";
      document.getElementById("compTProcedimiento").value = comp.t_procedimiento || "";
      document.getElementById("compStentUtilizado").value = comp.stent_utilizado || "";
      document.getElementById("compMes").value = comp.mes || "";
      document.getElementById("compAnio").value = comp.anio || "";
      document.getElementById("compCirujano").value = comp.cirujano || "";
      document.getElementById("compAnestesiologo").value = comp.anestesiologo || "";
      document.getElementById("compRadiologo").value = comp.radiologo || "";
      document.getElementById("compHabitacion").value = comp.habitacion || "";
      document.getElementById("compAlta").value = comp.alta ? String(comp.alta).slice(0, 10) : "";

      document.getElementById("compUsoSala").checked = !!comp.uso_sala;
      document.getElementById("compLaboratorios").checked = !!comp.laboratorios;
      document.getElementById("compHospitalizacion").checked = !!comp.hospitalizacion;
      document.getElementById("compAlimentacion").checked = !!comp.alimentacion;
      document.getElementById("compCuidados").checked = !!comp.cuidados;
    }
  } catch (error) {
    console.error("Error inicializando datos complementarios:", error);
    alert("Error al cargar datos complementarios");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      dispensario: document.getElementById("compDispensario").value.trim(),
      organizacion: document.getElementById("compOrganizacion").value.trim(),
      cvv: document.getElementById("compCVV").value.trim(),
      tProcedimiento: document.getElementById("compTProcedimiento").value,
      stentUtilizado: document.getElementById("compStentUtilizado").value.trim(),
      mes: document.getElementById("compMes").value,
      anio: Number(document.getElementById("compAnio").value || 0) || null,
      cirujano: document.getElementById("compCirujano").value,
      anestesiologo: document.getElementById("compAnestesiologo").value,
      radiologo: document.getElementById("compRadiologo").value,
      habitacion: document.getElementById("compHabitacion").value,
      alta: document.getElementById("compAlta").value || null,
      usoSala: document.getElementById("compUsoSala").checked,
      laboratorios: document.getElementById("compLaboratorios").checked,
      hospitalizacion: document.getElementById("compHospitalizacion").checked,
      alimentacion: document.getElementById("compAlimentacion").checked,
      cuidados: document.getElementById("compCuidados").checked
    };

    try {
      const res = await fetch(`/api/pacientes/complementarios/${pacienteComplementarioId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al guardar datos complementarios");
        return;
      }

      alert("Datos complementarios guardados correctamente");
      cambiarContenido("pacientes-lista");
    } catch (error) {
      console.error("Error guardando datos complementarios:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      cambiarContenido("pacientes-lista");
    });
  }
}

/* =========================
   CASAS COMERCIALES
========================= */

function poblarSelectCasas(selectId, incluirVacia = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  let opciones = "";

  if (incluirVacia) {
    opciones += `<option value="">Seleccione</option>`;
  }

  opciones += casasComerciales.map(casa => `
    <option value="${casa.nombre}">${casa.nombre}</option>
  `).join("");

  select.innerHTML = opciones;
}



/*function inicializarModuloCasas() {
  const form = document.getElementById("formCasaComercial");
  const inputBuscar = document.getElementById("buscarCasa");

  if (!form || !inputBuscar) return;

  renderTablaCasas();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nuevaCasa = {
      nombre: document.getElementById("casaNombre").value.trim(),
      ruc: document.getElementById("casaRuc").value.trim(),
      correos: document.getElementById("casaCorreos").value.trim()
    };

    if (!nuevaCasa.nombre) {
      alert("El nombre es obligatorio");
      return;
    }

    const existe = casasComerciales.some(
      casa => casa.nombre.toLowerCase() === nuevaCasa.nombre.toLowerCase()
    );

    if (existe) {
      alert("Ya existe una casa comercial con ese nombre");
      return;
    }

    casasComerciales.push(nuevaCasa);
    form.reset();
    renderTablaCasas(inputBuscar.value);
  });

  inputBuscar.addEventListener("input", () => {
    renderTablaCasas(inputBuscar.value);
  });
}*/

async function inicializarModuloCasasComerciales() {
  const form = document.getElementById("formCasaComercial");
  const inputId = document.getElementById("casaId");
  const inputNombre = document.getElementById("casaNombre");
  const inputRuc = document.getElementById("casaRuc");
  const inputCorreos = document.getElementById("casaCorreos");
  const btnGuardar = document.getElementById("btnGuardarCasa");
  const btnCancelar = document.getElementById("btnCancelarCasa");

  await renderTablaCasasComerciales();

  if (!form || !inputNombre) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = inputId ? inputId.value.trim() : "";
    const nombre = inputNombre.value.trim();
    const ruc = inputRuc ? inputRuc.value.trim() : "";
    const correos = inputCorreos ? inputCorreos.value.trim() : "";

    if (!nombre) {
      alert("Ingrese el nombre de la casa comercial");
      return;
    }

    try {
      const esEdicion = !!id;

      const res = await fetch(esEdicion ? `/api/casas/${id}` : "/api/casas", {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nombre, ruc, correos })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al guardar casa comercial");
        return;
      }

      form.reset();
      if (inputId) inputId.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar casa comercial";
      if (btnCancelar) btnCancelar.style.display = "none";

      await renderTablaCasasComerciales();
      alert(esEdicion ? "Casa comercial actualizada correctamente" : "Casa comercial registrada correctamente");
    } catch (error) {
      console.error("Error guardando casa comercial:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      form.reset();
      if (inputId) inputId.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar casa comercial";
      btnCancelar.style.display = "none";
    });
  }
}

async function cargarCasasComercialesDesdeSQL() {
  try {
    const res = await fetch("/api/casas");
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error cargando casas comerciales:", error);
    return [];
  }
}


async function renderTablaCasasComerciales() {
  const tbody = document.getElementById("tablaCasasBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/casas");
    const lista = await res.json().catch(() => ([]));

    if (!res.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">Error al cargar casas comerciales</td>
        </tr>
      `;
      return;
    }

    if (!Array.isArray(lista) || !lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">No hay casas comerciales registradas</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>${c.nombre || ""}</td>
        <td>${c.ruc || ""}</td>
        <td>${c.correos || ""}</td>
        <td>${c.estado || ""}</td>
        <td>
          <button class="btn-table edit btn-editar-casa" data-id="${c.id}">
            Editar
          </button>
          <button class="btn-table edit btn-toggle-casa" data-id="${c.id}">
            Estado
          </button>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll(".btn-toggle-casa").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          const res = await fetch(`/api/casas/estado/${btn.dataset.id}`, {
            method: "PATCH"
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            alert(data.error || "Error al cambiar estado");
            return;
          }

          await renderTablaCasasComerciales();
        } catch (error) {
          console.error("Error cambiando estado casa comercial:", error);
          alert("Error al conectar con el servidor");
        }
      });
    });

    document.querySelectorAll(".btn-editar-casa").forEach(btn => {
      btn.addEventListener("click", () => {
        editarCasaComercial(Number(btn.dataset.id), lista);
      });
    });

  } catch (error) {
    console.error("Error renderizando casas comerciales:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">Error al cargar casas comerciales</td>
      </tr>
    `;
  }
}

async function poblarSelectCasas(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) return;

  const casas = await cargarCasasComercialesDesdeSQL();

  select.innerHTML = `<option value="">Seleccione</option>` +
    casas
      .filter(c => String(c.estado || "").toUpperCase() === "ACTIVO")
      .map(c => `<option value="${c.nombre}">${c.nombre}</option>`)
      .join("");
}

function editarCasaComercial(id, lista) {
  const casa = lista.find(c => Number(c.id) === Number(id));
  if (!casa) return;

  const inputId = document.getElementById("casaId");
  const inputNombre = document.getElementById("casaNombre");
  const inputRuc = document.getElementById("casaRuc");
  const inputCorreos = document.getElementById("casaCorreos");
  const btnGuardar = document.getElementById("btnGuardarCasa");
  const btnCancelar = document.getElementById("btnCancelarCasa");

  if (inputId) inputId.value = casa.id;
  if (inputNombre) inputNombre.value = casa.nombre || "";
  if (inputRuc) inputRuc.value = casa.ruc || "";
  if (inputCorreos) inputCorreos.value = casa.correos || "";

  if (btnGuardar) btnGuardar.textContent = "Actualizar casa comercial";
  if (btnCancelar) btnCancelar.style.display = "inline-block";
}



/* =========================
   INVENTARIO
========================= */



function renderTablaInventario(filtro = "") {
  const tbody = document.getElementById("tablaInventarioBody");
  if (!tbody) return;

  const texto = filtro.toLowerCase().trim();

  const lista = inventario.filter(item =>
    item.bodega.toLowerCase().includes(texto) ||
    item.codigo.toLowerCase().includes(texto) ||
    item.producto.toLowerCase().includes(texto) ||
    (item.categoria || "").toLowerCase().includes(texto) ||
    (item.ubicacion || "").toLowerCase().includes(texto)
  );

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">No hay stock registrado</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(item => `
    <tr>
      <td>${item.bodega}</td>
      <td>${item.codigo}</td>
      <td>${item.producto}</td>
      <td>${item.categoria || ""}</td>
      <td>${item.stock}</td>
      <td>${item.ubicacion || ""}</td>
    </tr>
  `).join("");
}

function limpiarFormularioInventario() {
  const form = document.getElementById("formInventario");
  if (form) form.reset();
  editInventarioIndex = -1;

  const btnGuardar = document.getElementById("btnGuardarInventario");
  const btnCancelar = document.getElementById("btnCancelarInventario");

  if (btnGuardar) btnGuardar.textContent = "Guardar producto";
  if (btnCancelar) btnCancelar.style.display = "none";
}

function cargarInventarioEnFormulario(index, filtroActual = "") {
  return;
}

/*async function cargarInventarioDesdeSQL() {
  try {
    const res = await fetch("/api/inventario");
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error cargando inventario desde SQL:", error);
    return [];
  }
}*/

async function cargarDetalleEntradasDesdeSQL() {
  try {
    const res = await fetch("/api/detalle-entradas");
    const data = await res.json().catch(() => ([]));

    return (Array.isArray(data) ? data : []).map(item => ({
      ...item,
      stockLote: item.stockLote ?? item.stock_lote ?? 0,
      codigoProveedor: item.codigoProveedor ?? item.codigoproveedor ?? "",
      casaComercial: item.casaComercial ?? item.casa_comercial ?? "",
      stockMinimo: item.stockMinimo ?? item.stock_minimo ?? 0
    }));
  } catch (error) {
    console.error("Error cargando detalle entradas desde SQL:", error);
    return [];
  }
}

function eliminarInventario(index, filtroActual = "") {
  return;
}


/* =========================================================
   RENDER KARDEX
   ========================================================= */

async function renderTablaKardex() {

  const tbody =
    document.getElementById(
      "tablaKardexBody"
    );

  const resumen =
    document.getElementById(
      "resumenKardex"
    );

  if (!tbody) return;


  try {

    const res =
      await fetch(
        "/api/kardex"
      );


    const data =
      await res
        .json()
        .catch(() => ([]));


    if (!res.ok) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="12"
            class="empty-row"
          >
            Error al cargar kardex
          </td>
        </tr>
      `;

      return;

    }


    /* =====================================================
       FILTROS
       ===================================================== */

    const producto =
      (
        document.getElementById(
          "filtroKardexProducto"
        )?.value ||
        ""
      )
        .toLowerCase()
        .trim();


    const bodega =
      (
        document.getElementById(
          "filtroKardexBodega"
        )?.value ||
        ""
      )
        .toLowerCase()
        .trim();


    const fechaDesde =
      document.getElementById(
        "filtroKardexFechaDesde"
      )?.value ||
      "";


    const fechaHasta =
      document.getElementById(
        "filtroKardexFechaHasta"
      )?.value ||
      "";


    const corte =
      document.getElementById(
        "filtroKardexCorte"
      )?.value ||
      "";


    const tiposSeleccionados =
      obtenerTiposMovimientoKardexSeleccionados();


    /* =====================================================
       APLICAR FILTROS
       ===================================================== */

    const lista =
      (
        Array.isArray(data)
          ? data
          : []
      )
        .filter(
          item => {

            const okProducto =

              !producto

              ||

              String(
                item.codigo ||
                ""
              )
                .toLowerCase()
                .includes(
                  producto
                )

              ||

              String(
                item.producto ||
                ""
              )
                .toLowerCase()
                .includes(
                  producto
                );


            const okBodega =

              !bodega

              ||

              String(
                item.bodega ||
                ""
              )
                .toLowerCase()
              ===
              bodega;


            const okFechaDesde =

              !fechaDesde

              ||

              String(
                item.fecha ||
                ""
              ) >=
              fechaDesde;


            const okFechaHasta =

              !fechaHasta

              ||

              String(
                item.fecha ||
                ""
              ) <=
              fechaHasta;


            const okCorte =

              !corte

              ||

              String(
                item.fecha ||
                ""
              ) <=
              corte;


            const tipoActual =
              String(
                item.tipo ||
                ""
              )
                .trim()
                .toUpperCase();


            const okTipo =

              !tiposSeleccionados.length

              ||

              tiposSeleccionados.includes(
                tipoActual
              );


            return (

              okProducto &&
              okBodega &&
              okFechaDesde &&
              okFechaHasta &&
              okCorte &&
              okTipo

            );

          }
        );


    if (!lista.length) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="12"
            class="empty-row"
          >
            No hay movimientos para mostrar
          </td>
        </tr>
      `;


      if (resumen) {

        resumen.textContent =
          "No hay movimientos para los filtros seleccionados.";

      }


      return;

    }


    /* =====================================================
       RENDER FILAS
       ===================================================== */

    tbody.innerHTML =
      lista
        .map(
          item => {

            const tipo =
              String(
                item.tipo ||
                ""
              )
                .trim()
                .toUpperCase();


            const cantidadCapas =
              Number(
                item.cantidad_capas ||
                0
              );


            const documentoId =
              Number(
                item.documento_id ||
                0
              );


            /* =================================================
               TIPOS QUE PUEDEN TENER DETALLE DE CAPAS
               ================================================= */

            const permiteDetalle =

              tipo === "SALIDA"

              ||

              tipo === "DESCARGO"

              ||

              tipo === "TRASLADO SALIDA"

              ||

              tipo === "TRASLADO ENTRADA"

              ||

              tipo === "CUARENTENA SALIDA"

              ||

              tipo === "CUARENTENA ENTRADA"

              ||

              tipo === "LIBERACION SALIDA"

              ||

              tipo === "LIBERACION ENTRADA";


            /* =================================================
               COSTO UNITARIO
               ================================================= */

            let contenidoCosto =
              "—";


            /*
              En pantalla mostramos VER DETALLE
              cuando participaron varias capas.

              Aunque tengan el mismo costo,
              cantidad_capas > 1 permite conocer
              la procedencia real.
            */

            if (
              permiteDetalle &&
              cantidadCapas > 1 &&
              documentoId > 0
            ) {

              contenidoCosto = `
                <button
                  type="button"
                  class="btn-table edit"
                  onclick="verDetalleCostoKardex(
                    '${tipo}',
                    ${documentoId}
                  )"
                  title="Ver procedencia del costo"
                >
                  Ver detalle
                </button>
              `;

            }


            else if (
              item.costo_unitario !== null &&
              item.costo_unitario !== undefined
            ) {

              contenidoCosto =
                Number(
                  item.costo_unitario
                ).toFixed(
                  4
                );

            }


            else {

              contenidoCosto =
                "Pendiente";

            }


            /* =================================================
               VALOR MOVIMIENTO
               ================================================= */

            const valorMovimiento =

              item.valor_movimiento === null ||
              item.valor_movimiento === undefined

                ? "—"

                : Number(
                    item.valor_movimiento
                  ).toFixed(
                    2
                  );


            /* =================================================
               VALOR SALDO
               ================================================= */

            const valorSaldo =

              item.valor_saldo === null ||
              item.valor_saldo === undefined

                ? "—"

                : Number(
                    item.valor_saldo
                  ).toFixed(
                    2
                  );


            return `
              <tr>

                <td>
                  ${item.fecha || ""}
                </td>

                <td>
                  ${item.tipo || ""}
                </td>

                <td>
                  ${item.documento || ""}
                </td>

                <td>
                  ${item.bodega || ""}
                </td>

                <td>
                  ${item.codigo || ""}
                </td>

                <td>
                  ${item.producto || ""}
                </td>

                <td>
                  ${Number(
                    item.entrada ||
                    0
                  ).toFixed(2)}
                </td>

                <td>
                  ${Number(
                    item.salida ||
                    0
                  ).toFixed(2)}
                </td>

                <td>
                  ${Number(
                    item.saldo ||
                    0
                  ).toFixed(2)}
                </td>

                <td>
                  ${contenidoCosto}
                </td>

                <td>
                  ${valorMovimiento}
                </td>

                <td>
                  ${valorSaldo}
                </td>

              </tr>
            `;

          }
        )
        .join("");


    /* =====================================================
       RESUMEN
       ===================================================== */

    const totalEntradas =
      lista.reduce(

        (
          acc,
          item
        ) =>

          acc +
          Number(
            item.entrada ||
            0
          ),

        0

      );


    const totalSalidas =
      lista.reduce(

        (
          acc,
          item
        ) =>

          acc +
          Number(
            item.salida ||
            0
          ),

        0

      );


    const stockTotal =
      totalEntradas -
      totalSalidas;


    const ultimoValorSaldo =
      Number(
        lista[
          lista.length - 1
        ]?.valor_saldo ||
        0
      );


    if (resumen) {

      resumen.textContent =

        `Movimientos: ${lista.length}` +

        ` | Entradas: ${totalEntradas.toFixed(2)}` +

        ` | Salidas: ${totalSalidas.toFixed(2)}` +

        ` | Stock total: ${stockTotal.toFixed(2)}` +

        ` | Valor saldo final: $${ultimoValorSaldo.toFixed(2)}`;

    }


  } catch (error) {

    console.error(
      "Error cargando kardex:",
      error
    );


    tbody.innerHTML = `
      <tr>
        <td
          colspan="12"
          class="empty-row"
        >
          Error al cargar kardex
        </td>
      </tr>
    `;

  }

}


/* =========================================================
   VER DETALLE COSTO KARDEX
   ========================================================= */

async function verDetalleCostoKardex(
  tipo,
  documentoId
) {

  try {

    const res =
      await fetch(

        `/api/kardex/detalle-costo?tipo=${encodeURIComponent(
          tipo
        )}&id=${encodeURIComponent(
          documentoId
        )}`

      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      alert(
        data.error ||
        "No se pudo obtener el detalle del costo"
      );

      return;

    }


    const movimiento =
      data.movimiento ||
      {};


    const detalle =
      Array.isArray(
        data.detalle
      )
        ? data.detalle
        : [];


    const resumen =
      data.resumen ||
      {};


    /* =====================================================
       CREAR MODAL
       ===================================================== */

    let modal =
      document.getElementById(
        "modalDetalleCostoKardex"
      );


    if (!modal) {

      modal =
        document.createElement(
          "div"
        );


      modal.id =
        "modalDetalleCostoKardex";


      modal.innerHTML = `

        <div
          class="modal-overlay-kardex"
          onclick="cerrarDetalleCostoKardex(event)"
        >

          <div
            class="modal-card-kardex"
            onclick="event.stopPropagation()"
          >

            <div
              class="modal-header-kardex"
            >

              <div>

                <h2
                  id="tituloDetalleCostoKardex"
                >
                  Detalle de costo
                </h2>

                <div
                  id="subtituloDetalleCostoKardex"
                ></div>

              </div>


              <button
                type="button"
                class="btn-cerrar-modal-kardex"
                onclick="cerrarDetalleCostoKardex()"
              >
                ×
              </button>

            </div>


            <div
              id="contenidoDetalleCostoKardex"
              class="modal-body-kardex"
            ></div>

          </div>

        </div>

      `;


      document.body.appendChild(
        modal
      );

    }


    /* =====================================================
       ENCABEZADO
       ===================================================== */

    document.getElementById(
      "tituloDetalleCostoKardex"
    ).textContent =

      `Detalle de costo — ${
        movimiento.documento ||
        ""
      }`;


    document.getElementById(
      "subtituloDetalleCostoKardex"
    ).innerHTML = `

      <strong>
        ${movimiento.producto || ""}
      </strong>

      &nbsp; | &nbsp;

      ${movimiento.bodega || ""}

      &nbsp; | &nbsp;

      Cantidad:

      <strong>
        ${Number(
          movimiento.cantidad ||
          0
        ).toFixed(2)}
      </strong>

    `;


    /* =====================================================
       FILAS PROCEDENCIA
       ===================================================== */

    const filas =
      detalle
        .map(
          item => {

            const origen =
              String(
                item.origen ||
                ""
              )
                .replaceAll(
                  "_",
                  " "
                );


            const costo =

              item.costo_unitario === null ||
              item.costo_unitario === undefined

                ? "Pendiente"

                : `$${Number(
                    item.costo_unitario
                  ).toFixed(2)}`;


            const valor =

              item.valor === null ||
              item.valor === undefined

                ? "Pendiente"

                : `$${Number(
                    item.valor
                  ).toFixed(2)}`;


            let detalleDocumento = `
              <strong>
                ${
                  item.documento_origen ||
                  "Sin documento"
                }
              </strong>
            `;


            /* =============================================
               COMPRA
               ============================================= */

            if (
              String(
                item.origen ||
                ""
              )
                .trim()
                .toUpperCase()
              ===
              "COMPRA"
            ) {

              detalleDocumento += `

                ${
                  item.numero_factura

                    ? `
                      <div
                        class="detalle-secundario-kardex"
                      >
                        Factura:
                        ${item.numero_factura}
                      </div>
                    `

                    : ""
                }


                ${
                  item.proveedor

                    ? `
                      <div
                        class="detalle-secundario-kardex"
                      >
                        Proveedor:
                        ${item.proveedor}
                      </div>
                    `

                    : ""
                }

              `;

            }


            /* =============================================
               ESTADO DEL COSTO
               ============================================= */

            let observacionCosto =
              "";


            if (
              item.estado_costo ===
              "SIN_COSTO"
            ) {

              observacionCosto = `

                <div
                  class="detalle-sin-costo-kardex"
                >

                  Sin costo

                  ${
                    item.motivo_sin_costo

                      ? ` — ${String(
                          item.motivo_sin_costo
                        ).replaceAll(
                          "_",
                          " "
                        )}`

                      : ""
                  }

                </div>

              `;

            }


            if (
              item.estado_costo ===
              "PENDIENTE"
            ) {

              observacionCosto = `

                <div
                  class="detalle-pendiente-kardex"
                >
                  Costo pendiente de valoración
                </div>

              `;

            }


            return `

              <tr>

                <td>
                  ${origen}
                </td>

                <td>

                  ${detalleDocumento}

                  ${observacionCosto}

                </td>

                <td>
                  ${
                    item.lote
                      ? item.lote
                      : "—"
                  }
                </td>

                <td>
                  ${Number(
                    item.cantidad ||
                    0
                  ).toFixed(2)}
                </td>

                <td>
                  ${costo}
                </td>

                <td>
                  ${valor}
                </td>

              </tr>

            `;

          }
        )
        .join("");


    /* =====================================================
       CONTENIDO
       ===================================================== */

    document.getElementById(
      "contenidoDetalleCostoKardex"
    ).innerHTML = `

      <div
        class="detalle-costo-titulo"
      >
        Procedencia de las unidades
      </div>


      <div
        class="table-responsive"
      >

        <table
          class="patient-table"
        >

          <thead>

            <tr>

              <th>Origen</th>

              <th>Documento</th>

              <th>Lote</th>

              <th>Cantidad</th>

              <th>Costo/U</th>

              <th>Valor</th>

            </tr>

          </thead>


          <tbody>

            ${
              filas

              ||

              `
                <tr>

                  <td
                    colspan="6"
                    class="empty-row"
                  >
                    No existe detalle de capas
                  </td>

                </tr>
              `
            }

          </tbody>

        </table>

      </div>


      <div
        class="resumen-detalle-costo-kardex"
      >

        <div>

          <span>
            Cantidad utilizada
          </span>

          <strong>
            ${Number(
              resumen.cantidad_total ||
              0
            ).toFixed(2)}
          </strong>

        </div>


        <div>

          <span>
            Costo total conocido
          </span>

          <strong>
            $${Number(
              resumen.valor_conocido ||
              0
            ).toFixed(2)}
          </strong>

        </div>


        ${
          Number(
            resumen.cantidad_costo_pendiente ||
            0
          ) > 0

            ? `

              <div>

                <span>
                  Unidades con costo pendiente
                </span>

                <strong>
                  ${Number(
                    resumen.cantidad_costo_pendiente
                  ).toFixed(2)}
                </strong>

              </div>

            `

            : ""
        }

      </div>

    `;


    modal.style.display =
      "block";


  } catch (error) {

    console.error(
      "Error obteniendo detalle de costo:",
      error
    );


    alert(
      "Error al obtener el detalle del costo"
    );

  }

}


/* =========================================================
   CERRAR DETALLE COSTO KARDEX
   ========================================================= */

function cerrarDetalleCostoKardex(
  event = null
) {

  if (
    event &&
    event.target !==
      event.currentTarget
  ) {

    return;

  }


  const modal =
    document.getElementById(
      "modalDetalleCostoKardex"
    );


  if (modal) {

    modal.style.display =
      "none";

  }

}
/*EXPORTAR EXCEL KARDEX */
/* =========================================
   EXPORTAR EXCEL KARDEX
   CON DETALLE EXPANDIBLE DE CAPAS
   ========================================= */

/* =========================================
   EXPORTAR EXCEL KARDEX
   CON DETALLE EXPANDIBLE DE CAPAS

   SOPORTA:
   - SALIDA
   - DESCARGO
   ========================================= */

/* =========================================
   EXPORTAR EXCEL KARDEX
   CON DETALLE EXPANDIBLE DE CAPAS

   SOPORTA:
      SALIDA
      DESCARGO
      TRASLADO SALIDA
      TRASLADO ENTRADA
      CUARENTENA SALIDA
      CUARENTENA ENTRADA
      LIBERACION SALIDA
      LIBERACION ENTRADA
   ========================================= */

/* =========================================================
   EXPORTAR KARDEX A EXCEL
   CON DETALLE EXPANDIBLE DE CAPAS
   ========================================================= */

async function exportarKardexExcel() {

  try {

    /* =====================================================
       1. OBTENER KARDEX
       ===================================================== */

    const res =
      await fetch(
        "/api/kardex"
      );


    const data =
      await res
        .json()
        .catch(() => ([]));


    if (!res.ok) {

      alert(
        "Error al obtener kardex"
      );

      return;

    }


    /* =====================================================
       2. FILTROS
       ===================================================== */

    const producto =
      (
        document.getElementById(
          "filtroKardexProducto"
        )?.value ||
        ""
      )
        .toLowerCase()
        .trim();


    const bodega =
      (
        document.getElementById(
          "filtroKardexBodega"
        )?.value ||
        ""
      )
        .toLowerCase()
        .trim();


    const fechaDesde =
      document.getElementById(
        "filtroKardexFechaDesde"
      )?.value ||
      "";


    const fechaHasta =
      document.getElementById(
        "filtroKardexFechaHasta"
      )?.value ||
      "";


    const corte =
      document.getElementById(
        "filtroKardexCorte"
      )?.value ||
      "";


    const tiposSeleccionados =
      obtenerTiposMovimientoKardexSeleccionados();


    /* =====================================================
       3. APLICAR FILTROS
       ===================================================== */

    const lista =
      (
        Array.isArray(data)
          ? data
          : []
      )
        .filter(
          item => {

            const okProducto =

              !producto

              ||

              String(
                item.codigo ||
                ""
              )
                .toLowerCase()
                .includes(
                  producto
                )

              ||

              String(
                item.producto ||
                ""
              )
                .toLowerCase()
                .includes(
                  producto
                );


            const okBodega =

              !bodega

              ||

              String(
                item.bodega ||
                ""
              )
                .toLowerCase()
              ===
              bodega;


            const okFechaDesde =

              !fechaDesde

              ||

              String(
                item.fecha ||
                ""
              ) >=
              fechaDesde;


            const okFechaHasta =

              !fechaHasta

              ||

              String(
                item.fecha ||
                ""
              ) <=
              fechaHasta;


            const okCorte =

              !corte

              ||

              String(
                item.fecha ||
                ""
              ) <=
              corte;


            const tipoActual =
              String(
                item.tipo ||
                ""
              )
                .trim()
                .toUpperCase();


            const okTipo =

              !tiposSeleccionados.length

              ||

              tiposSeleccionados.includes(
                tipoActual
              );


            return (

              okProducto &&
              okBodega &&
              okFechaDesde &&
              okFechaHasta &&
              okCorte &&
              okTipo

            );

          }
        );


    if (!lista.length) {

      alert(
        "No hay movimientos para exportar"
      );

      return;

    }


    /* =====================================================
       4. ENCABEZADOS EXCEL
       ===================================================== */

    const filasExcel = [

      [

        "Fecha",
        "Tipo",
        "Documento",
        "Bodega",
        "Código",
        "Producto",

        "Entrada",
        "Salida",
        "Saldo",

        "Costo unitario",
        "Valor movimiento",
        "Valor saldo",

        "Origen costo",
        "Documento origen",
        "Factura",
        "Proveedor",

        "Cantidad capa",
        "Costo capa",
        "Valor capa"

      ]

    ];


    const configuracionFilas =
      [];


    /* =====================================================
       5. RECORRER MOVIMIENTOS
       ===================================================== */

    for (
      const item of lista
    ) {

      const tipo =
        String(
          item.tipo ||
          ""
        )
          .trim()
          .toUpperCase();


      const documentoId =
        Number(
          item.documento_id ||
          0
        );


      const cantidadCapas =
        Number(
          item.cantidad_capas
          ??
          item.cantidad_costos
          ??
          0
        );


      /* =================================================
         FILA PRINCIPAL
         ================================================= */

      filasExcel.push([

        item.fecha ||
        "",

        item.tipo ||
        "",

        item.documento ||
        "",

        item.bodega ||
        "",

        item.codigo ||
        "",

        item.producto ||
        "",


        Number(
          item.entrada ||
          0
        ),


        Number(
          item.salida ||
          0
        ),


        Number(
          item.saldo ||
          0
        ),


        item.costo_unitario === null ||
        item.costo_unitario === undefined

          ? ""

          : Number(
              item.costo_unitario
            ),


        item.valor_movimiento === null ||
        item.valor_movimiento === undefined

          ? ""

          : Number(
              item.valor_movimiento
            ),


        item.valor_saldo === null ||
        item.valor_saldo === undefined

          ? ""

          : Number(
              item.valor_saldo
            ),


        "",
        "",
        "",
        "",
        "",
        "",
        ""

      ]);


      /* =================================================
         TIPOS CON DETALLE
         ================================================= */

      const permiteDetalle =

        tipo === "SALIDA"

        ||

        tipo === "DESCARGO"

        ||

        tipo === "TRASLADO SALIDA"

        ||

        tipo === "TRASLADO ENTRADA"

        ||

        tipo === "CUARENTENA SALIDA"

        ||

        tipo === "CUARENTENA ENTRADA"

        ||

        tipo === "LIBERACION SALIDA"

        ||

        tipo === "LIBERACION ENTRADA";


      /*
        En Excel consultamos desde una sola capa,
        porque queremos trazabilidad completa.
      */

      const debeConsultarDetalle =

        permiteDetalle &&

        cantidadCapas > 0 &&

        documentoId > 0;


      if (
        !debeConsultarDetalle
      ) {

        continue;

      }


      /* =================================================
         6. CONSULTAR PROCEDENCIA
         ================================================= */

      try {

        const resDetalle =
          await fetch(

            `/api/kardex/detalle-costo?tipo=${encodeURIComponent(
              tipo
            )}&id=${encodeURIComponent(
              documentoId
            )}`

          );


        const dataDetalle =
          await resDetalle
            .json()
            .catch(() => ({}));


        if (
          !resDetalle.ok ||
          !Array.isArray(
            dataDetalle.detalle
          )
        ) {

          console.warn(
            `No se pudo obtener detalle de ${item.documento}`,
            dataDetalle
          );

          continue;

        }


        /* =================================================
           7. FILAS DETALLE
           ================================================= */

        for (
          const detalle of
          dataDetalle.detalle
        ) {

          const indiceFilaExcel =
            filasExcel.length;


          const origen =
            String(
              detalle.origen ||
              ""
            )
              .replaceAll(
                "_",
                " "
              );


          let textoDetalle =
            "↳ DETALLE COSTO";


          if (
            tipo === "TRASLADO SALIDA" ||
            tipo === "TRASLADO ENTRADA"
          ) {

            textoDetalle =
              "↳ PROCEDENCIA TRASLADO";

          }


          if (
            tipo === "CUARENTENA SALIDA" ||
            tipo === "CUARENTENA ENTRADA"
          ) {

            textoDetalle =
              "↳ PROCEDENCIA CUARENTENA";

          }


          if (
            tipo === "LIBERACION SALIDA" ||
            tipo === "LIBERACION ENTRADA"
          ) {

            textoDetalle =
              "↳ PROCEDENCIA LIBERACIÓN";

          }


          filasExcel.push([

            "",

            textoDetalle,

            item.documento ||
            "",

            item.bodega ||
            "",

            item.codigo ||
            "",

            item.producto ||
            "",

            "",
            "",
            "",
            "",
            "",
            "",


            origen,


            detalle.documento_origen ||
            "",


            detalle.numero_factura ||
            "",


            detalle.proveedor ||
            "",


            Number(
              detalle.cantidad ||
              0
            ),


            detalle.costo_unitario === null ||
            detalle.costo_unitario === undefined

              ? ""

              : Number(
                  detalle.costo_unitario
                ),


            detalle.valor === null ||
            detalle.valor === undefined

              ? ""

              : Number(
                  detalle.valor
                )

          ]);


          configuracionFilas[
            indiceFilaExcel
          ] = {

            hidden:
              true,

            level:
              1

          };

        }


      } catch (
        errorDetalle
      ) {

        console.error(
          `Error obteniendo detalle de ${item.documento}:`,
          errorDetalle
        );

      }

    }


    /* =====================================================
       8. CREAR HOJA
       ===================================================== */

    const ws =
      XLSX.utils.aoa_to_sheet(
        filasExcel
      );


    ws["!rows"] =
      configuracionFilas;


    ws["!outline"] = {

      above:
        true,

      left:
        false

    };


    /* =====================================================
       9. ANCHOS
       ===================================================== */

    ws["!cols"] = [

      { wch: 12 },
      { wch: 26 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 32 },

      { wch: 12 },
      { wch: 12 },
      { wch: 12 },

      { wch: 16 },
      { wch: 18 },
      { wch: 16 },

      { wch: 24 },
      { wch: 26 },
      { wch: 22 },
      { wch: 30 },

      { wch: 16 },
      { wch: 16 },
      { wch: 16 }

    ];


    /* =====================================================
       10. AUTOFILTRO
       ===================================================== */

    ws["!autofilter"] = {

      ref:
        `A1:S${filasExcel.length}`

    };


    /* =====================================================
       11. FORMATOS NUMÉRICOS
       ===================================================== */

    for (
      let fila = 2;
      fila <= filasExcel.length;
      fila++
    ) {

      [
        `G${fila}`,
        `H${fila}`,
        `I${fila}`,
        `Q${fila}`
      ]
        .forEach(
          celda => {

            if (
              ws[
                celda
              ]
            ) {

              ws[
                celda
              ].z =
                "0.00";

            }

          }
        );


      [
        `J${fila}`,
        `K${fila}`,
        `L${fila}`,
        `R${fila}`,
        `S${fila}`
      ]
        .forEach(
          celda => {

            if (
              ws[
                celda
              ]
            ) {

              ws[
                celda
              ].z =
                '$#,##0.00';

            }

          }
        );

    }


    /* =====================================================
       12. LIBRO
       ===================================================== */

    const wb =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Kardex"
    );


    /* =====================================================
       13. GUARDAR
       ===================================================== */

    XLSX.writeFile(
      wb,
      "kardex.xlsx"
    );


  } catch (error) {

    console.error(
      "Error exportando kardex:",
      error
    );


    alert(
      "Error al exportar kardex"
    );

  }

}

/* =========================================================
   INICIALIZAR MÓDULO KARDEX
   ========================================================= */

async function inicializarModuloKardex() {

  await poblarSelectBodegas(
    "filtroKardexBodega"
  );


  renderTablaKardex();


  [
    "filtroKardexProducto",
    "filtroKardexBodega",
    "filtroKardexFechaDesde",
    "filtroKardexFechaHasta",
    "filtroKardexCorte"
  ]
    .forEach(
      id => {

        const elemento =
          document.getElementById(
            id
          );


        if (elemento) {

          elemento.addEventListener(
            "input",
            renderTablaKardex
          );


          elemento.addEventListener(
            "change",
            renderTablaKardex
          );

        }

      }
    );


  /* =====================================================
     CHECKBOX TIPO MOVIMIENTO

     Esto detecta automáticamente los cuatro
     nuevos tipos porque tienen
     class="check-tipo-kardex".
     ===================================================== */

  document
    .querySelectorAll(
      ".check-tipo-kardex"
    )
    .forEach(
      check => {

        check.addEventListener(
          "change",
          renderTablaKardex
        );

      }
    );


  /* =====================================================
     LIMPIAR
     ===================================================== */

  const btnLimpiar =
    document.getElementById(
      "btnLimpiarFiltrosKardex"
    );


  if (btnLimpiar) {

    btnLimpiar.addEventListener(
      "click",
      () => {

        [
          "filtroKardexProducto",
          "filtroKardexBodega",
          "filtroKardexFechaDesde",
          "filtroKardexFechaHasta",
          "filtroKardexCorte"
        ]
          .forEach(
            id => {

              const elemento =
                document.getElementById(
                  id
                );


              if (elemento) {

                elemento.value =
                  "";

              }

            }
          );


        document
          .querySelectorAll(
            ".check-tipo-kardex"
          )
          .forEach(
            check => {

              check.checked =
                false;

            }
          );


        renderTablaKardex();

      }
    );

  }


  /* =====================================================
     EXPORTAR
     ===================================================== */

  const btnExportar =
    document.getElementById(
      "btnExportarKardexExcel"
    );


  if (btnExportar) {

    btnExportar.addEventListener(
      "click",
      exportarKardexExcel
    );

  }

}

/* =========================================================
   HELPER LEER TIPOS DE MOVIMIENTOS MARCADOS
   ========================================================= */

function obtenerTiposMovimientoKardexSeleccionados() {

  return Array.from(

    document.querySelectorAll(
      ".check-tipo-kardex:checked"
    )

  )
    .map(
      check =>

        String(
          check.value ||
          ""
        )
          .trim()
          .toUpperCase()

    );

}

/* =========================
   ENTRADA INVENTARIO
========================= */

function obtenerRegistroInventarioExistente(bodega, producto) {
  return inventario.find(item =>
    item.bodega === bodega &&
    item.codigo === producto.codigo &&
    item.producto === producto.nombre &&
    (item.lote || "") === (producto.lote || "")
  );
}

function obtenerRegistroInventarioBase(bodega, codigo, nombre) {
  return inventario.find(item =>
    item.bodega === bodega &&
    item.codigo === codigo &&
    item.producto === nombre
  );
}

function renderResultadosProductoEntrada(texto = "") {
  const contenedor = document.getElementById("resultadosProductoEntrada");
  if (!contenedor) return;

  const filtro = texto.toLowerCase().trim();

  if (!filtro) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
    return;
  }

  const resultados = productos.filter(item =>
    item.estado === "ACTIVO" &&
    item.codigo.toLowerCase().includes(filtro) ||
    item.nombre.toLowerCase().includes(filtro) ||
    (item.categoria || "").toLowerCase().includes(filtro)
  ).slice(0, 20);

  if (!resultados.length) {
    contenedor.innerHTML = `
      <div class="resultado-item empty">No se encontraron productos</div>
    `;
    contenedor.style.display = "block";
    return;
  }

  contenedor.innerHTML = resultados.map((item, index) => `
    <div class="resultado-item" data-index="${index}">
      <div class="resultado-title">${item.codigo} - ${item.nombre}</div>
      <div class="resultado-sub">
        Categoría: ${item.categoria || "Sin categoría"} | Unidad: ${item.unidad || "N/A"}
      </div>
    </div>
  `).join("");

  contenedor.style.display = "block";

  contenedor.querySelectorAll(".resultado-item[data-index]").forEach(item => {
    item.addEventListener("click", () => {
      seleccionarProductoEntrada(Number(item.dataset.index));
    });
  });
}





function renderTablaInventario(filtro = "") {
  const tbody = document.getElementById("tablaInventarioBody");
  if (!tbody) return;

  const texto = filtro.toLowerCase().trim();

  const lista = inventario.filter(item =>
    item.bodega.toLowerCase().includes(texto) ||
    item.codigo.toLowerCase().includes(texto) ||
    item.producto.toLowerCase().includes(texto) ||
    (item.categoria || "").toLowerCase().includes(texto) ||
    (item.ubicacion || "").toLowerCase().includes(texto)
  );

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">No hay stock registrado</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(item => `
    <tr>
      <td>${item.bodega}</td>
      <td>${item.codigo}</td>
      <td>${item.producto}</td>
      <td>${item.stock}</td>
      <td>${item.ubicacion || ""}</td>
    </tr>
  `).join("");
}

function autocompletarCodigoProveedorEntrada() {
  const casa = document.getElementById("entradaCasa")?.value || "";
  const inputCodigoProveedor = document.getElementById("entradaCodigoProveedor");

  if (!inputCodigoProveedor) return;

  if (productoEntradaSeleccionadoIndex < 0 || !casa) {
    inputCodigoProveedor.value = "";
    return;
  }

  const prod = productos[productoEntradaSeleccionadoIndex];
  if (!prod) {
    inputCodigoProveedor.value = "";
    return;
  }

  const registroPrevio = detalle_Entradas.find(item =>
    item.codigo === prod.codigo &&
    item.producto === prod.nombre &&
    item.casaComercial === casa &&
    (item.codigoProveedor || "").trim() !== ""
  );

  inputCodigoProveedor.value = registroPrevio ? (registroPrevio.codigoProveedor || "") : "";
}

function autocompletarVencimientoPorLote() {
  const registrarLote = document.getElementById("entradaRegistrarLote")?.checked || false;
  const selectBodega = document.getElementById("entradaBodega");
  const inputLote = document.getElementById("entradaLote");
  const inputVencimiento = document.getElementById("entradaVencimiento");

  if (!registrarLote || !selectBodega || !inputLote || !inputVencimiento) return;
  if (productoEntradaSeleccionadoIndex < 0) return;

  const bodega = selectBodega.value;
  const lote = inputLote.value.trim();
  const prod = productos[productoEntradaSeleccionadoIndex];

  if (!bodega || !lote || !prod) {
    inputVencimiento.value = "";
    return;
  }

  const registroPrevio = detalle_Entradas.find(item =>
    item.bodega === bodega &&
    item.codigo === prod.codigo &&
    item.producto === prod.nombre &&
    (item.lote || "").trim().toLowerCase() === lote.toLowerCase()
  );

  if (registroPrevio && registroPrevio.vencimiento) {
    inputVencimiento.value = registroPrevio.vencimiento;
  }
}


async function inicializarModuloInventario() {

  const form =
    document.getElementById(
      "formEntradaInventario"
    );

  const inputBuscarProducto =
    document.getElementById(
      "buscarProductoEntrada"
    );

  const inputBuscar =
    document.getElementById(
      "buscarInventario"
    );

  const selectBodega =
    document.getElementById(
      "entradaBodega"
    );

  const checkRegistrarLote =
    document.getElementById(
      "entradaRegistrarLote"
    );

  const bloqueLote =
    document.getElementById(
      "bloqueLoteEntrada"
    );

  const selectCasa =
    document.getElementById(
      "entradaCasa"
    );

  const inputLote =
    document.getElementById(
      "entradaLote"
    );


  /* =========================================
     CAMPOS DE COSTO
     ========================================= */

  const estadoCostoEl =
    document.getElementById(
      "entradaEstadoCosto"
    );

  const costoUnitarioEl =
    document.getElementById(
      "entradaCostoUnitario"
    );

  const motivoSinCostoEl =
    document.getElementById(
      "entradaMotivoSinCosto"
    );

  const bloqueMotivoSinCosto =
    document.getElementById(
      "bloqueMotivoSinCostoEntrada"
    );

  const valorTotalEl =
    document.getElementById(
      "entradaValorTotal"
    );

  const cantidadEl =
    document.getElementById(
      "entradaCantidad"
    );


  if (
    !form ||
    !inputBuscarProducto ||
    !selectBodega
  ) {
    return;
  }


  /* =========================================
     FUNCIÓN PARA ACTUALIZAR VALORACIÓN
     ========================================= */

  function actualizarValoracionEntrada() {

    const estado =
      String(
        estadoCostoEl?.value ||
        "PENDIENTE"
      )
        .trim()
        .toUpperCase();


    const cantidad =
      Number(
        cantidadEl?.value ||
        0
      );


    if (
      estado === "CONOCIDO"
    ) {

      if (costoUnitarioEl) {
        costoUnitarioEl.disabled =
          false;
      }

      if (bloqueMotivoSinCosto) {
        bloqueMotivoSinCosto.style.display =
          "none";
      }

      if (motivoSinCostoEl) {
        motivoSinCostoEl.value =
          "";
      }


      const costo =
        Number(
          costoUnitarioEl?.value
        );


      if (
        Number.isFinite(costo) &&
        costo > 0 &&
        cantidad > 0
      ) {

        const total =
          cantidad *
          costo;


        if (valorTotalEl) {

          valorTotalEl.value =
            new Intl.NumberFormat(
              "es-EC",
              {
                style: "currency",
                currency: "USD"
              }
            ).format(total);

        }

      } else {

        if (valorTotalEl) {
          valorTotalEl.value =
            "Ingrese cantidad y costo";
        }

      }

      return;
    }


    if (
      estado === "SIN_COSTO"
    ) {

      if (costoUnitarioEl) {

        costoUnitarioEl.value =
          "0";

        costoUnitarioEl.disabled =
          true;

      }


      if (bloqueMotivoSinCosto) {

        bloqueMotivoSinCosto.style.display =
          "block";

      }


      if (valorTotalEl) {

        valorTotalEl.value =
          "$0.00";

      }

      return;
    }


    /* =========================================
       PENDIENTE
       ========================================= */

    if (costoUnitarioEl) {

      costoUnitarioEl.value =
        "";

      costoUnitarioEl.disabled =
        true;

    }


    if (motivoSinCostoEl) {

      motivoSinCostoEl.value =
        "";

    }


    if (bloqueMotivoSinCosto) {

      bloqueMotivoSinCosto.style.display =
        "none";

    }


    if (valorTotalEl) {

      valorTotalEl.value =
        "Pendiente de valoración";

    }

  }


  /* =========================================
     CARGAS INICIALES
     ========================================= */

  await poblarSelectBodegas(
    "entradaBodega"
  );

  await poblarSelectCasas(
    "entradaCasa"
  );

  autocompletarResponsable(
    "entradaResponsable"
  );


  actualizarValoracionEntrada();


  /* =========================================
     EVENTOS COSTO
     ========================================= */

  if (estadoCostoEl) {

    estadoCostoEl.addEventListener(
      "change",
      actualizarValoracionEntrada
    );

  }


  if (costoUnitarioEl) {

    costoUnitarioEl.addEventListener(
      "input",
      actualizarValoracionEntrada
    );

  }


  if (cantidadEl) {

    cantidadEl.addEventListener(
      "input",
      actualizarValoracionEntrada
    );

  }


  /* =========================================
     BODEGA
     ========================================= */

  selectBodega.addEventListener(
    "change",
    () => {

      autocompletarDatosEntradaDesdeSQL();

      autocompletarVencimientoPorLoteProveedor();

    }
  );


  productosActivosEntrada =
    await cargarProductosActivosEntradaDesdeSQL();


  detalle_Entradas =
    await cargarDetalleEntradasDesdeSQL();


  await renderTablaInventario();


  /* =========================================
     CONTROL DE LOTE
     ========================================= */

  if (
    checkRegistrarLote &&
    bloqueLote
  ) {

    checkRegistrarLote.addEventListener(
      "change",
      () => {

        if (
          checkRegistrarLote.checked
        ) {

          bloqueLote.style.display =
            "block";

        } else {

          bloqueLote.style.display =
            "none";


          const codigoProveedor =
            document.getElementById(
              "entradaCodigoProveedor"
            );

          const lote =
            document.getElementById(
              "entradaLote"
            );

          const vencimiento =
            document.getElementById(
              "entradaVencimiento"
            );

          const casa =
            document.getElementById(
              "entradaCasa"
            );


          if (codigoProveedor) {
            codigoProveedor.value = "";
          }

          if (lote) {
            lote.value = "";
          }

          if (vencimiento) {
            vencimiento.value = "";
          }

          if (casa) {
            casa.value = "";
          }

        }

      }
    );

  }


  const inputCodigoProveedor =
    document.getElementById(
      "entradaCodigoProveedor"
    );

  const inputVencimiento =
    document.getElementById(
      "entradaVencimiento"
    );


  if (selectCasa) {

    selectCasa.addEventListener(
      "change",
      () => {

        autocompletarVencimientoPorLoteProveedor();

      }
    );

  }


  if (inputCodigoProveedor) {

    inputCodigoProveedor.addEventListener(
      "input",
      () => {

        autocompletarVencimientoPorLoteProveedor();

      }
    );

  }


  if (inputLote) {

    inputLote.addEventListener(
      "input",
      () => {

        autocompletarVencimientoPorLoteProveedor();

      }
    );

  }


  /* =========================================
     BUSCADOR DE PRODUCTOS
     ========================================= */

  inputBuscarProducto.addEventListener(
    "input",
    () => {

      limpiarSeleccionProductoEntrada();

      renderResultadosProductoEntrada(
        inputBuscarProducto.value
      );

    }
  );


  inputBuscarProducto.addEventListener(
    "focus",
    () => {

      renderResultadosProductoEntrada(
        inputBuscarProducto.value
      );

    }
  );


  document.addEventListener(
    "click",
    function (e) {

      const cajaBusqueda =
        document.querySelector(
          ".product-search-box"
        );

      const resultados =
        document.getElementById(
          "resultadosProductoEntrada"
        );


      if (
        !cajaBusqueda ||
        !resultados
      ) {
        return;
      }


      if (
        !cajaBusqueda.contains(
          e.target
        )
      ) {

        resultados.style.display =
          "none";

      }

    }
  );


  /* =========================================
     GUARDAR ENTRADA
     ========================================= */

  form.onsubmit =
    async (e) => {

      e.preventDefault();


      const registrarLote =
        document.getElementById(
          "entradaRegistrarLote"
        )?.checked ||
        false;


      const estadoCosto =
        String(
          estadoCostoEl?.value ||
          "PENDIENTE"
        )
          .trim()
          .toUpperCase();


      let costoUnitario =
        null;


      let motivoSinCosto =
        null;


      if (
        estadoCosto === "CONOCIDO"
      ) {

        costoUnitario =
          Number(
            costoUnitarioEl?.value
          );


        if (
          !Number.isFinite(
            costoUnitario
          ) ||
          costoUnitario <= 0
        ) {

          alert(
            "Ingrese un costo unitario válido mayor a 0"
          );

          return;

        }

      }


      if (
        estadoCosto === "SIN_COSTO"
      ) {

        costoUnitario =
          0;


        motivoSinCosto =
          String(
            motivoSinCostoEl?.value ||
            ""
          ).trim();


        if (
          !motivoSinCosto
        ) {

          alert(
            "Seleccione el motivo por el cual el producto no tiene costo"
          );

          return;

        }

      }


      const payload = {

        bodega:
          document.getElementById(
            "entradaBodega"
          ).value,

        producto_id:
          productoEntradaSeleccionado
            ? productoEntradaSeleccionado.id
            : null,

        cantidad:
          Number(
            document.getElementById(
              "entradaCantidad"
            ).value ||
            0
          ),

        stockMinimo:
          Number(
            document.getElementById(
              "entradaStockMinimo"
            ).value ||
            0
          ),

        ubicacion:
          document.getElementById(
            "entradaUbicacion"
          ).value.trim(),

        registrarLote:
          registrarLote,

        codigoProveedor:
          registrarLote
            ? document.getElementById(
                "entradaCodigoProveedor"
              ).value.trim()
            : "",

        lote:
          registrarLote
            ? document.getElementById(
                "entradaLote"
              ).value.trim()
            : "",

        vencimiento:
          registrarLote
            ? document.getElementById(
                "entradaVencimiento"
              ).value
            : "",

        casaComercial:
          registrarLote
            ? document.getElementById(
                "entradaCasa"
              ).value
            : "",

        responsable:
          document.getElementById(
            "entradaResponsable"
          ).value.trim(),

        observacion:
          document.getElementById(
            "entradaObservacion"
          ).value.trim(),

        /* NUEVO */
        estadoCosto:
          estadoCosto,

        costoUnitario:
          costoUnitario,

        motivoSinCosto:
          motivoSinCosto

      };


      /* =========================================
         VALIDACIONES
         ========================================= */

      if (!payload.bodega) {

        alert(
          "Seleccione una bodega"
        );

        return;

      }


      if (!payload.producto_id) {

        alert(
          "Seleccione un producto desde la búsqueda"
        );

        return;

      }


      if (
        payload.cantidad <= 0
      ) {

        alert(
          "La cantidad debe ser mayor a 0"
        );

        return;

      }


      if (!payload.responsable) {

        alert(
          "Ingrese el responsable"
        );

        return;

      }


      if (
        payload.registrarLote
      ) {

        if (
          !payload.codigoProveedor
        ) {

          alert(
            "Ingrese el código del proveedor"
          );

          return;

        }


        if (!payload.lote) {

          alert(
            "Ingrese el lote"
          );

          return;

        }


        if (
          !payload.vencimiento
        ) {

          alert(
            "Ingrese la fecha de vencimiento"
          );

          return;

        }

      }


      /* =========================================
         ENVIAR
         ========================================= */

      try {

        const res =
          await fetch(
            "/api/inventario/entrada",
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify(
                  payload
                )

            }
          );


        const data =
          await res
            .json()
            .catch(() => ({}));


        if (!res.ok) {

          alert(
            data.error ||
            "Error al registrar entrada"
          );

          return;

        }


        form.reset();


        await poblarSelectBodegas(
          "entradaBodega"
        );


        await poblarSelectCasas(
          "entradaCasa"
        );


        autocompletarResponsable(
          "entradaResponsable"
        );


        limpiarSeleccionProductoEntrada();


        if (bloqueLote) {

          bloqueLote.style.display =
            "none";

        }


        actualizarValoracionEntrada();


        productosActivosEntrada =
          await cargarProductosActivosEntradaDesdeSQL();


        detalle_Entradas =
          await cargarDetalleEntradasDesdeSQL();


        await renderTablaInventario(
          inputBuscar
            ? inputBuscar.value
            : ""
        );


        alert(
          "Entrada registrada correctamente"
        );


      } catch (error) {

        console.error(
          "Error registrando entrada:",
          error
        );


        alert(
          "Error al conectar con el servidor"
        );

      }

    };


  /* =========================================
     BUSCADOR INVENTARIO
     ========================================= */

  if (inputBuscar) {

    inputBuscar.oninput =
      () => {

        renderTablaInventario(
          inputBuscar.value
        );

      };

  }

}




/*async function exportarStockExcel() {
  try {
    inventario = await cargarInventarioDesdeSQL();
    detalle_Entradas = await cargarDetalleEntradasDesdeSQL();

    const texto = (document.getElementById("buscarStock")?.value || "").toLowerCase().trim();
    const bodegaSeleccionada = document.getElementById("filtroBodegaStock")?.value || "TODAS";

    const lista = inventario.filter(item => {
      const coincideTexto =
        String(item.bodega || "").toLowerCase().includes(texto) ||
        String(item.codigo || "").toLowerCase().includes(texto) ||
        String(item.producto || "").toLowerCase().includes(texto) ||
        String(item.categoria || "").toLowerCase().includes(texto);

      const coincideBodega =
        !bodegaSeleccionada ||
        bodegaSeleccionada === "TODAS" ||
        String(item.bodega || "") === String(bodegaSeleccionada);

      return coincideTexto && coincideBodega;
    });

    if (!lista.length) {
      alert("No hay datos de stock para exportar con esos filtros");
      return;
    }

    const filas = lista.map(item => {
      const stockMinimo = Number(item.stock_minimo ?? item.stockMinimo ?? 0);
      const stockActual = Number(item.stock || 0);
      const bajoStock = stockMinimo > 0 && stockActual <= stockMinimo;

      const lotesVigentes = obtenerLotesVigentesProducto(item.bodega, item.codigo, item.producto);

      return {
        "Bodega": item.bodega || "",
        "Código": item.codigo || "",
        "Producto": item.producto || "",
        "Categoría": item.categoria || "",
        "Stock": stockActual,
        "Stock mínimo": stockMinimo,
        "Estado": bajoStock ? "Stock bajo" : "Disponible",
        "Tiene lotes": lotesVigentes.length ? "Sí" : "No"
      };
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");

    XLSX.writeFile(wb, "stock_actual.xlsx");
  } catch (error) {
    console.error("Error exportando stock:", error);
    alert("Error al exportar stock");
  }
}*/

async function exportarStockExcel() {
  try {
    inventario = await cargarInventarioDesdeSQL();
    detalle_Entradas = await cargarDetalleEntradasDesdeSQL();

    const texto = (document.getElementById("buscarStock")?.value || "").toLowerCase().trim();
    const bodegaSeleccionada = document.getElementById("filtroBodegaStock")?.value || "TODAS";

    const lista = inventario.filter(item => {
      const coincideTexto =
        String(item.bodega || "").toLowerCase().includes(texto) ||
        String(item.codigo || "").toLowerCase().includes(texto) ||
        String(item.producto || "").toLowerCase().includes(texto) ||
        String(item.categoria || "").toLowerCase().includes(texto);

      const coincideBodega =
        !bodegaSeleccionada ||
        bodegaSeleccionada === "TODAS" ||
        String(item.bodega || "") === String(bodegaSeleccionada);

      return coincideTexto && coincideBodega;
    });

    if (!lista.length) {
      alert("No hay datos de stock para exportar con esos filtros");
      return;
    }

    const filasStock = lista.map(item => {
      const stockMinimo = Number(item.stock_minimo ?? item.stockMinimo ?? 0);
      const stockActual = Number(item.stock || 0);
      const bajoStock = stockMinimo > 0 && stockActual <= stockMinimo;

      const lotesVigentes = obtenerLotesVigentesProducto(item.bodega, item.codigo, item.producto);

      return {
        "Bodega": item.bodega || "",
        "Código": item.codigo || "",
        "Producto": item.producto || "",
        "Categoría": item.categoria || "",
        "Stock": stockActual,
        "Stock mínimo": stockMinimo,
        "Estado": bajoStock ? "Stock bajo" : "Disponible",
        "Tiene lotes": lotesVigentes.length ? "Sí" : "No"
      };
    });

    const filasLotes = [];

    lista.forEach(item => {
      const lotesVigentes = obtenerLotesVigentesProducto(item.bodega, item.codigo, item.producto);

      lotesVigentes.forEach(lote => {
        filasLotes.push({
          "Bodega": item.bodega || "",
          "Código": item.codigo || "",
          "Producto": item.producto || "",
          "Categoría": item.categoria || "",
          "Lote": lote.lote || "",
          "Código proveedor": lote.codigoProveedor || "",
          "Casa comercial": lote.casaComercial || "",
          "Vencimiento": lote.vencimiento ? String(lote.vencimiento).slice(0, 10) : "",
          "Stock lote": Number(lote.stockLote || 0),
          "Fecha registro vigente": lote.fecha ? String(lote.fecha).slice(0, 19).replace("T", " ") : ""
        });
      });
    });

    const wb = XLSX.utils.book_new();

    const wsStock = XLSX.utils.json_to_sheet(filasStock);
    XLSX.utils.book_append_sheet(wb, wsStock, "Stock");

    const wsLotes = XLSX.utils.json_to_sheet(
      filasLotes.length
        ? filasLotes
        : [{ "Detalle": "No hay lotes vigentes para los filtros seleccionados" }]
    );
    XLSX.utils.book_append_sheet(wb, wsLotes, "Lotes vigentes");

    XLSX.writeFile(wb, "stock_actual.xlsx");
  } catch (error) {
    console.error("Error exportando stock:", error);
    alert("Error al exportar stock");
  }
}

function obtenerLotesVigentesProducto(bodega, codigo, producto) {
  const movimientos = detalle_Entradas.filter(item =>
    String(item.bodega || "").trim() === String(bodega || "").trim() &&
    String(item.codigo || "").trim() === String(codigo || "").trim() &&
    String(item.producto || "").trim() === String(producto || "").trim() &&
    String(item.lote || "").trim() !== ""
  );

  const mapa = new Map();

  movimientos.forEach(item => {
    const key = [
      String(item.producto_id || ""),
      String(item.bodega || "").trim(),
      String(item.codigoProveedor || "").trim().toLowerCase(),
      String(item.lote || "").trim().toLowerCase()
    ].join("||");

    const actual = mapa.get(key);

    if (!actual || Number(item.id || 0) > Number(actual.id || 0)) {
      mapa.set(key, item);
    }
  });

  return Array.from(mapa.values()).filter(item => Number(item.stockLote || 0) > 0);
}

function mostrarLotesProducto(bodega, codigo, producto) {
  const registros = obtenerLotesVigentesProducto(bodega, codigo, producto);

  if (!registros.length) {
    alert("No hay lotes registrados para este producto");
    return;
  }

  const filas = registros.map(item => `
    <tr>
      <td>${item.fecha ? String(item.fecha).slice(0, 19).replace("T", " ") : ""}</td>
      <td>${item.lote || ""}</td>
      <td>${item.vencimiento ? String(item.vencimiento).slice(0, 10) : ""}</td>
      <td>${item.casaComercial || ""}</td>
      <td>${item.codigoProveedor || ""}</td>
      <td>${item.stockLote || 0}</td>
    </tr>
  `).join("");

  panelBox.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h2>Lotes vigentes de ${producto}</h2>
      </div>

      <div style="margin-bottom:16px; color: rgba(255,255,255,0.78);">
        <strong>Bodega:</strong> ${bodega} <br>
        <strong>Código:</strong> ${codigo}
      </div>

      <div class="table-responsive">
        <table class="patient-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Lote</th>
              <th>Vencimiento</th>
              <th>Casa comercial</th>
              <th>Código proveedor</th>
              <th>Stock lote</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
          </tbody>
        </table>
      </div>

      <div class="form-actions" style="margin-top:20px;">
        <button class="btn-secondary" id="btnVolverStock">Volver a stock</button>
      </div>
    </div>
  `;

  const btnVolver = document.getElementById("btnVolverStock");
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      cambiarContenido("inventario-stock");
    });
  }
}

async function renderTablaStock(
  filtro = "",
  bodegaSeleccionada = "TODAS"
) {

  const tbody =
    document.getElementById(
      "tablaStockBody"
    );

  if (!tbody) return;


  try {

    /* =========================================
       CARGAR DATOS DESDE SQL
       ========================================= */

    inventario =
      await cargarInventarioDesdeSQL();


    detalle_Entradas =
      await cargarDetalleEntradasDesdeSQL();


    /* =========================================
       FILTROS
       ========================================= */

    const texto =
      String(
        filtro || ""
      )
        .toLowerCase()
        .trim();


    const lista =
      inventario.filter(
        item => {

          const coincideTexto =

            String(
              item.bodega || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              item.codigo || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              item.producto || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              item.categoria || ""
            )
              .toLowerCase()
              .includes(texto);


          const coincideBodega =

            !bodegaSeleccionada

            ||

            bodegaSeleccionada ===
              "TODAS"

            ||

            String(
              item.bodega || ""
            ).trim()
              .toUpperCase()
            ===
            String(
              bodegaSeleccionada || ""
            ).trim()
              .toUpperCase();


          return (
            coincideTexto &&
            coincideBodega
          );

        }
      );


    /* =========================================
       SIN REGISTROS
       ========================================= */

    if (!lista.length) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="8"
            class="empty-row"
          >
            No hay productos en stock
          </td>
        </tr>
      `;

      return;

    }


    /* =========================================
       RENDER TABLA
       ========================================= */

    tbody.innerHTML =
      lista
        .map(
          item => {

            const stockMinimo =
              Number(
                item.stock_minimo ??
                item.stockMinimo ??
                0
              );


            /*
              El stock general lo tomamos
              directamente de inventario.stock.

              Después verificaremos su
              consistencia contra los lotes
              con la auditoría SQL.
            */
            const stockActual =
              Number(
                item.stock ||
                0
              );


            const bajoStock =

              stockMinimo > 0

              &&

              stockActual <=
              stockMinimo;


            /* =================================
               LOTES VIGENTES
               ================================= */

            const lotesVigentes =
              obtenerLotesVigentesProducto(
                item.bodega,
                item.codigo,
                item.producto
              );


            return `
              <tr>

                <td>
                  ${item.bodega || ""}
                </td>

                <td>
                  ${item.codigo || ""}
                </td>

                <td>
                  ${item.producto || ""}
                </td>

                <td>
                  ${item.categoria || ""}
                </td>

                <td>
                  ${stockActual}
                </td>

                <td>
                  ${stockMinimo}
                </td>

                <td>

                  <span
                    class="estado-stock ${
                      bajoStock
                        ? "critico"
                        : "ok"
                    }"
                  >

                    ${
                      bajoStock
                        ? "Stock bajo"
                        : "Disponible"
                    }

                  </span>

                </td>

                <td>

                  ${
                    lotesVigentes.length

                      ? `
                        <button
                          type="button"
                          class="
                            btn-table
                            edit
                            btn-ver-lotes
                          "
                          data-bodega="${item.bodega || ""}"
                          data-codigo="${item.codigo || ""}"
                          data-producto="${item.producto || ""}"
                        >
                          Ver lotes
                        </button>
                      `

                      : `
                        <span
                          style="
                            color:
                            rgba(
                              255,
                              255,
                              255,
                              0.45
                            );
                          "
                        >
                          —
                        </span>
                      `
                  }

                </td>

              </tr>
            `;

          }
        )
        .join("");


    /* =========================================
       BOTONES VER LOTES
       ========================================= */

    document
      .querySelectorAll(
        ".btn-ver-lotes"
      )
      .forEach(
        btn => {

          btn.addEventListener(
            "click",
            () => {

              mostrarLotesProducto(

                btn.dataset.bodega,

                btn.dataset.codigo,

                btn.dataset.producto

              );

            }
          );

        }
      );


  } catch (error) {

    console.error(
      "Error renderizando stock:",
      error
    );


    tbody.innerHTML = `
      <tr>
        <td
          colspan="8"
          class="empty-row"
        >
          Error al cargar stock
        </td>
      </tr>
    `;

  }

}

async function inicializarModuloStock() {
  const inputBuscar = document.getElementById("buscarStock");
  const filtroBodega = document.getElementById("filtroBodegaStock");
  const btnExportar = document.getElementById("btnExportarStockExcel");

  if (!inputBuscar || !filtroBodega) return;

  await poblarSelectBodegas("filtroBodegaStock", true);

  if (!filtroBodega.querySelector('option[value="TODAS"]')) {
    filtroBodega.insertAdjacentHTML("afterbegin", `<option value="TODAS">TODAS</option>`);
  }

  filtroBodega.value = "TODAS";

  await renderTablaStock("", filtroBodega.value);

  inputBuscar.addEventListener("input", () => {
    renderTablaStock(inputBuscar.value, filtroBodega.value);
  });

  filtroBodega.addEventListener("change", () => {
    renderTablaStock(inputBuscar.value, filtroBodega.value);
  });

  if (btnExportar) {
    btnExportar.addEventListener("click", exportarStockExcel);
  }
}


/* =========================
   FUNCIONES COMPRAS
========================= */
/*REGISTRAR EDITAR PROVEEDOR */
function inicializarModuloProveedores() {
  const form = document.getElementById("formProveedor");
  const inputId = document.getElementById("proveedorId");
  const inputNombre = document.getElementById("proveedorNombre");
  const inputRuc = document.getElementById("proveedorRuc");
  const inputCorreo = document.getElementById("proveedorCorreo");
  const inputTelefono = document.getElementById("proveedorTelefono");
  const inputNotas = document.getElementById("proveedorNotas");
  const btnGuardar = document.getElementById("btnGuardarProveedor");
  const btnCancelar = document.getElementById("btnCancelarEdicionProveedor");

  if (!form || !inputNombre || !inputRuc) return;

  if (proveedorEnEdicion) {
    if (inputId) inputId.value = proveedorEnEdicion.id || "";
    if (inputNombre) inputNombre.value = proveedorEnEdicion.nombre || "";
    if (inputRuc) inputRuc.value = proveedorEnEdicion.ruc || "";
    if (inputCorreo) inputCorreo.value = proveedorEnEdicion.correo || "";
    if (inputTelefono) inputTelefono.value = proveedorEnEdicion.telefono || "";
    if (inputNotas) inputNotas.value = proveedorEnEdicion.notas || "";

    if (btnGuardar) btnGuardar.textContent = "Actualizar proveedor";
    if (btnCancelar) btnCancelar.style.display = "inline-block";
  } else {
    if (btnGuardar) btnGuardar.textContent = "Guardar proveedor";
    if (btnCancelar) btnCancelar.style.display = "none";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = inputId ? inputId.value.trim() : "";
    const nombre = inputNombre.value.trim();
    const ruc = inputRuc.value.trim();
    const correo = inputCorreo ? inputCorreo.value.trim() : "";
    const telefono = inputTelefono ? inputTelefono.value.trim() : "";
    const notas = inputNotas ? inputNotas.value.trim() : "";

    if (!nombre) {
      alert("Ingrese el nombre del proveedor");
      return;
    }

    if (!ruc) {
      alert("Ingrese el RUC del proveedor");
      return;
    }

    try {
      const esEdicion = !!id;

      const res = await fetch(esEdicion ? `/api/proveedores/${id}` : "/api/proveedores", {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          ruc,
          correo,
          telefono,
          notas
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al guardar proveedor");
        return;
      }

      form.reset();
      if (inputId) inputId.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar proveedor";
      if (btnCancelar) btnCancelar.style.display = "none";
      proveedorEnEdicion = null;

      alert(esEdicion ? "Proveedor actualizado correctamente" : "Proveedor registrado correctamente");
    } catch (error) {
      console.error("Error guardando proveedor:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      form.reset();
      if (inputId) inputId.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar proveedor";
      btnCancelar.style.display = "none";
      proveedorEnEdicion = null;
    });
  }
}

/*CONSULTAR PROVEEDORES */
async function renderTablaProveedores() {
  const tbody = document.getElementById("tablaProveedoresBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/proveedores");
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-row">Error al cargar proveedores</td>
        </tr>
      `;
      return;
    }

    const nombre = (document.getElementById("filtroProveedorNombre")?.value || "").toLowerCase().trim();
    const ruc = (document.getElementById("filtroProveedorRuc")?.value || "").toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(p => (
      (!nombre || String(p.nombre || "").toLowerCase().includes(nombre)) &&
      (!ruc || String(p.ruc || "").toLowerCase().includes(ruc))
    ));

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-row">No hay proveedores registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(p => {
      const inactivo = String(p.estado || "").toUpperCase() === "INACTIVO";

      return `
        <tr class="${inactivo ? "row-inactivo" : ""}">
          <td>${p.nombre || ""}</td>
          <td>${p.ruc || ""}</td>
          <td>${p.correo || ""}</td>
          <td>${p.telefono || ""}</td>
          <td>${p.notas || ""}</td>
          <td>${p.estado || ""}</td>
          <td>
            <button class="btn-table edit btn-editar-proveedor" data-id="${p.id}">
              Editar
            </button>
            <button
              class="btn-table ${inactivo ? "edit" : "delete"} btn-estado-proveedor"
              data-id="${p.id}"
            >
              ${inactivo ? "Habilitar" : "Deshabilitar"}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll(".btn-editar-proveedor").forEach(btn => {
      btn.addEventListener("click", () => {
        editarProveedor(Number(btn.dataset.id), lista);
      });
    });

    document.querySelectorAll(".btn-estado-proveedor").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          const resEstado = await fetch(`/api/proveedores/estado/${btn.dataset.id}`, {
            method: "PATCH"
          });

          const dataEstado = await resEstado.json().catch(() => ({}));

          if (!resEstado.ok) {
            alert(dataEstado.error || "Error al cambiar estado");
            return;
          }

          await renderTablaProveedores();
        } catch (error) {
          console.error("Error cambiando estado proveedor:", error);
          alert("Error al conectar con el servidor");
        }
      });
    });

  } catch (error) {
    console.error("Error renderizando proveedores:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">Error al cargar proveedores</td>
      </tr>
    `;
  }
}

/*EDITAR PROVEEDOR */
function editarProveedor(id, lista) {
  const proveedor = lista.find(p => Number(p.id) === Number(id));
  if (!proveedor) {
    alert("Proveedor no encontrado");
    return;
  }

  proveedorEnEdicion = { ...proveedor };
  cambiarContenido("compras-proveedores-registrar");
}

/*INICIALIZAR CONSULTA */
function inicializarModuloConsultarProveedores() {
  renderTablaProveedores();

  ["filtroProveedorNombre", "filtroProveedorRuc"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderTablaProveedores);
      el.addEventListener("change", renderTablaProveedores);
    }
  });

  const btnLimpiar = document.getElementById("btnLimpiarFiltrosProveedores");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      const inputNombre = document.getElementById("filtroProveedorNombre");
      const inputRuc = document.getElementById("filtroProveedorRuc");

      if (inputNombre) inputNombre.value = "";
      if (inputRuc) inputRuc.value = "";

      renderTablaProveedores();
    });
  }

  const btnExportar = document.getElementById("btnExportarProveedoresExcel");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarProveedoresExcel);
  }
}

/*EXPORTAR A EXCEL */
async function exportarProveedoresExcel() {
  try {
    const res = await fetch("/api/proveedores");
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      alert("Error al obtener proveedores");
      return;
    }

    const nombre = (document.getElementById("filtroProveedorNombre")?.value || "").toLowerCase().trim();
    const ruc = (document.getElementById("filtroProveedorRuc")?.value || "").toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(p => {
      return (
        (!nombre || String(p.nombre || "").toLowerCase().includes(nombre)) &&
        (!ruc || String(p.ruc || "").toLowerCase().includes(ruc))
      );
    });

    if (!lista.length) {
      alert("No hay proveedores para exportar");
      return;
    }

    const filas = lista.map(p => ({
      Nombre: p.nombre || "",
      RUC: p.ruc || "",
      Correo: p.correo || "",
      Teléfono: p.telefono || "",
      Notas: p.notas || "",
      Estado: p.estado || ""
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");

    XLSX.writeFile(wb, "proveedores.xlsx");
  } catch (error) {
    console.error("Error exportando proveedores:", error);
    alert("Error al exportar proveedores");
  }
}

/*HELPER SIGUIENTE NUMERO */
async function obtenerSiguienteNumeroCompra() {
  try {
    const res = await fetch("/api/compras/siguiente-numero");
    const data = await res.json().catch(() => ({}));
    return res.ok ? (data.numero || "") : `COMP-${Date.now()}`;
  } catch (_) {
    return `COMP-${Date.now()}`;
  }
}

/*RENDER PROVEEDORES BUSQUEDA */
function renderResultadosProveedorCompra(texto = "") {
  const caja = document.getElementById("resultadosProveedorCompra");
  if (!caja) return;

  const q = String(texto || "").toLowerCase().trim();

  const lista = proveedoresCompra.filter(p =>
    String(p.nombre || "").toLowerCase().includes(q) ||
    String(p.ruc || "").toLowerCase().includes(q)
  );

  if (!lista.length || !q) {
    caja.innerHTML = "";
    caja.style.display = "none";
    return;
  }

  caja.innerHTML = lista.map(p => `
    <div class="resultado-item" data-id="${p.id}">
      <strong>${p.nombre || ""}</strong><br>
      <small>${p.ruc || ""}</small>
    </div>
  `).join("");

  caja.style.display = "block";

  caja.querySelectorAll(".resultado-item").forEach(item => {
    item.addEventListener("click", () => {
      const proveedor = proveedoresCompra.find(p => Number(p.id) === Number(item.dataset.id));
      if (!proveedor) return;

      proveedorCompraSeleccionado = proveedor;
      document.getElementById("buscarProveedorCompra").value = proveedor.nombre || "";
      document.getElementById("compraProveedorNombre").value = proveedor.nombre || "";
      document.getElementById("compraProveedorRuc").value = proveedor.ruc || "";
      caja.innerHTML = "";
      caja.style.display = "none";
    });
  });
}

/*RENDER PRODUCTOS BUSQUEDA */
function renderResultadosProductoCompra(texto = "") {
  const caja = document.getElementById("resultadosProductoCompra");
  if (!caja) return;

  const q = String(texto || "").toLowerCase().trim();

  const lista = productosGlobal.filter(p =>
    String(p.codigo || "").toLowerCase().includes(q) ||
    String(p.producto || "").toLowerCase().includes(q)
  );

  if (!lista.length || !q) {
    caja.innerHTML = "";
    caja.style.display = "none";
    return;
  }

  caja.innerHTML = lista.map(p => `
    <div class="resultado-item" data-id="${p.id}">
      <strong>${p.codigo || ""} - ${p.producto || ""}</strong><br>
      <small>${p.categoria || ""}</small>
    </div>
  `).join("");

  caja.style.display = "block";

  caja.querySelectorAll(".resultado-item").forEach(item => {
    item.addEventListener("click", () => {
      const prod = productosGlobal.find(p => Number(p.id) === Number(item.dataset.id));
      if (!prod) return;

      productoCompraSeleccionado = prod;
      document.getElementById("buscarProductoCompra").value = `${prod.codigo || ""} - ${prod.producto || ""}`;
      document.getElementById("compraCodigoProducto").value = prod.codigo || "";
      document.getElementById("compraProductoNombre").value = prod.producto || "";
      document.getElementById("compraCategoriaProducto").value = prod.categoria || "";
      caja.innerHTML = "";
      caja.style.display = "none";
    });
  });
}

/*CALCULO LINEA */
function recalcularTotalesLineaCompra() {
  const cantidad = Number(document.getElementById("compraCantidad")?.value || 0);
  const precio = Number(document.getElementById("compraPrecioUnitario")?.value || 0);
  const aplicaIva = document.getElementById("compraAplicaIva")?.value === "SI";

  const subtotal = cantidad * precio;
  const iva = aplicaIva ? subtotal * 0.15 : 0;
  const total = subtotal + iva;

  const inputSubtotal = document.getElementById("compraSubtotalLinea");
  const inputIva = document.getElementById("compraIvaLinea");
  const inputTotal = document.getElementById("compraTotalLinea");

  if (inputSubtotal) inputSubtotal.value = subtotal.toFixed(2);
  if (inputIva) inputIva.value = iva.toFixed(2);
  if (inputTotal) inputTotal.value = total.toFixed(2);
}

/*RESUMEN GENERAL */
function recalcularResumenCompra() {
  let subtotal0 = 0;
  let subtotal15 = 0;
  let iva15 = 0;
  let total = 0;

  detalleCompraTemporal.forEach(item => {
    if (item.aplica_iva) {
      subtotal15 += Number(item.subtotal || 0);
      iva15 += Number(item.iva || 0);
    } else {
      subtotal0 += Number(item.subtotal || 0);
    }
    total += Number(item.total || 0);
  });

  document.getElementById("compraSubtotal0").value = subtotal0.toFixed(2);
  document.getElementById("compraSubtotal15").value = subtotal15.toFixed(2);
  document.getElementById("compraIva15").value = iva15.toFixed(2);
  document.getElementById("compraTotalGeneral").value = total.toFixed(2);
}

/*TABLA DETALLE COMPRA */
function renderTablaDetalleCompraTemporal() {
  const tbody = document.getElementById("tablaDetalleCompraBody");
  if (!tbody) return;

  if (!detalleCompraTemporal.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-row">No hay artículos agregados</td>
      </tr>
    `;
    recalcularResumenCompra();
    return;
  }

  tbody.innerHTML = detalleCompraTemporal.map((item, index) => `
    <tr>
      <td>${item.codigo || ""}</td>
      <td>${item.producto || ""}</td>
      <td>${item.cantidad || 0}</td>
      <td>${Number(item.precio_unitario || 0).toFixed(2)}</td>
      <td>${item.aplica_iva ? "15%" : "0%"}</td>
      <td>${Number(item.subtotal || 0).toFixed(2)}</td>
      <td>${Number(item.total || 0).toFixed(2)}</td>
      <td>${item.lote || ""}</td>
      <td>${item.fecha_vencimiento || ""}</td>
      <td>
        <button class="btn-table delete btn-quitar-detalle-compra" data-index="${index}">
          Quitar
        </button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-quitar-detalle-compra").forEach(btn => {
    btn.addEventListener("click", () => {
      detalleCompraTemporal.splice(Number(btn.dataset.index), 1);
      renderTablaDetalleCompraTemporal();
    });
  });

  recalcularResumenCompra();
}

/*INICIALIZAR MODULO COMPRAS */
async function inicializarModuloCompras() {
  const form = document.getElementById("formCompra");
  if (!form) return;

  detalleCompraTemporal = [];
  proveedorCompraSeleccionado = null;
  productoCompraSeleccionado = null;

  document.getElementById("compraNumero").value = await obtenerSiguienteNumeroCompra();
  document.getElementById("compraFecha").value = new Date().toISOString().slice(0, 10);

  await poblarSelectBodegas("compraBodega");
  autocompletarResponsable("compraResponsable");

  try {
    const resProv = await fetch("/api/proveedores");
    proveedoresCompra = await resProv.json().catch(() => ([]));
    proveedoresCompra = Array.isArray(proveedoresCompra)
      ? proveedoresCompra.filter(p => String(p.estado || "").toUpperCase() === "ACTIVO")
      : [];
  } catch (_) {
    proveedoresCompra = [];
  }

  productosGlobal = await cargarProductosActivosEntradaDesdeSQL();

  renderTablaDetalleCompraTemporal();

  const buscarProveedor = document.getElementById("buscarProveedorCompra");
  if (buscarProveedor) {
    buscarProveedor.addEventListener("input", () => {
      renderResultadosProveedorCompra(buscarProveedor.value);
    });

    buscarProveedor.addEventListener("focus", () => {
      renderResultadosProveedorCompra(buscarProveedor.value);
    });
  }

  const buscarProducto = document.getElementById("buscarProductoCompra");
  if (buscarProducto) {
    buscarProducto.addEventListener("input", () => {
      renderResultadosProductoCompra(buscarProducto.value);
    });

    buscarProducto.addEventListener("focus", () => {
      renderResultadosProductoCompra(buscarProducto.value);
    });
  }

  ["compraCantidad", "compraPrecioUnitario", "compraAplicaIva"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", recalcularTotalesLineaCompra);
      el.addEventListener("change", recalcularTotalesLineaCompra);
    }
  });

  const btnAgregar = document.getElementById("btnAgregarDetalleCompra");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", () => {
      if (!productoCompraSeleccionado) {
        alert("Seleccione un producto");
        return;
      }

      const cantidad = Number(document.getElementById("compraCantidad").value || 0);
      const precio = Number(document.getElementById("compraPrecioUnitario").value || 0);
      const aplicaIva = document.getElementById("compraAplicaIva").value === "SI";
      const lote = document.getElementById("compraLote").value.trim();
      const codigoVendedor = document.getElementById("compraCodigoVendedor").value.trim();
      const fechaVencimiento = document.getElementById("compraFechaVencimiento").value || null;

      if (cantidad <= 0) {
        alert("Ingrese una cantidad válida");
        return;
      }

      if (precio < 0) {
        alert("Ingrese un precio válido");
        return;
      }

      const subtotal = cantidad * precio;
      const iva = aplicaIva ? subtotal * 0.15 : 0;
      const total = subtotal + iva;

      detalleCompraTemporal.push({
        producto_id: productoCompraSeleccionado.id,
        codigo: productoCompraSeleccionado.codigo,
        producto: productoCompraSeleccionado.producto,
        categoria: productoCompraSeleccionado.categoria || "",
        cantidad,
        precio_unitario: precio,
        aplica_iva: aplicaIva,
        subtotal,
        iva,
        total,
        lote,
        codigo_vendedor: codigoVendedor,
        fecha_vencimiento: fechaVencimiento
      });

      document.getElementById("buscarProductoCompra").value = "";
      document.getElementById("compraCodigoProducto").value = "";
      document.getElementById("compraProductoNombre").value = "";
      document.getElementById("compraCategoriaProducto").value = "";
      document.getElementById("compraCantidad").value = "";
      document.getElementById("compraPrecioUnitario").value = "";
      document.getElementById("compraAplicaIva").value = "NO";
      document.getElementById("compraLote").value = "";
      document.getElementById("compraCodigoVendedor").value = "";
      document.getElementById("compraFechaVencimiento").value = "";
      document.getElementById("compraSubtotalLinea").value = "";
      document.getElementById("compraIvaLinea").value = "";
      document.getElementById("compraTotalLinea").value = "";
      productoCompraSeleccionado = null;

      renderTablaDetalleCompraTemporal();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const numero_compra = document.getElementById("compraNumero").value;
    const bodega = document.getElementById("compraBodega").value;
    const numero_factura = document.getElementById("compraNumeroFactura").value.trim();
    const fecha_compra = document.getElementById("compraFecha").value;
    const responsable = document.getElementById("compraResponsable").value.trim();
    const observacion = document.getElementById("compraObservacion").value.trim();

    if (!bodega) {
      alert("Seleccione la bodega");
      return;
    }

    if (!proveedorCompraSeleccionado) {
      alert("Seleccione un proveedor");
      return;
    }

    if (!numero_factura) {
      alert("Ingrese el número de factura");
      return;
    }

    if (!fecha_compra) {
      alert("Seleccione la fecha de compra");
      return;
    }

    if (!detalleCompraTemporal.length) {
      alert("Agregue al menos un artículo");
      return;
    }

    const payload = {
      numero_compra,
      proveedor_id: proveedorCompraSeleccionado.id,
      numero_factura,
      fecha_compra,
      bodega,
      responsable,
      observacion,
      subtotal_0: Number(document.getElementById("compraSubtotal0").value || 0),
      subtotal_15: Number(document.getElementById("compraSubtotal15").value || 0),
      iva_15: Number(document.getElementById("compraIva15").value || 0),
      total: Number(document.getElementById("compraTotalGeneral").value || 0),
      detalle: detalleCompraTemporal
    };

    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al registrar compra");
        return;
      }

      alert(`Compra registrada correctamente: ${data.numero_compra || ""}`);

      detalleCompraTemporal = [];
      proveedorCompraSeleccionado = null;
      productoCompraSeleccionado = null;

      form.reset();
      document.getElementById("compraNumero").value = await obtenerSiguienteNumeroCompra();
      document.getElementById("compraFecha").value = new Date().toISOString().slice(0, 10);
      autocompletarResponsable("compraResponsable");
      document.getElementById("compraProveedorNombre").value = "";
      document.getElementById("compraProveedorRuc").value = "";

      renderTablaDetalleCompraTemporal();
    } catch (error) {
      console.error("Error registrando compra:", error);
      alert("Error al conectar con el servidor");
    }
  });
}

/*RENDER DE COMPRAS */
async function renderTablaCompras() {
  const tbody = document.getElementById("tablaComprasBody");
  if (!tbody) return;

  try {
    const resCompras = await fetch("/api/compras");
    const compras = await resCompras.json().catch(() => ([]));

    let detalleCompras = [];
    try {
      const resDetalle = await fetch("/api/compras");
      const dataDetalle = await resDetalle.json().catch(() => ([]));
      detalleCompras = Array.isArray(dataDetalle) ? dataDetalle : [];
    } catch (_) {
      detalleCompras = [];
    }

    if (!resCompras.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-row">Error al cargar compras</td>
        </tr>
      `;
      return;
    }

    const fechaDesde = document.getElementById("filtroCompraFechaDesde")?.value || "";
    const fechaHasta = document.getElementById("filtroCompraFechaHasta")?.value || "";
    const proveedor = (document.getElementById("filtroCompraProveedor")?.value || "").toLowerCase().trim();
    const ruc = (document.getElementById("filtroCompraRuc")?.value || "").toLowerCase().trim();
    const articulo = (document.getElementById("filtroCompraArticulo")?.value || "").toLowerCase().trim();

    let lista = Array.isArray(compras) ? compras : [];

    lista = lista.filter(c => {
      const fecha = String(c.fecha_compra || "");

      const okFechaDesde = !fechaDesde || fecha >= fechaDesde;
      const okFechaHasta = !fechaHasta || fecha <= fechaHasta;
      const okProveedor = !proveedor || String(c.nombre_proveedor || "").toLowerCase().includes(proveedor);
      const okRuc = !ruc || String(c.ruc_proveedor || "").toLowerCase().includes(ruc);

      return okFechaDesde && okFechaHasta && okProveedor && okRuc;
    });

    if (articulo) {
      const idsPermitidos = [];

      for (const compra of lista) {
        try {
          const resDet = await fetch(`/api/compras/${compra.id}`);
          const dataDet = await resDet.json().catch(() => ({}));
          const detalle = Array.isArray(dataDet.detalle) ? dataDet.detalle : [];

          const coincide = detalle.some(d =>
            String(d.producto || "").toLowerCase().includes(articulo)
          );

          if (coincide) idsPermitidos.push(Number(compra.id));
        } catch (_) {}
      }

      lista = lista.filter(c => idsPermitidos.includes(Number(c.id)));
    }

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-row">No hay compras registradas</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>${c.fecha_compra || ""}</td>
        <td>${c.numero_compra || ""}</td>
        <td>${c.numero_factura || ""}</td>
        <td>${c.nombre_proveedor || ""}</td>
        <td>${c.ruc_proveedor || ""}</td>
        <td>${c.bodega || ""}</td>
        <td>${Number(c.total || 0).toFixed(2)}</td>
        <td>
          <button class="btn-table edit btn-ver-compra" data-id="${c.id}">
            Ver detalle
          </button>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll(".btn-ver-compra").forEach(btn => {
      btn.addEventListener("click", () => {
        mostrarDetalleCompra(Number(btn.dataset.id));
      });
    });

  } catch (error) {
    console.error("Error cargando compras:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">Error al cargar compras</td>
      </tr>
    `;
  }
}

/*DETALLE DE COMPRA */
async function mostrarDetalleCompra(id) {
  try {
    const res = await fetch(`/api/compras/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al obtener detalle de compra");
      return;
    }

    const compra = data.encabezado || {};
    const detalle = Array.isArray(data.detalle) ? data.detalle : [];

    const filas = detalle.map(item => `
      <tr>
        <td>${item.codigo || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.categoria || ""}</td>
        <td>${item.cantidad || 0}</td>
        <td>${Number(item.precio_unitario || 0).toFixed(2)}</td>
        <td>${item.aplica_iva ? "15%" : "0%"}</td>
        <td>${Number(item.subtotal || 0).toFixed(2)}</td>
        <td>${Number(item.iva || 0).toFixed(2)}</td>
        <td>${Number(item.total || 0).toFixed(2)}</td>
        <td>${item.lote || ""}</td>
        <td>${item.codigo_vendedor || ""}</td>
        <td>${item.fecha_vencimiento || ""}</td>
      </tr>
    `).join("");

    panelBox.innerHTML = `
      <div class="inventario-wrap">

        <div class="table-card">
          <div class="table-header">
            <h2>DETALLE DE COMPRA ${compra.numero_compra || ""}</h2>
          </div>

          <div style="margin-bottom:18px; color: rgba(255,255,255,0.78);">
            <strong>Fecha compra:</strong> ${compra.fecha_compra || ""}<br>
            <strong>Proveedor:</strong> ${compra.nombre_proveedor || ""}<br>
            <strong>RUC:</strong> ${compra.ruc_proveedor || ""}<br>
            <strong>Factura:</strong> ${compra.numero_factura || ""}<br>
            <strong>Bodega:</strong> ${compra.bodega || ""}<br>
            <strong>Responsable:</strong> ${compra.responsable || ""}<br>
            <strong>Observación:</strong> ${compra.observacion || ""}<br>
            <strong>Subtotal 0%:</strong> ${Number(compra.subtotal_0 || 0).toFixed(2)}<br>
            <strong>Subtotal 15%:</strong> ${Number(compra.subtotal_15 || 0).toFixed(2)}<br>
            <strong>IVA 15%:</strong> ${Number(compra.iva_15 || 0).toFixed(2)}<br>
            <strong>Total:</strong> ${Number(compra.total || 0).toFixed(2)}
          </div>

          <div class="table-responsive">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Cant.</th>
                  <th>P. Unit.</th>
                  <th>IVA</th>
                  <th>Subtotal</th>
                  <th>IVA valor</th>
                  <th>Total</th>
                  <th>Lote</th>
                  <th>Cód. vendedor</th>
                  <th>F. Venc.</th>
                </tr>
              </thead>
              <tbody>
                ${filas || `<tr><td colspan="12" class="empty-row">No hay detalle</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="form-actions" style="margin-top:20px;">
            <button class="btn-secondary" id="btnVolverCompras">Volver a compras</button>
          </div>
        </div>

      </div>
    `;

    const btnVolver = document.getElementById("btnVolverCompras");
    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        cambiarContenido("compras-consultar");
      });
    }
  } catch (error) {
    console.error("Error viendo detalle compra:", error);
    alert("Error al conectar con el servidor");
  }
}

/*EXPORTAR COMPRAS EXCEL */
async function exportarComprasExcel() {
  try {
    const res = await fetch("/api/compras");
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      alert("Error al obtener compras");
      return;
    }

    const fechaDesde = document.getElementById("filtroCompraFechaDesde")?.value || "";
    const fechaHasta = document.getElementById("filtroCompraFechaHasta")?.value || "";
    const proveedor = (document.getElementById("filtroCompraProveedor")?.value || "").toLowerCase().trim();
    const ruc = (document.getElementById("filtroCompraRuc")?.value || "").toLowerCase().trim();
    const articulo = (document.getElementById("filtroCompraArticulo")?.value || "").toLowerCase().trim();

    let lista = (Array.isArray(data) ? data : []).filter(c => {
      const fecha = String(c.fecha_compra || "");

      const okFechaDesde = !fechaDesde || fecha >= fechaDesde;
      const okFechaHasta = !fechaHasta || fecha <= fechaHasta;
      const okProveedor = !proveedor || String(c.nombre_proveedor || "").toLowerCase().includes(proveedor);
      const okRuc = !ruc || String(c.ruc_proveedor || "").toLowerCase().includes(ruc);

      return okFechaDesde && okFechaHasta && okProveedor && okRuc;
    });

    if (articulo) {
      const listaFiltrada = [];

      for (const compra of lista) {
        try {
          const resDet = await fetch(`/api/compras/${compra.id}`);
          const dataDet = await resDet.json().catch(() => ({}));
          const detalle = Array.isArray(dataDet.detalle) ? dataDet.detalle : [];

          const coincide = detalle.some(d =>
            String(d.producto || "").toLowerCase().includes(articulo)
          );

          if (coincide) listaFiltrada.push(compra);
        } catch (_) {}
      }

      lista = listaFiltrada;
    }

    if (!lista.length) {
      alert("No hay compras para exportar");
      return;
    }

    const filas = lista.map(c => ({
      Fecha: c.fecha_compra || "",
      "N° Compra": c.numero_compra || "",
      Factura: c.numero_factura || "",
      Proveedor: c.nombre_proveedor || "",
      RUC: c.ruc_proveedor || "",
      Bodega: c.bodega || "",
      "Subtotal 0%": Number(c.subtotal_0 || 0).toFixed(2),
      "Subtotal 15%": Number(c.subtotal_15 || 0).toFixed(2),
      "IVA 15%": Number(c.iva_15 || 0).toFixed(2),
      Total: Number(c.total || 0).toFixed(2),
      Responsable: c.responsable || "",
      Observación: c.observacion || ""
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");

    XLSX.writeFile(wb, "compras.xlsx");
  } catch (error) {
    console.error("Error exportando compras:", error);
    alert("Error al exportar compras");
  }
}

/*INICIALZIAR CONSULTAS COMPRAS */
function inicializarModuloConsultarCompras() {
  renderTablaCompras();

  [
    "filtroCompraFechaDesde",
    "filtroCompraFechaHasta",
    "filtroCompraProveedor",
    "filtroCompraRuc",
    "filtroCompraArticulo"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderTablaCompras);
      el.addEventListener("change", renderTablaCompras);
    }
  });

  const btnLimpiar = document.getElementById("btnLimpiarFiltrosCompras");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      [
        "filtroCompraFechaDesde",
        "filtroCompraFechaHasta",
        "filtroCompraProveedor",
        "filtroCompraRuc",
        "filtroCompraArticulo"
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      renderTablaCompras();
    });
  }

  const btnExportar = document.getElementById("btnExportarComprasExcel");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarComprasExcel);
  }
}

/* =========================
   PRODUCTOS GENERALES
========================= */

/*async function renderTablaProductosGeneral(filtro = "") {
  const tbody = document.getElementById("tablaProductosGeneralBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/productos");
    const data = await res.json().catch(() => ([]));

    const texto = filtro.toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(p =>
      String(p.codigo || "").toLowerCase().includes(texto) ||
      String(p.producto || "").toLowerCase().includes(texto) ||
      String(p.categoria || "").toLowerCase().includes(texto) ||
      String(p.unidad || "").toLowerCase().includes(texto) ||
      String(p.estado || "").toLowerCase().includes(texto)
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">No hay productos registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(p => `
      <tr>
        <td>${p.codigo || ""}</td>
        <td>${p.categoria || ""}</td>
        <td>${p.producto || ""}</td>
        <td>${p.unidad || ""}</td>
        <td>${p.estado || ""}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table edit" onclick="editarProductoSistema(${p.id})">Editar</button>
            <button class="btn-table ${p.estado === "ACTIVO" ? "delete" : "edit"}" onclick="toggleProductoSistema(${p.id})">
              ${p.estado === "ACTIVO" ? "Deshabilitar" : "Activar"}
            </button>
          </div>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error cargando productos:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Error al cargar productos</td>
      </tr>
    `;
  }
}*/

async function renderTablaProductosGeneral(
  filtro = "",
  pagina = 1
) {

  const tbody =
    document.getElementById(
      "tablaProductosGeneralBody"
    );

  if (!tbody) return;


  try {

    const res =
      await fetch(
        "/api/productos"
      );


    const data =
      await res
        .json()
        .catch(() => ([]));


    const texto =
      String(
        filtro || ""
      )
        .toLowerCase()
        .trim();


    const lista =
      (
        Array.isArray(data)
          ? data
          : []
      )
        .filter(
          p =>

            /* Código interno */
            String(
              p.codigo || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            /* NUEVO: referencia / código fábrica */
            String(
              p.referencia || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              p.producto || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              p.categoria || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              p.unidad || ""
            )
              .toLowerCase()
              .includes(texto)

            ||

            String(
              p.estado || ""
            )
              .toLowerCase()
              .includes(texto)

        );


    /* =========================================
       SIN PRODUCTOS
       ========================================= */

    if (!lista.length) {

      tbody.innerHTML = `
        <tr>

          <td
            colspan="7"
            class="empty-row"
          >
            No hay productos registrados
          </td>

        </tr>
      `;


      renderPaginacionProductosGeneral(
        0,
        filtro
      );


      return;

    }


    /* =========================================
       PAGINACIÓN
       ========================================= */

    const totalPaginas =
      Math.ceil(
        lista.length /
        productosPorPagina
      );


    paginaProductosGeneral =
      Math.max(
        1,
        Math.min(
          pagina,
          totalPaginas
        )
      );


    const inicio =
      (
        paginaProductosGeneral - 1
      ) *
      productosPorPagina;


    const fin =
      inicio +
      productosPorPagina;


    const listaPagina =
      lista.slice(
        inicio,
        fin
      );


    /* =========================================
       TABLA
       ========================================= */

    tbody.innerHTML =
      listaPagina
        .map(
          p => {

            const claseFila =
              p.estado === "INACTIVO"
                ? "producto-inactivo-row"
                : "";


            return `
              <tr class="${claseFila}">

                <td>
                  ${p.codigo || ""}
                </td>

                <td>
                  ${
                    p.referencia
                      ? p.referencia
                      : "—"
                  }
                </td>

                <td>
                  ${p.categoria || ""}
                </td>

                <td>
                  ${p.producto || ""}
                </td>

                <td>
                  ${p.unidad || ""}
                </td>

                <td>
                  ${p.estado || ""}
                </td>

                <td>

                  <div class="table-actions">

                    <button
                      class="btn-table edit"
                      onclick="editarProductoSistema(${p.id})"
                    >
                      Editar
                    </button>


                    <button
                      class="btn-table ${
                        p.estado === "ACTIVO"
                          ? "delete"
                          : "edit"
                      }"
                      onclick="toggleProductoSistema(${p.id})"
                    >
                      ${
                        p.estado === "ACTIVO"
                          ? "Deshabilitar"
                          : "Activar"
                      }
                    </button>

                  </div>

                </td>

              </tr>
            `;

          }
        )
        .join("");


    renderPaginacionProductosGeneral(
      totalPaginas,
      filtro
    );


  } catch (error) {

    console.error(
      "Error cargando productos:",
      error
    );


    tbody.innerHTML = `
      <tr>

        <td
          colspan="7"
          class="empty-row"
        >
          Error al cargar productos
        </td>

      </tr>
    `;

  }

}

function renderPaginacionProductosGeneral(
  totalPaginas,
  filtro = ""
) {
  let contenedor =
    document.getElementById(
      "paginacionProductosGeneral"
    );

  const tabla =
    document.getElementById(
      "tablaProductosGeneralBody"
    )?.closest("table");

  if (!tabla) return;

  if (!contenedor) {
    contenedor =
      document.createElement("div");

    contenedor.id =
      "paginacionProductosGeneral";

    contenedor.className =
      "paginacion-productos-general";

    tabla.insertAdjacentElement(
      "afterend",
      contenedor
    );
  }

  if (
    !totalPaginas ||
    totalPaginas <= 1
  ) {
    contenedor.innerHTML = "";
    return;
  }

  contenedor.innerHTML = `
    <button
      type="button"
      class="btn-paginacion-productos"
      ${
        paginaProductosGeneral <= 1
          ? "disabled"
          : ""
      }
      id="btnAnteriorProductosGeneral"
    >
      <i class="fa-solid fa-chevron-left"></i>
      Anterior
    </button>

    <span class="paginacion-productos-info">
      Página
      <strong>
        ${paginaProductosGeneral}
      </strong>
      de
      <strong>
        ${totalPaginas}
      </strong>
    </span>

    <button
      type="button"
      class="btn-paginacion-productos"
      ${
        paginaProductosGeneral >=
        totalPaginas
          ? "disabled"
          : ""
      }
      id="btnSiguienteProductosGeneral"
    >
      Siguiente
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  document
    .getElementById(
      "btnAnteriorProductosGeneral"
    )
    ?.addEventListener(
      "click",
      () => {
        if (
          paginaProductosGeneral > 1
        ) {
          paginaProductosGeneral--;

          renderTablaProductosGeneral(
            filtro,
            paginaProductosGeneral
          );
        }
      }
    );

  document
    .getElementById(
      "btnSiguienteProductosGeneral"
    )
    ?.addEventListener(
      "click",
      () => {
        if (
          paginaProductosGeneral <
          totalPaginas
        ) {
          paginaProductosGeneral++;

          renderTablaProductosGeneral(
            filtro,
            paginaProductosGeneral
          );
        }
      }
    );
}

async function guardarProductoSistema(e) {

  e.preventDefault();


  const categoriaEl =
    document.getElementById(
      "prodCategoria"
    );


  const nombreEl =
    document.getElementById(
      "prodNombre"
    );


  const unidadEl =
    document.getElementById(
      "prodUnidad"
    );


  const codigoEl =
    document.getElementById(
      "prodCodigo"
    );


  /* NUEVO */
  const referenciaEl =
    document.getElementById(
      "prodReferencia"
    );


  const btnGuardar =
    document.getElementById(
      "btnGuardarProducto"
    );


  const btnCancelar =
    document.getElementById(
      "btnCancelarProductoEdicion"
    );


  if (
    !categoriaEl ||
    !nombreEl ||
    !unidadEl ||
    !codigoEl
  ) {

    alert(
      "Faltan campos del formulario de productos"
    );

    return;

  }


  /* =========================================
     PAYLOAD
     referencia es OPCIONAL
     ========================================= */

  const payload = {

    categoria:
      categoriaEl.value,

    producto:
      nombreEl.value.trim(),

    unidad:
      unidadEl.value.trim(),

    referencia:
      referenciaEl
        ? referenciaEl.value.trim()
        : ""

  };


  if (
    !payload.categoria ||
    !payload.producto ||
    !payload.unidad
  ) {

    alert(
      "Complete los campos obligatorios"
    );

    return;

  }


  try {

    let res;
    let data;


    /* =========================================
       EDITAR
       ========================================= */

    if (
      productoEditandoId
    ) {

      res =
        await fetch(
          `/api/productos/${productoEditandoId}`,
          {

            method:
              "PUT",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                payload
              )

          }
        );


      data =
        await res
          .json()
          .catch(() => ({}));


      if (!res.ok) {

        alert(
          data.error ||
          `Error HTTP ${res.status}`
        );

        return;

      }


      alert(
        "Producto actualizado correctamente"
      );

    }


    /* =========================================
       CREAR
       ========================================= */

    else {

      res =
        await fetch(
          "/api/productos",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                payload
              )

          }
        );


      data =
        await res
          .json()
          .catch(() => ({}));


      if (!res.ok) {

        alert(
          data.error ||
          `Error HTTP ${res.status}`
        );

        return;

      }


      alert(
        `Producto guardado correctamente. Código: ${data.codigo || ""}`
      );

    }


    /* =========================================
       LIMPIAR FORMULARIO
       ========================================= */

    productoEditandoId =
      null;


    const form =
      document.getElementById(
        "formProductoGeneral"
      );


    if (form) {

      form.reset();

    }


    codigoEl.value =
      "";


    if (referenciaEl) {

      referenciaEl.value =
        "";

    }


    categoriaEl.disabled =
      false;


    if (btnGuardar) {

      btnGuardar.textContent =
        "Guardar producto";

    }


    if (btnCancelar) {

      btnCancelar.style.display =
        "none";

    }


    await poblarSelectCategoriasProducto(
      "prodCategoria"
    );


    await renderTablaProductosGeneral();


  } catch (error) {

    console.error(
      "Error guardando producto:",
      error
    );


    alert(
      "Error al conectar con el servidor"
    );

  }

}

/*async function editarProductoSistema(id) {
  try {
    const res = await fetch(`/api/productos/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al obtener producto");
      return;
    }

    productoEditandoId = id;
    console.log("productoEditandoId cargado para editar:", productoEditandoId);

    document.getElementById("prodCategoria").value = data.categoria || "";
    document.getElementById("prodCodigo").value = data.codigo || "";
    document.getElementById("prodNombre").value = data.producto || "";
    document.getElementById("prodUnidad").value = data.unidad || "";

    const btnGuardar = document.getElementById("btnGuardarProducto");
    const btnCancelar = document.getElementById("btnCancelarProductoEdicion");
    const categoria = document.getElementById("prodCategoria");

    if (btnGuardar) btnGuardar.textContent = "Actualizar producto";
    if (btnCancelar) btnCancelar.style.display = "inline-flex";
    if (categoria) categoria.disabled = true;

  } catch (error) {
    console.error("Error cargando producto para editar:", error);
    alert("Error al conectar con el servidor");
  }
}*/

async function editarProductoSistema(id) {

  try {

    const res =
      await fetch(
        `/api/productos/${id}`
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      alert(
        data.error ||
        "Error al obtener producto"
      );

      return;

    }


    productoEditandoId =
      id;


    const categoria =
      document.getElementById(
        "prodCategoria"
      );


    const codigo =
      document.getElementById(
        "prodCodigo"
      );


    const referencia =
      document.getElementById(
        "prodReferencia"
      );


    const nombre =
      document.getElementById(
        "prodNombre"
      );


    const unidad =
      document.getElementById(
        "prodUnidad"
      );


    if (categoria) {

      categoria.value =
        data.categoria ||
        "";

    }


    if (codigo) {

      codigo.value =
        data.codigo ||
        "";

    }


    /* NUEVO */

    if (referencia) {

      referencia.value =
        data.referencia ||
        "";

    }


    if (nombre) {

      nombre.value =
        data.producto ||
        "";

    }


    if (unidad) {

      unidad.value =
        data.unidad ||
        "";

    }


    const btnGuardar =
      document.getElementById(
        "btnGuardarProducto"
      );


    const btnCancelar =
      document.getElementById(
        "btnCancelarProductoEdicion"
      );


    if (btnGuardar) {

      btnGuardar.textContent =
        "Actualizar producto";

    }


    if (btnCancelar) {

      btnCancelar.style.display =
        "inline-flex";

    }


    if (categoria) {

      categoria.disabled =
        true;

    }


  } catch (error) {

    console.error(
      "Error cargando producto para editar:",
      error
    );


    alert(
      "Error al conectar con el servidor"
    );

  }

}

/*async function cancelarEdicionProducto() {
  productoEditandoId = null;

  const form = document.getElementById("formProductoGeneral");
  const categoria = document.getElementById("prodCategoria");
  const codigo = document.getElementById("prodCodigo");
  const btnGuardar = document.getElementById("btnGuardarProducto");
  const btnCancelar = document.getElementById("btnCancelarProductoEdicion");

  console.log("cancelarEdicionProducto -> form:", form);
  console.log("cancelarEdicionProducto -> categoria:", categoria);
  console.log("cancelarEdicionProducto -> codigo:", codigo);

  if (form) form.reset();
  if (codigo) codigo.value = "";
  if (categoria) categoria.disabled = false;

  if (btnGuardar) btnGuardar.textContent = "Guardar producto";
  if (btnCancelar) btnCancelar.style.display = "none";

  if (categoria) {
    await poblarSelectCategoriasProducto("prodCategoria");
  }
}*/

async function cancelarEdicionProducto() {
  productoEditandoId = null;

  const form = document.getElementById("formProductoGeneral");
  const categoria = document.getElementById("prodCategoria");
  const codigo = document.getElementById("prodCodigo");
  const btnGuardar = document.getElementById("btnGuardarProducto");
  const btnCancelar = document.getElementById("btnCancelarProductoEdicion");

  if (form) form.reset();
  if (codigo) codigo.value = "";
  if (categoria) categoria.disabled = false;

  if (btnGuardar) btnGuardar.textContent = "Guardar producto";
  if (btnCancelar) btnCancelar.style.display = "none";

  await poblarSelectCategoriasProducto("prodCategoria");
}

function limpiarFormularioProductoGeneral() {
  const form = document.getElementById("formProductoGeneral");
  if (form) form.reset();

  editProductoIndex = -1;

  const btnGuardar = document.getElementById("btnGuardarProductoGeneral");
  const btnCancelar = document.getElementById("btnCancelarProductoGeneral");
  const codigo = document.getElementById("prodCodigo");

  if (btnGuardar) btnGuardar.textContent = "Guardar producto";
  if (btnCancelar) btnCancelar.style.display = "none";
  if (codigo) codigo.value = "";
}

function cargarProductoGeneralEnFormulario(index, filtroActual = "") {
  const item = productos[index];
  if (!item) return;

  document.getElementById("prodCategoria").value = item.categoria || "";
  document.getElementById("prodCodigo").value = item.codigo || "";
  document.getElementById("prodNombre").value = item.nombre || "";
  document.getElementById("prodUnidad").value = item.unidad || "";
  document.getElementById("prodObservacion").value = item.observacion || "";

  editProductoIndex = index;

  document.getElementById("btnGuardarProductoGeneral").textContent = "Actualizar producto";
  document.getElementById("btnCancelarProductoGeneral").style.display = "inline-flex";

  renderTablaProductosGeneral(filtroActual);
}

function eliminarProductoGeneral(index, filtroActual = "") {
  if (!confirm("¿Desea eliminar este producto?")) return;
  productos.splice(index, 1);
  if (editProductoIndex === index) limpiarFormularioProductoGeneral();
  renderTablaProductosGeneral(filtroActual);
}

function obtenerPrefijoCategoria(categoria) {
  const mapa = {
    "MEDICAMENTOS": "MED",
    "DESCARTABLES": "DES",
    "INSUMOS CASA COMERCIAL": "INS",
    "LIMPIEZA": "LIM"
  };

  return mapa[categoria] || "PRD";
}

function generarCodigoProductoPorCategoria(categoria) {
  if (!categoria || !contadorCategorias[categoria]) return "";

  const prefijo = obtenerPrefijoCategoria(categoria);
  return `${prefijo}-${contadorCategorias[categoria]}`;
}

function asegurarContadoresDesdeProductos() {
  productos.forEach(prod => {
    const categoria = prod.categoria;
    if (!categoria || !contadorCategorias[categoria]) return;

    const match = String(prod.codigo || "").match(/-(\d+)$/);
    if (!match) return;

    const numero = Number(match[1]);
    if (numero >= contadorCategorias[categoria]) {
      contadorCategorias[categoria] = numero + 1;
    }
  });
}

async function cargarCodigoAutomaticoProducto() {
  const categoria = document.getElementById("prodCategoria")?.value;
  const codigoInput = document.getElementById("prodCodigo");

  console.log("cargarCodigoAutomaticoProducto -> categoria:", categoria);

  if (!categoria || !codigoInput) {
    if (codigoInput) codigoInput.value = "";
    return;
  }

  try {
    const res = await fetch(`/api/productos/siguiente-codigo?categoria=${encodeURIComponent(categoria)}`);
    const data = await res.json().catch(() => ({}));

    console.log("Respuesta siguiente código:", data);

    if (!res.ok) {
      codigoInput.value = "";
      alert(data.error || "No se pudo obtener el código automático");
      return;
    }

    codigoInput.value = data.codigo || "";
  } catch (error) {
    console.error("Error obteniendo código automático:", error);
    codigoInput.value = "";
  }
}

/*function inicializarModuloProductosGeneral() {
  const form = document.getElementById("formProductoGeneral");
  const inputBuscar = document.getElementById("buscarProductoGeneral");
  const btnCancelar = document.getElementById("btnCancelarProductoGeneral");
  const selectCategoria = document.getElementById("prodCategoria");
  const inputCodigo = document.getElementById("prodCodigo");

  if (!form || !selectCategoria || !inputCodigo) return;

  asegurarContadoresDesdeProductos();
  renderTablaProductosGeneral();

  selectCategoria.addEventListener("change", () => {
    if (editProductoIndex >= 0) return;
    inputCodigo.value = generarCodigoProductoPorCategoria(selectCategoria.value);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const categoria = document.getElementById("prodCategoria").value;
    const codigo = document.getElementById("prodCodigo").value.trim();
    const nombre = document.getElementById("prodNombre").value.trim();
    const unidad = document.getElementById("prodUnidad").value.trim();
    const observacion = document.getElementById("prodObservacion").value.trim();

    const nuevoProducto = {
      categoria,
      codigo,
      nombre,
      unidad,
      observacion
    };

    if (!categoria || !codigo || !nombre || !unidad) {
      alert("Categoría, código, producto y unidad son obligatorios");
      return;
    }

    if (editProductoIndex >= 0) {
      const productoAnterior = productos[editProductoIndex];

      const codigoAnterior = productoAnterior.codigo;
      const nombreAnterior = productoAnterior.nombre;

      productos[editProductoIndex] = nuevoProducto;

      inventario.forEach(item => {
        if (item.codigo === codigoAnterior && item.producto === nombreAnterior) {
          item.codigo = nuevoProducto.codigo;
          item.producto = nuevoProducto.nombre;
          item.categoria = nuevoProducto.categoria;
          item.unidad = nuevoProducto.unidad;
        }
      });

      detalleEntradas.forEach(item => {
        if (item.codigo === codigoAnterior && item.producto === nombreAnterior) {
          item.codigo = nuevoProducto.codigo;
          item.producto = nuevoProducto.nombre;
          item.categoria = nuevoProducto.categoria;
        }
      });

      salidasInventario.forEach(item => {
        if (item.codigo === codigoAnterior && item.producto === nombreAnterior) {
          item.codigo = nuevoProducto.codigo;
          item.producto = nuevoProducto.nombre;
        }
      });

      trasladosInventario.forEach(t => {
        (t.detalle || []).forEach(item => {
          if (item.codigo === codigoAnterior && item.producto === nombreAnterior) {
            item.codigo = nuevoProducto.codigo;
            item.producto = nuevoProducto.nombre;
          }
        });
      });
    } else {
      productos.push(nuevoProducto);
      if (contadorCategorias[categoria]) {
        contadorCategorias[categoria]++;
      }
    }

    limpiarFormularioProductoGeneral();
    renderTablaProductosGeneral(inputBuscar.value);
  });

  inputBuscar.addEventListener("input", () => {
    renderTablaProductosGeneral(inputBuscar.value);
  });

  btnCancelar.addEventListener("click", () => {
    limpiarFormularioProductoGeneral();
  });
}*/

/*function inicializarModuloProductosGeneral() {
  const form = document.getElementById("formProductoGeneral");
  const buscar = document.getElementById("buscarInventario");

  if (form) {
    form.addEventListener("submit", guardarProductoSistema);
  }

  renderTablaProductosGeneral();

  if (buscar) {
    buscar.addEventListener("input", () => {
      renderTablaProductosGeneral(buscar.value);
    });
  }
}*/


/*async function inicializarModuloProductosGeneral() {
  const form = document.getElementById("formProductoGeneral");
  const buscar = document.getElementById("buscarInventario");
  const categoria = document.getElementById("prodCategoria");
  const btnCancelar = document.getElementById("btnCancelarProductoEdicion");

  if (!form) return;

  productoEditandoId = null;

  await poblarSelectCategoriasProducto("prodCategoria");
  await renderTablaProductosGeneral();

  if (categoria) {
    categoria.onchange = async () => {
      if (!productoEditandoId) {
        await cargarCodigoAutomaticoProducto();
      }
    };
  }

  form.onsubmit = guardarProductoSistema;

  if (btnCancelar) {
    btnCancelar.onclick = async () => {
      await cancelarEdicionProducto();
    };
  }

  if (buscar) {
    buscar.oninput = () => {
      renderTablaProductosGeneral(buscar.value);
    };
  }
}*/

async function inicializarModuloProductosGeneral() {
  const form = document.getElementById("formProductoGeneral");
  const buscar = document.getElementById("buscarInventario");
  const categoria = document.getElementById("prodCategoria");
  const btnCancelar = document.getElementById("btnCancelarProductoEdicion");

  if (!form) return;

  productoEditandoId = null;

  await poblarSelectCategoriasProducto("prodCategoria");
  paginaProductosGeneral = 1;

await renderTablaProductosGeneral(
  "",
  1
);

  if (categoria) {
    categoria.onchange = async () => {
      if (!productoEditandoId) {
        await cargarCodigoAutomaticoProducto();
      }
    };
  }

  form.onsubmit = guardarProductoSistema;

  if (btnCancelar) {
    btnCancelar.onclick = cancelarEdicionProducto;
  }

  if (buscar) {
  buscar.oninput = () => {
    paginaProductosGeneral = 1;

    renderTablaProductosGeneral(
      buscar.value,
      1
    );
  };
}
}

/* =========================
   SALIDA DE INVENTARIO
========================= */

function obtenerLotesDisponiblesProducto(bodega, codigo, producto) {
  const movimientos = detalle_Entradas.filter(item =>
    String(item.bodega || "").trim() === String(bodega || "").trim() &&
    String(item.codigo || "").trim() === String(codigo || "").trim() &&
    String(item.producto || "").trim() === String(producto || "").trim() &&
    String(item.lote || "").trim() !== ""
  );

  const mapa = new Map();

  movimientos.forEach(item => {
    const key = [
      String(item.producto_id || ""),
      String(item.bodega || "").trim(),
      String(item.codigoProveedor || "").trim().toLowerCase(),
      String(item.lote || "").trim().toLowerCase()
    ].join("||");

    const actual = mapa.get(key);

    if (!actual || Number(item.id || 0) > Number(actual.id || 0)) {
      mapa.set(key, item);
    }
  });

  return Array.from(mapa.values()).filter(item => Number(item.stockLote || 0) > 0);
}

function poblarLotesSalida(bodega, codigo, producto) {
  const bloqueLote = document.getElementById("bloqueLoteSalida");
  const selectLote = document.getElementById("salidaLoteSelect");

  if (!bloqueLote || !selectLote) return;

  const lotes = obtenerLotesDisponiblesProducto(bodega, codigo, producto);

  if (!lotes.length) {
    bloqueLote.style.display = "none";
    selectLote.innerHTML = "";
    return;
  }

  bloqueLote.style.display = "block";
  selectLote.innerHTML = `
    <option value="">Seleccione un lote</option>
    ${lotes.map(loteItem => `
      <option value="${loteItem.id}">
        Lote: ${loteItem.lote}
        | Proveedor: ${loteItem.codigoProveedor || "N/A"}
        | Vence: ${loteItem.vencimiento ? String(loteItem.vencimiento).slice(0, 10) : "N/A"}
        | Stock lote: ${loteItem.stockLote || 0}
      </option>
    `).join("")}
  `;
}

async function cargarSalidasDesdeSQL() {
  try {
    const res = await fetch("/api/inventario/salidas");
    const data = await res.json().catch(() => ([]));

    return (Array.isArray(data) ? data : []).map(item => ({
      ...item,
      fecha: item.fecha || (item.fecha_creacion ? String(item.fecha_creacion).slice(0, 19).replace("T", " ") : ""),
      lote: item.lote || "",
      motivo: item.motivo || "",
      responsable: item.responsable || ""
    }));
  } catch (error) {
    console.error("Error cargando salidas desde SQL:", error);
    return [];
  }
}

function renderResultadosProductoSalida(texto = "") {
  const contenedor = document.getElementById("resultadosProductoSalida");
  const bodegaSelect = document.getElementById("salidaBodega");

  if (!contenedor || !bodegaSelect) return;

  const filtro = texto.toLowerCase().trim();
  const bodegaSeleccionada = bodegaSelect.value;

  if (!bodegaSeleccionada) {
    contenedor.innerHTML = `
      <div class="resultado-item empty">Seleccione una bodega primero</div>
    `;
    contenedor.style.display = "block";
    return;
  }

  if (!filtro) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
    return;
  }

  const resultados = inventario.filter(item =>
    String(item.bodega || "") === String(bodegaSeleccionada) &&
    Number(item.stock || 0) > 0 &&
    (
      String(item.codigo || "").toLowerCase().includes(filtro) ||
      String(item.producto || "").toLowerCase().includes(filtro) ||
      String(item.categoria || "").toLowerCase().includes(filtro)
    )
  ).slice(0, 20);

  if (!resultados.length) {
    contenedor.innerHTML = `
      <div class="resultado-item empty">No se encontraron productos en esta bodega</div>
    `;
    contenedor.style.display = "block";
    return;
  }

  contenedor.innerHTML = resultados.map(item => `
    <div class="resultado-item" data-id="${item.id}">
      <div class="resultado-title">${item.codigo} - ${item.producto}</div>
      <div class="resultado-sub">
        Bodega: ${item.bodega} | Categoría: ${item.categoria || "Sin categoría"} | Stock: ${item.stock}
      </div>
    </div>
  `).join("");

  contenedor.style.display = "block";

  contenedor.querySelectorAll(".resultado-item[data-id]").forEach(item => {
    item.addEventListener("click", () => {
      seleccionarProductoSalida(Number(item.dataset.id));
    });
  });
}

function seleccionarProductoSalida(id) {
  const item = inventario.find(x => Number(x.id) === Number(id));
  if (!item) return;

  productoSalidaSeleccionadoIndex = inventario.findIndex(x => Number(x.id) === Number(id));

  document.getElementById("buscarProductoSalida").value = `${item.codigo} - ${item.producto}`;
  document.getElementById("salidaCodigo").value = item.codigo;
  document.getElementById("salidaProductoNombre").value = item.producto;
  document.getElementById("salidaStockActual").value = item.stock;

  poblarLotesSalida(item.bodega, item.codigo, item.producto);

  const contenedor = document.getElementById("resultadosProductoSalida");
  if (contenedor) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
  }
}

function limpiarSeleccionProductoSalida() {
  productoSalidaSeleccionadoIndex = -1;

  const ids = [
    "salidaCodigo",
    "salidaProductoNombre",
    "salidaStockActual"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const bloqueLote = document.getElementById("bloqueLoteSalida");
  const selectLote = document.getElementById("salidaLoteSelect");

  if (bloqueLote) bloqueLote.style.display = "none";
  if (selectLote) selectLote.innerHTML = "";
}

async function renderTablaSalidas(filtro = "") {
  const tbody = document.getElementById("tablaSalidasBody");
  if (!tbody) return;

  try {
    const salidas = await cargarSalidasDesdeSQL();
    const texto = filtro.toLowerCase().trim();

    const lista = salidas.filter(s =>
      String(s.fecha || "").toLowerCase().includes(texto) ||
      String(s.bodega || "").toLowerCase().includes(texto) ||
      String(s.codigo || "").toLowerCase().includes(texto) ||
      String(s.producto || "").toLowerCase().includes(texto) ||
      String(s.lote || "").toLowerCase().includes(texto) ||
      String(s.motivo || "").toLowerCase().includes(texto) ||
      String(s.responsable || "").toLowerCase().includes(texto)
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-row">No hay salidas registradas</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(s => `
      <tr>
        <td>${s.fecha || ""}</td>
        <td>${s.bodega || ""}</td>
        <td>${s.codigo || ""}</td>
        <td>${s.producto || ""}</td>
        <td>${s.lote || ""}</td>
        <td>${s.cantidad || 0}</td>
        <td>${s.motivo || ""}</td>
        <td>${s.responsable || ""}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error renderizando salidas:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">Error al cargar salidas</td>
      </tr>
    `;
  }
}

async function inicializarModuloSalidaInventario() {
  const form = document.getElementById("formSalidaInventario");
  const inputBuscarProducto = document.getElementById("buscarProductoSalida");
  const inputBuscarSalida = document.getElementById("buscarSalida");
  const selectBodega = document.getElementById("salidaBodega");
  const selectLote = document.getElementById("salidaLoteSelect");

  if (!form || !inputBuscarProducto || !selectBodega) return;

  await poblarSelectBodegas("salidaBodega");
  inventario = await cargarInventarioDesdeSQL();
  detalle_Entradas = await cargarDetalleEntradasDesdeSQL();
  await renderTablaSalidas();
  autocompletarResponsable("salidaResponsable");

  selectBodega.addEventListener("change", () => {
    inputBuscarProducto.value = "";
    limpiarSeleccionProductoSalida();

    const resultados = document.getElementById("resultadosProductoSalida");
    if (resultados) {
      resultados.innerHTML = "";
      resultados.style.display = "none";
    }
  });

  inputBuscarProducto.addEventListener("input", () => {
    limpiarSeleccionProductoSalida();
    renderResultadosProductoSalida(inputBuscarProducto.value);
  });

  inputBuscarProducto.addEventListener("focus", () => {
    renderResultadosProductoSalida(inputBuscarProducto.value);
  });

  document.addEventListener("click", function cerrarResultados(e) {
    const cajaBusqueda = document.querySelector(".product-search-box");
    const resultados = document.getElementById("resultadosProductoSalida");

    if (!cajaBusqueda || !resultados) return;

    if (!cajaBusqueda.contains(e.target)) {
      resultados.style.display = "none";
    }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();

    const bodega = selectBodega.value;
    const cantidad = Number(document.getElementById("salidaCantidad").value || 0);
    const motivo = document.getElementById("salidaMotivo").value.trim();
    const responsable = document.getElementById("salidaResponsable").value.trim();

    if (!bodega) {
      alert("Seleccione una bodega");
      return;
    }

    if (productoSalidaSeleccionadoIndex < 0) {
      alert("Seleccione un producto desde la búsqueda");
      return;
    }

    const item = inventario[productoSalidaSeleccionadoIndex];
    if (!item) {
      alert("Producto no válido");
      return;
    }

    if (String(item.bodega) !== String(bodega)) {
      alert("El producto seleccionado no pertenece a la bodega elegida");
      return;
    }

    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    const lotesDisponibles = obtenerLotesDisponiblesProducto(item.bodega, item.codigo, item.producto);
    const tieneLotes = lotesDisponibles.length > 0;

    let loteSeleccionado = null;

    if (tieneLotes) {
      if (!selectLote || !selectLote.value) {
        alert("Seleccione un lote");
        return;
      }

      loteSeleccionado = detalle_Entradas.find(x => Number(x.id) === Number(selectLote.value));

      if (!loteSeleccionado) {
        alert("Lote no válido");
        return;
      }

      if (cantidad > Number(loteSeleccionado.stockLote || 0)) {
        alert("La cantidad supera el stock disponible del lote");
        return;
      }
    }

    if (cantidad > Number(item.stock || 0)) {
      alert("La cantidad supera el stock disponible");
      return;
    }

    const payload = {
      bodega,
      inventario_id: Number(item.id),
      detalleLoteId: loteSeleccionado ? Number(loteSeleccionado.id) : null,
      cantidad,
      motivo,
      responsable
    };

    try {
      const res = await fetch("/api/inventario/salida", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al registrar salida");
        return;
      }

      form.reset();
      await poblarSelectBodegas("salidaBodega");
      autocompletarResponsable("salidaResponsable");
      limpiarSeleccionProductoSalida();

      inventario = await cargarInventarioDesdeSQL();
      detalle_Entradas = await cargarDetalleEntradasDesdeSQL();
      await renderTablaSalidas(inputBuscarSalida ? inputBuscarSalida.value : "");

      alert("Salida registrada correctamente");
    } catch (error) {
      console.error("Error registrando salida:", error);
      alert("Error al conectar con el servidor");
    }
  };

  if (inputBuscarSalida) {
    inputBuscarSalida.oninput = () => {
      renderTablaSalidas(inputBuscarSalida.value);
    };
  }
}




/* =========================
       RECLUTADORES
========================= */
async function renderTablaReclutadores(filtro = "") {
  const tbody = document.getElementById("tablaReclutadoresBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/reclutadores");
    const reclutadores = await res.json();

    const texto = filtro.toLowerCase().trim();

    const lista = reclutadores.filter(r => {
      const nombreCompleto = [
        r.apellido1,
        r.apellido2,
        r.nombre1,
        r.nombre2
      ].filter(Boolean).join(" ");

      return (
        nombreCompleto.toLowerCase().includes(texto) ||
        String(r.cedula || "").toLowerCase().includes(texto) ||
        String(r.estado || "").toLowerCase().includes(texto)
      );
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-row">No hay reclutadores registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(r => {
      const nombreCompleto = [
        r.apellido1,
        r.apellido2,
        r.nombre1,
        r.nombre2
      ].filter(Boolean).join(" ");

      return `
        <tr>
          <td>${nombreCompleto}</td>
          <td>${r.cedula}</td>
          <td>
            <button class="btn-table edit" onclick="toggleReclutadorEstado(${r.id})">
              ${r.estado === "ACTIVO" ? "Desactivar" : "Activar"}
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error("Error listando reclutadores:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-row">Error al cargar reclutadores</td>
      </tr>
    `;
  }
}

function inicializarModuloReclutadores() {
  const form = document.getElementById("formReclutador");
  const buscar = document.getElementById("buscarReclutador");

  if (!form || !buscar) return;

  renderTablaReclutadores();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevo = {
      primerApellido: document.getElementById("recApellido1").value.trim(),
      segundoApellido: document.getElementById("recApellido2").value.trim(),
      primerNombre: document.getElementById("recNombre1").value.trim(),
      segundoNombre: document.getElementById("recNombre2").value.trim(),
      cedula: document.getElementById("recCedula").value.trim()
    };

    if (!validarCedula10Digitos(nuevo.cedula)) {
      alert("La cédula del reclutador debe tener 10 dígitos");
      return;
    }

    try {
      const res = await fetch("/api/reclutadores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(nuevo)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al guardar reclutador");
        return;
      }

      form.reset();
      renderTablaReclutadores(buscar.value);
      alert("Reclutador guardado correctamente");
    } catch (error) {
      console.error("Error guardando reclutador:", error);
      alert("Error al conectar con el servidor");
    }
  });

  buscar.addEventListener("input", () => {
    renderTablaReclutadores(buscar.value);
  });
}

async function toggleReclutadorEstado(id) {
  try {
    const res = await fetch(`/api/reclutadores/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado");
      return;
    }

    const buscar = document.getElementById("buscarReclutador");
    renderTablaReclutadores(buscar ? buscar.value : "");
  } catch (error) {
    console.error("Error cambiando estado reclutador:", error);
    alert("Error al conectar con el servidor");
  }
}

/* =========================
   ADMISION
========================= */
function obtenerNombreCompletoPaciente(p) {
  return [
    p.pacApellido1,
    p.pacApellido2,
    p.pacNombre1,
    p.pacNombre2
  ].filter(Boolean).join(" ");
}

async function renderTablaPacientesAdmision(filtro = "") {
  const tbody = document.getElementById("tablaPacientesAdmisionBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/pacientes/activos");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Error backend pacientes:", data);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">Error al cargar pacientes</td>
        </tr>
      `;
      return;
    }

    const pacientes = Array.isArray(data) ? data : [];
    const texto = filtro.toLowerCase().trim();

    const lista = pacientes.filter(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      const reclutador = [
        p.rec_apellido1,
        p.rec_apellido2,
        p.rec_nombre1,
        p.rec_nombre2
      ].filter(Boolean).join(" ");

      return (
        String(p.archivo || "").toLowerCase().includes(texto) ||
        nombrePaciente.toLowerCase().includes(texto) ||
        String(p.cedula_paciente || "").toLowerCase().includes(texto) ||
        String(p.fecha_procedimiento || "").toLowerCase().includes(texto) ||
        reclutador.toLowerCase().includes(texto)
      );
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">No hay pacientes registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      const reclutador = [
        p.rec_apellido1,
        p.rec_apellido2,
        p.rec_nombre1,
        p.rec_nombre2
      ].filter(Boolean).join(" ");

      return `
        <tr>
          <td>${p.archivo}</td>
          <td>${nombrePaciente}</td>
          <td>${p.cedula_paciente}</td>
          <td>${p.fecha_procedimiento ? String(p.fecha_procedimiento).slice(0, 10) : ""}</td>
          <td>${reclutador}</td>
          <td>
            <div class="table-actions">
              <button class="btn-table edit" onclick="verPaciente(${p.id})">Ver</button>
              <button class="btn-table edit" onclick="editarPaciente(${p.id})">Editar</button>
              <button class="btn-table delete" onclick="quitarPaciente(${p.id})">Quitar</button>
              <button class="btn-table edit" onclick="datosComplementariosPaciente(${p.id})">Datos complementarios</button>
              <button class="btn-table edit" onclick="mostrarArchivosPaciente(${p.id})">Ver archivos</button> 
            </div>
          </td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error("Error listando pacientes:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Error al cargar pacientes</td>
      </tr>
    `;
  }
}

async function verPaciente(id) {
  try {
    const res = await fetch(`/api/pacientes/${id}`);
    const p = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(p.error || "Error al obtener paciente");
      return;
    }

    const nombrePaciente = [
      p.pac_apellido1,
      p.pac_apellido2,
      p.pac_nombre1,
      p.pac_nombre2
    ].filter(Boolean).join(" ");

    const nombreFamiliar = [
      p.fam_apellido1,
      p.fam_apellido2,
      p.fam_nombre1,
      p.fam_nombre2
    ].filter(Boolean).join(" ");

    const reclutador = [
      p.rec_apellido1,
      p.rec_apellido2,
      p.rec_nombre1,
      p.rec_nombre2
    ].filter(Boolean).join(" ");

    panelBox.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <h2>Ficha del paciente</h2>
        </div>

        <div style="line-height:1.9;">
          <p><strong># Archivo:</strong> ${p.archivo || ""}</p>
          <p><strong>Paciente:</strong> ${nombrePaciente}</p>
          <p><strong>Cédula:</strong> ${p.cedula_paciente || ""}</p>
          <p><strong>Fecha nacimiento:</strong> ${p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0,10) : ""}</p>
          <p><strong>Edad:</strong> ${p.edad || ""}</p>
          <p><strong>Sexo:</strong> ${p.sexo || ""}</p>
          <p><strong>Estado civil:</strong> ${p.estado_civil || ""}</p>
          <p><strong>Correo:</strong> ${p.correo || ""}</p>
          <p><strong>Teléfono fijo:</strong> ${p.telefono_fijo || ""}</p>
          <p><strong>Teléfono celular:</strong> ${p.telefono_celular || ""}</p>
          <p><strong>Reclutador:</strong> ${reclutador}</p>
          <p><strong>Familiar:</strong> ${nombreFamiliar}</p>
          <p><strong>Cédula familiar:</strong> ${p.cedula_familiar || ""}</p>
          <p><strong>Parentesco:</strong> ${p.parentesco_familiar || ""}</p>
          <p><strong>Dirección familiar:</strong> ${p.direccion_familiar || ""}</p>
          <p><strong>Teléfono familiar:</strong> ${p.telefono_familiar || ""}</p>
          <p><strong>Fecha procedimiento:</strong> ${p.fecha_procedimiento ? String(p.fecha_procedimiento).slice(0,10) : ""}</p>

          <hr style="margin:16px 0; border-color: rgba(255,255,255,0.10);">

          <p><strong>Dispensario:</strong> ${p.dispensario || ""}</p>
          <p><strong>Organización:</strong> ${p.organizacion || ""}</p>
          <p><strong>CVV:</strong> ${p.cvv || ""}</p>
          <p><strong>T/procedimiento:</strong> ${p.t_procedimiento || ""}</p>
          <p><strong># STENT UTILIZADO:</strong> ${p.stent_utilizado || ""}</p>
          <p><strong>Mes:</strong> ${p.mes || ""}</p>
          <p><strong>Año:</strong> ${p.anio || ""}</p>
          <p><strong>Cirujano:</strong> ${p.cirujano || ""}</p>
          <p><strong>Anestesiologo:</strong> ${p.anestesiologo || ""}</p>
          <p><strong>Radiologo:</strong> ${p.radiologo || ""}</p>
          <p><strong>Habitación:</strong> ${p.habitacion || ""}</p>
          <p><strong>Alta:</strong> ${p.alta ? String(p.alta).slice(0,10) : ""}</p>
          <p><strong>Uso de sala:</strong> ${p.uso_sala ? "Sí" : "No"}</p>
          <p><strong>Laboratorios:</strong> ${p.laboratorios ? "Sí" : "No"}</p>
          <p><strong>Hospitalización:</strong> ${p.hospitalizacion ? "Sí" : "No"}</p>
          <p><strong>Alimentación:</strong> ${p.alimentacion ? "Sí" : "No"}</p>
          <p><strong>Cuidados:</strong> ${p.cuidados ? "Sí" : "No"}</p>
        </div>

        <div class="form-actions" style="margin-top:20px;">
          <button class="btn-secondary" onclick="cambiarContenido('pacientes-lista')">Volver</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error viendo paciente:", error);
    alert("Error al conectar con el servidor");
  }
}

async function editarPaciente(id) {
  try {
    const res = await fetch(`/api/pacientes/${id}`);
    const p = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(p.error || "Error al obtener paciente");
      return;
    }

    pacienteEditandoId = id;

    cambiarContenido("pacientes-admision");

    setTimeout(async () => {
      document.getElementById("admArchivo").value = p.archivo || "";
      document.getElementById("admCedulaPaciente").value = p.cedula_paciente || "";
      document.getElementById("admEstadoCivil").value = p.estado_civil || "";
      document.getElementById("admSexo").value = p.sexo || "";
      document.getElementById("admTelefonoFijo").value = p.telefono_fijo || "";
      document.getElementById("admTelefonoCelular").value = p.telefono_celular || "";
      document.getElementById("admCorreo").value = p.correo || "";

      document.getElementById("admPacApellido1").value = p.pac_apellido1 || "";
      document.getElementById("admPacApellido2").value = p.pac_apellido2 || "";
      document.getElementById("admPacNombre1").value = p.pac_nombre1 || "";
      document.getElementById("admPacNombre2").value = p.pac_nombre2 || "";

      document.getElementById("admFamApellido1").value = p.fam_apellido1 || "";
      document.getElementById("admFamApellido2").value = p.fam_apellido2 || "";
      document.getElementById("admFamNombre1").value = p.fam_nombre1 || "";
      document.getElementById("admFamNombre2").value = p.fam_nombre2 || "";

      document.getElementById("admCedulaFamiliar").value = p.cedula_familiar || "";
      document.getElementById("admFechaNacimiento").value = p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : "";
      document.getElementById("admEdad").value = p.edad || "";
      document.getElementById("admLugarNacimiento").value = p.lugar_nacimiento || "";
      document.getElementById("admFechaProcedimiento").value = p.fecha_procedimiento ? String(p.fecha_procedimiento).slice(0, 10) : "";

      await poblarSelectReclutadores("admReclutador");
      document.getElementById("admReclutador").value = p.reclutador_id || "";

      document.getElementById("admProvincia").value = p.provincia || "";
      document.getElementById("admCanton").value = p.canton || "";
      document.getElementById("admParroquia").value = p.parroquia || "";
      document.getElementById("admBarrio").value = p.barrio || "";
      document.getElementById("admCallePrincipal").value = p.calle_principal || "";
      document.getElementById("admCalleSecundaria").value = p.calle_secundaria || "";
      document.getElementById("admReferencia").value = p.referencia || "";
      document.getElementById("admOcupacion").value = p.ocupacion || "";
      document.getElementById("admParentescoFamiliar").value = p.parentesco_familiar || "";
      document.getElementById("admDireccionFamiliar").value = p.direccion_familiar || "";
      document.getElementById("admTelefonoFamiliar").value = p.telefono_familiar || "";
      document.getElementById("admTipoSeguro").value = p.tipo_seguro || "";
      document.getElementById("admTipoAfiliado").value = p.tipo_afiliado || "";

      const btnGuardar = document.getElementById("btnGuardarAdmision");
      const btnCancelar = document.getElementById("btnCancelarAdmision");

      if (btnGuardar) btnGuardar.textContent = "Actualizar";
      if (btnCancelar) btnCancelar.style.display = "inline-flex";
    }, 250);
  } catch (error) {
    console.error("Error cargando paciente para editar:", error);
    alert("Error al conectar con el servidor");
  }
}

async function quitarPaciente(id) {
  const motivo = prompt("Ingrese el motivo para mover a pacientes no atendidos:");
  if (motivo === null) return;

  try {
    const res = await fetch(`/api/pacientes/no-atendido/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ motivo })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al quitar paciente");
      return;
    }

    alert("Paciente movido a no atendidos");
    renderTablaPacientesAdmision();
  } catch (error) {
    console.error("Error quitando paciente:", error);
    alert("Error al conectar con el servidor");
  }
}

async function mostrarArchivosPaciente(pacienteId) {
  try {
    const paciente = await obtenerPacientePorId(pacienteId);

    panelBox.innerHTML = `
      <div class="inventario-wrap">
        <div class="form-card">
          <h2>ARCHIVOS DEL PACIENTE</h2>

          <div style="margin-bottom:18px; color: rgba(255,255,255,0.78);">
            <strong>Paciente:</strong> ${
              paciente
                ? [
                    paciente.pacApellido1 || paciente.pac_apellido1,
                    paciente.pacApellido2 || paciente.pac_apellido2,
                    paciente.pacNombre1 || paciente.pac_nombre1,
                    paciente.pacNombre2 || paciente.pac_nombre2
                  ].filter(Boolean).join(" ")
                : ""
            }<br>
            <strong># Archivo:</strong> ${paciente?.archivo || ""}
          </div>

          <div class="patient-form">
            <div id="dropZonaPacienteArchivo" style="
              border: 2px dashed rgba(255,255,255,0.25);
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              margin-bottom: 16px;
              cursor: pointer;
              color: rgba(255,255,255,0.82);
            ">
              Arrastre un archivo aquí o haga clic para seleccionar
              <input type="file" id="inputArchivoPaciente" style="display:none;" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt">
            </div>

            <div class="form-actions">
              <button type="button" class="btn-primary" id="btnSubirArchivoPaciente">Subir archivo</button>
              <button type="button" class="btn-secondary" id="btnVolverPacientesArchivos">Volver</button>
            </div>
          </div>

          <div class="table-card" style="margin-top:18px;">
            <div class="table-header">
              <h2>Listado de archivos</h2>
            </div>

            <div class="table-responsive">
  <table class="patient-table">
    <thead>
      <tr>
        <th>Archivo</th>
        <th>Fecha subida</th>
        <th>Subido por</th>
        <th>Vista previa</th>
        <th>Descargar</th>
        <th>Eliminar</th>
      </tr>
    </thead>
    <tbody id="tablaArchivosPacienteBody">
      <tr>
        <td colspan="6" class="empty-row">No hay archivos</td>
      </tr>
    </tbody>
  </table>
</div>
          </div>
        </div>
      </div>
    `;

    const inputFile = document.getElementById("inputArchivoPaciente");
    const dropZona = document.getElementById("dropZonaPacienteArchivo");
    const btnSubir = document.getElementById("btnSubirArchivoPaciente");
    const btnVolver = document.getElementById("btnVolverPacientesArchivos");

    let archivoSeleccionado = null;


    async function cargarListaArchivos() {
  const tbody = document.getElementById("tablaArchivosPacienteBody");
  if (!tbody) return;

  try {
    const res = await fetch(`/api/pacientes/${pacienteId}/archivos`);
    const lista = await res.json().catch(() => ([]));

    if (!res.ok || !Array.isArray(lista) || !lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">No hay archivos</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(a => {
      const ext = String(a.extension || "").toLowerCase();
      const esImagen = ["png", "jpg", "jpeg"].includes(ext);
      const esPdf = ext === "pdf";

      let vistaPrevia = `<span style="opacity:.65;">No disponible</span>`;

      if (esImagen || esPdf) {
        vistaPrevia = `
          <a class="btn-table edit" href="${a.ruta_archivo}" target="_blank">
            Ver
          </a>
        `;
      }

      return `
        <tr>
          <td>${a.nombre_original || ""}</td>
          <td>${a.fecha_subida ? String(a.fecha_subida).slice(0, 10) : ""}</td>
          <td>${a.subido_por || ""}</td>
          <td>${vistaPrevia}</td>
          <td>
            <a class="btn-table edit" href="/api/pacientes/archivos/${a.id}/download" target="_blank">
              Descargar
            </a>
          </td>
          <td>
            <button class="btn-table delete btn-eliminar-archivo-paciente" data-id="${a.id}">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll(".btn-eliminar-archivo-paciente").forEach(btn => {
      btn.addEventListener("click", async () => {
        const ok = confirm("¿Desea eliminar este archivo?");
        if (!ok) return;

        try {
          const resEliminar = await fetch(`/api/pacientes/archivos/${btn.dataset.id}`, {
            method: "DELETE"
          });

          const dataEliminar = await resEliminar.json().catch(() => ({}));

          if (!resEliminar.ok) {
            alert(dataEliminar.error || "Error al eliminar archivo");
            return;
          }

          await cargarListaArchivos();
          alert("Archivo eliminado correctamente");
        } catch (error) {
          console.error("Error eliminando archivo:", error);
          alert("Error al conectar con el servidor");
        }
      });
    });
  } catch (error) {
    console.error("Error listando archivos paciente:", error);
  }
}

    function actualizarTextoDrop() {
      dropZona.innerHTML = `
        ${archivoSeleccionado ? `Archivo seleccionado: <strong>${archivoSeleccionado.name}</strong>` : "Arrastre un archivo aquí o haga clic para seleccionar"}
        <input type="file" id="inputArchivoPaciente" style="display:none;" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt">
      `;

      const nuevoInput = document.getElementById("inputArchivoPaciente");
      if (nuevoInput) {
        nuevoInput.addEventListener("change", (e) => {
          archivoSeleccionado = e.target.files?.[0] || null;
          actualizarTextoDrop();
        });
      }
    }

    dropZona.addEventListener("click", () => {
      const currentInput = document.getElementById("inputArchivoPaciente");
      if (currentInput) currentInput.click();
    });

    dropZona.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZona.style.borderColor = "rgba(0,170,255,0.9)";
    });

    dropZona.addEventListener("dragleave", () => {
      dropZona.style.borderColor = "rgba(255,255,255,0.25)";
    });

    dropZona.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZona.style.borderColor = "rgba(255,255,255,0.25)";
      archivoSeleccionado = e.dataTransfer.files?.[0] || null;
      actualizarTextoDrop();
    });

    if (inputFile) {
      inputFile.addEventListener("change", (e) => {
        archivoSeleccionado = e.target.files?.[0] || null;
        actualizarTextoDrop();
      });
    }

    if (btnSubir) {
      btnSubir.addEventListener("click", async () => {
        if (!archivoSeleccionado) {
          alert("Seleccione un archivo");
          return;
        }

        const formData = new FormData();
        formData.append("archivo", archivoSeleccionado);

        try {
          const res = await fetch(`/api/pacientes/${pacienteId}/archivos`, {
            method: "POST",
            body: formData
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            alert(data.error || "Error al subir archivo");
            return;
          }

          archivoSeleccionado = null;
          actualizarTextoDrop();
          await cargarListaArchivos();
          alert("Archivo subido correctamente");
        } catch (error) {
          console.error("Error subiendo archivo:", error);
          alert("Error al conectar con el servidor");
        }
      });
    }

    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        cambiarContenido("pacientes-lista");
      });
    }

    await cargarListaArchivos();
  } catch (error) {
    console.error("Error mostrando archivos del paciente:", error);
    alert("Error al abrir archivos del paciente");
  }
}

async function renderTablaPacientesNoAtendidos(filtro = "") {
  const tbody = document.getElementById("tablaPacientesNoAtendidosBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/pacientes/no-atendidos");
    const pacientes = await res.json();

    const texto = filtro.toLowerCase().trim();

    const lista = pacientes.filter(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      return (
        String(p.archivo || "").toLowerCase().includes(texto) ||
        nombrePaciente.toLowerCase().includes(texto) ||
        String(p.cedula_paciente || "").toLowerCase().includes(texto) ||
        String(p.motivo_no_atendido || "").toLowerCase().includes(texto)
      );
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">No hay pacientes no atendidos</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      return `
        <tr>
          <td>${p.archivo}</td>
          <td>${nombrePaciente}</td>
          <td>${p.cedula_paciente}</td>
          <td>${p.fecha_procedimiento ? String(p.fecha_procedimiento).slice(0, 10) : ""}</td>
          <td>${p.motivo_no_atendido || ""}</td>
          <td>
            <button class="btn-table edit" onclick="reactivarPaciente(${p.id})">Reactivar</button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error("Error listando pacientes no atendidos:", error);
  }
}

function obtenerPacientesAdmisionFiltrados() {
  const texto = (document.getElementById("buscarPacienteAdmision")?.value || "").toLowerCase().trim();

  return pacientesAdmision.filter(p =>
    String(p.archivo || "").toLowerCase().includes(texto) ||
    obtenerNombreCompletoPaciente(p).toLowerCase().includes(texto) ||
    String(p.cedulaPaciente || "").toLowerCase().includes(texto) ||
    String(p.fechaProcedimiento || "").toLowerCase().includes(texto) ||
    String(p.reclutadorNombre || "").toLowerCase().includes(texto)
  );
}

async function exportarPacientesAdmisionExcel() {
  try {
    const res = await fetch("/api/pacientes/activos");
    const pacientes = await res.json();

    if (!Array.isArray(pacientes) || !pacientes.length) {
      alert("No hay pacientes para exportar");
      return;
    }

    const inputBuscar = document.getElementById("buscarPacienteAdmision");
    const texto = (inputBuscar ? inputBuscar.value : "").toLowerCase().trim();

    const lista = pacientes.filter(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      const reclutador = [
        p.rec_apellido1,
        p.rec_apellido2,
        p.rec_nombre1,
        p.rec_nombre2
      ].filter(Boolean).join(" ");

      return (
        String(p.archivo || "").toLowerCase().includes(texto) ||
        nombrePaciente.toLowerCase().includes(texto) ||
        String(p.cedula_paciente || "").toLowerCase().includes(texto) ||
        String(p.fecha_procedimiento || "").toLowerCase().includes(texto) ||
        reclutador.toLowerCase().includes(texto)
      );
    });

    if (!lista.length) {
      alert("No hay pacientes para exportar con ese filtro");
      return;
    }

    const filas = lista.map(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      const nombreFamiliar = [
        p.fam_apellido1,
        p.fam_apellido2,
        p.fam_nombre1,
        p.fam_nombre2
      ].filter(Boolean).join(" ");

      const reclutador = [
        p.rec_apellido1,
        p.rec_apellido2,
        p.rec_nombre1,
        p.rec_nombre2
      ].filter(Boolean).join(" ");

      return {
        "# Archivo": p.archivo || "",
        "Paciente": nombrePaciente,
        "Cédula paciente": p.cedula_paciente || "",
        "Fecha procedimiento": p.fecha_procedimiento ? String(p.fecha_procedimiento).slice(0, 10) : "",
        "Reclutador": reclutador,
        "Estado civil": p.estado_civil || "",
        "Sexo": p.sexo || "",
        "Teléfono fijo": p.telefono_fijo || "",
        "Teléfono celular": p.telefono_celular || "",
        "Correo": p.correo || "",
        "Fecha nacimiento": p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : "",
        "Edad": p.edad || "",
        "Lugar nacimiento": p.lugar_nacimiento || "",
        "Provincia": p.provincia || "",
        "Cantón": p.canton || "",
        "Parroquia": p.parroquia || "",
        "Barrio": p.barrio || "",
        "Calle principal": p.calle_principal || "",
        "Calle secundaria": p.calle_secundaria || "",
        "Referencia": p.referencia || "",
        "Ocupación": p.ocupacion || "",
        "Tipo de seguro": p.tipo_seguro || "",
        "Tipo de afiliado": p.tipo_afiliado || "",
        "Familiar": nombreFamiliar,
        "Cédula familiar": p.cedula_familiar || "",
        "Parentesco familiar": p.parentesco_familiar || "",
        "Dirección familiar": p.direccion_familiar || "",
        "Teléfono familiar": p.telefono_familiar || "",
        "Estado atención": p.estado_atencion || "",

        "Dispensario": p.dispensario || "",
        "Organización": p.organizacion || "",
        "CVV": p.cvv || "",
        "T/procedimiento": p.t_procedimiento || "",
        "# STENT UTILIZADO": p.stent_utilizado || "",
        "Mes": p.mes || "",
        "Año": p.anio || "",
        "Cirujano": p.cirujano || "",
        "Anestesiologo": p.anestesiologo || "",
        "Radiologo": p.radiologo || "",
        "Habitación": p.habitacion || "",
        "Alta": p.alta ? String(p.alta).slice(0, 10) : "",
        "Uso de sala": p.uso_sala ? "Sí" : "No",
        "Laboratorios": p.laboratorios ? "Sí" : "No",
        "Hospitalización": p.hospitalizacion ? "Sí" : "No",
        "Alimentación": p.alimentacion ? "Sí" : "No",
        "Cuidados": p.cuidados ? "Sí" : "No"
      };
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes Activos");

    XLSX.writeFile(wb, "lista_pacientes_activos.xlsx");
  } catch (error) {
    console.error("Error exportando pacientes:", error);
    alert("Error al exportar pacientes");
  }
}

async function exportarUsuariosSistemaExcel() {
  try {
    const res = await fetch("/api/usuarios");
    const usuarios = await res.json();

    if (!Array.isArray(usuarios) || !usuarios.length) {
      alert("No hay usuarios para exportar");
      return;
    }

    const filas = usuarios.map(u => ({
      "ID": u.id,
      "Primer apellido": u.apellido1 || "",
      "Segundo apellido": u.apellido2 || "",
      "Primer nombre": u.nombre1 || "",
      "Segundo nombre": u.nombre2 || "",
      "Nombre completo": `${u.nombre1 || ""} ${u.nombre2 || ""} ${u.apellido1 || ""} ${u.apellido2 || ""}`.replace(/\s+/g, " ").trim(),
      "Usuario": u.username || "",
      "Rol": u.rol || "",
      "Estado": u.estado || "",
      "Fecha creación": u.fecha_creacion || ""
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");

    XLSX.writeFile(wb, "usuarios_sistema.xlsx");
  } catch (error) {
    console.error("Error exportando usuarios:", error);
    alert("Error al exportar usuarios");
  }
}

async function exportarPacientesNoAtendidosExcel() {
  try {
    const res = await fetch("/api/pacientes/no-atendidos");
    const pacientes = await res.json();

    if (!Array.isArray(pacientes) || !pacientes.length) {
      alert("No hay pacientes no atendidos para exportar");
      return;
    }

    const inputBuscar = document.getElementById("buscarPacienteNoAtendido");
    const texto = (inputBuscar ? inputBuscar.value : "").toLowerCase().trim();

    const lista = pacientes.filter(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      return (
        String(p.archivo || "").toLowerCase().includes(texto) ||
        nombrePaciente.toLowerCase().includes(texto) ||
        String(p.cedula_paciente || "").toLowerCase().includes(texto) ||
        String(p.motivo_no_atendido || "").toLowerCase().includes(texto)
      );
    });

    if (!lista.length) {
      alert("No hay pacientes no atendidos para exportar con ese filtro");
      return;
    }

    const filas = lista.map(p => {
      const nombrePaciente = [
        p.pac_apellido1,
        p.pac_apellido2,
        p.pac_nombre1,
        p.pac_nombre2
      ].filter(Boolean).join(" ");

      const nombreFamiliar = [
        p.fam_apellido1,
        p.fam_apellido2,
        p.fam_nombre1,
        p.fam_nombre2
      ].filter(Boolean).join(" ");

      const reclutador = [
        p.rec_apellido1,
        p.rec_apellido2,
        p.rec_nombre1,
        p.rec_nombre2
      ].filter(Boolean).join(" ");

      return {
        "# Archivo": p.archivo || "",
        "Paciente": nombrePaciente,
        "Cédula paciente": p.cedula_paciente || "",
        "Fecha procedimiento": p.fecha_procedimiento ? String(p.fecha_procedimiento).slice(0, 10) : "",
        "Motivo no atendido": p.motivo_no_atendido || "",
        "Reclutador": reclutador,
        "Estado civil": p.estado_civil || "",
        "Sexo": p.sexo || "",
        "Teléfono fijo": p.telefono_fijo || "",
        "Teléfono celular": p.telefono_celular || "",
        "Correo": p.correo || "",
        "Fecha nacimiento": p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : "",
        "Edad": p.edad || "",
        "Lugar nacimiento": p.lugar_nacimiento || "",
        "Provincia": p.provincia || "",
        "Cantón": p.canton || "",
        "Parroquia": p.parroquia || "",
        "Barrio": p.barrio || "",
        "Calle principal": p.calle_principal || "",
        "Calle secundaria": p.calle_secundaria || "",
        "Referencia": p.referencia || "",
        "Ocupación": p.ocupacion || "",
        "Tipo de seguro": p.tipo_seguro || "",
        "Tipo de afiliado": p.tipo_afiliado || "",
        "Familiar": nombreFamiliar,
        "Cédula familiar": p.cedula_familiar || "",
        "Parentesco familiar": p.parentesco_familiar || "",
        "Dirección familiar": p.direccion_familiar || "",
        "Teléfono familiar": p.telefono_familiar || "",
        "Estado atención": p.estado_atencion || "",

        "Dispensario": p.dispensario || "",
        "Organización": p.organizacion || "",
        "CVV": p.cvv || "",
        "T/procedimiento": p.t_procedimiento || "",
        "# STENT UTILIZADO": p.stent_utilizado || "",
        "Mes": p.mes || "",
        "Año": p.anio || "",
        "Cirujano": p.cirujano || "",
        "Anestesiologo": p.anestesiologo || "",
        "Radiologo": p.radiologo || "",
        "Habitación": p.habitacion || "",
        "Alta": p.alta ? String(p.alta).slice(0, 10) : "",
        "Uso de sala": p.uso_sala ? "Sí" : "No",
        "Laboratorios": p.laboratorios ? "Sí" : "No",
        "Hospitalización": p.hospitalizacion ? "Sí" : "No",
        "Alimentación": p.alimentacion ? "Sí" : "No",
        "Cuidados": p.cuidados ? "Sí" : "No"
      };
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "No Atendidos");

    XLSX.writeFile(wb, "pacientes_no_atendidos.xlsx");
  } catch (error) {
    console.error("Error exportando pacientes no atendidos:", error);
    alert("Error al exportar pacientes no atendidos");
  }
}

function cargarPacienteAdmisionEnFormulario(index) {
  const p = pacientesAdmision[index];
  if (!p) return;

  editPacienteAdmisionIndex = index;
  cambiarContenido("pacientes-admision");

  setTimeout(() => {
    document.getElementById("admArchivo").value = p.archivo;
    document.getElementById("admCedulaPaciente").value = p.cedulaPaciente;
    document.getElementById("admEstadoCivil").value = p.estadoCivil;
    document.getElementById("admSexo").value = p.sexo;
    document.getElementById("admTelefonoFijo").value = p.telefonoFijo;
    document.getElementById("admTelefonoCelular").value = p.telefonoCelular;
    document.getElementById("admCorreo").value = p.correo;

    document.getElementById("admPacApellido1").value = p.pacApellido1;
    document.getElementById("admPacApellido2").value = p.pacApellido2;
    document.getElementById("admPacNombre1").value = p.pacNombre1;
    document.getElementById("admPacNombre2").value = p.pacNombre2;

    document.getElementById("admFamApellido1").value = p.famApellido1;
    document.getElementById("admFamApellido2").value = p.famApellido2;
    document.getElementById("admFamNombre1").value = p.famNombre1;
    document.getElementById("admFamNombre2").value = p.famNombre2;

    document.getElementById("admCedulaFamiliar").value = p.cedulaFamiliar;
    document.getElementById("admFechaNacimiento").value = p.fechaNacimiento;
    document.getElementById("admEdad").value = p.edad;
    document.getElementById("admLugarNacimiento").value = p.lugarNacimiento;
    document.getElementById("admFechaProcedimiento").value = p.fechaProcedimiento;
    document.getElementById("admReclutador").value = p.reclutadorIndex;
    document.getElementById("admProvincia").value = p.provincia;
    document.getElementById("admCanton").value = p.canton;
    document.getElementById("admParroquia").value = p.parroquia;
    document.getElementById("admBarrio").value = p.barrio;
    document.getElementById("admCallePrincipal").value = p.callePrincipal;
    document.getElementById("admCalleSecundaria").value = p.calleSecundaria;
    document.getElementById("admReferencia").value = p.referencia;
    document.getElementById("admOcupacion").value = p.ocupacion;
    document.getElementById("admParentescoFamiliar").value = p.parentescoFamiliar;
    document.getElementById("admDireccionFamiliar").value = p.direccionFamiliar;
    document.getElementById("admTelefonoFamiliar").value = p.telefonoFamiliar;
    document.getElementById("admTipoSeguro").value = p.tipoSeguro;
    document.getElementById("admTipoAfiliado").value = p.tipoAfiliado;

    document.getElementById("btnGuardarAdmision").textContent = "Actualizar";
    document.getElementById("btnCancelarAdmision").style.display = "inline-flex";
  }, 250);
}

async function inicializarModuloAdmisionPacientes() {
  const form = document.getElementById("formAdmisionPaciente");
  const fechaNacimiento = document.getElementById("admFechaNacimiento");
  const edad = document.getElementById("admEdad");
  const btnCancelar = document.getElementById("btnCancelarAdmision");
  const archivoInput = document.getElementById("admArchivo");
  const btnGuardar = document.getElementById("btnGuardarAdmision");

  if (!form) return;

  if (!pacienteEditandoId && archivoInput) {
    const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
    archivoInput.value = numeroActual;
  }

  await poblarSelectReclutadores("admReclutador");

  if (fechaNacimiento && edad) {
    fechaNacimiento.addEventListener("change", () => {
      edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      cedulaPaciente: document.getElementById("admCedulaPaciente").value.trim(),
      estadoCivil: document.getElementById("admEstadoCivil").value,
      sexo: document.getElementById("admSexo").value,
      telefonoFijo: document.getElementById("admTelefonoFijo").value.trim(),
      telefonoCelular: document.getElementById("admTelefonoCelular").value.trim(),
      correo: document.getElementById("admCorreo").value.trim(),

      pacApellido1: document.getElementById("admPacApellido1").value.trim(),
      pacApellido2: document.getElementById("admPacApellido2").value.trim(),
      pacNombre1: document.getElementById("admPacNombre1").value.trim(),
      pacNombre2: document.getElementById("admPacNombre2").value.trim(),

      famApellido1: document.getElementById("admFamApellido1").value.trim(),
      famApellido2: document.getElementById("admFamApellido2").value.trim(),
      famNombre1: document.getElementById("admFamNombre1").value.trim(),
      famNombre2: document.getElementById("admFamNombre2").value.trim(),

      cedulaFamiliar: document.getElementById("admCedulaFamiliar").value.trim(),
      fechaNacimiento: document.getElementById("admFechaNacimiento").value,
      edad: Number(document.getElementById("admEdad").value || 0),
      lugarNacimiento: document.getElementById("admLugarNacimiento").value.trim(),
      fechaProcedimiento: document.getElementById("admFechaProcedimiento").value,

      reclutadorId: document.getElementById("admReclutador").value || null,
      provincia: document.getElementById("admProvincia").value.trim(),
      canton: document.getElementById("admCanton").value.trim(),
      parroquia: document.getElementById("admParroquia").value.trim(),
      barrio: document.getElementById("admBarrio").value.trim(),
      callePrincipal: document.getElementById("admCallePrincipal").value.trim(),
      calleSecundaria: document.getElementById("admCalleSecundaria").value.trim(),
      referencia: document.getElementById("admReferencia").value.trim(),
      ocupacion: document.getElementById("admOcupacion").value.trim(),
      parentescoFamiliar: document.getElementById("admParentescoFamiliar").value.trim(),
      direccionFamiliar: document.getElementById("admDireccionFamiliar").value.trim(),
      telefonoFamiliar: document.getElementById("admTelefonoFamiliar").value.trim(),
      tipoSeguro: document.getElementById("admTipoSeguro").value,
      tipoAfiliado: document.getElementById("admTipoAfiliado").value
    };

    if (!validarCedula10Digitos(payload.cedulaPaciente)) {
      alert("La cédula del paciente debe tener 10 dígitos");
      return;
    }

    if (!validarCedula10Digitos(payload.cedulaFamiliar)) {
      alert("La cédula del familiar debe tener 10 dígitos");
      return;
    }

    try {
      let res;
      let data;

      if (pacienteEditandoId) {
        res = await fetch(`/api/pacientes/${pacienteEditandoId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Error al actualizar paciente");
          return;
        }

        alert("Paciente actualizado correctamente");
      } else {
        res = await fetch("/api/pacientes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Error al guardar paciente");
          return;
        }

        alert(`Paciente guardado correctamente. # Archivo: ${data.archivo}`);
      }

      pacienteEditandoId = null;
      form.reset();

      if (edad) edad.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar";
      if (btnCancelar) btnCancelar.style.display = "none";

      const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
      if (archivoInput) archivoInput.value = numeroActual;

      await poblarSelectReclutadores("admReclutador");

      cambiarContenido("pacientes-lista");
    } catch (error) {
      console.error("Error guardando/actualizando paciente:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (btnCancelar) {
    btnCancelar.addEventListener("click", async () => {
      pacienteEditandoId = null;
      form.reset();

      if (edad) edad.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar";
      btnCancelar.style.display = "none";

      const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
      if (archivoInput) archivoInput.value = numeroActual;

      await poblarSelectReclutadores("admReclutador");

      cambiarContenido("pacientes-lista");
    });
  }
}

/*===========================
CONFIGURACION DE # DE archivo - 
============================*/
async function inicializarModuloConfigArchivo() {
  const form = document.getElementById("formConfigArchivo");
  const actual = document.getElementById("cfgArchivoActual");
  const nuevo = document.getElementById("cfgNuevoArchivo");

  if (!form || !actual || !nuevo) return;

  try {
    const res = await fetch("/api/config/archivo");
    const data = await res.json();

    if (res.ok && data) {
      actual.value = data.numero_actual || "";
      nuevo.value = data.numero_actual || "";
    }
  } catch (error) {
    console.error("Error cargando config archivo:", error);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const valor = Number(nuevo.value || 0);
    if (valor <= 0) {
      alert("Ingrese un número válido");
      return;
    }

    try {
      const res = await fetch("/api/config/archivo", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          numero_actual: valor
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al actualizar # Archivo");
        return;
      }

      actual.value = valor;
      alert("Número de archivo actualizado");
    } catch (error) {
      console.error("Error actualizando config archivo:", error);
      alert("Error al conectar con el servidor");
    }
  });
}

/*async function inicializarModuloAdmisionPacientes() {
  const form = document.getElementById("formAdmisionPaciente");
  const fechaNacimiento = document.getElementById("admFechaNacimiento");
  const edad = document.getElementById("admEdad");
  const btnCancelar = document.getElementById("btnCancelarAdmision");
  const archivoInput = document.getElementById("admArchivo");
  const btnGuardar = document.getElementById("btnGuardarAdmision");
  const reclutadorSelect = document.getElementById("admReclutador");

  if (!form) return;

  // Cargar # de archivo solo si no estás editando
  if (!pacienteEditandoId && archivoInput) {
    const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
    archivoInput.value = numeroActual;
  }

  // Cargar reclutadores
  if (reclutadorSelect) {
    await poblarSelectReclutadores("admReclutador");
  }

  // Calcular edad automática al cambiar fecha
  if (fechaNacimiento && edad) {
    fechaNacimiento.addEventListener("change", () => {
      edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
    });

    fechaNacimiento.addEventListener("input", () => {
      edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
    });

    // por si la fecha ya venía cargada
    edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      cedulaPaciente: document.getElementById("admCedulaPaciente").value.trim(),
      estadoCivil: document.getElementById("admEstadoCivil").value,
      sexo: document.getElementById("admSexo").value,
      telefonoFijo: document.getElementById("admTelefonoFijo").value.trim(),
      telefonoCelular: document.getElementById("admTelefonoCelular").value.trim(),
      correo: document.getElementById("admCorreo").value.trim(),

      pacApellido1: document.getElementById("admPacApellido1").value.trim(),
      pacApellido2: document.getElementById("admPacApellido2").value.trim(),
      pacNombre1: document.getElementById("admPacNombre1").value.trim(),
      pacNombre2: document.getElementById("admPacNombre2").value.trim(),

      famApellido1: document.getElementById("admFamApellido1").value.trim(),
      famApellido2: document.getElementById("admFamApellido2").value.trim(),
      famNombre1: document.getElementById("admFamNombre1").value.trim(),
      famNombre2: document.getElementById("admFamNombre2").value.trim(),

      cedulaFamiliar: document.getElementById("admCedulaFamiliar").value.trim(),
      fechaNacimiento: document.getElementById("admFechaNacimiento").value,
      edad: Number(document.getElementById("admEdad").value || 0),
      lugarNacimiento: document.getElementById("admLugarNacimiento").value.trim(),
      fechaProcedimiento: document.getElementById("admFechaProcedimiento").value,

      reclutadorId: document.getElementById("admReclutador").value || null,
      provincia: document.getElementById("admProvincia").value.trim(),
      canton: document.getElementById("admCanton").value.trim(),
      parroquia: document.getElementById("admParroquia").value.trim(),
      barrio: document.getElementById("admBarrio").value.trim(),
      callePrincipal: document.getElementById("admCallePrincipal").value.trim(),
      calleSecundaria: document.getElementById("admCalleSecundaria").value.trim(),
      referencia: document.getElementById("admReferencia").value.trim(),
      ocupacion: document.getElementById("admOcupacion").value.trim(),
      parentescoFamiliar: document.getElementById("admParentescoFamiliar").value.trim(),
      direccionFamiliar: document.getElementById("admDireccionFamiliar").value.trim(),
      telefonoFamiliar: document.getElementById("admTelefonoFamiliar").value.trim(),
      tipoSeguro: document.getElementById("admTipoSeguro").value,
      tipoAfiliado: document.getElementById("admTipoAfiliado").value
    };

    if (!validarCedula10Digitos(payload.cedulaPaciente)) {
      alert("La cédula del paciente debe tener 10 dígitos");
      return;
    }

    if (!validarCedula10Digitos(payload.cedulaFamiliar)) {
      alert("La cédula del familiar debe tener 10 dígitos");
      return;
    }

    try {
      let res;
      let data;

      if (pacienteEditandoId) {
        res = await fetch(`/api/pacientes/${pacienteEditandoId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Error al actualizar paciente");
          return;
        }

        alert("Paciente actualizado correctamente");
      } else {
        res = await fetch("/api/pacientes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Error al guardar paciente");
          return;
        }

        alert(`Paciente guardado correctamente. # Archivo: ${data.archivo}`);
      }

      pacienteEditandoId = null;
      form.reset();

      if (edad) edad.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar";
      if (btnCancelar) btnCancelar.style.display = "none";

      const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
      if (archivoInput) archivoInput.value = numeroActual;

      await poblarSelectReclutadores("admReclutador");

      cambiarContenido("pacientes-lista");
    } catch (error) {
      console.error("Error guardando/actualizando paciente:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (btnCancelar) {
    btnCancelar.addEventListener("click", async () => {
      pacienteEditandoId = null;
      form.reset();

      if (edad) edad.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar";
      btnCancelar.style.display = "none";

      const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
      if (archivoInput) archivoInput.value = numeroActual;

      await poblarSelectReclutadores("admReclutador");

      cambiarContenido("pacientes-lista");
    });
  }
}*/

async function inicializarModuloAdmisionPacientes() {
  const form = document.getElementById("formAdmisionPaciente");
  const fechaNacimiento = document.getElementById("admFechaNacimiento");
  const edad = document.getElementById("admEdad");
  const btnCancelar = document.getElementById("btnCancelarAdmision");
  const archivoInput = document.getElementById("admArchivo");
  const btnGuardar = document.getElementById("btnGuardarAdmision");
  const reclutadorSelect = document.getElementById("admReclutador");

  if (!form) return;

  // Cargar # de archivo solo si no estás editando
  if (!pacienteEditandoId && archivoInput) {
    const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
    archivoInput.value = numeroActual;
  }

  // Cargar reclutadores
  if (reclutadorSelect) {
    await poblarSelectReclutadores("admReclutador");
  }

  // Calcular edad automática al cambiar fecha
  if (fechaNacimiento && edad) {
    fechaNacimiento.addEventListener("change", () => {
      edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
    });

    fechaNacimiento.addEventListener("input", () => {
      edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
    });

    // por si la fecha ya venía cargada
    edad.value = calcularEdadDesdeFecha(fechaNacimiento.value);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      cedulaPaciente: document.getElementById("admCedulaPaciente").value.trim(),
      estadoCivil: document.getElementById("admEstadoCivil").value,
      sexo: document.getElementById("admSexo").value,
      telefonoFijo: document.getElementById("admTelefonoFijo").value.trim(),
      telefonoCelular: document.getElementById("admTelefonoCelular").value.trim(),
      correo: document.getElementById("admCorreo").value.trim(),

      pacApellido1: document.getElementById("admPacApellido1").value.trim(),
      pacApellido2: document.getElementById("admPacApellido2").value.trim(),
      pacNombre1: document.getElementById("admPacNombre1").value.trim(),
      pacNombre2: document.getElementById("admPacNombre2").value.trim(),

      famApellido1: document.getElementById("admFamApellido1").value.trim(),
      famApellido2: document.getElementById("admFamApellido2").value.trim(),
      famNombre1: document.getElementById("admFamNombre1").value.trim(),
      famNombre2: document.getElementById("admFamNombre2").value.trim(),

      cedulaFamiliar: document.getElementById("admCedulaFamiliar").value.trim(),
      fechaNacimiento: document.getElementById("admFechaNacimiento").value,
      edad: Number(document.getElementById("admEdad").value || 0),
      lugarNacimiento: document.getElementById("admLugarNacimiento").value.trim(),
      fechaProcedimiento: document.getElementById("admFechaProcedimiento").value,

      reclutadorId: document.getElementById("admReclutador").value || null,
      provincia: document.getElementById("admProvincia").value.trim(),
      canton: document.getElementById("admCanton").value.trim(),
      parroquia: document.getElementById("admParroquia").value.trim(),
      barrio: document.getElementById("admBarrio").value.trim(),
      callePrincipal: document.getElementById("admCallePrincipal").value.trim(),
      calleSecundaria: document.getElementById("admCalleSecundaria").value.trim(),
      referencia: document.getElementById("admReferencia").value.trim(),
      ocupacion: document.getElementById("admOcupacion").value.trim(),
      parentescoFamiliar: document.getElementById("admParentescoFamiliar").value.trim(),
      direccionFamiliar: document.getElementById("admDireccionFamiliar").value.trim(),
      telefonoFamiliar: document.getElementById("admTelefonoFamiliar").value.trim(),
      tipoSeguro: document.getElementById("admTipoSeguro").value,
      tipoAfiliado: document.getElementById("admTipoAfiliado").value
    };

    if (!validarCedula10Digitos(payload.cedulaPaciente)) {
      alert("La cédula del paciente debe tener 10 dígitos");
      return;
    }

    if (!validarCedula10Digitos(payload.cedulaFamiliar)) {
      alert("La cédula del familiar debe tener 10 dígitos");
      return;
    }

    try {
      let res;
      let data;

      if (pacienteEditandoId) {
        res = await fetch(`/api/pacientes/${pacienteEditandoId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Error al actualizar paciente");
          return;
        }

        alert("Paciente actualizado correctamente");
      } else {
        res = await fetch("/api/pacientes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Error al guardar paciente");
          return;
        }

        alert(`Paciente guardado correctamente. # Archivo: ${data.archivo}`);
      }

      pacienteEditandoId = null;
      form.reset();

      if (edad) edad.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar";
      if (btnCancelar) btnCancelar.style.display = "none";

      const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
      if (archivoInput) archivoInput.value = numeroActual;

      await poblarSelectReclutadores("admReclutador");

      cambiarContenido("pacientes-lista");
    } catch (error) {
      console.error("Error guardando/actualizando paciente:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (btnCancelar) {
    btnCancelar.addEventListener("click", async () => {
      pacienteEditandoId = null;
      form.reset();

      if (edad) edad.value = "";
      if (btnGuardar) btnGuardar.textContent = "Guardar";
      btnCancelar.style.display = "none";

      const numeroActual = await obtenerNumeroArchivoActualDesdeSQL();
      if (archivoInput) archivoInput.value = numeroActual;

      await poblarSelectReclutadores("admReclutador");

      cambiarContenido("pacientes-lista");
    });
  }
}

/*==========================
CATEGORIAS PRODUCTO
============================ */
async function renderTablaCategoriasProducto(filtro = "") {
  const tbody = document.getElementById("tablaCategoriasProductoBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/categorias-producto");
    const data = await res.json().catch(() => ([]));

    const texto = filtro.toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(c =>
      String(c.nombre || "").toLowerCase().includes(texto) ||
      String(c.prefijo || "").toLowerCase().includes(texto) ||
      String(c.estado || "").toLowerCase().includes(texto)
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">No hay categorías registradas</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.prefijo}</td>
        <td>${c.siguiente_numero}</td>
        <td>${c.estado}</td>
        <td>
          <button class="btn-table edit" onclick="toggleCategoriaProducto(${c.id})">
            ${c.estado === "ACTIVO" ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error listando categorías producto:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">Error al cargar categorías</td>
      </tr>
    `;
  }
}

async function guardarCategoriaProductoSistema(e) {
  e.preventDefault();

  const nombre = document.getElementById("catProdNombre").value.trim().toUpperCase();
  const prefijo = document.getElementById("catProdPrefijo").value.trim().toUpperCase();

  try {
    const res = await fetch("/api/categorias-producto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nombre, prefijo })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al guardar categoría");
      return;
    }

    alert("Categoría guardada correctamente");
    document.getElementById("formCategoriaProductoSistema").reset();
    renderTablaCategoriasProducto();
  } catch (error) {
    console.error("Error guardando categoría:", error);
    alert("Error al conectar con el servidor");
  }
}

async function toggleCategoriaProducto(id) {
  try {
    const res = await fetch(`/api/categorias-producto/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado");
      return;
    }

    const buscar = document.getElementById("buscarCategoriaProducto");
    renderTablaCategoriasProducto(buscar ? buscar.value : "");
  } catch (error) {
    console.error("Error cambiando estado categoría:", error);
    alert("Error al conectar con el servidor");
  }
}

function inicializarModuloCategoriasProducto() {
  const form = document.getElementById("formCategoriaProductoSistema");
  const buscar = document.getElementById("buscarCategoriaProducto");

  if (!form) return;

  renderTablaCategoriasProducto();

  form.addEventListener("submit", guardarCategoriaProductoSistema);

  if (buscar) {
    buscar.addEventListener("input", () => {
      renderTablaCategoriasProducto(buscar.value);
    });
  }
}

async function poblarSelectCategoriasProducto(selectId, incluirVacio = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch("/api/categorias-producto");
    const data = await res.json().catch(() => ([]));

    let html = incluirVacio ? `<option value="">Seleccione</option>` : "";

    html += (Array.isArray(data) ? data : [])
      .filter(c => c.estado === "ACTIVO")
      .map(c => `<option value="${c.nombre}">${c.nombre}</option>`)
      .join("");

    select.innerHTML = html;
  } catch (error) {
    console.error("Error cargando categorías producto:", error);
    select.innerHTML = incluirVacio ? `<option value="">Seleccione</option>` : "";
  }
}

/*===========================
CONFIGURACION DE DESPLEGABLES DE COMPLEMENTARIOS DE ADMISION - 
============================*/
function inicializarModuloConfigDesplegables() {
  const form = document.getElementById("formDesplegableConfig");
  const buscar = document.getElementById("buscarDesplegableConfig");

  if (!form) return;

  renderTablaDesplegablesConfig();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = document.getElementById("cfgTipoDesplegable").value;
    const valor = document.getElementById("cfgValorDesplegable").value.trim();

    if (!tipo || !valor) {
      alert("Complete todos los campos");
      return;
    }

    try {
      const res = await fetch("/api/config/desplegables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tipo, valor })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al guardar desplegable");
        return;
      }

      alert("Desplegable guardado correctamente");
      form.reset();
      renderTablaDesplegablesConfig(buscar ? buscar.value : "");
    } catch (error) {
      console.error("Error guardando desplegable:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (buscar) {
    buscar.addEventListener("input", () => {
      renderTablaDesplegablesConfig(buscar.value);
    });
  }
}

/* =========================
   TRASLADOS INVENTARIO
========================= */

function generarNumeroTraslado() {
  return `TRSLD-${contadorTraslado}`;
}

function obtenerLotesDisponiblesTraslado(bodega, codigo, producto) {
  const registros = (detalle_Entradas || []).filter(item =>
    String(item.bodega || "") === String(bodega || "") &&
    String(item.codigo || "") === String(codigo || "") &&
    String(item.producto || "") === String(producto || "") &&
    String(item.lote || "").trim() !== ""
  );

  const mapa = new Map();

  registros.forEach(item => {
    const key = [
      String(item.bodega || "").trim().toUpperCase(),
      String(item.codigo || "").trim().toUpperCase(),
      String(item.producto || "").trim().toUpperCase(),
      String(item.lote || "").trim().toUpperCase(),
      String(item.casaComercial || item.casa_comercial || "").trim().toUpperCase(),
      String(item.codigoProveedor || item.codigoproveedor || "").trim().toUpperCase()
    ].join("||");

    const stock = Number(item.stockLote ?? item.stock_lote ?? 0);

    if (!mapa.has(key)) {
      mapa.set(key, {
        id: item.id,
        bodega: item.bodega || "",
        codigo: item.codigo || "",
        producto: item.producto || "",
        lote: item.lote || "",
        vencimiento: item.vencimiento || "",
        casaComercial: item.casaComercial || item.casa_comercial || "",
        codigoProveedor: item.codigoProveedor || item.codigoproveedor || "",
        stockLote: stock
      });
    } else {
      const actual = mapa.get(key);
      actual.stockLote += stock;

      if (!actual.vencimiento && item.vencimiento) {
        actual.vencimiento = item.vencimiento;
      }
    }
  });

  return Array.from(mapa.values()).filter(item => Number(item.stockLote || 0) > 0);
}


/*function poblarLotesTraslado(bodega, codigo, producto) {
  const bloqueLote = document.getElementById("bloqueLoteTraslado");
  const selectLote = document.getElementById("trasladoLoteSelect");

  if (!bloqueLote || !selectLote) return;

  const lotes = obtenerLotesDisponiblesTraslado(bodega, codigo, producto);
  window._lotesTrasladoActuales = lotes;

  if (!lotes.length) {
    bloqueLote.style.display = "none";
    selectLote.innerHTML = "";
    return;
  }

  bloqueLote.style.display = "block";
  selectLote.innerHTML = `
    <option value="">Seleccione un lote</option>
    ${lotes.map((loteItem, index) => `
      <option value="${index}">
        Lote: ${loteItem.lote} | Vence: ${loteItem.vencimiento ? String(loteItem.vencimiento).slice(0, 10) : "N/A"} | Stock lote: ${loteItem.stockLote || 0}
      </option>
    `).join("")}
  `;
}*/

function poblarLotesTraslado(bodega, codigo, producto) {
  const bloqueLote = document.getElementById("bloqueLoteTraslado");
  const selectLote = document.getElementById("trasladoLoteSelect");

  if (!bloqueLote || !selectLote) return;

  const lotes = obtenerLotesDisponiblesTraslado(bodega, codigo, producto);
  window._lotesTrasladoActuales = lotes;

  if (!lotes.length) {
    bloqueLote.style.display = "none";
    selectLote.innerHTML = "";
    return;
  }

  bloqueLote.style.display = "block";
  selectLote.innerHTML = `
    <option value="">Seleccione un lote</option>
    ${lotes.map((loteItem, index) => `
      <option value="${index}">
        Lote: ${loteItem.lote || ""} | Vence: ${
          loteItem.vencimiento ? String(loteItem.vencimiento).slice(0, 10) : "N/A"
        } | Stock lote: ${loteItem.stockLote || 0}
      </option>
    `).join("")}
  `;
}

function renderResultadosProductoTraslado(texto = "") {
  const contenedor = document.getElementById("resultadosProductoTraslado");
  const selectOrigen = document.getElementById("trasladoBodegaOrigen");

  if (!contenedor || !selectOrigen) return;

  const filtro = texto.toLowerCase().trim();
  const bodegaOrigen = selectOrigen.value;

  if (!bodegaOrigen) {
    contenedor.innerHTML = `
      <div class="resultado-item empty">Seleccione la bodega origen primero</div>
    `;
    contenedor.style.display = "block";
    return;
  }

  if (!filtro) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
    return;
  }

  const resultados = (inventario || []).filter(item =>
    String(item.bodega || "") === bodegaOrigen &&
    Number(item.stock || 0) > 0 &&
    (
      String(item.codigo || "").toLowerCase().includes(filtro) ||
      String(item.producto || "").toLowerCase().includes(filtro) ||
      String(item.categoria || "").toLowerCase().includes(filtro)
    )
  ).slice(0, 20);

  if (!resultados.length) {
    contenedor.innerHTML = `
      <div class="resultado-item empty">No se encontraron productos en la bodega origen</div>
    `;
    contenedor.style.display = "block";
    return;
  }

  contenedor.innerHTML = resultados.map(item => {
    const realIndex = inventario.findIndex(x =>
      String(x.bodega || "") === String(item.bodega || "") &&
      String(x.codigo || "") === String(item.codigo || "") &&
      String(x.producto || "") === String(item.producto || "")
    );

    return `
      <div class="resultado-item" data-index="${realIndex}">
        <div class="resultado-title">${item.codigo} - ${item.producto}</div>
        <div class="resultado-sub">
          Bodega: ${item.bodega} | Categoría: ${item.categoria || "Sin categoría"} | Stock: ${item.stock}
        </div>
      </div>
    `;
  }).join("");

  contenedor.style.display = "block";

  contenedor.querySelectorAll(".resultado-item[data-index]").forEach(item => {
    item.addEventListener("click", () => {
      seleccionarProductoTraslado(Number(item.dataset.index));
    });
  });
}

function seleccionarProductoTraslado(index) {
  const item = inventario[index];
  if (!item) return;

  productoTrasladoSeleccionadoIndex = index;

  const inputBuscar = document.getElementById("buscarProductoTraslado");
  const inputCodigo = document.getElementById("trasladoCodigo");
  const inputProducto = document.getElementById("trasladoProductoNombre");
  const inputCategoria = document.getElementById("trasladoCategoria");
  const inputStock = document.getElementById("trasladoStockActual");
  const inputLote = document.getElementById("trasladoLoteTexto");
  const inputVencimiento = document.getElementById("trasladoVencimientoTexto");

  if (inputBuscar) inputBuscar.value = `${item.codigo} - ${item.producto}`;
  if (inputCodigo) inputCodigo.value = item.codigo || "";
  if (inputProducto) inputProducto.value = item.producto || "";
  if (inputCategoria) inputCategoria.value = item.categoria || "";
  if (inputStock) inputStock.value = item.stock || 0;

  if (inputLote) inputLote.value = "";
  if (inputVencimiento) inputVencimiento.value = "";

  poblarLotesTraslado(item.bodega, item.codigo, item.producto);

  const contenedor = document.getElementById("resultadosProductoTraslado");
  if (contenedor) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
  }
}


/*function limpiarSeleccionProductoTraslado(limpiarBuscador = true) {
  productoTrasladoSeleccionadoIndex = -1;
  window._lotesTrasladoActuales = [];

  [
    "trasladoCodigo",
    "trasladoProductoNombre",
    "trasladoCategoria",
    "trasladoStockActual",
    "trasladoCantidad",
    "trasladoLoteTexto",
    "trasladoFechaExpiracion"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const bloqueLote = document.getElementById("bloqueLoteTraslado");
  const selectLote = document.getElementById("trasladoLoteSelect");

  if (bloqueLote) bloqueLote.style.display = "none";
  if (selectLote) selectLote.innerHTML = "";

  if (limpiarBuscador) {
    const buscar = document.getElementById("buscarProductoTraslado");
    if (buscar) buscar.value = "";
  }
}*/

function limpiarSeleccionProductoTraslado(limpiarBuscador = true) {
  productoTrasladoSeleccionadoIndex = -1;
  window._lotesTrasladoActuales = [];

  [
    "trasladoCodigo",
    "trasladoProductoNombre",
    "trasladoCategoria",
    "trasladoStockActual",
    "trasladoCantidad",
    "trasladoLoteTexto",
    "trasladoVencimientoTexto"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const bloqueLote = document.getElementById("bloqueLoteTraslado");
  const selectLote = document.getElementById("trasladoLoteSelect");

  if (bloqueLote) bloqueLote.style.display = "none";
  if (selectLote) selectLote.innerHTML = "";

  if (limpiarBuscador) {
    const buscar = document.getElementById("buscarProductoTraslado");
    if (buscar) buscar.value = "";
  }
}

function renderTablaDetalleTrasladoTemporal() {
  const tbody = document.getElementById("tablaDetalleTrasladoBody");
  if (!tbody) return;

  if (!detalleTrasladoTemporal.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">No hay productos agregados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = detalleTrasladoTemporal.map((item, index) => `
    <tr>
      <td>${item.codigo}</td>
      <td>${item.producto}</td>
      <td>${item.codigoProveedor || ""}</td>
      <td>${item.lote || ""}</td>
      <td>${item.vencimiento || ""}</td>
      <td>${item.cantidad}</td>
      <td>
        <button class="btn-table delete btn-quitar-detalle-traslado" data-index="${index}">Quitar</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-quitar-detalle-traslado").forEach(btn => {
    btn.addEventListener("click", () => {
      detalleTrasladoTemporal.splice(Number(btn.dataset.index), 1);
      renderTablaDetalleTrasladoTemporal();
    });
  });
}

/*async function renderTablaTraslados(filtro = "") {
  const tbody = document.getElementById("tablaTrasladosBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/traslados");
    const data = await res.json().catch(() => ([]));

    console.log("TRASLADOS DESDE SQL:", data);

    const texto = filtro.toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(t =>
      String(t.fecha_creacion || "").toLowerCase().includes(texto) ||
      String(t.bodega_origen || "").toLowerCase().includes(texto) ||
      String(t.bodega_destino || "").toLowerCase().includes(texto) ||
      String(t.numero_traslado || "").toLowerCase().includes(texto)
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">No hay traslados registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(t => {
      const fechaFormateada = t.fecha_creacion
        ? new Date(t.fecha_creacion).toLocaleDateString("es-EC")
        : "";

      return `
        <tr>
          <td>${fechaFormateada}</td>
          <td>${t.bodega_origen || ""}</td>
          <td>${t.bodega_destino || ""}</td>
          <td>
            <button class="btn-table edit btn-ver-traslado" data-id="${t.id}">
              ${t.numero_traslado || ""}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll(".btn-ver-traslado").forEach(btn => {
      btn.addEventListener("click", () => {
        mostrarDetalleTraslado(Number(btn.dataset.id));
      });
    });
  } catch (error) {
    console.error("Error cargando traslados:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">Error al cargar traslados</td>
      </tr>
    `;
  }
}*/

async function renderTablaTraslados() {
  const tbody = document.getElementById("tablaTrasladosBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/traslados");
    const data = await res.json().catch(() => ([]));
    const filtros = obtenerFiltrosTraslados();

    const lista = (Array.isArray(data) ? data : []).filter(t => {
      const fechaTexto = t.fecha_creacion
        ? new Date(t.fecha_creacion).toISOString().slice(0, 10)
        : "";

      const cumpleFecha = !filtros.fecha || fechaTexto === filtros.fecha;
      const cumpleOrigen = !filtros.origen || String(t.bodega_origen || "") === filtros.origen;
      const cumpleDestino = !filtros.destino || String(t.bodega_destino || "") === filtros.destino;
      const cumpleNumero = !filtros.numero || String(t.numero_traslado || "").toLowerCase().includes(filtros.numero);

      return cumpleFecha && cumpleOrigen && cumpleDestino && cumpleNumero;
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">No hay traslados registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(t => {
      const fechaFormateada = t.fecha_creacion
        ? new Date(t.fecha_creacion).toLocaleDateString("es-EC")
        : "";

      return `
        <tr>
          <td>${fechaFormateada}</td>
          <td>${t.bodega_origen || ""}</td>
          <td>${t.bodega_destino || ""}</td>
          <td>
            <button class="btn-table edit btn-ver-traslado" data-id="${t.id}">
              ${t.numero_traslado || ""}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll(".btn-ver-traslado").forEach(btn => {
      btn.addEventListener("click", () => {
        mostrarDetalleTraslado(Number(btn.dataset.id));
      });
    });
  } catch (error) {
    console.error("Error cargando traslados:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">Error al cargar traslados</td>
      </tr>
    `;
  }
}

async function mostrarDetalleTraslado(id) {
  try {
    const res = await fetch(`/api/traslados/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al obtener traslado");
      return;
    }

    const traslado = data.encabezado || {};
    const detalle = Array.isArray(data.detalle) ? data.detalle : [];

    const filas = detalle.map(item => `
      <tr>
        <td>${item.codigo || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.codigoProveedor || ""}</td>
        <td>${item.lote || ""}</td>
        <td>${item.vencimiento ? String(item.vencimiento).slice(0, 10) : ""}</td>
        <td>${item.cantidad || 0}</td>
      </tr>
    `).join("");

    panelBox.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <h2>Detalle del traslado ${traslado.numero_traslado || ""}</h2>
        </div>

        <div style="margin-bottom:16px; color: rgba(255,255,255,0.78);">
          <strong>Fecha:</strong> ${traslado.fecha_creacion ? String(traslado.fecha_creacion).slice(0, 10) : ""}<br>
          <strong>Origen:</strong> ${traslado.bodega_origen || ""}<br>
          <strong>Destino:</strong> ${traslado.bodega_destino || ""}<br>
          <strong>Responsable:</strong> ${traslado.responsable || ""}<br>
          <strong>Observación:</strong> ${traslado.observacion || ""}
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Código principal</th>
                <th>Producto</th>
                <th>Código proveedor</th>
                <th>Lote</th>
                <th>Vencimiento</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${filas || `<tr><td colspan="6" class="empty-row">No hay detalle</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="form-actions" style="margin-top:20px;">
          <button class="btn-primary" id="btnDescargarPdfTraslado">
            <i class="fa-solid fa-file-pdf"></i> Descargar PDF
          </button>
          <button class="btn-secondary" id="btnVolverTraslados">Volver a traslados</button>
        </div>
      </div>
    `;

    const btnDescargarPdf = document.getElementById("btnDescargarPdfTraslado");
    if (btnDescargarPdf) {
      btnDescargarPdf.addEventListener("click", async () => {
        try {
          const trasladoPdf = {
            numero: traslado.numero_traslado || "",
            fecha: traslado.fecha_creacion
              ? new Date(traslado.fecha_creacion).toLocaleDateString("es-EC")
              : "",
            origen: traslado.bodega_origen || "",
            destino: traslado.bodega_destino || "",
            responsable: traslado.responsable || "",
            observacion: traslado.observacion || "",
            detalle: detalle.map(item => ({
              codigo: item.codigo || "",
              producto: item.producto || "",
              codigoProveedor: item.codigoProveedor || "",
              lote: item.lote || "",
              vencimiento: item.vencimiento
                ? new Date(item.vencimiento).toLocaleDateString("es-EC")
                : "",
              cantidad: item.cantidad || 0
            }))
          };

          await generarPDFTraslado(trasladoPdf);
        } catch (error) {
          console.error("Error generando PDF del traslado:", error);
          alert("No se pudo generar el PDF");
        }
      });
    }

    const btnVolver = document.getElementById("btnVolverTraslados");
    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        cambiarContenido("inventario-traslados");
      });
    }
  } catch (error) {
    console.error("Error viendo traslado:", error);
    alert("Error al conectar con el servidor");
  }
}

function obtenerFiltrosTraslados() {
  return {
    fecha: document.getElementById("filtroFechaTraslado")?.value || "",
    origen: document.getElementById("filtroOrigenTraslado")?.value || "",
    destino: document.getElementById("filtroDestinoTraslado")?.value || "",
    numero: (document.getElementById("filtroNumeroTraslado")?.value || "").toLowerCase().trim()
  };
}

/*async function exportarTrasladosExcel() {
  try {
    const inputBuscar = document.getElementById("buscarTraslado");
    const texto = (inputBuscar?.value || "").toLowerCase().trim();

    const res = await fetch("/api/traslados");
    const traslados = await res.json().catch(() => ([]));

    if (!res.ok) {
      alert(traslados.error || "Error al obtener traslados");
      return;
    }

    if (!Array.isArray(traslados) || !traslados.length) {
      alert("No hay traslados para exportar");
      return;
    }

    const trasladosFiltrados = traslados.filter(t =>
      String(t.fecha_creacion || "").toLowerCase().includes(texto) ||
      String(t.bodega_origen || "").toLowerCase().includes(texto) ||
      String(t.bodega_destino || "").toLowerCase().includes(texto) ||
      String(t.numero_traslado || "").toLowerCase().includes(texto) ||
      String(t.responsable || "").toLowerCase().includes(texto) ||
      String(t.observacion || "").toLowerCase().includes(texto)
    );

    if (!trasladosFiltrados.length) {
      alert("No hay traslados filtrados para exportar");
      return;
    }

    const hojaResumen = trasladosFiltrados.map(t => ({
      Fecha: t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleDateString("es-EC") : "",
      "Número de traslado": t.numero_traslado || "",
      "Bodega origen": t.bodega_origen || "",
      "Bodega destino": t.bodega_destino || "",
      Responsable: t.responsable || "",
      Observación: t.observacion || ""
    }));

    const detalleCompleto = [];

    for (const t of trasladosFiltrados) {
      const resDetalle = await fetch(`/api/traslados/${t.id}`);
      const dataDetalle = await resDetalle.json().catch(() => ({}));

      if (!resDetalle.ok) continue;

      const encabezado = dataDetalle.encabezado || {};
      const detalle = Array.isArray(dataDetalle.detalle) ? dataDetalle.detalle : [];

      detalle.forEach(item => {
        detalleCompleto.push({
          Fecha: encabezado.fecha_creacion
            ? new Date(encabezado.fecha_creacion).toLocaleDateString("es-EC")
            : "",
          "Número de traslado": encabezado.numero_traslado || "",
          "Bodega origen": encabezado.bodega_origen || "",
          "Bodega destino": encabezado.bodega_destino || "",
          Responsable: encabezado.responsable || "",
          Código: item.codigo || "",
          Producto: item.producto || "",
          Categoría: item.categoria || "",
          "Código proveedor": item.codigoProveedor || "",
          "Casa comercial": item.casaComercial || "",
          Lote: item.lote || "",
          Vencimiento: item.vencimiento
            ? new Date(item.vencimiento).toLocaleDateString("es-EC")
            : "",
          Cantidad: item.cantidad || 0
        });
      });
    }

    const wb = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.json_to_sheet(hojaResumen);
    const wsDetalle = XLSX.utils.json_to_sheet(detalleCompleto);

    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Traslados");
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Traslados");

    XLSX.writeFile(wb, "historial_traslados_filtrado.xlsx");
  } catch (error) {
    console.error("Error exportando traslados:", error);
    alert("Error al exportar Excel");
  }
}*/



async function exportarTrasladosExcel() {
  try {
    const res = await fetch("/api/traslados");
    const traslados = await res.json().catch(() => ([]));

    if (!res.ok) {
      alert(traslados.error || "Error al obtener traslados");
      return;
    }

    if (!Array.isArray(traslados) || !traslados.length) {
      alert("No hay traslados para exportar");
      return;
    }

    const filtros = obtenerFiltrosTraslados();

    const trasladosFiltrados = traslados.filter(t => {
      const fechaTexto = t.fecha_creacion
        ? new Date(t.fecha_creacion).toISOString().slice(0, 10)
        : "";

      const cumpleFecha = !filtros.fecha || fechaTexto === filtros.fecha;
      const cumpleOrigen = !filtros.origen || String(t.bodega_origen || "") === filtros.origen;
      const cumpleDestino = !filtros.destino || String(t.bodega_destino || "") === filtros.destino;
      const cumpleNumero = !filtros.numero || String(t.numero_traslado || "").toLowerCase().includes(filtros.numero);

      return cumpleFecha && cumpleOrigen && cumpleDestino && cumpleNumero;
    });

    if (!trasladosFiltrados.length) {
      alert("No hay traslados filtrados para exportar");
      return;
    }

    const hojaResumen = trasladosFiltrados.map(t => ({
      Fecha: t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleDateString("es-EC") : "",
      "Número de traslado": t.numero_traslado || "",
      "Bodega origen": t.bodega_origen || "",
      "Bodega destino": t.bodega_destino || "",
      Responsable: t.responsable || "",
      Observación: t.observacion || ""
    }));

    const detalleCompleto = [];

    for (const t of trasladosFiltrados) {
      const resDetalle = await fetch(`/api/traslados/${t.id}`);
      const dataDetalle = await resDetalle.json().catch(() => ({}));

      if (!resDetalle.ok) continue;

      const encabezado = dataDetalle.encabezado || {};
      const detalle = Array.isArray(dataDetalle.detalle) ? dataDetalle.detalle : [];

      detalle.forEach(item => {
        detalleCompleto.push({
          Fecha: encabezado.fecha_creacion
            ? new Date(encabezado.fecha_creacion).toLocaleDateString("es-EC")
            : "",
          "Número de traslado": encabezado.numero_traslado || "",
          "Bodega origen": encabezado.bodega_origen || "",
          "Bodega destino": encabezado.bodega_destino || "",
          Responsable: encabezado.responsable || "",
          Código: item.codigo || "",
          Producto: item.producto || "",
          Categoría: item.categoria || "",
          "Código proveedor": item.codigoProveedor || "",
          "Casa comercial": item.casaComercial || "",
          Lote: item.lote || "",
          Vencimiento: item.vencimiento
            ? new Date(item.vencimiento).toLocaleDateString("es-EC")
            : "",
          Cantidad: item.cantidad || 0
        });
      });
    }

    const wb = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.json_to_sheet(hojaResumen);
    const wsDetalle = XLSX.utils.json_to_sheet(detalleCompleto);

    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Traslados");
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Traslados");

    XLSX.writeFile(wb, "traslados_filtrados.xlsx");
  } catch (error) {
    console.error("Error exportando traslados:", error);
    alert("Error al exportar Excel");
  }
}

async function guardarUsuarioSistema(e) {
  e.preventDefault();

  const payload = {
    apellido1: document.getElementById("usrApellido1").value,
    apellido2: document.getElementById("usrApellido2").value,
    nombre1: document.getElementById("usrNombre1").value,
    nombre2: document.getElementById("usrNombre2").value,
    username: document.getElementById("usrUsername").value,
    password: document.getElementById("usrPassword").value,
    rol: document.getElementById("usrRol").value,
    estado: document.getElementById("usrEstado").value
  };

  try {
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al crear usuario");
      return;
    }

    alert("Usuario creado correctamente");

    document.getElementById("formUsuarioSistema").reset();

    cambiarContenido("usuarios-lista");
  } catch (error) {
    console.error("Error guardando usuario:", error);
    alert("Error al conectar con el servidor");
  }
}

async function cargarUsuariosSistema() {
  try {
    const res = await fetch("/api/usuarios");
    const usuarios = await res.json();

    const tbody = document.getElementById("tablaUsuariosSistemaBody");
    if (!tbody) return;

    if (!usuarios.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">No hay usuarios registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td>${u.nombre1} ${u.nombre2 || ""} ${u.apellido1} ${u.apellido2 || ""}</td>
        <td>${u.username}</td>
        <td>${u.rol}</td>
        <td>${u.estado}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table edit" onclick="editarUsuarioSistema(${u.id})">Editar</button>
            <button class="btn-table edit" onclick="toggleUsuarioSistema(${u.id})">Cambiar estado</button>
            <button class="btn-table delete" onclick="cambiarClaveUsuarioSistema(${u.id})">Cambiar clave</button>
          </div>
        </td>
      </tr>
    `).join("");

    window._usuariosSistemaCache = usuarios;
  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}

async function toggleUsuarioSistema(id) {
  try {
    const res = await fetch(`/api/usuarios/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado");
      return;
    }

    cargarUsuariosSistema();
  } catch (error) {
    console.error("Error cambiando estado:", error);
    alert("Error al conectar con el servidor");
  }
}

function editarUsuarioSistema(id) {
  const usuarios = window._usuariosSistemaCache || [];
  const u = usuarios.find(x => x.id === id);
  if (!u) return;

  cambiarContenido("usuarios-registrar");

  setTimeout(() => {
    document.getElementById("usrApellido1").value = u.apellido1 || "";
    document.getElementById("usrApellido2").value = u.apellido2 || "";
    document.getElementById("usrNombre1").value = u.nombre1 || "";
    document.getElementById("usrNombre2").value = u.nombre2 || "";
    document.getElementById("usrUsername").value = u.username || "";
    document.getElementById("usrPassword").value = "";
    document.getElementById("usrRol").value = u.rol || "";
    document.getElementById("usrEstado").value = u.estado || "";

    const form = document.getElementById("formUsuarioSistema");
    if (!form) return;

    form.onsubmit = async function (e) {
      e.preventDefault();

      const payload = {
        apellido1: document.getElementById("usrApellido1").value,
        apellido2: document.getElementById("usrApellido2").value,
        nombre1: document.getElementById("usrNombre1").value,
        nombre2: document.getElementById("usrNombre2").value,
        username: document.getElementById("usrUsername").value,
        rol: document.getElementById("usrRol").value,
        estado: document.getElementById("usrEstado").value
      };

      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al editar usuario");
        return;
      }

      alert("Usuario actualizado");
      cambiarContenido("usuarios-lista");
    };
  }, 200);
}

async function cambiarClaveUsuarioSistema(id) {
  const nuevaPassword = prompt("Ingrese la nueva contraseña:");
  if (!nuevaPassword) return;

  try {
    const res = await fetch(`/api/usuarios/password/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nuevaPassword })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || `Error HTTP ${res.status}`);
      return;
    }

    alert("Contraseña actualizada correctamente");
  } catch (error) {
    console.error("Error cambiando contraseña:", error);
    alert("Error al conectar con el servidor");
  }
}

/*async function obtenerNumeroArchivoActualDesdeSQL() {
  try {
    const res = await fetch("/api/config/archivo");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error al obtener # Archivo");
    }

    return Number(data.numero_actual || 850);
  } catch (error) {
    console.error("Error obteniendo # archivo:", error);
    return 850;
  }
}*/

async function obtenerNumeroArchivoActualDesdeSQL() {
  try {
    const res = await fetch("/api/config/archivo");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Error /api/config/archivo:", data);
      return 850;
    }

    return Number(data.numero_actual || 850);
  } catch (error) {
    console.error("Error obteniendo # archivo:", error);
    return 850;
  }
}

async function cargarImagenComoDataURL(src) {
  const res = await fetch(src);
  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function generarPDFTraslado(traslado) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const plantilla = await cargarImagenComoDataURL("/images/plantilla-traslado.png");

  const drawBackground = () => {
    doc.addImage(plantilla, "PNG", 0, 0, pageWidth, pageHeight);
  };

  const detalleRowsBase = (traslado.detalle || []).map(item => [
  item.codigo || "",
  item.producto || "",
  item.codigoProveedor || "",
  item.lote || "",
  item.vencimiento || "",
  String(item.cantidad || 0)
]);

  const detalleRows = detalleRowsBase.length
    ? detalleRowsBase
    : [["SIN DETALLE", "No se cargaron productos", "", "", "0"]];

  doc.autoTable({
    startY: 300,
    head: [[
  "Código principal",
  "Producto",
  "Código proveedor",
  "Lote",
  "Vencimiento",
  "Cantidad"
]],
    body: detalleRows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [0, 0, 0],
      lineColor: [150, 150, 150],
      lineWidth: 0.4,
      valign: "middle"
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: {
      top: 300,
      left: 45,
      right: 45,
      bottom: 70
    },
  
    columnStyles: {
  0: { cellWidth: 65 },                 // Código principal
  1: { cellWidth: 135 },                // Producto
  2: { cellWidth: 80 },                 // Código proveedor
  3: { cellWidth: 65 },                 // Lote
  4: { cellWidth: 75 },                 // Vencimiento
  5: { cellWidth: 45, halign: "center" } // Cantidad
},
    willDrawPage: function () {
      drawBackground();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("TRASLADO DE BODEGA", 45, 145);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`N° Traslado: ${traslado.numero || ""}`, 45, 175);
      doc.text(`Fecha: ${traslado.fecha || ""}`, 330, 175);

      doc.text(`Origen: ${traslado.origen || ""}`, 45, 195);
      doc.text(`Destino: ${traslado.destino || ""}`, 330, 195);

      doc.text(`Responsable: ${traslado.responsable || ""}`, 45, 215);

      doc.text("Observación:", 45, 235);
      doc.setFont("helvetica", "normal");
      doc.text(String(traslado.observacion || ""), 115, 235, {
        maxWidth: 430
      });

      doc.setFont("helvetica", "bold");
      doc.text(`Cantidad de ítems: ${(traslado.detalle || []).length}`, 45, 270);
    }
  });

  doc.save(`${traslado.numero || "traslado"}.pdf`);
}

async function inicializarModuloTraslados() {
  const form = document.getElementById("formTrasladoInventario");
  const inputBuscarProducto = document.getElementById("buscarProductoTraslado");
  const inputBuscarTraslado = document.getElementById("buscarTraslado");
  const selectOrigen = document.getElementById("trasladoBodegaOrigen");
  const selectDestino = document.getElementById("trasladoBodegaDestino");
  const selectLote = document.getElementById("trasladoLoteSelect");

  if (selectLote) {
  selectLote.addEventListener("change", () => {
    const loteOrigen = (window._lotesTrasladoActuales || [])[Number(selectLote.value)];

    const inputLoteTexto = document.getElementById("trasladoLoteTexto");
    const inputFechaExp = document.getElementById("trasladoVencimientoTexto");

    if (inputLoteTexto) {
      inputLoteTexto.value = loteOrigen ? (loteOrigen.lote || "") : "";
    }

    if (inputFechaExp) {
      inputFechaExp.value = loteOrigen
        ? (loteOrigen.vencimiento ? String(loteOrigen.vencimiento).slice(0, 10) : "")
        : "";
    }
  });
}
  const btnAgregarDetalle = document.getElementById("btnAgregarDetalleTraslado");
  const inputNumero = document.getElementById("trasladoNumero");
  const btnExportarExcel = document.getElementById("btnExportarTrasladosExcel");

  if (!form || !inputBuscarProducto || !selectOrigen || !selectDestino || !btnAgregarDetalle) return;

  inventario = await cargarInventarioDesdeSQL();
  detalle_Entradas = await cargarDetalleEntradasDesdeSQL();

  inputNumero.value = await obtenerSiguienteNumeroTrasladoDesdeSQL();
  await poblarSelectBodegas("trasladoBodegaOrigen");
  await poblarSelectBodegas("trasladoBodegaDestino");
  await renderTablaTraslados();
  await poblarFiltrosTraslados();

const filtroFecha = document.getElementById("filtroFechaTraslado");
const filtroOrigen = document.getElementById("filtroOrigenTraslado");
const filtroDestino = document.getElementById("filtroDestinoTraslado");
const filtroNumero = document.getElementById("filtroNumeroTraslado");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltrosTraslados");

[filtroFecha, filtroOrigen, filtroDestino].forEach(el => {
  if (el) {
    el.addEventListener("change", () => {
      renderTablaTraslados();
    });
  }
});

if (filtroNumero) {
  filtroNumero.addEventListener("input", () => {
    renderTablaTraslados();
  });
}

if (btnLimpiarFiltros) {
  btnLimpiarFiltros.addEventListener("click", () => {
    if (filtroFecha) filtroFecha.value = "";
    if (filtroOrigen) filtroOrigen.value = "";
    if (filtroDestino) filtroDestino.value = "";
    if (filtroNumero) filtroNumero.value = "";
    renderTablaTraslados();
  });
}
  renderTablaDetalleTrasladoTemporal();
  autocompletarResponsable("trasladoResponsable");

  if (btnExportarExcel) {
    btnExportarExcel.addEventListener("click", exportarTrasladosExcel);
  }

  selectOrigen.addEventListener("change", () => {
    limpiarSeleccionProductoTraslado();
    const resultados = document.getElementById("resultadosProductoTraslado");
    if (resultados) {
      resultados.innerHTML = "";
      resultados.style.display = "none";
    }
  });

  inputBuscarProducto.addEventListener("input", () => {
    limpiarSeleccionProductoTraslado(false);
    renderResultadosProductoTraslado(inputBuscarProducto.value);
  });

  inputBuscarProducto.addEventListener("focus", () => {
    renderResultadosProductoTraslado(inputBuscarProducto.value);
  });

  document.addEventListener("click", function cerrarResultadosTraslado(e) {
    const cajaBusqueda = document.querySelector(".product-search-box");
    const resultados = document.getElementById("resultadosProductoTraslado");
    if (!cajaBusqueda || !resultados) return;
    if (!cajaBusqueda.contains(e.target)) {
      resultados.style.display = "none";
    }
  });

  btnAgregarDetalle.addEventListener("click", () => {
    const origen = selectOrigen.value;
    const destino = selectDestino.value;
    const cantidad = Number(document.getElementById("trasladoCantidad").value || 0);

    if (!origen || !destino) {
      alert("Seleccione bodega origen y destino");
      return;
    }

    if (origen === destino) {
      alert("La bodega origen y destino no pueden ser iguales");
      return;
    }

    if (productoTrasladoSeleccionadoIndex < 0) {
      alert("Seleccione un producto");
      return;
    }

    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    const itemOrigen = inventario[productoTrasladoSeleccionadoIndex];
    if (!itemOrigen) {
      alert("Producto no válido");
      return;
    }

    const lotesDisponibles = obtenerLotesDisponiblesTraslado(origen, itemOrigen.codigo, itemOrigen.producto);
    const tieneLotes = lotesDisponibles.length > 0;

    let loteOrigen = null;
    let loteTexto = "";
    let vencimientoTexto = "";
    let casaComercialTexto = "";
    let codigoProveedorTexto = "";

    if (tieneLotes) {
      if (!selectLote || !selectLote.value) {
        alert("Seleccione un lote");
        return;
      }

      loteOrigen = (window._lotesTrasladoActuales || [])[Number(selectLote.value)];

      if (!loteOrigen) {
        alert("Lote no válido");
        return;
      }

      if (cantidad > (loteOrigen.stockLote || 0)) {
        alert("La cantidad supera el stock disponible del lote");
        return;
      }

      loteTexto = loteOrigen.lote || "";
      vencimientoTexto = loteOrigen.vencimiento || "";
      casaComercialTexto = loteOrigen.casaComercial || "";
      codigoProveedorTexto = loteOrigen.codigoProveedor || "";
    } else {
      if (cantidad > itemOrigen.stock) {
        alert("La cantidad supera el stock disponible");
        return;
      }
    }

    const yaExiste = detalleTrasladoTemporal.some(det =>
      det.origen === origen &&
      det.destino === destino &&
      det.codigo === itemOrigen.codigo &&
      det.producto === itemOrigen.producto &&
      (det.lote || "") === loteTexto
    );

    if (yaExiste) {
      alert("Ese producto/lote ya fue agregado al detalle del traslado");
      return;
    }

    detalleTrasladoTemporal.push({
      origen,
      destino,
      inventarioIndex: productoTrasladoSeleccionadoIndex,
      detalleLoteId: loteOrigen ? loteOrigen.id : null,
      codigo: itemOrigen.codigo,
      producto: itemOrigen.producto,
      categoria: itemOrigen.categoria || "",
      codigoProveedor: codigoProveedorTexto,
      lote: loteTexto,
      vencimiento: vencimientoTexto,
      casaComercial: casaComercialTexto,
      cantidad
    });

    renderTablaDetalleTrasladoTemporal();
    limpiarSeleccionProductoTraslado();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const numero = inputNumero.value;
    const origen = selectOrigen.value;
    const destino = selectDestino.value;
    const responsable = document.getElementById("trasladoResponsable").value.trim();
    const observacion = document.getElementById("trasladoObservacion").value.trim();

    if (!origen || !destino) {
      alert("Seleccione bodega origen y destino");
      return;
    }

    if (origen === destino) {
      alert("La bodega origen y destino no pueden ser iguales");
      return;
    }

    if (!responsable) {
      alert("Ingrese el responsable");
      return;
    }

    if (!detalleTrasladoTemporal.length) {
      alert("Agregue al menos un producto al traslado");
      return;
    }

    const payload = {
      numero,
      origen,
      destino,
      responsable,
      observacion,
      detalle: detalleTrasladoTemporal.map(det => {
        const itemOrigen = inventario[det.inventarioIndex];
        const loteOrigen = det.detalleLoteId
          ? detalle_Entradas.find(x => Number(x.id) === Number(det.detalleLoteId))
          : null;

        return {
          inventarioId: itemOrigen ? itemOrigen.id : null,
          detalleEntradaId: loteOrigen ? loteOrigen.id : null,
          codigo: det.codigo,
          producto: det.producto,
          categoria: det.categoria,
          codigoProveedor: det.codigoProveedor,
          lote: det.lote,
          vencimiento: det.vencimiento,
          casaComercial: det.casaComercial,
          cantidad: det.cantidad
        };
      })
    };

    try {
      const res = await fetch("/api/traslados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al registrar traslado");
        return;
      }

      const trasladoRegistrado = {
        numero: data.numero_traslado || numero,
        fecha: data.fecha_creacion
          ? String(data.fecha_creacion).slice(0, 19).replace("T", " ")
          : "",
        origen,
        destino,
        responsable,
        observacion,
        detalle: payload.detalle.map(det => ({
          codigo: det.codigo,
          producto: det.producto,
          categoria: det.categoria,
          codigoProveedor: det.codigoProveedor,
          lote: det.lote,
          vencimiento: det.vencimiento,
          cantidad: det.cantidad
        }))
      };

      detalleTrasladoTemporal = [];

      form.reset();
      inputNumero.value = await obtenerSiguienteNumeroTrasladoDesdeSQL();
      await poblarSelectBodegas("trasladoBodegaOrigen");
      await poblarSelectBodegas("trasladoBodegaDestino");
      autocompletarResponsable("trasladoResponsable");
      limpiarSeleccionProductoTraslado();

      inventario = await cargarInventarioDesdeSQL();
      detalle_Entradas = await cargarDetalleEntradasDesdeSQL();

      renderTablaDetalleTrasladoTemporal();
      await renderTablaTraslados(inputBuscarTraslado ? inputBuscarTraslado.value : "");

      try {
        await generarPDFTraslado(trasladoRegistrado);
      } catch (errorPdf) {
        console.error("Error generando PDF de traslado:", errorPdf);
      }

      alert("Traslado registrado correctamente");
    } catch (error) {
      console.error("Error registrando traslado:", error);
      alert("Error al conectar con el servidor");
    }
  });

  if (inputBuscarTraslado) {
  inputBuscarTraslado.addEventListener("input", () => {
    renderTablaTraslados(inputBuscarTraslado.value);
  });
}
}

async function poblarFiltrosTraslados() {
  const selectOrigen = document.getElementById("filtroOrigenTraslado");
  const selectDestino = document.getElementById("filtroDestinoTraslado");

  if (!selectOrigen || !selectDestino) return;

  const res = await fetch("/api/bodegas");
  const data = await res.json().catch(() => ([]));

  if (!Array.isArray(data)) return;

  const opciones = data
    .filter(b => String(b.estado || "").toUpperCase() === "ACTIVO")
    .map(b => `<option value="${b.nombre}">${b.nombre}</option>`)
    .join("");

  selectOrigen.innerHTML = `<option value="">Todas</option>${opciones}`;
  selectDestino.innerHTML = `<option value="">Todas</option>${opciones}`;
}



/* =========================
   DESCARGOS
========================= */

function renderResultadosProductoDescargo(texto = "") {
  const contenedor = document.getElementById("resultadosProductoDescargo");
  if (!contenedor) return;

  const filtro = texto.toLowerCase().trim();

  if (!filtro) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
    return;
  }

  const resultados = inventario.filter(item =>
    item.bodega === "BODEGA CENT" &&
    item.stock > 0 &&
    (
      item.codigo.toLowerCase().includes(filtro) ||
      item.producto.toLowerCase().includes(filtro) ||
      (item.categoria || "").toLowerCase().includes(filtro)
    )
  ).slice(0, 20);

  if (!resultados.length) {
    contenedor.innerHTML = `
      <div class="resultado-item empty">No se encontraron productos en BODEGA CENT</div>
    `;
    contenedor.style.display = "block";
    return;
  }

  contenedor.innerHTML = resultados.map(item => {
    const realIndex = inventario.findIndex(x =>
      x.bodega === item.bodega &&
      x.codigo === item.codigo &&
      x.producto === item.producto
    );

    return `
      <div class="resultado-item" data-index="${realIndex}">
        <div class="resultado-title">${item.codigo} - ${item.producto}</div>
        <div class="resultado-sub">
          Categoría: ${item.categoria || "Sin categoría"} | Stock: ${item.stock}
        </div>
      </div>
    `;
  }).join("");

  contenedor.style.display = "block";

  contenedor.querySelectorAll(".resultado-item[data-index]").forEach(item => {
    item.addEventListener("click", () => {
      seleccionarProductoDescargo(Number(item.dataset.index));
    });
  });
}

function poblarLotesDescargo(codigo, producto) {
  const bloque = document.getElementById("bloqueLoteDescargo");
  const select = document.getElementById("descLoteSelect");

  if (!bloque || !select) return;

  const lotes = obtenerLotesDisponiblesDescargo(codigo, producto);

  if (!lotes.length) {
    bloque.style.display = "none";
    select.innerHTML = "";
    document.getElementById("descLoteTexto").value = "";
    document.getElementById("descVencimientoTexto").value = "";
    return;
  }

  bloque.style.display = "block";
  select.innerHTML = `
    <option value="">Seleccione un lote</option>
    ${lotes.map(loteItem => `
      <option value="${loteItem.id}">
        Lote: ${loteItem.lote}
        | Proveedor: ${loteItem.codigoProveedor || "N/A"}
        | Vence: ${loteItem.vencimiento ? String(loteItem.vencimiento).slice(0, 10) : "N/A"}
        | Stock lote: ${loteItem.stockLote || 0}
      </option>
    `).join("")}
  `;
}

function seleccionarProductoDescargo(index) {
  const item = inventario[index];
  if (!item) return;

  productoDescargoSeleccionadoIndex = index;

  document.getElementById("buscarProductoDescargo").value = `${item.codigo} - ${item.producto}`;
  document.getElementById("descCodigo").value = item.codigo;
  document.getElementById("descProductoNombre").value = item.producto;
  document.getElementById("descCategoria").value = item.categoria || "";
  document.getElementById("descStockActual").value = item.stock;

  poblarLotesDescargo(item.codigo, item.producto);

  const contenedor = document.getElementById("resultadosProductoDescargo");
  if (contenedor) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
  }
}

function limpiarSeleccionProductoDescargo(limpiarBuscador = true) {
  productoDescargoSeleccionadoIndex = -1;

  [
    "descCodigo",
    "descProductoNombre",
    "descCategoria",
    "descStockActual",
    "descCantidad",
    "descObsProducto",
    "descLoteTexto",
    "descVencimientoTexto"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const bloque = document.getElementById("bloqueLoteDescargo");
  const select = document.getElementById("descLoteSelect");

  if (bloque) bloque.style.display = "none";
  if (select) select.innerHTML = "";

  if (limpiarBuscador) {
    const buscar = document.getElementById("buscarProductoDescargo");
    if (buscar) buscar.value = "";
  }
}

function renderTablaDetalleDescargoTemporal() {
  const tbody = document.getElementById("tablaDetalleDescargoBody");
  if (!tbody) return;

  if (!detalleDescargoTemporal.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">No hay productos agregados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = detalleDescargoTemporal.map((item, index) => `
    <tr>
      <td>${item.codigo}</td>
      <td>${item.producto}</td>
      <td>${item.categoria || ""}</td>
      <td>${item.cantidad}</td>
      <td>${item.lote || ""}</td>
      <td>${item.fechaExpiracion ? String(item.fechaExpiracion).slice(0, 10) : ""}</td>
      <td>${item.observacion || ""}</td>
      <td>
        <button class="btn-table delete btn-quitar-detalle-descargo" data-index="${index}">Quitar</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-quitar-detalle-descargo").forEach(btn => {
    btn.addEventListener("click", () => {
      detalleDescargoTemporal.splice(Number(btn.dataset.index), 1);
      renderTablaDetalleDescargoTemporal();
    });
  });
}

async function cargarPacientesActivosDesdeSQL() {
  try {
    const res = await fetch("/api/pacientes/activos");
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error cargando pacientes activos:", error);
    return [];
  }
}

async function obtenerPacientesPorFechaProcedimiento(fecha) {
  const pacientes = await cargarPacientesActivosDesdeSQL();

  return pacientes.filter(p => {
    const fechaProc = p.fecha_procedimiento
      ? String(p.fecha_procedimiento).slice(0, 10)
      : "";

    return fechaProc === fecha;
  });
}

async function poblarPacientesDescargo(fecha) {
  const select = document.getElementById("descPaciente");
  if (!select) return;

  const pacientes = await obtenerPacientesPorFechaProcedimiento(fecha);

  let html = `<option value="">Seleccione</option>`;

  html += pacientes.map(p => {
    const nombreCompleto = [
      p.pac_apellido1,
      p.pac_apellido2,
      p.pac_nombre1,
      p.pac_nombre2
    ].filter(Boolean).join(" ");

    return `
      <option value="${p.id}">
        ${p.archivo} - ${nombreCompleto}
      </option>
    `;
  }).join("");

  select.innerHTML = html;
}

async function obtenerPacientePorId(id) {
  if (!id) return null;

  try {
    const res = await fetch(`/api/pacientes/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return null;
    return data;
  } catch (error) {
    console.error("Error obteniendo paciente por id:", error);
    return null;
  }
}

async function inicializarModuloDescargosRegistrar() {
  const form = document.getElementById("formDescargo");
  const inputNumero = document.getElementById("descNumero");
  const inputFecha = document.getElementById("descFechaProcedimiento");
  const selectPaciente = document.getElementById("descPaciente");
  const inputArchivo = document.getElementById("descArchivo");
  const inputBuscarProducto = document.getElementById("buscarProductoDescargo");
  const selectLote = document.getElementById("descLoteSelect");
  const btnAgregar = document.getElementById("btnAgregarDetalleDescargo");

  if (!form || !inputNumero || !inputFecha || !selectPaciente || !btnAgregar) return;

  try {
    const resNumero = await fetch("/api/descargos/siguiente-numero");
    const dataNumero = await resNumero.json().catch(() => ({}));
    inputNumero.value = resNumero.ok ? (dataNumero.numero || "") : generarNumeroDescargo();
  } catch (_) {
    inputNumero.value = generarNumeroDescargo();
  }

  detalle_Entradas = await cargarDetalleEntradasDesdeSQL();
  inventario = await cargarInventarioDesdeSQL();

  renderTablaDetalleDescargoTemporal();
  autocompletarResponsable("descResponsable");

  inputFecha.addEventListener("change", async () => {
    await poblarPacientesDescargo(inputFecha.value);
    inputArchivo.value = "";
  });

  selectPaciente.addEventListener("change", async () => {
    const paciente = await obtenerPacientePorId(selectPaciente.value);
    inputArchivo.value = paciente ? paciente.archivo : "";
  });

  inputBuscarProducto.addEventListener("input", () => {
    limpiarSeleccionProductoDescargo(false);
    renderResultadosProductoDescargo(inputBuscarProducto.value);
  });

  inputBuscarProducto.addEventListener("focus", () => {
    renderResultadosProductoDescargo(inputBuscarProducto.value);
  });

  if (selectLote) {
    selectLote.addEventListener("change", () => {
      const loteItem = detalle_Entradas.find(x => Number(x.id) === Number(selectLote.value));
      document.getElementById("descLoteTexto").value = loteItem ? (loteItem.lote || "") : "";
      document.getElementById("descVencimientoTexto").value = loteItem
        ? (loteItem.vencimiento ? String(loteItem.vencimiento).slice(0, 10) : "")
        : "";
    });
  }

  document.addEventListener("click", function cerrarResultadosDescargo(e) {
    const cajaBusqueda = document.querySelector(".product-search-box");
    const resultados = document.getElementById("resultadosProductoDescargo");
    if (!cajaBusqueda || !resultados) return;
    if (!cajaBusqueda.contains(e.target)) {
      resultados.style.display = "none";
    }
  });

  btnAgregar.addEventListener("click", () => {
    const cantidad = Number(document.getElementById("descCantidad").value || 0);
    const observacion = document.getElementById("descObsProducto").value.trim();

    if (productoDescargoSeleccionadoIndex < 0) {
      alert("Seleccione un producto");
      return;
    }

    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    const item = inventario[productoDescargoSeleccionadoIndex];
    if (!item) {
      alert("Producto no válido");
      return;
    }

    const lotesDisponibles = obtenerLotesDisponiblesDescargo(item.codigo, item.producto);
    const tieneLotes = lotesDisponibles.length > 0;

    let loteItem = null;
    let lote = "";
    let fechaExpiracion = null;

    if (tieneLotes) {
      if (!selectLote || !selectLote.value) {
        alert("Seleccione un lote");
        return;
      }

      loteItem = detalle_Entradas.find(x => Number(x.id) === Number(selectLote.value));

      if (!loteItem) {
        alert("Lote no válido");
        return;
      }

      if (cantidad > Number(loteItem.stockLote || 0)) {
        alert("La cantidad supera el stock del lote");
        return;
      }

      lote = loteItem.lote || "";
      fechaExpiracion = loteItem.vencimiento || null;
    } else {
      if (cantidad > Number(item.stock || 0)) {
        alert("La cantidad supera el stock disponible");
        return;
      }
    }

    detalleDescargoTemporal.push({
      inventarioId: item.id,
      detalleLoteId: loteItem ? Number(loteItem.id) : null,
      codigo: item.codigo,
      producto: item.producto,
      categoria: item.categoria || "",
      cantidad,
      lote,
      fechaExpiracion,
      observacion
    });

    renderTablaDetalleDescargoTemporal();
    limpiarSeleccionProductoDescargo();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const origen = document.getElementById("descOrigen").value;
    const fechaProcedimiento = inputFecha.value;
    const pacienteId = selectPaciente.value;
    const paciente = await obtenerPacientePorId(pacienteId);
    const responsable = document.getElementById("descResponsable").value.trim();

    if (!origen) {
      alert("Seleccione la locación");
      return;
    }

    if (!fechaProcedimiento) {
      alert("Seleccione la fecha de procedimiento");
      return;
    }

    if (!paciente) {
      alert("Seleccione un paciente");
      return;
    }

    if (!responsable) {
      alert("Ingrese el responsable");
      return;
    }

    if (!detalleDescargoTemporal.length) {
      alert("Agregue al menos un producto");
      return;
    }

    const payload = {
      origen,
      fechaProcedimiento,
      pacienteId: Number(paciente.id),
      archivo: Number(paciente.archivo),
      responsable,
      detalle: detalleDescargoTemporal.map(det => ({
        inventarioId: det.inventarioId,
        detalleLoteId: det.detalleLoteId,
        codigo: det.codigo,
        producto: det.producto,
        categoria: det.categoria,
        cantidad: det.cantidad,
        lote: det.lote,
        fechaExpiracion: det.fechaExpiracion,
        observacion: det.observacion
      }))
    };

    try {
      const res = await fetch("/api/descargos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Error al registrar descargo");
        return;
      }

      alert(`Descargo registrado correctamente: ${data.numero_descargo || ""}`);

      detalleDescargoTemporal = [];
      renderTablaDetalleDescargoTemporal();

      form.reset();
      inputArchivo.value = "";
      autocompletarResponsable("descResponsable");

      try {
        const resNumero = await fetch("/api/descargos/siguiente-numero");
        const dataNumero = await resNumero.json().catch(() => ({}));
        inputNumero.value = resNumero.ok ? (dataNumero.numero || "") : generarNumeroDescargo();
      } catch (_) {
        inputNumero.value = generarNumeroDescargo();
      }

      inventario = await cargarInventarioDesdeSQL();
      detalle_Entradas = await cargarDetalleEntradasDesdeSQL();

      limpiarSeleccionProductoDescargo();
    } catch (error) {
      console.error("Error guardando descargo:", error);
      alert("Error al conectar con el servidor");
    }
  });
}

/* =========================
   CONSULTAR DESCARGOS
========================= */

function obtenerDescargosFiltrados() {
  const fecha = document.getElementById("filtroDescFecha")?.value || "";
  const paciente = (document.getElementById("filtroDescPaciente")?.value || "").toLowerCase().trim();
  const archivo = (document.getElementById("filtroDescArchivo")?.value || "").toLowerCase().trim();
  const numero = (document.getElementById("filtroDescNumero")?.value || "").toLowerCase().trim();

  return descargosRegistrados.filter(d => {
    const okFecha = !fecha || d.fechaProcedimiento === fecha;
    const okPaciente = !paciente || String(d.paciente || "").toLowerCase().includes(paciente);
    const okArchivo = !archivo || String(d.archivo || "").toLowerCase().includes(archivo);
    const okNumero = !numero || String(d.numero || "").toLowerCase().includes(numero);

    return okFecha && okPaciente && okArchivo && okNumero;
  });
}

/*function renderTablaConsultarDescargos() {
  const tbody = document.getElementById("tablaDescargosBody");
  if (!tbody) return;

  const lista = obtenerDescargosFiltrados();

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">No hay descargos registrados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(d => `
    <tr>
      <td>${d.fechaProcedimiento || ""}</td>
      <td>${d.paciente || ""}</td>
      <td>${d.archivo || ""}</td>
      <td>
        <button class="btn-table edit btn-ver-descargo" data-id="${d.id}">
          ${d.id}
        </button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-ver-descargo").forEach(btn => {
    btn.addEventListener("click", () => {
      mostrarDetalleDescargo(Number(btn.dataset.id));
    });
  });
}*/

/*function renderTablaConsultarDescargos() {
  const tbody = document.getElementById("tablaDescargosBody");
  if (!tbody) return;

  const lista = obtenerDescargosFiltrados();

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">No hay descargos registrados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(d => `
    <tr>
      <td>${d.fechaProcedimiento || ""}</td>
      <td>${d.paciente || ""}</td>
      <td>${d.archivo || ""}</td>
      <td>
        <button class="btn-table edit btn-ver-descargo" data-id="${d.id}">
          ${d.numero}
        </button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-ver-descargo").forEach(btn => {
    btn.addEventListener("click", () => {
      mostrarDetalleDescargo(Number(btn.dataset.id));
    });
  });
}*/

function renderTablaConsultarDescargos() {
  const tbody = document.getElementById("tablaDescargosBody");
  if (!tbody) return;

  const lista = obtenerDescargosFiltrados();

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">No hay descargos registrados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(d => `
    <tr>
      <td>${d.fechaProcedimiento || ""}</td>
      <td>${d.paciente || ""}</td>
      <td>${d.archivo || ""}</td>
      <td>
        <button class="btn-table edit btn-ver-descargo" data-id="${d.id}">
          ${d.numero}
        </button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-ver-descargo").forEach(btn => {
    btn.addEventListener("click", () => {
      mostrarDetalleDescargo(Number(btn.dataset.id));
    });
  });
}

/*function exportarDescargosConsolidadosExcel() {
  const lista = obtenerDescargosFiltrados();

  if (!lista.length) {
    alert("No hay datos para exportar");
    return;
  }

  const filas = lista.map(d => ({
    "Fecha procedimiento": d.fechaProcedimiento || "",
    "Paciente": d.paciente || "",
    "# Archivo": d.archivo || "",
    "# Descargo": d.numero || ""
  }));

  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Descargos");

  XLSX.writeFile(wb, "descargos_consolidados.xlsx");
}*/

/*function mostrarDetalleDescargo(numero) {
  const descargo = descargosRegistrados.find(d => d.numero === numero);
  if (!descargo) return;

  panelBox.innerHTML = `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>DETALLE DE DESCARGO ${descargo.numero}</h2>
        </div>

        <div style="margin-bottom:18px; color: rgba(255,255,255,0.78);">
          <strong>Paciente:</strong> ${descargo.paciente || ""}<br>
          <strong># Archivo:</strong> ${descargo.archivo || ""}<br>
          <strong>Fecha procedimiento:</strong> ${descargo.fechaProcedimiento || ""}<br>
          <strong>Responsable:</strong> ${descargo.responsable || ""}
        </div>

        <div class="form-grid" style="margin-bottom:18px;">
          <div>
            <label>Origen</label>
            <input type="text" id="filtroDetDescOrigen" placeholder="Origen">
          </div>

          <div>
            <label>Producto</label>
            <input type="text" id="filtroDetDescProducto" placeholder="Producto">
          </div>

          <div>
            <label>Categoría</label>
            <input type="text" id="filtroDetDescCategoria" placeholder="Categoría">
          </div>
        </div>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-secondary" id="btnExportarDetalleDescargoExcel">Exportar Excel</button>
          <button type="button" class="btn-secondary" id="btnVolverConsultarDescargos">Volver</button>
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Origen</th>
                <th># Descargo</th>
                <th># Archivo</th>
                <th>Paciente</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Cant</th>
                <th>Lote</th>
                <th>Fecha expiración</th>
                <th>Obs</th>
                <th>Fecha procedimiento</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody id="tablaDetalleDescargoConsultaBody">
              <tr>
                <td colspan="12" class="empty-row">No hay detalle</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  function obtenerDetalleFiltrado() {
    const origen = (document.getElementById("filtroDetDescOrigen")?.value || "").toLowerCase().trim();
    const producto = (document.getElementById("filtroDetDescProducto")?.value || "").toLowerCase().trim();
    const categoria = (document.getElementById("filtroDetDescCategoria")?.value || "").toLowerCase().trim();

    return (descargo.detalle || []).filter(item => {
      const okOrigen = !origen || String(item.origen || "").toLowerCase().includes(origen);
      const okProducto = !producto || String(item.producto || "").toLowerCase().includes(producto);
      const okCategoria = !categoria || String(item.categoria || "").toLowerCase().includes(categoria);

      return okOrigen && okProducto && okCategoria;
    });
  }

  function renderDetalleDescargoConsulta() {
    const tbody = document.getElementById("tablaDetalleDescargoConsultaBody");
    if (!tbody) return;

    const lista = obtenerDetalleFiltrado();

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="empty-row">No hay detalle</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.origen || ""}</td>
        <td>${item.numero || ""}</td>
        <td>${item.archivo || ""}</td>
        <td>${item.paciente || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.categoria || ""}</td>
        <td>${item.cantidad || ""}</td>
        <td>${item.lote || ""}</td>
        <td>${item.vencimiento || ""}</td>
        <td>${item.observacion || ""}</td>
        <td>${item.fechaProcedimiento || ""}</td>
        <td>${item.responsable || ""}</td>
      </tr>
    `).join("");
  }

  function exportarDetalleDescargoExcel() {
    const lista = obtenerDetalleFiltrado();

    if (!lista.length) {
      alert("No hay datos para exportar");
      return;
    }

    const filas = lista.map(item => ({
      "Origen": item.origen || "",
      "# Descargo": item.numero || "",
      "# Archivo": item.archivo || "",
      "Paciente": item.paciente || "",
      "Producto": item.producto || "",
      "Categoría": item.categoria || "",
      "Cant": item.cantidad || "",
      "Lote": item.lote || "",
      "Fecha expiración": item.vencimiento || "",
      "Obs": item.observacion || "",
      "Fecha procedimiento": item.fechaProcedimiento || "",
      "Responsable": item.responsable || ""
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle Descargo");

    XLSX.writeFile(wb, `${descargo.numero}_detalle.xlsx`);
  }

  renderDetalleDescargoConsulta();

  ["filtroDetDescOrigen", "filtroDetDescProducto", "filtroDetDescCategoria"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderDetalleDescargoConsulta);
    }
  });

  const btnExportar = document.getElementById("btnExportarDetalleDescargoExcel");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarDetalleDescargoExcel);
  }

  const btnVolver = document.getElementById("btnVolverConsultarDescargos");
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      cambiarContenido("descargos-consultar");
    });
  }
}*/

/*function mostrarDetalleDescargo(id) {
  const descargo = descargosRegistrados.find(d => Number(d.id) === Number(id));
  if (!descargo) {
    alert("Descargo no encontrado");
    return;
  }

  panelBox.innerHTML = `
    <div class="inventario-wrap">

      <div class="table-card">
        <div class="table-header">
          <h2>DETALLE DE DESCARGO ${descargo.numero}</h2>
        </div>

        <div style="margin-bottom:18px; color: rgba(255,255,255,0.78);">
          <strong>Paciente:</strong> ${descargo.paciente || ""}<br>
          <strong># Archivo:</strong> ${descargo.archivo || ""}<br>
          <strong>Fecha procedimiento:</strong> ${descargo.fechaProcedimiento || ""}<br>
          <strong>Responsable:</strong> ${descargo.responsable || ""}
        </div>

        <div class="form-grid" style="margin-bottom:18px;">
          <div>
            <label>Origen</label>
            <input type="text" id="filtroDetDescOrigen" placeholder="Origen">
          </div>

          <div>
            <label>Producto</label>
            <input type="text" id="filtroDetDescProducto" placeholder="Producto">
          </div>

          <div>
            <label>Categoría</label>
            <input type="text" id="filtroDetDescCategoria" placeholder="Categoría">
          </div>
        </div>

        <div class="form-actions" style="margin-bottom:16px;">
          <button type="button" class="btn-primary" id="btnDescargarPdfDescargo">
            <i class="fa-solid fa-file-pdf"></i> Descargar PDF
          </button>
          <button type="button" class="btn-secondary" id="btnExportarDetalleDescargoExcel">Exportar Excel</button>
          <button type="button" class="btn-secondary" id="btnVolverConsultarDescargos">Volver</button>
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Origen</th>
                <th># Descargo</th>
                <th># Archivo</th>
                <th>Paciente</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Cant</th>
                <th>Lote</th>
                <th>Fecha expiración</th>
                <th>Obs</th>
                <th>Fecha procedimiento</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody id="tablaDetalleDescargoConsultaBody">
              <tr>
                <td colspan="12" class="empty-row">No hay detalle</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  function obtenerDetalleFiltrado() {
    const origen = (document.getElementById("filtroDetDescOrigen")?.value || "").toLowerCase().trim();
    const producto = (document.getElementById("filtroDetDescProducto")?.value || "").toLowerCase().trim();
    const categoria = (document.getElementById("filtroDetDescCategoria")?.value || "").toLowerCase().trim();

    return (descargo.detalle || []).filter(item => {
      const okOrigen = !origen || String(item.origen || "").toLowerCase().includes(origen);
      const okProducto = !producto || String(item.producto || "").toLowerCase().includes(producto);
      const okCategoria = !categoria || String(item.categoria || "").toLowerCase().includes(categoria);

      return okOrigen && okProducto && okCategoria;
    });
  }

  function renderDetalleDescargoConsulta() {
    const tbody = document.getElementById("tablaDetalleDescargoConsultaBody");
    if (!tbody) return;

    const lista = obtenerDetalleFiltrado();

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="empty-row">No hay detalle</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.origen || ""}</td>
        <td>${item.numero || ""}</td>
        <td>${item.archivo || ""}</td>
        <td>${item.paciente || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.categoria || ""}</td>
        <td>${item.cantidad || ""}</td>
        <td>${item.lote || ""}</td>
        <td>${item.vencimiento || ""}</td>
        <td>${item.observacion || ""}</td>
        <td>${item.fechaProcedimiento || ""}</td>
        <td>${item.responsable || ""}</td>
      </tr>
    `).join("");
  }

  function exportarDetalleDescargoExcel() {
    const lista = obtenerDetalleFiltrado();

    if (!lista.length) {
      alert("No hay datos para exportar");
      return;
    }

    const filas = lista.map(item => ({
      "Origen": item.origen || "",
      "# Descargo": item.numero || "",
      "# Archivo": item.archivo || "",
      "Paciente": item.paciente || "",
      "Producto": item.producto || "",
      "Categoría": item.categoria || "",
      "Cant": item.cantidad || "",
      "Lote": item.lote || "",
      "Fecha expiración": item.vencimiento || "",
      "Obs": item.observacion || "",
      "Fecha procedimiento": item.fechaProcedimiento || "",
      "Responsable": item.responsable || ""
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle Descargo");

    XLSX.writeFile(wb, `${descargo.numero}_detalle.xlsx`);
  }

  async function descargarPdfDescargo() {
    try {
      const lista = obtenerDetalleFiltrado();

      if (!lista.length) {
        alert("No hay detalle para generar el PDF");
        return;
      }

      const descargoPdf = {
        numero: descargo.numero || "",
        fecha: descargo.fechaProcedimiento || "",
        origen: descargo.origen || "",
        paciente: descargo.paciente || "",
        archivo: descargo.archivo || "",
        responsable: descargo.responsable || "",
        observacion: descargo.observacion || "",
        detalle: lista.map(item => ({
          codigo: item.codigo || "",
          producto: item.producto || "",
          categoria: item.categoria || "",
          cantidad: item.cantidad || "",
          lote: item.lote || "",
          fechaExpiracion: item.vencimiento || "",
          observacion: item.observacion || "",
          casaComercial: item.casaComercial || "",
          codigoProveedor: item.codigoProveedor || ""
        }))
      };

      await generarPDFDescargo(descargoPdf);
    } catch (error) {
      console.error("Error generando PDF del descargo:", error);
      alert("No se pudo generar el PDF");
    }
  }

  renderDetalleDescargoConsulta();

  ["filtroDetDescOrigen", "filtroDetDescProducto", "filtroDetDescCategoria"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderDetalleDescargoConsulta);
    }
  });

  const btnPdf = document.getElementById("btnDescargarPdfDescargo");
  if (btnPdf) {
    btnPdf.addEventListener("click", descargarPdfDescargo);
  }

  const btnExportar = document.getElementById("btnExportarDetalleDescargoExcel");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarDetalleDescargoExcel);
  }

  const btnVolver = document.getElementById("btnVolverConsultarDescargos");
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      cambiarContenido("descargos-consultar");
    });
  }
}*/

/*async function mostrarDetalleDescargo(id) {
  try {
    const res = await fetch(`/api/descargos/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al obtener detalle del descargo");
      return;
    }

    const encabezado = data.encabezado || {};
    const detalle = Array.isArray(data.detalle) ? data.detalle : [];

    const nombrePaciente = [
      encabezado.pac_apellido1,
      encabezado.pac_apellido2,
      encabezado.pac_nombre1,
      encabezado.pac_nombre2
    ].filter(Boolean).join(" ");

    panelBox.innerHTML = `
      <div class="inventario-wrap">

        <div class="table-card">
          <div class="table-header">
            <h2>DETALLE DE DESCARGO ${encabezado.numero_descargo || ""}</h2>
          </div>

          <div style="margin-bottom:18px; color: rgba(255,255,255,0.78);">
            <strong>Paciente:</strong> ${nombrePaciente || ""}<br>
            <strong># Archivo:</strong> ${encabezado.archivo || ""}<br>
            <strong>Fecha procedimiento:</strong> ${encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : ""}<br>
            <strong>Responsable:</strong> ${encabezado.responsable || ""}
          </div>

          <div class="form-grid" style="margin-bottom:18px;">
            <div>
              <label>Origen</label>
              <input type="text" id="filtroDetDescOrigen" placeholder="Origen">
            </div>

            <div>
              <label>Producto</label>
              <input type="text" id="filtroDetDescProducto" placeholder="Producto">
            </div>

            <div>
              <label>Categoría</label>
              <input type="text" id="filtroDetDescCategoria" placeholder="Categoría">
            </div>
          </div>

          <div class="form-actions" style="margin-bottom:16px;">
            <button type="button" class="btn-primary" id="btnDescargarPdfDescargo">
              <i class="fa-solid fa-file-pdf"></i> Descargar PDF
            </button>
            <button type="button" class="btn-secondary" id="btnExportarDetalleDescargoExcel">Exportar Excel</button>
            <button type="button" class="btn-secondary" id="btnVolverConsultarDescargos">Volver</button>
          </div>

          <div class="table-responsive">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Origen</th>
                  <th># Descargo</th>
                  <th># Archivo</th>
                  <th>Paciente</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Cant</th>
                  <th>Lote</th>
                  <th>Fecha expiración</th>
                  <th>Obs</th>
                  <th>Fecha procedimiento</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody id="tablaDetalleDescargoConsultaBody">
                <tr>
                  <td colspan="12" class="empty-row">No hay detalle</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    function obtenerDetalleFiltrado() {
      const origen = (document.getElementById("filtroDetDescOrigen")?.value || "").toLowerCase().trim();
      const producto = (document.getElementById("filtroDetDescProducto")?.value || "").toLowerCase().trim();
      const categoria = (document.getElementById("filtroDetDescCategoria")?.value || "").toLowerCase().trim();

      return detalle.filter(item => {
        const okOrigen = !origen || String(encabezado.origen || "").toLowerCase().includes(origen);
        const okProducto = !producto || String(item.producto || "").toLowerCase().includes(producto);
        const okCategoria = !categoria || String(item.categoria || "").toLowerCase().includes(categoria);
        return okOrigen && okProducto && okCategoria;
      });
    }

    function renderDetalleDescargoConsulta() {
      const tbody = document.getElementById("tablaDetalleDescargoConsultaBody");
      if (!tbody) return;

      const lista = obtenerDetalleFiltrado();

      if (!lista.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" class="empty-row">No hay detalle</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = lista.map(item => `
        <tr>
          <td>${encabezado.origen || ""}</td>
          <td>${encabezado.numero_descargo || ""}</td>
          <td>${encabezado.archivo || ""}</td>
          <td>${nombrePaciente || ""}</td>
          <td>${item.producto || ""}</td>
          <td>${item.categoria || ""}</td>
          <td>${item.cantidad || ""}</td>
          <td>${item.lote || ""}</td>
          <td>${item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : ""}</td>
          <td>${item.observacion || ""}</td>
          <td>${encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : ""}</td>
          <td>${encabezado.responsable || ""}</td>
        </tr>
      `).join("");
    }

    function exportarDetalleDescargoExcel() {
      const lista = obtenerDetalleFiltrado();

      if (!lista.length) {
        alert("No hay datos para exportar");
        return;
      }

      const filas = lista.map(item => ({
        "Origen": encabezado.origen || "",
        "# Descargo": encabezado.numero_descargo || "",
        "# Archivo": encabezado.archivo || "",
        "Paciente": nombrePaciente || "",
        "Producto": item.producto || "",
        "Categoría": item.categoria || "",
        "Cant": item.cantidad || "",
        "Lote": item.lote || "",
        "Fecha expiración": item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : "",
        "Obs": item.observacion || "",
        "Fecha procedimiento": encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : "",
        "Responsable": encabezado.responsable || ""
      }));

      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalle Descargo");

      XLSX.writeFile(wb, `${encabezado.numero_descargo || "descargo"}_detalle.xlsx`);
    }

    async function descargarPdfDescargo() {
      try {
        const lista = obtenerDetalleFiltrado();

        if (!lista.length) {
          alert("No hay detalle para generar el PDF");
          return;
        }

        const descargoPdf = {
          numero: encabezado.numero_descargo || "",
          fecha: encabezado.fecha_procedimiento
            ? new Date(encabezado.fecha_procedimiento).toLocaleDateString("es-EC")
            : "",
          origen: encabezado.origen || "",
          paciente: nombrePaciente || "",
          archivo: encabezado.archivo || "",
          responsable: encabezado.responsable || "",
          observacion: encabezado.observacion || "",
          detalle: lista.map(item => ({
            codigo: item.codigo || "",
            producto: item.producto || "",
            categoria: item.categoria || "",
            cantidad: item.cantidad || "",
            lote: item.lote || "",
            fechaExpiracion: item.fecha_expiracion
              ? new Date(item.fecha_expiracion).toLocaleDateString("es-EC")
              : "",
            observacion: item.observacion || "",
            casaComercial: item.casa_comercial || "",
            codigoProveedor: item.codigo_proveedor || ""
          }))
        };

        await generarPDFDescargo(descargoPdf);
      } catch (error) {
        console.error("Error generando PDF del descargo:", error);
        alert("No se pudo generar el PDF");
      }
    }

    renderDetalleDescargoConsulta();

    ["filtroDetDescOrigen", "filtroDetDescProducto", "filtroDetDescCategoria"].forEach(idFiltro => {
      const el = document.getElementById(idFiltro);
      if (el) {
        el.addEventListener("input", renderDetalleDescargoConsulta);
      }
    });

    const btnPdf = document.getElementById("btnDescargarPdfDescargo");
    if (btnPdf) btnPdf.addEventListener("click", descargarPdfDescargo);

    const btnExportar = document.getElementById("btnExportarDetalleDescargoExcel");
    if (btnExportar) btnExportar.addEventListener("click", exportarDetalleDescargoExcel);

    const btnVolver = document.getElementById("btnVolverConsultarDescargos");
    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        cambiarContenido("descargos-consultar");
      });
    }
  } catch (error) {
    console.error("Error viendo detalle del descargo:", error);
    alert("Error al conectar con el servidor");
  }
}*/

async function mostrarDetalleDescargo(id) {
  try {
    const res = await fetch(`/api/descargos/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al obtener detalle del descargo");
      return;
    }

    const encabezado = data.encabezado || {};
    const detalle = Array.isArray(data.detalle) ? data.detalle : [];

    const nombrePaciente = [
      encabezado.pac_apellido1,
      encabezado.pac_apellido2,
      encabezado.pac_nombre1,
      encabezado.pac_nombre2
    ].filter(Boolean).join(" ");

    panelBox.innerHTML = `
      <div class="inventario-wrap">

        <div class="table-card">
          <div class="table-header">
            <h2>DETALLE DE DESCARGO ${encabezado.numero_descargo || ""}</h2>
          </div>

          <div style="margin-bottom:18px; color: rgba(255,255,255,0.78);">
            <strong>Paciente:</strong> ${nombrePaciente || ""}<br>
            <strong># Archivo:</strong> ${encabezado.archivo || ""}<br>
            <strong>Fecha procedimiento:</strong> ${encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : ""}<br>
            <strong>Responsable:</strong> ${encabezado.responsable || ""}
          </div>

          <div class="form-grid" style="margin-bottom:18px;">
            <div>
              <label>Origen</label>
              <input type="text" id="filtroDetDescOrigen" placeholder="Origen">
            </div>

            <div>
              <label>Producto</label>
              <input type="text" id="filtroDetDescProducto" placeholder="Producto">
            </div>

            <div>
              <label>Categoría</label>
              <input type="text" id="filtroDetDescCategoria" placeholder="Categoría">
            </div>
          </div>

          <div class="form-actions" style="margin-bottom:16px;">
            <button type="button" class="btn-primary" id="btnDescargarPdfDescargo">
              <i class="fa-solid fa-file-pdf"></i> Descargar PDF
            </button>
            <button type="button" class="btn-secondary" id="btnExportarDetalleDescargoExcel">Exportar Excel</button>
            <button type="button" class="btn-secondary" id="btnVolverConsultarDescargos">Volver</button>
          </div>

          <div class="table-responsive">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Origen</th>
                  <th># Descargo</th>
                  <th># Archivo</th>
                  <th>Paciente</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Cant</th>
                  <th>Lote</th>
                  <th>Fecha expiración</th>
                  <th>Obs</th>
                  <th>Fecha procedimiento</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody id="tablaDetalleDescargoConsultaBody">
                <tr>
                  <td colspan="12" class="empty-row">No hay detalle</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    function obtenerDetalleFiltrado() {
      const origen = (document.getElementById("filtroDetDescOrigen")?.value || "").toLowerCase().trim();
      const producto = (document.getElementById("filtroDetDescProducto")?.value || "").toLowerCase().trim();
      const categoria = (document.getElementById("filtroDetDescCategoria")?.value || "").toLowerCase().trim();

      return detalle.filter(item => {
        const okOrigen = !origen || String(encabezado.origen || "").toLowerCase().includes(origen);
        const okProducto = !producto || String(item.producto || "").toLowerCase().includes(producto);
        const okCategoria = !categoria || String(item.categoria || "").toLowerCase().includes(categoria);
        return okOrigen && okProducto && okCategoria;
      });
    }

    function renderDetalleDescargoConsulta() {
      const tbody = document.getElementById("tablaDetalleDescargoConsultaBody");
      if (!tbody) return;

      const lista = obtenerDetalleFiltrado();

      if (!lista.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" class="empty-row">No hay detalle</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = lista.map(item => `
        <tr>
          <td>${encabezado.origen || ""}</td>
          <td>${encabezado.numero_descargo || ""}</td>
          <td>${encabezado.archivo || ""}</td>
          <td>${nombrePaciente || ""}</td>
          <td>${item.producto || ""}</td>
          <td>${item.categoria || ""}</td>
          <td>${item.cantidad || ""}</td>
          <td>${item.lote || ""}</td>
          <td>${item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : ""}</td>
          <td>${item.observacion || ""}</td>
          <td>${encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : ""}</td>
          <td>${encabezado.responsable || ""}</td>
        </tr>
      `).join("");
    }

    function exportarDetalleDescargoExcel() {
      const lista = obtenerDetalleFiltrado();

      if (!lista.length) {
        alert("No hay datos para exportar");
        return;
      }

      const filas = lista.map(item => ({
        "Origen": encabezado.origen || "",
        "# Descargo": encabezado.numero_descargo || "",
        "# Archivo": encabezado.archivo || "",
        "Paciente": nombrePaciente || "",
        "Producto": item.producto || "",
        "Categoría": item.categoria || "",
        "Cant": item.cantidad || "",
        "Lote": item.lote || "",
        "Fecha expiración": item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : "",
        "Obs": item.observacion || "",
        "Fecha procedimiento": encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : "",
        "Responsable": encabezado.responsable || ""
      }));

      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalle Descargo");

      XLSX.writeFile(wb, `${encabezado.numero_descargo || "descargo"}_detalle.xlsx`);
    }

    async function descargarPdfDescargo() {
      try {
        const lista = obtenerDetalleFiltrado();

        if (!lista.length) {
          alert("No hay detalle para generar el PDF");
          return;
        }

        const descargoPdf = {
          numero: encabezado.numero_descargo || "",
          fecha: encabezado.fecha_procedimiento
            ? new Date(encabezado.fecha_procedimiento).toLocaleDateString("es-EC")
            : "",
          origen: encabezado.origen || "",
          paciente: nombrePaciente || "",
          archivo: encabezado.archivo || "",
          responsable: encabezado.responsable || "",
          observacion: encabezado.observacion || "",
          detalle: lista.map(item => ({
            codigo: item.codigo || "",
            producto: item.producto || "",
            categoria: item.categoria || "",
            cantidad: item.cantidad || "",
            lote: item.lote || "",
            fechaExpiracion: item.fecha_expiracion
              ? new Date(item.fecha_expiracion).toLocaleDateString("es-EC")
              : "",
            observacion: item.observacion || "",
            casaComercial: item.casa_comercial || "",
            codigoProveedor: item.codigo_proveedor || ""
          }))
        };

        await generarPDFDescargo(descargoPdf);
      } catch (error) {
        console.error("Error generando PDF del descargo:", error);
        alert("No se pudo generar el PDF");
      }
    }

    renderDetalleDescargoConsulta();

    ["filtroDetDescOrigen", "filtroDetDescProducto", "filtroDetDescCategoria"].forEach(idFiltro => {
      const el = document.getElementById(idFiltro);
      if (el) el.addEventListener("input", renderDetalleDescargoConsulta);
    });

    const btnPdf = document.getElementById("btnDescargarPdfDescargo");
    if (btnPdf) btnPdf.addEventListener("click", descargarPdfDescargo);

    const btnExportar = document.getElementById("btnExportarDetalleDescargoExcel");
    if (btnExportar) btnExportar.addEventListener("click", exportarDetalleDescargoExcel);

    const btnVolver = document.getElementById("btnVolverConsultarDescargos");
    if (btnVolver) {
      btnVolver.addEventListener("click", () => {
        cambiarContenido("descargos-consultar");
      });
    }
  } catch (error) {
    console.error("Error viendo detalle del descargo:", error);
    alert("Error al conectar con el servidor");
  }
}

function obtenerNombreCompletoUsuarioSistema(u) {
  return [
    u.apellido1,
    u.apellido2,
    u.nombre1,
    u.nombre2
  ].filter(Boolean).join(" ");
}

function limpiarFormularioUsuarioSistema() {
  const form = document.getElementById("formUsuarioSistema");
  if (form) form.reset();

  editUsuarioIndex = -1;

  const btnGuardar = document.getElementById("btnGuardarUsuarioSistema");
  const btnCancelar = document.getElementById("btnCancelarUsuarioSistema");

  if (btnGuardar) btnGuardar.textContent = "Guardar usuario";
  if (btnCancelar) btnCancelar.style.display = "none";
}

async function reactivarPaciente(id) {
  try {
    const res = await fetch(`/api/pacientes/reactivar/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al reactivar paciente");
      return;
    }

    alert("Paciente reactivado correctamente");

    // refresca la tabla de no atendidos
    renderTablaPacientesNoAtendidos();

  } catch (error) {
    console.error("Error reactivando paciente:", error);
    alert("Error al conectar con el servidor");
  }
}

async function renderTablaDescargosConsulta() {
  const tbody = document.getElementById("tablaDescargosBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/descargos");
    const data = await res.json().catch(() => ([]));

    const fecha = document.getElementById("filtroDescFecha")?.value || "";
    const paciente = (document.getElementById("filtroDescPaciente")?.value || "").toLowerCase().trim();
    const archivo = (document.getElementById("filtroDescArchivo")?.value || "").toLowerCase().trim();
    const numero = (document.getElementById("filtroDescNumero")?.value || "").toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(d => {
      const nombrePaciente = String(
        d.nombre_paciente ||
        [
          d.pac_apellido1,
          d.pac_apellido2,
          d.pac_nombre1,
          d.pac_nombre2
        ].filter(Boolean).join(" ")
      ).toLowerCase();

      const fechaProc = d.fecha_procedimiento
        ? String(d.fecha_procedimiento).slice(0, 10)
        : "";

      return (
        (!fecha || fechaProc === fecha) &&
        (!paciente || nombrePaciente.includes(paciente)) &&
        (!archivo || String(d.archivo || "").toLowerCase().includes(archivo)) &&
        (!numero || String(d.numero_descargo || "").toLowerCase().includes(numero))
      );
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">No hay descargos registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(d => {
      const nombrePaciente = String(
        d.nombre_paciente ||
        [
          d.pac_apellido1,
          d.pac_apellido2,
          d.pac_nombre1,
          d.pac_nombre2
        ].filter(Boolean).join(" ")
      );

      return `
        <tr>
          <td>${d.fecha_procedimiento ? String(d.fecha_procedimiento).slice(0, 10) : ""}</td>
          <td>${nombrePaciente}</td>
          <td>${d.archivo || ""}</td>
          <td>
            <button class="btn-table edit" onclick="mostrarDetalleDescargo(${d.id})">
            ${d.numero_descargo || ""}
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error("Error cargando consulta descargos:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">Error al cargar descargos</td>
      </tr>
    `;
  }
}


async function verDetalleDescargo(id) {
  try {
    const res = await fetch(`/api/descargos/${id}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al obtener detalle del descargo");
      return;
    }

    const h = data.encabezado;
    const detalle = Array.isArray(data.detalle) ? data.detalle : [];

    const nombrePaciente = [
      h.pac_apellido1,
      h.pac_apellido2,
      h.pac_nombre1,
      h.pac_nombre2
    ].filter(Boolean).join(" ");

    panelBox.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <h2>Detalle del descargo ${h.numero_descargo}</h2>
        </div>

        <div style="line-height:1.9; margin-bottom:18px;">
          <p><strong># Descargo:</strong> ${h.numero_descargo}</p>
          <p><strong>Origen:</strong> ${h.origen}</p>
          <p><strong># Archivo:</strong> ${h.archivo}</p>
          <p><strong>Paciente:</strong> ${nombrePaciente}</p>
          <p><strong>Fecha procedimiento:</strong> ${h.fecha_procedimiento ? String(h.fecha_procedimiento).slice(0, 10) : ""}</p>
          <p><strong>Responsable:</strong> ${h.responsable || ""}</p>
        </div>

        <div class="table-responsive">
          <table class="patient-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Lote</th>
                <th>F. expiración</th>
                <th>Obs</th>
              </tr>
            </thead>
            <tbody>
              ${
                detalle.length
                  ? detalle.map(x => `
                    <tr>
                      <td>${x.codigo || ""}</td>
                      <td>${x.producto || ""}</td>
                      <td>${x.categoria || ""}</td>
                      <td>${x.cantidad || ""}</td>
                      <td>${x.lote || ""}</td>
                      <td>${x.fecha_expiracion ? String(x.fecha_expiracion).slice(0, 10) : ""}</td>
                      <td>${x.observacion || ""}</td>
                    </tr>
                  `).join("")
                  : `<tr><td colspan="7" class="empty-row">No hay detalle</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div class="form-actions" style="margin-top:20px;">
          <button class="btn-secondary" onclick="cambiarContenido('descargos-consultar')">Volver</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error viendo detalle descargo:", error);
    alert("Error al conectar con el servidor");
  }
}


async function exportarDescargosExcel() {
  try {
    const res = await fetch("/api/descargos");
    const data = await res.json().catch(() => ([]));

    const fecha = document.getElementById("filtroDescFecha")?.value || "";
    const paciente = (document.getElementById("filtroDescPaciente")?.value || "").toLowerCase().trim();
    const archivo = (document.getElementById("filtroDescArchivo")?.value || "").toLowerCase().trim();
    const numero = (document.getElementById("filtroDescNumero")?.value || "").toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(d => {
      const nombrePaciente = String(
        d.nombre_paciente ||
        [
          d.pac_apellido1,
          d.pac_apellido2,
          d.pac_nombre1,
          d.pac_nombre2
        ].filter(Boolean).join(" ")
      ).toLowerCase();

      const fechaProc = d.fecha_procedimiento
        ? String(d.fecha_procedimiento).slice(0, 10)
        : "";

      return (
        (!fecha || fechaProc === fecha) &&
        (!paciente || nombrePaciente.includes(paciente)) &&
        (!archivo || String(d.archivo || "").toLowerCase().includes(archivo)) &&
        (!numero || String(d.numero_descargo || "").toLowerCase().includes(numero))
      );
    });

    if (!lista.length) {
      alert("No hay descargos para exportar con esos filtros");
      return;
    }

    const filasResumen = lista.map(d => {
      const nombrePaciente = String(
        d.nombre_paciente ||
        [
          d.pac_apellido1,
          d.pac_apellido2,
          d.pac_nombre1,
          d.pac_nombre2
        ].filter(Boolean).join(" ")
      );

      return {
        "# Descargo": d.numero_descargo || "",
        "Fecha procedimiento": d.fecha_procedimiento ? String(d.fecha_procedimiento).slice(0, 10) : "",
        "Paciente": nombrePaciente,
        "# Archivo": d.archivo || "",
        "Origen": d.origen || "",
        "Responsable": d.responsable || "",
        "Fecha registro": d.fecha_creacion ? String(d.fecha_creacion).slice(0, 19).replace("T", " ") : ""
      };
    });

    const filasDetalle = [];

    for (const d of lista) {
      const resDetalle = await fetch(`/api/descargos/${d.id}`);
      const dataDetalle = await resDetalle.json().catch(() => ({}));

      if (!resDetalle.ok) continue;

      const encabezado = dataDetalle.encabezado || {};
      const detalle = Array.isArray(dataDetalle.detalle) ? dataDetalle.detalle : [];

      const nombrePaciente = String(
        encabezado.nombre_paciente ||
        d.nombre_paciente ||
        [
          encabezado.pac_apellido1,
          encabezado.pac_apellido2,
          encabezado.pac_nombre1,
          encabezado.pac_nombre2
        ].filter(Boolean).join(" ")
      );

      detalle.forEach(item => {
        filasDetalle.push({
          "# Descargo": encabezado.numero_descargo || d.numero_descargo || "",
          "Fecha procedimiento": encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : (d.fecha_procedimiento ? String(d.fecha_procedimiento).slice(0, 10) : ""),
          "Paciente": nombrePaciente,
          "# Archivo": encabezado.archivo || d.archivo || "",
          "Origen": encabezado.origen || d.origen || "",
          "Código": item.codigo || "",
          "Producto": item.producto || "",
          "Categoría": item.categoria || "",
          "Cantidad": Number(item.cantidad || 0),
          "Lote": item.lote || "",
          "Fecha expiración": item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : "",
          "Observación": item.observacion || "",
          "Responsable": encabezado.responsable || d.responsable || ""
        });
      });
    }

    const wb = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.json_to_sheet(filasResumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Descargos");

    const wsDetalle = XLSX.utils.json_to_sheet(
      filasDetalle.length
        ? filasDetalle
        : [{ "Detalle": "No hay detalle para los filtros seleccionados" }]
    );
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle descargos");

    XLSX.writeFile(wb, "descargos_filtrados.xlsx");
  } catch (error) {
    console.error("Error exportando descargos:", error);
    alert("Error al exportar descargos");
  }
}

function inicializarModuloDescargosConsultar() {
  renderTablaDescargosConsulta();

  [
    "filtroDescFecha",
    "filtroDescPaciente",
    "filtroDescArchivo",
    "filtroDescNumero"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderTablaDescargosConsulta);
      el.addEventListener("change", renderTablaDescargosConsulta);
    }
  });

  const btnExportar = document.getElementById("btnExportarDescargosExcel");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarDescargosExcel);
  }
}

async function inicializarModuloDescargosConsolidados() {
  const inputFecha = document.getElementById("filtroConsolidadoFecha");
  const selectPaciente = document.getElementById("filtroConsolidadoPaciente");
  const tbody = document.getElementById("tablaDescargosConsolidadosBody");
  const resumen = document.getElementById("resumenConsolidadoDescargo");
  const btnPdf = document.getElementById("btnGenerarPdfConsolidado");

  if (!inputFecha || !selectPaciente || !tbody || !resumen || !btnPdf) return;

  let consolidadoActual = null;

  async function cargarPacientesPorFecha() {
    const fecha = inputFecha.value;

    selectPaciente.innerHTML = `<option value="">Seleccione</option>`;
    consolidadoActual = null;

    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-row">No hay información para mostrar</td>
      </tr>
    `;

    if (!fecha) {
      resumen.innerHTML = `Seleccione una fecha y un paciente para ver el consolidado.`;
      return;
    }

    try {
      const res = await fetch(`/api/descargos-consolidados/pacientes?fecha=${encodeURIComponent(fecha)}`);
      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        resumen.innerHTML = data.error || "Error al cargar pacientes";
        return;
      }

      if (!Array.isArray(data) || !data.length) {
        resumen.innerHTML = `No hay pacientes con descargos en la fecha seleccionada.`;
        return;
      }

      selectPaciente.innerHTML = `
        <option value="">Seleccione</option>
        ${data.map(p => `
          <option value="${p.paciente_id}">
            ${p.archivo || ""} - ${p.nombre_paciente || ""}
          </option>
        `).join("")}
      `;

      resumen.innerHTML = `Seleccione un paciente para ver el consolidado.`;
    } catch (error) {
      console.error("Error cargando pacientes consolidados:", error);
      resumen.innerHTML = `Error al cargar pacientes.`;
    }
  }

  async function cargarConsolidado() {
    const fecha = inputFecha.value;
    const pacienteId = selectPaciente.value;

    consolidadoActual = null;

    if (!fecha || !pacienteId) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-row">No hay información para mostrar</td>
        </tr>
      `;
      resumen.innerHTML = `Seleccione una fecha y un paciente para ver el consolidado.`;
      return;
    }

    try {
      const res = await fetch(`/api/descargos-consolidados/detalle?fecha=${encodeURIComponent(fecha)}&pacienteId=${encodeURIComponent(pacienteId)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="empty-row">Error al cargar consolidado</td>
          </tr>
        `;
        resumen.innerHTML = data.error || "Error al cargar consolidado";
        return;
      }

      consolidadoActual = data;

      const encabezado = data.encabezado || {};
      const detalle = Array.isArray(data.detalle) ? data.detalle : [];

      resumen.innerHTML = `
        <strong>Paciente:</strong> ${encabezado.nombre_paciente || ""}<br>
        <strong># Archivo:</strong> ${encabezado.archivo || ""}<br>
        <strong>Fecha de procedimiento:</strong> ${encabezado.fecha_procedimiento ? String(encabezado.fecha_procedimiento).slice(0, 10) : ""}
      `;

      if (!detalle.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="empty-row">No hay detalle para mostrar</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = detalle.map(item => `
        <tr>
          <td>${item.numero_descargo || ""}</td>
          <td>${item.origen || ""}</td>
          <td>${item.codigo || ""}</td>
          <td>${item.producto || ""}</td>
          <td>${item.categoria || ""}</td>
          <td>${item.cantidad || 0}</td>
          <td>${item.lote || ""}</td>
          <td>${item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : ""}</td>
          <td>${item.observacion || ""}</td>
          <td>${item.responsable || ""}</td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Error cargando detalle consolidado:", error);
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-row">Error al cargar consolidado</td>
        </tr>
      `;
      resumen.innerHTML = `Error al cargar consolidado.`;
    }
  }

  inputFecha.addEventListener("change", cargarPacientesPorFecha);
  selectPaciente.addEventListener("change", cargarConsolidado);

  btnPdf.addEventListener("click", async () => {
  if (!selectPaciente.value) {
    alert("Debe filtrar un paciente");
    return;
  }

  if (!consolidadoActual) {
    alert("No hay información consolidada para generar PDF");
    return;
  }

  try {
    await generarPDFDescargoConsolidado(consolidadoActual);
  } catch (error) {
    console.error("Error generando PDF consolidado:", error);
    alert("Error al generar el PDF");
  }
});
}

async function generarPDFDescargo(descargo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const plantilla = await cargarImagenComoDataURL("/images/plantilla_reporte.png");

  const drawBackground = () => {
    doc.addImage(plantilla, "PNG", 0, 0, pageWidth, pageHeight);
  };

  const filas = (Array.isArray(descargo.detalle) && descargo.detalle.length)
    ? descargo.detalle.map(item => [
        item.codigo || "",
        item.producto || "",
        item.categoria || "",
        String(item.cantidad || 0),
        item.lote || "",
        item.fechaExpiracion || "",
        item.observacion || ""
      ])
    : [["", "No hay detalle", "", "", "", "", ""]];

  doc.autoTable({
    startY: 210,
    head: [[
      "Código",
      "Producto",
      "Categoría",
      "Cant.",
      "Lote",
      "F. Exp.",
      "Obs"
    ]],
    body: filas,
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
      0: { cellWidth: 50 },
      1: { cellWidth: 130 },
      2: { cellWidth: 65 },
      3: { cellWidth: 35, halign: "center" },
      4: { cellWidth: 55 },
      5: { cellWidth: 50 },
      6: { cellWidth: 110 }
    },
    willDrawPage: function () {
      drawBackground();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("REPORTE DE DESCARGO", pageWidth / 2, 92, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Paciente: ${descargo.paciente || ""}`, 50, 135);
      doc.text(`# Archivo: ${descargo.archivo || ""}`, 50, 153);
      doc.text(`Fecha de procedimiento: ${descargo.fecha || ""}`, 50, 171);

      doc.text(`N° Descargo: ${descargo.numero || ""}`, 330, 135);
      doc.text(`Origen: ${descargo.origen || ""}`, 330, 153);
      doc.text(`Responsable: ${descargo.responsable || ""}`, 330, 171);

      doc.text(`Total de productos: ${Array.isArray(descargo.detalle) ? descargo.detalle.length : 0}`, 50, 189);
    }
  });

  const numero = String(descargo.numero || "descargo")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_");

  doc.save(`${numero}.pdf`);
}

async function generarPDFDescargoConsolidado(consolidado) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const plantilla = await cargarImagenComoDataURL("/images/plantilla_reporte.png");

  const encabezado = consolidado.encabezado || {};
  const detalle = Array.isArray(consolidado.detalle) ? consolidado.detalle : [];

  const drawBackground = () => {
    doc.addImage(plantilla, "PNG", 0, 0, pageWidth, pageHeight);
  };

  const filas = detalle.length
    ? detalle.map(item => [
        item.numero_descargo || "",
        item.origen || "",
        item.codigo || "",
        item.producto || "",
        item.categoria || "",
        String(item.cantidad || 0),
        item.lote || "",
        item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : "",
        item.observacion || "",
        item.responsable || ""
      ])
    : [["", "", "", "No hay detalle", "", "", "", "", "", ""]];

  doc.autoTable({
    startY: 210,
    head: [[
      "# Descargo",
      "Origen",
      "Código",
      "Producto",
      "Categoría",
      "Cant.",
      "Lote",
      "F. Exp.",
      "Obs",
      "Responsable"
    ]],
    body: filas,
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
      1: { cellWidth: 48 },
      2: { cellWidth: 42 },
      3: { cellWidth: 95 },
      4: { cellWidth: 55 },
      5: { cellWidth: 30, halign: "center" },
      6: { cellWidth: 45 },
      7: { cellWidth: 45 },
      8: { cellWidth: 70 },
      9: { cellWidth: 60 }
    },
    willDrawPage: function () {
      drawBackground();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("REPORTE CONSOLIDADO DE DESCARGOS", pageWidth / 2, 92, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Paciente: ${encabezado.nombre_paciente || ""}`, 50, 135);
      doc.text(`# Archivo: ${encabezado.archivo || ""}`, 50, 153);
      doc.text(
        `Fecha de procedimiento: ${
          encabezado.fecha_procedimiento
            ? String(encabezado.fecha_procedimiento).slice(0, 10)
            : ""
        }`,
        50,
        171
      );

      doc.text(`Total de registros: ${detalle.length}`, 50, 189);
    }
  });

  const nombrePaciente = String(encabezado.nombre_paciente || "paciente")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_");

  const fecha = encabezado.fecha_procedimiento
    ? String(encabezado.fecha_procedimiento).slice(0, 10)
    : "sin_fecha";

  doc.save(`descargo_consolidado_${nombrePaciente}_${fecha}.pdf`);
}

async function renderTablaConsignacionDescargos() {
  const tbody = document.getElementById("tablaConsignacionBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/descargos/consignacion");
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-row">Error al cargar registros</td>
        </tr>
      `;
      return;
    }

    const fecha = document.getElementById("filtroConsigFecha")?.value || "";
    const paciente = (document.getElementById("filtroConsigPaciente")?.value || "").toLowerCase().trim();
    const casa = (document.getElementById("filtroConsigCasa")?.value || "").toLowerCase().trim();
    const codigo = (document.getElementById("filtroConsigCodigo")?.value || "").toLowerCase().trim();
    const codigoProveedor = (document.getElementById("filtroConsigCodigoProveedor")?.value || "").toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(item => {
      const fechaProc = item.fecha_procedimiento ? String(item.fecha_procedimiento).slice(0, 10) : "";
      return (
        (!fecha || fechaProc === fecha) &&
        (!paciente || String(item.nombre_paciente || "").toLowerCase().includes(paciente)) &&
        (!casa || String(item.casa_comercial || "").toLowerCase().includes(casa)) &&
        (!codigo || String(item.codigo || "").toLowerCase().includes(codigo)) &&
        (!codigoProveedor || String(item.codigo_proveedor || "").toLowerCase().includes(codigoProveedor))
      );
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-row">No hay registros pendientes</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>
          <input type="checkbox" class="check-consignacion" value="${item.id}">
        </td>
        <td>${item.fecha_procedimiento ? String(item.fecha_procedimiento).slice(0, 10) : ""}</td>
        <td>${item.nombre_paciente || ""}</td>
        <td>${item.casa_comercial || ""}</td>
        <td>${item.codigo || ""}</td>
        <td>${item.codigo_proveedor || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.cantidad || 0}</td>
        <td>${item.lote || ""}</td>
        <td>${item.fecha_expiracion ? String(item.fecha_expiracion).slice(0, 10) : ""}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error cargando consignación:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-row">Error al cargar registros</td>
      </tr>
    `;
  }
}

function inicializarModuloConsignacionDescargos() {
  renderTablaConsignacionDescargos();

  [
    "filtroConsigFecha",
    "filtroConsigPaciente",
    "filtroConsigCasa",
    "filtroConsigCodigo",
    "filtroConsigCodigoProveedor"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderTablaConsignacionDescargos);
      el.addEventListener("change", renderTablaConsignacionDescargos);
    }
  });

  const btnLimpiar = document.getElementById("btnLimpiarFiltrosConsignacion");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      const ids = [
        "filtroConsigFecha",
        "filtroConsigPaciente",
        "filtroConsigCasa",
        "filtroConsigCodigo",
        "filtroConsigCodigoProveedor"
      ];

      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      renderTablaConsignacionDescargos();
    });
  }

  const btnEnviar = document.getElementById("btnEnviarCorreoConsignacion");
  if (btnEnviar) {
    btnEnviar.addEventListener("click", () => {
      const checks = Array.from(document.querySelectorAll(".check-consignacion:checked"));
      if (!checks.length) {
        alert("Seleccione al menos un registro");
        return;
      }

      const ok = confirm("¿Está seguro de enviar el reporte?");
      if (!ok) return;

      fetch("/api/descargos/consignacion/enviar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    ids: checks.map(ch => Number(ch.value))
  })
})
  .then(res => res.json().then(data => ({ ok: res.ok, data })))
  .then(async ({ ok, data }) => {
    if (!ok) {
      alert(data.error || "Error al enviar el reporte");
      return;
    }

    alert("Reporte enviado correctamente");
    await renderTablaConsignacionDescargos();
  })
  .catch(error => {
    console.error("Error enviando consignación:", error);
    alert("Error al conectar con el servidor");
  });
    });
  }
}

async function renderTablaConsignacionEnviada() {
  const tbody = document.getElementById("tablaConsignacionEnviadaBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/descargos/consignacion/enviados");
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="empty-row">Error al cargar historial</td>
        </tr>
      `;
      return;
    }

    const fechaProc = document.getElementById("filtroConsigEnvFechaProc")?.value || "";
    const fechaEnvio = document.getElementById("filtroConsigEnvFechaEnvio")?.value || "";
    const paciente = (document.getElementById("filtroConsigEnvPaciente")?.value || "").toLowerCase().trim();
    const casa = (document.getElementById("filtroConsigEnvCasa")?.value || "").toLowerCase().trim();
    const codigo = (document.getElementById("filtroConsigEnvCodigo")?.value || "").toLowerCase().trim();
    const codigoProveedor = (document.getElementById("filtroConsigEnvCodigoProveedor")?.value || "").toLowerCase().trim();

    const lista = (Array.isArray(data) ? data : []).filter(item => {
      return (
        (!fechaProc || String(item.fecha_procedimiento || "") === fechaProc) &&
        (!fechaEnvio || String(item.fecha_envio_reporte || "") === fechaEnvio) &&
        (!paciente || String(item.nombre_paciente || "").toLowerCase().includes(paciente)) &&
        (!casa || String(item.casa_comercial || "").toLowerCase().includes(casa)) &&
        (!codigo || String(item.codigo || "").toLowerCase().includes(codigo)) &&
        (!codigoProveedor || String(item.codigo_proveedor || "").toLowerCase().includes(codigoProveedor))
      );
    });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="empty-row">No hay registros enviados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.fecha_procedimiento || ""}</td>
        <td>${item.nombre_paciente || ""}</td>
        <td>${item.casa_comercial || ""}</td>
        <td>${item.codigo || ""}</td>
        <td>${item.codigo_proveedor || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.cantidad || 0}</td>
        <td>${item.lote || ""}</td>
        <td>${item.fecha_expiracion || ""}</td>
        <td>${item.fecha_envio_reporte || ""}</td>
        <td>${item.enviado_por || ""}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error cargando historial consignación enviada:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-row">Error al cargar historial</td>
      </tr>
    `;
  }
}

function inicializarModuloConsignacionEnviada() {
  renderTablaConsignacionEnviada();

  [
    "filtroConsigEnvFechaProc",
    "filtroConsigEnvFechaEnvio",
    "filtroConsigEnvPaciente",
    "filtroConsigEnvCasa",
    "filtroConsigEnvCodigo",
    "filtroConsigEnvCodigoProveedor"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderTablaConsignacionEnviada);
      el.addEventListener("change", renderTablaConsignacionEnviada);
    }
  });

  const btnLimpiar = document.getElementById("btnLimpiarFiltrosConsignacionEnviada");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      [
        "filtroConsigEnvFechaProc",
        "filtroConsigEnvFechaEnvio",
        "filtroConsigEnvPaciente",
        "filtroConsigEnvCasa",
        "filtroConsigEnvCodigo",
        "filtroConsigEnvCodigoProveedor"
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      renderTablaConsignacionEnviada();
    });
  }
}

/*async function inicializarModuloImportarDatos() {
  const btnProd = document.getElementById("btnImportarProductos");
  const fileProd = document.getElementById("fileImportProductos");
  const outProd = document.getElementById("importProductosResultado");

  const btnPac = document.getElementById("btnImportarPacientes");
  const filePac = document.getElementById("fileImportPacientes");
  const outPac = document.getElementById("importPacientesResultado");

  if (btnProd && fileProd) {
    btnProd.addEventListener("click", () => fileProd.click());

    fileProd.addEventListener("change", async () => {
      if (!fileProd.files?.length) return;

      const fd = new FormData();
      fd.append("file", fileProd.files[0]);

      const resp = await fetch("/api/import/productos", { method: "POST", body: fd });
      const data = await resp.json();

      outProd.style.display = "block";
      outProd.textContent = JSON.stringify(data, null, 2);

      fileProd.value = "";
    });
  }

  if (btnPac && filePac) {
    btnPac.addEventListener("click", () => filePac.click());

    filePac.addEventListener("change", async () => {
      if (!filePac.files?.length) return;

      const fd = new FormData();
      fd.append("file", filePac.files[0]);

      const resp = await fetch("/api/import/pacientes", { method: "POST", body: fd });
      const data = await resp.json();

      outPac.style.display = "block";
      outPac.textContent = JSON.stringify(data, null, 2);

      filePac.value = "";
    });
  }
}*/


/* =========================
   CAMBIO DE CONTENIDO  / CAMBIARCONTENIDO / SECCIONES
========================= */

function cambiarContenido(seccion) {

  const data =
    contenido[seccion];


  if (!data) {
    return;
  }


  /* =========================================================
     CONTROL DE PERMISOS DE SECCIONES
     ========================================================= */

  /*
    SEGUNDA CAPA DE CONTROL EN FRONTEND.

    Aunque alguien intente ejecutar:

    cambiarContenido("inventario-kardex")

    manualmente desde la consola,
    verificamos que tenga permiso.
  */

  const permisoRequerido =
    MAPA_PERMISOS_SECCIONES[
      seccion
    ];


  if (
    permisoRequerido &&
    permisosUsuarioActual.size > 0 &&
    !permisosUsuarioActual.has(
      permisoRequerido
    )
  ) {

    alert(
      "No tiene permiso para acceder a esta sección."
    );

    return;

  }


  /* =========================================================
     TÍTULO Y SUBTÍTULO
     ========================================================= */

  tituloSeccion.textContent =
    data.titulo;


  subtituloSeccion.textContent =
    data.subtitulo;


  /* =========================================================
     ANIMACIÓN DE CAMBIO DE CONTENIDO
     ========================================================= */

  panelBox.style.opacity =
    "0";


  panelBox.style.transform =
    "translateY(12px)";


  setTimeout(
    () => {

      /* =====================================================
         INSERTAR HTML
         ===================================================== */

      panelBox.innerHTML =
        data.html;


      panelBox.style.opacity =
        "1";


      panelBox.style.transform =
        "translateY(0)";


      /* =====================================================
         DASHBOARD
         ===================================================== */

      if (
        seccion ===
        "dashboard"
      ) {

        cargarAlertaExpiracionDashboard();

      }


      /* =====================================================
         PACIENTES
         ===================================================== */

      if (
        seccion ===
        "pacientes"
      ) {

        inicializarModuloPacientes();

      }


      if (
        seccion ===
        "pacientes-admision"
      ) {

        inicializarModuloAdmisionPacientes();

      }


      if (
        seccion ===
        "pacientes-lista"
      ) {

        const buscar =
          document.getElementById(
            "buscarPacienteAdmision"
          );


        const btnExportar =
          document.getElementById(
            "btnExportarPacientesExcel"
          );


        renderTablaPacientesAdmision();


        if (buscar) {

          buscar.addEventListener(
            "input",
            () => {

              renderTablaPacientesAdmision(
                buscar.value
              );

            }
          );

        }


        if (btnExportar) {

          btnExportar.addEventListener(
            "click",
            exportarPacientesAdmisionExcel
          );

        }

      }


      if (
        seccion ===
        "pacientes-no-atendidos"
      ) {

        const buscar =
          document.getElementById(
            "buscarPacienteNoAtendido"
          );


        const btnExportar =
          document.getElementById(
            "btnExportarNoAtendidosExcel"
          );


        renderTablaPacientesNoAtendidos();


        if (buscar) {

          buscar.addEventListener(
            "input",
            () => {

              renderTablaPacientesNoAtendidos(
                buscar.value
              );

            }
          );

        }


        if (btnExportar) {

          btnExportar.addEventListener(
            "click",
            exportarPacientesNoAtendidosExcel
          );

        }

      }


      if (
        seccion ===
        "pacientes-complementarios"
      ) {

        inicializarModuloPacienteComplementario();

      }


      /* =====================================================
         INVENTARIO
         ===================================================== */

      if (
        seccion ===
        "inventario-productos"
      ) {

        inicializarModuloProductosGeneral();

      }


      if (
        seccion ===
        "inventario-entrada"
      ) {

        inicializarModuloInventario();

      }


      if (
        seccion ===
        "inventario-stock"
      ) {

        inicializarModuloStock();

      }


      if (
        seccion ===
        "inventario-salida"
      ) {

        inicializarModuloSalidaInventario();

      }


      if (
        seccion ===
        "inventario-traslados"
      ) {

        inicializarModuloTraslados();

      }


      if (
        seccion ===
        "inventario-kardex"
      ) {

        inicializarModuloKardex();

      }


      /* =====================================================
         HISTORIAS CLÍNICAS
         ===================================================== */

      if (
        seccion ===
        "historias-clinicas"
      ) {

        inicializarModuloHistoriasClinicas();

      }


      if (
        seccion ===
        "hc-documentos-generados"
      ) {

        inicializarModuloDocumentosGeneradosHC();

      }


      /* =====================================================
         COMPRAS
         ===================================================== */

      if (
        seccion ===
        "compras-proveedores-registrar"
      ) {

        inicializarModuloProveedores();

      }


      if (
        seccion ===
        "compras-proveedores-consultar"
      ) {

        inicializarModuloConsultarProveedores();

      }


      if (
        seccion ===
        "compras-ingresar"
      ) {

        inicializarModuloCompras();

      }


      if (
        seccion ===
        "compras-consultar"
      ) {

        inicializarModuloConsultarCompras();

      }


      /* =====================================================
         CAMPAÑAS
         ===================================================== */

      if (
        seccion ===
        "campanas-reclutadores"
      ) {

        inicializarModuloReclutadores();

      }


      /* =====================================================
         DESCARGOS
         ===================================================== */

      if (
        seccion ===
        "descargos-registrar"
      ) {

        inicializarModuloDescargosRegistrar();

      }


      if (
        seccion ===
        "descargos-consultar"
      ) {

        inicializarModuloDescargosConsultar();

      }


      if (
        seccion ===
        "descargos-consolidados"
      ) {

        inicializarModuloDescargosConsolidados();

      }


      if (
        seccion ===
        "descargos-consignacion"
      ) {

        inicializarModuloConsignacionDescargos();

      }


      if (
        seccion ===
        "descargos-consignacion-enviados"
      ) {

        inicializarModuloConsignacionEnviada();

      }


      /* =====================================================
         UTILIDADES
         ===================================================== */

      if (
        seccion ===
        "utilidades-importar"
      ) {

        inicializarModuloImportarDatos();

      }


      if (
        seccion ===
        "utilidades-control-expiracion"
      ) {

        paginaControlExpiracion =
          1;


        cargarControlExpiracion();

      }


      if (
        seccion ===
        "utilidades-cuarentena"
      ) {

        paginaCuarentena =
          1;


        cargarCuarentena();

      }


      /* =====================================================
         CONFIGURACIONES
         ===================================================== */

      if (
        seccion ===
        "config-archivo"
      ) {

        inicializarModuloConfigArchivo();

      }


      if (
        seccion ===
        "config-permisos"
      ) {

        inicializarModuloPermisos();

      }


      if (
        seccion ===
        "config-desplegables"
      ) {

        inicializarModuloConfigDesplegables();

      }


      if (
        seccion ===
        "config-bodegas"
      ) {

        inicializarModuloBodegas();

      }


      if (
        seccion ===
        "config-categorias-producto"
      ) {

        inicializarModuloCategoriasProducto();

      }


      if (
        seccion ===
        "config-casas"
      ) {

        inicializarModuloCasasComerciales();

      }


      if (
        seccion ===
        "config-profesionales-salud"
      ) {

        inicializarModuloProfesionalesSalud();

      }


      if (
        seccion ===
        "config-diagnosticos-cie"
      ) {

        inicializarModuloDiagnosticosCIE();

      }


      if (
        seccion ===
        "config-procedimientos-medicos"
      ) {

        inicializarConfiguracionProcedimientosMedicos();

      }


      if (
        seccion ===
        "config-lapso-expiracion"
      ) {

        cargarConfiguracionExpiracion();

      }


      /* =====================================================
         USUARIOS
         ===================================================== */

      if (
        seccion ===
        "usuarios-registrar"
      ) {

        const form =
          document.getElementById(
            "formUsuarioSistema"
          );


        if (form) {

          form.addEventListener(
            "submit",
            guardarUsuarioSistema
          );

        }

      }


      if (
        seccion ===
        "usuarios-lista"
      ) {

        const buscar =
          document.getElementById(
            "buscarUsuarioSistema"
          );


        const btnExportar =
          document.getElementById(
            "btnExportarUsuariosExcel"
          );


        cargarUsuariosSistema();


        if (buscar) {

          buscar.addEventListener(
            "input",
            async () => {

              const res =
                await fetch(
                  "/api/usuarios"
                );


              const usuarios =
                await res.json();


              const tbody =
                document.getElementById(
                  "tablaUsuariosSistemaBody"
                );


              const texto =
                buscar.value
                  .toLowerCase()
                  .trim();


              const lista =
                usuarios.filter(
                  u => {

                    const nombreCompleto =
                      `${
                        u.nombre1 || ""
                      } ${
                        u.nombre2 || ""
                      } ${
                        u.apellido1 || ""
                      } ${
                        u.apellido2 || ""
                      }`
                        .toLowerCase();


                    return (

                      nombreCompleto.includes(
                        texto
                      ) ||

                      String(
                        u.username || ""
                      )
                        .toLowerCase()
                        .includes(
                          texto
                        ) ||

                      String(
                        u.rol || ""
                      )
                        .toLowerCase()
                        .includes(
                          texto
                        ) ||

                      String(
                        u.estado || ""
                      )
                        .toLowerCase()
                        .includes(
                          texto
                        )

                    );

                  }
                );


              if (!lista.length) {

                tbody.innerHTML = `

                  <tr>

                    <td
                      colspan="5"
                      class="empty-row"
                    >
                      No hay usuarios registrados
                    </td>

                  </tr>

                `;

                return;

              }


              tbody.innerHTML =
                lista
                  .map(
                    u => `

                      <tr>

                        <td>
                          ${u.nombre1}
                          ${u.nombre2 || ""}
                          ${u.apellido1}
                          ${u.apellido2 || ""}
                        </td>

                        <td>
                          ${u.username}
                        </td>

                        <td>
                          ${u.rol}
                        </td>

                        <td>
                          ${u.estado}
                        </td>

                        <td>

                          <div
                            class="table-actions"
                          >

                            <button
                              class="btn-table edit"
                              onclick="editarUsuarioSistema(${u.id})"
                            >
                              Editar
                            </button>

                            <button
                              class="btn-table edit"
                              onclick="toggleUsuarioSistema(${u.id})"
                            >
                              Cambiar estado
                            </button>

                            <button
                              class="btn-table delete"
                              onclick="cambiarClaveUsuarioSistema(${u.id})"
                            >
                              Cambiar clave
                            </button>

                          </div>

                        </td>

                      </tr>

                    `
                  )
                  .join("");

            }
          );

        }


        if (btnExportar) {

          btnExportar.addEventListener(
            "click",
            exportarUsuariosSistemaExcel
          );

        }

      }

    },
    180
  );


  /* =========================================================
     CARDS DEL DASHBOARD
     ========================================================= */

  if (
    seccion ===
    "dashboard"
  ) {

    cards.style.display =
      "grid";

  } else {

    cards.style.display =
      "none";

  }

}


async function cargarUsuarioActivo() {

  try {

    /* =========================================
       OBTENER USUARIO ACTIVO
       ========================================= */

    const respuesta =
      await fetch(
        "/api/usuario"
      );


    const datos =
      await respuesta
        .json()
        .catch(
          () => ({})
        );


    if (!respuesta.ok) {

      throw new Error(
        datos.error ||
        "No se pudo obtener el usuario activo"
      );

    }


    /* =========================================
       GUARDAR USUARIO
       ========================================= */

    usuarioActivo =
      String(
        datos.username || ""
      ).trim();


    rolUsuarioActivo =
      String(
        datos.rol || ""
      )
        .trim()
        .toUpperCase();


    /* =========================================
       RESPONSABLES
       ========================================= */

    rellenarResponsables();


    /* =========================================
       CARGAR PERMISOS
       ========================================= */

    await aplicarPermisosMenuUsuario();


    /* =========================================
       CARGAR DASHBOARD INICIAL

       Esto hace que al iniciar sesión
       se inserte inmediatamente el Dashboard
       definido en:

       contenido.dashboard

       y luego cambiarContenido()
       ejecutará automáticamente:

       cargarAlertaExpiracionDashboard()
       ========================================= */

    cambiarContenido(
      "dashboard"
    );


  } catch (error) {

    console.error(
      "No se pudo obtener el usuario activo:",
      error
    );


    usuarioActivo =
      "";


    rolUsuarioActivo =
      "";

  }

}


async function inicializarModuloDocumentosGeneradosHC() {
  const inputFecha = document.getElementById(
    "hcDocsFechaProcedimiento"
  );

  const selectPaciente = document.getElementById(
    "hcDocsPaciente"
  );

  const contenedorDatos = document.getElementById(
    "hcDocsDatosPaciente"
  );

  const contenedorDocumentos = document.getElementById(
    "hcDocumentosGenerados"
  );

  if (
    !inputFecha ||
    !selectPaciente ||
    !contenedorDatos ||
    !contenedorDocumentos
  ) {
    console.error(
      "No se encontraron los elementos de Documentos generados HC"
    );
    return;
  }

  pacientesDocumentosHC = [];
  pacienteDocumentosHCSeleccionado = null;

  selectPaciente.disabled = true;
  selectPaciente.innerHTML = `
    <option value="">Primero seleccione una fecha</option>
  `;

  contenedorDatos.style.display = "none";
  contenedorDatos.innerHTML = "";

  contenedorDocumentos.innerHTML = `
    <div class="empty-row">
      Seleccione una fecha y un paciente.
    </div>
  `;

  try {
    const respuesta = await fetch("/api/pacientes");

    const datos = await respuesta
      .json()
      .catch(() => []);

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
        "No se pudieron cargar los pacientes"
      );
    }

    pacientesDocumentosHC = Array.isArray(datos)
      ? datos
      : [];

  } catch (error) {
    console.error(
      "Error cargando pacientes para documentos HC:",
      error
    );

    selectPaciente.innerHTML = `
      <option value="">Error al cargar pacientes</option>
    `;

    return;
  }

  inputFecha.addEventListener("change", () => {
    cargarPacientesDocumentosHCFecha(
      inputFecha.value
    );
  });

  selectPaciente.addEventListener("change", () => {
    seleccionarPacienteDocumentosHC(
      selectPaciente.value
    );
  });
}

function cargarPacientesDocumentosHCFecha(fechaSeleccionada) {
  const selectPaciente = document.getElementById(
    "hcDocsPaciente"
  );

  const contenedorDatos = document.getElementById(
    "hcDocsDatosPaciente"
  );

  const contenedorDocumentos = document.getElementById(
    "hcDocumentosGenerados"
  );

  if (!selectPaciente) return;

  pacienteDocumentosHCSeleccionado = null;

  if (contenedorDatos) {
    contenedorDatos.style.display = "none";
    contenedorDatos.innerHTML = "";
  }

  if (contenedorDocumentos) {
    contenedorDocumentos.innerHTML = `
      <div class="empty-row">
        Seleccione un paciente.
      </div>
    `;
  }

  if (!fechaSeleccionada) {
    selectPaciente.disabled = true;
    selectPaciente.innerHTML = `
      <option value="">Primero seleccione una fecha</option>
    `;
    return;
  }

  const pacientesDelDia = pacientesDocumentosHC.filter(
    paciente =>
      normalizarFechaHistoriaClinica(
        paciente.fecha_procedimiento || ""
      ) === fechaSeleccionada
  );

  if (!pacientesDelDia.length) {
    selectPaciente.disabled = true;
    selectPaciente.innerHTML = `
      <option value="">
        No hay pacientes para esta fecha
      </option>
    `;
    return;
  }

  pacientesDelDia.sort((a, b) =>
    obtenerNombreCompletoPacienteHC(a)
      .localeCompare(
        obtenerNombreCompletoPacienteHC(b),
        "es"
      )
  );

  selectPaciente.disabled = false;

  selectPaciente.innerHTML = `
    <option value="">Seleccione un paciente</option>

    ${pacientesDelDia.map(paciente => `
      <option value="${paciente.id}">
        ${escaparHTMLHC(
          obtenerNombreCompletoPacienteHC(paciente)
        )}
        | C.I.: ${escaparHTMLHC(
          obtenerCedulaPacienteHC(paciente)
        )}
        | Archivo: ${escaparHTMLHC(
          obtenerNumeroArchivoPacienteHC(paciente)
        )}
      </option>
    `).join("")}
  `;
}

function seleccionarPacienteDocumentosHC(pacienteId) {
  const contenedorDatos = document.getElementById(
    "hcDocsDatosPaciente"
  );

  const fecha = document.getElementById(
    "hcDocsFechaProcedimiento"
  )?.value || "";

  if (!pacienteId) {
    pacienteDocumentosHCSeleccionado = null;

    if (contenedorDatos) {
      contenedorDatos.style.display = "none";
      contenedorDatos.innerHTML = "";
    }

    return;
  }

  const paciente = pacientesDocumentosHC.find(
    item => Number(item.id) === Number(pacienteId)
  );

  if (!paciente) {
    alert("No se encontró el paciente");
    return;
  }

  pacienteDocumentosHCSeleccionado = paciente;

  mostrarDatosPacienteDocumentosHC(paciente);

  cargarDocumentosPacienteHC(
    paciente.id,
    fecha
  );
}

function mostrarDatosPacienteDocumentosHC(paciente) {
  const contenedor = document.getElementById(
    "hcDocsDatosPaciente"
  );

  if (!contenedor) return;

  contenedor.style.display = "block";

  contenedor.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h3>
            ${escaparHTMLHC(
              obtenerNombreCompletoPacienteHC(paciente)
            )}
          </h3>

          <p>
            C.I.: ${escaparHTMLHC(
              obtenerCedulaPacienteHC(paciente)
            )}
            |
            Archivo: ${escaparHTMLHC(
              obtenerNumeroArchivoPacienteHC(paciente)
            )}
          </p>
        </div>
      </div>
    </div>
  `;
}

function rellenarResponsables() {

  const campos = [
    "entradaResponsable",
    "salidaResponsable",
    "trasladoResponsable",
    "descResponsable"
  ];

  campos.forEach(id => {

    const input = document.getElementById(id);

    if (input) {
      input.value = usuarioActivo;
      input.readOnly = true;
    }

  });

}

async function renderTablaDesplegablesConfig(filtro = "") {
  const tbody = document.getElementById("tablaDesplegablesConfigBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/config/desplegables");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">Error al cargar desplegables</td>
        </tr>
      `;
      return;
    }

    const items = Array.isArray(data) ? data : [];
    const texto = filtro.toLowerCase().trim();

    const lista = items.filter(x =>
      String(x.tipo || "").toLowerCase().includes(texto) ||
      String(x.valor || "").toLowerCase().includes(texto) ||
      String(x.estado || "").toLowerCase().includes(texto)
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">No hay desplegables registrados</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(x => `
      <tr>
        <td>${x.tipo}</td>
        <td>${x.valor}</td>
        <td>${x.estado}</td>
        <td>
          <button class="btn-table edit" onclick="toggleDesplegableConfig(${x.id})">
            ${x.estado === "ACTIVO" ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error listando desplegables:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">Error al cargar desplegables</td>
      </tr>
    `;
  }
}

/*async function toggleDesplegableConfig(id) {
  try {
    const res = await fetch(`/api/config/desplegables/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado");
      return;
    }

    const buscar = document.getElementById("buscarDesplegableConfig");
    renderTablaDesplegablesConfig(buscar ? buscar.value : "");
  } catch (error) {
    console.error("Error cambiando estado desplegable:", error);
    alert("Error al conectar con el servidor");
  }
}*/

async function toggleDesplegableConfig(id) {
  try {
    const res = await fetch(`/api/config/desplegables/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado");
      return;
    }

    const buscar = document.getElementById("buscarDesplegableConfig");
    renderTablaDesplegablesConfig(buscar ? buscar.value : "");
  } catch (error) {
    console.error("Error cambiando estado desplegable:", error);
    alert("Error al conectar con el servidor");
  }
}

async function toggleProductoSistema(id) {
  try {
    const res = await fetch(`/api/productos/estado/${id}`, {
      method: "PATCH"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Error al cambiar estado del producto");
      return;
    }

    await renderTablaProductosGeneral(
      document.getElementById("buscarInventario")?.value || ""
    );
  } catch (error) {
    console.error("Error cambiando estado producto:", error);
    alert("Error al conectar con el servidor");
  }
}

async function cargarProductosActivosEntradaDesdeSQL() {
  try {
    const res = await fetch("/api/productos");
    const data = await res.json().catch(() => ([]));

    return (Array.isArray(data) ? data : []).filter(p => p.estado === "ACTIVO");
  } catch (error) {
    console.error("Error cargando productos activos:", error);
    return [];
  }
}

async function cargarInventarioDesdeSQL() {
  try {
    const res = await fetch("/api/inventario");
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error cargando inventario:", error);
    return [];
  }
}

async function autocompletarDatosEntradaDesdeSQL() {
  const selectBodega = document.getElementById("entradaBodega");
  const inputStockMinimo = document.getElementById("entradaStockMinimo");
  const inputUbicacion = document.getElementById("entradaUbicacion");

  if (!selectBodega || !inputStockMinimo || !inputUbicacion) return;

  if (!productoEntradaSeleccionado || !productoEntradaSeleccionado.id) {
    inputStockMinimo.value = "";
    inputUbicacion.value = "";
    return;
  }

  const bodega = selectBodega.value;
  if (!bodega) {
    inputStockMinimo.value = "";
    inputUbicacion.value = "";
    return;
  }

  try {
    const inventarioSQL = await cargarInventarioDesdeSQL();

    const registro = inventarioSQL.find(item =>
      Number(item.producto_id) === Number(productoEntradaSeleccionado.id) &&
      String(item.bodega || "") === String(bodega)
    );

    if (registro) {
      inputStockMinimo.value = registro.stock_minimo ?? "";
      inputUbicacion.value = registro.ubicacion || "";
    } else {
      inputStockMinimo.value = "";
      inputUbicacion.value = "";
    }
  } catch (error) {
    console.error("Error autocompletando datos de entrada:", error);
    inputStockMinimo.value = "";
    inputUbicacion.value = "";
  }
}

async function autocompletarVencimientoPorLoteProveedor() {
  const checkRegistrarLote = document.getElementById("entradaRegistrarLote");
  const selectBodega = document.getElementById("entradaBodega");
  const inputCodigoProveedor = document.getElementById("entradaCodigoProveedor");
  const inputLote = document.getElementById("entradaLote");
  const inputVencimiento = document.getElementById("entradaVencimiento");

  if (!checkRegistrarLote || !selectBodega || !inputCodigoProveedor || !inputLote || !inputVencimiento) return;

  if (!checkRegistrarLote.checked) {
    inputVencimiento.value = "";
    return;
  }

  if (!productoEntradaSeleccionado || !productoEntradaSeleccionado.id) {
    inputVencimiento.value = "";
    return;
  }

  const bodega = (selectBodega.value || "").trim();
  const codigoProveedor = (inputCodigoProveedor.value || "").trim().toLowerCase();
  const lote = (inputLote.value || "").trim().toLowerCase();

  if (!bodega || !codigoProveedor || !lote) {
    inputVencimiento.value = "";
    return;
  }

  try {
    detalle_Entradas = await cargarDetalleEntradasDesdeSQL();

    const coincidencia = [...detalle_Entradas]
      .filter(item =>
        Number(item.producto_id) === Number(productoEntradaSeleccionado.id) &&
        String(item.bodega || "").trim() === bodega &&
        String(item.codigoProveedor || "").trim().toLowerCase() === codigoProveedor &&
        String(item.lote || "").trim().toLowerCase() === lote &&
        item.vencimiento
      )
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];

    if (coincidencia) {
      const fecha = String(coincidencia.vencimiento).slice(0, 10);
      inputVencimiento.value = fecha;
    } else {
      inputVencimiento.value = "";
    }
  } catch (error) {
    console.error("Error autocompletando vencimiento por lote/proveedor:", error);
    inputVencimiento.value = "";
  }
}

function renderResultadosProductoEntrada(texto = "") {
  const contenedor = document.getElementById("resultadosProductoEntrada");
  if (!contenedor) return;

  const filtro = texto.toLowerCase().trim();

  if (!filtro) {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
    return;
  }

  const resultados = productosActivosEntrada.filter(p =>
    String(p.codigo || "").toLowerCase().includes(filtro) ||
    String(p.producto || "").toLowerCase().includes(filtro) ||
    String(p.categoria || "").toLowerCase().includes(filtro)
  ).slice(0, 20);

  if (!resultados.length) {
    contenedor.innerHTML = `<div class="resultado-item empty">No se encontraron productos activos</div>`;
    contenedor.style.display = "block";
    return;
  }

  contenedor.innerHTML = resultados.map(p => `
    <div class="resultado-item" data-id="${p.id}">
      <div class="resultado-title">${p.codigo} - ${p.producto}</div>
      <div class="resultado-sub">Categoría: ${p.categoria || ""} | Unidad: ${p.unidad || ""}</div>
    </div>
  `).join("");

  contenedor.style.display = "block";

  contenedor.querySelectorAll(".resultado-item[data-id]").forEach(item => {
    item.addEventListener("click", () => {
      seleccionarProductoEntrada(Number(item.dataset.id));
    });
  });
}

function seleccionarProductoEntrada(id) {
  const prod = productosActivosEntrada.find(p => Number(p.id) === Number(id));
  if (!prod) return;

  productoEntradaSeleccionado = prod;

  document.getElementById("buscarProductoEntrada").value = `${prod.codigo} - ${prod.producto}`;
  document.getElementById("entradaCodigo").value = prod.codigo || "";
  document.getElementById("entradaProductoNombre").value = prod.producto || "";

  const resultados = document.getElementById("resultadosProductoEntrada");
  if (resultados) {
    resultados.innerHTML = "";
    resultados.style.display = "none";
  }

  autocompletarDatosEntradaDesdeSQL();
  autocompletarVencimientoPorLoteProveedor();
 
}


function limpiarSeleccionProductoEntrada() {
  productoEntradaSeleccionado = null;

  const codigo = document.getElementById("entradaCodigo");
  const nombre = document.getElementById("entradaProductoNombre");
  const stockMinimo = document.getElementById("entradaStockMinimo");
  const ubicacion = document.getElementById("entradaUbicacion");

  if (codigo) codigo.value = "";
  if (nombre) nombre.value = "";
  if (stockMinimo) stockMinimo.value = "";
  if (ubicacion) ubicacion.value = "";
}


async function renderTablaInventario(filtro = "") {
  const tbody = document.getElementById("tablaInventarioBody");
  if (!tbody) return;

  try {
    const inventarioSQL = await cargarInventarioDesdeSQL();
    const texto = filtro.toLowerCase().trim();

    const lista = inventarioSQL.filter(item =>
      String(item.bodega || "").toLowerCase().includes(texto) ||
      String(item.codigo || "").toLowerCase().includes(texto) ||
      String(item.producto || "").toLowerCase().includes(texto) ||
      String(item.ubicacion || "").toLowerCase().includes(texto)
    );

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">No hay stock registrado</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td>${item.bodega || ""}</td>
        <td>${item.codigo || ""}</td>
        <td>${item.producto || ""}</td>
        <td>${item.stock || 0}</td>
        <td>${item.ubicacion || ""}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("Error renderizando inventario:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">Error al cargar inventario</td>
      </tr>
    `;
  }
}

menuLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    limpiarActivos();
    link.classList.add("active");
    cambiarContenido(link.dataset.section);
  });
});

submenuLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    limpiarActivos();
    link.classList.add("active");
    cambiarContenido(link.dataset.section);
  });
});



document.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioActivo();
});

async function inicializarModuloHistoriasClinicas() {
  const inputFecha = document.getElementById("hcFechaProcedimiento");
  const selectPaciente = document.getElementById("hcPaciente");
  const contenedorDatos = document.getElementById("hcDatosPaciente");
  const contenedorFormularios = document.getElementById("hcListaFormularios");

  if (
    !inputFecha ||
    !selectPaciente ||
    !contenedorDatos ||
    !contenedorFormularios
  ) {
    console.error("No se encontraron todos los elementos de H. Clínicas");
    return;
  }

  pacientesHistoriasClinicas = [];
  pacienteHistoriaClinicaSeleccionado = null;

  selectPaciente.disabled = true;
  selectPaciente.innerHTML = `
    <option value="">Primero seleccione una fecha</option>
  `;

  contenedorDatos.style.display = "none";
  contenedorDatos.innerHTML = "";

  contenedorFormularios.style.display = "none";
  contenedorFormularios.innerHTML = "";

  try {
    const res = await fetch("/api/pacientes");
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      throw new Error(data.error || "No se pudieron cargar los pacientes");
    }

    pacientesHistoriasClinicas = Array.isArray(data) ? data : [];


  } catch (error) {
    console.error("Error cargando pacientes para H. Clínicas:", error);

    selectPaciente.innerHTML = `
      <option value="">Error al cargar pacientes</option>
    `;

    alert("No se pudo cargar la lista de pacientes");
    return;
  }

  inputFecha.addEventListener("change", () => {
    cargarPacientesHistoriaClinicaPorFecha(inputFecha.value);
  });

  selectPaciente.addEventListener("change", () => {
    seleccionarPacienteHistoriaClinica(selectPaciente.value);
  });
}

function normalizarFechaHistoriaClinica(valor) {
  if (!valor) return "";

  const texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "";
  }

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function cargarPacientesHistoriaClinicaPorFecha(fechaSeleccionada) {
  const selectPaciente = document.getElementById("hcPaciente");
  const contenedorDatos = document.getElementById("hcDatosPaciente");
  const contenedorFormularios = document.getElementById("hcListaFormularios");

  if (!selectPaciente) return;

  pacienteHistoriaClinicaSeleccionado = null;

  if (contenedorDatos) {
    contenedorDatos.style.display = "none";
    contenedorDatos.innerHTML = "";
  }

  if (contenedorFormularios) {
    contenedorFormularios.style.display = "none";
    contenedorFormularios.innerHTML = "";
  }

  if (!fechaSeleccionada) {
    selectPaciente.disabled = true;
    selectPaciente.innerHTML = `
      <option value="">Primero seleccione una fecha</option>
    `;
    return;
  }

  const pacientesDelDia = pacientesHistoriasClinicas.filter(paciente => {
    const fechaPaciente =
      paciente.fechaProcedimiento ??
      paciente.fecha_procedimiento ??
      paciente.fechaAtencion ??
      paciente.fecha_atencion ??
      "";

    return (
      normalizarFechaHistoriaClinica(fechaPaciente) === fechaSeleccionada
    );
  });

  if (!pacientesDelDia.length) {
    selectPaciente.disabled = true;
    selectPaciente.innerHTML = `
      <option value="">No hay pacientes para esta fecha</option>
    `;
    return;
  }

  pacientesDelDia.sort((a, b) => {
    const apellidoA = obtenerApellidosPacienteHC(a).toLowerCase();
    const apellidoB = obtenerApellidosPacienteHC(b).toLowerCase();

    return apellidoA.localeCompare(apellidoB);
  });

  selectPaciente.disabled = false;

  selectPaciente.innerHTML = `
    <option value="">Seleccione un paciente</option>

    ${pacientesDelDia.map(paciente => {
      const nombreCompleto = obtenerNombreCompletoPacienteHC(paciente);
      const cedula = obtenerCedulaPacienteHC(paciente);
      const archivo = obtenerNumeroArchivoPacienteHC(paciente);

      return `
        <option value="${paciente.id}">
          ${nombreCompleto}
          ${cedula ? ` | C.I.: ${cedula}` : ""}
          ${archivo ? ` | Archivo: ${archivo}` : ""}
        </option>
      `;
    }).join("")}
  `;
}

function obtenerApellidosPacienteHC(paciente) {
  if (!paciente) return "";

  const apellido1 = paciente.pac_apellido1 || "";
  const apellido2 = paciente.pac_apellido2 || "";

  return `${apellido1} ${apellido2}`
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerNombresPacienteHC(paciente) {
  if (!paciente) return "";

  const nombre1 = paciente.pac_nombre1 || "";
  const nombre2 = paciente.pac_nombre2 || "";

  return `${nombre1} ${nombre2}`
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerNombreCompletoPacienteHC(paciente) {
  const apellidos = obtenerApellidosPacienteHC(paciente);
  const nombres = obtenerNombresPacienteHC(paciente);

  return `${apellidos} ${nombres}`
    .replace(/\s+/g, " ")
    .trim() || "Paciente sin nombre";
}

function obtenerCedulaPacienteHC(paciente) {
  return String(
    paciente?.cedula_paciente || ""
  ).trim();
}

function obtenerNumeroArchivoPacienteHC(paciente) {
  return String(
    paciente?.archivo ?? ""
  ).trim();
}

function obtenerEdadPacienteHC(paciente) {
  return String(
    paciente?.edad ?? ""
  ).trim();
}

function obtenerSexoPacienteHC(paciente) {
  const sexo = String(paciente?.sexo || "").trim().toUpperCase();

  if (sexo === "H") return "HOMBRE";
  if (sexo === "M") return "MUJER";

  return sexo;
}

function obtenerFechaProcedimientoPacienteHC(paciente) {
  return normalizarFechaHistoriaClinica(
    paciente?.fecha_procedimiento || ""
  );
}

function seleccionarPacienteHistoriaClinica(pacienteId) {
  const contenedorDatos = document.getElementById("hcDatosPaciente");
  const contenedorFormularios = document.getElementById("hcListaFormularios");

  if (!contenedorDatos || !contenedorFormularios) return;

  if (!pacienteId) {
    pacienteHistoriaClinicaSeleccionado = null;

    contenedorDatos.style.display = "none";
    contenedorDatos.innerHTML = "";

    contenedorFormularios.style.display = "none";
    contenedorFormularios.innerHTML = "";

    return;
  }

  

  const paciente = pacientesHistoriasClinicas.find(
    item => Number(item.id) === Number(pacienteId)
  );

  if (!paciente) {
    alert("No se encontró la información del paciente");
    return;
  }

  pacienteHistoriaClinicaSeleccionado = paciente;

  mostrarDatosPacienteHistoriaClinica(paciente);
  mostrarListaFormulariosHistoriaClinica();

  const fechaSeleccionada =
  document.getElementById("hcFechaProcedimiento")?.value || "";

cargarDocumentosPacienteHC(
  paciente.id,
  fechaSeleccionada
);
}

function mostrarDatosPacienteHistoriaClinica(paciente) {
  const contenedor = document.getElementById("hcDatosPaciente");
  if (!contenedor) return;

  const nombreCompleto = obtenerNombreCompletoPacienteHC(paciente);
  const cedula = obtenerCedulaPacienteHC(paciente);
  const archivo = obtenerNumeroArchivoPacienteHC(paciente);
  const edad = obtenerEdadPacienteHC(paciente);
  const sexo = obtenerSexoPacienteHC(paciente);
  const fechaProcedimiento = obtenerFechaProcedimientoPacienteHC(paciente);

  contenedor.style.display = "block";

  contenedor.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <div>
          <h3>Paciente seleccionado</h3>
          <p>Información que se utilizará en la historia clínica.</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Paciente</label>
          <input type="text" value="${escaparHTMLHC(nombreCompleto)}" readonly>
        </div>

        <div class="form-group">
          <label>Cédula</label>
          <input type="text" value="${escaparHTMLHC(cedula)}" readonly>
        </div>

        <div class="form-group">
          <label>Número de archivo</label>
          <input type="text" value="${escaparHTMLHC(archivo)}" readonly>
        </div>

        <div class="form-group">
          <label>Edad</label>
          <input type="text" value="${escaparHTMLHC(edad)}" readonly>
        </div>

        <div class="form-group">
          <label>Sexo</label>
          <input type="text" value="${escaparHTMLHC(sexo)}" readonly>
        </div>

        <div class="form-group">
          <label>Fecha del procedimiento</label>
          <input
            type="date"
            value="${escaparHTMLHC(fechaProcedimiento)}"
            readonly
          >
        </div>
      </div>
    </div>
  `;
}

function escaparHTMLHC(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function mostrarListaFormulariosHistoriaClinica() {
  const contenedor = document.getElementById(
    "hcListaFormularios"
  );

  if (
    !contenedor ||
    !pacienteHistoriaClinicaSeleccionado
  ) {
    return;
  }

  const formularios = [
    {
      codigo: "001",
      nombre: "Admisión",
      icono: "fa-hospital-user"
    },
    {
      codigo: "008",
      nombre: "Emergencia",
      icono: "fa-truck-medical"
    },
    {
      codigo: "006",
      nombre: "Epicrisis",
      icono: "fa-file-medical"
    },
    {
      codigo: "005",
      nombre: "Evoluciones",
      icono: "fa-notes-medical"
    },
    {
      codigo: "053",
      nombre: "Referencia",
      icono: "fa-arrow-right-arrow-left"
    },
    {
      codigo: "024",
      nombre: "Consentimiento informado",
      icono: "fa-file-signature"
    },
    {
      codigo: "060",
      nombre: "Cirugía segura",
      icono: "fa-shield-heart"
    },
    {
      codigo: "017",
      nombre: "Protocolo",
      icono: "fa-clipboard-list"
    },
    {
      codigo: "018",
      nombre: "Preanestésico",
      icono: "fa-syringe"
    },
    {
      codigo: "018A",
      nombre: "Transanestésico",
      icono: "fa-heart-pulse"
    },
    {
      codigo: "019",
      nombre: "Postanestésico",
      icono: "fa-bed-pulse"
    },
    {
      codigo: "022-H",
      nombre: "Kardex hospitalización",
      icono: "fa-bed"
    },
    {
      codigo: "022-Q",
      nombre: "Kardex quirófano",
      icono: "fa-staff-snake"
    },
    {
      codigo: "012A-PRE",
      nombre: "Imagenología solicitud pre",
      icono: "fa-x-ray"
    },
    {
      codigo: "012B-PRE",
      nombre: "Imagenología informe pre",
      icono: "fa-file-waveform"
    },
    {
      codigo: "012A-POST",
      nombre: "Imagenología solicitud post",
      icono: "fa-x-ray"
    },
    {
      codigo: "012B-POST",
      nombre: "Imagenología informe post",
      icono: "fa-file-waveform"
    },
    {
      codigo: "010A",
      nombre: "Laboratorios solicitud",
      icono: "fa-flask-vial"
    },
    {
      codigo: "007-S",
      nombre: "Interconsulta solicitud",
      icono: "fa-user-doctor"
    },
    {
      codigo: "007-I",
      nombre: "Interconsulta informe",
      icono: "fa-file-medical"
    },
    {
      codigo: "DESC-Q",
      nombre: "Descargo de quirófano",
      icono: "fa-boxes-packing"
    },
    {
      codigo: "DESC-H",
      nombre: "Descargo de hospitalización",
      icono: "fa-box-open"
    }
  ];

  contenedor.style.display = "block";

  contenedor.innerHTML = `
    <section class="hc-formularios-panel">

      <div class="hc-formularios-encabezado">

        <div class="hc-formularios-titulo-icono">
          <i class="fa-solid fa-folder-open"></i>
        </div>

        <div class="hc-formularios-titulo">
          <span class="hc-formularios-etiqueta">
            HISTORIA CLÍNICA
          </span>

          <h2>
            Formularios de historia clínica
          </h2>

          <p>
            Seleccione el formulario que desea
            completar para el paciente actual.
          </p>
        </div>

        <div class="hc-formularios-contador">
          <strong>${formularios.length}</strong>
          <span>formularios</span>
        </div>

      </div>

      <div class="hc-formularios-separador"></div>

      <div class="hc-formularios-grid">

        ${formularios.map(formulario => `
          <button
            type="button"
            class="hc-formulario-card"
            data-codigo-formulario="${escaparHTMLHC(
              formulario.codigo
            )}"
          >

            <span class="hc-formulario-icono">
              <i class="fa-solid ${
                formulario.icono
              }"></i>
            </span>

            <span class="hc-formulario-contenido">

              <span class="hc-formulario-codigo">
                FORMULARIO
                <strong>
                  ${escaparHTMLHC(
                    formulario.codigo
                  )}
                </strong>
              </span>

              <span class="hc-formulario-nombre">
                ${escaparHTMLHC(
                  formulario.nombre
                )}
              </span>

            </span>

            <span class="hc-formulario-estado pendiente">
              <i class="fa-regular fa-clock"></i>
              Pendiente
            </span>

            <span class="hc-formulario-flecha">
              <i class="fa-solid fa-chevron-right"></i>
            </span>

          </button>
        `).join("")}

      </div>

    </section>
  `;

  contenedor
    .querySelectorAll(
      ".hc-formulario-card"
    )
    .forEach(boton => {
      boton.addEventListener(
        "click",
        () => {
          const codigo =
            boton.dataset
              .codigoFormulario;

          abrirFormularioHistoriaClinica(
            codigo
          );
        }
      );
    });
    await cargarEstadosFormulariosHistoriaClinica();
}

async function abrirFormularioHistoriaClinica(codigoFormulario) {
  if (!pacienteHistoriaClinicaSeleccionado) {
    alert("Primero seleccione un paciente");
    return;
  }

    if (codigoFormulario === "001") {
    await abrirFormulario001Admision();
    return;
  }

  if (codigoFormulario === "008") {
    abrirFormulario008Emergencia();
    return;
  }

   if (codigoFormulario === "018") {
    await abrirFormulario018Preanestesico();
    return;
  }

  alert(
    `El formulario ${codigoFormulario} se implementará posteriormente.`
  );
}

function obtenerNombreCompletoFamiliarHC(paciente) {
  if (!paciente) return "";

  return [
    paciente.fam_apellido1,
    paciente.fam_apellido2,
    paciente.fam_nombre1,
    paciente.fam_nombre2
  ]
    .filter(valor => String(valor || "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function abrirFormulario001Admision() {
  const paciente = pacienteHistoriaClinicaSeleccionado;

  if (!paciente) {
    alert("No hay paciente seleccionado");
    return;
  }

  const historiaClinica = obtenerCedulaPacienteHC(paciente);
  const numeroArchivo = obtenerNumeroArchivoPacienteHC(paciente);
  const fechaAdmision = obtenerFechaProcedimientoPacienteHC(paciente);

  const primerApellido = String(paciente.pac_apellido1 || "").trim();
  const segundoApellido = String(paciente.pac_apellido2 || "").trim();
  const primerNombre = String(paciente.pac_nombre1 || "").trim();
  const segundoNombre = String(paciente.pac_nombre2 || "").trim();

  const estadoCivil = String(paciente.estado_civil || "").trim();
  const sexo = obtenerSexoPacienteHC(paciente);

  const telefonoFijo = String(paciente.telefono_fijo || "").trim();
  const telefonoCelular = String(paciente.telefono_celular || "").trim();
  const correo = String(paciente.correo || "").trim();

  const fechaNacimiento = normalizarFechaHistoriaClinica(
    paciente.fecha_nacimiento || ""
  );

  const lugarNacimiento = String(
    paciente.lugar_nacimiento || ""
  ).trim();

  const edad = obtenerEdadPacienteHC(paciente);
  const provincia = String(paciente.provincia || "").trim();
  const canton = String(paciente.canton || "").trim();
  const parroquia = String(paciente.parroquia || "").trim();
  const barrio = String(paciente.barrio || "").trim();
  const callePrincipal = String(
    paciente.calle_principal || ""
  ).trim();

  const calleSecundaria = String(
    paciente.calle_secundaria || ""
  ).trim();

  const referencia = String(paciente.referencia || "").trim();
  const ocupacion = String(paciente.ocupacion || "").trim();
  const seguro = String(paciente.tipo_seguro || "").trim();

  const nombresFamiliar = obtenerNombreCompletoFamiliarHC(paciente);
  const parentescoFamiliar = String(
    paciente.parentesco_familiar || ""
  ).trim();

  const direccionFamiliar = String(
    paciente.direccion_familiar || ""
  ).trim();

  const telefonoFamiliar = String(
    paciente.telefono_familiar || ""
  ).trim();

  panelBox.innerHTML = `
  <div class="table-card hc001-panel">

      <div class="table-header">
        <div>
          <h2>001 Admisión</h2>
          <p>
            ${escaparHTMLHC(obtenerNombreCompletoPacienteHC(paciente))}
          </p>
        </div>

        <button
          type="button"
          class="btn-secondary"
          id="btnVolverHistoriaClinica001"
        >
          Volver
        </button>
      </div>

      <form id="formHC001">

        <h3 class="form-section-title">Datos de admisión</h3>

        <div class="form-grid">

          ${crearCampoHC001(
            "hc001HistoriaClinica",
            "Historia clínica",
            historiaClinica,
            true
          )}

          ${crearCampoHC001(
            "hc001NumeroArchivo",
            "Número de archivo",
            numeroArchivo,
            true
          )}

          ${crearCampoFechaHC001(
            "hc001FechaAdmision",
            "Fecha de admisión",
            fechaAdmision,
            true
          )}

          ${crearCampoHC001(
            "hc001NombreAdmisionista",
            "Nombre del admisionista",
            "",
            false
          )}

        </div>

        <h3 class="form-section-title">Identificación del paciente</h3>

        <div class="form-grid">

          ${crearCampoHC001(
            "hc001PrimerApellido",
            "Primer apellido",
            primerApellido,
            true
          )}

          ${crearCampoHC001(
            "hc001SegundoApellido",
            "Segundo apellido",
            segundoApellido,
            true
          )}

          ${crearCampoHC001(
            "hc001PrimerNombre",
            "Primer nombre",
            primerNombre,
            true
          )}

          ${crearCampoHC001(
            "hc001SegundoNombre",
            "Segundo nombre",
            segundoNombre,
            true
          )}

          ${crearCampoHC001(
            "hc001TipoIdentificacion",
            "Tipo de identificación",
            "CÉDULA",
            true
          )}

          ${crearCampoHC001(
            "hc001EstadoCivil",
            "Estado civil",
            estadoCivil,
            true
          )}

          ${crearCampoHC001(
            "hc001Sexo",
            "Sexo",
            sexo,
            true
          )}

          ${crearCampoHC001(
            "hc001TelefonoFijo",
            "Teléfono fijo",
            telefonoFijo,
            true
          )}

          ${crearCampoHC001(
            "hc001TelefonoCelular",
            "Teléfono celular",
            telefonoCelular,
            true
          )}

          ${crearCampoHC001(
            "hc001Correo",
            "Correo electrónico",
            correo,
            true
          )}

          ${crearCampoFechaHC001(
            "hc001FechaNacimiento",
            "Fecha de nacimiento",
            fechaNacimiento,
            true
          )}

          ${crearCampoHC001(
            "hc001LugarNacimiento",
            "Lugar de nacimiento",
            lugarNacimiento,
            true
          )}

          ${crearCampoHC001(
            "hc001Nacionalidad",
            "Nacionalidad",
            "",
            false
          )}

          ${crearCampoHC001(
            "hc001Edad",
            "Edad",
            edad,
            true
          )}

        </div>

        <h3 class="form-section-title">Dirección del paciente</h3>

        <div class="form-grid">

          ${crearCampoHC001(
            "hc001Provincia",
            "Provincia",
            provincia,
            true
          )}

          ${crearCampoHC001(
            "hc001Canton",
            "Cantón",
            canton,
            true
          )}

          ${crearCampoHC001(
            "hc001Parroquia",
            "Parroquia",
            parroquia,
            true
          )}

          ${crearCampoHC001(
            "hc001Barrio",
            "Barrio",
            barrio,
            true
          )}

          ${crearCampoHC001(
            "hc001CallePrincipal",
            "Calle principal",
            callePrincipal,
            true
          )}

          ${crearCampoHC001(
            "hc001CalleSecundaria",
            "Calle secundaria",
            calleSecundaria,
            true
          )}

          ${crearCampoHC001(
            "hc001Referencia",
            "Referencia",
            referencia,
            true
          )}

        </div>

        <h3 class="form-section-title">
          Información étnica y educativa
        </h3>

        <div class="form-grid">

          ${crearCampoHC001(
            "hc001IdentificacionEtnica",
            "Identificación étnica",
            "",
            false
          )}

          ${crearCampoHC001(
            "hc001NacionalidadEtnica",
            "Nacionalidad étnica",
            "",
            false
          )}

          ${crearCampoHC001(
            "hc001Pueblo",
            "Pueblo",
            "",
            false
          )}

          ${crearCampoHC001(
            "hc001NivelEducacion",
            "Nivel de educación",
            "",
            false
          )}

          ${crearCampoHC001(
            "hc001EstadoEducacion",
            "Estado de educación",
            "",
            false
          )}

        </div>

        <h3 class="form-section-title">
          Información laboral y seguro
        </h3>

        <div class="form-grid">

          ${crearCampoHC001(
            "hc001Ocupacion",
            "Ocupación",
            ocupacion,
            true
          )}

          ${crearCampoHC001(
            "hc001EmpresaTrabajo",
            "Empresa de trabajo",
            "",
            false
          )}

          ${crearCampoHC001(
            "hc001Seguro",
            "Seguro",
            seguro,
            true
          )}

          ${crearCampoHC001(
            "hc001TipoBono",
            "Tipo de bono",
            "",
            false
          )}

        </div>

        <h3 class="form-section-title">
          Familiar o persona de contacto
        </h3>

        <div class="form-grid">

          ${crearCampoHC001(
            "hc001NombresFamiliar",
            "Nombres completos del familiar",
            nombresFamiliar,
            true
          )}

          ${crearCampoHC001(
            "hc001ParentescoFamiliar",
            "Parentesco",
            parentescoFamiliar,
            true
          )}

          ${crearCampoHC001(
            "hc001DireccionFamiliar",
            "Dirección del familiar",
            direccionFamiliar,
            true
          )}

          ${crearCampoHC001(
            "hc001TelefonoFamiliar",
            "Teléfono del familiar",
            telefonoFamiliar,
            true
          )}

        </div>

        <div class="form-actions">

  <button
    type="button"
    class="btn-secondary"
    id="btnGuardarBorrador001"
  >
    <i class="fa-solid fa-floppy-disk"></i>
    Guardar borrador
  </button>

  <button
  type="button"
  class="btn-primary"
  id="btnGenerarPDF001"
>
  <i class="fa-solid fa-file-pdf"></i>
  Generar PDF
</button>

  <button
    type="button"
    class="btn-primary"
    id="btnCerrarFormulario001"
    style="background:#8b1e1e;"
  >
    <i class="fa-solid fa-lock"></i>
    Cerrar formulario
  </button>

</div>

      </form>
    </div>
  `;

    await cargarBorradorFormulario001();

    document
  .getElementById("btnVolverHistoriaClinica001")
  ?.addEventListener("click", () => {
    cambiarContenido("historias-clinicas");
  });

  document
    .getElementById("btnGuardarBorrador001")
    ?.addEventListener(
      "click",
      guardarBorradorFormulario001
    );

  document
    .getElementById("btnGenerarPDF001")
    ?.addEventListener(
      "click",
      generarPDFFormulario001
    );

  document
    .getElementById("btnCerrarFormulario001")
    ?.addEventListener(
      "click",
      cerrarFormulario001
    );

document
  .getElementById("btnVolverHistoriaClinica001")
  ?.addEventListener("click", () => {
    cambiarContenido("historias-clinicas");
  });

    
}

async function generarPDFFormulario001() {
  const botonGenerar =
    document.getElementById(
      "btnGenerarPDF001"
    );

  try {
    const datos =
      obtenerDatosFormulario001();

    if (!datos.paciente_id) {
      throw new Error(
        "No se pudo identificar al paciente"
      );
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "Debe ingresar la fecha de admisión"
      );
    }

    if (botonGenerar) {
      botonGenerar.disabled = true;

      botonGenerar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Generando PDF...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/001/generar-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(datos)
      }
    );

    const resultado = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        resultado.detalle ||
        resultado.error ||
        "No se pudo generar y almacenar el PDF"
      );
    }

    alert(
      `${resultado.mensaje || "PDF generado correctamente"}\n\n` +
      `Documento: ${
        resultado.documento?.nombreArchivo || ""
      }\n` +
      `Versión: ${
        resultado.documento?.version || ""
      }\n` +
      `Estado: ${
        resultado.documento?.estado || "BORRADOR"
      }`
    );

  } catch (error) {
    console.error(
      "Error generando PDF 001:",
      error
    );

    alert(
      error.message ||
      "No se pudo generar el PDF del formulario 001"
    );

  } finally {
    const formularioCerrado =
      document.getElementById(
        "avisoFormulario001Cerrado"
      );

    if (
      botonGenerar &&
      !formularioCerrado
    ) {
      botonGenerar.disabled = false;

      botonGenerar.innerHTML = `
        <i class="fa-solid fa-file-pdf"></i>
        Generar PDF
      `;
    }
  }
}




function crearCampoHC001(id, etiqueta, valor = "", soloLectura = false) {
  return `
    <div class="form-group">
      <label for="${id}">
        ${escaparHTMLHC(etiqueta)}
      </label>

      <input
        type="text"
        id="${id}"
        value="${escaparHTMLHC(valor)}"
        ${soloLectura ? "readonly" : ""}
      >
    </div>
  `;
}

function crearCampoFechaHC001(
  id,
  etiqueta,
  valor = "",
  soloLectura = false
) {
  return `
    <div class="form-group">
      <label for="${id}">
        ${escaparHTMLHC(etiqueta)}
      </label>

      <input
        type="date"
        id="${id}"
        value="${escaparHTMLHC(valor)}"
        ${soloLectura ? "readonly" : ""}
      >
    </div>
  `;
}

function obtenerDatosFormulario001() {
  const obtenerValor = id =>
    document.getElementById(id)?.value?.trim() || "";

  return {

    paciente_id:
      pacienteHistoriaClinicaSeleccionado?.id || null,

    paciente_h_clinica:
      obtenerValor("hc001HistoriaClinica"),

    narchivo_paciente:
      obtenerValor("hc001NumeroArchivo"),

    fecha_admision_paciente:
      obtenerValor("hc001FechaAdmision"),

    nombre_admisionista:
      obtenerValor("hc001NombreAdmisionista"),

    primer_apellido_paciente:
      obtenerValor("hc001PrimerApellido"),

    segundo_apellido_paciente:
      obtenerValor("hc001SegundoApellido"),

    primer_nombre_paciente:
      obtenerValor("hc001PrimerNombre"),

    segundo_nombre_paciente:
      obtenerValor("hc001SegundoNombre"),

    tipo_id_paciente:
      obtenerValor("hc001TipoIdentificacion"),

    estado_civil_paciente:
      obtenerValor("hc001EstadoCivil"),

    sexo_paciente:
      obtenerValor("hc001Sexo"),

    telefono_fijo_paciente:
      obtenerValor("hc001TelefonoFijo"),

    telefono_celular_paciente:
      obtenerValor("hc001TelefonoCelular"),

    correo_paciente:
      obtenerValor("hc001Correo"),

    fecha_nacimiento_paciente:
      obtenerValor("hc001FechaNacimiento"),

    lugar_nacimiento_paciente:
      obtenerValor("hc001LugarNacimiento"),

    nacionalidad_paciente:
      obtenerValor("hc001Nacionalidad"),

    edad_paciente:
      obtenerValor("hc001Edad"),

    provincia_paciente:
      obtenerValor("hc001Provincia"),

    canton_paciente:
      obtenerValor("hc001Canton"),

    parroquia_paciente:
      obtenerValor("hc001Parroquia"),

    barrio_paciente:
      obtenerValor("hc001Barrio"),

    calle_paciente:
      obtenerValor("hc001CallePrincipal"),

    calle_secundaria_paciente:
      obtenerValor("hc001CalleSecundaria"),

    referencia_paciente:
      obtenerValor("hc001Referencia"),

    identificacion_etnica_paciente:
      obtenerValor("hc001IdentificacionEtnica"),

    nacionalidad_etnica_paciente:
      obtenerValor("hc001NacionalidadEtnica"),

    pueblos_paciente:
      obtenerValor("hc001Pueblo"),

    nivel_educacion_paciente:
      obtenerValor("hc001NivelEducacion"),

    estado_educacion_paciente:
      obtenerValor("hc001EstadoEducacion"),

    ocupacion_paciente:
      obtenerValor("hc001Ocupacion"),

    empresa_trabajo_paciente:
      obtenerValor("hc001EmpresaTrabajo"),

    seguro_paciente:
      obtenerValor("hc001Seguro"),

    tipo_bono_paciente:
      obtenerValor("hc001TipoBono"),

    nombres_completos_familiar:
      obtenerValor("hc001NombresFamiliar"),

    parentesco_familiar:
      obtenerValor("hc001ParentescoFamiliar"),

    direccion_familiar:
      obtenerValor("hc001DireccionFamiliar"),

    telefono_familiar:
      obtenerValor("hc001TelefonoFamiliar")
  };
}

function cargarDatosEnFormulario001(datos = {}) {
  const mapaCampos = {
    paciente_h_clinica: "hc001HistoriaClinica",
    narchivo_paciente: "hc001NumeroArchivo",
    fecha_admision_paciente: "hc001FechaAdmision",
    nombre_admisionista: "hc001NombreAdmisionista",

    primer_apellido_paciente: "hc001PrimerApellido",
    segundo_apellido_paciente: "hc001SegundoApellido",
    primer_nombre_paciente: "hc001PrimerNombre",
    segundo_nombre_paciente: "hc001SegundoNombre",

    tipo_id_paciente: "hc001TipoIdentificacion",
    estado_civil_paciente: "hc001EstadoCivil",
    sexo_paciente: "hc001Sexo",

    telefono_fijo_paciente: "hc001TelefonoFijo",
    telefono_celular_paciente: "hc001TelefonoCelular",
    correo_paciente: "hc001Correo",

    fecha_nacimiento_paciente: "hc001FechaNacimiento",
    lugar_nacimiento_paciente: "hc001LugarNacimiento",
    nacionalidad_paciente: "hc001Nacionalidad",
    edad_paciente: "hc001Edad",

    provincia_paciente: "hc001Provincia",
    canton_paciente: "hc001Canton",
    parroquia_paciente: "hc001Parroquia",
    barrio_paciente: "hc001Barrio",

    calle_paciente: "hc001CallePrincipal",
    calle_secundaria_paciente: "hc001CalleSecundaria",
    referencia_paciente: "hc001Referencia",

    identificacion_etnica_paciente:
      "hc001IdentificacionEtnica",

    nacionalidad_etnica_paciente:
      "hc001NacionalidadEtnica",

    pueblos_paciente: "hc001Pueblo",
    nivel_educacion_paciente: "hc001NivelEducacion",
    estado_educacion_paciente: "hc001EstadoEducacion",

    ocupacion_paciente: "hc001Ocupacion",
    empresa_trabajo_paciente: "hc001EmpresaTrabajo",
    seguro_paciente: "hc001Seguro",
    tipo_bono_paciente: "hc001TipoBono",

    nombres_completos_familiar: "hc001NombresFamiliar",
    parentesco_familiar: "hc001ParentescoFamiliar",
    direccion_familiar: "hc001DireccionFamiliar",
    telefono_familiar: "hc001TelefonoFamiliar"
  };

  Object.entries(mapaCampos).forEach(
    ([nombreDato, idCampo]) => {
      const campo = document.getElementById(idCampo);

      if (!campo) {
        console.warn(
          `No se encontró el campo ${idCampo}`
        );
        return;
      }

      const valor = datos[nombreDato];

      if (campo.type === "checkbox") {
        campo.checked =
          valor === true ||
          valor === 1 ||
          valor === "1" ||
          valor === "SI";
      } else {
        campo.value = valor ?? "";
      }
    }
  );

  /*console.log(
    "DATOS DEL BORRADOR COLOCADOS EN EL FORMULARIO:",
    datos
  );*/
}

async function actualizarDatosMaestrosFormulario001() {
  const pacienteId =
    pacienteHistoriaClinicaSeleccionado?.id;

  if (!pacienteId) {
    return;
  }

  /*
    Consultamos nuevamente el paciente en SQL para no
    depender de la información antigua que quedó guardada
    dentro del borrador.
  */
  const pacienteActualizado =
    await obtenerPacientePorId(pacienteId);

  if (!pacienteActualizado) {
    console.warn(
      "No se pudieron actualizar los datos maestros del paciente"
    );
    return;
  }

  /*
    Actualizamos también el objeto seleccionado para que
    el resto del módulo trabaje con los datos recientes.
  */
  pacienteHistoriaClinicaSeleccionado = {
    ...pacienteHistoriaClinicaSeleccionado,
    ...pacienteActualizado
  };

  const paciente =
    pacienteHistoriaClinicaSeleccionado;

  const asignarValor = (id, valor) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value =
        valor === null || valor === undefined
          ? ""
          : String(valor);
    }
  };

  const fechaNacimiento =
    normalizarFechaHistoriaClinica(
      paciente.fecha_nacimiento || ""
    );

  const fechaAdmision =
    obtenerFechaProcedimientoPacienteHC(
      paciente
    );

  const edad =
    obtenerEdadPacienteHC(paciente);

  const sexo =
    obtenerSexoPacienteHC(paciente);

  const nombresFamiliar =
    obtenerNombreCompletoFamiliarHC(
      paciente
    );

  /* =========================================
     DATOS GENERALES DEL PACIENTE
  ========================================= */

  asignarValor(
    "hc001HistoriaClinica",
    obtenerCedulaPacienteHC(paciente)
  );

  asignarValor(
    "hc001NumeroArchivo",
    obtenerNumeroArchivoPacienteHC(paciente)
  );

  asignarValor(
    "hc001FechaAdmision",
    fechaAdmision
  );

  /* =========================================
     IDENTIFICACIÓN
  ========================================= */

  asignarValor(
    "hc001PrimerApellido",
    paciente.pac_apellido1
  );

  asignarValor(
    "hc001SegundoApellido",
    paciente.pac_apellido2
  );

  asignarValor(
    "hc001PrimerNombre",
    paciente.pac_nombre1
  );

  asignarValor(
    "hc001SegundoNombre",
    paciente.pac_nombre2
  );

  asignarValor(
    "hc001TipoIdentificacion",
    "CÉDULA"
  );

  asignarValor(
    "hc001EstadoCivil",
    paciente.estado_civil
  );

  asignarValor(
    "hc001Sexo",
    sexo
  );

  asignarValor(
    "hc001TelefonoFijo",
    paciente.telefono_fijo
  );

  asignarValor(
    "hc001TelefonoCelular",
    paciente.telefono_celular
  );

  asignarValor(
    "hc001Correo",
    paciente.correo
  );

  asignarValor(
    "hc001FechaNacimiento",
    fechaNacimiento
  );

  asignarValor(
    "hc001LugarNacimiento",
    paciente.lugar_nacimiento
  );

  asignarValor(
    "hc001Edad",
    edad
  );

  /* =========================================
     DIRECCIÓN
  ========================================= */

  asignarValor(
    "hc001Provincia",
    paciente.provincia
  );

  asignarValor(
    "hc001Canton",
    paciente.canton
  );

  asignarValor(
    "hc001Parroquia",
    paciente.parroquia
  );

  asignarValor(
    "hc001Barrio",
    paciente.barrio
  );

  asignarValor(
    "hc001CallePrincipal",
    paciente.calle_principal
  );

  asignarValor(
    "hc001CalleSecundaria",
    paciente.calle_secundaria
  );

  asignarValor(
    "hc001Referencia",
    paciente.referencia
  );

  /* =========================================
     INFORMACIÓN LABORAL Y SEGURO
  ========================================= */

  asignarValor(
    "hc001Ocupacion",
    paciente.ocupacion
  );

  asignarValor(
    "hc001Seguro",
    paciente.tipo_seguro
  );

  /* =========================================
     DATOS DEL FAMILIAR
  ========================================= */

  asignarValor(
    "hc001NombresFamiliar",
    nombresFamiliar
  );

  asignarValor(
    "hc001ParentescoFamiliar",
    paciente.parentesco_familiar
  );

  asignarValor(
    "hc001DireccionFamiliar",
    paciente.direccion_familiar
  );

  asignarValor(
    "hc001TelefonoFamiliar",
    paciente.telefono_familiar
  );
}

async function cargarBorradorFormulario001() {
  try {
    const pacienteId =
      pacienteHistoriaClinicaSeleccionado?.id;

    if (!pacienteId) {
      return;
    }

    const fechaProcedimiento =
      obtenerFechaProcedimientoPacienteHC(
        pacienteHistoriaClinicaSeleccionado
      );

    if (!fechaProcedimiento) {
      return;
    }

    const parametros =
      new URLSearchParams({
        paciente_id:
          String(pacienteId),

        fecha_procedimiento:
          String(fechaProcedimiento)
      });

    const respuestaHTTP = await fetch(
      `/api/hclinicas/001/borrador?${parametros.toString()}`
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo consultar el formulario 001"
      );
    }

    if (
      !respuesta.existe ||
      !respuesta.formulario
    ) {
      return;
    }

    const datosBorrador =
      respuesta.formulario.datos || {};

    /*
      Primero se colocan los datos que estaban
      guardados en el borrador.
    */
    cargarDatosEnFormulario001(
      datosBorrador
    );

    /*
      Después se actualizan los datos maestros
      tomando la información actual del paciente.
    */
    await actualizarDatosMaestrosFormulario001();

    const estadoFormulario = String(
      respuesta.formulario.estado || ""
    ).toUpperCase();

    /*
      Si ya está cerrado, bloquearlo al volver
      a cargar la página.
    */
    if (estadoFormulario === "CERRADO") {
      bloquearFormulario001Cerrado({
        cerradoPor:
          respuesta.formulario
            .cerradoPorNombre ||
          respuesta.formulario
            .cerradoPorUsername ||
          "",

        fechaCierre:
          respuesta.formulario
            .fechaCierre ||
          ""
      });
    }

  } catch (error) {
    console.error(
      "ERROR CARGANDO FORMULARIO 001:",
      error
    );

    alert(
      error.message ||
      "No se pudo cargar el formulario 001"
    );
  }
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

function resolverRutaDocumentoHC(rutaRelativa) {
  const carpetaRaiz = path.resolve(
    __dirname,
    "formularios"
  );

  const rutaCompleta = path.resolve(
    carpetaRaiz,
    String(rutaRelativa || "")
  );

  const rutaValida =
    rutaCompleta.startsWith(carpetaRaiz + path.sep);

  if (!rutaValida) {
    throw new Error("Ruta de documento no permitida");
  }

  return rutaCompleta;
}

async function cargarDocumentosPacienteHC(

  
  
  pacienteId,
  fechaProcedimiento = ""
) 


{
  const contenedor = document.getElementById(
    "hcDocumentosGenerados"
  );

  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="empty-row">
      Cargando documentos...
    </div>
  `;

  const seccionDocumentos = document.getElementById(
  "hcSeccionDocumentosGenerados"
);

if (seccionDocumentos) {
  seccionDocumentos.style.display = "block";
}

  try {
    const parametros = fechaProcedimiento
      ? `?fecha=${encodeURIComponent(fechaProcedimiento)}`
      : "";

    const respuesta = await fetch(
      `/api/hclinicas/pacientes/${pacienteId}/documentos${parametros}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar los documentos"
      );
    }

    
    const documentos = Array.isArray(
      resultado.documentos
    )
      ? resultado.documentos
      : [];

    renderDocumentosPacienteHC(documentos);

  } catch (error) {
    console.error(
      "Error cargando documentos HC:",
      error
    );

    contenedor.innerHTML = `
      <div class="empty-row">
        ${escaparHTMLHC(error.message)}
      </div>
    `;
  }
}

function renderDocumentosPacienteHC(documentos) {
  const contenedor = document.getElementById(
    "hcDocumentosGenerados"
  );

  if (!contenedor) return;

  if (!documentos.length) {
    contenedor.innerHTML = `
      <div class="empty-row">
        Este paciente todavía no tiene formularios generados.
      </div>
    `;
    return;
  }

  const grupos = documentos.reduce((acumulado, documento) => {
    const clave = documento.codigo_formulario;

    if (!acumulado[clave]) {
      acumulado[clave] = {
        codigo: documento.codigo_formulario,
        nombre: documento.nombre_formulario,
        versiones: []
      };
    }

    acumulado[clave].versiones.push(documento);
    return acumulado;
  }, {});

  contenedor.innerHTML = `
    <div class="hc-documentos-lista">
      ${Object.values(grupos).map(grupo => `
        <div class="table-card hc-documento-grupo">
          <div class="table-header">
            <div>
              <h3>
                ${escaparHTMLHC(grupo.codigo)}
                ${escaparHTMLHC(grupo.nombre)}
              </h3>
              <p>
                ${grupo.versiones.length} versión(es)
              </p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="patient-table">
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Generado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                ${grupo.versiones.map(documento => `
                  <tr>
                    <td>V${documento.version}</td>
                    <td>${escaparHTMLHC(documento.estado)}</td>
                    <td>
                      ${
                        documento.fecha_creacion
                          ? new Date(
                              documento.fecha_creacion
                            ).toLocaleString("es-EC")
                          : ""
                      }
                    </td>
                    <td>
                      ${escaparHTMLHC(
                        documento.creado_por_nombre ||
                        documento.creado_por_username ||
                        ""
                      )}
                    </td>
                    <td>
                      <div class="table-actions">
                        <button
                          type="button"
                          class="btn-table edit"
                          data-ver-documento="${documento.id}"
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          class="btn-table edit"
                          data-descargar-documento="${documento.id}"
                        >
                          Descargar
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="form-actions" style="margin-top:20px;">
      <button
        type="button"
        class="btn-primary"
        id="btnGenerarHCConsolidada"
      >
        <i class="fa-solid fa-file-medical"></i>
        Generar historia clínica consolidada
      </button>
    </div>
  `;

  contenedor
    .querySelectorAll("[data-ver-documento]")
    .forEach(boton => {
      boton.addEventListener("click", () => {
        const id = boton.dataset.verDocumento;

        window.open(
          `/api/hclinicas/documentos/${id}/ver`,
          "_blank"
        );
      });
    });

  contenedor
    .querySelectorAll("[data-descargar-documento]")
    .forEach(boton => {
      boton.addEventListener("click", () => {
        const id = boton.dataset.descargarDocumento;

        window.location.href =
          `/api/hclinicas/documentos/${id}/descargar`;
      });
    });
}

async function cargarEstadosFormulariosHistoriaClinica() {
  try {
    const paciente =
      pacienteHistoriaClinicaSeleccionado;

    if (!paciente?.id) {
      return;
    }

    const fechaProcedimiento =
      obtenerFechaProcedimientoPacienteHC(
        paciente
      );

    if (!fechaProcedimiento) {
      return;
    }

    const parametros = new URLSearchParams({
      paciente_id: String(paciente.id),
      fecha_procedimiento:
        String(fechaProcedimiento)
    });

    const respuestaHTTP = await fetch(
      `/api/hclinicas/formularios-estados?${parametros.toString()}`
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudieron consultar los estados"
      );
    }

    const estados = respuesta.estados || {};

    document
      .querySelectorAll(
        ".hc-formulario-card"
      )
      .forEach(tarjeta => {
        const codigo = String(
          tarjeta.dataset
            .codigoFormulario || ""
        )
          .trim()
          .toUpperCase();

        const estadoRegistrado = String(
          estados[codigo]?.estado ||
          "PENDIENTE"
        )
          .trim()
          .toUpperCase();

        actualizarEstadoTarjetaFormularioHC(
          tarjeta,
          estadoRegistrado
        );
      });

  } catch (error) {
    console.error(
      "ERROR CARGANDO ESTADOS DE FORMULARIOS:",
      error
    );
  }
}

function actualizarEstadoTarjetaFormularioHC(
  tarjeta,
  estado
) {
  if (!tarjeta) {
    return;
  }

  const etiqueta = tarjeta.querySelector(
    ".hc-formulario-estado"
  );

  if (!etiqueta) {
    return;
  }

  const estadoNormalizado = String(
    estado || "PENDIENTE"
  )
    .trim()
    .toUpperCase();

  const configuraciones = {
    PENDIENTE: {
      texto: "Pendiente",
      clase: "pendiente",
      icono: "fa-regular fa-clock"
    },

    BORRADOR: {
      texto: "Borrador",
      clase: "borrador",
      icono: "fa-solid fa-pen-to-square"
    },

    CERRADO: {
      texto: "Cerrado",
      clase: "cerrado",
      icono: "fa-solid fa-lock"
    },

    FIRMADO: {
      texto: "Firmado",
      clase: "firmado",
      icono: "fa-solid fa-file-signature"
    },

    ANULADO: {
      texto: "Anulado",
      clase: "anulado",
      icono: "fa-solid fa-ban"
    }
  };

  const configuracion =
    configuraciones[estadoNormalizado] ||
    configuraciones.PENDIENTE;

  etiqueta.className =
    `hc-formulario-estado ${configuracion.clase}`;

  etiqueta.innerHTML = `
    <i class="${configuracion.icono}"></i>
    ${configuracion.texto}
  `;

  tarjeta.dataset.estadoFormulario =
    estadoNormalizado;
}

async function cargarCategoriasProfesionalesSalud() {
  const select = document.getElementById("profCategoria");

  if (!select) return;

  try {
    const respuesta = await fetch(
      "/api/profesionales-categorias"
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar las categorías"
      );
    }

    const categorias =
      resultado.categorias || [];

    const categoriasActivas =
      categorias.filter(
        categoria =>
          categoria.estado === "ACTIVO"
      );

    select.innerHTML = `
      <option value="">
        Seleccione una categoría
      </option>

      ${categoriasActivas
        .map(
          categoria => `
            <option value="${categoria.id}">
              ${categoria.nombre}
            </option>
          `
        )
        .join("")}
    `;

  } catch (error) {
    console.error(
      "Error cargando categorías de profesionales:",
      error
    );

    select.innerHTML = `
      <option value="">
        Error al cargar categorías
      </option>
    `;
  }
}

async function cargarEspecialidadesProfesionalesSalud() {
  const select = document.getElementById(
    "profEspecialidad"
  );

  if (!select) return;

  try {
    const respuesta = await fetch(
      "/api/profesionales-especialidades"
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar las especialidades"
      );
    }

    const especialidades =
      resultado.especialidades || [];

    const especialidadesActivas =
      especialidades.filter(
        especialidad =>
          especialidad.estado === "ACTIVO"
      );

    select.innerHTML = `
      <option value="">
        Seleccione una especialidad
      </option>

      ${especialidadesActivas
        .map(
          especialidad => `
            <option value="${especialidad.id}">
              ${especialidad.nombre}
            </option>
          `
        )
        .join("")}
    `;

  } catch (error) {
    console.error(
      "Error cargando especialidades:",
      error
    );

    select.innerHTML = `
      <option value="">
        Error al cargar especialidades
      </option>
    `;
  }
}

async function inicializarModuloProfesionalesSalud() {
  const formulario = document.getElementById(
    "formProfesionalSalud"
  );

  if (!formulario) return;

  await Promise.all([
    cargarCategoriasProfesionalesSalud(),
    cargarEspecialidadesProfesionalesSalud()
  ]);

  await cargarProfesionalesSalud();

  formulario.addEventListener(
    "submit",
    guardarProfesionalSalud
  );

  document
    .getElementById(
      "btnCancelarEdicionProfesional"
    )
    ?.addEventListener(
      "click",
      limpiarFormularioProfesionalSalud
    );

  const buscador = document.getElementById(
    "buscarProfesionalSalud"
  );

  let temporizadorBusqueda;

  buscador?.addEventListener(
    "input",
    () => {
      clearTimeout(
        temporizadorBusqueda
      );

      temporizadorBusqueda = setTimeout(
        () => {
          cargarProfesionalesSalud(
            buscador.value.trim()
          );
        },
        300
      );
    }
  );
}

function mostrarMensajeProfesional(
  mensaje,
  tipo = "ok"
) {
  const contenedor = document.getElementById(
    "mensajeProfesionalSalud"
  );

  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="${
      tipo === "error"
        ? "alert-error"
        : "alert-success"
    }">
      ${mensaje}
    </div>
  `;
}

function obtenerDatosProfesionalSalud() {
  return {
    primerNombre:
      document.getElementById(
        "profPrimerNombre"
      )?.value.trim() || "",

    segundoNombre:
      document.getElementById(
        "profSegundoNombre"
      )?.value.trim() || "",

    primerApellido:
      document.getElementById(
        "profPrimerApellido"
      )?.value.trim() || "",

    segundoApellido:
      document.getElementById(
        "profSegundoApellido"
      )?.value.trim() || "",

    tipoIdentificacion:
      document.getElementById(
        "profTipoIdentificacion"
      )?.value || "CÉDULA",

    cedula:
      document.getElementById(
        "profCedula"
      )?.value.trim() || "",

    categoriaId:
      document.getElementById(
        "profCategoria"
      )?.value || "",

    especialidadId:
      document.getElementById(
        "profEspecialidad"
      )?.value || "",

    registroProfesional:
      document.getElementById(
        "profRegistroProfesional"
      )?.value.trim() || ""
  };
}

async function guardarProfesionalSalud(evento) {
  evento.preventDefault();

  const boton = document.getElementById(
    "btnGuardarProfesional"
  );

  const profesionalId = Number(
    document.getElementById(
      "profesionalSaludId"
    )?.value || 0
  );

  const esEdicion = profesionalId > 0;

  try {
    const datos =
      obtenerDatosProfesionalSalud();

    if (
      !datos.primerNombre ||
      !datos.primerApellido ||
      !datos.cedula ||
      !datos.categoriaId ||
      !datos.especialidadId
    ) {
      mostrarMensajeProfesional(
        "Completa todos los campos obligatorios.",
        "error"
      );

      return;
    }

    if (boton) {
      boton.disabled = true;
      boton.textContent = esEdicion
        ? "Actualizando profesional..."
        : "Guardando profesional...";
    }

    const url = esEdicion
      ? `/api/profesionales-salud/${profesionalId}`
      : "/api/profesionales-salud";

    const metodo = esEdicion
      ? "PUT"
      : "POST";

    const respuesta = await fetch(url, {
      method: metodo,

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(datos)
    });

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo guardar el profesional"
      );
    }

    const idFinal = esEdicion
      ? profesionalId
      : Number(resultado.profesionalId);

    if (!idFinal) {
      throw new Error(
        "No se recibió el identificador del profesional"
      );
    }

    await subirImagenesProfesional(idFinal);

    mostrarMensajeProfesional(
      esEdicion
        ? "Profesional actualizado correctamente."
        : "Profesional registrado correctamente."
    );

    limpiarFormularioProfesionalSalud();

    await cargarProfesionalesSalud(
      document.getElementById(
        "buscarProfesionalSalud"
      )?.value.trim() || ""
    );

  } catch (error) {
    console.error(
      "Error guardando profesional:",
      error
    );

    mostrarMensajeProfesional(
      error.message,
      "error"
    );

  } finally {
    if (boton) {
      boton.disabled = false;

      boton.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Guardar profesional
      `;
    }
  }
}

async function cargarProfesionalesSalud(
  busqueda = ""
) {
  const cuerpoTabla =
    document.getElementById(
      "tablaProfesionalesSaludBody"
    );

  if (!cuerpoTabla) return;

  cuerpoTabla.innerHTML = `
    <tr>
      <td colspan="8" class="empty-row">
        Cargando profesionales...
      </td>
    </tr>
  `;

  try {
    const respuesta = await fetch(
      `/api/profesionales-salud?buscar=${encodeURIComponent(
        busqueda
      )}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar los profesionales"
      );
    }

    const profesionales =
      resultado.profesionales || [];

    if (!profesionales.length) {
      cuerpoTabla.innerHTML = `
        <tr>
          <td colspan="8" class="empty-row">
            No hay profesionales registrados.
          </td>
        </tr>
      `;

      return;
    }

    cuerpoTabla.innerHTML = profesionales
      .map(
        profesional => `
          <tr>

            <td>
              <strong>
                ${profesional.nombre_completo || ""}
              </strong>

              ${
                profesional.registro_profesional
                  ? `
                    <br>
                    <small>
                      Registro:
                      ${profesional.registro_profesional}
                    </small>
                  `
                  : ""
              }
            </td>

            <td>
              ${profesional.cedula || ""}
            </td>

            <td>
              ${profesional.categoria || ""}
            </td>

            <td>
              ${profesional.especialidad || ""}
            </td>

            <td>
              ${
                profesional.firma_ruta
                  ? `
                    <span class="status activo">
                      Cargada
                    </span>
                  `
                  : `
                    <span class="status inactivo">
                      Pendiente
                    </span>
                  `
              }
            </td>

            <td>
              ${
                profesional.sello_ruta
                  ? `
                    <span class="status activo">
                      Cargado
                    </span>
                  `
                  : `
                    <span class="status inactivo">
                      Pendiente
                    </span>
                  `
              }
            </td>

            <td>
              <span
                class="status ${
                  profesional.estado === "ACTIVO"
                    ? "activo"
                    : "inactivo"
                }"
              >
                ${profesional.estado || ""}
              </span>
            </td>

            <td>
              <button
                type="button"
                class="btn-secondary"
                onclick="editarProfesionalSalud(${profesional.id})"
              >
                Editar
              </button>

              <button
                type="button"
                class="btn-secondary"
                onclick="cambiarEstadoProfesionalSalud(${profesional.id})"
              >
                ${
                  profesional.estado === "ACTIVO"
                    ? "Inactivar"
                    : "Activar"
                }
              </button>
            </td>

          </tr>
        `
      )
      .join("");

  } catch (error) {
    console.error(
      "Error cargando profesionales:",
      error
    );

    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">
          ${error.message}
        </td>
      </tr>
    `;
  }
}

async function editarProfesionalSalud(
  profesionalId
) {
  try {
    const respuesta = await fetch(
      `/api/profesionales-salud/${profesionalId}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo consultar el profesional"
      );
    }

    const profesional =
      resultado.profesional;

    if (!profesional) {
      throw new Error(
        "No se encontró el profesional"
      );
    }

    document.getElementById(
      "profesionalSaludId"
    ).value = profesional.id || "";

    document.getElementById(
      "profPrimerNombre"
    ).value =
      profesional.primer_nombre || "";

    document.getElementById(
      "profSegundoNombre"
    ).value =
      profesional.segundo_nombre || "";

    document.getElementById(
      "profPrimerApellido"
    ).value =
      profesional.primer_apellido || "";

    document.getElementById(
      "profSegundoApellido"
    ).value =
      profesional.segundo_apellido || "";

    document.getElementById(
      "profTipoIdentificacion"
    ).value =
      profesional.tipo_identificacion ||
      "CÉDULA";

    document.getElementById(
      "profCedula"
    ).value =
      profesional.cedula || "";

    document.getElementById(
      "profCategoria"
    ).value =
      String(
        profesional.categoria_id || ""
      );

    document.getElementById(
      "profEspecialidad"
    ).value =
      String(
        profesional.especialidad_id || ""
      );

    document.getElementById(
      "profRegistroProfesional"
    ).value =
      profesional.registro_profesional ||
      "";

    const titulo = document.getElementById(
      "tituloFormularioProfesional"
    );

    if (titulo) {
      titulo.textContent =
        "EDITAR PROFESIONAL DE SALUD";
    }

    const botonGuardar =
      document.getElementById(
        "btnGuardarProfesional"
      );

    if (botonGuardar) {
      botonGuardar.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Actualizar profesional
      `;
    }

    const botonCancelar =
      document.getElementById(
        "btnCancelarEdicionProfesional"
      );

    if (botonCancelar) {
      botonCancelar.style.display =
        "inline-flex";
    }

    const vistaFirma =
      document.getElementById(
        "vistaPreviaFirmaProfesional"
      );

    if (vistaFirma) {
      vistaFirma.style.display =
        "block";

      vistaFirma.innerHTML =
        profesional.firma_ruta
          ? `
            <div class="alert-success">
              Este profesional ya tiene una firma cargada.
              Seleccione otra imagen únicamente si desea reemplazarla.
            </div>
          `
          : `
            <div class="alert-error">
              Este profesional no tiene firma cargada.
            </div>
          `;
    }

    const vistaSello =
      document.getElementById(
        "vistaPreviaSelloProfesional"
      );

    if (vistaSello) {
      vistaSello.style.display =
        "block";

      vistaSello.innerHTML =
        profesional.sello_ruta
          ? `
            <div class="alert-success">
              Este profesional ya tiene un sello cargado.
              Seleccione otra imagen únicamente si desea reemplazarlo.
            </div>
          `
          : `
            <div class="alert-error">
              Este profesional no tiene sello cargado.
            </div>
          `;
    }

    document
      .getElementById(
        "formProfesionalSalud"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

  } catch (error) {
    console.error(
      "Error cargando profesional para editar:",
      error
    );

    mostrarMensajeProfesional(
      error.message,
      "error"
    );
  }
}

async function cambiarEstadoProfesionalSalud(
  profesionalId
) {
  try {
    const confirmar = window.confirm(
      "¿Desea cambiar el estado de este profesional?"
    );

    if (!confirmar) return;

    const respuesta = await fetch(
      `/api/profesionales-salud/estado/${profesionalId}`,
      {
        method: "PATCH"
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo cambiar el estado"
      );
    }

    mostrarMensajeProfesional(
      resultado.mensaje ||
      "Estado actualizado correctamente."
    );

    await cargarProfesionalesSalud(
      document.getElementById(
        "buscarProfesionalSalud"
      )?.value.trim() || ""
    );

  } catch (error) {
    console.error(
      "Error cambiando estado del profesional:",
      error
    );

    mostrarMensajeProfesional(
      error.message,
      "error"
    );
  }
}

function limpiarFormularioProfesionalSalud() {
  const formulario = document.getElementById(
    "formProfesionalSalud"
  );

  if (formulario) {
    formulario.reset();
  }

  const campoId = document.getElementById(
    "profesionalSaludId"
  );

  if (campoId) {
    campoId.value = "";
  }

  const tipoIdentificacion =
    document.getElementById(
      "profTipoIdentificacion"
    );

  if (tipoIdentificacion) {
    tipoIdentificacion.value = "CÉDULA";
  }

  const titulo = document.getElementById(
    "tituloFormularioProfesional"
  );

  if (titulo) {
    titulo.textContent =
      "REGISTRAR PROFESIONAL DE SALUD";
  }

  const botonGuardar = document.getElementById(
    "btnGuardarProfesional"
  );

  if (botonGuardar) {
    botonGuardar.disabled = false;

    botonGuardar.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Guardar profesional
    `;
  }

  const botonCancelar =
    document.getElementById(
      "btnCancelarEdicionProfesional"
    );

  if (botonCancelar) {
    botonCancelar.style.display = "none";
  }

  const firmaInput =
    document.getElementById("profFirma");

  const selloInput =
    document.getElementById("profSello");

  if (firmaInput) {
    firmaInput.value = "";
  }

  if (selloInput) {
    selloInput.value = "";
  }

  const vistaFirma = document.getElementById(
    "vistaPreviaFirmaProfesional"
  );

  const vistaSello = document.getElementById(
    "vistaPreviaSelloProfesional"
  );

  if (vistaFirma) {
    vistaFirma.innerHTML = "";
    vistaFirma.style.display = "none";
  }

  if (vistaSello) {
    vistaSello.innerHTML = "";
    vistaSello.style.display = "none";
  }
}

async function subirImagenesProfesional(
  profesionalId
) {
  const firma = document.getElementById(
    "profFirma"
  )?.files?.[0];

  const sello = document.getElementById(
    "profSello"
  )?.files?.[0];

  if (!firma && !sello) {
    return;
  }

  const datosImagenes = new FormData();

  if (firma) {
    datosImagenes.append("firma", firma);
  }

  if (sello) {
    datosImagenes.append("sello", sello);
  }

  const respuesta = await fetch(
    `/api/profesionales-salud/${profesionalId}/imagenes`,
    {
      method: "POST",
      body: datosImagenes
    }
  );

  const resultado = await respuesta
    .json()
    .catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(
      resultado.error ||
      "No se pudieron guardar la firma o el sello"
    );
  }
}

async function editarProfesionalSalud(profesionalId) {
  try {
    const respuesta = await fetch(
      `/api/profesionales-salud/${profesionalId}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo cargar el profesional"
      );
    }

    const profesional = resultado.profesional;

    if (!profesional) {
      throw new Error(
        "No se encontró el profesional"
      );
    }

    document.getElementById(
      "profesionalSaludId"
    ).value = profesional.id || "";

    document.getElementById(
      "profPrimerNombre"
    ).value = profesional.primer_nombre || "";

    document.getElementById(
      "profSegundoNombre"
    ).value = profesional.segundo_nombre || "";

    document.getElementById(
      "profPrimerApellido"
    ).value = profesional.primer_apellido || "";

    document.getElementById(
      "profSegundoApellido"
    ).value = profesional.segundo_apellido || "";

    document.getElementById(
      "profTipoIdentificacion"
    ).value =
      profesional.tipo_identificacion ||
      "CÉDULA";

    document.getElementById(
      "profCedula"
    ).value = profesional.cedula || "";

    document.getElementById(
      "profCategoria"
    ).value = String(
      profesional.categoria_id || ""
    );

    document.getElementById(
      "profEspecialidad"
    ).value = String(
      profesional.especialidad_id || ""
    );

    document.getElementById(
      "profRegistroProfesional"
    ).value =
      profesional.registro_profesional || "";

    const titulo = document.getElementById(
      "tituloFormularioProfesional"
    );

    if (titulo) {
      titulo.textContent =
        "EDITAR PROFESIONAL DE SALUD";
    }

    const botonGuardar =
      document.getElementById(
        "btnGuardarProfesional"
      );

    if (botonGuardar) {
      botonGuardar.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Actualizar profesional
      `;
    }

    const botonCancelar =
      document.getElementById(
        "btnCancelarEdicionProfesional"
      );

    if (botonCancelar) {
      botonCancelar.style.display =
        "inline-flex";
    }

    const vistaFirma =
      document.getElementById(
        "vistaPreviaFirmaProfesional"
      );

    if (vistaFirma) {
      vistaFirma.style.display = "block";

      vistaFirma.innerHTML =
        profesional.firma_ruta
          ? `
            <div class="alert-success">
              Firma cargada. Seleccione otra imagen
              solamente para reemplazarla.
            </div>
          `
          : `
            <div class="alert-error">
              Este profesional no tiene firma cargada.
            </div>
          `;
    }

    const vistaSello =
      document.getElementById(
        "vistaPreviaSelloProfesional"
      );

    if (vistaSello) {
      vistaSello.style.display = "block";

      vistaSello.innerHTML =
        profesional.sello_ruta
          ? `
            <div class="alert-success">
              Sello cargado. Seleccione otra imagen
              solamente para reemplazarlo.
            </div>
          `
          : `
            <div class="alert-error">
              Este profesional no tiene sello cargado.
            </div>
          `;
    }

    document
      .getElementById(
        "formProfesionalSalud"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

  } catch (error) {
    console.error(
      "Error cargando profesional:",
      error
    );

    alert(error.message);
  }
}

/*ACTIVAR O INACTIVAR PROFESIONAL DE SALUD */
async function cambiarEstadoProfesionalSalud(
  profesionalId
) {
  try {
    const confirmar = window.confirm(
      "¿Desea cambiar el estado de este profesional?"
    );

    if (!confirmar) return;

    const respuesta = await fetch(
      `/api/profesionales-salud/estado/${profesionalId}`,
      {
        method: "PATCH"
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo cambiar el estado"
      );
    }

    alert(
      resultado.mensaje ||
      "Estado actualizado correctamente."
    );

    const busqueda =
      document.getElementById(
        "buscarProfesionalSalud"
      )?.value.trim() || "";

    await cargarProfesionalesSalud(
      busqueda
    );

  } catch (error) {
    console.error(
      "Error cambiando estado:",
      error
    );

    alert(error.message);
  }
}
/*Hacer disponibles las funciones para los botones */
window.editarProfesionalSalud =
  editarProfesionalSalud;

window.cambiarEstadoProfesionalSalud =
  cambiarEstadoProfesionalSalud;

  /*CONECTAR BOTONES DE IMPORTACION DE DIAGNOSTICOS CIE */
  function mostrarResultadoImportacionCIE(
  mensaje,
  tipo = "ok"
) {
  const contenedor = document.getElementById(
    "resultadoImportacionCIE"
  );

  if (!contenedor) return;

  contenedor.style.display = "block";

  contenedor.innerHTML = `
    <div class="${
      tipo === "error"
        ? "alert-error"
        : "alert-success"
    }">
      ${mensaje}
    </div>
  `;
}

function descargarPlantillaDiagnosticosCIE() {
  window.location.href =
    "/api/diagnosticos-cie/plantilla";
}

function seleccionarArchivoDiagnosticosCIE() {
  document
    .getElementById("archivoImportarCIE")
    ?.click();
}

function actualizarArchivoSeleccionadoCIE() {
  const input = document.getElementById(
    "archivoImportarCIE"
  );

  const nombreArchivo =
    document.getElementById(
      "nombreArchivoImportarCIE"
    );

  const botonImportar =
    document.getElementById(
      "btnEjecutarImportacionCIE"
    );

  const archivo = input?.files?.[0];

  if (!archivo) {
    if (nombreArchivo) {
      nombreArchivo.textContent =
        "Ningún archivo seleccionado.";
    }

    if (botonImportar) {
      botonImportar.disabled = true;
    }

    return;
  }

  if (nombreArchivo) {
    nombreArchivo.textContent =
      `Archivo seleccionado: ${archivo.name}`;
  }

  if (botonImportar) {
    botonImportar.disabled = false;
  }

  const resultado =
    document.getElementById(
      "resultadoImportacionCIE"
    );

  if (resultado) {
    resultado.style.display = "none";
    resultado.innerHTML = "";
  }
}

/*AGREGAR FUNCION IMPORTAR DIAGNOSTICOS CIE */
async function importarDiagnosticosCIE() {
  const input = document.getElementById(
    "archivoImportarCIE"
  );

  const boton = document.getElementById(
    "btnEjecutarImportacionCIE"
  );

  const archivo = input?.files?.[0];

  if (!archivo) {
    mostrarResultadoImportacionCIE(
      "Seleccione un archivo Excel.",
      "error"
    );

    return;
  }

  try {
    boton.disabled = true;
    boton.textContent =
      "Importando diagnósticos...";

    const datosFormulario = new FormData();

    datosFormulario.append(
      "archivo",
      archivo
    );

    const respuesta = await fetch(
      "/api/diagnosticos-cie/importar",
      {
        method: "POST",
        body: datosFormulario
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        resultado.detalle ||
        "No se pudieron importar los diagnósticos"
      );
    }

    let detalleErrores = "";

    if (
      Array.isArray(
        resultado.erroresDetalle
      ) &&
      resultado.erroresDetalle.length
    ) {
      detalleErrores = `
        <details style="margin-top:12px;">
          <summary>
            Ver errores encontrados
          </summary>

          <div style="margin-top:10px;">
            ${resultado.erroresDetalle
              .map(
                errorFila => `
                  <div>
                    Fila ${errorFila.fila || "-"}:
                    ${
                      errorFila.codigo
                        ? `${errorFila.codigo} - `
                        : ""
                    }
                    ${errorFila.error || ""}
                  </div>
                `
              )
              .join("")}
          </div>
        </details>
      `;
    }

    mostrarResultadoImportacionCIE(`
      <strong>
        Importación finalizada correctamente
      </strong>

      <div style="margin-top:10px;">
        Total de filas:
        ${resultado.totalFilas || 0}
      </div>

      <div>
        Filas válidas:
        ${resultado.filasValidas || 0}
      </div>

      <div>
        Diagnósticos insertados:
        ${resultado.insertados || 0}
      </div>

      <div>
        Códigos duplicados omitidos:
        ${resultado.omitidosDuplicados || 0}
      </div>

      <div>
        Filas con errores:
        ${resultado.errores || 0}
      </div>

      ${detalleErrores}
    `);

    input.value = "";

    const nombreArchivo =
      document.getElementById(
        "nombreArchivoImportarCIE"
      );

    if (nombreArchivo) {
      nombreArchivo.textContent =
        "Ningún archivo seleccionado.";
    }

    const buscador =
      document.getElementById(
        "buscarDiagnosticoCIE"
      );

    if (
      buscador &&
      typeof cargarDiagnosticosCIE ===
        "function"
    ) {
      await cargarDiagnosticosCIE(
        buscador.value.trim()
      );
    }

  } catch (error) {
    console.error(
      "Error importando diagnósticos CIE:",
      error
    );

    mostrarResultadoImportacionCIE(
      error.message,
      "error"
    );

  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent =
        "Importar diagnósticos";
    }
  }
}

/*INICIALIZACION DE MODULO CIE */
function inicializarModuloDiagnosticosCIE() {
  const formulario =
    document.getElementById(
      "formDiagnosticoCIE"
    );

  if (!formulario) return;

  formulario.addEventListener(
    "submit",
    guardarDiagnosticoCIE
  );

  document
    .getElementById(
      "btnCancelarEdicionDiagnosticoCIE"
    )
    ?.addEventListener(
      "click",
      limpiarFormularioDiagnosticoCIE
    );

  document
    .getElementById(
      "btnDescargarPlantillaCIE"
    )
    ?.addEventListener(
      "click",
      descargarPlantillaDiagnosticosCIE
    );

  document
    .getElementById(
      "btnSeleccionarArchivoCIE"
    )
    ?.addEventListener(
      "click",
      seleccionarArchivoDiagnosticosCIE
    );

  document
    .getElementById(
      "archivoImportarCIE"
    )
    ?.addEventListener(
      "change",
      actualizarArchivoSeleccionadoCIE
    );

  document
    .getElementById(
      "btnEjecutarImportacionCIE"
    )
    ?.addEventListener(
      "click",
      importarDiagnosticosCIE
    );

  const buscador = document.getElementById(
    "buscarDiagnosticoCIE"
  );

  let temporizadorBusqueda;

  buscador?.addEventListener(
    "input",
    () => {
      clearTimeout(
        temporizadorBusqueda
      );

      temporizadorBusqueda =
        setTimeout(() => {
          cargarDiagnosticosCIE(
            buscador.value.trim()
          );
        }, 300);
    }
  );

  cargarDiagnosticosCIE("");
}

async function cargarDiagnosticosCIE(
  busqueda = ""
) {
  const cuerpoTabla =
    document.getElementById(
      "tablaDiagnosticosCIEBody"
    );

  if (!cuerpoTabla) return;

  cuerpoTabla.innerHTML = `
    <tr>
      <td colspan="4" class="empty-row">
        Cargando diagnósticos...
      </td>
    </tr>
  `;

  try {
    const respuesta = await fetch(
      `/api/diagnosticos-cie?buscar=${encodeURIComponent(
        busqueda
      )}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar los diagnósticos"
      );
    }

    const diagnosticos =
      resultado.diagnosticos || [];

    if (!diagnosticos.length) {
      cuerpoTabla.innerHTML = `
        <tr>
          <td colspan="4" class="empty-row">
            No se encontraron diagnósticos.
          </td>
        </tr>
      `;

      return;
    }

    cuerpoTabla.innerHTML =
      diagnosticos
        .map(
          diagnostico => `
            <tr>

              <td>
                <strong>
                  ${diagnostico.codigo || ""}
                </strong>
              </td>

              <td>
                ${diagnostico.descripcion || ""}
              </td>

              <td>
                <span
                  class="status ${
                    diagnostico.estado === "ACTIVO"
                      ? "activo"
                      : "inactivo"
                  }"
                >
                  ${diagnostico.estado || ""}
                </span>
              </td>

              <td>
                <button
                  type="button"
                  class="btn-secondary"
                  onclick="editarDiagnosticoCIE(${diagnostico.id})"
                >
                  Editar
                </button>

                <button
                  type="button"
                  class="btn-secondary"
                  onclick="cambiarEstadoDiagnosticoCIE(${diagnostico.id})"
                >
                  ${
                    diagnostico.estado === "ACTIVO"
                      ? "Inactivar"
                      : "Activar"
                  }
                </button>
              </td>

            </tr>
          `
        )
        .join("");

  } catch (error) {
    console.error(
      "Error cargando diagnósticos CIE:",
      error
    );

    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="4" class="empty-row">
          ${error.message}
        </td>
      </tr>
    `;
  }
}

function mostrarMensajeDiagnosticoCIE(
  mensaje,
  tipo = "ok"
) {
  const contenedor = document.getElementById(
    "mensajeDiagnosticoCIE"
  );

  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="${
      tipo === "error"
        ? "alert-error"
        : "alert-success"
    }">
      ${mensaje}
    </div>
  `;
}

function limpiarFormularioDiagnosticoCIE() {
  const formulario = document.getElementById(
    "formDiagnosticoCIE"
  );

  formulario?.reset();

  const campoId = document.getElementById(
    "diagnosticoCieId"
  );

  if (campoId) {
    campoId.value = "";
  }

  const titulo = document.getElementById(
    "tituloFormularioDiagnosticoCIE"
  );

  if (titulo) {
    titulo.textContent =
      "REGISTRAR DIAGNÓSTICO CIE";
  }

  const botonGuardar = document.getElementById(
    "btnGuardarDiagnosticoCIE"
  );

  if (botonGuardar) {
    botonGuardar.disabled = false;

    botonGuardar.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Guardar diagnóstico
    `;
  }

  const botonCancelar =
    document.getElementById(
      "btnCancelarEdicionDiagnosticoCIE"
    );

  if (botonCancelar) {
    botonCancelar.style.display = "none";
  }
}


/*GUARDAR O ACTUALIZAR LOS DIAGNOSTICOS */
async function guardarDiagnosticoCIE(evento) {
  evento.preventDefault();

  const campoId = document.getElementById(
    "diagnosticoCieId"
  );

  const campoCodigo = document.getElementById(
    "diagnosticoCieCodigo"
  );

  const campoDescripcion =
    document.getElementById(
      "diagnosticoCieDescripcion"
    );

  const boton = document.getElementById(
    "btnGuardarDiagnosticoCIE"
  );

  const diagnosticoId = Number(
    campoId?.value || 0
  );

  const esEdicion = diagnosticoId > 0;

  const datos = {
    codigo:
      campoCodigo?.value.trim() || "",

    descripcion:
      campoDescripcion?.value.trim() || ""
  };

  if (!datos.codigo || !datos.descripcion) {
    mostrarMensajeDiagnosticoCIE(
      "El código y la descripción son obligatorios.",
      "error"
    );

    return;
  }

  try {
    if (boton) {
      boton.disabled = true;

      boton.textContent = esEdicion
        ? "Actualizando diagnóstico..."
        : "Guardando diagnóstico...";
    }

    const respuesta = await fetch(
      esEdicion
        ? `/api/diagnosticos-cie/${diagnosticoId}`
        : "/api/diagnosticos-cie",
      {
        method: esEdicion ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(datos)
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo guardar el diagnóstico"
      );
    }

    mostrarMensajeDiagnosticoCIE(
      resultado.mensaje ||
      (
        esEdicion
          ? "Diagnóstico actualizado correctamente."
          : "Diagnóstico registrado correctamente."
      )
    );

    limpiarFormularioDiagnosticoCIE();

    const buscador = document.getElementById(
      "buscarDiagnosticoCIE"
    );

    await cargarDiagnosticosCIE(
      buscador?.value.trim() || ""
    );

  } catch (error) {
    console.error(
      "Error guardando diagnóstico CIE:",
      error
    );

    mostrarMensajeDiagnosticoCIE(
      error.message,
      "error"
    );

  } finally {
    if (boton) {
      boton.disabled = false;

      boton.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        ${
          esEdicion
            ? "Actualizar diagnóstico"
            : "Guardar diagnóstico"
        }
      `;
    }
  }
}

/*EDITAR DIAGNOSTICOS */
async function editarDiagnosticoCIE(
  diagnosticoId
) {
  try {
    const respuesta = await fetch(
      `/api/diagnosticos-cie/${diagnosticoId}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo cargar el diagnóstico"
      );
    }

    const diagnostico =
      resultado.diagnostico;

    if (!diagnostico) {
      throw new Error(
        "No se encontró el diagnóstico"
      );
    }

    document.getElementById(
      "diagnosticoCieId"
    ).value = diagnostico.id || "";

    document.getElementById(
      "diagnosticoCieCodigo"
    ).value = diagnostico.codigo || "";

    document.getElementById(
      "diagnosticoCieDescripcion"
    ).value =
      diagnostico.descripcion || "";

    const titulo = document.getElementById(
      "tituloFormularioDiagnosticoCIE"
    );

    if (titulo) {
      titulo.textContent =
        "EDITAR DIAGNÓSTICO CIE";
    }

    const botonGuardar =
      document.getElementById(
        "btnGuardarDiagnosticoCIE"
      );

    if (botonGuardar) {
      botonGuardar.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Actualizar diagnóstico
      `;
    }

    const botonCancelar =
      document.getElementById(
        "btnCancelarEdicionDiagnosticoCIE"
      );

    if (botonCancelar) {
      botonCancelar.style.display =
        "inline-flex";
    }

    document
      .getElementById(
        "formDiagnosticoCIE"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

  } catch (error) {
    console.error(
      "Error editando diagnóstico CIE:",
      error
    );

    mostrarMensajeDiagnosticoCIE(
      error.message,
      "error"
    );
  }
}

/*FUNCION PARA ACTIVAR O DESACTIVAR DIAGNOSTICOS */
async function cambiarEstadoDiagnosticoCIE(
  diagnosticoId
) {
  const confirmar = window.confirm(
    "¿Desea cambiar el estado de este diagnóstico?"
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch(
      `/api/diagnosticos-cie/estado/${diagnosticoId}`,
      {
        method: "PATCH"
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo cambiar el estado"
      );
    }

    mostrarMensajeDiagnosticoCIE(
      resultado.mensaje ||
      "Estado actualizado correctamente."
    );

    const buscador = document.getElementById(
      "buscarDiagnosticoCIE"
    );

    await cargarDiagnosticosCIE(
      buscador?.value.trim() || ""
    );

  } catch (error) {
    console.error(
      "Error cambiando estado CIE:",
      error
    );

    mostrarMensajeDiagnosticoCIE(
      error.message,
      "error"
    );
  }
}

window.editarDiagnosticoCIE =
  editarDiagnosticoCIE;

window.cambiarEstadoDiagnosticoCIE =
  cambiarEstadoDiagnosticoCIE;



  /*formulario 008 */

/*consultar los datos del formulario 001 para 008 */
async function consultarDatosFormulario001Para008() {
  const paciente =
    pacienteHistoriaClinicaSeleccionado;

  if (!paciente?.id) {
    return {};
  }

  const fechaProcedimiento =
    obtenerFechaProcedimientoPacienteHC(
      paciente
    );

  if (!fechaProcedimiento) {
    return {};
  }

  try {
    const parametros =
      new URLSearchParams({
        paciente_id:
          String(paciente.id),

        fecha_procedimiento:
          String(fechaProcedimiento)
      });

    const respuestaHTTP = await fetch(
      `/api/hclinicas/001/borrador?${parametros.toString()}`
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo consultar el formulario 001"
      );
    }

    if (
      !respuesta.existe ||
      !respuesta.formulario
    ) {
      return {};
    }

    return {
      ...(
        respuesta.formulario.datos ||
        {}
      )
    };

  } catch (error) {
    console.error(
      "ERROR CONSULTANDO DATOS 001 PARA 008:",
      error
    );

    return {};
  }
}

/*funcion para los datos automaticos del formulario 008 */
async function prepararDatosAutomaticosFormulario008() {
  const paciente =
    pacienteHistoriaClinicaSeleccionado;

  if (!paciente) {
    datosAutomaticosFormulario008 = {};
    return {};
  }

  const datos001 =
    await consultarDatosFormulario001Para008();

  const obtenerPrimero = (
    valorPrincipal,
    valorAlternativo
  ) => {
    const principal = String(
      valorPrincipal ?? ""
    ).trim();

    if (principal) {
      return principal;
    }

    return String(
      valorAlternativo ?? ""
    ).trim();
  };

  const nombresFamiliarDesdePaciente = [
    paciente.fam_nombre1,
    paciente.fam_nombre2,
    paciente.fam_apellido1,
    paciente.fam_apellido2
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  datosAutomaticosFormulario008 = {
    paciente_id:
      paciente.id || null,

    paciente_h_clinica:
      obtenerPrimero(
        datos001.paciente_h_clinica,
        obtenerCedulaPacienteHC(paciente)
      ),

    narchivo_paciente:
      obtenerPrimero(
        datos001.narchivo_paciente,
        obtenerNumeroArchivoPacienteHC(
          paciente
        )
      ),

    fecha_admision_paciente:
      obtenerPrimero(
        datos001.fecha_admision_paciente,
        obtenerFechaProcedimientoPacienteHC(
          paciente
        )
      ).slice(0, 10),

    nombre_admisionista:
      obtenerPrimero(
        datos001.nombre_admisionista,
        ""
      ),

    primer_apellido_paciente:
      obtenerPrimero(
        datos001.primer_apellido_paciente,
        paciente.pac_apellido1
      ),

    segundo_apellido_paciente:
      obtenerPrimero(
        datos001.segundo_apellido_paciente,
        paciente.pac_apellido2
      ),

    primer_nombre_paciente:
      obtenerPrimero(
        datos001.primer_nombre_paciente,
        paciente.pac_nombre1
      ),

    segundo_nombre_paciente:
      obtenerPrimero(
        datos001.segundo_nombre_paciente,
        paciente.pac_nombre2
      ),

    tipo_id_paciente:
      obtenerPrimero(
        datos001.tipo_id_paciente,
        paciente.tipo_identificacion ||
        "CÉDULA"
      ),

    estado_civil_paciente:
      obtenerPrimero(
        datos001.estado_civil_paciente,
        paciente.estado_civil
      ),

    sexo_paciente:
      obtenerPrimero(
        datos001.sexo_paciente,
        paciente.sexo
      ),

    telefono_fijo_paciente:
      obtenerPrimero(
        datos001.telefono_fijo_paciente,
        paciente.telefono_fijo
      ),

    telefono_celular_paciente:
      obtenerPrimero(
        datos001.telefono_celular_paciente,
        paciente.telefono_celular
      ),

    fecha_nacimiento_paciente:
      obtenerPrimero(
        datos001.fecha_nacimiento_paciente,
        paciente.fecha_nacimiento
      ).slice(0, 10),

    lugar_nacimiento_paciente:
      obtenerPrimero(
        datos001.lugar_nacimiento_paciente,
        paciente.lugar_nacimiento
      ),

    nacionalidad_paciente:
      obtenerPrimero(
        datos001.nacionalidad_paciente,
        paciente.nacionalidad
      ),

    edad_paciente:
      obtenerPrimero(
        datos001.edad_paciente,
        paciente.edad
      ),

    identificacion_etnica_paciente:
      obtenerPrimero(
        datos001.identificacion_etnica_paciente,
        paciente.identificacion_etnica
      ),

    pueblos_paciente:
      obtenerPrimero(
        datos001.pueblos_paciente,
        paciente.pueblo
      ),

    nivel_educacion_paciente:
      obtenerPrimero(
        datos001.nivel_educacion_paciente,
        paciente.nivel_educacion
      ),

    estado_educacion_paciente:
      obtenerPrimero(
        datos001.estado_educacion_paciente,
        paciente.estado_educacion
      ),

    empresa_trabajo_paciente:
      obtenerPrimero(
        datos001.empresa_trabajo_paciente,
        paciente.empresa_trabajo
      ),

    ocupacion_paciente:
      obtenerPrimero(
        datos001.ocupacion_paciente,
        paciente.ocupacion
      ),

    seguro_paciente:
      obtenerPrimero(
        datos001.seguro_paciente,
        paciente.tipo_seguro
      ),

    provincia_paciente:
      obtenerPrimero(
        datos001.provincia_paciente,
        paciente.provincia
      ),

    canton_paciente:
      obtenerPrimero(
        datos001.canton_paciente,
        paciente.canton
      ),

    parroquia_paciente:
      obtenerPrimero(
        datos001.parroquia_paciente,
        paciente.parroquia
      ),

    barrio_paciente:
      obtenerPrimero(
        datos001.barrio_paciente,
        paciente.barrio
      ),

    calle_paciente:
      obtenerPrimero(
        datos001.calle_paciente,
        paciente.calle_principal
      ),

    calle_secundaria_paciente:
      obtenerPrimero(
        datos001.calle_secundaria_paciente,
        paciente.calle_secundaria
      ),

    referencia_paciente:
      obtenerPrimero(
        datos001.referencia_paciente,
        paciente.referencia
      ),

    nombres_completos_familiar:
      obtenerPrimero(
        datos001.nombres_completos_familiar,
        nombresFamiliarDesdePaciente
      ),

    parentesco_familiar:
      obtenerPrimero(
        datos001.parentesco_familiar,
        paciente.parentesco_familiar
      ),

    direccion_familiar:
      obtenerPrimero(
        datos001.direccion_familiar,
        paciente.direccion_familiar
      ),

    telefono_familiar:
      obtenerPrimero(
        datos001.telefono_familiar,
        paciente.telefono_familiar
      )
  };

  return datosAutomaticosFormulario008;
}

async function abrirFormulario008Emergencia() {
  const paciente =
    pacienteHistoriaClinicaSeleccionado;

  if (!paciente) {
    alert("No hay paciente seleccionado");
    return;
  }

  documentoPDF008Actual = null;

  const datosAutomaticos =
    await prepararDatosAutomaticosFormulario008();

  const nombreCompleto =
    obtenerNombreCompletoPacienteHC(paciente);

  const campoAutomatico = (
    etiqueta,
    nombreCampo,
    tipo = "text"
  ) => {
    const valor = String(
      datosAutomaticos[nombreCampo] ?? ""
    );

    return `
      <div class="form-group">
        <label>${escaparHTMLHC(etiqueta)}</label>

        <input
          type="${tipo}"
          id="hc008_${nombreCampo}"
          data-campo-pdf="${nombreCampo}"
          value="${escaparHTMLHC(valor)}"
          readonly
        >
      </div>
    `;
  };

  panelBox.innerHTML = `
    <div class="table-card hc001-panel hc008-panel">

      <div class="table-header">
        <div>
          <h2>008 EMERGENCIA</h2>
          <p>${escaparHTMLHC(nombreCompleto)}</p>
        </div>

        <button
          type="button"
          class="btn-secondary"
          id="btnVolverHistoriaClinica008"
        >
          Volver
        </button>
      </div>

      <div
        id="avisoEstadoFormulario008"
        style="display:none; margin-bottom:18px;"
      ></div>

      <form
        id="formHC008"
        class="patient-form"
      >

        <input
          type="hidden"
          id="hc008PacienteId"
          value="${Number(paciente.id) || ""}"
        >

        <!-- =====================================
             1. DATOS AUTOMÁTICOS DEL PACIENTE
             ===================================== -->

        <div class="form-card">
          <h2>1. DATOS DEL PACIENTE</h2>

          <div class="form-grid">

            ${campoAutomatico(
              "Historia clínica",
              "paciente_h_clinica"
            )}

            ${campoAutomatico(
              "Número de archivo",
              "narchivo_paciente"
            )}

            ${campoAutomatico(
              "Fecha de admisión",
              "fecha_admision_paciente",
              "date"
            )}

            ${campoAutomatico(
              "Admisión realizada por",
              "nombre_admisionista"
            )}

            ${campoAutomatico(
              "Primer apellido",
              "primer_apellido_paciente"
            )}

            ${campoAutomatico(
              "Segundo apellido",
              "segundo_apellido_paciente"
            )}

            ${campoAutomatico(
              "Primer nombre",
              "primer_nombre_paciente"
            )}

            ${campoAutomatico(
              "Segundo nombre",
              "segundo_nombre_paciente"
            )}

            ${campoAutomatico(
              "Tipo de identificación",
              "tipo_id_paciente"
            )}

            ${campoAutomatico(
              "Estado civil",
              "estado_civil_paciente"
            )}

            ${campoAutomatico(
              "Sexo",
              "sexo_paciente"
            )}

            ${campoAutomatico(
              "Teléfono fijo",
              "telefono_fijo_paciente"
            )}

            ${campoAutomatico(
              "Teléfono celular",
              "telefono_celular_paciente"
            )}

            ${campoAutomatico(
              "Fecha de nacimiento",
              "fecha_nacimiento_paciente",
              "date"
            )}

            ${campoAutomatico(
              "Lugar de nacimiento",
              "lugar_nacimiento_paciente"
            )}

            ${campoAutomatico(
              "Nacionalidad",
              "nacionalidad_paciente"
            )}

            ${campoAutomatico(
              "Edad",
              "edad_paciente"
            )}

            ${campoAutomatico(
              "Identificación étnica",
              "identificacion_etnica_paciente"
            )}

            ${campoAutomatico(
              "Pueblo",
              "pueblos_paciente"
            )}

            ${campoAutomatico(
              "Nivel de educación",
              "nivel_educacion_paciente"
            )}

            ${campoAutomatico(
              "Estado de educación",
              "estado_educacion_paciente"
            )}

            ${campoAutomatico(
              "Empresa donde trabaja",
              "empresa_trabajo_paciente"
            )}

            ${campoAutomatico(
              "Ocupación",
              "ocupacion_paciente"
            )}

            ${campoAutomatico(
              "Seguro",
              "seguro_paciente"
            )}

            ${campoAutomatico(
              "Provincia",
              "provincia_paciente"
            )}

            ${campoAutomatico(
              "Cantón",
              "canton_paciente"
            )}

            ${campoAutomatico(
              "Parroquia",
              "parroquia_paciente"
            )}

            ${campoAutomatico(
              "Barrio",
              "barrio_paciente"
            )}

            ${campoAutomatico(
              "Calle principal",
              "calle_paciente"
            )}

            ${campoAutomatico(
              "Calle secundaria",
              "calle_secundaria_paciente"
            )}

            ${campoAutomatico(
              "Referencia",
              "referencia_paciente"
            )}

          </div>
        </div>


        <!-- =====================================
             2. CONTACTO FAMILIAR
             ===================================== -->

        <div class="form-card">
          <h2>2. CONTACTO FAMILIAR</h2>

          <div class="form-grid">

            ${campoAutomatico(
              "Nombres completos",
              "nombres_completos_familiar"
            )}

            ${campoAutomatico(
              "Parentesco",
              "parentesco_familiar"
            )}

            ${campoAutomatico(
              "Dirección",
              "direccion_familiar"
            )}

            ${campoAutomatico(
              "Teléfono",
              "telefono_familiar"
            )}

          </div>
        </div>


        <!-- =====================================
             3. INFORMACIÓN DE LLEGADA
             ===================================== -->

        <div class="form-card">
          <h2>3. INFORMACIÓN DE LLEGADA</h2>

          <div class="form-grid">

            <div class="full-width">
              <label>
                ¿Tiene historia clínica en el establecimiento?
              </label>

              <div class="hc008-opciones">

                <label class="check-label">
                  <input
                    type="checkbox"
                    id="hc008HistoriaEstablecimientoSi"
                    data-campo-pdf="historia_en_establecimiento_si"
                  >
                  <span>SÍ</span>
                </label>

                <label class="check-label">
                  <input
                    type="checkbox"
                    id="hc008HistoriaEstablecimientoNo"
                    data-campo-pdf="historia_en_establecimiento_no"
                  >
                  <span>NO</span>
                </label>

              </div>
            </div>

            <div class="full-width">
              <label>Forma de llegada</label>

              <div class="hc008-opciones">

                <label class="check-label">
                  <input
                    type="checkbox"
                    id="hc008LlegadaAmbulatorio"
                    data-campo-pdf="casilla_llegada_ambulatorio"
                  >
                  <span>Ambulatorio</span>
                </label>

                <label class="check-label">
                  <input
                    type="checkbox"
                    id="hc008LlegadaAmbulancia"
                    data-campo-pdf="casilla_llegada_ambulancia"
                  >
                  <span>Ambulancia</span>
                </label>

                <label class="check-label">
                  <input
                    type="checkbox"
                    id="hc008LlegadaOtro"
                    data-campo-pdf="casilla_llegada_otro"
                  >
                  <span>Otro</span>
                </label>

              </div>
            </div>

            <div class="form-group">
              <label for="hc008FuenteInformacion">
                Fuente de información
              </label>

              <input
                type="text"
                id="hc008FuenteInformacion"
                data-campo-pdf="fuente_informacion_paciente"
              >
            </div>

            <div class="form-group">
              <label for="hc008InstitucionEntrega">
                Institución o persona que entrega al paciente
              </label>

              <input
                type="text"
                id="hc008InstitucionEntrega"
                data-campo-pdf="institucion_persona_entrega_paciente"
              >
            </div>

            <div class="form-group">
              <label for="hc008TelefonoEntrega">
                Teléfono de quien entrega
              </label>

              <input
                type="text"
                id="hc008TelefonoEntrega"
                data-campo-pdf="telefono_persona_entrega"
              >
            </div>

            <div class="form-group">
              <label for="hc008HoraInicio">
                Hora de inicio
              </label>

              <input
                type="time"
                id="hc008HoraInicio"
                data-campo-pdf="008_hora_inicio"
              >
            </div>

          </div>
        </div>


        <!-- =====================================
             4. CONDICIÓN DE LLEGADA
             ===================================== -->

        <div class="form-card">
          <h2>4. CONDICIÓN DE LLEGADA</h2>

          <div class="hc008-opciones">

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008CondicionEstable"
                data-campo-pdf="008_casilla_condicion_llegada_estable"
              >
              <span>Estable</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008CondicionInestable"
                data-campo-pdf="008_casilla_condicion_llegada_inestable"
              >
              <span>Inestable</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008CondicionFallecido"
                data-campo-pdf="008_casilla_condicion_llegada_fallecido"
              >
              <span>Fallecido</span>
            </label>

          </div>
        </div>


        <!-- =====================================
             5. MOTIVO DE ATENCIÓN
             ===================================== -->

        <div class="form-card">
          <h2>5. MOTIVO DE ATENCIÓN</h2>

          <div class="form-grid">

            <div class="form-group full-width">
              <label for="hc008MotivoAtencion">
                Motivo de atención
              </label>

              <textarea
                id="hc008MotivoAtencion"
                data-campo-pdf="008_motivo_atencion"
                rows="5"
                placeholder="Describa el motivo de atención"
              ></textarea>
            </div>

          </div>
        </div>


        <!-- =====================================
             6. ANTECEDENTES
             ===================================== -->

        <div class="form-card">
          <h2>6. ANTECEDENTES PERSONALES Y FAMILIARES</h2>

          <div class="form-grid">

            <div class="hc008-opciones hc008-opciones-antecedentes">
            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_1alergicos"
              >
              <span>1. Alérgicos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_2clinicos"
              >
              <span>2. Clínicos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_3ginecologicos"
              >
              <span>3. Ginecológicos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_4traumatologicos"
              >
              <span>4. Traumatológicos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_5pediatricos"
              >
              <span>5. Pediátricos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_6quirurgicos"
              >
              <span>6. Quirúrgicos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_7farmacologicos"
              >
              <span>7. Farmacológicos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_8habitos"
              >
              <span>8. Hábitos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_9familiares"
              >
              <span>9. Familiares</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_antecedentes_8armacologicos"
              >
              <span>Antecedente adicional</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_otros"
              >
              <span>Otros</span>
            </label>
            </div>

            <div class="form-group full-width">
              <label for="hc008Antecedentes">
                Descripción de antecedentes
              </label>

              <textarea
                id="hc008Antecedentes"
                data-campo-pdf="008_antecedentes"
                rows="7"
                placeholder="Describa los antecedentes relevantes"
              ></textarea>
            </div>

          </div>
        </div>


        <!-- =====================================
             7. ENFERMEDAD ACTUAL
             ===================================== -->

        <div class="form-card">
          <h2>7. ENFERMEDAD O PROBLEMA ACTUAL</h2>

          <div class="form-grid">

            <div class="form-group full-width">
              <label for="hc008EnfermedadActual">
                Enfermedad o problema actual
              </label>

              <textarea
                id="hc008EnfermedadActual"
                data-campo-pdf="008_enfermedad_problema_actual_paciente"
                rows="9"
                placeholder="Describa la enfermedad o problema actual"
              ></textarea>
            </div>

          </div>
        </div>

                <!-- =====================================
             8. CONSTANTES VITALES
             ===================================== -->

        <div class="form-card">
          <h2>8. CONSTANTES VITALES</h2>

          <div class="hc008-opciones">

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008SinConstantes"
                data-campo-pdf="008_sin_constantes"
              >
              <span>Sin constantes vitales</span>
            </label>

          </div>

          <div class="form-grid" style="margin-top:18px;">

            <div class="form-group">
              <label for="hc008PresionArterial">
                Presión arterial
              </label>

              <input
                type="text"
                id="hc008PresionArterial"
                data-campo-pdf="008_presion_arterial"
                placeholder="Ejemplo: 120/80"
              >
            </div>

            <div class="form-group">
              <label for="hc008Pulso">
                Pulso
              </label>

              <input
                type="number"
                id="hc008Pulso"
                data-campo-pdf="008_pulso"
                min="0"
                placeholder="LPM"
              >
            </div>

            <div class="form-group">
              <label for="hc008FrecuenciaRespiratoria">
                Frecuencia respiratoria
              </label>

              <input
                type="number"
                id="hc008FrecuenciaRespiratoria"
                data-campo-pdf="008_frecuencia_respiratoria"
                min="0"
                placeholder="RPM"
              >
            </div>

            <div class="form-group">
              <label for="hc008Pulsioximetria">
                Pulsioximetría
              </label>

              <input
                type="number"
                id="hc008Pulsioximetria"
                data-campo-pdf="008_pulsioximetria"
                min="0"
                max="100"
                placeholder="%"
              >
            </div>

            <div class="form-group">
              <label for="hc008PerimetroCefalico">
                Perímetro cefálico
              </label>

              <input
                type="number"
                step="0.01"
                id="hc008PerimetroCefalico"
                data-campo-pdf="008_perimetro_cefalico"
                min="0"
                placeholder="cm"
              >
            </div>

            <div class="form-group">
              <label for="hc008Peso">
                Peso
              </label>

              <input
                type="number"
                step="0.01"
                id="hc008Peso"
                data-campo-pdf="008_peso_kg"
                min="0"
                placeholder="kg"
              >
            </div>

            <div class="form-group">
              <label for="hc008Talla">
                Talla
              </label>

              <input
                type="number"
                step="0.01"
                id="hc008Talla"
                data-campo-pdf="008_talla"
                min="0"
                placeholder="cm"
              >
            </div>

            <div class="form-group">
              <label for="hc008GlicemiaCapilar">
                Glicemia capilar
              </label>

              <input
                type="number"
                step="0.01"
                id="hc008GlicemiaCapilar"
                data-campo-pdf="008_glicemia_capilar"
                min="0"
                placeholder="mg/dL"
              >
            </div>

            <div class="form-group">
              <label for="hc008LlenadoCapilar">
                Tiempo de llenado capilar
              </label>

              <input
                type="text"
                id="hc008LlenadoCapilar"
                data-campo-pdf="008_t_llenado_capilar"
                placeholder="Ejemplo: 2 segundos"
              >
            </div>

          </div>
        </div>


        <!-- =====================================
             9. ESCALA DE GLASGOW Y PUPILAS
             ===================================== -->

        <div class="form-card">
          <h2>9. ESCALA DE GLASGOW Y REACCIÓN PUPILAR</h2>

          <div class="form-grid">

            <div class="form-group">
              <label for="hc008GlasgowOcular">
                Glasgow ocular
              </label>

              <select
                id="hc008GlasgowOcular"
                data-campo-pdf="008_glassgow_ocular"
              >
                <option value="">Seleccione</option>
                <option value="1">1 - Ninguna</option>
                <option value="2">2 - Al dolor</option>
                <option value="3">3 - A la voz</option>
                <option value="4">4 - Espontánea</option>
              </select>
            </div>

            <div class="form-group">
              <label for="hc008GlasgowVerbal">
                Glasgow verbal
              </label>

              <select
                id="hc008GlasgowVerbal"
                data-campo-pdf="008_glassgow_verbal"
              >
                <option value="">Seleccione</option>
                <option value="1">1 - Ninguna</option>
                <option value="2">2 - Sonidos incomprensibles</option>
                <option value="3">3 - Palabras inapropiadas</option>
                <option value="4">4 - Confuso</option>
                <option value="5">5 - Orientado</option>
              </select>
            </div>

            <div class="form-group">
              <label for="hc008GlasgowMotora">
                Glasgow motora
              </label>

              <select
                id="hc008GlasgowMotora"
                data-campo-pdf="008_motora"
              >
                <option value="">Seleccione</option>
                <option value="1">1 - Ninguna</option>
                <option value="2">2 - Extensión</option>
                <option value="3">3 - Flexión anormal</option>
                <option value="4">4 - Retirada</option>
                <option value="5">5 - Localiza dolor</option>
                <option value="6">6 - Obedece órdenes</option>
              </select>
            </div>

            <div class="form-group">
              <label for="hc008GlasgowTotal">
                Total Glasgow
              </label>

              <input
                type="text"
                id="hc008GlasgowTotal"
                readonly
                placeholder="0"
              >
            </div>

            <div class="form-group">
              <label for="hc008PupilaDerecha">
                Reacción pupila derecha
              </label>

              <select
                id="hc008PupilaDerecha"
                data-campo-pdf="008_reaccion_pupila_der"
              >
                <option value="">Seleccione</option>
                <option value="REACTIVA">Reactiva</option>
                <option value="NO REACTIVA">No reactiva</option>
                <option value="NO VALORABLE">No valorable</option>
              </select>
            </div>

            <div class="form-group">
              <label for="hc008PupilaIzquierda">
                Reacción pupila izquierda
              </label>

              <select
                id="hc008PupilaIzquierda"
                data-campo-pdf="008_reaccion_pupila_izq"
              >
                <option value="">Seleccione</option>
                <option value="REACTIVA">Reactiva</option>
                <option value="NO REACTIVA">No reactiva</option>
                <option value="NO VALORABLE">No valorable</option>
              </select>
            </div>

          </div>
        </div>


        <!-- =====================================
             10. EXAMEN FÍSICO
             ===================================== -->

        <div class="form-card">
          <h2>10. EXAMEN FÍSICO</h2>

          <div class="hc008-opciones hc008-opciones-examen-fisico">

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_1piel"
              >
              <span>1. Piel</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_2cabeza"
              >
              <span>2. Cabeza</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_3ojos"
              >
              <span>3. Ojos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_4oidos"
              >
              <span>4. Oídos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_5nariz"
              >
              <span>5. Nariz</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_6boca"
              >
              <span>6. Boca</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_7oro"
              >
              <span>7. Orofaringe</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_8cuello"
              >
              <span>8. Cuello</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_9axilas"
              >
              <span>9. Axilas</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_10torax"
              >
              <span>10. Tórax</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_11abdomen"
              >
              <span>11. Abdomen</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_12columna"
              >
              <span>12. Columna</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_13ingle"
              >
              <span>13. Ingle y periné</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_14miembrosup"
              >
              <span>14. Miembros superiores</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_15miembroinf"
              >
              <span>15. Miembros inferiores</span>
            </label>

          </div>

          <div
            class="form-group full-width"
            style="margin-top:18px;"
          >
            <label for="hc008ExamenFisico">
              Descripción del examen físico
            </label>

            <textarea
              id="hc008ExamenFisico"
              data-campo-pdf="008_examen_fisico"
              rows="9"
              placeholder="Describa los hallazgos del examen físico"
            ></textarea>
          </div>

        </div>


        <!-- =====================================
             11. EXÁMENES SOLICITADOS
             ===================================== -->

        <div class="form-card">
          <h2>11. EXÁMENES SOLICITADOS</h2>

          <div class="hc008-opciones hc008-opciones-examenes">

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_biometria"
              >
              <span>Biometría hemática</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_uroanalisis"
              >
              <span>Uroanálisis</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_quimica"
              >
              <span>Química sanguínea</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_electrolitos"
              >
              <span>Electrolitos</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_gasometria"
              >
              <span>Gasometría</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_ecg"
              >
              <span>Electrocardiograma</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_endoscopipa"
              >
              <span>Endoscopía</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_rxtorax"
              >
              <span>Radiografía de tórax</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_rxabdomen"
              >
              <span>Radiografía de abdomen</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_rxosea"
              >
              <span>Radiografía ósea</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_11ecografia"
              >
              <span>Ecografía</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_12ecografia_elvica"
              >
              <span>Ecografía pélvica</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_13tomografia"
              >
              <span>Tomografía</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_14resonancia"
              >
              <span>Resonancia magnética</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_15interconsulta"
              >
              <span>Interconsulta</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_16otros"
              >
              <span>Otros</span>
            </label>

          </div>

          <div
            class="form-group full-width"
            style="margin-top:18px;"
          >
            <label for="hc008Examenes">
              Resultados y observaciones de exámenes
            </label>

            <textarea
              id="hc008Examenes"
              data-campo-pdf="008_examenes"
              rows="8"
              placeholder="Detalle los exámenes, resultados u observaciones"
            ></textarea>
          </div>

        </div>

                <!-- =====================================
             12. DIAGNÓSTICOS PRESUNTIVOS
             ===================================== -->

        <div class="form-card">
          <h2>12. DIAGNÓSTICOS PRESUNTIVOS</h2>

          <p class="hc008-ayuda">
            Escriba al menos dos caracteres del código o
            del nombre del diagnóstico y seleccione una
            opción de la lista.
          </p>

          <div class="hc008-diagnosticos">

            ${[1, 2, 3].map(numero => `
              <div
                class="hc008-diagnostico-fila"
                data-fila-diagnostico="${numero}"
              >

                <div class="form-group">
                  <label for="hc008CiePresuntivo${numero}">
                    Código CIE ${numero}
                  </label>

                  <input
                    type="text"
                    id="hc008CiePresuntivo${numero}"
                    data-campo-pdf="008_cie_presuntivo${numero}"
                    readonly
                    placeholder="Código"
                  >
                </div>

                <div
                  class="form-group hc008-buscador-con-resultados"
                >
                  <label for="hc008DiagnosticoPresuntivo${numero}">
                    Diagnóstico presuntivo ${numero}
                  </label>

                  <input
                    type="text"
                    id="hc008DiagnosticoPresuntivo${numero}"
                    data-campo-pdf="008_diagnostico_presuntivo${numero}"
                    data-buscador-diagnostico="${numero}"
                    autocomplete="off"
                    placeholder="Buscar diagnóstico..."
                  >

                  <div
                    id="hc008ResultadosDiagnostico${numero}"
                    class="hc008-resultados-busqueda"
                    style="display:none;"
                  ></div>
                </div>

                <button
                  type="button"
                  class="btn-secondary hc008-btn-limpiar"
                  data-limpiar-diagnostico="${numero}"
                >
                  Limpiar
                </button>

              </div>
            `).join("")}

          </div>
        </div>


        <!-- =====================================
             13. PLAN DE TRATAMIENTO
             ===================================== -->

        <div class="form-card">
          <h2>13. PLAN DE TRATAMIENTO</h2>

          <div class="form-grid">

            <div class="form-group full-width">
              <label for="hc008PlanMedicamentos">
                Medicamentos e indicaciones
              </label>

              <textarea
                id="hc008PlanMedicamentos"
                data-campo-pdf="008_plan_medicamentos"
                rows="8"
                placeholder="Registre medicamentos, soluciones, procedimientos e indicaciones"
              ></textarea>
            </div>

            <div class="form-group full-width">
              <label for="hc008PlanViaDosis">
                Vía, dosis y frecuencia
              </label>

              <textarea
                id="hc008PlanViaDosis"
                data-campo-pdf="008_plan_via_dosis"
                rows="7"
                placeholder="Detalle vía de administración, dosis, frecuencia y duración"
              ></textarea>
            </div>

          </div>
        </div>


        <!-- =====================================
             14. CONDICIÓN Y DESTINO DE EGRESO
             ===================================== -->

        <div class="form-card">
          <h2>14. CONDICIÓN Y DESTINO DE EGRESO</h2>

          <h3 class="hc008-subtitulo">
            Condición al egreso
          </h3>

          <div class="hc008-opciones">

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008EgresoVivo"
                data-campo-pdf="008_casilla_egreso_vivo"
              >
              <span>Vivo</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008EgresoEstable"
                data-campo-pdf="008_casilla_egreso_estable"
                data-grupo-exclusivo="condicion-egreso-008"
              >
              <span>Estable</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008EgresoInestable"
                data-campo-pdf="008_casilla_egreso_inestable"
                data-grupo-exclusivo="condicion-egreso-008"
              >
              <span>Inestable</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                id="hc008EgresoFallecido"
                data-campo-pdf="008_casilla_egreso_fallecido"
                data-grupo-exclusivo="condicion-egreso-008"
              >
              <span>Fallecido</span>
            </label>

          </div>

          <h3 class="hc008-subtitulo">
            Destino del paciente
          </h3>

          <div class="hc008-opciones hc008-opciones-egreso">

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_egreso_alta"
                data-grupo-exclusivo="destino-egreso-008"
              >
              <span>Alta</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_egreso_consulta_externa"
                data-grupo-exclusivo="destino-egreso-008"
              >
              <span>Consulta externa</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_egreso_observacion_emergencia"
                data-grupo-exclusivo="destino-egreso-008"
              >
              <span>Observación de emergencia</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_egreso_hospitalizacion"
                data-grupo-exclusivo="destino-egreso-008"
              >
              <span>Hospitalización</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_egreso_referencia"
                data-grupo-exclusivo="destino-egreso-008"
              >
              <span>Referencia</span>
            </label>

            <label class="check-label">
              <input
                type="checkbox"
                data-campo-pdf="008_casilla_egreso_derivacion"
                data-grupo-exclusivo="destino-egreso-008"
              >
              <span>Derivación</span>
            </label>

          </div>

          <div
            class="form-grid"
            style="margin-top:20px;"
          >

            <div class="form-group full-width">
              <label for="hc008EgresoEstablecimiento">
                Establecimiento de referencia o derivación
              </label>

              <input
                type="text"
                id="hc008EgresoEstablecimiento"
                data-campo-pdf="008_texto_egreso_establecimiento"
              >
            </div>

            <div class="form-group full-width">
              <label for="hc008EgresoObservaciones">
                Observaciones de egreso
              </label>

              <textarea
                id="hc008EgresoObservaciones"
                data-campo-pdf="008_texto_egreso_observaciones"
                rows="7"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="hc008FechaTermino">
                Fecha de término de emergencia
              </label>

              <input
                type="date"
                id="hc008FechaTermino"
                data-campo-pdf="008_fecha_termino_emergencia"
              >
            </div>

            <div class="form-group">
              <label for="hc008HoraTermino">
                Hora de término de emergencia
              </label>

              <input
                type="time"
                id="hc008HoraTermino"
                data-campo-pdf="008_hora_termino_emergencia"
              >
            </div>

          </div>
        </div>


        <!-- =====================================
             15. MÉDICO DE EMERGENCIA
             ===================================== -->

        <div class="form-card">
          <h2>15. MÉDICO DE EMERGENCIA</h2>

          <input
            type="hidden"
            id="hc008ProfesionalMedicoId"
            data-campo-formulario="008_profesional_medico_id"
          >

          <div class="form-grid">

            <div
              class="form-group full-width hc008-buscador-con-resultados"
            >
              <label for="hc008BuscarMedicoEmergencia">
                Buscar profesional
              </label>

              <input
                type="text"
                id="hc008BuscarMedicoEmergencia"
                autocomplete="off"
                placeholder="Buscar por nombre, apellido o cédula..."
              >

              <div
                id="hc008ResultadosMedicoEmergencia"
                class="hc008-resultados-busqueda"
                style="display:none;"
              ></div>
            </div>

            <div class="form-group">
              <label for="hc008NombresMedico">
                Nombres
              </label>

              <input
                type="text"
                id="hc008NombresMedico"
                data-campo-pdf="008_nombres_medico_emergencia"
                readonly
              >
            </div>

            <div class="form-group">
              <label for="hc008PrimerApellidoMedico">
                Primer apellido
              </label>

              <input
                type="text"
                id="hc008PrimerApellidoMedico"
                data-campo-pdf="008_primer_apellido_medico_emergencia"
                readonly
              >
            </div>

            <div class="form-group">
              <label for="hc008SegundoApellidoMedico">
                Segundo apellido
              </label>

              <input
                type="text"
                id="hc008SegundoApellidoMedico"
                data-campo-pdf="008_segundo_apellido_medico_emergencia"
                readonly
              >
            </div>

            <div class="form-group">
              <label for="hc008CedulaMedico">
                Cédula
              </label>

              <input
                type="text"
                id="hc008CedulaMedico"
                data-campo-pdf="008_cedula_medico_emergencia"
                readonly
              >
            </div>

          </div>

          <div class="hc008-firma-sello-vista">

            <div class="hc008-imagen-profesional">
              <h3>Firma registrada</h3>

              <div id="hc008VistaFirmaMedico">
                Seleccione un profesional.
              </div>
            </div>

            <div class="hc008-imagen-profesional">
              <h3>Sello registrado</h3>

              <div id="hc008VistaSelloMedico">
                Seleccione un profesional.
              </div>
            </div>

          </div>

          <p class="hc008-ayuda">
            La firma y el sello se insertarán automáticamente
            en el PDF cuando se genere el formulario.
          </p>

        </div>

        <div class="form-actions hc008-form-actions">

            <button
              type="button"
              class="hc-btn-accion hc-btn-guardar"
              id="btnGuardarBorrador008"
            >
              <i class="fa-solid fa-floppy-disk"></i>
              Guardar borrador
            </button>

            <button
              type="button"
              class="hc-btn-accion hc-btn-generar"
              id="btnGenerarPDF008"
            >
              <i class="fa-solid fa-file-pdf"></i>
              Generar PDF
            </button>

            <button
              type="button"
              class="hc-btn-accion hc-btn-cerrar"
              id="btnCerrarFormulario008"
              disabled
            >
              <i class="fa-solid fa-lock"></i>
              Cerrar formulario
            </button>

    </div>
        

      </form>
    </div>
  `;

  document
    .getElementById(
      "btnVolverHistoriaClinica008"
    )
    ?.addEventListener("click", () => {
      cambiarContenido(
        "historias-clinicas"
      );
    });

  document
    .getElementById(
      "btnGuardarBorrador008"
    )
    ?.addEventListener(
      "click",
      guardarBorradorFormulario008
    );

    document
  .getElementById(
    "btnGenerarPDF008"
  )
  ?.addEventListener(
    "click",
    generarPDFFormulario008
  );

  document
  .getElementById(
    "btnCerrarFormulario008"
  )
  ?.addEventListener(
    "click",
    cerrarFormulario008
  );

  

    [
  "hc008GlasgowOcular",
  "hc008GlasgowVerbal",
  "hc008GlasgowMotora"
].forEach(idCampo => {
  document
    .getElementById(idCampo)
    ?.addEventListener(
      "change",
      calcularTotalGlasgow008
    );
});

for (
  let numeroFila = 1;
  numeroFila <= 3;
  numeroFila++
) {
  const buscador = document.getElementById(
    `hc008DiagnosticoPresuntivo${numeroFila}`
  );

  buscador?.addEventListener(
    "input",
    () => {
      const codigo = document.getElementById(
        `hc008CiePresuntivo${numeroFila}`
      );

      const seleccionado =
        buscador.dataset
          .diagnosticoSeleccionado || "";

      if (
        seleccionado &&
        buscador.value !== seleccionado
      ) {
        if (codigo) {
          codigo.value = "";
        }

        delete buscador.dataset
          .diagnosticoSeleccionado;
      }

      clearTimeout(
        temporizadoresDiagnosticos008[
          numeroFila
        ]
      );

      temporizadoresDiagnosticos008[
        numeroFila
      ] = setTimeout(() => {
        buscarDiagnosticosCIE008(
          numeroFila,
          buscador.value
        );
      }, 300);
    }
  );

  document
    .querySelector(
      `[data-limpiar-diagnostico="${numeroFila}"]`
    )
    ?.addEventListener("click", () => {
      limpiarDiagnosticoCIE008(
        numeroFila
      );
    });
}

const buscadorMedico = document.getElementById(
  "hc008BuscarMedicoEmergencia"
);

buscadorMedico?.addEventListener(
  "input",
  () => {
    document.getElementById(
      "hc008ProfesionalMedicoId"
    ).value = "";

    clearTimeout(
      temporizadorMedico008
    );

    temporizadorMedico008 =
      setTimeout(() => {
        buscarMedicosEmergencia008(
          buscadorMedico.value
        );
      }, 300);
  }
);

document
  .querySelectorAll(
    '#formHC008 [data-grupo-exclusivo]'
  )
  .forEach(casilla => {
    casilla.addEventListener(
      "change",
      () => {
        if (!casilla.checked) return;

        const grupo =
          casilla.dataset.grupoExclusivo;

        document
          .querySelectorAll(
            `#formHC008 [data-grupo-exclusivo="${grupo}"]`
          )
          .forEach(otraCasilla => {
            if (
              otraCasilla !== casilla
            ) {
              otraCasilla.checked = false;
            }
          });
      }
    );
  });

  await cargarBorradorFormulario008();

  const profesionalMedicoId008 = Number(
  document.getElementById(
    "hc008ProfesionalMedicoId"
  )?.value || 0
);

if (profesionalMedicoId008) {
  try {
    const respuestaMedico = await fetch(
      `/api/profesionales-salud/${profesionalMedicoId008}`
    );

    const resultadoMedico =
      await respuestaMedico
        .json()
        .catch(() => ({}));

    if (
      respuestaMedico.ok &&
      resultadoMedico.profesional
    ) {
      const profesional =
        resultadoMedico.profesional;

      document.getElementById(
        "hc008BuscarMedicoEmergencia"
      ).value = [
        profesional.primer_nombre,
        profesional.segundo_nombre,
        profesional.primer_apellido,
        profesional.segundo_apellido
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      mostrarFirmaYSelloMedico008(
        profesional
      );
    }
  } catch (errorMedico) {
    console.error(
      "ERROR RESTAURANDO MÉDICO 008:",
      errorMedico
    );
  }
}


  calcularTotalGlasgow008();
}

function obtenerDatosFormulario008() {
  const datos = {
    paciente_id:
      pacienteHistoriaClinicaSeleccionado
        ?.id || null
  };

  document.querySelectorAll(
  "#formHC008 [data-campo-pdf], #formHC008 [data-campo-formulario]"
)
    .forEach(campo => {
      const nombreCampo =
    campo.dataset.campoPdf ||
    campo.dataset.campoFormulario;

      if (!nombreCampo) return;

      if (campo.type === "checkbox") {
        datos[nombreCampo] =
          Boolean(campo.checked);
      } else {
        datos[nombreCampo] =
          String(campo.value || "").trim();
      }
    });

  return datos;
}

function cargarDatosEnFormulario008(
  datos = {}
) {
  document.querySelectorAll(
  "#formHC008 [data-campo-pdf], #formHC008 [data-campo-formulario]"
)
    .forEach(campo => {
       const nombreCampo =
        campo.dataset.campoPdf ||
        campo.dataset.campoFormulario;

      if (
        !nombreCampo ||
        !Object.prototype.hasOwnProperty.call(
          datos,
          nombreCampo
        )
      ) {
        return;
      }

      const valor =
        datos[nombreCampo];

      if (campo.type === "checkbox") {
        campo.checked =
          valor === true ||
          valor === 1 ||
          valor === "1" ||
          String(valor).toLowerCase() ===
            "true";
      } else {
        campo.value =
          valor ?? "";
      }
    });
}

/*Esto evita que un borrador antiguo cambie la identificación actual del paciente. */
function actualizarDatosAutomaticosFormulario008EnPantalla() {
  Object.entries(
    datosAutomaticosFormulario008 || {}
  ).forEach(([nombreCampo, valor]) => {
    const campo = document.querySelector(
      `#formHC008 [data-campo-pdf="${nombreCampo}"]`
    );

    if (!campo) return;

    if (campo.type === "checkbox") {
      campo.checked = Boolean(valor);
    } else {
      campo.value = valor ?? "";
    }
  });
}

async function guardarBorradorFormulario008() {
  const boton = document.getElementById(
    "btnGuardarBorrador008"
  );

  try {
    const datos =
      obtenerDatosFormulario008();

    if (!datos.paciente_id) {
      throw new Error(
        "No se encontró el paciente seleccionado"
      );
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "No se encontró la fecha de admisión"
      );
    }

    if (boton) {
      boton.disabled = true;
      boton.textContent =
        "Guardando borrador...";
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/008/guardar-borrador",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(datos)
      }
    );

    const respuesta =
      await respuestaHTTP
        .json()
        .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo guardar el borrador"
      );
    }

    alert(
      respuesta.mensaje ||
      "Borrador guardado correctamente"
    );

    if (
    typeof cargarEstadosFormulariosHistoriaClinica ===
    "function"
    ) {
    await cargarEstadosFormulariosHistoriaClinica();
    }

  } catch (error) {
    console.error(
      "ERROR GUARDANDO FORMULARIO 008:",
      error
    );

    alert(
      error.message ||
      "No se pudo guardar el formulario 008"
    );

  } finally {
    if (boton) {
      boton.disabled = false;

      boton.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        Guardar borrador
      `;
    }
  }
}

async function cargarBorradorFormulario008() {
  try {
    const pacienteId = Number(
      datosAutomaticosFormulario008
        ?.paciente_id || 0
    );

    const fechaProcedimiento = String(
      datosAutomaticosFormulario008
        ?.fecha_admision_paciente || ""
    ).slice(0, 10);

    if (
      !pacienteId ||
      !fechaProcedimiento
    ) {
      return;
    }

    const respuestaHTTP = await fetch(
      `/api/hclinicas/008/borrador?paciente_id=${encodeURIComponent(
        pacienteId
      )}&fecha_procedimiento=${encodeURIComponent(
        fechaProcedimiento
      )}`
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    /*
      Si todavía no existe un borrador, dejamos
      solamente los datos automáticos del paciente.
    */
    if (respuestaHTTP.status === 404) {
      actualizarDatosAutomaticosFormulario008EnPantalla();
      return;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo cargar el borrador del formulario 008"
      );
    }

    if (!respuesta.formulario) {
      actualizarDatosAutomaticosFormulario008EnPantalla();
      return;
    }

    const datosBorrador =
      respuesta.formulario.datos || {};

    cargarDatosEnFormulario008(
      datosBorrador
    );

    /*
      Los datos provenientes de admisión y del paciente
      vuelven a aplicarse después de cargar el borrador.
    */
    actualizarDatosAutomaticosFormulario008EnPantalla();

    /*
      Restauramos la suma visual de Glasgow.
    */
    calcularTotalGlasgow008();

    const estadoFormulario008 = String(
      respuesta.formulario.estado || ""
    ).toUpperCase();

    if (
      estadoFormulario008 === "CERRADO"
    ) {
      await bloquearFormulario008Cerrado({
        cerrado_por_nombre:
          respuesta.formulario
            .cerrado_por_nombre || "",

        fecha_cierre:
          respuesta.formulario
            .fecha_cierre || ""
      });
    }

  } catch (error) {
    console.error(
      "ERROR CARGANDO FORMULARIO 008:",
      error
    );

    alert(
      error.message ||
      "No se pudo cargar el formulario 008"
    );
  }
}

async function bloquearFormulario008Cerrado(
  informacionCierre = {}
) {
  const formulario = document.getElementById(
    "formHC008"
  );

  if (!formulario) return;

  formulario
    .querySelectorAll(
      "input, select, textarea, button"
    )
    .forEach(elemento => {
      if (
        elemento.dataset.permitirCerrado ===
        "true"
      ) {
        return;
      }

      elemento.disabled = true;
    });

  document
    .getElementById(
      "avisoFormulario008Cerrado"
    )
    ?.remove();

  const nombreUsuario =
    informacionCierre.cerrado_por_nombre ||
    informacionCierre.cerradoPorNombre ||
    "";

  const fechaOriginal =
    informacionCierre.fecha_cierre ||
    informacionCierre.fechaCierre ||
    "";

  let fechaVisible = "";

  if (fechaOriginal) {
    const fecha = new Date(
      fechaOriginal
    );

    if (!Number.isNaN(fecha.getTime())) {
      fechaVisible =
        fecha.toLocaleString("es-EC");
    }
  }

  const aviso = document.createElement(
    "div"
  );

  aviso.id =
    "avisoFormulario008Cerrado";

  aviso.className =
    "hc-aviso-formulario-cerrado";

  aviso.innerHTML = `
  <div class="hc008-aviso-cerrado-contenido">

    <div class="hc008-aviso-cerrado-texto">

      <div class="hc008-aviso-cerrado-titulo">
        <i class="fa-solid fa-lock"></i>

        <strong>
          Este formulario se encuentra cerrado y ya no puede modificarse.
        </strong>
      </div>

      ${
        nombreUsuario
          ? `
            <p>
              <strong>Cerrado por:</strong>
              ${escaparHTMLHC(nombreUsuario)}
            </p>
          `
          : ""
      }

      ${
        fechaVisible
          ? `
            <p>
              <strong>Fecha de cierre:</strong>
              ${escaparHTMLHC(fechaVisible)}
            </p>
          `
          : ""
      }

    </div>

    <div
      id="hc008ContenedorReabrir"
      class="hc008-contenedor-reabrir"
    ></div>

  </div>
`;

  formulario.prepend(aviso);
  const esAdmin =
  await usuarioActualEsAdminHC();

if (esAdmin) {

  const contenedorReabrir =
  document.getElementById(
    "hc008ContenedorReabrir"
  );

if (contenedorReabrir) {
  const botonReabrir =
    document.createElement("button");

  botonReabrir.type = "button";
  botonReabrir.id =
    "btnReabrirFormulario008";

  botonReabrir.className =
    "hc-btn-accion hc-btn-reabrir";

  botonReabrir.dataset
    .permitirCerrado = "true";

  botonReabrir.innerHTML = `
    <i class="fa-solid fa-lock-open"></i>
    Reabrir formulario
  `;

  botonReabrir.addEventListener(
    "click",
    reabrirFormulario008
  );

  contenedorReabrir.appendChild(
    botonReabrir
  );
}

  
}

}

async function cerrarFormulario008() {
  const botonCerrar =
    document.getElementById(
      "btnCerrarFormulario008"
    );

  try {
    const datos =
      obtenerDatosFormulario008();

    const documentoId = Number(
      documentoPDF008Actual?.id || 0
    );

    if (!datos.paciente_id) {
      throw new Error(
        "No se pudo identificar al paciente"
      );
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "No se encontró la fecha del procedimiento"
      );
    }

    if (!documentoId) {
      throw new Error(
        "Primero debe generar el PDF definitivo que desea cerrar"
      );
    }

    const confirmar = window.confirm(
      "¿Está seguro de cerrar el formulario 008?\n\n" +
      "Después del cierre no se podrán modificar los datos " +
      "ni generar nuevas versiones, salvo que un ADMIN " +
      "reabra el formulario."
    );

    if (!confirmar) {
      return;
    }

    if (botonCerrar) {
      botonCerrar.disabled = true;

      botonCerrar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Cerrando...
      `;
    }

    const respuesta = await fetch(
      "/api/hclinicas/008/cerrar",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          paciente_id:
            Number(datos.paciente_id),

          documento_id:
            documentoId,

          fecha_procedimiento:
            datos.fecha_admision_paciente
        })
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.detalle ||
        resultado.error ||
        "No se pudo cerrar el formulario 008"
      );
    }

   documentoPDF008Actual = {
  ...documentoPDF008Actual,
  ...(resultado.documento || {}),
  estado: "CERRADO"
};

/*
  Restauramos el texto antes de bloquear
  todos los controles del formulario.
*/
if (botonCerrar) {
  botonCerrar.innerHTML = `
    <i class="fa-solid fa-lock"></i>
    Formulario cerrado
  `;

  botonCerrar.disabled = true;
}

await bloquearFormulario008Cerrado(
  resultado.documento || {}
);

    alert(
      `${resultado.mensaje || "Formulario cerrado correctamente"}\n\n` +
      `Documento: ${
        resultado.documento?.nombre_archivo ||
        documentoPDF008Actual?.nombreArchivo ||
        ""
      }\n` +
      `Versión: ${
        resultado.documento?.version ||
        documentoPDF008Actual?.version ||
        ""
      }\n` +
      `Estado: CERRADO`
    );

    /*
      Actualiza las tarjetas de Historias Clínicas.
    */
    await cargarEstadosFormulariosHistoriaClinica();

  } catch (error) {
    console.error(
      "ERROR CERRANDO FORMULARIO 008:",
      error
    );

    alert(
      error.message ||
      "No se pudo cerrar el formulario 008"
    );

    if (
      botonCerrar &&
      !document.getElementById(
        "avisoFormulario008Cerrado"
      )
    ) {
      botonCerrar.disabled = false;

      botonCerrar.innerHTML = `
        <i class="fa-solid fa-lock"></i>
        Cerrar formulario
      `;
    }
  }
}

function calcularTotalGlasgow008() {
  const ocular = Number(
    document.getElementById(
      "hc008GlasgowOcular"
    )?.value || 0
  );

  const verbal = Number(
    document.getElementById(
      "hc008GlasgowVerbal"
    )?.value || 0
  );

  const motora = Number(
    document.getElementById(
      "hc008GlasgowMotora"
    )?.value || 0
  );

  const campoTotal = document.getElementById(
    "hc008GlasgowTotal"
  );

  if (!campoTotal) return;

  if (!ocular && !verbal && !motora) {
    campoTotal.value = "";
    return;
  }

  campoTotal.value =
    ocular + verbal + motora;
}

const temporizadoresDiagnosticos008 = {};

async function buscarDiagnosticosCIE008(
  numeroFila,
  texto
) {
  const contenedor = document.getElementById(
    `hc008ResultadosDiagnostico${numeroFila}`
  );

  if (!contenedor) return;

  const busqueda = String(texto || "").trim();

  if (busqueda.length < 2) {
    contenedor.style.display = "none";
    contenedor.innerHTML = "";
    return;
  }

  contenedor.style.display = "block";
  contenedor.innerHTML = `
    <div class="hc008-resultado-item">
      Buscando diagnósticos...
    </div>
  `;

  try {
    const respuesta = await fetch(
      `/api/diagnosticos-cie?buscar=${encodeURIComponent(
        busqueda
      )}&soloActivos=true`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron buscar los diagnósticos"
      );
    }

    const diagnosticos =
      resultado.diagnosticos || [];

    if (!diagnosticos.length) {
      contenedor.innerHTML = `
        <div class="hc008-resultado-item">
          No se encontraron coincidencias.
        </div>
      `;
      return;
    }

    contenedor.innerHTML = diagnosticos
      .map(
        diagnostico => `
          <button
            type="button"
            class="hc008-resultado-item"
            data-seleccionar-diagnostico="${numeroFila}"
            data-diagnostico-id="${diagnostico.id}"
            data-diagnostico-codigo="${escaparHTMLHC(
              diagnostico.codigo || ""
            )}"
            data-diagnostico-descripcion="${escaparHTMLHC(
              diagnostico.descripcion || ""
            )}"
          >
            <strong>
              ${escaparHTMLHC(
                diagnostico.codigo || ""
              )}
            </strong>

            <small>
              ${escaparHTMLHC(
                diagnostico.descripcion || ""
              )}
            </small>
          </button>
        `
      )
      .join("");

    contenedor
      .querySelectorAll(
        "[data-seleccionar-diagnostico]"
      )
      .forEach(boton => {
        boton.addEventListener("click", () => {
          seleccionarDiagnosticoCIE008(
            numeroFila,
            {
              id:
                boton.dataset.diagnosticoId,
              codigo:
                boton.dataset.diagnosticoCodigo,
              descripcion:
                boton.dataset
                  .diagnosticoDescripcion
            }
          );
        });
      });

  } catch (error) {
    console.error(
      "ERROR BUSCANDO DIAGNÓSTICOS 008:",
      error
    );

    contenedor.innerHTML = `
      <div class="hc008-resultado-item">
        ${escaparHTMLHC(error.message)}
      </div>
    `;
  }
}

function seleccionarDiagnosticoCIE008(
  numeroFila,
  diagnostico
) {
  const campoCodigo = document.getElementById(
    `hc008CiePresuntivo${numeroFila}`
  );

  const campoDescripcion =
    document.getElementById(
      `hc008DiagnosticoPresuntivo${numeroFila}`
    );

  const resultados = document.getElementById(
    `hc008ResultadosDiagnostico${numeroFila}`
  );

  if (campoCodigo) {
    campoCodigo.value =
      diagnostico.codigo || "";
  }

  if (campoDescripcion) {
    campoDescripcion.value =
      diagnostico.descripcion || "";

    campoDescripcion.dataset
      .diagnosticoSeleccionado =
      diagnostico.descripcion || "";
  }

  if (resultados) {
    resultados.style.display = "none";
    resultados.innerHTML = "";
  }
}

function limpiarDiagnosticoCIE008(
  numeroFila
) {
  const codigo = document.getElementById(
    `hc008CiePresuntivo${numeroFila}`
  );

  const descripcion =
    document.getElementById(
      `hc008DiagnosticoPresuntivo${numeroFila}`
    );

  const resultados = document.getElementById(
    `hc008ResultadosDiagnostico${numeroFila}`
  );

  if (codigo) {
    codigo.value = "";
  }

  if (descripcion) {
    descripcion.value = "";

    delete descripcion.dataset
      .diagnosticoSeleccionado;
  }

  if (resultados) {
    resultados.style.display = "none";
    resultados.innerHTML = "";
  }
}

let temporizadorMedico008 = null;

async function buscarMedicosEmergencia008(
  texto
) {
  const contenedor = document.getElementById(
    "hc008ResultadosMedicoEmergencia"
  );

  if (!contenedor) return;

  const busqueda = String(texto || "").trim();

  if (busqueda.length < 2) {
    contenedor.style.display = "none";
    contenedor.innerHTML = "";
    return;
  }

  contenedor.style.display = "block";
  contenedor.innerHTML = `
    <div class="hc008-resultado-item">
      Buscando profesionales...
    </div>
  `;

  try {
    const respuesta = await fetch(
      `/api/profesionales-salud?buscar=${encodeURIComponent(
        busqueda
      )}&soloActivos=true`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron buscar los profesionales"
      );
    }

    const profesionales = (
      resultado.profesionales || []
    ).filter(profesional =>
      String(
        profesional.categoria || ""
      )
        .toUpperCase()
        .includes("MÉDICO") ||
      String(
        profesional.categoria || ""
      )
        .toUpperCase()
        .includes("MEDICO")
    );

    if (!profesionales.length) {
      contenedor.innerHTML = `
        <div class="hc008-resultado-item">
          No se encontraron médicos activos.
        </div>
      `;
      return;
    }

    contenedor.innerHTML = profesionales
      .map(
        profesional => `
          <button
            type="button"
            class="hc008-resultado-item"
            data-medico-id="${profesional.id}"
          >
            <strong>
              ${escaparHTMLHC(
                profesional.nombre_completo ||
                ""
              )}
            </strong>

            <small>
              C.I.:
              ${escaparHTMLHC(
                profesional.cedula || ""
              )}
              ·
              ${escaparHTMLHC(
                profesional.especialidad || ""
              )}
            </small>
          </button>
        `
      )
      .join("");

    contenedor
      .querySelectorAll(
        "[data-medico-id]"
      )
      .forEach(boton => {
        boton.addEventListener(
          "click",
          () => {
            seleccionarMedicoEmergencia008(
              Number(
                boton.dataset.medicoId
              )
            );
          }
        );
      });

  } catch (error) {
    console.error(
      "ERROR BUSCANDO MÉDICO 008:",
      error
    );

    contenedor.innerHTML = `
      <div class="hc008-resultado-item">
        ${escaparHTMLHC(error.message)}
      </div>
    `;
  }
}

async function seleccionarMedicoEmergencia008(
  profesionalId
) {
  try {
    const respuesta = await fetch(
      `/api/profesionales-salud/${profesionalId}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo consultar el profesional"
      );
    }

    const profesional =
      resultado.profesional;

    const nombres = [
      profesional.primer_nombre,
      profesional.segundo_nombre
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    document.getElementById(
      "hc008ProfesionalMedicoId"
    ).value = profesional.id || "";

    document.getElementById(
      "hc008BuscarMedicoEmergencia"
    ).value = [
      nombres,
      profesional.primer_apellido,
      profesional.segundo_apellido
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    document.getElementById(
      "hc008NombresMedico"
    ).value = nombres;

    document.getElementById(
      "hc008PrimerApellidoMedico"
    ).value =
      profesional.primer_apellido || "";

    document.getElementById(
      "hc008SegundoApellidoMedico"
    ).value =
      profesional.segundo_apellido || "";

    document.getElementById(
      "hc008CedulaMedico"
    ).value =
      profesional.cedula || "";

    mostrarFirmaYSelloMedico008(
      profesional
    );

    const resultados = document.getElementById(
      "hc008ResultadosMedicoEmergencia"
    );

    if (resultados) {
      resultados.style.display = "none";
      resultados.innerHTML = "";
    }

  } catch (error) {
    console.error(
      "ERROR SELECCIONANDO MÉDICO:",
      error
    );

    alert(error.message);
  }
}

function mostrarFirmaYSelloMedico008(
  profesional
) {
  const vistaFirma = document.getElementById(
    "hc008VistaFirmaMedico"
  );

  const vistaSello = document.getElementById(
    "hc008VistaSelloMedico"
  );

  if (vistaFirma) {
    vistaFirma.innerHTML =
      profesional.firma_ruta
        ? `
          <img
            src="/api/profesionales-salud/${profesional.id}/firma?ts=${Date.now()}"
            alt="Firma del profesional"
          >
        `
        : "El profesional no tiene firma registrada.";
  }

  if (vistaSello) {
    vistaSello.innerHTML =
      profesional.sello_ruta
        ? `
          <img
            src="/api/profesionales-salud/${profesional.id}/sello?ts=${Date.now()}"
            alt="Sello del profesional"
          >
        `
        : "El profesional no tiene sello registrado.";
  }
}

async function generarPDFFormulario008() {
  const botonGenerar =
    document.getElementById(
      "btnGenerarPDF008"
    );

  try {
    const datos =
      obtenerDatosFormulario008();

    if (!datos.paciente_id) {
      throw new Error(
        "No se pudo identificar al paciente"
      );
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "No se encontró la fecha de admisión"
      );
    }

    /*
      Guardamos primero el borrador para que los
      datos enviados al PDF también queden en SQL.
    */
    if (botonGenerar) {
      botonGenerar.disabled = true;

      botonGenerar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando borrador...
      `;
    }

    const respuestaBorrador = await fetch(
      "/api/hclinicas/008/guardar-borrador",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(datos)
      }
    );

    const resultadoBorrador =
      await respuestaBorrador
        .json()
        .catch(() => ({}));

    if (!respuestaBorrador.ok) {
      throw new Error(
        resultadoBorrador.detalle ||
        resultadoBorrador.error ||
        "No se pudo guardar el borrador antes de generar el PDF"
      );
    }

    if (botonGenerar) {
      botonGenerar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Generando PDF...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/008/generar-pdf",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(datos)
      }
    );

    const resultado = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (!respuestaHTTP.ok) {
      throw new Error(
        resultado.detalle ||
        resultado.error ||
        "No se pudo generar y almacenar el PDF 008"
      );
    }

    documentoPDF008Actual =
      resultado.documento || null;

    const botonCerrar =
      document.getElementById(
        "btnCerrarFormulario008"
      );

    if (
      botonCerrar &&
      documentoPDF008Actual?.id
    ) {
      botonCerrar.disabled = false;
    }

    alert(
      `${resultado.mensaje || "PDF generado correctamente"}\n\n` +
      `Documento: ${
        resultado.documento?.nombreArchivo || ""
      }\n` +
      `Versión: ${
        resultado.documento?.version || ""
      }\n` +
      `Estado: ${
        resultado.documento?.estado || "BORRADOR"
      }`
    );

  } catch (error) {
    console.error(
      "ERROR GENERANDO PDF 008:",
      error
    );

    alert(
      error.message ||
      "No se pudo generar el PDF del formulario 008"
    );

  } finally {
    const avisoCerrado =
      document.getElementById(
        "avisoFormulario008Cerrado"
      );

    if (
      botonGenerar &&
      !avisoCerrado
    ) {
      botonGenerar.disabled = false;

      botonGenerar.innerHTML = `
        <i class="fa-solid fa-file-pdf"></i>
        Generar PDF
      `;
    }
  }
}

async function reabrirFormulario008() {
  try {
    const datos =
      obtenerDatosFormulario008();

    if (!datos.paciente_id) {
      throw new Error(
        "No se pudo identificar al paciente"
      );
    }

    if (!datos.fecha_admision_paciente) {
      throw new Error(
        "No se encontró la fecha del procedimiento"
      );
    }

    const motivo = window.prompt(
      "Ingrese el motivo de la reapertura del formulario 008:"
    );

    if (motivo === null) {
      return;
    }

    const motivoLimpio =
      String(motivo).trim();

    if (motivoLimpio.length < 5) {
      throw new Error(
        "El motivo debe contener al menos 5 caracteres"
      );
    }

    const confirmacion = window.confirm(
      "¿Confirma la reapertura del formulario 008?\n\n" +
      "El PDF cerrado permanecerá como evidencia histórica. " +
      "Después podrá modificar el formulario y generar una nueva versión."
    );

    if (!confirmacion) {
      return;
    }

    const botonReabrir =
      document.getElementById(
        "btnReabrirFormulario008"
      );

    if (botonReabrir) {
      botonReabrir.disabled = true;

      botonReabrir.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Reabriendo...
      `;
    }

    const respuesta = await fetch(
      "/api/hclinicas/008/reabrir",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          paciente_id:
            Number(datos.paciente_id),

          fecha_procedimiento:
            datos.fecha_admision_paciente,

          motivo_reapertura:
            motivoLimpio
        })
      }
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (respuesta.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado.detalle ||
        resultado.error ||
        "No se pudo reabrir el formulario 008"
      );
    }

    alert(
      resultado.mensaje ||
      "Formulario 008 reabierto correctamente"
    );

    documentoPDF008Actual = null;

    await cargarEstadosFormulariosHistoriaClinica();

    await abrirFormulario008Emergencia();

  } catch (error) {
    console.error(
      "ERROR REABRIENDO FORMULARIO 008:",
      error
    );

    alert(
      error.message ||
      "No se pudo reabrir el formulario 008"
    );

    const botonReabrir =
      document.getElementById(
        "btnReabrirFormulario008"
      );

    if (botonReabrir) {
      botonReabrir.disabled = false;

      botonReabrir.innerHTML = `
        <i class="fa-solid fa-lock-open"></i>
        Reabrir formulario
      `;
    }
  }
}

async function usuarioActualEsAdminHC() {
  try {
    const respuesta = await fetch(
      "/api/usuario"
    );

    const usuario = await respuesta
      .json()
      .catch(() => ({}));

    if (!respuesta.ok) {
      return false;
    }

    return (
      String(
        usuario.rol || ""
      ).toUpperCase() === "ADMIN"
    );

  } catch (error) {
    console.error(
      "No se pudo comprobar el rol del usuario:",
      error
    );

    return false;
  }
}

/* =========================================================
   CONFIGURACIÓN: NOMBRES DE PROCEDIMIENTOS
========================================================= */

let procedimientosMedicosCargados = [];
let temporizadorBusquedaProcedimientos = null;


/* INICIALIZAR MÓDULO */
function inicializarConfiguracionProcedimientosMedicos() {
  const formulario =
    document.getElementById(
      "formProcedimientoMedico"
    );

  const buscador =
    document.getElementById(
      "buscarProcedimientoMedico"
    );

  const archivoExcel =
    document.getElementById(
      "archivoProcedimientosMedicos"
    );

  const botonImportar =
    document.getElementById(
      "btnImportarProcedimientos"
    );

  const botonPlantilla =
    document.getElementById(
      "btnDescargarPlantillaProcedimientos"
    );

  const botonCancelar =
    document.getElementById(
      "btnCancelarEdicionProcedimiento"
    );


  if (formulario) {
    formulario.addEventListener(
      "submit",
      guardarProcedimientoMedico
    );
  }


  if (buscador) {
    buscador.addEventListener(
      "input",
      () => {
        clearTimeout(
          temporizadorBusquedaProcedimientos
        );

        temporizadorBusquedaProcedimientos =
          setTimeout(() => {
            cargarProcedimientosMedicos(
              buscador.value
            );
          }, 300);
      }
    );
  }


  if (archivoExcel) {
    archivoExcel.addEventListener(
      "change",
      () => {
        const archivo =
          archivoExcel.files?.[0];

        const nombreArchivo =
          document.getElementById(
            "nombreArchivoProcedimientos"
          );

        if (nombreArchivo) {
          nombreArchivo.textContent =
            archivo
              ? archivo.name
              : "Ningún archivo seleccionado";
        }

        if (botonImportar) {
          botonImportar.disabled =
            !archivo;
        }
      }
    );
  }


  if (botonImportar) {
    botonImportar.addEventListener(
      "click",
      importarProcedimientosMedicos
    );
  }


  if (botonPlantilla) {
    botonPlantilla.addEventListener(
      "click",
      descargarPlantillaProcedimientosMedicos
    );
  }


  if (botonCancelar) {
    botonCancelar.addEventListener(
      "click",
      cancelarEdicionProcedimientoMedico
    );
  }


  cargarProcedimientosMedicos();
}


/* CARGAR LISTADO */
async function cargarProcedimientosMedicos(
  busqueda = ""
) {
  const cuerpoTabla =
    document.getElementById(
      "tbodyProcedimientosMedicos"
    );

  if (!cuerpoTabla) {
    return;
  }

  cuerpoTabla.innerHTML = `
    <tr>
      <td colspan="3">
        Cargando procedimientos...
      </td>
    </tr>
  `;

  try {
    const parametros =
      new URLSearchParams();

    if (String(busqueda).trim()) {
      parametros.set(
        "buscar",
        String(busqueda).trim()
      );
    }

    const url =
      parametros.toString()
        ? `/api/procedimientos-medicos?${parametros.toString()}`
        : "/api/procedimientos-medicos";

    const respuesta =
      await fetch(url);

    const resultado =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar los procedimientos"
      );
    }

    procedimientosMedicosCargados =
      Array.isArray(
        resultado.procedimientos
      )
        ? resultado.procedimientos
        : [];

    renderizarProcedimientosMedicos(
      procedimientosMedicosCargados
    );

  } catch (error) {
    console.error(
      "ERROR CARGANDO PROCEDIMIENTOS:",
      error
    );

    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="3">
          ${escaparHTMLProcedimientos(
            error.message
          )}
        </td>
      </tr>
    `;
  }
}


/* RENDERIZAR TABLA */
function renderizarProcedimientosMedicos(
  procedimientos
) {
  const cuerpoTabla =
    document.getElementById(
      "tbodyProcedimientosMedicos"
    );

  if (!cuerpoTabla) {
    return;
  }

  if (
    !Array.isArray(procedimientos) ||
    procedimientos.length === 0
  ) {
    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="3">
          No se encontraron procedimientos.
        </td>
      </tr>
    `;

    return;
  }

  cuerpoTabla.innerHTML =
    procedimientos
      .map(procedimiento => {
        const estado =
          String(
            procedimiento.estado || ""
          ).toUpperCase();

        const estaActivo =
          estado === "ACTIVO";

      

        return `
          <tr>
            <td>
              ${escaparHTMLProcedimientos(
                procedimiento.nombre
              )}
            </td>

            <td>
              <span class="${
                estaActivo
                  ? "estado-activo"
                  : "estado-inactivo"
              }">
                ${escaparHTMLProcedimientos(
                  estado
                )}
              </span>
            </td>

            

            <td>
              <div class="acciones-tabla">

                <button
                  type="button"
                  class="btn-editar"
                  onclick="editarProcedimientoMedico(${Number(
                    procedimiento.id
                  )})"
                  title="Editar procedimiento"
                >
                  <i class="fa-solid fa-pen"></i>
                  Editar
                </button>

                <button
                  type="button"
                  class="${
                    estaActivo
                      ? "btn-inactivar"
                      : "btn-activar"
                  }"
                  onclick="cambiarEstadoProcedimientoMedico(${Number(
                    procedimiento.id
                  )})"
                  title="${
                    estaActivo
                      ? "Inactivar procedimiento"
                      : "Activar procedimiento"
                  }"
                >
                  <i class="fa-solid ${
                    estaActivo
                      ? "fa-ban"
                      : "fa-check"
                  }"></i>

                  ${
                    estaActivo
                      ? "Inactivar"
                      : "Activar"
                  }
                </button>

              </div>
            </td>
          </tr>
        `;
      })
      .join("");
}


/* GUARDAR O EDITAR */
async function guardarProcedimientoMedico(
  evento
) {
  evento.preventDefault();

  const campoId =
    document.getElementById(
      "procedimientoMedicoId"
    );

  const campoNombre =
    document.getElementById(
      "nombreProcedimientoMedico"
    );

  const botonGuardar =
    document.getElementById(
      "btnGuardarProcedimientoMedico"
    );

  const procedimientoId =
    Number(campoId?.value || 0);

  const nombre =
    String(
      campoNombre?.value || ""
    )
      .trim()
      .toUpperCase();

  if (!nombre) {
    alert(
      "Ingrese el nombre del procedimiento."
    );

    campoNombre?.focus();
    return;
  }

  if (nombre.length > 300) {
    alert(
      "El nombre no puede superar 300 caracteres."
    );

    return;
  }

  const editando =
    Number.isInteger(procedimientoId) &&
    procedimientoId > 0;

  const url =
    editando
      ? `/api/procedimientos-medicos/${procedimientoId}`
      : "/api/procedimientos-medicos";

  const metodo =
    editando
      ? "PUT"
      : "POST";

  const textoOriginal =
    botonGuardar?.innerHTML || "";

  try {
    if (botonGuardar) {
      botonGuardar.disabled = true;

      botonGuardar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const respuesta =
      await fetch(
        url,
        {
          method: metodo,

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            nombre
          })
        }
      );

    const resultado =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo guardar el procedimiento"
      );
    }

    alert(
      resultado.mensaje ||
      "Procedimiento guardado correctamente."
    );

    cancelarEdicionProcedimientoMedico();

    const buscador =
      document.getElementById(
        "buscarProcedimientoMedico"
      );

    await cargarProcedimientosMedicos(
      buscador?.value || ""
    );

  } catch (error) {
    console.error(
      "ERROR GUARDANDO PROCEDIMIENTO:",
      error
    );

    alert(error.message);

  } finally {
    if (botonGuardar) {
      botonGuardar.disabled = false;

      botonGuardar.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar procedimiento
        `;
    }
  }
}


/* PREPARAR EDICIÓN */
function editarProcedimientoMedico(
  procedimientoId
) {
  const procedimiento =
    procedimientosMedicosCargados.find(
      item =>
        Number(item.id) ===
        Number(procedimientoId)
    );

  if (!procedimiento) {
    alert(
      "No se encontró el procedimiento seleccionado."
    );

    return;
  }

  const campoId =
    document.getElementById(
      "procedimientoMedicoId"
    );

  const campoNombre =
    document.getElementById(
      "nombreProcedimientoMedico"
    );

  const botonGuardar =
    document.getElementById(
      "btnGuardarProcedimientoMedico"
    );

  const botonCancelar =
    document.getElementById(
      "btnCancelarEdicionProcedimiento"
    );

  if (campoId) {
    campoId.value =
      procedimiento.id;
  }

  if (campoNombre) {
    campoNombre.value =
      procedimiento.nombre || "";

    campoNombre.focus();
  }

  if (botonGuardar) {
    botonGuardar.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Guardar cambios
    `;
  }

  if (botonCancelar) {
    botonCancelar.style.display =
      "inline-flex";
  }
}


/* CANCELAR EDICIÓN */
function cancelarEdicionProcedimientoMedico() {
  const formulario =
    document.getElementById(
      "formProcedimientoMedico"
    );

  const campoId =
    document.getElementById(
      "procedimientoMedicoId"
    );

  const botonGuardar =
    document.getElementById(
      "btnGuardarProcedimientoMedico"
    );

  const botonCancelar =
    document.getElementById(
      "btnCancelarEdicionProcedimiento"
    );

  formulario?.reset();

  if (campoId) {
    campoId.value = "";
  }

  if (botonGuardar) {
    botonGuardar.disabled = false;

    botonGuardar.innerHTML = `
      <i class="fa-solid fa-floppy-disk"></i>
      Guardar procedimiento
    `;
  }

  if (botonCancelar) {
    botonCancelar.style.display =
      "none";
  }
}


/* ACTIVAR O INACTIVAR */
async function cambiarEstadoProcedimientoMedico(
  procedimientoId
) {
  const procedimiento =
    procedimientosMedicosCargados.find(
      item =>
        Number(item.id) ===
        Number(procedimientoId)
    );

  if (!procedimiento) {
    alert(
      "No se encontró el procedimiento."
    );

    return;
  }

  const estaActivo =
    String(
      procedimiento.estado || ""
    ).toUpperCase() === "ACTIVO";

  const accion =
    estaActivo
      ? "inactivar"
      : "activar";

  const confirmado =
    confirm(
      `¿Desea ${accion} el procedimiento "${procedimiento.nombre}"?`
    );

  if (!confirmado) {
    return;
  }

  try {
    const respuesta =
      await fetch(
        `/api/procedimientos-medicos/estado/${procedimientoId}`,
        {
          method: "PATCH"
        }
      );

    const resultado =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo cambiar el estado"
      );
    }

    const buscador =
      document.getElementById(
        "buscarProcedimientoMedico"
      );

    await cargarProcedimientosMedicos(
      buscador?.value || ""
    );

  } catch (error) {
    console.error(
      "ERROR CAMBIANDO ESTADO:",
      error
    );

    alert(error.message);
  }
}


/* DESCARGAR PLANTILLA */
function descargarPlantillaProcedimientosMedicos() {
  window.location.href =
    "/api/procedimientos-medicos/plantilla";
}


/* IMPORTAR EXCEL */
async function importarProcedimientosMedicos() {
  const campoArchivo =
    document.getElementById(
      "archivoProcedimientosMedicos"
    );

  const botonImportar =
    document.getElementById(
      "btnImportarProcedimientos"
    );

  const nombreArchivo =
    document.getElementById(
      "nombreArchivoProcedimientos"
    );

  const contenedorResultado =
    document.getElementById(
      "resultadoImportacionProcedimientos"
    );

  const archivo =
    campoArchivo?.files?.[0];

  if (!archivo) {
    alert(
      "Seleccione un archivo Excel."
    );

    return;
  }

  const formularioDatos =
    new FormData();

  formularioDatos.append(
    "archivo",
    archivo
  );

  const textoOriginal =
    botonImportar?.innerHTML || "";

  try {
    if (botonImportar) {
      botonImportar.disabled = true;

      botonImportar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Importando...
      `;
    }

    if (contenedorResultado) {
      contenedorResultado.style.display =
        "none";

      contenedorResultado.innerHTML = "";
    }

    const respuesta =
      await fetch(
        "/api/procedimientos-medicos/importar",
        {
          method: "POST",
          body: formularioDatos
        }
      );

    const resultado =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo importar el archivo"
      );
    }

    const resumen = `
      <strong>Importación finalizada</strong><br>
      Filas revisadas: ${Number(
        resultado.totalFilas || 0
      )}<br>
      Filas válidas: ${Number(
        resultado.filasValidas || 0
      )}<br>
      Procedimientos insertados: ${Number(
        resultado.insertados || 0
      )}<br>
      Duplicados omitidos: ${Number(
        resultado.omitidosDuplicados || 0
      )}<br>
      Filas con errores: ${Number(
        resultado.errores || 0
      )}
    `;

    if (contenedorResultado) {
      contenedorResultado.innerHTML =
        resumen;

      contenedorResultado.style.display =
        "block";
    }

    campoArchivo.value = "";

    if (nombreArchivo) {
      nombreArchivo.textContent =
        "Ningún archivo seleccionado";
    }

    await cargarProcedimientosMedicos();

  } catch (error) {
    console.error(
      "ERROR IMPORTANDO PROCEDIMIENTOS:",
      error
    );

    if (contenedorResultado) {
      contenedorResultado.innerHTML = `
        <strong>Error:</strong>
        ${escaparHTMLProcedimientos(
          error.message
        )}
      `;

      contenedorResultado.style.display =
        "block";
    } else {
      alert(error.message);
    }

  } finally {
    if (botonImportar) {
      botonImportar.disabled =
        !campoArchivo?.files?.[0];

      botonImportar.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-file-import"></i>
          Importar procedimientos
        `;
    }
  }
}


/* FORMATEAR FECHA */
function formatearFechaProcedimiento(
  valor
) {
  if (!valor) {
    return "";
  }

  const fecha = new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return String(valor);
  }

  return fecha.toLocaleString(
    "es-EC",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* ESCAPAR TEXTO HTML */
function escaparHTMLProcedimientos(
  valor
) {
  return String(
    valor ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   018 pre anestesico formulario
========================================================= */

let datosAutomaticosFormulario018 = {};
let documentoPDF018Actual = null;
let procedimientosFormulario018 = [];
let temporizadorProcedimiento018 = null;

async function abrirFormulario018Preanestesico() {
  if (
    !pacienteHistoriaClinicaSeleccionado
  ) {
    alert(
      "Primero seleccione un paciente."
    );
    return;
  }

  try {
    await mostrarFormulario018Preanestesico();
  } catch (error) {
    console.error(
      "ERROR ABRIENDO FORMULARIO 018:",
      error
    );

    alert(
      error.message ||
      "No se pudo abrir el formulario 018."
    );
  }
}


async function mostrarFormulario018Preanestesico() {
  const contenedor =
    document.getElementById(
      "hcListaFormularios"
    );

  if (!contenedor) {
    throw new Error(
      "No se encontró el contenedor de formularios."
    );
  }

  const paciente =
    pacienteHistoriaClinicaSeleccionado;

    


  if (!paciente) {
    throw new Error(
      "No existe un paciente seleccionado."
    );
  }

  const primerApellido =
  obtenerValorPacienteHC018(
    paciente,
    [
      "pac_apellido1"
    ]
  );

const segundoApellido =
  obtenerValorPacienteHC018(
    paciente,
    [
      "pac_apellido2"
    ]
  );

const primerNombre =
  obtenerValorPacienteHC018(
    paciente,
    [
      "pac_nombre1"
    ]
  );

const segundoNombre =
  obtenerValorPacienteHC018(
    paciente,
    [
      "pac_nombre2"
    ]
  );

const nombreCompleto = [
  primerApellido,
  segundoApellido,
  primerNombre,
  segundoNombre
]
  .filter(Boolean)
  .join(" ");

  const numeroArchivo =
    obtenerValorPacienteHC018(
      paciente,
      [
        "archivo",
        "numero_archivo",
        "narchivo_paciente"
      ]
    );

  const sexo =
    obtenerValorPacienteHC018(
      paciente,
      [
        "sexo",
        "sexo_paciente"
      ]
    );

  let edad =
    obtenerValorPacienteHC018(
      paciente,
      [
        "edad",
        "edad_paciente"
      ]
    );

  if (!edad) {
    const fechaNacimiento =
      obtenerValorPacienteHC018(
        paciente,
        [
          "fechaNacimiento",
          "fecha_nacimiento"
        ]
      );

    edad =
      calcularEdadPacienteHC018(
        fechaNacimiento
      );
  }

  datosAutomaticosFormulario018 = {
    paciente_h_clinica:
      nombreCompleto,

    narchivo_paciente:
      numeroArchivo,

      cedula_paciente:
  paciente.cedula_paciente || "",

    primer_apellido_paciente:
      primerApellido,

    segundo_apellido_paciente:
      segundoApellido,

    primer_nombre_paciente:
      primerNombre,

    segundo_nombre_paciente:
      segundoNombre,

    sexo_paciente:
      sexo,

    edad_paciente:
      edad
  };

  contenedor.innerHTML = `
    <section class="hc-formularios-panel">

      <div class="hc-formularios-encabezado">

        <div class="hc-formularios-titulo-icono">
          <i class="fa-solid fa-syringe"></i>
        </div>

        <div class="hc-formularios-titulo">

          <span class="hc-formularios-etiqueta">
            FORMULARIO 018
          </span>

          <h2>
            Evaluación preanestésica
          </h2>

          <p>
            Valoración clínica previa al procedimiento anestésico.
          </p>

        </div>

        <button
          type="button"
          class="hc-btn-volver"
          id="btnVolverFormulario018"
        >
          <i class="fa-solid fa-arrow-left"></i>
          Volver
        </button>

      </div>

      <div class="hc-formularios-separador"></div>


      <form
        id="formHC018"
        autocomplete="off"
      >

        <!-- DATOS DEL PACIENTE -->
        <div class="hc-seccion">

          <div class="hc-seccion-titulo">
            <i class="fa-solid fa-user"></i>

            <div>
              <h3>Datos del paciente</h3>
              <p>
                Información tomada automáticamente
                del registro de admisión.
              </p>
            </div>
          </div>

          <div class="hc-grid hc-grid-4">

            <div class="hc-campo hc-col-2">
              <label>
                Paciente
              </label>

              <input
                type="text"
                data-campo-pdf="paciente_h_clinica"
                value="${escaparHTMLHC(
                  nombreCompleto
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                N.º de archivo
              </label>

              <input
                type="text"
                data-campo-pdf="narchivo_paciente"
                value="${escaparHTMLHC(
                  numeroArchivo
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Sexo
              </label>

              <input
                type="text"
                data-campo-pdf="sexo_paciente"
                value="${escaparHTMLHC(
                  sexo
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Primer apellido
              </label>

              <input
                type="text"
                data-campo-pdf="primer_apellido_paciente"
                value="${escaparHTMLHC(
                  primerApellido
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Segundo apellido
              </label>

              <input
                type="text"
                data-campo-pdf="segundo_apellido_paciente"
                value="${escaparHTMLHC(
                  segundoApellido
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Primer nombre
              </label>

              <input
                type="text"
                data-campo-pdf="primer_nombre_paciente"
                value="${escaparHTMLHC(
                  primerNombre
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Segundo nombre
              </label>

              <input
                type="text"
                data-campo-pdf="segundo_nombre_paciente"
                value="${escaparHTMLHC(
                  segundoNombre
                )}"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Edad
              </label>

              <input
                type="text"
                data-campo-pdf="edad_paciente"
                value="${escaparHTMLHC(
                  edad
                )}"
                readonly
              >
            </div>

          </div>
        </div>


        <!-- DIAGNÓSTICOS Y PROCEDIMIENTO -->
        <div class="hc-seccion">

          <div class="hc-seccion-titulo">
            <i class="fa-solid fa-file-medical"></i>

            <div>
              <h3>
                Diagnósticos y procedimiento
              </h3>

              <p>
                Los diagnósticos se recuperarán
                desde el Formulario 008.
              </p>
            </div>
          </div>

          <div class="hc-grid hc-grid-4">

            <div class="hc-campo hc-col-3">
              <label>
                Diagnóstico presuntivo 1
              </label>

              <input
                type="text"
                data-campo-pdf="008_diagnostico_presuntivo1"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                CIE
              </label>

              <input
                type="text"
                data-campo-pdf="008_cie_presuntivo1"
                readonly
              >
            </div>

            <div class="hc-campo hc-col-3">
              <label>
                Diagnóstico presuntivo 2
              </label>

              <input
                type="text"
                data-campo-pdf="008_diagnostico_presuntivo2"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                CIE
              </label>

              <input
                type="text"
                data-campo-pdf="008_cie_presuntivo2"
                readonly
              >
            </div>

            <div
              class="hc-campo hc-col-4"
              style="position: relative;"
            >
              <label>
                Procedimiento propuesto
              </label>

              <input
                type="search"
                id="buscarProcedimientoFormulario018"
                data-campo-pdf="018_procedimiento_propuesto"
                placeholder="Escriba para buscar un procedimiento..."
                autocomplete="off"
              >

              <div
                id="resultadosProcedimientoFormulario018"
                class="hc-resultados-busqueda"
                style="display: none;"
              ></div>
            </div>

          </div>
        </div>


        <!-- SIGNOS VITALES -->
        <!-- ANAMNESIS -->
<div class="hc-seccion">

  <div class="hc-seccion-titulo">
    <i class="fa-solid fa-clipboard-question"></i>

    <div>
      <h3>
        Anamnesis
      </h3>

      <p>
        Enfermedades actuales, tiempo de evolución
        y tratamiento recibido.
      </p>
    </div>
  </div>

  <div class="hc018-tabla-anamnesis">

    <div class="hc018-anamnesis-encabezado">
      <span>N.º</span>
      <span>Diagnóstico o enfermedad</span>
      <span>Tiempo de evolución</span>
      <span>Tratamiento</span>
    </div>

    ${Array.from(
      {
        length: 10
      },
      (_, indice) => {
        const numero = indice + 1;

        return `
          <div class="hc018-anamnesis-fila">

            <span class="hc018-numero-fila">
              ${numero}
            </span>

            <input
              type="text"
              data-campo-pdf="018_anamnesis_diag${numero}"
              placeholder="Diagnóstico o enfermedad"
              maxlength="250"
            >

            <input
              type="text"
              data-campo-pdf="018_anamnesis_tiempo${numero}"
              placeholder="Ejemplo: 3 años"
              maxlength="100"
            >

            <input
              type="text"
              data-campo-pdf="018_anamnesis_tratamiento${numero}"
              placeholder="Tratamiento actual"
              maxlength="250"
            >

          </div>
        `;
      }
    ).join("")}

  </div>

</div>


<!-- ANTECEDENTES PERSONALES -->
<div class="hc-seccion">

  <div class="hc-seccion-titulo">
    <i class="fa-solid fa-clock-rotate-left"></i>

    <div>
      <h3>
        Antecedentes personales y familiares
      </h3>

      <p>
        Registre los antecedentes relevantes
        para la valoración preanestésica.
      </p>
    </div>
  </div>

  <div class="hc018-antecedentes-grid">

    <!-- ANESTÉSICOS -->
    <div class="hc018-antecedente-tarjeta">

      <h4>
        <i class="fa-solid fa-mask-face"></i>
        Anestésicos
      </h4>

      <input
        type="text"
        data-campo-pdf="018_anamnesis_anestesico1"
        placeholder="Antecedente anestésico 1"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_anestesico2"
        placeholder="Antecedente anestésico 2"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_anestesico3"
        placeholder="Antecedente anestésico 3"
      >

    </div>


    <!-- QUIRÚRGICOS -->
    <div class="hc018-antecedente-tarjeta">

      <h4>
        <i class="fa-solid fa-scalpel"></i>
        Quirúrgicos
      </h4>

      <input
        type="text"
        data-campo-pdf="018_anamnesis_quirurgico1"
        placeholder="Antecedente quirúrgico 1"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_quirurgico2"
        placeholder="Antecedente quirúrgico 2"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_quirurgico3"
        placeholder="Antecedente quirúrgico 3"
      >

    </div>


    <!-- ALÉRGICOS -->
    <div class="hc018-antecedente-tarjeta">

      <h4>
        <i class="fa-solid fa-triangle-exclamation"></i>
        Alérgicos
      </h4>

      <input
        type="text"
        data-campo-pdf="018_anamnesis_alergico1"
        placeholder="Alergia 1"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_alergico2"
        placeholder="Alergia 2"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_alergico3"
        placeholder="Alergia 3"
      >

    </div>


    <!-- TRANSFUSIONES -->
    <div class="hc018-antecedente-tarjeta">

      <h4>
        <i class="fa-solid fa-droplet"></i>
        Transfusiones
      </h4>

      <input
        type="text"
        data-campo-pdf="018_anamnesis_transfusiones1"
        placeholder="Antecedente transfusional 1"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_transfusiones2"
        placeholder="Antecedente transfusional 2"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_transfusiones3"
        placeholder="Antecedente transfusional 3"
      >

    </div>


    <!-- HÁBITOS -->
    <div class="hc018-antecedente-tarjeta">

      <h4>
        <i class="fa-solid fa-smoking"></i>
        Hábitos
      </h4>

      <input
        type="text"
        data-campo-pdf="018_anamnesis_habitos1"
        placeholder="Hábito 1"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_habitos2"
        placeholder="Hábito 2"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_habitos3"
        placeholder="Hábito 3"
      >

    </div>


    <!-- FAMILIARES -->
    <div class="hc018-antecedente-tarjeta">

      <h4>
        <i class="fa-solid fa-people-roof"></i>
        Antecedentes familiares
      </h4>

      <input
        type="text"
        data-campo-pdf="018_anamnesis_antecedentes_familiares1"
        placeholder="Antecedente familiar 1"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_antecedentes_familiares2"
        placeholder="Antecedente familiar 2"
      >

      <input
        type="text"
        data-campo-pdf="018_anamnesis_antecedentes_familiares3"
        placeholder="Antecedente familiar 3"
      >

    </div>

  </div>

</div>
        
        <div class="hc-seccion">

          <div class="hc-seccion-titulo">
            <i class="fa-solid fa-heart-pulse"></i>

            <div>
              <h3>
                Signos vitales y antropometría
              </h3>

              <p>
                Peso, talla e índice de masa corporal.
              </p>
            </div>
          </div>

          <div class="hc-grid hc-grid-4">

            <div class="hc-campo">
              <label>
                Presión arterial
              </label>

              <input
                type="text"
                data-campo-pdf="008_presion_arterial"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Pulso
              </label>

              <input
                type="text"
                data-campo-pdf="008_pulso"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Frecuencia respiratoria
              </label>

              <input
                type="text"
                data-campo-pdf="008_frecuencia_respiratoria"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Temperatura
              </label>

              <input
                type="text"
                data-campo-pdf="018_d_temperatura"
              >
            </div>

            <div class="hc-campo">
              <label>
                Saturación
              </label>

              <input
                type="text"
                data-campo-pdf="018_d_saturacion"
              >
            </div>

            <div class="hc-campo">
              <label>
                Glasgow
              </label>

              <input
                type="text"
                data-campo-pdf="018_d_glasgow"
              >
            </div>

            <div class="hc-campo">
              <label>
                Peso (kg)
              </label>

              <input
                type="text"
                data-campo-pdf="008_peso_kg"
                inputmode="decimal"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                Talla
              </label>

              <input
                type="text"
                data-campo-pdf="008_talla"
                inputmode="decimal"
                readonly
              >
            </div>

            <div class="hc-campo">
              <label>
                IMC
              </label>

              <input
                type="text"
                data-campo-pdf="018_d_imc"
                readonly
              >
            </div>

          </div>
        </div>

        <!-- EVALUACIÓN DE VÍA AÉREA -->
<div class="hc-seccion hc018-seccion-via-aerea">

  <div class="hc-seccion-titulo">
    <i class="fa-solid fa-lungs"></i>

    <div>
      <h3>
        Evaluación de vía aérea
      </h3>

      <p>
        Seleccione una opción en cada criterio
        de valoración de la vía aérea.
      </p>
    </div>
  </div>

  <div class="hc018-via-aerea-grid">

    <!-- APERTURA BUCAL -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Apertura bucal</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_apertura_bucal"
            data-campo-pdf="018_d_casilla_apertura_bucal1"
            value="1"
          >
          <span>Clase 1</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_apertura_bucal"
            data-campo-pdf="018_d_casilla_apertura_bucal2"
            value="1"
          >
          <span>Clase 2</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_apertura_bucal"
            data-campo-pdf="018_d_casilla_apertura_bucal3"
            value="1"
          >
          <span>Clase 3</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_apertura_bucal"
            data-campo-pdf="018_d_casilla_apertura_bucal4"
            value="1"
          >
          <span>Clase 4</span>
        </label>

      </div>
    </div>


    <!-- DISTANCIA TIROMENTONIANA -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Distancia tiromentoniana</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_tiromentoneana"
            data-campo-pdf="018_d_casilla_tiromentoneana1"
            value="1"
          >
          <span>Clase 1</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_tiromentoneana"
            data-campo-pdf="018_d_casilla_tiromentoneana2"
            value="1"
          >
          <span>Clase 2</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_tiromentoneana"
            data-campo-pdf="018_d_casilla_tiromentoneana3"
            value="1"
          >
          <span>Clase 3</span>
        </label>

      </div>
    </div>


    <!-- MALLAMPATI -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Mallampati</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_mallampati"
            data-campo-pdf="018_d_casilla_mallampati1"
            value="1"
          >
          <span>Clase I</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_mallampati"
            data-campo-pdf="018_d_casilla_mallampati2"
            value="1"
          >
          <span>Clase II</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_mallampati"
            data-campo-pdf="018_d_casilla_mallampati3"
            value="1"
          >
          <span>Clase III</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_mallampati"
            data-campo-pdf="018_d_casilla_mallampati4"
            value="1"
          >
          <span>Clase IV</span>
        </label>

      </div>
    </div>


    <!-- PROTRUSIÓN MANDIBULAR -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Protrusión mandibular</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_protrusion"
            data-campo-pdf="018_d_casilla_protrusion1"
            value="1"
          >
          <span>Clase 1</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_protrusion"
            data-campo-pdf="018_d_casilla_protrusion2"
            value="1"
          >
          <span>Clase 2</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_protrusion"
            data-campo-pdf="018_d_casilla_protrusion3"
            value="1"
          >
          <span>Clase 3</span>
        </label>

      </div>
    </div>


    <!-- PERÍMETRO CERVICAL -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Perímetro cervical</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_perimetro_cervical"
            data-campo-pdf="018_d_casilla_perimetro_cervical1"
            value="1"
          >
          <span>Normal</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_perimetro_cervical"
            data-campo-pdf="018_d_casilla_perimetro_cervical2"
            value="1"
          >
          <span>Aumentado</span>
        </label>

      </div>
    </div>


    <!-- MOVILIDAD CERVICAL -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Movilidad cervical</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_movilidad_cervical"
            data-campo-pdf="018_d_casilla_movilidad_cervical1"
            value="1"
          >
          <span>Normal</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_movilidad_cervical"
            data-campo-pdf="018_d_casilla_movilidad_cervical2"
            value="1"
          >
          <span>Limitada</span>
        </label>

      </div>
    </div>


    <!-- HISTORIA DE INTUBACIÓN -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Historia de intubación difícil</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_historia_intubacion"
            data-campo-pdf="018_d_casilla_historia_intubacion1"
            value="1"
          >
          <span>No</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_historia_intubacion"
            data-campo-pdf="018_d_casilla_historia_intubacion2"
            value="1"
          >
          <span>Sí</span>
        </label>

      </div>
    </div>


    <!-- PATOLOGÍA DE INTUBACIÓN -->
    <div class="hc018-valoracion-tarjeta">

      <h4>Patología asociada a intubación</h4>

      <div class="hc018-opciones">

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_patologia_intubacion"
            data-campo-pdf="018_d_casilla_patologia_intubacion1"
            value="1"
          >
          <span>No</span>
        </label>

        <label class="hc018-opcion">
          <input
            type="radio"
            name="018_grupo_patologia_intubacion"
            data-campo-pdf="018_d_casilla_patologia_intubacion2"
            value="1"
          >
          <span>Sí</span>
        </label>

      </div>
    </div>

  </div>

  <div class="hc-grid hc-grid-4 hc018-otros-via-aerea">

    <div class="hc-campo hc-col-4">
      <label>
        Otros hallazgos de vía aérea
      </label>

      <textarea
        data-campo-pdf="018_d_aerea_otros"
        rows="3"
        maxlength="500"
        placeholder="Describa otros hallazgos relevantes..."
      ></textarea>
    </div>

  </div>

</div>


<!-- EXAMEN FÍSICO -->
<div class="hc-seccion hc018-seccion-examen-fisico">

  <div class="hc-seccion-titulo">
    <i class="fa-solid fa-stethoscope"></i>

    <div>
      <h3>
        Examen físico
      </h3>

      <p>
        Registre los hallazgos clínicos
        relevantes para la valoración anestésica.
      </p>
    </div>
  </div>

  <div class="hc018-examen-grid">

    <div class="hc-campo">
      <label>Tórax</label>

      <textarea
        data-campo-pdf="018_d_torax"
        rows="3"
        maxlength="500"
        placeholder="Hallazgos en tórax..."
      ></textarea>
    </div>

    <div class="hc-campo">
      <label>Corazón</label>

      <textarea
        data-campo-pdf="018_d_corazon"
        rows="3"
        maxlength="500"
        placeholder="Hallazgos cardiovasculares..."
      ></textarea>
    </div>

    <div class="hc-campo">
      <label>Pulmones</label>

      <textarea
        data-campo-pdf="018_d_pulmones"
        rows="3"
        maxlength="500"
        placeholder="Hallazgos pulmonares..."
      ></textarea>
    </div>

    <div class="hc-campo">
      <label>Abdomen</label>

      <textarea
        data-campo-pdf="018_d_abdomen"
        rows="3"
        maxlength="500"
        placeholder="Hallazgos abdominales..."
      ></textarea>
    </div>

    <div class="hc-campo">
      <label>Extremidades</label>

      <textarea
        data-campo-pdf="018_d_extremidades"
        rows="3"
        maxlength="500"
        placeholder="Hallazgos en extremidades..."
      ></textarea>
    </div>

    <div class="hc-campo">
      <label>Sistema nervioso</label>

      <textarea
        data-campo-pdf="018_d_sistema_nervioso"
        rows="3"
        maxlength="500"
        placeholder="Hallazgos neurológicos..."
      ></textarea>
    </div>

  </div>

  <div class="hc-grid hc-grid-4 hc018-mets-contenedor">

    <div class="hc-campo">
      <label>
        Capacidad funcional METS
      </label>

      <input
        type="number"
        data-campo-pdf="018_d_mets"
        min="0"
        max="20"
        step="0.1"
        inputmode="decimal"
        placeholder="Ejemplo: 4"
      >
    </div>

  </div>

</div>

<!-- EXÁMENES DE LABORATORIO -->
<div class="hc-seccion hc018-seccion-laboratorios">

  <div class="hc-seccion-titulo">
    <i class="fa-solid fa-flask-vial"></i>

    <div>
      <h3>
        Exámenes de laboratorio
      </h3>

      <p>
        Registre los resultados disponibles para
        la valoración preanestésica.
      </p>
    </div>
  </div>

  <div class="hc018-laboratorios-grid">

    <!-- BIOMETRÍA HEMÁTICA -->
    <div class="hc018-laboratorio-tarjeta">

      <h4>
        <i class="fa-solid fa-droplet"></i>
        Biometría hemática
      </h4>

      <div class="hc018-laboratorio-campos">

        <div class="hc-campo">
          <label>Hematocrito</label>

          <input
            type="text"
            data-campo-pdf="018_e_hcto"
            inputmode="decimal"
            placeholder="Hcto"
          >
        </div>

        <div class="hc-campo">
          <label>Hemoglobina</label>

          <input
            type="text"
            data-campo-pdf="018_e_hb"
            inputmode="decimal"
            placeholder="Hb"
          >
        </div>

        <div class="hc-campo">
          <label>Plaquetas</label>

          <input
            type="text"
            data-campo-pdf="018_e_plaquetas"
            inputmode="numeric"
            placeholder="Plaquetas"
          >
        </div>

        <div class="hc-campo">
          <label>Leucocitos</label>

          <input
            type="text"
            data-campo-pdf="018_e_leucocitos"
            inputmode="numeric"
            placeholder="Leucocitos"
          >
        </div>

      </div>

    </div>


    <!-- COAGULACIÓN -->
    <div class="hc018-laboratorio-tarjeta">

      <h4>
        <i class="fa-solid fa-vial-circle-check"></i>
        Coagulación
      </h4>

      <div class="hc018-laboratorio-campos">

        <div class="hc-campo">
          <label>TP</label>

          <input
            type="text"
            data-campo-pdf="018_e_tp"
            inputmode="decimal"
            placeholder="TP"
          >
        </div>

        <div class="hc-campo">
          <label>TTP</label>

          <input
            type="text"
            data-campo-pdf="018_e_ttp"
            inputmode="decimal"
            placeholder="TTP"
          >
        </div>

        <div class="hc-campo">
          <label>INR</label>

          <input
            type="text"
            data-campo-pdf="018_e_inr"
            inputmode="decimal"
            placeholder="INR"
          >
        </div>

      </div>

    </div>


    <!-- QUÍMICA SANGUÍNEA -->
    <div class="hc018-laboratorio-tarjeta">

      <h4>
        <i class="fa-solid fa-flask"></i>
        Química sanguínea
      </h4>

      <div class="hc018-laboratorio-campos">

        <div class="hc-campo">
          <label>Glucosa</label>

          <input
            type="text"
            data-campo-pdf="018_e_glucosa"
            inputmode="decimal"
            placeholder="Glucosa"
          >
        </div>

        <div class="hc-campo">
          <label>Urea</label>

          <input
            type="text"
            data-campo-pdf="018_e_urea"
            inputmode="decimal"
            placeholder="Urea"
          >
        </div>

        <div class="hc-campo">
          <label>Creatinina</label>

          <input
            type="text"
            data-campo-pdf="018_e_creatinina"
            inputmode="decimal"
            placeholder="Creatinina"
          >
        </div>

      </div>

    </div>


    <!-- ELECTROLITOS -->
    <div class="hc018-laboratorio-tarjeta">

      <h4>
        <i class="fa-solid fa-bolt"></i>
        Electrolitos
      </h4>

      <div class="hc018-laboratorio-campos">

        <div class="hc-campo">
          <label>Sodio (Na)</label>

          <input
            type="text"
            data-campo-pdf="018_e_na"
            inputmode="decimal"
            placeholder="Na"
          >
        </div>

        <div class="hc-campo">
          <label>Potasio (K)</label>

          <input
            type="text"
            data-campo-pdf="018_e_k"
            inputmode="decimal"
            placeholder="K"
          >
        </div>

        <div class="hc-campo">
          <label>Cloro (Cl)</label>

          <input
            type="text"
            data-campo-pdf="018_e_cl"
            inputmode="decimal"
            placeholder="Cl"
          >
        </div>

        <div class="hc-campo">
          <label>Calcio (Ca)</label>

          <input
            type="text"
            data-campo-pdf="018_e_ca"
            inputmode="decimal"
            placeholder="Ca"
          >
        </div>

        <div class="hc-campo">
          <label>Magnesio (Mg)</label>

          <input
            type="text"
            data-campo-pdf="018_e_mg"
            inputmode="decimal"
            placeholder="Mg"
          >
        </div>

      </div>

    </div>

  </div>

  <div class="hc-grid hc-grid-4 hc018-laboratorios-otros">

    <div class="hc-campo hc-col-4">
      <label>
        Otros exámenes
      </label>

      <textarea
        data-campo-pdf="018_e_otros"
        rows="3"
        maxlength="500"
        placeholder="Registre otros resultados de laboratorio..."
      ></textarea>
    </div>

  </div>

</div>

<!-- PROFESIONAL ANESTESIÓLOGO -->
<div class="hc-seccion hc018-seccion-anestesiologo">

  <div class="hc-seccion-titulo">
    <i class="fa-solid fa-user-doctor"></i>

    <div>
      <h3>
        Profesional anestesiólogo
      </h3>

      <p>
        Seleccione al anestesiólogo responsable de la
        valoración preanestésica.
      </p>
    </div>
  </div>

  <input
    type="hidden"
    id="018_profesional_anestesiologo_id"
    data-campo-formulario="018_profesional_anestesiologo_id"
  >

  <div class="hc-grid hc-grid-4">

    <div class="hc-campo hc-col-4">
      <label for="selectAnestesiologoFormulario018">
        Seleccionar anestesiólogo
      </label>

      <select
        id="selectAnestesiologoFormulario018"
      >
        <option value="">
          Seleccione un profesional...
        </option>
      </select>
    </div>

    <div class="hc-campo hc-col-2">
      <label>
        Nombres
      </label>

      <input
        type="text"
        data-campo-pdf="018_j_nombres_anestesiologo"
        readonly
      >
    </div>

    <div class="hc-campo">
      <label>
        Primer apellido
      </label>

      <input
        type="text"
        data-campo-pdf="018_j_primer_apellido_anestesiologo"
        readonly
      >
    </div>

    <div class="hc-campo">
      <label>
        Segundo apellido
      </label>

      <input
        type="text"
        data-campo-pdf="018_j_segundo_apellido_anestesiologo"
        readonly
      >
    </div>

    <div class="hc-campo hc-col-2">
      <label>
        Cédula
      </label>

      <input
        type="text"
        data-campo-pdf="018_j_cedula_anestesiologo"
        readonly
      >
    </div>

  </div>

  <div class="hc018-identificacion-profesional">

    <div class="hc018-imagen-profesional">

      <div class="hc018-imagen-titulo">
        <i class="fa-solid fa-signature"></i>
        <span>Firma del anestesiólogo</span>
      </div>

      <div
        id="vistaFirmaAnestesiologo018"
        class="hc018-imagen-contenedor"
      >
        <span>
          Seleccione un anestesiólogo
        </span>
      </div>

      <!--
        Estos campos existen en el PDF únicamente
        como referencia de posición para insertar imágenes.
      -->
      <input
        type="hidden"
        data-campo-pdf="018_j_firma_anestesiologo"
      >

    </div>

    <div class="hc018-imagen-profesional">

      <div class="hc018-imagen-titulo">
        <i class="fa-solid fa-stamp"></i>
        <span>Sello del anestesiólogo</span>
      </div>

      <div
        id="vistaSelloAnestesiologo018"
        class="hc018-imagen-contenedor"
      >
        <span>
          Seleccione un anestesiólogo
        </span>
      </div>

      <input
        type="hidden"
        data-campo-pdf="018_j_sello_anestesiologo"
      >

    </div>

  </div>

</div>


        <!-- FINALIZACIÓN -->
        <div class="hc-seccion">

          <div class="hc-seccion-titulo">
            <i class="fa-solid fa-clock"></i>

            <div>
              <h3>
                Finalización
              </h3>

              <p>
                La hora se calculará 15 minutos
                después de la finalización del 008.
              </p>
            </div>
          </div>

          <div class="hc-grid hc-grid-4">

            <div class="hc-campo">
              <label>
                Fecha de valoración
              </label>

              <input
                type="date"
                data-campo-pdf="008_fecha_termino_emergencia"
              >
            </div>

            <div class="hc-campo">
              <label>
                Hora de término
              </label>

              <input
                type="time"
                data-campo-pdf="018_j_hora_termino"
              >
            </div>

          </div>
        </div>


        <div class="hc-acciones-formulario">

          <button
            type="button"
            id="btnGuardarBorrador018"
            class="hc-btn-accion hc-btn-guardar"
          >
            <i class="fa-solid fa-floppy-disk"></i>
            Guardar borrador
          </button>

          <button
            type="button"
            id="btnGenerarPDF018"
            class="hc-btn-accion hc-btn-generar"
          >
            <i class="fa-solid fa-file-pdf"></i>
            Generar PDF
          </button>

          <button
            type="button"
            id="btnCerrarFormulario018"
            class="hc-btn-accion hc-btn-cerrar"
            disabled
          >
            <i class="fa-solid fa-lock"></i>
            Cerrar formulario
          </button>

        </div>

      </form>

    </section>
  `;

  document
    .getElementById(
      "btnVolverFormulario018"
    )
    ?.addEventListener(
      "click",
      async () => {
        await mostrarListaFormulariosHistoriaClinica();
      }
    );

  const campoPeso =
    document.querySelector(
      '#formHC018 [data-campo-pdf="008_peso_kg"]'
    );

  const campoTalla =
    document.querySelector(
      '#formHC018 [data-campo-pdf="008_talla"]'
    );

  campoPeso?.addEventListener(
    "input",
    calcularIMCFormulario018
  );

  campoTalla?.addEventListener(
    "input",
    calcularIMCFormulario018
  );

inicializarBuscadorProcedimiento018();

await cargarDatosFormulario008En018();

await cargarAnestesiologosFormulario018();

const formularioGuardado018 =
  await cargarBorradorFormulario018();

/*
  Solamente buscamos un PDF BORRADOR
  si el formulario no está cerrado.
*/
const estadoFormulario018 =
  String(
    formularioGuardado018?.estado || ""
  )
    .trim()
    .toUpperCase();

if (
  estadoFormulario018 !== "CERRADO"
) {
  await cargarUltimoPDFBorradorFormulario018();
}

document
  .getElementById(
    "btnGuardarBorrador018"
  )
  ?.addEventListener(
    "click",
    guardarBorradorFormulario018
  );

document
  .getElementById(
    "btnGenerarPDF018"
  )
  ?.addEventListener(
    "click",
    generarPDFFormulario018
  );

document
  .getElementById(
    "btnCerrarFormulario018"
  )
  ?.addEventListener(
    "click",
    cerrarFormulario018
  );
  
}

function obtenerValorPacienteHC018(
  paciente,
  nombres
) {
  for (const nombre of nombres) {
    const valor = paciente?.[nombre];

    if (
      valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== ""
    ) {
      return String(valor).trim();
    }
  }

  return "";
}


function calcularEdadPacienteHC018(
  fechaNacimiento
) {
  if (!fechaNacimiento) {
    return "";
  }

  const nacimiento =
    new Date(fechaNacimiento);

  if (
    Number.isNaN(
      nacimiento.getTime()
    )
  ) {
    return "";
  }

  const hoy = new Date();

  let edad =
    hoy.getFullYear() -
    nacimiento.getFullYear();

  const diferenciaMes =
    hoy.getMonth() -
    nacimiento.getMonth();

  if (
    diferenciaMes < 0 ||
    (
      diferenciaMes === 0 &&
      hoy.getDate() <
      nacimiento.getDate()
    )
  ) {
    edad--;
  }

  return edad >= 0
    ? String(edad)
    : "";
}


function normalizarNumeroFormulario018(
  valor
) {
  const texto = String(
    valor ?? ""
  )
    .trim()
    .replace(",", ".");

  const coincidencia =
    texto.match(/-?\d+(\.\d+)?/);

  if (!coincidencia) {
    return NaN;
  }

  return Number(
    coincidencia[0]
  );
}


function calcularIMCFormulario018() {
  const campoPeso =
    document.querySelector(
      '#formHC018 [data-campo-pdf="008_peso_kg"]'
    );

  const campoTalla =
    document.querySelector(
      '#formHC018 [data-campo-pdf="008_talla"]'
    );

  const campoIMC =
    document.querySelector(
      '#formHC018 [data-campo-pdf="018_d_imc"]'
    );

  if (
    !campoPeso ||
    !campoTalla ||
    !campoIMC
  ) {
    return;
  }

  const peso =
    normalizarNumeroFormulario018(
      campoPeso.value
    );

  let talla =
    normalizarNumeroFormulario018(
      campoTalla.value
    );

  /*
    Si la talla llega como 170,
    se interpreta como centímetros.
  */
  if (
    Number.isFinite(talla) &&
    talla > 3
  ) {
    talla = talla / 100;
  }

  if (
    !Number.isFinite(peso) ||
    !Number.isFinite(talla) ||
    peso <= 0 ||
    talla <= 0
  ) {
    campoIMC.value = "";
    return;
  }

  const imc =
    peso / (talla * talla);

  campoIMC.value =
    imc.toFixed(2);
}


function sumarMinutosHoraHC018(
  valorHora,
  minutosAgregar = 15
) {
  const texto = String(
    valorHora || ""
  ).trim();

  const coincidencia =
    texto.match(
      /(\d{1,2}):(\d{2})/
    );

  if (!coincidencia) {
    return "";
  }

  const hora =
    Number(coincidencia[1]);

  const minutos =
    Number(coincidencia[2]);

  if (
    !Number.isInteger(hora) ||
    !Number.isInteger(minutos) ||
    hora < 0 ||
    hora > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return "";
  }

  const fechaTemporal =
    new Date(
      2000,
      0,
      1,
      hora,
      minutos
    );

  fechaTemporal.setMinutes(
    fechaTemporal.getMinutes() +
    minutosAgregar
  );

  return [
    String(
      fechaTemporal.getHours()
    ).padStart(2, "0"),

    String(
      fechaTemporal.getMinutes()
    ).padStart(2, "0")
  ].join(":");
}

function inicializarBuscadorProcedimiento018() {
  const buscador =
    document.getElementById(
      "buscarProcedimientoFormulario018"
    );

  const resultados =
    document.getElementById(
      "resultadosProcedimientoFormulario018"
    );

  if (
    !buscador ||
    !resultados
  ) {
    return;
  }

  buscador.addEventListener(
    "input",
    () => {
      clearTimeout(
        temporizadorProcedimiento018
      );

      const texto =
        buscador.value.trim();

      if (texto.length < 2) {
        resultados.innerHTML = "";
        resultados.style.display =
          "none";

        return;
      }

      temporizadorProcedimiento018 =
        setTimeout(
          () => {
            buscarProcedimientosFormulario018(
              texto
            );
          },
          250
        );
    }
  );

  buscador.addEventListener(
    "focus",
    () => {
      if (
        buscador.value.trim().length >= 2
      ) {
        buscarProcedimientosFormulario018(
          buscador.value.trim()
        );
      }
    }
  );

  document.addEventListener(
    "click",
    evento => {
      if (
        !resultados.contains(
          evento.target
        ) &&
        evento.target !== buscador
      ) {
        resultados.style.display =
          "none";
      }
    }
  );
}


async function buscarProcedimientosFormulario018(
  texto
) {
  const resultados =
    document.getElementById(
      "resultadosProcedimientoFormulario018"
    );

  if (!resultados) {
    return;
  }

  resultados.innerHTML = `
    <div class="hc-resultado-vacio">
      Buscando procedimientos...
    </div>
  `;

  resultados.style.display =
    "block";

  try {
    const parametros =
      new URLSearchParams({
        buscar: texto,
        soloActivos: "true"
      });

    const respuesta =
      await fetch(
        `/api/procedimientos-medicos?${parametros.toString()}`
      );

    const resultado =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron buscar los procedimientos"
      );
    }

    procedimientosFormulario018 =
      Array.isArray(
        resultado.procedimientos
      )
        ? resultado.procedimientos
        : [];

    renderizarResultadosProcedimiento018(
      procedimientosFormulario018
    );

  } catch (error) {
    console.error(
      "ERROR BUSCANDO PROCEDIMIENTOS 018:",
      error
    );

    resultados.innerHTML = `
      <div class="hc-resultado-vacio">
        ${escaparHTMLHC(
          error.message
        )}
      </div>
    `;
  }
}


function renderizarResultadosProcedimiento018(
  procedimientos
) {
  const resultados =
    document.getElementById(
      "resultadosProcedimientoFormulario018"
    );

  if (!resultados) {
    return;
  }

  if (
    !Array.isArray(procedimientos) ||
    procedimientos.length === 0
  ) {
    resultados.innerHTML = `
      <div class="hc-resultado-vacio">
        No se encontraron procedimientos activos.
      </div>
    `;

    resultados.style.display =
      "block";

    return;
  }

  resultados.innerHTML =
    procedimientos
      .map(procedimiento => `
        <button
          type="button"
          class="hc-resultado-item"
          data-id-procedimiento="${
            Number(procedimiento.id)
          }"
        >
          <i class="fa-solid fa-notes-medical"></i>

          <span>
            ${escaparHTMLHC(
              procedimiento.nombre
            )}
          </span>
        </button>
      `)
      .join("");

  resultados.style.display =
    "block";

  resultados
    .querySelectorAll(
      ".hc-resultado-item"
    )
    .forEach(boton => {
      boton.addEventListener(
        "click",
        () => {
          const procedimientoId =
            Number(
              boton.dataset
                .idProcedimiento
            );

          seleccionarProcedimiento018(
            procedimientoId
          );
        }
      );
    });
}


function seleccionarProcedimiento018(
  procedimientoId
) {
  const procedimiento =
    procedimientosFormulario018.find(
      item =>
        Number(item.id) ===
        Number(procedimientoId)
    );

  if (!procedimiento) {
    return;
  }

  const buscador =
    document.getElementById(
      "buscarProcedimientoFormulario018"
    );

  const resultados =
    document.getElementById(
      "resultadosProcedimientoFormulario018"
    );

  if (buscador) {
    buscador.value =
      procedimiento.nombre || "";
  }

  if (resultados) {
    resultados.style.display =
      "none";
  }
}

function asignarValorCampoFormulario018(
  nombreCampo,
  valor
) {
  const campo = document.querySelector(
    `#formHC018 [data-campo-pdf="${nombreCampo}"]`
  );

  if (!campo) {
    return;
  }

  campo.value =
    valor === null ||
    valor === undefined
      ? ""
      : String(valor);
}

/*funcion que recupera los datos del formulario 018 */


async function cargarDatosFormulario008En018(
  mostrarMensaje = true
) {
  if (
    !pacienteHistoriaClinicaSeleccionado?.id
  ) {
    return;
  }

  try {
    const pacienteId = Number(
      pacienteHistoriaClinicaSeleccionado.id
    );

    const fechaProcedimiento = String(
      datosAutomaticosFormulario008
        ?.fecha_admision_paciente ||
      pacienteHistoriaClinicaSeleccionado
        ?.fecha_procedimiento ||
      ""
    ).slice(0, 10);

    if (
      !pacienteId ||
      !fechaProcedimiento
    ) {
      console.warn(
        "No se pudo identificar el paciente o la fecha del procedimiento para cargar el Formulario 008.",
        {
          pacienteId,
          fechaProcedimiento
        }
      );

      return;
    }

    const respuestaHTTP = await fetch(
      `/api/hclinicas/008/borrador?paciente_id=${encodeURIComponent(
        pacienteId
      )}&fecha_procedimiento=${encodeURIComponent(
        fechaProcedimiento
      )}`
    );

    const resultado = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (!respuestaHTTP.ok) {
      if (respuestaHTTP.status === 404) {
        console.warn(
          "El paciente no tiene datos guardados en el Formulario 008 para esta fecha."
        );

        return;
      }

      throw new Error(
        resultado.error ||
        "No se pudieron recuperar los datos del Formulario 008"
      );
    }

    const formulario008 =
      resultado.formulario || {};

    let datos008 =
      formulario008.datos ||
      resultado.datos ||
      {};

    /*
      En algunos casos los datos pueden venir
      guardados como texto JSON.
    */
    if (typeof datos008 === "string") {
      try {
        datos008 = JSON.parse(datos008);
      } catch {
        datos008 = {};
      }
    }

   

    /*
      Diagnósticos presuntivos
    */
    asignarValorCampoFormulario018(
      "008_diagnostico_presuntivo1",
      datos008[
        "008_diagnostico_presuntivo1"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_cie_presuntivo1",
      datos008[
        "008_cie_presuntivo1"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_diagnostico_presuntivo2",
      datos008[
        "008_diagnostico_presuntivo2"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_cie_presuntivo2",
      datos008[
        "008_cie_presuntivo2"
      ] || ""
    );

    /*
      Signos vitales
    */
    asignarValorCampoFormulario018(
      "008_presion_arterial",
      datos008[
        "008_presion_arterial"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_pulso",
      datos008[
        "008_pulso"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_frecuencia_respiratoria",
      datos008[
        "008_frecuencia_respiratoria"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_peso_kg",
      datos008[
        "008_peso_kg"
      ] || ""
    );

    asignarValorCampoFormulario018(
      "008_talla",
      datos008[
        "008_talla"
      ] || ""
    );

    /*
      Temperatura
    */
    const temperatura008 =
      datos008[
        "008_temperatura"
      ] ||
      datos008[
        "008_temperatura_c"
      ] ||
      datos008[
        "018_d_temperatura"
      ] ||
      "";

    asignarValorCampoFormulario018(
      "018_d_temperatura",
      temperatura008
    );

    /*
      Saturación
    */
    const saturacion008 =
      datos008[
        "008_saturacion"
      ] ||
      datos008[
        "008_saturacion_oxigeno"
      ] ||
      datos008[
        "008_saturacion_o2"
      ] ||
      datos008[
        "018_d_saturacion"
      ] ||
      "";

    asignarValorCampoFormulario018(
      "018_d_saturacion",
      saturacion008
    );

    /*
      Glasgow
    */
    const glasgow008 =
      datos008[
        "008_glasgow_total"
      ] ||
      datos008[
        "008_glasgow"
      ] ||
      datos008[
        "018_d_glasgow"
      ] ||
      "";

    asignarValorCampoFormulario018(
      "018_d_glasgow",
      glasgow008
    );

    /*
      Calcular IMC después de colocar
      peso y talla.
    */
    calcularIMCFormulario018();

    const campoIMC =
      document.querySelector(
        '#formHC018 [data-campo-pdf="018_d_imc"]'
      );

    const valorIMC =
      campoIMC?.value || "";

    /*
      Fecha de valoración
    */
    asignarValorCampoFormulario018(
      "008_fecha_termino_emergencia",
      fechaProcedimiento
    );

    /*
      Hora final del 018:
      hora final del 008 + 15 minutos.
    */
    const horaTermino008 =
      datos008[
        "008_hora_termino_emergencia"
      ] ||
      datos008[
        "008_hora_termino"
      ] ||
      datos008[
        "hora_termino_emergencia"
      ] ||
      datos008[
        "008_hora_fin_emergencia"
      ] ||
      "";

    const horaTermino018 =
      sumarMinutosHoraHC018(
        horaTermino008,
        15
      );

    asignarValorCampoFormulario018(
      "018_j_hora_termino",
      horaTermino018
    );

    /*
      Guardamos una copia para usarla
      al guardar el borrador y generar el PDF.
    */
    datosAutomaticosFormulario018 = {
      ...datosAutomaticosFormulario018,

      fecha_procedimiento:
        fechaProcedimiento,

      "008_fecha_termino_emergencia":
        fechaProcedimiento,

      "008_diagnostico_presuntivo1":
        datos008[
          "008_diagnostico_presuntivo1"
        ] || "",

      "008_cie_presuntivo1":
        datos008[
          "008_cie_presuntivo1"
        ] || "",

      "008_diagnostico_presuntivo2":
        datos008[
          "008_diagnostico_presuntivo2"
        ] || "",

      "008_cie_presuntivo2":
        datos008[
          "008_cie_presuntivo2"
        ] || "",

      "008_presion_arterial":
        datos008[
          "008_presion_arterial"
        ] || "",

      "008_pulso":
        datos008[
          "008_pulso"
        ] || "",

      "008_frecuencia_respiratoria":
        datos008[
          "008_frecuencia_respiratoria"
        ] || "",

      "008_peso_kg":
        datos008[
          "008_peso_kg"
        ] || "",

      "008_talla":
        datos008[
          "008_talla"
        ] || "",

      "018_d_temperatura":
        temperatura008,

      "018_d_saturacion":
        saturacion008,

      "018_d_glasgow":
        glasgow008,

      "018_d_imc":
        valorIMC,

      "018_j_hora_termino":
        horaTermino018
    };

  } catch (error) {
    console.error(
      "ERROR CARGANDO DATOS DEL 008 EN EL 018:",
      error
    );
  }
}

async function guardarBorradorFormulario018(
  mostrarMensaje = true
) {
  const botonGuardar =
    document.getElementById(
      "btnGuardarBorrador018"
    );

  const textoOriginal =
    botonGuardar?.innerHTML || "";

  try {
    const datos =
      obtenerDatosFormulario018();

    if (
      !datos.paciente_id ||
      !datos.fecha_procedimiento
    ) {
      throw new Error(
        "No se pudo identificar al paciente o la fecha del procedimiento."
      );
    }

    if (botonGuardar) {
      botonGuardar.disabled = true;

      botonGuardar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/018/guardar-borrador",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(datos)
      }
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return false;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo guardar el borrador del Formulario 018."
      );
    }

    if (mostrarMensaje) {
      alert(
        respuesta.mensaje ||
        "Borrador del Formulario 018 guardado correctamente."
      );
    }

    await cargarEstadosFormulariosHistoriaClinica();

    return true;

  } catch (error) {
    console.error(
      "ERROR GUARDANDO BORRADOR 018:",
      error
    );

    alert(
      error.message ||
      "No se pudo guardar el borrador del Formulario 018."
    );

    return false;

  } finally {
    if (botonGuardar) {
      botonGuardar.disabled = false;

      botonGuardar.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar borrador
        `;
    }
  }
}


async function cargarBorradorFormulario018() {
  const pacienteId = Number(
    pacienteHistoriaClinicaSeleccionado?.id || 0
  );

  /*
    Usamos primero la fecha del paciente porque
    es estable aunque el Formulario 008 no se haya
    abierto previamente.
  */
  const fechaProcedimiento = String(
    pacienteHistoriaClinicaSeleccionado
      ?.fecha_procedimiento ||
    datosAutomaticosFormulario008
      ?.fecha_admision_paciente ||
    datosAutomaticosFormulario018
      ?.fecha_procedimiento ||
    ""
  ).slice(0, 10);

  if (
    !pacienteId ||
    !fechaProcedimiento
  ) {
    console.warn(
      "NO SE PUEDE CONSULTAR BORRADOR 018:",
      {
        pacienteId,
        fechaProcedimiento,
        paciente:
          pacienteHistoriaClinicaSeleccionado
      }
    );

    return null;
  }

  try {
    const url =
      `/api/hclinicas/018/borrador` +
      `?paciente_id=${encodeURIComponent(
        pacienteId
      )}` +
      `&fecha_procedimiento=${encodeURIComponent(
        fechaProcedimiento
      )}`;

    const respuestaHTTP =
      await fetch(url);

    const respuesta =
      await respuestaHTTP
        .json()
        .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return null;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo consultar el Formulario 018."
      );
    }

    if (
      respuesta.existe !== true ||
      !respuesta.formulario
    ) {
      console.warn(
        "NO EXISTE BORRADOR 018 PARA:",
        {
          pacienteId,
          fechaProcedimiento
        }
      );

      return null;
    }

    const formularioGuardado =
      respuesta.formulario;

    let datosGuardados =
      formularioGuardado.datos || {};

    if (
      typeof datosGuardados ===
      "string"
    ) {
      try {
        datosGuardados =
          JSON.parse(datosGuardados);
      } catch (errorJSON) {
        console.error(
          "ERROR CONVIRTIENDO JSON 018:",
          errorJSON
        );

        datosGuardados = {};
      }
    }

    if (
      !datosGuardados ||
      typeof datosGuardados !==
        "object"
    ) {
      console.warn(
        "EL BORRADOR 018 NO CONTIENE UN OBJETO DE DATOS:",
        datosGuardados
      );

      return formularioGuardado;
    }

    /*
      Actualizamos primero la copia interna.
    */
    datosAutomaticosFormulario018 = {
      ...datosAutomaticosFormulario018,
      ...datosGuardados
    };

    /*
      Después colocamos los valores
      guardados en la pantalla.
    */
    restaurarDatosFormulario018(
      datosGuardados
    );

    /*
      Restauramos el anestesiólogo,
      firma y sello.
    */
    await restaurarAnestesiologoFormulario018(
      datosGuardados
    );

    /*
      Recalculamos el IMC usando
      peso y talla.
    */
    calcularIMCFormulario018();

    /*
      Revisamos el estado real guardado
      en SQL.
    */
    const estadoFormulario018 =
      String(
        formularioGuardado.estado || ""
      )
        .trim()
        .toUpperCase();

    console.log(
      "ESTADO FORMULARIO 018:",
      estadoFormulario018
    );

    /*
      Si está cerrado:
      - bloqueamos todos los controles;
      - mostramos el botón para reapertura.
    */
  if (
  estadoFormulario018 ===
  "CERRADO"
) {
  bloquearFormulario018Cerrado();

  await mostrarBotonReabrirFormulario018();
}
    return formularioGuardado;

  } catch (error) {
    console.error(
      "ERROR CARGANDO BORRADOR 018:",
      error
    );

    alert(
      error.message ||
      "No se pudo cargar el borrador del Formulario 018."
    );

    return null;
  }
}

/* =========================================================
   FORMULARIO 018 - ANESTESIÓLOGO
========================================================= */

async function cargarAnestesiologosFormulario018() {
  const selector = document.getElementById(
    "selectAnestesiologoFormulario018"
  );

  if (!selector) {
    return;
  }

  selector.innerHTML = `
    <option value="">
      Cargando anestesiólogos...
    </option>
  `;

  selector.disabled = true;

  try {
    const respuesta = await fetch(
      "/api/profesionales-salud?soloActivos=true"
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (respuesta.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudieron cargar los profesionales"
      );
    }

    const profesionales = Array.isArray(
      resultado.profesionales
    )
      ? resultado.profesionales
      : [];

    const anestesiologos = profesionales.filter(
      profesional => {
        const categoria = String(
          profesional.categoria || ""
        )
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .toUpperCase();

        const especialidad = String(
          profesional.especialidad || ""
        )
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .toUpperCase();

        const esMedico =
          categoria.includes("MEDICO");

        const esAnestesiologia =
          especialidad.includes("ANESTES");

        return (
          esMedico &&
          esAnestesiologia
        );
      }
    );

    selector.innerHTML = `
      <option value="">
        Seleccione un anestesiólogo...
      </option>

      ${anestesiologos
        .map(profesional => {
          const nombreVisible =
            profesional.nombre_completo ||
            [
              profesional.primer_nombre,
              profesional.segundo_nombre,
              profesional.primer_apellido,
              profesional.segundo_apellido
            ]
              .filter(Boolean)
              .join(" ")
              .trim();

          return `
            <option value="${Number(
              profesional.id
            )}">
              ${escaparHTMLHC(
                nombreVisible
              )}
              ${
                profesional.cedula
                  ? `· C.I. ${escaparHTMLHC(
                      profesional.cedula
                    )}`
                  : ""
              }
            </option>
          `;
        })
        .join("")}
    `;

    if (!anestesiologos.length) {
      selector.innerHTML = `
        <option value="">
          No existen anestesiólogos activos registrados
        </option>
      `;
    }

    selector.disabled = false;

    selector.onchange = async () => {
      const profesionalId = Number(
        selector.value || 0
      );

      if (!profesionalId) {
        limpiarAnestesiologoFormulario018();
        return;
      }

      await seleccionarAnestesiologoFormulario018(
        profesionalId
      );
    };

  } catch (error) {
    console.error(
      "ERROR CARGANDO ANESTESIÓLOGOS 018:",
      error
    );

    selector.innerHTML = `
      <option value="">
        Error al cargar anestesiólogos
      </option>
    `;

    selector.disabled = false;

    alert(error.message);
  }
}


async function seleccionarAnestesiologoFormulario018(
  profesionalId
) {
  try {
    const respuesta = await fetch(
      `/api/profesionales-salud/${encodeURIComponent(
        profesionalId
      )}`
    );

    const resultado = await respuesta
      .json()
      .catch(() => ({}));

    if (respuesta.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        "No se pudo consultar el anestesiólogo"
      );
    }

    const profesional =
      resultado.profesional;

    if (!profesional) {
      throw new Error(
        "No se recibió la información del profesional."
      );
    }

    const nombres = [
      profesional.primer_nombre,
      profesional.segundo_nombre
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const campoProfesionalId =
      document.getElementById(
        "018_profesional_anestesiologo_id"
      );

    if (campoProfesionalId) {
      campoProfesionalId.value =
        profesional.id || "";
    }

    asignarValorCampoFormulario018(
      "018_j_nombres_anestesiologo",
      nombres
    );

    asignarValorCampoFormulario018(
      "018_j_primer_apellido_anestesiologo",
      profesional.primer_apellido || ""
    );

    asignarValorCampoFormulario018(
      "018_j_segundo_apellido_anestesiologo",
      profesional.segundo_apellido || ""
    );

    asignarValorCampoFormulario018(
      "018_j_cedula_anestesiologo",
      profesional.cedula || ""
    );

    mostrarFirmaYSelloAnestesiologo018(
      profesional
    );

  } catch (error) {
    console.error(
      "ERROR SELECCIONANDO ANESTESIÓLOGO 018:",
      error
    );

    alert(error.message);
  }
}


function mostrarFirmaYSelloAnestesiologo018(
  profesional
) {
  const vistaFirma = document.getElementById(
    "vistaFirmaAnestesiologo018"
  );

  const vistaSello = document.getElementById(
    "vistaSelloAnestesiologo018"
  );

  if (vistaFirma) {
    vistaFirma.innerHTML =
      profesional.firma_ruta
        ? `
          <img
            src="/api/profesionales-salud/${profesional.id}/firma?ts=${Date.now()}"
            alt="Firma del anestesiólogo"
          >
        `
        : `
          <span>
            El profesional no tiene firma registrada.
          </span>
        `;
  }

  if (vistaSello) {
    vistaSello.innerHTML =
      profesional.sello_ruta
        ? `
          <img
            src="/api/profesionales-salud/${profesional.id}/sello?ts=${Date.now()}"
            alt="Sello del anestesiólogo"
          >
        `
        : `
          <span>
            El profesional no tiene sello registrado.
          </span>
        `;
  }
}


function limpiarAnestesiologoFormulario018() {
  const campoProfesionalId =
    document.getElementById(
      "018_profesional_anestesiologo_id"
    );

  if (campoProfesionalId) {
    campoProfesionalId.value = "";
  }

  asignarValorCampoFormulario018(
    "018_j_nombres_anestesiologo",
    ""
  );

  asignarValorCampoFormulario018(
    "018_j_primer_apellido_anestesiologo",
    ""
  );

  asignarValorCampoFormulario018(
    "018_j_segundo_apellido_anestesiologo",
    ""
  );

  asignarValorCampoFormulario018(
    "018_j_cedula_anestesiologo",
    ""
  );

  const vistaFirma = document.getElementById(
    "vistaFirmaAnestesiologo018"
  );

  const vistaSello = document.getElementById(
    "vistaSelloAnestesiologo018"
  );

  if (vistaFirma) {
    vistaFirma.innerHTML = `
      <span>
        Seleccione un anestesiólogo
      </span>
    `;
  }

  if (vistaSello) {
    vistaSello.innerHTML = `
      <span>
        Seleccione un anestesiólogo
      </span>
    `;
  }
}

function obtenerDatosFormulario018() {
  const formulario =
    document.getElementById("formHC018");

  if (!formulario) {
    return {};
  }

  const datos = {
    ...datosAutomaticosFormulario018
  };

  /*
    Campos relacionados directamente
    con los nombres internos del PDF.
  */
  formulario
    .querySelectorAll("[data-campo-pdf]")
    .forEach(campo => {
      const nombreCampo =
        campo.dataset.campoPdf;

      if (!nombreCampo) {
        return;
      }

      if (
        campo.type === "radio" ||
        campo.type === "checkbox"
      ) {
        datos[nombreCampo] =
          campo.checked;
      } else {
        datos[nombreCampo] =
          String(campo.value ?? "").trim();
      }
    });

  /*
    Campos internos del formulario web
    que no corresponden directamente al PDF.
  */
  formulario
    .querySelectorAll("[data-campo-formulario]")
    .forEach(campo => {
      const nombreCampo =
        campo.dataset.campoFormulario;

      if (!nombreCampo) {
        return;
      }

      if (
        campo.type === "radio" ||
        campo.type === "checkbox"
      ) {
        datos[nombreCampo] =
          campo.checked;
      } else {
        datos[nombreCampo] =
          String(campo.value ?? "").trim();
      }
    });

  /*
    Aseguramos que el IMC actualizado
    quede incluido.
  */
  calcularIMCFormulario018();

  const campoIMC =
    formulario.querySelector(
      '[data-campo-pdf="018_d_imc"]'
    );

  datos["018_d_imc"] =
    String(campoIMC?.value || "").trim();

  /*
    Identificadores necesarios para guardar.
  */
  datos.paciente_id = Number(
    pacienteHistoriaClinicaSeleccionado?.id || 0
  );

  datos.fecha_procedimiento = String(
    datosAutomaticosFormulario008
      ?.fecha_admision_paciente ||
    pacienteHistoriaClinicaSeleccionado
      ?.fecha_procedimiento ||
    datosAutomaticosFormulario018
      ?.fecha_procedimiento ||
    ""
  ).slice(0, 10);

  datos.formulario_codigo = "018";

  return datos;
}

function restaurarDatosFormulario018(
  datosGuardados = {}
) {
  const formulario =
    document.getElementById("formHC018");

  if (
    !formulario ||
    !datosGuardados ||
    typeof datosGuardados !== "object"
  ) {
    return;
  }

  /*
    Restaurar campos vinculados al PDF.
  */
  formulario
    .querySelectorAll("[data-campo-pdf]")
    .forEach(campo => {
      const nombreCampo =
        campo.dataset.campoPdf;

      if (
        !nombreCampo ||
        !Object.prototype.hasOwnProperty.call(
          datosGuardados,
          nombreCampo
        )
      ) {
        return;
      }

      const valor =
        datosGuardados[nombreCampo];

      if (
        campo.type === "radio" ||
        campo.type === "checkbox"
      ) {
        campo.checked =
          valor === true ||
          valor === 1 ||
          valor === "1" ||
          valor === "true" ||
          valor === "X";
      } else {
        campo.value =
          valor === null ||
          valor === undefined
            ? ""
            : String(valor);
      }
    });

  /*
    Restaurar campos internos del formulario.
  */
  formulario
    .querySelectorAll("[data-campo-formulario]")
    .forEach(campo => {
      const nombreCampo =
        campo.dataset.campoFormulario;

      if (
        !nombreCampo ||
        !Object.prototype.hasOwnProperty.call(
          datosGuardados,
          nombreCampo
        )
      ) {
        return;
      }

      const valor =
        datosGuardados[nombreCampo];

      if (
        campo.type === "radio" ||
        campo.type === "checkbox"
      ) {
        campo.checked =
          valor === true ||
          valor === 1 ||
          valor === "1" ||
          valor === "true" ||
          valor === "X";
      } else {
        campo.value =
          valor === null ||
          valor === undefined
            ? ""
            : String(valor);
      }
    });

  calcularIMCFormulario018();
}

async function restaurarAnestesiologoFormulario018(
  datosGuardados = {}
) {
  const profesionalId = Number(
    datosGuardados[
      "018_profesional_anestesiologo_id"
    ] || 0
  );

  if (!profesionalId) {
    return;
  }

  const selector =
    document.getElementById(
      "selectAnestesiologoFormulario018"
    );

  if (selector) {
    selector.value =
      String(profesionalId);
  }

  await seleccionarAnestesiologoFormulario018(
    profesionalId
  );
}

async function generarPDFFormulario018() {
  const botonGenerar =
    document.getElementById(
      "btnGenerarPDF018"
    );

  const botonCerrar =
    document.getElementById(
      "btnCerrarFormulario018"
    );

  const textoOriginal =
    botonGenerar?.innerHTML || "";

  try {
    /*
      Primero guardamos el borrador para asegurar
      que SQL tenga la versión más reciente.
    */
    const guardadoCorrecto =
  await guardarBorradorFormulario018(
    false
  );

    if (!guardadoCorrecto) {
      return;
    }

    const datos =
      obtenerDatosFormulario018();

    if (
      !datos.paciente_id ||
      !datos.fecha_procedimiento
    ) {
      throw new Error(
        "No se pudo identificar al paciente o la fecha del procedimiento."
      );
    }

    if (botonGenerar) {
      botonGenerar.disabled = true;

      botonGenerar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Generando PDF...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/018/generar-pdf",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(datos)
      }
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo generar el PDF del Formulario 018."
      );
    }

    documentoPDF018Actual =
      respuesta.documento || null;

    if (
      botonCerrar &&
      documentoPDF018Actual?.id
    ) {
      botonCerrar.disabled = false;
    }

    alert(
      respuesta.mensaje ||
      `PDF 018 versión ${
        respuesta.documento?.version || ""
      } generado correctamente.`
    );

    await cargarEstadosFormulariosHistoriaClinica();

  } catch (error) {
    console.error(
      "ERROR GENERANDO PDF 018:",
      error
    );

    alert(
      error.message ||
      "No se pudo generar el PDF del Formulario 018."
    );

  } finally {
    if (botonGenerar) {
      botonGenerar.disabled = false;

      botonGenerar.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-file-pdf"></i>
          Generar PDF
        `;
    }
  }
}

async function cerrarFormulario018() {
  const botonCerrar =
    document.getElementById(
      "btnCerrarFormulario018"
    );

  const textoOriginal =
    botonCerrar?.innerHTML || "";

  try {
    if (!documentoPDF018Actual?.id) {
      alert(
        "Primero debe generar un PDF del Formulario 018."
      );

      return;
    }

    const datos =
      obtenerDatosFormulario018();

    if (
      !datos.paciente_id ||
      !datos.fecha_procedimiento
    ) {
      throw new Error(
        "No se pudo identificar al paciente o la fecha del procedimiento."
      );
    }

    const confirmar = confirm(
      "¿Está seguro de cerrar el Formulario 018?\n\nDespués de cerrarlo ya no podrá editarse, salvo reapertura por un usuario ADMIN."
    );

    if (!confirmar) {
      return;
    }

    if (botonCerrar) {
      botonCerrar.disabled = true;

      botonCerrar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Cerrando...
      `;
    }

    const respuestaHTTP = await fetch(
      "/api/hclinicas/018/cerrar",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          paciente_id:
            datos.paciente_id,

          fecha_procedimiento:
            datos.fecha_procedimiento,

          documento_id:
            documentoPDF018Actual.id
        })
      }
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo cerrar el Formulario 018."
      );
    }

    alert(
      respuesta.mensaje ||
      "Formulario 018 cerrado correctamente."
    );

    if (botonCerrar) {
      botonCerrar.innerHTML = `
        <i class="fa-solid fa-lock"></i>
        Formulario cerrado
      `;
    }

    bloquearFormulario018Cerrado();

    await cargarEstadosFormulariosHistoriaClinica();

  } catch (error) {
    console.error(
      "ERROR CERRANDO FORMULARIO 018:",
      error
    );

    alert(
      error.message ||
      "No se pudo cerrar el Formulario 018."
    );

    if (botonCerrar) {
      botonCerrar.disabled = false;

      botonCerrar.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-lock"></i>
          Cerrar formulario
        `;
    }
  }
}

function bloquearFormulario018Cerrado() {
  const formulario =
    document.getElementById(
      "formHC018"
    );

  if (!formulario) {
    return;
  }

  /*
    =========================================
    MOSTRAR AVISO DE FORMULARIO CERRADO
    =========================================
  */

  let aviso =
    document.getElementById(
      "avisoFormulario018Cerrado"
    );

  if (!aviso) {
    aviso =
      document.createElement("div");

    aviso.id =
      "avisoFormulario018Cerrado";

    aviso.className =
      "hc018-aviso-cerrado";

    aviso.innerHTML = `
      <i class="fa-solid fa-lock"></i>

      <span>
        Este formulario se encuentra cerrado y ya no puede modificarse.
      </span>
    `;

    /*
      Colocamos el aviso al inicio
      del formulario.
    */
    formulario.prepend(aviso);
  }

  /*
    =========================================
    BLOQUEAR CONTROLES
    =========================================
  */

  formulario
    .querySelectorAll(
      "input, textarea, select, button"
    )
    .forEach(elemento => {
      /*
        No tocamos el botón de reapertura.
        Su visibilidad la controla la función
        mostrarBotonReabrirFormulario018().
      */
      if (
        elemento.id ===
        "btnReabrirFormulario018"
      ) {
        return;
      }

      elemento.disabled = true;
    });

  /*
    =========================================
    BOTÓN CERRAR
    =========================================
  */

  const botonCerrar =
    document.getElementById(
      "btnCerrarFormulario018"
    );

  if (botonCerrar) {
    botonCerrar.disabled = true;

    botonCerrar.innerHTML = `
      <i class="fa-solid fa-lock"></i>
      Formulario cerrado
    `;
  }

  /*
    =========================================
    BOTÓN GUARDAR
    =========================================
  */

  const botonGuardar =
    document.getElementById(
      "btnGuardarBorrador018"
    );

  if (botonGuardar) {
    botonGuardar.disabled = true;
  }

  /*
    =========================================
    BOTÓN GENERAR PDF
    =========================================
  */

  const botonPDF =
    document.getElementById(
      "btnGenerarPDF018"
    );

  if (botonPDF) {
    botonPDF.disabled = true;
  }
}

async function reabrirFormulario018() {
  const datos =
    obtenerDatosFormulario018();

  if (
    !datos.paciente_id ||
    !datos.fecha_procedimiento
  ) {
    alert(
      "No se pudo identificar al paciente o la fecha del procedimiento."
    );

    return;
  }

  const motivo = prompt(
    "Ingrese el motivo de reapertura del Formulario 018:"
  );

  if (motivo === null) {
    return;
  }

  const motivoLimpio =
    String(motivo).trim();

  if (motivoLimpio.length < 5) {
    alert(
      "El motivo debe contener al menos 5 caracteres."
    );

    return;
  }

  if (motivoLimpio.length > 500) {
    alert(
      "El motivo no puede superar los 500 caracteres."
    );

    return;
  }

  try {
    const respuestaHTTP = await fetch(
      "/api/hclinicas/018/reabrir",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          paciente_id:
            datos.paciente_id,

          fecha_procedimiento:
            datos.fecha_procedimiento,

          motivo_reapertura:
            motivoLimpio
        })
      }
    );

    const respuesta = await respuestaHTTP
      .json()
      .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return;
    }

    if (respuestaHTTP.status === 403) {
      alert(
        respuesta.detalle ||
        "Solo un usuario ADMIN puede reabrir formularios."
      );

      return;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo reabrir el Formulario 018."
      );
    }

    alert(
      respuesta.mensaje ||
      "Formulario 018 reabierto correctamente."
    );

    /*
      El PDF cerrado anterior queda histórico.
      Por eso limpiamos el PDF actual.
    */
    documentoPDF018Actual = null;

    /*
      Reabrimos completamente la pantalla
      para reconstruir los controles habilitados.
    */
    await abrirFormulario018Preanestesico();

    await cargarEstadosFormulariosHistoriaClinica();

  } catch (error) {
    console.error(
      "ERROR REABRIENDO FORMULARIO 018:",
      error
    );

    alert(
      error.message ||
      "No se pudo reabrir el Formulario 018."
    );
  }
}

async function mostrarBotonReabrirFormulario018() {
  const formulario =
    document.getElementById(
      "formHC018"
    );

  if (!formulario) {
    return;
  }

  if (
    document.getElementById(
      "btnReabrirFormulario018"
    )
  ) {
    return;
  }

  try {
    const respuestaHTTP =
      await fetch("/api/usuario");

    if (respuestaHTTP.status === 401) {
      return;
    }

    if (!respuestaHTTP.ok) {
      console.warn(
        "No se pudo consultar el usuario activo para mostrar la reapertura del 018."
      );

      return;
    }

    const usuario =
      await respuestaHTTP.json();

    const rol =
      String(
        usuario?.rol || ""
      )
        .trim()
        .toUpperCase();

    /*
      Solo ADMIN ve el botón.
    */
    if (rol !== "ADMIN") {
      return;
    }

    /*
      Buscamos la franja de formulario cerrado.
    */
    const aviso =
      document.getElementById(
        "avisoFormulario018Cerrado"
      );

    if (!aviso) {
      return;
    }

    /*
      Creamos el botón dentro del mismo aviso.
    */
    const boton =
      document.createElement(
        "button"
      );

    boton.type =
      "button";

    boton.id =
      "btnReabrirFormulario018";

    boton.className =
      "hc018-btn-reabrir";

    boton.innerHTML = `
      <i class="fa-solid fa-lock-open"></i>
      <span>Reabrir formulario</span>
    `;

    boton.addEventListener(
      "click",
      reabrirFormulario018
    );

    aviso.appendChild(
      boton
    );

  } catch (error) {
    console.error(
      "ERROR VERIFICANDO PERMISOS DE REAPERTURA 018:",
      error
    );
  }
}

async function cargarUltimoPDFBorradorFormulario018() {
  const pacienteId = Number(
    pacienteHistoriaClinicaSeleccionado?.id || 0
  );

  const fechaProcedimiento = String(
    pacienteHistoriaClinicaSeleccionado
      ?.fecha_procedimiento ||
    datosAutomaticosFormulario018
      ?.fecha_procedimiento ||
    datosAutomaticosFormulario008
      ?.fecha_admision_paciente ||
    ""
  ).slice(0, 10);

  /*
    Por seguridad limpiamos primero
    cualquier documento anterior en memoria.
  */
  documentoPDF018Actual = null;

  if (
    !pacienteId ||
    !fechaProcedimiento
  ) {
    console.warn(
      "No se pudo consultar el último PDF 018:",
      {
        pacienteId,
        fechaProcedimiento
      }
    );

    return null;
  }

  try {
    const respuestaHTTP = await fetch(
      `/api/hclinicas/018/ultimo-pdf-borrador` +
      `?paciente_id=${encodeURIComponent(
        pacienteId
      )}` +
      `&fecha_procedimiento=${encodeURIComponent(
        fechaProcedimiento
      )}`
    );

    const respuesta =
      await respuestaHTTP
        .json()
        .catch(() => ({}));

    if (respuestaHTTP.status === 401) {
      alert(
        "La sesión ha expirado. Debe iniciar sesión nuevamente."
      );

      window.location.href = "/";
      return null;
    }

    if (!respuestaHTTP.ok) {
      throw new Error(
        respuesta.detalle ||
        respuesta.error ||
        "No se pudo consultar el último PDF 018."
      );
    }

    if (
      respuesta.existe !== true ||
      !respuesta.documento?.id
    ) {
      const botonCerrar =
        document.getElementById(
          "btnCerrarFormulario018"
        );

      if (botonCerrar) {
        botonCerrar.disabled = true;
      }

      console.log(
        "El Formulario 018 no tiene un PDF BORRADOR disponible."
      );

      return null;
    }

    documentoPDF018Actual = {
      ...respuesta.documento
    };

    console.log(
      "PDF BORRADOR 018 RECUPERADO:",
      documentoPDF018Actual
    );

    const botonCerrar =
      document.getElementById(
        "btnCerrarFormulario018"
      );

    if (botonCerrar) {
      botonCerrar.disabled = false;
    }

    return documentoPDF018Actual;

  } catch (error) {
    console.error(
      "ERROR CARGANDO ÚLTIMO PDF BORRADOR 018:",
      error
    );

    documentoPDF018Actual = null;

    const botonCerrar =
      document.getElementById(
        "btnCerrarFormulario018"
      );

    if (botonCerrar) {
      botonCerrar.disabled = true;
    }

    return null;
  }
}

async function cargarPermisosRol(rol) {
  const contenedor =
    document.getElementById(
      "contenedorPermisosRol"
    );

  const botonGuardar =
    document.getElementById(
      "btnGuardarPermisosRol"
    );

  if (!contenedor) return;

  if (!rol) {
    contenedor.innerHTML = `
      <div class="empty-row">
        Seleccione un rol para configurar sus permisos.
      </div>
    `;

    if (botonGuardar) {
      botonGuardar.disabled = true;
    }

    return;
  }

  try {
    const res =
      await fetch(
        `/api/permisos/rol/${encodeURIComponent(
          rol
        )}`
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudieron cargar los permisos del rol"
      );
    }

    renderArbolPermisosRol(
      data.permisos || [],
      rol
    );

    if (botonGuardar) {
      botonGuardar.disabled =
        rol === "ADMIN";
    }

  } catch (error) {
    console.error(
      "ERROR CARGANDO PERMISOS DEL ROL:",
      error
    );

    contenedor.innerHTML = `
      <div class="empty-row">
        Error al cargar permisos.
      </div>
    `;
  }
}

function renderArbolPermisosRol(
  permisos,
  rol
) {
  const contenedor =
    document.getElementById(
      "contenedorPermisosRol"
    );

  if (!contenedor) return;

  const esAdmin =
    String(rol || "")
      .trim()
      .toUpperCase() === "ADMIN";

  /*
    Construimos un mapa para poder
    encontrar hijos de cualquier nivel.
  */
  const mapaHijos = new Map();

  permisos.forEach(permiso => {
    const padre =
      permiso.permiso_padre || null;

    if (!mapaHijos.has(padre)) {
      mapaHijos.set(
        padre,
        []
      );
    }

    mapaHijos
      .get(padre)
      .push(permiso);
  });

  /*
    Ordenar cada grupo por "orden"
  */
  mapaHijos.forEach(lista => {
    lista.sort(
      (a, b) =>
        Number(a.orden || 0) -
        Number(b.orden || 0)
    );
  });

  /*
    Render recursivo.
  */
  function renderNodo(
    permiso,
    nivel = 0
  ) {
    const hijos =
      mapaHijos.get(
        permiso.codigo
      ) || [];

    const tieneHijos =
      hijos.length > 0;

    const checked =
      esAdmin ||
      Number(
        permiso.permitido || 0
      ) === 1;

    const claseNivel =
      nivel === 0
        ? "permiso-nivel-0"
        : nivel === 1
          ? "permiso-nivel-1"
          : "permiso-nivel-2";

    return `
      <div
        class="permiso-nodo ${claseNivel}"
        data-permiso-nodo="${permiso.codigo}"
      >

        <div
          class="permiso-modulo-cabecera permiso-cabecera-nivel"
        >

          <label
            class="permiso-check-principal"
          >
            <input
              type="checkbox"
              class="${
                tieneHijos
                  ? "chk-permiso-padre"
                  : "chk-permiso-hijo"
              }"
              data-codigo="${permiso.codigo}"
              data-padre="${
                permiso.permiso_padre || ""
              }"
              ${
                checked
                  ? "checked"
                  : ""
              }
              ${
                esAdmin
                  ? "disabled"
                  : ""
              }
            >

            <span>
              ${permiso.nombre}
            </span>
          </label>

          ${
            tieneHijos
              ? `
                <button
                  type="button"
                  class="btn-expandir-permiso"
                  data-codigo="${permiso.codigo}"
                  title="Mostrar u ocultar permisos"
                >
                  <i class="fa-solid fa-chevron-down"></i>
                </button>
              `
              : ""
          }

        </div>

        ${
          tieneHijos
            ? `
              <div
                class="permiso-hijos permiso-submodulos-oculto"
                data-submodulos="${permiso.codigo}"
              >
                ${
                  hijos
                    .map(
                      hijo =>
                        renderNodo(
                          hijo,
                          nivel + 1
                        )
                    )
                    .join("")
                }
              </div>
            `
            : ""
        }

      </div>
    `;
  }

  const raices =
    mapaHijos.get(null) || [];

  contenedor.innerHTML =
    raices
      .map(
        permiso =>
          renderNodo(
            permiso,
            0
          )
      )
      .join("");

  configurarEventosPermisosRolRecursivos();

  configurarDesplegablesPermisosRol();
}

function configurarEventosPermisosRolRecursivos() {
  const contenedor =
    document.getElementById(
      "contenedorPermisosRol"
    );

  if (!contenedor) return;

  /*
    PADRE:
    al marcarlo/desmarcarlo,
    cambia todos sus descendientes.
  */
  contenedor
    .querySelectorAll(
      ".chk-permiso-padre"
    )
    .forEach(checkPadre => {

      checkPadre.addEventListener(
        "change",
        () => {

          const codigo =
            checkPadre.dataset.codigo;

          const nodo =
            contenedor.querySelector(
              `[data-permiso-nodo="${codigo}"]`
            );

          if (!nodo) return;

          const descendientes =
            nodo.querySelectorAll(
              "input[type='checkbox']"
            );

          descendientes.forEach(
            check => {
              check.checked =
                checkPadre.checked;

              check.indeterminate =
                false;
            }
          );

          /*
            Si este padre tiene otro padre,
            actualizamos hacia arriba.
          */
          const codigoPadre =
            checkPadre.dataset.padre;

          if (codigoPadre) {
            actualizarEstadoPadreRecursivo(
              codigoPadre
            );
          }
        }
      );
    });

  /*
    HIJOS SIN DESCENDIENTES.
  */
  contenedor
    .querySelectorAll(
      ".chk-permiso-hijo"
    )
    .forEach(checkHijo => {

      checkHijo.addEventListener(
        "change",
        () => {

          const codigoPadre =
            checkHijo.dataset.padre;

          if (codigoPadre) {
            actualizarEstadoPadreRecursivo(
              codigoPadre
            );
          }
        }
      );
    });

  /*
    Inicializar estados parciales
    desde abajo hacia arriba.
  */
  const padres =
    Array.from(
      contenedor.querySelectorAll(
        ".chk-permiso-padre"
      )
    );

  padres
    .reverse()
    .forEach(check => {
      actualizarEstadoPadreRecursivo(
        check.dataset.codigo
      );
    });
}

function configurarDesplegablesPermisosRol() {
  document
    .querySelectorAll(
      "#contenedorPermisosRol .btn-expandir-permiso"
    )
    .forEach(boton => {
      boton.addEventListener(
        "click",
        () => {
          const codigo =
            boton.dataset.codigo;

          const submodulos =
            document.querySelector(
              `#contenedorPermisosRol [data-submodulos="${codigo}"]`
            );

          if (!submodulos) {
            return;
          }

          const estaOculto =
            submodulos.classList.contains(
              "permiso-submodulos-oculto"
            );

          if (estaOculto) {
            submodulos.classList.remove(
              "permiso-submodulos-oculto"
            );

            boton.classList.add(
              "abierto"
            );

          } else {
            submodulos.classList.add(
              "permiso-submodulos-oculto"
            );

            boton.classList.remove(
              "abierto"
            );
          }
        }
      );
    });
}

function actualizarEstadoPadreRecursivo(
  codigoPadre
) {
  const contenedor =
    document.getElementById(
      "contenedorPermisosRol"
    );

  if (!contenedor) return;

  const nodoPadre =
    contenedor.querySelector(
      `[data-permiso-nodo="${codigoPadre}"]`
    );

  if (!nodoPadre) return;

  const checkPadre =
    nodoPadre.querySelector(
      `:scope > .permiso-modulo-cabecera input[data-codigo="${codigoPadre}"]`
    );

  if (!checkPadre) return;

  const contenedorHijos =
    nodoPadre.querySelector(
      `:scope > .permiso-hijos`
    );

  if (!contenedorHijos) {
    checkPadre.indeterminate =
      false;
    return;
  }

  /*
    Solo tomamos hijos directos.
  */
  const hijosDirectos =
    Array.from(
      contenedorHijos.children
    )
      .map(nodo =>
        nodo.querySelector(
          ":scope > .permiso-modulo-cabecera input[type='checkbox']"
        )
      )
      .filter(Boolean);

  if (!hijosDirectos.length) {
    checkPadre.indeterminate =
      false;
    return;
  }

  const todosMarcados =
    hijosDirectos.every(
      h => h.checked
    );

  const ningunoMarcado =
    hijosDirectos.every(
      h =>
        !h.checked &&
        !h.indeterminate
    );

  if (todosMarcados) {
    checkPadre.checked =
      true;

    checkPadre.indeterminate =
      false;

  } else if (ningunoMarcado) {
    checkPadre.checked =
      false;

    checkPadre.indeterminate =
      false;

  } else {
    /*
      Parcial:
      se mantiene checked para que
      el permiso padre también se guarde.
    */
    checkPadre.checked =
      true;

    checkPadre.indeterminate =
      true;
  }

  /*
    Seguir subiendo.
  */
  const codigoAbuelo =
    checkPadre.dataset.padre;

  if (codigoAbuelo) {
    actualizarEstadoPadreRecursivo(
      codigoAbuelo
    );
  }
}

function configurarEventosPermisosRol() {
  document
    .querySelectorAll(
      "#contenedorPermisosRol .chk-permiso-padre"
    )
    .forEach(padre => {
      padre.addEventListener(
        "change",
        () => {
          const codigoPadre =
            padre.dataset.codigo;

          document
            .querySelectorAll(
              `#contenedorPermisosRol .chk-permiso-hijo[data-padre="${codigoPadre}"]`
            )
            .forEach(hijo => {
              hijo.checked =
                padre.checked;
            });

          actualizarEstadoPadrePermisosRol(
            codigoPadre
          );
        }
      );
    });

  document
    .querySelectorAll(
      "#contenedorPermisosRol .chk-permiso-hijo"
    )
    .forEach(hijo => {
      hijo.addEventListener(
        "change",
        () => {
          actualizarEstadoPadrePermisosRol(
            hijo.dataset.padre
          );
        }
      );
    });

  /*
    Al terminar de renderizar,
    calculamos estados parciales.
  */
  document
    .querySelectorAll(
      "#contenedorPermisosRol .chk-permiso-padre"
    )
    .forEach(padre => {
      actualizarEstadoPadrePermisosRol(
        padre.dataset.codigo
      );
    });
}

function actualizarEstadoPadrePermisosRol(
  codigoPadre
) {
  const padre =
    document.querySelector(
      `#contenedorPermisosRol .chk-permiso-padre[data-codigo="${codigoPadre}"]`
    );

  if (!padre) return;

  const hijos = Array.from(
    document.querySelectorAll(
      `#contenedorPermisosRol .chk-permiso-hijo[data-padre="${codigoPadre}"]`
    )
  );

  if (!hijos.length) {
    padre.indeterminate = false;
    return;
  }

  const seleccionados =
    hijos.filter(
      hijo => hijo.checked
    ).length;

  if (
    seleccionados === hijos.length
  ) {
    padre.checked = true;
    padre.indeterminate = false;

  } else if (
    seleccionados === 0
  ) {
    padre.checked = false;
    padre.indeterminate = false;

  } else {
    /*
      Hay algunos hijos marcados y otros no.

      El padre queda visualmente parcial,
      pero sigue marcado internamente para
      conservar el permiso *.ver.
    */
    padre.checked = true;
    padre.indeterminate = true;
  }
}

async function guardarPermisosRol() {
  const rol =
    String(
      rolPermisosActual || ""
    )
      .trim()
      .toUpperCase();

  if (!rol) {
    alert(
      "Seleccione un rol."
    );
    return;
  }

  if (rol === "ADMIN") {
    alert(
      "El rol ADMIN mantiene acceso total."
    );
    return;
  }

  const permisos =
    Array.from(
      document.querySelectorAll(
        "#contenedorPermisosRol input[type='checkbox']"
      )
    )
      .filter(
        check =>
          check.checked
      )
      .map(
        check =>
          check.dataset.codigo
      )
      .filter(Boolean);

  const boton =
    document.getElementById(
      "btnGuardarPermisosRol"
    );

  const textoOriginal =
    boton?.innerHTML || "";

  try {

    if (boton) {
      boton.disabled =
        true;

      boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const res =
      await fetch(
        `/api/permisos/rol/${encodeURIComponent(
          rol
        )}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            permisos
          })
        }
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudieron guardar los permisos."
      );
    }

    alert(
      data.mensaje ||
      "Permisos del rol guardados correctamente."
    );

    await cargarPermisosRol(
      rol
    );

  } catch (error) {

    console.error(
      "ERROR GUARDANDO PERMISOS DEL ROL:",
      error
    );

    alert(
      error.message ||
      "No se pudieron guardar los permisos."
    );

  } finally {

    if (boton) {
      boton.disabled =
        rol === "ADMIN";

      boton.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar permisos del rol
        `;
    }
  }
}

async function cargarPermisosUsuario(
  usuarioId
) {
  const contenedor =
    document.getElementById(
      "contenedorPermisosUsuario"
    );

  const info =
    document.getElementById(
      "infoUsuarioPermisos"
    );

  const botonGuardar =
    document.getElementById(
      "btnGuardarPermisosUsuario"
    );

  if (!contenedor) return;

  try {
    const res =
      await fetch(
        `/api/permisos/usuario/${encodeURIComponent(
          usuarioId
        )}`
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudieron cargar los permisos del usuario"
      );
    }

    usuarioPermisosActual =
      data.usuario || null;

    if (info) {
      info.style.display =
        "block";

      info.innerHTML = `
        <strong>
          ${data.usuario?.username || ""}
        </strong>

        &nbsp; | &nbsp;

        Rol base:
        <strong>
          ${data.usuario?.rol || ""}
        </strong>

        &nbsp; | &nbsp;

        Estado:
        <strong>
          ${data.usuario?.estado || ""}
        </strong>
      `;
    }

    renderArbolPermisosUsuario(
      data.permisos || []
    );

    if (botonGuardar) {
      /*
        Para ADMIN no permitimos excepciones.
      */
      botonGuardar.disabled =
        String(
          data.usuario?.rol || ""
        )
          .trim()
          .toUpperCase() ===
        "ADMIN";
    }

  } catch (error) {
    console.error(
      "ERROR CARGANDO PERMISOS DE USUARIO:",
      error
    );

    contenedor.innerHTML = `
      <div class="empty-row">
        Error al cargar los permisos del usuario.
      </div>
    `;

    if (botonGuardar) {
      botonGuardar.disabled = true;
    }
  }
}



/* =========================================================
   RENDER RECURSIVO DE UN PERMISO DE USUARIO
   ========================================================= */

function crearNodoPermisoUsuario(
  permiso,
  permisos,
  nivel = 0
) {

  const hijos =
    permisos
      .filter(
        hijo =>
          String(
            hijo.permiso_padre || ""
          ).trim() ===
          String(
            permiso.codigo || ""
          ).trim()
      )
      .sort(
        (a, b) =>
          Number(a.orden || 0) -
          Number(b.orden || 0)
      );


  const tieneHijos =
    hijos.length > 0;


  /*
    Cada nivel recibe una clase distinta.

    nivel 0 = módulo principal
    nivel 1 = submódulo
    nivel 2 = acción específica
    etc.
  */
  const claseNivel =
    `permiso-nivel-${nivel}`;


  return `

    <div
      class="
        permiso-nodo-usuario
        ${claseNivel}
        ${
          nivel === 0
            ? "permiso-modulo"
            : "permiso-item permiso-item-usuario"
        }
      "
      data-permiso-nodo="${permiso.codigo}"
      data-nivel="${nivel}"
    >

      <div
        class="${
          nivel === 0
            ? "permiso-modulo-cabecera"
            : "permiso-item-cabecera-usuario"
        }"
      >

        <div class="permiso-usuario-titulo">

          <span
            class="permiso-nombre-usuario"
          >
            ${
              nivel === 0
                ? `<strong>${permiso.nombre}</strong>`
                : permiso.nombre
            }
          </span>

          ${crearControlPermisoUsuario(
            permiso
          )}

        </div>


        ${
          tieneHijos
            ? `
              <button
                type="button"
                class="
                  btn-expandir-permiso
                  btn-expandir-permiso-usuario
                "
                data-codigo="${permiso.codigo}"
                title="Mostrar permisos internos"
              >
                <i
                  class="fa-solid fa-chevron-down"
                ></i>
              </button>
            `
            : ""
        }

      </div>


      ${
        tieneHijos
          ? `
            <div
              class="
                permiso-submodulos
                permiso-submodulos-oculto
                permiso-submodulos-nivel-${nivel + 1}
              "
              data-submodulos-usuario="${permiso.codigo}"
            >

              ${
                hijos
                  .map(
                    hijo =>
                      crearNodoPermisoUsuario(
                        hijo,
                        permisos,
                        nivel + 1
                      )
                  )
                  .join("")
              }

            </div>
          `
          : ""
      }

    </div>
  `;

}


/* =========================================================
   ÁRBOL COMPLETO DE PERMISOS DEL USUARIO
   ========================================================= */

function renderArbolPermisosUsuario(
  permisos
) {

  const contenedor =
    document.getElementById(
      "contenedorPermisosUsuario"
    );


  if (!contenedor) {
    return;
  }


  if (
    !Array.isArray(permisos) ||
    !permisos.length
  ) {

    contenedor.innerHTML = `
      <div class="permiso-sin-hijos">
        No existen permisos configurados.
      </div>
    `;

    return;
  }


  /* =========================================
     BUSCAR PERMISOS RAÍZ
     ========================================= */

  const padres =
    permisos
      .filter(
        permiso =>
          !String(
            permiso.permiso_padre || ""
          ).trim()
      )
      .sort(
        (a, b) =>
          Number(a.orden || 0) -
          Number(b.orden || 0)
      );


  /* =========================================
     GENERAR ÁRBOL RECURSIVO
     ========================================= */

  contenedor.innerHTML =
    padres
      .map(
        padre =>
          crearNodoPermisoUsuario(
            padre,
            permisos,
            0
          )
      )
      .join("");


  /* =========================================
     ACTIVAR BOTONES DE EXPANSIÓN
     ========================================= */

  configurarDesplegablesPermisosUsuario();

}

function crearControlPermisoUsuario(
  permiso
) {
  const codigo =
    permiso.codigo;

  const permisoUsuario =
    permiso.permiso_usuario;

  let valorActual =
    "HEREDAR";

  if (
    permisoUsuario === true ||
    permisoUsuario === 1 ||
    permisoUsuario === "1"
  ) {
    valorActual =
      "PERMITIR";
  }

  if (
    permisoUsuario === false ||
    permisoUsuario === 0 ||
    permisoUsuario === "0"
  ) {
    valorActual =
      "DENEGAR";
  }

  const heredado =
    Number(
      permiso.permiso_rol || 0
    ) === 1;

  return `
    <div
      class="permiso-usuario-control"
      data-permiso-usuario="${codigo}"
    >

      <select
        class="select-permiso-usuario"
        data-codigo="${codigo}"
      >
        <option
          value="HEREDAR"
          ${
            valorActual === "HEREDAR"
              ? "selected"
              : ""
          }
        >
          Heredar
        </option>

        <option
          value="PERMITIR"
          ${
            valorActual === "PERMITIR"
              ? "selected"
              : ""
          }
        >
          Permitir
        </option>

        <option
          value="DENEGAR"
          ${
            valorActual === "DENEGAR"
              ? "selected"
              : ""
          }
        >
          Denegar
        </option>
      </select>

      <span
        class="permiso-heredado ${
          heredado
            ? "permitido"
            : "denegado"
        }"
      >
        Rol:
        ${
          heredado
            ? "Permitido"
            : "Denegado"
        }
      </span>

    </div>
  `;
}

function configurarDesplegablesPermisosUsuario() {

  document
    .querySelectorAll(
      "#contenedorPermisosUsuario .btn-expandir-permiso-usuario"
    )
    .forEach(
      boton => {

        boton.addEventListener(
          "click",
          event => {

            event.preventDefault();
            event.stopPropagation();


            const codigo =
              boton.dataset.codigo;


            if (!codigo) {
              return;
            }


            const bloque =
              document.querySelector(
                `#contenedorPermisosUsuario [data-submodulos-usuario="${codigo}"]`
              );


            if (!bloque) {
              return;
            }


            const estabaOculto =
              bloque.classList.contains(
                "permiso-submodulos-oculto"
              );


            bloque.classList.toggle(
              "permiso-submodulos-oculto",
              !estabaOculto
            );


            boton.classList.toggle(
              "abierto",
              estabaOculto
            );


            const icono =
              boton.querySelector(
                "i"
              );


            if (icono) {

              icono.classList.toggle(
                "fa-chevron-down",
                !estabaOculto
              );


              icono.classList.toggle(
                "fa-chevron-up",
                estabaOculto
              );

            }

          }
        );

      }
    );

}

async function guardarPermisosUsuario() {
  const usuarioId =
    Number(
      usuarioPermisosActual?.id || 0
    );

  if (!usuarioId) {
    alert(
      "Seleccione un usuario."
    );

    return;
  }

  const rol =
    String(
      usuarioPermisosActual?.rol || ""
    )
      .trim()
      .toUpperCase();

  if (rol === "ADMIN") {
    alert(
      "Los usuarios ADMIN mantienen acceso total."
    );

    return;
  }

  /*
    Solo enviamos PERMITIR y DENEGAR.

    HEREDAR no se envía porque significa
    que no debe existir excepción.
  */
  const permisos = Array.from(
    document.querySelectorAll(
      "#contenedorPermisosUsuario .select-permiso-usuario"
    )
  )
    .map(select => {
      const codigo =
        select.dataset.codigo;

      const valor =
        select.value;

      if (
        valor === "HEREDAR"
      ) {
        return null;
      }

      return {
        codigo,

        valor:
          valor === "PERMITIR"
            ? 1
            : 0
      };
    })
    .filter(Boolean);

  const boton =
    document.getElementById(
      "btnGuardarPermisosUsuario"
    );

  const textoOriginal =
    boton?.innerHTML || "";

  try {
    if (boton) {
      boton.disabled = true;

      boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const res =
      await fetch(
        `/api/permisos/usuario/${encodeURIComponent(
          usuarioId
        )}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            permisos
          })
        }
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudieron guardar los permisos del usuario."
      );
    }

    alert(
      data.mensaje ||
      "Permisos individuales guardados correctamente."
    );

    await cargarPermisosUsuario(
      usuarioId
    );

  } catch (error) {
    console.error(
      "ERROR GUARDANDO PERMISOS DE USUARIO:",
      error
    );

    alert(
      error.message ||
      "No se pudieron guardar los permisos."
    );

  } finally {
    if (boton) {
      boton.disabled =
        rol === "ADMIN";

      boton.innerHTML =
        textoOriginal ||
        `
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar permisos del usuario
        `;
    }
  }
}

const MAPA_PERMISOS_SECCIONES = {
  "dashboard":
    "dashboard.ver",

  /* PACIENTES */
  "pacientes-admision":
    "pacientes.admision",

  "pacientes-lista":
    "pacientes.lista",

  "pacientes-no-atendidos":
    "pacientes.no_atendidos",

  /* INVENTARIO */
  "inventario-productos":
    "inventario.registrar_producto",

  "inventario-entrada":
    "inventario.entrada",

  "inventario-salida":
    "inventario.salida",

  "inventario-stock":
    "inventario.stock",

  "inventario-traslados":
    "inventario.traslados",

  "inventario-kardex":
    "inventario.kardex",

  /* COMPRAS */
  "compras-ingresar":
    "compras.ingresar",

  "compras-consultar":
    "compras.consultar",

  "compras-proveedores-registrar":
    "compras.proveedores_registrar",

  "compras-proveedores-consultar":
    "compras.proveedores_consultar",

  /* REPORTES */
  "reportes-pacientes":
    "reportes.pacientes",

  "reportes-inventario":
    "reportes.inventario",

  "reportes-quirofano":
    "reportes.quirofano",

  /* HISTORIAS CLÍNICAS */
  "historias-clinicas":
    "hclinicas.historias",

  "hc-documentos-generados":
    "hclinicas.documentos",

  /* DESCARGOS */
  "descargos-registrar":
    "descargos.registrar",

  "descargos-consultar":
    "descargos.consultar",

  "descargos-consolidados":
    "descargos.consolidados",

  "descargos-consignacion":
    "descargos.consignacion",

  "descargos-consignacion-enviados":
    "descargos.consignacion_enviados",

  /* CAMPAÑAS */
  "campanas-reclutadores":
    "campanas.reclutadores",

  /* USUARIOS */
  "usuarios-registrar":
    "usuarios.registrar",

  "usuarios-lista":
    "usuarios.lista",

  /* CONFIGURACIONES */
  "config-archivo":
    "configuraciones.archivo",

  "config-permisos":
    "configuraciones.permisos",

  "config-desplegables":
    "configuraciones.desplegables",

  "config-diagnosticos-cie":
    "configuraciones.diagnosticos_cie",

  "config-procedimientos-medicos":
    "configuraciones.procedimientos",

  "config-profesionales-salud":
    "configuraciones.profesionales",

  "config-historias-clinicas":
    "configuraciones.hclinicas",

  "config-bodegas":
    "configuraciones.bodegas",

  "config-categorias-producto":
    "configuraciones.categorias_producto",

  "config-casas":
    "configuraciones.casas",

    "config-lapso-expiracion":
  "configuraciones.lapso_expiracion",

  /* UTILIDADES */
  "utilidades-importar":
  "utilidades.importar",

  "utilidades-control-expiracion":
    "utilidades.control_expiracion",

  "utilidades-cuarentena":
    "utilidades.cuarentena_ver"
};

const MAPA_PERMISOS_MENUS = {
  "Pacientes": {
    permiso:
      "pacientes.ver",

    hijos: [
      "pacientes.admision",
      "pacientes.lista",
      "pacientes.no_atendidos"
    ]
  },

  "Inventario": {
    permiso:
      "inventario.ver",

    hijos: [
      "inventario.registrar_producto",
      "inventario.entrada",
      "inventario.salida",
      "inventario.stock",
      "inventario.traslados",
      "inventario.kardex"
    ]
  },

  "Compras": {
    permiso:
      "compras.ver",

    hijos: [
      "compras.ingresar",
      "compras.consultar",
      "compras.proveedores_registrar",
      "compras.proveedores_consultar"
    ]
  },

  "Reportes": {
    permiso:
      "reportes.ver",

    hijos: [
      "reportes.pacientes",
      "reportes.inventario",
      "reportes.quirofano"
    ]
  },

  "H. Clínicas": {
    permiso:
      "hclinicas.ver",

    hijos: [
      "hclinicas.historias",
      "hclinicas.documentos"
    ]
  },

  "Descargos": {
    permiso:
      "descargos.ver",

    hijos: [
      "descargos.registrar",
      "descargos.consultar",
      "descargos.consolidados",
      "descargos.consignacion",
      "descargos.consignacion_enviados"
    ]
  },

  "Campañas": {
    permiso:
      "campanas.ver",

    hijos: [
      "campanas.reclutadores"
    ]
  },

  "Usuarios": {
    permiso:
      "usuarios.ver",

    hijos: [
      "usuarios.registrar",
      "usuarios.lista"
    ]
  },

  "Configuraciones": {
    permiso:
      "configuraciones.ver",

    hijos: [
      "configuraciones.archivo",
      "configuraciones.permisos",
      "configuraciones.desplegables",
      "configuraciones.diagnosticos_cie",
      "configuraciones.procedimientos",
      "configuraciones.profesionales",
      "configuraciones.hclinicas",
      "configuraciones.bodegas",
      "configuraciones.categorias_producto",
      "configuraciones.casas",
      "configuraciones.lapso_expiracion"
    ]
  },

   "Utilidades": {
  permiso:
    "utilidades.ver",

  hijos: [
    "utilidades.importar",
    "utilidades.control_expiracion",
    "utilidades.cuarentena_ver"
  ]
 }
};

async function aplicarPermisosMenuUsuario() {
  try {
    const res =
      await fetch(
        "/api/permisos/mis-permisos"
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudieron cargar los permisos."
      );
    }

    const listaPermisos =
      Array.isArray(data)
        ? data
        : (
            data.permisos ||
            []
          );

    const permisos =
      new Set(
        listaPermisos
          .map(p => {
            if (
              typeof p === "string"
            ) {
              return p;
            }

            return p?.codigo;
          })
          .filter(Boolean)
      );

    permisosUsuarioActual =
      permisos;

    aplicarPermisosSecciones(
      permisos
    );

    aplicarPermisosMenusPrincipales(
      permisos
    );

    return permisos;

  } catch (error) {
    console.error(
      "ERROR APLICANDO PERMISOS DEL MENÚ:",
      error
    );

    permisosUsuarioActual =
      new Set();

    return permisosUsuarioActual;
  }
}





function aplicarPermisosSecciones(
  permisos
) {
  Object.entries(
    MAPA_PERMISOS_SECCIONES
  ).forEach(
    ([seccion, permiso]) => {

      const elemento =
        document.querySelector(
          `[data-section="${seccion}"]`
        );

      if (!elemento) {
        return;
      }

      const permitido =
        permisos.has(
          permiso
        );

      elemento.classList.toggle(
        "menu-sin-permiso",
        !permitido
      );
    }
  );
}


function aplicarPermisosMenusPrincipales(
  permisos
) {
  Object.entries(
    MAPA_PERMISOS_MENUS
  ).forEach(
    ([nombreMenu, config]) => {

      const elemento =
        document.querySelector(
          `[data-menu="${nombreMenu}"]`
        );

      if (!elemento) {
        return;
      }

      const padrePermitido =
        permisos.has(
          config.permiso
        );

      const algunHijoPermitido =
        config.hijos.some(
          codigo =>
            permisos.has(
              codigo
            )
        );

      const mostrar =
        padrePermitido ||
        algunHijoPermitido;

      elemento.classList.toggle(
        "menu-sin-permiso",
        !mostrar
      );
    }
  );
}

async function cargarConfiguracionExpiracion() {
  try {

    const res =
      await fetch(
        "/api/config/expiracion"
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudo cargar la configuración."
      );
    }

    const inputMeses =
      document.getElementById(
        "configExpMeses"
      );

    const inputCritico =
      document.getElementById(
        "configExpDiasCritico"
      );

    if (inputMeses) {
      inputMeses.value =
        Number(
          data.meses_aviso || 3
        );
    }

    if (inputCritico) {
      inputCritico.value =
        Number(
          data.dias_critico || 30
        );
    }

  } catch (error) {

    console.error(
      "ERROR CARGANDO CONFIG EXPIRACION:",
      error
    );

    alert(
      error.message ||
      "No se pudo cargar la configuración."
    );

  }
}

async function guardarConfiguracionExpiracion() {
  const mesesAviso =
    Number(
      document.getElementById(
        "configExpMeses"
      )?.value
    );

  const diasCritico =
    Number(
      document.getElementById(
        "configExpDiasCritico"
      )?.value
    );

  if (
    !Number.isInteger(mesesAviso) ||
    mesesAviso < 1 ||
    mesesAviso > 24
  ) {
    alert(
      "Ingrese un lapso entre 1 y 24 meses."
    );
    return;
  }

  if (
    !Number.isInteger(diasCritico) ||
    diasCritico < 1 ||
    diasCritico > 365
  ) {
    alert(
      "Ingrese un nivel crítico entre 1 y 365 días."
    );
    return;
  }

  const boton =
    document.getElementById(
      "btnGuardarConfigExpiracion"
    );

  const textoOriginal =
    boton?.innerHTML || "";

  try {

    if (boton) {
      boton.disabled = true;

      boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Guardando...
      `;
    }

    const res =
      await fetch(
        "/api/config/expiracion",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            meses_aviso:
              mesesAviso,

            dias_critico:
              diasCritico
          })
        }
      );

    const data =
      await res
        .json()
        .catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error ||
        "No se pudo guardar la configuración."
      );
    }

    alert(
      "Configuración guardada correctamente."
    );

    await cargarConfiguracionExpiracion();

  } catch (error) {

    console.error(
      "ERROR GUARDANDO CONFIG EXPIRACION:",
      error
    );

    alert(
      error.message ||
      "No se pudo guardar la configuración."
    );

  } finally {

    if (boton) {
      boton.disabled = false;

      boton.innerHTML =
        textoOriginal;
    }

  }
}

async function cargarControlExpiracion() {

  try {

    const params =
      new URLSearchParams();


    params.set(
      "pagina",
      paginaControlExpiracion
    );

    params.set(
      "limite",
      "10"
    );


    const codigo =
      document.getElementById(
        "expFiltroCodigo"
      )?.value.trim() || "";


    const producto =
      document.getElementById(
        "expFiltroProducto"
      )?.value.trim() || "";


    const bodega =
      document.getElementById(
        "expFiltroBodega"
      )?.value.trim() || "";


    const lote =
      document.getElementById(
        "expFiltroLote"
      )?.value.trim() || "";


    const codigoProveedor =
      document.getElementById(
        "expFiltroCodigoProveedor"
      )?.value.trim() || "";


    const casaComercial =
      document.getElementById(
        "expFiltroCasaComercial"
      )?.value.trim() || "";


    const estado =
      document.getElementById(
        "expFiltroEstado"
      )?.value || "";


    const fechaDesde =
      document.getElementById(
        "expFiltroFechaDesde"
      )?.value || "";


    const fechaHasta =
      document.getElementById(
        "expFiltroFechaHasta"
      )?.value || "";


    const orden =
      document.getElementById(
        "expOrden"
      )?.value ||
      "vencimiento_asc";


    if (codigo) {
      params.set(
        "codigo",
        codigo
      );
    }

    if (producto) {
      params.set(
        "producto",
        producto
      );
    }

    if (bodega) {
      params.set(
        "bodega",
        bodega
      );
    }

    if (lote) {
      params.set(
        "lote",
        lote
      );
    }

    if (codigoProveedor) {
      params.set(
        "codigoProveedor",
        codigoProveedor
      );
    }

    if (casaComercial) {
      params.set(
        "casaComercial",
        casaComercial
      );
    }

    if (estado) {
      params.set(
        "estado",
        estado
      );
    }

    if (fechaDesde) {
      params.set(
        "fechaDesde",
        fechaDesde
      );
    }

    if (fechaHasta) {
      params.set(
        "fechaHasta",
        fechaHasta
      );
    }

    params.set(
      "orden",
      orden
    );


    const res =
      await fetch(
        `/api/control-expiracion?${params.toString()}`
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo cargar el control de expiración."
      );

    }


    itemsControlExpiracion =
      data.items || [];


    paginaControlExpiracion =
      Number(
        data.paginacion?.pagina ||
        1
      );


    totalPaginasControlExpiracion =
      Number(
        data.paginacion?.total_paginas ||
        1
      );


    renderResumenControlExpiracion(
      data.resumen || {}
    );


    renderTablaControlExpiracion(
      itemsControlExpiracion
    );


    actualizarPaginacionControlExpiracion(
      data.paginacion || {}
    );


  } catch (error) {

    console.error(
      "ERROR CONTROL EXPIRACION:",
      error
    );


    const tbody =
      document.getElementById(
        "tablaControlExpiracionBody"
      );


    if (tbody) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="12"
            class="empty-row"
          >
            ${error.message}
          </td>
        </tr>
      `;

    }

  }

}

function renderResumenControlExpiracion(
  resumen
) {

  const vencidos =
    document.getElementById(
      "expResumenVencidos"
    );

  const criticos =
    document.getElementById(
      "expResumenCriticos"
    );

  const proximos =
    document.getElementById(
      "expResumenProximos"
    );

  const vigentes =
    document.getElementById(
      "expResumenVigentes"
    );


  if (vencidos) {
    vencidos.textContent =
      Number(
        resumen.vencidos || 0
      );
  }


  if (criticos) {
    criticos.textContent =
      Number(
        resumen.criticos || 0
      );
  }


  if (proximos) {
    proximos.textContent =
      Number(
        resumen.proximos || 0
      );
  }


  if (vigentes) {
    vigentes.textContent =
      Number(
        resumen.vigentes || 0
      );
  }

}

function renderTablaControlExpiracion(
  items
) {

  const tbody =
    document.getElementById(
      "tablaControlExpiracionBody"
    );


  if (!tbody) return;


  if (
    !Array.isArray(items) ||
    !items.length
  ) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="12"
          class="empty-row"
        >
          No hay productos para mostrar.
        </td>
      </tr>
    `;

    return;
  }


  const puedeMover =
    permisosUsuarioActual.has(
      "utilidades.cuarentena_mover"
    );


  tbody.innerHTML =
    items
      .map(
        item => {

          let claseEstado =
            "exp-estado-vigente";


          if (
            item.estado_expiracion ===
            "VENCIDO"
          ) {

            claseEstado =
              "exp-estado-vencido";

          } else if (
            item.estado_expiracion ===
            "CRITICO"
          ) {

            claseEstado =
              "exp-estado-critico";

          } else if (
            item.estado_expiracion ===
            "PROXIMO"
          ) {

            claseEstado =
              "exp-estado-proximo";

          }


          let textoDias = "";


          if (
            Number(
              item.dias_restantes
            ) < 0
          ) {

            textoDias =
              `Vencido hace ${Math.abs(
                Number(
                  item.dias_restantes
                )
              )} días`;

          } else if (
            Number(
              item.dias_restantes
            ) === 0
          ) {

            textoDias =
              "Vence hoy";

          } else {

            textoDias =
              `${item.dias_restantes} días`;

          }


          return `
            <tr>

              <td>
                ${item.codigo || ""}
              </td>

              <td>
                ${item.codigo_proveedor || ""}
              </td>

              <td>
                ${item.producto || ""}
              </td>

              <td>
                ${item.lote || ""}
              </td>

              <td>
                ${item.vencimiento || ""}
              </td>

              <td>
                ${textoDias}
              </td>

              <td>
                <span
                  class="exp-estado ${claseEstado}"
                >
                  ${item.estado_expiracion || ""}
                </span>
              </td>

              <td>
                ${item.casa_comercial || ""}
              </td>

              <td>
                ${Number(
                  item.cantidad || 0
                )}
              </td>

              <td>
                ${item.bodega || ""}
              </td>

              <td>
                ${item.ubicacion || ""}
              </td>

              <td>

                ${
                  puedeMover
                    ? `
                      <button
                        type="button"
                        class="btn-danger-small"
                        onclick="abrirModalMoverCuarentena(
                          ${Number(
                            item.inventario_id
                          )},
                          ${Number(
                            item.detalle_entrada_id
                          )}
                        )"
                      >
                        Cuarentena
                      </button>
                    `
                    : `
                      <span class="text-muted">
                        Sin permiso
                      </span>
                    `
                }

              </td>

            </tr>
          `;

        }
      )
      .join("");

}

function buscarControlExpiracion() {

  paginaControlExpiracion = 1;

  cargarControlExpiracion();

}

function limpiarFiltrosControlExpiracion() {

  const ids = [
    "expFiltroCodigo",
    "expFiltroProducto",
    "expFiltroBodega",
    "expFiltroLote",
    "expFiltroCodigoProveedor",
    "expFiltroCasaComercial",
    "expFiltroEstado",
    "expFiltroFechaDesde",
    "expFiltroFechaHasta"
  ];


  ids.forEach(id => {

    const elemento =
      document.getElementById(id);

    if (elemento) {
      elemento.value = "";
    }

  });


  const orden =
    document.getElementById(
      "expOrden"
    );


  if (orden) {

    orden.value =
      "vencimiento_asc";

  }


  paginaControlExpiracion = 1;


  cargarControlExpiracion();

}

function cambiarPaginaControlExpiracion(
  direccion
) {

  const nuevaPagina =
    paginaControlExpiracion +
    Number(
      direccion || 0
    );


  if (
    nuevaPagina < 1 ||
    nuevaPagina >
      totalPaginasControlExpiracion
  ) {

    return;

  }


  paginaControlExpiracion =
    nuevaPagina;


  cargarControlExpiracion();

}

function actualizarPaginacionControlExpiracion(
  paginacion
) {

  const pagina =
    Number(
      paginacion.pagina || 1
    );

  const totalPaginas =
    Number(
      paginacion.total_paginas || 1
    );

  const totalRegistros =
    Number(
      paginacion.total_registros || 0
    );


  const texto =
    document.getElementById(
      "expPaginaTexto"
    );


  const info =
    document.getElementById(
      "expInfoPaginacion"
    );


  const anterior =
    document.getElementById(
      "btnExpAnterior"
    );


  const siguiente =
    document.getElementById(
      "btnExpSiguiente"
    );


  if (texto) {

    texto.textContent =
      `Página ${pagina} de ${totalPaginas}`;

  }


  if (info) {

    info.textContent =
      `${totalRegistros} registro(s)`;

  }


  if (anterior) {

    anterior.disabled =
      pagina <= 1;

  }


  if (siguiente) {

    siguiente.disabled =
      pagina >=
      totalPaginas;

  }

}

function abrirModalMoverCuarentena(
  inventarioId,
  detalleEntradaId
) {

  /* =========================================
     VALIDAR PERMISO
     ========================================= */

  if (
    !permisosUsuarioActual.has(
      "utilidades.cuarentena_mover"
    )
  ) {

    alert(
      "No tiene permiso para mover productos a CUARENTENA."
    );

    return;

  }


  const item =
    itemsControlExpiracion.find(
      x =>
        Number(
          x.inventario_id
        ) ===
        Number(
          inventarioId
        ) &&
        Number(
          x.detalle_entrada_id
        ) ===
        Number(
          detalleEntradaId
        )
    );


  if (!item) {

    alert(
      "No se encontró el producto seleccionado."
    );

    return;

  }


  const modal =
    document.getElementById(
      "modalMoverCuarentena"
    );


  const info =
    document.getElementById(
      "cuarentenaInfoProducto"
    );


  const inv =
    document.getElementById(
      "cuarentenaInventarioId"
    );


  const det =
    document.getElementById(
      "cuarentenaDetalleEntradaId"
    );


  const cantidad =
    document.getElementById(
      "cuarentenaCantidad"
    );


  const motivo =
    document.getElementById(
      "cuarentenaMotivo"
    );


  const observacion =
    document.getElementById(
      "cuarentenaObservacion"
    );


  if (info) {

    info.innerHTML = `
      <div class="cuarentena-producto-info">

        <strong>
          ${item.producto || ""}
        </strong>

        <div>
          Código:
          ${item.codigo || ""}
        </div>

        <div>
          Lote:
          ${item.lote || ""}
        </div>

        <div>
          Vencimiento:
          ${item.vencimiento || ""}
        </div>

        <div>
          Bodega:
          ${item.bodega || ""}
        </div>

        <div>
          Stock disponible:
          ${Number(
            item.cantidad || 0
          )}
        </div>

      </div>
    `;

  }


  if (inv) {
    inv.value =
      inventarioId;
  }


  if (det) {
    det.value =
      detalleEntradaId;
  }


  if (cantidad) {

    cantidad.value =
      Number(
        item.cantidad || 0
      );

    cantidad.max =
      Number(
        item.cantidad || 0
      );

  }


  if (motivo) {
    motivo.value = "";
  }


  if (observacion) {
    observacion.value = "";
  }


  if (modal) {

  /* =====================================================
   SACAR EL MODAL DEL CONTENEDOR DEL PANEL

   Esto evita que algún padre con overflow,
   transform o posición recorte la ventana.
   ===================================================== */

if (modal.parentElement !== document.body) {

  modalCuarentenaPadreOriginal =
    modal.parentElement;


  modalCuarentenaSiguienteOriginal =
    modal.nextSibling;


  document.body.appendChild(
    modal
  );

}


/* =====================================================
   ABRIR COMO VENTANA REAL
   ===================================================== */

modal.style.display =
  "flex";


document.body.style.overflow =
  "hidden";


/* Siempre comenzar arriba */
const cuerpoModal =
  modal.querySelector(
    ".kardex-modal-body"
  );


if (cuerpoModal) {

  cuerpoModal.scrollTop =
    0;

}

  }

}

function cerrarModalMoverCuarentena() {

  const modal =
    document.getElementById(
      "modalMoverCuarentena"
    );


  if (!modal) {
    return;
  }


  /* =========================================
     1. OCULTAR MODAL
     ========================================= */

  modal.style.display =
    "none";


  document.body.style.overflow =
    "";


  /* =========================================
     2. LIMPIAR TODOS LOS DATOS DEL MOVIMIENTO

     Esto es importantísimo para que
     el siguiente lote no herede datos.
     ========================================= */

  const inventarioId =
    modal.querySelector(
      "#cuarentenaInventarioId"
    );


  const detalleEntradaId =
    modal.querySelector(
      "#cuarentenaDetalleEntradaId"
    );


  const cantidad =
    modal.querySelector(
      "#cuarentenaCantidad"
    );


  const motivo =
    modal.querySelector(
      "#cuarentenaMotivo"
    );


  const observacion =
    modal.querySelector(
      "#cuarentenaObservacion"
    );


  const info =
    modal.querySelector(
      "#cuarentenaInfoProducto"
    );


  if (inventarioId) {
    inventarioId.value = "";
  }


  if (detalleEntradaId) {
    detalleEntradaId.value = "";
  }


  if (cantidad) {

    cantidad.value = "";

    cantidad.removeAttribute(
      "max"
    );

  }


  if (motivo) {
    motivo.value = "";
  }


  if (observacion) {
    observacion.value = "";
  }


  if (info) {
    info.innerHTML = "";
  }


  /* =========================================
     3. DEVOLVER EL MODAL A SU SITIO ORIGINAL

     Esto evita que quede un modal viejo
     en document.body cuando el módulo
     se vuelva a renderizar.
     ========================================= */

  if (
    modalCuarentenaPadreOriginal
  ) {

    if (
      modalCuarentenaSiguienteOriginal &&
      modalCuarentenaSiguienteOriginal.parentNode ===
        modalCuarentenaPadreOriginal
    ) {

      modalCuarentenaPadreOriginal.insertBefore(
        modal,
        modalCuarentenaSiguienteOriginal
      );

    } else {

      modalCuarentenaPadreOriginal.appendChild(
        modal
      );

    }

  }


  modalCuarentenaPadreOriginal =
    null;


  modalCuarentenaSiguienteOriginal =
    null;

}

async function confirmarMoverCuarentena() {
    if (
    !permisosUsuarioActual.has(
      "utilidades.cuarentena_mover"
    )
  ) {

    alert(
      "No tiene permiso para mover productos a CUARENTENA."
    );

    return;

  }

  const inventarioId =
    Number(
      document.getElementById(
        "cuarentenaInventarioId"
      )?.value || 0
    );


  const detalleEntradaId =
    Number(
      document.getElementById(
        "cuarentenaDetalleEntradaId"
      )?.value || 0
    );


  const cantidad =
    Number(
      document.getElementById(
        "cuarentenaCantidad"
      )?.value || 0
    );


  const motivo =
    String(
      document.getElementById(
        "cuarentenaMotivo"
      )?.value || ""
    ).trim();


  const observacion =
    String(
      document.getElementById(
        "cuarentenaObservacion"
      )?.value || ""
    ).trim();


  const inputCantidad =
    document.getElementById(
      "cuarentenaCantidad"
    );


  const maximo =
    Number(
      inputCantidad?.max || 0
    );


  if (
    !inventarioId ||
    !detalleEntradaId
  ) {

    alert(
      "Producto o lote no válido."
    );

    return;

  }


  if (
    !cantidad ||
    cantidad <= 0
  ) {

    alert(
      "Ingrese una cantidad válida."
    );

    return;

  }


  if (
    maximo &&
    cantidad > maximo
  ) {

    alert(
      `La cantidad no puede ser mayor a ${maximo}.`
    );

    return;

  }


  if (!motivo) {

    alert(
      "Seleccione el motivo de cuarentena."
    );

    return;

  }


  const confirmar =
    confirm(
      "¿Está seguro de mover este producto a CUARENTENA?"
    );


  if (!confirmar) return;


  const boton =
    document.getElementById(
      "btnConfirmarMoverCuarentena"
    );


  const original =
    boton?.innerHTML || "";


  try {

    if (boton) {

      boton.disabled = true;

      boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Moviendo...
      `;

    }


    const res =
      await fetch(
        "/api/cuarentena/mover",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            inventarioId,

            detalleEntradaId,

            cantidad,

            motivo,

            observacion

          })

        }
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo mover el producto."
      );

    }


    alert(
      data.mensaje ||
      "Producto movido a cuarentena correctamente."
    );


    cerrarModalMoverCuarentena();


    await cargarControlExpiracion();


  } catch (error) {

    console.error(
      "ERROR MOVIENDO A CUARENTENA:",
      error
    );


    alert(
      error.message ||
      "No se pudo mover el producto."
    );


  } finally {

    if (boton) {

      boton.disabled = false;

      boton.innerHTML =
        original;

    }

  }

}

async function exportarControlExpiracionExcel() {

  try {

    if (
      typeof XLSX === "undefined"
    ) {

      alert(
        "La librería XLSX no está cargada."
      );

      return;

    }


    const params =
      new URLSearchParams();


    params.set(
      "pagina",
      "1"
    );

    params.set(
      "limite",
      "5000"
    );


    const pares = [

      [
        "codigo",
        "expFiltroCodigo"
      ],

      [
        "producto",
        "expFiltroProducto"
      ],

      [
        "bodega",
        "expFiltroBodega"
      ],

      [
        "lote",
        "expFiltroLote"
      ],

      [
        "codigoProveedor",
        "expFiltroCodigoProveedor"
      ],

      [
        "casaComercial",
        "expFiltroCasaComercial"
      ],

      [
        "estado",
        "expFiltroEstado"
      ],

      [
        "fechaDesde",
        "expFiltroFechaDesde"
      ],

      [
        "fechaHasta",
        "expFiltroFechaHasta"
      ]

    ];


    pares.forEach(
      ([param, id]) => {

        const valor =
          document.getElementById(
            id
          )?.value || "";


        if (valor) {

          params.set(
            param,
            valor
          );

        }

      }
    );


    params.set(
      "orden",
      document.getElementById(
        "expOrden"
      )?.value ||
      "vencimiento_asc"
    );


    /* =========================================
       CONSULTAR TODOS LOS REGISTROS FILTRADOS
       ========================================= */

    const res =
      await fetch(
        `/api/control-expiracion?${params.toString()}`
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo obtener la información para exportar."
      );

    }


    const items =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];


    if (!items.length) {

      alert(
        "No hay registros para exportar."
      );

      return;

    }


    /* =========================================
       PREPARAR INFORMACIÓN
       ========================================= */

    const filas =
      items.map(
        item => {

          let textoDias = "";


          const dias =
            Number(
              item.dias_restantes
            );


          if (
            Number.isFinite(dias)
          ) {

            if (dias < 0) {

              textoDias =
                `Vencido hace ${Math.abs(
                  dias
                )} días`;

            } else if (
              dias === 0
            ) {

              textoDias =
                "Vence hoy";

            } else {

              textoDias =
                `${dias} días`;

            }

          }


          return {

            "Código":
              item.codigo || "",

            "Código proveedor":
              item.codigo_proveedor || "",

            "Producto":
              item.producto || "",

            "Categoría":
              item.categoria || "",

            "Lote":
              item.lote || "",

            "Fecha expiración":
              item.vencimiento || "",

            "Días restantes":
              textoDias,

            "Estado":
              item.estado_expiracion || "",

            "Casa comercial":
              item.casa_comercial || "",

            "Cantidad":
              Number(
                item.cantidad || 0
              ),

            "Bodega":
              item.bodega || "",

            "Ubicación":
              item.ubicacion || ""

          };

        }
      );


    /* =========================================
       CREAR LIBRO XLSX
       ========================================= */

    const workbook =
      XLSX.utils.book_new();


    const worksheet =
      XLSX.utils.json_to_sheet(
        filas
      );


    /* =========================================
       ANCHO DE COLUMNAS
       ========================================= */

    worksheet["!cols"] = [

      {
        wch: 16
      },

      {
        wch: 20
      },

      {
        wch: 40
      },

      {
        wch: 25
      },

      {
        wch: 20
      },

      {
        wch: 18
      },

      {
        wch: 22
      },

      {
        wch: 20
      },

      {
        wch: 30
      },

      {
        wch: 12
      },

      {
        wch: 22
      },

      {
        wch: 25
      }

    ];


    /* =========================================
       AUTOFILTRO EN ENCABEZADOS
       ========================================= */

    if (
      worksheet["!ref"]
    ) {

      worksheet["!autofilter"] = {
        ref:
          worksheet["!ref"]
      };

    }


    /* =========================================
       CONGELAR PRIMERA FILA
       ========================================= */

    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1
    };


    /* =========================================
       AGREGAR HOJA
       ========================================= */

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Control expiración"
    );


    /* =========================================
       SEGUNDA HOJA CON RESUMEN
       ========================================= */

    const resumen =
      data.resumen || {};


    const configuracion =
      data.configuracion || {};


    const hojaResumen =
      XLSX.utils.aoa_to_sheet([

        [
          "CONTROL DE FECHA DE EXPIRACIÓN"
        ],

        [],

        [
          "Configuración",
          "Valor"
        ],

        [
          "Lapso de aviso",
          `${Number(
            configuracion.meses_aviso ||
            0
          )} meses`
        ],

        [
          "Nivel crítico",
          `${Number(
            configuracion.dias_critico ||
            0
          )} días`
        ],

        [],

        [
          "Estado",
          "Cantidad de lotes"
        ],

        [
          "Vencidos",
          Number(
            resumen.vencidos ||
            0
          )
        ],

        [
          "Críticos",
          Number(
            resumen.criticos ||
            0
          )
        ],

        [
          "Próximos a vencer",
          Number(
            resumen.proximos ||
            0
          )
        ],

        [
          "Vigentes",
          Number(
            resumen.vigentes ||
            0
          )
        ]

      ]);


    hojaResumen["!cols"] = [

      {
        wch: 30
      },

      {
        wch: 22
      }

    ];


    XLSX.utils.book_append_sheet(
      workbook,
      hojaResumen,
      "Resumen"
    );


    /* =========================================
       FECHA PARA NOMBRE DEL ARCHIVO
       ========================================= */

    const hoy =
      new Date();


    const yyyy =
      hoy.getFullYear();


    const mm =
      String(
        hoy.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const dd =
      String(
        hoy.getDate()
      ).padStart(
        2,
        "0"
      );


    const nombreArchivo =
      `CONTROL_FECHA_EXPIRACION_${yyyy}-${mm}-${dd}.xlsx`;


    /* =========================================
       DESCARGAR
       ========================================= */

    XLSX.writeFile(
      workbook,
      nombreArchivo
    );


  } catch (error) {

    console.error(
      "ERROR EXPORTANDO CONTROL EXPIRACION:",
      error
    );


    alert(
      error.message ||
      "No se pudo exportar el archivo Excel."
    );

  }

}

function filtrarEstadoExpiracion(
  estado
) {

  const select =
    document.getElementById(
      "expFiltroEstado"
    );


  if (!select) return;


  select.value =
    estado || "";


  paginaControlExpiracion =
    1;


  cargarControlExpiracion();

}

async function cargarCuarentena() {

  try {

    const params =
      new URLSearchParams();


    params.set(
      "pagina",
      paginaCuarentena
    );

    params.set(
      "limite",
      "10"
    );


    const filtros = [

      [
        "codigo",
        "cuarFiltroCodigo"
      ],

      [
        "producto",
        "cuarFiltroProducto"
      ],

      [
        "lote",
        "cuarFiltroLote"
      ],

      [
        "codigoProveedor",
        "cuarFiltroCodigoProveedor"
      ],

      [
        "casaComercial",
        "cuarFiltroCasaComercial"
      ],

      [
        "fechaDesde",
        "cuarFiltroFechaDesde"
      ],

      [
        "fechaHasta",
        "cuarFiltroFechaHasta"
      ]

    ];


    filtros.forEach(
      ([parametro, id]) => {

        const valor =
          document.getElementById(
            id
          )?.value?.trim() || "";


        if (valor) {

          params.set(
            parametro,
            valor
          );

        }

      }
    );


    params.set(
      "orden",
      document.getElementById(
        "cuarOrden"
      )?.value ||
      "vencimiento_asc"
    );


    const res =
      await fetch(
        `/api/cuarentena?${params.toString()}`
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo cargar cuarentena."
      );

    }


    itemsCuarentena =
      data.items || [];


    paginaCuarentena =
      Number(
        data.paginacion?.pagina ||
        1
      );


    totalPaginasCuarentena =
      Number(
        data.paginacion
          ?.total_paginas ||
        1
      );


    renderTablaCuarentena(
      itemsCuarentena
    );


    actualizarPaginacionCuarentena(
      data.paginacion || {}
    );


  } catch (error) {

    console.error(
      "ERROR CARGANDO CUARENTENA:",
      error
    );


    const tbody =
      document.getElementById(
        "tablaCuarentenaBody"
      );


    if (tbody) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="10"
            class="empty-row"
          >
            ${error.message}
          </td>
        </tr>
      `;

    }

  }

}

function renderTablaCuarentena(
  items
) {

  const tbody =
    document.getElementById(
      "tablaCuarentenaBody"
    );


  if (!tbody) return;


  if (
    !Array.isArray(items) ||
    !items.length
  ) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="10"
          class="empty-row"
        >
          No hay productos en cuarentena.
        </td>
      </tr>
    `;

    return;

  }


  const puedeLiberar =
    permisosUsuarioActual.has(
      "utilidades.cuarentena_liberar"
    );


  tbody.innerHTML =
    items
      .map(item => {

        let claseEstado =
          "exp-estado-vigente";


        if (
          item.estado_expiracion ===
          "VENCIDO"
        ) {

          claseEstado =
            "exp-estado-vencido";

        } else if (
          item.estado_expiracion ===
          "CRITICO"
        ) {

          claseEstado =
            "exp-estado-critico";

        } else if (
          item.estado_expiracion ===
          "PROXIMO"
        ) {

          claseEstado =
            "exp-estado-proximo";

        }


        return `
          <tr>

            <td>
              ${item.codigo || ""}
            </td>

            <td>
              ${item.codigo_proveedor || ""}
            </td>

            <td>
              ${item.producto || ""}
            </td>

            <td>
              ${item.lote || ""}
            </td>

            <td>
              ${item.vencimiento || ""}
            </td>

            <td>
              <span
                class="exp-estado ${claseEstado}"
              >
                ${item.estado_expiracion || ""}
              </span>
            </td>

            <td>
              ${item.casa_comercial || ""}
            </td>

            <td>
              ${Number(
                item.cantidad || 0
              )}
            </td>

            <td>
              ${item.ubicacion || ""}
            </td>

            <td>

              ${
                puedeLiberar
                  ? `
                    <button
                      type="button"
                      class="btn-primary"
                      onclick="abrirLiberarCuarentena(
                        ${Number(
                          item.inventario_id
                        )},
                        ${Number(
                          item.detalle_entrada_id
                        )}
                      )"
                    >
                      Liberar
                    </button>
                  `
                  : `
                    <span class="text-muted">
                      Solo lectura
                    </span>
                  `
              }

            </td>

          </tr>
        `;

      })
      .join("");

}

function buscarCuarentena() {

  paginaCuarentena = 1;

  cargarCuarentena();

}

function limpiarFiltrosCuarentena() {

  const ids = [

    "cuarFiltroCodigo",
    "cuarFiltroProducto",
    "cuarFiltroLote",
    "cuarFiltroCodigoProveedor",
    "cuarFiltroCasaComercial",
    "cuarFiltroFechaDesde",
    "cuarFiltroFechaHasta"

  ];


  ids.forEach(id => {

    const elemento =
      document.getElementById(id);

    if (elemento) {
      elemento.value = "";
    }

  });


  const orden =
    document.getElementById(
      "cuarOrden"
    );


  if (orden) {

    orden.value =
      "vencimiento_asc";

  }


  paginaCuarentena = 1;


  cargarCuarentena();

}

function cambiarPaginaCuarentena(
  direccion
) {

  const nueva =
    paginaCuarentena +
    Number(
      direccion || 0
    );


  if (
    nueva < 1 ||
    nueva >
      totalPaginasCuarentena
  ) {
    return;
  }


  paginaCuarentena =
    nueva;


  cargarCuarentena();

}

function actualizarPaginacionCuarentena(
  paginacion
) {

  const pagina =
    Number(
      paginacion.pagina || 1
    );


  const totalPaginas =
    Number(
      paginacion.total_paginas ||
      1
    );


  const totalRegistros =
    Number(
      paginacion.total_registros ||
      0
    );


  const texto =
    document.getElementById(
      "cuarPaginaTexto"
    );


  const info =
    document.getElementById(
      "cuarInfoPaginacion"
    );


  const anterior =
    document.getElementById(
      "btnCuarAnterior"
    );


  const siguiente =
    document.getElementById(
      "btnCuarSiguiente"
    );


  if (texto) {

    texto.textContent =
      `Página ${pagina} de ${totalPaginas}`;

  }


  if (info) {

    info.textContent =
      `${totalRegistros} registro(s)`;

  }


  if (anterior) {

    anterior.disabled =
      pagina <= 1;

  }


  if (siguiente) {

    siguiente.disabled =
      pagina >= totalPaginas;

  }

}

async function exportarCuarentenaExcel() {

  try {

    if (
      typeof XLSX ===
      "undefined"
    ) {

      alert(
        "La librería XLSX no está cargada."
      );

      return;

    }


    const params =
      new URLSearchParams();


    params.set(
      "pagina",
      "1"
    );

    params.set(
      "limite",
      "5000"
    );


    const filtros = [

      ["codigo", "cuarFiltroCodigo"],

      ["producto", "cuarFiltroProducto"],

      ["lote", "cuarFiltroLote"],

      [
        "codigoProveedor",
        "cuarFiltroCodigoProveedor"
      ],

      [
        "casaComercial",
        "cuarFiltroCasaComercial"
      ],

      [
        "fechaDesde",
        "cuarFiltroFechaDesde"
      ],

      [
        "fechaHasta",
        "cuarFiltroFechaHasta"
      ]

    ];


    filtros.forEach(
      ([parametro, id]) => {

        const valor =
          document.getElementById(
            id
          )?.value || "";


        if (valor) {

          params.set(
            parametro,
            valor
          );

        }

      }
    );


    params.set(
      "orden",
      document.getElementById(
        "cuarOrden"
      )?.value ||
      "vencimiento_asc"
    );


    const res =
      await fetch(
        `/api/cuarentena?${params.toString()}`
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo exportar cuarentena."
      );

    }


    const items =
      data.items || [];


    if (!items.length) {

      alert(
        "No hay registros para exportar."
      );

      return;

    }


    const filas =
      items.map(item => ({

        "Código":
          item.codigo || "",

        "Código proveedor":
          item.codigo_proveedor || "",

        "Producto":
          item.producto || "",

        "Categoría":
          item.categoria || "",

        "Lote":
          item.lote || "",

        "Fecha expiración":
          item.vencimiento || "",

        "Estado":
          item.estado_expiracion || "",

        "Casa comercial":
          item.casa_comercial || "",

        "Cantidad":
          Number(
            item.cantidad || 0
          ),

        "Bodega":
          "CUARENTENA",

        "Ubicación":
          item.ubicacion || "",

        "Responsable":
          item.responsable || "",

        "Observación":
          item.observacion || ""

      }));


    const workbook =
      XLSX.utils.book_new();


    const worksheet =
      XLSX.utils.json_to_sheet(
        filas
      );


    worksheet["!cols"] = [

      { wch: 16 },
      { wch: 20 },
      { wch: 40 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
      { wch: 18 },
      { wch: 22 },
      { wch: 25 },
      { wch: 40 }

    ];


    if (worksheet["!ref"]) {

      worksheet["!autofilter"] = {
        ref:
          worksheet["!ref"]
      };

    }


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Cuarentena"
    );


    const hoy =
      new Date();


    const fecha =
      [
        hoy.getFullYear(),

        String(
          hoy.getMonth() + 1
        ).padStart(2, "0"),

        String(
          hoy.getDate()
        ).padStart(2, "0")

      ].join("-");


    XLSX.writeFile(

      workbook,

      `CUARENTENA_${fecha}.xlsx`

    );


  } catch (error) {

    console.error(
      "ERROR EXPORTANDO CUARENTENA:",
      error
    );


    alert(
      error.message ||
      "No se pudo exportar cuarentena."
    );

  }

}

async function abrirLiberarCuarentena(
  inventarioId,
  detalleEntradaId
) {
    if (
    !permisosUsuarioActual.has(
      "utilidades.cuarentena_liberar"
    )
  ) {

    alert(
      "No tiene permiso para liberar productos de CUARENTENA."
    );

    return;

  }

  const item =
    itemsCuarentena.find(
      x =>
        Number(
          x.inventario_id
        ) ===
        Number(
          inventarioId
        ) &&
        Number(
          x.detalle_entrada_id
        ) ===
        Number(
          detalleEntradaId
        )
    );


  if (!item) {

    alert(
      "No se encontró el producto seleccionado."
    );

    return;

  }


  const modal =
    document.getElementById(
      "modalLiberarCuarentena"
    );


  const info =
    document.getElementById(
      "liberarCuarentenaInfo"
    );


  const inputInv =
    document.getElementById(
      "liberarCuarentenaInventarioId"
    );


  const inputDetalle =
    document.getElementById(
      "liberarCuarentenaDetalleId"
    );


  const inputCantidad =
    document.getElementById(
      "liberarCuarentenaCantidad"
    );


  const selectDestino =
    document.getElementById(
      "liberarCuarentenaDestino"
    );


  const selectMotivo =
    document.getElementById(
      "liberarCuarentenaMotivo"
    );


  const observacion =
    document.getElementById(
      "liberarCuarentenaObservacion"
    );


  if (info) {

    info.innerHTML = `
      <div class="cuarentena-producto-info">

        <strong>
          ${item.producto || ""}
        </strong>

        <div>
          Código:
          ${item.codigo || ""}
        </div>

        <div>
          Lote:
          ${item.lote || ""}
        </div>

        <div>
          Fecha expiración:
          ${item.vencimiento || ""}
        </div>

        <div>
          Stock disponible en CUARENTENA:
          ${Number(
            item.cantidad || 0
          )}
        </div>

      </div>
    `;

  }


  if (inputInv) {

    inputInv.value =
      inventarioId;

  }


  if (inputDetalle) {

    inputDetalle.value =
      detalleEntradaId;

  }


  if (inputCantidad) {

    inputCantidad.value =
      Number(
        item.cantidad || 0
      );

    inputCantidad.max =
      Number(
        item.cantidad || 0
      );

  }


  if (selectMotivo) {
    selectMotivo.value = "";
  }


  if (observacion) {
    observacion.value = "";
  }


  /* =========================================
     CARGAR BODEGAS
     ========================================= */

  try {

    const res =
      await fetch(
        "/api/cuarentena/bodegas-destino"
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudieron cargar las bodegas."
      );

    }


   if (selectDestino) {

  selectDestino.innerHTML = `
    <option value="">
      Seleccione...
    </option>

    ${
      (data.bodegas || [])
        .map(
          bodega => `
            <option
              value="${bodega.nombre}"
              data-bodega-id="${bodega.id}"
            >
              ${bodega.nombre}
            </option>
          `
        )
        .join("")
    }
  `;

}


  } catch (error) {

    console.error(
      "ERROR CARGANDO BODEGAS CUARENTENA:",
      error
    );


    alert(
      error.message
    );


    return;

  }


  if (modal) {

    modal.style.display =
      "flex";

  }

}

function cerrarModalLiberarCuarentena() {

  const modal =
    document.getElementById(
      "modalLiberarCuarentena"
    );


  if (modal) {

    modal.style.display =
      "none";

  }

}

async function confirmarLiberarCuarentena() {

    if (
    !permisosUsuarioActual.has(
      "utilidades.cuarentena_liberar"
    )
  ) {

    alert(
      "No tiene permiso para liberar productos de CUARENTENA."
    );

    return;

  }

  const inventarioId =
    Number(
      document.getElementById(
        "liberarCuarentenaInventarioId"
      )?.value || 0
    );


  const detalleEntradaId =
    Number(
      document.getElementById(
        "liberarCuarentenaDetalleId"
      )?.value || 0
    );


  const cantidad =
    Number(
      document.getElementById(
        "liberarCuarentenaCantidad"
      )?.value || 0
    );


  const destino =
    String(
      document.getElementById(
        "liberarCuarentenaDestino"
      )?.value || ""
    ).trim();


  const motivo =
    String(
      document.getElementById(
        "liberarCuarentenaMotivo"
      )?.value || ""
    ).trim();


  const observacion =
    String(
      document.getElementById(
        "liberarCuarentenaObservacion"
      )?.value || ""
    ).trim();


  const inputCantidad =
    document.getElementById(
      "liberarCuarentenaCantidad"
    );


  const maximo =
    Number(
      inputCantidad?.max || 0
    );


  if (
    !inventarioId ||
    !detalleEntradaId
  ) {

    alert(
      "Producto o lote no válido."
    );

    return;

  }


  if (
    cantidad <= 0
  ) {

    alert(
      "Ingrese una cantidad válida."
    );

    return;

  }


  if (
    maximo > 0 &&
    cantidad > maximo
  ) {

    alert(
      `Solo existen ${maximo} unidades disponibles en cuarentena.`
    );

    return;

  }


  if (!destino) {

    alert(
      "Seleccione la bodega destino."
    );

    return;

  }


  if (!motivo) {

    alert(
      "Seleccione el motivo de liberación."
    );

    return;

  }


  const confirmar =
    confirm(
      `¿Está seguro de liberar ${cantidad} unidad(es) de CUARENTENA hacia ${destino}?`
    );


  if (!confirmar) return;


  const boton =
    document.getElementById(
      "btnConfirmarLiberarCuarentena"
    );


  const textoOriginal =
    boton?.innerHTML || "";


  try {

    if (boton) {

      boton.disabled =
        true;


      boton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Liberando...
      `;

    }


    const res =
      await fetch(
        "/api/cuarentena/liberar",
        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              inventarioId,

              detalleEntradaId,

              cantidad,

              destino,

              motivo,

              observacion

            })

        }
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo liberar el producto."
      );

    }


    alert(
      data.mensaje ||
      "Producto liberado correctamente."
    );


    cerrarModalLiberarCuarentena();


    await cargarCuarentena();


  } catch (error) {

    console.error(
      "ERROR LIBERANDO CUARENTENA:",
      error
    );


    alert(
      error.message ||
      "No se pudo liberar el producto."
    );


  } finally {

    if (boton) {

      boton.disabled =
        false;


      boton.innerHTML =
        textoOriginal;

    }

  }

}

async function cargarAlertaExpiracionDashboard() {

  const contenedor =
    document.getElementById(
      "dashboardAlertaExpiracion"
    );


  const titulo =
    document.getElementById(
      "dashboardAlertaExpTitulo"
    );


  const texto =
    document.getElementById(
      "dashboardAlertaExpTexto"
    );


  const resumen =
    document.getElementById(
      "dashboardAlertaExpResumen"
    );


  const boton =
    document.getElementById(
      "btnDashboardVerExpiracion"
    );


  if (
    !contenedor ||
    !titulo ||
    !texto ||
    !resumen
  ) {
    return;
  }


  /*
    Si el usuario no tiene permiso
    para Control Fecha Expiración,
    no mostramos esta alerta.
  */
  if (
    !permisosUsuarioActual.has(
      "utilidades.control_expiracion"
    )
  ) {

    contenedor.style.display =
      "none";

    return;

  }


  try {

    contenedor.style.display =
      "";


    contenedor.className =
      "dashboard-alerta-expiracion dashboard-alerta-cargando";


    titulo.textContent =
      "Control de vencimientos";


    texto.textContent =
      "Consultando fechas de expiración...";


    resumen.innerHTML =
      "";


    const res =
      await fetch(
        "/api/control-expiracion?pagina=1&limite=10"
      );


    const data =
      await res
        .json()
        .catch(() => ({}));


    if (!res.ok) {

      throw new Error(
        data.error ||
        "No se pudo consultar el control de vencimientos."
      );

    }


    const vencidos =
      Number(
        data.resumen?.vencidos ||
        0
      );


    const criticos =
      Number(
        data.resumen?.criticos ||
        0
      );


    const proximos =
      Number(
        data.resumen?.proximos ||
        0
      );


    const mesesAviso =
      Number(
        data.configuracion
          ?.meses_aviso ||
        3
      );


    const totalAlertas =
      vencidos +
      criticos +
      proximos;


    /* =========================================
       HAY PRODUCTOS VENCIDOS
       ========================================= */

    if (vencidos > 0) {

      contenedor.className =
        "dashboard-alerta-expiracion dashboard-alerta-peligro";


      titulo.textContent =
        "Alerta de vencimientos";


      texto.textContent =
        `Tiene productos vencidos o próximos a vencer dentro del período configurado de ${mesesAviso} mes(es).`;


      resumen.innerHTML = `
        <button
          type="button"
          class="dashboard-alerta-contador contador-vencido"
          onclick="abrirControlExpiracionDesdeDashboard('VENCIDO')"
        >
          <strong>
            ${vencidos}
          </strong>

          <span>
            Vencido(s)
          </span>
        </button>


        <button
          type="button"
          class="dashboard-alerta-contador contador-critico"
          onclick="abrirControlExpiracionDesdeDashboard('CRITICO')"
        >
          <strong>
            ${criticos}
          </strong>

          <span>
            Crítico(s)
          </span>
        </button>


        <button
          type="button"
          class="dashboard-alerta-contador contador-proximo"
          onclick="abrirControlExpiracionDesdeDashboard('PROXIMO')"
        >
          <strong>
            ${proximos}
          </strong>

          <span>
            Próximo(s)
          </span>
        </button>
      `;


      return;

    }


    /* =========================================
       HAY PRODUCTOS CRÍTICOS
       ========================================= */

    if (criticos > 0) {

      contenedor.className =
        "dashboard-alerta-expiracion dashboard-alerta-critica";


      titulo.textContent =
        "Atención: productos críticos";


      texto.textContent =
        `Existen productos cuya fecha de expiración está muy próxima. Lapso configurado: ${mesesAviso} mes(es).`;


      resumen.innerHTML = `
        <button
          type="button"
          class="dashboard-alerta-contador contador-critico"
          onclick="abrirControlExpiracionDesdeDashboard('CRITICO')"
        >
          <strong>
            ${criticos}
          </strong>

          <span>
            Crítico(s)
          </span>
        </button>


        <button
          type="button"
          class="dashboard-alerta-contador contador-proximo"
          onclick="abrirControlExpiracionDesdeDashboard('PROXIMO')"
        >
          <strong>
            ${proximos}
          </strong>

          <span>
            Próximo(s)
          </span>
        </button>
      `;


      return;

    }


    /* =========================================
       SOLO PRÓXIMOS
       ========================================= */

    if (proximos > 0) {

      contenedor.className =
        "dashboard-alerta-expiracion dashboard-alerta-advertencia";


      titulo.textContent =
        "Productos próximos a vencer";


      texto.textContent =
        `Tiene productos próximos a vencer dentro de los próximos ${mesesAviso} mes(es).`;


      resumen.innerHTML = `
        <button
          type="button"
          class="dashboard-alerta-contador contador-proximo"
          onclick="abrirControlExpiracionDesdeDashboard('PROXIMO')"
        >
          <strong>
            ${proximos}
          </strong>

          <span>
            Próximo(s)
          </span>
        </button>
      `;


      return;

    }


    /* =========================================
       SIN ALERTAS
       ========================================= */

    contenedor.className =
      "dashboard-alerta-expiracion dashboard-alerta-ok";


    titulo.textContent =
      "Control de vencimientos al día";


    texto.textContent =
      `No existen productos vencidos, críticos ni próximos a vencer dentro de los próximos ${mesesAviso} mes(es).`;


    resumen.innerHTML = `
      <div class="dashboard-alerta-sin-novedad">

        <i class="fa-solid fa-circle-check"></i>

        Sin novedades

      </div>
    `;


    if (boton) {

      boton.textContent =
        "Ver control completo";

    }


  } catch (error) {

    console.error(
      "ERROR ALERTA DASHBOARD:",
      error
    );


    contenedor.className =
      "dashboard-alerta-expiracion dashboard-alerta-error";


    titulo.textContent =
      "Control de vencimientos";


    texto.textContent =
      "No fue posible consultar las alertas de vencimiento.";


    resumen.innerHTML =
      "";

  }

}

function abrirControlExpiracionDesdeDashboard(
  estado = ""
) {

  if (
    !permisosUsuarioActual.has(
      "utilidades.control_expiracion"
    )
  ) {

    alert(
      "No tiene permiso para acceder al control de expiración."
    );

    return;

  }


  cambiarContenido(
    "utilidades-control-expiracion"
  );


  /*
    Esperamos a que el HTML de la
    sección ya esté insertado.
  */
  setTimeout(
    () => {

      const select =
        document.getElementById(
          "expFiltroEstado"
        );


      if (select) {

        select.value =
          estado || "";

      }


      paginaControlExpiracion =
        1;


      cargarControlExpiracion();

    },
    50
  );

}