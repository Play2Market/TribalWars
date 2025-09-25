// Arquivo: m_construtor.js
(function() {
    'use strict';

    /**
     * =========================================================================================
     * KITSUNE - MÓDULO DE LÓGICA - CONSTRUTOR (m_construtor.js)
     * =========================================================================================
     * Motor lógico para o módulo Construtor, adaptado para ler dados diretamente da página.
     * @version 4.1-Debug-Logs
     * @author Triky, Gemini & Cia
     */
    const construtorModule = {
        isRunning: false,

        delay(min, max) {
            const tempo = Math.random() * (max - min) + min;
            return new Promise(resolve => setTimeout(resolve, tempo));
        },

        async getVillageState(villageId, logger) {
            const url = `/game.php?village=${villageId}&screen=main`;
            const response = await fetch(url);
            if (!response.ok) {
                logger.add('Construtor', `[${villageId}] Falha ao carregar a página da aldeia. Status: ${response.status}`);
                return null;
            }

            const htmlText = await response.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            
            const scriptTag = Array.from(doc.querySelectorAll('script')).find(s => s.textContent.includes('BuildingMain.buildings'));
            if (!scriptTag) {
                logger.add('Construtor', `[${villageId}] Não foi possível encontrar o script com os dados dos edifícios.`);
                return null;
            }

            const scriptContent = scriptTag.textContent;
            const buildingDataMatch = scriptContent.match(/BuildingMain\.buildings = (\{.*\});/);
            const gameDataMatch = scriptContent.match(/TribalWars\.updateGameData\((\{.*\})\);/);

            if (!buildingDataMatch || !gameDataMatch) {
                logger.add('Construtor', `[${villageId}] Falha ao extrair JSON dos dados da página.`);
                return null;
            }
            
            const buildingData = JSON.parse(buildingDataMatch[1]);
            const gameData = JSON.parse(gameDataMatch[1]);

            // [CORREÇÃO] Extrai os edifícios na fila de construção
            const fila = [];
            doc.querySelectorAll('#build_queue tr.buildorder_storage, #build_queue tr.sortable_row').forEach(row => {
                const text = row.querySelector('td:first-child').textContent.trim();
                const buildingMatch = text.match(/(.+?)\s*Nível\s*(\d+)/);
                if (buildingMatch) {
                    // Mapeia o nome em português para o ID do sistema (ex: "Edifício principal" -> "main")
                    const buildingNamePT = buildingMatch[1].trim();
                    const buildingId = Object.keys(buildingData).find(key => buildingData[key].name === buildingNamePT);
                    if (buildingId) {
                        fila.push({ building: buildingId, level: parseInt(buildingMatch[2], 10) });
                    }
                }
            });

            return {
                id: villageId,
                buildingData: buildingData,
                gameData: gameData,
                fila: fila, // Usaremos a fila detalhada agora
                queueSize: fila.length // Mantemos o tamanho total
            };
        },
        
        decidirOQueConstruir(estadoAldeia, settings, builderTemplates, modeloPadraoConstrucao, logger) {
            const { buildingData, gameData, queueSize, fila, id: villageId } = estadoAldeia;
            const construtorSettings = settings.construtor || {};
            const maxQueueSize = parseInt(construtorSettings.filas, 10) || 1;
            
            logger.add('Construtor', `[${villageId}] Decidindo... Fila: ${queueSize}/${maxQueueSize}.`);

            if (queueSize >= maxQueueSize) {
                logger.add('Construtor', `[${villageId}] Fila de construção cheia. Nenhuma ação.`);
                return null;
            }

            // [CORREÇÃO] Função de cálculo de nível agora considera a fila detalhada
            const calcularNivelEfetivo = (nomeEdificio) => {
                const nivelBase = parseInt(gameData.village.buildings[nomeEdificio] || 0, 10);
                const emFila = fila.filter(item => item.building === nomeEdificio).length;
                const nivelEfetivo = nivelBase + emFila;
                logger.add('Construtor', `[${villageId}] Nível efetivo de '${nomeEdificio}': ${nivelEfetivo} (Base: ${nivelBase}, Fila: ${emFila})`);
                return nivelEfetivo;
            };
            
            // PRIORIDADE 1: FAZENDA
            const limiteFazenda = parseInt(construtorSettings.fazenda) || 90;
            const usoFazenda = (gameData.village.pop / gameData.village.pop_max * 100);
            logger.add('Construtor', `[${villageId}] Checando Fazenda. Uso: ${usoFazenda.toFixed(1)}%. Limite: ${limiteFazenda}%.`);
            if (usoFazenda >= limiteFazenda) {
                if (buildingData.farm.can_build) return 'farm';
            }

            // PRIORIDADE 2: ARMAZÉM
            const limiteArmazem = parseInt(construtorSettings.armazem) || 90;
            const maxRes = Math.max(gameData.village.wood, gameData.village.stone, gameData.village.iron);
            const usoArmazem = (maxRes / gameData.village.storage_max * 100);
            logger.add('Construtor', `[${villageId}] Checando Armazém. Uso: ${usoArmazem.toFixed(1)}%. Limite: ${limiteArmazem}%.`);
            if (usoArmazem >= limiteArmazem) {
                if (buildingData.storage.can_build) return 'storage';
            }

            // PRIORIDADE 3: MURALHA
            const nivelMuralha = parseInt(construtorSettings.nivelMuralha) || 0;
            logger.add('Construtor', `[${villageId}] Checando Muralha. Nível Efetivo: ${calcularNivelEfetivo('wall')}. Alvo: ${nivelMuralha}.`);
            if (calcularNivelEfetivo('wall') < nivelMuralha) {
                if (buildingData.wall.can_build) return 'wall';
            }

            // PRIORIDADE 4: ESCONDERIJO
            const nivelEsconderijo = parseInt(construtorSettings.nivelEsconderijo) || 0;
            logger.add('Construtor', `[${villageId}] Checando Esconderijo. Nível Efetivo: ${calcularNivelEfetivo('hide')}. Alvo: ${nivelEsconderijo}.`);
            if (calcularNivelEfetivo('hide') < nivelEsconderijo) {
                if (buildingData.hide.can_build) return 'hide';
            }
            
            // PRIORIDADE 5: MODELO DE CONSTRUÇÃO
            const templateId = construtorSettings.modelo;
            logger.add('Construtor', `[${villageId}] Nenhuma macro acionada. Verificando modelo: ${templateId || 'Nenhum'}`);
            
            if (templateId === 'default') {
                for (const buildTarget of modeloPadraoConstrucao) {
                    const [,,, building, level] = buildTarget.split('_');
                    if (calcularNivelEfetivo(building) < parseInt(level, 10)) {
                        logger.add('Construtor', `[${villageId}] Próximo do modelo padrão: ${building} nvl ${level}.`);
                        if (buildingData[building]?.can_build) return building;
                        else {
                            logger.add('Construtor', `[${villageId}] Não pode construir ${building}. Motivo: ${buildingData[building]?.error || 'Recursos insuficientes'}. Pausando modelo.`);
                            break; 
                        }
                    }
                }
            } else {
                const template = builderTemplates.find(t => t.id == templateId);
                if (template) {
                    for (const etapa of template.queue) {
                        if (calcularNivelEfetivo(etapa.building) < etapa.level) {
                            logger.add('Construtor', `[${villageId}] Próximo do modelo '${template.name}': ${etapa.building} nvl ${etapa.level}.`);
                            if (buildingData[etapa.building]?.can_build) return etapa.building;
                            else {
                                logger.add('Construtor', `[${villageId}] Não pode construir ${etapa.building}. Motivo: ${buildingData[etapa.building]?.error || 'Recursos insuficientes'}. Pausando modelo.`);
                                break;
                            }
                        }
                    }
                }
            }
            
            logger.add('Construtor', `[${villageId}] Nenhuma ação corresponde aos critérios.`);
            return null;
        },

        async run(dependencias) {
            if (this.isRunning) return;
            this.isRunning = true;

            const { settingsManager, villageManager, logger, KitsuneBuilderModal, modeloPadraoConstrucao } = dependencias;
            logger.add('Construtor', 'Iniciando ciclo de verificação (v4.1)...');
            
            const settings = settingsManager.get();
            const builderTemplates = KitsuneBuilderModal.loadTemplates();
            const aldeias = villageManager.getVillages();

            if (!aldeias || aldeias.length === 0) {
                logger.add('Construtor', 'Nenhuma aldeia encontrada para processar.');
                this.isRunning = false;
                return;
            }
            logger.add('Construtor', `Encontradas ${aldeias.length} aldeias para processar.`);

            for (const aldeia of aldeias) {
                logger.add('Construtor', `--- Processando aldeia: ${aldeia.name} ---`);
                try {
                    const estadoAldeia = await this.getVillageState(aldeia.id, logger);
                    if (!estadoAldeia) {
                        logger.add('Construtor', `[${aldeia.name}] Falha crítica ao obter dados. Pulando aldeia.`);
                        await this.delay(200, 400);
                        continue;
                    }

                    const edificioParaConstruir = this.decidirOQueConstruir(estadoAldeia, settings, builderTemplates, modeloPadraoConstrucao, logger);

                    if (edificioParaConstruir) {
                        logger.add('Construtor', `[${aldeia.name}] DECISÃO FINAL: Construir '${edificioParaConstruir}'.`);
                        const buildData = estadoAldeia.buildingData[edificioParaConstruir];
                        const csrfToken = estadoAldeia.gameData.csrf;
                        const proximoNivel = buildData.level_next;
                        const buildUrl = `/game.php?village=${aldeia.id}&screen=main&action=upgrade_building&id=${edificioParaConstruir}&type=main&h=${csrfToken}`;
                        
                        logger.add('Construtor', `[${aldeia.name}] Enviando comando...`);
                        const response = await fetch(buildUrl);
                        if (response.ok) {
                            const responseJson = await response.json();
                            if (responseJson.error) {
                                logger.add('Construtor', `[${aldeia.name}] Erro retornado pelo jogo: ${responseJson.error}`);
                            } else {
                                logger.add('Construtor', `[${aldeia.name}] COMANDO ENVIADO para evoluir '${edificioParaConstruir}' para o nível ${proximoNivel}.`);
                            }
                        } else {
                            logger.add('Construtor', `[${aldeia.name}] Falha na requisição de construção (Status: ${response.status}).`);
                        }

                        await this.delay(1000, 2000);
                    }
                    
                } catch (error) {
                    logger.add('Construtor', `Erro crítico ao processar ${aldeia.name}: ${error.message}`);
                }
                await this.delay(200, 400);
            }

            logger.add('Construtor', 'Ciclo de verificação finalizado.');
            this.isRunning = false;
        }
    };

    window.construtorModule = construtorModule;

})();
