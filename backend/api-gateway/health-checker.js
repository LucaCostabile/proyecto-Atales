const axios = require('axios');

async function checkMicroservicesHealth() {
  const services = [
    { name: 'auth-service', url: 'http://auth-service:3001/health' },
    { name: 'business-service', url: 'http://business-service:3002/health' }
  ];

  const results = {};
  
  await Promise.all(services.map(async (service) => {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      results[service.name] = response.data.status === 'healthy' ? 'healthy' : 'unhealthy';
    } catch (error) {
      console.error(`Health check failed for ${service.name}:`, error.message);
      results[service.name] = 'unreachable';
    }
  }));

  return results;
}

module.exports = { checkMicroservicesHealth };
