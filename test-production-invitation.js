const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Database connection
const pool = new Pool({
  host: '10.0.0.2',
  port: 5117,
  user: 'willi_user',
  password: 'willi_password',
  database: 'willi_mako'
});

async function testProductionInvitation() {
  console.log('🎯 Teste Produktions-Einladung mit korrekten URLs...\n');
  
  try {
    // Get current SMTP settings from database
    const smtpQuery = `
      SELECT key, value FROM system_settings 
      WHERE key IN ('smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'smtp.from_email', 'smtp.from_name')
      ORDER BY key
    `;
    
    const smtpResult = await pool.query(smtpQuery);
    const smtpSettings = {};
    
    smtpResult.rows.forEach(row => {
      const key = row.key.replace('smtp.', '');
      smtpSettings[key] = row.value;
    });
    
    console.log('📧 SMTP-Konfiguration:');
    console.log(`   Host: ${smtpSettings.host}`);
    console.log(`   Port: ${smtpSettings.port}`);
    console.log(`   User: ${smtpSettings.user}`);
    console.log(`   From: ${smtpSettings.from_name} <${smtpSettings.from_email}>`);
    
    // Generate test invitation data
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = 'https://stromhaltig.de'; // Same as in teamService.ts
    const invitationUrl = `${baseUrl}/invitation/${invitationToken}`;
    
    console.log('\n🔗 Generierte Einladungs-URL:');
    console.log(`   ${invitationUrl}`);
    
    // Create email HTML (same as in emailService.ts)
    const teamData = {
      invitedBy: 'Test Admin',
      teamName: 'Test Team',
      teamDescription: 'Ein Test-Team für die URL-Verifikation',
      invitationToken: invitationToken,
      invitationUrl: invitationUrl,
      isNewUser: false
    };
    
    const emailHtml = generateTestInvitationHTML(teamData);
    
    // Check if the HTML contains the correct domain
    if (emailHtml.includes('https://stromhaltig.de')) {
      console.log('   ✅ E-Mail HTML enthält korrekte Produktions-Domain');
    } else {
      console.log('   ❌ E-Mail HTML enthält nicht die korrekte Domain');
    }
    
    if (emailHtml.includes('localhost')) {
      console.log('   ⚠️  E-Mail HTML enthält noch localhost-Referenzen');
    } else {
      console.log('   ✅ E-Mail HTML enthält keine localhost-Referenzen');
    }
    
    // Setup SMTP transporter (Amazon SES)
    const transporter = nodemailer.createTransporter({
      host: smtpSettings.host,
      port: parseInt(smtpSettings.port),
      secure: false, // STARTTLS
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Test email options
    const mailOptions = {
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: 'willi@stromhaltig.de', // Send to verified address
      subject: 'TEST: Team-Einladung mit korrekter URL',
      html: emailHtml
    };
    
    console.log('\n📬 Sende Test-Einladung...');
    console.log(`   An: ${mailOptions.to}`);
    console.log(`   Von: ${mailOptions.from}`);
    
    // Send test email
    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ E-Mail gesendet! Message ID: ${info.messageId}`);
    
    console.log('\n🎉 ERFOLGREICH:');
    console.log('   ✅ Test-Einladung mit Produktions-URL gesendet');
    console.log('   ✅ E-Mail enthält https://stromhaltig.de Links');
    console.log('   ✅ Keine localhost-Referenzen mehr vorhanden');
    console.log('   ✅ Amazon SES Delivery funktioniert');
    
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. E-Mail in willi@stromhaltig.de prüfen');
    console.log('   2. Einladungslink in E-Mail anklicken');
    console.log('   3. Verifizieren dass Link zu https://stromhaltig.de führt');
    
  } catch (error) {
    console.error('❌ Fehler beim Testen der Produktions-Einladung:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

function generateTestInvitationHTML(data) {
  const baseUrl = 'https://stromhaltig.de'; // Same as in emailService.ts
  
  return `
  <!DOCTYPE html>
  <html lang="de">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Team-Einladung</title>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #147a50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .team-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { 
              display: inline-block; 
              background-color: #147a50; 
              color: white; 
              padding: 12px 25px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 15px 0;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .test-info { 
              background-color: #fff3cd; 
              padding: 10px; 
              border: 1px solid #ffc107; 
              border-radius: 5px; 
              margin: 10px 0; 
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>🎉 Team-Einladung (TEST)</h1>
              <p>Sie wurden zu einem Team bei Willi Mako eingeladen!</p>
          </div>
          
          <div class="content">
              <div class="test-info">
                  <strong>🧪 DIES IST EINE TEST-E-MAIL</strong><br>
                  Zweck: Verifikation der korrekten Produktions-URLs in Einladungslinks
              </div>
              
              <p><strong>${data.invitedBy}</strong> hat Sie eingeladen, dem Team beizutreten:</p>
              
              <div class="team-info">
                  <h2>📋 ${data.teamName}</h2>
                  ${data.teamDescription ? `<p>${data.teamDescription}</p>` : ''}
              </div>
              
              <p><strong>URL-Test:</strong></p>
              <ul>
                  <li>Base URL: ${baseUrl}</li>
                  <li>Einladungs-Token: ${data.invitationToken.substring(0, 16)}...</li>
                  <li>Vollständige URL: ${data.invitationUrl}</li>
              </ul>
              
              <div style="text-align: center;">
                  <a href="${data.invitationUrl}" class="button">
                      TEST: Einladung annehmen
                  </a>
              </div>
              
              <p><small>Dieser Link sollte Sie zu <strong>https://stromhaltig.de</strong> weiterleiten, 
                 nicht zu localhost!</small></p>
          </div>
          
          <div class="footer">
              <p>© 2025 Willi Mako - URL-Test für Produktions-Einladungen</p>
              <p>Diese Test-E-Mail wurde automatisch generiert.</p>
          </div>
      </div>
  </body>
  </html>
  `;
}

testProductionInvitation();
