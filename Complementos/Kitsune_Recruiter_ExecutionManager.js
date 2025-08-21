// ==UserScript==
// @name         Kitsune - Recruiter Execution Manager
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.1
// @description  Módulo "cérebro" que gerencia e executa o ciclo de recrutamento do Assistente Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

(function() {
    'use-strict';

    window.KitsuneRecruiterExecutionManager = {
        
        timer: null,
        estaRodando: false,

        start: function() {
            if (this.estaRodando) {
                console.log("Kitsune ExecutionManager: O ciclo já está em execução.");
                return;
            }
            console.log("Kitsune ExecutionManager: Iniciando ciclo de recrutamento.");
            this.estaRodando = true;
            this.cicloPrincipal();
        },

        stop: function() {
            if (!this.estaRodando) return;
            console.log("Kitsune ExecutionManager: Parando ciclo de recrutamento.");
            clearTimeout(this.timer);
            this.estaRodando = false;
        },

        cicloPrincipal: async function() {
            if (!this.estaRodando) return;

            console.log("Kitsune ExecutionManager: Executando um novo ciclo...");

            const config = window.KitsuneRecruiterUIManager.lerConfiguracoes();

            if (!config || config.regras.length === 0) {
                console.log("Kitsune ExecutionManager: Nenhuma regra de recrutamento ativa. Aguardando próximo ciclo.");
                this.agendarProximoCiclo(30000);
                return;
            }

            // =================================================================================
            // ETAPA 2: Gerar a fila de ações (aldeias para processar) - LÓGICA IMPLEMENTADA
            // =================================================================================
            
            const filaDeTarefas = [];
            const aldeiasJaNaFIla = new Set(); // Usamos um Set para performance e simplicidade

            for (const regra of config.regras) {
                // Usamos nosso GroupManager para obter as aldeias do grupo da regra atual
                const aldeiasDoGrupo = window.kitsuneModalManager.getVillagesFromGroup(regra.idGrupo);

                for (const aldeia of aldeiasDoGrupo) {
                    // Pula a aldeia se ela já foi adicionada por outra regra (a primeira regra tem prioridade)
                    if (aldeiasJaNaFIla.has(aldeia.id)) {
                        continue;
                    }

                    // Cria um objeto de "tarefa" com tudo que o worker precisa saber
                    const tarefa = {
                        villageId: aldeia.id,
                        tropasAlvo: regra.tropas, // As metas de tropas desta regra específica
                        configEdificios: config.configuracoesGerais.edificios
                    };

                    filaDeTarefas.push(tarefa);
                    aldeiasJaNaFIla.add(aldeia.id);
                }
            }
            
            console.log(`Kitsune ExecutionManager: Fila de tarefas gerada com ${filaDeTarefas.length} aldeias.`);
            console.log(filaDeTarefas); // Mostra a fila de tarefas no console para depuração

            // =================================================================================

            // ETAPA 3: Processar a fila usando os workers (iframes)
            // (Ainda vamos implementar esta parte)
            console.log("TODO: Processar a fila de aldeias com os iframes.");
            
            const minMs = this.converterTempoParaMs(config.configuracoesGerais.intervaloMin);
            const maxMs = this.converterTempoParaMs(config.configuracoesGerais.intervaloMax);
            this.agendarProximoCiclo(minMs, maxMs);
        },

        agendarProximoCiclo: function(minMs, maxMs = null) {
            if (!this.estaRodando) return;
            const delay = maxMs ? Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs : minMs;
            console.log(`Kitsune ExecutionManager: Próximo ciclo em ${(delay / 1000 / 60).toFixed(2)} minutos.`);
            
            // Usamos .bind(this) para garantir que o 'this' dentro do cicloPrincipal seja o nosso objeto
            this.timer = setTimeout(this.cicloPrincipal.bind(this), delay);
        },
        
        converterTempoParaMs: function(tempo) {
            if (!tempo) return 60000; // Valor padrão de 1 minuto caso o tempo seja inválido
            const partes = tempo.split(':');
            const horas = parseInt(partes[0], 10) || 0;
            const minutos = parseInt(partes[1], 10) || 0;
            const segundos = parseInt(partes[2], 10) || 0;
            return (horas * 3600 + minutos * 60 + segundos) * 1000;
        }
    };

    console.log("Kitsune: Módulo ExecutionManager carregado.");
    
    // NOTA: Para iniciar o processo, o script principal (Projeto Kitsune) precisará
    // de um botão que chame:
    // window.KitsuneRecruiterExecutionManager.start();
    // E outro que chame:
    // window.KitsuneRecruiterExecutionManager.stop();

})();
