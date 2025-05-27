const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../database');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'secreto_super_seguro';

// Registro
router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', 
                      [email, username, hashedPassword]);
        res.json({ message: 'Registro exitoso' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El email/usuario ya existe' });
        }
        res.status(500).json({ error: 'Error en el servidor' });
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

module.exports = router;

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
};

router.get('/profile', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});