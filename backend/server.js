const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
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
// MUDANÇA DE PORTA SUGERIDA: 3002
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
// ENDPOINT: Estatísticas
// ============================================

app.get('/api/estatisticas', async (req, res) => {
    try {
        const result = await query(`
            SELECT
                COUNT(*) as total_marcos,
                COUNT(CASE WHEN validado = true AND geometry IS NOT NULL THEN 1 END) as marcos_levantados,
                COUNT(CASE WHEN validado = false OR geometry IS NULL THEN 1 END) as marcos_pendentes,
                COUNT(CASE WHEN tipo = 'V' THEN 1 END) as tipo_v,
                COUNT(CASE WHEN tipo = 'M' THEN 1 END) as tipo_m,
                COUNT(CASE WHEN tipo = 'P' THEN 1 END) as tipo_p,
                COUNT(CASE WHEN tipo = 'V' AND validado = true THEN 1 END) as tipo_v_validados,
                COUNT(CASE WHEN tipo = 'M' AND validado = true THEN 1 END) as tipo_m_validados,
                COUNT(CASE WHEN tipo = 'P' AND validado = true THEN 1 END) as tipo_p_validados,
                ROUND(
                    (COUNT(CASE WHEN validado = true AND geometry IS NOT NULL THEN 1 END)::NUMERIC /
                    NULLIF(COUNT(*)::NUMERIC, 0) * 100), 2
                ) as percentual_levantados
            FROM marcos_levantados
        `);

        const stats = result.rows[0];

        res.json({
            total_marcos: parseInt(stats.total_marcos),
            marcos_levantados: parseInt(stats.marcos_levantados),
            marcos_pendentes: parseInt(stats.marcos_pendentes),
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
            percentual_levantados: parseFloat(stats.percentual_levantados)
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
                p.area_calculada,
                p.perimetro_m,
                p.perimetro_calculado,
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
                        area_calculada: parseFloat(row.area_calculada) || 0,
                        perimetro_m: parseFloat(row.perimetro_m) || 0,
                        perimetro_calculado: parseFloat(row.perimetro_calculado) || 0,
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

// ============================================
// ENDPOINT: Listar Clientes
// ============================================

app.get('/api/clientes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                nome,
                tipo_pessoa,
                cpf_cnpj,
                email,
                telefone,
                endereco,
                created_at
            FROM clientes
            ORDER BY nome ASC
        `);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('❌ Erro ao listar clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar clientes',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: Salvar Memorial Completo
// ============================================

app.post('/api/salvar-memorial-completo', async (req, res) => {
    try {
        const { cliente, propriedade, vertices } = req.body;

        if (!propriedade || !vertices || !Array.isArray(vertices) || vertices.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos. São necessários pelo menos 3 vértices.'
            });
        }

        const result = await transaction(async (client) => {
            // 1. SALVAR/BUSCAR CLIENTE
            let clienteId;
            if (cliente.novo) {
                const clienteResult = await client.query(
                    `INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, endereco)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id`,
                    [
                        cliente.nome,
                        cliente.tipo_pessoa || 'fisica',
                        cliente.cpf_cnpj || null,
                        cliente.email || null,
                        cliente.telefone || null,
                        cliente.endereco || null
                    ]
                );
                clienteId = clienteResult.rows[0].id;
            } else {
                clienteId = cliente.id;
            }

            // 2. CONSTRUIR GEOMETRIA WKT
            const pontos = vertices.map(v => `${v.coordenadas.e} ${v.coordenadas.n}`);
            const primeiro = vertices[0];
            const ultimo = vertices[vertices.length - 1];
            const distancia = Math.sqrt(
                Math.pow(ultimo.coordenadas.e - primeiro.coordenadas.e, 2) +
                Math.pow(ultimo.coordenadas.n - primeiro.coordenadas.n, 2)
            );

            if (distancia > 0.01) {
                pontos.push(`${primeiro.coordenadas.e} ${primeiro.coordenadas.n}`);
            }

            const wkt = `POLYGON((${pontos.join(',')}))`;

            // 3. SALVAR PROPRIEDADE COM GEOMETRY
            const propResult = await client.query(
                `INSERT INTO propriedades
                 (nome_propriedade, cliente_id, matricula, tipo, municipio, comarca, uf,
                  area_m2, perimetro_m, geometry)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_GeomFromText($10, 31982))
                 RETURNING id`,
                [
                    propriedade.nome_propriedade || 'Sem nome',
                    clienteId,
                    propriedade.matricula,
                    propriedade.tipo || 'RURAL',
                    propriedade.municipio || null,
                    propriedade.comarca || null,
                    propriedade.uf || null,
                    propriedade.area_m2 || null,
                    propriedade.perimetro_m || null,
                    wkt
                ]
            );

            const propriedadeId = propResult.rows[0].id;

            // 4. CALCULAR ÁREA E PERÍMETRO VIA POSTGIS
            const calcResult = await client.query(
                `UPDATE propriedades
                 SET area_calculada = ST_Area(geometry),
                     perimetro_calculado = ST_Perimeter(geometry)
                 WHERE id = $1
                 RETURNING area_calculada, perimetro_calculado,
                           ST_AsGeoJSON(geometry) as geojson`,
                [propriedadeId]
            );

            const geometryData = calcResult.rows[0];

            // 5. SALVAR VÉRTICES
            for (let i = 0; i < vertices.length; i++) {
                const v = vertices[i];
                await client.query(
                    `INSERT INTO vertices
                     (propriedade_id, nome, ordem, utm_e, utm_n, latitude, longitude, utm_zona, datum)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        propriedadeId,
                        v.nome || null,
                        i + 1,
                        v.coordenadas.e,
                        v.coordenadas.n,
                        v.coordenadas.lat_original || null,
                        v.coordenadas.lon_original || null,
                        v.coordenadas.utm_zona || '22S',
                        v.coordenadas.datum || 'SIRGAS2000'
                    ]
                );
            }

            return {
                cliente_id: clienteId,
                propriedade_id: propriedadeId,
                vertices_criados: vertices.length,
                area_calculada: parseFloat(geometryData.area_calculada),
                perimetro_calculado: parseFloat(geometryData.perimetro_calculado),
                geojson: JSON.parse(geometryData.geojson)
            };
        });

        res.json({
            success: true,
            message: 'Memorial salvo com sucesso!',
            data: result
        });

    } catch (error) {
        console.error('[Salvar Memorial] ❌ Erro:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar memorial: ' + error.message
        });
    }
});

