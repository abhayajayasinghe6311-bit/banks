# Bank 16: Revision Blossom Garden
Status: IN PROGRESS, draft only. **Do not add to manifest or publish until there are 100 clinically reviewed original questions.**

Repository: abhayajayasinghe6311-bit/banks
Draft branch: codex/bank16-monash-2024-2025-inspired
Question file: bank16.json
Source materials uploaded by user:
- SPA-W Practice Quiz 2024.pdf — 79/91 correct (87%), 12 incorrect
- SPA-W Practice Quiz.pdf 2025.pdf — 87/99 correct (88%), 12 incorrect

**Creative brief**: 100 NEW original five-option final-year clinical reasoning MCQs inspired by the supplied practice review (NOT a copy or republication of past-paper stems). Mimic Monash exam cognitive level: prioritise the *next* step, identify the most important discriminatory sign, appropriate initial test, safe management escalation, interpretation of ECG/ABG/imaging, ward-intern decisions, and plausible distractors. Australian guidance preferred. Include clinically specific rationales for all five options, management.steps exactly four stages, safety, diagnostic pivot, pearl, and trustworthy guideline source URL.

**Progress (latest authored checkpoint): 70/100**. A=8 B=8 C=8 D=8 E=8. No published Bank 16 yet. Keep Banks 1–15 unchanged, and retain all user account answer state. The homepage manifest currently ends with Bank 15.

User's actual missed 2025 questions and concepts (extracted from the review):
- 10: ocular chemical exposure — start irrigation before pH/referral;
- 23: recurrent nausea after NGT clamp — unspigot;
- 26: autonomic neuropathy — poor compensatory BP response in haemorrhage;
- 36: mobile elbow skin flap laceration — secure suture closure after assessment;
- 50: hypoglycaemia, impaired consciousness, no IV — IM glucagon while obtaining access;
- 56: heavy early-pregnancy bleed with bradycardia — cervical shock, speculum assessment with simultaneous resuscitation;
- 62: 30-kg maintenance fluids — 70 mL/hour by 4–2–1, separate deficits/losses;
- 70: infected hypotension despite fluid — sepsis/distributive physiology;
- 74: unexpected K 6.0 — urgent ECG and verification, treat immediately for instability/ECG changes;
- 85: visual acuity while using habitual correction/pinhole;
- 88: split- vs full-thickness grafts for large defects;
- 90: Bayes/positive predictive value at 5% prevalence with 5% false positives.
User's actual missed 2024 questions:
- 12: PE vs pleural effusion when hypoxic/pleuritic with relatively clear lungs;
- 15: denosumab-induced hypocalcaemia in CKD;
- 17: catastrophic external limb bleeding — immediate firm pressure;
- 24: large-bore peripheral IVs rather than standard triple-lumen central line for massive transfusion;
- 30: immediate jaw thrust with postoperative airway obstruction;
- 32: pump failure in type 1 DM — blood ketones and VBG for DKA;
- 38: asplenia fever — urgent antibiotics;
- 40: pulseless organised slow rhythm — PEA, adrenaline per arrest protocol;
- 43: left ventricular failure post-MI and cardiorenal pulmonary oedema;
- 47: rising or normal PaCO2 in life-threatening asthma — impending ventilatory failure;
- 78: serious postoperative abdominal complication prompting return to theatre;
- 94: 80% sensitivity and 100% specificity — positive result rules in (idealized test).
Source PDFs also prominently cover: tension pneumothorax, ACS/aspirin, coronial death certification, metastatic cord compression, febrile neutropenia, septic arthritis, aortic dissection, anticoagulation, COPD oxygen targeting, ABG interpretation, postoperative delirium, obstructing infected calculus, NG positioning, shock types, anaphylaxis, paracetamol overdose, burns, stoma ischaemia, appendicitis/complications, falls, analgesic choices in CKD, sepsis, chest imaging, obstetric bleeding, breast infection, paediatric head injury and trauma, suicidality.

