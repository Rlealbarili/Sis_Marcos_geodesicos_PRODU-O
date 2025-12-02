# Documento de Estrutura de Banco de Dados - Sistema de Inventário de Marcos Geodésicos

## 1. Visão Geral do Sistema

O Sistema de Inventário de Marcos Geodésicos é uma aplicação Node.js com backend em PostgreSQL/PostGIS e frontend HTML5/CSS3 com Leaflet para visualização de mapas. O sistema é projetado para catalogar, visualizar e gerenciar marcos geodésicos, propriedades e clientes. O banco de dados está configurado para usar o sistema de coordenadas EPSG:31982 (SIRGAS 2000 UTM 22S) para armazenamento e converte para EPSG:4326 (WGS84) para visualização no frontend.

## 2. Arquitetura de Banco de Dados

### 2.1. Tecnologias Utilizadas
- **Banco de Dados**: PostgreSQL com extensão PostGIS
- **Sistema de Coordenadas**: 
  - Armazenamento: EPSG:31982 (SIRGAS 2000 UTM 22S)
  - Visualização: EPSG:4326 (WGS84 Lat/Long)
- **Pool de Conexões**: Implementado com o módulo `pg` do Node.js
- **Conexão Padrão**: localhost:5434 (configurável via variáveis de ambiente)

### 2.2. Configuração de Conexão
O sistema utiliza um pool de conexões com as seguintes configurações:
- Host: localhost (configurável via POSTGRES_HOST)
- Porta: 5434 (configurável via POSTGRES_PORT)
- Banco de Dados: marcos_geodesicos (configurável via POSTGRES_DB)
- Usuário: postgres (configurável via POSTGRES_USER)
- Senha: marcos123 (configurável via POSTGRES_PASSWORD)
- Máximo de conexões: 20
- Tempo limite de conexão: 5 segundos

## 3. Estrutura das Tabelas

### 3.1. Tabela `marcos_levantados` (Marcos Geodésicos)
Armazena informações sobre os marcos geodésicos levantados.

**Campos:**
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT): Identificador único do marco
- `codigo` (VARCHAR): Código identificador do marco (ex: V01, M01)
- `tipo` (VARCHAR): Tipo do marco ('V' - Vértice, 'M' - Marco, 'P' - Ponto)
- `localizacao` (TEXT): Localização textual descritiva do marco
- `coordenada_e` (NUMERIC): Coordenada leste (X) em metros
- `coordenada_n` (NUMERIC): Coordenada norte (Y) em metros
- `altitude` (NUMERIC): Altitude em metros
- `geometry` (GEOMETRY): Geometria PostGIS do ponto no SRID 31982
- `data_levantamento` (DATE): Data do levantamento
- `metodo` (VARCHAR): Método de levantamento utilizado
- `limites` (TEXT): Descrição textual dos limites
- `precisao_e` (NUMERIC): Precisão da coordenada leste
- `precisao_n` (NUMERIC): Precisão da coordenada norte
- `precisao_h` (NUMERIC): Precisão da altitude
- `validado` (BOOLEAN): Indica se os dados do marco foram validados
- `fonte` (VARCHAR): Fonte dos dados
- `observacoes` (TEXT): Observações adicionais
- `created_at` (TIMESTAMP): Data de criação do registro
- `updated_at` (TIMESTAMP): Data da última atualização

### 3.2. Tabela `clientes` (Clientes)
Armazena informações sobre os clientes proprietários de propriedades.

**Campos:**
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT): Identificador único do cliente
- `nome` (VARCHAR): Nome completo do cliente
- `tipo_pessoa` (VARCHAR): Tipo de pessoa ('fisica' ou 'juridica')
- `cpf_cnpj` (VARCHAR): CPF ou CNPJ do cliente (único)
- `email` (VARCHAR): Endereço de e-mail do cliente
- `telefone` (VARCHAR): Número de telefone do cliente
- `endereco` (TEXT): Endereço completo do cliente
- `observacoes` (TEXT): Observações adicionais sobre o cliente
- `ativo` (BOOLEAN): Indica se o cliente está ativo
- `created_at` (TIMESTAMP): Data de criação do registro
- `updated_at` (TIMESTAMP): Data da última atualização

### 3.3. Tabela `propriedades` (Propriedades)
Armazena informações sobre as propriedades georreferenciadas.

