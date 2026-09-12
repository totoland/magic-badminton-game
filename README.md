# Badminton

Arcade badminton with an NES Tennis style camera: you look over the near player's shoulder, the court
runs away from you in fake perspective, the opponent plays at the far end. Vanilla JS + Canvas, ES modules,
no dependencies, no image assets. Farm girl vs a one-year-old Alaskan Malamute holding the racket in its mouth.

The earlier side-view version (Pikachu Volleyball camera) is kept frozen in `archive/sideview/`.

## Run

```sh
npm run dev      # node serve.mjs (no-cache static server on :8080)
open http://localhost:8080
npm test         # node --test
```

ES modules do not load over `file://`, so use the dev server.

## Controls

| Player | Move | Lob (clear) | Drop | Smash (jump + smash) |
|---|---|---|---|---|
| P1 (near) | W A S D | Q | E | Space |
| P2 (far) | Arrows | . | , | Enter |

Movement is screen-relative: up moves away from the camera for both players. In 1P mode both key sets
drive the human. `P` or `Esc` pauses, `M` mutes.

Hits are automatic on racket contact. What you hold at contact picks the shot; left/right held at
contact aims the shot toward that sideline:

| Input held at contact | Shot |
|---|---|
| nothing | neutral arc to mid court |
| lob key | clear: high and deep to the back line |
| drop key | net drop just over the net |
| toward the net | drive: flat and fast |
| smash key | press it to jump; contact in the air is a smash when the shuttle is high and you are near the net, otherwise a jump drive |

**Aiming.** Depth comes from the shot type above. Direction comes from left/right: hold left or right
(or tilt the joystick sideways) at the moment of contact and the shot goes toward that sideline;
hold nothing and it goes down the middle. On the joystick the tilt is proportional.

**Serve.** Drop key = short serve just past the service line. Smash or lob key = long serve to the back
line (moving toward the net while pressing also serves short). Left/right shifts the serve a little
inside the box. The server stands in the right service court on an even score and the left on an odd
score, and serves diagonally, like the real rule. Serving never jumps.

**Returning.** You do not need exact racket contact: stand inside the yellow circle drawn at the
predicted landing spot when the shuttle comes down and you return it (red circle = it will land out).
In the air, a shuttle within a wider radius and near racket height is hit too, which is how jump
smashes connect.

## Mobile (9:16)

Open the same URL on a phone. In portrait the court sits in the middle of a 9:16 frame with a large
score header above and touch controls below: a virtual joystick for the left thumb (4-way run; its
horizontal tilt at contact aims the shot) and `LOB`, `DROP`, and a big `SMASH` for the right thumb.
Tap a menu row to change it, tap START to play, `II` pauses, `M` mutes. Landscape on a touch device
widens the frame and puts the joystick in the left gutter and the buttons in the right one, so the
court stays unobstructed. The page ships a web manifest for "Add to Home Screen"
(iOS home-screen icons need a PNG, which is not included yet).

## Rules

Rally scoring to 21, win by 2, cap at 30. The rally winner serves next. A shuttle landing beyond a
sideline or baseline is out and the point goes to the receiver. Not modelled: lets, net touches by a
player, change of ends, and service-box faults (the serve is aimed at the right box but not judged).

## Layout

- `src/config.js` every tunable (court, camera, physics, shot table, CPU levels, keys)
- `src/physics.js` 3D shuttle integration, net sweep, landing prediction, shot solver (pure, tested)
- `src/rules.js` scoring and landing judgement (pure, tested)
- `src/game.js` state machine TITLE -> SERVE -> RALLY -> POINT -> GAMEOVER
- `src/ai.js` CPU controller producing the same Intent as the keyboard
- `src/layout.js`, `src/touch.js` frames for landscape / portrait, joystick and buttons as virtual keys
- `src/render/camera.js` fake perspective projection; `render/sprites.js` front/back pixel art;
  `render/renderer.js` court scene; `render/hud.js` text, menus, overlays

## Adding a character from AI-generated art

1. Generate a sprite sheet (prompt template below), 4 columns x 2 rows: top row = back view, bottom row =
   front view; frames left to right = stand, run1, run2, jump. Solid magenta or transparent background.
2. Open `tools/sprite-import.html` from the dev server (http://localhost:8080/tools/sprite-import.html), drop
   the PNG, set the target cell size (about 20x32 for a human, 20x22 for a quadruped) and max colours (8),
   press Convert. It downsamples with nearest-neighbour, quantises the palette and prints string grids.
3. Paste the palette lines into `PALETTE`, the frames object into `src/render/sprites.js`, register the
   character in `CHAR_DEFS` (frames mode) and add its id to `CHARS` / `CHAR_NAMES` in `src/config.js`.
   The racket is drawn by the game at the `hand` anchor, so generate characters with empty hands.

Prompt template (works with most image generators; attach your reference design as the image prompt):

> Pixel art sprite sheet of [your character], retro 8-bit NES style, for a sports game seen from behind
> the player. Grid of 4 columns and 2 rows, evenly spaced cells, same scale in every cell. Top row: the
> character seen from BEHIND. Bottom row: the character FACING the viewer. Columns left to right:
> standing idle, running step 1, running step 2, jumping with legs tucked. Full body, feet on the same
> baseline in every cell, empty hands. Chunky pixels, flat colours, maximum 8 colours, no anti-aliasing,
> no gradients, no shadows, no outlines glow, no text, solid magenta background #FF00FF.
