const API_CONFIG = {
  getBaseURL: function () {
    // 🚨 Forzar el uso directo del LoadBalancer del API Gateway
    return 'http://k8s-test-apigatew-2abcee9251-75e6251ee384788d.elb.us-east-1.amazonaws.com/api';
  },

  getDefaultHeaders: function () {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
  },

  handleApiError: async function (response) {
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
window.apiRequest = async function (endpoint, options = {}) {
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

// ✅ Log para confirmar que se está usando la URL correcta
console.log('🔧 Configuración API:', {
  apiBaseUrl: window.API_BASE_URL
});
