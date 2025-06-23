const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const morgan = require('morgan');
const { checkMicroservicesHealth } = require('./health-checker');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración básica de seguridad y monitoreo
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);// Importante para Kubernetes y rate limiting
app.use(helmet());
app.use(morgan('combined')); // Logging de todas las solicitudes

// 2. Configuración de CORS para Kubernetes
const allowedOrigins = [
  'http://localhost:3000',
  'https://atales.local',
  'http://192.168.49.2',
  process.env.FRONTEND_URL // Variable de entorno para el frontend
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Rate Limiting optimizado para Kubernetes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Límite por pod (ajustar según réplicas)
  message: { error: 'Demasiadas solicitudes. Por favor intenta nuevamente más tarde.' },
  validate: { trustProxy: true } // Importante para Kubernetes
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: { error: 'Demasiados intentos. Por favor espera 1 minuto.' },
  validate: { trustProxy: true }
});

app.use(generalLimiter);

// 4. Configuración común de proxies
const proxyConfig = {
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error(`Error en proxy ${req.path}:`, err);
    res.status(502).json({ 
      success: false,
      error: 'Error de conexión con el servicio interno' 
    });
  },
  proxyTimeout: 30000, // 30 segundos timeout
  timeout: 30000,
  secure: false // Para desarrollo, en prod debería ser true
};

// 5. Proxies a microservicios
app.use('/api/auth', authLimiter, createProxyMiddleware({
  ...proxyConfig,
  target: `http://auth-service:${process.env.AUTH_SERVICE_PORT || 3001}`,
  pathRewrite: { '^/api/auth': '/auth' },
  logger: console // Logging específico para auth
}));

app.use('/api/reset', authLimiter, createProxyMiddleware({
  ...proxyConfig,
  target: `http://auth-service:${process.env.AUTH_SERVICE_PORT || 3001}`,
  pathRewrite: { '^/api/reset': '/reset' }
}));

app.use('/api', createProxyMiddleware({
  ...proxyConfig,
  target: `http://business-service:${process.env.BUSINESS_SERVICE_PORT || 3002}`,
  pathRewrite: { '^/api': '/' }
}));

// 6. Health Check mejorado para Kubernetes
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: await checkMicroservicesHealth()
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Error en health check:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Error al verificar el estado del servicio' 
    });
  }
});

// 7. Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Error interno del servidor' : err.message;
  
  res.status(statusCode).json({ 
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 8. Inicio del servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway corriendo en puerto ${PORT}`);
  console.log('Microservicios configurados:');
  console.log(`- Auth Service: http://auth-service:${process.env.AUTH_SERVICE_PORT || 3001}`);
  console.log(`- Business Service: http://business-service:${process.env.BUSINESS_SERVICE_PORT || 3002}`);
});

// 9. Manejo adecuado de cierre para Kubernetes
process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
