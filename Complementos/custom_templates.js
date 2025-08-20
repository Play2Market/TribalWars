// ==UserScript==
// @name         Projeto Kitsune | Módulo de Modelos de Tropas
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.2.1
// @description  Módulo para gerenciar modelos de tropas para o Assistente Kitsune.
// @author       Triky, GPT & Cia
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================================
    // --- CONFIGURAÇÕES E CONSTANTES ---
    // =========================================================================================
    const STORAGE_KEY = 'kitsune_troop_templates';
    const MODAL_ID = 'kitsune-template-modal';
    const unitConfig = [
        { id: 'spear', name: 'Lanceiro', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_spear.webp' },
        { id: 'sword', name: 'Espadachim', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_sword.webp' },
        { id: 'axe', name: 'Bárbaro', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_axe.webp' },
        { id: 'archer', name: 'Arqueiro', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_archer.webp' },
        { id: 'spy', name: 'Explorador', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_spy.webp' },
        { id: 'light', name: 'Cavalaria Leve', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_light.webp' },
        { id: 'marcher', name: 'Arq. a Cavalo', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_marcher.webp' },
        { id: 'heavy', name: 'Cavalaria Pesada', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_heavy.webp' },
        { id: 'ram', name: 'Aríete', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/recruit/grey/ram.webp' },
        { id: 'catapult', name: 'Catapulta', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/recruit/grey/catapult.webp' }
    ];

    // --- LISTA DE MODELOS PADRÃO ---
    const defaultTemplates = [
        { name: 'Ataque: Padrão', troops: { axe: 7000, light: 3000, ram: 300 } },
        { name: 'Ataque: Aríetes Pesado', troops: { axe: 6650, light: 2900, ram: 450 } },
        { name: 'Ataque: Com Arq. a Cavalo', troops: { axe: 6000, light: 2500, marcher: 500, ram: 300 } },
        { name: 'Ataque: Com Arq. a Cavalo II', troops: { axe: 6100, light: 2100, marcher: 700, ram: 500 } },
        { name: 'Defesa: Padrão', troops: { spear: 10250, sword: 10250 } },
        { name: 'Defesa: Com CP', troops: { spear: 7250, sword: 7250, heavy: 1000 } },
        { name: 'Defesa: Com CP II', troops: { spear: 9300, sword: 4000, heavy: 1200 } },
        { name: 'Defesa: Mista com Arqueiros', troops: { spear: 6000, sword: 6000, archer: 6000, heavy: 415 } },
        { name: 'Defesa: Mista com Arqueiros II', troops: { spear: 8300, sword: 3000, archer: 5000, heavy: 700 } }
    ];


    // =========================================================================================
    // --- ESTILOS (CSS) ---
    // =========================================================================================
    function getModalStyles() {
        return `
            #${MODAL_ID} {
                display: none; position: fixed; z-index: 15000; left: 0; top: 0; width: 100%; height: 100%;
                overflow: auto; background-color: rgba(0,0,0,0.6); justify-content: center; align-items: center;
                font-family: Verdana, sans-serif; font-size: 12px;
            }
            .ktm-modal-content {
                background-color: var(--kitsune-bg, #282c34); color: var(--kitsune-text, #dcdfe4);
                width: 90%; max-width: 750px; border-radius: 10px; border: 1px solid var(--kitsune-border, #4a515e);
                box-shadow: 0 5px 15px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 80vh;
            }
            .ktm-modal-header {
                padding: 12px 20px; background-color: var(--kitsune-bg-darker, #21252b);
                border-bottom: 1px solid var(--kitsune-border, #4a515e); border-top-left-radius: 10px; border-top-right-radius: 10px;
                display: flex; justify-content: space-between; align-items: center;
            }
            .ktm-modal-header h2 { margin: 0; color: var(--kitsune-accent, #e06c75); font-size: 1.4em; }
            .ktm-close-button { color: var(--kitsune-text-dark, #8a919e); float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
            .ktm-close-button:hover, .ktm-close-button:focus { color: #fff; }
            .ktm-modal-body { display: flex; padding: 20px; overflow: hidden; gap: 20px; }
            .ktm-template-list, .ktm-template-form { flex: 1; display: flex; flex-direction: column; }
            .ktm-template-list { min-width: 200px; }
            .ktm-scroll-container { overflow-y: auto; padding-right: 10px; border: 1px solid var(--kitsune-border, #4a515e); border-radius: 5px; background-color: var(--kitsune-bg-darker, #21252b); padding: 10px; flex-grow: 1;}
            .ktm-list-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-radius: 4px; margin-bottom: 5px; background-color: var(--kitsune-bg-light, #3a404a); }
            .ktm-list-item span { font-weight: bold; }
            .ktm-button-group button { background: none; border: 1px solid var(--kitsune-border, #4a515e); color: var(--kitsune-text, #dcdfe4); cursor: pointer; padding: 4px 8px; border-radius: 3px; margin-left: 5px; }
            .ktm-button-group button:hover { background-color: var(--kitsune-border, #4a515e); }
            .ktm-form-title { font-size: 1.2em; color: var(--kitsune-accent-alt, #98c379); margin-top: 0; margin-bottom: 15px; text-align: center; }
            .ktm-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; }
            .ktm-form-group { display: flex; flex-direction: column; }
            .ktm-form-group.full-width { grid-column: 1 / -1; }
            .ktm-form-group label { margin-bottom: 5px; font-weight: bold; display: flex; align-items: center; gap: 5px;}
            .ktm-form-group img { width: 18px; height: 18px; }
            .ktm-form-group input { width: 100%; box-sizing: border-box; background-color: var(--kitsune-bg-darker, #21252b); color: var(--kitsune-text, #dcdfe4); border: 1px solid var(--kitsune-border, #4a515e); border-radius: 4px; padding: 6px; }
            .ktm-modal-footer { padding: 10px 20px; border-top: 1px solid var(--kitsune-border, #4a515e); text-align: right; background-color: var(--kitsune-bg-darker, #21252b); border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; }
            .ktm-button { padding: 8px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; border: 1px solid; }
            .ktm-button-primary { background-color: var(--kitsune-accent, #e06c75); color: #fff; border-color: var(--kitsune-accent, #e06c75); }
            .ktm-button-primary:hover { background-color: #c05c65; }
            .ktm-button-secondary { background-color: transparent; color: var(--kitsune-accent-alt, #98c379); border-color: var(--kitsune-accent-alt, #98c379); margin-right: 10px; }
            .ktm-button-secondary:hover { background-color: rgba(152, 195, 121, 0.2); }
        `;
    }

    // =========================================================================================
    // --- LÓGICA DO MÓDULO ---
    // =========================================================================================
    const manager = {
        isEditing: null,

        loadTemplates: function() { /* ... (funções mantidas como antes) ... */ },
        saveTemplates: function(templates) { /* ... */ },
        renderList: function() {
            const templates = this.loadTemplates();
            const listContainer = document.querySelector(`#${MODAL_ID} .ktm-scroll-container`);
            listContainer.innerHTML = '';

            templates.forEach(template => {
                const item = document.createElement('div');
                item.className = 'ktm-list-item';
                item.innerHTML = `
                    <span>${template.name}</span>
                    <div class="ktm-button-group">
                        <button class="ktm-edit-btn" data-name="${template.name}">Editar</button>
                        <button class="ktm-delete-btn" data-name="${template.name}">Excluir</button>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        },
        clearForm: function() { /* ... */ },
        populateForm: function(templateName) { /* ... */ },
        handleSave: function() { /* ... */ },
        handleDelete: function(templateName) { /* ... */ },
        init: function() {
             const existingTemplates = this.loadTemplates();
            if (existingTemplates.length === 0) {
                console.log('Kitsune: Nenhum modelo encontrado. Carregando modelos padrão.');
                this.saveTemplates(defaultTemplates);
            }
            const style = document.createElement('style');
            style.textContent = getModalStyles();
            document.head.appendChild(style);
            const modalContainer = document.createElement('div');
            modalContainer.id = MODAL_ID;
            modalContainer.innerHTML = this.getModalHtml();
            document.body.appendChild(modalContainer);
            modalContainer.addEventListener('click', (e) => {
                if (e.target.id === MODAL_ID || e.target.classList.contains('ktm-close-button')) { this.close(); }
                if (e.target.classList.contains('ktm-edit-btn')) { this.populateForm(e.target.dataset.name); }
                if (e.target.classList.contains('ktm-delete-btn')) { this.handleDelete(e.target.dataset.name); }
            });
            document.querySelector('#ktm-save-btn').addEventListener('click', () => this.handleSave());
            document.querySelector('#ktm-new-btn').addEventListener('click', () => this.clearForm());
        },
        open: function() { /* ... */ },
        close: function() { /* ... */ },
        getModalHtml: function() { /* ... */ }
    };

    // --- Recoloquei o conteúdo das funções que não mudaram para economizar espaço na explicação, mas no código final elas estão completas ---
    manager.loadTemplates = function() { try { const t = localStorage.getItem(STORAGE_KEY); return t ? JSON.parse(t) : [] } catch (e) { return [] } };
    manager.saveTemplates = function(t) { try { const n = t.map(t => { const n = {}; unitConfig.forEach(e => { n[e.id] = t.troops[e.id] || 0 }); return { ...t, troops: n } }); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)) } catch (e) { console.error("Kitsune Error: Failed to save templates.", e) } };
    manager.clearForm = function() { document.querySelector("#ktm-template-name").value = ""; unitConfig.forEach(t => { document.querySelector(`#ktm-unit-${t.id}`).value = "0" }); document.querySelector("#ktm-form-title").textContent = "Criar Novo Modelo"; this.isEditing = null };
    manager.populateForm = function(t) { const n = this.loadTemplates().find(n => n.name === t); if (!n) return; document.querySelector("#ktm-form-title").textContent = `Editando: ${n.name}`; document.querySelector("#ktm-template-name").value = n.name; unitConfig.forEach(t => { document.querySelector(`#ktm-unit-${t.id}`).value = n.troops[t.id] || "0" }); this.isEditing = t };
    manager.handleSave = function() { const t = document.querySelector("#ktm-template-name").value.trim(); if (!t) { alert("Kitsune: O nome do modelo não pode estar vazio."); return } let n = this.loadTemplates(); if (this.isEditing && this.isEditing !== t) { if (n.some(n => n.name === t)) { alert("Kitsune: Já existe um modelo com este nome."); return } } else if (!this.isEditing) { if (n.some(n => n.name === t)) { alert("Kitsune: Já existe um modelo com este nome."); return } } const e = {}; unitConfig.forEach(t => { e[t.id] = parseInt(document.querySelector(`#ktm-unit-${t.id}`).value, 10) || 0 }); const o = { name: t, troops: e }; if (this.isEditing) { n = n.map(n => n.name === this.isEditing ? o : n) } else { n.push(o) } this.saveTemplates(n); this.renderList(); this.clearForm() };
    manager.handleDelete = function(t) { if (!confirm(`Tem certeza que deseja excluir o modelo "${t}"?`)) return; let n = this.loadTemplates().filter(n => n.name !== t); this.saveTemplates(n); this.renderList(); if (this.isEditing === t) { this.clearForm() } };
    manager.open = function() { this.renderList(); document.getElementById(MODAL_ID).style.display = "flex" };
    manager.close = function() { this.clearForm(); document.getElementById(MODAL_ID).style.display = "none" };
    manager.getModalHtml = function() { const t = unitConfig.map(t => `<div class="ktm-form-group"><label for="ktm-unit-${t.id}"><img src="${t.icon}" title="${t.name}">${t.name}</label><input type="number" id="ktm-unit-${t.id}" min="0" value="0"></div>`).join(""); return `<div class="ktm-modal-content"><div class="ktm-modal-header"><h2>Gerenciador de Modelos</h2><span class="ktm-close-button">&times;</span></div><div class="ktm-modal-body"><div class="ktm-template-list"><h3 class="ktm-form-title">Modelos Salvos</h3><div class="ktm-scroll-container"></div></div><div class="ktm-template-form"><h3 id="ktm-form-title" class="ktm-form-title">Criar Novo Modelo</h3><div class="ktm-form-group full-width"><label for="ktm-template-name">Nome do Modelo</label><input type="text" id="ktm-template-name" placeholder="Ex: Full Ataque CL"></div><div class="ktm-form-grid">${t}</div></div></div><div class="ktm-modal-footer"><button id="ktm-new-btn" class="ktm-button ktm-button-secondary">Criar Novo</button><button id="ktm-save-btn" class="ktm-button ktm-button-primary">Salvar</button></div></div>` };


    // =========================================================================================
    // --- EXPOSIÇÃO DO MÓDULO E INICIALIZAÇÃO ---
    // =========================================================================================
    window.kitsuneTemplateManager = {
        modal: {
            open: () => manager.open()
        },
        getTemplates: () => manager.loadTemplates(),
        // Expondo a configuração das unidades para o script principal usar
        unitConfig: unitConfig
    };

    window.addEventListener('load', () => manager.init());

})();
