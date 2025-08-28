// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Saqueador
// @version      3.0-Advanced
// @description  Motor lógico avançado para o módulo Saqueador do Projeto Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

/**
 * Motor lógico para o Módulo Saqueador.
 * Esta função é projetada para ser chamada pelo gerenciador de timers do Kitsune.
 */
async function runLooterModule() {
    // 1. VERIFICAÇÃO DE TELA E REDIRECIONAMENTO
    // Garante que o script só execute na tela do Assistente de Saque.
    if (game_data.screen !== 'am_farm') {
        console.log("KITSUNE Saqueador: Não está na tela do Assistente de Saque. Redirecionando...");
        // Muda para a página correta e aguarda o próximo ciclo do timer.
        window.location.href = `/game.php?screen=am_farm`;
        return;
    }

    console.log("KITSUNE: Módulo Saqueador - Iniciando varredura avançada...");

    // 2. OBTENÇÃO DAS CONFIGURAÇÕES DO KITSUNE
    const settings = window.KitsuneSettingsManager.get().saqueador;
    const model = settings.modelo || 'A';
    const maxDist = parseFloat(settings.distancia) || 20;
    // Se o usuário deixar o campo de muralha vazio, consideramos 20 como o máximo.
    const maxWall = settings.nivelMuralha === null ? 20 : parseInt(settings.nivelMuralha, 10);
    const reportSettings = settings.reports || {};

    let totalAttacksSent = 0;
    let currentPage = 0;
    let hasNextPage = true;

    // 3. LOOP DE PAGINAÇÃO
    // O loop continua enquanto houver uma próxima página para processar.
    do {
        console.log(`KITSUNE Saqueador: Processando página ${currentPage + 1}...`);
        const farmRows = document.querySelectorAll('#plunder_list tr[id^="village_"]');
        let attacksOnThisPage = 0;

        // 4. ITERAÇÃO E FILTRAGEM DAS ALDEIAS NA PÁGINA ATUAL
        for (const row of farmRows) {
            // --- CHECK 1: Ignorar se já houver um ataque em andamento ---
            const attackInProgressIcon = row.querySelector('img[src*="/command/attack.webp"]');
            if (attackInProgressIcon) {
                continue; // Pula esta aldeia, já há um ataque a caminho.
            }

            // --- CHECK 2: Filtrar por tipo de relatório ---
            const reportIcon = row.querySelector('td:nth-of-type(2) img');
            if (reportIcon) {
                // Extrai o nome do arquivo do ícone (ex: 'green.webp')
                const reportType = reportIcon.src.split('/').pop().replace('.webp', '');
                // Converte para a chave usada nas configurações (ex: 'loss_full' para 'red')
                const reportKeyMap = {
                    'green': 'win', 'yellow': 'loss', 'red_yellow': 'win_damage',
                    'blue': 'scouted', 'red_blue': 'loss_scout', 'red': 'loss_full'
                };
                const settingsKey = reportKeyMap[reportType];
                if (settingsKey && reportSettings[settingsKey] === false) {
                    continue; // Pula se este tipo de relatório estiver desativado no Kitsune.
                }
            }
            
            // --- CHECK 3: Filtrar por Nível da Muralha ---
            const wallLevelText = row.querySelector('td:nth-of-type(7)')?.textContent;
            if (wallLevelText && wallLevelText !== '?') {
                 const wallLevel = parseInt(wallLevelText, 10);
                 if (wallLevel > maxWall) {
                    continue; // Pula se a muralha for muito alta.
                 }
            }

            // --- CHECK 4: Filtrar por Distância ---
            const distanceText = row.querySelector('td:nth-of-type(8)')?.textContent;
            if (!distanceText) continue;
            const distance = parseFloat(distanceText);
            if (distance > maxDist) {
                continue; // Pula se a distância for maior que a configurada.
            }

            // --- CHECK 5: VERIFICAR DISPONIBILIDADE E ATACAR ---
            const attackButton = row.querySelector(`.farm_icon_${model.toLowerCase()}`);
            
            // Verifica se o botão existe e se NÃO está desabilitado
            if (attackButton && !attackButton.classList.contains('farm_icon_disabled') && !attackButton.classList.contains('start_locked')) {
                attackButton.click();
                attacksOnThisPage++;
                totalAttacksSent++;
                console.log(`Kitsune Saqueador: Ataque enviado para aldeia a ${distance.toFixed(1)} campos de distância.`);
                
                // Adiciona um atraso para não sobrecarregar o servidor e simular um comportamento mais humano.
                await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 150));
            }
        }
        
        console.log(`KITSUNE Saqueador: ${attacksOnThisPage} ataques enviados nesta página.`);

        // 5. NAVEGAR PARA A PRÓXIMA PÁGINA
        const nextPageLink = document.querySelector(`#plunder_list_nav a.paged-nav-item[href*="Farm_page=${currentPage + 1}"]`);

        if (nextPageLink) {
            currentPage++;
            console.log("KITSUNE Saqueador: Navegando para a próxima página...");
            nextPageLink.click();
            // Aguarda a nova página carregar antes de continuar o loop
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        } else {
            hasNextPage = false;
        }

    } while (hasNextPage);


    // 6. LOG FINAL
    if (totalAttacksSent > 0) {
        console.log(`KITSUNE Saqueador: Varredura concluída. Total de ${totalAttacksSent} ataques enviados com o modelo ${model}.`);
        // Recarrega a página para obter uma lista nova no próximo ciclo.
        setTimeout(() => location.reload(), 2000);
    } else {
        console.log("KITSUNE Saqueador: Varredura concluída. Nenhuma aldeia válida encontrada para atacar com os filtros atuais.");
    }
}
