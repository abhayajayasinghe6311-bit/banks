# Study Garden clinical content release status

Last audited: 22 October 2026. **Clinical revision not finished and not approved for merge.** The live site remains accessible and its saved progress is untouched.

## Verified automated audit

- **12 banks / 1,090 published questions** retained without renumbering or changing correct answer letters.
- **45/1,090** questions on the development branch contain specific alternate-case management (`alternate.scenario`, `management`, `reason`).
- **583/1,090** questions have structured management notes on the development branch, though many remain generic or need clinical checking.
- **893/1,090** questions still have at least one incorrect-option explanation shorter than 80 characters.
- **515/1,090** have a conspicuous answer-length clue (the correct answer is ≥25% longer than *every* distractor).
- **549/1,090** still contain four answer options rather than the requested five.
- Banks 3, 4, 6, 7, 8 and 9 contain fewer than 100 questions; **150 additional original questions** are needed to bring all 12 banks to at least 100 each, yielding a minimum total of 1,240.

These are **screening metrics**, not clinical validity measures. A paragraph's length does not establish medical accuracy and automated tests cannot replace human guideline-based review.

## High-risk clinical errors corrected in development

- Bank 2 Q78 and Bank 10 Q69: metastatic spinal cord compression, not generic lumbar-only cauda-equina imaging.
- Bank 3 Q10: complicated parapneumonic effusion/empyema drainage, not ascending cholangitis/ERCP.
- Bank 5 Q9: anticoagulant-associated intracerebral haemorrhage, not ischaemic stroke.
- Bank 5 Q15: high-risk pulmonary embolism, not STEMI reperfusion.
- Bank 7 Q64 and Bank 10 Q25: uncomplicated gallstone pancreatitis **does not** routinely need urgent ERCP.
- Bank 8 Q20: stable suspected tubal ectopic diagnosis **does not** automatically require ruptured-ectopic emergency surgery.
- Bank 10 Q86: central retinal artery occlusion needs urgent ophthalmology/stroke assessment, not cerebral large-vessel thrombectomy template.
- Multiple other questions now have balanced options and detailed, source-linked alternative-management explanations.

All these are **saved on the draft PR**; do not represent a published clinical release.

## Release requirements

1. Preserve existing question IDs, correct-answer letters and browser progress. **Careful:** existing saved answers only store a letter, not the original option text. Rewording choices changes what old attempts appear to have selected. Implement and test a versioned-choice migration/preservation strategy before publishing any changed choice labels.
2. Expand and clinically verify all weak wrong-answer explanations; compare close competing diagnoses/treatments with relevant positives, negatives and management consequences.
3. Improve distractors so the answer cannot be guessed by length, exclusivity or exceptional specificity. Do not use artificial padding.
4. For relevant clinical cases, explain *which change in findings causes which change in investigation/treatment*, including important medication and monitoring decisions.
5. Author the missing 150 clinically distinct questions, then raise bank counts in `manifest.json` **only when append-only items exist**. Avoid renumbering or replacing old questions.
6. Verify high-risk treatment pathways, contraindications, tests and dose-specific information against official, up-to-date Australian guidelines and record source links and review dates.
7. Test keyboard/mobile interactions, prior attempts, answer review, theme changes, imports/exports, question navigation and persistence before release.
8. Obtain appropriate independent clinical review for high-risk medical content; algorithmic passes do not certify it.

## Commands

```bash
python3 scripts/audit_question_quality.py                    # nonblocking structural audit
python3 scripts/audit_question_quality.py --strict-parity     # flags option-length bias
python3 scripts/audit_question_quality.py --release-ready     # strict gate: intentionally FAILS until above metrics fixed
node --check app.js
```

The workflow `.github/workflows/question-qa.yml` runs the strict content gate on pull requests to `main`. Never claim publication or full completion until it passes AND clinical sign-off and browser regression checks are complete.

## Published separately already

Berry Bloom / Midnight Sage Night-inspired themes, readable 17px desktop MCQ choices, 16px on mobile, the small `made by hayly <3` footer, and a weekly guideline webpage-change **flagging** workflow (not automatic medical-answer rewriting).
