import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

function makeCameraOffset(yawDeg, pitchDeg, distance) {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);
  const horizontalDistance = Math.cos(pitch) * distance;

  return new THREE.Vector3(
    Math.sin(yaw) * horizontalDistance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * horizontalDistance,
  );
}

const CONFIG = {
  ringY: 0,
  heroHeight: 1.9,
  crouchSpeed: 1.35,
  pistolMoveSpeed: 2.05,
  pistolShootRecoverySeconds: 0.1,
  punchRecoverySeconds: 0.28,
  runSpeed: 4.15,
  sprintSpeed: 5.65,
  rollSpeed: 6.5,
  rollPlaybackSpeed: 1.55,
  rollExitFraction: 0.5,
  rollMinDuration: 0.22,
  rollMaxDuration: 0.34,
  backFlipEndHoldSeconds: 0.08,
  cameraYawDeg: 45,
  cameraPitchDeg: 40,
  cameraDistance: 12.4,
  cameraFov: 48,
  cameraMinFov: 26,
  cameraMaxFov: 72,
  cameraWheelFovStep: 2,
  cameraOffset: makeCameraOffset(45, 40, 12.4),
  cameraLerp: 7.5,
  cameraTargetHeight: 1.35,
  turnLerp: 10.5,
  baseYawOffset: Math.PI,
  aimDirectionDeadZoneDeg: 22.5,
  hudUiPackId: "scifi_hud",
  hudStaminaMax: 100,
  dodgeStaminaCost: 100 / 3,
  staminaRefillPerSecond: 20,
  shortcutCloseGuardMs: 900,
  maxDelta: 0.05,
};

const ACTIONS = {
  idle: "Idle_Loop",
  walk: "Walk_Loop",
  walkForwardLeft: "Walk_Fwd_Loop",
  walkForwardRight: "Walk_Fwd_R_Loop",
  walkBack: "Walk_Bwd_Loop",
  walkBackLeft: "Walk_Bwd_L_Loop",
  walkBackRight: "Walk_Bwd_R_Loop",
  walkLeft: "Walk_L_Loop",
  walkRight: "Walk_R_Loop",
  run: "Jog_Fwd_Loop",
  runForwardLeft: "Jog_Fwd_LeanL_Loop",
  runForwardRight: "Jog_Fwd_LeanR_Loop",
  runBack: "Jog_Bwd_Loop",
  runBackLeft: "Jog_Bwd_L_Loop",
  runBackRight: "Jog_Bwd_R_Loop",
  runLeft: "Jog_Left_Loop",
  runRight: "Jog_Right_Loop",
  sprint: "Sprint_Loop",
  crouchIdle: "Crouch_Idle_Loop",
  crouchMove: "Crouch_Fwd_Loop",
  crouchForwardLeft: "Crouch_Fwd_L_Loop",
  crouchForwardRight: "Crouch_Fwd_R_Loop",
  crouchBack: "Crouch_Bwd_Loop",
  crouchBackLeft: "Crouch_Bwd_L_Loop",
  crouchBackRight: "Crouch_Bwd_R_Loop",
  crouchLeft: "Crouch_Left_Loop",
  crouchRight: "Crouch_Right_Loop",
  roll: "Roll",
  backFlip: "BackFlip",
  dodgeLeft: "Dodge_Left",
  dodgeRight: "Dodge_Right",
  pistolStance: "Pistol_Idle_Loop",
  pistolShoot: "Pistol_Shoot",
  parry: "Idle_Shield_Break",
  leftPunch: "Punch_Jab",
  rightPunch: "Punch_Cross",
};

const DIRECTIONAL_ACTION_KEYS = {
  walk: {
    forward: "walk",
    forwardLeft: "walkForwardLeft",
    forwardRight: "walkForwardRight",
    back: "walkBack",
    backLeft: "walkBackLeft",
    backRight: "walkBackRight",
    left: "walkLeft",
    right: "walkRight",
  },
  run: {
    forward: "run",
    forwardLeft: "runForwardLeft",
    forwardRight: "runForwardRight",
    back: "runBack",
    backLeft: "runBackLeft",
    backRight: "runBackRight",
    left: "runLeft",
    right: "runRight",
  },
  crouch: {
    forward: "crouchMove",
    forwardLeft: "crouchForwardLeft",
    forwardRight: "crouchForwardRight",
    back: "crouchBack",
    backLeft: "crouchBackLeft",
    backRight: "crouchBackRight",
    left: "crouchLeft",
    right: "crouchRight",
  },
};

const LOWER_BODY_ACTION_KEYS = [
  "idle",
  "walk",
  "walkForwardLeft",
  "walkForwardRight",
  "walkBack",
  "walkBackLeft",
  "walkBackRight",
  "walkLeft",
  "walkRight",
  "run",
  "runForwardLeft",
  "runForwardRight",
  "runBack",
  "runBackLeft",
  "runBackRight",
  "runLeft",
  "runRight",
  "sprint",
  "crouchIdle",
  "crouchMove",
  "crouchForwardLeft",
  "crouchForwardRight",
  "crouchBack",
  "crouchBackLeft",
  "crouchBackRight",
  "crouchLeft",
  "crouchRight",
];

const REQUIRED_ACTION_KEYS = [
  ...LOWER_BODY_ACTION_KEYS,
  "roll",
  "backFlip",
  "dodgeLeft",
  "dodgeRight",
  "pistolStance",
  "pistolShoot",
  "parry",
  "leftPunch",
  "rightPunch",
];

const ALWAYS_PREVENT_DEFAULT_CODES = new Set([
  "F1",
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const CTRL_SHORTCUT_BLOCKED_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyR",
  "KeyF",
]);

const DEFAULT_HUD_SLOT_STATES = [
  { indexLabel: "1", active: true },
  { indexLabel: "2", active: false },
  { indexLabel: "3", active: false },
  { indexLabel: "4", active: false },
  { indexLabel: "5", active: false },
];

function cloneHudSlotStates(slots = DEFAULT_HUD_SLOT_STATES) {
  return slots.map((slot) => ({ ...slot }));
}

const UPPER_BODY_NODES = new Set([
  "spine_01",
  "spine_02",
  "spine_03",
  "neck_01",
  "Head",
  "clavicle_l",
  "upperarm_l",
  "lowerarm_l",
  "hand_l",
  "thumb_01_l",
  "thumb_02_l",
  "thumb_03_l",
  "thumb_04_leaf_l",
  "index_01_l",
  "index_02_l",
  "index_03_l",
  "index_04_leaf_l",
  "middle_01_l",
  "middle_02_l",
  "middle_03_l",
  "middle_04_leaf_l",
  "ring_01_l",
  "ring_02_l",
  "ring_03_l",
  "ring_04_leaf_l",
  "pinky_01_l",
  "pinky_02_l",
  "pinky_03_l",
  "pinky_04_leaf_l",
  "clavicle_r",
  "upperarm_r",
  "lowerarm_r",
  "hand_r",
  "thumb_01_r",
  "thumb_02_r",
  "thumb_03_r",
  "thumb_04_leaf_r",
  "index_01_r",
  "index_02_r",
  "index_03_r",
  "index_04_leaf_r",
  "middle_01_r",
  "middle_02_r",
  "middle_03_r",
  "middle_04_leaf_r",
  "ring_01_r",
  "ring_02_r",
  "ring_03_r",
  "ring_04_leaf_r",
  "pinky_01_r",
  "pinky_02_r",
  "pinky_03_r",
  "pinky_04_leaf_r",
]);

const LOWER_BODY_NODES = new Set([
  "root",
  "pelvis",
  "thigh_l",
  "calf_l",
  "foot_l",
  "ball_l",
  "ball_leaf_l",
  "thigh_r",
  "calf_r",
  "foot_r",
  "ball_r",
  "ball_leaf_r",
]);

const RIGHT_HAND_SOCKET_BONES = [
  "thumb_01_r",
  "index_01_r",
  "middle_01_r",
  "ring_01_r",
  "pinky_01_r",
];

