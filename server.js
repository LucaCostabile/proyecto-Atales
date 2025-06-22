const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Importar módulos
const auth = require('./backend/auth');
const rest = require('./backend/rest');
const crudRoutes = require('./backend/CRUD');
const cierreCajaRoutes = require('./backend/cierrecaja');
const sucursalesRoutes = require('./backend/sucursales');

// Configuración inicial
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true); // Necesario porque el tráfico pasa por el Ingress (Nginx)

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Middleware global
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Configuración de Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: 'Demasiadas solicitudes. Por favor intenta nuevamente más tarde.' },
  validate: { trustProxy: false }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Demasiados intentos. Por favor espera 1 minuto.' },
  validate: { trustProxy: false }
});

// Middleware de configuración
app.use(cors({
  origin: [
    'http://localhost:3000', // para desarrollo local
    'https://atales.local',
    'http://192.168.49.2'
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

// Rutas de autenticación y restablecimiento (con rate limiting especial)
app.use('/api/auth', authLimiter, auth);
app.use('/api/reset', authLimiter, rest);

// Rutas principales del negocio (sin autenticación según tu configuración actual)
app.use('/api', crudRoutes);           // Productos y categorías
app.use('/api', cierreCajaRoutes);     // Cierres de caja
app.use('/api', sucursalesRoutes);     // Sucursales

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Error interno del servidor' 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log('✅ Endpoints organizados en módulos separados');
  console.log('📁 Estructura modular implementada');
});

module.exports = app;
