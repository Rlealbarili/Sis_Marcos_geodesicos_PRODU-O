/**
 * ============================================
 * AUTH CLIENT - Frontend Authentication Module
 * Sistema COGEP - Protocolo Bunker
 * ============================================
 */

/**
 * INTERCEPTADOR GLOBAL DE REQUISIÇÕES (Protocolo Petrovich)
 * Injeta automaticamente o token JWT em todos os fetchs para a API.
 * Este código deve ficar ANTES de qualquer outra lógica.
 */
const originalFetch = window.fetch;
const AUTH_TOKEN_KEY = 'cogep_auth_token';

window.fetch = async function (url, options = {}) {
    // 1. Detectar se é uma chamada para a API interna (e não externa como OSM/ViaCEP)
    const urlString = url.toString();
    const isApiCall = urlString.includes('/api/');

    // 2. Detectar se é uma rota pública que não precisa de token
    // APENAS login, setup-admin e health são públicas
    // Outras rotas /api/auth/* (register, users, etc.) SÃO PROTEGIDAS
    const isPublicEndpoint =
        urlString.includes('/api/auth/login') ||
        urlString.includes('/api/auth/setup-admin') ||
        urlString.includes('/api/health');

    if (isApiCall && !isPublicEndpoint) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);

        if (token) {
            // Criar headers se não existirem
            if (!options.headers) {
                options.headers = {};
            }

            // Garantir que headers seja um objeto ou Headers instance
            if (options.headers instanceof Headers) {
                options.headers.append('Authorization', `Bearer ${token}`);
            } else {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
    }

    // 3. Executar a requisição original
    const response = await originalFetch(url, options);

    // 4. Tratamento Global de Erro 401 (Token Expirado/Inválido)
    if (response.status === 401 && !isPublicEndpoint) {
        console.warn('🔒 Sessão expirada ou inválida. Redirecionando para login...');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('cogep_auth_user');

        // Exibir overlay de login imediatamente se existir
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    return response;
};

console.log('[Auth] Interceptador global de requisições ativado ✅');

const AuthClient = {
    // Configuração
    TOKEN_KEY: 'cogep_auth_token',
    USER_KEY: 'cogep_auth_user',

    /**
     * Inicializa o sistema de autenticação
     * Verifica se há token válido e mostra/esconde overlay de login
     */
    init() {
        console.log('[Auth] Inicializando sistema de autenticação...');

        // Criar overlay de login se não existir
        if (!document.getElementById('auth-overlay')) {
            this.createLoginOverlay();
        }

        // Criar modal de troca de senha
        if (!document.getElementById('change-password-modal')) {
            this.createChangePasswordModal();
        }

        // Verificar autenticação
        if (!this.isAuthenticated()) {
            this.showLoginOverlay();
        } else {
            this.hideLoginOverlay();

            // Verificar se precisa trocar senha
            const user = this.getCurrentUser();
            if (user && user.deve_trocar_senha) {
                this.showChangePasswordModal();
            }

            // Atualizar UI com dados do usuário
            this.updateUserUI();
        }
    },

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (!token) return false;

        // Verificar expiração do token (decodificação simples)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Retorna o usuário atual
     */
    getCurrentUser() {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },

    /**
     * Retorna headers de autenticação para fetch
     */
    getAuthHeaders() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    /**
     * Realiza login
     */
    async login(email, senha) {
        try {
            const response = await fetch(`${window.API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao fazer login');
            }

            // Salvar token e usuário
            localStorage.setItem(this.TOKEN_KEY, data.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(data.usuario));

            // Verificar se precisa trocar senha
            if (data.usuario.deve_trocar_senha) {
                this.hideLoginOverlay();
                this.showChangePasswordModal();
            } else {
                this.hideLoginOverlay();
                this.updateUserUI();
            }

            return { success: true, usuario: data.usuario };

        } catch (error) {
            console.error('[Auth] Erro no login:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Realiza logout
     */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.showLoginOverlay();
        console.log('[Auth] Logout realizado');
    },

    /**
     * Altera a senha do usuário
     */
    async changePassword(senhaAtual, novaSenha) {
        try {
            const response = await fetch(`${window.API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao alterar senha');
            }

            // Atualizar token
            localStorage.setItem(this.TOKEN_KEY, data.token);

            // Atualizar usuário (remover flag de troca)
            const user = this.getCurrentUser();
            if (user) {
                user.deve_trocar_senha = false;
                localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            }

            this.hideChangePasswordModal();
            this.updateUserUI();

            return { success: true };

        } catch (error) {
            console.error('[Auth] Erro ao alterar senha:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Cria o overlay de login (HTML injetado)
     */
    createLoginOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'auth-overlay';
        overlay.innerHTML = `
            <div class="auth-container">
                <div class="auth-logo">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                        <path d="M2 12h20"/>
                    </svg>
                </div>
                <h1 class="auth-title">COGEP</h1>
                <p class="auth-subtitle">Sistema de Marcos Geodésicos</p>
                
                <form id="login-form" class="auth-form">
                    <div class="auth-field">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" placeholder="seu@email.com" required autocomplete="email">
                    </div>
                    <div class="auth-field">
                        <label for="login-senha">Senha</label>
                        <input type="password" id="login-senha" placeholder="••••••••" required autocomplete="current-password">
                    </div>
                    <div id="login-error" class="auth-error"></div>
                    <button type="submit" class="auth-btn" id="login-btn">
                        <span>Entrar</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                            <polyline points="10 17 15 12 10 7"/>
                            <line x1="15" y1="12" x2="3" y2="12"/>
                        </svg>
                    </button>
                </form>
                
                <p class="auth-footer">Protocolo Bunker v1.0</p>
            </div>
        `;

        // Estilos do overlay
        const style = document.createElement('style');
        style.id = 'auth-styles';
        style.textContent = `
            #auth-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            #auth-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            .auth-container {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
                width: 100%;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            }
            
            .auth-logo {
                color: #00d9ff;
                margin-bottom: 20px;
            }
            
            .auth-title {
                color: #fff;
                font-size: 2rem;
                font-weight: 700;
                margin: 0 0 5px 0;
                letter-spacing: 3px;
            }
            
            .auth-subtitle {
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.9rem;
                margin: 0 0 30px 0;
            }
            
            .auth-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .auth-field {
                text-align: left;
            }
            
            .auth-field label {
                display: block;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.85rem;
                margin-bottom: 8px;
            }
            
            .auth-field input {
                width: 100%;
                padding: 14px 16px;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 10px;
                color: #fff;
                font-size: 1rem;
                transition: all 0.3s ease;
                box-sizing: border-box;
            }
            
            .auth-field input:focus {
                outline: none;
                border-color: #00d9ff;
                background: rgba(255, 255, 255, 0.12);
                box-shadow: 0 0 20px rgba(0, 217, 255, 0.2);
            }
            
            .auth-field input::placeholder {
                color: rgba(255, 255, 255, 0.3);
            }
            
            .auth-error {
                color: #ff6b6b;
                font-size: 0.85rem;
                min-height: 20px;
                text-align: left;
            }
            
            .auth-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
                border: none;
                border-radius: 10px;
                color: #fff;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .auth-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 217, 255, 0.3);
            }
            
            .auth-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .auth-footer {
                color: rgba(255, 255, 255, 0.3);
                font-size: 0.75rem;
                margin-top: 30px;
            }
            
            /* Modal de troca de senha */
            #change-password-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            }
            
            #change-password-modal.hidden {
                display: none;
            }
            
            .change-password-container {
                background: #1a1a2e;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
                width: 100%;
                max-width: 400px;
            }
            
            .change-password-container h2 {
                color: #fff;
                margin: 0 0 10px 0;
            }
            
            .change-password-container p {
                color: rgba(255, 255, 255, 0.6);
                margin: 0 0 25px 0;
                font-size: 0.9rem;
            }
            
            /* User info no header */
            .user-info {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 16px;
                background: rgba(0, 217, 255, 0.1);
                border-radius: 10px;
                margin: 10px 16px;
            }
            
            .user-info-name {
                color: var(--text-primary, #fff);
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            .user-info-cargo {
                color: var(--text-secondary, #aaa);
                font-size: 0.75rem;
                text-transform: uppercase;
            }
            
            .logout-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 16px;
                margin: 5px 16px;
                background: transparent;
                border: 1px solid rgba(255, 107, 107, 0.3);
                border-radius: 8px;
                color: #ff6b6b;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9rem;
                width: calc(100% - 32px);
            }
            
            .logout-btn:hover {
                background: rgba(255, 107, 107, 0.1);
                border-color: #ff6b6b;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // Event listener do form de login
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;
            const errorDiv = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');

            btn.disabled = true;
            btn.querySelector('span').textContent = 'Entrando...';
            errorDiv.textContent = '';

            const result = await AuthClient.login(email, senha);

            if (!result.success) {
                errorDiv.textContent = result.error;
                btn.disabled = false;
                btn.querySelector('span').textContent = 'Entrar';
            }
        });
    },

    /**
     * Cria o modal de troca de senha obrigatória
     */
    createChangePasswordModal() {
        const modal = document.createElement('div');
        modal.id = 'change-password-modal';
        modal.className = 'hidden';
        modal.innerHTML = `
            <div class="change-password-container">
                <h2>🔐 Troca de Senha Obrigatória</h2>
                <p>Por segurança, você deve definir uma nova senha antes de continuar.</p>
                
                <form id="change-password-form" class="auth-form">
                    <div class="auth-field">
                        <label for="current-password">Senha Atual</label>
                        <input type="password" id="current-password" required autocomplete="current-password">
                    </div>
                    <div class="auth-field">
                        <label for="new-password">Nova Senha (mín. 8 caracteres)</label>
                        <input type="password" id="new-password" minlength="8" required autocomplete="new-password">
                    </div>
                    <div class="auth-field">
                        <label for="confirm-password">Confirmar Nova Senha</label>
                        <input type="password" id="confirm-password" minlength="8" required autocomplete="new-password">
                    </div>
                    <div id="change-password-error" class="auth-error"></div>
                    <button type="submit" class="auth-btn" id="change-password-btn">
                        <span>Alterar Senha</span>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listener do form
        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const senhaAtual = document.getElementById('current-password').value;
            const novaSenha = document.getElementById('new-password').value;
            const confirmar = document.getElementById('confirm-password').value;
            const errorDiv = document.getElementById('change-password-error');
            const btn = document.getElementById('change-password-btn');

            if (novaSenha !== confirmar) {
                errorDiv.textContent = 'As senhas não coincidem';
                return;
            }

            btn.disabled = true;
            btn.querySelector('span').textContent = 'Alterando...';
            errorDiv.textContent = '';

            const result = await AuthClient.changePassword(senhaAtual, novaSenha);

            if (!result.success) {
                errorDiv.textContent = result.error;
                btn.disabled = false;
                btn.querySelector('span').textContent = 'Alterar Senha';
            }
        });
    },

    /**
     * Mostra overlay de login
     */
    showLoginOverlay() {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    },

    /**
     * Esconde overlay de login
     */
    hideLoginOverlay() {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    /**
     * Mostra modal de troca de senha
     */
    showChangePasswordModal() {
        const modal = document.getElementById('change-password-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    /**
     * Esconde modal de troca de senha
     */
    hideChangePasswordModal() {
        const modal = document.getElementById('change-password-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * Atualiza a UI com dados do usuário
     */
    updateUserUI() {
        const user = this.getCurrentUser();
        if (!user) return;

        // Verificar se já existe o elemento de info do usuário
        let userInfoEl = document.getElementById('user-info-container');
        if (!userInfoEl) {
            // Criar elemento e inserir na sidebar (antes do nav)
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                const nav = sidebar.querySelector('nav');
                userInfoEl = document.createElement('div');
                userInfoEl.id = 'user-info-container';
                userInfoEl.innerHTML = `
                    <div class="user-info">
                        <div>
                            <div class="user-info-name" id="user-display-name">${user.nome}</div>
                            <div class="user-info-cargo" id="user-display-cargo">${user.cargo}</div>
                        </div>
                    </div>
                    <button class="logout-btn" id="logout-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sair
                    </button>
                `;

                if (nav) {
                    sidebar.insertBefore(userInfoEl, nav);
                } else {
                    sidebar.appendChild(userInfoEl);
                }

                // Event listener do botão de logout
                document.getElementById('logout-btn').addEventListener('click', () => {
                    AuthClient.logout();
                });
            }
        } else {
            // Atualizar dados existentes
            document.getElementById('user-display-name').textContent = user.nome;
            document.getElementById('user-display-cargo').textContent = user.cargo;
        }
    },

    /**
     * Wrapper para fetch com autenticação automática
     */
    async fetchAuth(url, options = {}) {
        const headers = {
            ...options.headers,
            ...this.getAuthHeaders()
        };

        const response = await fetch(url, { ...options, headers });

        // Se receber 401, fazer logout
        if (response.status === 401) {
            this.logout();
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        return response;
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    AuthClient.init();
});

// Exportar para uso global
window.AuthClient = AuthClient;
