# Documentação do Histórico de Auditoria - Sistema de Marcos Geodésicos

## Visão Geral

O sistema de histórico de auditoria registra automaticamente todas as operações realizadas no sistema de inventário de marcos geodésicos. Esta funcionalidade permite o acompanhamento de atividades, auditoria de mudanças e rastreamento de responsabilidades por ações no sistema.

## Arquitetura do Sistema de Logs

### Tabela de Logs

A tabela `logs_sistema` armazena os registros de auditoria com os seguintes campos:

- `id` (SERIAL, PRIMARY KEY): Identificador único do log
- `usuario` (VARCHAR): Nome do usuário que executou a ação
- `acao` (VARCHAR): Tipo da ação realizada (CRIACAO, EDICAO, EXCLUSAO, IMPORTACAO)
- `entidade` (VARCHAR): Tipo de entidade afetada (MARCO, PROPRIEDADE, CLIENTE)
- `entidade_id` (INTEGER): ID da entidade afetuada
- `detalhes` (TEXT): Descrição detalhada da operação
- `data_hora` (TIMESTAMP): Data e hora do registro (com valor padrão CURRENT_TIMESTAMP)

### Script de Criação

O script para criação da tabela está disponível em `create_logs_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS logs_sistema (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100),
    acao VARCHAR(50), -- CRIACAO, EDICAO, EXCLUSAO, IMPORTACAO
    entidade VARCHAR(50), -- MARCO, PROPRIEDADE, CLIENTE
    entidade_id INTEGER,
    detalhes TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Endpoint da API

### GET /api/historico

Endpoint para consulta dos registros de histórico/auditoria.

#### Parâmetros de Consulta

- `pagina` (integer): Número da página para paginação (padrão: 0)
- `limite` (integer): Número máximo de registros por página (padrão: 50)
- `usuario` (string): Filtrar por usuário específico
- `acao` (string): Filtrar por tipo de ação
- `entidade` (string): Filtrar por tipo de entidade

#### Resposta

- **Status 200**: Consulta realizada com sucesso
  - Corpo:
    ```json
    {
      "sucesso": true,
      "dados": [...],
      "total": integer,
      "pagina": integer,
      "limite": integer,
      "total_paginas": integer
    }
    ```

## Funcionalidade no Frontend

### Acesso à Interface

O histórico de auditoria está disponível na aba "Histórico" da interface web principal (`/frontend/index.html`):

- Título: "Histórico de Atividades"
- Subtítulo: "Acompanhe todas as importações e alterações do sistema"

### Elementos da Interface

#### Filtros

- Campo de busca para pesquisar no histórico
- Seletor para filtrar por tipo de ação (Importações, Criações, Edições, Exclusões)
- Seletor para filtrar por data

#### Visualização

- Lista de atividades em formato de cards
- Cada card contém:
  - Descrição da atividade
  - Tipo de ação
  - Entidade afetada
  - ID do registro (se aplicável)
  - Nome do usuário
  - Data e hora
  - IP de origem (se disponível)

#### Paginação

- Navegação entre páginas do histórico
- Controles para avançar e retroceder
- Informação sobre total de páginas

## Registro Automático de Atividades

### Função de Registro

A função `registrarLog(usuario, acao, entidade, registro_id, descricao, req = null)` no backend registra automaticamente as seguintes operações:

- Criação de novos registros
- Edição de registros existentes
- Exclusão de registros
- Importação de dados
- Importação de memorais descritivos com geração automática de polígonos

### Tipos de Ações

- **CRIAÇÃO**: Registro criado
- **EDIÇÃO**: Registro atualizado
- **EXCLUSÃO**: Registro removido
- **IMPORTACAO**: Dados importados

### Entidades Monitoradas

- **MARCO**: Marcos geodésicos
- **PROPRIEDADE**: Propriedades
- **CLIENTE**: Clientes

## Integração com o Sistema

### Chamadas Automáticas

O sistema registra logs automaticamente em operações de CRUD (criar, ler, atualizar, deletar) em todas as entidades principais.

### Informações de Contexto

Além dos dados principais, o sistema captura:
- IP de origem da requisição
- User agent do navegador
- Dados do usuário autenticado

## Uso e Aplicações

### Auditoria de Segurança

- Monitoramento de acessos não autorizados
- Rastreamento de alterações sensíveis
- Verificação de responsabilidades

### Análise de Uso

- Verificação de atividades do sistema
- Análise de padrões de uso
- Relatórios de desempenho do sistema

### Compliance

- Manutenção de histórico para requisitos legais
- Prova de auditoria para processos regulatórios
- Documentação de todas as transações do sistema

## Permissões e Acesso

- Acesso ao histórico é restrito a usuários com permissão de auditoria
- Visualização de logs pode ser restrita por perfil de usuário
- Exportação de logs pode estar limitada a administradores