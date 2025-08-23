// ==UserScript==
// @name         Kitsune | Módulo de Configurações
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @description  Gerencia o salvamento e carregamento de configurações no localStorage de forma automática e por jogador.
// @author       Triky & Cia
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Previne que o script seja carregado mais de uma vez
    if (window.KitsuneSettingsManager) {
        return;
    }

    console.log("💾 Kitsune | Módulo de Configurações está sendo carregado...");

    const KitsuneSettingsManager = (function() {
        // Pega o ID do jogador assim que o jogo o disponibiliza
        const PLAYER_ID = typeof game_data !== 'undefined' ? game_data.player.id : 'unknown_player';
        const STORAGE_KEY = `kitsune_settings_${PLAYER_ID}`;

        // Configurações padrão para evitar erros
        const defaultSettings = {
            sidebarWidth: '550px',
            lastTab: 'dashboard',
            saqueador: { A: {}, B: {}, C: {} },
            recrutador: [{}, {}]
            // Novas configurações podem ser adicionadas aqui no futuro
        };

        let settings = {};

        // Salva o objeto de configurações completo no localStorage
        function save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch (e) {
                console.error("Kitsune Settings: Erro ao salvar configurações.", e);
            }
        }

        // Carrega as configurações do localStorage
        function load() {
            try {
                const storedSettings = localStorage.getItem(STORAGE_KEY);
                // Mescla as configurações salvas com as padrões.
                // Isso garante que, se você adicionar uma nova configuração no futuro, o script não quebre.
                settings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
                console.log(`⚙️ Kitsune Settings: Configurações carregadas para o jogador ${PLAYER_ID}.`);
            } catch (e) {
                console.error("Kitsune Settings: Erro ao carregar. Usando configurações padrão.", e);
                settings = defaultSettings;
            }
        }

        // Retorna um valor específico, ex: get('sidebarWidth')
        function get(key) {
            return settings[key];
        }

        // Define um valor de alto nível, ex: set('lastTab', 'recrutador')
        function set(key, value) {
            settings[key] = value;
            save();
        }

        // Atualiza um valor "aninhado" no objeto, ex: update('saqueador.A.spear', 100)
        function update(path, value) {
            const keys = path.split('.');
            let current = settings;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = current[keys[i]] || {};
            }
            current[keys[keys.length - 1]] = value;
            save();
        }

        // Carrega as configurações assim que o módulo é definido
        load();

        // Expõe as funções que o script principal poderá usar
        return {
            get,
            set,
            update,
            values: () => settings
        };
    })();

    // Anexa o gerenciador à janela global para que outros scripts possam encontrá-lo
    window.KitsuneSettingsManager = KitsuneSettingsManager;

})();