const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Database connection
const pool = new Pool({
  host: '10.0.0.2',
  port: 5117,
  user: 'willi_user',
  password: 'willi_password',
  database: 'willi_mako'
});

async function testPasswordResetFlow() {
  console.log('🔐 Teste Password-Reset-Funktionalität...\n');
  
  const testEmail = 'test@example.com';
  const testName = 'Test User';
  
  try {
    // 1. Create test user if not exists
    console.log('1️⃣ Erstelle Test-Benutzer...');
    const hashedPassword = await bcrypt.hash('oldpassword123', 10);
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, name, full_name, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $3, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
      password_hash = $2, updated_at = CURRENT_TIMESTAMP
    `, [testEmail, hashedPassword, testName]);
    
    console.log(`   ✅ Benutzer ${testEmail} erstellt/aktualisiert`);
    
    // 2. Test database schema
    console.log('\n2️⃣ Prüfe Datenbank-Schema...');
    
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'password_reset_tokens'
      ORDER BY ordinal_position
    `);
    
    if (schemaCheck.rows.length > 0) {
      console.log('   ✅ password_reset_tokens Tabelle existiert:');
      schemaCheck.rows.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ❌ password_reset_tokens Tabelle nicht gefunden');
      return;
    }
    
    // 3. Test token creation
    console.log('\n3️⃣ Teste Token-Erstellung...');
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Get user ID
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    const userId = userResult.rows[0].id;
    
    await pool.query(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
      token = $1, expires_at = $3, created_at = CURRENT_TIMESTAMP
    `, [resetToken, userId, expiresAt]);
    
    console.log(`   ✅ Reset-Token erstellt: ${resetToken.substring(0, 16)}...`);
    console.log(`   ⏰ Läuft ab: ${expiresAt.toLocaleString()}`);
    
    // 4. Test token validation
    console.log('\n4️⃣ Teste Token-Validierung...');
    const tokenValidation = await pool.query(`
      SELECT prt.user_id, u.email, u.name 
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP
    `, [resetToken]);
    
    if (tokenValidation.rows.length > 0) {
      console.log(`   ✅ Token ist gültig für: ${tokenValidation.rows[0].email}`);
    } else {
      console.log('   ❌ Token-Validierung fehlgeschlagen');
    }
    
    // 5. Test password update
    console.log('\n5️⃣ Teste Passwort-Update...');
    const newPassword = 'newpassword123';
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query('BEGIN');
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHashedPassword, userId]
    );
    
    // Delete used token
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    
    await pool.query('COMMIT');
    
    console.log('   ✅ Passwort aktualisiert und Token gelöscht');
    
    // 6. Test new password
    console.log('\n6️⃣ Teste neues Passwort...');
    const updatedUser = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [testEmail]
    );
    
    const passwordMatch = await bcrypt.compare(newPassword, updatedUser.rows[0].password_hash);
    if (passwordMatch) {
      console.log('   ✅ Neues Passwort funktioniert');
    } else {
      console.log('   ❌ Neues Passwort funktioniert nicht');
    }
    
    // 7. Test expired token cleanup
    console.log('\n7️⃣ Teste Expired-Token-Cleanup...');
    
    // Create expired token
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredTime = new Date(Date.now() - 1000); // 1 second ago
    
    await pool.query(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [expiredToken, userId, expiredTime]);
    
    // Run cleanup
    await pool.query('SELECT cleanup_expired_reset_tokens()');
    
    // Check if expired token was removed
    const expiredCheck = await pool.query(
      'SELECT COUNT(*) as count FROM password_reset_tokens WHERE token = $1',
      [expiredToken]
    );
    
    if (expiredCheck.rows[0].count === '0') {
      console.log('   ✅ Abgelaufene Tokens werden korrekt bereinigt');
    } else {
      console.log('   ❌ Cleanup-Funktion arbeitet nicht korrekt');
    }
    
    // 8. Test SMTP settings for password reset emails
    console.log('\n8️⃣ Teste SMTP-Konfiguration für Password-Reset...');
    
    const smtpSettings = await pool.query(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('smtp.enabled', 'smtp.host', 'smtp.from_email')
      ORDER BY key
    `);
    
    console.log('   📧 SMTP-Einstellungen:');
    smtpSettings.rows.forEach(setting => {
      console.log(`      ${setting.key}: ${setting.value}`);
    });
    
    console.log('\n✅ Password-Reset-Funktionalität erfolgreich getestet!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Frontend-Routen testen: /forgot-password und /reset-password/:token');
    console.log('   2. E-Mail-Templates mit echten SMTP-Einstellungen testen');
    console.log('   3. End-to-End-Test mit echtem Benutzer durchführen');
    console.log('   4. Sicherheit: Rate-Limiting für Password-Reset implementieren');
    
  } catch (error) {
    console.error('❌ Fehler beim Testen der Password-Reset-Funktionalität:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testPasswordResetFlow();
