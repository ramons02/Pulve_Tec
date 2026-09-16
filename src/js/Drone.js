import * as THREE from 'three';

function createRadialTexture(stops) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Sombra de contato: um círculo achatado com borda suave (gradiente
 * radial), não um disco de aresta dura — é o que faz o drone parecer
 * apoiado/pairando sobre a foto de fundo em vez de "colado" por cima.
 * Sem geometria de chão nesta cena (o chão é a foto), então isso é
 * reposicionado a cada frame acompanhando o drone (ver main.js).
 */
export function createContactShadow() {
  const texture = createRadialTexture([
    [0, 'rgba(0,0,0,0.55)'],
    [0.7, 'rgba(0,0,0,0.22)'],
    [1, 'rgba(0,0,0,0)']
  ]);
  const geometry = new THREE.CircleGeometry(1, 32);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(geometry, material);
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

function createNavLight(color) {
  const group = new THREE.Group();

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 8, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  group.add(dot);

  // Brilho aditivo por trás do ponto — sem post-processing de bloom, isso
  // já dá a leitura de "luz acesa" em vez de uma bolinha colorida fosca.
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createRadialTexture([
        [0, 'rgba(255,255,255,0.9)'],
        [1, 'rgba(255,255,255,0)']
      ]),
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  glow.scale.set(0.12, 0.12, 1);
  group.add(glow);

  return group;
}

/**
 * Neblina de pulverização como partículas caindo e se abrindo em leque, não
 * um cone sólido parado — um volume geométrico fixo lê como plástico/vidro;
 * gotas em queda com leve dispersão é o que faz parecer líquido sendo
 * borrifado. Cada ponto tem uma "fase" (0→1, progresso da queda) que
 * `updateSprayMist` avança a cada frame e reinicia ao chegar no fim, dando
 * um fluxo contínuo em vez de uma explosão única.
 */
function createSprayMist() {
  const count = 220;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    phases[i] = Math.random();
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.13,
    map: createRadialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.5, 'rgba(230,242,242,0.6)'],
      [1, 'rgba(230,242,242,0)']
    ]),
    color: 0xf3f9f9,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.userData.phases = phases;
  points.userData.count = count;
  return points;
}

/**
 * Avança a queda das gotas (chamado a cada frame em main.js). Cada
 * partícula desce e se afasta do centro do bico em espiral (ângulo áureo,
 * pra não formar linhas retas visíveis), acelerando um pouco no fim — como
 * gotas ganhando velocidade ao cair — e reinicia no bico ao completar o ciclo.
 */
export function updateSprayMist(points) {
  const positions = points.geometry.attributes.position.array;
  const phases = points.userData.phases;
  const count = points.userData.count;

  for (let i = 0; i < count; i += 1) {
    phases[i] += 0.012;
    if (phases[i] > 1) phases[i] -= 1;

    const p = phases[i];
    const fall = p * p; // acelera ao cair
    const angle = i * 2.399963; // ângulo áureo: distribui sem padrão em linha
    const radius = 0.03 + p * 0.32 * (0.5 + 0.5 * ((i % 5) / 5));

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = -fall * 0.75;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  points.geometry.attributes.position.needsUpdate = true;
}

/**
 * Drone agrícola de pulverização em geometria procedural (hexacóptero,
 * corpo branco, tanque, bicos de pulverização e trem de pouso) — sem
 * depender de um .glb externo. Referência: drones de pulverização tipo
 * DJI Agras (corpo branco, braços/motores pretos, luzes de navegação
 * vermelho/verde, tanque sob o corpo, bicos com neblina).
 *
 * Troque por um modelo .glb real via GLTFLoader quando tiver um (ver
 * references/asset-pipeline.md na skill parallax-web) — a estrutura de
 * World3D/ScrollAnimation não muda, só o que é adicionado a `world.scene`.
 * As hélices ficam em `group.userData.rotors` para o loop de renderização
 * girar cada uma independente da timeline de scroll do GSAP.
 */
export function createDrone() {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe9e9e2,
    roughness: 0.4,
    metalness: 0.05,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25
  });
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.2 });
  const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.7, roughness: 0.35 });
  const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.3 });
  const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.9, roughness: 0.1 });
  const tankMaterial = new THREE.MeshStandardMaterial({ color: 0xcdbb8a, roughness: 0.55 });

  // Corpo (fuselagem branca) + sensor no topo
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bodyMaterial);
  body.scale.set(1.15, 0.55, 0.85);
  group.add(body);

  const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.09, 16), armMaterial);
  sensor.position.set(0, 0.16, 0.05);
  group.add(sensor);

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), lensMaterial);
  lens.position.set(0, 0.02, 0.28);
  group.add(lens);

  // Tanque de calda sob o corpo
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 4, 12), tankMaterial);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, -0.32, 0);
  group.add(tank);

  // Trem de pouso: 4 pernas finas nas diagonais, abrindo pra fora
  [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 8), armMaterial);
    leg.position.set(sx * 0.22, -0.52, sz * 0.22);
    leg.rotation.z = sx * 0.22;
    leg.rotation.x = -sz * 0.22;
    group.add(leg);
  });

  // Bicos de pulverização + neblina, um de cada lado do tanque
  const mistEmitters = [];

  [-1, 1].forEach((side) => {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8), armMaterial);
    boom.position.set(side * 0.32, -0.42, 0);
    boom.rotation.z = Math.PI / 2;
    group.add(boom);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 8), motorMaterial);
    nozzle.position.set(side * 0.52, -0.44, 0);
    group.add(nozzle);

    const mist = createSprayMist();
    mist.position.set(side * 0.52, -0.44, 0);
    group.add(mist);
    mistEmitters.push(mist);
  });

  // 6 braços (hexacóptero) em ângulos que não apontam direto pra frente —
  // layout mais próximo do drone de referência que um quadricóptero em X.
  const armLength = 0.85;
  const rotors = [];
  const angleStep = (Math.PI * 2) / 6;

  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + i * angleStep;
    const x = Math.cos(angle) * armLength;
    const z = Math.sin(angle) * armLength;

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, armLength, 8), armMaterial);
    arm.position.set(x / 2, 0.05, z / 2);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -angle;
    group.add(arm);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 12), motorMaterial);
    motor.position.set(x, 0.1, z);
    group.add(motor);

    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(x, 0.16, z);
    const blade = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), bladeMaterial);
    blade.rotation.x = -Math.PI / 2;
    bladeGroup.add(blade);
    group.add(bladeGroup);
    rotors.push(bladeGroup);

    // Convenção de aviação: vermelho nos braços mais próximos da frente,
    // verde nos de trás — como no drone de referência.
    const navLight = createNavLight(Math.cos(angle) > 0 ? 0xff3b30 : 0x34c759);
    navLight.position.set(x * 1.08, 0.07, z * 1.08);
    group.add(navLight);
  }

  // Leve inclinação para dar sensação de "voo", como um drone em deslocamento
  group.rotation.x = -0.08;

  group.userData.rotors = rotors;
  group.userData.mistEmitters = mistEmitters;
  return group;
}
