import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4180/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
});

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__TEST__?.ready === true);
  await page.mouse.move(720, 540);
  await page.mouse.click(720, 540);
  await page.waitForTimeout(220);

  async function readUiState() {
    return page.evaluate(() => {
      const testState = window.__TEST__.getState();
      const uiShell = document.querySelector("#ui");
      const hud = document.querySelector("#hud");
      const crosshair = document.querySelector("#mouse-crosshair");
      const uiStyle = uiShell ? getComputedStyle(uiShell) : null;
      const hudStyle = hud ? getComputedStyle(hud) : null;
      const crosshairStyle = crosshair ? getComputedStyle(crosshair) : null;

      return {
        ...testState,
        hudText: {
          health: document.querySelector("#hud-health-value")?.textContent?.trim() ?? null,
          stamina: document.querySelector("#hud-stamina-value")?.textContent?.trim() ?? null,
          slotCount: document.querySelectorAll("[data-hud-slot]").length,
        },
        uiShell: uiShell
          ? {
              hiddenClass: uiShell.classList.contains("ui-shell--hidden"),
              opacity: uiStyle.opacity,
              visibility: uiStyle.visibility,
            }
          : null,
        hudVisibility: hud
          ? {
              display: hudStyle.display,
              visibility: hudStyle.visibility,
              width: hud.getBoundingClientRect().width,
              height: hud.getBoundingClientRect().height,
              packId: hud.dataset.hudPack ?? null,
            }
          : null,
        crosshair: crosshair
          ? {
              backgroundImage: crosshairStyle.backgroundImage,
              width: crosshair.getBoundingClientRect().width,
              height: crosshair.getBoundingClientRect().height,
              opacity: crosshairStyle.opacity,
            }
          : null,
        checkboxes: [...document.querySelectorAll("[data-debug-toggle]")].map((input) => ({
          key: input.dataset.debugToggle,
          checked: input.checked,
        })),
      };
    });
  }

  const initial = await readUiState();
  assert.equal(initial.menusHidden, false, "menus should start visible");
  assert.equal(initial.hud.packId, "scifi_hud", "hud should use the sci-fi ui pack");
  assert.equal(initial.hudText.health, "86%", "health HUD should render the demo value");
  assert.equal(initial.hudText.stamina, "100%", "stamina HUD should start full");
  assert.equal(initial.hudText.slotCount, 5, "HUD should render five slots");
  assert.equal(initial.weaponMode, "none", "no weapon should be selected on startup");
  assert.deepEqual(
    initial.hud.activeSlots.slice(0, 2),
    [false, false],
    "weapon HUD slots should start inactive",
  );
  assert.equal(initial.uiShell?.hiddenClass, false, "menu shell should start visible");
  assert.equal(initial.hudVisibility?.visibility, "visible", "HUD should be visible");
  assert.ok(initial.hudVisibility?.width > 0, "HUD should occupy layout space");
  assert.ok(
    initial.crosshair?.backgroundImage.includes("crosshair_color_b.svg"),
    "crosshair should use the sci-fi SVG asset",
  );
  assert.equal(initial.crosshair?.width, 28, "crosshair width should stay calibrated");
  assert.equal(initial.crosshair?.height, 28, "crosshair height should stay calibrated");
  assert.equal(initial.debug.grid, true, "grid should start enabled");
  assert.equal(initial.debug.origin, true, "origin marker should start enabled");
  assert.equal(initial.debug.vectors, true, "vector helper should start enabled");

  await page.screenshot({ path: "hud-probe-initial.png" });

  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  const afterDodge = await readUiState();
  assert.equal(afterDodge.hudText.stamina, "67%", "dodge should drain one third of the stamina bar");
  assert.ok(
    afterDodge.hud.staminaPercent <= 67.05 && afterDodge.hud.staminaPercent >= 66.6,
    "dodge stamina drain should land near two thirds remaining",
  );

  await page.screenshot({ path: "hud-probe-dodge.png" });

  await page.waitForFunction(() => window.__TEST__.getState().hud.staminaPercent >= 99.9, {
    timeout: 5000,
  });
  const afterRefill = await readUiState();
  assert.equal(afterRefill.hudText.stamina, "100%", "stamina should refill back to full");
  assert.ok(
    afterRefill.hud.staminaPercent >= 99.9,
    "stamina refill should restore the bar to full over time",
  );

  await page.keyboard.press("KeyR");
  await page.waitForTimeout(180);
  await page.evaluate(() => window.__TEST__.setHudStaminaPercent(20));
  const beforeBlockedDodge = await readUiState();
  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  const blockedDodge = await readUiState();
  assert.ok(
    beforeBlockedDodge.hud.staminaPercent < 33,
    "probe should force stamina below dodge cost",
  );
  assert.equal(blockedDodge.actionLock, null, "low stamina should block dodge startup");
  assert.equal(blockedDodge.rollTimeLeft, 0, "blocked dodge should not create roll movement time");
  assert.notEqual(blockedDodge.currentClip, "Roll", "blocked dodge should not switch to the roll clip");
  assert.ok(
    Math.hypot(
      blockedDodge.heroPosition.x - beforeBlockedDodge.heroPosition.x,
      blockedDodge.heroPosition.z - beforeBlockedDodge.heroPosition.z,
    ) < 0.01,
    "blocked dodge should not move the hero",
  );
  assert.ok(
    blockedDodge.hud.staminaPercent >= beforeBlockedDodge.hud.staminaPercent,
    "blocked dodge should not spend stamina",
  );

  await page.keyboard.press("F1");
  await page.waitForFunction(() => {
    const uiShell = document.querySelector("#ui");
    const crosshair = document.querySelector("#mouse-crosshair");
    if (!uiShell || !crosshair) {
      return false;
    }
    return (
      window.__TEST__.getState().menusHidden === true &&
      getComputedStyle(uiShell).visibility === "hidden" &&
      getComputedStyle(crosshair).opacity !== "0"
    );
  }, { timeout: 2500 });
  const afterF1 = await readUiState();
  if (afterF1.uiShell?.visibility !== "hidden") {
    console.error("afterF1 state:", JSON.stringify(afterF1, null, 2));
  }
  assert.equal(afterF1.menusHidden, true, "F1 should hide the menu shell");
  assert.equal(afterF1.uiShell?.hiddenClass, true, "menu shell should carry the hidden class");
  assert.equal(afterF1.uiShell?.visibility, "hidden", "menu shell should be visually hidden");
  assert.ok(
    afterF1.crosshair?.backgroundImage.includes("crosshair_color_b.svg"),
    "crosshair should keep using the sci-fi SVG after F1",
  );
  assert.notEqual(afterF1.crosshair?.opacity, "0", "crosshair should remain visible in gameplay view");
  assert.ok(
    Object.values(afterF1.debug).every((value) => value === false),
    "F1 should clear all debug flags",
  );
  assert.ok(
    afterF1.checkboxes.every((checkbox) => checkbox.checked === false),
    "F1 should uncheck every debug checkbox",
  );
  assert.equal(afterF1.hudText.health, "86%", "HUD should stay visible after F1");
  assert.ok(
    afterF1.hud.staminaPercent >= blockedDodge.hud.staminaPercent,
    "F1 should not reduce the visible stamina state",
  );
  assert.equal(afterF1.hudVisibility?.visibility, "visible", "HUD should remain visible after F1");

  await page.screenshot({ path: "hud-probe-hidden.png" });

  await page.keyboard.press("Digit1");
  await page.waitForTimeout(80);
  const pistolSelected = await readUiState();
  assert.equal(pistolSelected.weaponMode, "pistol", "Digit1 should toggle pistol mode on");
  assert.deepEqual(
    pistolSelected.hud.activeSlots.slice(0, 2),
    [true, false],
    "Digit1 should activate the first weapon HUD slot only",
  );

  await page.keyboard.press("Digit1");
  await page.waitForTimeout(80);
  const pistolHolstered = await readUiState();
  assert.equal(pistolHolstered.weaponMode, "none", "pressing Digit1 again should holster the pistol");
  assert.deepEqual(
    pistolHolstered.hud.activeSlots.slice(0, 2),
    [false, false],
    "holstering the pistol should clear both weapon HUD slots",
  );

  await page.keyboard.press("Digit2");
  await page.waitForTimeout(80);
  const rifleSelected = await readUiState();
  assert.equal(rifleSelected.weaponMode, "rifle", "Digit2 should toggle rifle mode on");
  assert.deepEqual(
    rifleSelected.hud.activeSlots.slice(0, 2),
    [false, true],
    "Digit2 should activate the second weapon HUD slot only",
  );

  await page.keyboard.press("Digit2");
  await page.waitForTimeout(80);
  const rifleHolstered = await readUiState();
  assert.equal(rifleHolstered.weaponMode, "none", "pressing Digit2 again should holster the rifle");
  assert.deepEqual(
    rifleHolstered.hud.activeSlots.slice(0, 2),
    [false, false],
    "holstering the rifle should clear both weapon HUD slots",
  );

  const debugKeysByShortcut = [
    ["Digit3", "origin"],
    ["Digit4", "bounds"],
    ["Digit5", "skeleton"],
    ["Digit6", "vectors"],
    ["Digit7", "hitboxes"],
    ["Digit8", "orbit"],
    ["Digit9", "route"],
  ];

  const digitChecks = [];
  for (const [key, debugKey] of debugKeysByShortcut) {
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
    const state = await readUiState();
    const matchingCheckbox = state.checkboxes.find((checkbox) => checkbox.key === debugKey);
    assert.equal(state.debug[debugKey], true, `${key} should still toggle ${debugKey}`);
    assert.equal(matchingCheckbox?.checked, true, `${key} should still sync the ${debugKey} checkbox`);
    digitChecks.push({
      key,
      debugKey,
      enabled: state.debug[debugKey],
    });
  }

  console.log(
    JSON.stringify(
      {
        initial: {
          menusHidden: initial.menusHidden,
          hud: initial.hud,
          hudText: initial.hudText,
          crosshair: initial.crosshair,
          debug: initial.debug,
        },
        afterDodge: {
          hud: afterDodge.hud,
          hudText: afterDodge.hudText,
        },
        afterRefill: {
          hud: afterRefill.hud,
          hudText: afterRefill.hudText,
        },
        blockedDodge: {
          before: {
            hud: beforeBlockedDodge.hud,
            hudText: beforeBlockedDodge.hudText,
            currentClip: beforeBlockedDodge.currentClip,
          },
          after: {
            hud: blockedDodge.hud,
            hudText: blockedDodge.hudText,
            currentClip: blockedDodge.currentClip,
            actionLock: blockedDodge.actionLock,
            rollTimeLeft: blockedDodge.rollTimeLeft,
          },
        },
        afterF1: {
          menusHidden: afterF1.menusHidden,
          hudText: afterF1.hudText,
          crosshair: afterF1.crosshair,
          debug: afterF1.debug,
          uiShell: afterF1.uiShell,
        },
        weaponToggles: {
          pistolSelected: {
            weaponMode: pistolSelected.weaponMode,
            activeSlots: pistolSelected.hud.activeSlots,
          },
          pistolHolstered: {
            weaponMode: pistolHolstered.weaponMode,
            activeSlots: pistolHolstered.hud.activeSlots,
          },
          rifleSelected: {
            weaponMode: rifleSelected.weaponMode,
            activeSlots: rifleSelected.hud.activeSlots,
          },
          rifleHolstered: {
            weaponMode: rifleHolstered.weaponMode,
            activeSlots: rifleHolstered.hud.activeSlots,
          },
        },
        digitChecks,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
