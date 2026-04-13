import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4180/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__TEST__?.ready === true);
await page.mouse.move(1180, 440);
await page.waitForTimeout(220);

async function samplePistolWalk() {
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(160);

  await page.mouse.down({ button: "right" });
  await page.waitForTimeout(280);
  const stanceIdle = await page.evaluate(() => window.__TEST__.getState());

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(750);
  const stanceMove = await page.evaluate(() => window.__TEST__.getState());
  await page.keyboard.up("KeyD");

  await page.waitForTimeout(160);
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(180);
  const released = await page.evaluate(() => window.__TEST__.getState());

  return {
    idle: {
      animationMode: stanceIdle.animationMode,
      currentClip: stanceIdle.currentClip,
      upperClip: stanceIdle.upperClip,
      lowerClip: stanceIdle.lowerClip,
      pistolStance: stanceIdle.pistolStance,
    },
    moving: {
      animationMode: stanceMove.animationMode,
      currentClip: stanceMove.currentClip,
      upperClip: stanceMove.upperClip,
      lowerClip: stanceMove.lowerClip,
      pistolStance: stanceMove.pistolStance,
      movedDistance: Math.hypot(
        stanceMove.heroPosition.x - stanceIdle.heroPosition.x,
        stanceMove.heroPosition.z - stanceIdle.heroPosition.z,
      ),
    },
    released: {
      animationMode: released.animationMode,
      currentClip: released.currentClip,
      upperClip: released.upperClip,
      lowerClip: released.lowerClip,
      pistolStance: released.pistolStance,
    },
  };
}

console.log(
  JSON.stringify(
    {
      pistolWalk: await samplePistolWalk(),
    },
    null,
    2,
  ),
);

await browser.close();