// ============================================
// ENDPOINT: Obter municípios únicos
// ============================================

app.get('/api/municipios', async (req, res) => {
    try {
        const { tipo } = req.query; // Parâmetro opcional para filtrar por tipo de propriedade

        let whereClause = "ativo = true";
        let params = [];

        if (tipo && tipo !== 'todos') {
            params.push(tipo.toUpperCase());
            whereClause += ` AND tipo = $${params.length}`;
        }

        const result = await query(`
            SELECT DISTINCT municipio
            FROM propriedades
            WHERE ${whereClause}
            AND municipio IS NOT NULL
            AND municipio != ''
            ORDER BY municipio
        `, params);

        const municipios = result.rows.map(row => row.municipio);

        res.json({
            sucesso: true,
            municipios: municipios
        });

    } catch (error) {
        console.error('[Municípios] Erro:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

// ============================================
// ENDPOINT: Relatórios
// ============================================

const reportGenerator = require('./report-generator');

// Relatório de Propriedades em PDF
app.get('/api/relatorios/propriedades/pdf', async (req, res) => {
    try {
        const filtros = {};
        let whereConditions = ['p.ativo = true'];
        const params = [];

        if (req.query.cliente_id) {
            params.push(req.query.cliente_id);
            whereConditions.push(`p.cliente_id = $${params.length}`);
            filtros['Cliente ID'] = req.query.cliente_id;
        }

        if (req.query.municipio) {
            params.push(req.query.municipio);
            whereConditions.push(`p.municipio ILIKE $${params.length}`);
            filtros['Município'] = req.query.municipio;
        }

        if (req.query.tipo) {
            params.push(req.query.tipo);
            whereConditions.push(`p.tipo = $${params.length}`);
            filtros['Tipo'] = req.query.tipo;
        }

        const sql = `
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
                c.nome as cliente_nome
            FROM propriedades p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.nome_propriedade
        `;

        const result = await query(sql, params);
        const pdfResult = await reportGenerator.gerarPDFPropriedades(result.rows, filtros);

        res.download(pdfResult.filepath, pdfResult.filename, (err) => {
            if (err) {
                console.error('[Relatório PDF] Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar relatório' });
            }
        });

    } catch (error) {
        console.error('[Relatório PDF] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório PDF: ' + error.message });
    }
});

// Relatório de Propriedades em Excel
app.get('/api/relatorios/propriedades/excel', async (req, res) => {
    try {
        const filtros = {};
        let whereConditions = ['p.ativo = true'];
        const params = [];

        if (req.query.cliente_id) {
            params.push(req.query.cliente_id);
            whereConditions.push(`p.cliente_id = $${params.length}`);
            filtros['Cliente ID'] = req.query.cliente_id;
        }

        if (req.query.municipio) {
            params.push(req.query.municipio);
            whereConditions.push(`p.municipio ILIKE $${params.length}`);
            filtros['Município'] = req.query.municipio;
        }

        const sql = `
            SELECT
                p.id,
                p.nome_propriedade,
                p.matricula,
                p.tipo,
                p.municipio,
                p.uf,
                p.area_m2,
                p.perimetro_m,
                c.nome as cliente_nome
            FROM propriedades p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.nome_propriedade
        `;

        const result = await query(sql, params);
        const excelResult = await reportGenerator.gerarExcelPropriedades(result.rows, filtros);

        res.download(excelResult.filepath, excelResult.filename, (err) => {
            if (err) {
                console.error('[Relatório Excel] Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar relatório' });
            }
        });

    } catch (error) {
        console.error('[Relatório Excel] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório Excel: ' + error.message });
    }
});

