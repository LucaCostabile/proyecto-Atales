const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('./database');
const nodemailer = require('nodemailer');
const path = require('path');
const router = express.Router();

// Cargar variables de entorno
require('dotenv').config();

function getFrontendBaseURL() {
    // Si estamos en desarrollo local
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
    }
    
    // Para Kubernetes/Minikube - usando tu dominio atales.local
    return 'https://atales.local';
}

// Configura el transporter SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Verificar conexión del transporter al inicializar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error);
  } else {
    console.log('✅ Servidor de email configurado correctamente');
  }
});

// Ruta para solicitar restablecimiento de contraseña
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  // Validación básica
  if (!email) {
    return res.status(400).json({ error: 'El email es requerido' });
  }

  try {
    // Buscar usuario en MySQL
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'El correo electrónico no está registrado' });
    }

    const user = users[0];
    
    // Generar token de restablecimiento
    const token = crypto.randomBytes(32).toString('hex');
    const expireTime = Date.now() + 3600000; // Token expira en 1 hora

    console.log('🔑 Token generado para:', email);

    // Actualizar token en la base de datos
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
      [token, expireTime, email]
    );

    // Crear enlace de restablecimiento
    const resetLink = `${getFrontendBaseURL()}/reset-password.html?token=${token}`;
    
    // Configuración del email
    const mailOptions = {
      from: `"Atales" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Restablecimiento de Contraseña - Atales',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Restablecer Contraseña</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">ATALES</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-bottom: 20px;">Restablecer Contraseña</h2>
                
                <p style="margin-bottom: 20px;">
                    Hola <strong>${user.username || 'Usuario'}</strong>,
                </p>
                
                <p style="margin-bottom: 20px;">
                    Recibiste este correo porque solicitaste un restablecimiento de contraseña para tu cuenta en Atales.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Restablecer Contraseña
                    </a>
                </div>
                
                <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
                    Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
                </p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">
                    ${resetLink}
                </p>
                
                <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 14px; color: #666;">
                    <p><strong>Importante:</strong></p>
                    <ul>
                        <li>Este enlace expirará en 1 hora por seguridad</li>
                        <li>Si no solicitaste este cambio, puedes ignorar este mensaje</li>
                        <li>Tu contraseña actual seguirá siendo válida hasta que la cambies</li>
                    </ul>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                © ${new Date().getFullYear()} Atales. Todos los derechos reservados.
            </div>
        </body>
        </html>
      `
    };

    // Enviar email
    await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente a:', email);
    
    res.json({ 
      success: true,
      message: 'Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.' 
    });
    
  } catch (err) {
    console.error('❌ Error en reset-password:', err);
    
    // Manejo específico de errores
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Error en la base de datos: tabla no encontrada' });
    }
    
    if (err.code === 'EAUTH' || err.code === 'ECONNECTION') {
      return res.status(500).json({ error: 'Error de configuración del servidor de email' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para confirmar el restablecimiento
router.post('/confirm-reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  console.log("🔍 Token recibido:", resetToken ? 'Presente' : 'Ausente');

  // Validaciones básicas
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Verificar token válido y no expirado
    const [users] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [resetToken, Date.now()]
    );

    if (users.length === 0) {
      console.log('❌ Token inválido o expirado');
      return res.status(400).json({ error: 'Token inválido o expirado. Solicita un nuevo restablecimiento.' });
    }

    const user = users[0];
    console.log('✅ Token válido para usuario:', user.email);
    
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Actualizar contraseña y limpiar tokens
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    console.log('✅ Contraseña actualizada para:', user.email);
    
    res.json({ 
      success: true,
      message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' 
    });
    
  } catch (error) {
    console.error('❌ Error en confirm-reset-password:', error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
});

// Ruta para verificar si un token es válido (opcional, para validar antes de mostrar el formulario)
router.get('/verify-token/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const [users] = await db.query(
      'SELECT email FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, Date.now()]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Token inválido o expirado' 
      });
    }

    res.json({ 
      valid: true, 
      email: users[0].email.replace(/(.{2}).*(@.*)/, '$1***$2') // Email parcialmente oculto
    });
    
  } catch (err) {
    console.error('❌ Error al verificar token:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
