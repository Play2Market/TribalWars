// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Recrutador
// @version      2.1-Stable-Recruitment
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

        // --- CORREÇÃO PRINCIPAL APLICADA AQUI ---
        // A função getVillagesFromGroup agora retorna a lista de aldeias completa.
        const villages = window.kitsuneModalManager.getVillagesFromGroup(config.grupo);

        if (!villages || villages.length === 0) {
            console.warn(`Kitsune Recrutador: Nenhuma aldeia encontrada para o grupo ${config.grupo}. Verifique se as coordenadas no grupo personalizado estão corretas e se o coletor de aldeias está atualizado.`);
            continue;
        }
        
        // O loop agora itera sobre objetos de aldeia completos.
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

        // --- MELHORIA: Extrai o token CSRF específico da página da aldeia ---
        const csrfToken = doc.querySelector('input[name="h"]')?.value;
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

        // --- MELHORIA: Extrai os custos e população de cada unidade ---
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

        // --- MELHORIA: Obtém recursos e população atuais da aldeia ---
        const resources = {
            wood: game_data.village.wood,
            stone: game_data.village.stone,
            iron: game_data.village.iron
        };
        const pop = {
            current: game_data.village.pop,
            max: game_data.village.pop_max
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
            
            // --- MELHORIA: Lógica de lote e verificação de recursos/população ---
            const building = doc.querySelector(`#main_buildrow_${unitInfo.recruit_from || 'barracks'}`).id.includes('stable') ? 'stable' : (doc.querySelector(`#main_buildrow_${unitInfo.recruit_from || 'barracks'}`).id.includes('garage') ? 'garage' : 'barracks');
            const batchSize = parseInt(config[building]?.lote, 10) || 1;
            
            let amountToRecruit = 0;
            for (let i = 0; i < Math.floor(deficit / batchSize); i++) {
                const nextBatchCost = { wood: unitInfo.wood * batchSize, stone: unitInfo.stone * batchSize, iron: unitInfo.iron * batchSize, pop: unitInfo.pop * batchSize };
                if (resources.wood >= nextBatchCost.wood && resources.stone >= nextBatchCost.stone && resources.iron >= nextBatchCost.iron && (pop.current + nextBatchCost.pop) <= pop.max) {
                    amountToRecruit += batchSize;
                    resources.wood -= nextBatchCost.wood;
                    resources.stone -= nextBatchCost.stone;
                    resources.iron -= nextBatchCost.iron;
                    pop.current += nextBatchCost.pop;
                } else {
                    break; // Para se não houver recursos/pop para o próximo lote
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

// --- MELHORIA: Função implementada para enviar o POST de recrutamento ---
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
