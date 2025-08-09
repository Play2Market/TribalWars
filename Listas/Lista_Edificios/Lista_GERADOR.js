//EM DESENVOLVIMENTO

// Função auxiliar para facilitar a adição de construções na lista
function adicionarConstrucao(lista, edificio, nivel) {
    // Garante que não adicionamos níveis inválidos como 0 ou negativos
    if (nivel > 0) {
        lista.push(`main_buildlink_${edificio}_${nivel}`);
    }
}

// --- DEFINIÇÃO DOS NÍVEIS MÁXIMOS ---
const max_recursos = 30;
const max_principal = 20;
const max_quartel = 25;
const max_estabulo = 20;
const max_mercado = 20;
const max_muralha = 20;

// --- ESTADO INICIAL DOS NÍVEIS ---
let nv_bosque = 0;
let nv_argila = 0;
let nv_ferro = 0;
let nv_principal = 0;
let nv_quartel = 0;
let nv_estabulo = 0;
let nv_ferreiro = 0;
let nv_mercado = 0;
let nv_muralha = 0;

// --- CONTADORES PARA OS GATILHOS ---
let contador_recursos = 0;
let contador_principal = 0;
let contador_quartel = 0;
let contador_estabulo = 0;
let contador_mercado = 0;

// --- FLAG PARA O MARCO ESPECIAL ---
let marco_principal_10_alcancado = false;

// --- LISTA FINAL ---
const Sequência_Construção_Recursos = [];

// --- LOOP PRINCIPAL ---
// O loop continua enquanto algum edifício ainda não atingiu seu nível máximo
while (
    nv_bosque < max_recursos || nv_argila < max_recursos || nv_ferro < max_recursos ||
    nv_principal < max_principal || nv_quartel < max_quartel || nv_estabulo < max_estabulo ||
    nv_mercado < max_mercado || nv_muralha < max_muralha
) {
    // --- VERIFICAÇÃO DO MARCO ESPECIAL: Edifício Principal Nv. 10 ---
    if (nv_principal >= 10 && !marco_principal_10_alcancado) {
        // Constrói Ferreiro do 1 ao 5
        for (let i = 1; i <= 5; i++) {
            adicionarConstrucao(Sequência_Construção_Recursos, 'smith', i);
        }
        nv_ferreiro = 5;

        // Constrói Estábulo do 1 ao 3
        for (let i = 1; i <= 3; i++) {
            adicionarConstrucao(Sequência_Construção_Recursos, 'stable', i);
        }
        nv_estabulo = 3;

        marco_principal_10_alcancado = true; // Marca o marco como concluído para não repetir
    }

    // --- AÇÃO PRINCIPAL: CONSTRUIR RECURSOS ---
    let recursoConstruido = false;
    if (nv_bosque < max_recursos && nv_bosque <= nv_argila && nv_bosque <= nv_ferro) {
        nv_bosque++;
        adicionarConstrucao(Sequência_Construção_Recursos, 'wood', nv_bosque);
        contador_recursos++;
        recursoConstruido = true;
    } else if (nv_argila < max_recursos && nv_argila <= nv_bosque && nv_argila <= nv_ferro) {
        nv_argila++;
        adicionarConstrucao(Sequência_Construção_Recursos, 'stone', nv_argila);
        contador_recursos++;
        recursoConstruido = true;
    } else if (nv_ferro < max_recursos) {
        nv_ferro++;
        adicionarConstrucao(Sequência_Construção_Recursos, 'iron', nv_ferro);
        contador_recursos++;
        recursoConstruido = true;
    }
    
    // Se todos os recursos estiverem no máximo, força os outros gatilhos a dispararem
    if (!recursoConstruido) {
        contador_recursos = 4;
    }

    // --- VERIFICAÇÃO DOS GATILHOS ---

    // Gatilho: a cada 4 de recursos -> 1 principal
    if (contador_recursos >= 4 && nv_principal < max_principal) {
        nv_principal++;
        adicionarConstrucao(Sequência_Construção_Recursos, 'main', nv_principal);
        contador_principal++;
        contador_recursos = 0; // Reseta o contador
    }

    // Gatilho: a cada 3 de principal -> 2 quartel
    if (contador_principal >= 3 && nv_quartel < max_quartel) {
        for (let i = 0; i < 2; i++) {
            if (nv_quartel < max_quartel) {
                nv_quartel++;
                adicionarConstrucao(Sequência_Construção_Recursos, 'barracks', nv_quartel);
                contador_quartel++;
            }
        }
        contador_principal = 0; // Reseta o contador
    }

    // Gatilho: a cada 2 de quartel -> 2 estábulo (só ativa depois do estábulo ser construído)
    if (contador_quartel >= 2 && nv_estabulo > 0 && nv_estabulo < max_estabulo) {
        for (let i = 0; i < 2; i++) {
            if (nv_estabulo < max_estabulo) {
                nv_estabulo++;
                adicionarConstrucao(Sequência_Construção_Recursos, 'stable', nv_estabulo);
                contador_estabulo++;
            }
        }
        contador_quartel = 0; // Reseta o contador
    }

    // Gatilho: a cada 2 de estábulo -> 2 mercado
    if (contador_estabulo >= 2 && nv_mercado < max_mercado) {
        for (let i = 0; i < 2; i++) {
            if (nv_mercado < max_mercado) {
                nv_mercado++;
                adicionarConstrucao(Sequência_Construção_Recursos, 'market', nv_mercado);
                contador_mercado++;
            }
        }
        contador_estabulo = 0; // Reseta o contador
    }

    // Gatilho: a cada 2 de mercado -> 1 muralha
    if (contador_mercado >= 2 && nv_muralha < max_muralha) {
        nv_muralha++;
        adicionarConstrucao(Sequência_Construção_Recursos, 'wall', nv_muralha);
        contador_mercado = 0; // Reseta o contador
    }
}