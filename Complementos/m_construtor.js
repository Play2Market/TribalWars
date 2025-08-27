// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Construtor
// @version      2.0
// @description  Motor lógico para o módulo Construtor do Projeto Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

// Esta função será o coração do módulo Construtor no script principal.
// Ela não precisa de interface própria, pois será controlada pelo painel do Kitsune.

async function runBuilderModule() {
    console.log("KITSUNE: Módulo Construtor - Verificando construções...");

    // 1. Obter as configurações do painel Kitsune
    const settings = window.KitsuneSettingsManager.get();
    const builderSettings = settings.construtor; // Ex: { modelo: 'ID_do_modelo', filas: 5, etc... }
    const targetModelId = builderSettings.modelo;

    if (!targetModelId || targetModelId === 'default') {
        console.warn("Kitsune Construtor: Nenhum modelo de construção selecionado.");
        // Futuramente, pode-se usar a "Lista_PADRAO.js" como fallback aqui.
        return;
    }

    // 2. Obter a fila de construção do modelo selecionado
    // (Isso assume que o módulo 'builder_templates.js' está carregado)
    const allTemplates = window.KitsuneBuilderModal.getTemplates();
    const currentTemplate = allTemplates.find(t => t.id === parseInt(targetModelId, 10));

    if (!currentTemplate || currentTemplate.queue.length === 0) {
        console.warn(`Kitsune Construtor: Modelo "${targetModelId}" não encontrado ou está vazio.`);
        return;
    }

    // 3. Obter dados da aldeia atual (níveis dos edifícios)
    // Usaremos uma função auxiliar para buscar os dados da página principal (main)
    const villageData = await fetchVillageData(game_data.village.id);
    if (!villageData) {
        console.error("Kitsune Construtor: Não foi possível obter os dados da aldeia.");
        return;
    }

    const { buildings, buildQueue } = villageData;
    const maxQueueSlots = builderSettings.filas || 5; // Pega o número de filas das configs

    // 4. Determinar a próxima construção
    let nextBuild = null;
    for (const item of currentTemplate.queue) {
        const currentLevel = parseInt(buildings[item.building] || 0, 10);
        if (currentLevel < item.level) {
            nextBuild = { building: item.building, level: currentLevel + 1 };
            break; // Encontramos o primeiro edifício que precisa de upgrade
        }
    }

    if (!nextBuild) {
        console.log("KITSUNE: Módulo Construtor - Todas as construções do modelo foram concluídas!");
        // Opcional: Desativar o módulo automaticamente
        // toggleModule('Construtor', false);
        return;
    }

    // 5. Verificar se a fila de construção tem espaço
    if (buildQueue.length >= maxQueueSlots) {
        console.log(`Kitsune Construtor: Fila de construção está cheia (${buildQueue.length}/${maxQueueSlots}).`);
        return;
    }

    // 6. Enviar a requisição para construir
    // (A função sendBuildRequest precisará ser criada, usando o método POST do jogo)
    console.log(`KITSUNE: Módulo Construtor - Tentando evoluir ${nextBuild.building} para o nível ${nextBuild.level}.`);
    // await sendBuildRequest(nextBuild.building);
    // KitsuneLogger.add('Construtor', `Construção de ${nextBuild.building} para o nível ${nextBuild.level} iniciada.`);
}

// --- Funções Auxiliares (a serem adicionadas ao script principal) ---

// Função para buscar os níveis de edifícios via AJAX
async function fetchVillageData(villageId) {
    try {
        const response = await fetch(`/game.php?village=${villageId}&screen=main`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const buildings = {};
        const buildingData = JSON.parse(doc.querySelector('#building_levels').textContent);
        for (const building in buildingData) {
            buildings[building] = buildingData[building];
        }

        const buildQueue = Array.from(doc.querySelectorAll('#build_queue tr.buildorder_ongoing, #build_queue tr.buildorder_build')).map(row => {
            // Extrair dados da fila
            return {};
        });

        return { buildings, buildQueue };
    } catch (error) {
        console.error("Erro ao buscar dados da aldeia:", error);
        return null;
    }
}