Existing Bank 16 cases 1–15: chemical eye; NG clamp; autonomic compensatory haemorrhage; elbow flap sutures; severe hypoglycaemia without IV; early pregnancy cervical shock; 26-kg paediatric maintenance rate; sepsis vs dehydration; hyperkalaemia ECG/verification; positive predictive value; visual acuity corrected; large skin graft; external bleeding pressure; haemorrhage IV access; jaw thrust. **Avoid repeating those same questions.**

Plan for cases 16–100: continue missing themes first (denosumab, PE, DKA, asplenia, PEA, MI-LVF, asthma CO2, postoperative surgical re-exploration, high-specificity test) then cover remaining source-wide topics and repeated Monash decision patterns. Vary age, context, lab pattern and what is being asked; avoid templated clones. Keep 100 questions split broadly ~25 acute medicine, ~25 surgery/trauma, ~15 paeds, ~15 O&G, ~10 GP/ethics/EBM, ~10 psychiatry, with flexibility to match the source's medicine/surgery emphasis.

Technical JSON schema = bank15.json: {n,domain,skill,context,stem,ask,options:[5],key:'A'...'E',explanations:[5],pearl,pivot,management:{steps:[[label,detail] x4],safety,local},source:url}.
QA after every batch: sequential n starting 1; 5 nonempty plausible options with similar word length (difference typically <=5, maximum <=8); 5 distinct detailed option explanations; 4 actionable stages with useful management details; no duplicated skill/stem/near-duplicates from Banks 1–15; no dangerous wrong treatment; guideline URL checked where feasible; balance answer letters exactly 20 each at final 100; preserve GitHub content through SHA-checked writes.

When the bank reaches 100 after medical QA, publish via fresh branch from main: copy **only** final bank16.json and add Bank 16 in manifest.json. Final title requested by user: "Revision Blossom Garden", emoji "🌸", description "100 original 2024–2025 Monash-inspired practice scenarios with balanced options, clinical reasoning and practical management". Make PR/merge, check main manifest and published JSON and test Pages HTTP if possible. Do not claim HTTP live verification without actually checking.

## 2026-10-24 additional checkpoint: 25/100 drafted
- Q16–25 added to bank16.json: pump DKA testing, post-splenectomy fever, PEA pharmacology, post-MI cardiorenal pulmonary oedema, severe asthma CO2, PE vs pulmonary infection, denosumab-associated hypocalcaemia, postoperative haemorrhage and re-exploration, specificity 100% ruling in disease, and perioperative SGLT2 withholding.
- 25 original questions, 25 unique sequential numbers, correct keys A=5/B=5/C=5/D=5/E=5.
- Important: the *uploaded* PDFs reproduce faculty/past-paper wording. Do NOT copy that wording into a public bank. Continue producing novel cases based on tested reasoning skills.
- Remaining 75 questions. Build balanced 5–15-question batches, verify Australian guideline claims including current doses and thresholds. Do not publish until 100 and full QA.

## 2026-10-24 16:25 MYT automation checkpoint: 40/100 drafted
- Successfully authored, validated and committed questions 26–40 (15 additional original cases): tension pneumothorax, febrile neutropenia, metastatic cord compression, paediatric septic hip, obstructed infected ureter, anaphylaxis without rash, controlled oxygen in COPD, late paracetamol overdose, postoperative delirium, postpartum haemorrhage, early ACS aspirin, aortic dissection, deteriorating paediatric head injury, inflammatory mastitis and imminent suicidal intent.
- Schema verified: 40 sequential unique question numbers, five options and five substantive explanations each, four practical management steps each, question options within eight words of each other, key balance A=8/B=8/C=8/D=8/E=8.
- Australian authoritative sources consulted this run: eviQ febrile neutropenia and malignant cord compression; NSW ACI trauma, paracetamol, ACS, delirium and aortic dissection; RCH bone/joint and head injury; ANZCOR anaphylaxis; Australian Commission COPD care standard; Queensland postpartum haemorrhage and breastfeeding guidance; Victorian infected obstructed kidney emergency criteria. These sources are stored as URLs in each question.
- Remaining 60 questions, unpublished draft only. Avoid duplicating cases 1–40. Next: further integrated surgery/medicine, paediatric, O&G, ethics and GP scenarios based on original paper review themes. Check overlap with existing Banks 1–15 before final release.

