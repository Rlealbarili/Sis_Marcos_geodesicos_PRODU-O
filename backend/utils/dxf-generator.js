/**
 * DXF Generator V3 - Structural Integrity Edition
 * Protocolo Petrovich: Integridade Estrutural Completa
 * 
 * Correções V3:
 * 1. Seção BLOCKS (obrigatória para R12)
 * 2. Sanitização de NaN em coordenadas
 * 3. Tabela STYLE vazia (conformidade)
 * 4. $INSUNITS definido
 * 
 * Ordem obrigatória: HEADER > TABLES > BLOCKS > ENTITIES > EOF
 */

const proj4 = require('proj4');

// Configuração de Projeção
const SIRGAS2000_UTM_22S = "+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
const WGS84 = "EPSG:4326";

function toUTM(coords) {
    if (!coords || coords.length < 2) return [0, 0];

    // Proteção: se já estiver em UTM (X > 10000), não converte
    if (Math.abs(coords[0]) > 10000) return coords;

    try {
        const utm = proj4(WGS84, SIRGAS2000_UTM_22S, coords);
        if (isNaN(utm[0]) || isNaN(utm[1])) return [0, 0];
        return utm;
    } catch (e) {
        return [0, 0];
    }
}

/**
 * Calcula a extensão (Bounding Box) de todo o desenho
 */
function calculateExtents(data) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasPoints = false;

    const checkPoint = (coords) => {
        const utm = toUTM(coords);
        // Ignora pontos na origem (falha de conversão)
        if (utm[0] === 0 && utm[1] === 0) return;

        hasPoints = true;
        if (utm[0] < minX) minX = utm[0];
        if (utm[1] < minY) minY = utm[1];
        if (utm[0] > maxX) maxX = utm[0];
        if (utm[1] > maxY) maxY = utm[1];
    };

    if (data.perimetro && data.perimetro.length > 0) {
        const perimeterCoords = Array.isArray(data.perimetro[0][0]) ? data.perimetro[0] : data.perimetro;
        perimeterCoords.forEach(p => checkPoint(p));
    }
    if (data.marcos) data.marcos.forEach(m => { if (m.coords) checkPoint(m.coords); });
    if (data.textos) data.textos.forEach(t => { if (t.coords) checkPoint(t.coords); });

    // Fallback se vazio
    if (!hasPoints) return { min: [0, 0, 0], max: [1000, 1000, 0] };

    return {
        min: [minX, minY, 0],
        max: [maxX, maxY, 0]
    };
}

function generateHeader(extents) {
    return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$EXTMIN
10
${extents.min[0].toFixed(3)}
20
${extents.min[1].toFixed(3)}
30
0.0
9
$EXTMAX
10
${extents.max[0].toFixed(3)}
20
${extents.max[1].toFixed(3)}
30
0.0
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LTYPE
70
1
0
LTYPE
2
CONTINUOUS
70
0
3
Solid line
72
65
73
0
40
0.0
0
ENDTAB
0
TABLE
2
LAYER
70
4
0
LAYER
2
PERIMETRO
70
0
62
4
6
CONTINUOUS
0
LAYER
2
MARCOS
70
0
62
1
6
CONTINUOUS
0
LAYER
2
TEXTOS
70
0
62
7
6
CONTINUOUS
0
LAYER
2
CONFRONTANTES
70
0
62
8
6
CONTINUOUS
0
ENDTAB
0
TABLE
2
STYLE
70
0
0
ENDTAB
0
ENDSEC
0
SECTION
2
BLOCKS
0
ENDSEC
0
SECTION
2
ENTITIES
`;
}

function generatePolyline(coords, layer = 'PERIMETRO') {
    // Cabeçalho da Polyline
    let dxf = `0
POLYLINE
8
${layer}
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
`;

    // Vértices
    coords.forEach(coord => {
        const utm = toUTM(coord);
        // Proteção contra coordenadas zeradas (erro de conversão)
        if (utm[0] === 0 && utm[1] === 0) return;

        dxf += `0
VERTEX
8
${layer}
10
${utm[0].toFixed(3)}
20
${utm[1].toFixed(3)}
30
0.0
`;
    });

    // Finalização (SEM O ZERO PENDURADO NO FINAL)
    dxf += `0
SEQEND
8
${layer}
`;

    return dxf;
}

function generatePoint(coord, layer = 'MARCOS') {
    const utm = toUTM(coord);
    return `0
POINT
8
${layer}
10
${utm[0].toFixed(3)}
20
${utm[1].toFixed(3)}
30
0.0
`;
}

function generateText(text, coord, height = 2.5, layer = 'TEXTOS') {
    const utm = toUTM(coord);
    // Limpar texto de caracteres inválidos para DXF
    const safeText = (text || "").replace(/\n/g, " ");

    return `0
TEXT
8
${layer}
10
${utm[0].toFixed(3)}
20
${utm[1].toFixed(3)}
30
0.0
40
${height}
1
${safeText}
`;
}

function generateDXF(data) {
    console.log('[DXF Generator V3] Iniciando geração com Integridade Estrutural...');

    const extents = calculateExtents(data);
    console.log(`[DXF Generator V3] Extents: (${extents.min[0].toFixed(0)}, ${extents.min[1].toFixed(0)}) - (${extents.max[0].toFixed(0)}, ${extents.max[1].toFixed(0)})`);

    let dxfContent = generateHeader(extents);

    // Entidades - Perímetro
    if (data.perimetro && data.perimetro.length > 0) {
        const perimeterCoords = Array.isArray(data.perimetro[0][0]) ? data.perimetro[0] : data.perimetro;
        dxfContent += generatePolyline(perimeterCoords, 'PERIMETRO');
        console.log(`[DXF Generator V3] Perimetro: ${perimeterCoords.length} vertices`);
    }

    // Entidades - Marcos
    if (data.marcos && data.marcos.length > 0) {
        data.marcos.forEach(m => {
            if (m.coords) {
                dxfContent += generatePoint(m.coords, 'MARCOS');
                if (m.nome) {
                    const labelPos = [m.coords[0] + 2, m.coords[1] + 2];
                    dxfContent += generateText(m.nome, labelPos, 2.0, 'TEXTOS');
                }
            }
        });
        console.log(`[DXF Generator V3] Marcos: ${data.marcos.length}`);
    }

    // Entidades - Textos
    if (data.textos && data.textos.length > 0) {
        data.textos.forEach(t => {
            if (t.coords && t.content) {
                dxfContent += generateText(t.content, t.coords, t.height || 5.0, 'TEXTOS');
            }
        });
        console.log(`[DXF Generator V3] Textos: ${data.textos.length}`);
    }

    dxfContent += `0
ENDSEC
0
EOF
`;

    console.log(`[DXF Generator V3] Arquivo gerado: ${dxfContent.length} bytes`);
    return dxfContent;
}

module.exports = { generateDXF };