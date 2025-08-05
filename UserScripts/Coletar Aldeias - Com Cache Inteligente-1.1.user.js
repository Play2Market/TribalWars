// ==UserScript==
// @name         Coletar Aldeias | Com Cache Inteligente
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Coleta os IDs das aldeias na tela overview_villages e armazena em cache por até 60 minutos
// @author       De Jesus
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let aldeiasDisponiveis = [];

    const CACHE_KEY = 'aldeiasCache';
    const CACHE_TIME_MS = 60 * 60 * 1000; // 60 minutos

    // Salva no localStorage
    function salvarCache(ids) {
        const data = {
            timestamp: Date.now(),
            aldeias: ids
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }

    // Lê do localStorage
    function lerCache() {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        try {
            const data = JSON.parse(raw);
            return data;
        } catch (e) {
            console.warn('⚠️ Erro ao ler cache:', e);
            return null;
        }
    }

    // Verifica se o cache é válido (menos de 60 minutos)
    function cacheValido(cache) {
        return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
    }

    // Compara cache antigo com o novo e mostra aldeias removidas
    function compararAldeiasAntigasENovas(antigas, novas) {
        const removidas = antigas.filter(id => !novas.includes(id));
        if (removidas.length > 0) {
            console.warn('⚠️ Aldeias removidas:', removidas);
        }
    }

    // Função principal de coleta
    function coletarAldeiasDoDOM(documento) {
        const links = documento.querySelectorAll('a[href*="screen=overview"]');
        const ids = [];

        links.forEach(link => {
            const match = link.href.match(/village=(\d+)/);
            if (match && !ids.includes(match[1])) {
                ids.push(match[1]);
            }
        });

        if (ids.length > 0) {
            const cacheAnterior = lerCache();
            if (cacheAnterior) {
                compararAldeiasAntigasENovas(cacheAnterior.aldeias, ids);
            }

            aldeiasDisponiveis = ids;
            salvarCache(ids);
            console.log('✅ Aldeias coletadas:', aldeiasDisponiveis);
        } else {
            console.log('⚠️ Nenhuma aldeia encontrada na coleta DOM.');
        }
    }

    // Coleta via iframe se necessário
    function tentarColetaViaIframe() {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = '/game.php?screen=overview_villages';

        iframe.onload = () => {
            try {
                coletarAldeiasDoDOM(iframe.contentDocument);
                iframe.remove();
            } catch (e) {
                console.warn('⚠️ Falha ao coletar via iframe:', e);
            }
        };

        document.body.appendChild(iframe);
    }

    // Função pública
    window.getAldeiasDisponiveis = function () {
        return aldeiasDisponiveis;
    };

    // Execução
    const url = window.location.href;
    const cache = lerCache();

    if (url.includes('screen=overview_villages')) {
        coletarAldeiasDoDOM(document);
    } else {
        if (!cacheValido(cache)) {
            tentarColetaViaIframe();
        } else {
            aldeiasDisponiveis = cache.aldeias;
            console.log('📦 Aldeias carregadas do cache:', aldeiasDisponiveis);
        }
    }
})();
