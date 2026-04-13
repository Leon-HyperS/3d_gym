import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const CONFIG = {
  ringY: 0,
  heroHeight: 1.9,
  crouchSpeed: 1.35,
  runSpeed: 4.15,
  sprintSpeed: 5.65,
  rollSpeed: 6.5,
  cameraOffset: new THREE.Vector3(6.8, 6.8, 6.8),
  cameraLerp: 7.5,
  cameraTargetHeight: 1.35,
  turnLerp: 10.5,
  baseYawOffset: 0,
  maxDelta: 0.05,
};

const ACTIONS = {
  idle: "Idle_Loop",
  run: "Jog_Fwd_Loop",
  sprint: "Sprint_Loop",
  crouchIdle: "Crouch_Idle_Loop",
  crouchMove: "Crouch_Fwd_Loop",
  roll: "Roll",
  leftPunch: "Punch_Jab",
  rightPunch: "Punch_Cross",
};

const dom = {
  app: document.querySelector("#app"),
  clip: document.querySelector("#status-clip"),
  state: document.querySelector("#status-state"),
  position: document.querySelector("#status-position"),
  yaw: document.querySelector("#status-yaw"),
  crosshair: document.querySelector("#mouse-crosshair"),
  flash: document.querySelector("#flash-overlay"),
  toastContainer: document.querySelector("#toast-container"),
  actionButtons: [...document.querySelectorAll("[data-action]")],
  debugInputs: [...document.querySelectorAll("[data-debug-toggle]")],
  flipFacing: document.querySelector("#flip-facing"),
};

const runtime = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  world: null,
  asset: null,
  hero: null,
  clock: new THREE.Clock(),
  modelYawOffset: CONFIG.baseYawOffset,
  debug: {
    grid: true,
    axes: false,
    origin: true,
    bounds: false,
    skeleton: false,
    vectors: true,
    hitboxes: false,
    orbit: false,
  },
  input: {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprintModifier: false,
    crouchModifier: false,
  },
  cameraTarget: new THREE.Vector3(0, 1.3, 0),
  cameraLookTarget: new THREE.Vector3(0, 1.3, 0),
  mouse: {
    clientX: window.innerWidth * 0.5,
    clientY: window.innerHeight * 0.5,
    ndc: new THREE.Vector2(0, 0),
    overUi: false,
  },
  aimPoint: new THREE.Vector3(0, CONFIG.ringY, 4),
  lastStatusUpdate: 0,
};

const UP = new THREE.Vector3(0, 1, 0);
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempMove = new THREE.Vector3();
const tempVector = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempTargetQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();
const tempCameraPosition = new THREE.Vector3();
const tempScreenPoint = new THREE.Vector3();
const tempWorldForward = new THREE.Vector3();

window.__TEST__ = {
  ready: false,
  getState: () => getTestState(),
};

init().catch((error) => {
  console.error(error);
  dom.clip.textContent = "Load Error";
  dom.state.textContent = error.message;
  showToast(`Startup failed: ${error.message}`, 4200);
});

async function init() {
  runtime.renderer = createRenderer();
  runtime.scene = createScene();
  runtime.camera = createCamera();
  runtime.controls = createControls(runtime.camera, runtime.renderer.domElement);
  runtime.world = createGymLevel(runtime.scene, runtime.renderer);

  dom.app.appendChild(runtime.renderer.domElement);

  bindUi();
  bindKeyboard();
  bindPointer();
  window.addEventListener("resize", handleResize);
  handleResize();

  runtime.asset = await loadAssetContract();
  runtime.hero = await loadHero(runtime.scene, runtime.asset);
  applyDebugVisibility();
  syncGroundedAnimation(runtime.hero, true);
  window.__TEST__.ready = true;

  showToast("Debug Gym ready. WASD / Shift / Ctrl / Space", 2600);
  runtime.clock.start();
  runtime.renderer.setAnimationLoop(updateFrame);
}

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08111b);
  scene.fog = new THREE.Fog(0x08111b, 18, 40);
  return scene;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.copy(CONFIG.cameraOffset);
  camera.lookAt(0, CONFIG.cameraTargetHeight, 0);
  return camera;
}

function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.enabled = false;
  controls.minDistance = 4;
  controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI * 0.475;
  controls.target.set(0, CONFIG.cameraTargetHeight, 0);
  return controls;
}

function bindUi() {
  for (const button of dom.actionButtons) {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "idle") {
        clearMovementInput();
        syncGroundedAnimation(runtime.hero, true);
        showToast("Idle preview");
        return;
      }

      if (action === "roll") {
        requestRoll();
        return;
      }

      if (action === "leftPunch") {
        requestPunch(ACTIONS.leftPunch, "Left punch");
        return;
      }

      if (action === "rightPunch") {
        requestPunch(ACTIONS.rightPunch, "Right punch");
        return;
      }

      if (action === "reset") {
        resetHeroTransform();
      }
    });
  }

  for (const input of dom.debugInputs) {
    input.addEventListener("change", () => {
      runtime.debug[input.dataset.debugToggle] = input.checked;
      applyDebugVisibility();
    });
  }

  dom.flipFacing.addEventListener("click", () => {
    flipFacing();
  });
}

function bindKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }

    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        runtime.input.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        runtime.input.back = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        runtime.input.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        runtime.input.right = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        runtime.input.sprintModifier = true;
        break;
      case "ControlLeft":
      case "ControlRight":
        runtime.input.crouchModifier = true;
        break;
      case "Space":
        event.preventDefault();
        requestRoll();
        break;
      case "KeyQ":
        requestPunch(ACTIONS.leftPunch, "Left punch");
        break;
      case "KeyE":
        requestPunch(ACTIONS.rightPunch, "Right punch");
        break;
      case "KeyR":
        resetHeroTransform();
        break;
      case "KeyF":
        flipFacing();
        break;
      case "Digit1":
        toggleDebugFlag("grid");
        break;
      case "Digit2":
        toggleDebugFlag("axes");
        break;
      case "Digit3":
        toggleDebugFlag("origin");
        break;
      case "Digit4":
        toggleDebugFlag("bounds");
        break;
      case "Digit5":
        toggleDebugFlag("skeleton");
        break;
      case "Digit6":
        toggleDebugFlag("vectors");
        break;
      case "Digit7":
        toggleDebugFlag("hitboxes");
        break;
      case "Digit8":
        toggleDebugFlag("orbit");
        break;
      default:
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        runtime.input.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        runtime.input.back = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        runtime.input.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        runtime.input.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        runtime.input.sprintModifier = false;
        break;
      case "ControlLeft":
      case "ControlRight":
        runtime.input.crouchModifier = false;
        break;
      default:
        break;
    }
  });
}

function bindPointer() {
  window.addEventListener("pointermove", (event) => {
    const targetElement = event.target instanceof Element ? event.target : null;
    runtime.mouse.overUi = Boolean(targetElement?.closest(".panel"));
    updatePointerFromClient(event.clientX, event.clientY);
  });

  window.addEventListener("pointerleave", () => {
    dom.crosshair.style.opacity = "0";
  });

  window.addEventListener("pointerenter", () => {
    dom.crosshair.style.opacity = runtime.mouse.overUi ? "0" : "1";
  });

  updatePointerFromClient(runtime.mouse.clientX, runtime.mouse.clientY);
}

function updatePointerFromClient(clientX, clientY) {
  runtime.mouse.clientX = clientX;
  runtime.mouse.clientY = clientY;
  runtime.mouse.ndc.x = (clientX / window.innerWidth) * 2 - 1;
  runtime.mouse.ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  dom.crosshair.style.transform = `translate(${clientX - 14}px, ${clientY - 14}px)`;
  dom.crosshair.style.opacity = runtime.mouse.overUi ? "0" : "1";
}

function handleResize() {
  runtime.camera.aspect = window.innerWidth / window.innerHeight;
  runtime.camera.updateProjectionMatrix();
  runtime.renderer.setSize(window.innerWidth, window.innerHeight);
  updatePointerFromClient(
    THREE.MathUtils.clamp(runtime.mouse.clientX, 0, window.innerWidth),
    THREE.MathUtils.clamp(runtime.mouse.clientY, 0, window.innerHeight),
  );
}

async function loadAssetContract() {
  const response = await fetch("/assets/index.json");
  if (!response.ok) {
    throw new Error("Could not load /assets/index.json");
  }

  const data = await response.json();
  const asset = data.assets.find((entry) => entry.id === "universal");
  if (!asset) {
    throw new Error("Asset contract does not contain 'universal'");
  }

  return asset;
}

async function loadHero(scene, asset) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(asset.path);
  console.log("Loaded clips:", gltf.animations.map((clip) => clip.name));

  const root = new THREE.Group();
  root.name = "HeroRoot";
  root.position.set(0, CONFIG.ringY, 0);

  const visualRoot = new THREE.Group();
  visualRoot.name = "HeroVisualRoot";
  root.add(visualRoot);

  const model = SkeletonUtils.clone(gltf.scene);
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material && "color" in child.material) {
        child.material.color.setHex(0xffffff);
      }
    }
  });

  visualRoot.add(model);
  normalizeSkinnedModel(model, CONFIG.heroHeight);
  visualRoot.rotation.y = runtime.modelYawOffset;
  scene.add(root);

  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map();
  for (const clip of gltf.animations) {
    actions.set(clip.name, mixer.clipAction(clip));
  }

  const requiredClips = [
    ACTIONS.idle,
    ACTIONS.run,
    ACTIONS.sprint,
    ACTIONS.crouchIdle,
    ACTIONS.crouchMove,
    ACTIONS.roll,
    ACTIONS.leftPunch,
    ACTIONS.rightPunch,
  ];

  for (const clipName of requiredClips) {
    if (!actions.has(clipName)) {
      throw new Error(`Required clip missing: ${clipName}`);
    }
  }

  const helpers = createHeroDebugHelpers(scene, root, visualRoot, model);

  const hero = {
    root,
    visualRoot,
    model,
    mixer,
    actions,
    helpers,
    currentAction: null,
    currentClip: ACTIONS.idle,
    grounded: true,
    actionLock: null,
    moveDirection: new THREE.Vector3(0, 0, 1),
    lastMoveDirection: new THREE.Vector3(0, 0, 1),
    rollDuration: actions.get(ACTIONS.roll).getClip().duration,
    rollTimeLeft: 0,
    rollDirection: new THREE.Vector3(0, 0, 1),
  };

  mixer.addEventListener("finished", (event) => {
    const finishedClip = event.action?.getClip()?.name;
    if (!finishedClip) {
      return;
    }

    if (finishedClip === ACTIONS.leftPunch || finishedClip === ACTIONS.rightPunch) {
      hero.actionLock = null;
      syncGroundedAnimation(hero, true);
    }

    if (finishedClip === ACTIONS.roll) {
      hero.actionLock = null;
      hero.rollTimeLeft = 0;
      syncGroundedAnimation(hero, true);
    }
  });

  return hero;
}

