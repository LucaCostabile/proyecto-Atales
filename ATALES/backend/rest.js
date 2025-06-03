const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../database');
const nodemailer = require('nodemailer');
const path = require('path');
const router = express.Router();

require('dotenv').config({ path: './api.env' });

// Configura el transporter SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Ruta para solicitar restablecimiento de contraseña
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Buscar usuario en MySQL
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'El correo electrónico no está registrado' });
    }

    const user = users[0];
    
    // Generar token de restablecimiento
    const token = crypto.randomBytes(20).toString('hex');
    const expireTime = Date.now() + 3600000; // Token expira en 1 hora

    console.log('Token generado:', token);

    // Actualizar token en la base de datos
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
      [token, expireTime, email]
    );

    // Enviar correo con el enlace de restablecimiento
    const resetLink = `http://localhost:3000/reset/reset-password/${token}`;
    
    // Configuración del email para Nodemailer
    const mailOptions = {
      from: `"Atal App" <${process.env.GMAIL_USER}>`, // Usa GMAIL_USER
      to: email,
      subject: 'Restablecimiento de Contraseña - Atal',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e63946; border-radius: 8px;">
          <div style="background-color: #e63946; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">ATAL</h1>
          </div>
          
          <div style="padding: 20px;">
              <h2 style="color: #e63946;">Restablecer Contraseña</h2>
              <p>Recibiste este correo porque solicitaste un restablecimiento de contraseña.</p>
              
              <a href="${resetLink}" 
              style="display: inline-block; background-color: #e63946; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                      font-weight: bold; margin: 15px 0;">
              Restablecer Ahora
              </a>
              
              <p style="font-size: 12px; color: #666;">
              Si no solicitaste este cambio, por favor ignora este mensaje.<br>
              El enlace expirará en 1 hora.
              </p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 10px; text-align: center; 
                      border-top: 1px solid #ddd; font-size: 12px; color: #777;">
              © ${new Date().getFullYear()} Atal. Todos los derechos reservados.
          </div>
        </div>
      `
    };

    // Envía el email usando Nodemailer
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Te hemos enviado un enlace para restablecer tu contraseña' });
    
  } catch (err) {
    console.error('Error en reset-password:', err);
    res.status(500).json({ 
      error: err.code === 'ER_NO_SUCH_TABLE' 
        ? 'Tabla de usuarios no encontrada' 
        : 'Error en el servidor' 
    });
  }
});

// Ruta para confirmar el restablecimiento
router.post('/confirm-reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  console.log("Token recibido en el backend:", resetToken);

  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Faltan datos: resetToken o newPassword' });
  }

  try {
    // Verificar token válido
    const [users] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [resetToken, Date.now()]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña y limpiar token
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Contraseña actualizada con éxito' });
    
  } catch (error) {
    console.error('Error en confirm-reset-password:', error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
});

// Ruta para servir la página de restablecimiento
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  console.log('Token recibido:', token);

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, Date.now()]
    );

    if (users.length === 0) {
      console.log('Token no encontrado o expirado');
      return res.status(400).send('Token inválido o expirado');
    }

    res.sendFile(path.join(__dirname, '../frontend/reset-password.html'));
    
  } catch (err) {
    console.error('Error al buscar el usuario:', err);
    res.status(500).send('Error en la base de datos');
  }
});

module.exports = router;