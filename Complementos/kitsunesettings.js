// ==UserScript==
// @name         Kitsune | Módulo de Configurações
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.1
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

    console.log("💾 Kitsune | Módulo de Configurações está sendo carregado...");

    const KitsuneSettingsManager = (function() {
        const PLAYER_ID = typeof game_data !== 'undefined' ? game_data.player.id : 'unknown_player';
        const STORAGE_KEY = `kitsune_settings_${PLAYER_ID}`;

        const defaultSettings = {
            sidebarWidth: '550px',
            lastTab: 'dashboard',
            saqueador: { A: {}, B: {}, C: {} },
            recrutador: [{}, {}],
            modules: {}
        };

        let settings = {};
        
        // ### FUNÇÃO DE CORREÇÃO AQUI ###
        // Função para fazer uma mesclagem "profunda" dos objetos de configuração
        function deepMerge(target, source) {
            const output = { ...target };
            if (isObject(target) && isObject(source)) {
                Object.keys(source).forEach(key => {
                    if (isObject(source[key])) {
                        if (!(key in target)) {
                            Object.assign(output, { [key]: source[key] });
                        } else {
                            output[key] = deepMerge(target[key], source[key]);
                        }
                    } else {
                        Object.assign(output, { [key]: source[key] });
                    }
                });
            }
            return output;
        }
        const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));
        // #############################

        function save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch (e) {
                console.error("Kitsune Settings: Erro ao salvar configurações.", e);
            }
        }

        function load() {
            try {
                const storedSettings = localStorage.getItem(STORAGE_KEY);
                if (storedSettings) {
                    // Usa a mesclagem profunda para garantir que os dados aninhados não se percam
                    settings = deepMerge(defaultSettings, JSON.parse(storedSettings));
                } else {
                    settings = defaultSettings;
                }
                console.log(`⚙️ Kitsune Settings: Configurações carregadas para o jogador ${PLAYER_ID}.`);
            } catch (e) {
                console.error("Kitsune Settings: Erro ao carregar. Usando configurações padrão.", e);
                settings = defaultSettings;
            }
        }

        function get(key) {
            return settings[key];
        }

        function set(key, value) {
            settings[key] = value;
            save();
        }

        function update(path, value) {
            const keys = path.split('.');
            let current = settings;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = current[keys[i]] || {};
            }
            current[keys[keys.length - 1]] = value;
            save();
        }

        load();

        return { get, set, update, values: () => settings };
    })();

    window.KitsuneSettingsManager = KitsuneSettingsManager;

})();
