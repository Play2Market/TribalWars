// ==UserScript==
// @name         ColetarArmazem_Aldeias
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Coleta informações do armazém (recursos + porcentagens por tipo)
// @author       De Jesus
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// @require      https://raw.githubusercontent.com/Play2Market/TribalWars/main/ColetorDados/Coletar_Aldeias.js
// ==/UserScript==

(function () {
    'use strict';

    const CACHE_KEY = 'armazemCache';
    const CACHE_TIME_MS = 60 * 60 * 1000;
    let dadosArmazem = {};

    function salvarCache(dados) {
        const data = {
            timestamp: Date.now(),
            info: dados
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }

    function lerCache() {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('⚠️ Erro ao ler cache do armazém:', e);
            return null;
        }
    }

    function cacheValido(cache) {
        return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
    }

    function processarAldeia(id, callback) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/game.php?village=${id}&screen=storage`;

        iframe.onload = () => {
            try {
                const doc = iframe.contentDocument;

                const madeira = parseInt(doc.querySelector('#wood')?.textContent.replace(/\D/g, '')) || 0;
                const argila = parseInt(doc.querySelector('#stone')?.textContent.replace(/\D/g, '')) || 0;
                const ferro = parseInt(doc.querySelector('#iron')?.textContent.replace(/\D/g, '')) || 0;
                const capacidade = parseInt(doc.querySelector('#storage')?.textContent.replace(/\D/g, '')) || 1;

                const percMadeira = ((madeira / capacidade) * 100).toFixed(2);
                const percArgila = ((argila / capacidade) * 100).toFixed(2);
                const percFerro = ((ferro / capacidade) * 100).toFixed(2);

                dadosArmazem[id] = {
                    madeira,
                    argila,
                    ferro,
                    capacidade,
                    porcentagens: {
                        madeira: percMadeira,
                        argila: percArgila,
                        ferro: percFerro
                    }
                };

                console.log(`🏰 Aldeia ${id}`);
                console.log(`   📦 Madeira: ${madeira} (${percMadeira}%)`);
                console.log(`   📦 Argila: ${argila} (${percArgila}%)`);
                console.log(`   📦 Ferro: ${ferro} (${percFerro}%)`);
                console.log(`   🧱 Capacidade total: ${capacidade}`);
            } catch (e) {
                console.warn(`⚠️ Erro ao processar armazém da aldeia ${id}:`, e);
            } finally {
                iframe.remove();
                callback();
            }
        };

        document.body.appendChild(iframe);
    }

    function processarAldeias(ids, done) {
        let i = 0;
        function next() {
            if (i >= ids.length) {
                done();
                return;
            }
            processarAldeia(ids[i++], next);
        }
        next();
    }

    function iniciarColeta() {
        if (typeof window.getAldeiasDisponiveis !== 'function') {
            console.warn('⚠️ Função getAldeiasDisponiveis() não encontrada.');
            return;
        }

        const ids = window.getAldeiasDisponiveis();
        if (!ids || ids.length === 0) {
            console.warn('⚠️ Nenhuma aldeia disponível.');
            return;
        }

        console.log(`🔄 Coletando dados do armazém de ${ids.length} aldeias...`);

        processarAldeias(ids, () => {
            salvarCache(dadosArmazem);
            console.log('✅ Coleta de armazém finalizada:', dadosArmazem);
        });
    }

    function aguardarDependencia(callback) {
        const MAX_TENTATIVAS = 20;
        let tentativas = 0;

        function verificar() {
            if (typeof window.getAldeiasDisponiveis === 'function') {
                callback();
            } else if (tentativas++ < MAX_TENTATIVAS) {
                setTimeout(verificar, 500);
            } else {
                console.warn('⚠️ getAldeiasDisponiveis() não disponível após várias tentativas.');
            }
        }

        verificar();
    }

    window.getArmazemAldeias = function () {
        return dadosArmazem;
    };

    window.forcarColetaArmazem = function () {
        iniciarColeta();
    };

    const cache = lerCache();
    if (cacheValido(cache)) {
        dadosArmazem = cache.info;
        console.log('📦 Dados do armazém carregados do cache:', dadosArmazem);
    } else {
        aguardarDependencia(iniciarColeta);
    }
})();
