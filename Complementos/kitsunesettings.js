// ==UserScript==
// @name         Kitsune | Módulo de Configurações
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.4-Constructor-Timer
// @description  Gerencia o salvamento e carregamento de configurações no localStorage de forma automática e por jogador.
// @author       Triky & Cia
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.KitsuneSettingsManager) {
        return;
    }

    console.log("💾 Kitsune | Módulo de Configurações (v1.4) está sendo carregado...");

    const KitsuneSettingsManager = (function() {
        const PLAYER_ID = typeof game_data !== 'undefined' ? game_data.player.id : 'unknown_player';
        const STORAGE_KEY = `kitsune_settings_${PLAYER_ID}`;

        const defaultSettings = {
            sidebarWidth: '550px',
            lastTab: 'dashboard',
            saqueador: { A: {}, B: {}, C: {} },
            recrutador: [{}, {}],
            construtorConfig: { // NOVO
                tempoMin: '00:05:00',
                tempoMax: '00:15:00'
            },
            recrutadorConfig: {
                barracks: { lote: '1', filas: '10' },
                stable: { lote: '1', filas: '10' },
                garage: { lote: '1', filas: '10' },
                tempoMin: '00:03:00',
                tempoMax: '00:12:00'
            },
            modules: {}
        };

        let settings = {};

        function deepMerge(target, source) {
            let output = { ...target };
            if (isObject(target) && isObject(source)) {
                Object.keys(source).forEach(key => {
                    if (isObject(source[key])) {
                        if (!(key in target)) Object.assign(output, { [key]: source[key] });
                        else output[key] = deepMerge(target[key], source[key]);
                    } else {
                        Object.assign(output, { [key]: source[key] });
                    }
                });
            }
            return output;
        }
        const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));

        function save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch (e) {
                console.error("Kitsune Settings: Erro ao salvar.", e);
            }
        }

        function load() {
            try {
                const storedSettings = localStorage.getItem(STORAGE_KEY);
                settings = storedSettings ? deepMerge(defaultSettings, JSON.parse(storedSettings)) : { ...defaultSettings };
                console.log(`⚙️ Kitsune Settings: Configurações carregadas para o jogador ${PLAYER_ID}.`);
            } catch (e) {
                console.error("Kitsune Settings: Erro ao carregar. Usando padrões.", e);
                settings = { ...defaultSettings };
            }
        }

        function getSettings() {
            return settings;
        }

        load();

        return {
            get: getSettings,
            save: save,
        };
    })();

    window.KitsuneSettingsManager = KitsuneSettingsManager;
})();
