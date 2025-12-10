/**
 * Dashboard Operacional - Centro de Comando Geodésico
 * Módulo JavaScript para consumo da API e renderização de gráficos
 */

// Instâncias dos gráficos Chart.js (para poder destruir/recriar)
let chartTimeline = null;
let chartDistribuicao = null;

/**
 * Carrega dados do dashboard e renderiza interface
 */
async function carregarDashboard() {
    console.log('[Dashboard] Carregando dados...');

    try {
        const response = await fetch(`${API_URL}/api/dashboard/overview`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro ao carregar dashboard');
        }

        console.log('[Dashboard] Dados recebidos:', data);

        // Atualizar KPIs
        atualizarKPIs(data.kpis);

        // Renderizar Gráficos
        renderizarChartTimeline(data.timeline);
        renderizarChartDistribuicao(data.distribuicao_marcos);

        // Renderizar Top Clientes
        renderizarTopClientes(data.top_clientes);

        // Atualizar ícones Lucide
        if (typeof lucide !== 'undefined') lucide.createIcons();

        console.log('[Dashboard] Renderização concluída');

    } catch (error) {
        console.error('[Dashboard] Erro:', error);
        showToast('Erro ao carregar dashboard: ' + error.message, 'error');
    }
}

/**
 * Atualiza os 4 cards de KPIs
 */
function atualizarKPIs(kpis) {
    // Formatar número para pt-BR
    const formatNum = (num) => {
        return parseFloat(num).toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    // Área em hectares
    const hectaresEl = document.getElementById('kpi-hectares');
    if (hectaresEl) hectaresEl.textContent = formatNum(kpis.total_hectares);

    // Total de marcos
    const marcosEl = document.getElementById('kpi-marcos');
    if (marcosEl) marcosEl.textContent = formatNum(kpis.total_marcos);

    // Percentual levantados
    const marcosPctEl = document.getElementById('kpi-marcos-pct');
    if (marcosPctEl) marcosPctEl.textContent = `${kpis.pct_levantados}% levantados`;

    // Propriedades
    const propEl = document.getElementById('kpi-propriedades');
    if (propEl) propEl.textContent = formatNum(kpis.total_propriedades);

    // Eficiência
    const eficEl = document.getElementById('kpi-eficiencia');
    if (eficEl) eficEl.textContent = `${kpis.eficiencia_marcos_prop} marcos/prop`;

    // Clientes
    const clientesEl = document.getElementById('kpi-clientes');
    if (clientesEl) clientesEl.textContent = formatNum(kpis.total_clientes);
}

/**
 * Renderiza gráfico de timeline (barras)
 */
function renderizarChartTimeline(timeline) {
    const ctx = document.getElementById('chart-timeline');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (chartTimeline) chartTimeline.destroy();

    // Preparar dados
    const labels = timeline.map(t => t.mes);
    const valores = timeline.map(t => t.qtd);

    // Configurar Chart.js para estilo premium
    Chart.defaults.font.family = "'Inter', sans-serif";

    chartTimeline = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Marcos Cadastrados',
                data: valores,
                backgroundColor: 'rgba(132, 194, 37, 0.7)',
                borderColor: 'rgba(132, 194, 37, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(128, 128, 128, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Renderiza gráfico de distribuição (rosca)
 */
function renderizarChartDistribuicao(distribuicao) {
    const ctx = document.getElementById('chart-distribuicao');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (chartDistribuicao) chartDistribuicao.destroy();

    // Preparar dados
    const labels = distribuicao.map(d => d.tipo || 'Outros');
    const valores = distribuicao.map(d => parseInt(d.qtd));

    // Cores para cada tipo
    const cores = [
        'rgba(132, 194, 37, 0.8)',   // Verde COGEP
        'rgba(59, 130, 246, 0.8)',   // Azul
        'rgba(245, 158, 11, 0.8)',   // Amarelo
        'rgba(139, 92, 246, 0.8)',   // Roxo
        'rgba(236, 72, 153, 0.8)',   // Rosa
        'rgba(20, 184, 166, 0.8)'    // Teal
    ];

    chartDistribuicao = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores.slice(0, labels.length),
                borderWidth: 2,
                borderColor: 'var(--bg-secondary)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Renderiza lista de top clientes
 */
function renderizarTopClientes(clientes) {
    const container = document.getElementById('top-clientes-list');
    if (!container) return;

    if (!clientes || clientes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                Nenhum cliente cadastrado
            </div>
        `;
        return;
    }

    container.innerHTML = clientes.map((c, i) => `
        <div style="display: flex; align-items: center; gap: 15px; padding: 12px; background: var(--bg-primary); border-radius: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${i === 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-hover)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${i === 0 ? '#F59E0B' : 'var(--text-secondary)'};">
                ${i + 1}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary);">${c.nome}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    ${c.propriedades} propriedades · ${parseFloat(c.hectares).toLocaleString('pt-BR')} ha
                </div>
            </div>
        </div>
    `).join('');
}

// Expor função globalmente
window.carregarDashboard = carregarDashboard;
