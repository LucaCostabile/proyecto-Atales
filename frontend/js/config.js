const API_CONFIG = {
  getBaseURL: function() {
    // En producción (cuando está servido desde el mismo dominio)
    // siempre usar rutas relativas que van a través del Ingress
    if (window.location.hostname === 'atales.local') {
      return '/api';
    }
    
    // Para desarrollo local (cuando abres index.html directamente)
    if (window.location.protocol === 'file:') {
      return 'https://atales.local/api';
    }
    
    // Para desarrollo con servidor local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.protocol === 'https:' 
        ? 'https://localhost:3000/api' 
        : 'http://localhost:3000/api';
    }
    
    // Fallback: usar el mismo protocolo y host actual
    return `/api`;
  },
  
  // Configuración adicional para debugging
  isDevelopment: function() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
  },
  
  // Headers por defecto para las requests
  getDefaultHeaders: function() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
};

// Configurar la URL base global
window.API_BASE_URL = API_CONFIG.getBaseURL();

// Logging para debugging
console.log('🔧 Configuración API:');
console.log('   - Hostname:', window.location.hostname);
console.log('   - Protocol:', window.location.protocol);
console.log('   - API Base URL:', window.API_BASE_URL);
console.log('   - Development mode:', API_CONFIG.isDevelopment());

// Función helper para hacer requests con manejo de errores
window.apiRequest = async function(endpoint, options = {}) {
  const url = `${window.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const defaultOptions = {
    headers: {
      ...API_CONFIG.getDefaultHeaders(),
      ...options.headers
    },
    credentials: 'include' // Para cookies de sesión
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  console.log(`🌐 API Request: ${finalOptions.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Success: ${finalOptions.method || 'GET'} ${url}`);
    return data;
    
  } catch (error) {
    console.error(`💥 Request failed:`, error);
    throw error;
  }
};

// Export para usar en otros archivos si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}
