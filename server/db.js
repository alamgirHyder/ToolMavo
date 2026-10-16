import mysql from "mysql2/promise";

export function createDatabase(env = process.env) {
  for (const name of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
    if (!env[name])
      throw new Error(
        `Missing ${name}; set it in your hosting environment variables.`,
      );
  }
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 20,
    timezone: "Z",
    charset: "utf8mb4",
    ...(env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  return {
    async initialize() {
      await pool.execute(`CREATE TABLE IF NOT EXISTS contact_message (
        id CHAR(36) PRIMARY KEY, name VARCHAR(150) NOT NULL, email VARCHAR(200) NOT NULL,
        message TEXT NOT NULL, created_at DATETIME(3) NOT NULL
      ) CHARACTER SET utf8mb4`);
      await pool.execute(`CREATE TABLE IF NOT EXISTS invoice (
        id CHAR(36) PRIMARY KEY, client VARCHAR(150) NOT NULL, email VARCHAR(200) NOT NULL,
        description VARCHAR(500) NOT NULL, quantity DECIMAL(12,2) NOT NULL,
        rate DECIMAL(14,2) NOT NULL, currency CHAR(3) NOT NULL,
        total DECIMAL(20,2) NOT NULL, created_at DATETIME(3) NOT NULL
      ) CHARACTER SET utf8mb4`);
    },
    async health() {
      await pool.execute("SELECT 1");
    },
    async saveContact(r) {
      await pool.execute(
        "INSERT INTO contact_message (id,name,email,message,created_at) VALUES (?,?,?,?,?)",
        [r.id, r.name, r.email, r.message, new Date(r.createdAt)],
      );
    },
    async saveInvoice(r) {
      await pool.execute(
        "INSERT INTO invoice (id,client,email,description,quantity,rate,currency,total,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          r.id,
          r.client,
          r.email,
          r.description,
          r.quantity,
          r.rate,
          r.currency,
          r.total,
          new Date(r.createdAt),
        ],
      );
    },
    close: () => pool.end(),
  };
}
