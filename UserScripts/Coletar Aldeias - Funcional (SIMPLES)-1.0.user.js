// ==UserScript==
// @name         Coletar Aldeias | Funcional (SIMPLES)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Coleta os IDs das aldeias na tela overview_villages e torna acessível via getAldeiasDisponiveis()
// @author       De Jesus
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Variável temporária para armazenar os IDs das aldeias
    let aldeiasDisponiveis = [];

    // Função para extrair os IDs da página overview_villages
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
            aldeiasDisponiveis = ids;
            console.log('✅ Aldeias coletadas:', aldeiasDisponiveis);
        } else {
            console.log('⚠️ Nenhuma aldeia encontrada na coleta DOM.');
        }
    }

    // Função para tentar coletar via iframe oculto
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

    // Função pública para acessar as aldeias disponíveis
    window.getAldeiasDisponiveis = function () {
        return aldeiasDisponiveis;
    };

    // Execução automática
    const url = window.location.href;

    if (url.includes('screen=overview_villages')) {
        coletarAldeiasDoDOM(document);
    } else {
        tentarColetaViaIframe();
    }
})();
