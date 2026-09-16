# DuCampo — Site com Hero 3D Parallax

Landing page da **DuCampo** (agropecuária, ração, ferragens e materiais de construção, com drone/aviação agrícola), com um drone 3D interativo sincronizado ao scroll sobre uma foto real de campo.

## Stack

- **[Three.js](https://threejs.org/)** — renderização do drone 3D
- **[GSAP](https://gsap.com/) + ScrollTrigger** — timeline de animação sincronizada ao scroll
- **[Lenis](https://lenis.darkroom.engineering/)** — smooth scroll
- **[Vite](https://vitejs.dev/)** — dev server e build

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

Build de produção:

```bash
npm run build
npm run preview   # serve o build localmente pra conferir
```

## Estrutura

```
index.html
public/                  # favicon e ícones (servidos na raiz pelo Vite)
src/
├── assets/
│   ├── brand/           # ícone do logo (header)
│   └── images/          # foto de fundo do hero
├── js/
│   ├── World3D.js       # cena, câmera, renderer (tone mapping), luzes
│   ├── Drone.js         # drone procedural (corpo, hélices, tanque, neblina de pulverização)
│   ├── ScrollAnimation.js  # timeline do GSAP ScrollTrigger
│   └── main.js          # entrypoint: Lenis + sombra de contato + render loop
└── styles/main.css
```

## Decisões de arquitetura

- **Foto real de fundo + drone 3D por cima** (em vez de uma cena 100% gerada por código): o fundo é uma `<div>` com `background-image` comum, e o Three.js renderiza só o drone com fundo transparente por cima. Isso deixa o resultado muito mais realista do que uma cena inteiramente procedural.
- **Drone procedural**: como não havia um modelo `.glb` de um drone agrícola disponível, o drone foi montado com primitivas do Three.js (corpo, hexacóptero, tanque, bicos de pulverização com neblina animada). Pode ser substituído por um modelo `.glb` real no futuro sem mudar a estrutura do resto do código.
- **Fallbacks**: sem suporte a WebGL, ou se o navegador perder o contexto WebGL (comum no Safari iOS sob pressão de memória), o canvas do drone é escondido e a foto de fundo continua normal — a página nunca fica em branco.
- **Acessibilidade**: respeita `prefers-reduced-motion`, reduzindo a intensidade das animações.
- **Performance mobile**: em dispositivos de toque, desativa antialiasing e usa um teto de pixel ratio mais conservador (telas grandes de tablet renderizam bem mais pixels que um celular, sem necessariamente ter GPU mais forte).

## Aviso sobre a foto de fundo

`src/assets/images/field-hero.jpg` precisa ter licença que permita uso comercial no site. Confirme a origem/licença antes de publicar em produção se ainda não tiver certeza.
