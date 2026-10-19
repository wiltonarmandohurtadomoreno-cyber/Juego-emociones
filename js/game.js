// ===== Dino Runner - Mundo Emocional (Phaser 3) =====
const W = 1280;
const H = 720;
const GROUND_Y = 600;      // y donde pisa el dino
const INK = 0x535353;      // color "pixel" estilo Chrome

// Contenido de las ventanas modales (una por estrella, en orden)
const LESSONS = [
  { color: 0x3b82f6, title: '¡Bienvenido a tu mundo emocional!',
    body: 'Hola pequeño explorador, hoy aprenderemos a reconocer nuestras emociones. ¡Vamos a divertirnos!' },
  { color: 0xf5b301, title: 'La alegría',
    body: 'La alegría nos hace sentir felices. Podemos compartir nuestra felicidad con los demás.' },
  { color: 0x4a78c2, title: 'La tristeza',
    body: 'Está bien sentirse triste. Podemos hablar con alguien de confianza para sentirnos mejor.' },
  { color: 0xe53935, title: 'El enojo',
    body: 'Cuando sentimos enojo, podemos respirar profundo y calmarnos antes de actuar.' },
  { color: 0x8e44ad, title: 'El miedo',
    body: 'Todos sentimos miedo alguna vez. Pedir ayuda a un adulto está bien.' },
  { color: 0x26a69a, title: 'La calma',
    body: 'Respira despacio, relaja tu cuerpo y dale tiempo a tu mente para tranquilizarte.' },
  { color: 0xec6ea0, title: 'La empatía',
    body: 'Si un amigo está triste, podemos escucharlo, acompañarlo y tratarlo con cariño.' },
  { color: 0xf57c00, title: 'Resolver conflictos',
    body: 'Cuando tenemos un problema, podemos hablar con respeto y buscar una solución pacífica.' },
  { color: 0x43a047, title: 'Mi termómetro emocional',
    body: 'Todas las emociones son importantes. Reconocer lo que sentimos nos ayuda a entendernos mejor.' },
  { color: 0xffb300, title: '¡Felicitaciones! ¡Lo lograste!',
    body: 'Ahora sabes que puedes expresar tus emociones con respeto y aprender de ellas.' }
];

// Utilidad: genera una textura dibujando con Graphics
function makeTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(INK, 1);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// ---------- 1) BOOT: carga solo el sprite de la pantalla de carga ----------
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    // 1280x720 = 2 columnas x 3 filas de 640x240 -> 6 frames
    this.load.spritesheet('loading', 'img/loading.png', { frameWidth: 1280, frameHeight: 720 });
    this.load.image('hada', 'img/hada.png');   // hoja 256x256 con 3 poses
    this.load.image('fondo', 'img/fondo.png'); // fondo 960x540 (se escala a 1280x720)
    this.load.image('suelo', 'img/suelo.png'); // franja de suelo 960x90 (se repite)
    this.load.image('star', 'img/estrella.png'); // estrella coleccionable
  }
  create() { this.scene.start('Preload'); }
}

// ---------- 2) PRELOAD: muestra "CARGANDO" y genera las texturas ----------
class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  create() {
    this.cameras.main.setBackgroundColor('#f7f7f7');
    const img = this.add.sprite(W / 2, H / 2, 'loading', 0);

    this.createTextures();

