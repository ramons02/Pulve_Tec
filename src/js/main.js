import Lenis from 'lenis';
import { World3D, isWebGLAvailable } from './World3D.js';
import { ScrollAnimation } from './ScrollAnimation.js';
import { createDrone, createContactShadow, updateSprayMist } from './Drone.js';

const canvas = document.querySelector('#webgl-canvas');
const photoBg = document.querySelector('#photo-bg');

if (!isWebGLAvailable()) {
  // A foto de fundo (#photo-bg) é HTML/CSS puro e já está visível
  // independente disso — sem WebGL, só não desenhamos o drone por cima.
  canvas.hidden = true;
} else {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  const world = new World3D('#webgl-canvas');

  const shadow = createContactShadow();
  shadow.position.set(0, -1.05, 0);
  shadow.scale.set(1.5, 1.5, 1);
  world.scene.add(shadow);

  const model = createDrone();
  world.scene.add(model);
  new ScrollAnimation(model, photoBg);

  // Posição-base da câmera (definida em World3D.initCamera) — o parallax do
  // mouse soma um deslocamento a partir dela, em vez de mirar direto em
  // (0, 0), senão o lerp abaixo ia "achatar" a elevação da câmera com o
  // tempo.
  const baseCameraX = world.camera.position.x;
  const baseCameraY = world.camera.position.y;

  let mouseX = 0;
  let mouseY = 0;

  if (!prefersReducedMotion) {
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    });
  }

  let animationId;

  function animate() {
    animationId = requestAnimationFrame(animate);

    world.camera.position.x += (baseCameraX + mouseX - world.camera.position.x) * 0.05;
    world.camera.position.y += (baseCameraY - mouseY - world.camera.position.y) * 0.05;

    // A sombra acompanha a posição/escala do drone (que a timeline do GSAP
    // em ScrollAnimation.js altera) — sem isso, o drone "flutua" fora do
    // alcance da própria sombra assim que se move no scroll.
    shadow.position.x = model.position.x;
    shadow.position.z = model.position.z;
    shadow.scale.setScalar(1.5 * model.scale.x);

    // Hélices girando e neblina de pulverização caindo continuamente,
    // independente do scroll — reforça a sensação de drone em operação
    // sem competir com o parallax do GSAP.
    if (!prefersReducedMotion) {
      model.userData.rotors.forEach((rotor) => {
        rotor.rotation.y += 0.5;
      });
      model.userData.mistEmitters.forEach(updateSprayMist);
    }

    world.render();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate();
    }
  });

  // Safari no iOS (e navegadores mobile em geral) derruba o contexto WebGL
  // sob pressão de memória — trocar de app, várias abas abertas — sem
  // avisar por erro no console. Sem tratar isso, o canvas fica congelado
  // num frame antigo indefinidamente. `preventDefault()` é obrigatório
  // pro navegador permitir restaurar o contexto depois; aqui optamos por
  // parar e esconder o canvas (a foto de fundo continua normal) em vez de
  // tentar recriar toda a cena, que é bem mais frágil.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(animationId);
    canvas.hidden = true;
  });

  animate();
}
