const express = require('express');
const router = express.Router();
const { query, pool } = require('../database/postgres-connection');
const registrarLog = require('../utils/logger');

// ========================================
// GET /api/propriedades - Listar todas
// ========================================

router.get('/', async (req, res) => {
    try {
        const { tipo, municipio, cliente_id, ativo, busca } = req.query;

        let sqlQuery = `SELECT
            p.id,
            p.nome_propriedade,
            p.matricula,
            p.tipo,
            p.municipio,
            p.uf,
            p.area_m2,
            p.perimetro_m,
            p.geometry,
            p.observacoes,
            p.created_at,
            p.updated_at,
            c.id as cliente_id,
            c.nome as cliente_nome,
            c.cpf_cnpj as cliente_cpf_cnpj
            FROM propriedades p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE 1=1`;
        const params = [];
        let paramIndex = 1;

        // Filtros
        if (tipo && tipo !== 'todos') {
            sqlQuery += ` AND tipo = $${paramIndex}`;
            params.push(tipo.toUpperCase());
            paramIndex++;
        }

        if (municipio && municipio !== 'todos') {
            sqlQuery += ` AND municipio = $${paramIndex}`;
            params.push(municipio);
            paramIndex++;
        }

        if (cliente_id) {
            sqlQuery += ` AND cliente_id = $${paramIndex}`;
            params.push(cliente_id);
            paramIndex++;
        }

        if (ativo !== undefined) {
            sqlQuery += ` AND ativo = $${paramIndex}`;
            params.push(ativo === 'true');
            paramIndex++;
        }

        if (busca) {
            sqlQuery += ` AND (nome_propriedade ILIKE $${paramIndex} OR municipio ILIKE $${paramIndex} OR matricula ILIKE $${paramIndex})`;
            params.push(`%${busca}%`);
            paramIndex++;
        }

        sqlQuery += ' ORDER BY nome_propriedade ASC';

        const result = await query(sqlQuery, params);

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Erro ao buscar propriedades:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar propriedades',
            error: error.message
        });
    }
});

// ========================================
// GET /api/propriedades/:id - Buscar por ID
// ========================================

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT
                p.*,
                ST_AsGeoJSON(ST_Transform(p.geometry, 4326)) as geojson,
                c.nome as cliente_nome,
                c.cpf_cnpj as cliente_cpf_cnpj
            FROM propriedades p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propriedade não encontrada'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao buscar propriedade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar propriedade',
            error: error.message
        });
    }
});

// ========================================
// POST /api/propriedades - Criar nova
// ========================================