function createHeroDebugHelpers(scene, root, visualRoot, model) {
  const anchorAxes = new THREE.AxesHelper(1.15);
  root.add(anchorAxes);

  const forwardArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 1.25, 0),
    1.5,
    0xff58c7,
    0.25,
    0.12,
  );
  visualRoot.add(forwardArrow);

  const movementArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 0),
    1.25,
    0x52e6ff,
    0.22,
    0.12,
  );
  scene.add(movementArrow);

  const boxHelper = new THREE.BoxHelper(model, 0x7de8ff);
  scene.add(boxHelper);

  const skeletonHelper = new THREE.SkeletonHelper(model);
  skeletonHelper.material.linewidth = 1;
  scene.add(skeletonHelper);

  const hitboxes = createHitboxHelpers();
  root.add(hitboxes);

  return {
    anchorAxes,
    forwardArrow,
    movementArrow,
    boxHelper,
    skeletonHelper,
    hitboxes,
  };
}

function createHitboxHelpers() {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.7, 4, 8),
    new THREE.MeshBasicMaterial({
      color: 0x46d7ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    }),
  );
  torso.position.set(0, 1.05, 0);
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff74c6,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    }),
  );
  head.position.set(0, 1.72, 0);
  group.add(head);

  const leftFist = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    }),
  );
  leftFist.position.set(-0.35, 1.18, 0.42);
  group.add(leftFist);

  const rightFist = leftFist.clone();
  rightFist.position.x = 0.35;
  group.add(rightFist);

  return group;
}

function normalizeSkinnedModel(root, targetHeight) {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);

  const meshBounds = computeVisibleMeshBounds(root);
  const size = meshBounds.getSize(new THREE.Vector3());
  const height = Math.max(size.y, 0.0001);
  root.scale.setScalar(targetHeight / height);
  root.updateMatrixWorld(true);

  const scaledBounds = computeVisibleMeshBounds(root);
  root.position.y -= scaledBounds.min.y;
  root.updateMatrixWorld(true);
}

function computeVisibleMeshBounds(root) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }
      const meshBounds = child.geometry.boundingBox.clone();
      meshBounds.applyMatrix4(child.matrixWorld);
      box.union(meshBounds);
    }
  });

  if (box.isEmpty()) {
    box.setFromObject(root);
  }

  return box;
}

function createGymLevel(scene, renderer) {
  const stage = new THREE.Group();
  stage.name = "MinimalStage";
  scene.add(stage);

  const hemi = new THREE.HemisphereLight(0xd8ebff, 0x10161f, 1.15);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffefd7, 2.2);
  key.position.set(8, 14, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 52;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x6fdcff, 0.7);
  fill.position.set(-9, 6, -5);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({
      map: createMinimalFloorTexture(renderer),
      roughness: 0.96,
      metalness: 0.04,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.02, 0);
  floor.receiveShadow = true;
  stage.add(floor);

  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.7, 0.18, 32),
    new THREE.MeshStandardMaterial({
      color: 0x1a2533,
      emissive: 0x0d2031,
      roughness: 0.74,
      metalness: 0.14,
    }),
  );
  startPad.position.set(0, -0.09, 0);
  startPad.receiveShadow = true;
  startPad.castShadow = true;
  stage.add(startPad);

  const startPadTop = new THREE.Mesh(
    new THREE.CircleGeometry(1.46, 40),
    new THREE.MeshStandardMaterial({
      color: 0x213146,
      emissive: 0x0f2d48,
      roughness: 0.88,
      metalness: 0.08,
    }),
  );
  startPadTop.rotation.x = -Math.PI / 2;
  startPadTop.position.y = 0.002;
  stage.add(startPadTop);

  const crosshair = createWorldCrosshair();
  crosshair.position.set(0, CONFIG.ringY + 0.02, 4);
  scene.add(crosshair);

  const helpers = {
    grid: new THREE.GridHelper(120, 48, 0x4ddfff, 0x26384e),
    axes: new THREE.AxesHelper(2.5),
    origin: createOriginMarker(),
  };

  helpers.grid.position.y = 0.025;
  helpers.axes.position.set(-2.5, 0.03, -2.5);
  helpers.origin.position.y = 0.03;
  scene.add(helpers.grid, helpers.axes, helpers.origin);

  return { stage, floor, crosshair, helpers };
}

