/**
 * historico.js
 * Módulo para carregar e exibir o histórico de auditoria do sistema
 */

// ========================================
// CARREGAR HISTÓRICO
// ========================================
window.carregarHistorico = async function (pagina = 0) {
    console.log('📜 Carregando histórico, página:', pagina);

    const container = document.getElementById('lista-historico');
    if (!container) {
        console.error('❌ Container lista-historico não encontrado');
        return;
    }

    // Mostrar loading
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <i data-lucide="loader-2" style="width: 32px; height: 32px; animation: spin 1s linear infinite;"></i>
            <p>Carregando histórico...</p>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const limite = 20;
        const response = await fetch(`${window.API_URL}/api/historico?limite=${limite}&pagina=${pagina}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.sucesso) {
            throw new Error(result.erro || 'Erro ao carregar histórico');
        }

        const logs = result.dados;
        const total = result.total;
        const totalPaginas = result.total_paginas;

        console.log(`✅ ${logs.length} registros de log carregados (total: ${total})`);

        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <i data-lucide="history" style="width: 64px; height: 64px; opacity: 0.3;"></i>
                    <h3 style="margin-top: 20px;">Nenhuma atividade registrada</h3>
                    <p style="font-size: 0.9rem;">O histórico de alterações aparecerá aqui conforme o sistema for utilizado.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // Renderizar logs
        let html = `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-primary);">
                <strong>${total}</strong> registros de atividade encontrados
            </div>
        `;

        html += logs.map(log => {
            const data = new Date(log.data_registro);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Ícone e cor baseados na ação
            let icone, cor, bgCor;
            switch (log.acao) {
                case 'CREATE':
                    icone = 'plus-circle';
                    cor = '#10B981';
                    bgCor = '#D1FAE5';
                    break;
                case 'UPDATE':
                    icone = 'edit-2';
                    cor = '#3B82F6';
                    bgCor = '#DBEAFE';
                    break;
                case 'DELETE':
                    icone = 'trash-2';
                    cor = '#EF4444';
                    bgCor = '#FEE2E2';
                    break;
                case 'IMPORT':
                    icone = 'upload';
                    cor = '#8B5CF6';
                    bgCor = '#EDE9FE';
                    break;
                default:
                    icone = 'activity';
                    cor = '#6B7280';
                    bgCor = '#F3F4F6';
            }

            return `
                <div style="display: flex; gap: 15px; padding: 15px; margin-bottom: 10px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 8px;">
                    <div style="flex-shrink: 0; width: 40px; height: 40px; background: ${bgCor}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="${icone}" style="width: 20px; height: 20px; color: ${cor};"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <strong style="color: var(--text-primary);">${log.descricao || log.acao}</strong>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">
                                ${dataFormatada} às ${horaFormatada}
                            </span>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-secondary);">
                            <span style="background: ${bgCor}; color: ${cor}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                                ${log.acao}
                            </span>
                            <span>📁 ${log.entidade_afetada || 'Sistema'}</span>
                            ${log.registro_id ? `<span>#${log.registro_id}</span>` : ''}
                            <span>👤 ${log.usuario || 'Sistema'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Paginação
        if (totalPaginas > 1) {
            html += `
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                    <button class="btn btn-secondary" ${pagina === 0 ? 'disabled' : ''} onclick="carregarHistorico(${pagina - 1})">
                        <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i> Anterior
                    </button>
                    <span style="display: flex; align-items: center; gap: 5px;">
                        Página <strong>${pagina + 1}</strong> de <strong>${totalPaginas}</strong>
                    </span>
                    <button class="btn btn-secondary" ${pagina >= totalPaginas - 1 ? 'disabled' : ''} onclick="carregarHistorico(${pagina + 1})">
                        Próxima <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            `;
        }

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #EF4444;">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>
                <p>Erro ao carregar histórico</p>
                <p style="font-size: 0.85rem;">${error.message}</p>
                <button class="btn btn-secondary" onclick="carregarHistorico()" style="margin-top: 15px;">
                    <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Tentar novamente
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

console.log('✅ historico.js carregado');
