// =========================================================================================
// --- INÍCIO: Módulo de Lógica do Construtor (m_construtor.js) v1.0 ---
// =========================================================================================
(function() {
    'use strict';

    // Se o módulo já foi carregado, não faz nada.
    if (window.construtorModule) {
        return;
    }

    console.log(" Módulo de Lógica do Construtor está sendo carregado...");

    const construtorModule = {
        // Objeto para guardar as dependências que o script principal vai nos passar.
        dependencias: {},

        /**
         * A função principal que é chamada pelo script principal.
         * @param {object} dependencias - Um objeto contendo os outros módulos (settingsManager, logger, etc).
         */
        async run(dependencias) {
            this.dependencias = dependencias;
            const { settingsManager, logger, villageManager, KitsuneBuilderModal, modeloPadraoConstrucao, gameData } = this.dependencias;
            const settings = settingsManager.get();
            const construtorSettings = settings.construtor;

            logger.add('Construtor', 'Módulo iniciado.');

            // Pega o ID do modelo selecionado nas configurações.
            const modeloId = construtorSettings.modelo;
            let filaDeConstrucao;

            // Verifica qual modelo usar: o padrão ou um personalizado.
            if (modeloId === 'default' || !modeloId) {
                filaDeConstrucao = modeloPadraoConstrucao;
                logger.add('Construtor', 'Usando modelo de construção Padrão.');
            } else {
                const templates = KitsuneBuilderModal.loadTemplates();
                const templateSelecionado = templates.find(t => t.id == modeloId);
                if (templateSelecionado) {
                    // Mapeia o modelo personalizado para o formato que o construtor entende.
                    filaDeConstrucao = templateSelecionado.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
                    logger.add('Construtor', `Usando modelo personalizado: ${templateSelecionado.name}.`);
                } else {
                    logger.add('Construtor', 'Modelo personalizado não encontrado. Usando Padrão.');
                    filaDeConstrucao = modeloPadraoConstrucao;
                }
            }

            // Pega a lista de todas as aldeias do jogador.
            const todasAldeias = villageManager.getVillages();
            if (!todasAldeias || todasAldeias.length === 0) {
                logger.add('Construtor', 'Nenhuma aldeia encontrada para processar.');
                return;
            }

            // Itera sobre cada aldeia para verificar o que precisa ser construído.
            for (const aldeia of todasAldeias) {
                try {
                    // Pega o estado atual da aldeia (níveis de edifícios, recursos, etc).
                    const estadoAldeia = await this.obterEstadoDaAldeia(aldeia.id);

                    // Se a fila de construção estiver cheia, pula para a próxima aldeia.
                    if (estadoAldeia.filaConstrucao.length >= estadoAldeia.maxFilas) {
                        logger.add('Construtor', `Aldeia ${aldeia.name}: Fila de construção cheia.`);
                        continue;
                    }

                    // Encontra o próximo item a ser construído na aldeia.
                    const proximoItem = this.encontrarProximoItemParaConstruir(filaDeConstrucao, estadoAldeia.niveisEdificios);

                    if (proximoItem) {
                        const { edificio, nivel } = proximoItem;
                        logger.add('Construtor', `Aldeia ${aldeia.name}: Tentando construir ${edificio} nível ${nivel}.`);

                        // Tenta construir o edifício.
                        const sucesso = await this.construirEdificio(aldeia.id, edificio, gameData.csrf);
                        if (sucesso) {
                            logger.add('Construtor', `Aldeia ${aldeia.name}: Ordem de construção para ${edificio} nível ${nivel} enviada com sucesso.`);
                            // Após construir com sucesso, podemos parar de verificar esta aldeia por agora.
                            break; 
                        } else {
                            logger.add('Construtor', `Aldeia ${aldeia.name}: Falha ao enviar ordem de construção para ${edificio} nível ${nivel}. Pode ser falta de recursos.`);
                        }
                    } else {
                        logger.add('Construtor', `Aldeia ${aldeia.name}: Modelo de construção concluído ou nenhum item disponível.`);
                    }

                } catch (error) {
                    console.error(`Erro ao processar a aldeia ${aldeia.name}:`, error);
                    logger.add('Construtor', `Erro crítico ao processar aldeia ${aldeia.name}.`);
                }
            }
            logger.add('Construtor', 'Ciclo finalizado.');
        },

        /**
         * Busca os dados da página principal da aldeia para saber o que já está construído.
         * @param {string} aldeiaId - O ID da aldeia.
         * @returns {Promise<object>} - Um objeto com os níveis dos edifícios e a fila de construção.
         */
        async obterEstadoDaAldeia(aldeiaId) {
            const url = `/game.php?village=${aldeiaId}&screen=main`;
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            const niveisEdificios = {};
            // Extrai os níveis de todos os edifícios da página.
            doc.querySelectorAll('[data-building]').forEach(el => {
                const edificio = el.dataset.building;
                const nivelEl = el.querySelector('.level');
                const nivel = nivelEl ? parseInt(nivelEl.innerText.trim(), 10) : 0;
                if (!isNaN(nivel)) {
                    niveisEdificios[edificio] = nivel;
                }
            });
            // Adiciona o nível 0 para edifícios que ainda não existem
            if (!niveisEdificios.snob) niveisEdificios.snob = 0;
            if (!niveisEdificios.stable) niveisEdificios.stable = 0;
            if (!niveisEdificios.garage) niveisEdificios.garage = 0;


            // Extrai os itens que já estão na fila de construção.
            const filaConstrucao = Array.from(doc.querySelectorAll('#build_queue tr.build_queue_item')).map(row => {
                return row.querySelector('td:first-child').innerText.trim();
            });
            
            // Verifica o máximo de filas de construção (2 normal, 5 com premium)
            const maxFilas = doc.querySelector('#build_queue_max_size').textContent.includes('5') ? 5 : 2;

            return { niveisEdificios, filaConstrucao, maxFilas };
        },

        /**
         * Compara a fila do modelo com os edifícios atuais e encontra o próximo a construir.
         * @param {Array<string>} filaDeConstrucao - A lista do modelo (ex: "main_buildlink_wood_1").
         * @param {object} niveisAtuais - O objeto com os níveis atuais dos edifícios.
         * @returns {object|null} - O próximo item a construir ou null se nada puder ser feito.
         */
        encontrarProximoItemParaConstruir(filaDeConstrucao, niveisAtuais) {
            for (const item of filaDeConstrucao) {
                const partes = item.split('_'); // Ex: "main", "buildlink", "wood", "1"
                const edificio = partes[2];
                const nivelAlvo = parseInt(partes[3], 10);
                const nivelAtual = niveisAtuais[edificio] || 0;

                // Se o nível atual já é igual ou maior que o alvo, pulamos para o próximo item do modelo.
                if (nivelAtual >= nivelAlvo) {
                    continue;
                }

                // Se o nível atual é exatamente um a menos que o alvo, este é o próximo a construir.
                if (nivelAtual === nivelAlvo - 1) {
                    return { edificio, nivel: nivelAlvo };
                }
            }
            // Se o loop terminar, significa que não há mais o que construir.
            return null;
        },

        /**
         * Envia a requisição para o servidor para construir/evoluir um edifício.
         * @param {string} aldeiaId - O ID da aldeia onde construir.
         * @param {string} edificio - O nome do edifício (ex: "wood", "main").
         * @param {string} csrfToken - O token de segurança do jogo.
         * @returns {Promise<boolean>} - True se a requisição foi enviada, false caso contrário.
         */
        async construirEdificio(aldeiaId, edificio, csrfToken) {
            // Este é o "coração" da ação. Ele simula o clique no botão de construir.
            const url = `/game.php?village=${aldeiaId}&screen=main&action=build&id=${edificio}&h=${csrfToken}`;
            try {
                const response = await fetch(url, { method: 'GET' });
                // A simples chamada à URL já é suficiente para o jogo processar a ação.
                // Verificamos se a resposta não indica um erro.
                if (response.ok) {
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Erro na requisição de construção:", error);
                return false;
            }
        }
    };

    // Anexa o módulo à janela global para que o script principal possa encontrá-lo.
    window.construtorModule = construtorModule;

})();