function createWorldCrosshair() {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.27, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7de9ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const hLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.02),
    new THREE.MeshBasicMaterial({
      color: 0xff9866,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  hLine.rotation.x = -Math.PI / 2;
  group.add(hLine);

  const vLine = hLine.clone();
  vLine.rotation.z = Math.PI / 2;
  group.add(vLine);

  return group;
}

function createOriginMarker() {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 0.98, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const xLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.35, 0, 0),
      new THREE.Vector3(1.35, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x61ddff }),
  );
  group.add(xLine);

  const zLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -1.35),
      new THREE.Vector3(0, 0, 1.35),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff9a72 }),
  );
  group.add(zLine);

  return group;
}

function createMinimalFloorTexture(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111927";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#142031" : "#19283d";
      ctx.fillRect(col * 128, row * 128, 128, 128);
    }
  }

  ctx.strokeStyle = "rgba(105, 200, 255, 0.22)";
  ctx.lineWidth = 5;
  for (let i = 0; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 128, 0);
    ctx.lineTo(i * 128, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 128);
    ctx.lineTo(canvas.width, i * 128);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(80, 80);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createRingRopes(parent) {
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e1218,
    metalness: 0.65,
    roughness: 0.24,
  });

  const redRope = new THREE.MeshStandardMaterial({
    color: 0xff6d59,
    emissive: 0x5b1308,
    metalness: 0.16,
    roughness: 0.48,
  });

  const blueRope = new THREE.MeshStandardMaterial({
    color: 0x54d8ff,
    emissive: 0x0c3a46,
    metalness: 0.16,
    roughness: 0.48,
  });

  const corners = [
    new THREE.Vector3(-4.85, 0, -4.85),
    new THREE.Vector3(4.85, 0, -4.85),
    new THREE.Vector3(4.85, 0, 4.85),
    new THREE.Vector3(-4.85, 0, 4.85),
  ];

  for (const corner of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 12), postMaterial);
    post.position.copy(corner).add(new THREE.Vector3(0, 1.25, 0));
    post.castShadow = true;
    post.receiveShadow = true;
    parent.add(post);
  }

  const ropeHeights = [0.85, 1.2, 1.55];
  for (const y of ropeHeights) {
    for (let index = 0; index < corners.length; index += 1) {
      const start = corners[index].clone().setY(y);
      const end = corners[(index + 1) % corners.length].clone().setY(y);
      const rope = createBeam(start, end, 0.045, index % 2 === 0 ? redRope : blueRope);
      rope.castShadow = true;
      rope.receiveShadow = true;
      parent.add(rope);
    }
  }
}

function createRoomShell(parent) {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x151b24,
    roughness: 0.92,
    metalness: 0.08,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2532,
    emissive: 0x0b1420,
    roughness: 0.82,
    metalness: 0.14,
  });

  const wallMeshes = [
    new THREE.Mesh(new THREE.BoxGeometry(22, 8, 0.4), wallMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(22, 8, 0.4), wallMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 22), wallMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 22), wallMaterial),
  ];

  wallMeshes[0].position.set(0, 3.25, -11.1);
  wallMeshes[1].position.set(0, 3.25, 11.1);
  wallMeshes[2].position.set(-11.1, 3.25, 0);
  wallMeshes[3].position.set(11.1, 3.25, 0);

  for (const wall of wallMeshes) {
    wall.receiveShadow = true;
    wall.castShadow = true;
    parent.add(wall);
  }

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), accentMaterial);
  ceiling.position.set(0, 7.1, 0);
  ceiling.rotation.x = Math.PI / 2;
  parent.add(ceiling);

  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 3.4),
    new THREE.MeshPhysicalMaterial({
      color: 0x94b9ff,
      metalness: 0.82,
      roughness: 0.14,
      transmission: 0.24,
      transparent: true,
      opacity: 0.52,
    }),
  );
  mirror.position.set(0, 3.1, -10.87);
  parent.add(mirror);

  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a425f,
    emissive: 0x10253e,
    roughness: 0.6,
    metalness: 0.24,
  });

  for (let i = -8; i <= 8; i += 4) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 0.18), stripeMaterial);
    stripe.position.set(i, 3.3, -10.7);
    parent.add(stripe);
  }

  const beamMaterial = new THREE.MeshStandardMaterial({
    color: 0x212c39,
    metalness: 0.5,
    roughness: 0.4,
  });

  const beamPairs = [
    [
      new THREE.Vector3(-9.5, 6.2, -4),
      new THREE.Vector3(9.5, 6.2, -4),
    ],
    [
      new THREE.Vector3(-9.5, 6.2, 0),
      new THREE.Vector3(9.5, 6.2, 0),
    ],
    [
      new THREE.Vector3(-9.5, 6.2, 4),
      new THREE.Vector3(9.5, 6.2, 4),
    ],
  ];

  for (const [start, end] of beamPairs) {
    parent.add(createBeam(start, end, 0.09, beamMaterial));
  }
}

