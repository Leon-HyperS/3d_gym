# 3D Fighting Game Prototype Implementation Plan

## Objective

Ship a first playable local build where one player can fight a cloned opponent or training dummy in a compact arena using `public/assets/universal.glb` as the primary character source.

The first round should already communicate the intended fantasy:

- step into the arena
- move, crouch, and jump cleanly
- throw a jab / cross sequence
- land hits with readable reactions
- finish a round with a clean KO and restart path

## Workflow Anchors

- use `threejs-builder` as the backbone for scene setup, GLB loading, calibration, camera rules, and animation state handling
- borrow the data-contract mindset from `threejs-capacitor-ios`, even if iOS packaging is not in scope yet
- keep `public/assets/index.json` as the source of truth for exact clip names and asset notes
- add `playwright-testing` only after the playable loop exists and the scene is deterministic enough to verify

## Milestone Order

### 1. Documentation Lock

- finalize `docs/PRD.md`
- finalize `docs/TDD.md`
- lock the asset contract in `public/assets/index.json`
- define the round-one control scheme and move list

Exit condition:

- player verbs, camera intent, ring rules, and animation mappings are written down

### 2. Runtime Scaffold

- add the web app scaffold (`package.json`, `tsconfig.json`, Vite scripts, `index.html`, and `src/`)
- confirm a local Three.js renderer boots without asset errors
- build the base scene, floor, and debug lighting

Exit condition:

- the app boots locally and renders a blank arena shell

### 3. Asset Calibration Pass

- load `public/assets/universal.glb`
- log animation clips once and verify they match `public/assets/index.json`
- normalize the fighter from visible mesh bounds only
- lock scale, yaw offset, and ground anchor
- confirm the arena forward axis before movement code hardens
- validate whether `Roll_RM` and `Sword_Attack_RM` behave acceptably as root-motion clips

Exit condition:

- the fighter is grounded, faces the intended direction, and no scale or root-motion surprises block gameplay work

### 4. Fighter Runtime

- instantiate the main fighter and one cloned dummy / placeholder opponent
- build a small animation state machine around exact clip names
- track one mixer per fighter instance
- create safe transitions between idle, locomotion, crouch, jump, attack, hit, and KO states

Exit condition:

- both fighter instances render and can hold stable idle states without animation thrash

### 5. Arena And Camera Sandbox

- build a compact ring or training-stage floor from primitive geometry
- add a fixed or softly tracking fighting-game camera
- add forward / back movement first, then crouch and jump
- keep boundaries and camera framing readable before adding polish

Exit condition:

- the playable fighter can move around the arena in a clear fighting-game view

### 6. Core Combat

- implement `Punch_Jab` and `Punch_Cross` as the first core attacks
- add one advancing special using `Sword_Attack_RM` or `Roll_RM` after calibration proves it safe
- add authored hit windows, hitstop, pushback, hurt states, and health
- wire `Hit_Head`, `Hit_Chest`, and `Death01`

Exit condition:

- the fighter can hit the opponent dummy with readable impact and a valid KO path

### 7. Opponent Slice

- start with a training dummy that can idle, get hit, and die cleanly
- optionally add simple AI or a second local controller after the dummy loop is solid
- add round reset and restart handling

Exit condition:

- a full round can begin, resolve, and restart without broken state

### 8. Feel Pass

- tune attack timing, recovery, pushback, hitstop, and jump readability
- add camera shake, screen flash, floor markers, hit sparks, and health feedback
- trim any nonessential clip usage that muddies the combat fantasy

Exit condition:

- the prototype feels readable and satisfying even with placeholder arena art

### 9. Smoke Coverage

- expose `window.__TEST__` readiness and a small state surface
- add one Playwright smoke test for boot, readiness, fighter load, and one simple combat exchange

Exit condition:

- one deterministic smoke test passes locally

## First Playable Acceptance Criteria

- local build boots without asset load errors
- `universal.glb` loads with correct orientation and grounded feet
- the player can idle, walk or jog, crouch, and jump
- the player can use `Punch_Jab`, `Punch_Cross`, and at least one advancing move
- the opponent dummy can receive hit reactions and play `Death01`
- the round can reset cleanly after victory or defeat

## Placeholder Rules

- use primitive arena geometry until a dedicated stage pack actually exists on disk
- prefer simple rings, decals, flashes, and particles over premature environment detail
- use a cloned or mirrored copy of `universal.glb` for the first dummy or placeholder opponent
- keep pistol, swimming, driving, sitting, and repair clips out of the initial combat loop unless they are needed for menus or debugging

## Deferred Work

- a unique second fighter asset
- sidestep and backdash behavior
- guard, throw, launcher, and wake-up systems
- richer stages and UI art
- larger automated test coverage