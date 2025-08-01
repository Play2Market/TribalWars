;(function(exports) {
  'use strict';

  // Cria o modal e a área de logs (apenas uma vez)
  function createConsoleModal() {
    if (window._autoFarmConsoleModal) return;

    // Container do modal
    const modal = document.createElement('div');
    modal.id = 'autoFarm_console_modal';
    Object.assign(modal.style, {
      display:      'none',
      position:     'fixed',
      top:          '50%',
      left:         '50%',
      transform:    'translate(-50%, -50%)',
      width:        '450px',
      maxHeight:    '300px',
      padding:      '10px',
      background:   '#2e1f00',
      color:        '#fff',
      fontFamily:   'monospace',
      fontSize:     '12px',
      border:       '2px solid #603000',
      borderRadius: '6px',
      boxShadow:    '0 0 10px #603000',
      overflowY:    'auto',
      zIndex:       '999999'
    });
    document.body.appendChild(modal);

    // Botão de fechar
    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    Object.assign(btnClose.style, {
      position:     'absolute',
      top:          '6px',
      right:        '6px',
      background:   '#603000',
      color:        '#fff',
      border:       'none',
      padding:      '2px 8px',
      borderRadius: '3px',
      cursor:       'pointer',
      fontSize:     '11px'
    });
    btnClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.appendChild(btnClose);

    // Área de logs
    const logs = document.createElement('div');
    logs.id = 'autoFarm_console_logs';
    Object.assign(logs.style, {
      marginTop:  '30px',
      maxHeight:  '250px',
      overflowY:  'auto',
      whiteSpace: 'pre-wrap',
      wordBreak:  'break-word'
    });
    modal.appendChild(logs);

    // Expondo para uso externo
    window._autoFarmConsoleModal = modal;
    window._autoFarmConsoleLogs  = logs;
  }

  // Escreve mensagem no console UI e no console do navegador
  function log(msg) {
    if (!window._autoFarmConsoleLogs) return;
    const time = new Date().toLocaleTimeString();
    window._autoFarmConsoleLogs.textContent += `[${time}] ${msg}\n`;
    window._autoFarmConsoleLogs.scrollTop = window._autoFarmConsoleLogs.scrollHeight;
    console.log(`[AutoFarm] ${msg}`);
  }

  // Exportando as funções
  exports.createConsoleModal = createConsoleModal;
  exports.log               = log;

})(window.AutoFarmConsole = window.AutoFarmConsole || {});
