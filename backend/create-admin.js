// Script to create an admin account in the database
// Usage: node create-admin.js
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'pfe_db',
};

const ADMIN_EMAIL    = 'admin@imknow.com';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_FIRSTNAME = 'Admin';
const ADMIN_LASTNAME  = 'ImKnow';

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    // Check if already exists
    const exists = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (exists.rows.length > 0) {
      const user = exists.rows[0];
      if (user.role === 'ADMIN') {
        console.log(`✅ Admin already exists: ${user.email} (id=${user.id})`);
      } else {
        // Promote to ADMIN
        await client.query(
          `UPDATE users SET role = 'ADMIN', status = 'actif', "isEmailActive" = true WHERE email = $1`,
          [ADMIN_EMAIL]
        );
        console.log(`✅ User ${user.email} promoted to ADMIN`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await client.query(
      `INSERT INTO users
         ("firstName", "lastName", email, password, role, status, "isEmailActive", "isGoogleAccount",
          "emailNotificationsEnabled", "pushNotificationsEnabled", "isOnline")
       VALUES ($1, $2, $3, $4, 'ADMIN', 'actif', true, false, true, true, false)`,
      [ADMIN_FIRSTNAME, ADMIN_LASTNAME, ADMIN_EMAIL, hashedPassword]
    );

    console.log(`✅ Admin account created:`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
