// ==UserScript==
// @name         Kitsune - Recruiter UI Manager
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @description  Módulo para ler e estruturar as configurações da interface do Recrutador do Assistente Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

(function() {
    'use strict';

    // O objeto principal que será exposto para outros módulos
    window.KitsuneRecruiterUIManager = {

        /**
         * Lê todas as configurações da aba "Recrutador" na interface do Kitsune.
         * @returns {object|null} Um objeto com todas as configurações ou null se a interface não for encontrada.
         */
        lerConfiguracoes: function() {
            const recruiterPanel = document.querySelector('.kitsune-panel[data-panel="recrutador"]');

            // Se a interface do recrutador não estiver presente na página, não há o que fazer.
            if (!recruiterPanel) {
                console.error("Kitsune UIManager: Painel do recrutador não encontrado.");
                return null;
            }

            // Objeto principal que será preenchido e retornado
            const config = {
                configuracoesGerais: {
                    intervaloMin: "00:00:00",
                    intervaloMax: "00:00:00",
                    edificios: {
                        quartel: { lote: 0, filas: 0 },
                        estabulo: { lote: 0, filas: 0 },
                        oficina: { lote: 0, filas: 0 }
                    }
                },
                regras: []
            };

            // 1. Lendo as Configurações Gerais
            const inputsTempo = recruiterPanel.querySelectorAll('.kitsune-form-row input[type="time"]');
            if (inputsTempo.length === 2) {
                config.configuracoesGerais.intervaloMin = inputsTempo[0].value;
                config.configuracoesGerais.intervaloMax = inputsTempo[1].value;
            }

            const inputsEdificios = recruiterPanel.querySelectorAll('.kitsune-rec-edificio');
            inputsEdificios.forEach(edificioDiv => {
                const imgSrc = edificioDiv.querySelector('img').src;
                const inputs = edificioDiv.querySelectorAll('input[type="number"]');
                const lote = parseInt(inputs[0].value, 10) || 0;
                const filas = parseInt(inputs[1].value, 10) || 0;

                if (imgSrc.includes('barracks')) {
                    config.configuracoesGerais.edificios.quartel = { lote, filas };
                } else if (imgSrc.includes('stable')) {
                    config.configuracoesGerais.edificios.estabulo = { lote, filas };
                } else if (imgSrc.includes('garage')) {
                    config.configuracoesGerais.edificios.oficina = { lote, filas };
                }
            });

            // 2. Lendo as Regras de Recrutamento (as duas linhas da tabela)
            const linhasDeRegra = recruiterPanel.querySelectorAll('.kitsune-rec-table-horizontal tbody tr');
            linhasDeRegra.forEach(linha => {
                const seletorDeGrupo = linha.querySelector('.kitsune-group-selector');
                const idDoGrupo = seletorDeGrupo ? seletorDeGrupo.value : "0";

                // Só processa a regra se um grupo válido (diferente de "Nenhum") for selecionado
                if (idDoGrupo !== "0") {
                    const novaRegra = {
                        idGrupo: idDoGrupo,
                        tropas: {}
                    };

                    const inputsDeTropas = linha.querySelectorAll('input[data-unit-id]');
                    inputsDeTropas.forEach(input => {
                        const unitId = input.dataset.unitId;
                        const quantidade = parseInt(input.value, 10) || 0;
                        novaRegra.tropas[unitId] = quantidade;
                    });

                    config.regras.push(novaRegra);
                }
            });

            return config;
        }
    };

    console.log("Kitsune: Módulo UIManager carregado.");

})();