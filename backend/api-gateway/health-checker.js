const axios = require('axios');

const HEALTH_CHECK_TIMEOUT = 2000; // 2 segundos máximo

async function checkMicroservicesHealth() {
  const services = [
    {
      name: 'auth-service',
      url: `http://auth-service:${process.env.AUTH_SERVICE_PORT || 3001}/health`
    },
    {
      name: 'business-service', 
      url: `http://business-service:${process.env.BUSINESS_SERVICE_PORT || 3002}/health`
    }
  ];

  const results = await Promise.allSettled(
    services.map(async (service) => {
      try {
        const response = await axios.get(service.url, {
          timeout: HEALTH_CHECK_TIMEOUT,
          validateStatus: (status) => status < 500 // Considerar 4xx como OK
        });
        
        return {
          name: service.name,
          status: 'healthy',
          responseTime: response.duration || 0
        };
      } catch (error) {
        return {
          name: service.name,
          status: 'unhealthy',
          error: error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message
        };
      }
    })
  );

  return results.reduce((acc, result, index) => {
    const serviceName = services[index].name;
    acc[serviceName] = result.status === 'fulfilled' ? result.value : {
      name: serviceName,
      status: 'error',
      error: result.reason?.message || 'Unknown error'
    };
    return acc;
  }, {});
}

module.exports = { checkMicroservicesHealth };
