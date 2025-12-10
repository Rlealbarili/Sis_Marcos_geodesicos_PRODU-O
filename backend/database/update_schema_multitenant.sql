-- ---------------------------------------------------------
-- MIGRACAO MULTI-TENANT (PROTOCOL SIS_MARCOS)
-- Data: 2025-12-10
-- Objetivo: Vincular dados orfãos aos seus respectivos donos (Clientes)
-- ---------------------------------------------------------

-- 1. TABELA USUÁRIOS (Quem é o dono deste login?)
-- Se cliente_id for NULL, é um Super-Admin ou Operador do Sistema.
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id);

CREATE INDEX IF NOT EXISTS idx_usuarios_cliente ON usuarios(cliente_id);


-- 2. TABELA MARCOS LEVANTADOS (O ativo principal)
-- Cada marco deve pertencer a um cliente para não aparecer no mapa do vizinho.
ALTER TABLE marcos_levantados 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id);

CREATE INDEX IF NOT EXISTS idx_marcos_cliente ON marcos_levantados(cliente_id);


-- 3. TABELA LOGS DE SISTEMA (Auditoria)
-- Permite entregar relatórios de atividade específicos para cada empresa.
ALTER TABLE logs_sistema 
ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id);

CREATE INDEX IF NOT EXISTS idx_logs_cliente ON logs_sistema(cliente_id);

-- ---------------------------------------------------------
-- FIM DA MIGRACAO
-- ---------------------------------------------------------
