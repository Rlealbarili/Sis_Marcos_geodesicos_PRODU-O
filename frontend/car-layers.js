// ======================================
// FUNÇÕES PARA CARREGAR CAMADAS CAR
// ======================================

// Função para baixar camadas CAR do backend
async function baixarCamadasCAR() {
    const propriedadeId = document.getElementById('propriedadeSelect').value;

    if (!propriedadeId) {
        alert('❌ Selecione uma propriedade primeiro!');
        return;
    }

    const btn = document.getElementById('btnBaixarCAR');
    const statusDiv = document.getElementById('carDownloadStatus');

    try {
        btn.disabled = true;
        btn.textContent = '⏳ Carregando...';
        statusDiv.style.display = 'block';
        statusDiv.textContent = '⏳ Buscando camadas CAR do backend...';

        console.log(`📥 Iniciando download das camadas CAR para propriedade ${propriedadeId}`);

        // Calcular BBOX da área de interesse (Propriedade + Confrontantes)
        let bounds = L.latLngBounds([]);

        // Função auxiliar para estender bounds de um LayerGroup
        const extendBounds = (layerGroup) => {
            if (layerGroup && layerGroup.eachLayer) {
                layerGroup.eachLayer(layer => {
                    if (layer.getBounds) {
                        bounds.extend(layer.getBounds());
                    } else if (layer.getLatLng) {
                        bounds.extend(layer.getLatLng());
                    }
                });
            }
        };

        // Tentar obter bounds da propriedade e confrontantes
        if (typeof propriedadeLayer !== 'undefined') extendBounds(propriedadeLayer);
        if (typeof sigefLayer !== 'undefined') extendBounds(sigefLayer);

        let url = `${API_BASE}/car/camadas/${propriedadeId}`;

        // Se tivermos um bbox válido, adicionar à URL
        if (bounds.isValid()) {
            const bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ].join(',');
            url += `?bbox=${bbox}`;
            console.log(`📍 Área de busca definida (BBOX): ${bbox}`);
        } else {
            console.log('⚠️ Não foi possível calcular área. Usando buffer padrão do backend.');
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('✅ Camadas CAR recebidas:', data);

        if (!data.success) {
            throw new Error(data.error || 'Erro desconhecido ao buscar camadas CAR');
        }

        // Carregar as camadas no mapa
        carregarCamadasNoMapa(data.camadas, data.totais_por_tipo);

        // Habilitar controles de camadas
        const controlesCAR = document.getElementById('controlesCAR');
        if (controlesCAR) {
            controlesCAR.style.display = 'block';
            console.log('✅ Controles CAR exibidos');
        }

        // Atualizar contadores
        atualizarContadoresCamadas(data.totais_por_tipo);

        // Atualizar botão
        const statusDiv = document.getElementById('carDownloadStatus');
        statusDiv.textContent = `✅ ${data.total_features} features CAR carregadas com sucesso!`;
        btn.textContent = '✅ Camadas Carregadas';

        setTimeout(() => {
            statusDiv.style.display = 'none';
            btn.disabled = false;
            btn.textContent = '🔄 Recarregar Camadas';
        }, 3000);

    } catch (error) {
        console.error('❌ Erro ao baixar camadas CAR:', error);
        statusDiv.textContent = `❌ Erro: ${error.message}`;
        statusDiv.style.color = '#dc3545';
        btn.disabled = false;
        btn.textContent = '❌ Erro - Tentar Novamente';
    }
}

