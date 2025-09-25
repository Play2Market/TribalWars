// Arquivo: m_construtor.js
(function() {
    'use strict';

    /**
     * =========================================================================================
     * KITSUNE - MÓDULO DE LÓGICA - CONSTRUTOR (m_construtor.js)
     * =========================================================================================
     * Motor lógico para o módulo Construtor, adaptado para ler dados diretamente da página.
     * Entende e aplica todas as configurações da UI, incluindo macros e modelos.
     * @version 4.0-HTML-Parser
     * @author Triky, Gemini & Cia
     */
    const construtorModule = {
        isRunning: false,

        /**
         * Pausa a execução por um período aleatório dentro de um intervalo.
         * @param {number} min - Tempo mínimo de pausa em milissegundos.
         * @param {number} max - Tempo máximo de pausa em milissegundos.
         */
        delay(min, max) {
            const tempo = Math.random() * (max - min) + min;
            return new Promise(resolve => setTimeout(resolve, tempo));
        },

        /**
         * Busca o estado completo de uma aldeia carregando sua página principal em segundo plano.
         * @param {string} villageId - O ID da aldeia a ser verificada.
         * @returns {object|null} - Um objeto com todos os dados da aldeia ou null em caso de falha.
         */
        async getVillageState(villageId) {
            const url = `/game.php?village=${villageId}&screen=main`;
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Construtor: Falha ao carregar a página da aldeia ${villageId}.`);
                return null;
            }

            const htmlText = await response.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');

            // Extrai os objetos JavaScript vitais que estão embutidos no HTML da página.
            const scriptTag = Array.from(doc.querySelectorAll('script')).find(s => s.textContent.includes('BuildingMain.buildings'));
            if (!scriptTag) return null;

            const scriptContent = scriptTag.textContent;
            
            // Usamos expressões regulares para extrair os objetos JSON do texto do script.
            const buildingDataMatch = scriptContent.match(/BuildingMain\.buildings = (\{.*\});/);
            const gameDataMatch = scriptContent.match(/TribalWars\.updateGameData\((\{.*\})\);/);

            if (!buildingDataMatch || !gameDataMatch) return null;
            
            const buildingData = JSON.parse(buildingDataMatch[1]);
            const gameData = JSON.parse(gameDataMatch[1]);

            // Conta quantos edifícios estão na fila de construção lendo a tabela HTML.
            const queueSize = doc.querySelectorAll('#build_queue tr.buildorder_storage, #build_queue tr.sortable_row').length;

            return {
                id: villageId,
                buildingData: buildingData,
                gameData: gameData,
                queueSize: queueSize
            };
        },

        /**
         * O cérebro: decide qual edifício construir com base nas prioridades e configurações.
         * @param {object} estadoAldeia - O objeto de estado retornado por getVillageState.
         * @param {object} settings - O objeto de configurações do Kitsune.
         * @param {Array} builderTemplates - A lista de modelos de construção personalizados.
         * @param {Array} modeloPadraoConstrucao - A lista do modelo padrão.
         * @returns {string|null} - O nome do edifício a ser construído (ex: 'farm') ou null.
         */
        decidirOQueConstruir(estadoAldeia, settings, builderTemplates, modeloPadraoConstrucao) {
            const { buildingData, gameData, queueSize } = estadoAldeia;
            const construtorSettings = settings.construtor || {};
            const maxQueueSize = parseInt(construtorSettings.filas, 10) || 1;

            if (queueSize >= maxQueueSize) return null; // Fila cheia.

            const calcularNivelEfetivo = (nomeEdificio) => {
                const nivelBase = parseInt(gameData.village.buildings[nomeEdificio] || 0, 10);
                // Uma forma simples de contar: a fila já foi contada, mas para o futuro podemos detalhar
                // Por agora, vamos assumir que a fila já está incluída no nível base para simplificar
                // A lógica mais precisa seria contar quantos daquele tipo estão na fila.
                return nivelBase; 
            };
            
            // PRIORIDADE 1: FAZENDA
            const limiteFazenda = parseInt(construtorSettings.fazenda) || 90;
            if ((gameData.village.pop / gameData.village.pop_max * 100) >= limiteFazenda) {
                if (buildingData.farm.can_build) return 'farm';
            }

            // PRIORIDADE 2: ARMAZÉM
            const limiteArmazem = parseInt(construtorSettings.armazem) || 90;
            const maxRes = Math.max(gameData.village.wood, gameData.village.stone, gameData.village.iron);
            if ((maxRes / gameData.village.storage_max * 100) >= limiteArmazem) {
                if (buildingData.storage.can_build) return 'storage';
            }

            // PRIORIDADE 3: MURALHA
            const nivelMuralha = parseInt(construtorSettings.nivelMuralha) || 0;
            if (calcularNivelEfetivo('wall') < nivelMuralha) {
                if (buildingData.wall.can_build) return 'wall';
            }

            // PRIORIDADE 4: ESCONDERIJO
            const nivelEsconderijo = parseInt(construtorSettings.nivelEsconderijo) || 0;
            if (calcularNivelEfetivo('hide') < nivelEsconderijo) {
                if (buildingData.hide.can_build) return 'hide';
            }
            
            // PRIORIDADE 5: MODELO DE CONSTRUÇÃO
            const templateId = construtorSettings.modelo;
            let buildOrder = [];

            if (templateId === 'default') {
                buildOrder = modeloPadraoConstrucao;
                for (const buildTarget of buildOrder) {
                    const [,,, building, level] = buildTarget.split('_');
                    if (calcularNivelEfetivo(building) < parseInt(level, 10)) {
                        if (buildingData[building]?.can_build) return building;
                        else break; // Para se não pode construir o próximo da lista, para manter a ordem.
                    }
                }
            } else {
                const template = builderTemplates.find(t => t.id == templateId);
                if (template) {
                    buildOrder = template.queue;
                    for (const etapa of buildOrder) {
                        if (calcularNivelEfetivo(etapa.building) < etapa.level) {
                            if (buildingData[etapa.building]?.can_build) return etapa.building;
                            else break;
                        }
                    }
                }
            }
            
            return null; // Nenhuma ação a ser tomada.
        },

        /**
         * A função principal que será chamada pelo script Kitsune.
         */
        async run(dependencias) {
            if (this.isRunning) {
                console.log("Kitsune Construtor: Ciclo anterior ainda em execução.");
                return;
            }
            this.isRunning = true;

            const { settingsManager, villageManager, logger, KitsuneBuilderModal, modeloPadraoConstrucao } = dependencias;
            const settings = settingsManager.get();
            const builderTemplates = KitsuneBuilderModal.loadTemplates();
            
            logger.add('Construtor', 'Iniciando ciclo de verificação...');
            
            const aldeias = villageManager.getVillages();
            if (!aldeias || aldeias.length === 0) {
                logger.add('Construtor', 'Nenhuma aldeia encontrada para processar.');
                this.isRunning = false;
                return;
            }

            for (const aldeia of aldeias) {
                try {
                    const estadoAldeia = await this.getVillageState(aldeia.id);
                    if (!estadoAldeia) {
                        logger.add('Construtor', `Falha ao obter dados para a aldeia ${aldeia.name}.`);
                        await this.delay(200, 400);
                        continue;
                    }

                    const edificioParaConstruir = this.decidirOQueConstruir(estadoAldeia, settings, builderTemplates, modeloPadraoConstrucao);

                    if (edificioParaConstruir) {
                        // O 'build_link' não está no JSON, mas o botão existe na página com um ID previsível.
                        // O href exato é extraído no momento do fetch.
                        const buildData = estadoAldeia.buildingData[edificioParaConstruir];
                        // O link para construir é dinâmico. A forma mais segura é extraí-lo.
                        // No momento, vamos simular a ação, pois não podemos clicar em links de um doc 'parseado'.
                        // A ação real de construir precisa de um POST request, que é mais complexo e pode ser detectado.
                        // Por agora, vamos logar a ação que *seria* tomada.

                        // O link para construir precisa do token CSRF (h)
                        const csrfToken = estadoAldeia.gameData.csrf;
                        const proximoNivel = buildData.level_next;
                        const buildUrl = `/game.php?village=${aldeia.id}&screen=main&action=upgrade_building&id=${edificioParaConstruir}&type=main&h=${csrfToken}`;
                        
                        // Envia o comando de construção
                        const response = await fetch(buildUrl);
                        if(response.ok) {
                            logger.add('Construtor', `Comando para evoluir '${edificioParaConstruir}' para o nível ${proximoNivel} em ${aldeia.name} enviado.`);
                        } else {
                             logger.add('Construtor', `Falha ao enviar comando para '${edificioParaConstruir}' em ${aldeia.name}.`);
                        }

                        // Pausa longa após enviar um comando de construção.
                        await this.delay(1000, 2000);
                    }
                    
                } catch (error) {
                    logger.add('Construtor', `Erro crítico ao processar ${aldeia.name}: ${error.message}`);
                }
                // Pausa curta entre a verificação de cada aldeia.
                await this.delay(200, 400);
            }

            logger.add('Construtor', 'Ciclo de verificação finalizado.');
            this.isRunning = false;
        }
    };

    // Disponibiliza o nosso módulo para o script principal do Kitsune.
    window.construtorModule = construtorModule;

})();
