const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://190472dd:KDFISenybJ58VRBScNUE4g@unique-auroch-14135.jxf.gcp-europe-west2.cockroachlabs.cloud:26257/dd?sslmode=verify-full",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log("Connecting...");
    const res = await pool.query('SELECT NOW()');
    console.log("Success:", res.rows);
    const { rows } = await pool.query("SELECT count(*) FROM users");
    console.log("Users count:", rows);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    pool.end();
  }
}

main();
