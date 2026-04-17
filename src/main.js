import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import {
  createPistolMuzzleFlash,
  createQuarksBatchRenderer,
  loadPistolMuzzleFlashTexture,
} from "./vfx/pistolMuzzleFlash.js";

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
  cameraYawPanLerp: 8.5,
  cameraYawSettleToleranceDeg: 2.5,
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
    route: false,
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
  cameraYawDeg: null,
  cameraYawTargetDeg: null,
  suppressAimYawUntilCameraSettled: false,
  aimPoint: new THREE.Vector3(0, CONFIG.ringY, 4),
  lastStatusUpdate: 0,
  closeGuardActive: false,
  closeGuardTimeoutId: 0,
  closeGuardModifierHeld: false,
  vfx: {
    batchRenderer: null,
    pistolMuzzleFlashTexture: null,
  },
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
const tempGroundRayOrigin = new THREE.Vector3();
const tempGroundNormal = new THREE.Vector3();
const tempSpawnPosition = new THREE.Vector3();
const tempCameraOffset = new THREE.Vector3();
const tempCameraDesiredPosition = new THREE.Vector3();
const tempCameraFallbackPosition = new THREE.Vector3();
const tempCameraDirection = new THREE.Vector3();
const tempCameraRight = new THREE.Vector3();
const tempCameraUp = new THREE.Vector3();
const tempCameraOrigin = new THREE.Vector3();
const tempCameraSideOffset = new THREE.Vector3();
const tempCameraMatrix = new THREE.Matrix4();
const tempCameraBounds = new THREE.Box3();

