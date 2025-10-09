(function() {
    'use strict';

    if (window.construtorModule) {
        return;
    }

    console.log("🔨 Kitsune | Módulo de Lógica - Construtor (v10.0-fetch) carregado.");

    const STAGGER_DELAY_MS = 450; // Atraso entre o processamento de cada aldeia

    /**
     * Ponto de entrada do módulo. Agora opera totalmente em segundo plano.
     */
    async function run(dependencias) {
        try {
            const { settingsManager, villageManager } = dependencias;
            if (!settingsManager || !villageManager) {
                console.error("[Construtor] Dependências essenciais não carregadas.");
                return;
            }

            const settings = settingsManager.get();
            if (!settings?.modules?.Construtor?.enabled) return;

            const aldeias = villageManager.get();
            if (!aldeias || aldeias.length === 0) return;

            console.log(`[Construtor FETCH] Iniciando processamento de ${aldeias.length} aldeias.`);

            for (const [index, aldeia] of aldeias.entries()) {
                // Adiciona um atraso entre cada requisição para não sobrecarregar o servidor
                await new Promise(resolve => setTimeout(resolve, index * STAGGER_DELAY_MS));
                await processarAldeiaComFetch(aldeia.id, settings);
            }

            console.log(`[Construtor FETCH] Ciclo de processamento concluído.`);
        } catch (error) {
            console.error("🔥 Erro crítico no ciclo do Construtor FETCH:", error);
        }
    }

    /**
     * Busca os dados da aldeia, analisa o HTML e decide qual ação tomar.
     */
    async function processarAldeiaComFetch(villageId, settings) {
        try {
            console.log(`[Construtor FETCH] Buscando dados da aldeia ${villageId}...`);
            const url = `${window.location.origin}/game.php?village=${villageId}&screen=main`;
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`[Construtor FETCH] Falha ao buscar dados da aldeia ${villageId}. Status: ${response.status}`);
                return;
            }

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            // Extrai o objeto game_data do HTML buscado
            const aldeiaGameData = extrairGameData(htmlText);
            if (!aldeiaGameData) {
                console.error(`[Construtor FETCH] Não foi possível extrair game_data da aldeia ${villageId}.`);
                return;
            }

            // Executa a lógica de construção usando os dados e o DOM que obtivemos
            await executarLogicaDeConstrucao(doc, settings, aldeiaGameData);

        } catch (error) {
            console.error(`[Construtor FETCH] Erro ao processar aldeia ${villageId}:`, error);
        }
    }

    /**
     * Tenta preencher a fila de construção até o limite definido.
     */
    async function executarLogicaDeConstrucao(doc, settings, aldeiaGameData) {
        let filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length;
        const limiteFila = parseInt(settings?.construtor?.filas || 2, 10);

        // Loop para tentar preencher a fila
        while (filaAtual < limiteFila) {
            let acaoRealizada = false;
            let proximoEdificioId = null;

            // Prioridade 1: Macros Inteligentes
            proximoEdificioId = verificarMacrosInteligentes(doc, settings, aldeiaGameData);
            if (proximoEdificioId) {
                console.log(`[Construtor FETCH] MACRO acionado para '${proximoEdificioId}' na aldeia ${aldeiaGameData.village.id}.`);
                acaoRealizada = true;
            } else {
                // Prioridade 2: Seguir o modelo de construção
                proximoEdificioId = obterProximoEdificioDoModelo(doc, settings);
                if (proximoEdificioId) {
                    console.log(`[Construtor FETCH] Modelo indica construir '${proximoEdificioId}' na aldeia ${aldeiaGameData.village.id}.`);
                    acaoRealizada = true;
                }
            }

            if (acaoRealizada) {
                const botao = doc.querySelector(`#${proximoEdificioId}`);
                if (botao && botao.href) {
                    // Simula o clique enviando uma requisição para a URL do botão
                    await fetch(botao.href);
                    console.log(`[Construtor FETCH] 🏗️ Ação de construção para '${proximoEdificioId}' enviada.`);
                    // Espera para simular o tempo de recarregamento da página
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Como não podemos reavaliar o DOM facilmente, construímos um de cada vez por ciclo.
                    // Isso é mais seguro e evita problemas de sincronia.
                    break; 
                }
            } else {
                console.log(`[Construtor FETCH] Nenhuma ação de construção disponível para a aldeia ${aldeiaGameData.village.id}.`);
                break;
            }
        }
    }
    
    function verificarMacrosInteligentes(doc, settings, aldeiaGameData) {
        const { construtor: construtorSettings } = settings;
        if (!construtorSettings) return null;

        const { wood, stone, iron, storage_max, pop, pop_max, buildings } = aldeiaGameData.village;

        const armazemThreshold = parseInt(construtorSettings.armazem || '101', 10) / 100;
        if (wood / storage_max >= armazemThreshold || stone / storage_max >= armazemThreshold || iron / storage_max >= armazemThreshold) {
            const nextLevel = parseInt(buildings.storage) + 1;
            const buildId = `main_buildlink_storage_${nextLevel}`;
            if (doc.querySelector(`#${buildId}.btn-build`)) return buildId;
        }

        const fazendaThreshold = parseInt(construtorSettings.fazenda || '101', 10) / 100;
        if (pop / pop_max >= fazendaThreshold) {
            const nextLevel = parseInt(buildings.farm) + 1;
            const buildId = `main_buildlink_farm_${nextLevel}`;
            if (doc.querySelector(`#${buildId}.btn-build`)) return buildId;
        }
        
        return null;
    }

    function obterProximoEdificioDoModelo(doc, settings) {
        const modeloAtivoId = settings?.construtor?.modelo;
        let filaDeConstrucao = [];

        if (modeloAtivoId === 'default' || !modeloAtivoId) {
            filaDeConstrucao = window.KitsuneConstants.MODELO_PADRAO_CONSTRUCAO;
        } else {
            const todosModelos = window.KitsuneBuilderModal?.loadTemplates() || [];
            const modelo = todosModelos.find(m => m.id == modeloAtivoId);
            if (modelo?.queue) {
                filaDeConstrucao = modelo.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
            }
        }

        if (filaDeConstrucao.length === 0) return null;

        const botoesClicaveis = doc.getElementsByClassName("btn btn-build");
        const idsClicaveis = new Set();
        for (const botao of botoesClicaveis) {
            if (botao.id) {
                idsClicaveis.add(botao.id);
            }
        }

        for (const buildId of filaDeConstrucao) {
            if (idsClicaveis.has(buildId)) {
                return buildId;
            }
        }
        return null;
    }
    
    /**
     * Extrai o objeto `game_data` do HTML bruto de uma página.
     */
    function extrairGameData(htmlText) {
        const match = htmlText.match(/TribalWars\.updateGameData\((.+?)\);/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                console.error("Erro ao parsear game_data extraído.", e);
                return null;
            }
        }
        return null;
    }
    
    // Funções auxiliares
    function randomDelay(config) {
        const min = toMs(config?.tempoMin) || 350;
        const max = toMs(config?.tempoMax) || 1500;
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
