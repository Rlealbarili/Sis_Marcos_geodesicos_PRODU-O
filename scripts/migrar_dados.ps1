# Script de migração de dados para Windows (PowerShell) - Atualizado

Write-Host "Iniciando migração de dados..." -ForegroundColor Green

# 1. Certifique-se que os containers estão de pé
Write-Host "Subindo containers de produção..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# 2. Aguarde 15 segundos para os serviços iniciarem completamente
Write-Host "Aguardando inicialização dos serviços..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "Iniciando migração de dados da estrutura atualizada..." -ForegroundColor Green

# Função para verificar se o container está pronto
function Test-Container-Readiness {
    param([string]$containerName, [int]$timeout = 30)
    
    $count = 0
    while ($count -lt $timeout) {
        $status = docker exec -i $containerName pg_isready 2>$null
        if ($status -match "accepting connections") {
            return $true
        }
        Start-Sleep -Seconds 1
        $count++
    }
    return $false
}

# Verificar se o banco de dados está pronto
Write-Host "Verificando prontidão do banco de dados..." -ForegroundColor Yellow
if (Test-Container-Readiness "db_inventario_prod") {
    Write-Host "Banco de dados pronto para conexão." -ForegroundColor Green
    
    # Executar o dump e importação usando um script mais robusto
    $migration_script = @"
#!/bin/bash
set -e

# Configurar senha para conexão com banco antigo
export PGPASSWORD='marcos123'

echo "Conectando ao banco antigo para exportação..."

# Primeiro, verificar se tabelas existem no banco antigo
if pg_dump -h host.docker.internal -p 5434 -U postgres -d marcos_geodesicos --schema-only | grep -q "marcos_levantados"; then
    echo "Tabelas encontradas no banco antigo"
else
    echo "ERRO: Tabelas não encontradas no banco antigo"
    exit 1
fi

# Exportar dados das tabelas específicas
echo "Exportando dados do banco antigo..."
pg_dump -h host.docker.internal -p 5434 -U postgres -d marcos_geodesicos \
  --data-only \
  --column-inserts \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  -t clientes \
  -t propriedades \
  -t marcos_levantados \
  -t vertices > dados_exportados.sql

echo "Dados exportados com sucesso."

# Importar dados no novo banco
echo "Importando dados no novo banco..."
psql -U postgres -d marcos_geodesicos -f dados_exportados.sql

echo "Migração concluída com sucesso!"
"@

    # Executar o script de migração dentro do container do banco
    echo $migration_script | docker exec -i db_inventario_prod bash

    # Limpar arquivos temporários dentro do container
    docker exec -i db_inventario_prod bash -c "rm -f dados_exportados.sql 2>/dev/null || true"
    
    Write-Host "Migração Concluída!" -ForegroundColor Green
} else {
    Write-Host "ERRO: Banco de dados não ficou pronto dentro do tempo limite." -ForegroundColor Red
}