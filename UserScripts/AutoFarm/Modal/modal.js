// ==UserScript==
// @grant none
// ==/UserScript==

;(function(exports) {
  'use strict';

  function createConsoleModal() {
    if (window._autofarmModal) return;

    const modal = document.createElement('div');
    modal.id = 'autofarm_console_modal';
    Object.assign(modal.style, {
      display:   'none',
      position:  'fixed',
      top:       '50%',
      left:      '50%',
      transform: 'translate(-50%, -50%)',
      width:     '450px',
      maxHeight: '300px',
      padding:   '10px',
      background:'#2e1f00',
      color:     '#fff',
      fontFamily:'monospace',
      fontSize:  '12px',
      border:    '2px solid #603000',
      borderRadius:'6px',
      boxShadow: '0 0 10px #603000',
      overflowY: 'auto',
      zIndex:    '999999'
    });
    document.body.appendChild(modal);

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    Object.assign(btnClose.style, {
      position:    'absolute',
      top:         '6px',
      right:       '6px',
      background:  '#603000',
      color:       '#fff',
      border:      'none',
      padding:     '2px 8px',
      borderRadius:'3px',
      cursor:      'pointer',
      fontSize:    '11px'
    });
    btnClose.onclick = () => modal.style.display = 'none';
    modal.appendChild(btnClose);

    const logs = document.createElement('div');
    logs.id = 'autofarm_console_logs';
    Object.assign(logs.style, {
      marginTop:    '30px',
      maxHeight:    '250px',
      overflowY:    'auto',
      whiteSpace:   'pre-wrap',
      wordBreak:    'break-word'
    });
    modal.appendChild(logs);

    window._autofarmModal = modal;
    window._autofarmLogs  = logs;
  }

  function log(msg) {
    if (!window._autofarmLogs) return;
    const time = new Date().toLocaleTimeString();
    window._autofarmLogs.textContent += `[${time}] ${msg}\n`;
    window._autofarmLogs.scrollTop = window._autofarmLogs.scrollHeight;
    console.log(msg);
  }

  exports.createConsoleModal = createConsoleModal;
  exports.log               = log;
})(window.AutofarmModal = window.AutofarmModal || {});
