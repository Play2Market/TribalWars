/**
 * =========================================================================================
 * KITSUNE - MÓDULO DE LÓGICA - CONSTRUTOR (m_construtor.js)
 * =========================================================================================
 * Motor lógico para o módulo Construtor, usando requisições API para eficiência.
 * Entende e aplica todas as configurações da UI, incluindo macros e modelos.
 * @version 3.2-Hotfix-Resource-Check
 * @author Triky, Gemini & Cia
 */
const construtorModule = (function() {

    // AVISO: Estes endpoints precisam ser confirmados usando a aba "Rede" (F12) do navegador.
    const API_ENDPOINTS = {
        GET_VILLAGE_DATA: '/game.php?village={village_id}&screen=main&ajax=overview',
        BUILD_COMMAND: '/game.php?village={village_id}&action=upgrade_building&id={building}&h={csrf_token}'
    };

    const PAUSE_CONFIG = {
        BETWEEN_FETCHES_MS: [200, 400],    // Pausa curta entre a coleta de dados de cada aldeia
        BETWEEN_BUILDS_MS: [1000, 2000]   // Pausa mais longa entre cada comando de construção enviado
    };

    /**
     * Pausa a execução por um período de tempo.
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 50));
    }

    /**
     * Busca os dados de uma aldeia via API.
     */
    async function fetchDadosDaAldeia(villageId, logger) {
        const url = API_ENDPOINTS.GET_VILLAGE_DATA.replace('{village_id}', villageId);
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            // Validação essencial para garantir que os dados mínimos existem
            if (!data || !data.buildings || !data.res || !data.pop) {
                 logger.add('Construtor', `Dados da aldeia ${villageId} vieram malformados.`);
                 return null;
            }
            return data;
        } catch (e) {
            logger.add('Construtor', `Falha ao buscar dados da aldeia ${villageId}.`);
            return null;
        }
    }

    /**
     * Calcula o nível real de um edifício, somando o nível atual com o que já está na fila.
     */
    function calcularNivelEfetivo(edificios, fila, nomeEdificio) {
        const nivelBase = parseInt(edificios[nomeEdificio]?.level || 0, 10);
        const emFila = fila.filter(item => item.building === nomeEdificio).length;
        return nivelBase + emFila;
    }

    /**
     * [NOVO] Verifica se há recursos suficientes para construir o próximo nível de um edifício.
     */
    function podePagar(edificioId, dados) {
        const custos = dados.buildings[edificioId]?.res_cost_next;
        if (!custos) return false; // Não há próximo nível ou dados de custo

        return dados.res.wood >= custos.wood &&
               dados.res.stone >= custos.stone &&
               dados.res.iron >= custos.iron;
    }


    /**
     * O cérebro do módulo: decide qual edifício construir com base na lógica de prioridades.
     */
    function decidirOQueConstruir(dados, settings, builderTemplates, modeloPadrao) {
        const { buildings, buildqueue, res, res_max, pop } = dados;
        const { construtor } = settings;
        const maxQueueSize = parseInt(construtor.filas || 1, 10);

        if (buildqueue.length >= maxQueueSize) return null;

        // PRIORIDADE 1: FAZENDA
        if ((pop.pop_current / pop.pop_max) >= (parseInt(construtor.fazenda) / 100)) {
            if (calcularNivelEfetivo(buildings, buildqueue, 'farm') < 30 && podePagar('farm', dados)) return 'farm';
        }

        // PRIORIDADE 2: ARMAZÉM
        const resPercent = Math.max(res.wood, res.stone, res.iron) / res_max.storage;
        if (resPercent >= (parseInt(construtor.armazem) / 100)) {
            if (calcularNivelEfetivo(buildings, buildqueue, 'storage') < 30 && podePagar('storage', dados)) return 'storage';
        }

        // PRIORIDADE 3: MURALHA
        if (calcularNivelEfetivo(buildings, buildqueue, 'wall') < parseInt(construtor.nivelMuralha)) {
            if (podePagar('wall', dados)) return 'wall';
        }

        // PRIORIDADE 4: ESCONDERIJO
        if (calcularNivelEfetivo(buildings, buildqueue, 'hide') < parseInt(construtor.nivelEsconderijo)) {
            if (podePagar('hide', dados)) return 'hide';
        }

        // PRIORIDADE 5: MODELO DE CONSTRUÇÃO
        const templateId = construtor.modelo;
        if (templateId === 'default') {
            // Lógica para o modelo padrão
            for (const buildTarget of modeloPadrao) {
                const [_, __, building, level] = buildTarget.split('_');
                if (calcularNivelEfetivo(buildings, buildqueue, building) < parseInt(level, 10)) {
                    if (podePagar(building, dados)) return building;
                    break; // Para aqui se não pode pagar o próximo da lista, para manter a ordem.
                }
            }
        } else {
            // Lógica para modelos personalizados
            const template = builderTemplates.find(t => t.id == templateId);
            if (template) {
                for (const etapa of template.queue) {
                    if (calcularNivelEfetivo(buildings, buildqueue, etapa.building) < etapa.level) {
                        if (podePagar(etapa.building, dados)) return etapa.building;
                        break; // Para aqui se não pode pagar o próximo da lista.
                    }
                }
            }
        }

        return null; // Nenhum edifício corresponde aos critérios ou pode ser pago
    }

    /**
     * Envia o comando de construção para o servidor.
     */
    async function enviarComandoDeConstrucao(villageId, building, csrfToken, logger) {
        const url = API_ENDPOINTS.BUILD_COMMAND
            .replace('{village_id}', villageId)
            .replace('{building}', building)
            .replace('{csrf_token}', csrfToken);
        try {
            const response = await fetch(url, { method: 'GET' });
            const responseJson = await response.json(); // Tenta ler a resposta como JSON

            if (response.ok && responseJson && !responseJson.error) {
                logger.add('Construtor', `Ordem para '${building}' em ${villageId} enviada com sucesso.`);
            } else {
                const errorMessage = responseJson.error || `O servidor retornou um erro (status: ${response.status}).`;
                logger.add('Construtor', `Falha ao construir '${building}' em ${villageId}. Motivo: ${errorMessage}`);
            }
        } catch (e) {
            logger.add('Construtor', `Erro de rede ao construir em ${villageId}.`);
        }
    }

    /**
     * Função principal que orquestra o ciclo do módulo.
     */
    async function run(dependencias) {
        const { settingsManager, villageManager, logger, KitsuneBuilderModal, modeloPadraoConstrucao } = dependencias;
        logger.add('Construtor', 'Iniciando ciclo de construção (API).');

        const settings = settingsManager.get();
        const builderTemplates = KitsuneBuilderModal.loadTemplates();
        const aldeias = villageManager.get();

        const dadosCompilados = [];
        for (const aldeia of aldeias) {
            const dados = await fetchDadosDaAldeia(aldeia.id, logger);
            if (dados) dadosCompilados.push(dados);
            await delay(PAUSE_CONFIG.BETWEEN_FETCHES_MS[0] + Math.random() * PAUSE_CONFIG.BETWEEN_FETCHES_MS[1]);
        }

        const comandos = [];
        for (const dadosAldeia of dadosCompilados) {
            const edificio = decidirOQueConstruir(dadosAldeia, settings, builderTemplates, modeloPadraoConstrucao);
            if (edificio) {
                // [MELHORIA] Adiciona fallback para o token csrf
                const csrf = dadosAldeia.csrf_token || dadosAldeia.csrf;
                if (csrf) {
                    comandos.push({ villageId: dadosAldeia.id, edificio, csrf });
                } else {
                    logger.add('Construtor', `Token CSRF não encontrado para a aldeia ${dadosAldeia.id}. Impossível construir.`);
                }
            }
        }

        if (comandos.length > 0) {
            logger.add('Construtor', `Enviando ${comandos.length} comando(s) de construção...`);
            for (const cmd of comandos) {
                await enviarComandoDeConstrucao(cmd.villageId, cmd.edificio, cmd.csrf, logger);
                await delay(PAUSE_CONFIG.BETWEEN_BUILDS_MS[0] + Math.random() * PAUSE_CONFIG.BETWEEN_BUILDS_MS[1]);
            }
        } else {
            logger.add('Construtor', 'Nenhuma ação de construção necessária neste ciclo.');
        }

        logger.add('Construtor', 'Ciclo finalizado.');
    }

    // Expondo a função run para o escopo global do userscript
    window.construtorModule = { run };
})();
