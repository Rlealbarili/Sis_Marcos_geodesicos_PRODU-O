/**
 * ============================================
 * ROTAS DE AUTENTICAÇÃO - Protocolo Bunker
 * Sistema COGEP - Sis_Marcos_Inventario
 * ============================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, pool } = require('../database/postgres-connection');
const { authMiddleware, requireRole, JWT_SECRET } = require('../middleware/auth-middleware');

// Configurações
const JWT_EXPIRATION = '24h';
const MAX_TENTATIVAS = 5;
const LOCKOUT_MINUTOS = 15;
const SETUP_SECRET = process.env.SETUP_SECRET || 'COGEP_SETUP_2024';

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Buscar usuário
        const result = await query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Credenciais inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const usuario = result.rows[0];

        // Verificar se está ativo
        if (!usuario.ativo) {
            return res.status(401).json({
                error: 'Conta desativada. Contate o administrador.',
                code: 'ACCOUNT_DISABLED'
            });
        }

        // Verificar bloqueio por tentativas excessivas
        if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
            const minutosRestantes = Math.ceil(
                (new Date(usuario.bloqueado_ate) - new Date()) / 60000
            );
            return res.status(429).json({
                error: `Conta bloqueada. Tente novamente em ${minutosRestantes} minuto(s).`,
                code: 'ACCOUNT_LOCKED',
                bloqueado_ate: usuario.bloqueado_ate
            });
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaValida) {
            // Incrementar tentativas falhas
            const novasTentativas = (usuario.tentativas_falhas || 0) + 1;

            if (novasTentativas >= MAX_TENTATIVAS) {
                // Bloquear conta
                const bloqueioAte = new Date(Date.now() + LOCKOUT_MINUTOS * 60000);
                await query(
                    `UPDATE usuarios 
                     SET tentativas_falhas = $1, bloqueado_ate = $2 
                     WHERE id = $3`,
                    [novasTentativas, bloqueioAte, usuario.id]
                );
                return res.status(429).json({
                    error: `Conta bloqueada por ${LOCKOUT_MINUTOS} minutos após ${MAX_TENTATIVAS} tentativas falhas.`,
                    code: 'ACCOUNT_LOCKED'
                });
            } else {
                await query(
                    'UPDATE usuarios SET tentativas_falhas = $1 WHERE id = $2',
                    [novasTentativas, usuario.id]
                );
                return res.status(401).json({
                    error: 'Credenciais inválidas',
                    code: 'INVALID_CREDENTIALS',
                    tentativas_restantes: MAX_TENTATIVAS - novasTentativas
                });
            }
        }

        // Login bem-sucedido - resetar tentativas e atualizar último login
        await query(
            `UPDATE usuarios 
             SET tentativas_falhas = 0, bloqueado_ate = NULL, ultimo_login = NOW() 
             WHERE id = $1`,
            [usuario.id]
        );

        // Gerar token JWT (inclui cliente_id para Multi-Tenant)
        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                cargo: usuario.cargo,
                nome: usuario.nome,
                cliente_id: usuario.cliente_id, // CAMPO CRÍTICO MULTI-TENANT
                deve_trocar_senha: usuario.deve_trocar_senha
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.json({
            success: true,
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                cargo: usuario.cargo,
                cliente_id: usuario.cliente_id, // MULTI-TENANT
                deve_trocar_senha: usuario.deve_trocar_senha
            }
        });

    } catch (error) {
        console.error('Erro em /api/auth/login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// POST /api/auth/setup-admin
// Criação do primeiro administrador (protegido por SETUP_SECRET)
// ============================================
router.post('/setup-admin', async (req, res) => {
    try {
        const { nome, email, senha, setup_secret } = req.body;

        // Validar chave secreta de setup
        if (setup_secret !== SETUP_SECRET) {
            return res.status(403).json({
                error: 'Chave de setup inválida',
                code: 'INVALID_SETUP_KEY'
            });
        }

        if (!nome || !email || !senha) {
            return res.status(400).json({
                error: 'Nome, email e senha são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        // Validar força da senha
        if (senha.length < 8) {
            return res.status(400).json({
                error: 'Senha deve ter no mínimo 8 caracteres',
                code: 'WEAK_PASSWORD'
            });
        }

        // Verificar se já existe admin
        const existeAdmin = await query(
            "SELECT id FROM usuarios WHERE cargo = 'admin' LIMIT 1"
        );

        if (existeAdmin.rows.length > 0) {
            return res.status(409).json({
                error: 'Já existe um administrador cadastrado',
                code: 'ADMIN_EXISTS'
            });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Criar admin
        const result = await query(
            `INSERT INTO usuarios (nome, email, senha_hash, cargo, deve_trocar_senha) 
             VALUES ($1, $2, $3, 'admin', false) 
             RETURNING id, nome, email, cargo`,
            [nome.trim(), email.toLowerCase().trim(), senhaHash]
        );

        res.status(201).json({
            success: true,
            message: 'Administrador criado com sucesso',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Erro em /api/auth/setup-admin:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                error: 'Email já cadastrado',
                code: 'EMAIL_EXISTS'
            });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// POST /api/auth/change-password
// Troca de senha (obrigatória no primeiro acesso)
// ============================================
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { senha_atual, nova_senha } = req.body;

        if (!senha_atual || !nova_senha) {
            return res.status(400).json({
                error: 'Senha atual e nova senha são obrigatórias',
                code: 'MISSING_FIELDS'
            });
        }

        // Validar força da nova senha
        if (nova_senha.length < 8) {
            return res.status(400).json({
                error: 'Nova senha deve ter no mínimo 8 caracteres',
                code: 'WEAK_PASSWORD'
            });
        }

        // Buscar usuário atual
        const result = await query(
            'SELECT senha_hash FROM usuarios WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const senhaValida = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
        if (!senhaValida) {
            return res.status(401).json({
                error: 'Senha atual incorreta',
                code: 'WRONG_PASSWORD'
            });
        }

        // Hash da nova senha
        const novaHash = await bcrypt.hash(nova_senha, 10);

        // Atualizar senha e remover flag de troca obrigatória
        await query(
            `UPDATE usuarios 
             SET senha_hash = $1, deve_trocar_senha = false 
             WHERE id = $2`,
            [novaHash, req.user.id]
        );

        // Gerar novo token (sem flag de troca)
        const token = jwt.sign(
            {
                id: req.user.id,
                email: req.user.email,
                cargo: req.user.cargo,
                deve_trocar_senha: false
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );

        res.json({
            success: true,
            message: 'Senha alterada com sucesso',
            token
        });

    } catch (error) {
        console.error('Erro em /api/auth/change-password:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// GET /api/auth/me
// Perfil do usuário logado
// ============================================
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, nome, email, cargo, ultimo_login, deve_trocar_senha, created_at 
             FROM usuarios WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro em /api/auth/me:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// POST /api/auth/register (Admin only)
// Criar novo usuário com senha temporária - MULTI-TENANT
// ============================================
router.post('/register', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const { nome, email, cargo = 'operador', cliente_id } = req.body;

        if (!nome || !email) {
            return res.status(400).json({
                error: 'Nome e email são obrigatórios',
                code: 'MISSING_FIELDS'
            });
        }

        // Validar cargo
        const cargosValidos = ['admin', 'operador', 'visualizador'];
        if (!cargosValidos.includes(cargo)) {
            return res.status(400).json({
                error: 'Cargo inválido',
                code: 'INVALID_ROLE',
                validos: cargosValidos
            });
        }

        // BLINDAGEM MULTI-TENANT (Protocolo Petrovich):
        // Usuários não-admin DEVEM ter cliente_id vinculado
        // Para criar usuários, use /provision-tenant (cria empresa + usuário juntos)
        if (cargo !== 'admin' && !cliente_id) {
            return res.status(400).json({
                error: 'Tentativa de criar usuário órfão. Informe o ID do cliente ou use /provision-tenant.',
                code: 'ORPHAN_USER_BLOCKED',
                hint: 'Use POST /api/auth/provision-tenant para criar empresa + usuário juntos'
            });
        }

        // Gerar senha temporária (Mudar + 4 dígitos)
        const tempPassword = 'Mudar' + Math.floor(1000 + Math.random() * 9000);

        // Hash da senha temporária
        const senhaHash = await bcrypt.hash(tempPassword, 10);

        // Criar usuário (deve_trocar_senha = true para novos)
        const result = await query(
            `INSERT INTO usuarios (nome, email, senha_hash, cargo, cliente_id, deve_trocar_senha) 
             VALUES ($1, $2, $3, $4, $5, true) 
             RETURNING id, nome, email, cargo, cliente_id, created_at`,
            [nome.trim(), email.toLowerCase().trim(), senhaHash, cargo, cliente_id || null]
        );

        // RETORNA A SENHA TEMPORÁRIA PARA O ADMIN COPIAR
        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            usuario: result.rows[0],
            tempPassword: tempPassword // Admin deve copiar e enviar ao usuário
        });

    } catch (error) {
        console.error('Erro em /api/auth/register:', error);
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Email já cadastrado',
                code: 'EMAIL_EXISTS'
            });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// GET /api/auth/users (Admin only)
// Listar todos os usuários
// ============================================
router.get('/users', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const result = await query(
            `SELECT id, nome, email, cargo, ativo, ultimo_login, deve_trocar_senha, created_at 
             FROM usuarios 
             ORDER BY created_at DESC`
        );

        res.json({
            total: result.rows.length,
            usuarios: result.rows
        });

    } catch (error) {
        console.error('Erro em /api/auth/users:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// PUT /api/auth/users/:id/toggle-active (Admin only)
// Ativar/desativar usuário
// ============================================
router.put('/users/:id/toggle-active', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Não permitir desativar a si mesmo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                error: 'Você não pode desativar sua própria conta',
                code: 'SELF_DEACTIVATION'
            });
        }

        const result = await query(
            `UPDATE usuarios 
             SET ativo = NOT ativo 
             WHERE id = $1 
             RETURNING id, nome, email, ativo`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({
            success: true,
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error('Erro em /api/auth/users/:id/toggle-active:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// POST /api/auth/admin/reset-password (Admin only)
// Resetar senha de um usuário
// ============================================
router.post('/admin/reset-password', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                error: 'ID do usuário é obrigatório',
                code: 'MISSING_ID'
            });
        }

        // Não permitir resetar a própria senha (deve usar change-password)
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                error: 'Use a opção "Alterar Senha" para modificar sua própria senha',
                code: 'SELF_RESET'
            });
        }

        // Gerar senha temporária (Reset + 4 dígitos)
        const tempPassword = 'Reset' + Math.floor(1000 + Math.random() * 9000);

        // Hash da senha
        const hash = await bcrypt.hash(tempPassword, 10);

        // Atualizar senha e forçar troca no próximo login
        const result = await query(
            `UPDATE usuarios 
             SET senha_hash = $1, deve_trocar_senha = true, tentativas_falhas = 0, bloqueado_ate = NULL 
             WHERE id = $2 
             RETURNING id, nome, email`,
            [hash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({
            success: true,
            message: 'Senha resetada com sucesso',
            usuario: result.rows[0],
            tempPassword: tempPassword // Admin deve copiar e enviar ao usuário
        });

    } catch (error) {
        console.error('Erro em /api/auth/admin/reset-password:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================
// POST /api/auth/provision-tenant (Admin only)
// PROVISIONAMENTO ATÔMICO: Cria Cliente + Usuário em transação única
// Protocolo Petrovich - Evita usuários órfãos
// ============================================
router.post('/provision-tenant', authMiddleware, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            nome_empresa,
            cpf_cnpj,
            email_empresa,
            nome_usuario,
            email_usuario
        } = req.body;

        // Validações
        if (!nome_empresa || !nome_usuario || !email_usuario) {
            return res.status(400).json({
                error: 'Campos obrigatórios: nome_empresa, nome_usuario, email_usuario',
                code: 'MISSING_FIELDS'
            });
        }

        // Gerar senha temporária
        const tempPassword = 'Mudar' + Math.floor(1000 + Math.random() * 9000);
        const senhaHash = await bcrypt.hash(tempPassword, 10);

        // TRANSAÇÃO ATÔMICA - BEGIN
        await client.query('BEGIN');

        // PASSO 1: Criar Cliente (Empresa)
        const clienteResult = await client.query(
            `INSERT INTO clientes (nome, cpf_cnpj, email, ativo) 
             VALUES ($1, $2, $3, true) 
             RETURNING id, nome`,
            [nome_empresa.trim(), cpf_cnpj || null, email_empresa || null]
        );
        const novoClienteId = clienteResult.rows[0].id;
        console.log(`[Provision] Cliente criado: ID ${novoClienteId} - ${nome_empresa}`);

        // PASSO 2: Criar Usuário já vinculado ao Cliente
        const usuarioResult = await client.query(
            `INSERT INTO usuarios (nome, email, senha_hash, cargo, cliente_id, deve_trocar_senha) 
             VALUES ($1, $2, $3, 'operador', $4, true) 
             RETURNING id, nome, email, cargo, cliente_id`,
            [nome_usuario.trim(), email_usuario.toLowerCase().trim(), senhaHash, novoClienteId]
        );
        console.log(`[Provision] Usuário criado: ID ${usuarioResult.rows[0].id} vinculado ao Cliente ${novoClienteId}`);

        // COMMIT - Ambos foram criados com sucesso
        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Tenant provisionado com sucesso!',
            empresa: {
                id: novoClienteId,
                nome: nome_empresa
            },
            usuario: usuarioResult.rows[0],
            tempPassword: tempPassword // Admin deve copiar e enviar ao cliente
        });

    } catch (error) {
        // ROLLBACK - Se qualquer erro, desfaz tudo
        await client.query('ROLLBACK');
        console.error('Erro em /api/auth/provision-tenant:', error);

        if (error.code === '23505') {
            // Violação de unicidade
            if (error.constraint?.includes('cpf_cnpj')) {
                return res.status(409).json({
                    error: 'CPF/CNPJ já cadastrado',
                    code: 'CNPJ_EXISTS'
                });
            }
            if (error.constraint?.includes('email')) {
                return res.status(409).json({
                    error: 'Email já cadastrado',
                    code: 'EMAIL_EXISTS'
                });
            }
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// ============================================
// GET /api/auth/clientes-list (Admin only)
// Lista simplificada de clientes para select
// ============================================
router.get('/clientes-list', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const result = await query(
            'SELECT id, nome, cpf_cnpj FROM clientes WHERE ativo = true ORDER BY nome ASC'
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Erro em /api/auth/clientes-list:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
