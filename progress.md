Original prompt: inspect the repo and understands how the assets are being leveraged in this game prototype. the asset @public/assets/blaster-a.glb is a pistol model. To maintain the current integrity of the game and setup, what would be the best way to incorporate this gun model correctly in the character's hand when character enters the pistol stance?

## 2026-04-13

- Created this progress log for the pistol prop attachment work.
- Confirmed the current runtime contract loads one base mannequin from `public/assets/index.json`, then merges compatible animation packs in `src/main.js`.
- Confirmed pistol stance already exists as layered upper-body animation, but `public/assets/blaster-a.glb` is not referenced anywhere yet.
- Planned implementation: add optional pistol attachment metadata to the asset contract, load the pistol as a prop on `hand_r`, and toggle its visibility from resolved pistol animation state rather than raw input alone.
- Added `attachments.pistol` metadata to `public/assets/index.json` with path, target bone, and editable transform values.
- Updated `src/main.js` to validate optional attachment metadata, load the pistol GLB during hero setup, mount it on `hand_r`, and expose pistol attachment state through `window.__TEST__.getState()`.
- Updated animation playback helpers so pistol visibility follows resolved upper-body pistol presentation state instead of only following raw RMB input.
- Verified the project still builds successfully with `npm.cmd run build`.
- Tuned the pistol mount metadata to `position: { x: 0.02, y: -0.01, z: -0.02 }`, `rotationDeg: { x: 0, y: 0, z: -90 }`, and `scale: 0.24` on all axes after live browser checks.
- Verified in a live Vite session that:
  - idle keeps the pistol hidden
  - pistol stance shows the pistol on the right-hand attachment
  - pistol shoot resolves to `Pistol_Shoot + Idle_Loop`
  - releasing RMB immediately after the shot still keeps the pistol visible while `upperBodyActionLock` is `Pistol_Shoot`
  - once the shoot state settles, the pistol hides again
- Residual asset issue: `blaster-a.glb` requests `Textures/colormap.png`, which is not present in the repo, so the browser logs a missing-texture warning and the prop renders without that texture file.
- Follow-up regression: `attachments.pistol.rotationDeg = { x: 90, y: 0, z: 0 }` made the prop disappear from the gameplay camera even though the attachment state remained `visible: true`.
- Restored a visibly working mount by returning to `rotationDeg: { x: 0, y: 0, z: -90 }` and nudging `position.x` from `0.02` to `0.08` so the pistol reads more clearly outside the hand/body silhouette.
- Kept the attachment-material pass that marks the pistol meshes `THREE.DoubleSide`; it did not fully solve the `x: 90` case on its own, but it is harmless for this prop and may help with thin surfaces.
- Direct Playwright inspection confirmed the pistol is visible again in pistol stance after the rotation rollback and position nudge.
- Tried to run the repo's shared `web_game_playwright_client.js`, but it could not resolve the `playwright` package from the skill directory in this environment (`ERR_MODULE_NOT_FOUND`), so the final visual verification used the direct local Playwright scripts instead.
- Replaced the old direct `hand_r` mount with a reusable socket pipeline: `attachments.pistol` now defines a dedicated `socket` block and an independent `meshOffset` block in `public/assets/index.json`.
- Added runtime validation for the right-hand weapon socket by resolving `hand_r` and confirming the expected right-hand finger chain (`thumb_01_r`, `index_01_r`, `middle_01_r`, `ring_01_r`, `pinky_01_r`) exists before creating `weapon_socket_r`.
- Calibrated `weapon_socket_r` in `hand_r` local space from the live rig instead of eyeballing the rendered view. Final socket transform:
  - parent bone: `hand_r`
  - socket name: `weapon_socket_r`
  - local position: `{ x: -0.0118, y: 0.0722, z: 0.0141 }`
  - local rotation (deg): `{ x: -100.61, y: 1.72, z: 165.29 }`
- Verified the pistol GLB's own local bounds already align with a usable weapon convention for this socket pass (long axis on local `z`, grip dropping on local `-y`), so the mesh offset rotation remains identity and only scale is applied.
- Added socket-oriented pistol debug state so `window.__TEST__.getState()` now reports `parentBoneName`, `socketName`, `socketLocalPosition`, `socketLocalRotationDeg`, mesh offset values, and whether mesh-axis correction is active.
- Live Playwright inspection after the socket rewrite showed `weapon_socket_r` world-forward and the character model forward are effectively identical in pistol stance, and the mesh root stayed at identity rotation (`meshAxisCorrectionApplied: false`).
- No hand/finger animation edits were required after the socket calibration pass.
- Verified the project still builds successfully with `npm.cmd run build` after the socket rewrite; the pre-existing missing texture warning for `Textures/colormap.png` on `blaster-a.glb` remains.
- Increased the pistol `meshOffset.scale` from `0.24` to `0.32` on all axes after user feedback that the socketed prop still read too small in-hand; the socket position/rotation stayed unchanged.
- Flipped the pistol barrel direction by setting `attachments.pistol.meshOffset.rotationDeg.y = 180`, preserving the calibrated `weapon_socket_r` socket transform while reversing the authored pistol mesh forward axis.

