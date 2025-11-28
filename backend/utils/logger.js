// backend/utils/logger.js
const { query } = require('../database/postgres-connection');

/**
 * Função auxiliar para registrar log de atividade
 * @param {string} usuario - Nome do usuário que realizou a ação
 * @param {string} acao - Tipo de ação realizada ('CREATE', 'UPDATE', 'DELETE', etc)
 * @param {string} entidade - Tipo de entidade afetada ('marco', 'propriedade', 'cliente', etc)
 * @param {number} registro_id - ID do registro afetado
 * @param {string} descricao - Descrição detalhada da ação
 * @param {object} req - Objeto de requisição (opcional)
 */
async function registrarLog(usuario, acao, entidade, registro_id, descricao, req = null) {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim() : '127.0.0.1';
        const userAgent = req ? req.headers['user-agent'] : null;
        
        await query(`
            INSERT INTO logs_sistema (usuario, acao, entidade_afetada, registro_id, descricao, ip_origem, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [usuario, acao, entidade, registro_id, descricao, ip, userAgent]);
    } catch (error) {
        console.error('Erro ao registrar log:', error);
        // Não interrompe a operação principal se o log falhar
    }
}

module.exports = registrarLog;