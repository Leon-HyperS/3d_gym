import * as THREE from "three";
import {
  BatchedRenderer,
  Bezier,
  ColorOverLife,
  ColorRange,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  FrameOverLife,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  QuarksUtil,
  RandomColor,
  RenderMode,
  RotationOverLife,
  SizeOverLife,
} from "three.quarks";

export const PISTOL_MUZZLE_FLASH_TEXTURE_PATH = "/assets/vfx/quarks/texture1.png";
export const PISTOL_MUZZLE_FLASH_DURATION_SECONDS = 0.35;

function createAdditiveAtlasMaterial(texture) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
}

function createSoftAtlasMaterial(texture) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
}

function addSystem(root, batchRenderer, system) {
  root.add(system.emitter);
  batchRenderer.addSystem(system);
  return system;
}

function createBeamSystem(root, batchRenderer, texture) {
  const beam = addSystem(
    root,
    batchRenderer,
    new ParticleSystem({
      duration: 1,
      looping: false,
      startLife: new IntervalValue(0.05, 0.08),
      startSpeed: new ConstantValue(0),
      startSize: new ConstantValue(0.24),
      startColor: new ConstantColor(new THREE.Vector4(1, 0.62, 0.18, 0.9)),
      worldSpace: false,
      maxParticle: 3,
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(1),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new PointEmitter(),
      material: createAdditiveAtlasMaterial(texture),
      startTileIndex: new ConstantValue(1),
      uTileCount: 10,
      vTileCount: 10,
      renderMode: RenderMode.BillBoard,
      renderOrder: 0,
    }),
  );
  beam.addBehavior(
    new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.95, 0.72, 0), 0]])),
  );
  beam.emitter.name = "PistolMuzzleBeam";
  beam.emitter.position.x = 0.045;
}

function createMuzzleCoreSystems(root, batchRenderer, texture) {
  const sharedParameters = {
    duration: 1,
    looping: false,
    startLife: new IntervalValue(0.05, 0.09),
    startSpeed: new ConstantValue(0),
    startSize: new IntervalValue(0.1, 0.28),
    startColor: new ConstantColor(new THREE.Vector4(1, 1, 1, 1)),
    worldSpace: false,
    maxParticle: 4,
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(1),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    shape: new PointEmitter(),
    material: createAdditiveAtlasMaterial(texture),
    startTileIndex: new ConstantValue(91),
    uTileCount: 10,
    vTileCount: 10,
    renderMode: RenderMode.BillBoard,
    renderOrder: 2,
  };

  const muzzleHorizontal = addSystem(root, batchRenderer, new ParticleSystem(sharedParameters));
  muzzleHorizontal.addBehavior(
    new ColorOverLife(
      new ColorRange(
        new THREE.Vector4(1, 0.41, 0.13, 1),
        new THREE.Vector4(1, 0.84, 0.3, 1),
      ),
    ),
  );
  muzzleHorizontal.addBehavior(
    new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.95, 0.75, 0), 0]])),
  );
  muzzleHorizontal.addBehavior(
    new FrameOverLife(new PiecewiseBezier([[new Bezier(91, 94, 97, 100), 0]])),
  );
  muzzleHorizontal.emitter.name = "PistolMuzzleHorizontal";
  muzzleHorizontal.emitter.position.x = 0.04;

  const muzzleVertical = addSystem(root, batchRenderer, new ParticleSystem(sharedParameters));
  muzzleVertical.addBehavior(
    new ColorOverLife(
      new ColorRange(
        new THREE.Vector4(1, 0.41, 0.13, 1),
        new THREE.Vector4(1, 0.84, 0.3, 1),
      ),
    ),
  );
  muzzleVertical.addBehavior(
    new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.95, 0.75, 0), 0]])),
  );
  muzzleVertical.addBehavior(
    new FrameOverLife(new PiecewiseBezier([[new Bezier(91, 94, 97, 100), 0]])),
  );
  muzzleVertical.emitter.name = "PistolMuzzleVertical";
  muzzleVertical.emitter.position.x = 0.04;
  muzzleVertical.emitter.rotation.x = Math.PI * 0.5;
}

