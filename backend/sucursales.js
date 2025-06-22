const express = require('express');
const router = express.Router();
const db = require('./database');

// Obtener todas las sucursales
router.get('/sucursales', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM sucursales');
        res.json(rows);
    } catch (err) {
        console.error('Error en GET /api/sucursales:', err);
        res.status(500).json({
            message: 'Error al obtener sucursales',
            error: err.message
        });
    }
});

// Obtener una sucursal por ID
router.get('/sucursales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM sucursales WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error en GET /api/sucursales/:id:', err);
        res.status(500).json({
            message: 'Error al obtener sucursal',
            error: err.message
        });
    }
});

// Crear nueva sucursal
router.post('/sucursales', async (req, res) => {
    try {
        const { nombre, direccion, telefono } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: 'Nombre es requerido' });
        }

        const [result] = await db.query(
            'INSERT INTO sucursales (nombre, direccion, telefono) VALUES (?, ?, ?)',
            [nombre, direccion || null, telefono || null]
        );

        res.status(201).json({
            id: result.insertId,
            nombre,
            direccion,
            telefono
        });

    } catch (err) {
        console.error('Error en POST /api/sucursales:', err);
        res.status(500).json({
            message: 'Error al crear sucursal',
            error: err.message
        });
    }
});

// Actualizar sucursal
router.put('/sucursales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, telefono } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: 'Nombre es requerido' });
        }

        const [result] = await db.query(
            'UPDATE sucursales SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
            [nombre, direccion || null, telefono || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        res.json({
            id,
            nombre,
            direccion,
            telefono
        });

    } catch (err) {
        console.error('Error en PUT /api/sucursales/:id:', err);
        res.status(500).json({
            message: 'Error al actualizar sucursal',
            error: err.message
        });
    }
});

// Eliminar sucursal
router.delete('/sucursales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si la sucursal tiene productos asociados
        const [productos] = await db.query('SELECT COUNT(*) as count FROM productos WHERE sucursal_id = ?', [id]);
        
        if (productos[0].count > 0) {
            return res.status(400).json({ 
                message: 'No se puede eliminar la sucursal porque tiene productos asociados' 
            });
        }

        const [result] = await db.query('DELETE FROM sucursales WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        res.json({ message: 'Sucursal eliminada correctamente' });

    } catch (err) {
        console.error('Error en DELETE /api/sucursales/:id:', err);
        res.status(500).json({
            message: 'Error al eliminar sucursal',
            error: err.message
        });
    }
});

module.exports = router;
