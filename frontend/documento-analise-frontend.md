# Análise Completa do Frontend do Sistema de Marcos Geodésicos

## 1. Estrutura de Diretórios do Frontend

- `frontend/` - Pasta raiz do frontend
  - `styles/` - Arquivos CSS (design-system.css, components.css, layout.css, animations.css)
  - `js/` - Scripts JS complementares (clustering.js, performance-test.js)
  - `assets/` - Arquivos estáticos (imagens, logos)
  - Arquivos HTML principais: `index.html`, `dashboard.html`, `analise-fundiaria.html`, etc.
  - Arquivos JS principais: `script.js`, `script-poligonos.js`, `busca-raio.js`

## 2. Arquivos Principais do Frontend

- `index.html`: Página principal com sistema de abas e navegação
- `script.js`: Arquivo JavaScript principal com lógica de mapa, conversões UTM, requisições à API
- `config.js`: Configurações da API com detecção automática de host
- `styles.css`: Estilos principais do sistema

## 3. Configurações e Dependências

- API_URL detectado automaticamente via `window.location.origin`
- Bibliotecas usadas: Leaflet (mapas), proj4 (conversões geográficas), TurfJS (operações geoespaciais), Supercluster (clustering de marcos)
- Sistema de tema claro/escuro com variáveis CSS

## 4. Estrutura de Pastas

- Componentes: Cards de marcos, modais, controles de mapa, etc.
- Páginas: Abas funcionais (mapa, marcos, clientes, propriedades, etc.)
- Estilos: Design system baseado no estilo do X (anteriormente Twitter)
- Assets: Imagens e ícones do sistema

## 5. Lógica de Autenticação e Autorização

- Sistema simplificado com armazenamento de nome de usuário em localStorage
- Não utiliza sessões, tokens JWT ou sistema de login complexo
- Apenas controle básico de usuário via prompt e localStorage

## 6. Conexão com Backend

- Conexão via fetch API para endpoints REST
- API_URL configurado dinamicamente com base na origem
- Endpoints para marcos, propriedades, clientes, SIGEF, CAR, conversões

## 7. Fluxo de Requisições e Tratamento de Erros

- Uso de async/await com try/catch para tratamento de erros
- Função showToast para feedback visual de operações
- Tratamento específico para erros de API e de rede
- Retentativas e fallbacks para requisições falhas

## 8. Funcionalidades Específicas

- **Mapas**: Integração com Leaflet para visualização de marcos e propriedades
- **CAD**: Sistema de cadastro de marcos com coordenadas UTM/LatLng
- **SIGEF**: Integração para busca e exibição de dados SIGEF
- **CAR**: Integração para busca de dados do Cadastro Ambiental Rural
- **Conversões**: Sistema de conversão entre UTM e Lat/Lng usando proj4
- **Análise Fundiária**: Detecção de sobreposições e confrontantes
- **Georreferenciamento**: Sistema de conversão de coordenadas e projeção EPSG:31982

O frontend é bem estruturado com um design system moderno inspirado no X (Twitter), funcionalidades completas para georreferenciamento e análise fundiária, e uma boa separação de responsabilidades entre os diferentes componentes.