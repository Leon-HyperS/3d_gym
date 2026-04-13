# Free Assets Source Index

This document inventories the actual runtime-ready assets currently present under `public/assets/`.

Use the folder contents on disk as the primary source of truth.
Use `public/assets/index.json` as the authoritative asset audit for the current repo state.

## Current Local Runtime Asset Set

Only one confirmed runtime asset is currently present in `public/assets/`:

- `public/assets/universal.glb`

This means the current repo is best treated as a focused single-character starting point rather than a broad multi-pack asset library.

## Source Asset

### `public/assets/universal.glb`

Format:

- `glb`

Observed structure:

- 1 scene
- 67 nodes
- 1 skinned mesh: `Mannequin`
- 1 skin: `Armature`
- 2 materials: `M_Main`, `M_Joints`
- 1 embedded texture image
- self-contained binary asset with no sidecar texture files currently present in `public/assets/`

File audit:

- size: `8114364` bytes
- sha256: `D867292451E432B735E2A910C2DB6640FBEA97B205D85A2E8FFED26DA87972CF`

Best for:

- main playable fighter in a Tekken-like prototype
- cloned or mirrored training dummy before a second character exists
- animation calibration and state-machine scaffolding
- placeholder NPC, intro, or menu staging work

Prototype strengths:

- covers core neutral and locomotion states needed to get a first playable fighter moving
- includes crouch, jump start / air / land, hit reactions, death, and two punch attacks
- includes root-motion variants for `Roll_RM` and `Sword_Attack_RM`
- ships as a single `glb`, which keeps the Three.js loading path simple

Prototype limitations:

- no explicit guard or block clips
- no sidestep, backdash, or throw-specific clips
- no kick chain, launcher, wake-up, or grounded recovery clips
- only one character look is currently available in `public/assets/`

## Animation Inventory

The exact clip names are audited in `public/assets/index.json`.
Grouped at a design level, the asset provides:

### Calibration / Debug

- `A_TPose`

### Neutral / Locomotion

- `Idle_Loop`
- `Walk_Loop`
- `Walk_Formal_Loop`
- `Jog_Fwd_Loop`
- `Sprint_Loop`

### Crouch / Jump / Evasion

- `Crouch_Idle_Loop`
- `Crouch_Fwd_Loop`
- `Jump_Start`
- `Jump_Loop`
- `Jump_Land`
- `Roll`
- `Roll_RM`

### Unarmed Combat / Reactions

- `Punch_Jab`
- `Punch_Cross`
- `Hit_Head`
- `Hit_Chest`
- `Death01`

### Sword Combat

- `Sword_Idle`
- `Sword_Attack`
- `Sword_Attack_RM`

### Interaction / Social / Staging

- `Idle_Talking_Loop`
- `Idle_Torch_Loop`
- `Interact`
- `PickUp_Table`
- `Push_Loop`
- `Fixing_Kneeling`
- `Driving_Loop`
- `Dance_Loop`
- `Sitting_Enter`
- `Sitting_Idle_Loop`
- `Sitting_Exit`
- `Sitting_Talking_Loop`

### Magic / Ranged

- `Spell_Simple_Enter`
- `Spell_Simple_Idle_Loop`
- `Spell_Simple_Exit`
- `Spell_Simple_Shoot`
- `Pistol_Idle_Loop`
- `Pistol_Shoot`
- `Pistol_Reload`
- `Pistol_Aim_Down`
- `Pistol_Aim_Neutral`
- `Pistol_Aim_Up`

### Water

- `Swim_Idle_Loop`
- `Swim_Fwd_Loop`

## Project-Specific Selection Guidance

For the current 3D fighting prototype direction:

- use `universal.glb` as the main playable fighter
- use a cloned or mirrored instance of `universal.glb` as the first training dummy or placeholder opponent
- build the first playable move set around `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Crouch_Idle_Loop`, `Jump_Start`, `Jump_Loop`, `Jump_Land`, `Punch_Jab`, `Punch_Cross`, `Hit_Head`, `Hit_Chest`, and `Death01`
- treat `Sword_Attack_RM` as the most promising advancing special once root motion is calibrated
- keep pistol, swimming, driving, sitting, and repair clips out of round-one combat scope unless a later feature explicitly needs them

## Recommended Runtime Format

For web game work in this repo:

- prefer `glb` or `gltf`
- keep `universal.glb` on the happy path instead of re-exporting it prematurely

## Recommended Curation Approach

Do not pretend the repo already has a wide runtime asset library.

Instead:

1. lock the prototype around `public/assets/universal.glb`
2. keep `public/assets/index.json` as the source of truth for exact clip names and prototype notes
3. use primitives, debug geometry, and UI placeholders for the arena and HUD until more assets are added
4. expand the asset plan only when gameplay needs exceed what `universal.glb` can cover

## Current Recommendation

For the current project:

- treat `public/assets/universal.glb` as the main character source
- treat `public/assets/index.json` as the current asset contract
- scope the first playable build as a 3D fighting prototype, not a broad multi-pack content game