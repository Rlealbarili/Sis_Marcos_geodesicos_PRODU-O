# Relatório: Problema de Visibilidade DXF no AutoCAD

**Data:** 2025-12-09  
**Status:** ⚠️ BLOQUEADO - Aguardando análise do Professor

---

## Resumo do Problema

O arquivo DXF exportado pelo sistema **abre corretamente** no AutoCAD (sem erros), mas **não exibe nenhuma geometria visível** - nem no Model Space nem nos Layouts.

---

## O que já foi testado

### Tentativa 1: Formato POLYLINE + VERTEX (DXF R12)
```
0
POLYLINE
8
PERIMETRO
66
1
10
0.0
20
0.0
30
0.0
70
1
0
VERTEX
8
PERIMETRO
10
635586.760
20
7196574.910
30
0.0
...
0
SEQEND
```
**Resultado:** Arquivo abre em branco

### Tentativa 2: Formato LWPOLYLINE (formato moderno)
```
0
LWPOLYLINE
8
PERIMETRO
90
15
70
1
10
635586.760
20
7196574.910
10
636660.080
20
7197555.320
...
```
**Resultado:** Arquivo ainda abre em branco

---

## Validação do GPT-5

O GPT-5 analisou o arquivo e reportou:

| Item | Status |
|------|--------|
| Estrutura DXF | ✅ Correto |
| $ACADVER AC1009 | ✅ Presente |
| Layers definidos | ✅ 4 layers corretos |
| Cores dos layers | ✅ Corretas |
| POLYLINE fechada (flag 70=1) | ✅ Sim |
| Coordenadas em UTM | ✅ Metros (635k, 7.19M) |
| Faixa válida para Brasil | ✅ Sim |

**Conclusão do GPT:** "PARCIALMENTE VÁLIDO" - estrutura OK mas sem POINTs

---

## Código Atual do Gerador

```javascript
// dxf-generator.js - generatePolyline()

function generatePolyline(coords, layer = 'PERIMETRO') {
    const utmCoords = coords.map(coord => toUTM(coord));
    
    let dxf = `0
LWPOLYLINE
8
${layer}
90
${utmCoords.length}
70
1
`;

    utmCoords.forEach(utm => {
        dxf += `10
${utm[0].toFixed(3)}
20
${utm[1].toFixed(3)}
`;
    });

    return dxf;
}
```

---

## Hipóteses para o Professor

1. **Problema de versão DXF?**
   - Usando AC1009 (R12) - talvez precise AC1015 (R2000) ou superior?

2. **Falta de BLOCKS/TABLES adicionais?**
   - Talvez AutoCAD moderno precise de mais seções no header?

3. **Problema com o tipo de entidade?**
   - LWPOLYLINE precisa de subclass markers (100 AcDbPolyline)?

4. **Problema de escala/unidade?**
   - Coordenadas em 600.000+ metros podem estar fora da área de visualização padrão?

5. **Layer congelado ou desligado?**
   - Improvável, mas possível se AutoCAD tem configuração padrão diferente

---

## Perguntas para o Professor

1. Devemos tentar usar biblioteca `dxf-writer` ao invés de gerar ASCII manual?

2. O formato AC1009 (R12) é suficiente ou precisamos de versão mais recente?

3. Existe algum código DXF obrigatório que estamos omitindo (ex: INSUNITS, EXTMIN/EXTMAX)?

4. O Professor tem acesso a um arquivo DXF funcional que podemos usar como referência?

---

## Próximos Passos Sugeridos

1. O Professor pode validar abrindo o arquivo em outra versão do AutoCAD
2. Comparar com um DXF gerado pelo AutoCAD como referência
3. Testar com biblioteca npm `dxf-writer` que gera formato completo
4. Adicionar mais headers obrigatórios (INSUNITS, EXTMIN, EXTMAX, etc.)
