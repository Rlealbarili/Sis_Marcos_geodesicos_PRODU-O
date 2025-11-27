const fs = require('fs');
const path = require('path');
const gdal = require('gdal-async');

/**
 * Converte arquivo DXF/DWG para GeoJSON usando GDAL
 * @param {string} cadPath - Caminho do arquivo DXF ou DWG
 * @returns {object} GeoJSON convertido
 */
async function convertCADToGeoJSON(cadPath) {
    try {
        console.log(`📄 Lendo arquivo CAD: ${cadPath}`);

        // Verificar se arquivo existe
        if (!fs.existsSync(cadPath)) {
            throw new Error(`Arquivo CAD não encontrado: ${cadPath}`);
        }

        // Abrir arquivo com GDAL
        const dataset = await gdal.openAsync(cadPath);

        if (!dataset) {
            throw new Error('Não foi possível abrir o arquivo CAD com GDAL');
        }

        console.log(`   Driver: ${dataset.driver.description}`);
        console.log(`   Camadas: ${dataset.layers.count()}`);

        // GeoJSON result
        const features = [];

        // Iterar sobre todas as camadas
        for (let i = 0; i < dataset.layers.count(); i++) {
            const layer = dataset.layers.get(i);
            console.log(`   Processando camada: ${layer.name} (${layer.features.count()} features)`);

            // Obter SRS da camada
            const srs = layer.srs;
            let needsTransform = false;
            let transform = null;

            // Se não for EPSG:4326 (WGS84), criar transformação
            if (srs && !srs.isSame(gdal.SpatialReference.fromEPSG(4326))) {
                console.log(`   ⚠️  Camada não está em WGS84, criando transformação...`);
                const targetSRS = gdal.SpatialReference.fromEPSG(4326);
                transform = new gdal.CoordinateTransformation(srs, targetSRS);
                needsTransform = true;
            }

            // Iterar sobre features da camada
            layer.features.forEach(feature => {
                try {
                    const geometry = feature.getGeometry();
                    if (!geometry) return;

                    // Transformar geometria se necessário
                    if (needsTransform && transform) {
                        geometry.transform(transform);
                    }

                    // Converter para GeoJSON
                    const geojsonGeometry = JSON.parse(geometry.toJSON());

                    // Extrair propriedades
                    const properties = {};
                    feature.fields.forEach(field => {
                        properties[field.name] = feature.fields.get(field.name);
                    });

                    // Adicionar camada de origem
                    properties._layer = layer.name;

                    features.push({
                        type: 'Feature',
                        geometry: geojsonGeometry,
                        properties: properties
                    });
                } catch (err) {
                    console.warn(`   ⚠️  Erro ao processar feature: ${err.message}`);
                }
            });
        }

        // Fechar dataset
        dataset.close();

        console.log(`✅ CAD convertido com sucesso`);
        console.log(`   Total de features: ${features.length}`);

        return {
            type: 'FeatureCollection',
            features: features
        };
    } catch (error) {
        console.error(`❌ Erro ao converter CAD: ${error.message}`);
        throw error;
    }
}

/**
 * Detecta o tipo de arquivo CAD
 * @param {string} filePath - Caminho do arquivo
 * @returns {string} 'dxf', 'dwg' ou 'unknown'
 */
function detectCADType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.dxf') return 'dxf';
    if (ext === '.dwg') return 'dwg';
    return 'unknown';
}

/**
 * Filtra features relevantes do CAD (geralmente polígonos de perímetro)
 * @param {object} geojson - GeoJSON com todas as features
 * @returns {object} GeoJSON filtrado
 */
function filtrarFeaturesRelevantes(geojson) {
    if (!geojson.features || geojson.features.length === 0) {
        return geojson;
    }

    // Priorizar polígonos e multipolígonos (geralmente representam perímetros)
    const polygons = geojson.features.filter(f =>
        f.geometry.type === 'Polygon' ||
        f.geometry.type === 'MultiPolygon'
    );

    if (polygons.length > 0) {
        console.log(`   Filtrados ${polygons.length} polígonos de ${geojson.features.length} features totais`);
        return {
            type: 'FeatureCollection',
            features: polygons
        };
    }

    // Se não houver polígonos, tentar linhas fechadas (LineString)
    const closedLines = geojson.features.filter(f => {
        if (f.geometry.type !== 'LineString') return false;
        const coords = f.geometry.coordinates;
        if (coords.length < 4) return false;
        // Verificar se primeiro e último ponto são iguais (linha fechada)
        const first = coords[0];
        const last = coords[coords.length - 1];
        return first[0] === last[0] && first[1] === last[1];
    });

    if (closedLines.length > 0) {
        console.log(`   Filtradas ${closedLines.length} linhas fechadas de ${geojson.features.length} features totais`);

        // Converter linhas fechadas em polígonos
        const polygonFeatures = closedLines.map(f => ({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [f.geometry.coordinates]
            },
            properties: f.properties
        }));

        return {
            type: 'FeatureCollection',
            features: polygonFeatures
        };
    }

    console.warn(`   ⚠️  Nenhum polígono ou linha fechada encontrada, retornando todas as features`);
    return geojson;
}

/**
 * Une múltiplos polígonos em um único MultiPolygon se necessário
 * @param {object} geojson - GeoJSON com múltiplas features
 * @returns {object} GeoJSON com feature única
 */
function unirPoligonos(geojson) {
    if (!geojson.features || geojson.features.length <= 1) {
        return geojson;
    }

    const polygons = geojson.features.filter(f =>
        f.geometry.type === 'Polygon' ||
        f.geometry.type === 'MultiPolygon'
    );

    if (polygons.length === 0) {
        return geojson;
    }

    // Se houver apenas um polígono, retornar como está
    if (polygons.length === 1) {
        return {
            type: 'FeatureCollection',
            features: polygons
        };
    }

    console.log(`   Unindo ${polygons.length} polígonos em MultiPolygon`);

    // Coletar todas as coordenadas
    const allCoordinates = [];
    const allProperties = {};

    polygons.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
            allCoordinates.push(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'MultiPolygon') {
            allCoordinates.push(...feature.geometry.coordinates);
        }

        // Mesclar propriedades
        Object.assign(allProperties, feature.properties);
    });

    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: allCoordinates
            },
            properties: allProperties
        }]
    };
}

module.exports = {
    convertCADToGeoJSON,
    detectCADType,
    filtrarFeaturesRelevantes,
    unirPoligonos
};
