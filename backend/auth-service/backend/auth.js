const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('./base/database');
const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'secreto_super_seguro';

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Registro
router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    
    // Validación básica
    if (!email || !username || !password) {
        return res.status(400).json({ 
            success: false,
            error: 'Todos los campos son requeridos' 
        });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', 
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
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        
        const token = jwt.sign({ id: user.id, email }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Nueva ruta: Verificar token
router.get('/verify', verifyToken, (req, res) => {
    // Si llegamos aquí, el token es válido (pasó por el middleware)
    res.json({ 
        valid: true, 
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

module.exports = router;
