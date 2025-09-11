/**
 * =========================================================================================
 * KITSUNE - MÓDULO DE LÓGICA - SAQUEADOR (m_saqueador.js)
 * =========================================================================================
 * Motor lógico avançado para o módulo Saqueador.
 * @version 5.0-Polished
 * @author Triky, Gemini & Cia
 */
const saqueadorModule = (function() {

    const PAUSE_CONFIG = {
        BETWEEN_ATTACKS_MS: [250, 450]
    };

    const REPORT_KEY_MAP = {
        'green': 'win', 'yellow': 'loss', 'red_yellow': 'win_damage',
        'blue': 'scouted', 'red_blue': 'loss_scout', 'red': 'loss_full'
    };

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 50));
    }

    async function run(dependencias) {
        const { settingsManager, villageManager, logger } = dependencias;
        logger.add('Saqueador', 'Iniciando varredura multi-aldeia.');

        const settings = settingsManager.get().saqueador;
        const villagesToFarmFrom = villageManager.get();

        if (!villagesToFarmFrom || villagesToFarmFrom.length === 0) {
            logger.add('Saqueador', 'Nenhuma aldeia de origem encontrada para iniciar os saques.');
            return;
        }

        const model = settings.modelo || 'A';
        const maxDist = parseFloat(settings.distancia);
        const maxWall = settings.nivelMuralha === null ? 20 : parseInt(settings.nivelMuralha, 10);
        const reportSettings = settings.reports || {};
        let totalAttacksSent = 0;

        for (const originVillage of villagesToFarmFrom) {
            logger.add('Saqueador', `Analisando alvos para a aldeia [${originVillage.name}].`);
            let page = 0;
            let hasNextPage = true;

            while (hasNextPage) {
                hasNextPage = false;
                try {
                    const response = await fetch(`/game.php?village=${originVillage.id}&screen=am_farm&Farm_page=${page}`);
                    if (!response.ok) break;

                    const text = await response.text();
                    const doc = new DOMParser().parseFromString(text, 'text/html');

                    const csrfMatch = text.match(/"csrf":"(\w+)"/);
                    if (!csrfMatch || !csrfMatch[1]) {
                        logger.add('Saqueador', `Token CSRF não encontrado para ${originVillage.name}.`);
                        break;
                    }
                    const securityToken = csrfMatch[1];

                    const farmRows = doc.querySelectorAll('#plunder_list tr[id^="village_"]');
                    if (farmRows.length === 0) break;

                    for (const row of farmRows) {
                        if (row.querySelector('img[src*="/command/attack.webp"]')) continue;

                        const reportIcon = row.querySelector('td:nth-of-type(2) img');
                        if (reportIcon) {
                            const reportType = reportIcon.src.split('/').pop().replace('.webp', '');
                            const settingsKey = REPORT_KEY_MAP[reportType];
                            if (settingsKey && reportSettings[settingsKey] === false) continue;
                        }

                        const wallLevelText = row.querySelector('td:nth-of-type(7)')?.textContent;
                        if (wallLevelText && wallLevelText !== '?' && (parseInt(wallLevelText, 10) > maxWall)) continue;
                        
                        const distance = parseFloat(row.querySelector('td:nth-of-type(8)')?.textContent);
                        if (!distance || distance > maxDist) continue;

                        const attackButton = row.querySelector(`.farm_icon_${model.toLowerCase()}`);
                        if (attackButton && !attackButton.classList.contains('farm_icon_disabled')) {
                            const onclickAttr = attackButton.getAttribute('onclick');
                            const params = onclickAttr.match(/(\d+), (\d+)/);
                            if (!params) continue;

                            const [_, targetVillageId, templateId] = params;
                            const url = `/game.php?village=${originVillage.id}&screen=am_farm&mode=farm&ajaxaction=farm&json=1&h=${securityToken}`;
                            const body = new URLSearchParams({ target: targetVillageId, template_id: templateId });

                            await fetch(url, { method: 'POST', body });
                            totalAttacksSent++;
                            logger.add('Saqueador', `Ataque de [${originVillage.name}] para ${targetVillageId} enviado.`);
                            await delay(PAUSE_CONFIG.BETWEEN_ATTACKS_MS[0] + Math.random() * PAUSE_CONFIG.BETWEEN_ATTACKS_MS[1]);
                        }
                    }

                    if (doc.querySelector(`#plunder_list_nav a.paged-nav-item[href*="Farm_page=${page + 1}"]`)) {
                        hasNextPage = true;
                        page++;
                    }
                } catch (error) {
                    logger.add('Saqueador', `Erro ao processar ${originVillage.name}: ${error.message}`);
                    hasNextPage = false;
                }
            }
        }

        if (totalAttacksSent > 0) {
            logger.add('Saqueador', `Varredura concluída. ${totalAttacksSent} ataques enviados.`);
        } else {
            logger.add('Saqueador', `Varredura concluída. Nenhum alvo válido encontrado.`);
        }
    }

    return { run };
})();
