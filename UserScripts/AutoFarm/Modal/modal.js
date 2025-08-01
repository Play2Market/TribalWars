<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Assistente - Painel</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet" />
<style>
  html, body {
    margin: 0; padding: 0;
    height: 100%;
    font-family: 'Montserrat', sans-serif;
    color: #eee;
    display: flex;
    overflow: hidden;
  }
  body::before {
    content: "";
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url('https://media.innogamescdn.com/TribalWars/wallpapers/desktop/TribalWarsWallpaper_1_1920x1200.jpg') no-repeat center center fixed;
    background-size: cover;
    z-index: -2;
  }
  body::after {
    content: "";
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: -1;
  }

  #toggle-sidebar {
    position: fixed;
    top: 10px;
    left: 10px;
    width: 36px;
    height: 36px;
    background: rgba(0,0,0,0.7);
    border: none;
    border-radius: 6px;
    color: #eee;
    font-size: 24px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    transition: background-color 0.3s;
  }
  #toggle-sidebar:hover {
    background: rgba(0,0,0,0.9);
  }

  #menu {
    width: 80px;
    background-color: rgba(0,0,0,0.6);
    border-radius: 20px;
    margin: 70px 0 30px 10px;
    padding: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-self: center;
    min-height: 100px;
    align-items: center;
    transition: width 0.3s ease;
    overflow: hidden;
  }
  #menu.collapsed {
    width: 40px;
    margin-left: 10px;
  }
  #menu button {
    cursor: pointer;
    user-select: none;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    border: none;
    background: transparent;
    transition: background-color 0.2s ease;
    overflow: visible;
  }
  #menu.collapsed button {
    width: 32px;
    height: 32px;
  }
  #menu button:hover,
  #menu button.active {
    background-color: rgba(255,255,255,0.2);
  }
  #menu button img {
    width: 32px;
    height: 32px;
    pointer-events: none;
    user-select: none;
    transition: width 0.3s, height 0.3s;
  }
  #menu.collapsed button img {
    width: 24px;
    height: 24px;
  }

  #content {
    flex: 1;
    padding: 20px;
    overflow: visible;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #func-panel {
    background: rgba(0,0,0,0.9);
    border-radius: 12px;
    padding: 30px 40px 20px 40px;
    box-shadow: 0 0 20px #000;
    color: #eee;
    width: 65vw;
    max-width: 900px;
    height: 65vh;
    max-height: 700px;
    display: none;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    margin: auto;
    overflow-y: auto;
  }
  #func-panel:focus {
    outline: 2px solid #4caf50;
    outline-offset: 4px;
  }

  #func-title {
    margin: 0 0 8px 0;
    font-weight: 700;
    font-size: 2rem;
    text-align: center;
    letter-spacing: 0.03em;
  }
  #func-desc {
    font-size: 1.1rem;
    color: #bbb;
    margin: 0 0 24px 0;
    text-align: center;
    line-height: 1.4;
    max-width: 500px;
  }

  .btn-group {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  .btn-select {
    padding: 8px 20px;
    font-size: 1rem;
    font-weight: 600;
    color: #ddd;
    background: transparent;
    border: 2px solid #555;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }
  .btn-select:hover {
    border-color: #4caf50;
    color: #4caf50;
  }
  .btn-select.active {
    background-color: #4caf50;
    border-color: #4caf50;
    color: white;
    box-shadow: 0 0 6px #4caf50aa;
  }

  .switch-group {
    display: flex;
    flex-direction: column;
    gap: 15px;
    font-size: 1rem;
    align-items: center;
    width: 100%;
    margin-bottom: 20px;
  }
  .switch-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    width: 240px;
  }
  .switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 26px;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
  input:checked + .slider {
    background-color: #4caf50;
  }
  input:checked + .slider:before {
    transform: translateX(24px);
  }

  #console {
    width: 100%;
    max-height: 150px;
    background: #222;
    border-radius: 8px;
    padding: 10px;
    font-family: monospace;
    font-size: 0.9rem;
    overflow-y: auto;
    color: #0f0;
    box-shadow: inset 0 0 5px #0f0;
    user-select: text;
  }