**Campos:**
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT): Identificador único da propriedade
- `nome_propriedade` (VARCHAR): Nome da propriedade
- `cliente_id` (INTEGER, FOREIGN KEY): Referência ao cliente proprietário
- `matricula` (VARCHAR): Número de matrícula da propriedade
- `tipo` (VARCHAR): Tipo de propriedade ('RURAL', 'URBANA', 'INDUSTRIAL', 'COMERCIAL')
- `municipio` (VARCHAR): Município onde está localizada a propriedade
- `comarca` (VARCHAR): Comarca judicial da propriedade
- `uf` (VARCHAR): Unidade federativa (estado)
- `area_m2` (NUMERIC): Área em metros quadrados (informada)
- `perimetro_m` (NUMERIC): Perímetro em metros (informado)
- `endereco` (TEXT): Endereço da propriedade
- `observacoes` (TEXT): Observações adicionais
- `geometry` (GEOMETRY): Geometria PostGIS do polígono no SRID 31982
- `area_calculada` (NUMERIC): Área calculada automaticamente via PostGIS
- `perimetro_calculado` (NUMERIC): Perímetro calculado automaticamente via PostGIS
- `ativo` (BOOLEAN): Indica se a propriedade está ativa
- `created_at` (TIMESTAMP): Data de criação do registro
- `updated_at` (TIMESTAMP): Data da última atualização

### 3.4. Tabela `vertices` (Vértices de Propriedades)
Armazena os vértices que definem a geometria de uma propriedade.

**Campos:**
- `id` (INTEGER, PRIMARY KEY, AUTO_INCREMENT): Identificador único do vértice
- `propriedade_id` (INTEGER, FOREIGN KEY): Referência à propriedade a que pertence
- `nome` (VARCHAR): Nome do vértice (ex: V01, M01, FHV-M-3403)
- `ordem` (INTEGER): Ordem sequencial do vértice na geometria
- `utm_e` (NUMERIC): Coordenada UTM Leste do vértice
- `utm_n` (NUMERIC): Coordenada UTM Norte do vértice
- `latitude` (NUMERIC): Latitude calculada para referência
- `longitude` (NUMERIC): Longitude calculada para referência
- `utm_zona` (VARCHAR): Zona UTM do vértice (padrão: '22S')
- `datum` (VARCHAR): Datum do sistema de coordenadas (padrão: 'SIRGAS2000')
- `created_at` (TIMESTAMP): Data de criação do registro
- `updated_at` (TIMESTAMP): Data da última atualização

### 3.5. Tabela `logs_sistema` (Histórico de Auditoria)
Armazena registros de auditoria de todas as operações realizadas no sistema.

**Campos:**
- `id` (SERIAL, PRIMARY KEY): Identificador único do log
- `usuario` (VARCHAR): Nome do usuário que executou a ação
- `acao` (VARCHAR): Tipo da ação realizada ('CRIACAO', 'EDICAO', 'EXCLUSAO', 'IMPORTACAO')
- `entidade` (VARCHAR): Tipo de entidade afetada ('MARCO', 'PROPRIEDADE', 'CLIENTE')
- `entidade_id` (INTEGER): ID da entidade afetuada
- `detalhes` (TEXT): Descrição detalhada da operação
- `data_hora` (TIMESTAMP): Data e hora do registro (com valor padrão CURRENT_TIMESTAMP)

Criada para suportar o sistema de histórico de auditoria do inventário de marcos geodésicos.

### 3.6. Consultas de Estatísticas
O sistema inclui endpoints e consultas otimizadas para gerar estatísticas sobre marcos geodésicos, propriedades e clientes.

**Endpoint `/api/estatisticas`:**
- Retorna contagens agregadas de marcos, propriedades e clientes
- Utiliza subqueries otimizadas para obter informações de múltiplas tabelas em uma única consulta
- Inclui:
  - Total de marcos (`SELECT COUNT(*) FROM marcos_levantados`)
  - Marcos levantados (`SELECT COUNT(*) FROM marcos_levantados WHERE validado = true AND geometry IS NOT NULL`)
  - Marcos pendentes (`SELECT COUNT(*) FROM marcos_levantados WHERE validado = false OR geometry IS NULL`)
  - Total de propriedades ativas (`SELECT COUNT(*) FROM propriedades WHERE ativo = true`)
  - Total de clientes ativos (`SELECT COUNT(*) FROM clientes WHERE ativo = true`)
  - Contagens por tipo de marco (`SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'V'`)
  - Contagens por tipo de marco validados (`SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'V' AND validado = true`)

