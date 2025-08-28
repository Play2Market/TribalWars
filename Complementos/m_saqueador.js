// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Saqueador
// @version      4.2-Stable-Multi-Village
// @description  Motor lógico avançado para o módulo Saqueador do Projeto Kitsune, com fonte de dados e CSRF corrigidos.
// @author       Triky, Gemini & Cia
// ==/UserScript==

async function runLooterModule() {
    console.log("KITSUNE: Módulo Saqueador - Iniciando varredura MULTI-ALDEIA em segundo plano...");

    // --- INÍCIO DA CORREÇÃO ---
    const settings = window.KitsuneSettingsManager.get().saqueador;
    if (!window.KitsuneVillageManager) {
        console.error("KITSUNE Saqueador: KitsuneVillageManager não está disponível.");
        return;
    }
    const villagesToFarmFrom = await window.KitsuneVillageManager.getVillages();
    // --- FIM DA CORREÇÃO ---

    if (!villagesToFarmFrom || villagesToFarmFrom.length === 0) {
        console.warn("KITSUNE Saqueador: Nenhuma aldeia de origem encontrada para iniciar os saques.");
        return;
    }

    console.log(`KITSUNE Saqueador: ${villagesToFarmFrom.length} aldeias de origem encontradas.`);

    const model = settings.modelo || 'A';
    const maxDist = parseFloat(settings.distancia) || 20;
    const maxWall = settings.nivelMuralha === null ? 20 : parseInt(settings.nivelMuralha, 10);
    const reportSettings = settings.reports || {};

    let totalAttacksSent = 0;

    for (const originVillage of villagesToFarmFrom) {
        console.log(`--- [ ${originVillage.name} ] --- Iniciando ciclo de saques.`);

        let page = 0;
        let hasNextPage = true;

        while (hasNextPage) {
            hasNextPage = false;

            try {
                const response = await fetch(`/game.php?village=${originVillage.id}&screen=am_farm&Farm_page=${page}`);
                if (!response.ok) {
                    console.error(`KITSUNE Saqueador: Falha ao buscar dados para a aldeia ${originVillage.name}. Status: ${response.status}`);
                    break;
                }
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');

                // --- INÍCIO DA CORREÇÃO ---
                // Pega um token CSRF fresco da página que acabamos de carregar
                const csrfMatch = text.match(/"csrf":"(\w+)"/);
                if (!csrfMatch || !csrfMatch[1]) {
                    console.error(`KITSUNE Saqueador: Não foi possível encontrar token CSRF para a aldeia ${originVillage.name}.`);
                    break; 
                }
                const securityToken = csrfMatch[1];
                // --- FIM DA CORREÇÃO ---

                const farmRows = doc.querySelectorAll('#plunder_list tr[id^="village_"]');
                if (farmRows.length === 0) break;

                for (const row of farmRows) {
                    if (row.querySelector('img[src*="/command/attack.webp"]')) continue;

                    const reportIcon = row.querySelector('td:nth-of-type(2) img');
                    if (reportIcon) {
                        const reportType = reportIcon.src.split('/').pop().replace('.webp', '');
                        const reportKeyMap = { 'green': 'win', 'yellow': 'loss', 'red_yellow': 'win_damage', 'blue': 'scouted', 'red_blue': 'loss_scout', 'red': 'loss_full' };
                        const settingsKey = reportKeyMap[reportType];
                        if (settingsKey && reportSettings[settingsKey] === false) continue;
                    }

                    const wallLevelText = row.querySelector('td:nth-of-type(7)')?.textContent;
                    if (wallLevelText && wallLevelText !== '?') {
                        if (parseInt(wallLevelText, 10) > maxWall) continue;
                    }

                    const distance = parseFloat(row.querySelector('td:nth-of-type(8)')?.textContent);
                    if (!distance || distance > maxDist) continue;

                    const attackButton = row.querySelector(`.farm_icon_${model.toLowerCase()}`);
                    if (attackButton && !attackButton.classList.contains('farm_icon_disabled')) {
                        const onclickAttr = attackButton.getAttribute('onclick');
                        const params = onclickAttr.match(/sendUnits(?:FromReport)?\(this, (\d+), (\d+)/);
                        if (!params) continue;

                        const [_, targetVillageId, templateId] = params;
                        const url = `/game.php?village=${originVillage.id}&screen=am_farm&mode=farm&ajaxaction=farm&json=1&h=${securityToken}`;
                        const body = new URLSearchParams({ target: targetVillageId, template_id: templateId });

                        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
                        totalAttacksSent++;
                        console.log(`Kitsune Saqueador: Ataque enviado de [${originVillage.name}] para ${targetVillageId} a ${distance.toFixed(1)} campos.`);
                        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 150));
                    }
                }

                if (doc.querySelector(`#plunder_list_nav a.paged-nav-item[href*="Farm_page=${page + 1}"]`)) {
                    hasNextPage = true;
                    page++;
                }

            } catch (error) {
                console.error(`KITSUNE Saqueador: Erro ao processar a aldeia ${originVillage.name}.`, error);
                hasNextPage = false;
            }
        }
        console.log(`--- [ ${originVillage.name} ] --- Ciclo de saques finalizado.`);
    }

    if (totalAttacksSent > 0) {
        console.log(`KITSUNE Saqueador: Varredura MULTI-ALDEIA concluída. Total de ${totalAttacksSent} ataques enviados com o modelo ${model}.`);
    } else {
        console.log("KITSUNE Saqueador: Varredura MULTI-ALDEIA concluída. Nenhuma aldeia válida encontrada para atacar com os filtros atuais.");
    }
}
