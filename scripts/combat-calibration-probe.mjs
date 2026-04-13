import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4180/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__TEST__?.ready === true);
await page.mouse.move(980, 460);
await page.waitForTimeout(220);

function planarDistance(a, b) {
  return Math.hypot(b.heroPosition.x - a.heroPosition.x, b.heroPosition.z - a.heroPosition.z);
}

async function sampleMovingPunch({ key, expectedUpper }) {
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(140);

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(240);
  const beforePunch = await page.evaluate(() => window.__TEST__.getState());

  await page.keyboard.press(key);
  await page.waitForTimeout(150);
  const duringPunch = await page.evaluate(() => window.__TEST__.getState());

  await page.waitForTimeout(260);
  const afterPunch = await page.evaluate(() => window.__TEST__.getState());

  await page.keyboard.up("KeyW");
  await page.waitForTimeout(140);
  const released = await page.evaluate(() => window.__TEST__.getState());

  await page.waitForTimeout(520);
  const resolved = await page.evaluate(() => window.__TEST__.getState());

  return {
    beforePunch: {
      currentClip: beforePunch.currentClip,
      animationMode: beforePunch.animationMode,
    },
    duringPunch: {
      currentClip: duringPunch.currentClip,
      animationMode: duringPunch.animationMode,
      upperClip: duringPunch.upperClip,
      lowerClip: duringPunch.lowerClip,
      upperBodyActionLock: duringPunch.upperBodyActionLock,
      movedDistance: planarDistance(beforePunch, duringPunch),
      upperMatchesExpected: duringPunch.upperClip === expectedUpper,
    },
    afterPunch: {
      currentClip: afterPunch.currentClip,
      animationMode: afterPunch.animationMode,
      upperClip: afterPunch.upperClip,
      lowerClip: afterPunch.lowerClip,
      upperBodyActionLock: afterPunch.upperBodyActionLock,
      movedDistance: planarDistance(beforePunch, afterPunch),
    },
    released: {
      currentClip: released.currentClip,
      animationMode: released.animationMode,
    },
    resolved: {
      currentClip: resolved.currentClip,
      animationMode: resolved.animationMode,
      upperClip: resolved.upperClip,
      lowerClip: resolved.lowerClip,
      upperBodyActionLock: resolved.upperBodyActionLock,
    },
  };
}

async function sampleRollRecovery() {
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(140);
  const start = await page.evaluate(() => window.__TEST__.getState());

  await page.keyboard.press("Space");
  await page.waitForTimeout(180);
  const early = await page.evaluate(() => window.__TEST__.getState());

  await page.waitForTimeout(220);
  const recovery = await page.evaluate(() => window.__TEST__.getState());

  await page.waitForTimeout(220);
  const settled = await page.evaluate(() => window.__TEST__.getState());

  return {
    early: {
      currentClip: early.currentClip,
      actionLock: early.actionLock,
      rollTimeLeft: early.rollTimeLeft,
    },
    recovery: {
      currentClip: recovery.currentClip,
      actionLock: recovery.actionLock,
      rollTimeLeft: recovery.rollTimeLeft,
    },
    settled: {
      currentClip: settled.currentClip,
      actionLock: settled.actionLock,
      rollTimeLeft: settled.rollTimeLeft,
      movedDistance: planarDistance(start, settled),
    },
  };
}

console.log(
  JSON.stringify(
    {
      leftPunchWhileMoving: await sampleMovingPunch({
        key: "KeyQ",
        expectedUpper: "Punch_Jab",
      }),
      rightPunchWhileMoving: await sampleMovingPunch({
        key: "KeyE",
        expectedUpper: "Punch_Cross",
      }),
      rollRecovery: await sampleRollRecovery(),
    },
    null,
    2,
  ),
);

await browser.close();
