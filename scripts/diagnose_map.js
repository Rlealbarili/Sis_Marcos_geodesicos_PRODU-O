const { chromium } = require('playwright');

(async () => {
    console.log("🕵️ INICIANDO DIAGNÓSTICO FORENSE DO MAPA...");
    const browser = await chromium.launch(); // { headless: false } se quiser ver
    const page = await browser.newPage();

    // 1. ESCUTA DE CONSOLE (Captura erros silenciosos do JS)
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning')
            console.log(`[CONSOLE BROWSER ${msg.type().toUpperCase()}]: ${msg.text()}`);
    });

    // Ajuste a URL para o seu ambiente local (porta do Docker é 3002)
    try {
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
        console.log("Erro ao carregar página. Verifique a URL no script. Erro:", e.message);
        await browser.close();
        return;
    }

    // 2. SIMULAÇÃO DO USUÁRIO
    console.log("👉 Clicando na aba Marcos...");
    try {
        await page.click('.nav-link[data-view="marcos"]');
    } catch (e) {
        console.log("Erro ao clicar em marcos:", e.message);
    }

    // Aguarda o momento em que o mapa DEVERIA estar visível (500ms)
    await page.waitForTimeout(500);

    const mapSelector = '#map'; // Confirme se o ID é este ou #mapa
    const mapEl = await page.$(mapSelector);

    if (!mapEl) {
        console.error("⛔ CRÍTICO: Elemento #map não existe no DOM nem no início.");
        // Tenta verificar se existe #mapa
        const mapaEl = await page.$('#mapa');
        if (mapaEl) {
            console.log("➡️ Encontrado #mapa ao invés de #map. Continuando com #mapa...");
        } else {
            console.log("❌ Nem #map nem #mapa existem no DOM.");
        }
        await browser.close();
        return;
    }

    // SNAPSHOT 1: ESTADO SAUDÁVEL
    const box1 = await mapEl.boundingBox();
    console.log(`⏱️ T+0.5s (Estado Inicial): Altura Renderizada = ${box1 ? box1.height : 'NULL'}`);

    // 3. AGUARDA O "DESAPARECIMENTO" (Wait for the glitch)
    console.log("⏳ Aguardando 2 segundos para capturar a regressão...");
    await page.waitForTimeout(2000);

    // SNAPSHOT 2: ESTADO DOENTE
    const box2 = await mapEl.boundingBox();
    console.log(`⏱️ T+2.5s (Pós-Glitch): Altura Renderizada = ${box2 ? box2.height : 'NULL'}`);

    // 4. EXTRAÇÃO DE DADOS VITAIS (Por que sumiu?)
    const diagnosis = await mapEl.evaluate((el) => {
        const style = window.getComputedStyle(el);
        const parent = el.parentElement;
        const parentStyle = window.getComputedStyle(parent);

        return {
            element: {
                id: el.id,
                display: style.display,
                visibility: style.visibility,
                height: style.height,
                opacity: style.opacity,
                zIndex: style.zIndex,
                position: style.position,
                classList: el.className,
                hasChildren: el.children.length > 0 // O conteúdo do mapa (tiles) ainda está lá?
            },
            parent: {
                tag: parent.tagName,
                id: parent.id,
                display: parentStyle.display,
                height: parentStyle.height,
                classList: parent.className
            }
        };
    });

    console.log("\n📊 RELATÓRIO TÉCNICO:");
    console.table(diagnosis.element);
    console.log("Pai do Elemento:", diagnosis.parent);

    if (diagnosis.element.height === '0px') console.log("CONCLUSÃO: Colapso de Altura (CSS/Flexbox Issue)");
    if (diagnosis.element.display === 'none') console.log("CONCLUSÃO: Ocultamento Explícito (JS ou CSS .hidden)");
    if (!diagnosis.element.hasChildren) console.log("CONCLUSÃO: O conteúdo do mapa foi deletado do DOM (JS Crash ou Limpeza indevida)");

    await browser.close();
})();
