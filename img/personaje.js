(function(window) {
Símbolo_1_instancia_1 = function() {
	this.initialize();
}
Símbolo_1_instancia_1._SpriteSheet = new createjs.SpriteSheet({images: ["personaje.png"], frames: [[0,0,88,94,0,0,0],[88,0,88,94,0,0,0],[0,94,88,94,0,0,0]]});
var Símbolo_1_instancia_1_p = Símbolo_1_instancia_1.prototype = new createjs.Sprite();
Símbolo_1_instancia_1_p.Sprite_initialize = Símbolo_1_instancia_1_p.initialize;
Símbolo_1_instancia_1_p.initialize = function() {
	this.Sprite_initialize(Símbolo_1_instancia_1._SpriteSheet);
	this.paused = false;
}
window.Símbolo_1_instancia_1 = Símbolo_1_instancia_1;
}(window));

