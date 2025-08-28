// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Construtor
// @version      1.1-Defensive-Automation
// @description  Motor lógico para o módulo Construtor do Projeto Kitsune, com automação defensiva.
// @author       Triky, Gemini & Cia
// ==/UserScript==

async function runBuilderModule() {
    console.log("KITSUNE: Módulo Construtor - Verificando construções...");

    const settings = window.KitsuneSettingsManager.get();
    const builderSettings = settings.construtor || {};
    const builderConfig = settings.construtorConfig || {};

    const villages = game_data.player.villages;
    if (!villages || villages.length === 0) return;

    // Loop principal por todas as aldeias
    for (const village of villages) {
        try {
            await processVillageConstruction(village, builderSettings, builderConfig);
        } catch (error) {
            console.error(`KITSUNE Construtor: Erro ao processar a aldeia ${village.name}.`, error);
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

    const { buildings, resources, population, buildQueue } = villageData;
    const maxQueueSize = parseInt(settings.filas || 1, 10);

    if (buildQueue.length >= maxQueueSize) {
        console.log(`KITSUNE Construtor: Fila de construção em [${village.name}] já está cheia (${buildQueue.length}/${maxQueueSize}).`);
        return;
    }

    let buildingToConstruct = null;

    // 2. Verificar condições especiais (Gestão de Capacidade e Defesa)
    const farmCapacityThreshold = parseFloat(settings.fazenda || '0.9');
    const isAutoWallEnabled = settings.autoMuralha === 'Sim';
    const minWallLevel = parseInt(settings.nivelMuralha || 0, 10);

    // PRIORIDADE 1: FAZENDA
    if ((population.current / population.max) >= farmCapacityThreshold && buildings.farm < 30) {
        console.log(`KITSUNE Construtor: População em [${village.name}] atingiu o limite. Priorizando Fazenda.`);
        buildingToConstruct = 'farm';
    } 
    // << NOVO >> PRIORIDADE 2: MURALHA
    else if (isAutoWallEnabled && buildings.wall < minWallLevel) {
        console.log(`KITSUNE Construtor: Automação defensiva ativa. Muralha em [${village.name}] (${buildings.wall}) está abaixo do mínimo (${minWallLevel}). Priorizando Muralha.`);
        buildingToConstruct = 'wall';
    }

    // 3. Seguir a lista de construção padrão se nenhuma condição especial for atendida
    if (!buildingToConstruct) {
        // A variável 'Sequência_Construção' vem do arquivo Lista_PADRAO.js
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

    // 5. Enviar o comando de construção
    await sendBuildRequest(village.id, buildingToConstruct);
}


/**
 * Função auxiliar para buscar dados essenciais da aldeia.
 */
async function fetchVillageData(villageId) {
    try {
        const response = await fetch(`/game.php?village=${villageId}&screen=main`);
        if (!response.ok) return null;

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const buildingData = JSON.parse(doc.querySelector('#building_levels').textContent);
        
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
        
        const buildQueue = doc.querySelectorAll('#build_queue tr.build_order');

        return { buildings: buildingData, resources, population, buildQueue: Array.from(buildQueue) };
    } catch (error) {
        console.error("KITSUNE Construtor: Falha ao buscar dados da aldeia.", error);
        return null;
    }
}

/**
 * Função auxiliar para enviar a requisição de construção.
 */
async function sendBuildRequest(villageId, building) {
    const url = `/game.php?village=${villageId}&screen=main&action=build&id=${building}&h=${game_data.csrf}`;
    
    try {
        const response = await fetch(url, { method: 'GET' });
        if (response.ok) {
            console.log(`KITSUNE Construtor: Ordem de construção para ${building} enviada.`);
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            console.warn(`KITSUNE Construtor: Falha ao enviar ordem de construção para ${building}. O jogo pode ter recusado (falta de recursos/fila cheia).`);
        }
    } catch (error) {
        console.error(`KITSUNE Construtor: Erro de rede ao tentar construir ${building}.`, error);
    }
}
