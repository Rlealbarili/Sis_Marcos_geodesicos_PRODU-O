const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../backend/server.js');
console.log(`📝 Removendo rota conflitante: ${targetFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// Bloco a ser removido (rota /api/marcos sem filtro busca)
const rotaARemover = `// ============================================
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

        const result = await query(\`
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
            WHERE \${whereClause}
            ORDER BY codigo
            LIMIT $1 OFFSET $2
        \`, [limite, offset]);

        const countResult = await query(\`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN validado = true AND geometry IS NOT NULL THEN 1 END) as levantados,
                COUNT(CASE WHEN validado = false OR geometry IS NULL THEN 1 END) as pendentes
            FROM marcos_levantados
        \`);

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
});`;

// Comentário substituto
const comentarioSubstituto = `// ============================================
// ENDPOINT: Listar Marcos
// ============================================
// NOTA: Esta rota foi movida para routes/marcos.js
// com suporte completo a filtros (busca, tipo, status, etc.)
// Não adicione lógica aqui - use routes/marcos.js
`;

if (content.includes(rotaARemover)) {
    content = content.replace(rotaARemover, comentarioSubstituto);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Rota conflitante removida do server.js!');
    console.log('   A rota agora será tratada por routes/marcos.js (com filtros).');
} else {
    console.log('⚠️ Bloco exato não encontrado. Tentando busca alternativa...');

    // Tenta encontrar a rota de outra forma
    const markerStart = "app.get('/api/marcos', async (req, res) => {";
    const startIdx = content.indexOf(markerStart);

    if (startIdx !== -1) {
        // Encontra o final da função
        let braceCount = 0;
        let endIdx = startIdx;
        let foundStart = false;

        for (let i = startIdx; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
                foundStart = true;
            } else if (content[i] === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                    endIdx = i + 3; // Inclui '}); '
                    break;
                }
            }
        }

        // Remove a função e seus comentários anteriores
        const funcaoStart = content.lastIndexOf('// ============================================\n// ENDPOINT: Listar Marcos', startIdx);
        if (funcaoStart !== -1 && (startIdx - funcaoStart) < 200) {
            content = content.substring(0, funcaoStart) + comentarioSubstituto + content.substring(endIdx);
            fs.writeFileSync(targetFile, content, 'utf8');
            console.log('✅ Rota conflitante removida via busca alternativa!');
        } else {
            console.error('❌ Não foi possível localizar os limites da função.');
        }
    } else {
        console.error('❌ Rota /api/marcos não encontrada no server.js.');
    }
}
