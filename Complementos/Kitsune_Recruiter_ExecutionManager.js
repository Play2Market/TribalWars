// ==UserScript==
// @name         Kitsune - Recruiter Execution Manager
// @namespace    https://github.com/Play2Market/TribalWars
// @version      2.0
// @description  Módulo "cérebro" que gerencia e executa o ciclo de recrutamento do Assistente Kitsune.
// @author       Triky, Gemini & Cia
// ==/UserScript==

(function() {
    'use-strict';

    window.KitsuneRecruiterExecutionManager = {
        
        timer: null,
        estaRodando: false,
        filaDeTarefasGlobal: [], // [NOVO] Mantém a fila de tarefas do ciclo atual

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
            
            this.filaDeTarefasGlobal = [];
            const aldeiasJaNaFIla = new Set();

            for (const regra of config.regras) {
                const aldeiasDoGrupo = window.kitsuneModalManager.getVillagesFromGroup(regra.idGrupo);
                for (const aldeia of aldeiasDoGrupo) {
                    if (!aldeia.id || aldeiasJaNaFIla.has(aldeia.id)) {
                        continue;
                    }
                    const tarefa = {
                        villageId: aldeia.id,
                        tropasAlvo: regra.tropas,
                        configEdificios: config.configuracoesGerais.edificios
                    };
                    this.filaDeTarefasGlobal.push(tarefa);
                    aldeiasJaNaFIla.add(aldeia.id);
                }
            }
            
            console.log(`Kitsune ExecutionManager: Fila de tarefas gerada com ${this.filaDeTarefasGlobal.length} aldeias.`);
            
            // ETAPA 3: Processar a fila usando os workers (iframes) - LÓGICA IMPLEMENTADA
            this.processarFila();
            
            const minMs = this.converterTempoParaMs(config.configuracoesGerais.intervaloMin);
            const maxMs = this.converterTempoParaMs(config.configuracoesGerais.intervaloMax);
            this.agendarProximoCiclo(minMs, maxMs);
        },

        // [NOVO] Gerenciador do pool de workers (iframes)
        processarFila: function() {
            const maxWorkers = 3;
            let workersAtivos = 0;

            const dispatchNext = () => {
                // Se não houver mais tarefas na fila, encerra.
                if (this.filaDeTarefasGlobal.length === 0) {
                    if (workersAtivos === 0) {
                        console.log("%cKitsune ExecutionManager: Todas as tarefas da fila foram concluídas.", "color:lightgreen;");
                    }
                    return;
                }
                
                // Pega a próxima tarefa e remove da fila global
                const tarefa = this.filaDeTarefasGlobal.shift();
                workersAtivos++;

                // Chama o nosso IframeWorker para processar a tarefa
                window.KitsuneIframeWorker.processarAldeia(tarefa)
                    .then(resultado => console.log(`%c${resultado}`, "color:lightgreen;"))
                    .catch(erro => console.error(`%c${erro}`, "color:red;"))
                    .finally(() => {
                        // Quando o worker termina (com sucesso ou erro), decrementa o contador
                        workersAtivos--;
                        
                        // Aguarda um tempo aleatório para simular comportamento humano antes de iniciar a próxima tarefa
                        const delayHumano = Math.random() * 3000 + 1000; // entre 1 e 4 segundos
                        setTimeout(() => {
                            // Tenta despachar a próxima tarefa da fila
                            if (this.estaRodando) {
                                dispatchNext();
                            }
                        }, delayHumano);
                    });
            };

            // Inicia o número máximo de workers para começar o processo
            for (let i = 0; i < maxWorkers && this.filaDeTarefasGlobal.length > 0; i++) {
                dispatchNext();
            }
        },

        agendarProximoCiclo: function(minMs, maxMs = null) {
            if (!this.estaRodando) return;
            // Só agenda o próximo ciclo se a fila de tarefas estiver vazia.
            if (this.filaDeTarefasGlobal.length > 0) {
                console.log("Kitsune ExecutionManager: Aguardando a fila atual de tarefas terminar antes de agendar o próximo ciclo.");
                // Verifica novamente em 10 segundos.
                setTimeout(() => this.agendarProximoCiclo(minMs, maxMs), 10000);
                return;
            }

            const delay = maxMs ? Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs : minMs;
            console.log(`Kitsune ExecutionManager: Próximo ciclo agendado em ${(delay / 1000 / 60).toFixed(2)} minutos.`);
            
            this.timer = setTimeout(this.cicloPrincipal.bind(this), delay);
        },
        
        converterTempoParaMs: function(tempo) {
            if (!tempo) return 60000;
            const partes = tempo.split(':');
            const horas = parseInt(partes[0], 10) || 0;
            const minutos = parseInt(partes[1], 10) || 0;
            const segundos = parseInt(partes[2], 10) || 0;
            return (horas * 3600 + minutos * 60 + segundos) * 1000;
        }
    };

    console.log("Kitsune: Módulo ExecutionManager carregado.");
})();
