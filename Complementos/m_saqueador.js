// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Saqueador
// @version      4.0-Background-Fetch
// @description  Motor lógico avançado para o módulo Saqueador do Projeto Kitsune, operando em segundo plano via FETCH.
// @author       Triky, Gemini & Cia
// ==/UserScript==

/**
 * Motor lógico para o Módulo Saqueador.
 * << REESCRITO PARA OPERAÇÃO EM SEGUNDO PLANO VIA FETCH >>
 * Esta função agora busca os dados do Assistente de Saque e envia os ataques
 * sem a necessidade de o usuário estar na página.
 */
async function runLooterModule() {
    console.log("KITSUNE: Módulo Saqueador - Iniciando varredura em segundo plano...");

    // 1. OBTENÇÃO DAS CONFIGURAÇÕES E DADOS GLOBAIS
    const settings = window.KitsuneSettingsManager.get().saqueador;
    const model = settings.modelo || 'A';
    const maxDist = parseFloat(settings.distancia) || 20;
    const maxWall = settings.nivelMuralha === null ? 20 : parseInt(settings.nivelMuralha, 10);
    const reportSettings = settings.reports || {};
    const securityToken = game_data.csrf; // Token 'h'
    const currentVillageID = game_data.village.id;

    let totalAttacksSent = 0;
    let page = 0;
    let hasNextPage = true;

    // 2. LOOP DE PAGINAÇÃO VIA FETCH
    // O loop continua enquanto houver uma próxima página para processar.
    while (hasNextPage) {
        hasNextPage = false; // Presume que esta é a última página
        console.log(`KITSUNE Saqueador: Buscando e processando dados da página ${page + 1}...`);

        try {
            // Busca o HTML da página do assistente de saque
            const response = await fetch(`/game.php?screen=am_farm&Farm_page=${page}`);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            const farmRows = doc.querySelectorAll('#plunder_list tr[id^="village_"]');
            if (farmRows.length === 0) {
                console.log("KITSUNE Saqueador: Nenhuma aldeia encontrada nesta página, encerrando.");
                break;
            }

            // 3. ITERAÇÃO E FILTRAGEM DAS ALDEIAS NA PÁGINA ATUAL
            for (const row of farmRows) {
                // --- CHECK 1: Ignorar se já houver um ataque em andamento ---
                const attackInProgressIcon = row.querySelector('img[src*="/command/attack.webp"]');
                if (attackInProgressIcon) continue;

                // --- CHECK 2: Filtrar por tipo de relatório ---
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
                
                // --- CHECK 3: Filtrar por Nível da Muralha ---
                const wallLevelText = row.querySelector('td:nth-of-type(7)')?.textContent;
                if (wallLevelText && wallLevelText !== '?') {
                    const wallLevel = parseInt(wallLevelText, 10);
                    if (wallLevel > maxWall) continue;
                }

                // --- CHECK 4: Filtrar por Distância ---
                const distanceText = row.querySelector('td:nth-of-type(8)')?.textContent;
                if (!distanceText) continue;
                const distance = parseFloat(distanceText);
                if (distance > maxDist) continue;

                // --- CHECK 5: VERIFICAR DISPONIBILIDADE E ENVIAR ATAQUE ---
                const attackButton = row.querySelector(`.farm_icon_${model.toLowerCase()}`);
                if (attackButton && !attackButton.classList.contains('farm_icon_disabled')) {
                    
                    // Extrai os parâmetros da função onclick do botão
                    const onclickAttr = attackButton.getAttribute('onclick');
                    const params = onclickAttr.match(/sendUnits(?:FromReport)?\(this, (\d+), (\d+)/);
                    if (!params) continue;
                    
                    const targetVillageId = params[1];
                    const templateId = params[2];

                    // Monta a requisição POST
                    const url = `/game.php?village=${currentVillageID}&screen=am_farm&mode=farm&ajaxaction=farm&json=1&h=${securityToken}`;
                    const body = new URLSearchParams({
                        target: targetVillageId,
                        template_id: templateId
                    });

                    // Envia a requisição
                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: body
                    });

                    totalAttacksSent++;
                    console.log(`Kitsune Saqueador: Requisição de ataque enviada para ${targetVillageId} a ${distance.toFixed(1)} campos.`);
                    
                    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 150));
                }
            }

            // 4. VERIFICAR SE EXISTE UMA PRÓXIMA PÁGINA
            const nextPageLink = doc.querySelector(`#plunder_list_nav a.paged-nav-item[href*="Farm_page=${page + 1}"]`);
            if (nextPageLink) {
                hasNextPage = true;
                page++;
            }

        } catch (error) {
            console.error(`KITSUNE Saqueador: Erro ao processar a página ${page + 1}.`, error);
            hasNextPage = false; // Interrompe o loop em caso de erro
        }
    }

    // 5. LOG FINAL
    if (totalAttacksSent > 0) {
        console.log(`KITSUNE Saqueador: Varredura em segundo plano concluída. Total de ${totalAttacksSent} ataques enviados com o modelo ${model}.`);
    } else {
        console.log("KITSUNE Saqueador: Varredura em segundo plano concluída. Nenhuma aldeia válida encontrada para atacar com os filtros atuais.");
    }
}
