// ==UserScript==
// @name         AutoFarm com Alternador de Akldeias
// @namespace    https://www.youtube.com/c/TW100TRIBALWARS
// @version      6.8
// @description  AutoFarm com modo alternável A/C, console visual, filtro de muralha, alternância de aldeias e espera inteligente entre 5 a 15 minutos.
// @include      http*://*.tribalwars.*/game.php?*&screen=am_farm*
// @author       Tiago, GPT, Tw100
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /***************
   * 1. CONFIGURAÇÕES
   ***************/
  // Tempo mínimo e máximo (ms) entre cliques de ataque
  const tempoCliqueMin = 450;
  const tempoCliqueMax = 2000;

  // Intervalo de espera entre cada ciclo de farm (em ms)
  // intervaloMin = 1 minutos, intervaloMax = 3 minutos
  const intervaloMin = 1 * 60000;
  const intervaloMax = 3 * 60000;

  // Filtra aldeias com muralha acima deste nível (0 = sem filtro)
  const maxMuralha = 0;

  /***************
   * 2. CACHE DE ALDEIAS
   ***************/
  const CACHE_KEY = 'aldeiasCache';
  const CACHE_TIME_MS = 60 * 60 * 1000; // cache válido por 1 hora
  let aldeiasDisponiveis = [];

  function salvarCache(ids) {
    const data = { timestamp: Date.now(), aldeias: ids };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }

  function lerCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Erro ao ler cache:', e);
      return null;
    }
  }

  function cacheValido(cache) {
    return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
  }

  function coletarAldeiasDoDOM(documento) {
    const links = documento.querySelectorAll('a[href*="screen=overview"]');
    const ids = [];
    links.forEach(link => {
      const match = link.href.match(/village=(\d+)/);
      if (match && !ids.includes(match[1])) {
        ids.push(match[1]);
      }
    });

    if (ids.length > 0) {
      aldeiasDisponiveis = ids;
      salvarCache(ids);
      console.log('✅ Aldeias coletadas:', aldeiasDisponiveis);
    } else {
      console.log('⚠️ Nenhuma aldeia encontrada na coleta DOM.');
    }
  }

  function tentarColetaViaIframe() {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '/game.php?screen=overview_villages';

    iframe.onload = () => {
      try {
        coletarAldeiasDoDOM(iframe.contentDocument);
        iframe.remove();
        executarAtaques();
      } catch (e) {
        console.warn('⚠️ Falha ao coletar via iframe:', e);
        iframe.remove();
      }
    };

    document.body.appendChild(iframe);
  }

  /***************
   * 3. INÍCIO DO SCRIPT
   ***************/
  let modoFarm = localStorage.getItem('modoFarm') || 'a';
  createConsoleModal();
  log(`Iniciando AutoFarm | Modo atual: ${modoFarm.toUpperCase()}`);

  const cache = lerCache();
  if (cacheValido(cache)) {
    aldeiasDisponiveis = cache.aldeias;
    executarAtaques();
  } else {
    tentarColetaViaIframe();
  }

  /***************
   * 4. EXECUÇÃO DE ATAQUES (CORRIGIDO)
   ***************/
  async function executarAtaques() {
    if (aldeiasDisponiveis.length === 0) {
      log('Nenhuma aldeia disponível.');
      return;
    }

    let aldeiaAtual = new URLSearchParams(window.location.search).get('village');
    let indiceAtual = aldeiasDisponiveis.indexOf(aldeiaAtual);

    if (indiceAtual === -1) {
      indiceAtual = 0;
      aldeiaAtual = aldeiasDisponiveis[0];
      log(`Aldeia inválida. Indo para ID: ${aldeiasDisponiveis[0]}`);
      await sleep(3000);
      return location.href = atualizarParametroURL('village', aldeiasDisponiveis[0]);
    }

    const menu = $(`#am_widget_Farm a.farm_icon_${modoFarm}`).toArray();
    let ataquesNestaAldeia = 0;

    for (let elem of menu) {
      const tr = $(elem).closest('tr');
      if (tr.find('img.tooltip').length) continue;
      if (getNivelMuralha(tr) > maxMuralha) continue;

      const botaoAtaque = tr.find(`a.farm_icon_${modoFarm}`);
      if (botaoAtaque.hasClass('farm_icon_disabled')) continue;
      if (!temTropas()) {
        log('Sem tropas disponíveis. Finalizando ciclo.');
        break;
      }

      const delay = rand(tempoCliqueMin, tempoCliqueMax);
      log(`Enviando ataque em ${delay}ms`);
      await sleep(delay);

      botaoAtaque.trigger('mouseover').click();
      ataquesNestaAldeia++;
    }

    const delayReload = rand(intervaloMin, intervaloMax);

    if (ataquesNestaAldeia > 0) {
      log(`Enviados ${ataquesNestaAldeia} ataques. Esperando ~${Math.round(delayReload/60000)} min antes de alternar aldeia.`);
      await sleep(delayReload);

      if (aldeiasDisponiveis.length > 1) {
        const proximoIdx = (indiceAtual + 1) % aldeiasDisponiveis.length;
        const proximaAldeia = aldeiasDisponiveis[proximoIdx];
        log(`Alternando para aldeia ID: ${proximaAldeia}`);
        return location.href = atualizarParametroURL('village', proximaAldeia);
      }

      log('Apenas uma aldeia disponível. Recarregando a mesma.');
      return location.reload();
    }

    // Se não enviou nenhum ataque
    if (aldeiasDisponiveis.length > 1) {
      const proximoIdx = (indiceAtual + 1) % aldeiasDisponiveis.length;
      const proximaAldeia = aldeiasDisponiveis[proximoIdx];
      log(`Nenhum ataque possível nesta aldeia. Alternando para ID: ${proximaAldeia} após ~${Math.round(delayReload/60000)} min.`);
      await sleep(delayReload);
      return location.href = atualizarParametroURL('village', proximaAldeia);
    }

    log(`Nenhum ataque possível em qualquer aldeia. Recarregando após ~${Math.round(delayReload/60000)} min.`);
    await sleep(delayReload);
    location.reload();
  }

  /***************
   * 5. FUNÇÕES AUXILIARES
   ***************/
  function getNivelMuralha(tr) {
    const td = tr.find('td:nth-child(7)');
    const nivel = parseInt(td.text().trim());
    return isNaN(nivel) ? 0 : nivel;
  }

  function temTropas() {
    let tem = false;
    $('#units_home td[data-unit-count]').each(function () {
      if (parseInt($(this).attr('data-unit-count')) > 0) {
        tem = true;
        return false;
      }
    });
    return tem;
  }

  function atualizarParametroURL(chave, valor) {
    const url = new URL(window.location.href);
    url.searchParams.set(chave, valor);
    return url.toString();
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /***************
   * 6. CONSOLE VISUAL (MODAL)
   ***************/
  function createConsoleModal() {
    const newQuest = document.querySelector('#new_quest');
    if (!newQuest) return;

    const icon = document.createElement('div');
    icon.id = 'autofarm_console_icon';
    icon.title = 'Abrir Console AutoFarm';
    icon.style.cssText = `
      font-size:9pt; width:25px; height:25px; border:1px solid #603000;
      background-color:#E9D0A9; margin:10px; cursor:pointer;
      background-image:url('https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif');
      background-repeat:no-repeat; background-position:center;
      border-radius:3px; box-shadow:2px 2px 2px rgba(60,30,0,0.7);
    `;
    newQuest.parentNode.insertBefore(icon, newQuest.nextSibling);

    const modal = document.createElement('div');
    modal.id = 'autofarm_console_modal';
    modal.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      width:450px; max-height:300px; transform:translate(-50%,-50%);
      background:#2e1f00; border:2px solid #603000; border-radius:6px;
      color:#fff; font-family:monospace; font-size:12px;
      overflow-y:auto; padding:10px; z-index:999999;
    `;
    document.body.appendChild(modal);

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    btnClose.style.cssText = `
      position:absolute; top:6px; right:6px; background:#603000;
      border:none; color:#fff; padding:2px 8px; border-radius:3px;
      cursor:pointer; font-size:11px;
    `;
    btnClose.onclick = () => modal.style.display = 'none';
    modal.appendChild(btnClose);

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = `Trocar para FARM ${modoFarm === 'a' ? 'C' : 'A'}`;
    toggleBtn.style.cssText = `
      margin-top:5px; background:#785000; border:none;
      color:#fff; padding:4px 10px; border-radius:4px;
      cursor:pointer; font-size:11px;
    `;
    toggleBtn.onclick = () => {
      modoFarm = modoFarm === 'a' ? 'c' : 'a';
      localStorage.setItem('modoFarm', modoFarm);
      toggleBtn.textContent = `Trocar para FARM ${modoFarm === 'a' ? 'C' : 'A'}`;
      log(`Modo FARM alterado para: ${modoFarm.toUpperCase()}. Recarregue a página para aplicar.`);
    };
    modal.appendChild(toggleBtn);

    const logs = document.createElement('div');
    logs.id = 'autofarm_console_logs';
    logs.style.cssText = `
      margin-top:10px; max-height:230px; overflow-y:auto;
      white-space:pre-wrap; word-break:break-word;
    `;
    modal.appendChild(logs);

    icon.onclick = () => {
      modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    };

    window.log = function (msg) {
      const time = new Date().toLocaleTimeString();
      const entry = `[${time}] ${msg}\n`;
      logs.textContent += entry;
      logs.scrollTop = logs.scrollHeight;
      console.log(entry.trim());
    };
  }

})();
