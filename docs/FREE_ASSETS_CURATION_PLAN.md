# Free Assets Curation Plan

This document defines how the current repo-local asset library under `public/assets/` should be turned into a practical first-playable subset for this project.

Use it after the game concept is chosen and before broad implementation begins.

## Current Project Asset Plan

The current repo does not contain a broad multi-pack runtime library.
The only confirmed runtime-ready asset under `public/assets/` is:

- `public/assets/universal.glb`

For the current 3D fighting prototype, the intended split is:

- fighter source: `public/assets/universal.glb`
- opponent or training dummy source: cloned or mirrored instance of `public/assets/universal.glb`
- arena and ring: primitive geometry until a dedicated stage pack exists
- HUD and menu layer: simple DOM or temporary UI treatment until dedicated UI assets are added

The authoritative metadata contract for the current asset is:

- `public/assets/index.json`

## Goal

Create the smallest asset subset that can support a first playable Tekken-like prototype.

Do not curate for the full dream roster up front.
Curate only what the first round-based combat slice needs.

For this project specifically:

- start from the existing `universal.glb` instead of planning a larger asset migration first
- keep the first playable slice small: one fighter, one cloned dummy or placeholder opponent, one primitive arena, and one minimal HUD
- treat non-fighter clips as optional extras unless they directly support menus, intros, or debugging

## Runtime Curation Rules

1. Treat `public/assets/` as the source-of-truth asset library.
2. Treat `public/assets/index.json` as the source-of-truth metadata file for `universal.glb`.
3. Prefer exact clip names from the index instead of hardcoded guesses or partial matching.
4. Use `universal.glb` directly for the playable fighter.
5. Use `SkeletonUtils.clone()` for a second fighter instance or training dummy because the asset is skinned and animated.
6. Keep the first playable control map focused on fighting-relevant clips only.
7. Do not block the first playable build on environment, monster, or UI packs that are not actually present on disk.
8. Treat `Roll_RM` and `Sword_Attack_RM` as opt-in root-motion clips that require calibration before gameplay use.

## Minimum Runtime Categories

For this project, the first playable slice should lock:

- 1 fighter asset
- 1 cloned or mirrored training dummy / placeholder opponent
- 1 primitive arena shell
- 1 basic HUD layer
- 1 minimal combat feedback set made from code, particles, or placeholder art

If a dedicated environment or UI pack is not yet present, do not block the first playable build on that.
Use simple geometry, rings, markers, DOM UI, and debug overlays instead.

## Recommended Folder Shape

For the current repo layout, prefer keeping the asset structure simple:

```text
public/assets/
  universal.glb
  index.json
```

If the project later adds more characters, stages, props, or UI packs, expand the folder shape intentionally.
Do not duplicate `universal.glb` into multiple folders just to fake a roster.

## Current Project Selection

### Fighter

Intended source:

- `public/assets/universal.glb`

Round-one core clip subset:

- `Idle_Loop`
- `Walk_Loop`
- `Jog_Fwd_Loop`
- `Sprint_Loop`
- `Crouch_Idle_Loop`
- `Crouch_Fwd_Loop`
- `Jump_Start`
- `Jump_Loop`
- `Jump_Land`
- `Punch_Jab`
- `Punch_Cross`
- `Hit_Head`
- `Hit_Chest`
- `Death01`

High-value optional clips after calibration:

- `Roll_RM`
- `Sword_Attack_RM`

Current status:

- valid
- runtime-ready
- already on the `glb` happy path
- broad enough for a first-pass 3D fighting prototype

### Opponent / Training Dummy

Intended source:

- cloned or mirrored instance of `public/assets/universal.glb`

Current status:

- valid for an early placeholder opponent
- acceptable until a second fighter asset exists
- should not be mistaken for a final roster solution

### Arena

Intended source:

- primitive geometry and debug materials first

Current status:

- not blocked by asset availability
- should stay intentionally simple until the combat loop is readable and fun

### UI

Intended source:

- DOM or simple temporary HUD first

Current status:

- not blocked by asset availability
- should communicate health, timer, round state, and hit feedback before style polish

## Example `index.json` Scope

The current `public/assets/index.json` should keep documenting:

- stable asset ID
- runtime path
- file hash and structural metadata
- grouped animation inventory
- recommended fighting-game subset
- utility notes, strengths, and limitations

If a broader runtime roster appears later, a future `assets_index.json` can be derived from this smaller audit pattern.

## Expansion Rule

After playtesting:

- if the problem is mechanical, fix combat code, timing, or camera first
- if the problem is readability, adjust spacing, effects, or animation mapping first
- if the problem is content variety, then add one or two more curated assets

Do not assume more assets are the answer to an early fighting-game feel problem.

## Current Recommendation

Before the big implementation pass:

- lock `public/assets/universal.glb` as the starting fighter
- rely on `public/assets/index.json` for the exact clip contract
- scope the first playable build around one fighter plus one cloned dummy
- delay broader asset acquisition until the combat loop proves it needs more content
