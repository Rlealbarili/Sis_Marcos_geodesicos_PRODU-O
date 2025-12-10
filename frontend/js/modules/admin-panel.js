/**
 * ============================================
 * ADMIN PANEL - Gestão de Usuários
 * Sistema COGEP - Protocolo Bunker
 * ============================================
 */

const AdminPanel = {
    initialized: false,

    /**
     * Inicializa o painel de administração
     */
    async init() {
        if (this.initialized) return;

        console.log('[AdminPanel] Inicializando painel de gestão...');

        // Verificar se o usuário é admin
        const user = AuthClient.getCurrentUser();
        if (!user || user.cargo !== 'admin') {
            console.log('[AdminPanel] Usuário não é admin, painel desativado');
            return;
        }

        // Mostrar menu de admin na sidebar
        this.showAdminMenu();

        // Carregar lista de usuários
        await this.loadUsers();

        this.initialized = true;
        console.log('[AdminPanel] Painel inicializado ✅');
    },

    /**
     * Mostra o menu de administração na sidebar
     */
    showAdminMenu() {
        const menuAdmin = document.getElementById('menu-admin');
        if (menuAdmin) {
            menuAdmin.style.display = 'flex';
        }
    },

    /**
     * Carrega a lista de usuários
     */
    async loadUsers() {
        try {
            const response = await fetch(`${window.API_URL}/api/auth/users`);
            const data = await response.json();

            if (response.ok) {
                this.renderUsersTable(data.usuarios);
            } else {
                console.error('[AdminPanel] Erro ao carregar usuários:', data.error);
            }
        } catch (error) {
            console.error('[AdminPanel] Erro de conexão:', error);
        }
    },

    /**
     * Renderiza a tabela de usuários
     */
    renderUsersTable(usuarios) {
        const container = document.getElementById('admin-users-grid');
        if (!container) return;

        if (!usuarios || usuarios.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Nenhum usuário cadastrado.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Cargo</th>
                        <th>Status</th>
                        <th>Último Login</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${usuarios.map(u => this.renderUserRow(u)).join('')}
                </tbody>
            </table>
        `;

        // Adicionar event listeners
        container.querySelectorAll('.btn-toggle-active').forEach(btn => {
            btn.addEventListener('click', () => this.toggleUserActive(btn.dataset.id));
        });

        container.querySelectorAll('.btn-reset-password').forEach(btn => {
            btn.addEventListener('click', () => this.resetUserPassword(btn.dataset.id, btn.dataset.nome));
        });
    },

    /**
     * Renderiza uma linha da tabela de usuário
     */
    renderUserRow(usuario) {
        const statusClass = usuario.ativo ? 'status-active' : 'status-inactive';
        const statusText = usuario.ativo ? 'Ativo' : 'Inativo';
        const ultimoLogin = usuario.ultimo_login
            ? new Date(usuario.ultimo_login).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : 'Nunca';

        const cargoClass = {
            'admin': 'cargo-admin',
            'operador': 'cargo-operador',
            'visualizador': 'cargo-visualizador'
        }[usuario.cargo] || '';

        const needsPasswordChange = usuario.deve_trocar_senha
            ? '<span class="badge-warning" title="Precisa trocar senha">🔑</span>'
            : '';

        return `
            <tr>
                <td><strong>${usuario.nome}</strong> ${needsPasswordChange}</td>
                <td>${usuario.email}</td>
                <td><span class="cargo-badge ${cargoClass}">${usuario.cargo}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${ultimoLogin}</td>
                <td class="actions-cell">
                    <button class="btn btn-small btn-secondary btn-reset-password" 
                            data-id="${usuario.id}" data-nome="${usuario.nome}"
                            title="Resetar Senha">
                        🔄
                    </button>
                    <button class="btn btn-small ${usuario.ativo ? 'btn-danger' : 'btn-success'} btn-toggle-active" 
                            data-id="${usuario.id}"
                            title="${usuario.ativo ? 'Desativar' : 'Ativar'}">
                        ${usuario.ativo ? '🚫' : '✅'}
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * Abre modal para criar novo usuário
     */
    openNewUserModal() {
        const modal = document.getElementById('modal-novo-usuario');
        if (modal) {
            modal.classList.add('active');
            // Limpar form
            document.getElementById('form-novo-usuario').reset();
            document.getElementById('novo-usuario-error').textContent = '';
        }
    },

    /**
     * Fecha modal de novo usuário
     */
    closeNewUserModal() {
        const modal = document.getElementById('modal-novo-usuario');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Cria um novo usuário
     */
    async createUser(event) {
        event.preventDefault();

        const form = document.getElementById('form-novo-usuario');
        const errorDiv = document.getElementById('novo-usuario-error');
        const btn = document.getElementById('btn-salvar-usuario');

        const nome = document.getElementById('novo-usuario-nome').value.trim();
        const email = document.getElementById('novo-usuario-email').value.trim();
        const cargo = document.getElementById('novo-usuario-cargo').value;

        if (!nome || !email) {
            errorDiv.textContent = 'Preencha todos os campos';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Criando...';
        errorDiv.textContent = '';

        try {
            const response = await fetch(`${window.API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, cargo })
            });

            const data = await response.json();

            if (response.ok) {
                // Sucesso - mostrar senha temporária
                this.closeNewUserModal();
                this.showTempPasswordModal(data.usuario, data.tempPassword);
                await this.loadUsers(); // Recarregar lista
            } else {
                errorDiv.textContent = data.error || 'Erro ao criar usuário';
            }
        } catch (error) {
            errorDiv.textContent = 'Erro de conexão';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Usuário';
        }
    },

    /**
     * Mostra modal com senha temporária
     */
    showTempPasswordModal(usuario, tempPassword) {
        // Criar modal dinâmico
        const existingModal = document.getElementById('modal-temp-password');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-temp-password';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="AdminPanel.closeTempPasswordModal()"></div>
            <div class="modal-container" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <i data-lucide="check-circle" style="color: #10B981;"></i>
                        Usuário Criado!
                    </h2>
                    <button class="btn-icon close-modal" onclick="AdminPanel.closeTempPasswordModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 15px;">
                        <strong>${usuario.nome}</strong> foi cadastrado com sucesso.
                    </p>
                    
                    <div class="temp-password-box">
                        <label>Senha Temporária:</label>
                        <div class="password-display">
                            <code id="temp-password-value">${tempPassword}</code>
                            <button class="btn btn-small btn-secondary" onclick="AdminPanel.copyPassword('${tempPassword}')">
                                📋 Copiar
                            </button>
                        </div>
                    </div>
                    
                    <div class="alert-warning" style="margin-top: 15px;">
                        <strong>⚠️ Importante:</strong> Copie esta senha e envie ao usuário. 
                        Ela será exibida apenas uma vez. O usuário deverá alterá-la no primeiro login.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="AdminPanel.closeTempPasswordModal()">
                        Entendi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        lucide.createIcons();
    },

    /**
     * Fecha modal de senha temporária
     */
    closeTempPasswordModal() {
        const modal = document.getElementById('modal-temp-password');
        if (modal) modal.remove();
    },

    /**
     * Copia senha para clipboard
     */
    copyPassword(password) {
        navigator.clipboard.writeText(password).then(() => {
            alert('Senha copiada para a área de transferência!');
        }).catch(() => {
            // Fallback para navegadores antigos
            const input = document.createElement('input');
            input.value = password;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('Senha copiada!');
        });
    },

    /**
     * Ativa/desativa um usuário
     */
    async toggleUserActive(id) {
        if (!confirm('Deseja alterar o status deste usuário?')) return;

        try {
            const response = await fetch(`${window.API_URL}/api/auth/users/${id}/toggle-active`, {
                method: 'PUT'
            });

            const data = await response.json();

            if (response.ok) {
                await this.loadUsers();
            } else {
                alert(data.error || 'Erro ao alterar status');
            }
        } catch (error) {
            alert('Erro de conexão');
        }
    },

    /**
     * Reseta a senha de um usuário
     */
    async resetUserPassword(id, nome) {
        if (!confirm(`Resetar a senha de "${nome}"?\n\nUma nova senha temporária será gerada.`)) return;

        try {
            const response = await fetch(`${window.API_URL}/api/auth/admin/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const data = await response.json();

            if (response.ok) {
                this.showTempPasswordModal(data.usuario, data.tempPassword);
            } else {
                alert(data.error || 'Erro ao resetar senha');
            }
        } catch (error) {
            alert('Erro de conexão');
        }
    }
};

// Inicializar quando AuthClient estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um momento para o AuthClient inicializar primeiro
    setTimeout(() => {
        if (window.AuthClient && AuthClient.isAuthenticated()) {
            AdminPanel.init();
        }
    }, 500);
});

// Exportar para uso global
window.AdminPanel = AdminPanel;
