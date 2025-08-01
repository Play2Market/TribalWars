const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Assistente - Painel</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet" />
<style>
  /* Seu CSS aqui */
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
      
      <!-- Resto do conteúdo HTML -->

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
    });
  </script>
</body>
</html>
`;

document.body.innerHTML = htmlContent;
