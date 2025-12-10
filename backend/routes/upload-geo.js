/**
 * Rota de Upload Geoespacial Inteligente
 * Protocolo Petrovich - Fase 2.2: Wizard de Importação
 * 
 * Features:
 * - Heurística texto-geometria para DXF
 * - Zona UTM dinâmica (enviada pelo frontend)
 * - Reprojeção UTM→WGS84
 * - Preview antes de salvar no banco
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const DxfParser = require('dxf-parser');
const tj = require('@tmcw/togeojson');
const { DOMParser } = require('xmldom');
const proj4 = require('proj4');
const shapefile = require('shapefile');
const fs = require('fs').promises;

// Importar heurística
const { processWithHeuristic } = require('../utils/text-geometry-heuristic');

// Configuração de upload (memória para arquivos menores)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * Função para definir projeção UTM dinâmica
 * @param {string} zoneStr - Ex: "22S", "23S", "21S"
 */
function getProjString(zoneStr) {
    const zone = parseInt(zoneStr) || 22;
    const isSouth = zoneStr.toUpperCase().includes('S') || !zoneStr.toUpperCase().includes('N');
    return `+proj=utm +zone=${zone} +${isSouth ? 'south' : 'north'} +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`;
}

/**
 * Função recursiva para projetar coordenadas
 */
function projectCoords(coords, transform) {
    if (typeof coords[0] === 'number') {
        // Só reprojeta se parecer UTM (|X| > 180)
        if (Math.abs(coords[0]) > 180) {
            try {
                return transform.forward(coords);
            } catch (e) {
                return coords;
            }
        }
        return coords;
    }
    return coords.map(c => projectCoords(c, transform));
}

/**
 * Rota principal de upload
 * POST /api/upload-geo
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        console.log('[Upload-Geo] Nova requisição de upload');

        if (!req.file) {
            throw new Error('Nenhum arquivo enviado');
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const buffer = req.file.buffer;
        const utmZoneInput = req.body.utmZone || '22S'; // Default seguro

        console.log(`[Upload-Geo] Arquivo: ${req.file.originalname} (${ext}), Zona: ${utmZoneInput}`);

        let geojson = null;

        // 1. Processamento baseado no formato
        switch (ext) {
            case '.dxf':
                console.log('[Upload-Geo] Processando DXF com heurística...');
                const parser = new DxfParser();
                const dxf = parser.parseSync(buffer.toString('utf-8'));
                // MÁGICA: Extrai geometria E texto associado
                geojson = processWithHeuristic(dxf);
                break;

            case '.kml':
                console.log('[Upload-Geo] Processando KML...');
                const kml = new DOMParser().parseFromString(buffer.toString('utf-8'));
                geojson = tj.kml(kml);
                break;

            case '.json':
            case '.geojson':
                console.log('[Upload-Geo] Processando GeoJSON...');
                geojson = JSON.parse(buffer.toString('utf-8'));
                break;

            default:
                throw new Error(`Formato não suportado: ${ext}. Use DXF, KML ou GeoJSON.`);
        }

        if (!geojson || !geojson.features || geojson.features.length === 0) {
            throw new Error('Nenhuma geometria válida encontrada no arquivo');
        }

        // 2. Reprojeção Dinâmica (UTM -> WGS84)
        console.log(`[Upload-Geo] Reprojetando de UTM ${utmZoneInput} para WGS84...`);
        const sourceProj = getProjString(utmZoneInput);
        const destProj = 'EPSG:4326'; // WGS84 (Lat/Lon)
        const transform = proj4(sourceProj, destProj);

        geojson.features = geojson.features.map(f => {
            if (f.geometry && f.geometry.coordinates) {
                f.geometry.coordinates = projectCoords(f.geometry.coordinates, transform);
            }
            return f;
        });

        // 3. Extrair dados para resumo
        const feature = geojson.features[0];
        const props = feature.properties || {};

        console.log('[Upload-Geo] Dados extraídos:', {
            matricula: props.matricula,
            nome: props.nome,
            area: props.area,
            proprietario: props.proprietario
        });

        // 4. Retorno para Preview (NÃO salva no banco!)
        res.json({
            success: true,
            data: geojson,
            metadata: {
                filename: req.file.originalname,
                format: ext,
                zoneUsed: utmZoneInput,
                featuresCount: geojson.features.length
            },
            preview: {
                matricula: props.matricula || null,
                nome: props.nome || null,
                area: props.area || props._area || null,
                proprietario: props.proprietario || null,
                perimetro: props.perimetro || null,
                layer: props.layer || null,
                textsFound: props._rawTexts || []
            }
        });

        console.log('[Upload-Geo] Preview enviado com sucesso');

    } catch (error) {
        console.error('[Upload-Geo] Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Rota alternativa para upload via /upload (compatibilidade)
 */
router.post('/upload', upload.single('arquivo'), async (req, res) => {
    // Redirecionar para a rota principal
    req.file = req.file || req.files?.arquivo;
    return router.handle(req, res);
});

module.exports = router;