const dom = {
  app: document.querySelector("#app"),
  uiShell: document.querySelector("#ui"),
  hud: document.querySelector("#hud"),
  clip: document.querySelector("#status-clip"),
  state: document.querySelector("#status-state"),
  position: document.querySelector("#status-position"),
  yaw: document.querySelector("#status-yaw"),
  hudHealthFill: document.querySelector("#hud-health-fill"),
  hudHealthValue: document.querySelector("#hud-health-value"),
  hudStaminaFill: document.querySelector("#hud-stamina-fill"),
  hudStaminaValue: document.querySelector("#hud-stamina-value"),
  hudSlots: [...document.querySelectorAll("[data-hud-slot]")],
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
  uiPacks: [],
  hudPack: null,
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
    pistolStance: false,
    parryModifier: false,
  },
  cameraTarget: new THREE.Vector3(0, 1.3, 0),
  cameraLookTarget: new THREE.Vector3(0, 1.3, 0),
  mouse: {
    clientX: window.innerWidth * 0.5,
    clientY: window.innerHeight * 0.5,
    ndc: new THREE.Vector2(0, 0),
    overUi: false,
  },
  ui: {
    menusHidden: false,
  },
  hud: {
    healthPercent: 86,
    staminaPercent: CONFIG.hudStaminaMax,
    slots: cloneHudSlotStates(),
  },
  aimPoint: new THREE.Vector3(0, CONFIG.ringY, 4),
  lastStatusUpdate: 0,
  closeGuardActive: false,
  closeGuardTimeoutId: 0,
  closeGuardModifierHeld: false,
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
const tempAimDirection = new THREE.Vector3();
const tempAimRight = new THREE.Vector3();
const tempEvadeDirection = new THREE.Vector3();
const tempAttachmentAimOrigin = new THREE.Vector3();
const tempAttachmentAimDirection = new THREE.Vector3();
const tempAttachmentAimUp = new THREE.Vector3();
const tempAttachmentProjectedForward = new THREE.Vector3();
const tempAttachmentProjectedUp = new THREE.Vector3();
const tempAttachmentProjectedDesiredUp = new THREE.Vector3();
const tempAttachmentCross = new THREE.Vector3();

window.__TEST__ = {
  ready: false,
  getState: () => getTestState(),
  setHudStaminaPercent: (value) => setHudStaminaPercent(value),
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

  const assetCatalog = await loadAssetContract();
  runtime.asset = assetCatalog.asset;
  runtime.uiPacks = assetCatalog.uiPacks;
  applyHudAssetPack(getDefaultHudPack(runtime.uiPacks));
  renderHud();
  runtime.hero = await loadHero(runtime.scene, runtime.asset);
  applyDebugVisibility();
  syncGroundedAnimation(runtime.hero, true);
  window.__TEST__.ready = true;

  showToast("Debug Gym ready. RMB / WASD / Shift / Ctrl / Space", 2600);
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
  const camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.copy(CONFIG.cameraOffset);
  camera.lookAt(0, CONFIG.cameraTargetHeight, 0);
  return camera;
}

function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.enabled = false;
  controls.enableZoom = false;
  controls.minDistance = 4;
  controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI * 0.475;
  controls.target.set(0, CONFIG.cameraTargetHeight, 0);
  return controls;
}

function adjustCameraFov(deltaY) {
  if (!runtime.camera) {
    return;
  }

  const direction = Math.sign(deltaY);
  if (direction === 0) {
    return;
  }

  runtime.camera.fov = THREE.MathUtils.clamp(
    runtime.camera.fov + direction * CONFIG.cameraWheelFovStep,
    CONFIG.cameraMinFov,
    CONFIG.cameraMaxFov,
  );
  runtime.camera.updateProjectionMatrix();
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

function shouldPreventBrowserShortcut(event) {
  return (
    ALWAYS_PREVENT_DEFAULT_CODES.has(event.code) ||
    ((event.ctrlKey || event.metaKey) && CTRL_SHORTCUT_BLOCKED_CODES.has(event.code))
  );
}

function clearCloseGuard() {
  runtime.closeGuardActive = false;
  if (runtime.closeGuardTimeoutId) {
    window.clearTimeout(runtime.closeGuardTimeoutId);
    runtime.closeGuardTimeoutId = 0;
  }
}

function armCloseGuard({ persistent = false } = {}) {
  clearCloseGuard();
  runtime.closeGuardActive = true;
  if (persistent) {
    return;
  }
  runtime.closeGuardTimeoutId = window.setTimeout(() => {
    runtime.closeGuardActive = false;
    runtime.closeGuardTimeoutId = 0;
  }, CONFIG.shortcutCloseGuardMs);
}

function setCloseGuardModifierHeld(held) {
  runtime.closeGuardModifierHeld = held;
  if (held) {
    armCloseGuard({ persistent: true });
    return;
  }
  clearCloseGuard();
}

function bindKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (
      event.code === "ControlLeft" ||
      event.code === "ControlRight" ||
      event.code === "MetaLeft" ||
      event.code === "MetaRight"
    ) {
      setCloseGuardModifierHeld(true);
    }

    if (shouldPreventBrowserShortcut(event)) {
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyW") {
        armCloseGuard({ persistent: runtime.closeGuardModifierHeld });
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }

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
        runtime.input.crouchModifier = !runtime.input.crouchModifier;
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
        runtime.input.parryModifier = true;
        break;
      case "F1":
        hideMenusAndClearDebug();
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
  }, { capture: true });

  window.addEventListener("beforeunload", (event) => {
    if (!runtime.closeGuardActive) {
      return;
    }

    if (!runtime.closeGuardModifierHeld) {
      clearCloseGuard();
    }
    event.preventDefault();
    event.returnValue = "";
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
        setCloseGuardModifierHeld(false);
        break;
      case "MetaLeft":
      case "MetaRight":
        setCloseGuardModifierHeld(false);
        break;
      case "KeyF":
        runtime.input.parryModifier = false;
        break;
      default:
        break;
    }
  });
}

