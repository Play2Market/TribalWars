// ==UserScript==
// @name         Kitsune - Recruiter Execution Manager
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @description  Módulo "cérebro" que gerencia e executa o ciclo de recrutamento do Assistente Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

(function() {
    'use-strict';

    // O objeto principal que será exposto
    window.KitsuneRecruiterExecutionManager = {
        
        timer: null, // Variável para guardar nosso temporizador principal
        estaRodando: false,

        /**
         * Inicia o ciclo de recrutamento.
         */
        start: function() {
            if (this.estaRodando) {
                console.log("Kitsune ExecutionManager: O ciclo já está em execução.");
                return;
            }
            console.log("Kitsune ExecutionManager: Iniciando ciclo de recrutamento.");
            this.estaRodando = true;
            this.cicloPrincipal(); // Roda a primeira vez imediatamente
        },

        /**
         * Para o ciclo de recrutamento.
         */
        stop: function() {
            if (!this.estaRodando) return;
            console.log("Kitsune ExecutionManager: Parando ciclo de recrutamento.");
            clearTimeout(this.timer);
            this.estaRodando = false;
        },

        /**
         * O coração do nosso script. Esta função roda, faz seu trabalho,
         * e depois agenda a si mesma para rodar novamente.
         */
        cicloPrincipal: async function() {
            if (!this.estaRodando) return;

            console.log("Kitsune ExecutionManager: Executando um novo ciclo...");

            // ETAPA 1: Ler as configurações da interface
            // Aqui vamos chamar o UIManager que acabamos de criar.
            const config = window.KitsuneRecruiterUIManager.lerConfiguracoes();

            // Validação básica: se não houver regras, não faz nada.
            if (!config || config.regras.length === 0) {
                console.log("Kitsune ExecutionManager: Nenhuma regra de recrutamento ativa. Aguardando próximo ciclo.");
                this.agendarProximoCiclo(30000); // Agenda para daqui a 30 segundos
                return;
            }

            // ETAPA 2: Gerar a fila de ações (aldeias para processar)
            // Lógica para pegar as regras, buscar as aldeias de cada grupo e montar a fila.
            // (Ainda vamos implementar esta parte)
            console.log("Configurações lidas:", config);
            console.log("TODO: Gerar a fila de aldeias a partir das regras.");

            // ETAPA 3: Processar a fila usando os workers (iframes)
            // Lógica para gerenciar o pool de iframes e processar a fila.
            // (Ainda vamos implementar esta parte)
            console.log("TODO: Processar a fila de aldeias com os iframes.");
            
            // ETAPA 4: Agendar o próximo ciclo
            const minMs = this.converterTempoParaMs(config.configuracoesGerais.intervaloMin);
            const maxMs = this.converterTempoParaMs(config.configuracoesGerais.intervaloMax);
            this.agendarProximoCiclo(minMs, maxMs);
        },

        /**
         * Agenda a próxima execução do cicloPrincipal para um tempo aleatório entre min e max.
         */
        agendarProximoCiclo: function(minMs, maxMs = null) {
            const delay = maxMs ? Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs : minMs;
            console.log(`Kitsune ExecutionManager: Próximo ciclo em ${(delay / 1000 / 60).toFixed(2)} minutos.`);
            
            this.timer = setTimeout(() => this.cicloPrincipal(), delay);
        },
        
        /**
         * Função utilitária para converter "HH:MM:SS" em milissegundos.
         */
        converterTempoParaMs: function(tempo) {
            const partes = tempo.split(':');
            const horas = parseInt(partes[0], 10) || 0;
            const minutos = parseInt(partes[1], 10) || 0;
            const segundos = parseInt(partes[2], 10) || 0;
            return (horas * 3600 + minutos * 60 + segundos) * 1000;
        }
    };

    console.log("Kitsune: Módulo ExecutionManager carregado.");
    
    // NOTA: Para iniciar o processo, outro script (o principal) precisaria chamar:
    // window.KitsuneRecruiterExecutionManager.start();

})();