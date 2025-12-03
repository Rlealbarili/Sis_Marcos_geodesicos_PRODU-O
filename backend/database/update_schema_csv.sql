-- Script de Migração para Importação Robusta
ALTER TABLE marcos_levantados 
ADD COLUMN IF NOT EXISTS status_validacao VARCHAR(50) DEFAULT 'PENDENTE', -- 'VALIDADO', 'PENDENTE', 'ERRO'
ADD COLUMN IF NOT EXISTS erro_validacao TEXT,                             -- JSON ou Texto com o motivo
ADD COLUMN IF NOT EXISTS lote_importacao VARCHAR(100);                    -- ID do lote para rastreio

CREATE INDEX IF NOT EXISTS idx_marcos_status_val ON marcos_levantados(status_validacao);