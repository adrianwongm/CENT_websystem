require("dotenv").config();
const app = require("./app");
const { getPool } = require("./config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("⏳ Conectando a la base de datos SQL Server...");
    await getPool();
    console.log("✅ Conexión establecida con SQL Server.");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n🛑 Señal ${signal} recibida. Cerrando servidor gracefully...`);
      server.close(() => {
        console.log("🔒 Servidor HTTP cerrado.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    return server;
  } catch (error) {
    console.error("❌ Error fatal al iniciar el servidor:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer
};
