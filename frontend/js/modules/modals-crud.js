/**
 * modals-crud.js
 * Funções para gerenciamento de modais e CRUD de Marco, Propriedade e Cliente
 */

// ========================================
// FUNÇÕES AUXILIARES DE MODAL
// ========================================

/**
 * Abre um modal pelo ID
 */
window.abrirModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        console.log(`📂 Modal aberto: ${modalId}`);
    } else {
        console.error(`❌ Modal não encontrado: ${modalId}`);
    }
};

/**
 * Fecha um modal pelo ID
 */
window.fecharModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        console.log(`📁 Modal fechado: ${modalId}`);

        // Limpar formulário se existir
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
};

/**
 * Mostra um toast de notificação
 */
window.mostrarToast = function (tipo, titulo, mensagem) {
    // Se existe showToast global, usar ela
    if (typeof window.showToast === 'function') {
        window.showToast(mensagem, tipo);
        return;
    }

    // Fallback simples
    console.log(`[${tipo.toUpperCase()}] ${titulo}: ${mensagem}`);
    alert(`${titulo}\n\n${mensagem}`);
};

// ========================================
// SALVAR NOVO MARCO
// ========================================
window.salvarNovoMarco = async function (event) {
    if (event) event.preventDefault();

    const form = document.getElementById('form-novo-marco');
    if (!form) {
        console.error('❌ Formulário form-novo-marco não encontrado');
        return;
    }

    const formData = new FormData(form);

    // Validar formulário
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Construir objeto do marco
    const marco = {
        codigo: formData.get('codigo') || formData.get('identificador'),
        tipo: formData.get('tipo'),
        localizacao: formData.get('localizacao'),
        municipio: formData.get('municipio'),
        estado: formData.get('estado'),
        coordenada_e: parseFloat(formData.get('coordenada_e') || formData.get('coord_utm_e')),
        coordenada_n: parseFloat(formData.get('coordenada_n') || formData.get('coord_utm_n')),
        altitude: formData.get('altitude') ? parseFloat(formData.get('altitude')) : null,
        observacoes: formData.get('observacoes') || null,
        validado: true
    };

    console.log('📤 Enviando novo marco:', marco);

    // Desabilitar botão durante envio
    const btn = form.querySelector('button[type="submit"]');
    const btnOriginalHTML = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Salvando...';
    }

    try {
        const response = await fetch(`${window.API_URL}/api/marcos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(marco)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao criar marco');
        }

        const resultado = await response.json();
        console.log('✅ Marco criado:', resultado);

        // Sucesso!
        mostrarToast('success', 'Marco criado!', `Marco ${marco.codigo} foi adicionado com sucesso.`);

        // Fechar modal
        fecharModal('modal-novo-marco');

        // Recarregar lista de marcos
        if (typeof window.carregarMarcosLista === 'function') {
            await window.carregarMarcosLista();
        }

        // Se estiver na aba mapa, recarregar marcadores
        if (typeof window.carregarMarcos === 'function') {
            await window.carregarMarcos();
        }

    } catch (error) {
        console.error('❌ Erro ao criar marco:', error);
        mostrarToast('error', 'Erro ao criar marco', error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnOriginalHTML;
        }
    }
};

// ========================================
// SALVAR NOVA PROPRIEDADE
// ========================================
window.salvarNovaPropriedade = async function (event) {
    if (event) event.preventDefault();

    const form = document.getElementById('form-nova-propriedade');
    if (!form) {
        console.error('❌ Formulário form-nova-propriedade não encontrado');
        return;
    }

    const formData = new FormData(form);

    // Validar formulário
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Construir objeto da propriedade
    const propriedade = {
        nome_propriedade: formData.get('nome_propriedade'),
        matricula: formData.get('matricula'),
        tipo: formData.get('tipo'),
        municipio: formData.get('municipio'),
        comarca: formData.get('comarca'),
        uf: formData.get('uf'),
        area_m2: formData.get('area_m2') ? parseFloat(formData.get('area_m2')) : null,
        perimetro_m: formData.get('perimetro_m') ? parseFloat(formData.get('perimetro_m')) : null,
        observacoes: formData.get('observacoes') || null,
        cliente_id: formData.get('cliente_id') || null
    };

    console.log('📤 Enviando nova propriedade:', propriedade);

    // Desabilitar botão durante envio
    const btn = form.querySelector('button[type="submit"]');
    const btnOriginalHTML = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Salvando...';
    }

    try {
        const response = await fetch(`${window.API_URL}/api/propriedades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(propriedade)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao criar propriedade');
        }

        const resultado = await response.json();
        console.log('✅ Propriedade criada:', resultado);

        // Sucesso!
        mostrarToast('success', 'Propriedade criada!', `Propriedade ${propriedade.nome_propriedade} foi adicionada com sucesso.`);

        // Fechar modal
        fecharModal('modal-nova-propriedade');

        // Recarregar lista de propriedades
        if (typeof window.carregarPropriedadesLista === 'function') {
            await window.carregarPropriedadesLista();
        }

    } catch (error) {
        console.error('❌ Erro ao criar propriedade:', error);
        mostrarToast('error', 'Erro ao criar propriedade', error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnOriginalHTML;
        }
    }
};