function createPunchingBag(parent, basePosition, accentColor) {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3647,
    metalness: 0.48,
    roughness: 0.42,
  });

  const bagMaterial = new THREE.MeshStandardMaterial({
    color: 0x252a35,
    emissive: new THREE.Color(accentColor).multiplyScalar(0.16),
    roughness: 0.68,
    metalness: 0.14,
  });

  const frameHeight = 5.9;
  const ceilingAnchor = basePosition.clone().setY(frameHeight);
  const sideAnchor = basePosition.clone().add(new THREE.Vector3(1.25, frameHeight, 0));

  parent.add(createBeam(ceilingAnchor, sideAnchor, 0.08, frameMaterial));
  parent.add(createBeam(sideAnchor, sideAnchor.clone().setY(frameHeight - 0.8), 0.05, frameMaterial));

  const chain = createBeam(
    sideAnchor.clone().setY(frameHeight - 0.8),
    basePosition.clone().setY(3.65),
    0.025,
    frameMaterial,
  );
  parent.add(chain);

  const bag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.4, 1.7, 18),
    bagMaterial,
  );
  bag.position.copy(basePosition).setY(2.65);
  bag.castShadow = true;
  bag.receiveShadow = true;
  parent.add(bag);

  const cap = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.035, 10, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: new THREE.Color(accentColor).multiplyScalar(0.45),
      roughness: 0.4,
      metalness: 0.3,
    }),
  );
  cap.position.copy(basePosition).setY(3.5);
  cap.rotation.x = Math.PI / 2;
  parent.add(cap);
}

function createWeightBench(parent, basePosition) {
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ca8b8,
    metalness: 0.72,
    roughness: 0.24,
  });

  const cushionMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d394c,
    roughness: 0.82,
    metalness: 0.05,
  });

  const bench = new THREE.Group();
  bench.position.copy(basePosition);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.75), cushionMaterial);
  seat.position.set(0, 0.55, 0);
  bench.add(seat);

  const legs = [
    [-0.55, 0.2, 0],
    [0.55, 0.2, 0],
  ];

  for (const [x, y, z] of legs) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.35), metalMaterial);
    leg.position.set(x, y, z);
    bench.add(leg);
  }

  const bar = createBeam(
    new THREE.Vector3(-1.05, 1.25, 0),
    new THREE.Vector3(1.05, 1.25, 0),
    0.05,
    metalMaterial,
  );
  bench.add(bar);

  const rackLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.08), metalMaterial);
  rackLeft.position.set(-0.95, 0.68, 0);
  bench.add(rackLeft);
  const rackRight = rackLeft.clone();
  rackRight.position.x = 0.95;
  bench.add(rackRight);

  const weightMaterial = new THREE.MeshStandardMaterial({
    color: 0x11161d,
    roughness: 0.54,
    metalness: 0.24,
  });

  const plateOffsets = [-0.65, -0.5, 0.5, 0.65];
  for (const x of plateOffsets) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 18), weightMaterial);
    plate.rotation.z = Math.PI / 2;
    plate.position.set(x, 1.25, 0);
    bench.add(plate);
  }

  bench.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  parent.add(bench);
}

function createWallSign(parent, title, subtitle, position, accentColor, width, height, rotationY = 0) {
  const texture = createPosterTexture(title, subtitle, accentColor);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    }),
  );
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
}

function createBeam(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.castShadow = true;
  beam.receiveShadow = true;
  return beam;
}

function createArenaBoundsHelper() {
  const points = [
    new THREE.Vector3(-CONFIG.arenaHalfWidth, 0, -CONFIG.arenaHalfDepth),
    new THREE.Vector3(CONFIG.arenaHalfWidth, 0, -CONFIG.arenaHalfDepth),
    new THREE.Vector3(CONFIG.arenaHalfWidth, 0, CONFIG.arenaHalfDepth),
    new THREE.Vector3(-CONFIG.arenaHalfWidth, 0, CONFIG.arenaHalfDepth),
    new THREE.Vector3(-CONFIG.arenaHalfWidth, 0, -CONFIG.arenaHalfDepth),
  ];

  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x78f1ff }),
  );

  const cross = new THREE.Group();
  cross.add(outline);
  cross.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-CONFIG.arenaHalfWidth, 0, 0),
        new THREE.Vector3(CONFIG.arenaHalfWidth, 0, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0x5c84ff }),
    ),
  );
  cross.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -CONFIG.arenaHalfDepth),
        new THREE.Vector3(0, 0, CONFIG.arenaHalfDepth),
      ]),
      new THREE.LineBasicMaterial({ color: 0xff9a72 }),
    ),
  );

  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.66, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    }),
  );
  centerRing.rotation.x = -Math.PI / 2;
  cross.add(centerRing);

  return cross;
}

