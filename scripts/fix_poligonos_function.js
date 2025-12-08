const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/script.js');
console.log(`📝 Atualizando carregarPoligonosNoMapa: ${targetFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// Função antiga
const funcaoAntiga = `async function carregarPoligonosNoMapa() {
    try {
        const response = await fetch(\`\${API_URL}/api/poligonos\`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            poligonosLayer.clearLayers();

            data.data.forEach(poligono => {
                const geometria = JSON.parse(poligono.geometria);

                if (geometria.type === 'Polygon') {
                    const coords = geometria.coordinates[0].map(coord => [coord[1], coord[0]]);

                    const polygon = L.polygon(coords, {
                        color: '#84c225',
                        fillColor: '#84c225',
                        fillOpacity: 0.2,
                        weight: 2
                    }).bindPopup(\`
                        <div style="min-width: 250px;">
                            <h4 style="margin: 0 0 10px 0; color: #84c225;">\${poligono.nome}</h4>
                            <p style="margin: 5px 0;"><strong>Código:</strong> \${poligono.codigo}</p>
                            <p style="margin: 5px 0;"><strong>Cliente:</strong> \${poligono.cliente_nome || '-'}</p>
                            <p style="margin: 5px 0;"><strong>Área:</strong> \${poligono.area_m2 ? poligono.area_m2.toFixed(2) + ' m²' : '-'}</p>
                            <p style="margin: 5px 0;"><strong>Perímetro:</strong> \${poligono.perimetro_m ? poligono.perimetro_m.toFixed(2) + ' m' : '-'}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> \${poligono.status}</p>
                            <button onclick="verDetalhesTerreno(\${poligono.id})" style="margin-top: 10px; padding: 8px 15px; background: #84c225; color: white; border: none; border-radius: 5px; cursor: pointer;">Ver Detalhes</button>
                        </div>
                    \`).addTo(poligonosLayer);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao carregar polígonos:', error);
    }
}`;

// Função nova (compatível com GeoJSON FeatureCollection)
const funcaoNova = `async function carregarPoligonosNoMapa() {
    try {
        console.log('🗺️ Carregando polígonos no mapa...');
        const response = await fetch(\`\${API_URL}/api/poligonos\`);
        
        if (!response.ok) {
            console.warn(\`⚠️ API /api/poligonos retornou \${response.status}\`);
            return;
        }
        
        const geojson = await response.json();
        
        // Suporta tanto formato antigo quanto novo (GeoJSON FeatureCollection)
        let features = [];
        
        if (geojson.type === 'FeatureCollection' && geojson.features) {
            features = geojson.features;
        } else if (geojson.success && geojson.data) {
            // Formato antigo (fallback)
            features = geojson.data.map(p => ({
                type: 'Feature',
                properties: p,
                geometry: typeof p.geometria === 'string' ? JSON.parse(p.geometria) : p.geometry
            }));
        }
        
        if (features.length === 0) {
            console.log('📭 Nenhum polígono encontrado.');
            return;
        }
        
        // Limpa camada existente
        if (poligonosLayer) poligonosLayer.clearLayers();

        features.forEach(feature => {
            const props = feature.properties || {};
            const geometry = feature.geometry;
            
            if (!geometry || !geometry.coordinates) return;
            
            // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]
            let coords;
            if (geometry.type === 'Polygon') {
                coords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            } else if (geometry.type === 'MultiPolygon') {
                // Para MultiPolygon, pega o primeiro polígono
                coords = geometry.coordinates[0][0].map(coord => [coord[1], coord[0]]);
            } else {
                console.warn('Tipo de geometria não suportado:', geometry.type);
                return;
            }
            
            // Estilo baseado no tipo
            const cor = getCorTipo(props.tipo) || '#84c225';
            
            const polygon = L.polygon(coords, {
                color: cor,
                fillColor: cor,
                fillOpacity: 0.2,
                weight: 2
            }).bindPopup(\`
                <div style="min-width: 280px; font-family: system-ui, sans-serif;">
                    <div style="background: \${cor}; color: white; padding: 10px; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0;">
                        <h4 style="margin: 0; font-size: 16px;">\${props.nome || props.nome_propriedade || 'Propriedade'}</h4>
                        <small>\${props.tipo || 'Não classificado'}</small>
                    </div>
                    <div style="padding: 5px 0;">
                        <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                            <span style="color: #666;">Matrícula:</span>
                            <strong>\${props.matricula || '-'}</strong>
                        </p>
                        <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                            <span style="color: #666;">Cliente:</span>
                            <strong>\${props.cliente || props.cliente_nome || '-'}</strong>
                        </p>
                        <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                            <span style="color: #666;">Área:</span>
                            <strong>\${props.area_ha ? props.area_ha + ' ha' : (props.area_m2 ? (props.area_m2/10000).toFixed(4) + ' ha' : '-')}</strong>
                        </p>
                        <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                            <span style="color: #666;">Perímetro:</span>
                            <strong>\${props.perimetro_m ? props.perimetro_m.toFixed(0) + ' m' : '-'}</strong>
                        </p>
                        <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                            <span style="color: #666;">Município:</span>
                            <strong>\${props.municipio || '-'} - \${props.uf || ''}</strong>
                        </p>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 5px;">
                        <button onclick="verDetalhesTerreno(\${props.id})" 
                            style="flex: 1; padding: 8px; background: \${cor}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                            Ver Detalhes
                        </button>
                        <button onclick="zoomToPoligono(\${props.id})" 
                            style="padding: 8px 12px; background: #e5e5e5; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                            📍
                        </button>
                    </div>
                </div>
            \`).addTo(poligonosLayer);
        });

        console.log(\`✅ \${features.length} polígonos carregados no mapa.\`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar polígonos:', error);
    }
}

// Função auxiliar para zoom em polígono específico
window.zoomToPoligono = function(propriedadeId) {
    if (!poligonosLayer) return;
    poligonosLayer.eachLayer(layer => {
        if (layer.feature && layer.feature.properties && layer.feature.properties.id === propriedadeId) {
            map.fitBounds(layer.getBounds(), { padding: [50, 50] });
        }
    });
};`;

if (content.includes(funcaoAntiga)) {
    content = content.replace(funcaoAntiga, funcaoNova);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Função carregarPoligonosNoMapa atualizada para formato GeoJSON!');
} else {
    console.error('❌ Função antiga não encontrada exatamente. Tentando busca parcial...');

    // Busca parcial
    const startMarker = 'async function carregarPoligonosNoMapa()';
    const endMarker = '\n\n\n// ==========================================';

    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker, startIdx);

    if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(0, startIdx) + funcaoNova + content.substring(endIdx);
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('✅ Função atualizada via busca parcial!');
    } else {
        console.error('❌ Não foi possível localizar a função para substituição.');
    }
}
