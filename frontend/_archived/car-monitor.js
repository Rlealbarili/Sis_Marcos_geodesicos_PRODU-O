/**
 * Monitor de Importações CAR em Tempo Real
 *
 * Exibe widget no dashboard mostrando progresso de uploads CAR
 */

class CARMonitor {
    constructor() {
        this.pollingInterval = null;
        this.updateFrequency = 3000; // 3 segundos
        this.widgetElement = null;
        this.uploadsAtivos = [];
    }

    /**
     * Inicializa o monitor
     */
    async init() {
        console.log('🔍 Inicializando monitor de importações CAR...');

        // Criar widget no DOM
        this.createWidget();

        // Fazer primeira verificação
        await this.checkUploads();

        // Iniciar polling
        this.startPolling();

        console.log('✅ Monitor CAR inicializado');
    }

    /**
     * Cria o widget visual no dashboard
     */
    createWidget() {
        // Verificar se já existe
        if (document.getElementById('car-monitor-widget')) {
            this.widgetElement = document.getElementById('car-monitor-widget');
            return;
        }

        // Criar HTML do widget
        const widget = document.createElement('div');
        widget.id = 'car-monitor-widget';
        widget.className = 'car-monitor-widget hidden';
        widget.innerHTML = `
            <div class="car-monitor-header">
                <div class="car-monitor-title">
                    <span class="car-monitor-icon">📦</span>
                    <span>Importações CAR</span>
                </div>
                <button class="car-monitor-close" onclick="carMonitor.hideWidget()">×</button>
            </div>
            <div class="car-monitor-body" id="car-monitor-list">
                <!-- Uploads serão inseridos aqui -->
            </div>
        `;

        // Adicionar CSS inline
        const style = document.createElement('style');
        style.textContent = `
            .car-monitor-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 400px;
                max-height: 500px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 9999;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .car-monitor-widget.hidden {
                transform: translateY(600px);
                opacity: 0;
                pointer-events: none;
            }

            .car-monitor-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .car-monitor-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: bold;
                font-size: 1.1em;
            }

            .car-monitor-icon {
                font-size: 1.3em;
            }

            .car-monitor-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5em;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .car-monitor-close:hover {
                background: rgba(255,255,255,0.2);
            }

            .car-monitor-body {
                max-height: 400px;
                overflow-y: auto;
                padding: 15px;
            }

            .car-upload-item {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                border-left: 4px solid #667eea;
            }

            .car-upload-item.concluido {
                border-left-color: #28a745;
                background: #d4edda;
            }

            .car-upload-item.erro {
                border-left-color: #dc3545;
                background: #f8d7da;
            }

            .car-upload-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .car-upload-estado {
                font-weight: bold;
                font-size: 1.1em;
                color: #333;
            }

            .car-upload-status {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: bold;
            }

            .car-upload-status.processando {
                background: #fff3cd;
                color: #856404;
            }

            .car-upload-status.concluido {
                background: #28a745;
                color: white;
            }

            .car-upload-progress {
                margin: 10px 0;
            }

            .car-upload-progress-bar {
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }

            .car-upload-progress-fill {
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                transition: width 0.5s;
                animation: progress-pulse 2s infinite;
            }

            @keyframes progress-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .car-upload-info {
                display: flex;
                justify-content: space-between;
                font-size: 0.9em;
                color: #666;
                margin-top: 8px;
            }

            .car-upload-registros {
                font-weight: bold;
                color: #667eea;
            }
        `;
        document.head.appendChild(style);

        // Adicionar ao body
        document.body.appendChild(widget);
        this.widgetElement = widget;
    }

    /**
     * Verifica uploads ativos no backend
     */
    async checkUploads() {
        try {
            const response = await fetch('/api/car/uploads/ativos');
            const data = await response.json();

            if (data.sucesso) {
                this.uploadsAtivos = data.uploads;
                this.updateWidget();

                // Mostrar widget se houver uploads ativos
                if (data.totalAtivos > 0) {
                    this.showWidget();
                } else if (this.uploadsAtivos.length === 0) {
                    // Se não há nenhum upload recente, esconder
                    this.hideWidget();
                }
            }
        } catch (error) {
            console.error('❌ Erro ao verificar uploads CAR:', error);
        }
    }

    /**
     * Atualiza o conteúdo do widget
     */
    updateWidget() {
        const listElement = document.getElementById('car-monitor-list');
        if (!listElement) return;

        if (this.uploadsAtivos.length === 0) {
            listElement.innerHTML = `
                <div style="text-align: center; color: #999; padding: 20px;">
                    Nenhuma importação recente
                </div>
            `;
            return;
        }

        listElement.innerHTML = this.uploadsAtivos.map(upload => {
            const statusClass = upload.status === 'concluido' ? 'concluido' : '';
            const statusLabel = upload.status === 'concluido' ? 'Concluído' : 'Processando';
            const tempo = this.formatarTempo(upload.tempoDecorrido);

            return `
                <div class="car-upload-item ${statusClass}">
                    <div class="car-upload-header">
                        <div class="car-upload-estado">📍 ${upload.estado}</div>
                        <div class="car-upload-status ${upload.status}">${statusLabel}</div>
                    </div>
                    ${upload.emAndamento ? `
                        <div class="car-upload-progress">
                            <div class="car-upload-progress-bar">
                                <div class="car-upload-progress-fill" style="width: ${this.calcularProgresso(upload)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="car-upload-info">
                        <span class="car-upload-registros">${upload.totalRegistros.toLocaleString()} registros</span>
                        <span>${tempo}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Calcula progresso baseado no tempo (estimativa)
     */
    calcularProgresso(upload) {
        if (upload.status === 'concluido') return 100;

        // Estimativa: assume 30 segundos por estado pequeno
        const tempoEstimado = 30;
        const progresso = Math.min(95, (upload.tempoDecorrido / tempoEstimado) * 100);
        return Math.floor(progresso);
    }

    /**
     * Formata tempo decorrido
     */
    formatarTempo(segundos) {
        if (segundos < 60) {
            return `${segundos}s`;
        } else if (segundos < 3600) {
            const minutos = Math.floor(segundos / 60);
            return `${minutos}min`;
        } else {
            const horas = Math.floor(segundos / 3600);
            const minutos = Math.floor((segundos % 3600) / 60);
            return `${horas}h ${minutos}min`;
        }
    }

    /**
     * Inicia polling automático
     */
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(() => {
            this.checkUploads();
        }, this.updateFrequency);

        console.log(`✅ Polling CAR iniciado (a cada ${this.updateFrequency/1000}s)`);
    }

    /**
     * Para polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('⏸️ Polling CAR pausado');
        }
    }

    /**
     * Mostra o widget
     */
    showWidget() {
        if (this.widgetElement) {
            this.widgetElement.classList.remove('hidden');
        }
    }

    /**
     * Esconde o widget
     */
    hideWidget() {
        if (this.widgetElement) {
            this.widgetElement.classList.add('hidden');
        }
    }

    /**
     * Destruir monitor
     */
    destroy() {
        this.stopPolling();
        if (this.widgetElement) {
            this.widgetElement.remove();
        }
    }
}

// Instância global
let carMonitor = null;

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        carMonitor = new CARMonitor();
        carMonitor.init();
    });
} else {
    carMonitor = new CARMonitor();
    carMonitor.init();
}