## 4. Visões de Banco de Dados (Views)

### 4.1. `vw_clientes_completa` (View de Clientes Completa)
Fornece uma visão consolidada dos dados de clientes com estatísticas e informações agregadas.

### 4.2. `vw_propriedades_completa` (View de Propriedades Completa)
Fornece uma visão consolidada das propriedades com informações de cliente, área calculada e estatísticas.

## 5. Integração com PostGIS

### 5.1. Tipos de Geometria
- **marcos_levantados.geometry**: Tipo POINT (SRID 31982)
- **propriedades.geometry**: Tipo POLYGON ou MULTIPOLYGON (SRID 31982)

### 5.2. Funções PostGIS Utilizadas
- `ST_GeomFromText()`: Converte WKT para geometria PostGIS
- `ST_Transform()`: Converte entre sistemas de coordenadas (31982 → 4326)
- `ST_AsGeoJSON()`: Converte geometria para formato GeoJSON
- `ST_Distance()`: Calcula distância entre dois pontos
- `ST_DWithin()`: Verifica se os pontos estão dentro de uma distância específica
- `ST_Contains()`: Verifica se um polígono contém um ponto
- `ST_MakeEnvelope()`: Cria um envelope (bbox) a partir de coordenadas
- `ST_Area()`: Calcula a área de uma geometria
- `ST_Perimeter()`: Calcula o perímetro de uma geometria
- `ST_SetSRID()`: Define o SRID de uma geometria
- `ST_MakePoint()`: Cria um ponto a partir de coordenadas X,Y

### 5.3. Conversão de Coordenadas
O sistema implementa conversão entre sistemas de coordenadas:
- Armazenamento: EPSG:31982 (SIRGAS 2000 UTM Zone 22S)
- Visualização: EPSG:4326 (WGS84)
- Processamento: Conversão de DMS para DD e vice-versa via proj4

## 6. Processamento de Documentos com Unstructured API

### 6.1. Integração com API Unstructured
O sistema se integra com a API Unstructured para processamento de documentos (especificamente .docx) contendo informações de memorial descritivo.

### 6.2. Extratores de Coordenadas
O sistema implementa múltiplos padrões de extração de coordenadas:

1. **UTM_ASPAS_INLINE**: Padrão para coordenadas UTM em formato de texto com aspas
2. **UTM_FHV_INLINE**: Padrão para coordenadas UTM com prefixo FHV- (áreas rurais)
3. **GEO_DMS_LONGITUDE_FIRST**: Padrão para coordenadas em graus, minutos e segundos com longitude primeiro
4. **GEO_DMS_LAT_FIRST**: Padrão para coordenadas DMS com latitude primeiro
5. **UTM_ATE_O_MARCO**: Padrão para coordenadas após expressão "até o marco"
6. **UTM_FHV_ATE_O_MARCO**: Padrão similar ao UTM_FHV_INLINE mas após expressão "até o marco"

### 6.3. Extratores de Metadados
- Matrícula: Extrai número de matrícula da propriedade
- Imóvel/Propriedade: Extrai nome da propriedade
- Proprietários: Extrai nome(s) do(s) proprietário(s)
- Comarca: Extrai comarca judicial
- Município: Extrai município da propriedade
- UF: Extrai unidade federativa
- Área: Extrai área da propriedade (em m² ou hectares)
- Perímetro: Extrai perímetro da propriedade

## 7. Processos de Importação de Dados

### 7.1. Importação de Marcos via Memorial Descritivo
1. Upload de arquivos .docx contendo memorial descritivo
2. Processamento via API Unstructured
3. Extração de coordenadas UTM ou geográficas
4. Conversão para UTM 22S se necessário usando proj4
5. Validação das coordenadas extraídas
6. Armazenamento na tabela `marcos_levantados`
7. Criação de geometria PostGIS apropriada

### 7.2. Importação de Geometrias via Arquivos Geo
O sistema suporta upload de arquivos georreferenciados (.kml, .shp) para cadastro de geometrias, conforme mencionado em CURRENT_STATE.md.

