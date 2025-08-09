// Ative (true) ou desative (false) cada tipo de unidade
var lanca = true;               // Lanceiros
var espada = true;              // Espadachins
var barbaro = false;              // Bárbaros
var arqueiro = false;            // Arqueiros
var explorador = true;           // Exploradores (espiões)
var cavalariaLeve = false;        // Cavalaria leve
var cavalariaArqueiro = false;   // Cavalaria arqueira
var cavalariaPesada = true;      // Cavalaria pesada
var ariete = false;               // Arietes
var catapulta = false;            // Catapultas

// Quantidade total desejada para cada unidade
const limiteTropas = {
    spear:      9300,       // Lanceiros 
    sword:      4000,       // Espadachins 
    axe:        0,    // Bárbaros 
    archer:     0,       // Arqueiros 
    spy:        250,     // Exploradores 
    light:      0,    // Cavalaria 
    marcher:    0,       // Cavalaria arqueira
    heavy:      1200,     // Cavalaria pesada
    ram:        0,     // Arietes
    catapult:   0      // Catapultas
};