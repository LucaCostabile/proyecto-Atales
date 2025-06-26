const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../base/database');
const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET_KEY;

// Middleware mejorado para verificar token
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Token no proporcionado' 
            });
        }
        
        const decoded = jwt.verify(token, SECRET_KEY);
        
        // Verificar usuario en la base de datos
        const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [decoded.id]); // Cambio aquí
        if (!users.length) {
            return res.status(403).json({ 
                success: false,
                error: 'Usuario no encontrado' 
            });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Error en verifyToken:', err);
        const message = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
        res.status(403).json({ 
            success: false,
            error: message 
        });
    }
};

// Registro
router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
        return res.status(400).json({ 
            success: false,
            error: 'Todos los campos son requeridos' 
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
                       [email, username, hashedPassword]);
        
        res.json({ 
            success: true,
            message: 'Registro exitoso' 
        });
        
    } catch (err) {
        console.error('Error en registro:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false,
                error: 'El email/usuario ya existe' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
        });
    }
});

// Login 
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [users] = await pool.query(
            'SELECT id, username, email, password FROM users WHERE email = ?', 
            [email]
        );
        
        const user = users[0];
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales incorrectas' 
            });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            SECRET_KEY, 
            { expiresIn: '1h' }
        );
        
        res.json({ 
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
        });
    }
});

// Verificación de token mejorada
router.get('/verify', verifyToken, (req, res) => {
    res.json({ 
        success: true,
        valid: true, 
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

// Ruta para obtener información del usuario (protegida)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username, email FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (!users.length) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        res.json({
            success: true,
            user: users[0]
        });
    } catch (err) {
        console.error('Error en /me:', err);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
});

module.exports = router;
