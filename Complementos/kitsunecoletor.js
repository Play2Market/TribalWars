// ==UserScript==
// @name         Kitsune | Módulo Coletor de Aldeias
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @description  Coleta e gerencia um mapa de Coordenada->ID de todas as aldeias do jogador, com sistema de cache.
// @author       Triky & Cia
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Se o módulo já foi carregado, não faz nada.
    if (window.KitsuneVillageManager) {
        return;
    }

    console.log("🚀 Kitsune | Módulo Coletor de Aldeias está sendo carregado...");

    const KitsuneVillageManager = (function() {
        const CACHE_KEY = 'kitsune_village_map_cache';
        const CACHE_TIME_MS = 60 * 60 * 1000; // 60 minutos
        let villageMap = {};

        function salvarCache(mapa) {
            const data = { timestamp: Date.now(), map: mapa };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            console.log('🗺️ Mapa de Aldeias [Coordenada -> ID] salvo no cache.');
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
                    const match = textoCoord.match(/\((\d+\|\d+)\)/); // Extrai a coordenada (XXX|YYY)

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
            // Se a página atual já for a de visualização, sempre coletamos para garantir os dados mais frescos.
            if (window.location.href.includes('screen=overview_villages')) {
                 console.log('📍 Kitsune Coletor: Na página de visualização. Coletando dados frescos...');
                 coletarAldeiasDoDOM(document);
            } else if (cacheValido(cache)) {
                villageMap = cache.map;
                console.log('📦 Kitsune Coletor: Mapa de Aldeias carregado do cache.', villageMap);
            } else {
                console.log('♻️ Kitsune Coletor: Cache inválido ou ausente. Agendando nova coleta...');
                // Usamos um pequeno timeout para não sobrecarregar a inicialização da página.
                setTimeout(iniciarColeta, 1500);
            }
        }

        // Expor as funções publicamente
        return {
            init: init,
            getMap: () => villageMap,
            forceUpdate: iniciarColeta
        };
    })();

    // Disponibiliza o manager globalmente para que o script principal possa usá-lo
    window.KitsuneVillageManager = KitsuneVillageManager;

    // Inicializa o módulo assim que o script é carregado
    window.KitsuneVillageManager.init();

})();
