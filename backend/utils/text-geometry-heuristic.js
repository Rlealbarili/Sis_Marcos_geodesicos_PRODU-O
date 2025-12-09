/**
 * Módulo de Heurística Texto-Geometria
 * 
 * Protocolo Petrovich: Associa textos (TEXT/MTEXT) do DXF aos polígonos
 * usando análise espacial (ponto dentro de polígono).
 * 
 * Isso permite extrair atributos como "Matrícula", "Nome", "Área" de arquivos
 * CAD despadronizados onde o texto está posicionado dentro do perímetro.
 */

const turf = require('@turf/turf');

/**
 * Padrões de reconhecimento de atributos
 * Expressões regulares para identificar tipos de texto
 */
const ATTRIBUTE_PATTERNS = {
    matricula: [
        /matr[íi]cula[:\s]*(\d+[\d./-]*)/i,
        /matr\.?\s*n?[°º]?\s*(\d+[\d./-]*)/i,
        /reg(?:istro)?[:\s]*(\d+[\d./-]*)/i
    ],
    area: [
        /[áa]rea[:\s]*([\d.,]+)\s*(ha|m²|m2|hectares?)?/i,
        /([\d.,]+)\s*(ha|hectares?)/i
    ],
    perimetro: [
        /per[íi]metro[:\s]*([\d.,]+)\s*m?/i
    ],
    nome: [
        /fazenda\s+([^\n]+)/i,
        /s[íi]tio\s+([^\n]+)/i,
        /ch[áa]cara\s+([^\n]+)/i,
        /lote\s+(\d+[a-z]?)/i,
        /gleba\s+([^\n]+)/i
    ],
    proprietario: [
        /propriet[áa]rio[:\s]*([^\n]+)/i,
        /titular[:\s]*([^\n]+)/i
    ]
};

/**
 * Calcula área planar usando fórmula Shoelace (Gauss)
 * SEGURO para coordenadas em metros (UTM) ou graus - não depende de projeção
 * @param {Array} coords - Array de [x, y] coordenadas do polígono
 * @returns {number} Área em unidades quadradas (m² se UTM, graus² se WGS84)
 */
function shoelaceArea(coords) {
    if (!coords || coords.length < 3) return 0;

    let area = 0;
    const n = coords.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i][0] * coords[j][1];
        area -= coords[j][0] * coords[i][1];
    }

    return Math.abs(area / 2);
}

/**
 * Extrai entidades TEXT e MTEXT do DXF parseado
 * @param {object} dxfParsed - Objeto DXF parseado pelo dxf-parser
 * @returns {Array} Lista de textos com coordenadas e conteúdo
 */
function extractTextEntities(dxfParsed) {
    if (!dxfParsed || !dxfParsed.entities) {
        return [];
    }

    const texts = [];

    for (const entity of dxfParsed.entities) {
        if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
            // Coordenadas de inserção do texto
            const x = entity.startPoint?.x || entity.position?.x || entity.x || 0;
            const y = entity.startPoint?.y || entity.position?.y || entity.y || 0;

            // Conteúdo do texto
            const content = entity.text || entity.string || '';

            if (content.trim()) {
                texts.push({
                    type: entity.type,
                    x: x,
                    y: y,
                    content: content.trim(),
                    layer: entity.layer || '0',
                    height: entity.height || entity.textHeight || 1
                });
            }
        }
    }

    console.log(`[Heurística] Encontrados ${texts.length} textos no DXF`);
    return texts;
}

/**
 * Extrai polígonos fechados (LWPOLYLINE/POLYLINE) do DXF
 * @param {object} dxfParsed - Objeto DXF parseado
 * @returns {Array} Lista de polígonos como features GeoJSON
 */
function extractPolygons(dxfParsed) {
    if (!dxfParsed || !dxfParsed.entities) {
        return [];
    }

    const polygons = [];

    for (const entity of dxfParsed.entities) {
        if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            // Verificar se é fechada
            const isClosed = entity.shape || entity.closed;

            if (!isClosed && entity.vertices) {
                // Verificar manualmente se primeiro = último ponto
                const verts = entity.vertices;
                if (verts.length >= 3) {
                    const first = verts[0];
                    const last = verts[verts.length - 1];
                    const tolerance = 0.001; // 1mm de tolerância
                    if (Math.abs(first.x - last.x) < tolerance &&
                        Math.abs(first.y - last.y) < tolerance) {
                        // É fechada
                    } else if (!isClosed) {
                        continue; // Ignorar linhas abertas
                    }
                }
            }

            // Extrair coordenadas
            const coords = (entity.vertices || []).map(v => [v.x, v.y]);

            if (coords.length < 3) continue;

            // Garantir fechamento
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([...first]);
            }

            // Criar Feature GeoJSON
            const feature = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                },
                properties: {
                    layer: entity.layer || '0',
                    _entityType: entity.type
                }
            };

            // Calcular área para ordenação (maior polígono = mais relevante)
            // NOTA: Usamos Shoelace ao invés de turf.area porque DXF bruto
            // pode estar em UTM (metros), e turf.area espera WGS84 (graus)
            feature.properties._area = shoelaceArea(coords);

            polygons.push(feature);
        }
    }

    // Ordenar por área (maior primeiro)
    polygons.sort((a, b) => (b.properties._area || 0) - (a.properties._area || 0));

    console.log(`[Heurística] Encontrados ${polygons.length} polígonos fechados`);
    return polygons;
}

