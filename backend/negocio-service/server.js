const express = require('express');
const bodyParser = require('body-parser');
const crudRoutes = require('./backend/CRUD');
const cierreCajaRoutes = require('./backend/cierrecaja');
const sucursalesRoutes = require('./backend/sucursales');

const app = express();
const PORT = process.env.PORT || 3002;

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'business-service' });
});

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Rutas de negocio
app.use('/', crudRoutes);           // productos, categorias
app.use('/', cierreCajaRoutes);     // cierres-caja
app.use('/', sucursalesRoutes);     // sucursales

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Error interno del servicio de negocio' 
  });
});

app.listen(PORT, () => {
  console.log(`📊 Business Service corriendo en puerto ${PORT}`);
});

module.exports = app;
