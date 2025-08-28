// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Construtor
// @version      1.5-Village-Getter-Fix-Attempt
// @description  Motor lógico para o módulo Construtor do Projeto Kitsune, com tentativa de correção no método de obtenção de aldeias.
// @author       Triky, Gemini & Cia
// ==/UserScript==

async function runBuilderModule() {
    console.log("KITSUNE: Módulo Construtor - Verificando construções...");

    const settings = window.KitsuneSettingsManager.get();
    const builderSettings = settings.construtor || {};
    const builderConfig = settings.construtorConfig || {};

    if (typeof Sequência_Construção === 'undefined') {
        console.error("KITSUNE Construtor: A lista de construção 'Sequência_Construção' não foi encontrada. Verifique se o arquivo Lista_PADRAO.js está sendo carregado.");
        return;
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Tentando usar o método .get() que é mais genérico.
    if (!window.KitsuneVillageManager) {
        console.error("KITSUNE Construtor: KitsuneVillageManager não está disponível. O módulo coletor de aldeias pode não ter carregado corretamente.");
        return;
    }
    // Tentativa de usar .get() em vez de .getVillages()
    const villages = await window.KitsuneVillageManager.get();
    // --- FIM DA CORREÇÃO ---

    if (!villages || villages.length === 0) {
        console.log("KITSUNE Construtor: Nenhuma aldeia encontrada pelo KitsuneVillageManager.");
        return;
    }

    // Loop principal por todas as aldeias
    for (const village of villages) {
        try {
            await processVillageConstruction(village, builderSettings, builderConfig);
        } catch (error) {
            console.error(`KITSUNE Construtor: Erro ao processar a aldeia ${village.name || village.id}.`, error);
        }
    }
}

/**
 * Processa a lógica de construção para uma única aldeia.
 */
async function processVillageConstruction(village, settings, config) {
    console.log(`--- [ ${village.name} ] --- Verificando fila de construção.`);

    const villageData = await fetchVillageData(village.id);
    if (!villageData) return;

    const { buildings, population, buildQueue, csrf } = villageData;
    const maxQueueSize = parseInt(settings.filas || 1, 10);

    if (buildQueue.length >= maxQueueSize) {
        console.log(`KITSUNE Construtor: Fila de construção em [${village.name}] já está cheia (${buildQueue.length}/${maxQueueSize}).`);
        return;
    }

    let buildingToConstruct = null;

    const farmCapacityThreshold = parseFloat(settings.fazenda || '0.9');
    const isAutoWallEnabled = settings.autoMuralha === 'Sim';
    const minWallLevel = parseInt(settings.nivelMuralha || 0, 10);

    if ((population.current / population.max) >= farmCapacityThreshold && buildings.farm < 30) {
        console.log(`KITSUNE Construtor: População em [${village.name}] atingiu o limite. Priorizando Fazenda.`);
        buildingToConstruct = 'farm';
    }
    else if (isAutoWallEnabled && buildings.wall < minWallLevel) {
        console.log(`KITSUNE Construtor: Automação defensiva ativa. Muralha em [${village.name}] (${buildings.wall}) está abaixo do mínimo (${minWallLevel}). Priorizando Muralha.`);
        buildingToConstruct = 'wall';
    }

    if (!buildingToConstruct) {
        for (const buildTarget of Sequência_Construção) {
            const [_, __, building, level] = buildTarget.split('_');
            const targetLevel = parseInt(level, 10);
            if (buildings[building] < targetLevel) {
                buildingToConstruct = building;
                break;
            }
        }
    }

    if (!buildingToConstruct) {
        console.log(`KITSUNE Construtor: Modelo de construção para [${village.name}] está completo.`);
        return;
    }

    console.log(`KITSUNE Construtor: Próximo alvo em [${village.name}] é ${buildingToConstruct}.`);
    await sendBuildRequest(village.id, buildingToConstruct, csrf);
}


/**
 * Função auxiliar para buscar dados essenciais da aldeia.
 */
async function fetchVillageData(villageId) {
    try {
        const response = await fetch(`/game.php?village=${villageId}&screen=main`);
        if (!response.ok) {
            console.warn(`KITSUNE Construtor: Resposta não OK para aldeia ${villageId}`);
            return null;
        }

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        let csrf = null;
        const csrfMatch = text.match(/"csrf":"(\w+)"/);
        if(csrfMatch && csrfMatch[1]) {
            csrf = csrfMatch[1];
        } else {
            console.error(`KITSUNE Construtor: Não foi possível encontrar o token CSRF para a aldeia ${villageId}.`);
            return null;
        }

        const buildingLevels = {};
        const scriptContent = text.match(/BuildingMain\.buildings = (\{.*?\});/);
        if (scriptContent && scriptContent[1]) {
            const buildingsData = JSON.parse(scriptContent[1]);
            for (const buildingName in buildingsData) {
                buildingLevels[buildingName] = parseInt(buildingsData[buildingName].level, 10);
            }
        } else {
            console.error(`KITSUNE Construtor: Não foi possível encontrar os dados de 'BuildingMain.buildings' para a aldeia ${villageId}.`);
            return null;
        }

        const buildQueueNodes = doc.querySelectorAll('#build_queue tr[class*="buildorder_"]');

        const resources = {
            wood: parseInt(doc.getElementById('wood').textContent, 10),
            stone: parseInt(doc.getElementById('stone').textContent, 10),
            iron: parseInt(doc.getElementById('iron').textContent, 10),
            storage: parseInt(doc.getElementById('storage').textContent, 10)
        };

        const population = {
            current: parseInt(doc.getElementById('pop_current_label').textContent, 10),
            max: parseInt(doc.getElementById('pop_max_label').textContent, 10)
        };

        return {
            buildings: buildingLevels,
            resources,
            population,
            buildQueue: Array.from(buildQueueNodes),
            csrf
        };
    } catch (error) {
        console.error(`KITSUNE Construtor: Falha crítica ao buscar dados da aldeia ${villageId}.`, error);
        return null;
    }
}


/**
 * Função auxiliar para enviar a requisição de construção.
 */
async function sendBuildRequest(villageId, building, csrf_token) {
    const url = `/game.php?village=${villageId}&screen=main&action=upgrade_building&id=${building}&h=${csrf_token}`;
    try {
        const response = await fetch(url, {
            method: 'GET'
        });
        if (response.ok) {
            console.log(`KITSUNE Construtor: Ordem de construção para ${building} em ${villageId} enviada com sucesso.`);
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
        } else {
            try {
                const errorData = await response.json();
                console.warn(`KITSUNE Construtor: Falha ao construir ${building} em ${villageId}. Motivo: ${errorData.error}`);
            } catch (e) {
                console.warn(`KITSUNE Construtor: Falha ao enviar ordem de construção para ${building} em ${villageId}. Status: ${response.status}`);
            }
        }
    } catch (error) {
        console.error(`KITSUNE Construtor: Erro de rede ao tentar construir ${building} em ${villageId}.`, error);
    }
}