window.__TEST__ = {
  ready: false,
  getState: () => getTestState(),
  setHudStaminaPercent: (value) => setHudStaminaPercent(value),
  teleportHero: (x, z, yawDeg = null) => teleportHeroForTest(x, z, yawDeg),
  setForcedCameraOccluders: (names) => setForcedCameraOccludersForTest(names),
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
  runtime.vfx.batchRenderer = createQuarksBatchRenderer();
  runtime.scene.add(runtime.vfx.batchRenderer);
  runtime.camera = createCamera();
  runtime.controls = createControls(runtime.camera, runtime.renderer.domElement);

  dom.app.appendChild(runtime.renderer.domElement);

  bindUi();
  bindKeyboard();
  bindPointer();
  window.addEventListener("resize", handleResize);
  handleResize();

  const [assetCatalog, stageCatalog, pistolMuzzleFlashTexture] = await Promise.all([
    loadAssetContract(),
    loadStageCatalog(),
    loadPistolMuzzleFlashTexture(),
  ]);
  runtime.asset = assetCatalog.asset;
  runtime.uiPacks = assetCatalog.uiPacks;
  runtime.vfx.pistolMuzzleFlashTexture = pistolMuzzleFlashTexture;
  runtime.world = await createGymLevel(runtime.scene, runtime.renderer, stageCatalog?.defaultStage ?? null);
  applyActiveCameraControls();
  applyHudAssetPack(getDefaultHudPack(runtime.uiPacks));
  renderHud();
  runtime.hero = await loadHero(runtime.scene, runtime.asset);
  attachHeroWeaponVfx(runtime.hero);
  placeHeroAtStageSpawn(runtime.hero);
  snapCameraToHero(runtime.hero);
  applyDebugVisibility();
  syncGroundedAnimation(runtime.hero, true);
  window.__TEST__.ready = true;

  showToast(
    `${runtime.world?.stageData?.displayName ?? "Debug Gym"} ready. RMB / WASD / Shift / Ctrl / Space`,
    2600,
  );
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

function normalizeYawDegrees(value) {
  return THREE.MathUtils.euclideanModulo(value, 360);
}

function getAngleDifferenceDegrees(a, b) {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function getBaseCameraYawDeg() {
  return runtime.world?.stageData?.camera?.yawDeg ?? CONFIG.cameraYawDeg;
}

function syncCameraYawState(dt = 0) {
  if (runtime.cameraYawDeg == null) {
    runtime.cameraYawDeg = getBaseCameraYawDeg();
  }
  if (runtime.cameraYawTargetDeg == null) {
    runtime.cameraYawTargetDeg = runtime.cameraYawDeg;
  }
  if (dt <= 0) {
    return;
  }

  runtime.cameraYawDeg = normalizeYawDegrees(
    THREE.MathUtils.radToDeg(
      dampAngle(
        THREE.MathUtils.degToRad(runtime.cameraYawDeg),
        THREE.MathUtils.degToRad(runtime.cameraYawTargetDeg),
        CONFIG.cameraYawPanLerp,
        dt,
      ),
    ),
  );

  if (Math.abs((((runtime.cameraYawDeg - runtime.cameraYawTargetDeg) % 360) + 540) % 360 - 180) < 0.15) {
    runtime.cameraYawDeg = runtime.cameraYawTargetDeg;
  }
}

function getActiveCameraSettings() {
  const stageCamera = runtime.world?.stageData?.camera;
  return {
    yawDeg: runtime.cameraYawDeg ?? stageCamera?.yawDeg ?? CONFIG.cameraYawDeg,
    pitchDeg: stageCamera?.pitchDeg ?? CONFIG.cameraPitchDeg,
    distance: stageCamera?.distance ?? CONFIG.cameraDistance,
    targetHeight: stageCamera?.targetHeight ?? CONFIG.cameraTargetHeight,
  };
}

function getActiveCameraOffset(target = tempCameraOffset) {
  const camera = getActiveCameraSettings();
  target.copy(makeCameraOffset(camera.yawDeg, camera.pitchDeg, camera.distance));
  return target;
}

function applyActiveCameraControls() {
  if (!runtime.controls) {
    return;
  }

  const camera = getActiveCameraSettings();
  runtime.controls.maxDistance = Math.max(16, camera.distance * 1.6);
  runtime.controls.target.set(0, camera.targetHeight, 0);
}

function snapCameraToHero(hero) {
  if (!hero || !runtime.camera) {
    return;
  }

  syncCameraYawState(0);
  const camera = getActiveCameraSettings();
  runtime.cameraTarget.copy(hero.root.position);
  runtime.cameraTarget.y += camera.targetHeight;
  runtime.cameraLookTarget.copy(runtime.cameraTarget);
  const preferredView = resolvePreferredCameraView(runtime.cameraTarget, camera);
  runtime.camera.position.copy(preferredView.position);
  const occluders = collectCameraOccluders(runtime.cameraLookTarget, runtime.camera.position);
  runtime.world.cameraTelemetry.activeOccluders = occluders.map((mesh) => mesh.name);
  updateOccluderFadeState(1 / 60, occluders);
  runtime.camera.lookAt(runtime.cameraLookTarget);

  if (runtime.controls) {
    runtime.controls.target.copy(runtime.cameraTarget);
    runtime.controls.update();
  }
}

function getPlayerFrontYawForCameraYaw(cameraYawDeg) {
  return THREE.MathUtils.degToRad(normalizeYawDegrees(cameraYawDeg + 180));
}

function shouldSuppressAimYawForCameraPan() {
  if (!runtime.suppressAimYawUntilCameraSettled) {
    return false;
  }

  syncCameraYawState(0);
  if (runtime.cameraYawDeg == null || runtime.cameraYawTargetDeg == null) {
    runtime.suppressAimYawUntilCameraSettled = false;
    return false;
  }

  if (
    getAngleDifferenceDegrees(runtime.cameraYawDeg, runtime.cameraYawTargetDeg) <=
    CONFIG.cameraYawSettleToleranceDeg
  ) {
    runtime.suppressAimYawUntilCameraSettled = false;
    return false;
  }

  return true;
}

function snapCameraAndFacePlayerFront() {
  const hero = runtime.hero;
  if (!hero) {
    return;
  }

  syncCameraYawState(0);
  const heroFacingYawDeg = normalizeYawDegrees(THREE.MathUtils.radToDeg(hero.root.rotation.y));
  runtime.cameraYawTargetDeg = normalizeYawDegrees(heroFacingYawDeg + 180);

  const targetYaw = getPlayerFrontYawForCameraYaw(runtime.cameraYawTargetDeg);
  hero.root.rotation.y = targetYaw;
  hero.lastMoveDirection.set(Math.sin(targetYaw), 0, Math.cos(targetYaw));
  hero.rollDirection.copy(hero.lastMoveDirection);
  resetAimPointFromHero(hero);
  runtime.suppressAimYawUntilCameraSettled = true;
  runtime.mouse.overUi = false;
  updatePointerFromClient(window.innerWidth * 0.5, window.innerHeight * 0.5);
}

function setPistolStanceActive(nextActive) {
  const active = Boolean(nextActive);
  if (runtime.input.pistolStance === active) {
    return false;
  }

  runtime.input.pistolStance = active;
  if (active) {
    snapCameraAndFacePlayerFront();
  }
  return true;
}

function getTopDownOcclusionCameraSettings(baseCamera, world = runtime.world) {
  return {
    yawDeg: baseCamera.yawDeg,
    pitchDeg: Math.max(baseCamera.pitchDeg, world?.stageData?.occlusion?.topDownPitchDeg ?? baseCamera.pitchDeg),
    distance: Math.max(baseCamera.distance, world?.stageData?.occlusion?.topDownDistance ?? baseCamera.distance),
    targetHeight: baseCamera.targetHeight,
  };
}

function ensureOcclusionFadeMaterials(mesh) {
  if (!mesh.userData.occlusionFadeMaterials) {
    const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const clonedMaterials = sourceMaterials.map((material) => material.clone());
    mesh.userData.occlusionFadeMaterials = Array.isArray(mesh.material)
      ? clonedMaterials
      : clonedMaterials[0];
    mesh.material = mesh.userData.occlusionFadeMaterials;
  }

  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function updateOccluderFadeState(dt, desiredOccluders, world = runtime.world) {
  if (!world?.stageData?.occlusion?.enabled) {
    return;
  }

  const fadeStep = 1 - Math.exp(-dt * world.stageData.occlusion.fadeLerp);

  for (const state of world.activeCameraOccluders.values()) {
    state.targetOpacity = 1;
  }

  for (const mesh of desiredOccluders) {
    let state = world.activeCameraOccluders.get(mesh);
    if (!state) {
      state = { targetOpacity: 1 };
      world.activeCameraOccluders.set(mesh, state);
    }
    state.targetOpacity = world.stageData.occlusion.fadeOpacity;
    ensureOcclusionFadeMaterials(mesh);
  }

  for (const [mesh, state] of world.activeCameraOccluders.entries()) {
    const materials = ensureOcclusionFadeMaterials(mesh);
    let shouldKeep = state.targetOpacity < 0.999;
    for (const material of materials) {
      const nextOpacity = THREE.MathUtils.lerp(material.opacity, state.targetOpacity, fadeStep);
      material.opacity = nextOpacity;
      material.transparent = nextOpacity < 0.999;
      material.depthWrite = nextOpacity >= 0.999;
      shouldKeep ||= nextOpacity < 0.995;
    }

    if (!shouldKeep) {
      world.activeCameraOccluders.delete(mesh);
    }
  }
}

function getClampedCameraPosition(
  targetPosition,
  desiredPosition,
  world = runtime.world,
  { telemetry = true } = {},
) {
  if (!world?.stageData?.occlusion?.enabled || world.cameraOcclusionMeshes.length === 0) {
    if (telemetry && world?.cameraTelemetry) {
      world.cameraTelemetry.desiredDistance = desiredPosition.distanceTo(targetPosition);
      world.cameraTelemetry.clampedDistance = world.cameraTelemetry.desiredDistance;
    }
    return {
      position: desiredPosition,
      desiredDistance: desiredPosition.distanceTo(targetPosition),
      clampedDistance: desiredPosition.distanceTo(targetPosition),
      clamped: false,
    };
  }

  tempCameraDirection.subVectors(desiredPosition, targetPosition);
  const desiredDistance = tempCameraDirection.length();
  if (desiredDistance < 0.0001) {
    if (telemetry && world.cameraTelemetry) {
      world.cameraTelemetry.desiredDistance = desiredDistance;
      world.cameraTelemetry.clampedDistance = desiredDistance;
    }
    return {
      position: desiredPosition,
      desiredDistance,
      clampedDistance: desiredDistance,
      clamped: false,
    };
  }

  tempCameraDirection.normalize();
  tempCameraRight.crossVectors(tempCameraDirection, UP);
  if (tempCameraRight.lengthSq() < 0.0001) {
    tempCameraRight.set(1, 0, 0);
  } else {
    tempCameraRight.normalize();
  }
  tempCameraUp.crossVectors(tempCameraRight, tempCameraDirection).normalize();

  const probeRadius = world.stageData.occlusion.probeRadius;
  const sampleOffsets = [
    [0, 0],
    [probeRadius, 0],
    [-probeRadius, 0],
    [0, probeRadius * 0.7],
    [0, -probeRadius * 0.45],
  ];

  let clampedDistance = desiredDistance;
  for (const [rightScale, upScale] of sampleOffsets) {
    tempCameraOrigin.copy(targetPosition);
    tempCameraSideOffset
      .copy(tempCameraRight)
      .multiplyScalar(rightScale)
      .addScaledVector(tempCameraUp, upScale);
    tempCameraOrigin.add(tempCameraSideOffset);

    world.cameraRaycaster.set(tempCameraOrigin, tempCameraDirection);
    world.cameraRaycaster.far = desiredDistance;
    const hit = world.cameraRaycaster.intersectObjects(world.cameraOcclusionMeshes, false)[0];
    if (hit) {
      clampedDistance = Math.min(clampedDistance, hit.distance - world.stageData.occlusion.collisionBuffer);
    }
  }

  clampedDistance = THREE.MathUtils.clamp(
    clampedDistance,
    world.stageData.occlusion.minDistance,
    desiredDistance,
  );
  if (telemetry && world.cameraTelemetry) {
    world.cameraTelemetry.desiredDistance = desiredDistance;
    world.cameraTelemetry.clampedDistance = clampedDistance;
  }

  desiredPosition.copy(targetPosition).addScaledVector(tempCameraDirection, clampedDistance);
  return {
    position: desiredPosition,
    desiredDistance,
    clampedDistance,
    clamped: clampedDistance < desiredDistance - 0.05,
  };
}

function resolvePreferredCameraView(targetPosition, baseCamera, world = runtime.world) {
  tempCameraDesiredPosition.copy(targetPosition).add(
    makeCameraOffset(baseCamera.yawDeg, baseCamera.pitchDeg, baseCamera.distance),
  );
  const baseCandidate = getClampedCameraPosition(
    targetPosition,
    tempCameraDesiredPosition,
    world,
    { telemetry: false },
  );
  const baseRatio = baseCandidate.desiredDistance > 0
    ? baseCandidate.clampedDistance / baseCandidate.desiredDistance
    : 1;
  const selectedBase = {
    ...baseCandidate,
    mode: "default",
    desiredYawDeg: normalizeYawDegrees(baseCamera.yawDeg),
    desiredPitchDeg: baseCamera.pitchDeg,
  };

  if (
    !world?.stageData?.occlusion?.enabled ||
    baseRatio >= world.stageData.occlusion.topDownTriggerDistanceRatio
  ) {
    if (world?.cameraTelemetry) {
      world.cameraTelemetry.mode = selectedBase.mode;
      world.cameraTelemetry.desiredYawDeg = selectedBase.desiredYawDeg;
      world.cameraTelemetry.desiredPitchDeg = selectedBase.desiredPitchDeg;
      world.cameraTelemetry.desiredDistance = selectedBase.desiredDistance;
      world.cameraTelemetry.clampedDistance = selectedBase.clampedDistance;
    }
    return selectedBase;
  }

  const topDownCamera = getTopDownOcclusionCameraSettings(baseCamera, world);
  tempCameraFallbackPosition.copy(targetPosition).add(
    makeCameraOffset(topDownCamera.yawDeg, topDownCamera.pitchDeg, topDownCamera.distance),
  );
  const topDownCandidate = getClampedCameraPosition(
    targetPosition,
    tempCameraFallbackPosition,
    world,
    { telemetry: false },
  );
  const topDownSelected = {
    ...topDownCandidate,
    mode: "alleyTopDown",
    desiredYawDeg: normalizeYawDegrees(topDownCamera.yawDeg),
    desiredPitchDeg: topDownCamera.pitchDeg,
  };
  const useTopDown =
    topDownSelected.clampedDistance >= selectedBase.clampedDistance - 0.35 ||
    topDownSelected.desiredDistance > selectedBase.desiredDistance + 0.5;
  const selected = useTopDown ? topDownSelected : selectedBase;
  if (world?.cameraTelemetry) {
    world.cameraTelemetry.mode = selected.mode;
    world.cameraTelemetry.desiredYawDeg = selected.desiredYawDeg;
    world.cameraTelemetry.desiredPitchDeg = selected.desiredPitchDeg;
    world.cameraTelemetry.desiredDistance = selected.desiredDistance;
    world.cameraTelemetry.clampedDistance = selected.clampedDistance;
  }
  return selected;
}

function collectCameraOccluders(from, to, world = runtime.world) {
  if (!world?.stageData?.occlusion?.enabled || world.cameraOcclusionMeshes.length === 0) {
    return [];
  }

  tempCameraDirection.subVectors(to, from);
  const distance = tempCameraDirection.length();
  if (distance < 0.0001) {
    return [];
  }

  tempCameraDirection.normalize();
  world.cameraRaycaster.set(from, tempCameraDirection);
  world.cameraRaycaster.far = distance;

  const occluders = [];
  const seen = new Set();
  for (const hit of world.cameraRaycaster.intersectObjects(world.cameraOcclusionMeshes, false)) {
    if (hit.distance <= 0.2 || seen.has(hit.object)) {
      continue;
    }
    seen.add(hit.object);
    occluders.push(hit.object);
  }

  return occluders;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, window.innerWidth / window.innerHeight, 0.1, 180);
  const activeCamera = getActiveCameraSettings();
  camera.position.copy(getActiveCameraOffset());
  camera.lookAt(0, activeCamera.targetHeight, 0);
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
  controls.target.set(0, getActiveCameraSettings().targetHeight, 0);
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
      case "KeyV":
        snapCameraAndFacePlayerFront();
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
      case "Digit9":
        toggleDebugFlag("route");
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
      setPistolStanceActive(true);
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      setPistolStanceActive(false);
    }
  });

  window.addEventListener("pointercancel", () => {
    setPistolStanceActive(false);
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
    setPistolStanceActive(false);
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

function normalizeTransformConfig(value, label) {
  const rotationDeg = normalizeVectorConfig(
    value?.rotationDeg,
    `${label}.rotationDeg`,
    { x: 0, y: 0, z: 0 },
  );

  return {
    position: normalizeVectorConfig(
      value?.position,
      `${label}.position`,
      { x: 0, y: 0, z: 0 },
    ),
    rotation: {
      x: THREE.MathUtils.degToRad(rotationDeg.x),
      y: THREE.MathUtils.degToRad(rotationDeg.y),
      z: THREE.MathUtils.degToRad(rotationDeg.z),
    },
    scale: normalizeScaleConfig(
      value?.scale,
      `${label}.scale`,
    ),
  };
}

function normalizeColorConfig(value, label, fallback) {
  try {
    return new THREE.Color(value ?? fallback).getHex();
  } catch {
    throw new Error(`${label} must be a valid color`);
  }
}

function normalizeStringArray(value, label) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`${label}[${index}] must be a non-empty string`);
    }
    return entry.trim();
  });
}