    // Los assets se generan por código, así que simulamos el progreso
    // y avanzamos el frame del sprite (0..5) según el avance.
    this.tweens.addCounter({
      from: 0, to: 1, duration: 3000,
      onUpdate: (t) => img.setFrame(Math.min(5, Math.floor(t.getValue() * 6))),
      onComplete: () => this.time.delayedCall(300, () => this.scene.start('Game'))
    });
  }

  createTextures() {
    // Personaje (hada): 3 poses dentro de img/hada.png (256x256)
    const hada = this.textures.get('hada');
    hada.add('f0', 0, 0, 0, 88, 95);     // vuelo 1
    hada.add('f1', 0, 88, 0, 88, 95);    // vuelo 2
    hada.add('f2', 0, 0, 95, 88, 95);    // salto

    // Versión agachada (poses 0 y 1 aplastadas)
    const src = hada.getSourceImage();
    [['hada_duck1', 0], ['hada_duck2', 88]].forEach(([key, sx]) => {
      if (this.textures.exists(key)) return;
      const t = this.textures.createCanvas(key, 96, 64);
      t.context.drawImage(src, sx, 0, 88, 95, 0, 0, 96, 64);
      t.refresh();
    });

    // Cajas de madera (obstáculos de suelo)
    const crate = (g, x, y, size) => {
      g.fillStyle(0xc98a4b, 1); g.fillRect(x, y, size, size);
      g.lineStyle(5, 0x7a4a1f, 1); g.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
      g.lineStyle(4, 0x7a4a1f, 1);
      g.lineBetween(x + 6, y + 6, x + size - 6, y + size - 6);
      g.lineBetween(x + size - 6, y + 6, x + 6, y + size - 6);
    };
    makeTexture(this, 'box1', 60, 60, (g) => crate(g, 0, 0, 60));                       // caja sola
    makeTexture(this, 'box2', 120, 60, (g) => { crate(g, 0, 0, 60); crate(g, 60, 0, 60); }); // dos juntas
    makeTexture(this, 'box3', 60, 120, (g) => { crate(g, 0, 0, 60); crate(g, 0, 60, 60); }); // apiladas

    // Pterodáctilo (alas arriba / abajo)
    makeTexture(this, 'bird1', 84, 56, (g) => {
      g.fillRect(14, 24, 54, 14);   // cuerpo
      g.fillRect(0, 22, 20, 8);     // cola
      g.fillRect(62, 16, 22, 12);   // cabeza
      g.fillRect(78, 20, 6, 4);     // pico
      g.fillRect(26, 4, 22, 20);    // ala arriba
    });
    makeTexture(this, 'bird2', 84, 56, (g) => {
      g.fillRect(14, 20, 54, 14);
      g.fillRect(0, 18, 20, 8);
      g.fillRect(62, 12, 22, 12);
      g.fillRect(78, 16, 6, 4);
      g.fillRect(26, 34, 22, 20);   // ala abajo
    });

    // Suelo y nube
    makeTexture(this, 'ground', 256, 12, (g) => {
      g.fillRect(0, 0, 256, 3);
      g.fillRect(30, 7, 8, 3); g.fillRect(90, 6, 4, 3);
      g.fillRect(150, 8, 14, 3); g.fillRect(220, 6, 6, 3);
    });
    if (!this.textures.exists('cloud')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xd0d0d0, 1);
      g.fillRect(12, 16, 76, 16); g.fillRect(28, 6, 28, 12); g.fillRect(0, 22, 14, 8);
      g.generateTexture('cloud', 92, 34);
      g.destroy();
    }

    // Animaciones
    this.anims.create({ key: 'run', frames: [{ key: 'hada', frame: 'f0' }, { key: 'hada', frame: 'f1' }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'duck', frames: [{ key: 'hada_duck1' }, { key: 'hada_duck2' }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'fly', frames: [{ key: 'bird1' }, { key: 'bird2' }], frameRate: 6, repeat: -1 });
  }
}

