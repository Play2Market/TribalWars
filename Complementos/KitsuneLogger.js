// ==UserScript==
// @name         Kitsune | Módulo de Log
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.1
// @description  Módulo para gerenciar logs de atividade para o Assistente Kitsune.
// @author       Triky, GPT & Cia
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.KitsuneLogger) {
        return;
    }

    console.log("📜 Kitsune | Módulo de Log (v1.1) está sendo carregado...");

    // A lógica só será executada após o carregamento completo da página
    window.addEventListener('load', () => {
        const KitsuneLogger = {
            STORAGE_KEY: `kitsune_logs_${game_data.player.id}`,
            MAX_LOG_ENTRIES: 50,
            logs: [],

            init() {
                this.load();
            },

            load() {
                try {
                    const storedLogs = localStorage.getItem(this.STORAGE_KEY);
                    this.logs = storedLogs ? JSON.parse(storedLogs) : [];
                } catch (e) {
                    console.error("Kitsune Logger: Erro ao carregar logs.", e);
                    this.logs = [];
                }
            },

            save() {
                try {
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
                } catch (e) {
                    console.error("Kitsune Logger: Erro ao salvar logs.", e);
                }
            },

            add(moduleName, message) {
                const now = new Date();
                const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                const logEntry = {
                    timestamp,
                    moduleName,
                    message
                };

                this.logs.unshift(logEntry); // Adiciona no início

                if (this.logs.length > this.MAX_LOG_ENTRIES) {
                    this.logs.pop(); // Remove o mais antigo
                }

                this.save();
                document.dispatchEvent(new CustomEvent('kitsuneLogUpdated'));
            },

            getLogs(count = 10) {
                return this.logs.slice(0, count);
            },

            clear() {
                this.logs = [];
                this.save();
                document.dispatchEvent(new CustomEvent('kitsuneLogUpdated'));
            }
        };

        window.KitsuneLogger = KitsuneLogger;
        KitsuneLogger.init();
    });

})();
