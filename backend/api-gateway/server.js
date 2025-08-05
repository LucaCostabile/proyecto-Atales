const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const morgan = require('morgan');
const { checkMicroservicesHealth } = require('./health-checker');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ Validación defensiva de entornoss
if (!process.env.AUTH_SERVICE_PORT) {
  console.error('❌ ENV ERROR: AUTH_SERVICE_PORT no está definido');
  process.exit(1); // Salir si falta variable crítica
}
if (!process.env.BUSINESS_SERVICE_PORT) {
  console.error('❌ ENV ERROR: BUSINESS_SERVICE_PORT no está definido');
  process.exit(1);
}
if (!process.env.FRONTEND_URL) {
  console.warn('⚠️ FRONTEND_URL no definido: se omitirá en CORS');
}

// 1. Seguridad y monitoreo
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
app.use(helmet());
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

// 2. CORS
const allowedOrigins = [
  'http://localhost:3000',
  'https://atales.local',
  'http://atales.local',
  'http://192.168.49.2',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { error: 'Demasiadas solicitudes. Intente más tarde.' },
  skip: (req) => {
    const userAgent = req.get('User-Agent') || '';
    return userAgent.includes('kube-probe') || req.path.startsWith('/api/health');
  }
});
app.use(generalLimiter);

// 4. Logging de solicitudes
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// 5. Health check optimizado
app.get('/api/health', async (req, res) => {
  const startTime = process.hrtime();
  
  const basicHealth = {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  try {
    if (req.query.detailed === 'true') {
      const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 3000;
      
      try {
        const depsHealth = await Promise.race([
          checkMicroservicesHealth(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), timeout);
          })
        ]);
        basicHealth.dependencies = depsHealth;
      } catch (depError) {
        basicHealth.dependencies = { error: depError.message };
      }
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    basicHealth.responseTime = `${seconds}.${nanoseconds.toString().padStart(9, '0')}s`;
    
    res.status(200).json(basicHealth);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Internal health check error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 6. Configuración robusta de proxies
const proxyDefaults = {
  changeOrigin: true,
  proxyTimeout: parseInt(process.env.PROXY_TIMEOUT) || 30000,
  timeout: parseInt(process.env.PROXY_TIMEOUT) || 30000,
  secure: false,
  logLevel: 'debug',
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('X-Forwarded-Proto', 'https');
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
  },
  onError: (err, req, res) => {
    console.error(`💥 Proxy error ${req.path}:`, err.message);
    res.status(502).json({ 
      success: false, 
      error: 'Error de conexión con servicio interno',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const createServiceProxy = (path, target, rewritePath = '') => {
  if (!target) {
    throw new Error(`Target no definido para ${path}`);
  }

  console.log(`🔌 Proxy config: ${path} → ${target} (rewrite: '${rewritePath}')`);

  return createProxyMiddleware({
    ...proxyDefaults,
    target,
    pathRewrite: { [`^${path}`]: rewritePath },
    onProxyReq: (proxyReq, req) => {  // ¡Asegúrate de recibir el parámetro req!
      proxyReq.setHeader('X-Forwarded-Proto', 'https');
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host);  // Usa req del parámetro
      console.log(`🔄 Proxying: ${req.method} ${req.originalUrl}`);
    }
  });
};

// 7. URLs de servicios (con validación)
const AUTH_SERVICE_URL = `http://auth-service:${process.env.AUTH_SERVICE_PORT}`;
const BUSINESS_SERVICE_URL = `http://business-service:${process.env.BUSINESS_SERVICE_PORT}`;

console.log('✅ URLs de servicios configuradas:');
console.log(`  - Auth: ${AUTH_SERVICE_URL}`);
console.log(`  - Business: ${BUSINESS_SERVICE_URL}`);

// 8. Configuración de rutas proxy
app.use('/api/auth', createServiceProxy('/api/auth', AUTH_SERVICE_URL, '/auth'));
app.use('/api/reset', createServiceProxy('/api/reset', AUTH_SERVICE_URL, '/reset'));
app.use('/api', createServiceProxy('/api', BUSINESS_SERVICE_URL, ''));

// 9. Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  if (err.message.includes('CORS')) {
    return res.status(403).json({ 
      success: false, 
      error: 'Acceso denegado por política CORS',
      origin: req.get('Origin')
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Error interno del servidor' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 10. Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// 11. Inicio del servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway en puerto ${PORT}`);
  console.log('🔧 Configuración:');
  console.log(`- Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- Límite de tasa: ${generalLimiter.max} req/${generalLimiter.windowMs/60000}min`);
});

// 12. Manejo de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM. Cerrando...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;

//commit dev
