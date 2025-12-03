const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: './backend/.env', override: true });
const { query, transaction, healthCheck, pool } = require('./database/postgres-connection');
const ReportGenerator = require('./report-generator');
const DataExporter = require('./data-exporter');
const UnstructuredProcessor = require('./unstructured-processor');
const axios = require('axios');
const proj4 = require('proj4');

// ============================================
// CONFIGURAÇÃO DE SISTEMAS DE COORDENADAS
// ============================================

// SIRGAS 2000 UTM Zone 22S (EPSG:31982) - Paraná/Sul do Brasil
proj4.defs('EPSG:31982', '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// WGS84 (GPS/Leaflet) - EPSG:4326
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

console.log('✅ Sistemas de coordenadas configurados (EPSG:31982 → EPSG:4326)');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configuração Multer para upload de arquivos
const upload = multer({
    dest: path.join(__dirname, '../uploads/'),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ============================================
// ENDPOINT: Health Check
// ============================================

app.get('/api/health', async (req, res) => {
    try {
        const health = await healthCheck();
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: 'Health check failed' });
    }
});

// ============================================
// ENDPOINT: Estatísticas (Unificado)
// ============================================
app.get('/api/estatisticas', async (req, res) => {
    try {
        // Query otimizada com Subselects para trazer tudo de uma vez
        const result = await query(`
            SELECT
                (SELECT COUNT(*) FROM marcos_levantados) as total_marcos,
                (SELECT COUNT(*) FROM marcos_levantados WHERE validado = true AND geometry IS NOT NULL) as marcos_levantados,
                (SELECT COUNT(*) FROM marcos_levantados WHERE validado = false OR geometry IS NULL) as marcos_pendentes,
                (SELECT COUNT(*) FROM propriedades WHERE ativo = true) as total_propriedades,
                (SELECT COUNT(*) FROM clientes WHERE ativo = true) as total_clientes,

                -- Contagens específicas de Marcos
                (SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'V') as tipo_v,
                (SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'M') as tipo_m,
                (SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'P') as tipo_p,

                (SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'V' AND validado = true) as tipo_v_validados,
                (SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'M' AND validado = true) as tipo_m_validados,
                (SELECT COUNT(*) FROM marcos_levantados WHERE tipo = 'P' AND validado = true) as tipo_p_validados
        `);

        const stats = result.rows[0];

        // Cálculo seguro do percentual
        const total = parseInt(stats.total_marcos) || 0;
        const levantados = parseInt(stats.marcos_levantados) || 0;
        const percentual = total > 0 ? (levantados / total * 100).toFixed(2) : 0;

        res.json({
            total_marcos: total,
            marcos_levantados: levantados,
            marcos_pendentes: parseInt(stats.marcos_pendentes),
            total_propriedades: parseInt(stats.total_propriedades), // Novo campo
            total_clientes: parseInt(stats.total_clientes),         // Novo campo
            por_tipo: {
                V: parseInt(stats.tipo_v),
                M: parseInt(stats.tipo_m),
                P: parseInt(stats.tipo_p)
            },
            por_tipo_validados: {
                V: parseInt(stats.tipo_v_validados),
                M: parseInt(stats.tipo_m_validados),
                P: parseInt(stats.tipo_p_validados)
            },
            percentual_levantados: parseFloat(percentual)
        });
    } catch (error) {
        console.error('Erro em /api/estatisticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ============================================
// ENDPOINT: Listar Marcos
// ============================================

app.get('/api/marcos', async (req, res) => {
    try {
        const limite = Math.min(parseInt(req.query.limite) || 1000, 10000);
        const offset = parseInt(req.query.offset) || 0;
        const levantados = req.query.levantados === 'true';

        let whereClause = '1=1';
        if (levantados) {
            whereClause = 'validado = true AND geometry IS NOT NULL';
        }

        const result = await query(`
            SELECT
                id, codigo, tipo, localizacao,
                coordenada_e, coordenada_n, altitude,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson,
                data_levantamento, metodo, limites,
                precisao_e, precisao_n, precisao_h,
                validado, fonte, observacoes,
                created_at, updated_at
            FROM marcos_levantados
            WHERE ${whereClause}
            ORDER BY codigo
            LIMIT $1 OFFSET $2
        `, [limite, offset]);

        const countResult = await query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN validado = true AND geometry IS NOT NULL THEN 1 END) as levantados,
                COUNT(CASE WHEN validado = false OR geometry IS NULL THEN 1 END) as pendentes
            FROM marcos_levantados
        `);

        res.json({
            data: result.rows,
            total: parseInt(countResult.rows[0].total),
            levantados: parseInt(countResult.rows[0].levantados),
            pendentes: parseInt(countResult.rows[0].pendentes),
            limite: limite,
            offset: offset
        });
    } catch (error) {
        console.error('Erro em /api/marcos:', error);
        res.status(500).json({ error: 'Erro ao buscar marcos' });
    }
});

// ============================================
// ENDPOINT: Busca por Raio
// ============================================

app.get('/api/marcos/raio/:lat/:lng/:raio', async (req, res) => {
    try {
        const lat = parseFloat(req.params.lat);
        const lng = parseFloat(req.params.lng);
        const raio = parseFloat(req.params.raio);

        if (isNaN(lat) || isNaN(lng) || isNaN(raio)) {
            return res.status(400).json({ error: 'Parâmetros inválidos' });
        }

        const result = await query(`
            SELECT
                codigo, tipo, localizacao,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson,
                ROUND(
                    ST_Distance(
                        ST_Transform(geometry, 4326)::geography,
                        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                    )::numeric,
                    2
                ) as distancia_metros
            FROM marcos_levantados
            WHERE validado = true AND geometry IS NOT NULL
              AND ST_DWithin(
                  ST_Transform(geometry, 4326)::geography,
                  ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                  $3
              )
            ORDER BY ST_Distance(
                ST_Transform(geometry, 4326)::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
            )
        `, [lat, lng, raio]);

        res.json({
            centro: { lat, lng },
            raio_metros: raio,
            total_encontrados: result.rows.length,
            marcos: result.rows
        });
    } catch (error) {
        console.error('Erro em /api/marcos/raio:', error);
        res.status(500).json({ error: 'Erro na busca por raio' });
    }
});

// ============================================
// ENDPOINT: Busca por BBox
// ============================================

app.get('/api/marcos/bbox', async (req, res) => {
    try {
        const { minLat, minLng, maxLat, maxLng } = req.query;

        if (!minLat || !minLng || !maxLat || !maxLng) {
            return res.status(400).json({ error: 'Parâmetros bbox obrigatórios' });
        }

        const result = await query(`
            SELECT
                codigo, tipo, localizacao,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson
            FROM marcos_levantados
            WHERE validado = true AND geometry IS NOT NULL
              AND ST_Contains(
                  ST_MakeEnvelope($1, $2, $3, $4, 4326),
                  ST_Transform(geometry, 4326)
              )
            ORDER BY codigo
        `, [parseFloat(minLng), parseFloat(minLat), parseFloat(maxLng), parseFloat(maxLat)]);

        res.json({
            bbox: { minLat, minLng, maxLat, maxLng },
            total_encontrados: result.rows.length,
            marcos: result.rows
        });
    } catch (error) {
        console.error('Erro em /api/marcos/bbox:', error);
        res.status(500).json({ error: 'Erro na busca por bbox' });
    }
});

// ============================================
// ENDPOINT: GeoJSON Collection
// ============================================

app.get('/api/marcos/geojson', async (req, res) => {
    try {
        const limite = Math.min(parseInt(req.query.limite) || 1000, 10000);
        const incluirNaoValidados = req.query.incluir_nao_validados === 'true';

        const whereClause = incluirNaoValidados ?
            '1=1' :
            'validado = true AND geometry IS NOT NULL';

        const result = await query(`
            SELECT
                jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(
                        jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(ST_Transform(geometry, 4326))::jsonb,
                            'properties', jsonb_build_object(
                                'codigo', codigo,
                                'tipo', tipo,
                                'localizacao', localizacao,
                                'altitude', altitude,
                                'validado', validado,
                                'coordenada_e', coordenada_e,
                                'coordenada_n', coordenada_n
                            )
                        )
                    )
                ) as geojson
            FROM (
                SELECT * FROM marcos_levantados
                WHERE ${whereClause}
                ORDER BY codigo
                LIMIT $1
            ) subquery
        `, [limite]);

        res.json(result.rows[0].geojson);
    } catch (error) {
        console.error('Erro em /api/marcos/geojson:', error);
        res.status(500).json({ error: 'Erro ao gerar GeoJSON' });
    }
});

// ============================================
// ENDPOINT: Buscar com Filtros
// ============================================

app.get('/api/marcos/buscar', async (req, res) => {
    try {
        const { tipo, municipio, estado, status } = req.query;

        const conditions = [];
        const params = [];
        let paramCount = 1;

        if (tipo) {
            conditions.push(`tipo = $${paramCount++}`);
            params.push(tipo);
        }

        if (municipio) {
            conditions.push(`municipio ILIKE $${paramCount++}`);
            params.push(`%${municipio}%`);
        }

        if (estado) {
            conditions.push(`estado = $${paramCount++}`);
            params.push(estado);
        }

        if (status) {
            conditions.push(`status = $${paramCount++}`);
            params.push(status);
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const result = await query(`
            SELECT
                id, codigo, tipo, localizacao,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson,
                validado
            FROM marcos_levantados
            ${whereClause}
            ORDER BY codigo
            LIMIT 1000
        `, params);

        res.json({
            filtros: { tipo, municipio, estado, status },
            total: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Erro em /api/marcos/buscar:', error);
        res.status(500).json({ error: 'Erro na busca' });
    }
});

// ============================================
// ENDPOINT: Exportar Excel (compatibilidade)
// ============================================

app.get('/api/marcos/exportar', async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM marcos_levantados ORDER BY codigo
        `);
        res.json({
            total: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Erro em /api/marcos/exportar:', error);
        res.status(500).json({ error: 'Erro ao exportar dados' });
    }
});

// ============================================
// ENDPOINT: Exportar DXF
// ============================================
app.get('/api/marcos/exportar-dxf', async (req, res) => {
    try {
        console.log('📐 Iniciando exportação DXF...');

        // Buscar apenas marcos validados com coordenadas
        const result = await query(`
            SELECT codigo, coordenada_e, coordenada_n, altitude
            FROM marcos_levantados
            WHERE validado = true AND geometry IS NOT NULL
            ORDER BY codigo
        `);

        if (result.rows.length === 0) {
            return res.status(404).send('Nenhum marco validado para exportar.');
        }

        // Importar o gerador DXF
        const { gerarDXF } = require('./utils/dxf-generator');

        // Gerar conteúdo do arquivo
        const dxfContent = gerarDXF(result.rows);

        // Configurar headers para download
        res.setHeader('Content-Type', 'application/dxf');
        res.setHeader('Content-Disposition', `attachment; filename=marcos_inventario_${Date.now()}.dxf`);

        res.send(dxfContent);
        console.log(`✅ DXF gerado com ${result.rows.length} marcos.`);

    } catch (error) {
        console.error('❌ Erro ao exportar DXF:', error);
        res.status(500).json({ error: 'Erro interno na geração do DXF' });
    }
});

// ============================================
// ENDPOINT: Buscar Marco por Código
// ============================================

app.get('/api/marcos/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;

        const result = await query(`
            SELECT
                id, codigo, tipo, localizacao,
                coordenada_e, coordenada_n, altitude,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson,
                data_levantamento, metodo, limites,
                precisao_e, precisao_n, precisao_h,
                validado, fonte, observacoes,
                created_at, updated_at
            FROM marcos_levantados
            WHERE codigo = $1
        `, [codigo]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Marco não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro em /api/marcos/:codigo:', error);
        res.status(500).json({ error: 'Erro ao buscar marco' });
    }
});

// ============================================
// ROTAS: CLIENTES E PROPRIEDADES
// ============================================

// Rotas de Clientes
const clientesRoutes = require('./routes/clientes');
app.use('/api/clientes', clientesRoutes);

// Rotas de Marcos
const marcosRoutes = require('./routes/marcos');
app.use('/api/marcos', marcosRoutes);

// ============================================
// ENDPOINT: Propriedades em GeoJSON
// ============================================

app.get('/api/propriedades/geojson', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                p.id,
                p.nome_propriedade,
                p.matricula,
                p.tipo,
                p.municipio,
                p.uf,
                p.area_m2,
                p.perimetro_m,
                p.observacoes,
                c.nome as cliente_nome,
                ST_AsGeoJSON(ST_Transform(p.geometry, 4326)) as geometry
            FROM propriedades p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.geometry IS NOT NULL
            AND p.ativo = true
            ORDER BY p.created_at DESC
        `);

        const geojson = {
            type: 'FeatureCollection',
            features: result.rows.map(row => {
                const geometry = JSON.parse(row.geometry);
                return {
                    type: 'Feature',
                    properties: {
                        id: row.id,
                        nome_propriedade: row.nome_propriedade,
                        matricula: row.matricula,
                        tipo: row.tipo,
                        municipio: row.municipio,
                        uf: row.uf,
                        area_m2: parseFloat(row.area_m2) || 0,
                        perimetro_m: parseFloat(row.perimetro_m) || 0,
                        observacoes: row.observacoes,
                        cliente_nome: row.cliente_nome
                    },
                    geometry: geometry
                };
            })
        };

        res.json(geojson);
    } catch (error) {
        console.error('[GeoJSON] Erro:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Propriedades (genéricas)
const propriedadesRoutes = require('./routes/propriedades');
app.use('/api/propriedades', propriedadesRoutes);

// Rota de importação de CSV via Unstructured API
const { importarCsv } = require('./routes/upload-csv');
app.post('/api/marcos/importar-csv', importarCsv);

// ============================================
// ENDPOINT: Histórico de Atividades
// ============================================

app.get('/api/historico', async (req, res) => {
    try {
        const { pagina = 0, limite = 50, usuario, acao, entidade } = req.query;

        let whereClause = "1=1";
        let params = [];
        let paramIndex = 1;

        if (usuario) {
            params.push(usuario);
            whereClause += ` AND usuario ILIKE $${paramIndex}`;
            paramIndex++;
        }

        if (acao) {
            params.push(acao);
            whereClause += ` AND acao = $${paramIndex}`;
            paramIndex++;
        }

        if (entidade) {
            params.push(entidade);
            whereClause += ` AND entidade_afetada = $${paramIndex}`;
            paramIndex++;
        }

        // Obter total de registros
        const countResult = await query(
            `SELECT COUNT(*) as total FROM logs_sistema WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Obter registros com paginação
        const offset = parseInt(pagina) * parseInt(limite);
        const result = await query(`
            SELECT * FROM logs_sistema
            WHERE ${whereClause}
            ORDER BY data_registro DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, parseInt(limite), offset]);

        res.json({
            sucesso: true,
            dados: result.rows,
            total: total,
            pagina: parseInt(pagina),
            limite: parseInt(limite),
            total_paginas: Math.ceil(total / parseInt(limite))
        });

    } catch (error) {
        console.error('[Histórico] Erro:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// Nova rota para histórico com paginação aprimorada
app.get('/api/logs-sistema', async (req, res) => {
    try {
        const { limite = 50, offset = 0, busca } = req.query;

        let whereClause = "1=1";
        let params = [];
        let paramIndex = 1;

        if (busca) {
            whereClause += ` AND (usuario ILIKE $${paramIndex} OR descricao ILIKE $${paramIndex} OR entidade_afetada ILIKE $${paramIndex})`;
            params.push(`%${busca}%`);
            paramIndex++;
        }

        // Obter total de registros
        const countResult = await query(
            `SELECT COUNT(*) as total FROM logs_sistema WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Obter registros com paginação
        params.push(parseInt(limite));
        params.push(parseInt(offset));

        const result = await query(`
            SELECT * FROM logs_sistema
            WHERE ${whereClause}
            ORDER BY data_registro DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, params);

        res.json({
            sucesso: true,
            dados: result.rows,
            total: total,
            limite: parseInt(limite),
            offset: parseInt(offset),
            total_paginas: Math.ceil(total / parseInt(limite))
        });

    } catch (error) {
        console.error('[Logs Sistema] Erro:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// ============================================
// SPA FALLBACK - Redirecionar para index.html
// ============================================

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// =====================================================
// DASHBOARD - ESTATÍSTICAS EXECUTIVAS
// =====================================================

app.get('/api/dashboard/estatisticas', async (req, res) => {
    try {
        // 1. Estatísticas gerais de propriedades
        const statsPropriedades = await pool.query(`
            SELECT
                COUNT(*) as total_propriedades,
                COUNT(CASE WHEN tipo = 'RURAL' THEN 1 END) as total_rural,
                COUNT(CASE WHEN tipo = 'URBANA' THEN 1 END) as total_urbana,
                COALESCE(SUM(area_m2), 0) as area_total_m2,
                COALESCE(SUM(area_m2)/10000, 0) as area_total_hectares,
                COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as com_geometria,
                COUNT(DISTINCT cliente_id) as total_clientes,
                COUNT(DISTINCT municipio) as total_municipios
            FROM propriedades
            WHERE ativo = true
        `);

        // 2. Estatísticas de marcos geodésicos
        const statsMarcos = await pool.query(`
            SELECT
                COUNT(*) as total_marcos,
                COUNT(CASE WHEN geometry IS NOT NULL THEN 1 END) as marcos_levantados,
                COUNT(DISTINCT tipo) as tipos_marcos,
                COUNT(CASE WHEN observacoes IS NOT NULL THEN 1 END) as com_observacoes
            FROM marcos_levantados
        `);

        // 7. Distribuição por estado
        const distribEstados = await pool.query(`
            SELECT
                COALESCE(uf, 'N/A') as estado,
                COUNT(*) as quantidade,
                COALESCE(SUM(area_m2/10000), 0) as area_total_ha
            FROM propriedades
            WHERE ativo = true
            GROUP BY uf
            ORDER BY quantidade DESC
            LIMIT 10
        `);

        // 8. Distribuição por município (top 10)
        const distribMunicipios = await pool.query(`
            SELECT
                COALESCE(municipio, 'N/A') as municipio,
                COALESCE(uf, '') as estado,
                COUNT(*) as quantidade
            FROM propriedades
            WHERE ativo = true
            GROUP BY municipio, uf
            ORDER BY quantidade DESC
            LIMIT 10
        `);

        // 9. Timeline de atividades (últimos 30 dias)
        const timeline = await pool.query(`
            SELECT
                DATE(created_at) as data,
                COUNT(*) as atividades
            FROM (
                SELECT created_at FROM propriedades WHERE created_at >= NOW() - INTERVAL '30 days'
                UNION ALL
                SELECT created_at FROM marcos_levantados WHERE created_at >= NOW() - INTERVAL '30 days'
            ) t
            GROUP BY DATE(created_at)
            ORDER BY data DESC
            LIMIT 30
        `);

        // Montar resposta (removendo SIGEF/CAR/Riscos)
        res.json({
            sucesso: true,
            data_atualizacao: new Date().toISOString(),
            propriedades: statsPropriedades.rows[0],
            marcos: statsMarcos.rows[0],
            distribuicao: {
                por_estado: distribEstados.rows,
                por_municipio: distribMunicipios.rows
            },
            timeline: timeline.rows
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// =====================================================
// ROTA: UPLOAD DE MEMORIAL DESCRITIVO (.DOCX)
// =====================================================

app.post('/api/memorial/upload', upload.single('memorial'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                sucesso: false,
                erro: 'Nenhum arquivo foi enviado'
            });
        }

        // Verificar extensão
        const fileName = req.file.originalname.toLowerCase();
        if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                sucesso: false,
                erro: 'Apenas arquivos .doc ou .docx são permitidos'
            });
        }

        // PROCESSAMENTO REAL COM UNSTRUCTURED API
        console.log('🔄 Enviando para API Unstructured...');

        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('files', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Obter URL da API Unstructured do ambiente (ou usar padrão)
        const unstructuredApiUrl = process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000/general/v0/general';

        let unstructuredResponse;
        try {
            unstructuredResponse = await axios.post(
                unstructuredApiUrl,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 30000
                }
            );
        } catch (apiError) {
            console.error('❌ Erro na API Unstructured:', apiError.message);
            fs.unlinkSync(req.file.path);
            return res.status(500).json({
                sucesso: false,
                erro: 'Erro ao processar documento: ' + apiError.message
            });
        }

        // Processar resposta com UnstructuredProcessor
        const processor = new UnstructuredProcessor();
        const resultado = processor.processUnstructuredResponse(unstructuredResponse.data);

        // Formatar resposta para o frontend
        const resposta = {
            sucesso: true,
            total_vertices: resultado.vertices.length,
            area_m2: resultado.metadata.area || null,
            perimetro_m: resultado.metadata.perimetro || null,
            vertices: resultado.vertices,
            metadata: resultado.metadata,
            propriedade: {
                nome: resultado.metadata.imovel || 'Sem nome',
                municipio: resultado.metadata.municipio || null,
                uf: resultado.metadata.uf || null,
                matricula: resultado.metadata.matricula || null,
                comarca: resultado.metadata.comarca || null
            },
            cliente: {
                nome: Array.isArray(resultado.metadata.proprietarios) && resultado.metadata.proprietarios.length > 0
                    ? resultado.metadata.proprietarios[0]
                    : 'Sem nome'
            },
            estatisticas: resultado.estatisticas
        };

        fs.unlinkSync(req.file.path);
        res.json(resposta);

    } catch (error) {
        console.error('❌ Erro ao processar memorial:', error);
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// ============================================
// ROTA CRÍTICA: SALVAR MEMORIAL E GERAR GEOMETRIA
// ============================================
app.post('/api/salvar-memorial-completo', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { cliente, propriedade, vertices } = req.body;

        // 1. Gestão do Cliente
        let clienteId;
        if (cliente.novo) {
            const clienteRes = await client.query(
                `INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING id`,
                [cliente.nome, cliente.cpf_cnpj, cliente.telefone, cliente.email, cliente.endereco]
            );
            clienteId = clienteRes.rows[0].id;
        } else {
            clienteId = cliente.id;
        }

        // 2. Criação da Propriedade (Sem geometria ainda)
        const propRes = await client.query(
            `INSERT INTO propriedades
            (nome_propriedade, matricula, tipo, municipio, uf, area_m2, perimetro_m, cliente_id, observacoes, ativo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
            RETURNING id`,
            [
                propriedade.nome_propriedade,
                propriedade.matricula,
                propriedade.tipo,
                propriedade.municipio,
                propriedade.uf,
                propriedade.area_m2,
                propriedade.perimetro_m,
                clienteId,
                'Importado via Memorial Descritivo (Automático)'
            ]
        );
        const propriedadeId = propRes.rows[0].id;

        // 3. Inserção dos Vértices (Batch Insert seria melhor, mas vamos manter simples e funcional)
        for (const v of vertices) {
            await client.query(
                `INSERT INTO vertices
                (propriedade_id, nome, ordem, utm_e, utm_n, latitude, longitude, utm_zona, datum)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    propriedadeId,
                    v.nome,
                    v.ordem,
                    v.coordenadas.e,
                    v.coordenadas.n,
                    v.coordenadas.lat_original,
                    v.coordenadas.lon_original,
                    v.coordenadas.utm_zona || '22S',
                    v.coordenadas.datum || 'SIRGAS2000'
                ]
            );
        }

        // 4. O MILAGRE GEOMÉTRICO (Protocolo ST_MakePolygon)
        // Esta query reconstrói o polígono a partir dos vértices ordenados e atualiza a propriedade
        // IMPORTANTE: Fecha o anel adicionando o primeiro ponto ao final se necessário
        await client.query(`
            UPDATE propriedades
            SET geometry = ST_SetSRID(
                ST_MakePolygon(
                    ST_MakeLine(
                        ARRAY(
                            SELECT ST_MakePoint(utm_e, utm_n)
                            FROM vertices
                            WHERE propriedade_id = $1
                            ORDER BY ordem
                        )
                        ||
                        (
                            SELECT ST_MakePoint(utm_e, utm_n)
                            FROM vertices
                            WHERE propriedade_id = $1
                            ORDER BY ordem ASC
                            LIMIT 1
                        )
                    )
                ),
                31982
            )
            WHERE id = $1
        `, [propriedadeId]);

        await client.query('COMMIT');

        // Log de sucesso para auditoria
        console.log(`[AUDITORIA] Propriedade ${propriedadeId} criada com geometria válida.`);

        res.json({
            success: true,
            message: 'Memorial salvo e geometria calculada com sucesso!',
            data: {
                propriedade_id: propriedadeId,
                cliente_id: clienteId,
                vertices_criados: vertices.length
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[ERRO CRÍTICO] Falha ao salvar memorial:', error);
        res.status(500).json({
            success: false,
            message: 'Falha na persistência de dados.',
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Função auxiliar para registrar log de atividade
async function registrarLog(usuario, acao, entidade, registro_id, descricao, req = null) {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim() : '127.0.0.1';
        const userAgent = req ? req.headers['user-agent'] : null;

        await query(`
            INSERT INTO logs_sistema (usuario, acao, entidade_afetada, registro_id, descricao, ip_origem, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [usuario, acao, entidade, registro_id, descricao, ip, userAgent]);
    } catch (error) {
        console.error('Erro ao registrar log:', error);
        // Não interrompe a operação principal se o log falhar
    }
}

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🚀 SERVIDOR INVENTÁRIO INICIADO');
    console.log('='.repeat(60));
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📅 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(60) + '\n');

    // Health check inicial
    healthCheck().then(health => {
        if (health.status === 'OK') {
            console.log('✅ PostgreSQL conectado');
        } else {
            console.error('❌ Falha ao conectar PostgreSQL:', health.error);
        }
    });
});

module.exports = app;