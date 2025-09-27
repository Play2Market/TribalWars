(function() {
    'use strict';

    if (window.construtorModule) {
        return;
    }

    console.log("🔨 Kitsune | Módulo de Lógica - Construtor (v2.2-debug) carregado.");

    const STAGGER_DELAY_MS = 2000;

    async function run(dependencias) {
        try {
            if (!dependencias || !dependencias.settingsManager || !dependencias.villageManager) {
                console.error("Construtor: Dependências essenciais não foram carregadas. Abortando.");
                return;
            }

            const { settingsManager, villageManager } = dependencias;
            const settings = settingsManager.get();

            if (!settings?.construtor?.autoStart) {
                return;
            }

            const aldeias = villageManager.get();
            if (!aldeias || aldeias.length === 0) {
                console.log("🔨 Construtor: Nenhuma aldeia encontrada pelo VillageManager.");
                return;
            }

            console.log(`🔨 Construtor: Iniciando processamento de ${aldeias.length} aldeias.`);

            for (const [index, aldeia] of aldeias.entries()) {
                const url = `${game_data.link_base_pure}main&village=${aldeia.id}`;
                const delay = randomDelay(settings.construtorConfig) + (index * STAGGER_DELAY_MS);
                await processarAldeia(url, aldeia.id, settings, delay);
            }

            console.log(`🔨 Construtor: Processamento de todas as aldeias concluído.`);

        } catch (error) {
            console.error("🔥 Erro crítico no módulo Construtor:", error);
        }
    }

    async function processarAldeia(url, villageId, settings, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`[Construtor] Processando Aldeia ID: ${villageId}...`);
                const iframe = document.createElement("iframe");
                iframe.style.display = "none";
                iframe.src = url;
                document.body.appendChild(iframe);

                iframe.onload = () => {
                    try {
                        executarLogicaDeConstrucao(iframe.contentDocument, settings, villageId);
                    } catch (error) {
                        console.warn(`⚠️ Erro ao processar a lógica de construção na aldeia ${villageId}:`, error);
                    } finally {
                        iframe.remove();
                        resolve();
                    }
                };
                
                iframe.onerror = () => {
                    console.error(`🔥 Falha ao carregar o iframe para a aldeia ${villageId}.`);
                    iframe.remove();
                    resolve();
                };

            }, delay);
        });
    }

    function executarLogicaDeConstrucao(doc, settings, villageId) {
        if (!doc) return;

        tentarCompletarGratis(doc, villageId);

        const filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length;
        const limiteFila = parseInt(settings?.construtor?.filas || 2, 10);

        if (filaAtual >= limiteFila) {
            console.log(`[Construtor] Fila cheia na aldeia ${villageId} (${filaAtual}/${limiteFila}).`);
            return;
        }

        const idDoProximoEdificio = obterProximoEdificioDoModelo(doc, settings);

        if (!idDoProximoEdificio) {
            console.log(`[Construtor] Aldeia ${villageId} está com o modelo em dia ou não há edifícios disponíveis.`);
            return;
        }

        const botaoConstruir = doc.querySelector(`#${idDoProximoEdificio}`);
        if (botaoConstruir && botaoConstruir.offsetParent !== null) {
            console.log(`[Construtor] 🏗️ Adicionando '${idDoProximoEdificio}' à fila na aldeia ${villageId}.`);
            botaoConstruir.click();
        } else {
            console.log(`[Construtor] ⚠️ Botão '${idDoProximoEdificio}' não está clicável na aldeia ${villageId}. (Provavelmente falta de recursos)`);
        }
    }

    function obterProximoEdificioDoModelo(doc, settings) {
        try {
            const modeloAtivoId = settings?.construtor?.modelo;
            let filaDeConstrucao = [];

            // --- LOGS DE DEPURAÇÃO ADICIONADOS ---
            console.log(`[DEBUG] Procurando modelo com ID: '${modeloAtivoId}' (tipo: ${typeof modeloAtivoId})`);
            
            if (modeloAtivoId === 'default') {
                console.log("[DEBUG] Usando modelo 'Padrão'.");
                filaDeConstrucao = window.KitsuneConstants.MODELO_PADRAO_CONSTRUCAO;
            } else if (modeloAtivoId) {
                console.log("[DEBUG] Procurando em modelos customizados...");
                const todosModelos = window.KitsuneBuilderModal?.loadTemplates() || [];
                console.log("[DEBUG] Modelos encontrados no localStorage:", JSON.stringify(todosModelos));

                // Usando parseInt para garantir que a comparação seja entre números
                const modelo = todosModelos.find(m => m.id === parseInt(modeloAtivoId, 10));

                if (modelo) {
                    console.log("[DEBUG] Modelo customizado ENCONTRADO:", JSON.stringify(modelo));
                    if (modelo.queue) {
                        filaDeConstrucao = modelo.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
                    }
                } else {
                    console.log("[DEBUG] Modelo customizado NÃO ENCONTRADO.");
                }
            }
            // --- FIM DOS LOGS DE DEPURAÇÃO ---

            if (filaDeConstrucao.length === 0) {
                console.log("[DEBUG] Fila de construção está vazia. Nenhum edifício a ser processado.");
                return null;
            }

            console.log("[DEBUG] Verificando edifícios disponíveis na seguinte ordem:", filaDeConstrucao);

            for (const buildId of filaDeConstrucao) {
                const el = doc.querySelector(`#${buildId}`);
                if (el && el.offsetParent !== null) {
                    console.log(`[DEBUG] Edifício '${buildId}' está disponível para construção.`);
                    return buildId;
                }
            }

            console.log("[DEBUG] Nenhum dos edifícios na fila de construção está disponível na página.");
            return null;
        } catch (error) {
            console.warn("Construtor: erro ao carregar ou processar modelo de construção.", error);
            return null;
        }
    }

    function tentarCompletarGratis(doc, villageId) {
        const botaoCompletar = doc.querySelector('.btn-instant-free');
        if (botaoCompletar) {
            console.log(`[Construtor] ⚡ Finalizando construção gratuitamente na aldeia ${villageId}!`);
            botaoCompletar.click();
            return true;
        }
        return false;
    }
    
    function randomDelay(config) {
        const min = toMs(config?.tempoMin) || 1000;
        const max = toMs(config?.tempoMax) || 2000;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    function toMs(timeStr) {
        if (!timeStr) return null;
        const [h, m, s] = timeStr.split(':').map(Number);
        return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
    }

    window.construtorModule = {
        run: run
    };

})();
