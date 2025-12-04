const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const format = require('pg-format');
const { pool } = require('../database/postgres-connection');
const path = require('path');

// Configuração do Multer
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV ou Excel são permitidos.'));
        }
    }
});

// Função Auxiliar: Sanitizar Números (PT-BR e US)
function limparNumero(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor === 'number') return valor;
    
    let str = String(valor).trim();
    // Remove aspas e caracteres invisíveis
    str = str.replace(/["']/g, '').replace(/\s/g, '');
    
    if (str === '') return null;

    // Detecção de formato brasileiro (Ex: 1.234,56)
    // Se tem vírgula e ela aparece DEPOIS do último ponto (ou não tem ponto), é decimal
    if (str.includes(',')) {
        str = str.replace(/\./g, ''); // Remove milhar
        str = str.replace(',', '.');  // Vira decimal
    }
    
    const numero = parseFloat(str);
    return isNaN(numero) ? null : numero;
}

router.post('/', upload.single('csvFile'), async (req, res) => {
    console.log(`📥 [ETL] Recebido arquivo: ${req.file.originalname}`);
    
    const simulacao = req.body.simulacao === 'true' || req.query.simulacao === 'true';
    if (simulacao) console.log('🧪 MODO SIMULAÇÃO ATIVADO');

    const client = await pool.connect();
    const resultados = { total: 0, validos: 0, pendentes: 0, erros: [] };
    const BATCH_SIZE = 1000; // Tamanho do lote para inserção
    let batch = [];
    const ext = path.extname(req.file.originalname).toLowerCase();

    try {
        await client.query('BEGIN');

        // Função unificada de processamento de linha
        const processarLinha = async (row, origem) => {
            resultados.total++;
            
            // Normalização de chaves (Lower Case)
            const dados = {};
            Object.keys(row).forEach(key => {
                // Remove caracteres estranhos da chave e joga para minúsculo
                const cleanKey = key.toString().trim().toLowerCase();
                dados[cleanKey] = row[key];
            });

            // 1. Mapeamento Inteligente (Aceita variações)
            const codigo = dados['código'] || dados['codigo'] || dados['id'] || dados['identificador'];
            const rawE = dados['e'] || dados['easting'] || dados['coordenada_e'] || dados['utme'];
            const rawN = dados['n'] || dados['northing'] || dados['coordenada_n'] || dados['utmn'];
            const rawH = dados['h'] || dados['altitude'] || dados['cota'] || dados['z'] || dados['elevacao'];
            const localizacao = dados['localização'] || dados['localizacao'] || dados['local'] || origem;
            
            // Ignorar linhas vazias ou sem código
            if (!codigo) return;

            // Determinar tipo pelo código (Regra de Negócio COGEP)
            let tipo = 'P'; // Default: Ponto
            const codStr = String(codigo).toUpperCase();
            if (codStr.includes('-V-') || codStr.startsWith('V')) tipo = 'V'; // Vértice
            if (codStr.includes('-M-') || codStr.startsWith('M')) tipo = 'M'; // Marco
            if (codStr.includes('RN')) tipo = 'M'; // Referência de Nível

            // 2. Sanitização
            const coordE = limparNumero(rawE);
            const coordN = limparNumero(rawN);
            const altH = limparNumero(rawH);

            // 3. Validação de Integridade
            let status = 'VALIDADO';
            let erroMotivo = null;
            let geom = null;

            if (coordE === null || coordN === null) {
                status = 'PENDENTE';
                erroMotivo = 'Coordenadas nulas ou inválidas';
            } 
            // Validação de Range (Zona 22S Aprox)
            else if (coordE < 100000 || coordE > 900000 || coordN < 6000000 || coordN > 10000000) {
                status = 'PENDENTE';
                erroMotivo = `Coordenadas suspeitas (Fora do padrão UTM 22S)`;
            } else {
                geom = `SRID=31982;POINT(${coordE} ${coordN})`;
            }

            if (status === 'VALIDADO') resultados.validos++;
            else resultados.pendentes++;

            // Adicionar ao Batch
            batch.push([
                codigo, tipo, localizacao, coordE, coordN, altH, geom,
                status, erroMotivo, 
                `IMPORT-${new Date().toISOString().split('T')[0]}`, // Lote ID
                new Date()
            ]);

            // Disparar Batch se cheio
            if (batch.length >= BATCH_SIZE) {
                await salvarLote(batch);
                batch = [];
            }
        };

        const salvarLote = async (dados) => {
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

        // --- MOTOR DE LEITURA ---

        if (ext === '.xlsx' || ext === '.xls') {
            console.log('📊 Processando arquivo EXCEL (Multi-abas)...');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(req.file.path);
            
            // ITERAÇÃO SOBRE TODAS AS ABAS (A Correção Solicitada)
            for (const worksheet of workbook.worksheets) {
                console.log(`📑 Lendo aba: [${worksheet.name}]`);
                
                // Extrair cabeçalhos da linha 1 desta aba
                let headers = [];
                worksheet.getRow(1).eachCell((cell, colNumber) => {
                    headers[colNumber] = cell.value;
                });

                // Ler linhas de dados
                const rows = [];
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return; // Pula cabeçalho
                    const rowData = {};
                    let hasData = false;
                    
                    row.eachCell((cell, colNumber) => {
                        const header = headers[colNumber];
                        if (header) {
                            // Trata fórmulas e valores ricos
                            let val = cell.value;
                            if (val && typeof val === 'object') {
                                if(val.result !== undefined) val = val.result; // Fórmula
                                else if(val.text !== undefined) val = val.text; // Hyperlink
                            }
                            rowData[header] = val;
                            hasData = true;
                        }
                    });
                    if(hasData) rows.push(rowData);
                });

                // Processar dados da aba
                for (const row of rows) {
                    await processarLinha(row, `Planilha: ${worksheet.name}`);
                }
            }

        } else {
            console.log('📝 Processando arquivo CSV...');
            const stream = fs.createReadStream(req.file.path)
                .pipe(csv({ separator: ',' })); // Tenta vírgula (padrão)

            for await (const row of stream) {
                await processarLinha(row, 'Arquivo CSV');
            }
        }

        // Salvar resíduos do batch
        if (batch.length > 0) await salvarLote(batch);

        // Finalização da Transação
        if (simulacao) {
            await client.query('ROLLBACK');
            console.log(`⏪ ROLLBACK (Simulação). Processados: ${resultados.total}`);
        } else {
            await client.query('COMMIT');
            console.log(`💾 COMMIT (Produção). Processados: ${resultados.total}`);
        }

        res.json({
            sucesso: true,
            modo_simulacao: simulacao,
            estatisticas: resultados,
            mensagem: simulacao 
                ? `Simulação finalizada. ${resultados.total} registros analisados.` 
                : `Importação concluída com sucesso. ${resultados.total} registros processados.`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro fatal no ETL:', error);
        res.status(500).json({ 
            sucesso: false, 
            erro: error.message,
            hint: "Verifique se o arquivo não está corrompido ou protegido por senha." 
        });
    } finally {
        client.release();
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch(e) {} // Limpeza
        }
    }
});

module.exports = router;