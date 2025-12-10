-- ============================================
-- PROTOCOLO BUNKER: Tabela de Utilizadores
-- Sistema COGEP - Sis_Marcos_Inventario
-- ============================================

-- Tabela de Utilizadores com RBAC e Segurança de Login
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    cargo VARCHAR(50) DEFAULT 'operador', -- Valores: 'admin', 'operador', 'visualizador'
    ultimo_login TIMESTAMP,
    ativo BOOLEAN DEFAULT true,
    
    -- Campos de Segurança Avançada (Protocolo AWS-Ready)
    deve_trocar_senha BOOLEAN DEFAULT true, -- Força troca no 1º acesso
    tentativas_falhas INTEGER DEFAULT 0,    -- Proteção contra Brute-force
    bloqueado_ate TIMESTAMP,                -- Lockout temporário
    reset_token VARCHAR(255),               -- Preparação para futuro reset
    reset_expires TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscas por email (otimização de login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela usuarios
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- NOTA: O usuário admin será criado via endpoint
-- POST /api/auth/setup-admin protegido por SETUP_SECRET
-- ============================================
