const express = require('express');
const router = express.Router();
const { query, transaction } = require('../database/postgres-connection');

// Função auxiliar para registrar log
const registrarLog = require('../utils/logger');

// Importações para exportação DXF
const dxfGenerator = require('../utils/dxf-generator');

// ========================================
// GET /api/marcos - Listar todos (com paginação)
// ========================================
router.get('/', async (req, res) => {
    try {
        const { limite = 1000, offset = 0, tipo, municipio, estado, status, busca } = req.query;

        let sqlQuery = `
            SELECT
                id, codigo, tipo, localizacao,
                coordenada_e, coordenada_n, altitude,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson,
                data_levantamento, metodo, limites,
                precisao_e, precisao_n, precisao_h,
                validado, fonte, observacoes,
                status_validacao, erro_validacao,
                created_at, updated_at
            FROM marcos_levantados
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;

        // Filtros
        if (tipo && tipo !== 'todos') {
            sqlQuery += ` AND tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }

        if (municipio) {
            sqlQuery += ` AND municipio ILIKE $${paramIndex}`;
            params.push(`%${municipio}%`);
            paramIndex++;
        }

        if (estado) {
            sqlQuery += ` AND estado = $${paramIndex}`;
            params.push(estado);
            paramIndex++;
        }

        if (status) {
            sqlQuery += ` AND validado = $${paramIndex}`;
            params.push(status === 'true');
            paramIndex++;
        }

        if (busca) {
            sqlQuery += ` AND (codigo ILIKE $${paramIndex} OR localizacao ILIKE $${paramIndex} OR observacoes ILIKE $${paramIndex})`;
            params.push(`%${busca}%`);
            paramIndex++;
        }

        sqlQuery += ' ORDER BY codigo LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
        params.push(parseInt(limite), parseInt(offset));

        const result = await query(sqlQuery, params);

        // Contar total para paginação
        const countSql = 'SELECT COUNT(*) as total FROM marcos_levantados WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (tipo && tipo !== 'todos') {
            sqlQuery += ` AND tipo = $${countParamIndex}`;
            countParams.push(tipo);
            countParamIndex++;
        }

        if (municipio) {
            sqlQuery += ` AND municipio ILIKE $${countParamIndex}`;
            countParams.push(`%${municipio}%`);
            countParamIndex++;
        }

        if (estado) {
            sqlQuery += ` AND estado = $${countParamIndex}`;
            countParams.push(estado);
            countParamIndex++;
        }

        if (status) {
            sqlQuery += ` AND validado = $${countParamIndex}`;
            countParams.push(status === 'true');
            countParamIndex++;
        }

        if (busca) {
            sqlQuery += ` AND (codigo ILIKE $${countParamIndex} OR localizacao ILIKE $${countParamIndex} OR observacoes ILIKE $${countParamIndex})`;
            countParams.push(`%${busca}%`);
            countParamIndex++;
        }

        const countResult = await query(countSql, countParams);

        res.json({
            success: true,
            data: result.rows,
            total: parseInt(countResult.rows[0].total),
            limite: parseInt(limite),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Erro ao buscar marcos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar marcos',
            error: error.message
        });
    }
});

// ========================================
// GET /api/marcos/exportar-dxf - Download DXF
// ========================================
router.get('/exportar-dxf', async (req, res) => {
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

        // Gerar conteúdo do arquivo
        const dxfContent = dxfGenerator.gerarDXF(result.rows);

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

// ========================================
// GET /api/marcos/:id - Buscar por ID
// ========================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT
                id, codigo, tipo, localizacao,
                coordenada_e, coordenada_n, altitude,
                ST_Y(ST_Transform(geometry, 4326)) as latitude,
                ST_X(ST_Transform(geometry, 4326)) as longitude,
                ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geojson,
                data_levantamento, metodo, limites,
                precisao_e, precisao_n, precisao_h,
                validado, fonte, observacoes,
                status_validacao, erro_validacao,
                created_at, updated_at
            FROM marcos_levantados
            WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Marco não encontrado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao buscar marco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar marco',
            error: error.message
        });
    }
});

