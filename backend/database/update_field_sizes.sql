-- Script para atualizar os tamanhos dos campos no banco de dados existente
-- Este script deve ser executado após a migração inicial para corrigir os tamanhos dos campos

-- Atualizar campos na tabela propriedades
ALTER TABLE propriedades ALTER COLUMN nome_propriedade TYPE VARCHAR(1000);
ALTER TABLE propriedades ALTER COLUMN matricula TYPE VARCHAR(500);
ALTER TABLE propriedades ALTER COLUMN municipio TYPE VARCHAR(500);
ALTER TABLE propriedades ALTER COLUMN comarca TYPE VARCHAR(500);

-- Atualizar campos na tabela marcos_levantados
ALTER TABLE marcos_levantados ALTER COLUMN codigo TYPE VARCHAR(200);
ALTER TABLE marcos_levantados ALTER COLUMN metodo TYPE VARCHAR(500);
ALTER TABLE marcos_levantados ALTER COLUMN fonte TYPE VARCHAR(500);
ALTER TABLE marcos_levantados ALTER COLUMN lote TYPE VARCHAR(200);

-- Atualizar campos na tabela clientes
ALTER TABLE clientes ALTER COLUMN nome TYPE VARCHAR(1000);
ALTER TABLE clientes ALTER COLUMN email TYPE VARCHAR(1000);

-- Atualizar campos na tabela vertices
ALTER TABLE vertices ALTER COLUMN nome TYPE VARCHAR(200);