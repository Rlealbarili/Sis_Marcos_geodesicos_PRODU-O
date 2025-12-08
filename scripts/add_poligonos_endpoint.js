const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../backend/server.js');
console.log(`📝 Adicionando rota /api/poligonos: ${targetFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// Código da nova rota com conversão robusta de coordenadas
const novaRota = `
// ============================================
// ENDPOINT: Polígonos para Visualização no Mapa
// Conversão Robusta UTM → WGS84 (Leaflet)
// ============================================

app.get('/api/poligonos', async (req, res) => {
    try {
        console.log('[Polígonos] Buscando polígonos para visualização...');
        
        // Busca propriedades com geometria válida
        const result = await query(\`
            SELECT
                p.id,
                p.nome_propriedade,
                p.matricula,
                p.tipo,
                p.municipio,
                p.uf,
                p.area_m2,
                p.perimetro_m,
                c.nome as cliente_nome,
                -- Converte geometria para WGS84 (EPSG:4326) que o Leaflet espera
                ST_AsGeoJSON(ST_Transform(p.geometry, 4326)) as geometry_wgs84,
                -- Também retorna coordenadas do centroide para posicionamento de labels
                ST_X(ST_Centroid(ST_Transform(p.geometry, 4326))) as centroide_lng,
                ST_Y(ST_Centroid(ST_Transform(p.geometry, 4326))) as centroide_lat
            FROM propriedades p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.geometry IS NOT NULL
              AND p.ativo = true
            ORDER BY p.created_at DESC
        \`);

        // Formata como GeoJSON FeatureCollection
        const features = result.rows.map(row => {
            let geometry = null;
            try {
                geometry = JSON.parse(row.geometry_wgs84);
            } catch (e) {
                console.warn(\`[Polígonos] Geometria inválida para propriedade \${row.id}\`);
            }

            return {
                type: 'Feature',
                properties: {
                    id: row.id,
                    nome: row.nome_propriedade || 'Sem nome',
                    matricula: row.matricula,
                    tipo: row.tipo,
                    municipio: row.municipio,
                    uf: row.uf,
                    area_m2: parseFloat(row.area_m2) || 0,
                    area_ha: (parseFloat(row.area_m2) / 10000).toFixed(4),
                    perimetro_m: parseFloat(row.perimetro_m) || 0,
                    cliente: row.cliente_nome,
                    centroide: {
                        lat: row.centroide_lat,
                        lng: row.centroide_lng
                    }
                },
                geometry: geometry
            };
        }).filter(f => f.geometry !== null); // Remove features com geometria inválida

        const geojson = {
            type: 'FeatureCollection',
            crs: {
                type: 'name',
                properties: { name: 'urn:ogc:def:crs:EPSG::4326' }
            },
            features: features,
            metadata: {
                total: features.length,
                gerado_em: new Date().toISOString(),
                sistema_coordenadas: 'WGS84 (EPSG:4326)',
                nota: 'Coordenadas prontas para Leaflet (lat/lng)'
            }
        };

        console.log(\`[Polígonos] Retornando \${features.length} polígonos.\`);
        res.json(geojson);

    } catch (error) {
        console.error('[Polígonos] Erro:', error.message);
        res.status(500).json({ 
            error: 'Erro ao buscar polígonos',
            message: error.message 
        });
    }
});

// ============================================
// ENDPOINT: Vértices de uma Propriedade
// Retorna coordenadas convertidas para Leaflet
// ============================================

app.get('/api/propriedades/:id/vertices', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Primeiro verifica se a propriedade existe
        const propResult = await query(
            'SELECT id, nome_propriedade FROM propriedades WHERE id = $1',
            [id]
        );
        
        if (propResult.rows.length === 0) {
            return res.status(404).json({ error: 'Propriedade não encontrada' });
        }

        // Busca vértices com conversão de coordenadas
        const verticesResult = await query(\`
            SELECT 
                v.id,
                v.nome,
                v.ordem,
                v.utm_e,
                v.utm_n,
                v.latitude as lat_original,
                v.longitude as lng_original,
                v.utm_zona,
                v.datum,
                -- Converte UTM para WGS84 se latitude/longitude não existirem
                CASE 
                    WHEN v.latitude IS NOT NULL THEN v.latitude
                    ELSE ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(v.utm_e, v.utm_n), 31982), 4326))
                END as latitude,
                CASE 
                    WHEN v.longitude IS NOT NULL THEN v.longitude
                    ELSE ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(v.utm_e, v.utm_n), 31982), 4326))
                END as longitude
            FROM vertices v
            WHERE v.propriedade_id = $1
            ORDER BY v.ordem ASC
        \`, [id]);

        res.json({
            propriedade_id: parseInt(id),
            propriedade_nome: propResult.rows[0].nome_propriedade,
            total_vertices: verticesResult.rows.length,
            vertices: verticesResult.rows.map(v => ({
                id: v.id,
                nome: v.nome,
                ordem: v.ordem,
                coordenadas: {
                    utm: { e: v.utm_e, n: v.utm_n, zona: v.utm_zona },
                    wgs84: { lat: v.latitude, lng: v.longitude }
                },
                datum: v.datum
            }))
        });

    } catch (error) {
        console.error('[Vértices] Erro:', error.message);
        res.status(500).json({ error: error.message });
    }
});

`;

// Encontra o ponto de inserção (antes do SPA Fallback)
const insertPoint = "// ============================================\n// SPA FALLBACK";

if (content.includes('/api/poligonos')) {
    console.log('⚠️ Rota /api/poligonos já existe, pulando...');
} else if (content.includes(insertPoint)) {
    content = content.replace(insertPoint, novaRota + insertPoint);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Rotas /api/poligonos e /api/propriedades/:id/vertices adicionadas!');
} else {
    console.error('❌ Ponto de inserção não encontrado.');
}
