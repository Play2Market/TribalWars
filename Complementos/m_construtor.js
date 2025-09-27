(function() {
    'use strict';

    // Verificação para não injetar o script múltiplas vezes
    if (window.construtorModule) {
        return;
    }

    console.log("🔨 Kitsune | Módulo de Lógica - Construtor (v2.0) carregado.");

    const STAGGER_DELAY_MS = 2000; // Atraso em milissegundos entre o processamento de cada aldeia

    /**
     * Ponto de entrada principal para o módulo construtor.
     * É chamado pelo script principal (Core) em intervalos de tempo.
     * @param {object} dependencias - Objeto contendo os módulos necessários (settingsManager, villageManager, etc.).
     */
    async function run(dependencias) {
        try {
            // Validação das dependências necessárias
            if (!dependencias || !dependencias.settingsManager || !dependencias.villageManager) {
                console.error("Construtor: Dependências essenciais não foram carregadas. Abortando.");
                return;
            }

            const { settingsManager, villageManager } = dependencias;
            const settings = settingsManager.get();

            if (!settings?.construtor?.autoStart) {
                console.log("🔨 Construtor: AutoStart desativado nas configurações.");
                return;
            }

            const aldeias = villageManager.get();
            if (!aldeias || aldeias.length === 0) {
                console.log("🔨 Construtor: Nenhuma aldeia encontrada pelo VillageManager.");
                return;
            }

            console.log(`🔨 Construtor: Iniciando processamento de ${aldeias.length} aldeias.`);

            // Processa cada aldeia sequencialmente com um atraso entre elas
            for (const [index, aldeia] of aldeias.entries()) {
                const url = `${game_data.link_base_pure}main&village=${aldeia.id}`;
                // O atraso real é o aleatório + um atraso fixo para não sobrecarregar o servidor
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
                    resolve(); // Resolve a promise mesmo em caso de erro para não travar o loop
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

        // 1. Tenta completar construções grátis
        const completado = tentarCompletarGratis(doc, villageId);
        if (completado) {
            // Se algo foi completado, a página pode precisar ser recarregada para atualizar o estado.
            // Por simplicidade, vamos apenas logar por enquanto.
            console.log(`[Construtor] Edifício finalizado gratuitamente na aldeia ${villageId}. Reavaliando em breve.`);
        }

        // 2. Verifica a fila de construção
        const filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length;
        const limiteFila = parseInt(settings?.construtor?.filas || 2, 10);

        if (filaAtual >= limiteFila) {
            console.log(`[Construtor] Fila cheia na aldeia ${villageId} (${filaAtual}/${limiteFila}).`);
            return;
        }

        // 3. Busca o próximo edifício a ser construído com base no modelo
        const idDoProximoEdificio = obterProximoEdificioDoModelo(doc, settings);

        if (!idDoProximoEdificio) {
            console.log(`[Construtor] Aldeia ${villageId} está com o modelo em dia ou não há edifícios disponíveis.`);
            return;
        }

        // 4. Clica no botão para adicionar à fila
        const botaoConstruir = doc.querySelector(`#${idDoProximoEdificio}`);
        if (botaoConstruir && botaoConstruir.offsetParent !== null) { // Verifica se está visível
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
            if (!modeloAtivoId) return null;

            // Usa a função do módulo de modelos para carregar os templates
            const todosModelos = window.KitsuneBuilderModal?.loadTemplates() || [];
            const modelo = todosModelos.find(m => m.id == modeloAtivoId);

            if (!modelo || !modelo.queue || modelo.queue.length === 0) return null;

            // Converte a fila do modelo para o formato de ID do link
            const filaDeConstrucao = modelo.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
            
            // Encontra o primeiro item na fila que está disponível para ser construído
            for (const buildId of filaDeConstrucao) {
                const el = doc.querySelector(`#${buildId}`);
                if (el && el.offsetParent !== null) { // Checa se o elemento está visível e pode ser clicado
                    return buildId;
                }
            }

            return null; // Nenhum edifício do modelo está disponível
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
    
    /**
     * Gera um atraso aleatório com base nas configurações.
     * @param {object} config - Objeto de configuração de tempo (tempoMin, tempoMax).
     * @returns {number} - Atraso em milissegundos.
     */
    function randomDelay(config) {
        const min = toMs(config?.tempoMin) || 1000;
        const max = toMs(config?.tempoMax) || 2000;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    /**
     * Converte uma string de tempo 'HH:MM:SS' para milissegundos.
     * @param {string} timeStr - A string de tempo.
     * @returns {number|null} - O tempo em milissegundos.
     */
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
