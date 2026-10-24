# Bank 16: Monash Past-Paper Remix Garden
Status: IN PROGRESS, draft only. **Do not add to manifest or publish until there are 100 clinically reviewed original questions.**

Repository: abhayajayasinghe6311-bit/banks
Draft branch: codex/bank16-monash-2024-2025-inspired
Question file: bank16.json
Source materials uploaded by user:
- SPA-W Practice Quiz 2024.pdf — 79/91 correct (87%), 12 incorrect
- SPA-W Practice Quiz.pdf 2025.pdf — 87/99 correct (88%), 12 incorrect

**Creative brief**: 100 NEW original five-option final-year clinical reasoning MCQs inspired by the supplied practice review (NOT a copy or republication of past-paper stems). Mimic Monash exam cognitive level: prioritise the *next* step, identify the most important discriminatory sign, appropriate initial test, safe management escalation, interpretation of ECG/ABG/imaging, ward-intern decisions, and plausible distractors. Australian guidance preferred. Include clinically specific rationales for all five options, management.steps exactly four stages, safety, diagnostic pivot, pearl, and trustworthy guideline source URL.

**Progress (latest authored checkpoint): 15/100**. A=3 B=3 C=3 D=3 E=3. No published Bank 16 yet. Keep Banks 1–15 unchanged, and retain all user account answer state. The homepage manifest currently ends with Bank 15.

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

When the bank reaches 100 after medical QA, publish via fresh branch from main: copy **only** final bank16.json and add Bank 16 in manifest.json. Suggested name: "Monash Past-Paper Remix Garden", emoji "📚", description "100 original cases calibrated to 2024–2025 Monash review papers, with high-yield safe decisions and five detailed option explanations". Make PR/merge, check main manifest and published JSON and test Pages HTTP if possible. Do not claim HTTP live verification without actually checking.
