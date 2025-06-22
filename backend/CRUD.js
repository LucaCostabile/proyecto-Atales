const express = require('express');
const router = express.Router();
const db = require('./database');

// CRUD Productos
router.post('/productos', async (req, res) => {
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

router.get('/productos', async (req, res) => {
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

router.put('/productos/:id', async (req, res) => {
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

router.delete('/productos/:id', async (req, res) => {
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
router.get('/categorias', async (req, res) => {
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

module.exports = router;