function bindPointer() {
  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  runtime.renderer.domElement.addEventListener("wheel", (event) => {
    event.preventDefault();
    adjustCameraFov(event.deltaY);
  }, { passive: false });

  window.addEventListener("mousedown", (event) => {
    const targetElement = event.target instanceof Element ? event.target : null;
    const overUi = Boolean(targetElement?.closest(".panel"));
    const rightMouseHeld = (event.buttons & 2) === 2 || runtime.input.pistolStance;

    if (event.button === 0 && rightMouseHeld && !overUi) {
      event.preventDefault();
      requestPistolShoot();
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      runtime.input.pistolStance = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      runtime.input.pistolStance = false;
    }
  });

  window.addEventListener("pointercancel", () => {
    runtime.input.pistolStance = false;
  });

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

  window.addEventListener("blur", () => {
    runtime.input.pistolStance = false;
    runtime.input.parryModifier = false;
    setCloseGuardModifierHeld(false);
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

function setMenuOverlayHidden(hidden) {
  runtime.ui.menusHidden = hidden;
  dom.uiShell?.classList.toggle("ui-shell--hidden", hidden);
  runtime.mouse.overUi = false;
  updatePointerFromClient(
    THREE.MathUtils.clamp(runtime.mouse.clientX, 0, window.innerWidth),
    THREE.MathUtils.clamp(runtime.mouse.clientY, 0, window.innerHeight),
  );
}

function clearAllDebugFlags() {
  for (const key of Object.keys(runtime.debug)) {
    runtime.debug[key] = false;
  }

  for (const input of dom.debugInputs) {
    input.checked = false;
  }

  applyDebugVisibility();
}

function hideMenusAndClearDebug() {
  setMenuOverlayHidden(true);
  clearAllDebugFlags();
}

function clampHudPercent(value) {
  return THREE.MathUtils.clamp(Number(value) || 0, 0, CONFIG.hudStaminaMax);
}

function setHudStaminaPercent(nextValue) {
  const clampedValue = clampHudPercent(nextValue);
  if (Math.abs(clampedValue - runtime.hud.staminaPercent) < 0.0001) {
    return false;
  }

  runtime.hud.staminaPercent = clampedValue;
  renderHud();
  return true;
}

function spendHudStamina(amount) {
  return setHudStaminaPercent(runtime.hud.staminaPercent - amount);
}

function refillHudStamina(dt) {
  if (runtime.hud.staminaPercent >= CONFIG.hudStaminaMax) {
    return false;
  }

  if (runtime.hero?.actionLock) {
    return false;
  }

  return setHudStaminaPercent(runtime.hud.staminaPercent + CONFIG.staminaRefillPerSecond * dt);
}

function setElementAssetVariable(element, name, assetPath) {
  if (!element || !assetPath) {
    return;
  }
  element.style.setProperty(name, `url("${assetPath}")`);
}

function setHudAssetVariable(name, assetPath) {
  setElementAssetVariable(dom.hud, name, assetPath);
}

function applyHudAssetPack(pack) {
  runtime.hudPack = pack ?? null;
  if (!dom.hud || !runtime.hudPack?.hud) {
    return;
  }

  setHudAssetVariable("--hud-health-frame", runtime.hudPack.hud.healthFrame);
  setHudAssetVariable("--hud-health-fill", runtime.hudPack.hud.healthFill);
  setHudAssetVariable("--hud-stamina-frame", runtime.hudPack.hud.staminaFrame);
  setHudAssetVariable("--hud-stamina-fill", runtime.hudPack.hud.staminaFill);
  setElementAssetVariable(dom.crosshair, "--crosshair-asset", runtime.hudPack.hud.crosshair);
  setHudAssetVariable("--hud-slot-base", runtime.hudPack.hud.slotBase);
  setHudAssetVariable("--hud-slot-active", runtime.hudPack.hud.slotActive);
  setHudAssetVariable("--hud-slot-strip", runtime.hudPack.hud.slotStrip);
  dom.hud.dataset.hudPack = runtime.hudPack.id;
}

function renderHud() {
  if (!dom.hud) {
    return;
  }

  const healthPercent = clampHudPercent(runtime.hud.healthPercent);
  const staminaPercent = clampHudPercent(runtime.hud.staminaPercent);

  if (dom.hudHealthFill) {
    dom.hudHealthFill.style.width = `${healthPercent}%`;
  }
  if (dom.hudHealthValue) {
    dom.hudHealthValue.textContent = `${Math.round(healthPercent)}%`;
  }

  if (dom.hudStaminaFill) {
    dom.hudStaminaFill.style.width = `${staminaPercent}%`;
  }
  if (dom.hudStaminaValue) {
    dom.hudStaminaValue.textContent = `${Math.round(staminaPercent)}%`;
  }

  dom.hudSlots.forEach((slotElement, index) => {
    const slotState = runtime.hud.slots[index];
    slotElement.classList.toggle("is-active", slotState?.active === true);
    const label = slotElement.querySelector(".hud-slot__index");
    if (label) {
      label.textContent = slotState?.indexLabel ?? String(index + 1);
    }
  });
}

function getAnimationPacks(asset) {
  return Array.isArray(asset?.animationPacks) ? asset.animationPacks : [];
}

function normalizeFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a finite number`);
  }
  return number;
}

function cloneVectorConfig(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function normalizeVectorConfig(value, label, fallback) {
  if (value == null) {
    return cloneVectorConfig(fallback);
  }

  if (Array.isArray(value)) {
    if (value.length !== 3) {
      throw new Error(`${label} must contain exactly three values`);
    }
    return {
      x: normalizeFiniteNumber(value[0], `${label}.x`),
      y: normalizeFiniteNumber(value[1], `${label}.y`),
      z: normalizeFiniteNumber(value[2], `${label}.z`),
    };
  }

  if (typeof value === "object") {
    return {
      x: normalizeFiniteNumber(value.x, `${label}.x`),
      y: normalizeFiniteNumber(value.y, `${label}.y`),
      z: normalizeFiniteNumber(value.z, `${label}.z`),
    };
  }

  throw new Error(`${label} must be an object or array`);
}

function normalizeScaleConfig(value, label) {
  const normalized = normalizeVectorConfig(value, label, { x: 1, y: 1, z: 1 });
  for (const [axis, component] of Object.entries(normalized)) {
    if (component <= 0) {
      throw new Error(`${label}.${axis} must be greater than 0`);
    }
  }
  return normalized;
}

function normalizeSocketDefinition(key, socket) {
  if (!socket?.parentBoneName) {
    throw new Error(`Attachment '${key}' socket is missing a parentBoneName`);
  }

  if (!socket.socketName) {
    throw new Error(`Attachment '${key}' socket is missing a socketName`);
  }

  const rotationDeg = normalizeVectorConfig(
    socket.rotationDeg,
    `Attachment '${key}' socket rotationDeg`,
    { x: 0, y: 0, z: 0 },
  );

  return {
    ...socket,
    parentBoneName: socket.parentBoneName,
    socketName: socket.socketName,
    position: normalizeVectorConfig(
      socket.position,
      `Attachment '${key}' socket position`,
      { x: 0, y: 0, z: 0 },
    ),
    rotation: {
      x: THREE.MathUtils.degToRad(rotationDeg.x),
      y: THREE.MathUtils.degToRad(rotationDeg.y),
      z: THREE.MathUtils.degToRad(rotationDeg.z),
    },
  };
}

function normalizeAttachmentMeshOffset(key, meshOffset) {
  const rotationDeg = normalizeVectorConfig(
    meshOffset?.rotationDeg,
    `Attachment '${key}' meshOffset rotationDeg`,
    { x: 0, y: 0, z: 0 },
  );

  return {
    position: normalizeVectorConfig(
      meshOffset?.position,
      `Attachment '${key}' meshOffset position`,
      { x: 0, y: 0, z: 0 },
    ),
    rotation: {
      x: THREE.MathUtils.degToRad(rotationDeg.x),
      y: THREE.MathUtils.degToRad(rotationDeg.y),
      z: THREE.MathUtils.degToRad(rotationDeg.z),
    },
    scale: normalizeScaleConfig(
      meshOffset?.scale,
      `Attachment '${key}' meshOffset scale`,
    ),
  };
}

function normalizeAxisLabel(value, label, fallback) {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  if (!["-x", "+x", "-y", "+y", "-z", "+z"].includes(normalized)) {
    throw new Error(`${label} must be one of +x, -x, +y, -y, +z, -z`);
  }
  return normalized;
}

function normalizeAttachmentAiming(key, aiming) {
  if (aiming == null) {
    return {
      enabled: false,
      forwardAxis: "+z",
      upAxis: "+y",
      horizontalOnly: false,
    };
  }

  if (typeof aiming !== "object" || Array.isArray(aiming)) {
    throw new Error(`Attachment '${key}' aiming must be an object`);
  }

  const forwardAxis = normalizeAxisLabel(
    aiming.forwardAxis,
    `Attachment '${key}' aiming.forwardAxis`,
    "+z",
  );
  const upAxis = normalizeAxisLabel(
    aiming.upAxis,
    `Attachment '${key}' aiming.upAxis`,
    "+y",
  );

  if (forwardAxis.slice(1) === upAxis.slice(1)) {
    throw new Error(`Attachment '${key}' aiming forwardAxis and upAxis must use different axes`);
  }

  return {
    enabled: aiming.enabled !== false,
    forwardAxis,
    upAxis,
    horizontalOnly: aiming.horizontalOnly === true,
  };
}

function normalizeSocketAttachmentDefinition(key, attachment) {
  if (!attachment?.path) {
    throw new Error(`Attachment '${key}' is missing a path`);
  }

  if (!attachment.socket) {
    throw new Error(`Attachment '${key}' is missing a socket definition`);
  }

  return {
    ...attachment,
    path: attachment.path,
    socket: normalizeSocketDefinition(key, attachment.socket),
    meshOffset: normalizeAttachmentMeshOffset(key, attachment.meshOffset),
    aiming: normalizeAttachmentAiming(key, attachment.aiming),
  };
}

function normalizeAssetAttachments(attachments) {
  if (attachments == null) {
    return {};
  }

  if (typeof attachments !== "object" || Array.isArray(attachments)) {
    throw new Error("Asset contract attachments must be an object");
  }

  const normalized = { ...attachments };
  if (attachments.pistol) {
    normalized.pistol = normalizeSocketAttachmentDefinition("pistol", attachments.pistol);
  }

  return normalized;
}

function normalizeAssetContract(asset) {
  if (!asset?.path) {
    throw new Error("Asset contract is missing a base model path for 'universal'");
  }

  const animationPacks = getAnimationPacks(asset);
  const attachments = normalizeAssetAttachments(asset.attachments);
  for (const pack of animationPacks) {
    if (!pack?.id) {
      throw new Error("Animation pack entry is missing an id");
    }
    if (!pack.path) {
      throw new Error(`Animation pack '${pack.id}' is missing a path`);
    }
  }

  return {
    ...asset,
    animationPacks,
    attachments,
  };
}

function normalizeUiAssetPath(path, label) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return path;
}

function normalizeHudUiDefinition(hud, label) {
  if (hud == null || typeof hud !== "object" || Array.isArray(hud)) {
    throw new Error(`${label} must be an object`);
  }

  return {
    healthFrame: normalizeUiAssetPath(hud.healthFrame, `${label}.healthFrame`),
    healthFill: normalizeUiAssetPath(hud.healthFill, `${label}.healthFill`),
    staminaFrame: normalizeUiAssetPath(hud.staminaFrame, `${label}.staminaFrame`),
    staminaFill: normalizeUiAssetPath(hud.staminaFill, `${label}.staminaFill`),
    crosshair: normalizeUiAssetPath(hud.crosshair, `${label}.crosshair`),
    slotBase: normalizeUiAssetPath(hud.slotBase, `${label}.slotBase`),
    slotActive: normalizeUiAssetPath(hud.slotActive, `${label}.slotActive`),
    slotStrip: normalizeUiAssetPath(hud.slotStrip, `${label}.slotStrip`),
  };
}

function normalizeUiPacks(uiPacks) {
  if (uiPacks == null) {
    return [];
  }

  if (!Array.isArray(uiPacks)) {
    throw new Error("UI pack definitions must be an array");
  }

  return uiPacks.map((pack, index) => {
    if (!pack?.id) {
      throw new Error(`UI pack entry at index ${index} is missing an id`);
    }

    return {
      ...pack,
      hud: normalizeHudUiDefinition(pack.hud, `UI pack '${pack.id}' hud`),
    };
  });
}

function getDefaultHudPack(uiPacks) {
  if (!Array.isArray(uiPacks) || uiPacks.length === 0) {
    return null;
  }

  return uiPacks.find((pack) => pack.id === CONFIG.hudUiPackId) ?? uiPacks[0];
}

function collectNamedRigNodes(root) {
  const names = new Set();
  root.traverse((child) => {
    // Ignore mesh-wrapper names here. Shared animation binding and masking depend on the armature/bone contract.
    if (child.name && (child.isBone || child.name === "Armature")) {
      names.add(child.name);
    }
  });
  return names;
}

function collectAnimatedTrackNodeNames(animations = []) {
  const names = new Set();
  for (const clip of animations) {
    for (const track of clip.tracks) {
      const nodeName = getTrackNodeName(track.name);
      if (nodeName) {
        names.add(nodeName);
      }
    }
  }
  return names;
}

function previewNameList(values, limit = 12) {
  const items = [...values];
  if (items.length === 0) {
    return "none";
  }
  if (items.length <= limit) {
    return items.join(", ");
  }
  return `${items.slice(0, limit).join(", ")}, ... (+${items.length - limit} more)`;
}

function getAssetSourceLabel(source) {
  return source?.displayName ?? source?.id ?? source?.path ?? "unknown source";
}

function validateAnimationPackCompatibility(baseScene, packScene, pack, packAnimations = []) {
  const baseNodeNames = collectNamedRigNodes(baseScene);
  const packNodeNames = collectNamedRigNodes(packScene);
  const missingNodeNames = [...baseNodeNames].filter((name) => !packNodeNames.has(name)).sort();
  const extraNodeNames = [...packNodeNames].filter((name) => !baseNodeNames.has(name)).sort();
  const missingAnimatedNodeNames = [...collectAnimatedTrackNodeNames(packAnimations)]
    .filter((name) => !baseNodeNames.has(name))
    .sort();

  if (
    missingNodeNames.length === 0 &&
    extraNodeNames.length === 0 &&
    missingAnimatedNodeNames.length === 0
  ) {
    return;
  }

  const issues = [];
  if (missingNodeNames.length > 0) {
    issues.push(`missing rig nodes: ${previewNameList(missingNodeNames)}`);
  }
  if (extraNodeNames.length > 0) {
    issues.push(`extra rig nodes: ${previewNameList(extraNodeNames)}`);
  }
  if (missingAnimatedNodeNames.length > 0) {
    issues.push(`missing animated targets: ${previewNameList(missingAnimatedNodeNames)}`);
  }

  throw new Error(
    `Animation pack '${pack.id}' is not rig-compatible with the current base model (${issues.join("; ")})`,
  );
}

function registerAnimationClips(
  clipRegistry,
  clipSources,
  animations,
  source,
  { duplicateBehavior = "error", allowedDuplicateClipNames = [] } = {},
) {
  const sourceLabel = getAssetSourceLabel(source);
  const allowedDuplicateNames = new Set(allowedDuplicateClipNames);
  const skippedDuplicates = [];

  for (const clip of animations) {
    const existingSource = clipSources.get(clip.name);
    if (existingSource) {
      const allowDuplicate =
        duplicateBehavior === "keep_existing" && allowedDuplicateNames.has(clip.name);
      if (!allowDuplicate) {
        throw new Error(
          `Duplicate clip '${clip.name}' found in ${sourceLabel}; already provided by ${existingSource}`,
        );
      }
      skippedDuplicates.push(clip.name);
      continue;
    }

    clipRegistry.set(clip.name, clip);
    clipSources.set(clip.name, sourceLabel);
  }

  return skippedDuplicates;
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

  return {
    asset: normalizeAssetContract(asset),
    uiPacks: normalizeUiPacks(data.uiPacks),
  };
}

async function loadHero(scene, asset) {
  const loader = new GLTFLoader();
  const pistolAttachment = asset.attachments?.pistol ?? null;
  const pistolLoadPromise = pistolAttachment ? loader.loadAsync(pistolAttachment.path) : Promise.resolve(null);
  const baseGltf = await loader.loadAsync(asset.path);
  const animationPacks = getAnimationPacks(asset);
  const [packLoads, pistolGltf] = await Promise.all([
    Promise.all(
      animationPacks.map(async (pack) => ({
        pack,
        gltf: await loader.loadAsync(pack.path),
      })),
    ),
    pistolLoadPromise,
  ]);

  for (const { pack, gltf } of packLoads) {
    validateAnimationPackCompatibility(baseGltf.scene, gltf.scene, pack, gltf.animations);
  }

  const mergedClipRegistry = new Map();
  const clipSources = new Map();
  registerAnimationClips(mergedClipRegistry, clipSources, baseGltf.animations, asset);

  const packSummaries = [];
  for (const { pack, gltf } of packLoads) {
    const skippedDuplicates = registerAnimationClips(
      mergedClipRegistry,
      clipSources,
      gltf.animations,
      pack,
      {
        duplicateBehavior: pack.mergePolicy?.duplicateClipBehavior ?? "error",
        allowedDuplicateClipNames: pack.mergePolicy?.allowedDuplicateClipNames ?? [],
      },
    );

    packSummaries.push({
      id: pack.id,
      clips: gltf.animations.length,
      skippedDuplicates: skippedDuplicates.length,
    });
  }

  console.log("Merged clips:", [...mergedClipRegistry.keys()]);
  if (packSummaries.length > 0) {
    console.log("Animation pack merge summary:", packSummaries);
  }

  const root = new THREE.Group();
  root.name = "HeroRoot";
  root.position.set(0, CONFIG.ringY, 0);

  const visualRoot = new THREE.Group();
  visualRoot.name = "HeroVisualRoot";
  root.add(visualRoot);

  const model = SkeletonUtils.clone(baseGltf.scene);
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
  const clips = new Map();
  const actions = new Map();
  for (const [clipName, clip] of mergedClipRegistry.entries()) {
    clips.set(clipName, clip);
    actions.set(clipName, mixer.clipAction(clip));
  }

  const requiredClips = [...new Set(REQUIRED_ACTION_KEYS.map((actionKey) => ACTIONS[actionKey]))];
  const availableClipNames = [...clips.keys()].sort();

  for (const clipName of requiredClips) {
    if (!actions.has(clipName)) {
      throw new Error(
        `Required clip missing after merge: ${clipName}. Available clips: ${previewNameList(availableClipNames, 18)}`,
      );
    }
  }

  const helpers = createHeroDebugHelpers(scene, root, visualRoot, model);
  const layeredClips = {
    upper: {
      parry: createMaskedClip(clips.get(ACTIONS.parry), UPPER_BODY_NODES, "ParryUpper"),
      pistol: createMaskedClip(clips.get(ACTIONS.pistolStance), UPPER_BODY_NODES, "PistolUpper"),
      pistolShoot: createMaskedClip(clips.get(ACTIONS.pistolShoot), UPPER_BODY_NODES, "PistolShootUpper"),
      leftPunch: createMaskedClip(clips.get(ACTIONS.leftPunch), UPPER_BODY_NODES, "PunchJabUpper"),
      rightPunch: createMaskedClip(clips.get(ACTIONS.rightPunch), UPPER_BODY_NODES, "PunchCrossUpper"),
    },
    lower: Object.fromEntries(
      LOWER_BODY_ACTION_KEYS.map((actionKey) => [
        actionKey,
        createMaskedClip(
          clips.get(ACTIONS[actionKey]),
          LOWER_BODY_NODES,
          `${actionKey.charAt(0).toUpperCase()}${actionKey.slice(1)}Lower`,
        ),
      ]),
    ),
  };
  const layeredActions = {
    upper: {
      parry: mixer.clipAction(layeredClips.upper.parry),
      pistol: mixer.clipAction(layeredClips.upper.pistol),
      pistolShoot: mixer.clipAction(layeredClips.upper.pistolShoot),
      leftPunch: mixer.clipAction(layeredClips.upper.leftPunch),
      rightPunch: mixer.clipAction(layeredClips.upper.rightPunch),
    },
    lower: Object.fromEntries(
      LOWER_BODY_ACTION_KEYS.map((actionKey) => [
        actionKey,
        mixer.clipAction(layeredClips.lower[actionKey]),
      ]),
    ),
  };

  const rollClipDuration = actions.get(ACTIONS.roll).getClip().duration / CONFIG.rollPlaybackSpeed;
  const rollExitDuration = THREE.MathUtils.clamp(
    rollClipDuration * CONFIG.rollExitFraction,
    CONFIG.rollMinDuration,
    CONFIG.rollMaxDuration,
  );

  const hero = {
    root,
    visualRoot,
    model,
    mixer,
    clips,
    clipSources,
    actions,
    layeredActions,
    helpers,
    currentAction: null,
    currentUpperAction: null,
    currentLowerAction: null,
    currentClip: ACTIONS.idle,
    upperClip: null,
    lowerClip: null,
    animationMode: "full",
    grounded: true,
    actionLock: null,
    upperBodyActionLock: null,
    upperBodyRecoveryTimeLeft: 0,
    upperBodyRecoveryDurations: {
      [ACTIONS.pistolShoot]: CONFIG.pistolShootRecoverySeconds,
      [ACTIONS.leftPunch]: CONFIG.punchRecoverySeconds,
      [ACTIONS.rightPunch]: CONFIG.punchRecoverySeconds,
    },
    moveDirection: new THREE.Vector3(0, 0, 1),
    lastMoveDirection: new THREE.Vector3(0, 0, 1),
    rollDuration: rollClipDuration,
    rollExitDuration,
    rollTimeLeft: 0,
    evadeRecoveryTimeLeft: 0,
    rollDirection: new THREE.Vector3(0, 0, 1),
    attachments: {},
  };

  if (pistolAttachment && pistolGltf?.scene) {
    hero.attachments.pistol = createPropAttachment(
      model,
      "pistol",
      pistolAttachment,
      pistolGltf.scene,
    );
  }

  mixer.addEventListener("finished", (event) => {
    const finishedClip = event.action?.getClip()?.name;
    if (!finishedClip) {
      return;
    }

    if (
      finishedClip === "PistolShootUpper" ||
      finishedClip === "PunchJabUpper" ||
      finishedClip === "PunchCrossUpper"
    ) {
      hero.upperBodyRecoveryTimeLeft = 0;
      hero.upperBodyActionLock = null;
      syncGroundedAnimation(hero, true);
    }

    if (
      finishedClip === ACTIONS.roll ||
      finishedClip === ACTIONS.backFlip ||
      finishedClip === ACTIONS.dodgeLeft ||
      finishedClip === ACTIONS.dodgeRight
    ) {
      hero.actionLock = null;
      hero.rollTimeLeft = 0;
      hero.evadeRecoveryTimeLeft = 0;
      syncGroundedAnimation(hero, true);
    }
  });

  syncPistolVisibility(hero);
  syncWeaponAim(hero);
  return hero;
}

function createMaskedClip(sourceClip, includedNodes, name) {
  const tracks = sourceClip.tracks
    .filter((track) => includedNodes.has(getTrackNodeName(track.name)))
    .map((track) => track.clone());

  if (tracks.length === 0) {
    throw new Error(`Masked clip '${name}' has no tracks`);
  }

  return new THREE.AnimationClip(name, sourceClip.duration, tracks);
}

function getTrackNodeName(trackName) {
  const dotIndex = trackName.indexOf(".");
  return dotIndex === -1 ? trackName : trackName.slice(0, dotIndex);
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

function applyTransformToObject3D(target, transform) {
  target.position.set(transform.position.x, transform.position.y, transform.position.z);
  target.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  target.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

function prepareAttachmentModel(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material && "side" in material) {
          material.side = THREE.DoubleSide;
        }
      }
    }
  });
}

function setVectorFromAxisLabel(label, target = new THREE.Vector3()) {
  const sign = label.startsWith("-") ? -1 : 1;
  target.set(0, 0, 0);
  if (label.endsWith("x")) {
    target.x = sign;
  } else if (label.endsWith("y")) {
    target.y = sign;
  } else {
    target.z = sign;
  }
  return target;
}

function orientObjectAxisTowardDirection(
  object,
  localForward,
  localUp,
  desiredDirection,
  desiredUp = UP,
) {
  tempQuaternion.setFromUnitVectors(localForward, desiredDirection);

  tempAttachmentProjectedUp.copy(localUp).applyQuaternion(tempQuaternion);
  tempAttachmentProjectedUp.addScaledVector(
    desiredDirection,
    -tempAttachmentProjectedUp.dot(desiredDirection),
  );

  tempAttachmentProjectedDesiredUp.copy(desiredUp);
  tempAttachmentProjectedDesiredUp.addScaledVector(
    desiredDirection,
    -tempAttachmentProjectedDesiredUp.dot(desiredDirection),
  );

  if (
    tempAttachmentProjectedUp.lengthSq() < 0.000001 ||
    tempAttachmentProjectedDesiredUp.lengthSq() < 0.000001
  ) {
    object.quaternion.copy(tempQuaternion);
    return;
  }

  tempAttachmentProjectedUp.normalize();
  tempAttachmentProjectedDesiredUp.normalize();

  const dot = THREE.MathUtils.clamp(
    tempAttachmentProjectedUp.dot(tempAttachmentProjectedDesiredUp),
    -1,
    1,
  );
  const twistAngle = Math.acos(dot);
  tempAttachmentCross.crossVectors(
    tempAttachmentProjectedUp,
    tempAttachmentProjectedDesiredUp,
  );
  const twistSign = tempAttachmentCross.dot(desiredDirection) < 0 ? -1 : 1;

  tempTargetQuaternion.setFromAxisAngle(desiredDirection, twistAngle * twistSign);
  object.quaternion.copy(tempTargetQuaternion).multiply(tempQuaternion);
}

function orientObjectAxisHorizontallyTowardDirection(
  object,
  localForward,
  desiredDirection,
  localUpAxis,
) {
  tempAttachmentProjectedForward.copy(localForward);
  tempAttachmentProjectedForward.addScaledVector(
    localUpAxis,
    -tempAttachmentProjectedForward.dot(localUpAxis),
  );
  tempAttachmentProjectedDesiredUp.copy(desiredDirection);
  tempAttachmentProjectedDesiredUp.addScaledVector(
    localUpAxis,
    -tempAttachmentProjectedDesiredUp.dot(localUpAxis),
  );

  if (
    tempAttachmentProjectedForward.lengthSq() < 0.000001 ||
    tempAttachmentProjectedDesiredUp.lengthSq() < 0.000001
  ) {
    return;
  }

  tempAttachmentProjectedForward.normalize();
  tempAttachmentProjectedDesiredUp.normalize();
  const dot = THREE.MathUtils.clamp(
    tempAttachmentProjectedForward.dot(tempAttachmentProjectedDesiredUp),
    -1,
    1,
  );
  const angle = Math.acos(dot);
  tempAttachmentCross.crossVectors(
    tempAttachmentProjectedForward,
    tempAttachmentProjectedDesiredUp,
  );
  const sign = tempAttachmentCross.dot(localUpAxis) < 0 ? -1 : 1;
  object.quaternion.setFromAxisAngle(localUpAxis, angle * sign);
}

function getNamedChild(parent, name) {
  return parent.children.find((child) => child.name === name) ?? null;
}

function validateSocketParentBone(model, socketConfig) {
  const parentBone = model.getObjectByName(socketConfig.parentBoneName);
  if (!parentBone) {
    throw new Error(`Attachment socket parent '${socketConfig.parentBoneName}' was not found on the hero model`);
  }

  if (
    socketConfig.parentBoneName === "hand_r" ||
    socketConfig.socketName === "weapon_socket_r"
  ) {
    const missingBones = RIGHT_HAND_SOCKET_BONES.filter((name) => !parentBone.getObjectByName(name));
    if (missingBones.length > 0) {
      throw new Error(
        `Right-hand weapon socket validation failed. Missing right-hand bones: ${missingBones.join(", ")}`,
      );
    }
  }

  return parentBone;
}

function ensureAttachmentSocket(model, socketConfig) {
  const parentBone = validateSocketParentBone(model, socketConfig);
  let socket = getNamedChild(parentBone, socketConfig.socketName);
  if (!socket) {
    socket = new THREE.Group();
    socket.name = socketConfig.socketName;
    parentBone.add(socket);
  }

  socket.position.set(
    socketConfig.position.x,
    socketConfig.position.y,
    socketConfig.position.z,
  );
  socket.rotation.set(
    socketConfig.rotation.x,
    socketConfig.rotation.y,
    socketConfig.rotation.z,
  );
  socket.scale.set(1, 1, 1);
  socket.updateMatrixWorld(true);

  return {
    parentBone,
    socket,
  };
}

function createPropAttachment(model, key, attachment, sourceScene) {
  const { parentBone, socket } = ensureAttachmentSocket(model, attachment.socket);

  const aimPivot = new THREE.Group();
  aimPivot.name = `${key.charAt(0).toUpperCase()}${key.slice(1)}AimPivot`;

  const meshRoot = new THREE.Group();
  meshRoot.name = `${key.charAt(0).toUpperCase()}${key.slice(1)}MeshRoot`;
  // Keep the weapon fit transform under the aim pivot so the grip stays anchored in the hand.
  applyTransformToObject3D(meshRoot, attachment.meshOffset);

  const root = sourceScene.clone(true);
  root.name = `${socket.name}Model`;
  prepareAttachmentModel(root);
  root.visible = false;

  const aimLocalForward = setVectorFromAxisLabel(
    attachment.aiming.forwardAxis,
    new THREE.Vector3(),
  ).applyQuaternion(meshRoot.quaternion).normalize();
  const aimLocalUp = setVectorFromAxisLabel(
    attachment.aiming.upAxis,
    new THREE.Vector3(),
  ).applyQuaternion(meshRoot.quaternion).normalize();

  socket.add(aimPivot);
  aimPivot.add(meshRoot);
  meshRoot.add(root);
  socket.updateMatrixWorld(true);

  return {
    key,
    config: attachment,
    parentBone,
    socket,
    aimPivot,
    meshRoot,
    aimLocalForward,
    aimLocalUp,
    root,
  };
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

  const helpers = {
    grid: new THREE.GridHelper(120, 48, 0x4ddfff, 0x26384e),
    axes: new THREE.AxesHelper(2.5),
    origin: createOriginMarker(),
  };

  helpers.grid.position.y = 0.025;
  helpers.axes.position.set(-2.5, 0.03, -2.5);
  helpers.origin.position.y = 0.03;
  scene.add(helpers.grid, helpers.axes, helpers.origin);

  return { stage, floor, helpers };
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
  refillHudStamina(dt);
  syncWeaponAim(runtime.hero);
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

  const isEvading = Boolean(hero.actionLock);
  const canMoveOnGround = !isEvading;
  const moveStrength = desiredMove.lengthSq();

  if (isEvading && hero.rollTimeLeft > 0) {
    hero.root.position.addScaledVector(hero.rollDirection, CONFIG.rollSpeed * dt);
    hero.lastMoveDirection.copy(hero.rollDirection);
    hero.rollTimeLeft = Math.max(0, hero.rollTimeLeft - dt);
    if (hero.rollTimeLeft === 0) {
      if (hero.evadeRecoveryTimeLeft === 0) {
        finishRoll(hero);
      }
    }
  } else if (isEvading && hero.evadeRecoveryTimeLeft > 0) {
    hero.evadeRecoveryTimeLeft = Math.max(0, hero.evadeRecoveryTimeLeft - dt);
    if (hero.evadeRecoveryTimeLeft === 0) {
      finishRoll(hero);
    }
  } else if (moveStrength > 0) {
    hero.lastMoveDirection.copy(desiredMove);
    const speed = runtime.input.pistolStance
      ? CONFIG.pistolMoveSpeed
      : runtime.input.crouchModifier
        ? CONFIG.crouchSpeed
        : runtime.input.sprintModifier
          ? CONFIG.sprintSpeed
          : CONFIG.runSpeed;
    if (canMoveOnGround) {
      hero.root.position.addScaledVector(desiredMove, speed * dt);
    }
  }

  if (hero.upperBodyActionLock && hero.upperBodyRecoveryTimeLeft > 0) {
    hero.upperBodyRecoveryTimeLeft = Math.max(0, hero.upperBodyRecoveryTimeLeft - dt);
    if (hero.upperBodyRecoveryTimeLeft === 0) {
      hero.upperBodyActionLock = null;
    }
  }

  if (!isEvading) {
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

  let targetYaw = Math.atan2(tempVector.x, tempVector.z);
  const pistolYawTarget = getWeaponDrivenTargetYaw(runtime.hero, runtime.hero.attachments?.pistol, runtime.aimPoint);
  if (runtime.input.pistolStance && pistolYawTarget != null) {
    targetYaw = pistolYawTarget;
  }
  runtime.hero.root.rotation.y = dampAngle(runtime.hero.root.rotation.y, targetYaw, CONFIG.turnLerp, dt);
}

function getWeaponDrivenTargetYaw(hero, attachment, targetPoint) {
  if (!attachment?.config.aiming?.enabled || !attachment.config.aiming.horizontalOnly) {
    return null;
  }

  attachment.socket.getWorldPosition(tempAttachmentAimOrigin);
  tempAttachmentAimDirection.subVectors(targetPoint, tempAttachmentAimOrigin);
  tempAttachmentAimDirection.y = 0;
  if (tempAttachmentAimDirection.lengthSq() < 0.0001) {
    return null;
  }
  tempAttachmentAimDirection.normalize();

  setVectorFromAxisLabel(
    attachment.config.aiming.forwardAxis,
    tempVector,
  )
    .applyQuaternion(attachment.meshRoot.getWorldQuaternion(tempQuaternion))
    .normalize();
  tempVector.y = 0;
  if (tempVector.lengthSq() < 0.0001) {
    return null;
  }
  tempVector.normalize();

  const desiredWeaponYaw = Math.atan2(tempAttachmentAimDirection.x, tempAttachmentAimDirection.z);
  const currentWeaponYaw = Math.atan2(tempVector.x, tempVector.z);
  const weaponToRootYawOffset = Math.atan2(
    Math.sin(currentWeaponYaw - hero.root.rotation.y),
    Math.cos(currentWeaponYaw - hero.root.rotation.y),
  );
  return desiredWeaponYaw - weaponToRootYawOffset;
}

function syncAttachmentAim(attachment, targetPoint) {
  if (!attachment?.config.aiming?.enabled) {
    return;
  }

  if (attachment.config.aiming.horizontalOnly) {
    attachment.aimPivot.quaternion.identity();
    return;
  }

  attachment.aimPivot.getWorldPosition(tempAttachmentAimOrigin);
  tempAttachmentAimDirection.subVectors(targetPoint, tempAttachmentAimOrigin);
  if (tempAttachmentAimDirection.lengthSq() < 0.0001) {
    return;
  }

  if (attachment.config.aiming.horizontalOnly) {
    tempAttachmentAimDirection.y = 0;
    if (tempAttachmentAimDirection.lengthSq() < 0.0001) {
      return;
    }
  }

  attachment.aimPivot.parent.getWorldQuaternion(tempQuaternion).invert();
  tempAttachmentAimDirection.normalize();
  tempAttachmentAimDirection.applyQuaternion(tempQuaternion).normalize();
  tempAttachmentAimUp.copy(UP).applyQuaternion(tempQuaternion).normalize();
  if (attachment.config.aiming.horizontalOnly) {
    orientObjectAxisHorizontallyTowardDirection(
      attachment.aimPivot,
      attachment.aimLocalForward,
      tempAttachmentAimDirection,
      tempAttachmentAimUp,
    );
    return;
  }

  orientObjectAxisTowardDirection(
    attachment.aimPivot,
    attachment.aimLocalForward,
    attachment.aimLocalUp,
    tempAttachmentAimDirection,
    tempAttachmentAimUp,
  );
}

function syncWeaponAim(hero) {
  const pistolAttachment = hero?.attachments?.pistol;
  if (!pistolAttachment) {
    return;
  }

  syncAttachmentAim(pistolAttachment, runtime.aimPoint);
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
    : hero.upperBodyActionLock === ACTIONS.pistolShoot
      ? "pistolShoot"
    : hero.upperBodyActionLock === ACTIONS.leftPunch
      ? "leftPunch"
      : hero.upperBodyActionLock === ACTIONS.rightPunch
        ? "rightPunch"
    : runtime.input.parryModifier
      ? hero.moveDirection.lengthSq() > 0
        ? "parryMove"
        : "parry"
    : runtime.input.pistolStance
      ? hero.moveDirection.lengthSq() > 0
        ? "pistolWalk"
        : "pistolStance"
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

function getAimForwardVector(hero, target = tempAimDirection) {
  target.subVectors(runtime.aimPoint, hero.root.position);
  target.y = 0;

  if (target.lengthSq() < 0.0001) {
    target.set(Math.sin(hero.root.rotation.y), 0, Math.cos(hero.root.rotation.y));
    return target;
  }

  target.normalize();
  return target;
}

function getAimRelativeMoveDirection(hero) {
  if (!hero || hero.moveDirection.lengthSq() < 0.0001) {
    return "forward";
  }

  const aimForward = getAimForwardVector(hero);
  tempAimRight.crossVectors(aimForward, UP).normalize();

  const forwardDot = hero.moveDirection.dot(aimForward);
  const rightDot = hero.moveDirection.dot(tempAimRight);
  const angleDeg = THREE.MathUtils.radToDeg(Math.atan2(rightDot, forwardDot));
  const deadZone = CONFIG.aimDirectionDeadZoneDeg;

  if (angleDeg >= -deadZone && angleDeg < deadZone) {
    return "forward";
  }
  if (angleDeg >= deadZone && angleDeg < 90 - deadZone) {
    return "forwardRight";
  }
  if (angleDeg >= 90 - deadZone && angleDeg < 90 + deadZone) {
    return "right";
  }
  if (angleDeg >= 90 + deadZone && angleDeg < 180 - deadZone) {
    return "backRight";
  }
  if (angleDeg >= 180 - deadZone || angleDeg < -(180 - deadZone)) {
    return "back";
  }
  if (angleDeg >= -(180 - deadZone) && angleDeg < -(90 + deadZone)) {
    return "backLeft";
  }
  if (angleDeg >= -(90 + deadZone) && angleDeg < -(90 - deadZone)) {
    return "left";
  }
  return "forwardLeft";
}

function getDirectionalActionKey(group, direction) {
  return DIRECTIONAL_ACTION_KEYS[group][direction] ?? DIRECTIONAL_ACTION_KEYS[group].forward;
}

function resolveLocomotionActionKey(hero) {
  const moving = hero.moveDirection.lengthSq() > 0;
  if (!moving) {
    return runtime.input.crouchModifier ? "crouchIdle" : "idle";
  }

  const direction = getAimRelativeMoveDirection(hero);
  if (runtime.input.crouchModifier) {
    return getDirectionalActionKey("crouch", direction);
  }

  if (runtime.input.pistolStance) {
    return getDirectionalActionKey("walk", direction);
  }

  if (direction === "forward" && runtime.input.sprintModifier) {
    return "sprint";
  }

  return getDirectionalActionKey("run", direction);
}

function syncGroundedAnimation(hero, force = false) {
  if (!hero || !hero.grounded || hero.actionLock) {
    return;
  }

  const locomotionActionKey = resolveLocomotionActionKey(hero);
  if (hero.upperBodyActionLock) {
    const upperLayer = getUpperBodyLayer(hero);
    const lowerLayer = getLowerBodyLayer(hero, locomotionActionKey);
    playLayeredState(hero, {
      upperAction: upperLayer.action,
      upperClip: upperLayer.clip,
      upperLoop: false,
      lowerAction: lowerLayer.action,
      lowerClip: lowerLayer.clip,
      force,
    });
    return;
  }

  if (runtime.input.parryModifier) {
    const lowerLayer = getLowerBodyLayer(hero, locomotionActionKey);
    playLayeredState(hero, {
      upperAction: hero.layeredActions.upper.parry,
      upperClip: ACTIONS.parry,
      upperLoop: true,
      lowerAction: lowerLayer.action,
      lowerClip: lowerLayer.clip,
      force,
    });
    return;
  }

  if (runtime.input.pistolStance) {
    const lowerLayer = getLowerBodyLayer(hero, locomotionActionKey);
    playLayeredState(hero, {
      upperAction: hero.layeredActions.upper.pistol,
      upperClip: ACTIONS.pistolStance,
      upperLoop: true,
      lowerAction: lowerLayer.action,
      lowerClip: lowerLayer.clip,
      force,
    });
    return;
  }

  const locomotionClip = ACTIONS[locomotionActionKey];
  playClip(hero, locomotionClip, {
    loop: true,
    fade: 0.12,
    force,
  });
}

function getUpperBodyLayer(hero) {
  if (hero.upperBodyActionLock === ACTIONS.pistolShoot) {
    return {
      action: hero.layeredActions.upper.pistolShoot,
      clip: ACTIONS.pistolShoot,
    };
  }

  if (hero.upperBodyActionLock === ACTIONS.leftPunch) {
    return {
      action: hero.layeredActions.upper.leftPunch,
      clip: ACTIONS.leftPunch,
    };
  }

  return {
    action: hero.layeredActions.upper.rightPunch,
    clip: ACTIONS.rightPunch,
  };
}

function getLowerBodyLayer(hero, actionKey = resolveLocomotionActionKey(hero)) {
  return {
    action: hero.layeredActions.lower[actionKey],
    clip: ACTIONS[actionKey],
  };
}

function isPistolPresentationActive(hero) {
  return (
    hero.upperBodyActionLock === ACTIONS.pistolShoot ||
    hero.upperClip === ACTIONS.pistolStance ||
    hero.upperClip === ACTIONS.pistolShoot
  );
}

function syncPistolVisibility(hero) {
  const pistolAttachment = hero?.attachments?.pistol;
  if (!pistolAttachment) {
    return;
  }

  pistolAttachment.root.visible = isPistolPresentationActive(hero);
}

function rotationToDegrees(rotation) {
  return {
    x: THREE.MathUtils.radToDeg(rotation.x),
    y: THREE.MathUtils.radToDeg(rotation.y),
    z: THREE.MathUtils.radToDeg(rotation.z),
  };
}

function playLayeredState(
  hero,
  { upperAction, upperClip, upperLoop = true, lowerAction, lowerClip, force = false, fade = 0.08 },
) {
  const nextUpper = upperAction;
  const nextLower = lowerAction;

  if (!force &&
      hero.animationMode === "layered" &&
      hero.currentUpperAction === nextUpper &&
      hero.currentLowerAction === nextLower) {
    if (!nextUpper.isRunning()) {
      nextUpper.play();
    }
    if (!nextLower.isRunning()) {
      nextLower.play();
    }
    hero.currentClip = `${upperClip} + ${lowerClip}`;
    hero.upperClip = upperClip;
    hero.lowerClip = lowerClip;
    syncPistolVisibility(hero);
    return;
  }

  if (hero.currentAction) {
    hero.currentAction.fadeOut(fade);
    hero.currentAction = null;
  }

  if (hero.currentUpperAction && hero.currentUpperAction !== nextUpper) {
    hero.currentUpperAction.fadeOut(fade);
  }

  if (hero.currentLowerAction && hero.currentLowerAction !== nextLower) {
    hero.currentLowerAction.fadeOut(fade);
  }

  if (force || hero.currentUpperAction !== nextUpper || !nextUpper.isRunning()) {
    configureLayerAction(nextUpper, { loop: upperLoop, fade });
  }

  if (force || hero.currentLowerAction !== nextLower || !nextLower.isRunning()) {
    configureLayerAction(nextLower, { loop: true, fade });
  }

  hero.currentUpperAction = nextUpper;
  hero.currentLowerAction = nextLower;
  hero.animationMode = "layered";
  hero.currentClip = `${upperClip} + ${lowerClip}`;
  hero.upperClip = upperClip;
  hero.lowerClip = lowerClip;
  syncPistolVisibility(hero);
}

function configureLayerAction(action, { loop, fade }) {
  action.reset();
  action.enabled = true;
  action.paused = false;
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.fadeIn(fade).play();
}

function getEvadeSelection(hero) {
  const aimForward = getAimForwardVector(hero);
  tempAimRight.crossVectors(aimForward, UP).normalize();

  if (runtime.input.left && !runtime.input.right) {
    return {
      clipName: ACTIONS.dodgeLeft,
      lockName: "dodgeLeft",
      label: "Dodge left",
      direction: tempEvadeDirection.copy(tempAimRight).multiplyScalar(-1),
    };
  }

  if (runtime.input.right && !runtime.input.left) {
    return {
      clipName: ACTIONS.dodgeRight,
      lockName: "dodgeRight",
      label: "Dodge right",
      direction: tempEvadeDirection.copy(tempAimRight),
    };
  }

  if (runtime.input.back && !runtime.input.forward) {
    return {
      clipName: ACTIONS.backFlip,
      lockName: "backFlip",
      label: "Backflip",
      direction: tempEvadeDirection.copy(aimForward).multiplyScalar(-1),
    };
  }

  return {
    clipName: ACTIONS.roll,
    lockName: "roll",
    label: "Roll",
    direction: tempEvadeDirection.copy(aimForward),
  };
}

function requestRoll() {
  const hero = runtime.hero;
  if (!hero || !hero.grounded || hero.actionLock) {
    return;
  }

  if (runtime.hud.staminaPercent + 0.0001 < CONFIG.dodgeStaminaCost) {
    showToast("Not enough stamina");
    return;
  }

  const evadeSelection = getEvadeSelection(hero);
  const evadeClipName = evadeSelection.clipName;
  hero.actionLock = evadeSelection.lockName;
  hero.upperBodyActionLock = null;
  hero.upperBodyRecoveryTimeLeft = 0;
  hero.evadeRecoveryTimeLeft = evadeClipName === ACTIONS.backFlip ? CONFIG.backFlipEndHoldSeconds : 0;
  hero.rollDirection.copy(evadeSelection.direction).normalize();
  hero.lastMoveDirection.copy(hero.rollDirection);

  const evadeClipDuration = hero.actions.get(evadeClipName).getClip().duration / CONFIG.rollPlaybackSpeed;
  hero.rollDuration = evadeClipDuration;
  hero.rollTimeLeft = THREE.MathUtils.clamp(
    evadeClipDuration * CONFIG.rollExitFraction,
    CONFIG.rollMinDuration,
    CONFIG.rollMaxDuration,
  );

  playClip(hero, evadeClipName, {
    loop: false,
    fade: 0.04,
    force: true,
    timeScale: CONFIG.rollPlaybackSpeed,
  });
  spendHudStamina(CONFIG.dodgeStaminaCost);
  showToast(evadeSelection.label);
}

function requestUpperBodyAction(clipName, label, { requiresPistolStance = false } = {}) {
  const hero = runtime.hero;
  if (
    !hero ||
    !hero.grounded ||
    hero.actionLock ||
    hero.upperBodyActionLock ||
    (requiresPistolStance && !runtime.input.pistolStance)
  ) {
    return;
  }

  hero.upperBodyActionLock = clipName;
  hero.upperBodyRecoveryTimeLeft = hero.upperBodyRecoveryDurations[clipName] ?? 0;
  syncGroundedAnimation(hero, true);
  showToast(label);
}

function requestPunch(clipName, label) {
  requestUpperBodyAction(clipName, label);
}

function requestPistolShoot() {
  requestUpperBodyAction(ACTIONS.pistolShoot, "Pistol shot", {
    requiresPistolStance: true,
  });
}

function finishRoll(hero) {
  if (!hero || !hero.actionLock) {
    return;
  }

  hero.actionLock = null;
  hero.rollTimeLeft = 0;
  hero.evadeRecoveryTimeLeft = 0;
  syncGroundedAnimation(hero, true);
}

function playClip(hero, clipName, { loop = true, fade = 0.12, force = false, timeScale = 1 } = {}) {
  const nextAction = hero.actions.get(clipName);
  if (!nextAction) {
    return null;
  }

  if (hero.currentUpperAction) {
    hero.currentUpperAction.fadeOut(fade);
    hero.currentUpperAction = null;
  }

  if (hero.currentLowerAction) {
    hero.currentLowerAction.fadeOut(fade);
    hero.currentLowerAction = null;
  }

  if (!force && hero.currentAction === nextAction) {
    if (!nextAction.isRunning()) {
      nextAction.play();
    }
    hero.currentClip = clipName;
    hero.upperClip = null;
    hero.lowerClip = null;
    hero.animationMode = "full";
    syncPistolVisibility(hero);
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
  hero.upperClip = null;
  hero.lowerClip = null;
  hero.animationMode = "full";
  syncPistolVisibility(hero);
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
  runtime.hero.upperBodyActionLock = null;
  runtime.hero.upperBodyRecoveryTimeLeft = 0;
  runtime.hero.rollTimeLeft = 0;
  runtime.hero.evadeRecoveryTimeLeft = 0;
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
  runtime.input.pistolStance = false;
  runtime.input.parryModifier = false;
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
  let pistolAimAlignmentDot = null;
  if (runtime.hero.attachments?.pistol?.config.aiming?.enabled) {
    const pistolAttachment = runtime.hero.attachments.pistol;
    pistolAttachment.aimPivot.getWorldPosition(tempAttachmentAimOrigin);
    tempAttachmentAimDirection.subVectors(runtime.aimPoint, tempAttachmentAimOrigin);
    if (pistolAttachment.config.aiming.horizontalOnly) {
      tempAttachmentAimDirection.y = 0;
    }
    if (tempAttachmentAimDirection.lengthSq() >= 0.0001) {
      tempAttachmentAimDirection.normalize();
      setVectorFromAxisLabel(
        pistolAttachment.config.aiming.forwardAxis,
        tempVector,
      )
        .applyQuaternion(pistolAttachment.meshRoot.getWorldQuaternion(tempQuaternion))
        .normalize();
      if (pistolAttachment.config.aiming.horizontalOnly) {
        tempVector.y = 0;
        if (tempVector.lengthSq() >= 0.0001) {
          tempVector.normalize();
        }
      }
      pistolAimAlignmentDot = tempVector.dot(tempAttachmentAimDirection);
    }
  }

  return {
    ready: true,
    menusHidden: runtime.ui.menusHidden,
    debug: {
      ...runtime.debug,
    },
    hud: {
      packId: runtime.hudPack?.id ?? null,
      healthPercent: runtime.hud.healthPercent,
      staminaPercent: runtime.hud.staminaPercent,
      activeSlots: runtime.hud.slots.map((slot) => slot.active),
    },
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
    animationMode: runtime.hero.animationMode,
    upperClip: runtime.hero.upperClip,
    lowerClip: runtime.hero.lowerClip,
    actionLock: runtime.hero.actionLock,
    upperBodyActionLock: runtime.hero.upperBodyActionLock,
    rollTimeLeft: runtime.hero.rollTimeLeft,
    sprintModifier: runtime.input.sprintModifier,
    crouchModifier: runtime.input.crouchModifier,
    pistolStance: runtime.input.pistolStance,
    pistolPresented: isPistolPresentationActive(runtime.hero),
    pistolAttachment: runtime.hero.attachments?.pistol
      ? {
          parentBoneName: runtime.hero.attachments.pistol.parentBone.name,
          socketName: runtime.hero.attachments.pistol.socket.name,
          visible: runtime.hero.attachments.pistol.root.visible,
          socketLocalPosition: {
            x: runtime.hero.attachments.pistol.socket.position.x,
            y: runtime.hero.attachments.pistol.socket.position.y,
            z: runtime.hero.attachments.pistol.socket.position.z,
          },
          socketLocalRotationDeg: rotationToDegrees(runtime.hero.attachments.pistol.socket.rotation),
          aimPivotRotationDeg: rotationToDegrees(runtime.hero.attachments.pistol.aimPivot.rotation),
          meshOffsetPosition: {
            x: runtime.hero.attachments.pistol.meshRoot.position.x,
            y: runtime.hero.attachments.pistol.meshRoot.position.y,
            z: runtime.hero.attachments.pistol.meshRoot.position.z,
          },
          meshOffsetRotationDeg: rotationToDegrees(runtime.hero.attachments.pistol.meshRoot.rotation),
          aimForwardAxis: runtime.hero.attachments.pistol.config.aiming.forwardAxis,
          aimUpAxis: runtime.hero.attachments.pistol.config.aiming.upAxis,
          horizontalOnlyAim: runtime.hero.attachments.pistol.config.aiming.horizontalOnly,
          aimAlignmentDot: pistolAimAlignmentDot,
          meshAxisCorrectionApplied:
            Math.abs(runtime.hero.attachments.pistol.meshRoot.rotation.x) > 0.0001 ||
            Math.abs(runtime.hero.attachments.pistol.meshRoot.rotation.y) > 0.0001 ||
            Math.abs(runtime.hero.attachments.pistol.meshRoot.rotation.z) > 0.0001,
        }
      : null,
    parryModifier: runtime.input.parryModifier,
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
