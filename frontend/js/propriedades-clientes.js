// Funções de filtragem e busca para propriedades e clientes

/**
 * Filtra propriedades com base nos critérios de busca
 * Esta função faz uma chamada ao backend para buscar os dados filtrados
 */
async function filtrarPropriedades() {
    try {
        console.log('Filtrando propriedades...');
        
        const busca = document.getElementById('busca-propriedade')?.value || '';
        const tipo = document.getElementById('filtro-tipo-propriedade')?.value || '';
        const municipio = document.getElementById('filtro-municipio-propriedade')?.value || '';
        
        // Construir a URL com filtros
        let url = `${API_URL}/api/propriedades?limite=100`; // Limite para evitar sobrecarga
        if (busca) url += `&busca=${encodeURIComponent(busca)}`;
        if (tipo) url += `&tipo=${encodeURIComponent(tipo)}`;
        if (municipio) url += `&municipio=${encodeURIComponent(municipio)}`;
        
        // Mostrar loading
        const grid = document.getElementById('propriedades-grid');
        const loading = document.getElementById('propriedades-loading');
        const empty = document.getElementById('propriedades-empty');
        
        if (grid) grid.style.display = 'none';
        if (loading) loading.style.display = 'block';
        if (empty) empty.style.display = 'none';
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (response.ok) {
            if (result.data && result.data.length > 0) {
                renderizarPropriedades(result.data);
                
                if (grid) grid.style.display = 'grid';
                if (loading) loading.style.display = 'none';
                if (empty) empty.style.display = 'none';
            } else {
                // Nenhum resultado encontrado
                if (grid) grid.style.display = 'none';
                if (loading) loading.style.display = 'none';
                if (empty) empty.style.display = 'block';
            }
        } else {
            console.error('Erro na API de propriedades:', result.error);
            showToast('Erro ao carregar propriedades', 'error');
        }
    } catch (error) {
        console.error('Erro ao filtrar propriedades:', error);
        showToast('Erro ao filtrar propriedades', 'error');
    }
}

/**
 * Renderiza a lista de propriedades no grid
 */