function normalizeStageBounds(bounds, label) {
  if (bounds == null || typeof bounds !== "object" || Array.isArray(bounds)) {
    throw new Error(`${label} must be an object`);
  }

  const normalized = {
    minX: normalizeFiniteNumber(bounds.minX, `${label}.minX`),
    maxX: normalizeFiniteNumber(bounds.maxX, `${label}.maxX`),
    minZ: normalizeFiniteNumber(bounds.minZ, `${label}.minZ`),
    maxZ: normalizeFiniteNumber(bounds.maxZ, `${label}.maxZ`),
  };

  if (normalized.minX >= normalized.maxX || normalized.minZ >= normalized.maxZ) {
    throw new Error(`${label} must describe a valid XZ range`);
  }

  return normalized;
}

function normalizeStageGrounding(grounding, label) {
  if (grounding == null || typeof grounding !== "object" || Array.isArray(grounding)) {
    throw new Error(`${label} must be an object`);
  }

  const normalized = {
    raycastHeight: normalizeFiniteNumber(grounding.raycastHeight ?? 24, `${label}.raycastHeight`),
    maxStepUp: normalizeFiniteNumber(grounding.maxStepUp ?? 1.5, `${label}.maxStepUp`),
    maxStepDown: normalizeFiniteNumber(grounding.maxStepDown ?? 3, `${label}.maxStepDown`),
    minNormalY: normalizeFiniteNumber(grounding.minNormalY ?? 0.45, `${label}.minNormalY`),
    aimHeightOffset: normalizeFiniteNumber(grounding.aimHeightOffset ?? 0.02, `${label}.aimHeightOffset`),
    walkableMeshNames: normalizeStringArray(grounding.walkableMeshNames, `${label}.walkableMeshNames`),
    walkableMeshPrefixes: normalizeStringArray(grounding.walkableMeshPrefixes, `${label}.walkableMeshPrefixes`),
  };

  if (normalized.raycastHeight <= 0) {
    throw new Error(`${label}.raycastHeight must be greater than 0`);
  }
  if (normalized.maxStepUp < 0 || normalized.maxStepDown < 0) {
    throw new Error(`${label}.maxStepUp and maxStepDown must be greater than or equal to 0`);
  }
  if (normalized.minNormalY < -1 || normalized.minNormalY > 1) {
    throw new Error(`${label}.minNormalY must be between -1 and 1`);
  }

  return normalized;
}

