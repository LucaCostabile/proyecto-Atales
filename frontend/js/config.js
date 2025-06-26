const API_CONFIG = {
  getBaseURL: function() {
    // Detectar automáticamente el entorno
    const isProduction = !this.isDevelopment();
    const isELB = window.location.hostname.includes('elb.amazonaws.com');
    
    // En producción (AWS ELB o dominio real)
    if (isProduction || isELB) {
      return '/api'; // Usar ruta relativa
    }
    
    // Para desarrollo local
    return 'http://localhost:3000/api';
  },
  
  isDevelopment: function() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
  },
  
  getDefaultHeaders: function() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  },
  
  // Nueva función para manejar errores de API
  handleApiError: function(error) {
    console.error('API Error:', error);
    // Aquí puedes agregar lógica para mostrar notificaciones al usuario
    throw error; // Re-lanzar para manejo adicional
  }
};

// Configuración global
window.API_BASE_URL = API_CONFIG.getBaseURL();

// Logging inicial
console.log('🔧 Configuración API:');
console.log('   - Hostname:', window.location.hostname);
console.log('   - Protocol:', window.location.protocol);
console.log('   - API Base URL:', window.API_BASE_URL);
console.log('   - Development mode:', API_CONFIG.isDevelopment());

// Función mejorada para requests
window.apiRequest = async function(endpoint, options = {}) {
  const url = `${window.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const defaultOptions = {
    headers: API_CONFIG.getDefaultHeaders(),
    credentials: 'include',
    ...options
  };
  
  console.log(`🌐 API Request: ${defaultOptions.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    
    return await response.json();
    
  } catch (error) {
    return API_CONFIG.handleApiError(error);
  }
};

// Export para Node (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}
