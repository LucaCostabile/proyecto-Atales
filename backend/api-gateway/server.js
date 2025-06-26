const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const morgan = require('morgan');
const { checkMicroservicesHealth } = require('./health-checker');

// Configuración inicial
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 🛡️ Validación de Entorno ====================
const REQUIRED_ENV = [
  'AUTH_SERVICE_PORT', 
  'BUSINESS_SERVICE_PORT',
  'DB_HOST',
  'DB_NAME'
];

REQUIRED_ENV.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ ENV ERROR: ${env} no está definido`);
    process.exit(1);
  }
});

// ==================== 1. Middlewares Esenciales ====================
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// ==================== 2. Configuración CORS ====================
const allowedOrigins = [
  'http://localhost:3000',
  'https://atales.local',
  'http://atales.local',
  'http://192.168.49.2',
  process.env.FRONTEND_URL,
  // Permitir cualquier dominio ELB de AWS
  /\.elb\.amazonaws\.com$/
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ==================== 3. Rate Limiting ====================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { error: 'Demasiadas solicitudes. Intente más tarde.' },
  skip: req => req.ip === '::ffff:127.0.0.1' || req.path === '/api/health'
});
app.use(limiter);

// ==================== 4. Health Check ====================
app.get('/api/health', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    if (req.query.detailed === 'true') {
      healthData.dependencies = await checkMicroservicesHealth();
    }

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ==================== 5. Configuración de Proxies ====================
const proxyOptions = {
  changeOrigin: true,
  timeout: parseInt(process.env.PROXY_TIMEOUT) || 30000,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Forwarded-Host', req.hostname);
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
  },
  onError: (err, req, res) => {
    console.error(`Proxy error for ${req.path}:`, err);
    res.status(502).json({ 
      error: 'Bad Gateway',
      message: 'Error al conectar con el servicio interno'
    });
  }
};

// URLs de servicios
const SERVICES = {
  auth: `http://auth-service:${process.env.AUTH_SERVICE_PORT}`,
  business: `http://business-service:${process.env.BUSINESS_SERVICE_PORT}`
};

// Configuración de proxies
app.use('/api/auth', createProxyMiddleware({
  ...proxyOptions,
  target: SERVICES.auth,
  pathRewrite: { '^/api/auth': '' }
}));

app.use('/api/business', createProxyMiddleware({
  ...proxyOptions,
  target: SERVICES.business,
  pathRewrite: { '^/api/business': '' }
}));

// Proxy genérico (para compatibilidad)
app.use('/api', createProxyMiddleware({
  ...proxyOptions,
  target: SERVICES.business
}));

// ==================== 6. Manejo de Errores ====================
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const status = err.status || 500;
  const response = {
    error: err.message || 'Internal Server Error'
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(status).json(response);
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// ==================== 7. Inicio del Servidor ====================
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔌 Services:', JSON.stringify(SERVICES, null, 2));
});

// Manejo de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
