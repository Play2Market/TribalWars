// =========================================================================================
// --- INÍCIO: Módulo de Lógica do Construtor (m_construtor.js) v1.5 ---
// =========================================================================================
(function() {
    'use strict';

    if (window.construtorModule) { return; }

    console.log(" Módulo de Lógica do Construtor está sendo carregado...");

    const construtorModule = {
        dependencias: {},

        async run(dependencias) {
            this.dependencias = dependencias;
            const { settingsManager, logger, villageManager, KitsuneBuilderModal, modeloPadraoConstrucao, gameData } = this.dependencias;
            const settings = settingsManager.get();
            const construtorSettings = settings.construtor;

            logger.add('Construtor', 'Módulo iniciado.');

            const modeloId = construtorSettings.modelo;
            let filaDeConstrucao;

            if (modeloId === 'default' || !modeloId) {
                filaDeConstrucao = modeloPadraoConstrucao;
                logger.add('Construtor', 'Usando modelo de construção Padrão.');
            } else {
                const templates = KitsuneBuilderModal.loadTemplates();
                const templateSelecionado = templates.find(t => t.id == modeloId);
                if (templateSelecionado) {
                    filaDeConstrucao = templateSelecionado.queue.map(item => `main_buildlink_${item.building}_${item.level}`);
                    logger.add('Construtor', `Usando modelo personalizado: ${templateSelecionado.name}.`);
                } else {
                    logger.add('Construtor', 'Modelo personalizado não encontrado. Usando Padrão.');
                    filaDeConstrucao = modeloPadraoConstrucao;
                }
            }

            const todasAldeias = villageManager.getVillages();
            if (!todasAldeias || todasAldeias.length === 0) {
                logger.add('Construtor', 'Nenhuma aldeia encontrada para processar.');
                return;
            }

            for (const aldeia of todasAldeias) {
                try {
                    const estadoAldeia = await this.obterEstadoDaAldeia(aldeia.id);

                    if (estadoAldeia.filaConstrucao.length >= estadoAldeia.maxFilas) {
                        logger.add('Construtor', `Aldeia ${aldeia.name}: Fila de construção cheia.`);
                        continue;
                    }

                    const proximoItem = this.encontrarProximoItemParaConstruir(filaDeConstrucao, estadoAldeia.niveisEdificios);

                    if (proximoItem) {
                        const { edificio, nivel } = proximoItem;
                        logger.add('Construtor', `Aldeia ${aldeia.name}: Tentando construir ${edificio} nível ${nivel}.`);

                        const sucesso = await this.construirEdificio(aldeia.id, edificio, gameData.csrf);
                        if (sucesso) {
                            logger.add('Construtor', `Aldeia ${aldeia.name}: Ordem de construção para ${edificio} nível ${nivel} enviada com sucesso.`);
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

        async obterEstadoDaAldeia(aldeiaId) {
            const url = `/game.php?village=${aldeiaId}&screen=main`;
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            const niveisEdificios = {};
            doc.querySelectorAll('[data-building]').forEach(el => {
                const edificio = el.dataset.building;
                const nivelEl = el.querySelector('.level');
                const nivel = nivelEl ? parseInt(nivelEl.innerText.trim(), 10) : 0;
                if (!isNaN(nivel)) { niveisEdificios[edificio] = nivel; }
            });
            if (!niveisEdificios.snob) niveisEdificios.snob = 0;
            if (!niveisEdificios.stable) niveisEdificios.stable = 0;
            if (!niveisEdificios.garage) niveisEdificios.garage = 0;

            const filaConstrucao = Array.from(doc.querySelectorAll('#build_queue tr.build_queue_item')).map(row => row.querySelector('td:first-child').innerText.trim());
            
            let maxFilas = 2; 
            const maxFilasElement = doc.querySelector('#build_queue_max_size');
            if (maxFilasElement) {
                maxFilas = maxFilasElement.textContent.includes('5') ? 5 : 2;
            }

            return { niveisEdificios, filaConstrucao, maxFilas };
        },
        
        encontrarProximoItemParaConstruir(filaDeConstrucao, niveisAtuais) {
            for (const item of filaDeConstrucao) {
                const partes = item.split('_');
                const edificio = partes[2];
                const nivelAlvo = parseInt(partes[3], 10);
                const nivelAtual = niveisAtuais[edificio] || 0;

                if (nivelAtual < nivelAlvo) {
                    return { edificio: edificio, nivel: nivelAtual + 1 };
                }
            }
            return null;
        },

        async construirEdificio(aldeiaId, edificio, csrfToken) {
            const url = `/game.php?village=${aldeiaId}&screen=main&action=build&id=${edificio}&h=${csrfToken}`;
            try {
                const response = await fetch(url, { method: 'GET' });
                return response.ok;
            } catch (error) {
                console.error("Erro na requisição de construção:", error);
                return false;
            }
        }
    };

    window.construtorModule = construtorModule;

})();
