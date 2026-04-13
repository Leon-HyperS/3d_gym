# Cursor Agent Game Creation Playbook

This document is written for a future **Cursor agent** working in this repo.

Use it as an operating guide when the user asks you to create a game, prototype a game, or extend an in-progress game.

The goal is not to produce a vague design memo. The goal is to help you make good implementation decisions, manage context well, use the local skills correctly, and get to a playable game quickly.

## Primary Objective

When asked to create a game, optimize for this sequence:

`cohesive direction -> clear assets -> written spec -> technical plan -> playable build -> focused iteration -> regression protection`

Do not optimize for a perfect first draft.

Optimize for:

- getting to a playable version quickly
- making future iterations cheaper
- using the right skill for the right phase
- avoiding common asset, camera, animation, and architecture mistakes

## Operating Rules

When using this playbook, follow these rules:

1. Decide early whether the game is fundamentally `3D` or `2D`.
2. Prefer a **small playable slice** over broad unfinished scope.
3. Use existing local repo assets first when they fit, but choose freely across the evolving `public/assets/` library, other repo assets, and external sources if needed.
4. Write key project knowledge to Markdown files in the repo instead of keeping it only in conversation context.
5. Save plans before large implementation passes.
6. Watch context usage and reset or compact before quality drops.
7. Iterate from real playtest problems, not theoretical polish ideas.
8. Add automated coverage only after the core loop is actually playable.

## Local Asset Library

This repo already includes a useful local asset library under `public/assets/`.

Treat that folder as the **default first place to look** before searching externally or generating major production assets.

`public/assets/` is expected to grow over time.

Do **not** hardcode assumptions that only the currently documented packs exist.

Treat the actual folder contents on disk as the source of truth.

Examples currently present:

- `public/assets/universal.glb`

Current repo-specific note:

- the current checked-in runtime library is a single humanoid fighter asset rather than a broad multi-pack catalog
- treat `public/assets/index.json` as the current asset contract for that fighter

General observations:

- some local packs include `glTF` or `glb` assets, which should generally be the preferred runtime format for web-game implementation here
- some packs may also include `FBX`, `OBJ`, `.blend`, SVG UI assets, images, source files, or mixed formats
- some packs may be useful source libraries without being immediate runtime-ready assets
- some expected pack folders may exist only as placeholders until files are actually added
- license and usage terms may vary by pack, so verify them rather than assuming all assets are identical

Use this practical rule:

1. inspect `public/assets/` first
2. shortlist the assets or packs that best match the specific game
3. prefer `glTF` or `glb` files for runtime use when available
4. if a chosen pack is OBJ-only, FBX-only, or otherwise not runtime-ready, document the prep/conversion step before broad implementation
5. if a desired pack is missing from `public/assets/`, treat that as a blocker and record it explicitly in the docs
6. choose one dominant visual family, and only mix packs if the styles are compatible enough for the prototype
7. keep the selected assets organized under `public/assets/` without duplicating entire packs unless there is a clear reason
8. create an index for the specific runtime subset the game will load

Do not make a game depend implicitly on the entire asset library if you can avoid it. Define a game-specific runtime subset first.

Reference documents:

- `docs/FREE_ASSETS_SOURCE_INDEX.md`
- `docs/FREE_ASSETS_CURATION_PLAN.md`

Important note:

- the reference docs are useful snapshots and examples, but if `public/assets/` has changed, inspect the actual folder and update or regenerate the inventory as needed

## Asset Selection Heuristics

When choosing assets for a new game, optimize for:

- fit for the game concept and camera style
- coverage of the required gameplay roles
- silhouette readability
- animation availability for actors
- style cohesion across the first playable slice
- runtime-friendly formats
- clear license status
- reasonable file size and loading complexity

Prioritize these gameplay roles early:

- player avatar
- enemy or hazard set
- environment or terrain set
- pickup or reward set
- one objective or goal prop

If several candidate assets exist, prefer the one that is:

- easier to read in motion
- easier to normalize and load
- more likely to support future expansion
- less likely to force a style clash

## Default Track Selection

Use this default decision tree:

- If the game is primarily 3D, use `threejs-builder` as the backbone.
- If the game is primarily 2D, use `phaser-gamedev` as the backbone.
- If the game is 2D and uses layered terrain or Tiny Swords assets, also use `tinyswords-tilemap`.
- If the game needs concept visuals, support art, sprite sheets, or bitmap asset generation, use `fal-ai-image`.
- If the game is already playable and needs regression protection, use `playwright-testing`.
- If the game is a stable Three.js web app that now needs iOS packaging, use `threejs-capacitor-ios`.

If the user does not specify a format, prefer:

- `threejs-builder` for a 3D browser game
- `phaser-gamedev` for a 2D browser game

## Skill Combination Pattern For 3D Fighting Prototypes

