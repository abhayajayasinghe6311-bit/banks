# Clinical MCQ quality-review and publication checklist

This branch is **not yet approved for production**. The existing live site and browser progress remain unchanged.

## Required standard
1. **Equal-effort distractors**. A correct choice must not usually be the longest, only complete management bundle, or only specific option. Other options should have comparably credible detail without becoming clinically correct.
2. **Specific alternative scenario management**. Notes must state what clinical finding changes AND which investigation, treatment, dose/monitoring category, admission threshold or referral plan changes. Generic "think about what changes" prompts do not qualify.
3. **Option-by-option learning**. All distractors need case-specific reasons, not reusable filler about recognising patterns.
4. **Safe, accurate management**. Confirm that the management steps match the actual diagnosis/stem. Never copy acute coronary syndrome management into pulmonary embolism or ischaemic stroke protocol into intracerebral haemorrhage. Cross-check against current Australian recommendations, documenting guideline URLs and retrieval/review date.
5. **No progress loss**. Do not change question numbers, the manifest question counts, or localStorage key `spaw.study.garden.online.v1`. Test attempted-question history and wrong-answer review, imports/exports and navigation.
6. **Human sign-off**. A clinical reviewer must confirm correct keys, indicated treatments, contraindications and changing clinical guidelines before merge.

## Current work completed on this branch
- Original 890 questions across Banks 1–10 have additional wrong-answer trap/check material; 383 contain structured management outlines. Many are still generic and require subject-matter review.
- A set of initial high-risk questions has received balanced option rewrites and explicit alternate-case management. Exact coverage is reported by the automated audit.
- Bank 5 Q9 (rivaroxaban-associated intracerebral haemorrhage) and Bank 5 Q15 (haemodynamically unstable pulmonary embolism) had unrelated management sequences, corrected in this branch.
- A weekly guideline website-change monitor is prepared for review. It flags changed pages for **human checking only**; it cannot certify current clinical correctness and does not update MCQs.
- UI reveals concrete alternative management where it has been authored instead of showing generic "what would change?" prompts. Existing unreviewed pivots stay in the data for clinical review, rather than appearing as completed teaching.

## Commands
```bash
python3 scripts/audit_question_quality.py
node --check app.js
python3 scripts/audit_question_quality.py --strict-parity  # expected to fail until distractors are fairly balanced
```

## Release checklist
- [ ] Clinician review of ALL question keys, rationales, management steps and source relevance
- [ ] Rewrite remaining conspicuous answer-length cues across the banks
- [ ] Replace generic wrong-answer teaching with concrete clinical comparisons
- [ ] Add alternate-scenario management to applicable questions
- [ ] Test live UI, answer persistence, review history, exports, imports and mobile layout
- [ ] Verify guideline monitor run and first baseline against accessible Australian source websites
- [ ] Merge only after the preceding items pass

Automated checks are **necessary but not sufficient** to approve medical material.
