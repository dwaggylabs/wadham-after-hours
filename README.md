# Wadham After Hours

A tiny first-person walking-sim set in a stylised low-poly **Wadham College, Oxford**,
at night. It's Tuesday, the gates are locked, and you're trying to escape college to
make it to **Tuesgays** at Plush.

## Password-protected build

This published site is a **single, self-contained `index.html`** that has been
encrypted with [StatiCrypt](https://github.com/robinmoisson/staticrypt). The file you
see in the repo is genuine AES ciphertext — there is no readable game source here. On
load it shows a password prompt; entering the correct passphrase decrypts the page in
the browser and runs the game.

The decrypted page bundles everything inline — the engine, all content, and Three.js —
as a single classic `<script>`, so it runs standalone with no external modules, import
map, or CDN fetches (which is also what lets it execute after StatiCrypt decrypts it).

## Play

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

The editable source (`game.js`, `data.js`, the unencrypted `index.html`) and the build
tooling are kept **outside this public repo** so the content stays private. The build
pipeline is: bundle `game.js` + `data.js` + Three.js into one inline-script
`index.html` (esbuild, IIFE), then encrypt it with StatiCrypt and apply any
post-processing before publishing.

## Deploy to GitHub Pages

Repo root has an empty `.nojekyll` so Pages serves the files as-is. Push to `main`;
**Settings → Pages → Deploy from a branch → `main` / `(root)`** serves the game at
`https://<you>.github.io/<repo>/`.
