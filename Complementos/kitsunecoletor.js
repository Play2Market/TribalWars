// ==UserScript==
// @name         Kitsune | Módulo Coletor de Dados
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Módulo unificado e otimizado para coletar dados das aldeias (IDs, Recursos, População). Opera de forma autônoma com ciclo de atualização e API para controle externo.
// @author       De Jesus & Gemini
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CACHE_KEY = 'kitsuneDadosCache';
    const DEFAULT_CACHE_MINUTES = 60;

    // --- Estado Interno do Módulo ---
    let dados = {
        timestamp: 0,
        aldeias: {}
    };
    let isCollecting = false;
    let autoUpdateTimer = null;

    // --- Funções de Cache (Unificadas) ---
    function salvarCache() {
        dados.timestamp = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(dados));
        console.log(`[KitsuneColetor] ✅ Cache salvo com dados de ${Object.keys(dados.aldeias).length} aldeias.`);
    }

    function lerCache() {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[KitsuneColetor] ⚠️ Erro ao ler cache:', e);
            return null;
        }
    }

    function cacheValido(cache, minutos = DEFAULT_CACHE_MINUTES) {
        if (!cache || !cache.timestamp) return false;
        const cacheTimeMs = minutos * 60 * 1000;
        return (Date.now() - cache.timestamp < cacheTimeMs);
    }

    // --- Funções de Coleta (Otimizadas) ---

    /**
     * Coleta os IDs de todas as aldeias do jogador.
     * @returns {Promise<string[]>} Uma promessa que resolve com um array de IDs.
     */
    function coletarIdsAldeias() {
        return new Promise((resolve, reject) => {
            console.log('[KitsuneColetor] 🔎 Coletando IDs das aldeias...');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = '/game.php?screen=overview_villages';

            iframe.onload = () => {
                try {
                    const doc = iframe.contentDocument;
                    const links = doc.querySelectorAll('a[href*="screen=overview"]');
                    const ids = new Set(); // Usar Set para evitar duplicatas
                    links.forEach(link => {
                        const match = link.href.match(/village=(\d+)/);
                        if (match) ids.add(match[1]);
                    });
                    iframe.remove();
                    console.log(`[KitsuneColetor]  ditemukan ${ids.size} aldeias.`);
                    resolve(Array.from(ids));
                } catch (e) {
                    iframe.remove();
                    reject(e);
                }
            };
            iframe.onerror = (e) => {
                iframe.remove();
                reject(e)
            };
            document.body.appendChild(iframe);
        });
    }

    /**
     * Coleta todos os dados de uma única aldeia com um único carregamento de iframe.
     * @param {string} id - O ID da aldeia a ser processada.
     * @returns {Promise<object|null>} Uma promessa que resolve com o objeto de dados da aldeia.
     */
    function processarAldeia(id) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            // A tela 'overview' é uma boa fonte para o game_data geral da aldeia
            iframe.src = `/game.php?village=${id}&screen=overview`;

            iframe.onload = () => {
                try {
                    const win = iframe.contentWindow;
                    const villageData = win?.game_data?.village;

                    if (!villageData) {
                        console.warn(`[KitsuneColetor] ⚠️ game_data não encontrado para aldeia ${id}.`);
                        return resolve(null);
                    }

                    const { wood, stone, iron, storage_max, pop, pop_max } = villageData;

                    const aldeiaInfo = {
                        recursos: {
                            wood: parseInt(wood, 10),
                            stone: parseInt(stone, 10),
                            iron: parseInt(iron, 10),
                            capacidade: parseInt(storage_max, 10),
                            percWood: parseFloat(((wood / storage_max) * 100).toFixed(2)),
                            percStone: parseFloat(((stone / storage_max) * 100).toFixed(2)),
                            percIron: parseFloat(((iron / storage_max) * 100).toFixed(2))
                        },
                        populacao: `${pop}/${pop_max}`
                    };

                    resolve(aldeiaInfo);

                } catch (e) {
                    console.warn(`[KitsuneColetor] ⚠️ Erro ao processar aldeia ${id}:`, e);
                    resolve(null);
                } finally {
                    iframe.remove();
                }
            };
             iframe.onerror = () => {
                iframe.remove();
                resolve(null); // Resolve como nulo para não quebrar o loop
            };
            document.body.appendChild(iframe);
        });
    }


    /**
     * Orquestra a coleta completa de dados, de forma sequencial.
     * @param {function} callback - Função a ser chamada no final da coleta.
     */
    async function iniciarColetaCompleta(callback) {
        if (isCollecting) {
            console.log('[KitsuneColetor] ⚠️ Coleta já em andamento. Nova solicitação ignorada.');
            return;
        }

        console.log('[KitsuneColetor] 🔄 Iniciando nova coleta completa de dados...');
        isCollecting = true;
        const novasAldeias = {};

        try {
            const ids = await coletarIdsAldeias();
            if (!ids || ids.length === 0) {
                console.warn('[KitsuneColetor] ⚠️ Nenhuma aldeia encontrada para coletar.');
                return;
            }

            // Processa as aldeias em sequência para não sobrecarregar
            for (const id of ids) {
                const dadosDaAldeia = await processarAldeia(id);
                if (dadosDaAldeia) {
                    novasAldeias[id] = dadosDaAldeia;
                }
            }

            dados.aldeias = novasAldeias;
            salvarCache();

        } catch (error) {
            console.error('[KitsuneColetor] ❌ Erro catastrófico durante a coleta:', error);
        } finally {
            isCollecting = false;
            console.log('[KitsuneColetor] ✨ Coleta completa finalizada.');
            if (typeof callback === 'function') {
                callback(dados);
            }
        }
    }


    // --- API Pública do Módulo ---
    const KitsuneColetor = {
        /**
         * Retorna os últimos dados coletados (do cache ou da coleta mais recente).
         * @returns {object}
         */
        getDados: function() {
            return dados;
        },

        /**
         * Força o início de uma nova coleta de dados.
         * @param {function} callback - (Opcional) Função a ser chamada quando a coleta terminar.
         */
        forcarAtualizacao: function(callback) {
            // Limpa o timer antigo para evitar execuções sobrepostas
            if (autoUpdateTimer) clearTimeout(autoUpdateTimer);
            iniciarColetaCompleta(callback);
        },

        /**
         * Inicia (ou reinicia) o ciclo de atualização automática.
         * @param {number} minutos - O intervalo em minutos para as atualizações.
         */
        iniciarCiclo: function(minutos = DEFAULT_CACHE_MINUTES) {
            if (autoUpdateTimer) clearTimeout(autoUpdateTimer);

            const executarEAgendar = async () => {
                // Se não estivermos no meio de uma coleta forçada, atualiza
                if (!isCollecting) {
                   await iniciarColetaCompleta();
                }
                // Agenda a próxima execução
                autoUpdateTimer = setTimeout(executarEAgendar, minutos * 60 * 1000);
                 console.log(`[KitsuneColetor] ⏰ Próxima atualização automática agendada para daqui a ${minutos} minutos.`);
            };

            // Agenda o primeiro ciclo
            autoUpdateTimer = setTimeout(executarEAgendar, minutos * 60 * 1000);
            console.log(`[KitsuneColetor] ⏰ Ciclo de atualização automática iniciado. Intervalo: ${minutos} minutos.`);
        }
    };


    // --- Lógica de Inicialização ---
    function init() {
        const cache = lerCache();

        if (cacheValido(cache)) {
            dados = cache;
            console.log('[KitsuneColetor] 📦 Dados carregados do cache.');
        } else {
            console.log('[KitsuneColetor] 🌬️ Cache vazio ou expirado. Iniciando primeira coleta...');
            iniciarColetaCompleta();
        }

        // Inicia o ciclo automático independentemente do cache
        KitsuneColetor.iniciarCiclo();

        // Expõe a API para outros scripts
        window.KitsuneColetor = KitsuneColetor;
    }

    init();

})();