# Wadham After Hours

A tiny first-person walking-sim set in a stylised low-poly **Wadham College, Oxford**,
at night. It's Tuesday, the gates are locked, and you're trying to escape college to
make it to **Tuesgays** at Plush. Built with [Three.js](https://threejs.org/) via a CDN
importmap — **no build step, no npm**. Just static files.

## Play

A friends-only passphrase guards the splash (set it in `data.js`). Then:

| | Desktop | Touch |
|---|---|---|
| Move | `W A S D` (`Shift` to run) | left thumb-stick |
| Look | mouse | drag the right side |
| Interact / talk / advance | `E` or click | the ✋ button |
| Quest log | `L` | 📜 |
| Help | `H` | ❓ |
| Pause | `Esc` | — |

**Goal:** find 3 brass keys + your Bod card, spring the Porters' Lodge, rally your
friends, grab the college drink, and get to Plush. Follow the blue beacon / compass tick.

## Editing the content

**You only ever edit `data.js`.** It holds, with comments:

- `CONFIG` — title, subtitle, the **passphrase**, and where you start.
- `LOCATIONS` — every building/quad/garden (centre `x,z`, size `w,d`, height `h`).
  North is `-Z`, east is `+X`.
- `ITEMS` — keys, Bod card, the college drink, Wren's curiosities.
- `QUESTS` — the main escape, the Tuesgays win, and the side quests.
- `NPCS` — historical figures and **your friends**: drop in real names, positions
  (`at` = a location id) and anecdote lines. Friends (`role: "friend"`) must all be
  talked to before the win.

The engine (`game.js`) reads all of it; you shouldn't need to touch it.

## Run locally

ES modules + importmap need to be served over HTTP (not `file://`):

```bash
cd "Wadham Game"
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

Repo root already has an empty `.nojekyll` so Pages serves the files as-is.

```bash
git init -b main
git add -A
git commit -m "Wadham After Hours"
# create an EMPTY repo on github.com first (e.g. wadham-after-hours), then:
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a
branch → `main` / `(root)` → Save.** Your game appears at
`https://<you>.github.io/<repo>/` within a minute or two.
