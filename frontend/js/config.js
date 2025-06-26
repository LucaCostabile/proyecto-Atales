const API_CONFIG = {
  getBaseURL: function() {
    if (window.location.protocol === 'http:') {
      return '/api';
    }
    // Para desarrollo local
    return 'http://localhost:3000/api';
  }
};
window.API_BASE_URL = API_CONFIG.getBaseURL();
console.log('🔧 API Base URL:', window.API_BASE_URL);
