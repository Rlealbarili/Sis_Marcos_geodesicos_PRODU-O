# 🐛 RELATÓRIO DE BUG - poligonosLayer não inicializado

**Data:** 2025-12-09  
**Arquivo Afetado:** `frontend/script.js`  
**Linha do Erro:** 1076

---

## Resumo Executivo

O fluxo de importação DOCX foi **implementado com sucesso** (extração → verificação → salvamento). Porém, ao clicar no botão "Ver no Mapa" após o salvamento, ocorre um erro JavaScript que **impede a exibição dos polígonos**.

---

## Erro Reportado

```
❌ Erro ao carregar polígonos: TypeError: Cannot read properties of null (reading 'addLayer')
    at e.addTo (Layer.js:52:7)
    at script.js:1076:16
    at carregarPoligonosNoMapa (script.js:1011:18)
```

---

## Análise Técnica

### Causa Raiz

A variável `poligonosLayer` é declarada em `script.js` linha 603 como:

```javascript
let poligonosLayer = null;  // ← NUNCA é inicializada como L.layerGroup()
```

Na função `carregarPoligonosNoMapa()` (linha 1076), o código faz:

```javascript
polygon.bindPopup(...).addTo(poligonosLayer);  // ← ERRO: poligonosLayer é null
```

### Comparação com outras camadas

| Variável | Linha Declaração | Inicialização | Status |
|----------|------------------|---------------|--------|
| `marcosLayer` | 602 | `criarControleCamadas()` linha 1274 | ✅ OK |
| `propriedadesRuraisLayer` | 611 | `criarControleCamadas()` linha 1277 | ✅ OK |
| `propriedadesUrbanasLayer` | 612 | `criarControleCamadas()` linha 1280 | ✅ OK |
| `propriedadesLoteamentoLayer` | 613 | `criarControleCamadas()` linha 1283 | ✅ OK |
| **`poligonosLayer`** | 603 | **NENHUMA** | ❌ BUG |

### Tentativa de Correção (Fallback)

Tentei inicializar `window.poligonosLayer` dentro de `importador.js`, mas não funcionou porque `script.js` usa a variável local `poligonosLayer` (sem `window.`), que está em escopo de closure e não é acessível externamente.

---

## Correção Necessária (REQUER EDIÇÃO EM script.js)

### Opção 1: Inicializar em `criarControleCamadas()`

Adicionar na função `criarControleCamadas()` (após linha 1284):

```javascript
if (!poligonosLayer) {
    poligonosLayer = L.layerGroup().addTo(map);
}
```

### Opção 2: Inicializar em `inicializarMapa()`

Adicionar na função `inicializarMapa()` (após linha 688):

```javascript
// Inicializar camada de polígonos
poligonosLayer = L.layerGroup().addTo(map);
```

---

## Impacto

- **Funcionalidade afetada:** Visualização de polígonos de propriedades no mapa
- **Funcionalidade OK:** Importação DOCX, verificação de duplicatas, salvamento no banco
- **Workaround temporário:** Recarregar a página após importação (os polígonos aparecem)

---

## Recomendação

Professor Petrovich, solicito permissão para aplicar a **Opção 1** (3 linhas de código) na função `criarControleCamadas()` do arquivo `script.js`.

Alternativamente, o senhor pode aplicar a correção manualmente.
