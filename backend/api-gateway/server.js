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

// ==================== 1. Validación de Entorno ====================
const REQUIRED_ENV = ['AUTH_SERVICE_PORT', 'BUSINESS_SERVICE_PORT', 'DB_HOST', 'DB_NAME'];
REQUIRED_ENV.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ ENV ERROR: ${env} no está definido`);
    process.exit(1);
  }
});

// ==================== 2. Middlewares Esenciales ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// ==================== 3. Configuración CORS Ampliada ====================
const allowedOrigins = [
  'http://localhost:3000',
  'https://atales.local', 
  'http://atales.local',
  'http://192.168.49.2',
  process.env.FRONTEND_URL,
  /\.elb\.amazonaws\.com$/,
  /\.elb\.us-east-1\.amazonaws\.com$/
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqueado: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ==================== 4. Rate Limiting ====================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { error: 'Too many requests' },
  skip: req => req.ip === '::ffff:127.0.0.1' || req.path === '/api/health'
});
app.use(limiter);

// ==================== 5. Configuración de Proxies Mejorada ====================
const proxyOptions = {
  changeOrigin: true,
  timeout: parseInt(process.env.PROXY_TIMEOUT) || 30000,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Forwarded-Host', req.hostname);
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
    
    // Manejo especial para body en POST/PUT
    if (['POST', 'PUT'].includes(req.method) {
      if (req.body && !req.bodyRead) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        req.bodyRead = true;
      }
    }
  },
  onError: (err, req, res) => {
    console.error(`Proxy error for ${req.path}:`, err);
    res.status(502).json({ 
      error: 'Bad Gateway',
      message: 'Error connecting to internal service'
    });
  }
};

// Configuración específica para auth-service
app.use('/api/auth', createProxyMiddleware({
  ...proxyOptions,
  target: `http://auth-service:${process.env.AUTH_SERVICE_PORT}`,
  pathRewrite: { '^/api/auth': '' }
}));

// Configuración para business-service
app.use('/api/business', createProxyMiddleware({
  ...proxyOptions,
  target: `http://business-service:${process.env.BUSINESS_SERVICE_PORT}`,
  pathRewrite: { '^/api/business': '' }
}));

// Health Check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  };
  
  if (req.query.detailed) {
    health.dependencies = await checkMicroservicesHealth();
  }
  
  res.json(health);
});

// ==================== 6. Manejo de Errores ====================
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ==================== 7. Inicio del Servidor ====================
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log('🔌 Proxies configurados:');
  console.log(`- /api/auth -> auth-service:${process.env.AUTH_SERVICE_PORT}`);
  console.log(`- /api/business -> business-service:${process.env.BUSINESS_SERVICE_PORT}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  server.close(() => process.exit(0));
});

module.exports = app;
