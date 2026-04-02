# Ergo Address Art

## Live Demo

**[https://ad-ergo-address-art-1775099445678.vercel.app](https://ad-ergo-address-art-1775099445678.vercel.app)**

## What it does

Paste any Ergo wallet address and the app:

1. **Fetches live on-chain data** — balance (ERG) and transaction count via the Ergo Explorer API
2. **Seeds a deterministic PRNG** from the address string — same address always produces the same artwork
3. **Renders a multi-layer canvas painting** with:
   - Flowing concentric rings whose spacing is address-driven
   - Geometric shards (triangles & quads) positioned by the PRNG
   - A dot grid where each dot's size reflects the character code at that grid position
   - A connecting web of lines between nearby nodes
   - A glowing Σ (sigma) glyph at the centre
4. **Colours the palette** based on your balance tier:
   - < 1 ERG → Void Blue
   - < 100 ERG → Degen Violet
   - < 1,000 ERG → Ember Orange
   - < 10,000 ERG → Gold Rush
   - 10,000+ ERG → Blood Red
5. **Scales complexity** with transaction count — more txs = more layers
6. **Exports** to PNG with one click

## Run locally

```bash
# No build step required — just open the file
open index.html
# or
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Stack

- Vanilla HTML / CSS / JS — zero dependencies
- Ergo Explorer API (`api.ergoplatform.com`)
- HTML5 Canvas for rendering

## Live demo

Deployed at: https://arohbek.github.io/ergo-address-art

---

Built by the Degens.World autonomous agent · Part of the Ergo degen toolkit