function createFlashSystem(root, batchRenderer, texture) {
  const flash = addSystem(
    root,
    batchRenderer,
    new ParticleSystem({
      duration: 1,
      looping: false,
      startLife: new IntervalValue(0.04, 0.08),
      startSpeed: new ConstantValue(0),
      startSize: new IntervalValue(0.12, 0.26),
      startRotation: new IntervalValue(-Math.PI, Math.PI),
      startColor: new ConstantColor(new THREE.Vector4(1, 1, 1, 1)),
      worldSpace: false,
      maxParticle: 4,
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(2),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new PointEmitter(),
      material: createAdditiveAtlasMaterial(texture),
      startTileIndex: new ConstantValue(81),
      uTileCount: 10,
      vTileCount: 10,
      renderMode: RenderMode.BillBoard,
      renderOrder: 3,
    }),
  );

  flash.addBehavior(
    new ColorOverLife(
      new ColorRange(
        new THREE.Vector4(1, 0.95, 0.82, 1),
        new THREE.Vector4(1, 0.38, 0.12, 1),
      ),
    ),
  );
  flash.addBehavior(
    new FrameOverLife(new PiecewiseBezier([[new Bezier(81, 84.333, 87.666, 91), 0]])),
  );
  flash.emitter.name = "PistolMuzzleFlash";
}

function createSparkSystem(root, batchRenderer, texture) {
  const sparks = addSystem(
    root,
    batchRenderer,
    new ParticleSystem({
      duration: 1,
      looping: false,
      startLife: new IntervalValue(0.05, 0.12),
      startSpeed: new IntervalValue(0.35, 0.9),
      startSize: new IntervalValue(0.02, 0.05),
      startColor: new RandomColor(
        new THREE.Vector4(1, 0.92, 0.55, 0.9),
        new THREE.Vector4(1, 0.45, 0.18, 0.9),
      ),
      worldSpace: true,
      maxParticle: 8,
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(4),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new ConeEmitter({
        angle: (14 * Math.PI) / 180,
        radius: 0.01,
        thickness: 1,
        arc: Math.PI * 2,
      }),
      material: createSoftAtlasMaterial(texture),
      startTileIndex: new ConstantValue(0),
      uTileCount: 10,
      vTileCount: 10,
      renderMode: RenderMode.StretchedBillBoard,
      speedFactor: 0.42,
      renderOrder: 1,
    }),
  );

  sparks.addBehavior(
    new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.95, 0.72, 0), 0]])),
  );
  sparks.addBehavior(new RotationOverLife(new IntervalValue(-Math.PI / 8, Math.PI / 8)));
  sparks.emitter.name = "PistolMuzzleSparks";
  sparks.emitter.rotation.y = Math.PI * 0.5;
}

function buildCodeAuthoredPistolMuzzleFlash(root, batchRenderer, texture) {
  createBeamSystem(root, batchRenderer, texture);
  createMuzzleCoreSystems(root, batchRenderer, texture);
  createFlashSystem(root, batchRenderer, texture);
  createSparkSystem(root, batchRenderer, texture);
}

export function createQuarksBatchRenderer() {
  const batchRenderer = new BatchedRenderer();
  batchRenderer.name = "QuarksBatchRenderer";
  return batchRenderer;
}

export async function loadPistolMuzzleFlashTexture(textureLoader = new THREE.TextureLoader()) {
  const texture = await textureLoader.loadAsync(PISTOL_MUZZLE_FLASH_TEXTURE_PATH);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPistolMuzzleFlash({ batchRenderer, texture }) {
  if (!batchRenderer) {
    throw new Error("createPistolMuzzleFlash requires a Quarks batch renderer");
  }
  if (!texture) {
    throw new Error("createPistolMuzzleFlash requires a loaded atlas texture");
  }

  const root = new THREE.Group();
  root.name = "PistolMuzzleFlashRoot";

  buildCodeAuthoredPistolMuzzleFlash(root, batchRenderer, texture);
  QuarksUtil.stop(root);

  let triggerCount = 0;
  let lastTriggerTime = -Infinity;
  let activeUntilTime = -Infinity;

  return {
    root,
    get triggerCount() {
      return triggerCount;
    },
    get lastTriggerTime() {
      return lastTriggerTime;
    },
    get activeUntilTime() {
      return activeUntilTime;
    },
    get durationSeconds() {
      return PISTOL_MUZZLE_FLASH_DURATION_SECONDS;
    },
    isActive(now = performance.now() / 1000) {
      return now < activeUntilTime;
    },
    play(now = performance.now() / 1000) {
      triggerCount += 1;
      lastTriggerTime = now;
      activeUntilTime = now + PISTOL_MUZZLE_FLASH_DURATION_SECONDS;
      QuarksUtil.restart(root);
    },
    stop() {
      activeUntilTime = -Infinity;
      QuarksUtil.stop(root);
    },
  };
}
