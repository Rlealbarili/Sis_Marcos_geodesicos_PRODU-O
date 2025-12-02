# Documentação do Dashboard de Estatísticas de Marcos Geodésicos

## Visão Geral

O Dashboard de Estatísticas do Sistema de Marcos Geodésicos é uma interface web que fornece estatísticas em tempo real sobre o inventário de marcos geodésicos, propriedades e clientes. Os dados são atualizados automaticamente a cada 30 segundos.

## Funcionalidades Atuais

### KPIs (Indicadores-Chave de Desempenho)

O dashboard apresenta os seguintes KPIs principais:

1. **Total de Marcos**
   - Exibe o número total de marcos registrados no sistema
   - Atualizado automaticamente com os dados mais recentes

2. **Marcos Levantados**
   - Exibe o número total de marcos que já foram levantados
   - Calculado a partir dos marcos com coordenadas válidas e validação confirmada

3. **Propriedades**
   - Exibe o número total de propriedades cadastradas
   - Inclui todas as propriedades ativas no sistema

4. **Clientes**
   - Exibe o número total de clientes cadastrados
   - Inclui todos os clientes ativos no sistema

### Atualização de Dados

- Os dados são atualizados automaticamente a cada 30 segundos
- Os dados são obtidos através da API `/api/estatisticas` no backend
- A função `atualizarEstatisticas()` é responsável por buscar e atualizar os dados na interface

## Funções Atualizadas

### Função `atualizarEstatisticas()`

- Foi atualizada para usar uma abordagem unificada de dados
- Agora utiliza uma função auxiliar `updateSafe()` para atualizar os elementos de forma segura
- Implementa tratamento de erros que não limpa os valores existentes quando a API falha
- Removeu chamadas redundantes e race conditions entre diferentes funções de atualização

## Layout e Design

- O layout utiliza uma grade CSS responsiva para exibição dos cards de estatísticas
- Os KPIs são exibidos em cartões com ícones representativos
- Design limpo e moderno com foco na legibilidade dos dados

## Acesso

- O dashboard é acessado via `/dashboard.html` no frontend
- Requer conexão com o backend para obter os dados atualizados
- Integração com o sistema principal por meio da API definida em `window.API_URL`