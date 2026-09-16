import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Timeline do drone sincronizada ao scroll. O número de "etapas" se ajusta
 * à quantidade de seções em #app-content, então adicionar/remover uma
 * seção não exige recalcular nada aqui.
 */
export class ScrollAnimation {
  constructor(model, photoBg) {
    this.model = model;
    this.photoBg = photoBg;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initTimeline();
  }

  initTimeline() {
    if (!this.model) return;

    const scrub = this.prefersReducedMotion ? false : 1.2;
    const intensity = this.prefersReducedMotion ? 0.15 : 1;
    const sectionCount = document.querySelectorAll('#app-content .section').length || 4;
    const stages = Math.max(sectionCount - 1, 1);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#app-content',
        start: 'top top',
        end: 'bottom bottom',
        scrub
      }
    });

    // Sobrevoo que passeia pela tela toda — cada etapa visita um ponto
    // (x, y, z) diferente, combinando senos fora de fase pra cobrir cantos
    // variados (cima/baixo, esquerda/direita) em vez de só alternar
    // esquerda-direita numa mesma altura. Determinístico (mesma seed a
    // cada carga), não aleatório, pra não pular no reload.
    for (let stage = 0; stage < stages; stage += 1) {
      const isLast = stage === stages - 1;
      const n = stage + 1;

      if (isLast) {
        tl.to(this.model.rotation, { y: 0, z: 0 }, stage)
          .to(this.model.position, { x: 0, y: 0, z: 0 }, stage)
          .to(this.model.scale, { x: 1, y: 1, z: 1 }, stage);
      } else {
        const x = Math.sin(n * 2.4) * 1.9 * intensity;
        const y = Math.cos(n * 1.7) * 1.1 * intensity;
        const z = Math.sin(n * 1.1) * 0.5 * intensity;
        const side = Math.sin(n * 2.4) >= 0 ? 1 : -1;

        tl.to(this.model.rotation, { y: 0.35 * side * intensity, z: 0.12 * side * intensity }, stage)
          .to(this.model.position, { x, y, z }, stage)
          .to(this.model.scale, { x: 1.12, y: 1.12, z: 1.12 }, stage);
      }
    }

    if (this.photoBg) {
      // Zoom da foto de fundo atrelado 1:1 à posição do scroll — não à
      // duração das outras tweens (que por padrão duram só 0.5 "unidade").
      // Sem duration explícito aqui, o zoom terminava lá pelos primeiros
      // 10-15% da página e ficava parado no resto, em vez de acompanhar o
      // scroll até o fim (e reverter suavemente ao subir).
      tl.to(this.photoBg, { scale: 1.22, ease: 'none', duration: stages }, 0);
    }
  }
}
