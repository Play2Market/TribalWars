// ==UserScript==
// @name         Projeto Kitsune | Módulo de Lógica - Saqueador
// @version      2.0
// @description  Motor lógico para o módulo Saqueador do Projeto Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

// Esta função será o motor lógico do módulo Saqueador.
async function runLooterModule() {
    // Verifica se estamos na tela correta
    if (game_data.screen !== 'am_farm') {
        console.log("KITSUNE Saqueador: Não está na tela do Assistente de Saque. Redirecionando...");
        window.location.href = `/game.php?screen=am_farm`;
        return; // A execução continuará na próxima vez que o timer disparar, já na página correta.
    }

    console.log("KITSUNE: Módulo Saqueador - Iniciando varredura...");

    // 1. Obter as configurações do painel Kitsune
    const settings = window.KitsuneSettingsManager.get().saqueador;
    const model = settings.modelo || 'A';
    const maxDist = parseFloat(settings.distancia) || 20;
    const maxWall = parseInt(settings.nivelMuralha, 10) || 0;
    
    // 2. Aplicar o modelo de tropas na página (se necessário)
    // A lógica que criamos anteriormente com o iframe pode ser adaptada aqui
    // para garantir que a página do Assistente de Saque está com as tropas certas selecionadas.
    // Por simplicidade, vamos assumir que o usuário já configurou.
    
    // 3. Iterar sobre as aldeias na lista e atacar
    const farmRows = document.querySelectorAll('#plunder_list tr[id^="village_"]');
    let attacksSent = 0;

    for (const row of farmRows) {
        // Extrair dados da linha
        const distanceText = row.querySelector('td:nth-of-type(8)')?.textContent;
        if (!distanceText) continue;

        const distance = parseFloat(distanceText);
        
        // Aplicar filtros
        if (distance > maxDist) {
            continue; // Pula se a distância for maior que a configurada
        }

        const wallLevel = parseInt(row.querySelector('td:nth-of-type(7)')?.textContent || 0, 10);
        if (wallLevel > maxWall) {
             continue; // Pula se a muralha for muito alta
        }

        // Encontrar e clicar no botão de ataque correspondente ao modelo
        const attackButton = row.querySelector(`.farm_icon_${model.toLowerCase()}`);
        if (attackButton && !attackButton.classList.contains('hidden')) {
             attackButton.click();
             attacksSent++;
             console.log(`Kitsune Saqueador: Ataque enviado para aldeia em ${distance.toFixed(1)} campos.`);
             
             // Adicionar um pequeno atraso para não sobrecarregar o servidor
             await new Promise(resolve => setTimeout(resolve, 250)); 
        }
    }

    if (attacksSent > 0) {
        console.log(`KITSUNE Saqueador: ${attacksSent} ataques enviados com o modelo ${model}.`);
        // KitsuneLogger.add('Saqueador', `${attacksSent} ataques enviados com o modelo ${model}.`);
    } else {
        console.log("KITSUNE Saqueador: Nenhuma aldeia válida encontrada para atacar com os filtros atuais.");
    }
}