function normalizeStageOcclusion(occlusion, label) {
  if (occlusion == null) {
    return {
      enabled: true,
      collisionBuffer: 0.75,
      minDistance: 6,
      probeRadius: 0.7,
      fadeOpacity: 0.16,
      fadeLerp: 12,
      topDownPitchDeg: 54,
      topDownDistance: 20,
      topDownTriggerDistanceRatio: 0.9,
    };
  }

  if (typeof occlusion !== "object" || Array.isArray(occlusion)) {
    throw new Error(`${label} must be an object`);
  }

  const normalized = {
    enabled: occlusion.enabled !== false,
    collisionBuffer: normalizeFiniteNumber(occlusion.collisionBuffer ?? 0.75, `${label}.collisionBuffer`),
    minDistance: normalizeFiniteNumber(occlusion.minDistance ?? 6, `${label}.minDistance`),
    probeRadius: normalizeFiniteNumber(occlusion.probeRadius ?? 0.7, `${label}.probeRadius`),
    fadeOpacity: normalizeFiniteNumber(occlusion.fadeOpacity ?? 0.16, `${label}.fadeOpacity`),
    fadeLerp: normalizeFiniteNumber(occlusion.fadeLerp ?? 12, `${label}.fadeLerp`),
    topDownPitchDeg: normalizeFiniteNumber(occlusion.topDownPitchDeg ?? 54, `${label}.topDownPitchDeg`),
    topDownDistance: normalizeFiniteNumber(occlusion.topDownDistance ?? 20, `${label}.topDownDistance`),
    topDownTriggerDistanceRatio: normalizeFiniteNumber(
      occlusion.topDownTriggerDistanceRatio ?? 0.9,
      `${label}.topDownTriggerDistanceRatio`,
    ),
  };

  if (normalized.collisionBuffer < 0 || normalized.minDistance <= 0 || normalized.probeRadius < 0) {
    throw new Error(`${label} numeric values must be positive`);
  }
  if (normalized.fadeOpacity <= 0 || normalized.fadeOpacity >= 1) {
    throw new Error(`${label}.fadeOpacity must be between 0 and 1`);
  }
  if (normalized.fadeLerp <= 0) {
    throw new Error(`${label}.fadeLerp must be greater than 0`);
  }
  if (normalized.topDownPitchDeg <= 0 || normalized.topDownPitchDeg >= 89) {
    throw new Error(`${label}.topDownPitchDeg must be between 0 and 89`);
  }
  if (normalized.topDownDistance <= 0) {
    throw new Error(`${label}.topDownDistance must be greater than 0`);
  }
  if (
    normalized.topDownTriggerDistanceRatio <= 0 ||
    normalized.topDownTriggerDistanceRatio >= 1
  ) {
    throw new Error(`${label}.topDownTriggerDistanceRatio must be between 0 and 1`);
  }

  return normalized;
}

function normalizeStageFog(fog, label) {
  if (fog == null) {
    return {
      color: normalizeColorConfig("#08111b", `${label}.color`, "#08111b"),
      near: 18,
      far: 40,
    };
  }

  if (typeof fog !== "object" || Array.isArray(fog)) {
    throw new Error(`${label} must be an object`);
  }

  const near = normalizeFiniteNumber(fog.near ?? 18, `${label}.near`);
  const far = normalizeFiniteNumber(fog.far ?? 40, `${label}.far`);
  if (near < 0 || far <= near) {
    throw new Error(`${label} must have near >= 0 and far > near`);
  }

  return {
    color: normalizeColorConfig(fog.color, `${label}.color`, "#08111b"),
    near,
    far,
  };
}

function normalizeStageLighting(lighting, label) {
  if (lighting == null) {
    return {
      hemiSkyColor: normalizeColorConfig("#d8ebff", `${label}.hemiSkyColor`, "#d8ebff"),
      hemiGroundColor: normalizeColorConfig("#10161f", `${label}.hemiGroundColor`, "#10161f"),
      hemiIntensity: 1.15,
      keyColor: normalizeColorConfig("#ffefd7", `${label}.keyColor`, "#ffefd7"),
      keyIntensity: 2.2,
      keyPosition: { x: 8, y: 14, z: 7 },
      keyShadowBounds: 22,
      keyShadowFar: 52,
      fillColor: normalizeColorConfig("#6fdcff", `${label}.fillColor`, "#6fdcff"),
      fillIntensity: 0.7,
      fillPosition: { x: -9, y: 6, z: -5 },
    };
  }

  if (typeof lighting !== "object" || Array.isArray(lighting)) {
    throw new Error(`${label} must be an object`);
  }

  return {
    hemiSkyColor: normalizeColorConfig(lighting.hemiSkyColor, `${label}.hemiSkyColor`, "#d8ebff"),
    hemiGroundColor: normalizeColorConfig(lighting.hemiGroundColor, `${label}.hemiGroundColor`, "#10161f"),
    hemiIntensity: normalizeFiniteNumber(lighting.hemiIntensity ?? 1.15, `${label}.hemiIntensity`),
    keyColor: normalizeColorConfig(lighting.keyColor, `${label}.keyColor`, "#ffefd7"),
    keyIntensity: normalizeFiniteNumber(lighting.keyIntensity ?? 2.2, `${label}.keyIntensity`),
    keyPosition: normalizeVectorConfig(lighting.keyPosition, `${label}.keyPosition`, { x: 8, y: 14, z: 7 }),
    keyShadowBounds: normalizeFiniteNumber(lighting.keyShadowBounds ?? 22, `${label}.keyShadowBounds`),
    keyShadowFar: normalizeFiniteNumber(lighting.keyShadowFar ?? 52, `${label}.keyShadowFar`),
    fillColor: normalizeColorConfig(lighting.fillColor, `${label}.fillColor`, "#6fdcff"),
    fillIntensity: normalizeFiniteNumber(lighting.fillIntensity ?? 0.7, `${label}.fillIntensity`),
    fillPosition: normalizeVectorConfig(lighting.fillPosition, `${label}.fillPosition`, { x: -9, y: 6, z: -5 }),
  };
}

function normalizeStageCamera(camera, label) {
  if (camera == null) {
    return null;
  }

  if (typeof camera !== "object" || Array.isArray(camera)) {
    throw new Error(`${label} must be an object`);
  }

  const normalized = {
    yawDeg: normalizeFiniteNumber(camera.yawDeg ?? CONFIG.cameraYawDeg, `${label}.yawDeg`),
    pitchDeg: normalizeFiniteNumber(camera.pitchDeg ?? CONFIG.cameraPitchDeg, `${label}.pitchDeg`),
    distance: normalizeFiniteNumber(camera.distance ?? CONFIG.cameraDistance, `${label}.distance`),
    targetHeight: normalizeFiniteNumber(
      camera.targetHeight ?? CONFIG.cameraTargetHeight,
      `${label}.targetHeight`,
    ),
  };

  if (normalized.distance <= 0) {
    throw new Error(`${label}.distance must be greater than 0`);
  }

  return normalized;
}

function normalizeStageRoute(route, label) {
  if (route == null) {
    return {
      enabled: true,
      color: normalizeColorConfig("#46f4ff", `${label}.color`, "#46f4ff"),
      edgeColor: normalizeColorConfig("#ff58d6", `${label}.edgeColor`, "#ff58d6"),
      overlayOpacity: 0.2,
      debugOpacity: 0.9,
      lift: 0.04,
    };
  }

  if (typeof route !== "object" || Array.isArray(route)) {
    throw new Error(`${label} must be an object`);
  }

  const normalized = {
    enabled: route.enabled !== false,
    color: normalizeColorConfig(route.color, `${label}.color`, "#46f4ff"),
    edgeColor: normalizeColorConfig(route.edgeColor, `${label}.edgeColor`, "#ff58d6"),
    overlayOpacity: normalizeFiniteNumber(route.overlayOpacity ?? 0.2, `${label}.overlayOpacity`),
    debugOpacity: normalizeFiniteNumber(route.debugOpacity ?? 0.9, `${label}.debugOpacity`),
    lift: normalizeFiniteNumber(route.lift ?? 0.04, `${label}.lift`),
  };

  if (
    normalized.overlayOpacity <= 0 ||
    normalized.overlayOpacity >= 1 ||
    normalized.debugOpacity <= 0 ||
    normalized.debugOpacity > 1
  ) {
    throw new Error(`${label} opacities must be between 0 and 1`);
  }

  return normalized;
}