function createRingMatTexture(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#192230";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#2b486d";
  ctx.lineWidth = 14;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.strokeStyle = "#3d597e";
  ctx.lineWidth = 3;
  for (let i = 64; i < canvas.width; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  ctx.strokeStyle = "#7de1ff";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 170, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#ff8f64";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 260, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(11, 20, 34, 0.78)";
  ctx.fillRect(280, 425, 464, 174);
  ctx.strokeStyle = "#75deff";
  ctx.lineWidth = 4;
  ctx.strokeRect(280, 425, 464, 174);

  ctx.fillStyle = "#dff6ff";
  ctx.font = "900 86px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DEBUG", canvas.width / 2, 505);
  ctx.fillStyle = "#ff9560";
  ctx.font = "900 70px sans-serif";
  ctx.fillText("GYM", canvas.width / 2, 575);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createOuterFloorTexture(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#101823";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#152131" : "#1b2a3d";
      ctx.fillRect(col * 128, row * 128, 128, 128);
    }
  }

  ctx.strokeStyle = "rgba(104, 200, 255, 0.24)";
  ctx.lineWidth = 4;
  for (let i = 0; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 128, 0);
    ctx.lineTo(i * 128, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 128);
    ctx.lineTo(canvas.width, i * 128);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 133, 86, 0.18)";
  ctx.lineWidth = 16;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createPosterTexture(title, subtitle, accentColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#101726");
  gradient.addColorStop(1, "#0b1018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#3e516a";
  ctx.lineWidth = 20;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  ctx.fillStyle = `#${new THREE.Color(accentColor).getHexString()}`;
  ctx.fillRect(40, 44, canvas.width - 80, 26);

  ctx.fillStyle = "#ebf5ff";
  ctx.font = "900 118px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, 240);

  ctx.fillStyle = "#c5d0df";
  ctx.font = "700 54px sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, 348);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 6;
  ctx.strokeRect(46, 120, canvas.width - 92, 260);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateFrame() {
  const dt = Math.min(runtime.clock.getDelta(), CONFIG.maxDelta);
  if (!runtime.hero) {
    runtime.renderer.render(runtime.scene, runtime.camera);
    return;
  }

  runtime.hero.mixer.update(dt);
  updateAimTarget(dt);
  updateHero(dt);
  updateStageTracking();
  updateCamera(dt);
  updateDebugHelpers();
  updateStatusPanel();
  runtime.renderer.render(runtime.scene, runtime.camera);
}

function updateHero(dt) {
  const hero = runtime.hero;
  const desiredMove = getCameraRelativeMove();
  hero.moveDirection.copy(desiredMove);

  const isRolling = hero.actionLock === "roll";
  const canMoveOnGround = !hero.actionLock;
  const moveStrength = desiredMove.lengthSq();

  if (isRolling && hero.rollTimeLeft > 0) {
    hero.root.position.addScaledVector(hero.rollDirection, CONFIG.rollSpeed * dt);
    hero.lastMoveDirection.copy(hero.rollDirection);
    hero.rollTimeLeft = Math.max(0, hero.rollTimeLeft - dt);
  } else if (moveStrength > 0) {
    hero.lastMoveDirection.copy(desiredMove);
    const speed = runtime.input.crouchModifier
      ? CONFIG.crouchSpeed
      : runtime.input.sprintModifier
        ? CONFIG.sprintSpeed
        : CONFIG.runSpeed;
    if (canMoveOnGround) {
      hero.root.position.addScaledVector(desiredMove, speed * dt);
    }
  }

  if (!hero.actionLock) {
    syncGroundedAnimation(hero);
  }
}

function updateAimTarget(dt) {
  if (!runtime.hero) {
    return;
  }

  tempScreenPoint.copy(runtime.hero.root.position);
  tempScreenPoint.y += CONFIG.cameraTargetHeight;
  tempScreenPoint.project(runtime.camera);

  const heroScreenX = (tempScreenPoint.x * 0.5 + 0.5) * window.innerWidth;
  const heroScreenY = (-tempScreenPoint.y * 0.5 + 0.5) * window.innerHeight;
  const deltaX = runtime.mouse.clientX - heroScreenX;
  const deltaY = runtime.mouse.clientY - heroScreenY;
  const screenDistance = Math.hypot(deltaX, deltaY);
  if (screenDistance < 2) {
    return;
  }

  runtime.camera.getWorldDirection(tempForward);
  tempForward.y = 0;
  tempForward.normalize();
  tempRight.crossVectors(tempForward, UP).normalize();

  tempVector.set(0, 0, 0);
  tempVector.addScaledVector(tempRight, deltaX);
  tempVector.addScaledVector(tempForward, -deltaY);
  tempVector.y = 0;
  if (tempVector.lengthSq() < 0.0001) {
    return;
  }

  tempVector.normalize();
  const aimDistance = THREE.MathUtils.clamp(1.4 + screenDistance * 0.015, 1.4, 8);
  runtime.aimPoint.copy(runtime.hero.root.position).addScaledVector(tempVector, aimDistance);
  runtime.aimPoint.y = CONFIG.ringY + 0.02;
  runtime.world.crosshair.position.copy(runtime.aimPoint);

  const targetYaw = Math.atan2(tempVector.x, tempVector.z);
  runtime.hero.root.rotation.y = dampAngle(runtime.hero.root.rotation.y, targetYaw, CONFIG.turnLerp, dt);
}

function updateStageTracking() {
  if (!runtime.hero) {
    return;
  }

  const snap = 5;
  runtime.world.helpers.grid.position.x = Math.round(runtime.hero.root.position.x / snap) * snap;
  runtime.world.helpers.grid.position.z = Math.round(runtime.hero.root.position.z / snap) * snap;
}

function updateCamera(dt) {
  const hero = runtime.hero;
  runtime.cameraTarget.copy(hero.root.position);
  runtime.cameraTarget.y += CONFIG.cameraTargetHeight;

  if (runtime.debug.orbit) {
    runtime.controls.enabled = true;
    runtime.controls.target.lerp(runtime.cameraTarget, 1 - Math.exp(-dt * CONFIG.cameraLerp));
    runtime.controls.update();
    return;
  }

  runtime.controls.enabled = false;
  runtime.cameraLookTarget.lerp(runtime.cameraTarget, 1 - Math.exp(-dt * CONFIG.cameraLerp));
  tempCameraPosition.copy(runtime.cameraTarget).add(CONFIG.cameraOffset);
  runtime.camera.position.lerp(tempCameraPosition, 1 - Math.exp(-dt * CONFIG.cameraLerp));
  runtime.camera.lookAt(runtime.cameraLookTarget);
}

function updateDebugHelpers() {
  const { helpers: worldHelpers } = runtime.world;
  worldHelpers.grid.visible = runtime.debug.grid;
  worldHelpers.axes.visible = runtime.debug.axes;
  worldHelpers.origin.visible = runtime.debug.origin;
  runtime.world.crosshair.visible = true;

  if (!runtime.hero) {
    return;
  }

  const { helpers } = runtime.hero;
  helpers.anchorAxes.visible = runtime.debug.vectors;
  helpers.forwardArrow.visible = runtime.debug.vectors;
  helpers.hitboxes.visible = runtime.debug.hitboxes;
  helpers.skeletonHelper.visible = runtime.debug.skeleton;
  helpers.boxHelper.visible = runtime.debug.bounds;

  if (runtime.debug.bounds) {
    helpers.boxHelper.setFromObject(runtime.hero.model);
  }

  if (runtime.debug.vectors && runtime.hero.lastMoveDirection.lengthSq() > 0) {
    helpers.movementArrow.visible = true;
    tempVector.copy(runtime.hero.root.position).setY(runtime.hero.root.position.y + 1.1);
    helpers.movementArrow.position.copy(tempVector);
    helpers.movementArrow.setDirection(runtime.hero.lastMoveDirection);
    helpers.movementArrow.setLength(1.45, 0.22, 0.14);
  } else {
    helpers.movementArrow.visible = false;
  }
}

function updateStatusPanel() {
  const now = performance.now();
  if (now - runtime.lastStatusUpdate < 60) {
    return;
  }

  runtime.lastStatusUpdate = now;

  const hero = runtime.hero;
  dom.clip.textContent = hero.currentClip;
  dom.state.textContent = hero.actionLock
    ? hero.actionLock
    : runtime.input.crouchModifier
      ? hero.moveDirection.lengthSq() > 0
        ? "crouchMove"
        : "crouchIdle"
      : hero.moveDirection.lengthSq() > 0
        ? runtime.input.sprintModifier
          ? "sprinting"
          : "running"
        : "idle";
  dom.position.textContent = `${hero.root.position.x.toFixed(2)}, ${hero.root.position.y.toFixed(2)}, ${hero.root.position.z.toFixed(2)}`;
  dom.yaw.textContent = `${Math.round(THREE.MathUtils.radToDeg(runtime.modelYawOffset))} deg`;
}

function getCameraRelativeMove() {
  const x = (runtime.input.right ? 1 : 0) - (runtime.input.left ? 1 : 0);
  const z = (runtime.input.forward ? 1 : 0) - (runtime.input.back ? 1 : 0);

  if (x === 0 && z === 0) {
    return tempMove.set(0, 0, 0);
  }

  runtime.camera.getWorldDirection(tempForward);
  tempForward.y = 0;
  tempForward.normalize();
  tempRight.crossVectors(tempForward, UP).normalize();

  tempMove.set(0, 0, 0);
  tempMove.addScaledVector(tempForward, z);
  tempMove.addScaledVector(tempRight, x);
  tempMove.y = 0;
  tempMove.normalize();
  return tempMove;
}

function syncGroundedAnimation(hero, force = false) {
  if (!hero || !hero.grounded || hero.actionLock) {
    return;
  }

  const moving = hero.moveDirection.lengthSq() > 0;
  const locomotionClip = runtime.input.crouchModifier
    ? moving
      ? ACTIONS.crouchMove
      : ACTIONS.crouchIdle
    : moving
      ? runtime.input.sprintModifier
        ? ACTIONS.sprint
        : ACTIONS.run
      : ACTIONS.idle;
  playClip(hero, locomotionClip, {
    loop: true,
    fade: 0.12,
    force,
  });
}

function requestRoll() {
  const hero = runtime.hero;
  if (!hero || !hero.grounded || hero.actionLock) {
    return;
  }

  hero.actionLock = "roll";
  hero.rollTimeLeft = hero.rollDuration;
  hero.rollDirection.set(
    Math.sin(hero.root.rotation.y),
    0,
    Math.cos(hero.root.rotation.y),
  ).normalize();
  hero.lastMoveDirection.copy(hero.rollDirection);
  playClip(hero, ACTIONS.roll, { loop: false, fade: 0.05, force: true });
  flashScreen("#6dc8ff", 0.12, 90);
  showToast("Roll");
}

function requestPunch(clipName, label) {
  const hero = runtime.hero;
  if (!hero || !hero.grounded || hero.actionLock) {
    return;
  }

  hero.actionLock = clipName === ACTIONS.leftPunch ? "leftPunch" : "rightPunch";
  playClip(hero, clipName, { loop: false, fade: 0.06, force: true });
  flashScreen(clipName === ACTIONS.leftPunch ? "#ffbe55" : "#ff8455", 0.14, 80);
  showToast(label);
}

function playClip(hero, clipName, { loop = true, fade = 0.12, force = false, timeScale = 1 } = {}) {
  const nextAction = hero.actions.get(clipName);
  if (!nextAction) {
    return null;
  }

  if (!force && hero.currentAction === nextAction) {
    if (!nextAction.isRunning()) {
      nextAction.play();
    }
    hero.currentClip = clipName;
    return nextAction;
  }

  if (hero.currentAction && hero.currentAction !== nextAction) {
    hero.currentAction.fadeOut(fade);
  }

  nextAction.reset();
  nextAction.enabled = true;
  nextAction.paused = false;
  nextAction.timeScale = timeScale;
  nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  nextAction.clampWhenFinished = !loop;
  nextAction.fadeIn(fade).play();

  hero.currentAction = nextAction;
  hero.currentClip = clipName;
  return nextAction;
}

function resetHeroTransform() {
  if (!runtime.hero) {
    return;
  }

  clearMovementInput();
  runtime.hero.root.position.set(0, CONFIG.ringY, 0);
  runtime.hero.root.rotation.set(0, 0, 0);
  runtime.hero.grounded = true;
  runtime.hero.actionLock = null;
  runtime.hero.rollTimeLeft = 0;
  runtime.hero.rollDirection.set(0, 0, 1);
  runtime.hero.lastMoveDirection.set(0, 0, 1);
  syncGroundedAnimation(runtime.hero, true);
  showToast("Reset position");
}

function clearMovementInput() {
  runtime.input.forward = false;
  runtime.input.back = false;
  runtime.input.left = false;
  runtime.input.right = false;
  runtime.input.sprintModifier = false;
  runtime.input.crouchModifier = false;
  if (runtime.hero) {
    runtime.hero.moveDirection.set(0, 0, 0);
  }
}

function flipFacing() {
  runtime.modelYawOffset = THREE.MathUtils.euclideanModulo(runtime.modelYawOffset + Math.PI, Math.PI * 2);
  if (runtime.hero) {
    runtime.hero.visualRoot.rotation.y = runtime.modelYawOffset;
  }
  updateStatusPanel();
  showToast(`Facing offset ${Math.round(THREE.MathUtils.radToDeg(runtime.modelYawOffset))} deg`);
}

function toggleDebugFlag(key) {
  runtime.debug[key] = !runtime.debug[key];
  const input = dom.debugInputs.find((entry) => entry.dataset.debugToggle === key);
  if (input) {
    input.checked = runtime.debug[key];
  }
  applyDebugVisibility();
}

function applyDebugVisibility() {
  if (!runtime.world) {
    return;
  }

  runtime.controls.enabled = runtime.debug.orbit;
  updateDebugHelpers();
}

function flashScreen(color, opacity = 0.16, durationMs = 110) {
  dom.flash.style.backgroundColor = color;
  dom.flash.style.opacity = String(opacity);
  window.clearTimeout(flashScreen._timeoutId);
  flashScreen._timeoutId = window.setTimeout(() => {
    dom.flash.style.opacity = "0";
  }, durationMs);
}

function showToast(message, durationMs = 1200) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, durationMs);
}

function getTestState() {
  if (!runtime.hero) {
    return {
      ready: false,
    };
  }

  runtime.hero.model.getWorldDirection(tempWorldForward);
  return {
    ready: true,
    heroPosition: {
      x: runtime.hero.root.position.x,
      y: runtime.hero.root.position.y,
      z: runtime.hero.root.position.z,
    },
    rootYaw: runtime.hero.root.rotation.y,
    modelYawOffset: runtime.modelYawOffset,
    aimPoint: {
      x: runtime.aimPoint.x,
      y: runtime.aimPoint.y,
      z: runtime.aimPoint.z,
    },
    modelWorldForward: {
      x: tempWorldForward.x,
      y: tempWorldForward.y,
      z: tempWorldForward.z,
    },
    currentClip: runtime.hero.currentClip,
    sprintModifier: runtime.input.sprintModifier,
    crouchModifier: runtime.input.crouchModifier,
    mouse: {
      x: runtime.mouse.clientX,
      y: runtime.mouse.clientY,
    },
  };
}

function dampAngle(current, target, smoothing, dt) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return Math.atan2(
    Math.sin(current + delta * (1 - Math.exp(-smoothing * dt))),
    Math.cos(current + delta * (1 - Math.exp(-smoothing * dt))),
  );
}
