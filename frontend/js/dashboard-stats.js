// Função para carregar e atualizar as estatísticas no dashboard
async function carregarEstatisticasDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/estatisticas`);
        const data = await response.json();

        if (response.ok) {
            // Atualizar os elementos de estatísticas no dashboard
            if (document.getElementById('stat-marcos')) {
                document.getElementById('stat-marcos').textContent = formatarNumeroMilhar(data.total_marcos);
            }
            if (document.getElementById('stat-levantados')) {
                document.getElementById('stat-levantados').textContent = formatarNumeroMilhar(data.marcos_levantados);
            }
            if (document.getElementById('stat-propriedades')) {
                // Vamos buscar as estatísticas de propriedades separadamente
                await carregarEstatisticasPropriedades();
            }
            if (document.getElementById('stat-clientes')) {
                // Vamos buscar as estatísticas de clientes separadamente
                await carregarEstatisticasClientes();
            }
            
            // Atualizar os ícones Lucide após atualizar os dados
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            console.error('Erro na API de estatísticas:', data.error);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Função para carregar estatísticas de propriedades
async function carregarEstatisticasPropriedades() {
    try {
        const response = await fetch(`${API_URL}/api/propriedades?limite=1`);
        const data = await response.json();
        
        if (document.getElementById('stat-propriedades')) {
            const total = data.total || 0;
            document.getElementById('stat-propriedades').textContent = formatarNumeroMilhar(total);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas de propriedades:', error);
    }
}

// Função para carregar estatísticas de clientes
async function carregarEstatisticasClientes() {
    try {
        const response = await fetch(`${API_URL}/api/clientes`);
        const data = await response.json();
        
        if (document.getElementById('stat-clientes')) {
            const total = data.total || 0;
            document.getElementById('stat-clientes').textContent = formatarNumeroMilhar(total);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas de clientes:', error);
    }
}

// Função auxiliar para formatar números com separador de milhar
function formatarNumeroMilhar(numero) {
    if (numero === null || numero === undefined) return '0';
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Função para atualizar os ícones Lucide após conteúdo dinâmico
function atualizarIconesLucide() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Iniciar atualização automática das estatísticas (a cada 30 segundos)
function iniciarAtualizacaoAutomatica() {
    // Atualizar imediatamente
    carregarEstatisticasDashboard();
    
    // Depois atualizar a cada 30 segundos
    setInterval(carregarEstatisticasDashboard, 30000);
}