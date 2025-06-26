const API_CONFIG = {
  getBaseURL: function() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Detectar diferentes entornos
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isELB = hostname.includes('elb.amazonaws.com');
    const isLocalAWS = hostname.includes('atales.localaws');
    const isK8sDomain = hostname.includes('k8s-test-frontend');
    
    console.log('🔍 Detectando entorno:', { 
      hostname, 
      protocol, 
      port,
      isLocalhost, 
      isELB, 
      isLocalAWS,
      isK8sDomain 
    });
    
    // Desarrollo local
    if (isLocalhost) {
      return 'http://localhost:3000/api';
    }
    
    // Minikube o desarrollo local con port-forward
    if (hostname === '192.168.49.2' || port === '30000' || port === '30001') {
      return `${protocol}//${hostname}:3000/api`;
    }
    
    // AWS ELB, dominio personalizado o cualquier otro entorno
    // Usar ruta relativa para que funcione con Ingress
    return '/api';
  },
  
  isDevelopment: function() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           hostname === '192.168.49.2' ||
           window.location.protocol === 'file:';
  },
  
  getDefaultHeaders: function() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
  },
  
  // Función mejorada para manejar errores de API
  handleApiError: function(error) {
    console.error('🚨 API Error:', error);
    
    // Mostrar diferentes mensajes según el tipo de error
    if (error.status === 404) {
      console.error('❌ Endpoint no encontrado:', error.message);
    } else if (error.status === 500) {
      console.error('❌ Error interno del servidor:', error.message);
    } else if (error.status === 502) {
      console.error('❌ Bad Gateway - Problema de conectividad con el backend');
    } else if (error.status === 503) {
      console.error('❌ Servicio no disponible');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('❌ Error de red - No se puede conectar al servidor');
    }
    
    // Re-lanzar para manejo adicional
    throw error;
  },

  // Función para verificar conectividad
  checkHealth: async function() {
    try {
      const response = await fetch(`${this.getBaseURL()}/health`, {
        method: 'GET',
        headers: this.getDefaultHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Health check OK:', data);
        return data;
      } else {
        console.warn('⚠️ Health check failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Health check error:', error);
      return null;
    }
  }
};

// Configuración global
window.API_BASE_URL = API_CONFIG.getBaseURL();

// Logging inicial más detallado
console.log('🔧 Configuración API:');
console.log('   - Hostname:', window.location.hostname);
console.log('   - Protocol:', window.location.protocol);
console.log('   - Port:', window.location.port);
console.log('   - Full URL:', window.location.href);
console.log('   - API Base URL:', window.API_BASE_URL);
console.log('   - Development mode:', API_CONFIG.isDevelopment());

// Función mejorada para requests con mejor manejo de errores
window.apiRequest = async function(endpoint, options = {}) {
  const url = `${window.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const defaultOptions = {
    headers: API_CONFIG.getDefaultHeaders(),
    credentials: 'include',
    ...options
  };
  
  // Merge headers si se proporcionan opciones adicionales
  if (options.headers) {
    defaultOptions.headers = {
      ...API_CONFIG.getDefaultHeaders(),
      ...options.headers
    };
  }
  
  console.log(`🌐 API Request: ${defaultOptions.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, defaultOptions);
    
    // Log de la respuesta para debugging
    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorData = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn('⚠️ No se pudo parsear error como JSON:', parseError);
        }
      } else {
        // Si no es JSON, probablemente sea HTML (página de error)
        const textContent = await response.text();
        console.error('❌ Respuesta no-JSON recibida:', textContent.substring(0, 200));
        errorData = { 
          message: `HTTP ${response.status} - Respuesta no válida del servidor`,
          htmlResponse: textContent.substring(0, 500)
        };
      }
      
      const error = new Error(errorData.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    
    // Intentar parsear como JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // Si no es JSON, devolver como texto
      return await response.text();
    }
    
  } catch (error) {
    return API_CONFIG.handleApiError(error);
  }
};

// Función para debug - verificar conectividad al iniciar
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Verificando conectividad del API...');
  await API_CONFIG.checkHealth();
});

// Export para Node (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}
