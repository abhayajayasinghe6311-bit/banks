# Bank 17 — Moonflower Garden 🌙

**Status: 100/100 authored and structurally validated on draft branch.**

Repository: abhayajayasinghe6311-bit/banks
Draft branch: codex/bank17-moonflower-garden-draft
Question file: bank17.json

## Goal
100 original, challenging Monash SPA-W final-year clinical reasoning questions. Mixed medicine, surgery, paediatrics, O&G, GP, psychiatry, ethics and EBM. Australian guidance prioritized, Victorian where clinically applicable. Each includes five options and five distinct explanations, four management stages, a safety note, pearl, concrete management pivot and source URL.

## 2026-10-24 final draft checkpoint
- **100 questions**, all sequential and unique.
- Correct answer keys **A=20 B=20 C=20 D=20 E=20**.
- Every question has five options, five nonempty authored explanations and exactly four management stages.
- Option word-count spread no more than eight words for all questions.
- Compared all stems with **1,490 published questions across Banks 1–16**; after editorial rewrites, maximum stem token Jaccard similarity is 0.4091, no overlap >=0.42. No within-bank stem pairs over 0.42.
- Rewrote 23 near-duplicate cases to require different clinical decisions and management pivots.
- Improved source specificity with targeted official RCH, Safer Care Victoria, Queensland Health, Heart Foundation/CSANZ, RACGP, RANZCOG-related, WA Health, SOMANZ and other authoritative resources.
- **83 unique source URLs.** Some topics use related clinical standards or academic evidence instead of direct state-specific guidance; ongoing link-freshness review remains important.
- No independent clinician peer review has occurred. Educational content only; not a substitute for local protocols.

## Publishing
Publish by placing only the final `bank17.json` on `main` and appending this entry in `manifest.json`:
```json
{"id":17,"name":"Moonflower Garden","emoji":"🌙","description":"100 original advanced final-year cases with close-call options, practical management and Australian clinical guidance","count":100}
```
Preserve the exact existing Banks 1–16 and answer state. Verify GitHub Pages workflow success and final main file/manifest before claiming publication.