### 7.3. Importação em Lote via Planilhas
O sistema suporta processamento de planilhas (.csv, .xls) para importação em lote de marcos, conforme mencionado em CURRENT_STATE.md.

## 8. Processos de Exportação de Dados

### 8.1. Exportação para Excel
- Dados de propriedades e marcos geodésicos
- Formato: Arquivos .xlsx com múltiplas abas
- Inclusão de informações geográficas e estatísticas

### 8.2. Exportação para PDF
- Relatórios formatados de propriedades e marcos
- Inclusão de informações geográficas e estatísticas
- Aplicação de filtros para relatórios personalizados

### 8.3. Exportação para CSV
- Dados tabulares de propriedades e marcos
- Formato compatível com planilhas eletrônicas
- Codificação UTF-8 com separador ; (ponto e vírgula)

## 9. Relacionamentos entre Tabelas

### 9.1. Relacionamento Propriedades-Clientes
- **Tabela Pai**: `clientes` (id)
- **Tabela Filha**: `propriedades` (cliente_id)
- **Tipo**: Relacionamento 1:N (um cliente pode ter muitas propriedades)
- **Restrição**: Chave estrangeira com validação de integridade referencial

### 9.2. Relacionamento Propriedades-Vértices
- **Tabela Pai**: `propriedades` (id)
- **Tabela Filha**: `vertices` (propriedade_id)
- **Tipo**: Relacionamento 1:N (uma propriedade pode ter muitos vértices)
- **Restrição**: Chave estrangeira com validação de integridade referencial

## 10. Considerações sobre Integração e Conectividade

### 10.1. Processamento Transacional
- O sistema implementa transações para operações que afetam múltiplas tabelas
- Exemplo: Salvar memorial completo envolve inserções em clientes, propriedades e vértices
- Rollback automático em caso de falha em qualquer etapa da transação

### 10.2. Integração com APIs Externas
- API Unstructured para processamento de documentos
- Endpoint configurado para se comunicar em localhost:8000
- Timeout configurado para 30 segundos
- Tratamento de erros e fallbacks apropriados

### 10.3. Conexão com Sistemas Externos
O sistema está preparado para integração com sistemas SIGEF (embora não implementados na versão atual), conforme mencionado em CURRENT_STATE.md. Funcionalidades relacionadas ao Cadastro Ambiental Rural (CAR) e análise fundiária foram removidas do escopo atual para focar exclusivamente no inventário de marcos geodésicos.

## 11. Restrições e Regras de Negócio

### 11.1. Regras de Validação de Coordenadas
- Verificação de coordenadas UTM válidas na Zona 22S
- Verificação de coordenadas geográficas dentro de limites válidos
- Conversão apropriada entre formatos DMS e DD

### 11.2. Regras de Integridade Referencial
- Não é permitido excluir clientes com propriedades vinculadas
- Não é permitido excluir propriedades com marcos vinculados (quando a tabela existir)

### 11.3. Restrições de Dados
- CPF/CNPJ deve ser único na tabela de clientes
- Tipos de pessoa limitados a 'fisica' ou 'juridica'
- Tipos de propriedade limitados a 'RURAL', 'URBANA', 'INDUSTRIAL', 'COMERCIAL'

## 12. Considerações de Desempenho

### 12.1. Indexação
O sistema implementa indexação espacial via PostGIS para otimizar consultas geográficas:
- Indices GIST para campos geometry
- Indices B-tree para campos frequentemente consultados (codigo, tipo, municipio)

### 12.2. Consultas Geográficas
As consultas que envolvem operações espaciais são otimizadas com:
- Filtros espaciais para reduzir o número de registros processados
- Uso de ST_DWithin para consultas de proximidade
- Paginação em consultas de grandes conjuntos de dados

## Conclusão

O sistema de Inventário de Marcos Geodésicos utiliza uma arquitetura de banco de dados bem estruturada com PostgreSQL e PostGIS para armazenar e processar dados georreferenciados. A integração com a API Unstructured permite extração automática de coordenadas e metadados de documentos memorialísticos, e os processos de importação/exportação garantem flexibilidade na entrada e saída de dados. A estrutura é projetada para suportar grandes volumes de marcos geodésicos e propriedades com alta performance espacial.