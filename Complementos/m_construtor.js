(function() {

    'use strict';



    if (window.construtorModule) {

        return;

    }



    console.log("🔨 Kitsune | Módulo de Lógica - Construtor (v9.5-final) carregado.");



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



                // Após a lógica rodar, força a navegação para a próxima para continuar o ciclo.

                setTimeout(() => {

                    navegarParaProximaAldeia(aldeias);

                }, 2000); // Delay para garantir que o jogo processe o último clique.



            } else {

                // Se não estivermos na página certa, a única tarefa é navegar.

                navegarParaProximaAldeia(aldeias);

            }



        } catch (error) {

            console.error("🔥 Erro crítico no ciclo do Construtor:", error);

        }

    }

    

    /**

     * Navega para a próxima aldeia da lista.

     */

    function navegarParaProximaAldeia(aldeias) {

        let lastIndex = parseInt(localStorage.getItem(STORAGE_KEY_LAST_VILLAGE) || '-1', 10);

        let nextIndex = lastIndex + 1;



        if (nextIndex >= aldeias.length) {

            console.log("[Construtor] Fim do ciclo de aldeias. Aguardando próximo timer para recomeçar.");

            localStorage.setItem(STORAGE_KEY_LAST_VILLAGE, '-1');

            if (game_data.screen !== 'overview') {

                 window.location.href = `${window.location.origin}/game.php?screen=overview`;

            }

            return;

        }

        

        const proximaAldeia = aldeias[nextIndex];

        localStorage.setItem(STORAGE_KEY_LAST_VILLAGE, nextIndex.toString());



        const urlDaProximaAldeia = `${window.location.origin}/game.php?village=${proximaAldeia.id}&screen=main`;

        

        console.log(`[Construtor] Navegando para a próxima aldeia: ${proximaAldeia.name} (${proximaAldeia.id})`);

        window.location.href = urlDaProximaAldeia;

    }



    /**

     * Tenta preencher a fila de construção até o limite definido.

     */

    async function executarLogicaDeConstrucao(doc, settings) {

        let filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length;

        const limiteFila = parseInt(settings?.construtor?.filas || 2, 10);

        console.log(`[Construtor] Fila atual: ${filaAtual}. Limite: ${limiteFila}.`);



        // Loop para tentar preencher a fila

        while (filaAtual < limiteFila) {

            let acaoRealizada = false;

            

            if (tentarCompletarGratis(doc)) {

                 await new Promise(resolve => setTimeout(resolve, 1500)); 

                 filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length;

                 continue; // Volta ao início do loop para reavaliar a fila

            }



            if (verificarMacrosInteligentes(doc, settings)) {

                acaoRealizada = true;

            } else {

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

                // Espera um pouco para o jogo processar o clique e a interface atualizar

                await new Promise(resolve => setTimeout(resolve, 1500)); 

                filaAtual = doc.querySelectorAll('#buildqueue tr.buildorder_building').length; // Reavalia a fila

            } else {

                console.log(`[Construtor] Nenhuma ação de construção disponível.`);

                break; // Sai do loop se não houver mais nada a fazer

            }

        }

        

        if (filaAtual >= limiteFila) {

            console.log(`[Construtor] Fila preenchida.`);

        }

    }



    /**

     * Verifica e executa as macros. Retorna true se uma ação foi tomada.

     */

    function verificarMacrosInteligentes(doc, settings) {

        const { construtor: construtorSettings } = settings;

        if (!construtorSettings) return false;



        const { wood, stone, iron, storage_max, pop, pop_max, buildings } = game_data.village;



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

     * Obtém a sequência de construção correta e encontra o primeiro item construível.

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



        const botoesClicaveis = doc.getElementsByClassName("btn btn-build");

        const idsClicaveis = new Set();

        for (const botao of botoesClicaveis) {

            if (botao.id) {

                idsClicaveis.add(botao.id);

            }

        }



        for (const buildId of filaDeConstrucao) {

            if (idsClicaveis.has(buildId)) {

                return buildId;

            }

        }

        return null;

    }

    

    function tentarCompletarGratis(doc) {

        const botaoCompletar = doc.querySelector('.btn-instant-free');

        if (botaoCompletar) {

            console.log(`[Construtor] ⚡ Finalizando construção gratuitamente!`);

            botaoCompletar.click();

            return true;

        }

        return false;

    }

    

    function randomDelay(config) {

        const min = toMs(config?.tempoMin) || 1000;

        const max = toMs(config?.tempoMax) || 2000;

        return Math.floor(Math.random() * (max - min + 1) + min);

    }

    

    function toMs(timeStr) {

        if (!timeStr) return null;

        const [h, m, s] = timeStr.split(':').map(Number);

        return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;

    }

    

    // Roda a lógica de construção apenas uma vez quando a página do Edifício Principal carrega

    window.addEventListener('load', () => {

        if (game_data.screen === 'main') {

            setTimeout(() => {

                const settings = window.KitsuneSettingsManager?.get();

                if (settings?.modules?.Construtor?.enabled) {

                    executarLogicaDeConstrucao(document, settings);

                }

            }, 1500); // Delay para garantir que a página esteja 100% interativa

        }

    });



    // Expõe o módulo para o script principal

    window.construtorModule = {

        run: run

    };



})();