function normalizeStageDefinition(stage, index) {
  if (!stage?.id) {
    throw new Error(`Stage entry at index ${index} is missing an id`);
  }
  if (!stage.path) {
    throw new Error(`Stage '${stage.id}' is missing a path`);
  }

  const spawnYawDeg = normalizeFiniteNumber(stage.spawn?.yawDeg ?? 0, `Stage '${stage.id}' spawn.yawDeg`);

  return {
    ...stage,
    path: stage.path,
    transform: normalizeTransformConfig(stage.transform, `Stage '${stage.id}' transform`),
    spawn: {
      position: normalizeVectorConfig(
        stage.spawn?.position,
        `Stage '${stage.id}' spawn.position`,
        { x: 0, y: 0, z: 0 },
      ),
      yaw: THREE.MathUtils.degToRad(spawnYawDeg),
    },
    grounding: normalizeStageGrounding(stage.grounding, `Stage '${stage.id}' grounding`),
    bounds: normalizeStageBounds(stage.bounds, `Stage '${stage.id}' bounds`),
    fog: normalizeStageFog(stage.fog, `Stage '${stage.id}' fog`),
    lighting: normalizeStageLighting(stage.lighting, `Stage '${stage.id}' lighting`),
    camera: normalizeStageCamera(stage.camera, `Stage '${stage.id}' camera`),
    occlusion: normalizeStageOcclusion(stage.occlusion, `Stage '${stage.id}' occlusion`),
    route: normalizeStageRoute(stage.route, `Stage '${stage.id}' route`),
  };
}

function normalizeStageCatalog(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Stage catalog must be an object");
  }

  if (!Array.isArray(data.stages) || data.stages.length === 0) {
    throw new Error("Stage catalog must contain at least one stage");
  }

  const stages = data.stages.map((stage, index) => normalizeStageDefinition(stage, index));
  const defaultStageId = typeof data.defaultStageId === "string" && data.defaultStageId.trim() !== ""
    ? data.defaultStageId
    : stages[0].id;
  const defaultStage = stages.find((stage) => stage.id === defaultStageId);

  if (!defaultStage) {
    throw new Error(`Stage catalog defaultStageId '${defaultStageId}' was not found`);
  }

  return {
    version: data.version ?? 1,
    defaultStageId,
    stages,
    defaultStage,
  };
}

function getMeshBaseName(name) {
  return name.match(/^(mesh_\d+)/)?.[1] ?? name;
}

function matchesMeshSelector(name, names = [], prefixes = []) {
  if (names.includes(name)) {
    return true;
  }

  const baseName = getMeshBaseName(name);
  return prefixes.some((prefix) => prefix === name || prefix === baseName || name.startsWith(`${prefix}_`));
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
    muzzleOffset: normalizeTransformConfig(
      attachment.muzzleOffset,
      `Attachment '${key}' muzzleOffset`,
    ),
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

async function loadStageCatalog() {
  const response = await fetch("/assets/Map/index.json");
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error("Could not load /assets/Map/index.json");
  }

  const data = await response.json();
  return normalizeStageCatalog(data);
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

  const muzzleAnchor = new THREE.Group();
  muzzleAnchor.name = `${key.charAt(0).toUpperCase()}${key.slice(1)}MuzzleAnchor`;
  applyTransformToObject3D(muzzleAnchor, attachment.muzzleOffset);

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
  meshRoot.add(muzzleAnchor);
  meshRoot.add(root);
  socket.updateMatrixWorld(true);

  return {
    key,
    config: attachment,
    parentBone,
    socket,
    aimPivot,
    meshRoot,
    muzzleAnchor,
    aimLocalForward,
    aimLocalUp,
    root,
    muzzleFlash: null,
  };
}

function attachHeroWeaponVfx(hero) {
  const pistolAttachment = hero?.attachments?.pistol;
  if (!pistolAttachment || !runtime.vfx.batchRenderer || !runtime.vfx.pistolMuzzleFlashTexture) {
    return;
  }

  if (pistolAttachment.muzzleFlash?.root?.parent) {
    pistolAttachment.muzzleFlash.root.parent.remove(pistolAttachment.muzzleFlash.root);
  }

  pistolAttachment.muzzleFlash = createPistolMuzzleFlash({
    batchRenderer: runtime.vfx.batchRenderer,
    texture: runtime.vfx.pistolMuzzleFlashTexture,
  });
  pistolAttachment.muzzleAnchor.add(pistolAttachment.muzzleFlash.root);
  pistolAttachment.muzzleAnchor.updateMatrixWorld(true);
}

function playPistolMuzzleFlash(now = performance.now() / 1000) {
  runtime.hero?.attachments?.pistol?.muzzleFlash?.play(now);
}

function createWorldLighting(scene, lighting) {
  const hemi = new THREE.HemisphereLight(
    lighting.hemiSkyColor,
    lighting.hemiGroundColor,
    lighting.hemiIntensity,
  );
  scene.add(hemi);

  const key = new THREE.DirectionalLight(lighting.keyColor, lighting.keyIntensity);
  key.position.set(lighting.keyPosition.x, lighting.keyPosition.y, lighting.keyPosition.z);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -lighting.keyShadowBounds;
  key.shadow.camera.right = lighting.keyShadowBounds;
  key.shadow.camera.top = lighting.keyShadowBounds;
  key.shadow.camera.bottom = -lighting.keyShadowBounds;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = lighting.keyShadowFar;
  scene.add(key);

  const fill = new THREE.DirectionalLight(lighting.fillColor, lighting.fillIntensity);
  fill.position.set(lighting.fillPosition.x, lighting.fillPosition.y, lighting.fillPosition.z);
  scene.add(fill);

  return { hemi, key, fill };
}

function applyStageSceneTuning(scene, camera, stageData) {
  if (!stageData) {
    return;
  }

  scene.background = new THREE.Color(stageData.fog.color);
  scene.fog = new THREE.Fog(stageData.fog.color, stageData.fog.near, stageData.fog.far);

  const spanX = stageData.bounds.maxX - stageData.bounds.minX;
  const spanZ = stageData.bounds.maxZ - stageData.bounds.minZ;
  camera.far = Math.max(camera.far, Math.max(spanX, spanZ) * 6);
  camera.updateProjectionMatrix();
}

function prepareStageModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function resolveMeshSelection(root, { names = [], prefixes = [] }, { fallbackToAll = false } = {}) {
  const matches = [];
  const useFilters = names.length > 0 || prefixes.length > 0;

  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (useFilters) {
      if (matchesMeshSelector(child.name, names, prefixes)) {
        matches.push(child);
      }
      return;
    }

    if (fallbackToAll) {
      matches.push(child);
    }
  });

  return matches;
}

function resolveWalkableMeshes(root, stageData) {
  return resolveMeshSelection(
    root,
    {
      names: stageData.grounding.walkableMeshNames,
      prefixes: stageData.grounding.walkableMeshPrefixes,
    },
    { fallbackToAll: true },
  );
}

function resolveCameraOcclusionMeshes(root) {
  const meshes = [];
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    tempCameraBounds.setFromObject(child);
    const size = tempCameraBounds.getSize(tempVector);
    const footprint = size.x * size.z;
    if (size.y < 0.18 && footprint < 0.04) {
      return;
    }

    meshes.push(child);
  });
  return meshes;
}

function createRouteVisuals(walkableMeshes, routeConfig) {
  const overlay = new THREE.Group();
  overlay.name = "RouteOverlay";
  overlay.visible = routeConfig.enabled;

  const debugGroup = new THREE.Group();
  debugGroup.name = "RouteDebug";
  debugGroup.visible = false;

  const fillMaterial = new THREE.MeshBasicMaterial({
    color: routeConfig.color,
    transparent: true,
    opacity: routeConfig.overlayOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: routeConfig.edgeColor,
    transparent: true,
    opacity: routeConfig.debugOpacity,
    depthWrite: false,
  });

  for (const mesh of walkableMeshes) {
    const fill = new THREE.Mesh(mesh.geometry, fillMaterial);
    fill.matrixAutoUpdate = false;
    tempCameraMatrix.copy(mesh.matrixWorld);
    tempCameraMatrix.elements[13] += routeConfig.lift;
    fill.matrix.copy(tempCameraMatrix);
    fill.frustumCulled = false;
    fill.renderOrder = 2;
    overlay.add(fill);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 26), edgeMaterial);
    edges.matrixAutoUpdate = false;
    edges.matrix.copy(tempCameraMatrix);
    edges.frustumCulled = false;
    edges.renderOrder = 3;
    debugGroup.add(edges);
  }

  return { overlay, debugGroup };
}

