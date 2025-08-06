// ==UserScript==
// @name         ColetarRecursos_Aldeias
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Coleta a capacidade de armazenamento e a quantidade de recursos de cada aldeia e calcula o percentual de preenchimento
// @author       De Jesus
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// @require      https://raw.githubusercontent.com/Play2Market/TribalWars/main/ColetorDados/Coletar_Aldeias.js
// ==/UserScript==

(function() {
    'use strict';

    const CACHE_KEY      = 'recursosCache';
    const CACHE_TIME_MS  = 60 * 60 * 1000;  // 60 minutos
    let recursos = {};  // { [id]: { wood, stone, iron, storage_max, pctWood, pctStone, pctIron } }

    // --- Cache Helpers ---
    function salvarCache(data) {
        const payload = {
            timestamp: Date.now(),
            info: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    }

    function lerCache() {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('⚠️ Erro ao ler cache de recursos:', e);
            return null;
        }
    }

    function cacheValido(cache) {
        return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
    }

    // --- Processamento de uma aldeia ---
    function processarAldeia(id, callback) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/game.php?village=${id}&screen=storage`;

        iframe.onload = () => {
            try {
                const win        = iframe.contentWindow;
                const data       = win?.game_data?.village;
                const wood       = data?.wood;
                const stone      = data?.stone;
                const iron       = data?.iron;
                const storageMax = data?.storage_max;

                if ([wood, stone, iron, storageMax].every(v => v != null)) {
                    const pctWood  = parseFloat(((wood  / storageMax) * 100).toFixed(2));
                    const pctStone = parseFloat(((stone / storageMax) * 100).toFixed(2));
                    const pctIron  = parseFloat(((iron  / storageMax) * 100).toFixed(2));

                    recursos[id] = {
                        wood,
                        stone,
                        iron,
                        storage_max: storageMax,
                        pctWood,
                        pctStone,
                        pctIron
                    };

                    console.log(
                        `🏰 ${id} → wood: ${wood}/${storageMax} (${pctWood}%), ` +
                        `stone: ${stone}/${storageMax} (${pctStone}%), ` +
                        `iron: ${iron}/${storageMax} (${pctIron}%)`
                    );
                } else {
                    console.warn(`⚠️ Dados faltantes para aldeia ${id}`);
                }
            } catch (e) {
                console.warn(`⚠️ Erro ao processar aldeia ${id}:`, e);
            } finally {
                iframe.remove();
                callback();
            }
        };

        document.body.appendChild(iframe);
    }

    // --- Loop Sequencial de Aldeias ---
    function processarAldeias(ids, done) {
        let i = 0;
        function next() {
            if (i >= ids.length) {
                done();
                return;
            }
            processarAldeia(ids[i++], next);
        }
        next();
    }

    // --- Coleta Principal ---
    function iniciarColeta() {
        if (typeof window.getAldeiasDisponiveis !== 'function') {
            console.warn('⚠️ Função getAldeiasDisponiveis() não encontrada.');
            return;
        }

        const ids = window.getAldeiasDisponiveis();
        if (!ids?.length) {
            console.warn('⚠️ Nenhuma aldeia disponível.');
            return;
        }

        console.log(`🔄 Coletando recursos de ${ids.length} aldeias...`);
        recursos = {};

        processarAldeias(ids, () => {
            salvarCache(recursos);
            console.log('✅ Coleta de recursos finalizada:', recursos);
        });
    }

    // --- Aguarda Dependência ---
    function aguardarDependencia(cb) {
        const MAX_TENTATIVAS = 20;
        let tentativas = 0;

        function verificar() {
            if (typeof window.getAldeiasDisponiveis === 'function') {
                cb();
            } else if (tentativas++ < MAX_TENTATIVAS) {
                setTimeout(verificar, 500);
            } else {
                console.warn('⚠️ getAldeiasDisponiveis() não disponível após várias tentativas.');
            }
        }

        verificar();
    }

    // --- API Global ---
    window.getRecursosAldeias = () => recursos;
    window.forcarColetaRecursosAldeias = iniciarColeta;

    // Observação: para forçar uma nova coleta use:
    //    window.forcarColetaRecursosAldeias()

    // --- Execução Automática com Cache ---
    const cache = lerCache();
    if (cacheValido(cache)) {
        recursos = cache.info;
        console.log('📦 Recursos carregados do cache:', recursos);
    } else {
        aguardarDependencia(iniciarColeta);
    }

})();
