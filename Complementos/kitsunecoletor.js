// ==UserScript==
// @name         Kitsune | Módulo Coletor de Aldeias
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.1
// @description  Coleta e gerencia um mapa de Coordenada->ID de todas as aldeias do jogador, com sistema de cache por jogador.
// @author       Triky & Cia
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.KitsuneVillageManager) {
        return;
    }

    console.log("🚀 Kitsune | Módulo Coletor de Aldeias está sendo carregado...");

    const KitsuneVillageManager = (function() {
        // ### LÓGICA ALTERADA AQUI ###
        // A chave do cache agora é única para cada jogador.
        const CACHE_KEY_BASE = 'kitsune_village_map_cache_';
        const PLAYER_ID = typeof game_data !== 'undefined' ? game_data.player.id : 'unknown_player';
        const CACHE_KEY = `${CACHE_KEY_BASE}${PLAYER_ID}`;
        // ##########################

        const CACHE_TIME_MS = 60 * 60 * 1000; // 60 minutos
        let villageMap = {};

        function salvarCache(mapa) {
            const data = { timestamp: Date.now(), map: mapa };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            console.log(`🗺️ Mapa de Aldeias [Coordenada -> ID] salvo no cache para o jogador ${PLAYER_ID}.`);
        }

        function lerCache() {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            try {
                return JSON.parse(raw);
            } catch (e) {
                console.warn("⚠️ Kitsune Coletor: Erro ao ler cache.", e);
                return null;
            }
        }

        function cacheValido(cache) {
            return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
        }

        function coletarAldeiasDoDOM(documento) {
            const mapaCoordID = {};
            const linhas = documento.querySelectorAll('#production_table tbody tr');

            linhas.forEach(linha => {
                const idElement = linha.querySelector('span.quickedit-vn[data-id]');
                const coordElement = linha.querySelector('span.quickedit-label');

                if (idElement && coordElement) {
                    const id = idElement.dataset.id;
                    const textoCoord = coordElement.textContent;
                    const match = textoCoord.match(/\((\d+\|\d+)\)/);

                    if (match) {
                        const coordenada = match[1];
                        mapaCoordID[coordenada] = id;
                    }
                }
            });

            if (Object.keys(mapaCoordID).length > 0) {
                villageMap = mapaCoordID;
                salvarCache(villageMap);
            } else {
                console.warn('⚠️ Kitsune Coletor: Nenhuma aldeia encontrada para criar o mapa na página de visualização.');
            }
        }

        function iniciarColeta() {
            console.log("🕵️ Kitsune Coletor: Iniciando coleta de aldeias via iframe...");
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = '/game.php?screen=overview_villages';
            iframe.onload = () => {
                try {
                    coletarAldeiasDoDOM(iframe.contentDocument);
                } catch (e) {
                     console.error("🔥 Kitsune Coletor: Falha grave ao coletar via iframe.", e);
                } finally {
                    iframe.remove();
                }
            };
            document.body.appendChild(iframe);
        }

        function init() {
            const cache = lerCache();
            if (window.location.href.includes('screen=overview_villages')) {
                 console.log('📍 Kitsune Coletor: Na página de visualização. Coletando dados frescos...');
                 coletarAldeiasDoDOM(document);
            } else if (cacheValido(cache)) {
                villageMap = cache.map;
                console.log(`📦 Kitsune Coletor: Mapa de Aldeias carregado do cache para o jogador ${PLAYER_ID}.`, villageMap);
            } else {
                console.log('♻️ Kitsune Coletor: Cache inválido ou ausente. Agendando nova coleta...');
                setTimeout(iniciarColeta, 1500);
            }
        }

        return {
            init: init,
            getMap: () => villageMap,
            forceUpdate: iniciarColeta
        };
    })();

    window.KitsuneVillageManager = KitsuneVillageManager;
    window.KitsuneVillageManager.init();

})();
