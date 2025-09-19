(function() {
    if(window.KitsuneBuilderModal) return;

    const STORAGE_KEY = 'kitsune_builder_templates';
    const MAX_TEMPLATES = 3;

    const BUILDING_ORDER = ['main', 'barracks', 'stable', 'garage', 'snob', 'smith', 'statue', 'market', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall'];
    const BUILDINGS = {
        main: { name: 'Ed. Principal', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/main3.webp', maxLevel: 30, requirements: {}, initialLevel: 1 },
        barracks: { name: 'Quartel', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/barracks3.webp', maxLevel: 25, requirements: { main: 3 } },
        stable: { name: 'Estábulo', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/stable3.webp', maxLevel: 20, requirements: { main: 10, barracks: 5, smith: 5 } },
        garage: { name: 'Oficina', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/garage3.webp', maxLevel: 15, requirements: { main: 10, smith: 10 } },
        snob: { name: 'Academia', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/snob1.webp', maxLevel: 1, requirements: { main: 20, smith: 20, market: 10 } },
        smith: { name: 'Ferreiro', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/smith3.webp', maxLevel: 20, requirements: { main: 5, barracks: 1 } },
        market: { name: 'Mercado', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/market3.webp', maxLevel: 25, requirements: { main: 3, storage: 2 } },
        wood: { name: 'Bosque', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/wood3.webp', maxLevel: 30, requirements: {} },
        stone: { name: 'Argila', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/stone3.webp', maxLevel: 30, requirements: {} },
        iron: { name: 'Ferro', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/iron3.webp', maxLevel: 30, requirements: {} },
        farm: { name: 'Fazenda', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/farm3.webp', maxLevel: 30, requirements: {}, initialLevel: 1 },
        storage: { name: 'Armazém', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/storage3.webp', maxLevel: 30, requirements: {}, initialLevel: 1 },
        hide: { name: 'Esconderijo', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/hide1.webp', maxLevel: 10, requirements: {}, initialLevel: 1 },
        wall: { name: 'Muralha', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/wall3.webp', maxLevel: 20, requirements: { barracks: 1 } },
        statue: { name: 'Estátua', icon: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/mid/statue1.webp', maxLevel: 1, requirements: {} },
    };
    const SUMMARY_BUILDINGS_ORDER = ['main', 'barracks', 'stable', 'garage', 'snob', 'smith', 'place', 'statue', 'market', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall'];
    const SUMMARY_ICONS = {
        ...Object.keys(BUILDINGS).reduce((acc, key) => { acc[key] = BUILDINGS[key].icon; return acc; }, {}),
        place: 'https://dsbr.innogamescdn.com/asset/c001af66/graphic/buildings/place.webp'
    };

    const KitsuneBuilderModal = {
        modalElement: null,
        templates: [],
        currentTemplateId: null,
        isConfirmingDelete: null,
        BUILDINGS: BUILDINGS,
        SUMMARY_BUILDINGS_ORDER: SUMMARY_BUILDINGS_ORDER,
        SUMMARY_ICONS: SUMMARY_ICONS,

        init() {
            this.injectCSS();
            this.createModalHTML();
            this.attachEventListeners();
            this.loadTemplates();
            console.log("Kitsune: Módulo de Modelos de Construtor inicializado (v2.4).");
        },
        open(templateId = null) {
            this.currentTemplateId = templateId;
            this.isConfirmingDelete = null;
            this.loadTemplates();
            this.render();
            this.modalElement.style.display = 'flex';
        },
        close() {
            this.modalElement.style.display = 'none';
        },
        loadTemplates() {
            const data = localStorage.getItem(STORAGE_KEY);
            this.templates = data ? JSON.parse(data) : [];
            return this.templates;
        },
        saveTemplates() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.templates));
            document.dispatchEvent(new CustomEvent('kitsuneTemplatesUpdated'));
        },
        render() {
            this.renderTemplateList();
            this.renderEditor();
            this.validateQueue();
        },
        renderTemplateList() {
            const listContainer = this.modalElement.querySelector('.kbm-list');
            const newBtn = this.modalElement.querySelector('.kbm-new-btn');
            listContainer.innerHTML = '';
            this.templates.forEach(template => {
                const item = document.createElement('div');
                item.className = 'kbm-list-item';
                item.dataset.id = template.id;
                if (template.id === this.currentTemplateId) {
                    item.classList.add('active');
                }
                let actionsHTML;
                if (this.isConfirmingDelete === template.id) {
                    actionsHTML = `
                        <button class="kbm-confirm-delete-btn" title="Confirmar Exclusão">Confirmar</button>
                        <button class="kbm-cancel-delete-btn" title="Cancelar Exclusão">Cancelar</button>
                    `;
                } else {
                    actionsHTML = `<button class="kbm-delete-btn" title="Excluir Modelo">&times;</button>`;
                }
                item.innerHTML = `
                    <span>${template.name}</span>
                    <div class="kbm-item-actions">${actionsHTML}</div>
                `;
                listContainer.appendChild(item);
            });
            newBtn.disabled = this.templates.length >= MAX_TEMPLATES;
        },
        renderEditor() {
            const editorContainer = this.modalElement.querySelector('.kbm-editor');
            const template = this.templates.find(t => t.id === this.currentTemplateId);
            const nameInput = editorContainer.querySelector('#kbm-template-name');
            const queueContainer = editorContainer.querySelector('.kbm-queue-list');
            if (template) {
                nameInput.value = template.name;
                queueContainer.innerHTML = [...template.queue].reverse().map((item) => this.createQueueRowHTML(item.building, item.level)).join('');
            } else {
                nameInput.value = '';
                queueContainer.innerHTML = '';
            }
             this.clearValidation(nameInput);
        },
        createQueueRowHTML(buildingId = 'main', level = 1) {
            const building = BUILDINGS[buildingId];
            if (!building) return '';

            return `
                <div class="kbm-queue-item" data-building-id="${buildingId}">
                    <span class="kbm-queue-item-name">${building.name}</span>
                    <input class="kbm-level-input" type="number" min="1" max="${building.maxLevel || 30}" value="${level}">
                    <div class="kbm-queue-actions">
                        <button class="kbm-remove-row-btn">&times;</button>
                    </div>
                </div>
            `;
        },
        addBuildingToQueue(buildingId) {
            const queueContainer = this.modalElement.querySelector('.kbm-queue-list');
            const existingRows = queueContainer.querySelectorAll(`.kbm-queue-item[data-building-id="${buildingId}"]`);

            const buildingInfo = BUILDINGS[buildingId];
            if (buildingInfo.maxLevel === 1 && existingRows.length > 0) {
                const statueRow = existingRows[0];
                statueRow.classList.add('kbm-row-flash-red');
                setTimeout(() => statueRow.classList.remove('kbm-row-flash-red'), 500);
                return;
            }

            let highestLevel = buildingInfo.initialLevel || 0;
            if (existingRows.length > 0) {
                highestLevel = Math.max(highestLevel, ...Array.from(existingRows).map(row => parseInt(row.querySelector('.kbm-level-input').value, 10)));
            }
            const nextLevel = highestLevel + 1;


            if (nextLevel > (buildingInfo.maxLevel || 30)) {
                 const lastRow = Array.from(existingRows).pop();
                 if(lastRow) {
                     lastRow.classList.add('kbm-row-flash-red');
                     setTimeout(() => lastRow.classList.remove('kbm-row-flash-red'), 500);
                 }
                return;
            }
            queueContainer.insertAdjacentHTML('afterbegin', this.createQueueRowHTML(buildingId, nextLevel));
            this.validateQueue();
        },
        validateQueue() {
            const villageState = this.calculateFinalLevels();
            const queueItems = Array.from(this.modalElement.querySelectorAll('.kbm-queue-item')).reverse();
            const tempState = {};
            Object.keys(BUILDINGS).forEach(key => {
                if (BUILDINGS[key].initialLevel) tempState[key] = BUILDINGS[key].initialLevel;
            });
            tempState.place = 1;


            queueItems.forEach(item => {
                const buildingId = item.dataset.buildingId;
                const level = parseInt(item.querySelector('.kbm-level-input').value, 10);
                const requirements = BUILDINGS[buildingId].requirements;
                let reqsMet = true;

                for (const reqBuilding in requirements) {
                    if ((tempState[reqBuilding] || 0) < requirements[reqBuilding]) {
                        reqsMet = false;
                        break;
                    }
                }

                item.classList.remove('kbm-req-warning', 'kbm-req-ok');
                if(Object.keys(requirements).length > 0) {
                   item.classList.add(reqsMet ? 'kbm-req-ok' : 'kbm-req-warning');
                }
                tempState[buildingId] = Math.max(tempState[buildingId] || 0, level);
            });

            this.updateSummaryTable(villageState);
        },
        calculateFinalLevels(queue = null) {
            const finalState = {};
             Object.keys(BUILDINGS).forEach(key => {
                if (BUILDINGS[key].initialLevel) finalState[key] = BUILDINGS[key].initialLevel;
            });
            finalState.place = 1;

            const itemsToProcess = queue || Array.from(this.modalElement.querySelectorAll('.kbm-queue-item')).map(row => ({
                building: row.dataset.buildingId,
                level: parseInt(row.querySelector('.kbm-level-input').value, 10)
            }));


            itemsToProcess.forEach(item => {
                finalState[item.building] = Math.max(finalState[item.building] || 0, item.level);
            });
            return finalState;
        },
         updateSummaryTable(finalState) {
            this.modalElement.querySelectorAll('.kbm-summary-table td[data-building]').forEach(cell => {
                const buildingId = cell.dataset.building;
                cell.textContent = finalState[buildingId] || '0';
            });
        },
        showValidation(input, message = 'Este campo é obrigatório.') {
            input.classList.add('kbm-input-error');
             const group = input.closest('.kbm-form-group');
             if(group){
                 const errorEl = group.querySelector('.kbm-error-message');
                 errorEl.textContent = message;
                 errorEl.style.display = 'block';
             }
        },
        clearValidation(input) {
            input.classList.remove('kbm-input-error');
             const group = input.closest('.kbm-form-group');
             if(group){
                 const errorEl = group.querySelector('.kbm-error-message');
                 errorEl.style.display = 'none';
             }
        },
        handleSave() {
            const nameInput = this.modalElement.querySelector('#kbm-template-name');
            const name = nameInput.value.trim();
            if (!name) {
                this.showValidation(nameInput);
                return;
            }

            if (!this.currentTemplateId && this.templates.length >= MAX_TEMPLATES) {
                 this.showValidation(nameInput, `Limite de ${MAX_TEMPLATES} modelos atingido.`);
                 return;
            }

            const queue = Array.from(this.modalElement.querySelectorAll('.kbm-queue-item')).map(row => ({
                building: row.dataset.buildingId,
                level: parseInt(row.querySelector('.kbm-level-input').value, 10)
            })).reverse();

            if (this.currentTemplateId) {
                const index = this.templates.findIndex(t => t.id === this.currentTemplateId);
                this.templates[index].name = name;
                this.templates[index].queue = queue;
            } else {
                 const newId = Date.now();
                 this.templates.push({ id: newId, name: name, queue: queue });
                 this.currentTemplateId = newId;
            }
            this.saveTemplates();
            this.isConfirmingDelete = null;
            this.render();
        },
        attachEventListeners() {
            const nameInput = this.modalElement.querySelector('#kbm-template-name');
            nameInput.addEventListener('input', () => this.clearValidation(nameInput));

            this.modalElement.querySelector('.kbm-picker').addEventListener('click', e => {
                if (e.target.tagName === 'IMG') {
                    const buildingId = e.target.dataset.buildingId;
                    this.addBuildingToQueue(buildingId);
                }
            });

            const queueList = this.modalElement.querySelector('.kbm-queue-list');
            queueList.addEventListener('input', e => {
                if (e.target.classList.contains('kbm-level-input')) {
                    this.validateQueue();
                }
            });

            this.modalElement.addEventListener('click', e => {
                if (e.target.closest('.kbm-save-btn')) {
                    this.handleSave();
                }
                if (e.target.closest('.kbm-cancel-btn')) this.close();
                if (e.target.closest('.kbm-new-btn')) {
                    this.currentTemplateId = null;
                    this.isConfirmingDelete = null;
                    this.render();
                }
                const listItem = e.target.closest('.kbm-list-item');
                if (listItem) {
                    const templateId = parseInt(listItem.dataset.id, 10);
                    if (e.target.classList.contains('kbm-delete-btn')) {
                        this.isConfirmingDelete = templateId;
                        this.renderTemplateList();
                    } else if (e.target.classList.contains('kbm-confirm-delete-btn')) {
                        this.templates = this.templates.filter(t => t.id !== templateId);
                        this.saveTemplates();
                        if (this.currentTemplateId === templateId) this.currentTemplateId = null;
                        this.isConfirmingDelete = null;
                        this.render();
                    } else if (e.target.classList.contains('kbm-cancel-delete-btn')) {
                        this.isConfirmingDelete = null;
                        this.renderTemplateList();
                    } else if (!e.target.closest('.kbm-item-actions')) {
                        this.open(templateId);
                    }
                }
                if (e.target.closest('.kbm-queue-item') && e.target.classList.contains('kbm-remove-row-btn')) {
                    e.target.closest('.kbm-queue-item').remove();
                    this.validateQueue();
                }
            });
        },
        createModalHTML() {
            const pickerHTML = BUILDING_ORDER.map(key =>
                `<img src="${BUILDINGS[key].icon.replace('buildings/mid', 'big_buildings')}" title="${BUILDINGS[key].name}" data-building-id="${key}">`
            ).join('');

            const summaryHeaderHTML = SUMMARY_BUILDINGS_ORDER.map(key => {
                const iconUrl = SUMMARY_ICONS[key] || '';
                const buildingName = (BUILDINGS[key] || {name: 'Praça de Reunião'}).name;
                return `<th title="${buildingName}"><img src="${iconUrl}" alt="${key}"></th>`;
            }).join('');
            const summaryBodyHTML = SUMMARY_BUILDINGS_ORDER.map(key => `<td data-building="${key}">0</td>`).join('');


            const modal = document.createElement('div');
            modal.id = 'kitsune-builder-modal';
            modal.className = 'kbm-overlay';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="kbm-container">
                    <div class="kbm-header">
                        <h2>Modelos de Construção</h2>
                        <button class="kbm-cancel-btn">&times;</button>
                    </div>
                    <div class="kbm-body">
                        <div class="kbm-sidebar">
                            <button class="kbm-new-btn">Criar Novo Modelo</button>
                            <div class="kbm-list"></div>
                        </div>
                        <div class="kbm-editor">
                            <div class="kbm-form-group">
                                <label for="kbm-template-name">Nome do Modelo</label>
                                <input type="text" id="kbm-template-name" placeholder="Ex: DEF" maxlength="8">
                                <span class="kbm-error-message">Este campo é obrigatório.</span>
                            </div>
                            <hr class="kbm-hr">
                            <div class="kbm-queue-header">
                                <h3>Fila de Construção</h3>
                            </div>
                            <div class="kbm-queue-list"></div>
                            <div class="kbm-summary">
                                 <h3>Resumo do Modelo</h3>
                                 <div class="kbm-summary-table-container">
                                     <table class="kbm-summary-table">
                                         <thead><tr>${summaryHeaderHTML}</tr></thead>
                                         <tbody><tr>${summaryBodyHTML}</tr></tbody>
                                     </table>
                                 </div>
                            </div>
                        </div>
                        <div class="kbm-picker">
                           ${pickerHTML}
                        </div>
                    </div>
                    <div class="kbm-footer">
                        <button class="kbm-btn kbm-save-btn">Salvar Modelo</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.modalElement = modal;
        },
        injectCSS() {
            const css = `
                :root { --kbm-bg: #282c34; --kbm-bg-light: #3a404a; --kbm-bg-darker: #21252b; --kbm-border: #4a515e; --kbm-text: #dcdfe4; --kbm-accent: #e06c75; --kbm-accent-alt: #98c379; --kbm-warning: #e5c07b; }
                .kbm-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 20000; display: flex; align-items: center; justify-content: center; font-family: Verdana, sans-serif; font-size: 12px; }
                .kbm-container { width: 900px; max-width: 90vw; background-color: var(--kbm-bg); border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; }
                .kbm-header { padding: 15px 20px; border-bottom: 1px solid var(--kbm-border); display: flex; justify-content: space-between; align-items: center; }
                .kbm-header h2 { margin: 0 20px; color: var(--kbm-accent); font-size: 1.4em; text-align: center; flex-grow: 1; }
                .kbm-body { display: grid; grid-template-columns: 200px 1fr 140px; height: 65vh; }
                .kbm-sidebar, .kbm-picker, .kbm-queue-list, .kbm-list, .kbm-summary-table-container { scrollbar-width: thin; scrollbar-color: var(--kbm-border) var(--kbm-bg-darker); }
                .kbm-sidebar::-webkit-scrollbar, .kbm-picker::-webkit-scrollbar, .kbm-queue-list::-webkit-scrollbar, .kbm-list::-webkit-scrollbar, .kbm-summary-table-container::-webkit-scrollbar { width: 8px; }
                .kbm-sidebar::-webkit-scrollbar-track, .kbm-picker::-webkit-scrollbar-track, .kbm-queue-list::-webkit-scrollbar-track, .kbm-list::-webkit-scrollbar-track, .kbm-summary-table-container::-webkit-scrollbar-track { background: var(--kbm-bg-darker); }
                .kbm-sidebar::-webkit-scrollbar-thumb, .kbm-picker::-webkit-scrollbar-thumb, .kbm-queue-list::-webkit-scrollbar-thumb, .kbm-list::-webkit-scrollbar-thumb, .kbm-summary-table-container::-webkit-scrollbar-thumb { background-color: var(--kbm-border); border-radius: 4px; }
                .kbm-sidebar { border-right: 1px solid var(--kbm-border); padding: 10px; display: flex; flex-direction: column; }
                .kbm-editor { padding: 20px; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--kbm-border); }
                .kbm-picker { padding: 15px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-content: flex-start; overflow-y: auto; }
                .kbm-picker img { width: 100%; cursor: pointer; border: 2px solid transparent; border-radius: 4px; transition: all 0.2s; }
                .kbm-picker img:hover { border-color: var(--kbm-accent-alt); transform: scale(1.05); }
                .kbm-footer { padding: 15px 20px; border-top: 1px solid var(--kbm-border); text-align: right; }
                .kbm-btn, .kbm-new-btn { background-color: var(--kbm-accent); border: none; color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
                .kbm-btn:hover, .kbm-new-btn:hover { background-color: #c05c65; }
                .kbm-new-btn { width: 100%; margin-bottom: 15px; background-color: var(--kbm-accent-alt); }
                .kbm-new-btn:hover { background-color: #82a864; }
                .kbm-new-btn:disabled { background-color: var(--kbm-border); cursor: not-allowed; }
                .kbm-cancel-btn { background: none; border: none; font-size: 2em; color: var(--kbm-text); cursor: pointer; line-height: 1; padding: 0 5px; }
                .kbm-list { overflow-y: auto; flex-grow: 1; padding-right: 5px; }
                .kbm-list-item { color: var(--kbm-text); padding: 10px; margin-bottom: 5px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; width: 100%; border-bottom: 1px solid var(--kbm-border); }
                .kbm-list-item:hover { background-color: var(--kbm-bg-light); }
                .kbm-list-item.active { background-color: var(--kbm-accent); color: white; border-color: var(--kbm-accent); }
                .kbm-item-actions button { font-size: 0.8em; padding: 3px 6px; border-radius: 3px; cursor: pointer; border: 1px solid transparent; }
                .kbm-delete-btn { background: none; border: none; color: inherit; font-size: 1.2em; cursor: pointer; opacity: 0.5; }
                .kbm-delete-btn:hover { opacity: 1; }
                .kbm-confirm-delete-btn { background-color: var(--kbm-accent); color: white; }
                .kbm-cancel-delete-btn { background-color: var(--kbm-bg-light); color: var(--kbm-text); margin-left: 4px; }
                .kbm-form-group { margin-bottom: 15px; position: relative; }
                .kbm-form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: var(--kbm-text); }
                .kbm-form-group input { width: 100%; padding: 8px; background-color: var(--kbm-bg-darker); border: 1px solid var(--kbm-border); color: var(--kbm-text); border-radius: 4px; box-sizing: border-box; }
                .kbm-input-error { border-color: var(--kbm-accent) !important; }
                .kbm-error-message { color: var(--kbm-accent); font-size: 0.8em; margin-top: 4px; display: none; }
                .kbm-hr { border: none; height: 1px; background-color: var(--kbm-border); margin: 5px 0 15px 0; }
                .kbm-queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .kbm-queue-header h3 { margin: 0; color: var(--kbm-text); font-size: 0.9em; }
                .kbm-queue-list { flex-grow: 1; overflow-y: auto; padding: 5px; background-color: var(--kbm-bg-darker); border-radius: 5px; }
                .kbm-queue-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 4px; background-color: var(--kbm-bg-light); margin-bottom: 8px; border-left: 3px solid transparent; transition: border-color 0.3s, background-color 0.3s; }
                .kbm-queue-item.kbm-req-warning { border-left-color: var(--kbm-warning); background-color: #4a4135; }
                .kbm-queue-item.kbm-req-ok { border-left-color: var(--kbm-accent-alt); }
                .kbm-queue-item.kbm-row-flash-red { animation: flash-red 0.5s; }
                @keyframes flash-red { 0% { background-color: var(--kbm-accent); } 100% { background-color: var(--kbm-bg-light); } }
                .kbm-queue-item-name { flex-grow: 1; color: var(--kbm-text); }
                .kbm-level-input { width: 60px; text-align: center; background-color: var(--kbm-bg-darker); color: var(--kbm-text); border: 1px solid var(--kbm-border); border-radius: 4px; padding: 5px; }
                .kbm-level-input.kbm-input-error { border-color: var(--kbm-warning) !important; }
                .kbm-remove-row-btn { background: none; border: none; color: var(--kbm-accent); font-size: 1.4em; cursor: pointer; }
                .kbm-summary { margin-top: auto; padding-top: 15px; border-top: 1px solid var(--kbm-border); }
                .kbm-summary h3 { margin: 0 0 10px 0; color: var(--kitsune-accent-alt); text-align: center; font-size: 0.9em; }
                .kbm-summary-table-container { overflow-x: auto; }
                .kbm-summary-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .kbm-summary-table th img { width: 18px; height: 18px; display: block; margin: auto; }
                .kbm-summary-table th, .kbm-summary-table td { text-align: center; padding: 4px 2px; }
                .kbm-summary-table td { font-weight: bold; color: var(--kbm-text); font-size: 1.1em; }
            `;
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }
    };
    window.KitsuneBuilderModal = KitsuneBuilderModal;
    window.addEventListener('load', () => KitsuneBuilderModal.init());
})();