/**
 * Associa textos aos polígonos usando análise espacial
 * @param {Array} texts - Lista de textos extraídos
 * @param {Array} polygons - Lista de polígonos GeoJSON
 * @returns {Array} Polígonos enriquecidos com atributos
 */
function associateTextToPolygons(texts, polygons) {
    console.log(`[Heurística] Associando ${texts.length} textos a ${polygons.length} polígonos...`);

    for (const text of texts) {
        // Criar ponto Turf do texto
        const textPoint = turf.point([text.x, text.y]);

        // Verificar em qual polígono o texto está
        for (const polygon of polygons) {
            try {
                const isInside = turf.booleanPointInPolygon(textPoint, polygon);

                if (isInside) {
                    // Texto está dentro deste polígono - tentar extrair atributos
                    extractAndAssignAttributes(text.content, polygon.properties);

                    // Guardar texto original para debug
                    if (!polygon.properties._rawTexts) {
                        polygon.properties._rawTexts = [];
                    }
                    polygon.properties._rawTexts.push(text.content);

                    break; // Texto só pertence a um polígono
                }
            } catch (e) {
                // Polígono inválido, ignorar
            }
        }
    }

    // Contar polígonos enriquecidos
    const enriched = polygons.filter(p => p.properties._rawTexts?.length > 0);
    console.log(`[Heurística] ${enriched.length} polígonos enriquecidos com atributos`);

    return polygons;
}

/**
 * Extrai atributos do texto e atribui ao objeto de propriedades
 * @param {string} text - Conteúdo do texto
 * @param {object} properties - Objeto de propriedades do polígono
 */
function extractAndAssignAttributes(text, properties) {
    for (const [attrName, patterns] of Object.entries(ATTRIBUTE_PATTERNS)) {
        // Só atribuir se ainda não tiver
        if (properties[attrName]) continue;

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let value = match[1] || match[0];

                // Limpar valor
                value = value.trim();

                // Converter números se for área/perímetro
                if (attrName === 'area' || attrName === 'perimetro') {
                    value = parseFloat(value.replace(/\./g, '').replace(',', '.'));

                    // Se área em hectares, converter para m²
                    if (match[2] && match[2].toLowerCase().startsWith('ha')) {
                        value = value * 10000;
                    }
                }

                properties[attrName] = value;
                console.log(`[Heurística]   → ${attrName}: ${value}`);
                break;
            }
        }
    }
}

/**
 * Função principal: Processa DXF e enriquece com atributos
 * @param {object} dxfParsed - Objeto DXF parseado pelo dxf-parser
 * @returns {object} GeoJSON FeatureCollection enriquecido
 */
function processWithHeuristic(dxfParsed) {
    console.log('[Heurística] Iniciando processamento inteligente...');

    // 1. Extrair textos
    const texts = extractTextEntities(dxfParsed);

    // 2. Extrair polígonos
    const polygons = extractPolygons(dxfParsed);

    if (polygons.length === 0) {
        throw new Error('Nenhum polígono fechado encontrado no arquivo DXF');
    }

    // 3. Associar textos aos polígonos
    const enrichedPolygons = associateTextToPolygons(texts, polygons);

    // 4. Montar FeatureCollection
    const result = {
        type: 'FeatureCollection',
        features: enrichedPolygons,
        metadata: {
            totalTexts: texts.length,
            totalPolygons: polygons.length,
            enrichedPolygons: enrichedPolygons.filter(p => p.properties._rawTexts?.length > 0).length,
            processedAt: new Date().toISOString()
        }
    };

    console.log('[Heurística] Processamento concluído');
    return result;
}

/**
 * Detecta a zona UTM com base no centróide do polígono
 * 
 * ⚠️ ATENÇÃO (Protocolo Petrovich): Esta função ASSUME que o polígono
 * já está em coordenadas WGS84 (lng, lat em graus).
 * 
 * NÃO USE com DXF bruto (coordenadas UTM em metros)!
 * 
 * Uso correto:
 * - Na EXPORTAÇÃO: quando dado vem do PostGIS (SRID 4326)
 * - Na IMPORTAÇÃO: somente APÓS o usuário confirmar a zona UTM
 * 
 * @param {object} polygon - Feature GeoJSON em WGS84 (OBRIGATÓRIO)
 * @returns {object} Informações da zona UTM {zone, hemisphere, epsg, proj4String}
 */
function detectUTMZone(polygon) {
    try {
        const centroid = turf.centroid(polygon);
        const [lng, lat] = centroid.geometry.coordinates;

        // Calcular zona UTM
        const zone = Math.floor((lng + 180) / 6) + 1;
        const hemisphere = lat >= 0 ? 'N' : 'S';

        // EPSG para SIRGAS 2000 UTM
        // Zona 22S = 31982, 23S = 31983, etc.
        const epsgBase = hemisphere === 'S' ? 31960 : 31954;
        const epsg = epsgBase + zone;

        return {
            zone: zone,
            hemisphere: hemisphere,
            epsg: epsg,
            proj4String: `+proj=utm +zone=${zone} +${hemisphere === 'S' ? 'south' : 'north'} +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`
        };
    } catch (e) {
        // Fallback para Zona 22S (mais comum no Brasil)
        console.warn('[Heurística] Não foi possível detectar zona UTM, usando 22S');
        return {
            zone: 22,
            hemisphere: 'S',
            epsg: 31982,
            proj4String: '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
        };
    }
}

module.exports = {
    extractTextEntities,
    extractPolygons,
    associateTextToPolygons,
    processWithHeuristic,
    detectUTMZone,
    ATTRIBUTE_PATTERNS
};
