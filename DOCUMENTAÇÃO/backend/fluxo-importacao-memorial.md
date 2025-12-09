# Fluxo de Importação de Memorial Descritivo (DOCX)

**Última Atualização:** 2025-12-09

## Status Atual: ⚠️ PARCIALMENTE FUNCIONAL

A extração de dados funciona, mas o salvamento no banco **não é automático**.

---

## Arquitetura do Fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO ATUAL (INCOMPLETO)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuário    2. Frontend           3. Backend              4. Resultado  │
│  ──────────    ─────────────         ─────────────           ──────────────│
│                                                                             │
│  Seleciona     importador.js         /api/memorial/upload    Mostra        │
│  arquivo   ──► handleSelecao()   ──► Envia para Unstructured ──► "Concluído"│
│  DOCX          processarCompleto()   Extrai vértices          (NÃO SALVA!) │
│                                      Retorna dados                          │
│                                                                             │
│  ❌ O endpoint /api/salvar-memorial-completo NUNCA É CHAMADO               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Envolvidos

### Frontend

| Arquivo | Função | Status |
|---------|--------|--------|
| `js/modules/importador.js` | Módulo de importação | ⚠️ Incompleto |
| `index.html` (`#panel-importar`) | Interface visual | ✅ OK |

### Backend

| Endpoint | Função | Status |
|----------|--------|--------|
| `/api/memorial/upload` | Extrai dados do DOCX | ✅ Funcional |
| `/api/verificar-memorial` | Verifica duplicatas/sobreposições | ✅ Funcional |
| `/api/salvar-memorial-completo` | Salva cliente/propriedade/vértices | ✅ Funcional mas não usado |

---

## O que Funciona

1. **Seleção de arquivo**: Upload de .DOC/.DOCX
2. **Processamento**: Envio para API Unstructured
3. **Extração**: Regex patterns para coordenadas UTM/Geográficas
4. **Retorno**: Dados extraídos para o frontend

## O que NÃO Funciona

1. **Salvamento automático**: Dados não são persistidos
2. **Verificação de duplicatas**: Endpoint existe mas não é chamado
3. **Criação de geometria**: PostGIS nunca é acionado
4. **Registro de log**: Auditoria não registra a importação

---

## Endpoint de Extração: `/api/memorial/upload`

```javascript
// backend/server.js (linha ~870)
app.post('/api/memorial/upload', upload.single('memorial'), async (req, res) => {
    // 1. Recebe arquivo DOCX
    // 2. Envia para API Unstructured
    // 3. Processa resposta com UnstructuredProcessor
    // 4. Retorna dados extraídos (NÃO SALVA!)
    res.json({
        sucesso: true,
        total_vertices: resultado.vertices.length,
        vertices: resultado.vertices,
        propriedade: { ... },
        cliente: { ... }
    });
});
```

---

## Endpoint de Salvamento: `/api/salvar-memorial-completo`

```javascript
// backend/server.js (linha ~1138)
app.post('/api/salvar-memorial-completo', async (req, res) => {
    // 1. Cria/busca cliente
    // 2. Insere propriedade
    // 3. Insere vértices
    // 4. Gera geometria com ST_MakePolygon
    // ESTE ENDPOINT FUNCIONA MAS NÃO É CHAMADO!
});
```

---

## Endpoint de Verificação: `/api/verificar-memorial`

```javascript
// backend/server.js
app.post('/api/verificar-memorial', async (req, res) => {
    // Verifica:
    // 1. Duplicata por matrícula (CRÍTICO)
    // 2. Duplicata por nome + município (ALTO)
    // 3. Sobreposição geográfica via ST_Intersects (CRÍTICO/ALTO/MÉDIO/BAIXO)
});
```

---

## Solução Proposta

Modificar `importador.js` → `processarCompleto()` para:

1. ✅ Extrair dados (atual)
2. ➕ Chamar `/api/verificar-memorial`
3. ➕ Se conflitos → mostrar modal de alerta
4. ➕ Chamar `/api/salvar-memorial-completo`
5. ➕ Adicionar botão "Ver no Mapa" no sucesso

---

## Referência: Estrutura de Dados

### Payload para `/api/salvar-memorial-completo`

```json
{
  "cliente": {
    "novo": true,
    "nome": "Nome do Proprietário",
    "cpf_cnpj": null,
    "telefone": null,
    "email": null
  },
  "propriedade": {
    "nome_propriedade": "Fazenda Exemplo",
    "matricula": "12345",
    "tipo": "RURAL",
    "municipio": "Cidade",
    "uf": "PR",
    "area_m2": 50000,
    "perimetro_m": 1000
  },
  "vertices": [
    {
      "nome": "M01",
      "ordem": 1,
      "coordenadas": {
        "e": 757921.91,
        "n": 7162637.30,
        "utm_zona": "22S",
        "datum": "SIRGAS2000"
      }
    }
  ]
}
```