function renderizarPropriedades(propriedades) {
    const grid = document.getElementById('propriedades-grid');
    if (!grid) return;
    
    if (!propriedades || propriedades.length === 0) {
        grid.innerHTML = '';
        return;
    }
    
    // Mapear propriedades para cards
    grid.innerHTML = propriedades.map(prop => `
        <div class="propriedade-card" style="
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            transition: all 0.2s;
            cursor: pointer;
        " onclick="verDetalhesPropriedade(${prop.id})" onmouseenter="this.style.border='1px solid var(--border-secondary)'" onmouseleave="this.style.border='1px solid var(--border-primary)'">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-2);">
                <h4 style="font-weight: var(--weight-bold); color: var(--text-primary); margin: 0;">${prop.nome_propriedade || 'Sem nome'}</h4>
                <span style="
                    background: ${prop.tipo === 'RURAL' ? 'var(--success-bg)' : prop.tipo === 'URBANA' ? 'var(--info-bg)' : 'var(--warning-bg)'};
                    color: ${prop.tipo === 'RURAL' ? 'var(--success)' : prop.tipo === 'URBANA' ? 'var(--info)' : 'var(--warning)'};
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--radius-md);
                    font-size: var(--text-xs);
                    font-weight: var(--weight-bold);
                ">${prop.tipo || 'N/A'}</span>
            </div>
            <div style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-2);">
                <div style="margin: var(--space-1) 0;"><strong>Matrícula:</strong> ${prop.matricula || 'N/A'}</div>
                <div style="margin: var(--space-1) 0;"><strong>Proprietário:</strong> ${prop.cliente_nome || 'N/A'}</div>
                <div style="margin: var(--space-1) 0;"><strong>Localização:</strong> ${prop.municipio || 'N/A'} - ${prop.uf || 'N/A'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm); color: var(--text-tertiary);">
                <span>${prop.area_m2 ? formatarArea(prop.area_m2) + ' m²' : 'Área não informada'}</span>
                <span>${prop.perimetro_m ? formatarNumero(prop.perimetro_m) + ' m perímetro' : 'Perímetro não informado'}</span>
            </div>
        </div>
    `).join('');
    
    // Atualizar ícones Lucide após renderizar os cards
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Formata área para exibição
 */
function formatarArea(area_m2) {
    if (!area_m2) return '0';
    if (area_m2 >= 10000) {
        return (area_m2 / 10000).toFixed(2) + ' ha';
    }
    return area_m2.toFixed(2);
}

/**
 * Limpa os filtros de propriedades
 */
function limparFiltrosPropriedades() {
    document.getElementById('busca-propriedade').value = '';
    document.getElementById('filtro-tipo-propriedade').value = '';
    document.getElementById('filtro-municipio-propriedade').value = '';
    
    // Recarregar todas as propriedades
    filtrarPropriedades();
}

/**
 * Preenche o filtro de municípios com municípios únicos das propriedades
 */
async function preencherFiltroMunicipios() {
    try {
        // Buscar municípios únicos do backend
        const response = await fetch(`${API_URL}/api/municipios`);
        const result = await response.json();

        if (result.sucesso && result.municipios) {
            const select = document.getElementById('filtro-municipio-propriedade');
            if (select) {
                // Limpar opções atuais
                select.innerHTML = '<option value="">Todos municípios</option>';

                // Adicionar municípios
                result.municipios.forEach(municipio => {
                    const option = document.createElement('option');
                    option.value = municipio;
                    option.textContent = municipio;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao preencher municípios:', error);
    }
}

/**
 * Carrega a lista de clientes com busca
 */
async function filtrarClientes() {
    try {
        console.log('Filtrando clientes...');
        
        const busca = document.getElementById('busca-clientes')?.value || '';
        
        // Construir a URL com filtros
        let url = `${API_URL}/api/clientes`;
        if (busca) url += `?busca=${encodeURIComponent(busca)}`;
        
        // Mostrar loading
        const grid = document.getElementById('clientes-grid'); // Assumindo um ID semelhante
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-12); color: var(--text-secondary);">
                    <i data-lucide="loader-2" class="animate-spin" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); display: block;"></i>
                    <p>Carregando clientes...</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (response.ok) {
            renderizarClientes(result.data);
        } else {
            console.error('Erro na API de clientes:', result.error);
            showToast('Erro ao carregar clientes', 'error');
        }
    } catch (error) {
        console.error('Erro ao filtrar clientes:', error);
        showToast('Erro ao filtrar clientes', 'error');
    }
}

/**
 * Renderiza a lista de clientes
 */
function renderizarClientes(clientes) {
    const grid = document.getElementById('clientes-grid'); // Assumindo um ID para o grid de clientes
    if (!grid) return;
    
    if (!clientes || clientes.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-12); color: var(--text-secondary);">
                <p>Nenhum cliente encontrado</p>
            </div>
        `;
        return;
    }
    
    // Mapear clientes para cards
    grid.innerHTML = clientes.map(cliente => `
        <div class="cliente-card" style="
            background: var(--bg-primary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            transition: all 0.2s;
        ">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-2);">
                <h4 style="font-weight: var(--weight-bold); color: var(--text-primary); margin: 0;">${cliente.nome}</h4>
                <span style="
                    background: var(--bg-tertiary);
                    color: var(--text-secondary);
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--radius-md);
                    font-size: var(--text-xs);
                    font-weight: var(--weight-bold);
                ">${cliente.tipo_pessoa === 'fisica' ? 'PF' : 'PJ'}</span>
            </div>
            <div style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-2);">
                ${cliente.cpf_cnpj ? `<div style="margin: var(--space-1) 0;"><strong>CPF/CNPJ:</strong> ${cliente.cpf_cnpj}</div>` : ''}
                ${cliente.telefone ? `<div style="margin: var(--space-1) 0;"><strong>Telefone:</strong> ${cliente.telefone}</div>` : ''}
                ${cliente.email ? `<div style="margin: var(--space-1) 0;"><strong>Email:</strong> ${cliente.email}</div>` : ''}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: var(--space-2);">
                <button class="btn btn-small btn-secondary" onclick="editarCliente(${cliente.id})">
                    <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                    Editar
                </button>
                <button class="btn btn-small btn-primary" onclick="verPropriedadesCliente(${cliente.id})">
                    <i data-lucide="home" style="width: 14px; height: 14px;"></i>
                    Propriedades
                </button>
            </div>
        </div>
    `).join('');
    
    // Atualizar ícones Lucide após renderizar os cards
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Função para abrir modal de novo cliente (conectando ao evento do botão na aba de clientes)
 */
function abrirModalNovoCliente() {
    // Assumindo que existe um modal para cadastro de cliente
    // Esta função deve abrir o modal correspondente
    alert('Funcionalidade de cadastro de novo cliente ainda não implementada.');
}

// Executar a inicialização após o carregamento da página
document.addEventListener('DOMContentLoaded', function() {
    // Preencher municípios quando a aba de propriedades for ativa
    // Isso será chamado quando a aba for ativada
    setTimeout(() => {
        if (typeof preencherFiltroMunicipios === 'function') {
            preencherFiltroMunicipios();
        }
    }, 1000); // Pequeno delay para garantir que o DOM esteja pronto
});