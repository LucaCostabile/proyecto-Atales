const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../base/database');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configuración mejorada del transporter SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Función para generar el enlace base
const getFrontendBaseURL = () => {
    return process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://atales.local';
};

// Plantilla de email mejorada
const getResetPasswordTemplate = (username, resetLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Restablecer Contraseña</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: white; margin: 0; font-size: 28px;">ATALES</h1>
    </div>
    
    <div class="content">
        <h2 style="color: #333; margin-bottom: 20px;">Restablecer Contraseña</h2>
        
        <p>Hola <strong>${username || 'Usuario'}</strong>,</p>
        <p>Recibiste este correo porque solicitaste un restablecimiento de contraseña.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" class="button">Restablecer Contraseña</a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            Si no puedes hacer clic en el botón, copia y pega este enlace:<br>
            <code style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; display: inline-block; margin-top: 5px;">
                ${resetLink}
            </code>
        </p>
        
        <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 14px; color: #666;">
            <p><strong>Importante:</strong></p>
            <ul>
                <li>Este enlace expirará en 1 hora</li>
                <li>Si no solicitaste este cambio, ignora este mensaje</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        © ${new Date().getFullYear()} Atales. Todos los derechos reservados.
    </div>
</body>
</html>
`;

// Solicitud de restablecimiento
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ 
            success: false,
            error: 'El email es requerido' 
        });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!users.length) {
            return res.status(400).json({ 
                success: false,
                error: 'Correo electrónico no registrado' 
            });
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expireTime = Date.now() + 3600000; // 1 hora

        await pool.query( // Cambio aquí
          'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
          [token, expireTime, email]
        );

        const resetLink = `${getFrontendBaseURL()}/reset-password?token=${token}`;
        
        const mailOptions = {
            from: `"Atales" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Restablecimiento de Contraseña - Atales',
            html: getResetPasswordTemplate(user.username, resetLink)
        };

        await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true,
            message: 'Correo de restablecimiento enviado' 
        });
        
    } catch (err) {
        console.error('Error en reset-password:', err);
        
        let errorMessage = 'Error interno del servidor';
        if (err.code === 'EAUTH') errorMessage = 'Error de autenticación del email';
        if (err.code === 'ECONNECTION') errorMessage = 'Error de conexión con el servidor de email';
        
        res.status(500).json({ 
            success: false,
            error: errorMessage 
        });
    }
});

// Confirmación de restablecimiento mejorada
router.post('/confirm-reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ 
            success: false,
            error: 'Token y nueva contraseña son requeridos' 
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ 
            success: false,
            error: 'La contraseña debe tener al menos 8 caracteres' 
        });
    }

    try {
        const [users] = await pool.query(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
            [token, Date.now()]
        );

        if (!users.length) {
            return res.status(400).json({ 
                success: false,
                error: 'Token inválido o expirado' 
            });
        }

        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        await pool.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );
        
        res.json({ 
            success: true,
            message: 'Contraseña actualizada con éxito' 
        });
        
    } catch (err) {
        console.error('Error en confirm-reset-password:', err);
        res.status(500).json({ 
            success: false,
            error: 'Error al actualizar la contraseña' 
        });
    }
});

// Verificación de token mejorada
router.get('/verify-token/:token', async (req, res) => {
    const { token } = req.params;
    
    try {
        const [users] = await pool.query(
            'SELECT email FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
            [token, Date.now()]
        );

        if (!users.length) {
            return res.status(400).json({ 
                success: false,
                valid: false,
                error: 'Token inválido o expirado' 
            });
        }

        res.json({ 
            success: true,
            valid: true,
            email: users[0].email.replace(/(.{2}).*(@.*)/, '$1***$2')
        });
        
    } catch (err) {
        console.error('Error al verificar token:', err);
        res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
        });
    }
});

module.exports = router;