// Relatório de Propriedades em CSV
app.get('/api/relatorios/propriedades/csv', async (req, res) => {
    try {
        let whereConditions = ['p.ativo = true'];
        const params = [];

        if (req.query.cliente_id) {
            params.push(req.query.cliente_id);
            whereConditions.push(`p.cliente_id = $${params.length}`);
        }

        if (req.query.municipio) {
            params.push(req.query.municipio);
            whereConditions.push(`p.municipio ILIKE $${params.length}`);
        }

        const sql = `
            SELECT
                p.id,
                p.nome_propriedade,
                p.matricula,
                p.tipo,
                p.municipio,
                p.uf,
                p.area_m2,
                p.perimetro_m
            FROM propriedades p
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.nome_propriedade
        `;

        const result = await query(sql, params);
        const csvResult = await reportGenerator.gerarCSVPropriedades(result.rows);

        res.download(csvResult.filepath, csvResult.filename, (err) => {
            if (err) {
                console.error('[Relatório CSV] Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar relatório' });
            }
        });

    } catch (error) {
        console.error('[Relatório CSV] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório CSV: ' + error.message });
    }
});

// Relatório de Marcos Geodésicos em PDF
app.get('/api/relatorios/marcos/pdf', async (req, res) => {
    try {
        const filtros = {};
        let whereConditions = ['1=1'];
        const params = [];

        if (req.query.municipio) {
            params.push(req.query.municipio);
            whereConditions.push(`municipio ILIKE $${params.length}`);
            filtros['Município'] = req.query.municipio;
        }

        if (req.query.tipo) {
            params.push(req.query.tipo);
            whereConditions.push(`tipo = $${params.length}`);
            filtros['Tipo'] = req.query.tipo;
        }

        if (req.query.status) {
            params.push(req.query.status);
            whereConditions.push(`status = $${params.length}`);
            filtros['Status'] = req.query.status;
        }

        const sql = `
            SELECT
                id, codigo, tipo, municipio, estado,
                latitude, longitude, altitude,
                status, observacoes
            FROM marcos_levantados
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY codigo
        `;

        const result = await query(sql, params);
        const pdfResult = await reportGenerator.gerarPDFMarcos(result.rows, filtros);

        res.download(pdfResult.filepath, pdfResult.filename, (err) => {
            if (err) {
                console.error('[Relatório Marcos PDF] Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar relatório' });
            }
        });

    } catch (error) {
        console.error('[Relatório Marcos PDF] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório PDF: ' + error.message });
    }
});

