import * as THREE from 'three';

/**
 * Detecta suporte a WebGL antes de instanciar qualquer coisa pesada.
 * Sem essa checagem, dispositivos/navegadores sem WebGL (economia de bateria,
 * hardware antigo, navegadores restritos) travam ou ficam com tela em branco.
 */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export class World3D {
  constructor(canvasSelector) {
    this.canvas = document.querySelector(canvasSelector);
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;

    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.handleResize();
  }

  initCamera() {
    // FOV mais fechado (não os 60°+ largos típicos de cena de jogo) pra
    // se aproximar da compressão de uma lente de verdade — ângulo muito
    // aberto é um dos motivos de uma cena 3D "cheirar" a CG/jogo.
    this.camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Câmera um pouco acima e atrás do drone, olhando de leve para baixo —
    // ângulo de "foto de produto", compatível com o drone sendo composto
    // por cima da foto do campo (ver #photo-bg em index.html/main.css).
    this.camera.position.set(0, 1.6, 6.5);
    this.camera.lookAt(0, 0, -1);
  }

  initRenderer() {
    // Celular/tablet (pointer grosso) costuma ter GPU bem mais fraca que a
    // contagem de pixels da tela sugere — um tablet grande em DPR alto
    // pode ter 3x mais pixels pra sombrear que um celular, com hardware
    // gráfico parecido ou pior. Antialiasing (MSAA) é uma das features
    // mais caras nessas GPUs, então desligamos em telas de toque.
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: !isTouchDevice,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Limitar o pixelRatio evita travar em telas 4K/Retina renderizando em
    // resolução muito acima do que o olho percebe — mais conservador em
    // touch, onde a GPU costuma ser o gargalo, não a nitidez.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
    // Tone mapping fílmico + espaço de cor sRGB: sem isso, materiais PBR do
    // Three.js renderizam "lavados"/lineares, um dos motivos clássicos de
    // uma cena 3D parecer asset de jogo em vez de render/foto.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  initLights() {
    // Luz quente e direcional, entrando de cima/esquerda — combina com a
    // direção da luz na foto de fundo (sol baixo, sombras caindo para a
    // direita da câmera). Ajuste isso se trocar a foto de fundo.
    const sunLight = new THREE.DirectionalLight(0xffd9a3, 3);
    sunLight.position.set(-4, 6, 3);
    this.scene.add(sunLight);

    // Fill frio e discreto, só pra suavizar o lado de sombra do drone sem
    // achatar o contraste que a luz quente cria.
    const fillLight = new THREE.HemisphereLight(0xbfd4ff, 0x1a1712, 0.35);
    this.scene.add(fillLight);
  }

  handleResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Libera geometrias, materiais e texturas da GPU. Chamar ao desmontar a
   * cena (troca de rota em SPA, etc.) — sem isso, memória de GPU vaza a
   * cada remontagem.
   */
  dispose() {
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value && typeof value.dispose === 'function') value.dispose();
          });
          material.dispose();
        });
      }
    });
    this.renderer.dispose();
  }
}
