const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log("🕵️ INICIANDO AUDITORIA DE INTEGRAÇÃO FRONT-BACK (PRE-AWS)...");
    console.log("=".repeat(60));

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const errosDetectados = [];
    const requisicoesEnviadas = [];

    // --- VETOR 1: ESCUTA DE REDE (The Sniffer) ---
    page.on('request', request => {
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
            const url = request.url();
            const method = request.method();

            requisicoesEnviadas.push({ method, url });

            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                console.log(`\n➡️ [ENVIANDO] ${method} ${url}`);
                const payload = request.postData();
                if (payload) {
                    console.log(`   Payload (primeiros 300 chars): ${payload.substring(0, 300)}${payload.length > 300 ? '...' : ''}`);
                } else {
                    console.log(`   Payload: (FormData ou binário - não visível via postData)`);
                }
            }
        }
    });

    page.on('response', async response => {
        const url = response.url();
        const status = response.status();

        if (status >= 400) {
            let bodyText = '';
            try { bodyText = await response.text(); } catch (e) { bodyText = '[Não foi possível ler o corpo]'; }

            const erro = {
                url,
                status,
                statusText: response.statusText(),
                body: bodyText.substring(0, 500)
            };
            errosDetectados.push(erro);

            console.error(`\n🔥 [ERRO CRÍTICO BACKEND] ${url}`);
            console.error(`   Status: ${status} ${response.statusText()}`);
            console.error(`   Body: ${bodyText.substring(0, 300)}`);

            // Diagnóstico de causa provável
            if (status === 404) console.error("   💡 DIAGNÓSTICO: Rota não existe no backend. Verifique server.js.");
            if (status === 500) console.error("   💡 DIAGNÓSTICO: Crash no servidor. Verifique logs do container.");
            if (status === 403 || status === 401) console.error("   💡 DIAGNÓSTICO: CORS ou Autenticação. Verifique headers.");

        } else if (url.includes('import') || url.includes('upload') || url.includes('memorial')) {
            console.log(`\n✅ [SUCESSO ENDPOINT IMPORT] ${url} -> ${status} OK`);
        }
    });

    // --- NAVEGAÇÃO ---
    const BASE_URL = 'http://localhost:3002'; // Porta do Docker

    try {
        console.log(`\n📡 Navegando para ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        console.log("✅ Página carregada com sucesso.");

        // --- VETOR 2: TESTE DO IMPORTAR MEMORIAL (DOCX) ---
        console.log("\n" + "=".repeat(60));
        console.log("📦 VETOR 2: TESTE DO FLUXO 'IMPORTAR MEMORIAL'");
        console.log("=".repeat(60));

        console.log("👉 Clicando na aba Importar...");
        await page.click('[data-view="importar"]');
        await page.waitForTimeout(500);

        // Procura pelo input de arquivo DOCX
        const fileInputDocx = await page.$('#file-input-docx');
        if (fileInputDocx) {
            console.log("📂 Input de arquivo DOCX encontrado. Simulando upload...");
            await fileInputDocx.setInputFiles({
                name: 'memorial_teste_auditoria.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                buffer: Buffer.from('AUDITORIA PLAYWRIGHT - TESTE DE INTEGRAÇÃO')
            });
            await page.waitForTimeout(1000);

            // Verifica se disparou alguma requisição
            console.log("⏳ Aguardando processamento (5s)...");
            await page.waitForTimeout(5000);
        } else {
            console.warn("⚠️ Input #file-input-docx não encontrado. Procurando alternativas...");
            const anyFileInput = await page.$('input[type="file"]');
            if (anyFileInput) {
                console.log("➡️ Encontrado input genérico de arquivo.");
            } else {
                console.error("❌ Nenhum input de arquivo encontrado na aba Importar.");
            }
        }

        // --- VETOR 2B: TESTE DO MODAL CSV ---
        console.log("\n📦 VETOR 2B: TESTE DO MODAL 'IMPORTAR CSV'");

        // Primeiro, vai para aba Marcos (onde está o botão de CSV)
        console.log("👉 Navegando para aba Marcos...");
        await page.click('[data-view="marcos"]');
        await page.waitForTimeout(500);

        // Tenta clicar no botão de importar CSV
        const btnImportCsv = await page.$('#btn-import-csv');
        if (btnImportCsv) {
            console.log("👉 Clicando em 'Importar CSV'...");
            await btnImportCsv.click();
            await page.waitForTimeout(500);

            // Verifica se modal abriu
            const modalCsv = await page.$('#modal-importar-csv');
            if (modalCsv) {
                const isVisible = await modalCsv.evaluate(el => el.style.display !== 'none' && el.classList.contains('active') || el.style.display === 'flex');
                console.log(`   Modal CSV Visível: ${isVisible}`);

                // Simula upload de arquivo CSV
                const fileInputCsv = await page.$('#file-input-importar');
                if (fileInputCsv) {
                    console.log("📂 Simulando upload de arquivo CSV...");
                    await fileInputCsv.setInputFiles({
                        name: 'marcos_teste.csv',
                        mimeType: 'text/csv',
                        buffer: Buffer.from('codigo,latitude,longitude\nTESTE001,-15.123456,-47.654321')
                    });
                    await page.waitForTimeout(1000);

                    // Verifica se botão foi habilitado
                    const btnExecutar = await page.$('#btn-executar-importacao');
                    if (btnExecutar) {
                        const isDisabled = await btnExecutar.evaluate(el => el.disabled);
                        console.log(`   Botão 'Iniciar Análise' habilitado: ${!isDisabled}`);

                        if (!isDisabled) {
                            console.log("🚀 Clicando em 'Iniciar Análise'...");
                            await btnExecutar.click();
                            console.log("⏳ Aguardando resposta da API (10s)...");
                            await page.waitForTimeout(10000);
                        }
                    }
                }
            } else {
                console.error("❌ Modal de importação CSV não encontrado no DOM.");
            }
        } else {
            console.warn("⚠️ Botão #btn-import-csv não encontrado.");
        }

        // Fecha modal se aberto
        const closeBtn = await page.$('.close-modal');
        if (closeBtn) await closeBtn.click();
        await page.waitForTimeout(300);

        // --- VETOR 3: SMOKE TEST DAS ABAS ---
        console.log("\n" + "=".repeat(60));
        console.log("🔥 VETOR 3: VARREDURA DE INTEGRIDADE (SMOKE TEST)");
        console.log("=".repeat(60));

        const abas = ['mapa', 'marcos', 'propriedades', 'clientes', 'historico'];

        for (const aba of abas) {
            console.log(`\n👉 Testando aba: ${aba}...`);
            const seletor = `[data-view="${aba}"]`;
            const link = await page.$(seletor);
            if (link) {
                await link.click();
                await page.waitForTimeout(2000); // Aguarda lazy load de dados
                console.log(`   ✅ Aba "${aba}" carregada. Verificando erros...`);
            } else {
                console.error(`   ❌ Link para aba "${aba}" não encontrado.`);
            }
        }

    } catch (error) {
        console.error("\n❌ FALHA NA EXECUÇÃO DO TESTE:", error.message);
    }

    // --- RELATÓRIO FINAL ---
    console.log("\n" + "=".repeat(60));
    console.log("📊 RELATÓRIO FINAL DA AUDITORIA");
    console.log("=".repeat(60));

    console.log(`\n📡 Total de Requisições XHR/Fetch: ${requisicoesEnviadas.length}`);
    requisicoesEnviadas.forEach(r => console.log(`   - ${r.method} ${r.url}`));

    if (errosDetectados.length > 0) {
        console.log(`\n🔥 ERROS DETECTADOS: ${errosDetectados.length}`);
        errosDetectados.forEach((e, i) => {
            console.log(`\n   [ERRO ${i + 1}]`);
            console.log(`   URL: ${e.url}`);
            console.log(`   Status: ${e.status} ${e.statusText}`);
            console.log(`   Body: ${e.body.substring(0, 200)}`);
        });
        console.log("\n🩺 VEREDICTO: FALHA DE INTEGRAÇÃO CONFIRMADA.");
    } else {
        console.log("\n✅ Nenhum erro HTTP detectado durante a auditoria.");
        console.log("🩺 VEREDICTO: Integração Front-Back parece saudável (neste fluxo testado).");
    }

    await browser.close();
    console.log("\n🏁 Auditoria finalizada.");
})();
