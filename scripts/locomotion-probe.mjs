import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4180/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__TEST__?.ready === true);
await page.mouse.move(900, 500);
await page.waitForTimeout(200);

async function sampleMove({ withShift }) {
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(120);
  const start = await page.evaluate(() => window.__TEST__.getState());

  if (withShift) {
    await page.keyboard.down("Shift");
  }

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(700);
  const moving = await page.evaluate(() => window.__TEST__.getState());
  await page.keyboard.up("KeyW");

  if (withShift) {
    await page.keyboard.up("Shift");
  }

  await page.waitForTimeout(120);
  const end = await page.evaluate(() => window.__TEST__.getState());

  return {
    withShift,
    startClip: start.currentClip,
    movingClip: moving.currentClip,
    sprintModifier: moving.sprintModifier,
    crouchModifier: moving.crouchModifier,
    movedDistance: Math.hypot(
      moving.heroPosition.x - start.heroPosition.x,
      moving.heroPosition.z - start.heroPosition.z,
    ),
    endDistance: Math.hypot(
      end.heroPosition.x - start.heroPosition.x,
      end.heroPosition.z - start.heroPosition.z,
    ),
  };
}

async function sampleCrouch() {
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(120);

  await page.keyboard.down("Control");
  await page.waitForTimeout(220);
  const crouchIdle = await page.evaluate(() => window.__TEST__.getState());

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(700);
  const crouchMove = await page.evaluate(() => window.__TEST__.getState());
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Control");

  return {
    idleClip: crouchIdle.currentClip,
    moveClip: crouchMove.currentClip,
    crouchModifier: crouchMove.crouchModifier,
    movedDistance: Math.hypot(
      crouchMove.heroPosition.x - crouchIdle.heroPosition.x,
      crouchMove.heroPosition.z - crouchIdle.heroPosition.z,
    ),
  };
}

async function sampleRoll() {
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(120);
  const start = await page.evaluate(() => window.__TEST__.getState());
  await page.keyboard.press("Space");
  await page.waitForTimeout(260);
  const mid = await page.evaluate(() => window.__TEST__.getState());
  await page.waitForTimeout(520);
  const end = await page.evaluate(() => window.__TEST__.getState());

  return {
    startClip: start.currentClip,
    midClip: mid.currentClip,
    endClip: end.currentClip,
    movedDistance: Math.hypot(
      end.heroPosition.x - start.heroPosition.x,
      end.heroPosition.z - start.heroPosition.z,
    ),
  };
}

console.log(
  JSON.stringify(
    {
      runDefault: await sampleMove({ withShift: false }),
      sprintWithShift: await sampleMove({ withShift: true }),
      crouchWithCtrl: await sampleCrouch(),
      rollWithSpace: await sampleRoll(),
    },
    null,
    2,
  ),
);

await browser.close();
