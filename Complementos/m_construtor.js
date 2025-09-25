// =========================================================================================
// --- Módulo Construtor Automático para Aba "Construtor" v2.0 ---
// =========================================================================================
(function() {
    'use strict';

    if (window.construtorModuleAuto) return;
    console.log("💡 Construtor Automático carregado...");

    const construtorModuleAuto = {
        dependencias: {},

        init(dependencias) {
            this.dependencias = dependencias;

            // Só roda se estivermos na aba Construtor
            if (!window.location.href.includes('screen=main')) {
                console.log("Construtor Automático: não estamos na aba principal. Abortando.");
                return;
            }

            const settings = dependencias.settingsManager.get();
            if (!settings.construtor.autoStart) {
                console.log("Construtor Automático: autoStart desativado.");
                return;
            }

            this.run();
        },

        async run() {
            const { settingsManager, logger, villageManager, KitsuneBuilderModal, modeloPadraoConstrucao, gameData } = this.dependencias;
            const settings = settingsManager.get();
            const construtorSettings = settings.construtor;

            logger?.add?.('Construtor', 'Iniciando ciclo automático de construção...');

            // --- Determina o modelo ---
            let filaDeConstrucao;
            const modeloId = construtorSettings.modelo;

            if (modeloId === 'default' || !modeloId) {
                filaDeConstrucao = modeloPadraoConstrucao || [];
                logger?.add?.('Construtor', 'Usando modelo padrão.');
            } else {
                const templates = KitsuneBuilderModal?.loadTemplates?.() || [];
                const templateSelecionado = templates.find(t => t.id == modeloId);
                filaDeConstrucao = templateSelecionado ? 
                    templateSelecionado.queue.map(i => `main_buildlink_${i.building}_${i.level}`) :
                    modeloPadraoConstrucao || [];
                logger?.add?.('Construtor', templateSelecionado ? 
                    `Usando modelo personalizado: ${templateSelecionado.name}` : 
                    'Modelo personalizado não encontrado, usando padrão.');
            }

            // --- Percorre aldeias ---
            const todasAldeias = villageManager.getVillages?.() || [];
            if (!todasAldeias.length) {
                logger?.add?.('Construtor', 'Nenhuma aldeia encontrada.');
                return;
            }

            for (const aldeia of todasAldeias) {
                try {
                    const estado = await this.obterEstadoDaAldeia(aldeia.id);
                    if (estado.filaConstrucao.length >= estado.maxFilas) {
                        logger?.add?.('Construtor', `Aldeia ${aldeia.name}: fila cheia.`);
                        continue;
                    }

                    const proximo = this.encontrarProximoItem(filaDeConstrucao, estado.niveisEdificios);
                    if (!proximo) {
                        logger?.add?.('Construtor', `Aldeia ${aldeia.name}: nada a construir.`);
                        continue;
                    }

                    logger?.add?.('Construtor', `Aldeia ${aldeia.name}: construindo ${proximo.edificio} nível ${proximo.nivel}...`);
                    this.construirEdificio(aldeia.id, proximo.edificio, gameData.csrf);

                } catch (err) {
                    console.error(`Erro aldeia ${aldeia.name}:`, err);
                    logger?.add?.('Construtor', `Erro crítico na aldeia ${aldeia.name}`);
                }
            }

            logger?.add?.('Construtor', 'Ciclo de construção finalizado.');
        },

        async obterEstadoDaAldeia(aldeiaId) {
            const url = `/game.php?village=${aldeiaId}&screen=main`;
            const res = await fetch(url);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // --- Níveis ---
            const niveis = {};
            doc.querySelectorAll('[data-building]').forEach(el => {
                const id = el.dataset.building;
                const lvlEl = el.querySelector('.level');
                niveis[id] = lvlEl ? parseInt(lvlEl.innerText.trim(), 10) : 0;
            });
            ['snob','stable','garage'].forEach(b => { if (!niveis[b]) niveis[b] = 0; });

            // --- Fila ---
            const fila = Array.from(doc.querySelectorAll('#build_queue tr.build_queue_item'))
                .map(r => r.querySelector('td:first-child').innerText.trim());

            // --- Máximo de filas ---
            let maxFilas = 2;
            const elMax = doc.querySelector('#build_queue_max_size');
            if (elMax) maxFilas = elMax.textContent.includes('5') ? 5 : 2;

            return { niveisEdificios: niveis, filaConstrucao: fila, maxFilas };
        },

        encontrarProximoItem(fila, niveis) {
            for (const item of fila) {
                const p = item.split('_');
                const edificio = p[2];
                const alvo = parseInt(p[3],10);
                const atual = niveis[edificio] || 0;
                if (atual < alvo) return { edificio, nivel: atual+1 };
            }
            return null;
        },

        construirEdificio(aldeiaId, edificio, csrf) {
            const url = `/game.php?village=${aldeiaId}&screen=main&action=build&id=${edificio}&h=${csrf}`;

            try {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = url;
                document.body.appendChild(iframe);
                setTimeout(() => iframe.remove(), 5000);
            } catch (err) {
                console.error("Erro ao criar iframe de construção:", err);
            }
        }
    };

    window.construtorModuleAuto = construtorModuleAuto;

    // --- Inicializa se aba Construtor ---
    window.addEventListener('load', () => {
        window.construtorModuleAuto.init({
            settingsManager: window.KitsuneSettingsManager,
            logger: window.KitsuneLogger || { add: console.log },
            villageManager: window.KitsuneVillageManager,
            KitsuneBuilderModal: window.KitsuneBuilderModal,
            modeloPadraoConstrucao: [
                "main_buildlink_farm_1",
                "main_buildlink_storage_1",
                "main_buildlink_barracks_1"
            ],
            gameData: window.game_data
        });
    });
})();
