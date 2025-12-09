# Prompt de Validação DXF - Sistema FHV COGEP

## Sobre
Este prompt deve ser usado no GPT-5 (ou similar) para validar arquivos DXF exportados pelo sistema.
Anexe o arquivo `.dxf` junto com este prompt.

---

## PROMPT

```
Você é um especialista em arquivos CAD DXF e georreferenciamento brasileiro. Analise o arquivo DXF anexado e valide segundo os critérios abaixo.

## CHECKLIST DE VALIDAÇÃO

### 1. ESTRUTURA DO ARQUIVO
[ ] Arquivo começa com "0\nSECTION\n2\nHEADER"?
[ ] Contém "$ACADVER" com valor "AC1009" ou superior?
[ ] Possui seção "TABLES" com definição de layers?
[ ] Possui seção "ENTITIES" com geometrias?
[ ] Termina com "0\nEOF"?

### 2. LAYERS DEFINIDOS
Verifique se existem estes layers com as cores corretas:
| Layer | Cor Esperada | Existe? | Cor Correta? |
|-------|--------------|---------|--------------|
| PERIMETRO | 4 (Cyan) | ? | ? |
| MARCOS | 1 (Red) | ? | ? |
| TEXTOS | 7 (White) | ? | ? |
| CONFRONTANTES | 8 (Gray) | ? | ? |

### 3. COORDENADAS (CRÍTICO)
Extraia as coordenadas X e Y (códigos DXF 10 e 20) e analise:
- As coordenadas estão em METROS (valores grandes como 600000, 7500000)?
- Ou estão em GRAUS (valores pequenos como -50.5, -23.8)?

Para Brasil (SIRGAS 2000 UTM):
- X (Easting): deve estar entre ~100.000 e ~900.000
- Y (Northing): deve estar entre ~7.000.000 e ~11.000.000 (hemisfério Sul)

Se os valores forem pequenos (<1000), o arquivo está em graus e NÃO abrirá corretamente no AutoCAD para trabalho de engenharia.

### 4. GEOMETRIAS
[ ] Existe pelo menos uma POLYLINE?
[ ] A POLYLINE do perímetro está fechada (flag 70 = 1)?
[ ] Existem POINTs para marcos?
[ ] Existem TEXTs para labels?

### 5. TESTE DE ABERTURA
Se você conseguir simular a abertura:
[ ] As entidades são visíveis?
[ ] Os layers podem ser ligados/desligados?
[ ] O zoom "Extents" mostra a geometria centralizada?

## RELATÓRIO FINAL

Responda no formato:

**STATUS GERAL:** [VÁLIDO / INVÁLIDO / PARCIALMENTE VÁLIDO]

**Problemas Encontrados:**
1. ...
2. ...

**Recomendações:**
1. ...

**Coordenadas Detectadas:**
- Sistema: [UTM / WGS84 / Indefinido]
- Zona UTM estimada: [22S / 23S / etc]
- Faixa X: [min - max]
- Faixa Y: [min - max]

**Entidades Encontradas:**
- Polylines: X
- Points: X
- Texts: X
```

---

## Referência Técnica

### Códigos DXF Importantes:
- **0**: Tipo de entidade
- **2**: Nome (layer, etc)
- **8**: Layer da entidade
- **10**: Coordenada X
- **20**: Coordenada Y
- **30**: Coordenada Z
- **62**: Cor do layer (1=Red, 4=Cyan, 7=White, 8=Gray)
- **70**: Flags (1=fechado para polylines)

### Cores DXF Padrão:
| Código | Cor |
|--------|-----|
| 1 | Red |
| 2 | Yellow |
| 3 | Green |
| 4 | Cyan |
| 5 | Blue |
| 6 | Magenta |
| 7 | White |
| 8 | Gray |