// Função para carregar camadas CAR no mapa
function carregarCamadasNoMapa(camadas, totais) {
    if (!camadas) {
        console.warn('⚠️ Nenhuma camada CAR para carregar');
        return;
    }

    console.log('🗺️ Carregando camadas CAR no mapa...', camadas);

    // Limpar camadas existentes
    Object.keys(layerGroupsCAR).forEach(tipo => {
        if (layerGroupsCAR[tipo]) {
            layerGroupsCAR[tipo].clearLayers();
        }
    });

    // Carregar cada tipo de camada
    Object.keys(camadas).forEach(tipo => {
        const featureCollection = camadas[tipo];

        if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
            console.log(`⚪ ${tipo}: Nenhuma feature encontrada`);
            return;
        }

        const cor = coresCAR[tipo] || '#808080';
        let contador = 0;

        featureCollection.features.forEach(feature => {
            try {
                const layer = L.geoJSON(feature, {
                    style: {
                        color: cor,
                        weight: 2,
                        fillColor: cor,
                        fillOpacity: 0.3
                    },
                    onEachFeature: function (feature, layer) {
                        // Criar popup com informações
                        let popupContent = `<strong>${tipo.replace(/_/g, ' ').toUpperCase()}</strong><br>`;

                        if (feature.properties) {
                            Object.keys(feature.properties).forEach(key => {
                                if (key !== 'geom' && key !== 'geometry' && key !== 'type' && feature.properties[key]) {
                                    popupContent += `<small><strong>${key}:</strong> ${feature.properties[key]}</small><br>`;
                                }
                            });
                        }

                        layer.bindPopup(popupContent);
                    }
                });

                if (layerGroupsCAR[tipo]) {
                    layer.addTo(layerGroupsCAR[tipo]);

                    // Marcar o checkbox como ativo e adicionar a camada ao mapa se estiver ativo
                    const checkbox = document.getElementById(`layer-${tipo.replace('_', '-')}`);
                    if (checkbox) {
                        checkbox.checked = true;
                        // Adicionar ao mapa se o checkbox estiver marcado
                        if (checkbox.checked && map && !map.hasLayer(layerGroupsCAR[tipo])) {
                            map.addLayer(layerGroupsCAR[tipo]);
                            console.log(`✅ Camada CAR "${tipo}" adicionada ao mapa`);
                        }
                    }
                }
                contador++;
            } catch (err) {
                console.error(`❌ Erro ao adicionar feature ${tipo}:`, err);
            }
        });

        console.log(`✅ ${tipo}: ${contador} features adicionadas`);
    });

    console.log('✅ Todas as camadas CAR carregadas no mapa');
}

// Função para atualizar os contadores de features nas camadas
function atualizarContadoresCamadas(totais) {
    if (!totais) return;

    Object.keys(totais).forEach(tipo => {
        const checkbox = document.getElementById(`layer-${tipo.replace('_', '-')}`);
        if (checkbox && checkbox.parentElement) {
            const span = checkbox.parentElement.querySelector('.layer-count');
            if (span) {
                span.textContent = `(${totais[tipo]})`;
                span.style.color = totais[tipo] > 0 ? '#28a745' : '#999';
            }
        }
    });
}

// Função para atualizar os contadores de features nas camadas
function atualizarContadoresCamadas(totais) {
    if (!totais) return;

    Object.keys(totais).forEach(tipo => {
        const checkbox = document.getElementById(`layer-${tipo.replace('_', '-')}`);
        if (checkbox && checkbox.parentElement) {
            const span = checkbox.parentElement.querySelector('.layer-count');
            if (span) {
                span.textContent = `(${totais[tipo]})`;
                span.style.color = totais[tipo] > 0 ? '#28a745' : '#999';
            }
        }
    });
}

// Verificar se há camadas CAR disponíveis quando uma propriedade é selecionada
async function verificarCamadasCAR(propriedadeId) {
    try {
        const response = await fetch(`${API_BASE}/car/camadas/${propriedadeId}`);
        const data = await response.json();

        const btn = document.getElementById('btnBaixarCAR');

        if (data.success && data.total_features > 0) {
            btn.disabled = false;
            btn.textContent = `📥 Baixar ${data.total_features} Camadas CAR`;
            console.log(`✅ ${data.total_features} features CAR disponíveis para esta propriedade`);
        } else {
            btn.disabled = true;
            btn.textContent = '❌ Sem Camadas CAR';
            console.log('⚠️ Nenhuma camada CAR disponível para esta propriedade');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar camadas CAR:', error);
        const btn = document.getElementById('btnBaixarCAR');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '❌ Erro ao Verificar';
        }
    }
}
