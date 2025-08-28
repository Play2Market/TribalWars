// ==UserScript==
// @name         Kitsune | Módulo Coletor de Aldeias
// @namespace    https://github.com/Play2Market/TribalWars
// @version      2.0-Data-Enrichment
// @description  Coleta e gerencia um mapa completo (ID, Nome, Coordenada) de todas as aldeias do jogador.
// @author       Triky, Gemini & Cia
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.KitsuneVillageManager) {
        return;
    }

    console.log("🚀 Kitsune | Módulo Coletor de Aldeias (v2.0) está sendo carregado...");

    const KitsuneVillageManager = (function() {
        const CACHE_KEY_BASE = 'kitsune_village_data_cache_'; // Chave de cache atualizada
        const PLAYER_ID = typeof game_data !== 'undefined' ? game_data.player.id : 'unknown_player';
        const CACHE_KEY = `${CACHE_KEY_BASE}${PLAYER_ID}`;

        const CACHE_TIME_MS = 60 * 60 * 1000; // 60 minutos
        let villageData = {}; // Estrutura: { villageId: { name, coords } }

        function salvarCache(data) {
            const cache = { timestamp: Date.now(), data: data };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            console.log(`🗺️ Dados completos das aldeias salvos no cache para o jogador ${PLAYER_ID}.`);
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
            const mapaCompleto = {};
            const linhas = documento.querySelectorAll('#production_table tbody tr');

            linhas.forEach(linha => {
                const idElement = linha.querySelector('span.quickedit-vn[data-id]');
                const labelElement = linha.querySelector('span.quickedit-label');

                if (idElement && labelElement) {
                    const id = idElement.dataset.id;
                    const fullLabel = labelElement.textContent.trim();
                    const coordMatch = fullLabel.match(/\((\d+\|\d+)\)/);
                    
                    if (id && coordMatch) {
                        const coords = coordMatch[1];
                        const name = fullLabel.replace(coordMatch[0], '').trim();
                        mapaCompleto[id] = { name, coords };
                    }
                }
            });

            if (Object.keys(mapaCompleto).length > 0) {
                villageData = mapaCompleto;
                salvarCache(villageData);
            } else {
                console.warn('⚠️ Kitsune Coletor: Nenhuma aldeia encontrada para criar o mapa na página de visualização.');
            }
        }

        function iniciarColeta() {
            console.log("🕵️ Kitsune Coletor: Iniciando coleta de aldeias via iframe...");
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = '/game.php?screen=overview_villages&mode=prod';

            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        coletarAldeiasDoDOM(iframe.contentDocument);
                    } catch (e) {
                         console.error("🔥 Kitsune Coletor: Falha grave ao coletar via iframe.", e);
                    } finally {
                        iframe.remove();
                    }
                }, 1500);
            };
            document.body.appendChild(iframe);
        }

        function init() {
            const cache = lerCache();
            if (cacheValido(cache)) {
                villageData = cache.data;
                console.log(`📦 Kitsune Coletor: Dados das aldeias carregados do cache para o jogador ${PLAYER_ID}.`);
            } else {
                console.log('♻️ Kitsune Coletor: Cache inválido ou ausente. Agendando nova coleta...');
                setTimeout(iniciarColeta, 1500);
            }
        }
        
        function forceUpdateFromCurrentPage() {
            if (window.location.href.includes('screen=overview_villages')) {
                 console.log('📍 Kitsune Coletor: Na página de visualização. Coletando dados frescos...');
                 coletarAldeiasDoDOM(document);
            } else {
                iniciarColeta();
            }
        }

        // --- NOVAS FUNÇÕES PÚBLICAS ---
        function getVillages() {
            if (!villageData || Object.keys(villageData).length === 0) {
                return [];
            }
            return Object.keys(villageData).map(id => ({
                id: id,
                name: villageData[id].name
            }));
        }

        function getMap() {
            return villageData;
        }

        return {
            init: init,
            get: getVillages, // Alias para compatibilidade futura
            getVillages: getVillages, // Função que retorna a lista de aldeias [{id, name}]
            getMap: getMap,           // Função que retorna o mapa completo { id: {name, coords} }
            forceUpdate: forceUpdateFromCurrentPage
        };
    })();

    window.KitsuneVillageManager = KitsuneVillageManager;
    window.KitsuneVillageManager.init();

})();
