import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { createDatabase } from "../db.js";
test("MySQL schema initialization is repeatable and records persist with exact decimal amounts", async () => {
  const db = createDatabase();
  const sql = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const id = randomUUID(),
    contactId = randomUUID();
  try {
    await db.initialize();
    await db.initialize();
    await db.health();
    await db.saveInvoice({
      id,
      client: "Integration",
      email: "test@example.com",
      description: "Deutsch Grüße · اردو زبان ✓",
      quantity: 2.5,
      rate: 10.25,
      currency: "USD",
      total: "25.63",
      createdAt: new Date().toISOString(),
    });
    await db.saveContact({
      id: contactId,
      name: "Integration",
      email: "test@example.com",
      message: "Deutsch Nachricht · اردو پیغام ✓",
      createdAt: new Date().toISOString(),
    });
    const [rows] = await sql.execute(
      "SELECT total,description FROM invoice WHERE id=?",
      [id],
    );
    assert.equal(rows[0].total, "25.63");
    assert.equal(rows[0].description, "Deutsch Grüße · اردو زبان ✓");
    const [contacts] = await sql.execute(
      "SELECT message FROM contact_message WHERE id=?",
      [contactId],
    );
    assert.equal(contacts[0].message, "Deutsch Nachricht · اردو پیغام ✓");
  } finally {
    await sql.execute("DELETE FROM invoice WHERE id=?", [id]);
    await sql.execute("DELETE FROM contact_message WHERE id=?", [contactId]);
    await db.close();
    await sql.end();
  }
});
