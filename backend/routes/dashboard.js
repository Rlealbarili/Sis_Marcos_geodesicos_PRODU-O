/**
 * Dashboard Operacional - Centro de Comando Geodésico
 * Rota de Inteligência para KPIs e Gráficos
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/postgres-connection');

/**
 * GET /api/dashboard/overview
 * Retorna estatísticas agregadas para o dashboard
 */
router.get('/overview', async (req, res) => {
    try {
        // 1. KPIs Gerais (4 Cards principais)
        const kpisQuery = await query(`
            SELECT 
                (SELECT COUNT(*) FROM marcos_levantados) as total_marcos,
                (SELECT COUNT(*) FROM marcos_levantados WHERE validado = true) as marcos_levantados,
                (SELECT COUNT(*) FROM propriedades) as total_propriedades,
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COALESCE(SUM(area_m2), 0) / 10000 FROM propriedades) as total_hectares,
                (SELECT COALESCE(SUM(perimetro_m), 0) / 1000 FROM propriedades) as total_km_perimetro
        `);

        // 2. Distribuição por Tipo de Marco (Gráfico de Rosca)
        const tiposQuery = await query(`
            SELECT 
                COALESCE(tipo, 'OUTROS') as tipo, 
                COUNT(*) as qtd 
            FROM marcos_levantados 
            GROUP BY tipo
            ORDER BY qtd DESC
        `);

        // 3. Produção Mensal (Gráfico de Barras - Últimos 6 meses)
        const timelineQuery = await query(`
            SELECT 
                TO_CHAR(created_at, 'Mon/YY') as mes,
                DATE_TRUNC('month', created_at) as mes_ordem,
                COUNT(*) as qtd
            FROM marcos_levantados
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'Mon/YY'), DATE_TRUNC('month', created_at)
            ORDER BY mes_ordem ASC
        `);

        // 4. Top 5 Clientes por número de propriedades
        const topClientesQuery = await query(`
            SELECT 
                c.nome,
                COUNT(p.id) as total_propriedades,
                COALESCE(SUM(p.area_m2), 0) / 10000 as total_hectares
            FROM clientes c
            LEFT JOIN propriedades p ON p.cliente_id = c.id
            GROUP BY c.id, c.nome
            ORDER BY total_propriedades DESC
            LIMIT 5
        `);

        // 5. Propriedades por Tipo (Rural vs Urbana)
        const propTiposQuery = await query(`
            SELECT 
                COALESCE(tipo, 'RURAL') as tipo,
                COUNT(*) as qtd,
                COALESCE(SUM(area_m2), 0) / 10000 as hectares
            FROM propriedades
            GROUP BY tipo
        `);

        // Calcular eficiência (marcos por propriedade)
        const kpis = kpisQuery.rows[0];
        const eficiencia = kpis.total_propriedades > 0
            ? (kpis.total_marcos / kpis.total_propriedades).toFixed(1)
            : 0;

        // Percentual de marcos levantados
        const pctLevantados = kpis.total_marcos > 0
            ? ((kpis.marcos_levantados / kpis.total_marcos) * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            kpis: {
                total_hectares: parseFloat(kpis.total_hectares || 0).toFixed(2),
                total_marcos: parseInt(kpis.total_marcos || 0),
                marcos_levantados: parseInt(kpis.marcos_levantados || 0),
                pct_levantados: parseFloat(pctLevantados),
                total_propriedades: parseInt(kpis.total_propriedades || 0),
                total_clientes: parseInt(kpis.total_clientes || 0),
                total_km_perimetro: parseFloat(kpis.total_km_perimetro || 0).toFixed(2),
                eficiencia_marcos_prop: parseFloat(eficiencia)
            },
            distribuicao_marcos: tiposQuery.rows,
            distribuicao_propriedades: propTiposQuery.rows,
            timeline: timelineQuery.rows.map(r => ({
                mes: r.mes,
                qtd: parseInt(r.qtd)
            })),
            top_clientes: topClientesQuery.rows.map(c => ({
                nome: c.nome,
                propriedades: parseInt(c.total_propriedades),
                hectares: parseFloat(c.total_hectares || 0).toFixed(2)
            }))
        });

    } catch (error) {
        console.error('[Dashboard API] Erro:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
