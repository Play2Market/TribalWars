// Ative (true) ou desative (false) cada tipo de unidade
var lanca = false;               // Lanceiros
var espada = false;              // Espadachins
var barbaro = true;              // Bárbaros
var arqueiro = false;            // Arqueiros
var explorador = true;           // Exploradores (espiões)
var cavalariaLeve = true;        // Cavalaria leve
var cavalariaArqueiro = true;   // Cavalaria arqueira
var cavalariaPesada = false;      // Cavalaria pesada
var ariete = true;               // Arietes
var catapulta = false;            // Catapultas

// Quantidade total desejada para cada unidade
const limiteTropas = {
    spear:      0,       // Lanceiros 
    sword:      0,       // Espadachins 
    axe:        6650,    // Bárbaros 
    archer:     0,       // Arqueiros 
    spy:        250,     // Exploradores 
    light:      2900,    // Cavalaria 
    marcher:    0,       // Cavalaria arqueira
    heavy:      0,     // Cavalaria pesada
    ram:        450,     // Arietes
    catapult:   0      // Catapultas
};