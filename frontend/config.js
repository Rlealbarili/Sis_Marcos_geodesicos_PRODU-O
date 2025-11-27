/**
 * Configuração Global da API
 * Detecta automaticamente o host baseado na URL atual
 */

// Detectar host automaticamente
const API_HOST = window.location.hostname;
const API_PORT = '3001';
const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api`;

console.log('🔧 Configuração da API carregada:');
console.log(`   Host detectado: ${API_HOST}`);
console.log(`   Base URL: ${API_BASE_URL}`);

// Exportar para uso global
window.API_CONFIG = {
    HOST: API_HOST,
    PORT: API_PORT,
    BASE_URL: API_BASE_URL
};
