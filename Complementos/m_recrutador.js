/**
 * =========================================================================================
 * KITSUNE - MÓDULO DE LÓGICA - RECRUTADOR (m_recrutador.js)
 * =========================================================================================
 * Motor lógico para o módulo Recrutador, com lógica de lotes, filas e recursos.
 * @version 4.0-Polished
 * @author Triky, Gemini & Cia
 */
const recrutadorModule = (function() {

    const PAUSE_CONFIG = {
        BETWEEN_VILLAGES_MS: [800, 1500]
    };

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function checkAndRecruitForVillage(village, targetTroops, config, dependencias) {
        const { logger, gameData } = dependencias;
        try {
            const response = await fetch(`/game.php?village=${village.id}&screen=train`);
            const text = await response.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');

            const csrfToken = doc.querySelector('#train_form input[name="h"]')?.value;
            if (!csrfToken) return;

            const pageDataMatch = text.match(/TribalWars\.updateGameData\((.*?)\);/);
            if (!pageDataMatch) return;
            const pageData = JSON.parse(pageDataMatch[1]);
            
            const resources = { wood: pageData.village.wood, stone: pageData.village.stone, iron: pageData.village.iron };
            const pop = { current: pageData.village.pop, max: pageData.village.pop_max };
            
            const currentTroops = {};
            const unitData = {};
            const troopRows = doc.querySelectorAll('#train_form tr[data-unit]');
            
            troopRows.forEach(row => {
                const unit = row.dataset.unit;
                currentTroops[unit] = parseInt(row.querySelector('.unit_existing_count')?.textContent || 0, 10);
                unitData[unit] = {
                    wood: parseInt(row.querySelector('.cost_wood')?.textContent || 0),
                    stone: parseInt(row.querySelector('.cost_stone')?.textContent || 0),
                    iron: parseInt(row.querySelector('.cost_iron')?.textContent || 0),
                    pop: parseInt(row.querySelector('.cost_pop')?.textContent || 0),
                    max: parseInt(row.querySelector('a.add-max')?.textContent.replace(/[()]/g, '') || 0),
                    building: row.closest('table').id.replace('_units', '')
                };
            });

            const troopsToRecruit = {};
            for (const unit in targetTroops) {
                const target = parseInt(targetTroops[unit] || 0, 10);
                if (target <= 0 || !unitData[unit]) continue;

                const deficit = target - (currentTroops[unit] || 0);
                if (deficit <= 0) continue;

                const unitInfo = unitData[unit];
                if (unitInfo.max === 0) continue;
                
                const buildingConfig = config[unitInfo.building] || { lote: 1, filas: 1 };
                const batchSize = parseInt(buildingConfig.lote, 10);
                const maxQueues = parseInt(buildingConfig.filas, 10);
                let amountToRecruit = 0;

                for (let i = 0; i < maxQueues; i++) {
                    const cost = { wood: unitInfo.wood * batchSize, stone: unitInfo.stone * batchSize, iron: unitInfo.iron * batchSize, pop: unitInfo.pop * batchSize };
                    if (resources.wood >= cost.wood && resources.stone >= cost.stone && resources.iron >= cost.iron && (pop.current + cost.pop) <= pop.max) {
                        amountToRecruit += batchSize;
                        resources.wood -= cost.wood;
                        resources.stone -= cost.stone;
                        resources.iron -= cost.iron;
                        pop.current += cost.pop;
                    } else {
                        break;
                    }
                }
                
                if (amountToRecruit > 0) {
                    troopsToRecruit[unit] = Math.min(amountToRecruit, unitInfo.max, deficit);
                }
            }

            if (Object.keys(troopsToRecruit).length > 0) {
                logger.add('Recrutador', `Ordem para [${village.name}]: ${JSON.stringify(troopsToRecruit)}.`);
                await sendRecruitRequest(village.id, troopsToRecruit, csrfToken, logger);
            }

        } catch (error) {
            logger.add('Recrutador', `Erro ao processar ${village.name}: ${error.message}.`);
        }
    }

    async function sendRecruitRequest(villageId, troops, csrfToken, logger) {
        const url = `/game.php?village=${villageId}&screen=train&action=train&mode=mass&h=${csrfToken}`;
        const body = new URLSearchParams(troops);

        try {
            await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        } catch (error) {
            logger.add('Recrutador', `Erro de rede ao recrutar em ${villageId}.`);
        }
    }

    async function run(dependencias) {
        const { settingsManager, kitsuneModalManager, logger } = dependencias;
        logger.add('Recrutador', 'Iniciando ciclo de recrutamento.');
        
        const settings = settingsManager.get();
        const regras = settings.recrutador;

        for (const regra of regras) {
            if (!regra.grupo || regra.grupo === "0") continue;
            
            const targetTroops = { ...regra };
            delete targetTroops.grupo;
            
            const villages = kitsuneModalManager.getVillagesFromGroup(regra.grupo);
            if (!villages || villages.length === 0) continue;

            for (const village of villages) {
                await checkAndRecruitForVillage(village, targetTroops, settings.recrutadorConfig, dependencias);
                await delay(PAUSE_CONFIG.BETWEEN_VILLAGES_MS[0] + Math.random() * PAUSE_CONFIG.BETWEEN_VILLAGES_MS[1]);
            }
        }
        
        logger.add('Recrutador', 'Ciclo de recrutamento finalizado.');
    }

    return { run };
})();