For a Tekken-like or arena-fighter prototype, these skills usually work together in this order:

- `threejs-builder` is the backbone for scene setup, GLB loading, reference-frame calibration, fixed or softly tracking camera work, and fighter animation state logic
- `threejs-capacitor-ios` contributes the most useful metadata lesson even before mobile packaging matters: keep clip names in JSON and resolve exact strings instead of hardcoding guesses in UI or gameplay code
- `playwright-testing` comes in only after the combat loop is playable and deterministic enough to expose readiness hooks and stable smoke coverage
- `fal-ai-image` is optional and should only fill gaps like concept art, temporary UI, or support visuals; it should not replace a usable local fighter asset that is already on disk
- `phaser-gamedev` and `tinyswords-tilemap` are not the primary track for this kind of prototype because the core problem is 3D camera, rig, and animation management

Current repo-specific application:

- start from `public/assets/universal.glb`
- use `public/assets/index.json` as the exact clip contract
- scope the first playable slice as one fighter plus one cloned dummy in a primitive arena
- treat `Roll_RM` and `Sword_Attack_RM` as the highest-value root-motion experiments after calibration

## What Each Skill Is For

### `threejs-builder`

Use this when building or planning a 3D browser game.

Rely on it for:

- scene architecture
- GLTF loading
- reference-frame calibration
- animation state logic
- camera behavior
- movement systems
- general Three.js gotchas

This should be the main skill for:

- 3D prototypes
- arena games
- stealth games
- action exploration games
- GLTF-based web games

### `phaser-gamedev`

Use this when building or planning a 2D browser game.

Rely on it for:

- scene structure
- Phaser configuration
- input handling
- physics decisions
- sprite animation
- asset loading
- 2D gameplay architecture

This should be the main skill for:

- top-down action games
- platformers
- arcade games
- tilemap-driven games

### `tinyswords-tilemap`

Use this when a 2D game uses Tiny Swords or a similar layered terrain style.

Rely on it for:

- elevation layering
- shadow placement
- water foam animation
- stairs and transitions
- readable terrain composition

Do not use it as a general replacement for the 3D workflow.

### `fal-ai-image`

Use this for bitmap image generation or editing that directly supports the game workflow.

Primary uses:

- concept mockups before implementation
- sprite sheets for 2D games
- support art or filler assets
- prop or UI ideation
- environment concepts

For 3D games, do not assume this should replace the core asset pack. Use it mainly to:

- create visual references
- fill art gaps
- communicate target feel

### `playwright-testing`

Use this after a playable build exists.

Rely on it for:

- smoke tests
- deterministic browser checks
- canvas and WebGL verification
- screenshot checks after stabilization
- regression protection for core flows

Do not lead with tests before the game is playable.

### `threejs-capacitor-ios`

Use this only when:

- the Three.js browser version already works
- web asset paths are stable
- mobile packaging is a real requirement

This is a shipping and integration step, not a starting step.

## Standard Delivery Artifacts

When building a game, try to create and maintain these files where useful:

- `docs/PRD.md`
- `docs/TDD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `public/assets/index.json`
- `public/concepts/...` or another project-local concept image folder

These files reduce prompt drift and make future sessions much stronger.

Also consult when using the local asset library:

- `docs/FREE_ASSETS_SOURCE_INDEX.md`
- `docs/FREE_ASSETS_CURATION_PLAN.md`

Optional but useful on larger or changing asset libraries:

- `docs/ASSET_SELECTION.md`
- `docs/ASSET_AUDIT.md`

## Required Workflow

Follow these phases in order unless the user explicitly asks for a shorter path.

### Phase 1: Define The Game

Before coding, establish:

- genre
- 2D or 3D
- target platform
- camera style
- input style
- core loop
- fail state
- win state
- minimum playable slice

If the user gives a vague request like "make a game," narrow it into a small concept before implementation.

Target deliverable:

- a concise game summary with clear player verbs and success criteria

### Phase 2: Choose The Core Asset Strategy

Pick one of these:

- off-the-shelf cohesive asset pack
- existing repo assets
- AI-generated concept plus selective AI-generated assets
- placeholder-first development

Preferred order:

1. cohesive local repo assets from `public/assets/`
2. curated compatible mix of local repo assets
3. other existing repo assets
4. placeholder-first with later asset replacement
5. external cohesive asset pack
6. fully generated production art

For 3D games:

- inspect `public/assets/` before anything else
- do not assume a specific pack name in advance
- prefer `glTF` or `glb` assets when available
- if the chosen environment pack is OBJ-only or has incomplete texture/material references, treat that as a prep task before gameplay implementation
- prefer animated character assets for players and enemies
- prefer packs or subsets that cover the core gameplay roles cleanly
- prefer one dominant visual family, with only a small supporting mix when needed
- treat the existing pack layout under `public/assets/` as the source of truth
- prefer indexing or selectively organizing the subset the game uses rather than duplicating the same files again
- keep the file structure web-friendly
- verify license expectations

For 2D games:

- inspect `public/assets/` and the repo for suitable 2D sources first
- prefer consistent sprite or tile packs
- do not assume frame sizes
- plan an asset measurement pass before integration

### Phase 3: Build An Asset Index

If the project uses a nontrivial asset pack, create:

- `public/assets/index.json`

If `public/assets/` has changed significantly or the source inventory is outdated, also consider updating:

- `docs/FREE_ASSETS_SOURCE_INDEX.md`
- `docs/ASSET_AUDIT.md`

This file should summarize:

- stable asset IDs
- relative paths
- categories
- notable animations
- recommended usage notes when useful

This step is important because it prevents repeated folder traversal and gives future prompts a stable contract.

If the game is simple and uses very few assets, this can be lighter, but do not skip it for medium or large packs.

When the local asset library already lives under `public/assets/`, use this approach:

1. inspect and choose the subset from `public/assets/`
2. build `index.json` for the exact files the game will load
3. reorganize or alias only when there is a clear gameplay or maintainability reason

This keeps runtime paths explicit without forcing redundant copies of already web-ready assets.

If the project later grows into a larger runtime library, it is fine to derive a broader `assets_index.json` from this smaller audit pattern.

### Phase 4: Create A Concept Anchor

Before major implementation, create a concept anchor when visual direction is still fuzzy.

Use:

- selected local assets from `public/assets/`
- asset previews
- `index.json`
- a short gameplay description

Then create either:

- a concept mockup image
- a concise art direction note
- both

For 3D games, a concept image is especially useful because it helps anchor:

- camera angle
- lighting style
- map density
- mood
- HUD direction

### Phase 5: Write The PRD

Create `docs/PRD.md` when the game is more than a trivial experiment.

The PRD should define:

- game fantasy
- player actions
- gameplay loop
- controls
- level or map structure
- enemies or hazards
- pickups or rewards
- UI and feedback requirements
- success and failure states
- scope boundaries
- which local asset pack, external pack, or curated subset the game is based on
- why those assets were chosen for the game

Keep it practical. Avoid fluffy marketing language.

### Phase 6: Write The TDD

Create `docs/TDD.md` before a major implementation pass.

For 3D games, use `threejs-builder` to shape this document.

For 2D games, use `phaser-gamedev` to shape this document.

The TDD should define:

- runtime structure
- file structure
- scene architecture
- asset-loading strategy
- state model
- collision approach
- animation handling
- camera rules
- input handling
- win and fail logic
- testing hooks if needed
- exact runtime asset locations and loading assumptions

The TDD exists to reduce implementation thrash.

### Phase 7: Save A Plan Before Coding

Before a large implementation pass, create:

- `docs/IMPLEMENTATION_PLAN.md`

This should be a practical build order, not a broad essay.

It should answer:

- what gets built first
- what can stay placeholder
- what dependencies exist between systems
- what the first playable milestone is

If using Cursor Plan Mode helps produce this, use it.

Do not start a large implementation pass with only a vague idea in context.

### Phase 8: Manage Context Explicitly

Treat context as a production constraint.

Important rules:

- write key decisions to files
- do not keep important plans only in chat
- reset or compact before large code generation if context has become crowded
- use the saved docs as re-entry points

When moving from planning to implementation:

1. ensure PRD exists
2. ensure TDD exists
3. ensure the implementation plan exists
4. ensure major assets or references are stored in the repo
5. start the implementation pass with a clean enough context window

### Phase 9: Build The First Playable Version

The first version should aim for:

- a runnable game
- correct asset loading
- basic movement
- basic interactions
- objective completion
- enough feedback to understand success and failure

Do not over-polish version one.

Acceptable in version one:

- placeholder art
- rough UI
- basic balance
- temporary level layout

Not acceptable in version one:

- no playable loop
- broken asset loading
- unclear controls
- no win or fail condition

### Phase 10: Serve The Game Correctly

When testing a web game that loads assets dynamically, do not rely on opening `index.html` directly from disk.

Serve it locally.

This matters for:

- GLTF loading
- textures
- JSON files
- browser asset permissions
- relative path correctness

Assume localhost-based testing unless the project architecture clearly does not require it.

### Phase 11: Playtest And Iterate

Once the first playable build exists:

1. play it
2. identify the main blockers
3. write a short issue list
4. fix one issue or a very small batch
5. replay immediately

Typical high-value issues:

- movement feels wrong
- camera readability is poor
- map layout is too tight or too empty
- animation states are wrong
- interactions are unclear
- difficulty is unfair
- markers or UI feedback are misplaced

Do not rewrite everything after the first test.

Prefer the smallest change that improves the feel meaningfully.

Also prefer solving gameplay with the assets already available locally before introducing new asset dependencies.

### Phase 12: Add Automated Coverage

After the loop feels playable, add targeted automated coverage with `playwright-testing`.

Start with one smoke flow.

Good first assertions:

- game loads on localhost
- scene initializes
- player can move
- one objective interaction works
- one visible feedback element appears correctly

For canvas or WebGL games:

- add deterministic hooks when needed
- prefer readiness signals over sleeps
- add screenshot checks only after the output is stable enough

## 3D-Specific Guidance

When using `threejs-builder`, follow these extra rules:

1. Lock the reference frame contract early.
2. Verify forward direction instead of guessing.
3. Normalize anchors and scale intentionally.
4. Prefer cohesive local GLTF packs from `public/assets/` over trying to synthesize a full art pipeline.
5. Use concept mockups to communicate the intended feel before implementation.
6. Save the plan before the big code pass.
7. Expect the first build to need layout, camera, and feel iteration.

Repo-specific guidance for 3D asset selection:

- inspect the current `public/assets/` contents instead of assuming yesterday's inventory still applies
- prefer `glTF` or `glb` over `FBX`, `OBJ`, or `.blend` for the actual web runtime
- if a local pack already ships as `glb`, treat that as part of the happy path and prefer direct use over unnecessary re-exporting
- keep runtime references rooted in `public/assets/` and prefer indexing the chosen subset over duplicating packs
- choose assets freely based on role coverage, animation usefulness, cohesion, and runtime simplicity
- if the only local runtime fighter is `public/assets/universal.glb`, scope the first playable build around that asset first instead of writing docs for packs that are not actually present
- if no good local fit exists, then search externally or fall back to placeholders intentionally

If there is a "camera problem," check whether it is really caused by:

- corridor width
- wall height
- level density
- interaction spacing

Do not assume it is only a camera math problem.

## 2D-Specific Guidance

When using `phaser-gamedev`, follow these extra rules:

1. Decide scenes early.
2. Pick the physics model early.
3. Use a clean boot and preload flow.
4. Measure every spritesheet before coding the loader.
5. Create harness scenes when UI slicing or animation loading is risky.
6. Use `tinyswords-tilemap` only when that layered terrain approach fits the game.

Repo-specific note:

- `public/assets/` may grow to include 2D assets, source files, mixed-format packs, or hybrid libraries; verify runtime suitability rather than assuming every local asset is a direct Phaser drop-in

For spritesheets:

- measure dimensions
- count rows and columns
- verify spacing
- verify margins
- verify each animation sheet separately

## How To Use Cursor Agent In Practice

When following this document as Cursor agent:

- gather the relevant local skill instructions first
- inspect the repo before making assumptions
- write specs to files before large implementation passes
- prefer planning before broad edits
- make the game playable before making it polished
- use the browser and test tools after the game exists

If the user asks for a game from scratch, your default sequence should be:

1. clarify the concept
2. choose 2D or 3D
3. choose the main skill
4. inspect and inventory `public/assets/` for matching local assets or packs
5. choose assets based on fit, cohesion, format, animation support, and license
6. determine the curated runtime asset strategy
7. create `index.json` if needed
8. create a concept anchor if needed
9. write `docs/PRD.md`
10. write `docs/TDD.md`
11. write `docs/IMPLEMENTATION_PLAN.md`
12. implement the first playable version
13. playtest and refine
14. add smoke coverage

## Anti-Patterns

Avoid these mistakes:

- building too much before the first playable loop exists
- generating all core art first without gameplay validation
- ignoring `public/assets/` and immediately searching for outside assets
- hardcoding asset assumptions from outdated inventory docs after `public/assets/` has changed
- mixing wildly incompatible styles without a clear reason
- relying on chat context instead of saving documents
- skipping the asset index on a big pack
- over-testing before the game is playable
- making huge unfocused iteration passes
- ignoring asset-loading constraints of the browser
- loading raw source formats when a local `glTF` version is already available
- treating skills as magic instead of targeted tools

## Long-Term Improvement Rule

When you encounter recurring gotchas while building the game, do not just patch the current code.

Also consider whether the lesson should feed back into:

- the relevant skill usage
- project documentation
- future prompts
- reusable helper files

The goal is not only to finish one game.

The goal is to make future game-building sessions stronger.

## Final Instruction

If the user asks you to create a game and provides little direction, use this default stance:

- choose a small achievable scope
- inspect `public/assets/` and choose assets based on concept fit, cohesion, runtime format, animation needs, and license
- create written artifacts early
- plan before broad coding
- get to a playable loop fast
- iterate from playtest evidence
- add automation after the loop is stable

When in doubt, favor the decision that gets the repo to a **clear playable build** with the least future thrash.