async function loadStageEnvironment(parent, stageData) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(stageData.path);

  const root = gltf.scene;
  root.name = `${stageData.id}Root`;
  prepareStageModel(root);

  const wrapper = new THREE.Group();
  wrapper.name = `${stageData.id}Wrapper`;
  applyTransformToObject3D(wrapper, stageData.transform);
  wrapper.add(root);
  parent.add(wrapper);
  wrapper.updateMatrixWorld(true);

  return {
    root,
    wrapper,
    bounds: computeVisibleMeshBounds(wrapper),
    walkableMeshes: resolveWalkableMeshes(wrapper, stageData),
    cameraOcclusionMeshes: resolveCameraOcclusionMeshes(wrapper),
  };
}

function createSpawnMarker() {
  const marker = createOriginMarker(0x90ffe4, 0x5ee7a8, 0x7acbff);
  marker.scale.setScalar(0.8);
  return marker;
}

function createGroundHitMarker() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x7df5ff,
      transparent: true,
      opacity: 0.9,
    }),
  );
}

function createStageBoundsHelper(bounds, environmentBounds) {
  return new THREE.Box3Helper(
    new THREE.Box3(
      new THREE.Vector3(bounds.minX, environmentBounds.min.y, bounds.minZ),
      new THREE.Vector3(bounds.maxX, environmentBounds.max.y, bounds.maxZ),
    ),
    0x7df5ff,
  );
}

async function createGymLevel(scene, renderer, stageData = null) {
  if (stageData) {
    applyStageSceneTuning(scene, runtime.camera, stageData);
  }

  const stage = new THREE.Group();
  stage.name = stageData ? `${stageData.id}Stage` : "MinimalStage";
  scene.add(stage);

  const lights = createWorldLighting(scene, stageData?.lighting ?? normalizeStageLighting(null, "defaultLighting"));
  const helpers = {
    grid: new THREE.GridHelper(120, 48, 0x4ddfff, 0x26384e),
    axes: new THREE.AxesHelper(2.5),
    origin: createOriginMarker(),
    spawn: createSpawnMarker(),
    groundHit: createGroundHitMarker(),
    stageBounds: null,
    routeOverlay: null,
    routeDebug: null,
  };

  helpers.grid.position.y = 0.025;
  helpers.axes.position.set(-2.5, 0.03, -2.5);
  helpers.origin.position.y = 0.03;
  scene.add(helpers.grid, helpers.axes, helpers.origin, helpers.spawn, helpers.groundHit);
  if (stageData) {
    const environment = await loadStageEnvironment(stage, stageData);
    helpers.stageBounds = createStageBoundsHelper(stageData.bounds, environment.bounds);
    scene.add(helpers.stageBounds);
    if (stageData.route.enabled) {
      const routeVisuals = createRouteVisuals(environment.walkableMeshes, stageData.route);
      helpers.routeOverlay = routeVisuals.overlay;
      helpers.routeDebug = routeVisuals.debugGroup;
      stage.add(routeVisuals.overlay, routeVisuals.debugGroup);
    }
    const spawnPosition = getStageSpawnPositionFromWorld({
      stageData,
      walkableMeshes: environment.walkableMeshes,
      raycastTopY: environment.bounds.max.y + stageData.grounding.raycastHeight,
      lastGroundSample: null,
    });
    helpers.spawn.position.copy(spawnPosition);
    helpers.groundHit.visible = false;

    return {
      stage,
      floor: null,
      startPad: null,
      lights,
      helpers,
      environment,
      stageData,
      walkableMeshes: environment.walkableMeshes,
      cameraOcclusionMeshes: environment.cameraOcclusionMeshes,
      raycastTopY: environment.bounds.max.y + stageData.grounding.raycastHeight,
      lastGroundSample: null,
      cameraRaycaster: new THREE.Raycaster(),
      activeCameraOccluders: new Map(),
      forcedCameraOccluders: [],
      cameraTelemetry: {
        mode: "default",
        desiredYawDeg: 0,
        desiredPitchDeg: 0,
        desiredDistance: 0,
        clampedDistance: 0,
        activeOccluders: [],
      },
    };
  }

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

  helpers.spawn.position.set(0, 0.03, 0);
  helpers.groundHit.visible = false;

  return {
    stage,
    floor,
    startPad,
    lights,
    helpers,
    environment: null,
    stageData: null,
    walkableMeshes: [],
    cameraOcclusionMeshes: [],
    raycastTopY: CONFIG.ringY + 10,
    lastGroundSample: null,
    cameraRaycaster: new THREE.Raycaster(),
    activeCameraOccluders: new Map(),
    forcedCameraOccluders: [],
    cameraTelemetry: {
      mode: "default",
      desiredYawDeg: 0,
      desiredPitchDeg: 0,
      desiredDistance: 0,
      clampedDistance: 0,
      activeOccluders: [],
    },
  };
}

function createOriginMarker(ringColor = 0xffffff, xColor = 0x61ddff, zColor = 0xff9a72) {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 0.98, 48),
    new THREE.MeshBasicMaterial({
      color: ringColor,
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
    new THREE.LineBasicMaterial({ color: xColor }),
  );
  group.add(xLine);

  const zLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -1.35),
      new THREE.Vector3(0, 0, 1.35),
    ]),
    new THREE.LineBasicMaterial({ color: zColor }),
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

function isWithinStageBounds(x, z, world = runtime.world) {
  const bounds = world?.stageData?.bounds;
  if (!bounds) {
    return true;
  }

  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    z >= bounds.minZ &&
    z <= bounds.maxZ
  );
}

function getGroundSampleAt(x, z, world = runtime.world) {
  if (!world?.stageData) {
    return {
      point: new THREE.Vector3(x, CONFIG.ringY, z),
      normal: UP.clone(),
      objectName: world?.floor?.name ?? null,
    };
  }

  if (!isWithinStageBounds(x, z, world) || world.walkableMeshes.length === 0) {
    return null;
  }

  if (!world.raycaster) {
    world.raycaster = new THREE.Raycaster();
  }

  tempGroundRayOrigin.set(x, world.raycastTopY, z);
  world.raycaster.set(tempGroundRayOrigin, new THREE.Vector3(0, -1, 0));
  const hits = world.raycaster.intersectObjects(world.walkableMeshes, false);

  for (const hit of hits) {
    if (!hit.face) {
      continue;
    }

    tempGroundNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
    if (tempGroundNormal.y < world.stageData.grounding.minNormalY) {
      continue;
    }

    return {
      point: hit.point.clone(),
      normal: tempGroundNormal.clone(),
      objectName: hit.object.name,
    };
  }

  return null;
}

function setLastGroundSample(sample, world = runtime.world) {
  if (!world) {
    return;
  }

  world.lastGroundSample = sample
    ? {
        point: sample.point.clone(),
        normal: sample.normal.clone(),
        objectName: sample.objectName ?? null,
      }
    : null;
}

function getStageSpawnPositionFromWorld(world = runtime.world) {
  tempSpawnPosition.set(
    world?.stageData?.spawn.position.x ?? 0,
    world?.stageData?.spawn.position.y ?? CONFIG.ringY,
    world?.stageData?.spawn.position.z ?? 0,
  );

  const sample = getGroundSampleAt(tempSpawnPosition.x, tempSpawnPosition.z, world);
  if (sample) {
    tempSpawnPosition.copy(sample.point);
  }

  return tempSpawnPosition;
}

