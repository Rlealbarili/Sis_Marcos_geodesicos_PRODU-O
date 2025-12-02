# Documentação da Infraestrutura de Produção - Sistema de Inventário de Marcos Geodésicos

## Visão Geral

A infraestrutura de produção para o Sistema de Inventário de Marcos Geodésicos é composta por três serviços principais orquestrados com Docker Compose:

1. Banco de dados PostGIS (armazenamento de dados georreferenciados)
2. Backend Node.js (lógica de negócios e API)
3. API Unstructured (processamento de documentos)

## Arquitetura

A infraestrutura está configurada para funcionar em paralelo com o ambiente anterior, evitando conflitos de porta:

- **Banco de dados PostGIS**: Porta 5436 (em vez da tradicional 5432)
- **Backend Node.js**: Porta 3002 (em vez da tradicional 3000)
- **API Unstructured**: Porta 8001 (em vez da tradicional 8000)

## Componentes

### Banco de Dados (PostGIS)

- **Imagem**: postgis/postgis:16-3.4
- **Nome do Container**: db_inventario_prod
- **Porta**: 5436 (mapeada para 5432 internamente)
- **Banco de Dados**: marcos_geodesicos
- **Usuário**: postgres
- **Senha**: definida por variável de ambiente (padrão: marcos123)

O banco de dados utiliza volumes persistentes para garantir que os dados sejam mantidos mesmo após reinicializações dos containers.

### Backend (Node.js)

- **Nome do Container**: app_inventario_prod
- **Porta**: 3002
- **Ambiente**: production
- **Dependências**: db_inventario_prod, unstructured_api_prod

O backend se comunica internamente com o banco de dados e a API Unstructured usando nomes de serviço do Docker Compose.

### API Unstructured

- **Imagem**: downloads.unstructured.io/unstructured-io/unstructured-api:latest
- **Nome do Container**: unstructured_api_prod
- **Porta**: 8001 (mapeada para 8000 internamente)

Responsável pelo processamento de documentos memorialísticos para extração de coordenadas e metadados.

## Variáveis de Ambiente

O sistema utiliza o arquivo `.env` para configurar as variáveis de ambiente:

- `NODE_ENV`: Define o ambiente (production)
- `PORT`: Porta na qual o backend escuta (3002)
- `POSTGRES_HOST`: Host do banco de dados (db_inventario_prod)
- `POSTGRES_PORT`: Porta do banco de dados (5432 - interna)
- `POSTGRES_DB`: Nome do banco de dados (marcos_geodesicos)
- `POSTGRES_USER`: Usuário do banco de dados (postgres)
- `POSTGRES_PASSWORD`: Senha do banco de dados
- `UNSTRUCTURED_API_URL`: URL da API Unstructured (http://unstructured_api_prod:8000)

## Estrutura de Dados

O banco de dados contém as seguintes tabelas principais:

- `clientes`: Informações sobre clientes proprietários
- `propriedades`: Informações sobre propriedades georreferenciadas
- `marcos_levantados`: Informações sobre marcos geodésicos
- `vertices`: Vértices que definem a geometria das propriedades
- `logs_sistema`: Registros de auditoria de todas as operações do sistema

As colunas foram ajustadas para acomodar dados de diferentes tamanhos:
- `nome` e `nome_propriedade`: Ajustados para até 1000 caracteres
- `matricula`, `municipio`, `comarca`: Ajustados para até 500 caracteres
- `codigo`, `metodo`, `fonte`, `lote`: Ajustados para até 200-500 caracteres

## Rede e Comunicação

Todos os serviços estão conectados à uma rede Docker privada chamada `rede_inventario`, que garante comunicação segura entre os containers e isola o ambiente de outros serviços.

## Volumes

- `pg_data_inventario`: Volume persistente para armazenar os dados do banco de dados PostGIS

## Orquestração

O Docker Compose garante que os serviços sejam iniciados na ordem correta e que dependências sejam respeitadas. O backend aguarda o banco de dados e a API Unstructured estarem disponíveis antes de iniciar.

## Processo de Migração

O processo de migração dos dados do sistema antigo para o novo foi realizado com sucesso, com tratamento especial para campos com tamanhos maiores do que o previsto originalmente. A migração incluiu:

- 19039 registros na tabela marcos_levantados
- 22 registros na tabela clientes
- 20 registros na tabela propriedades
- 297 registros na tabela vertices

## Escalabilidade

A arquitetura é projetada para permitir escalabilidade horizontal conforme necessário, com possibilidade de adicionar réplicas de serviços futuramente.