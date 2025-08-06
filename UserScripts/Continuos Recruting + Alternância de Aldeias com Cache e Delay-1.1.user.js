// ==UserScript==
// @name         Continuos Recruting + Alternância de Aldeias com Cache e Delay
// @version      1.1
// @description  Recruta unidades e alterna aldeias a cada 4-12 minutos, esperando antes de trocar.
// @author       De Jesus + Victor Garé + Triky + Adaptado
// @match        https://*.tribalwars.com.br/*
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // Configs recrut
  var lanca = true;
  var espada = true;
  var barbaro = true;
  var arqueiro = true;
  var explorador = true;
  var cavalariaLeve = true;
  var cavalariaArqueiro = true;
  var cavalariaPesada = true;
  var catapulta = true;
  var ariete = true;

  var classEnum = Object.freeze({
    lanca: ".unit_sprite_smaller.spear",
    espada: ".unit_sprite_smaller.sword",
    barbaro: ".unit_sprite_smaller.axe",
    arqueiro: ".unit_sprite_smaller.archer",
    explorador: ".unit_sprite_smaller.spy",
    cavalariaLeve: ".unit_sprite_smaller.light",
    cavalariaArqueiro: ".unit_sprite_smaller.marcher",
    cavalariaPesada: ".unit_sprite_smaller.heavy",
    ariete: ".unit_sprite_smaller.ram",
    catapulta: ".unit_sprite_smaller.catapult",
  });

  const limiteTropas = {
    spear: 8300,
    sword: 3000,
    axe: 100,
    archer: 5000,
    spy: 500,
    light: 500,
    marcher: 0,
    heavy: 500,
    ram: 50,
    catapult: 100
  };

  const loteRecrutamento = 3;

  var objetoTropas = [];

  // Cache aldeias
  const CACHE_KEY = 'aldeiasCache';
  const CACHE_TIME_MS = 60 * 60 * 1000;

  function salvarCache(ids) {
    const data = { timestamp: Date.now(), aldeias: ids };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }

  function lerCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function cacheValido(cache) {
    return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
  }

  function coletarAldeiasDoDOM(doc) {
    const links = doc.querySelectorAll('a[href*="screen=overview"]');
    const ids = [];
    links.forEach(link => {
      const match = link.href.match(/village=(\d+)/);
      if (match && !ids.includes(match[1])) ids.push(match[1]);
    });
    if (ids.length > 0) {
      salvarCache(ids);
      console.log('✅ Aldeias coletadas:', ids);
      return ids;
    }
    console.log('⚠️ Nenhuma aldeia encontrada.');
    return [];
  }

  function tentarColetaViaIframe(callback) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '/game.php?screen=overview_villages';
    iframe.onload = () => {
      try {
        const aldeias = coletarAldeiasDoDOM(iframe.contentDocument);
        iframe.remove();
        callback(aldeias);
      } catch (e) {
        console.warn('⚠️ Falha ao coletar via iframe:', e);
        iframe.remove();
        callback([]);
      }
    };
    document.body.appendChild(iframe);
  }

  // Controle índice aldeia e alternância feita na reload
  const INDEX_KEY = 'aldeiaAtualIndex';

  function pegarIndiceAtual(aldeias) {
    let index = parseInt(localStorage.getItem(INDEX_KEY), 10);
    if (isNaN(index) || index >= aldeias.length) index = 0;
    return index;
  }

  function salvarIndice(index) {
    localStorage.setItem(INDEX_KEY, index.toString());
  }

  function irParaAldeia(aldeias, index) {
    const url = new URL(window.location.href);
    url.searchParams.set('village', aldeias[index]);
    url.searchParams.set('screen', 'train');
    if (window.location.href !== url.toString()) {
      window.location.href = url.toString();
      return true;
    }
    return false;
  }

  // Funções recrut
  function GerarObjeto() {
    objetoTropas = [
      { nomeUnidade: "spear", recrutar: lanca, cssClassSelector: classEnum.lanca },
      { nomeUnidade: "sword", recrutar: espada, cssClassSelector: classEnum.espada },
      { nomeUnidade: "axe", recrutar: barbaro, cssClassSelector: classEnum.barbaro },
      { nomeUnidade: "archer", recrutar: arqueiro, cssClassSelector: classEnum.arqueiro },
      { nomeUnidade: "spy", recrutar: explorador, cssClassSelector: classEnum.explorador },
      { nomeUnidade: "light", recrutar: cavalariaLeve, cssClassSelector: classEnum.cavalariaLeve },
      { nomeUnidade: "marcher", recrutar: cavalariaArqueiro, cssClassSelector: classEnum.cavalariaArqueiro },
      { nomeUnidade: "heavy", recrutar: cavalariaPesada, cssClassSelector: classEnum.cavalariaPesada },
      { nomeUnidade: "ram", recrutar: ariete, cssClassSelector: classEnum.ariete },
      { nomeUnidade: "catapult", recrutar: catapulta, cssClassSelector: classEnum.catapult },
    ];
  }

  function validarPreencher(singleObject) {
    if (!singleObject.recrutar) return false;

    const input = $("input[name=" + singleObject.nomeUnidade + "]");
    if (input.length === 0 || input.parent().is(":hidden")) return false;

    if ($(singleObject.cssClassSelector).length > 0) return false;

    const tr = input.closest("tr");
    const tdQuantidade = tr.find("td").eq(2);
    const textoQtd = tdQuantidade.text().trim();
    if (!textoQtd.includes("/")) return false;

    const partes = textoQtd.split("/");
    const qtdTotal = parseInt(partes[1].replace(/\D/g, "")) || 0;

    const limite = limiteTropas[singleObject.nomeUnidade];
    if (!limite || qtdTotal >= limite) {
      input.val("");
      return false;
    }

    const faltam = limite - qtdTotal;
    const qtdParaRecrutar = Math.min(faltam, loteRecrutamento);

    input.val(qtdParaRecrutar);

    return true;
  }

  // MAIN
  function iniciarRecrutamento() {
    GerarObjeto();

    let retorno = false;
    objetoTropas.forEach(el => {
      const res = validarPreencher(el);
      if (!retorno) retorno = res;
    });

    if (retorno) {
      $(".btn-recruit").click();
    }

    // Aguarda 4-12 minutos antes de alternar aldeia e recarregar
    const tempoMin = 4 * 60 * 1000;
    const tempoMax = 12 * 60 * 1000;
    const tempoAleatorio = Math.floor(Math.random() * (tempoMax - tempoMin + 1)) + tempoMin;

    console.log(`⏳ Esperando ${Math.round(tempoAleatorio / 60000)} minutos antes da próxima alternância.`);

    setTimeout(() => {
      // Muda índice aldeia e navega para próxima aldeia
      const cache = lerCache();
      if (!cache || !cache.aldeias || cache.aldeias.length === 0) {
        // Sem cache, tenta coletar antes
        tentarColetaViaIframe((aldeias) => {
          if (aldeias.length === 0) {
            console.warn('⚠️ Não foi possível coletar aldeias para alternância.');
            location.reload(true); // recarrega normal para tentar de novo
            return;
          }
          let idx = pegarIndiceAtual(aldeias);
          idx = (idx + 1) % aldeias.length;
          salvarIndice(idx);
          irParaAldeia(aldeias, idx);
        });
      } else {
        let idx = pegarIndiceAtual(cache.aldeias);
        idx = (idx + 1) % cache.aldeias.length;
        salvarIndice(idx);
        irParaAldeia(cache.aldeias, idx);
      }
    }, tempoAleatorio);
  }

  // Fluxo inicial
  const url = window.location.href;

  if (url.includes('screen=overview_villages')) {
    coletarAldeiasDoDOM(document);
    // Não faz mais nada nesta página
  } else {
    // Na página de treino
    iniciarRecrutamento();
  }

})();