</style>
</head>
<body>
  <button id="toggle-sidebar" aria-label="Alternar menu lateral" title="Abrir/Fechar menu">☰</button>

  <nav id="menu" role="navigation" aria-label="Menu de funções">
    <button type="button" data-func="construcao" title="Construção Automática" aria-pressed="false">
      <img src="https://cdn-icons-png.flaticon.com/512/1946/1946433.png" alt="Construção Automática" />
    </button>
    <button type="button" data-func="farm" title="Farm Automático" aria-pressed="false">
      <img src="https://cdn-icons-png.flaticon.com/512/5522/5522602.png" alt="Farm Automático" />
    </button>
    <button type="button" data-func="recrutamento" title="Recrutamento Automático" aria-pressed="false">
      <img src="https://cdn-icons-png.flaticon.com/512/2940/2940456.png" alt="Recrutamento Automático" />
    </button>
  </nav>

  <main id="content" tabindex="-1">
    <section id="func-panel" tabindex="-1" aria-live="polite" aria-label="Painel de configuração">
      <h2 id="func-title">Configuração</h2>
      <p id="func-desc">Descrição da função selecionada aparecerá aqui.</p>

      <div class="btn-group" role="group" aria-label="Seleção de modo">
        <button type="button" class="btn-select active" id="btn-padrao">PADRÃO</button>
        <button type="button" class="btn-select" id="btn-recursos">RECURSOS</button>
      </div>

      <div class="switch-group">
        <label class="switch-label" for="save-config-switch">
          Salvar Configuração
          <label class="switch">
            <input type="checkbox" id="save-config-switch" />
            <span class="slider"></span>
          </label>
        </label>
        <label class="switch-label" for="enable-module-switch">
          Habilitar Módulo
          <label class="switch">
            <input type="checkbox" id="enable-module-switch" />
            <span class="slider"></span>
          </label>
        </label>
      </div>

      <div id="console" aria-live="polite" aria-atomic="false" role="log" tabindex="0"></div>
    </section>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const toggleBtn = document.getElementById('toggle-sidebar');
      const menu = document.getElementById('menu');
      const buttons = menu.querySelectorAll('button[data-func]');
      const funcPanel = document.getElementById('func-panel');
      const funcTitle = document.getElementById('func-title');
      const funcDesc = document.getElementById('func-desc');
      const saveSwitch = document.getElementById('save-config-switch');
      const enableSwitch = document.getElementById('enable-module-switch');
      const consoleEl = document.getElementById('console');

      const btnPadrao = document.getElementById('btn-padrao');
      const btnRecursos = document.getElementById('btn-recursos');

      const LS_SAVE_PREFIX = 'saveConfig_';
      const LS_ENABLE_PREFIX = 'enableModule_';

      const descriptions = {
        construcao: "Automatiza a construção e melhoria de edifícios.",
        farm: "Gerencia ataques automáticos para coletar recursos.",
        recrutamento: "Controla o recrutamento automático de tropas."
      };

      let currentFunc = null;

      const buttonsNamed = {};
      buttons.forEach(btn => buttonsNamed[btn.dataset.func] = btn);

      function timestamp() {
        const d = new Date();
        return `[${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}]`;
      }

      function log(msg) {
        const line = document.createElement('div');
        line.textContent = `${timestamp()} ${msg}`;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }

      function setActiveButton(selectedBtn) {
        [btnPadrao, btnRecursos].forEach(btn => {
          btn.classList.toggle('active', btn === selectedBtn);
        });
        log(`Modo selecionado: ${selectedBtn.textContent}`);
      }

      btnPadrao.addEventListener('click', () => setActiveButton(btnPadrao));
      btnRecursos.addEventListener('click', () => setActiveButton(btnRecursos));

      function updatePanel(func) {
        currentFunc = func;
        const btn = buttonsNamed[func];
        funcTitle.textContent = btn?.querySelector('img')?.alt || func.charAt(0).toUpperCase() + func.slice(1) + ' Automático';
        funcDesc.textContent = descriptions[func] || '';

        saveSwitch.checked = localStorage.getItem(LS_SAVE_PREFIX + func) === 'true';
        enableSwitch.checked = localStorage.getItem(LS_ENABLE_PREFIX + func) === 'true';

        funcPanel.style.display = 'flex';

        buttons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.func === func);
          btn.setAttribute('aria-pressed', btn.dataset.func === func ? 'true' : 'false');
        });

        setActiveButton(btnPadrao);

        log(`Painel aberto: ${funcTitle.textContent}`);
        log(`Salvar Configuração: ${saveSwitch.checked}`);
        log(`Habilitar Módulo: ${enableSwitch.checked}`);

        funcPanel.focus();
      }

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentFunc === btn.dataset.func && funcPanel.style.display === 'flex') {
            funcPanel.style.display = 'none';
            log(`Painel fechado`);
            currentFunc = null;
            buttons.forEach(b => {
              b.classList.remove('active');
              b.setAttribute('aria-pressed', 'false');
            });
            return;
          }
          updatePanel(btn.dataset.func);
        });
      });

      saveSwitch.addEventListener('change', () => {
        if (!currentFunc) return;
        localStorage.setItem(LS_SAVE_PREFIX + currentFunc, saveSwitch.checked);
        log(`Salvar Configuração alterado para ${saveSwitch.checked} em ${currentFunc}`);
      });

      enableSwitch.addEventListener('change', () => {
        if (!currentFunc) return;
        localStorage.setItem(LS_ENABLE_PREFIX + currentFunc, enableSwitch.checked);
        log(`Habilitar Módulo alterado para ${enableSwitch.checked} em ${currentFunc}`);
      });

      document.body.addEventListener('click', e => {
        if (
          funcPanel.style.display === 'flex' &&
          !funcPanel.contains(e.target) &&
          !e.target.closest('#menu') &&
          e.target !== toggleBtn
        ) {
          funcPanel.style.display = 'none';
          log(`Painel fechado`);
          currentFunc = null;
          buttons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
          });
        }
      });

      toggleBtn.addEventListener('click', () => {
        menu.classList.toggle('collapsed');
      });

      // Não abrir painel automaticamente
      // Apenas mostrar ao clicar no menu

    });
  </script>
</body>
</html>
