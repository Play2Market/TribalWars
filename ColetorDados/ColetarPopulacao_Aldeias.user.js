// ==UserScript==
// @name         ColetarPopulacao_Aldeias
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Coleta população, usando Coletar_Aldeias.js via @require para garantir dependência
// @author       De Jesus
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// @require      https://raw.githubusercontent.com/Play2Market/TribalWars/main/ColetorDados/Coletar_Aldeias.js
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY = 'populacaoCache';
    const CACHE_TIME_MS = 60 * 60 * 1000; // 60 minutos
    let populacoes = {}; // { [id]: "15448/16394" }

    // Cache
    function salvarCache(dados) {
        const data = {
            timestamp: Date.now(),
            info: dados
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }

    function lerCache() {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('⚠️ Erro ao ler cache de população:', e);
            return null;
        }
    }

    function cacheValido(cache) {
        return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
    }

    // Processa uma única aldeia
    function processarAldeia(id, callback) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/game.php?village=${id}&screen=farm`;

        iframe.onload = () => {
            try {
                const win = iframe.contentWindow;
                const popAtual = win?.game_data?.village?.pop;
                const popMax = win?.game_data?.village?.pop_max;

                if (popAtual != null && popMax != null) {
                    populacoes[id] = `${popAtual}/${popMax}`;
                    console.log(`🏰 ${id}`, populacoes[id]);
                } else {
                    console.warn(`⚠️ Dados de população não encontrados para aldeia ${id}`);
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

    // Loop sequencial
    function processarAldeias(ids, done) {
        let i = 0;
        function next() {
            if (i >= ids.length) {
                done();
                return;
            }
            const id = ids[i++];
            processarAldeia(id, next);
        }
        next();
    }

    // Coleta principal
    function iniciarColeta() {
        if (typeof window.getAldeiasDisponiveis !== 'function') {
            console.warn('⚠️ Função getAldeiasDisponiveis() não encontrada. Carregue Coletar_Aldeias.js primeiro.');
            return;
        }

        const ids = window.getAldeiasDisponiveis();
        if (!ids || ids.length === 0) {
            console.warn('⚠️ Nenhuma aldeia disponível.');
            return;
        }

        console.log(`🔄 Coletando população de ${ids.length} aldeias...`);

        processarAldeias(ids, () => {
            salvarCache(populacoes);
            console.log('✅ Coleta de população finalizada:', populacoes);
        });
    }

    // Espera pela dependência
    function aguardarDependencia(callback) {
        const MAX_TENTATIVAS = 20;
        let tentativas = 0;

        function verificar() {
            if (typeof window.getAldeiasDisponiveis === 'function') {
                callback();
            } else if (tentativas++ < MAX_TENTATIVAS) {
                setTimeout(verificar, 500);
            } else {
                console.warn('⚠️ getAldeiasDisponiveis() não disponível após várias tentativas.');
            }
        }

        verificar();
    }

    // Expor API global
    window.getPopulacaoAldeias = function () {
        return populacoes;
    };

    window.forcarColetaPopulacao = function () {
        iniciarColeta();
    };

    // Observação: para solicitar/forçar uma nova coleta de população manualmente, use:
    //    window.forcarColetaPopulacao()

    // Execução automática com cache
    const cache = lerCache();
    if (cacheValido(cache)) {
        populacoes = cache.info;
        console.log('📦 Populações carregadas do cache:', populacoes);
    } else {
        aguardarDependencia(iniciarColeta);
    }
})();