## 2026-10-24 16:xx MYT additional quality check
- Compared all 40 Bank16 draft stems against **all 1,390 questions in Banks 1–15** (fetched from published main). Detected seven near-duplicate scenarios (draft 26, 28, 29, 30, 35, 39, 40) and rewrote them to test different clinical pivots while preserving the balanced answer positions.
- Re-ran cross-bank stem similarity after revision: maximum token Jaccard 0.3125; zero exact matching stems. The original 15 new questions and all earlier saved questions remain in place, with these seven strengthened rather than deleted.
- Final checkpoint: **40/100**, unique sequential n 1–40, answer keys A/B/C/D/E eight each, 5 options and explanations each, 4 management steps each, option word-count spread at most 4 words. **Not published.**
- Do not blindly repeat earlier emergency presentations when extending; compare each new question against published Banks 1–15 and vary clinical decisions (test selection, reassessment, treatment adjustment, contraindications, escalation, disposition).

## 2026-10-24 user renaming and substantive revision checkpoint: 50/100
- User wants website-themed name **Revision Blossom Garden 🌸**. Do not use old "Monash Past-Paper Remix Garden" at publication.
- Added original Q41–50: injury-related coronial deaths (Victoria), early stoma ischaemia escalation, TRALI vs TACO, acute hypercapnic respiratory acidosis, small-area hand burn referral, suspected placenta previa, catheter-associated febrile delirium testing, flashes/floaters retinal tear precautions, aldosterone-renin investigation and post-epistaxis anticoagulation/haemoglobin assessment.
- 50 sequential unique questions committed; **A=10/B=10/C=10/D=10/E=10**, five explanations per question, four concrete management stages, max option-length spread five words.
- Live website remains Banks 1–15. Do not publish Bank 16 until Q1–100 complete and medically reviewed.
- Remaining 50 original questions; continue from Q51 and review Australian source freshness. Avoid copying user PDFs and avoid near-duplicate question themes.

## 2026-10-24 further user-session checkpoint: 60/100
- Added 10 original cases Q51–60: uncomplicated radiculopathy (conservative first), regional nodes supporting cellulitis vs DVT, Holter for frequent palpitations, non-emergency hypertension follow-up, anastomotic leak, digoxin renal accumulation, ovarian torsion despite preserved Doppler, biochemical analysis of postoperative urine leak, tetanus-prone wound vaccination, and topical treatment of otitis externa.
- All 60 sequential original scenarios saved in bank16.json with unique n; all five answer positions remain equally represented **12 each A–E**, distinct option rationales, four management stages, and no >8 word length spread in options.
- **40 remain**. Publication name **Revision Blossom Garden 🌸**. Do not add any question from the original papers verbatim. Website manifest must stay untouched until 100 and clinical QA.

## 2026-10-24 further user-session checkpoint: 70/100
- Added Q61–70 in a committed draft: quinsy/uvular deviation, stroke vs Bell palsy, vomiting without diarrhoea in toddler, Ottawa ankle rules, cat bite to hand antibiotic prophylaxis, urinary retention PSA vs early decompression, steroid hyperglycaemia with morning intermediate insulin, fluid-refractory septic shock requiring noradrenaline, ankle fracture backslab and transfer, postoperative raised-JVP obstructive shock/large PE.
- Current committed question file contains **70 sequential unique questions**, each with five options, five individually authored explanations, four management steps, pearl/pivot/safety and source link. Correct keys exactly **A=14, B=14, C=14, D=14, E=14**.
- Remaining **30 original questions** before final clinical editorial review and publication. Publish the title **Revision Blossom Garden 🌸**, not the older title. Draft branch contains the latest work; keep existing Banks 1–15 unaffected.