// ========================================
// SALVAR NOVO CLIENTE
// ========================================
window.salvarNovoCliente = async function (event) {
    if (event) event.preventDefault();

    const form = document.getElementById('form-novo-cliente');
    if (!form) {
        console.error('❌ Formulário form-novo-cliente não encontrado');
        return;
    }

    const formData = new FormData(form);

    // Validar formulário
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Construir objeto do cliente
    const cliente = {
        nome: formData.get('nome'),
        tipo_pessoa: formData.get('tipo_pessoa'),
        cpf_cnpj: formData.get('cpf_cnpj') || null,
        email: formData.get('email') || null,
        telefone: formData.get('telefone') || null,
        endereco: formData.get('endereco') || null,
        observacoes: formData.get('observacoes') || null
    };

    console.log('📤 Enviando novo cliente:', cliente);

    // Desabilitar botão durante envio
    const btn = form.querySelector('button[type="submit"]');
    const btnOriginalHTML = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Salvando...';
    }

    try {
        const response = await fetch(`${window.API_URL}/api/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cliente)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao criar cliente');
        }

        const resultado = await response.json();
        console.log('✅ Cliente criado:', resultado);

        // Sucesso!
        mostrarToast('success', 'Cliente criado!', `Cliente ${cliente.nome} foi adicionado com sucesso.`);

        // Fechar modal
        fecharModal('modal-novo-cliente');

        // Recarregar lista de clientes
        if (typeof window.carregarClientes === 'function') {
            await window.carregarClientes();
        }

        // Atualizar select de clientes em outras modais
        if (typeof window.carregarClientesSelect === 'function') {
            await window.carregarClientesSelect();
        }

    } catch (error) {
        console.error('❌ Erro ao criar cliente:', error);
        mostrarToast('error', 'Erro ao criar cliente', error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnOriginalHTML;
        }
    }
};

// ========================================
// CARREGAR CLIENTES NO SELECT DE PROPRIEDADE
// ========================================
window.carregarClientesSelect = async function () {
    const select = document.getElementById('nova-prop-cliente');
    if (!select) return;

    try {
        const response = await fetch(`${window.API_URL}/api/clientes?limite=500`);
        const result = await response.json();

        if (result.success && result.data) {
            select.innerHTML = '<option value="">Selecione o cliente (opcional)</option>';
            result.data.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome;
                select.appendChild(option);
            });
            console.log(`✅ ${result.data.length} clientes carregados no select`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar clientes para select:', error);
    }
};

// Carregar clientes no select quando modal de propriedade abrir
document.addEventListener('DOMContentLoaded', () => {
    const modalProp = document.getElementById('modal-nova-propriedade');
    if (modalProp) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    if (modalProp.style.display === 'flex') {
                        carregarClientesSelect();
                    }
                }
            });
        });
        observer.observe(modalProp, { attributes: true });
    }
});

console.log('✅ modals-crud.js carregado');
