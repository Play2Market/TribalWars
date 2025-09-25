// Arquivo: m_construtor.js
(function() {
    'use strict';

    // Criamos um objeto para nosso módulo para manter tudo organizado.
    const construtorModule = {
        // Uma flag para garantir que apenas um ciclo de construção rode por vez.
        isRunning: false,

        /**
         * A função principal que será chamada pelo script Kitsune a cada ciclo do timer.
         * @param {object} dependencias - Um objeto contendo todas as ferramentas que nosso módulo precisa.
         */
        async run(dependencias) {
            // Se o ciclo anterior ainda não terminou, a gente pula este para evitar sobrecarga.
            if (this.isRunning) {
                console.log("Kitsune Construtor: Ciclo anterior ainda em execução. Pulando.");
                return;
            }
            this.isRunning = true;

            // "Desempacotar" as dependências para usá-las mais facilmente.
            const { settingsManager, villageManager, logger } = dependencias;
            const settings = settingsManager.get();
            const construtorSettings = settings.construtor || {};
            
            logger.add('Construtor', 'Iniciando ciclo de verificação...');

            // Obter a lista de todas as nossas aldeias.
            const todasAldeias = villageManager.getVillages();
            if (!todasAldeias || todasAldeias.length === 0) {
                logger.add('Construtor', "Nenhuma aldeia encontrada. Verifique o Coletor de Aldeias.");
                this.isRunning = false;
                return; // Para o ciclo se não houver aldeias.
            }

            // Vamos passar por cada aldeia, uma de cada vez.
            for (const aldeia of todasAldeias) {
                try {
                    // Pega o estado atual da aldeia (níveis, recursos, etc.) em segundo plano.
                    const estadoAldeia = await this.getVillageState(aldeia.id);
                    if (!estadoAldeia) {
                        logger.add('Construtor', `Não foi possível obter dados da aldeia ${aldeia.name}. Pode estar sob ataque.`);
                        continue; // Pula para a próxima aldeia.
                    }

                    // --- LÓGICA DAS MACROS DE PRIORIDADE ---
                    let acaoRealizada = false;

                    // PRIORIDADE 1: FAZENDA
                    const limiteFazenda = parseInt(construtorSettings.fazenda) || 90; // Usa 90% como padrão
                    if (estadoAldeia.pop.uso >= limiteFazenda) {
                        acaoRealizada = await this.construirEdificio(aldeia, 'farm', estadoAldeia, logger);
                        if (acaoRealizada) continue; // Se construiu, vai para a próxima aldeia.
                    }
                    
                    // (Aqui entrarão as próximas prioridades: Armazém, Muralha, etc.)

                    // Se nenhuma macro de prioridade foi acionada, partimos para o modelo principal.
                    if (!acaoRealizada) {
                        // (Aqui entrará a lógica dos Modelos de Construção)
                    }

                } catch (error) {
                    logger.add('Construtor', `Erro ao processar ${aldeia.name}: ${error.message}`);
                }
            }

            logger.add('Construtor', 'Ciclo de verificação finalizado.');
            this.isRunning = false;
        },

        /**
         * Busca o estado de uma aldeia (população, edifícios, etc.) em segundo plano.
         * @param {string} villageId - O ID da aldeia a ser verificada.
         * @returns {object|null} Um objeto com os dados da aldeia ou null se falhar.
         */
        async getVillageState(villageId) {
            // Monta a URL para a página principal da aldeia.
            const url = `/game.php?village=${villageId}&screen=main`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Falha ao carregar a página da aldeia ${villageId}`);
            
            const htmlText = await response.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');

            // Extrai os dados de população (para a macro da Fazenda).
            const popMaxEl = doc.getElementById('pop_max');
            const popCurrentEl = doc.getElementById('pop_current');
            if (!popMaxEl || !popCurrentEl) return null; // A página pode não ter carregado corretamente.

            const popMax = parseInt(popMaxEl.textContent, 10);
            const popCurrent = parseInt(popCurrentEl.textContent, 10);

            // Coleta todos os links de construção disponíveis na página.
            const linksDeConstrucao = {};
            doc.querySelectorAll('.btn-build').forEach(link => {
                // O ID do link é algo como "main_buildlink_farm_1"
                const idParts = link.id.split('_');
                const buildingName = idParts[2];
                if (buildingName) {
                    linksDeConstrucao[buildingName] = link.href;
                }
            });

            return {
                pop: {
                    atual: popCurrent,
                    max: popMax,
                    uso: (popCurrent / popMax) * 100
                },
                links: linksDeConstrucao
            };
        },

        /**
         * Tenta construir um edifício específico se o link de construção estiver disponível.
         * @param {object} aldeia - O objeto da aldeia (com id e name).
         * @param {string} buildingName - O nome do edifício (ex: 'farm').
         * @param {object} estadoAldeia - O estado atual da aldeia.
         * @param {object} logger - A dependência do logger.
         * @returns {boolean} - Retorna true se a construção foi iniciada.
         */
        async construirEdificio(aldeia, buildingName, estadoAldeia, logger) {
            const buildLink = estadoAldeia.links[buildingName];
            if (buildLink) {
                const response = await fetch(buildLink); // "Clica" no link em segundo plano.
                if (response.ok) {
                    logger.add('Construtor', `Macro: Iniciando construção de '${buildingName}' em ${aldeia.name}.`);
                    return true;
                }
            }
            return false;
        }
    };

    // Disponibiliza o nosso módulo para o script principal do Kitsune.
    window.construtorModule = construtorModule;

})();
