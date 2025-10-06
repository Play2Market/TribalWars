// ==UserScript==
// @name         Kitsune | Módulo Saqueador
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @description  Lógica de execução para o Módulo Saqueador do Projeto Kitsune.
// @author       Seu Nome & Cia
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.saqueadorModule) {
        return;
    }

    const saqueadorModule = {
        async run(dependencias) {
            const { settingsManager, logger } = dependencias;
            const settings = settingsManager.get().saqueador;
            const modoFarm = (settings.modelo || 'A').toLowerCase();

            // O script original foi feito para as páginas do Assistente de Saque
            if (!location.href.includes('screen=am_farm')) {
                logger.add('Saqueador', 'Módulo pausado. Navegue até o Assistente de Saque para usá-lo.');
                return;
            }

            // A lógica principal do AutoFarm (SIMPLES) começa aqui, adaptada:
            logger.add('Saqueador', `Iniciando ciclo | Modo: ${modoFarm.toUpperCase()} | Muralha Máx: ${settings.nivelMuralha}`);
            
            let ataquesEnviados = 0;
            const menu = $(`#am_widget_Farm a.farm_icon_${modoFarm}`).toArray();

            for (let i = 0; i < menu.length; i++) {
                const tr = $(menu[i]).closest('tr');

                // Filtro 1: Pular se já houver ataque em andamento
                if (tr.find('img[src*="attack.png"]').length) {
                    // logger.add('Saqueador', `Pulando #${i + 1} - Ataque em andamento.`);
                    continue;
                }

                // Filtro 2: Pular se o nível da muralha for muito alto
                const nivelMuralha = this.getNivelMuralha(tr);
                if (nivelMuralha > settings.nivelMuralha) {
                    logger.add('Saqueador', `Pulando #${i + 1} - Muralha Nv.${nivelMuralha} > ${settings.nivelMuralha}`);
                    continue;
                }

                // Filtro 3: Pular se o botão estiver desabilitado (sem tropas suficientes para o modelo)
                const botaoAtaque = tr.find(`a.farm_icon_${modoFarm}`);
                if (botaoAtaque.hasClass('farm_icon_disabled')) {
                    // logger.add('Saqueador', `Pulando #${i + 1} - Tropas insuficientes para o modelo.`);
                    continue;
                }
                
                // Pausa se não houver mais tropas em geral (este filtro é menos preciso, mas serve como segurança)
                if (!this.temTropas()) {
                    logger.add('Saqueador', 'Sem tropas na aldeia. Finalizando ciclo.');
                    break;
                }

                const delay = this.rand(settings.cliqueMin, settings.cliqueMax);
                logger.add('Saqueador', `Enviando ataque #${ataquesEnviados + 1} (aldeia ${i + 1}/${menu.length}) em ${delay}ms...`);
                await this.sleep(delay);

                // Dispara o clique no botão de farm
                botaoAtaque.trigger('click');
                ataquesEnviados++;
            }

            if (ataquesEnviados > 0) {
                logger.add('Saqueador', `Ciclo finalizado. ${ataquesEnviados} ataque(s) enviado(s). Aguardando próximo ciclo do timer.`);
            } else {
                logger.add('Saqueador', 'Nenhum ataque enviado neste ciclo.');
            }
            // A mudança mais importante: NÃO HÁ location.reload(). O KitsuneTimerManager cuidará de chamar esta função novamente.
        },

        // --- Funções Auxiliares (adaptadas do script simples) ---
        getNivelMuralha(tr) {
            const tdMuralha = tr.find('td:nth-child(8)'); // A coluna da muralha é a 8ª
            let nivel = parseInt(tdMuralha.text().trim(), 10);
            return isNaN(nivel) ? 0 : nivel;
        },

        temTropas() {
            let tem = false;
            $('#units_home tr:not(:first-child) td.unit-item').each(function () {
                if (parseInt($(this).text().trim(), 10) > 0) {
                    tem = true;
                    return false; // Interrompe o loop .each()
                }
            });
            return tem;
        },

        rand(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };

    window.saqueadorModule = saqueadorModule;

})();
