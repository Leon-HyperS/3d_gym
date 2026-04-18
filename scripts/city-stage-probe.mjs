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

async function movePointer(clientX, clientY) {
  await page.evaluate(
    ([nextX, nextY]) => {
      const target = document.body;
      target.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        clientX: nextX,
        clientY: nextY,
      }));
    },
    [clientX, clientY],
  );
}

async function mouseDown(button, buttons, clientX, clientY) {
  await page.evaluate(
    ([nextButton, nextButtons, nextX, nextY]) => {
      const target = document.body;
      target.dispatchEvent(new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        button: nextButton,
        buttons: nextButtons,
        clientX: nextX,
        clientY: nextY,
      }));
    },
    [button, buttons, clientX, clientY],
  );
}

async function mouseUp(button, buttons, clientX, clientY) {
  await page.evaluate(
    ([nextButton, nextButtons, nextX, nextY]) => {
      const target = document.body;
      target.dispatchEvent(new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        button: nextButton,
        buttons: nextButtons,
        clientX: nextX,
        clientY: nextY,
      }));
    },
    [button, buttons, clientX, clientY],
  );
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

  async function runFacingRelativeEvadeCase({
    key,
    expectedActionLock,
    expectedClip,
    expectedAxis,
    expectedSign,
    description,
    screenshotPath = null,
  }) {
    const setup = await teleportHero(initial.heroPosition.x, initial.heroPosition.z, 270);
    assert.equal(setup, true, `${description} setup should land on a legal road`);
    await page.evaluate(() => window.__TEST__.setHudStaminaPercent(100));
    await movePointer(720, 450);
    await page.waitForTimeout(120);
    const before = await readState();
    assert.ok(
      angleDifferenceDeg(normalizeYawDeg((before.rootYaw * 180) / Math.PI), 270) < 3,
      `${description} setup should keep the hero facing left`,
    );

    await page.keyboard.down(key);
    await page.waitForTimeout(40);
    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    const active = await readState();
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath });
    }
    await page.keyboard.up(key);

    assert.equal(active.actionLock, expectedActionLock, `${description} should pick the expected evade lock`);
    assert.equal(active.currentClip, expectedClip, `${description} should pick the expected evade clip`);

    await page.waitForTimeout(1500);
    const after = await readState();
    assert.equal(after.actionLock, null, `${description} should recover back to normal control`);

    const delta = after.heroPosition[expectedAxis] - before.heroPosition[expectedAxis];
    assert.ok(
      expectedSign > 0 ? delta > 0.45 : delta < -0.45,
      `${description} should move in the expected screen direction`,
    );

    return { before, active, after };
  }

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

  const dodgeDownLeft = await runFacingRelativeEvadeCase({
    key: "ArrowDown",
    expectedActionLock: "dodgeLeft",
    expectedClip: "Dodge_Left",
    expectedAxis: "z",
    expectedSign: 1,
    description: "down + space while facing left",
    screenshotPath: "artifacts/city-stage-facing-left-dodge-left.png",
  });
  const dodgeUpRight = await runFacingRelativeEvadeCase({
    key: "ArrowUp",
    expectedActionLock: "dodgeRight",
    expectedClip: "Dodge_Right",
    expectedAxis: "z",
    expectedSign: -1,
    description: "up + space while facing left",
  });
  const dodgeRightBack = await runFacingRelativeEvadeCase({
    key: "ArrowRight",
    expectedActionLock: "backFlip",
    expectedClip: "BackFlip",
    expectedAxis: "x",
    expectedSign: 1,
    description: "right + space while facing left",
  });
  const restoreAfterDirectionalDodges = await teleportHero(initial.heroPosition.x, initial.heroPosition.z, 45);
  assert.equal(
    restoreAfterDirectionalDodges,
    true,
    "directional dodge verification should be able to restore the spawn road position",
  );
  await movePointer(720, 450);
  await page.waitForTimeout(180);

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

  const weaponSetup = await teleportHero(initial.heroPosition.x, initial.heroPosition.z, 135);
  assert.equal(weaponSetup, true, "weapon setup should land back on a legal road");
  await movePointer(1090, 260);
  await page.waitForTimeout(220);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(200);
  const beforeWeaponSelect = await readState();
  assert.ok(
    angleDifferenceDeg(beforeWeaponSelect.camera.yawDeg, normalizeYawDeg((beforeWeaponSelect.rootYaw * 180) / Math.PI + 180)) > 20,
    "weapon setup should start with the camera offset from the recentered behind-the-hero angle",
  );
  assert.ok(
    beforeWeaponSelect.pistolMuzzleFlash,
    "startup should expose the pistol muzzle flash test seam",
  );
  assert.ok(
    beforeWeaponSelect.rifleMuzzleFlash,
    "startup should expose the rifle muzzle flash test seam",
  );

  const idlePistolTriggerCount = beforeWeaponSelect.pistolMuzzleFlash.triggerCount;
  const idleRifleTriggerCount = beforeWeaponSelect.rifleMuzzleFlash.triggerCount;
  await mouseDown(0, 1, 1090, 260);
  await page.waitForTimeout(80);
  await mouseUp(0, 0, 1090, 260);
  const afterInvalidUnarmedClick = await readState();
  assert.equal(
    afterInvalidUnarmedClick.pistolMuzzleFlash.triggerCount,
    idlePistolTriggerCount,
    "LMB without a selected weapon should not trigger the pistol muzzle flash",
  );
  assert.equal(
    afterInvalidUnarmedClick.rifleMuzzleFlash.triggerCount,
    idleRifleTriggerCount,
    "LMB without a selected weapon should not trigger the rifle muzzle flash",
  );
  assert.notEqual(
    afterInvalidUnarmedClick.upperClip,
    "Pistol_Shoot",
    "LMB without a selected weapon should not enter the pistol shot clip",
  );
  assert.notEqual(
    afterInvalidUnarmedClick.upperClip,
    "Rifle_Shoot",
    "LMB without a selected weapon should not enter the rifle shot clip",
  );

  await page.keyboard.press("Digit1");
  await page.waitForTimeout(100);
  const pistolSelected = await readState();
  assert.equal(pistolSelected.weaponMode, "pistol", "Digit1 should select pistol mode");
  assert.equal(pistolSelected.pistolPresented, true, "Digit1 should present the pistol stance");
  assert.equal(pistolSelected.pistolAttachment?.visible, true, "pistol mesh should be visible after selecting pistol mode");
  assert.equal(pistolSelected.rifleAttachment?.visible, false, "rifle mesh should stay hidden while pistol mode is active");
  assert.equal(
    pistolSelected.cameraAngleShiftActive,
    false,
    "selecting pistol mode should not arm the RMB camera-shift state",
  );
  assert.ok(
    planarDistance(pistolSelected.camera.target, pistolSelected.heroPosition) < 0.05,
    "selecting pistol mode should not push the camera target ahead of the hero on its own",
  );

  await mouseDown(2, 2, 1090, 260);
  await page.waitForTimeout(80);
  const afterCameraShift = await readState();
  const expectedShiftFrontYawDeg = normalizeYawDeg(afterCameraShift.camera.targetYawDeg + 180);
  assert.ok(
    angleDifferenceDeg(afterCameraShift.camera.yawDeg, pistolSelected.camera.yawDeg) > 2,
    "RMB should still start the camera pan quickly",
  );
  assert.ok(
    angleDifferenceDeg(afterCameraShift.camera.yawDeg, afterCameraShift.camera.targetYawDeg) > 4,
    "RMB camera motion should still ease instead of finishing in one frame",
  );
  assert.ok(
    angleDifferenceDeg((afterCameraShift.rootYaw * 180) / Math.PI, expectedShiftFrontYawDeg) < 2,
    "RMB should still rotate the hero to player-front for the target camera angle immediately",
  );
  assert.equal(
    afterCameraShift.cameraAngleShiftActive,
    true,
    "RMB should arm the camera-shift state while held",
  );
  assert.ok(
    planarDistance(afterCameraShift.camera.target, afterCameraShift.heroPosition) > 1.5,
    "RMB should still push the camera target ahead of the hero while held",
  );
  assert.ok(
    Math.abs(afterCameraShift.mouse.x - pistolSelected.mouse.x) < 1 &&
    Math.abs(afterCameraShift.mouse.y - pistolSelected.mouse.y) < 1,
    "RMB should preserve the current pointer screen position instead of forcing screen center",
  );
  assert.equal(
    afterCameraShift.aimYawSuppressed,
    true,
    "RMB should still temporarily suppress aim-driven yaw while the camera pan settles",
  );
  assert.ok(
    angleDifferenceDeg((afterCameraShift.rootYaw * 180) / Math.PI, (pistolSelected.rootYaw * 180) / Math.PI) < 10,
    "W plus RMB should keep the hero from whipping into a large yaw flip during the first pan frames",
  );

  await page.waitForTimeout(320);
  const pistolForwardHold = await readState();
  assert.equal(
    pistolForwardHold.aimYawSuppressed,
    true,
    "W plus RMB should keep aim-yaw suppression active while the recenter pan is still settling",
  );
  assert.ok(
    angleDifferenceDeg((pistolForwardHold.rootYaw * 180) / Math.PI, (pistolSelected.rootYaw * 180) / Math.PI) < 15,
    "W plus RMB should keep the hero yaw stable through the early pan instead of spinning around",
  );
  await mouseUp(2, 0, 1090, 260);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(220);
  const afterCameraShiftRelease = await readState();
  assert.equal(afterCameraShiftRelease.weaponMode, "pistol", "releasing RMB should not clear the selected pistol mode");
  assert.equal(afterCameraShiftRelease.pistolPresented, true, "releasing RMB should keep the pistol stance active");
  assert.equal(
    afterCameraShiftRelease.cameraAngleShiftActive,
    false,
    "releasing RMB should clear the camera-shift held state",
  );
  assert.ok(
    angleDifferenceDeg(afterCameraShiftRelease.camera.yawDeg, afterCameraShiftRelease.camera.targetYawDeg)
      < angleDifferenceDeg(afterCameraShift.camera.yawDeg, afterCameraShift.camera.targetYawDeg),
    "RMB camera shift should keep panning closer to the target angle over time",
  );
  await page.screenshot({ path: "artifacts/city-stage-rmb-camera-shift.png" });

  const pistolTriggerCountBeforeShot = afterCameraShiftRelease.pistolMuzzleFlash.triggerCount;
  await mouseDown(0, 1, 720, 450);
  await page.waitForTimeout(100);
  const pistolShoot = await readState();
  assert.equal(pistolShoot.upperClip, "Pistol_Shoot", "LMB in pistol mode should fire the pistol");
  assert.equal(pistolShoot.pistolAttachment?.visible, true, "pistol should remain visible while shooting");
  assert.equal(
    pistolShoot.pistolMuzzleFlash.triggerCount,
    pistolTriggerCountBeforeShot + 1,
    "accepted pistol shots should increment the pistol muzzle flash trigger count",
  );
  assert.equal(
    pistolShoot.pistolMuzzleFlash.active,
    true,
    "accepted pistol shots should activate the pistol muzzle flash",
  );
  await mouseUp(0, 0, 720, 450);
  await page.waitForTimeout(220);
  const afterPistolShot = await readState();
  assert.equal(afterPistolShot.currentGround?.objectName != null, true, "pistol combat should not break stage grounding");

  await page.keyboard.press("Digit2");
  await page.waitForTimeout(100);
  const rifleSelected = await readState();
  assert.equal(rifleSelected.weaponMode, "rifle", "Digit2 should switch from pistol to rifle mode");
  assert.equal(rifleSelected.riflePresented, true, "Digit2 should present the rifle stance");
  assert.equal(rifleSelected.rifleAttachment?.visible, true, "rifle mesh should be visible after switching to rifle mode");
  assert.equal(rifleSelected.pistolAttachment?.visible, false, "pistol mesh should hide once rifle mode is active");
  assert.equal(
    rifleSelected.cameraAngleShiftActive,
    false,
    "selecting rifle mode should not arm the RMB camera-shift state",
  );
  assert.ok(
    planarDistance(rifleSelected.camera.target, rifleSelected.heroPosition) < 0.05,
    "selecting rifle mode should not change camera target framing on its own",
  );

  const rifleTriggerCountBeforeShot = rifleSelected.rifleMuzzleFlash.triggerCount;
  await mouseDown(0, 1, 720, 450);
  await page.waitForTimeout(100);
  const rifleShoot = await readState();
  assert.equal(rifleShoot.upperClip, "Rifle_Shoot", "LMB in rifle mode should fire the rifle");
  assert.equal(rifleShoot.rifleAttachment?.visible, true, "rifle should remain visible while shooting");
  assert.equal(
    rifleShoot.rifleMuzzleFlash.triggerCount,
    rifleTriggerCountBeforeShot + 1,
    "accepted rifle shots should increment the rifle muzzle flash trigger count",
  );
  assert.equal(
    rifleShoot.rifleMuzzleFlash.active,
    true,
    "accepted rifle shots should activate the rifle muzzle flash",
  );
  await mouseUp(0, 0, 720, 450);
  await page.waitForTimeout(220);
  const afterRifleShot = await readState();
  assert.equal(afterRifleShot.currentGround?.objectName != null, true, "rifle combat should not break stage grounding");
  assert.equal(
    afterRifleShot.pistolMuzzleFlash.triggerCount,
    pistolShoot.pistolMuzzleFlash.triggerCount,
    "switching to rifle should not retrigger the pistol muzzle flash",
  );

  await page.keyboard.press("Digit2");
  await page.waitForTimeout(120);
  const afterHolster = await readState();
  assert.equal(afterHolster.weaponMode, "none", "pressing Digit2 again should holster the rifle");
  assert.equal(afterHolster.pistolPresented, false, "holstering the rifle should leave no pistol stance active");
  assert.equal(afterHolster.riflePresented, false, "holstering the rifle should clear the rifle stance");
  assert.equal(afterHolster.rifleAttachment?.visible, false, "holstering the rifle should hide the rifle mesh");

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
        directionalDodges: {
          downLeft: {
            clip: dodgeDownLeft.active.currentClip,
            actionLock: dodgeDownLeft.active.actionLock,
            before: dodgeDownLeft.before.heroPosition,
            after: dodgeDownLeft.after.heroPosition,
          },
          upRight: {
            clip: dodgeUpRight.active.currentClip,
            actionLock: dodgeUpRight.active.actionLock,
            before: dodgeUpRight.before.heroPosition,
            after: dodgeUpRight.after.heroPosition,
          },
          rightBack: {
            clip: dodgeRightBack.active.currentClip,
            actionLock: dodgeRightBack.active.actionLock,
            before: dodgeRightBack.before.heroPosition,
            after: dodgeRightBack.after.heroPosition,
          },
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
        weaponSelection: {
          before: beforeWeaponSelect.camera,
          pistolSelected: {
            weaponMode: pistolSelected.weaponMode,
            camera: pistolSelected.camera,
            pistolPresented: pistolSelected.pistolPresented,
          },
          rifleSelected: {
            weaponMode: rifleSelected.weaponMode,
            camera: rifleSelected.camera,
            riflePresented: rifleSelected.riflePresented,
          },
          afterHolster: {
            weaponMode: afterHolster.weaponMode,
            camera: afterHolster.camera,
          },
        },
        cameraShift: {
          before: pistolSelected.camera,
          during: afterCameraShift.camera,
          forwardHold: pistolForwardHold.camera,
          after: afterCameraShiftRelease.camera,
          currentClip: afterCameraShift.currentClip,
          pistolPresented: afterCameraShift.pistolPresented,
          rootYaw: afterCameraShift.rootYaw,
          forwardHoldRootYaw: pistolForwardHold.rootYaw,
          aimYawSuppressed: afterCameraShift.aimYawSuppressed,
          mouse: afterCameraShift.mouse,
        },
        pistolShoot: {
          currentClip: pistolShoot.currentClip,
          upperClip: pistolShoot.upperClip,
          muzzleFlash: pistolShoot.pistolMuzzleFlash,
        },
        rifleShoot: {
          currentClip: rifleShoot.currentClip,
          upperClip: rifleShoot.upperClip,
          muzzleFlash: rifleShoot.rifleMuzzleFlash,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
