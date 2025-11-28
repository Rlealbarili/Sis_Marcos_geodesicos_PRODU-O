-- Script para criar tabela de logs do sistema
-- Criar tabela de logs
CREATE TABLE IF NOT EXISTS logs_sistema (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(255),
    acao VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', etc
    entidade_afetada VARCHAR(50) NOT NULL, -- 'marco', 'propriedade', 'cliente', etc
    registro_id INTEGER, -- ID do registro afetado
    descricao TEXT, -- Descrição detalhada da ação
    ip_origem VARCHAR(45), -- IP do cliente
    user_agent TEXT, -- Informações do navegador
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para melhorar performance de consultas por data e entidade
CREATE INDEX IF NOT EXISTS idx_logs_data_entidade ON logs_sistema (data_registro DESC, entidade_afetada);

-- Índice para consultas por usuário
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_sistema (usuario);