// ========================================
// POST /api/marcos - Criar novo
// ========================================
router.post('/', async (req, res) => {
    try {
        const {
            codigo, tipo, localizacao, coordenada_e, coordenada_n, altitude,
            data_levantamento, metodo, limites, precisao_e, precisao_n, precisao_h,
            validado, fonte, observacoes, municipio, estado
        } = req.body;

        // Validação básica
        if (!codigo || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Código e tipo são obrigatórios'
            });
        }

        // Converter coordenadas UTM para geometria
        let geometry = null;
        if (coordenada_e && coordenada_n) {
            // Converter para SIRGAS 2000 UTM Zone 22S
            geometry = `SRID=31982;POINT(${coordenada_e} ${coordenada_n})`;
        }

        const result = await query(
            `INSERT INTO marcos_levantados
            (codigo, tipo, localizacao, coordenada_e, coordenada_n, altitude,
             geometry, data_levantamento, metodo, limites,
             precisao_e, precisao_n, precisao_h,
             validado, fonte, observacoes, municipio, estado)
            VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromEWKT($7), $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *`,
            [
                codigo, tipo, localizacao, coordenada_e, coordenada_n, altitude,
                geometry, data_levantamento, metodo, limites,
                precisao_e, precisao_n, precisao_h,
                validado || false, fonte, observacoes, municipio, estado
            ]
        );

        // Registrar log de criação
        await registrarLog(
            req.user?.nome || 'Sistema',
            'CREATE',
            'marco',
            result.rows[0].id,
            `Criado marco ${result.rows[0].codigo}`,
            req
        );

        res.status(201).json({
            success: true,
            message: 'Marco criado com sucesso',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao criar marco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar marco',
            error: error.message
        });
    }
});

// ========================================
// PUT /api/marcos/:id - Atualizar
// ========================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Construir query dinamicamente
        const allowedFields = [
            'codigo', 'tipo', 'localizacao', 'coordenada_e', 'coordenada_n', 'altitude',
            'data_levantamento', 'metodo', 'limites', 'precisao_e', 'precisao_n', 'precisao_h',
            'validado', 'fonte', 'observacoes', 'municipio', 'estado'
        ];

        const setParts = [];
        const params = [];
        let paramIndex = 1;

        for (const field of allowedFields) {
            if (field in updates) {
                setParts.push(`${field} = $${paramIndex}`);
                params.push(updates[field]);
                paramIndex++;
            }
        }

        // Atualizar geometria se coordenadas forem fornecidas
        if (updates.coordenada_e && updates.coordenada_n) {
            setParts.push(`geometry = ST_GeomFromEWKT($${paramIndex})`);
            params.push(`SRID=31982;POINT(${updates.coordenada_e} ${updates.coordenada_n})`);
            paramIndex++;
        }

        if (setParts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo para atualizar'
            });
        }

        params.push(parseInt(id)); // ID para WHERE

        const result = await query(
            `UPDATE marcos_levantados SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Marco não encontrado'
            });
        }

        // Registrar log de atualização
        await registrarLog(
            req.user?.nome || 'Sistema',
            'UPDATE',
            'marco',
            result.rows[0].id,
            `Atualizado marco ${result.rows[0].codigo}`,
            req
        );

        res.json({
            success: true,
            message: 'Marco atualizado com sucesso',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar marco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar marco',
            error: error.message
        });
    }
});

// ========================================
// DELETE /api/marcos/:id - Excluir
// ========================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM marcos_levantados WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Marco não encontrado'
            });
        }

        // Registrar log de exclusão
        await registrarLog(
            req.user?.nome || 'Sistema',
            'DELETE',
            'marco',
            result.rows[0].id,
            `Excluído marco ${result.rows[0].codigo}`,
            req
        );

        res.json({
            success: true,
            message: 'Marco excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir marco:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir marco',
            error: error.message
        });
    }
});

module.exports = router;