// ---------- 3) GAME ----------
class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBackgroundColor('#f7f7f7');

    this.speed = 500;        // px/s, aumenta con el tiempo
    this.score = 0;
    this.isOver = false;
    this.modalOpen = false;
    this.modal = null;
    this.modalReadyAt = 0;
    this.restartReadyAt = 0;
    this.traveled = 0;
    this.nextSpawn = 700;
    this.nextStar = 900;
    // El progreso de estrellas se conserva si el dino choca y reinicia
    this.starsCollected = this.registry.get('stars') || 0;
    try { this.hi = Number(localStorage.getItem('dinoHi') || 0); } catch (e) { this.hi = 0; }

    // Fondo (ya incluye nubes, montañas y colinas)
    this.add.image(W / 2, H / 2, 'fondo').setDisplaySize(W, H).setDepth(-10);
    this.clouds = this.add.group();   // sin nubes extra; el fondo ya las trae

    // Suelo visual + suelo físico invisible
    // Suelo (pasto + tierra) a escala 1.5, pegado al borde inferior; la superficie queda cerca de GROUND_Y
    this.groundTile = this.add.tileSprite(W / 2, H, W, 135, 'suelo').setOrigin(0.5, 1);
    this.groundTile.setTileScale(1.5, 1.5);
    const groundBody = this.add.rectangle(W / 2, GROUND_Y + 10, W, 20).setVisible(false);
    this.physics.add.existing(groundBody, true);

    // Dino
    this.dino = this.physics.add.sprite(160, GROUND_Y, 'hada', 'f0').setOrigin(0.5, 1);
    this.setDinoBody(false);
    this.dino.play('run');
    this.physics.add.collider(this.dino, groundBody);

    // Obstáculos
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.dino, this.obstacles, () => this.gameOver());

    // Estrellas
    this.stars = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.dino, this.stars, (dino, star) => this.collectStar(star));

    // UI
    const style = { fontFamily: 'monospace', fontSize: '32px', color: '#ffffff', stroke: '#1e3a8a', strokeThickness: 6 };
    this.scoreText = this.add.text(W - 30, 30, '', style).setOrigin(1, 0);
    this.starText = this.add.text(30, 30, '', { ...style, color: '#ffd21f' });
    this.msg = this.add.text(W / 2, H / 2 - 80, '', { ...style, fontSize: '56px' }).setOrigin(0.5);
    this.sub = this.add.text(W / 2, H / 2 - 20, '', style).setOrigin(0.5);

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.onPress());
    this.input.keyboard.on('keydown-UP', () => this.onPress());
    this.input.keyboard.on('keydown-ENTER', () => this.onPress());
    this.input.on('pointerdown', () => this.onPress());

    this.updateScoreText();
    this.updateStarText();
  }

  // Ajusta la hitbox según esté de pie o agachado
  setDinoBody(ducking) {
    if (ducking) this.dino.body.setSize(76, 50).setOffset(10, 14);
    else this.dino.body.setSize(50, 80).setOffset(19, 15);
  }

  onPress() {
    if (this.modalOpen) { this.closeModal(); return; }
    if (this.isOver) {
      if (this.time.now >= this.restartReadyAt) this.scene.restart();
      return;
    }
    if (this.onGround()) {
      this.dino.setVelocityY(-950);
      this.dino.anims.stop();
      this.dino.setTexture('hada', 'f2');
      this.setDinoBody(false);
    }
  }

  onGround() { return this.dino.body.touching.down || this.dino.body.blocked.down; }

  spawnCloud(x) {
    const c = this.add.image(x, Phaser.Math.Between(80, 300), 'cloud').setDepth(-1);
    this.clouds.add(c);
  }

  spawnObstacle() {
    // Los pterodáctilos aparecen después de cierto puntaje
    const canBird = this.score > 300;
    if (canBird && Phaser.Math.Between(0, 100) < 30) {
      const y = Phaser.Math.RND.pick([555, 500, 410]); // bajo (saltar), medio (agacharse), alto (pasar)
      const b = this.obstacles.create(W + 80, y, 'bird1');
      b.body.setSize(66, 36).setOffset(9, 10);
      b.play('fly');
      b.setVelocityX(-this.speed - 60);
    } else {
      const key = Phaser.Math.RND.pick(['box1', 'box2', 'box3']);
      const c = this.obstacles.create(W + 60, GROUND_Y, key).setOrigin(0.5, 1);
      c.body.setSize(c.width - 8, c.height - 4).setOffset(4, 4);
      c.setVelocityX(-this.speed);
    }
  }

  // ----- Estrellas y modales -----
  spawnStar() {
    const y = Phaser.Math.RND.pick([470, 400]); // hay que saltar para tomarla
    const s = this.stars.create(W + 60, y, 'star');
    const r = Math.min(s.width, s.height) * 0.42;   // hitbox circular ajustada a la imagen
    s.body.setCircle(r, s.width / 2 - r, s.height / 2 - r);
    s.setVelocityX(-this.speed);
    this.tweens.add({ targets: s, angle: { from: -12, to: 12 }, yoyo: true, repeat: -1, duration: 450 });
  }

  collectStar(star) {
    if (this.modalOpen || this.isOver) return;
    star.destroy();
    const n = this.starsCollected;           // índice de la lección
    this.starsCollected++;
    this.registry.set('stars', this.starsCollected);
    this.updateStarText();
    this.showModal(LESSONS[n], this.starsCollected);
  }

  showModal(lesson, n) {
    this.modalOpen = true;
    this.physics.pause();
    this.anims.pauseAll();
    this.modalReadyAt = this.time.now + 500;  // evita cerrarlo con el mismo salto

    const ui = this.add.container(W / 2, H / 2).setDepth(100);
    const shade = this.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.55);

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(-430, -210, 860, 420, 28);
    panel.lineStyle(8, lesson.color, 1);
    panel.strokeRoundedRect(-430, -210, 860, 420, 28);
    panel.fillStyle(lesson.color, 1);
    panel.fillRoundedRect(-430, -210, 860, 18, { tl: 28, tr: 28, bl: 0, br: 0 });

    const font = 'Arial, Helvetica, sans-serif';
    const badge = this.add.text(0, -165, `★ ${n} de ${LESSONS.length}`, {
      fontFamily: font, fontSize: '26px', color: '#d98f00', fontStyle: 'bold'
    }).setOrigin(0.5);
    const title = this.add.text(0, -100, lesson.title, {
      fontFamily: font, fontSize: '44px', color: hex(lesson.color), fontStyle: 'bold',
      align: 'center', wordWrap: { width: 780 }
    }).setOrigin(0.5);
    const body = this.add.text(0, 10, lesson.body, {
      fontFamily: font, fontSize: '32px', color: '#444444',
      align: 'center', wordWrap: { width: 740 }
    }).setOrigin(0.5);

    const last = n >= LESSONS.length;
    const btn = this.add.rectangle(0, 150, 280, 60, lesson.color).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(0, 150, last ? 'Terminar ▶' : 'Continuar ▶', {
      fontFamily: font, fontSize: '30px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    ui.add([shade, panel, badge, title, body, btn, btnText]);
    ui.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: ui, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    this.modal = ui;
  }

  closeModal() {
    if (!this.modalOpen || this.time.now < this.modalReadyAt) return;
    this.modal.destroy();
    this.modal = null;
    this.modalOpen = false;
    this.physics.resume();
    this.anims.resumeAll();
    if (this.starsCollected >= LESSONS.length) this.win();
  }

  win() {
    this.isOver = true;
    this.physics.pause();
    this.dino.anims.stop();
    this.dino.setTexture('hada', 'f2');
    this.registry.set('stars', 0);
    this.restartReadyAt = this.time.now + 700;
    this.msg.setText('¡LO LOGRASTE!');
    this.sub.setText('Presiona ESPACIO o toca la pantalla para jugar de nuevo');
  }

  updateStarText() {
    this.starText.setText(`★ ${this.starsCollected}/${LESSONS.length}`);
  }

  updateScoreText() {
    const pad = (n) => String(Math.floor(n)).padStart(5, '0');
    this.scoreText.setText(`HI ${pad(this.hi)}   ${pad(this.score)}`);
  }

  gameOver() {
    if (this.isOver) return;
    this.isOver = true;
    this.physics.pause();
    this.dino.anims.stop();
    this.dino.setTint(0xcc3333);
    this.restartReadyAt = this.time.now + 300;
    if (this.score > this.hi) {
      this.hi = Math.floor(this.score);
      try { localStorage.setItem('dinoHi', String(this.hi)); } catch (e) {}
    }
    this.updateScoreText();
    this.msg.setText('GAME OVER');
    this.sub.setText('Presiona ESPACIO o toca la pantalla para reiniciar');
  }

  update(time, delta) {
    if (this.isOver || this.modalOpen) return;
    const dt = delta / 1000;

    // Dificultad progresiva
    this.speed = Math.min(1000, this.speed + 6 * dt);
    this.score += this.speed * dt * 0.02;
    this.updateScoreText();

    // Mover suelo y nubes
    this.groundTile.tilePositionX += (this.speed * dt) / 1.5;
    this.clouds.getChildren().forEach((c) => {
      c.x -= this.speed * 0.15 * dt;
      if (c.x < -100) c.destroy();
    });

    // Agacharse / caída rápida
    const down = this.cursors.down.isDown;
    const grounded = this.onGround();
    if (grounded) {
      if (down) {
        if (this.dino.anims.currentAnim?.key !== 'duck') { this.dino.play('duck'); this.setDinoBody(true); }
      } else if (this.dino.anims.currentAnim?.key !== 'run') {
        this.dino.play('run'); this.setDinoBody(false);
      }
    } else if (down) {
      this.dino.setVelocityY(1300);
    }

    // Generar obstáculos por distancia recorrida (siempre hay espacio para saltar)
    this.traveled += this.speed * dt;
    this.nextSpawn -= this.speed * dt;
    if (this.nextSpawn <= 0) {
      this.spawnObstacle();
      this.nextSpawn = Phaser.Math.Between(600, 1100) + this.speed * 0.4;
    }

    // Generar estrellas (una a la vez, hasta completar las 10)
    this.nextStar -= this.speed * dt;
    if (this.nextStar <= 0 && this.starsCollected < LESSONS.length && this.stars.countActive() === 0) {
      this.spawnStar();
      this.nextStar = Phaser.Math.Between(1500, 2200);
    }

    // Mantener velocidad y limpiar obstáculos fuera de pantalla
    this.obstacles.getChildren().forEach((o) => {
      const isBird = o.texture.key.startsWith('bird');
      o.body.setVelocityX(-this.speed - (isBird ? 60 : 0));
      if (o.x < -120) o.destroy();
    });
    this.stars.getChildren().forEach((s) => {
      s.body.setVelocityX(-this.speed);
      if (s.x < -80) s.destroy();
    });
  }
}

// ---------- Configuración ----------
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#f7f7f7',
  physics: { default: 'arcade', arcade: { gravity: { y: 2400 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Preload, Game]
});