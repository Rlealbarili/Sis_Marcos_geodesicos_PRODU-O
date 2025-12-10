/**
 * ============================================
 * MIDDLEWARE DE AUTENTICAÇÃO - "O GUARDA"
 * Sistema COGEP - Protocolo Bunker
 * ============================================
 */

const jwt = require('jsonwebtoken');

// Chave secreta para JWT (deve estar no .env em produção)
const JWT_SECRET = process.env.JWT_SECRET || 'COGEP_BUNKER_SECRET_2024';

/**
 * Middleware de autenticação JWT
 * Verifica o token no header Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Token não fornecido',
            code: 'NO_TOKEN'
        });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            error: 'Formato de token inválido',
            code: 'INVALID_FORMAT'
        });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Injetar dados do usuário na requisição (inclui cliente_id para Multi-Tenant)
        req.user = {
            id: decoded.id,
            email: decoded.email,
            cargo: decoded.cargo,
            nome: decoded.nome,
            cliente_id: decoded.cliente_id, // CAMPO CRÍTICO MULTI-TENANT
            deve_trocar_senha: decoded.deve_trocar_senha
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            error: 'Token inválido',
            code: 'INVALID_TOKEN'
        });
    }
};

/**
 * Middleware para verificar cargos específicos
 * @param {string[]} cargosPermitidos - Array de cargos permitidos
 */
const requireRole = (cargosPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Usuário não autenticado',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (!cargosPermitidos.includes(req.user.cargo)) {
            return res.status(403).json({
                error: 'Acesso negado. Cargo insuficiente.',
                code: 'FORBIDDEN',
                required: cargosPermitidos,
                current: req.user.cargo
            });
        }

        next();
    };
};

/**
 * Middleware opcional - permite acesso sem token mas anexa user se houver
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return next();
    }

    try {
        const decoded = jwt.verify(parts[1], JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            cargo: decoded.cargo,
            nome: decoded.nome,
            cliente_id: decoded.cliente_id,
            deve_trocar_senha: decoded.deve_trocar_senha
        };
    } catch (error) {
        // Token inválido, mas continua sem user
    }

    next();
};

module.exports = {
    authMiddleware,
    requireRole,
    optionalAuth,
    JWT_SECRET
};
