// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Recrutador
// @version      2.0
// @description  Motor lógico para o módulo Recrutador do Projeto Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

// Esta função será o motor lógico do módulo Recrutador.
async function runRecruiterModule() {
    console.log("KITSUNE: Módulo Recrutador - Verificando recrutamento...");

    // 1. Obter as configurações do painel Kitsune
    const settings = window.KitsuneSettingsManager.get();
    const recruiterSettings = settings.recrutador; // Array com as duas linhas de configuração

    // Itera sobre cada linha de configuração de recrutamento no painel
    for (const config of recruiterSettings) {
        if (!config.grupo || config.grupo === "0") {
            continue; // Pula se nenhum grupo estiver selecionado
        }

        const targetTroops = { ...config }; // Copia as metas de tropas
        delete targetTroops.grupo;

        // 2. Obter a lista de aldeias do grupo selecionado
        const villageCoords = window.kitsuneModalManager.getVillagesFromGroup(config.grupo);
        const villageMap = window.KitsuneVillageManager.getMap(); // Mapa de Coordenada -> ID

        const villageIds = villageCoords
            .map(v => villageMap[v.coords])
            .filter(id => id); // Filtra aldeias não encontradas no mapa

        if (villageIds.length === 0) {
            console.warn(`Kitsune Recrutador: Nenhuma aldeia encontrada para o grupo ${config.grupo}.`);
            continue;
        }
        
        // 3. Iterar sobre cada aldeia e verificar a necessidade de recrutamento
        for (const villageId of villageIds) {
            await checkAndRecruitForVillage(villageId, targetTroops, settings.recrutadorConfig);
        }
    }
}

// Função auxiliar para verificar e recrutar em uma única aldeia
async function checkAndRecruitForVillage(villageId, targetTroops, config) {
    try {
        const response = await fetch(`/game.php?village=${villageId}&screen=train`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const currentTroops = {};
        doc.querySelectorAll('.unit_existing_count').forEach((element, index) => {
            const unitName = game_data.units[index]; // 'spear', 'sword', etc.
            currentTroops[unitName] = parseInt(element.textContent.trim(), 10) || 0;
        });

        const troopsToRecruit = {};
        let needsRecruiting = false;

        for (const unit in targetTroops) {
            const target = parseInt(targetTroops[unit] || 0, 10);
            if (target > 0) {
                const deficit = target - (currentTroops[unit] || 0);
                if (deficit > 0) {
                    needsRecruiting = true;
                    // Lógica para determinar a quantidade a recrutar com base nos lotes (batch size)
                    // Esta é uma simplificação. A lógica real pode ser mais complexa.
                    const maxRecruitable = parseInt(doc.querySelector(`input[name=${unit}]`)?.nextElementSibling?.textContent?.replace(/[()]/g, '') || 0);
                    troopsToRecruit[unit] = Math.min(deficit, maxRecruitable);
                }
            }
        }

        if (needsRecruiting) {
            console.log(`KITSUNE: Recrutando em ${villageId}:`, troopsToRecruit);
            // Criar e enviar a requisição POST para recrutar as tropas
            // await sendRecruitRequest(villageId, troopsToRecruit);
            // KitsuneLogger.add('Recrutador', `Recrutamento iniciado na aldeia ${villageId}.`);
        }

    } catch (error) {
        console.error(`Kitsune Recrutador: Erro ao processar a aldeia ${villageId}.`, error);
    }
}