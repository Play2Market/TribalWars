// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Recrutador
// @version      2.2-CSRF-Fix
// @description  Motor lógico para o módulo Recrutador do Projeto Kitsune, com lógica de envio e verificação de recursos.
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

        // --- INÍCIO DA CORREÇÃO ---
        // Altera o método de busca do token para ser mais confiável, lendo do bloco de dados do jogo.
        let csrfToken = null;
        const csrfMatch = text.match(/"csrf":"(\w+)"/);
        if (csrfMatch && csrfMatch[1]) {
            csrfToken = csrfMatch[1];
        }
        // --- FIM DA CORREÇÃO ---

        if (!csrfToken) {
            console.warn(`Kitsune Recrutador: Não foi possível encontrar o token de segurança para a aldeia ${village.name}.`);
            return;
        }

        const currentTroops = {};
        const troopRows = doc.querySelectorAll('#train_form tr[data-unit]');
        troopRows.forEach(row => {
            const unitName = row.dataset.unit;
            const existingCount = parseInt(row.querySelector('.unit_existing_count')?.textContent.trim() || 0, 10);
            currentTroops[unitName] = existingCount;
        });

        const unitData = {};
        doc.querySelectorAll('#train_form tr[data-unit]').forEach(row => {
            const unit = row.dataset.unit;
            unitData[unit] = {
                wood: parseInt(row.querySelector('.cost_wood')?.textContent || '0'),
                stone: parseInt(row.querySelector('.cost_stone')?.textContent || '0'),
                iron: parseInt(row.querySelector('.cost_iron')?.textContent || '0'),
                pop: parseInt(row.querySelector('.cost_pop')?.textContent || '0'),
                max: parseInt(row.querySelector('a.add-max')?.textContent.replace(/[()]/g, '') || '0')
            };
        });

        const pageGameDataMatch = text.match(/TribalWars\.updateGameData\((.*?)\);/);
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


        const troopsToRecruit = {};
        let needsRecruiting = false;

        for (const unit in targetTroops) {
            const target = parseInt(targetTroops[unit] || 0, 10);
            if (target <= 0) continue;

            const deficit = target - (currentTroops[unit] || 0);
            if (deficit <= 0) continue;

            const unitInfo = unitData[unit];
            if (!unitInfo || unitInfo.max === 0) continue;

            const building = doc.querySelector(`#main_buildrow_${unitInfo.recruit_from || 'barracks'}`).id.includes('stable') ? 'stable' : (doc.querySelector(`#main_buildrow_${unitInfo.recruit_from || 'barracks'}`).id.includes('garage') ? 'garage' : 'barracks');
            const batchSize = parseInt(config[building]?.lote, 10) || 1;

            let amountToRecruit = 0;
            if (batchSize > 0) {
                for (let i = 0; i < Math.floor(deficit / batchSize); i++) {
                    const nextBatchCost = { wood: unitInfo.wood * batchSize, stone: unitInfo.stone * batchSize, iron: unitInfo.iron * batchSize, pop: unitInfo.pop * batchSize };
                    if (resources.wood >= nextBatchCost.wood && resources.stone >= nextBatchCost.stone && resources.iron >= nextBatchCost.iron && (pop.current + nextBatchCost.pop) <= pop.max) {
                        amountToRecruit += batchSize;
                        resources.wood -= nextBatchCost.wood;
                        resources.stone -= nextBatchCost.stone;
                        resources.iron -= nextBatchCost.iron;
                        pop.current += nextBatchCost.pop;
                    } else {
                        break;
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
