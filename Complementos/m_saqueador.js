// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Saqueador
// @version      4.1-Multi-Village
// @description  Motor lógico avançado para o módulo Saqueador do Projeto Kitsune, operando em segundo plano e a partir de múltiplas aldeias.
// @author       Triky, Gemini & Cia
// ==/UserScript==

/**
 * Motor lógico para o Módulo Saqueador.
 * << ATUALIZADO PARA OPERAR A PARTIR DE TODAS AS ALDEIAS DO JOGADOR >>
 * Esta função agora busca os dados do Assistente de Saque para cada aldeia
 * e envia os ataques sem a necessidade de o usuário estar na página.
 */
async function runLooterModule() {
    console.log("KITSUNE: Módulo Saqueador - Iniciando varredura MULTI-ALDEIA em segundo plano...");

    // 1. OBTENÇÃO DAS CONFIGURAÇÕES E DA LISTA DE ALDEIAS
    const settings = window.KitsuneSettingsManager.get().saqueador;
    const villagesToFarmFrom = game_data.player.villages; // Pega todas as aldeias do jogador
    
    if (!villagesToFarmFrom || villagesToFarmFrom.length === 0) {
        console.warn("KITSUNE Saqueador: Nenhuma aldeia encontrada na conta para iniciar os saques.");
        return;
    }
    
    console.log(`KITSUNE Saqueador: ${villagesToFarmFrom.length} aldeias de origem encontradas.`);

    const model = settings.modelo || 'A';
    const maxDist = parseFloat(settings.distancia) || 20;
    const maxWall = settings.nivelMuralha === null ? 20 : parseInt(settings.nivelMuralha, 10);
    const reportSettings = settings.reports || {};
    const securityToken = game_data.csrf;

    let totalAttacksSent = 0;

    // << LOOP PRINCIPAL POR TODAS AS ALDEIAS >>
    for (const originVillage of villagesToFarmFrom) {
        console.log(`--- [ ${originVillage.name} ] --- Iniciando ciclo de saques.`);
        
        let page = 0;
        let hasNextPage = true;

        // 2. LOOP DE PAGINAÇÃO (PARA CADA ALDEIA DE ORIGEM)
        while (hasNextPage) {
            hasNextPage = false; // Presume que esta é a última página para a aldeia atual
            
            try {
                // Busca o HTML da página do assistente de saque PARA A ALDEIA ATUAL DO LOOP
                const response = await fetch(`/game.php?village=${originVillage.id}&screen=am_farm&Farm_page=${page}`);
                if (!response.ok) {
                    console.error(`KITSUNE Saqueador: Falha ao buscar dados para a aldeia ${originVillage.name}. Status: ${response.status}`);
                    break; // Pula para a próxima aldeia se houver um erro de rede
                }
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                
                const farmRows = doc.querySelectorAll('#plunder_list tr[id^="village_"]');
                if (farmRows.length === 0) {
                    break; // Não há mais alvos para esta aldeia
                }

                // 3. ITERAÇÃO E FILTRAGEM DOS ALVOS
                for (const row of farmRows) {
                    const attackInProgressIcon = row.querySelector('img[src*="/command/attack.webp"]');
                    if (attackInProgressIcon) continue;

                    const reportIcon = row.querySelector('td:nth-of-type(2) img');
                    if (reportIcon) {
                        const reportType = reportIcon.src.split('/').pop().replace('.webp', '');
                        const reportKeyMap = {
                            'green': 'win', 'yellow': 'loss', 'red_yellow': 'win_damage',
                            'blue': 'scouted', 'red_blue': 'loss_scout', 'red': 'loss_full'
                        };
                        const settingsKey = reportKeyMap[reportType];
                        if (settingsKey && reportSettings[settingsKey] === false) continue;
                    }
                    
                    const wallLevelText = row.querySelector('td:nth-of-type(7)')?.textContent;
                    if (wallLevelText && wallLevelText !== '?') {
                        const wallLevel = parseInt(wallLevelText, 10);
                        if (wallLevel > maxWall) continue;
                    }

                    const distanceText = row.querySelector('td:nth-of-type(8)')?.textContent;
                    if (!distanceText) continue;
                    const distance = parseFloat(distanceText);
                    if (distance > maxDist) continue;

                    // 4. ENVIO DO ATAQUE
                    const attackButton = row.querySelector(`.farm_icon_${model.toLowerCase()}`);
                    
                    if (attackButton && !attackButton.classList.contains('farm_icon_disabled')) {
                        const onclickAttr = attackButton.getAttribute('onclick');
                        const params = onclickAttr.match(/sendUnits(?:FromReport)?\(this, (\d+), (\d+)/);
                        if (!params) continue;
                        
                        const targetVillageId = params[1];
                        const templateId = params[2];

                        const url = `/game.php?village=${originVillage.id}&screen=am_farm&mode=farm&ajaxaction=farm&json=1&h=${securityToken}`;
                        const body = new URLSearchParams({ target: targetVillageId, template_id: templateId });

                        await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: body
                        });

                        totalAttacksSent++;
                        console.log(`Kitsune Saqueador: Ataque enviado de [${originVillage.name}] para ${targetVillageId} a ${distance.toFixed(1)} campos.`);
                        
                        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 150));
                    }
                }

                // 5. VERIFICAR SE EXISTE UMA PRÓXIMA PÁGINA
                const nextPageLink = doc.querySelector(`#plunder_list_nav a.paged-nav-item[href*="Farm_page=${page + 1}"]`);
                if (nextPageLink) {
                    hasNextPage = true;
                    page++;
                }

            } catch (error) {
                console.error(`KITSUNE Saqueador: Erro ao processar a aldeia ${originVillage.name}.`, error);
                hasNextPage = false;
            }
        } // Fim do loop de páginas para a aldeia atual
        console.log(`--- [ ${originVillage.name} ] --- Ciclo de saques finalizado.`);
    } // Fim do loop principal por todas as aldeias

    // 6. LOG FINAL
    if (totalAttacksSent > 0) {
        console.log(`KITSUNE Saqueador: Varredura MULTI-ALDEIA concluída. Total de ${totalAttacksSent} ataques enviados com o modelo ${model}.`);
    } else {
        console.log("KITSUNE Saqueador: Varredura MULTI-ALDEIA concluída. Nenhuma aldeia válida encontrada para atacar com os filtros atuais.");
    }
}
