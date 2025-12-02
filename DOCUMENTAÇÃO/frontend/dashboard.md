# Documentação do Dashboard de Inventário de Marcos Geodésicos

## Visão Geral

O Dashboard Executivo do Sistema de Inventário de Marcos Geodésicos é uma interface web que fornece estatísticas e visualizações de dados para tomada de decisão. O dashboard foi atualizado para focar exclusivamente nas métricas de inventário, removendo componentes relacionados à análise fundiária.

## Funcionalidades Atuais

### KPIs (Indicadores-Chave de Desempenho)

O dashboard apresenta os seguintes KPIs principais:

1. **Total de Propriedades**
   - Exibe o número total de propriedades cadastradas
   - Subtítulo mostra a divisão entre propriedades rurais e urbanas

2. **Área Total Gerenciada**
   - Exibe a área total em hectares (ha)
   - Subtítulo mostra a conversão para quilômetros quadrados (km²)

3. **Marcos Geodésicos**
   - Exibe o número total de marcos registrados
   - Subtítulo mostra quantos marcos já foram levantados

4. **Total de Clientes**
   - Exibe o número total de clientes cadastrados
   - Subtítulo mostra o número de municípios representados

### Gráficos

O dashboard apresenta os seguintes gráficos:

1. **Distribuição por Tipo**
   - Gráfico do tipo rosca (doughnut)
   - Mostra a distribuição entre propriedades rurais e urbanas

2. **Propriedades por Estado**
   - Gráfico de barras
   - Mostra o número de propriedades por estado

3. **Atividades (30 dias)**
   - Gráfico de linha
   - Mostra a atividade do sistema nos últimos 30 dias

## Funcionalidades Removidas

As seguintes funcionalidades/análises foram removidas do dashboard como parte da refatoração para foco exclusivo em inventário:

- **Análise de Riscos**: Gráfico de análise de riscos (sobrepeso, médio, alto)
- **Sobreposições Detectadas**: KPI que mostrava o número de sobreposições detectadas
- **Confrontantes Identificados**: KPI que mostrava o número de confrontantes identificados
- **Risco Alto/Crítico**: KPI que indicava risco alto no levantamento

## Layout e Design

- O layout utiliza uma grade CSS flexível que se adapta automaticamente ao tamanho da tela
- Os KPIs são exibidos em um grid de cartões responsivos
- Os gráficos são exibidos em cartões com gráficos escaláveis
- Cores padronizadas para cada tipo de informação (azul para propriedades, verde para marcos, etc.)

## Atualização de Dados

- O dashboard atualiza automaticamente os dados a cada 5 minutos
- Os dados são obtidos através da API `/api/dashboard/estatisticas`
- A última atualização é exibida no canto superior direito do dashboard

## Acesso

- O dashboard é acessado via `/dashboard.html` no frontend
- Requer conexão com o backend para obter os dados atualizados