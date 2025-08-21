// ==UserScript==
// @name         Kitsune - Módulo de Grupos Personalizados
// @namespace    https://github.com/Play2Market/TribalWars
// @version      3.0-Sync-Timer
// @description  Módulo para gerenciar grupos por ID, com atualização automática e sincronizada entre abas.
// @author       Triky, GPT & Cia
// ==/UserScript==

(function () {
    'use strict';

    // --- Configurações ---
    const STORAGE_KEY_GROUPS = `kitsune_groups_${game_data.world}`;
    const MAX_GROUPS = 5;
    const CACHE_KEY_VILLAGES = `kitsune_aldeias_cache_${game_data.world}`;
    const CACHE_KEY_LAST_UPDATE = `kitsune_aldeias_last_update_${game_data.world}`;
    const CACHE_LIFETIME_MS = 60 * 60 * 1000;      // 60 minutos de validade do cache (fallback)
    const AUTO_UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos para o intervalo de atualização automática

    let aldeiasDisponiveis = [];
    let autoUpdateTimer = null;

    // =========================================================================================
    // --- LÓGICA DE COLETA E CACHE DE ALDEIAS ---
    // =========================================================================================

    function salvarCacheAldeias(ids) {
        const data = { timestamp: Date.now(), aldeias: ids };
        localStorage.setItem(CACHE_KEY_VILLAGES, JSON.stringify(data));
        // Também atualizamos o timestamp da última atualização para sincronização
        localStorage.setItem(CACHE_KEY_LAST_UPDATE, Date.now().toString());
    }

    function lerCacheAldeias() {
        const raw = localStorage.getItem(CACHE_KEY_VILLAGES);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Kitsune: Erro ao ler cache de aldeias.', e);
            return null;
        }
    }

    function cacheAldeiasValido(cache) {
        return cache && (Date.now() - cache.timestamp < CACHE_LIFETIME_MS);
    }

    function coletarAldeiasDoDOM(doc) {
        const links = doc.querySelectorAll('a[href*="screen=overview"], a[href*="screen=place"]');
        const ids = new Set();
        links.forEach(link => {
            const match = link.href.match(/village=(\d+)/);
            if (match) ids.add(match[1]);
        });
        
        const villageIdsArray = Array.from(ids);
        if (villageIdsArray.length > 0) {
            aldeiasDisponiveis = villageIdsArray;
            salvarCacheAldeias(villageIdsArray);
            console.log(`Kitsune: ${villageIdsArray.length} IDs de aldeias foram coletados e salvos.`);
        }
    }

    function iniciarColetaViaIframe() {
        console.log('Kitsune: Iniciando coleta de aldeias via iframe...');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = '/game.php?screen=overview_villages';
        iframe.onload = () => {
            try {
                coletarAldeiasDoDOM(iframe.contentDocument);
            } catch (e) {
                console.error('Kitsune: Falha ao coletar aldeias via iframe.', e);
            } finally {
                iframe.remove();
            }
        };
        document.body.appendChild(iframe);
    }

    // =========================================================================================
    // --- SINCRONIZAÇÃO E ATUALIZAÇÃO AUTOMÁTICA ---
    // =========================================================================================

    function verificarEAtualizarAldeias() {
        const lastUpdate = parseInt(localStorage.getItem(CACHE_KEY_LAST_UPDATE) || '0');
        const now = Date.now();

        if (now - lastUpdate > AUTO_UPDATE_INTERVAL_MS) {
            // Esta aba se torna a "líder"
            console.log('Kitsune: Esta aba assumiu a tarefa de atualização.');
            // Marca imediatamente para que outras abas não façam o mesmo
            localStorage.setItem(CACHE_KEY_LAST_UPDATE, now.toString());
            iniciarColetaViaIframe();
        } else {
            console.log('Kitsune: Outra aba já atualizou recentemente. Aguardando próximo ciclo.');
        }
    }

    function iniciarAtualizadorAutomatico() {
        // Para o timer antigo se ele existir, para evitar múltiplos timers
        if (autoUpdateTimer) clearInterval(autoUpdateTimer);
        // Inicia um novo timer
        autoUpdateTimer = setInterval(verificarEAtualizarAldeias, AUTO_UPDATE_INTERVAL_MS);
        console.log(`Kitsune: Atualizador automático de aldeias iniciado. Verificando a cada ${AUTO_UPDATE_INTERVAL_MS / 60000} minutos.`);
    }

    // =========================================================================================
    // --- LÓGICA DO MODAL DE GRUPOS PERSONALIZADOS ---
    // =========================================================================================

    function addModalStyles() {
        GM_addStyle(`
            /* Estilos do modal (sem alterações) */
            .kitsune-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); z-index: 15000; justify-content: center; align-items: center; }
            .kitsune-modal-overlay.show { display: flex; }
            .kitsune-modal { background-color: #282c34; border: 1px solid #4a515e; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 600px; max-width: 90%; display: flex; flex-direction: column; }
            .kitsune-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #4a515e; background-color: #21252b; border-top-left-radius: 8px; border-top-right-radius: 8px; }
            .kitsune-modal-header h3 { margin: 0; color: #98c379; font-size: 1.3em; flex-grow: 1; text-align: center; }
            .kitsune-modal-close { font-size: 1.5em; font-weight: bold; color: #8a919e; cursor: pointer; border: none; background: none; z-index: 1; margin-left: -20px; }
            .kitsune-modal-close:hover { color: #dcdfe4; }
            .kitsune-modal-body { padding: 20px; line-height: 1.5; max-height: 60vh; overflow-y: auto;}
            #kitsune-custom-groups-list { border: 1px solid #4a515e; border-radius: 5px; padding: 10px; margin-bottom: 20px; min-height: 120px; background-color: #21252b; }
            .kitsune-custom-group-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #4a515e; }
            .kitsune-custom-group-item:last-child { border-bottom: none; }
            .kitsune-custom-group-item span { font-weight: bold; color: #98c379; }
            .kitsune-group-actions { text-align: right; }
            .kitsune-group-actions span { margin-right: 10px; color: var(--kitsune-text-dark); }
            .kitsune-group-actions button { margin-left: 10px; }
            .kitsune-button { display: inline-block; margin-top: 10px; padding: 8px 20px; background-color: #e06c75; border: 1px solid #e06c75; color: #fff; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; text-align: center;}
            .kitsune-button:hover { background-color: #c05c65; }
            .kitsune-button:disabled { background-color: #4a515e; border-color: #4a515e; cursor: not-allowed; }
            .kitsune-button-small { padding: 4px 10px; font-size: 0.9em; }
            .kitsune-button-secondary { background-color: #3a404a; border-color: #4a515e; }
            .kitsune-button-secondary:hover { background-color: #4a515e; }
            .kitsune-button-danger { background-color: #a43a42; border-color: #a43a42; }
            .kitsune-button-danger:hover { background-color: #8b3138; }
            .kitsune-button-success { background-color: #7b9e61; border-color: #7b9e61; }
            .kitsune-button-success:hover { background-color: #6a8a52; }
            #kitsune-btn-new-group { display: block; width: 100%; margin-top:0; }
            .kitsune-form-row-vertical { display: flex; flex-direction: column; margin-bottom: 15px; }
            .kitsune-form-row-vertical label { margin-bottom: 5px; font-weight: bold; color: #8a919e; }
            .kitsune-form-row-vertical input, .kitsune-form-row-vertical textarea { width: 100%; box-sizing: border-box; background-color: #21252b; color: #dcdfe4; border: 1px solid #4a515e; border-radius: 4px; padding: 5px; }
            .kitsune-form-actions { text-align: right; margin-top: 20px; }
            .kitsune-form-actions button { margin-left: 10px; }
            .kitsune-no-groups-message { text-align: center; color: var(--kitsune-text-dark); padding: 20px; }
        `);
    }

    function getCustomGroups() { return JSON.parse(localStorage.getItem(STORAGE_KEY_GROUPS) || '[]'); }
    function saveCustomGroups(groups) { localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups)); }

    function manageCustomGroupsModal() {
        const MODAL_ID = 'kitsune-custom-groups-modal';
        let currentGroups = [];
        let editingGroupId = null;
        let confirmingDeleteId = null;

        function createModal() {
            if (document.getElementById(MODAL_ID)) return;
            const modalOverlay = document.createElement('div');
            modalOverlay.id = MODAL_ID;
            modalOverlay.className = 'kitsune-modal-overlay';
            modalOverlay.innerHTML = `
                <div class
