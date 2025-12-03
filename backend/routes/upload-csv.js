const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const format = require('pg-format');
const { pool } = require('../database/postgres-connection');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'csv-upload-' + uniqueSuffix + '.csv');
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são permitidos'));
        }
    }
});

// Função de Inteligência: Sanitizar Números PT-BR
function limparNumero(valor) {
    if (!valor) return null;
    let str = String(valor).trim();

    // Remove aspas simples ou duplas extras
    str = str.replace(/^["']|["']$/g, '');

    // Se estiver vazio após limpar
    if (str === '') return null;

    // Detecção de formato brasileiro (1.234,56) vs Americano (1,234.56)
    // Lógica simples: Se tem vírgula, assume que é decimal e remove pontos de milhar
    if (str.includes(',')) {
        str = str.replace(/\./g, ''); // Remove pontos de milhar
        str = str.replace(',', '.');  // Troca vírgula decimal por ponto
    }

    const numero = parseFloat(str);
    return isNaN(numero) ? null : numero;
}

// Função principal para manipular a importação de CSV (mantendo o nome original para compatibilidade)
async function importarCsv(req, res, next) {
    console.log('📥 [ETL] Iniciando processamento inteligente de CSV...');

    // Verifica flag de simulação
    const simulacao = req.body.simulacao === 'true' || req.query.simulacao === 'true';
    if (simulacao) console.log('🧪 MODO SIMULAÇÃO ATIVADO: Nenhuma alteração será persistida.');

    const client = await pool.connect();
    const resultados = { total: 0, validos: 0, pendentes: 0, erros: [] };
    const BATCH_SIZE = 1000;
    let batch = [];

    try {
        await client.query('BEGIN');

        // Função para processar e salvar lote
        const processarLote = async (dados) => {
            if (dados.length === 0) return;

            const query = format(
                `INSERT INTO marcos_levantados
                (codigo, tipo, localizacao, coordenada_e, coordenada_n, altitude, geometry, status_validacao, erro_validacao, lote_importacao, data_levantamento)
                VALUES %L
                ON CONFLICT (codigo) DO UPDATE SET
                    coordenada_e = EXCLUDED.coordenada_e,
                    coordenada_n = EXCLUDED.coordenada_n,
                    altitude = EXCLUDED.altitude,
                    geometry = EXCLUDED.geometry,
                    status_validacao = EXCLUDED.status_validacao,
                    erro_validacao = EXCLUDED.erro_validacao,
                    updated_at = NOW()`,
                dados
            );
            await client.query(query);
        };

        // Stream de Leitura
        const stream = fs.createReadStream(req.file.path)
            .pipe(csv({
                separator: ',', // O arquivo do usuário usa vírgula como separador de colunas
                mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalizar headers
            }));

        for await (const row of stream) {
            resultados.total++;

            // 1. Mapeamento Inteligente
            const codigo = row['código'] || row['codigo'] || row['id'];
            const rawE = row['e'] || row['easting'] || row['coordenada_e'];
            const rawN = row['n'] || row['northing'] || row['coordenada_n'];
            const rawH = row['h'] || row['altitude'] || row['cota'];
            const localizacao = row['localização'] || row['localizacao'] || 'Importado via CSV';

            // Determinar tipo pelo código (Ex: FHV-V-0001 -> V)
            let tipo = 'P'; // Default
            if (codigo && codigo.includes('-V-')) tipo = 'V';
            if (codigo && codigo.includes('-M-')) tipo = 'M';

            // 2. Sanitização e Conversão
            const coordE = limparNumero(rawE);
            const coordN = limparNumero(rawN);
            const altH = limparNumero(rawH);

            // 3. Validação de Regras de Negócio
            let status = 'VALIDADO';
            let erroMotivo = null;
            let geom = null;

            // Regra: Coordenadas Obrigatórias e Numéricas
            if (coordE === null || coordN === null) {
                status = 'PENDENTE';
                erroMotivo = 'Coordenadas nulas ou formato inválido';
            }
            // Regra: Range UTM Zona 22S (Aproximado para PR)
            else if (coordE < 100000 || coordE > 900000 || coordN < 6000000 || coordN > 8000000) {
                status = 'PENDENTE';
                erroMotivo = `Coordenadas fora do padrão UTM 22S (E:${coordE}, N:${coordN})`;
            } else {
                // Se válido, cria geometria PostGIS
                geom = `SRID=31982;POINT(${coordE} ${coordN})`;
            }

            if (status === 'VALIDADO') resultados.validos++;
            else resultados.pendentes++;

            // Adicionar ao Batch
            if (codigo) {
                batch.push([
                    codigo,
                    tipo,
                    localizacao,
                    coordE,
                    coordN,
                    altH,
                    geom, // Pode ser null se inválido
                    status,
                    erroMotivo,
                    `IMPORT-${new Date().toISOString().split('T')[0]}`, // Lote
                    new Date() // Data cadastro
                ]);
            }

            // Inserir se atingiu tamanho do lote
            if (batch.length >= BATCH_SIZE) {
                await processarLote(batch);
                batch = [];
            }
        }

        // Processar lote final
        if (batch.length > 0) {
            await processarLote(batch);
        }

        // Finalização
        if (simulacao) {
            await client.query('ROLLBACK');
            console.log('⏪ ROLLBACK executado (Modo Simulação)');
        } else {
            await client.query('COMMIT');
            console.log('💾 COMMIT executado (Dados Persistidos)');
        }

        // Resposta Detalhada
        res.json({
            sucesso: true,
            modo_simulacao: simulacao,
            estatisticas: resultados,
            mensagem: simulacao
                ? `Simulação OK! ${resultados.validos} válidos, ${resultados.pendentes} pendentes. Nada foi salvo.`
                : `Importação concluída! ${resultados.validos} salvos, ${resultados.pendentes} marcados como pendentes.`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro crítico na importação:', error);
        res.status(500).json({
            sucesso: false,
            erro: error.message,
            detalhes: "Verifique se o arquivo CSV está separado por vírgulas e possui colunas 'Código', 'E', 'N'."
        });
    } finally {
        client.release();
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path); // Limpar arquivo temp
        }
    }
}

// Rota principal de importação CSV
router.post('/', upload.single('csvFile'), importarCsv);

// Exportar a função específica para manipular a rota (mantendo compatibilidade com o server.js)
module.exports = {
    importarCsv
};