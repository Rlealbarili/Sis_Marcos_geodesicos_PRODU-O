const { chromium } = require('playwright');

(async () => {
    // Iniciar o navegador
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navegar para a aplicação
        await page.goto('http://localhost:3002');
        
        // Aguardar carregamento
        await page.waitForLoadState('networkidle');
        
        console.log('Página carregada com sucesso');

        // Testar botão "Novo Marco"
        try {
            const novoMarcoBtn = await page.locator('button:has-text("Novo Marco")');
            if (await novoMarcoBtn.count() > 0) {
                await novoMarcoBtn.click();
                console.log('✅ Botão "Novo Marco" clicado');
                
                // Esperar um pouco e verificar se o modal abriu
                await page.waitForTimeout(1000);
                
                const modal = await page.locator('#modal-novo-marco').isVisible();
                if (modal) {
                    console.log('✅ Modal "Novo Marco" aberto');
                } else {
                    console.log('⚠️ Modal "Novo Marco" não aberto');
                }
                
                // Fechar o modal
                await page.locator('button:has-text("Cancelar")').click();
            } else {
                console.log('⚠️ Botão "Novo Marco" não encontrado');
            }
        } catch (e) {
            console.log('❌ Erro ao clicar no botão "Novo Marco":', e.message);
        }

        // Testar botão "Importar CSV" na aba de busca
        try {
            // Primeiro ir para a aba de busca
            await page.locator('a:has-text("Buscar Marcos")').click();
            await page.waitForTimeout(500);
            
            const importarCSVBtn = await page.locator('button:has-text("Importar CSV")');
            if (await importarCSVBtn.count() > 0) {
                await importarCSVBtn.click();
                console.log('✅ Botão "Importar CSV" clicado');
                
                // Esperar um pouco e verificar se o modal abriu
                await page.waitForTimeout(1000);
                
                const csvModal = await page.locator('#modal-importar-csv').isVisible();
                if (csvModal) {
                    console.log('✅ Modal "Importar CSV" aberto');
                } else {
                    console.log('⚠️ Modal "Importar CSV" não aberto');
                }
                
                // Fechar o modal
                await page.locator('button.btn-icon').nth(1).click(); // Segundo botão de fechar
            } else {
                console.log('⚠️ Botão "Importar CSV" não encontrado');
            }
        } catch (e) {
            console.log('❌ Erro ao clicar no botão "Importar CSV":', e.message);
        }

        // Testar botão "Nova Propriedade" na aba de propriedades
        try {
            await page.locator('a:has-text("Propriedades")').click();
            await page.waitForTimeout(500);
            
            const novaPropriedadeBtn = await page.locator('button:has-text("Nova Propriedade")');
            if (await novaPropriedadeBtn.count() > 0) {
                await novaPropriedadeBtn.click();
                console.log('✅ Botão "Nova Propriedade" clicado');
                
                // Esperar um pouco e verificar se o modal abriu
                await page.waitForTimeout(1000);
                
                const propModal = await page.locator('#modal-nova-propriedade').isVisible();
                if (propModal) {
                    console.log('✅ Modal "Nova Propriedade" aberto');
                } else {
                    console.log('⚠️ Modal "Nova Propriedade" não aberto');
                }
                
                // Fechar o modal
                await page.locator('button:has-text("Cancelar")').click();
            } else {
                console.log('⚠️ Botão "Nova Propriedade" não encontrado');
            }
        } catch (e) {
            console.log('❌ Erro ao clicar no botão "Nova Propriedade":', e.message);
        }

        // Testar botão "Novo Cliente" na aba de clientes
        try {
            await page.locator('a:has-text("Clientes")').click();
            await page.waitForTimeout(500);
            
            const novoClienteBtn = await page.locator('button:has-text("Novo Cliente")');
            if (await novoClienteBtn.count() > 0) {
                await novoClienteBtn.click();
                console.log('✅ Botão "Novo Cliente" clicado');
                
                // Esperar um pouco e verificar se o modal abriu
                await page.waitForTimeout(1000);
                
                const clienteModal = await page.locator('#modal-novo-cliente').isVisible();
                if (clienteModal) {
                    console.log('✅ Modal "Novo Cliente" aberto');
                } else {
                    console.log('⚠️ Modal "Novo Cliente" não aberto');
                }
                
                // Fechar o modal
                await page.locator('button:has-text("Cancelar")').click();
            } else {
                console.log('⚠️ Botão "Novo Cliente" não encontrado');
            }
        } catch (e) {
            console.log('❌ Erro ao clicar no botão "Novo Cliente":', e.message);
        }

        console.log('Teste concluído');
        
        // Aguardar antes de fechar
        await page.waitForTimeout(3000);
        
    } catch (error) {
        console.error('Erro durante o teste:', error);
    } finally {
        await browser.close();
    }
})();