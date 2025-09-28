(function() {
    'use strict';

    if (window.construtorModule) {
        return;
    }

    console.log("🔨 Kitsune | Módulo de Lógica - Construtor (v9.6-revisado) carregado.");

    const STORAGE_KEY_LAST_VILLAGE = 'kitsune_construtor_last_village_index';

    /**
     * Ponto de entrada do módulo. Controla a navegação e a construção.
     */
    async function run(dependencias) {
        try {
            const { settingsManager, villageManager } = dependencias;
            if (!settingsManager || !villageManager) {
                console.error("[Construtor] Dependências essenciais não carregadas.");
                return;
            }

            const settings = settingsManager.get();
            if (!settings?.modules?.Construtor?.enabled) {
                localStorage.setItem(STORAGE_KEY_LAST_VILLAGE, '-1');
                return;
            }

            const aldeias = villageManager.get();
            if (!aldeias || aldeias.length === 0) return;

            // Se já estamos na página do Edifício Principal, executa a lógica de construção.
            if (game_data.screen === 'main') {
                console.log(`[Construtor] Analisando a aldeia atual: ${game_data.village.name}`);
                await executarLogicaDeConstrucao(document, settings);

                // Após a lógica rodar, navega para a próxima aldeia para continuar o ciclo.
                // ALTERADO: Usando um atraso aleatório para parecer mais humano.
                const delay = randomDelay(settings?.construtor?.delay);
                console.log(`[Construtor] Aguardando ${delay}ms antes de navegar para a próxima aldeia.`);
                setTimeout(() => {
                    navegarParaProximaAldeia(aldeias, settings);
                }, delay);

            } else {
                // Se não estivermos na página certa, a única tarefa é navegar.
                navegarParaProximaAldeia(aldeias, settings);
            }

        } catch (error) {
            console.error("🔥 Erro crítico no ciclo do Construtor:", error);
        }
    }

    /**
     * Navega para a próxima aldeia da lista.
     */
    function navegarParaProximaAldeia(aldeias, settings) {
        let lastIndex = parseInt(localStorage.getItem(STORAGE_KEY_LAST_VILLAGE) || '-1', 10);
        let nextIndex = lastIndex + 1;

        if (nextIndex >= aldeias.length) {
            console.log("[Construtor] Fim do ciclo de aldeias. Reiniciando na próxima execução.");
            localStorage.setItem(STORAGE_KEY_LAST_VILLAGE, '-1');
            
            // ALTERADO: Apenas redireciona para a visão geral se não já estiver lá.
            if (game_data.screen !== 'overview') {
                 window.location.href = `${window.location.origin}/game.php?screen=overview`;
            }
            return;
        }

        const proximaAldeia = aldeias[nextIndex];
        localStorage.setItem(STORAGE_KEY_LAST_VILLAGE, nextIndex.toString());

        const urlDaProximaAldeia = `${window.location.origin}/game.php?village=${proximaAldeia.id}&screen=main`;

        console.log(`[Construtor] Navegando para a próxima aldeia: ${proximaAldeia.name} (${proximaAldeia.id})`);
        
        // ALTERADO: Pequeno delay aleatório antes de navegar para não ser instantâneo.
        setTimeout(() => {
            window.location.href = urlDaProximaAldeia;
        }, randomDelay(settings?.construtor?.delay) / 2); // Metade do delay normal para trocas de página
    }

    /**
     * Tenta preencher a fila de construção até o limite definido.
     */
    async function executarLogicaDeConstrucao(doc, settings) {
        const limiteFila = parseInt(settings?.construtor?.filas || 2, 10);
        const delayConfig = settings?.construtor?.delay;
        
        // Loop para tentar preencher a fila
        while (true) {
            // Reavalia a fila a cada iteração do loop
            let filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length;
            console.log(`[Construtor] Fila atual: ${filaAtual}. Limite: ${limiteFila}.`);

            if (filaAtual >= limiteFila) {
                console.log(`[Construtor] Fila preenchida.`);
                break;
            }

            let acaoRealizada = false;
            
            // 1. Tenta finalizar construções grátis (maior prioridade)
            if (tentarCompletarGratis(doc)) {
                acaoRealizada = true;
            } 
            // 2. Se não, verifica macros inteligentes
            else if (verificarMacrosInteligentes(doc, settings)) {
                acaoRealizada = true;
            } 
            // 3. Se não, segue o modelo de construção
            else {
                const idDoProximoEdificio = obterProximoEdificioDoModelo(doc, settings);
                if (idDoProximoEdificio) {
                    const botaoParaClicar = doc.querySelector(`#${idDoProximoEdificio}`);
                    if (botaoParaClicar) {
                        console.log(`[Construtor] 🏗️ Seguindo modelo: Construindo '${idDoProximoEdificio}'.`);
                        botaoParaClicar.click();
                        acaoRealizada = true;
                    }
                }
            }
            
            if (acaoRealizada) {
                // Espera um tempo aleatório para o jogo processar o clique e a interface atualizar
                const delay = randomDelay(delayConfig);
                console.log(`[Construtor] Ação realizada. Aguardando ${delay}ms para reavaliar a fila...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.log(`[Construtor] Nenhuma ação de construção pôde ser realizada.`);
                break; // Sai do loop se não houver mais nada a fazer
            }
        }
    }

    /**
     * Verifica e executa as macros. Retorna true se uma ação foi tomada.
     */
    function verificarMacrosInteligentes(doc, settings) {
        const construtorSettings = settings?.construtor;
        if (!construtorSettings) return false;

        const { wood, stone, iron, storage_max, pop, pop_max, buildings } = game_data.village;
        
        // Macro do Armazém
        const armazemThreshold = parseInt(construtorSettings.armazem || '101', 10) / 100;
        if (wood / storage_max >= armazemThreshold || stone / storage_max >= armazemThreshold || iron / storage_max >= armazemThreshold) {
            const nextLevel = parseInt(buildings.storage) + 1;
            const buildId = `main_buildlink_storage_${nextLevel}`;
            const botao = doc.querySelector(`#${buildId}.btn-build`);
            if (botao) {
                console.log(`[Construtor] MACRO: Armazém cheio! Construindo Nível ${nextLevel}.`);
                botao.click();
                return true;
            }
        }
        
        // Macro da Fazenda
        const fazendaThreshold = parseInt(construtorSettings.fazenda || '101', 10) / 100;
        if (pop / pop_max >= fazendaThreshold) {
            const nextLevel = parseInt(buildings.farm) + 1;
            const buildId = `main_buildlink_farm_${nextLevel}`;
            const botao = doc.querySelector(`#${buildId}.btn-build`);
            if (botao) {
                console.log(`[Construtor] MACRO: Fazenda cheia! Construindo Nível ${nextLevel}.`);
                botao.click();
                return true;
            }
        }
        
        return false;
    }

    /**
     * OTIMIZADO: Obtém a sequência de construção e encontra o primeiro item construível.
     */
    function obterProximoEdificioDoModelo(doc, settings) {
        const modeloAtivoId = settings?.construtor?.modelo;
        let filaDeConstrucao = [];

        if (modeloAtivoId === 'default' || !modeloAtivoId) {
            filaDeConstrucao = window.KitsuneConstants.MODELO_PADRAO_CONSTRUCAO;
        } else {
            const todosModelos = window.KitsuneBuilderModal?.loadTemplates() || [];
            const modelo = todosModelos.find(m => m.id == modeloAtivoId);
            if (modelo?.queue) {
                filaDeConstrucao = modelo.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
            }
        }

        if (filaDeConstrucao.length === 0) return null;

        // ALTERADO: Lógica mais direta. Itera pela fila e verifica se o botão existe e é clicável.
        for (const buildId of filaDeConstrucao) {
            // A classe .btn-build geralmente indica que o jogo permite o clique (recursos, etc.)
            const botao = doc.querySelector(`#${buildId}.btn-build`);
            if (botao) {
                return buildId; // Encontrou o primeiro edifício construível do modelo.
            }
        }
        
        return null; // Nenhum edifício do modelo pode ser construído no momento.
    }
    
    /**
     * Verifica se há um botão para completar construção gratuitamente e clica nele.
     */
    function tentarCompletarGratis(doc) {
        const botaoCompletar = doc.querySelector('.btn-instant-free');
        if (botaoCompletar) {
            console.log(`[Construtor] ⚡ Finalizando construção gratuitamente!`);
            botaoCompletar.click();
            return true;
        }
        return false;
    }
    
    /**
     * Gera um atraso aleatório dentro de um intervalo para simular comportamento humano.
     */
    function randomDelay(config) {
        // Usa os tempos do objeto de configuração ou valores padrão seguros.
        const min = toMs(config?.tempoMin) || 1200;
        const max = toMs(config?.tempoMax) || 2500;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    /**
     * Converte uma string de tempo 'HH:MM:SS' para milissegundos.
     */
    function toMs(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const parts = timeStr.split(':').map(Number);
        if (parts.some(isNaN)) return null;
        const [h, m, s] = parts;
        return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
    }
    
    // REMOVIDO: O event listener 'load' era redundante e podia causar execuções duplicadas.
    // A chamada do módulo deve ser gerenciada por um script principal que chama `construtorModule.run()`.

    // Expõe o módulo para o script principal
    window.construtorModule = {
        run: run
    };

})();
