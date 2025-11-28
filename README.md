# Sistema de Inventário de Marcos Geodésicos

## Visão Geral

Este é o sistema de inventário de marcos geodésicos, propriedades e clientes. O sistema permite catalogar, visualizar e gerenciar marcos geodésicos com funcionalidades de georreferenciamento e importação de dados de memorial descritivo.

## Infraestrutura de Produção

A infraestrutura de produção é gerenciada pelo Docker Compose e inclui:

- Banco de dados PostGIS (porta 5436)
- Backend Node.js (porta 3002)
- API Unstructured para processamento de documentos (porta 8001)

## Executando o Ambiente de Produção

Para subir o ambiente de produção, execute:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Migração de Dados

Se estiver migrando de um ambiente anterior, utilize o script de migração:

```bash
powershell -File scripts/migrar_dados.ps1
```

O script irá:
1. Conectar ao banco de dados antigo (porta 5434)
2. Exportar os dados
3. Ajustar os campos conforme necessário
4. Importar os dados no novo banco de dados

## Documentação

A documentação completa do sistema está disponível na pasta `DOCUMENTAÇÃO/`:

- `DOCUMENTAÇÃO/arquitetura/bancos-de-dados/estrutura-banco-dados.md` - Documentação da estrutura de banco de dados
- `DOCUMENTAÇÃO/arquitetura/infraestrutura/infraestrutura-prod.md` - Documentação da infraestrutura de produção

## Configuração

O sistema utiliza um arquivo `.env` para configuração de variáveis de ambiente. Verifique se as variáveis estão corretamente definidas para o ambiente de produção.

## Portas Utilizadas

- Backend: 3002
- Banco de dados: 5436
- API Unstructured: 8001

Certifique-se de que essas portas estejam disponíveis antes de iniciar o sistema.