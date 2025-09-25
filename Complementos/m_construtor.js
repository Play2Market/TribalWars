console.log('[m_construtor.js] Arquivo carregado e executando. Versão: 4.5-HybridLogic');
'use strict';

/**
 * =========================================================================================
 * KITSUNE - MÓDULO DE LÓGICA - CONSTRUTOR (m_construtor.js)
 * =========================================================================================
 * Motor lógico para o módulo Construtor, combinando a lógica funcional do script simples
 * com a execução em segundo plano e modular do Kitsune.
 * @version 4.5-HybridLogic
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
        try {
            const response = await fetch(url);
            if (!response.ok) {
                logger.add('Construtor', `[${villageId}] Falha ao carregar a página da aldeia. Status: ${response.status}`);
                return null;
            }

            const htmlText = await response.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            
            const scriptTag = Array.from(doc.querySelectorAll('script')).find(s => s.textContent.includes('TribalWars.updateGameData'));
            if (!scriptTag) {
                logger.add('Construtor', `[${villageId}] Não foi possível encontrar o script com os dados do jogo.`);
                return null;
            }

            const gameDataMatch = scriptContent.match(/TribalWars\.updateGameData\((\{.*\})\);/);
            if (!gameDataMatch) {
                logger.add('Construtor', `[${villageId}] Falha ao extrair gameData da página.`);
                return null;
            }
            
            const gameData = JSON.parse(gameDataMatch[1]);

            const fila = [];
            doc.querySelectorAll('#build_queue tr.buildorder_storage, #build_queue tr.sortable_row').forEach(row => {
                const text = row.querySelector('td:first-child').textContent.trim();
                const buildingMatch = text.match(/(.+?)\s*Nível\s*(\d+)/);
                if (buildingMatch) {
                    const buildingNamePT = buildingMatch[1].trim();
                    const buildingId = Object.keys(gameData.village.buildings).find(key => {
                        // Precisamos de uma forma de mapear nome PT -> ID. Vamos criar um map temporário.
                        const buildingNames = { main: 'Edifício principal', barracks: 'Quartel', stable: 'Estábulo', garage: 'Oficina', snob: 'Academia', smith: 'Ferreiro', place: 'Praça de reunião', statue: 'Estátua', market: 'Mercado', wood: 'Bosque', stone: 'Poço de argila', iron: 'Mina de ferro', farm: 'Fazenda', storage: 'Armazém', hide: 'Esconderijo', wall: 'Muralha' };
                        return buildingNames[key] === buildingNamePT;
                    });

                    if (buildingId) {
                        fila.push({ building: buildingId, level: parseInt(buildingMatch[2], 10) });
                    }
                }
            });

            // Extrai todos os links de construção que estão visíveis e disponíveis
            const linksDeConstrucao = {};
            doc.querySelectorAll('a.btn-build').forEach(link => {
                // O ID do link é algo como "main_buildlink_farm_1"
                const id = link.id;
                if (id && id.startsWith('main_buildlink_')) {
                    linksDeConstrucao[id] = link.href;
                }
            });

            return {
                id: villageId,
                gameData: gameData,
                fila: fila,
                queueSize: fila.length,
                links: linksDeConstrucao
            };
        } catch (error) {
            logger.add('Construtor', `[${villageId}] Erro em getVillageState: ${error.message}`);
            return null;
        }
    },
    
    decidirOQueConstruir(estadoAldeia, settings, builderTemplates, modeloPadraoConstrucao, logger) {
        const { gameData, queueSize, fila, id: villageId, links } = estadoAldeia;
        const construtorSettings = settings.construtor || {};
        const maxQueueSize = parseInt(construtorSettings.filas, 10) || 1;
        
        logger.add('Construtor', `[${villageId}] Decidindo... Fila: ${queueSize}/${maxQueueSize}.`);

        if (queueSize >= maxQueueSize) {
            logger.add('Construtor', `[${villageId}] Fila de construção cheia. Nenhuma ação.`);
            return null;
        }

        const calcularNivelEfetivo = (nomeEdificio) => {
            const nivelBase = parseInt(gameData.village.buildings[nomeEdificio] || 0, 10);
            const emFila = fila.filter(item => item.building === nomeEdificio).length;
            return nivelBase + emFila;
        };

        // LÓGICA DE MODELO (Inspirada no script simples)
        const templateId = construtorSettings.modelo;
        let buildOrder = [];

        if (!templateId || templateId === 'default') {
            buildOrder = modeloPadraoConstrucao;
        } else {
            const template = builderTemplates.find(t => t.id == templateId);
            if (template) {
                // Converte o modelo do Kitsune para o formato do script simples (main_buildlink_...)
                buildOrder = template.queue.map(etapa => `main_buildlink_${etapa.building}_${etapa.level}`);
            } else {
                // Fallback para o padrão se o modelo não for encontrado
                buildOrder = modeloPadraoConstrucao;
            }
        }

        // Encontra o primeiro item da lista que pode ser construído
        for (const buildTargetId of buildOrder) {
            if (links[buildTargetId]) {
                logger.add('Construtor', `[${villageId}] Encontrado alvo válido do modelo: ${buildTargetId}.`);
                return links[buildTargetId]; // Retorna a URL completa para construir
            }
        }
        
        logger.add('Construtor', `[${villageId}] Nenhuma construção do modelo está disponível no momento.`);
        return null;
    },

    async run(dependencias) {
        if (this.isRunning) { return; }
        this.isRunning = true;

        const { settingsManager, villageManager, logger, KitsuneBuilderModal, modeloPadraoConstrucao } = dependencias;
        logger.add('Construtor', 'Iniciando ciclo de verificação (v4.5)...');
        
        const settings = settingsManager.get();
        const builderTemplates = KitsuneBuilderModal.loadTemplates();
        const aldeias = villageManager.getVillages();

        if (!aldeias || aldeias.length === 0) {
            logger.add('Construtor', 'Nenhuma aldeia encontrada.');
            this.isRunning = false;
            return;
        }
        
        for (const aldeia of aldeias) {
            try {
                const estadoAldeia = await this.getVillageState(aldeia.id, logger);
                if (!estadoAldeia) {
                    await this.delay(200, 400);
                    continue;
                }

                // A lógica de macros pode ser adicionada aqui no futuro, antes da decisão do modelo
                const urlParaConstruir = this.decidirOQueConstruir(estadoAldeia, settings, builderTemplates, modeloPadraoConstrucao, logger);

                if (urlParaConstruir) {
                    logger.add('Construtor', `[${aldeia.name}] Enviando comando de construção...`);
                    const response = await fetch(urlParaConstruir);
                    if (response.ok) {
                        logger.add('Construtor', `[${aldeia.name}] COMANDO ENVIADO com sucesso.`);
                    } else {
                        logger.add('Construtor', `[${aldeia.name}] Falha na requisição de construção (Status: ${response.status}).`);
                    }
                    await this.delay(1000, 2000); // Pausa maior após uma ação bem-sucedida
                }
                
            } catch (error) {
                logger.add('Construtor', `Erro crítico ao processar ${aldeia.name}: ${error.message}`);
            }
            await this.delay(200, 400); // Pausa curta entre aldeias
        }

        logger.add('Construtor', 'Ciclo de verificação finalizado.');
        this.isRunning = false;
    }
};

window.construtorModule = construtorModule;
