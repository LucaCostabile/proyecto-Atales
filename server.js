const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const auth = require('./backend/auth');
const rest = require('./backend/rest');

// Configuración inicial
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: 'Demasiadas solicitudes. Por favor intenta nuevamente más tarde.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: { error: 'Demasiados intentos. Por favor espera 1 minuto.' }
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', // para desarrollo local
    'https://proyecto-atales.onrender.com' // reemplaza por tu dominio real de Render
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(generalLimiter);
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});


// **QUITAMOS el middleware de autenticación** y no usamos `authenticateToken`

// Rutas de autenticación y restablecimiento siguen igual (si querés seguir usándolas)
app.use('/auth', authLimiter, auth);
app.use('/reset', authLimiter, rest);

// CRUD Productos SIN protección
app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, precio, cantidad = 0, categoria = 'General', sucursal_id = 1 } = req.body;

    if (!nombre || !precio) {
      throw new Error('Nombre y precio son requeridos');
    }

    const [result] = await db.query(
      'INSERT INTO productos (nombre, precio, cantidad, categoria, sucursal_id) VALUES (?, ?, ?, ?, ?)',
      [nombre, parseFloat(precio), parseInt(cantidad), categoria, sucursal_id]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      precio,
      cantidad,
      categoria,
      sucursal_id
    });

  } catch (err) {
    console.error('Error en POST /api/productos:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: err.message
    });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const sucursal = req.query.sucursal || 1;
    const [rows] = await db.query(
      'SELECT id, nombre, precio, cantidad, categoria FROM productos WHERE sucursal_id = ?',
      [sucursal]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /api/productos:', err);
    res.status(500).json({
      message: 'Error al obtener productos',
      error: err.message
    });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, cantidad, categoria } = req.body;

    const [result] = await db.query(
      'UPDATE productos SET nombre = ?, precio = ?, cantidad = ?, categoria = ? WHERE id = ?',
      [nombre, parseFloat(precio), parseInt(cantidad), categoria, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({
      id,
      nombre,
      precio,
      cantidad,
      categoria
    });
  } catch (err) {
    console.error('Error en PUT /api/productos:', err);
    res.status(500).json({
      message: 'Error al actualizar producto',
      error: err.message
    });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      'DELETE FROM productos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error('Error en DELETE /api/productos:', err);
    res.status(500).json({
      message: 'Error al eliminar producto',
      error: err.message
    });
  }
});

// Ruta para obtener categorías disponibles
app.get('/api/categorias', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL'
    );
    res.json(rows.map(item => item.categoria));
  } catch (err) {
    console.error('Error en GET /api/categorias:', err);
    res.status(500).json({
      message: 'Error al obtener categorías',
      error: err.message
    });
  }
});

// Registrar nuevo cierre de caja
app.post('/api/cierres-caja', async (req, res) => {
    try {
        const { sucursal_id, total_productos, ganancias_totales, detalles } = req.body;

        const [result] = await db.query(
            'INSERT INTO cierres_caja SET ?',
            {
                sucursal_id,
                total_productos,
                ganancias_totales,
                detalles: detalles ? JSON.stringify(detalles) : null, // <--- GUARDA LOS DETALLES
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
app.get('/api/cierres-caja/:sucursalId', async (req, res) => {
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log('✅ Endpoints de productos sin autenticación');
});
