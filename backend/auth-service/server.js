const express = require('express');
const bodyParser = require('body-parser');
const auth = require('./backend/auth');
const rest = require('./backend/rest');

const app = express();
const PORT = process.env.PORT || 3001;

// Health checkss
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'auth-service' });
});

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Rutas de autenticación
app.use('/auth', auth);
app.use('/reset', rest);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Error interno del servidor de autenticación' 
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service corriendo en puerto ${PORT}`);
});

module.exports = app;


