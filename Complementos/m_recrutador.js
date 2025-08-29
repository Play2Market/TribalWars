// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Recrutador
// @version      3.0-Final-Logic
// @description  Motor lógico para o módulo Recrutador do Projeto Kitsune, com lógica de envio, verificação de recursos e respeito às filas e lotes.
// @author       Triky, Gemini & Cia
// ==/UserScript==

async function runRecruiterModule() {
    console.log("KITSUNE: Módulo Recrutador - Verificando recrutamento...");

    const settings = window.KitsuneSettingsManager.get();
    const recruiterSettings = settings.recrutador;

    for (const config of recruiterSettings) {
        if (!config.grupo || config.grupo === "0") {
            continue;
        }

        const targetTroops = { ...config };
        delete targetTroops.grupo;

        const villages = window.kitsuneModalManager.getVillagesFromGroup(config.grupo);

        if (!villages || villages.length === 0) {
            console.warn(`Kitsune Recrutador: Nenhuma aldeia encontrada para o grupo ${config.grupo}. Verifique se as coordenadas no grupo personalizado estão corretas e se o coletor de aldeias está atualizado.`);
            continue;
        }

        for (const village of villages) {
            await checkAndRecruitForVillage(village, targetTroops, settings.recrutadorConfig);
        }
    }
}

async function checkAndRecruitForVillage(village, targetTroops, config) {
    try {
        const response = await fetch(`/game.php?village=${village.id}&screen=train`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const csrfToken = doc.querySelector('#train_form input[name="h"]')?.value;

        if (!csrfToken) {
            console.warn(`Kitsune Recrutador: Não foi possível encontrar o token de segurança para a aldeia ${village.name}.`);
            return;
        }

        const pageGameDataMatch = text.match(/TribalWars\.updateGameData\((.*?)\);/);
        if (!pageGameDataMatch || !pageGameDataMatch[1]) {
            console.warn(`Kitsune Recrutador: Não foi possível encontrar os dados da aldeia ${village.name} na página de recrutamento.`);
            return;
        }
        const pageGameData = JSON.parse(pageGameDataMatch[1]);
        const resources = {
            wood: pageGameData.village.wood,
            stone: pageGameData.village.stone,
            iron: pageGameData.village.iron
        };
        const pop = {
            current: pageGameData.village.pop,
            max: pageGameData.village.pop_max
        };

        const currentTroops = {};
        const troopRows = doc.querySelectorAll('#train_form tr[data-unit]');
        troopRows.forEach(row => {
            const unitName = row.dataset.unit;
            const existingCount = parseInt(row.querySelector('.unit_existing_count')?.textContent.trim() || 0, 10);
            currentTroops[unitName] = existingCount;
        });

        const unitData = {};
        troopRows.forEach(row => {
            const unit = row.dataset.unit;
            unitData[unit] = {
                wood: parseInt(row.querySelector('.cost_wood')?.textContent || '0'),
                stone: parseInt(row.querySelector('.cost_stone')?.textContent || '0'),
                iron: parseInt(row.querySelector('.cost_iron')?.textContent || '0'),
                pop: parseInt(row.querySelector('.cost_pop')?.textContent || '0'),
                max: parseInt(row.querySelector('a.add-max')?.textContent.replace(/[()]/g, '') || '0'),
                recruit_from: row.closest('table').id.replace('_units', '')
            };
        });

        const troopsToRecruit = {};
        let needsRecruiting = false;

        for (const unit in targetTroops) {
            const target = parseInt(targetTroops[unit] || 0, 10);
            if (target <= 0) continue;

            const deficit = target - (currentTroops[unit] || 0);
            if (deficit <= 0) continue;

            const unitInfo = unitData[unit];
            if (!unitInfo || unitInfo.max === 0) continue;
            
            // --- LÓGICA DE LOTE E FILA APRIMORADA ---
            const building = unitInfo.recruit_from;
            const batchSize = parseInt(config[building]?.lote, 10) || 1;
            const maxQueues = parseInt(config[building]?.filas, 10) || 1;

            let amountToRecruit = 0;
            if (batchSize > 0) {
                const batchesNeeded = Math.floor(deficit / batchSize);
                const batchesToQueue = Math.min(batchesNeeded, maxQueues);

                for (let i = 0; i < batchesToQueue; i++) {
                    const batchCost = { wood: unitInfo.wood * batchSize, stone: unitInfo.stone * batchSize, iron: unitInfo.iron * batchSize, pop: unitInfo.pop * batchSize };
                    if (resources.wood >= batchCost.wood && resources.stone >= batchCost.stone && resources.iron >= batchCost.iron && (pop.current + batchCost.pop) <= pop.max) {
                        amountToRecruit += batchSize;
                        resources.wood -= batchCost.wood;
                        resources.stone -= batchCost.stone;
                        resources.iron -= batchCost.iron;
                        pop.current += batchCost.pop;
                    } else {
                        break; // Para se não houver recursos/pop para o próximo lote
                    }
                }
            }

            if (amountToRecruit > 0) {
                troopsToRecruit[unit] = Math.min(amountToRecruit, unitInfo.max);
                needsRecruiting = true;
            }
        }

        if (needsRecruiting && Object.keys(troopsToRecruit).length > 0) {
            console.log(`KITSUNE Recrutador: Enviando ordem de recrutamento para [${village.name}]:`, troopsToRecruit);
            await sendRecruitRequest(village.id, troopsToRecruit, csrfToken);
        }

    } catch (error) {
        console.error(`Kitsune Recrutador: Erro ao processar a aldeia ${village.id} (${village.name}).`, error);
    }
}

async function sendRecruitRequest(villageId, troops, csrfToken) {
    const url = `/game.php?village=${villageId}&screen=train&action=train&mode=mass&h=${csrfToken}`;
    const body = new URLSearchParams();
    for (const unit in troops) {
        if (troops[unit] > 0) {
            body.append(unit, troops[unit]);
        }
    }
    // Adiciona as outras unidades com 0 para garantir que o formulário seja enviado corretamente
    body.append('spear', troops['spear'] || 0);
    body.append('sword', troops['sword'] || 0);
    body.append('axe', troops['axe'] || 0);
    body.append('archer', troops['archer'] || 0);
    body.append('spy', troops['spy'] || 0);
    body.append('light', troops['light'] || 0);
    body.append('marcher', troops['marcher'] || 0);
    body.append('heavy', troops['heavy'] || 0);
    body.append('ram', troops['ram'] || 0);
    body.append('catapult', troops['catapult'] || 0);


    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });
        if (!response.ok) {
            console.warn(`Kitsune Recrutador: O servidor retornou um erro para a aldeia ${villageId}. Status: ${response.status}`);
        } else {
             await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
        }
    } catch (error) {
         console.error(`Kitsune Recrutador: Erro de rede ao recrutar na aldeia ${villageId}.`, error);
    }
}