function setHeroGroundPosition(hero, x, z, { force = false, track = false } = {}) {
  const sample = getGroundSampleAt(x, z);
  if (!sample) {
    if (track) {
      setLastGroundSample(null);
    }
    return false;
  }

  if (!force && runtime.world?.stageData) {
    const deltaY = sample.point.y - hero.root.position.y;
    if (
      deltaY > runtime.world.stageData.grounding.maxStepUp ||
      deltaY < -runtime.world.stageData.grounding.maxStepDown
    ) {
      if (track) {
        setLastGroundSample(getGroundSampleAt(hero.root.position.x, hero.root.position.z));
      }
      return false;
    }
  }

  hero.root.position.set(x, sample.point.y, z);
  if (track) {
    setLastGroundSample(sample);
  }
  return true;
}

function resetAimPointFromHero(hero) {
  if (!hero) {
    return;
  }

  tempVector.set(Math.sin(hero.root.rotation.y), 0, Math.cos(hero.root.rotation.y));
  if (tempVector.lengthSq() < 0.0001) {
    tempVector.set(0, 0, 1);
  } else {
    tempVector.normalize();
  }

  runtime.aimPoint.copy(hero.root.position).addScaledVector(tempVector, 4);
  runtime.aimPoint.y = hero.root.position.y + (runtime.world?.stageData?.grounding.aimHeightOffset ?? 0.02);
}

function placeHeroAtStageSpawn(hero) {
  const spawnPosition = getStageSpawnPositionFromWorld();
  const spawnYaw = runtime.world?.stageData?.spawn.yaw ?? 0;

  hero.root.position.copy(spawnPosition);
  hero.root.rotation.set(0, spawnYaw, 0);
  hero.lastMoveDirection.set(Math.sin(spawnYaw), 0, Math.cos(spawnYaw));
  hero.rollDirection.copy(hero.lastMoveDirection);
  setLastGroundSample(getGroundSampleAt(spawnPosition.x, spawnPosition.z));
  runtime.world.helpers.spawn.position.copy(spawnPosition);
  runtime.world.helpers.spawn.position.y += 0.03;
  resetAimPointFromHero(hero);
}

