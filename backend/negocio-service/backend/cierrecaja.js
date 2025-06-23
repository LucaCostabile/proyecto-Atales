const express = require('express');
const router = express.Router();
const database = require('../base/database');

// Registrar nuevo cierre de caja
router.post('/cierres-caja', async (req, res) => {
    try {
        const { sucursal_id, total_productos, ganancias_totales, detalles } = req.body;

        const [result] = await db.query(
            'INSERT INTO cierres_caja SET ?',
            {
                sucursal_id,
                total_productos,
                ganancias_totales,
                detalles: detalles ? JSON.stringify(detalles) : null,
                fecha_registro: new Date()
            }
        );

        // Devuelve el ID correctamente
        const [nuevoCierre] = await db.query(
            'SELECT * FROM cierres_caja WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(nuevoCierre[0]);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Error al registrar cierre' });
    }
});

// Obtener historial de cierres por sucursal
router.get('/cierres-caja/:sucursalId', async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const { fechaInicio, fechaFin } = req.query;
        
        let query = `
            SELECT 
                c.id,
                c.sucursal_id,
                CAST(c.total_productos AS SIGNED) as total_productos,
                CAST(c.ganancias_totales AS DECIMAL(12,2)) as ganancias_totales,
                c.fecha_registro,
                s.nombre as sucursal,
                c.detalles
            FROM cierres_caja c
            JOIN sucursales s ON c.sucursal_id = s.id
            WHERE c.sucursal_id = ?
        `;
        const params = [sucursalId];

        if (fechaInicio) {
            query += ' AND DATE(c.fecha_registro) >= ?';
            params.push(fechaInicio);
        }
        if (fechaFin) {
            query += ' AND DATE(c.fecha_registro) <= ?';
            params.push(fechaFin);
        }

        query += ' ORDER BY c.fecha_registro DESC';

        const [rows] = await db.query(query, params);

        // Parsear detalles si es string
        for (const row of rows) {
            if (row.detalles && typeof row.detalles === 'string') {
                try {
                    row.detalles = JSON.parse(row.detalles);
                } catch (e) {
                    row.detalles = [];
                }
            } else if (!row.detalles) {
                row.detalles = [];
            }
        }

        res.json(rows);

    } catch (err) {
        console.error('Error en GET /api/cierres-caja:', err);
        res.status(500).json({ error: 'Error al obtener cierres' });
    }
});

module.exports = router;
