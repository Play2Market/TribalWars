// ==UserScript==
// @name         Projeto Kitsune | Módulo Recrutador
// @namespace    https://github.com/Play2Market/TribalWars
// @version      4.1-Refactored
// @description  Motor de lógica para o módulo de recrutamento do Projeto Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

(function() {
    'use strict';

    // Se o módulo já foi carregado, não faz nada.
    if (window.recrutadorModule) {
        return;
    }

    console.log("🧠 Kitsune | Módulo de Lógica - Recrutador (v4.1) está sendo carregado...");

    const recrutadorModule = {
        // --- CONFIGURAÇÕES ---
        PAUSE_CONFIG: {
            BETWEEN_VILLAGES_MS: [800, 1500] // Pausa aleatória entre 0.8s e 1.5s entre cada aldeia
        },
        isRunning: false,

        /**
         * Gera uma pausa com duração aleatória para simular comportamento humano.
         * @param {number} min - Duração mínima em milissegundos.
         * @param {number} max - Duração máxima em milissegundos.
         */
        delay(min, max) {
            const duration = Math.floor(Math.random() * (max - min + 1)) + min;
            return new Promise(resolve => setTimeout(resolve, duration));
        },

        /**
         * Envia a requisição POST para recrutar as tropas calculadas.
         * @param {string} villageId - ID da aldeia.
         * @param {object} troops - Objeto com as tropas e quantidades a recrutar (ex: {spear: 10}).
         * @param {string} csrfToken - Token CSRF (h) necessário para a ação.
         * @param {object} logger - Instância do logger para registrar a ação.
         */
        async sendRecruitRequest(villageId, troops, csrfToken, logger) {
            const url = `/game.php?village=${villageId}&screen=train&action=train&mode=mass&h=${csrfToken}`;
            const body = new URLSearchParams(troops); // Converte {spear: 10} em "spear=10"

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body
                });
                if (!response.ok) {
                     throw new Error(`Status da resposta: ${response.status}`);
                }
                logger.add('Recrutador', `Ordem de recrutamento enviada para aldeia ${villageId}.`);

            } catch (error) {
                logger.add('Recrutador', `Erro de rede ao recrutar em ${villageId}: ${error.message}.`);
            }
        },

        /**
         * Verifica o estado de uma aldeia e recruta as tropas necessárias se houver recursos.
         * @param {object} village - Objeto da aldeia ({id, name}).
         * @param {object} targetTroops - Objeto com as quantidades totais desejadas para cada tropa.
         * @param {object} config - Configurações de lote e fila do recrutador.
         * @param {object} dependencias - Objeto com as dependências do script principal.
         */
        async checkAndRecruitForVillage(village, targetTroops, config, dependencias) {
            const { logger } = dependencias;
            try {
                // 1. Busca os dados da página de treino em segundo plano.
                const response = await fetch(`/game.php?village=${village.id}&screen=train`);
                if (!response.ok) throw new Error('Falha ao carregar página de treino.');
                const text = await response.text();
                const doc = new DOMParser().parseFromString(text, 'text/html');

                // 2. Extrai dados essenciais: token, recursos e tropas existentes.
                const csrfToken = doc.querySelector('#train_form input[name="h"]')?.value;
                if (!csrfToken) {
                    logger.add('Recrutador', `Token CSRF não encontrado em ${village.name}. Pulando.`);
                    return;
                }
                
                // Extrai dados do JSON injetado na página, que é mais confiável.
                const pageDataMatch = text.match(/TribalWars\.updateGameData\((.*?)\);/);
                if (!pageDataMatch) throw new Error('Não foi possível extrair os dados do jogo da página.');
                const pageData = JSON.parse(pageDataMatch[1]);
                
                const resources = { wood: pageData.village.wood, stone: pageData.village.stone, iron: pageData.village.iron };
                const pop = { current: pageData.village.pop, max: pageData.village.pop_max };

                const unitData = {};
                doc.querySelectorAll('#train_form tr[data-unit]').forEach(row => {
                    const unit = row.dataset.unit;
                    unitData[unit] = {
                        existing: parseInt(row.querySelector('.unit_existing_count')?.textContent || '0', 10),
                        wood: parseInt(row.querySelector('.cost_wood')?.textContent || '0'),
                        stone: parseInt(row.querySelector('.cost_stone')?.textContent || '0'),
                        iron: parseInt(row.querySelector('.cost_iron')?.textContent || '0'),
                        pop: parseInt(row.querySelector('.cost_pop')?.textContent || '0'),
                        maxRecruitable: parseInt(row.querySelector('a.add-max')?.textContent.replace(/[()]/g, '') || '0'),
                        building: row.closest('table').id.replace('_units', '')
                    };
                });

                // 3. Calcula o que precisa ser recrutado.
                const troopsToRecruit = {};
                for (const unit in targetTroops) {
                    const targetAmount = parseInt(targetTroops[unit] || '0', 10);
                    if (targetAmount <= 0 || !unitData[unit] || unitData[unit].maxRecruitable === 0) continue;

                    const deficit = targetAmount - unitData[unit].existing;
                    if (deficit <= 0) continue;

                    const unitInfo = unitData[unit];
                    const buildingConfig = config[unitInfo.building] || { lote: 1, filas: 1 };
                    const batchSize = parseInt(buildingConfig.lote, 10);
                    const maxQueues = parseInt(buildingConfig.filas, 10);
                    let finalAmountToRecruit = 0;

                    // Simula a adição de lotes na fila, um por um, consumindo os recursos virtuais.
                    for (let i = 0; i < maxQueues; i++) {
                        if (batchSize === 0) break;
                        const cost = {
                            wood: unitInfo.wood * batchSize,
                            stone: unitInfo.stone * batchSize,
                            iron: unitInfo.iron * batchSize,
                            pop: unitInfo.pop * batchSize
                        };

                        if (resources.wood >= cost.wood && resources.stone >= cost.stone && resources.iron >= cost.iron && (pop.current + cost.pop) <= pop.max) {
                            finalAmountToRecruit += batchSize;
                            resources.wood -= cost.wood;
                            resources.stone -= cost.stone;
                            resources.iron -= cost.iron;
                            pop.current += cost.pop;
                        } else {
                            break; // Para se não houver recursos para o próximo lote.
                        }
                    }
                    
                    if (finalAmountToRecruit > 0) {
                        // Garante que não vamos recrutar mais do que o déficit, o máximo possível ou o que foi calculado.
                        troopsToRecruit[unit] = Math.min(finalAmountToRecruit, unitInfo.maxRecruitable, deficit);
                    }
                }

                // 4. Se houver tropas a recrutar, envia a requisição.
                if (Object.keys(troopsToRecruit).length > 0) {
                    const recruitOrderLog = Object.entries(troopsToRecruit).map(([u, q]) => `${q} ${u}`).join(', ');
                    logger.add('Recrutador', `Iniciando recrutamento em [${village.name}]: ${recruitOrderLog}.`);
                    await this.sendRecruitRequest(village.id, troopsToRecruit, csrfToken, logger);
                }

            } catch (error) {
                logger.add('Recrutador', `Erro ao processar ${village.name}: ${error.message}.`);
            }
        },

        /**
         * Função principal do módulo, chamada pelo gerenciador de timers.
         * @param {object} dependencias - Objeto com todas as dependências (settingsManager, etc.).
         */
        async run(dependencias) {
            if (this.isRunning) {
                console.log("Kitsune Recrutador: Ciclo anterior ainda em execução. Pulando.");
                return;
            }
            this.isRunning = true;
            
            const { settingsManager, kitsuneModalManager, logger } = dependencias;
            logger.add('Recrutador', 'Iniciando ciclo de recrutamento.');
            
            const settings = settingsManager.get();
            const recruitmentRules = settings.recrutador || [];
            const recruitmentConfig = settings.recrutadorConfig || {};

            for (const rule of recruitmentRules) {
                // Pula regras inativas ou sem grupo definido
                if (!rule.grupo || rule.grupo === "0") continue;
                
                // Separa as tropas do resto da regra (grupo)
                const targetTroops = { ...rule };
                delete targetTroops.grupo;
                
                const villages = kitsuneModalManager.getVillagesFromGroup(rule.grupo);
                if (!villages || villages.length === 0) {
                    logger.add('Recrutador', `Nenhuma aldeia encontrada para o grupo ${rule.grupo}.`);
                    continue;
                }

                for (const village of villages) {
                    await this.checkAndRecruitForVillage(village, targetTroops, recruitmentConfig, dependencias);
                    await this.delay(this.PAUSE_CONFIG.BETWEEN_VILLAGES_MS[0], this.PAUSE_CONFIG.BETWEEN_VILLAGES_MS[1]);
                }
            }
            
            logger.add('Recrutador', 'Ciclo de recrutamento finalizado.');
            this.isRunning = false;
        }
    };

    // Anexa o módulo ao objeto window para que o script principal possa encontrá-lo.
    window.recrutadorModule = recrutadorModule;

})();
