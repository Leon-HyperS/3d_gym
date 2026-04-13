import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4180/";

const browser = await chromium.launch({
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__TEST__?.ready === true);

const samples = [
  { name: "center", x: 700, y: 450 },
  { name: "right", x: 1200, y: 450 },
  { name: "left", x: 200, y: 450 },
  { name: "top", x: 700, y: 160 },
  { name: "bottom", x: 700, y: 760 },
  { name: "topRight", x: 1180, y: 180 },
  { name: "topLeft", x: 220, y: 180 },
  { name: "bottomRight", x: 1180, y: 740 },
  { name: "bottomLeft", x: 220, y: 740 },
];

for (const sample of samples) {
  await page.mouse.move(sample.x, sample.y);
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => window.__TEST__.getState());
  const desired = {
    x: state.aimPoint.x - state.heroPosition.x,
    z: state.aimPoint.z - state.heroPosition.z,
  };
  const desiredLength = Math.hypot(desired.x, desired.z) || 1;
  desired.x /= desiredLength;
  desired.z /= desiredLength;
  const dot =
    desired.x * state.modelWorldForward.x +
    desired.z * state.modelWorldForward.z;
  console.log(
    JSON.stringify(
      {
        sample: sample.name,
        mouse: state.mouse,
        rootYawDeg: Math.round((state.rootYaw * 180) / Math.PI),
        modelYawOffsetDeg: Math.round((state.modelYawOffset * 180) / Math.PI),
        aimPoint: state.aimPoint,
        desiredForward: desired,
        modelWorldForward: state.modelWorldForward,
        dot,
      },
      null,
      2,
    ),
  );
}

await page.screenshot({ path: "playwright-face-probe.png" });
await browser.close();