router.post('/', async (req, res) => {
    try {
        const {
            nome_propriedade,
            tipo,
            matricula,
            municipio,
            comarca,
            uf,
            area_m2,
            perimetro_m,
            endereco,
            cliente_id,
            observacoes
        } = req.body;

        // Validações
        if (!nome_propriedade || !tipo || !municipio) {
            return res.status(400).json({
                success: false,
                message: 'Nome, tipo e município são obrigatórios'
            });
        }

        const tipoUpper = tipo.toUpperCase();
        if (!['RURAL', 'URBANA', 'INDUSTRIAL', 'COMERCIAL'].includes(tipoUpper)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo inválido (use: RURAL, URBANA, INDUSTRIAL, COMERCIAL)'
            });
        }

        const result = await query(
            `INSERT INTO propriedades
            (nome_propriedade, tipo, matricula, municipio, comarca, uf, area_m2, perimetro_m, endereco, cliente_id, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [nome_propriedade, tipoUpper, matricula, municipio, comarca, uf || 'PR', area_m2, perimetro_m, endereco, cliente_id, observacoes]
        );

        // Registrar log de auditoria
        await registrarLog('Sistema', 'CREATE', 'propriedade', result.rows[0].id, `Propriedade criada: ${nome_propriedade}`, req);

        res.status(201).json({
            success: true,
            message: 'Propriedade criada com sucesso',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao criar propriedade:', error);

        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao criar propriedade',
            error: error.message
        });
    }
});

// ========================================
// PUT /api/propriedades/:id - Atualizar
// ========================================

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome_propriedade,
            tipo,
            matricula,
            municipio,
            comarca,
            uf,
            area_m2,
            perimetro_m,
            endereco,
            cliente_id,
            observacoes,
            ativo
        } = req.body;

        // Converter tipo para uppercase se fornecido
        const tipoUpper = tipo ? tipo.toUpperCase() : null;

        const result = await query(
            `UPDATE propriedades
            SET nome_propriedade = COALESCE($1, nome_propriedade),
                tipo = COALESCE($2, tipo),
                matricula = COALESCE($3, matricula),
                municipio = COALESCE($4, municipio),
                comarca = COALESCE($5, comarca),
                uf = COALESCE($6, uf),
                area_m2 = COALESCE($7, area_m2),
                perimetro_m = COALESCE($8, perimetro_m),
                endereco = COALESCE($9, endereco),
                cliente_id = COALESCE($10, cliente_id),
                observacoes = COALESCE($11, observacoes),
                ativo = COALESCE($12, ativo)
            WHERE id = $13
            RETURNING *`,
            [nome_propriedade, tipoUpper, matricula, municipio, comarca, uf, area_m2, perimetro_m, endereco, cliente_id, observacoes, ativo, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propriedade não encontrada'
            });
        }

        // Registrar log de auditoria
        await registrarLog('Sistema', 'UPDATE', 'propriedade', id, `Propriedade atualizada: ${result.rows[0].nome_propriedade}`, req);

        res.json({
            success: true,
            message: 'Propriedade atualizada com sucesso',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar propriedade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar propriedade',
            error: error.message
        });
    }
});

// ========================================
// DELETE /api/propriedades/:id - Excluir
// ========================================

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se tem marcos vinculados (se tabela marcos_geodesicos existir)
        try {
            const checkMarcos = await query(
                `SELECT EXISTS(
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'marcos_geodesicos'
                ) as table_exists`,
                []
            );

            if (checkMarcos.rows[0].table_exists) {
                const countMarcos = await query(
                    'SELECT COUNT(*) as count FROM marcos_geodesicos WHERE propriedade_id = $1',
                    [id]
                );

                if (parseInt(countMarcos.rows[0].count) > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Não é possível excluir propriedade com marcos vinculados'
                    });
                }
            }
        } catch (checkError) {
            // Se der erro ao verificar, continua com a exclusão
            console.warn('Aviso ao verificar marcos:', checkError.message);
        }

        const result = await query(
            'DELETE FROM propriedades WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propriedade não encontrada'
            });
        }

        // Registrar log de auditoria
        await registrarLog('Sistema', 'DELETE', 'propriedade', id, `Propriedade excluída: ${result.rows[0].nome_propriedade}`, req);

        res.json({
            success: true,
            message: 'Propriedade excluída com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir propriedade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir propriedade',
            error: error.message
        });
    }
});

// ========================================
// GET /api/propriedades/:id/dxf - Exportar DXF
// Protocolo Petrovich: Exportação CAD Profissional
// ========================================
const { generateDXF } = require('../utils/dxf-generator');

router.get('/:id/dxf', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DXF Export] Iniciando exportação da propriedade ${id}`);

        // 1. Buscar geometria (WGS84)
        const result = await query(`
            SELECT 
                p.id, 
                p.nome_propriedade, 
                p.matricula,
                p.municipio,
                p.uf,
                p.area_m2,
                p.perimetro_m,
                ST_AsGeoJSON(ST_Transform(p.geometry, 4326)) as geojson
            FROM propriedades p 
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propriedade não encontrada'
            });
        }

        const prop = result.rows[0];

        if (!prop.geojson) {
            return res.status(400).json({
                success: false,
                message: 'Propriedade não possui geometria para exportar'
            });
        }

        const geojson = JSON.parse(prop.geojson);
        console.log(`[DXF Export] Geometria: ${geojson.type}`);

        // 2. Busca Inteligente de Marcos (Com Tolerância Espacial)
        // Usa bloco try/catch isolado para não derrubar a exportação se esta query falhar
        let marcosData = [];
        try {
            /* Lógica ST_DWithin: Busca pontos que estão a até 0.000001 graus (~10cm) 
               do polígono. Isso corrige erros de precisão flutuante onde o ponto 
               está matematicamente "fora" por milímetros.
            */
            const marcosQuery = await query(`
                SELECT codigo, tipo, 
                       ST_X(geometria) as lng, 
                       ST_Y(geometria) as lat
                FROM marcos 
                WHERE ST_DWithin(
                    geometria, 
                    (SELECT geometry FROM propriedades WHERE id = $1), 
                    0.000001
                )
            `, [id]);

            if (marcosQuery.rows.length > 0) {
                marcosData = marcosQuery.rows.map(m => ({
                    nome: m.codigo,
                    coords: [m.lng, m.lat]
                }));
                console.log(`[DXF Export] ${marcosData.length} marcos vinculados encontrados para prop ID ${id}.`);
            } else {
                console.warn(`[DXF Export] Aviso: Nenhum marco encontrado na proximidade da propriedade ID ${id}. Gerando apenas perímetro.`);
            }

        } catch (err) {
            console.error('[DXF Export] Erro não-fatal ao buscar marcos:', err.message);
            // Segue a vida com array vazio, não aborta.
        }

        // 3. Preparar dados para o Gerador DXF
        const dxfData = {
            perimetro: geojson.coordinates, // Array de coords [[lng,lat], ...]
            marcos: marcosData, // Passa a lista (cheia ou vazia)
            textos: []
        };

        // Adicionar textos informativos no primeiro ponto do perímetro
        if (geojson.coordinates && geojson.coordinates[0] && geojson.coordinates[0][0]) {
            const firstCoord = geojson.coordinates[0][0];
            dxfData.textos.push({
                content: prop.nome_propriedade || 'Propriedade',
                coords: firstCoord,
                height: 5.0
            });
            if (prop.area_m2) {
                dxfData.textos.push({
                    content: `Area: ${Number(prop.area_m2).toFixed(2)} m2`,
                    coords: [firstCoord[0], firstCoord[1] - 0.0001],
                    height: 3.0
                });
            }
            if (prop.matricula) {
                dxfData.textos.push({
                    content: `Matr: ${prop.matricula}`,
                    coords: [firstCoord[0], firstCoord[1] - 0.0002],
                    height: 2.5
                });
            }
        }

        // 4. Gerar DXF
        const dxfContent = generateDXF(dxfData);
        console.log(`[DXF Export] Arquivo gerado com ${dxfContent.length} bytes`);

        // 5. Enviar como download
        const filename = (prop.nome_propriedade || `propriedade_${id}`)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}.dxf"`);
        res.setHeader('Content-Type', 'application/dxf');
        res.send(dxfContent);

        console.log(`[DXF Export] Download enviado: ${filename}.dxf`);

    } catch (error) {
        console.error('[DXF Export] Erro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar arquivo DXF',
            error: error.message
        });
    }
});

module.exports = router;
