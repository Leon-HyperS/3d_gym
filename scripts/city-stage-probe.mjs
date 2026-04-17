import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4173/";

await fs.mkdir("artifacts", { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});

async function readState() {
  return page.evaluate(() => window.__TEST__.getState());
}

async function teleportHero(x, z, yawDeg = 0) {
  return page.evaluate(
    ([nextX, nextZ, nextYawDeg]) => window.__TEST__.teleportHero(nextX, nextZ, nextYawDeg),
    [x, z, yawDeg],
  );
}

function planarDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function angleDifferenceDeg(a, b) {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function normalizeYawDeg(value) {
  return ((value % 360) + 360) % 360;
}

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__TEST__?.ready === true);
  await page.waitForTimeout(1200);

  const initial = await readState();
  assert.equal(initial.stage?.id, "futuristic_city", "city stage should load before gameplay starts");
  assert.ok(initial.currentGround, "city stage should expose an initial ground sample");
  assert.ok(
    Math.abs(initial.heroPosition.y - initial.currentGround.y) < 0.001,
    "hero should spawn directly on the sampled stage ground",
  );
  assert.ok(
    initial.route?.walkableMeshPrefixes.includes(initial.currentGround.baseName),
    "spawn should land on the legal road mesh set",
  );

  await page.screenshot({ path: "artifacts/city-stage-road-readability.png" });

  await page.keyboard.press("Digit9");
  await page.waitForTimeout(120);
  const routeDebugEnabled = await readState();
  assert.equal(routeDebugEnabled.debug.route, true, "Digit9 should toggle the legal-road debug overlay");
  await page.screenshot({ path: "artifacts/city-stage-route-debug.png" });
  await page.keyboard.press("Digit9");
  await page.waitForTimeout(80);

  await page.keyboard.press("Digit4");
  await page.waitForTimeout(120);
  const afterBoundsToggle = await readState();
  assert.equal(afterBoundsToggle.debug.bounds, true, "Digit4 should still toggle bounds debug");
  await page.screenshot({ path: "artifacts/city-stage-probe-bounds.png" });
  await page.keyboard.press("Digit4");
  await page.waitForTimeout(80);

  await page.keyboard.down("w");
  await page.waitForTimeout(700);
  const duringMove = await readState();
  await page.keyboard.up("w");
  assert.ok(
    planarDistance(duringMove.heroPosition, initial.heroPosition) > 0.15,
    "forward input should move the hero on the city stage",
  );
  assert.ok(duringMove.currentGround, "movement should keep returning a stage ground sample");
  assert.ok(
    Math.abs(duringMove.heroPosition.y - duringMove.currentGround.y) < 0.001,
    "movement should keep the hero grounded to the sampled map surface",
  );
  await page.screenshot({ path: "artifacts/city-stage-probe-move.png" });

  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  const rollActive = await readState();
  assert.equal(rollActive.actionLock, "roll", "space should start the roll action on the city stage");
  assert.equal(rollActive.currentClip, "Roll", "roll startup should still select the roll clip");
  await page.waitForTimeout(1500);
  const rollRecovered = await readState();
  assert.equal(rollRecovered.actionLock, null, "roll should recover back to normal control");
  assert.ok(rollRecovered.currentGround, "roll recovery should still have a valid ground sample");
  assert.ok(
    Math.abs(rollRecovered.heroPosition.y - rollRecovered.currentGround.y) < 0.001,
    "roll recovery should keep the hero attached to the map ground",
  );

  await page.evaluate(() => document.querySelector('[data-action="reset"]').click());
  await page.waitForTimeout(180);
  const afterReset = await readState();
  assert.ok(
    planarDistance(afterReset.heroPosition, initial.heroPosition) < 0.02,
    "reset should return the hero to the configured city spawn",
  );
  assert.ok(
    Math.abs(afterReset.heroPosition.y - initial.heroPosition.y) < 0.001,
    "reset should restore the spawn ground height",
  );

  const illegalRoadAttempt = await teleportHero(20, -6, 0);
  assert.equal(illegalRoadAttempt, false, "off-road teleport should be rejected by the legal-road contract");
  const afterIllegalRoadAttempt = await readState();
  assert.ok(
    planarDistance(afterIllegalRoadAttempt.heroPosition, afterReset.heroPosition) < 0.001,
    "failed off-road placement should leave the hero on the previous legal road position",
  );
  assert.equal(
    afterIllegalRoadAttempt.currentGround?.baseName,
    afterReset.currentGround?.baseName,
    "failed off-road placement should not replace the tracked legal ground sample",
  );

  const alleyTeleport = await teleportHero(-48, -5, 0);
  assert.equal(alleyTeleport, true, "legal alley clamp point should be reachable through the road contract");
  await page.waitForTimeout(220);
  const alleyState = await readState();
  assert.equal(alleyState.currentGround?.baseName, "mesh_76", "alley clamp point should still sit on a legal road mesh");
  assert.equal(alleyState.camera.mode, "alleyTopDown", "tight alley checkpoint should switch into the elevated alley camera");
  assert.ok(
    alleyState.camera.distance > initial.camera.distance,
    "tight alley checkpoint should zoom the camera out instead of collapsing inward",
  );
  assert.ok(
    alleyState.camera.pitchDeg > initial.camera.pitchDeg,
    "tight alley checkpoint should steepen the camera into a more top-down angle",
  );
  assert.equal(
    alleyState.camera.clamped,
    false,
    "elevated alley camera should avoid the close boom clamp at the checkpoint",
  );
  assert.equal(
    alleyState.camera.activeOccluders.length,
    0,
    "elevated alley camera should clear the alley blockers at the checkpoint",
  );
  await page.screenshot({ path: "artifacts/city-stage-alley-clamp.png" });

  const recoveredToSpawn = await teleportHero(initial.heroPosition.x, initial.heroPosition.z, 45);
  assert.equal(recoveredToSpawn, true, "camera recovery pass should be able to restore the spawn road position");
  await page.waitForTimeout(320);
  const afterAlleyRecovery = await readState();
  assert.ok(
    planarDistance(afterAlleyRecovery.heroPosition, initial.heroPosition) < 0.02,
    "camera recovery checkpoint should land back on the spawn road",
  );
  assert.equal(afterAlleyRecovery.camera.mode, "default", "camera should return to the default follow mode after leaving the alley");
  assert.equal(
    afterAlleyRecovery.camera.activeOccluders.length,
    0,
    "faded alley blockers should recover once the hero leaves the obstruction",
  );

  await page.evaluate(() => {
    const target = document.body;
    target.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      clientX: 720,
      clientY: 450,
    }));
    target.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 2,
      clientX: 720,
      clientY: 450,
    }));
  });
  await page.waitForTimeout(180);
  const pistolStance = await readState();
  assert.equal(pistolStance.pistolPresented, true, "RMB should still present the pistol stance");
  assert.equal(pistolStance.pistolAttachment?.visible, true, "pistol mesh should be visible in stance");

  await page.evaluate(() => {
    const target = document.body;
    target.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: 3,
      clientX: 720,
      clientY: 450,
    }));
  });
  await page.waitForTimeout(100);
  const pistolShoot = await readState();
  assert.equal(pistolShoot.upperClip, "Pistol_Shoot", "LMB in pistol stance should still fire");
  assert.equal(pistolShoot.pistolAttachment?.visible, true, "pistol should remain visible while shooting");

  await page.evaluate(() => {
    const target = document.body;
    target.dispatchEvent(new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 0,
      clientX: 720,
      clientY: 450,
    }));
  });
  await page.waitForTimeout(220);
  const afterRelease = await readState();
  assert.equal(afterRelease.pistolPresented, false, "releasing RMB should clear pistol stance");
  assert.equal(afterRelease.currentGround?.objectName != null, true, "combat should not break stage grounding");

  const alignSetup = await teleportHero(initial.heroPosition.x, initial.heroPosition.z, 135);
  assert.equal(alignSetup, true, "snap-camera alignment setup should land back on a legal road");
  await page.evaluate(() => {
    const target = document.body;
    target.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      clientX: 1090,
      clientY: 260,
    }));
  });
  await page.waitForTimeout(220);
  const beforeCameraAlign = await readState();
  assert.ok(
    angleDifferenceDeg(beforeCameraAlign.camera.yawDeg, normalizeYawDeg((beforeCameraAlign.rootYaw * 180) / Math.PI + 180)) > 20,
    "snap-camera setup should start with the camera offset from the recentered behind-the-hero angle",
  );
  await page.keyboard.press("KeyV");
  await page.waitForTimeout(80);
  const duringCameraAlign = await readState();
  const expectedPlayerFrontYawDeg = normalizeYawDeg(duringCameraAlign.camera.targetYawDeg + 180);
  assert.ok(
    angleDifferenceDeg(duringCameraAlign.camera.yawDeg, beforeCameraAlign.camera.yawDeg) > 2,
    "V should start moving the camera toward the new angle quickly",
  );
  assert.ok(
    angleDifferenceDeg(duringCameraAlign.camera.yawDeg, duringCameraAlign.camera.targetYawDeg) > 4,
    "V camera motion should pan instead of finishing in a single frame",
  );
  assert.ok(
    angleDifferenceDeg((duringCameraAlign.rootYaw * 180) / Math.PI, expectedPlayerFrontYawDeg) < 2,
    "V should rotate the hero to face player-front for the target camera angle immediately",
  );
  await page.waitForTimeout(520);
  const afterCameraAlign = await readState();
  assert.ok(
    angleDifferenceDeg(afterCameraAlign.camera.yawDeg, afterCameraAlign.camera.targetYawDeg)
      < angleDifferenceDeg(duringCameraAlign.camera.yawDeg, duringCameraAlign.camera.targetYawDeg),
    "V should keep panning the camera closer to the target angle over time",
  );
  assert.ok(
    angleDifferenceDeg(afterCameraAlign.camera.yawDeg, beforeCameraAlign.camera.yawDeg) > 20,
    "V should visibly pan the camera to a new alignment angle",
  );
  assert.ok(
    Math.abs(afterCameraAlign.mouse.x - 720) < 1 &&
    Math.abs(afterCameraAlign.mouse.y - 450) < 1,
    "V should reset the crosshair back to the center of the screen",
  );
  assert.ok(
    angleDifferenceDeg(afterCameraAlign.camera.yawDeg, beforeCameraAlign.camera.yawDeg) > 20,
    "V should visibly snap the camera instead of leaving it in the previous angle",
  );

  console.log(
    JSON.stringify(
      {
        initial: {
          stage: initial.stage,
          heroPosition: initial.heroPosition,
          currentGround: initial.currentGround,
          camera: initial.camera,
        },
        routeDebugEnabled: {
          debug: routeDebugEnabled.debug,
        },
        duringMove: {
          heroPosition: duringMove.heroPosition,
          currentGround: duringMove.currentGround,
        },
        rollActive: {
          actionLock: rollActive.actionLock,
          currentClip: rollActive.currentClip,
        },
        rollRecovered: {
          actionLock: rollRecovered.actionLock,
          heroPosition: rollRecovered.heroPosition,
          currentGround: rollRecovered.currentGround,
        },
        afterReset: {
          heroPosition: afterReset.heroPosition,
          currentGround: afterReset.currentGround,
        },
        afterIllegalRoadAttempt: {
          heroPosition: afterIllegalRoadAttempt.heroPosition,
          currentGround: afterIllegalRoadAttempt.currentGround,
        },
        alleyState: {
          heroPosition: alleyState.heroPosition,
          currentGround: alleyState.currentGround,
          camera: alleyState.camera,
        },
        afterAlleyRecovery: {
          heroPosition: afterAlleyRecovery.heroPosition,
          currentGround: afterAlleyRecovery.currentGround,
          camera: afterAlleyRecovery.camera,
        },
        pistolStance: {
          currentClip: pistolStance.currentClip,
          pistolPresented: pistolStance.pistolPresented,
        },
        pistolShoot: {
          currentClip: pistolShoot.currentClip,
          upperClip: pistolShoot.upperClip,
        },
        cameraAlign: {
          before: beforeCameraAlign.camera,
          during: duringCameraAlign.camera,
          after: afterCameraAlign.camera,
          beforeRootYaw: beforeCameraAlign.rootYaw,
          afterRootYaw: afterCameraAlign.rootYaw,
          mouse: afterCameraAlign.mouse,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
