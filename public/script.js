const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const mensaje = document.getElementById("mensaje");
const togglePassword = document.getElementById("togglePassword");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const esPassword = passwordInput.type === "password";
    passwordInput.type = esPassword ? "text" : "password";
    togglePassword.textContent = esPassword ? "🙈" : "👁";
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    mensaje.textContent = "";
    mensaje.style.color = "#ffd27a";

    if (!username || !password) {
      mensaje.textContent = "Ingrese usuario y contraseña";
      mensaje.style.color = "#ffb3b3";
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        mensaje.textContent = data.mensaje || "Usuario o contraseña incorrectos";
        mensaje.style.color = "#ffb3b3";
        return;
      }

      mensaje.textContent = "Acceso correcto...";
      mensaje.style.color = "#9ff3b0";

      window.location.href = "/panel";
    } catch (error) {
      console.error("Error login:", error);
      mensaje.textContent = "Error al conectar con el servidor";
      mensaje.style.color = "#ffb3b3";
    }
  });
}