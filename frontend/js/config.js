const API_CONFIG = {
  getBaseURL: function() {
    const { hostname, protocol } = window.location;

    // Si estamos en AWS ELB del frontend, debemos apuntar al LoadBalancer del API
    if (hostname.includes('elb.amazonaws.com')) {
      return 'http://k8s-test-apigatew-7dc1118d7f-57b70f1b72a49ae8.elb.us-east-1.amazonaws.com.elb.amazonaws.com/api'; 
      // ⚠️ Acá reemplazá <API-GATEWAY-LB-DNS> por el DNS del LoadBalancer del API Gateway
    }

    // Modo desarrollo local
    if (this.isDevelopment()) {
      return 'http://localhost:3000/api'; 
    }

    // Si estás en una red local o dominio personalizado
    return '/api'; 
  },

  isDevelopment: function() {
    const { hostname, protocol } = window.location;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           protocol === 'file:';
  },

  getDefaultHeaders: function() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
  },

  handleApiError: async function(response) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text() };
    }

    const error = new Error(errorData.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = errorData;

    console.error('API Error:', {
      status: response.status,
      url: response.url,
      error: errorData
    });

    throw error;
  }
};

// ✅ Configuración global
window.API_BASE_URL = API_CONFIG.getBaseURL();

// ✅ Función para requests
window.apiRequest = async function(endpoint, options = {}) {
  const url = `${window.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const config = {
    method: 'GET',
    headers: API_CONFIG.getDefaultHeaders(),
    credentials: 'include',
    ...options,
    headers: {
      ...API_CONFIG.getDefaultHeaders(),
      ...(options.headers || {})
    }
  };

  if (options.body) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  console.log(`🌐 API Request: ${config.method} ${url}`);

  const response = await fetch(url, config);

  if (!response.ok) {
    return API_CONFIG.handleApiError(response);
  }

  return response.json();
};

// ✅ Debug inicial
console.log('🔧 Configuración API:', {
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  apiBaseUrl: window.API_BASE_URL,
  isDevelopment: API_CONFIG.isDevelopment()
});