// Relatório de Marcos Geodésicos em Excel
app.get('/api/relatorios/marcos/excel', async (req, res) => {
    try {
        const filtros = {};
        let whereConditions = ['1=1'];
        const params = [];

        if (req.query.municipio) {
            params.push(req.query.municipio);
            whereConditions.push(`municipio ILIKE $${params.length}`);
            filtros['Município'] = req.query.municipio;
        }

        if (req.query.tipo) {
            params.push(req.query.tipo);
            whereConditions.push(`tipo = $${params.length}`);
            filtros['Tipo'] = req.query.tipo;
        }

        const sql = `
            SELECT
                id, codigo, tipo, municipio, estado,
                latitude, longitude, altitude, status
            FROM marcos_levantados
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY codigo
        `;

        const result = await query(sql, params);
        const excelResult = await reportGenerator.gerarExcelMarcos(result.rows, filtros);

        res.download(excelResult.filepath, excelResult.filename, (err) => {
            if (err) {
                console.error('[Relatório Marcos Excel] Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar relatório' });
            }
        });

    } catch (error) {
        console.error('[Relatório Marcos Excel] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório Excel: ' + error.message });
    }
});

// Relatório de Marcos Geodésicos em CSV
app.get('/api/relatorios/marcos/csv', async (req, res) => {
    try {
        let whereConditions = ['1=1'];
        const params = [];

        if (req.query.municipio) {
            params.push(req.query.municipio);
            whereConditions.push(`municipio ILIKE $${params.length}`);
        }

        if (req.query.tipo) {
            params.push(req.query.tipo);
            whereConditions.push(`tipo = $${params.length}`);
        }

        const sql = `
            SELECT
                id, codigo, tipo, municipio, estado,
                latitude, longitude, altitude, status
            FROM marcos_levantados
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY codigo
        `;

        const result = await query(sql, params);
        const csvResult = await reportGenerator.gerarCSVMarcos(result.rows);

        res.download(csvResult.filepath, csvResult.filename, (err) => {
            if (err) {
                console.error('[Relatório Marcos CSV] Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar relatório' });
            }
        });

    } catch (error) {
        console.error('[Relatório Marcos CSV] ❌ Erro:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório CSV: ' + error.message });
    }
});

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
            whereClause += ` AND usuario ILIKE $${paramIndex}`;
            params.push(`%${usuario}%`);
            paramIndex++;
        }

        if (acao) {
            whereClause += ` AND acao = $${paramIndex}`;
            params.push(acao);
            paramIndex++;
        }

        if (entidade) {
            whereClause += ` AND entidade_afetada = $${paramIndex}`;
            params.push(entidade);
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
                COALESCE(SUM(area_calculada), 0) as area_total_m2,
                COALESCE(SUM(area_calculada)/10000, 0) as area_total_hectares,
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
                COALESCE(SUM(area_calculada/10000), 0) as area_total_ha
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
            total_marcos: resultado.vertices.length,
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
        const ip = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim() : '127.0.0.1';
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