function updateFrame() {
  const dt = Math.min(runtime.clock.getDelta(), CONFIG.maxDelta);
  if (!runtime.hero) {
    runtime.vfx.batchRenderer?.update(dt);
    runtime.renderer.render(runtime.scene, runtime.camera);
    return;
  }

  runtime.hero.mixer.update(dt);
  updateAimTarget(dt);
  updateHero(dt);
  refillHudStamina(dt);
  syncWeaponAim(runtime.hero);
  runtime.vfx.batchRenderer?.update(dt);
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
  const currentX = hero.root.position.x;
  const currentZ = hero.root.position.z;

  const isEvading = Boolean(hero.actionLock);
  const canMoveOnGround = !isEvading;
  const moveStrength = desiredMove.lengthSq();

  if (isEvading && hero.rollTimeLeft > 0) {
    const nextX = hero.root.position.x + hero.rollDirection.x * CONFIG.rollSpeed * dt;
    const nextZ = hero.root.position.z + hero.rollDirection.z * CONFIG.rollSpeed * dt;
    if (setHeroGroundPosition(hero, nextX, nextZ, { track: true })) {
      hero.lastMoveDirection.copy(hero.rollDirection);
    } else {
      setHeroGroundPosition(hero, currentX, currentZ, { force: true, track: true });
    }
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
    const speed = runtime.input.pistolStance
      ? CONFIG.pistolMoveSpeed
      : runtime.input.crouchModifier
        ? CONFIG.crouchSpeed
        : runtime.input.sprintModifier
          ? CONFIG.sprintSpeed
          : CONFIG.runSpeed;
    if (canMoveOnGround) {
      const nextX = hero.root.position.x + desiredMove.x * speed * dt;
      const nextZ = hero.root.position.z + desiredMove.z * speed * dt;
      if (setHeroGroundPosition(hero, nextX, nextZ, { track: true })) {
        hero.lastMoveDirection.copy(desiredMove);
      } else {
        setHeroGroundPosition(hero, currentX, currentZ, { force: true, track: true });
      }
    }
  } else {
    setHeroGroundPosition(hero, hero.root.position.x, hero.root.position.z, { force: true, track: true });
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

  if (shouldSuppressAimYawForCameraPan()) {
    return;
  }

  const camera = getActiveCameraSettings();
  tempScreenPoint.copy(runtime.hero.root.position);
  tempScreenPoint.y += camera.targetHeight;
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
  runtime.aimPoint.y = runtime.hero.root.position.y + (runtime.world?.stageData?.grounding.aimHeightOffset ?? 0.02);

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
  syncCameraYawState(dt);
  const camera = getActiveCameraSettings();
  runtime.cameraTarget.copy(hero.root.position);
  runtime.cameraTarget.y += camera.targetHeight;

  if (runtime.debug.orbit) {
    runtime.controls.enabled = true;
    runtime.controls.target.lerp(runtime.cameraTarget, 1 - Math.exp(-dt * CONFIG.cameraLerp));
    runtime.controls.update();
    runtime.world.cameraTelemetry.activeOccluders = [];
    updateOccluderFadeState(dt, []);
    return;
  }

  runtime.controls.enabled = false;
  runtime.cameraLookTarget.lerp(runtime.cameraTarget, 1 - Math.exp(-dt * CONFIG.cameraLerp));
  const preferredView = resolvePreferredCameraView(runtime.cameraTarget, camera);
  runtime.camera.position.lerp(preferredView.position, 1 - Math.exp(-dt * CONFIG.cameraLerp));
  const occluders = collectCameraOccluders(runtime.cameraLookTarget, runtime.camera.position);
  for (const mesh of runtime.world.forcedCameraOccluders) {
    if (!occluders.includes(mesh)) {
      occluders.push(mesh);
    }
  }
  runtime.world.cameraTelemetry.activeOccluders = occluders.map((mesh) => mesh.name);
  updateOccluderFadeState(dt, occluders);
  runtime.camera.lookAt(runtime.cameraLookTarget);
}

function updateDebugHelpers() {
  const { helpers: worldHelpers } = runtime.world;
  worldHelpers.grid.visible = runtime.debug.grid;
  worldHelpers.axes.visible = runtime.debug.axes;
  worldHelpers.origin.visible = runtime.debug.origin;
  worldHelpers.spawn.visible = runtime.debug.origin;
  if (worldHelpers.stageBounds) {
    worldHelpers.stageBounds.visible = runtime.debug.bounds;
  }
  if (worldHelpers.routeDebug) {
    worldHelpers.routeDebug.visible = runtime.debug.route;
  }
  worldHelpers.groundHit.visible = runtime.debug.bounds && Boolean(runtime.world.lastGroundSample);
  if (runtime.world.lastGroundSample) {
    worldHelpers.groundHit.position.copy(runtime.world.lastGroundSample.point);
  }

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

function getAimRelativeDirectionFromVector(hero, vector, { fourWay = false } = {}) {
  if (!hero || vector.lengthSq() < 0.0001) {
    return "forward";
  }

  const aimForward = getAimForwardVector(hero);
  tempAimRight.crossVectors(aimForward, UP).normalize();

  const forwardDot = vector.dot(aimForward);
  const rightDot = vector.dot(tempAimRight);
  const angleDeg = THREE.MathUtils.radToDeg(Math.atan2(rightDot, forwardDot));

  if (fourWay) {
    if (angleDeg >= -45 && angleDeg < 45) {
      return "forward";
    }
    if (angleDeg >= 45 && angleDeg < 135) {
      return "right";
    }
    if (angleDeg >= 135 || angleDeg < -135) {
      return "back";
    }
    return "left";
  }

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

function getAimRelativeMoveDirection(hero) {
  if (!hero) {
    return "forward";
  }

  return getAimRelativeDirectionFromVector(hero, hero.moveDirection);
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
  const desiredMove = getCameraRelativeMove();
  const evadeDirection = getAimRelativeDirectionFromVector(hero, desiredMove, { fourWay: true });
  const evadeMove = desiredMove.lengthSq() > 0 ? desiredMove : getAimForwardVector(hero);

  if (evadeDirection === "left") {
    return {
      clipName: ACTIONS.dodgeLeft,
      lockName: "dodgeLeft",
      label: "Dodge left",
      direction: tempEvadeDirection.copy(evadeMove),
    };
  }

  if (evadeDirection === "right") {
    return {
      clipName: ACTIONS.dodgeRight,
      lockName: "dodgeRight",
      label: "Dodge right",
      direction: tempEvadeDirection.copy(evadeMove),
    };
  }

  if (evadeDirection === "back") {
    return {
      clipName: ACTIONS.backFlip,
      lockName: "backFlip",
      label: "Backflip",
      direction: tempEvadeDirection.copy(evadeMove),
    };
  }

  return {
    clipName: ACTIONS.roll,
    lockName: "roll",
    label: "Roll",
    direction: tempEvadeDirection.copy(evadeMove),
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
    return false;
  }

  hero.upperBodyActionLock = clipName;
  hero.upperBodyRecoveryTimeLeft = hero.upperBodyRecoveryDurations[clipName] ?? 0;
  syncGroundedAnimation(hero, true);
  showToast(label);
  return true;
}

function requestPunch(clipName, label) {
  requestUpperBodyAction(clipName, label);
}

function requestPistolShoot() {
  if (!requestUpperBodyAction(ACTIONS.pistolShoot, "Pistol shot", {
    requiresPistolStance: true,
  })) {
    return;
  }

  playPistolMuzzleFlash();
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
  runtime.hero.grounded = true;
  runtime.hero.actionLock = null;
  runtime.hero.upperBodyActionLock = null;
  runtime.hero.upperBodyRecoveryTimeLeft = 0;
  runtime.hero.rollTimeLeft = 0;
  runtime.hero.evadeRecoveryTimeLeft = 0;
  placeHeroAtStageSpawn(runtime.hero);
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

function teleportHeroForTest(x, z, yawDeg = null) {
  if (!runtime.hero) {
    return false;
  }

  const success = setHeroGroundPosition(runtime.hero, x, z, { force: true, track: true });
  if (!success) {
    return false;
  }

  if (yawDeg != null) {
    runtime.hero.root.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    runtime.hero.lastMoveDirection.set(
      Math.sin(runtime.hero.root.rotation.y),
      0,
      Math.cos(runtime.hero.root.rotation.y),
    );
    runtime.hero.rollDirection.copy(runtime.hero.lastMoveDirection);
  }

  resetAimPointFromHero(runtime.hero);
  snapCameraToHero(runtime.hero);
  return true;
}

function setForcedCameraOccludersForTest(names) {
  if (!runtime.world) {
    return [];
  }

  const requestedNames = Array.isArray(names) ? names : [];
  runtime.world.forcedCameraOccluders = runtime.world.cameraOcclusionMeshes.filter(
    (mesh) => requestedNames.includes(mesh.name),
  );
  runtime.world.cameraTelemetry.activeOccluders = runtime.world.forcedCameraOccluders.map((mesh) => mesh.name);
  updateOccluderFadeState(1, runtime.world.forcedCameraOccluders);
  return runtime.world.forcedCameraOccluders.map((mesh) => mesh.name);
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

  const desiredCameraDistance = getActiveCameraOffset(tempCameraOffset).length();
  const currentCameraDistance = runtime.camera.position.distanceTo(runtime.cameraTarget);
  const currentCameraYawDeg = normalizeYawDegrees(
    THREE.MathUtils.radToDeg(
      Math.atan2(
        runtime.camera.position.x - runtime.cameraTarget.x,
        runtime.camera.position.z - runtime.cameraTarget.z,
      ),
    ),
  );
  const currentCameraPitchDeg = THREE.MathUtils.radToDeg(
    Math.atan2(
      runtime.camera.position.y - runtime.cameraTarget.y,
      Math.hypot(
        runtime.camera.position.x - runtime.cameraTarget.x,
        runtime.camera.position.z - runtime.cameraTarget.z,
      ),
    ),
  );

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
    stage: runtime.world?.stageData
      ? {
          id: runtime.world.stageData.id,
          displayName: runtime.world.stageData.displayName ?? null,
          spawn: {
            x: runtime.world.stageData.spawn.position.x,
            y: runtime.world.stageData.spawn.position.y,
            z: runtime.world.stageData.spawn.position.z,
            yaw: runtime.world.stageData.spawn.yaw,
          },
          bounds: {
            ...runtime.world.stageData.bounds,
          },
        }
      : null,
    currentGround: runtime.world?.lastGroundSample
      ? {
          x: runtime.world.lastGroundSample.point.x,
          y: runtime.world.lastGroundSample.point.y,
          z: runtime.world.lastGroundSample.point.z,
          normalY: runtime.world.lastGroundSample.normal.y,
          objectName: runtime.world.lastGroundSample.objectName,
          baseName: getMeshBaseName(runtime.world.lastGroundSample.objectName ?? ""),
        }
      : null,
    route: runtime.world?.stageData
      ? {
          walkableMeshPrefixes: [...runtime.world.stageData.grounding.walkableMeshPrefixes],
          routeOverlayEnabled: runtime.world.stageData.route.enabled,
        }
      : null,
    camera: {
      position: {
        x: runtime.camera.position.x,
        y: runtime.camera.position.y,
        z: runtime.camera.position.z,
      },
      target: {
        x: runtime.cameraTarget.x,
        y: runtime.cameraTarget.y,
        z: runtime.cameraTarget.z,
      },
      distance: currentCameraDistance,
      desiredDistance: runtime.world.cameraTelemetry?.desiredDistance ?? desiredCameraDistance,
      clampedDistance: runtime.world.cameraTelemetry?.clampedDistance ?? desiredCameraDistance,
      yawDeg: currentCameraYawDeg,
      targetYawDeg: runtime.cameraYawTargetDeg ?? normalizeYawDegrees(getActiveCameraSettings().yawDeg),
      desiredYawDeg: runtime.world.cameraTelemetry?.desiredYawDeg ?? normalizeYawDegrees(getActiveCameraSettings().yawDeg),
      pitchDeg: currentCameraPitchDeg,
      desiredPitchDeg: runtime.world.cameraTelemetry?.desiredPitchDeg ?? getActiveCameraSettings().pitchDeg,
      mode: runtime.world.cameraTelemetry?.mode ?? "default",
      clamped:
        (runtime.world.cameraTelemetry?.clampedDistance ?? desiredCameraDistance) <
        (runtime.world.cameraTelemetry?.desiredDistance ?? desiredCameraDistance) - 0.05,
      activeOccluders: [...(runtime.world.cameraTelemetry?.activeOccluders ?? [])].slice(0, 12),
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
    aimYawSuppressed: runtime.suppressAimYawUntilCameraSettled,
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
          muzzleAnchorLocalPosition: {
            x: runtime.hero.attachments.pistol.muzzleAnchor.position.x,
            y: runtime.hero.attachments.pistol.muzzleAnchor.position.y,
            z: runtime.hero.attachments.pistol.muzzleAnchor.position.z,
          },
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
    pistolMuzzleFlash: runtime.hero.attachments?.pistol?.muzzleFlash
      ? {
          active: runtime.hero.attachments.pistol.muzzleFlash.isActive(),
          triggerCount: runtime.hero.attachments.pistol.muzzleFlash.triggerCount,
          lastTriggerTime: runtime.hero.attachments.pistol.muzzleFlash.lastTriggerTime,
          activeUntilTime: runtime.hero.attachments.pistol.muzzleFlash.activeUntilTime,
          durationSeconds: runtime.hero.attachments.pistol.muzzleFlash.durationSeconds,
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
