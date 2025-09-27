(function() {
    'use strict';

    if (window.construtorModule) {
        return;
    }

    console.log("🔨 Kitsune | Módulo de Lógica - Construtor (v2.1) carregado.");

    const STAGGER_DELAY_MS = 2000; // Atraso em milissegundos entre o processamento de cada aldeia

    /**
     * Ponto de entrada principal para o módulo construtor.
     * @param {object} dependencias - Objeto contendo os módulos necessários.
     */
    async function run(dependencias) {
        try {
            if (!dependencias || !dependencias.settingsManager || !dependencias.villageManager) {
                console.error("Construtor: Dependências essenciais não foram carregadas. Abortando.");
                return;
            }

            const { settingsManager, villageManager } = dependencias;
            const settings = settingsManager.get();

            if (!settings?.construtor?.autoStart) {
                // Esta verificação é redundante se o timer não for iniciado, mas é uma boa prática.
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

    /**
     * Cria um iframe para carregar a página do edifício principal de uma aldeia e depois o processa.
     * @param {string} url - A URL do edifício principal da aldeia.
     * @param {string} villageId - O ID da aldeia.
     * @param {object} settings - O objeto de configurações globais.
     * @param {number} delay - O tempo de espera antes de carregar o iframe.
     */
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

    /**
     * Contém a lógica de construção para uma única aldeia (documento).
     * @param {Document} doc - O documento do iframe da aldeia.
     * @param {object} settings - O objeto de configurações globais.
     * @param {string} villageId - O ID da aldeia que está sendo processada.
     */
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

    /**
     * Encontra o próximo edifício construível com base no modelo ativo.
     * @param {Document} doc - O documento do iframe da aldeia.
     * @param {object} settings - O objeto de configurações globais.
     * @returns {string|null} O ID do link de construção ou nulo.
     */
    function obterProximoEdificioDoModelo(doc, settings) {
        try {
            const modeloAtivoId = settings?.construtor?.modelo;
            let filaDeConstrucao = [];

            // --- LÓGICA CORRIGIDA AQUI ---
            if (modeloAtivoId === 'default') {
                // Se for o modelo padrão, usa a constante global
                filaDeConstrucao = window.KitsuneConstants.MODELO_PADRAO_CONSTRUCAO;
            } else if (modeloAtivoId) {
                // Se for um modelo customizado, carrega dos templates
                const todosModelos = window.KitsuneBuilderModal?.loadTemplates() || [];
                const modelo = todosModelos.find(m => m.id == modeloAtivoId);
                if (modelo?.queue) {
                    filaDeConstrucao = modelo.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
                }
            }

            if (filaDeConstrucao.length === 0) {
                return null;
            }
            // --- FIM DA CORREÇÃO ---

            for (const buildId of filaDeConstrucao) {
                const el = doc.querySelector(`#${buildId}`);
                if (el && el.offsetParent !== null) {
                    return buildId;
                }
            }

            return null;
        } catch (error) {
            console.warn("Construtor: erro ao carregar ou processar modelo de construção.", error);
            return null;
        }
    }

    /**
     * Verifica se o primeiro item da fila pode ser completado gratuitamente e clica se for o caso.
     * @param {Document} doc - O documento do iframe da aldeia.
     * @param {string} villageId - O ID da aldeia.
     * @returns {boolean} - Retorna true se um edifício foi completado.
     */
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

    // Expõe o módulo para o script principal
    window.construtorModule = {
        run: run
    };

})();
