const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const dbConfig = {
  connectionString:
    process.env.DB_CONNECTION_STRING ||
    "Driver={ODBC Driver 18 for SQL Server};" +
    "Server=localhost;" +
    "Database=CENT;" +
    "Uid=sa;" +
    "Pwd=1234;" +
    "Encrypt=Yes;" +
    "TrustServerCertificate=Yes;",
  driver: "msnodesqlv8",
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 5000),
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 5000)
};

/**
 * Retorna el pool de conexiones de SQL Server activo
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getPool() {
  return sql.connect(dbConfig);
}

module.exports = {
  sql,
  dbConfig,
  getPool
};
