# Badminton

Pikachu Volleyball-style badminton. Vanilla JS + Canvas, ES modules, no dependencies, no image assets.
Farm girl vs a one-year-old Alaskan Malamute holding the racket in its mouth.

## Run

```sh
npm run dev      # node serve.mjs (no-cache static server)
open http://localhost:8080
npm test         # node --test
```

ES modules do not load over `file://`, so use the dev server.

## Controls

| Player | Move | Jump / Lift | Drop | Smash |
|---|---|---|---|---|
| P1 (left) | A / D | W | S | Space |
| P2 (right) | Left / Right | Up | Down | Enter |

Press the smash key and the player jumps and smashes on their own. No separate jump needed.

In 1P mode both key sets drive the human. `P` or `Esc` pauses, `M` mutes.

Hits are automatic on racket contact. The keys held at contact pick the shot:

| Input | Grounded | Airborne |
|---|---|---|
| nothing | neutral arc | neutral arc |
| smash key | take off, then smash if high and near the net, else jump drive | smash / jump drive |
| jump key | press: take off. held: clear (high, deep) | clear |
| drop key | net drop | net drop |
| toward the net | drive (flat, fast) | - |

Serve: press the smash key. Hold drop or move toward the net for a low serve.

## Mobile (9:16)

Open the same URL on a phone. In portrait the court sits in the middle of a 9:16 frame with a large
score header above and touch controls below: a virtual joystick for the left thumb (left / right = run,
push up = jump and lift, push down = drop) and a big `SMASH` button for the right thumb (jump + smash,
also serves). Tap a menu row to change it, tap START to play, `II` pauses, `M` mutes. The court geometry and rules are
identical to desktop; only the framing and input differ. Landscape on a touch device shows translucent
overlay buttons on the wall band. The page ships a web manifest, so "Add to Home Screen" gives a
full-screen standalone app (iOS home-screen icons need a PNG, which is not included yet).

## Rules

Rally scoring to 21, win by 2, cap at 30. The rally winner serves next. A shuttle landing beyond the
back line is out and the point goes to the receiver. Not modelled: service courts, lets, net touches, change of ends.

## Layout

- `src/config.js` every tunable (court geometry, physics, shot table, CPU levels, keys)
- `src/physics.js` shuttle integration, net sweep, landing prediction, shot solver (pure, tested)
- `src/rules.js` scoring and landing judgement (pure, tested)
- `src/game.js` state machine TITLE -> SERVE -> RALLY -> POINT -> GAMEOVER
- `src/ai.js` CPU controller producing the same Intent as the keyboard
- `src/render/` pixel-art sprites, background, HUD
