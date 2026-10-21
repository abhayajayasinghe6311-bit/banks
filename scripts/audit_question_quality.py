#!/usr/bin/env python3
"""Study Garden data audit. This checks structure and review priorities, not clinical correctness."""
from collections import Counter
from pathlib import Path
import argparse
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
ABC = "ABCDE"
parser = argparse.ArgumentParser()
parser.add_argument("--strict-parity", action="store_true", help="Fail when >20% of correct options are 25% longer than every distractor")
parser.add_argument("--release-ready", action="store_true", help="Apply stricter content publication gates: 100+ questions per bank, 5 options, explanatory depth, answer fairness")
args = parser.parse_args()
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
total = 0
option_count_short = 0
wrong_explanations_short = 0
missing_practical_alternates = 0
release_violations = []
errors = []
suspects = []
metrics = []
generic_text = ("ask yourself:", "exam check:", "examine which", "identify the decisive", "which finding in the stem")
for bank in manifest["banks"]:
    number = bank["id"]
    path = ROOT / f"bank{number}.json"
    questions = json.loads(path.read_text(encoding="utf-8"))
    count = len(questions)
    total += count
    if bank["count"] != count:
        errors.append(f"Bank {number}: manifest count {bank['count']} != {count}")
    if count < 100:
        release_violations.append(f"Bank {number}: only {count}/100 questions")
    numbers = [q.get("n") for q in questions]
    if len(set(numbers)) != len(numbers) or numbers != list(range(1, count + 1)):
        errors.append(f"Bank {number}: question identifiers are not uniquely sequential")
    longest = long25 = vague_pivot = alternate = structured_mgmt = 0
    for q in questions:
        n = q.get("n")
        opts, explanations = q.get("options", []), q.get("explanations", [])
        if len(opts) not in (4, 5) or len(explanations) != len(opts):
            errors.append(f"Bank {number} Q{n}: option/explanation count mismatch")
            continue
        if q.get("key") not in ABC[:len(opts)]:
            errors.append(f"Bank {number} Q{n}: invalid key")
            continue
        if len(opts) != 5:
            option_count_short += 1
        if any(len(str(explanations[i]).strip()) < 80 for i in range(len(opts)) if i != ABC.index(q["key"])):
            wrong_explanations_short += 1
        if q.get("management", {}).get("steps") and not (q.get("alternate") or {}).get("management"):
            missing_practical_alternates += 1
        if any(not str(o).strip() for o in opts) or any(not str(e).strip() for e in explanations):
            errors.append(f"Bank {number} Q{n}: blank option or explanation")
        if len(set(o.casefold().strip() for o in opts)) != len(opts):
            errors.append(f"Bank {number} Q{n}: repeated answer options")
        correct = ABC.index(q["key"])
        other_lengths = [len(o) for i,o in enumerate(opts) if i != correct]
        target_length = len(opts[correct])
        if target_length > max(other_lengths):
            longest += 1
        if target_length >= 1.25 * max(other_lengths):
            long25 += 1
            suspects.append(f"Answer-length cue: Bank {number} Q{n}")
        pivot = str(q.get("pivot", "")).lower().strip()
        if pivot.startswith(generic_text):
            vague_pivot += 1
        alt = q.get("alternate")
        if alt:
            if not all(alt.get(k) and len(str(alt[k])) >= 30 for k in ("scenario", "management", "reason")):
                errors.append(f"Bank {number} Q{n}: incomplete alternate-management teaching")
            else:
                alternate += 1
        steps = q.get("management", {}).get("steps", [])
        if steps:
            structured_mgmt += 1
            if any(not isinstance(step,list) or len(step)!=2 or not all(str(x).strip() for x in step) for step in steps):
                errors.append(f"Bank {number} Q{n}: malformed management steps")
            text = " ".join(" ".join(map(str, step)) for step in steps).lower()
            stem = (q.get("stem", "") + " " + q.get("ask", "")).lower()
            if ("pulmonary embol" in stem or "high-risk pe" in stem) and (re.search(r"\bstemi\b", text) or "primary pci" in text or "coronary reperfusion" in text):
                suspects.append(f"POSSIBLE CLINICAL MISMATCH: Bank {number} Q{n} pulmonary embolism / coronary pathway")
            if ("intracerebral haemorrhage" in stem or "intracerebral hemorrhage" in stem) and (re.search(r"\bstemi\b", text) or "activate reperfusion" in text or "thrombolysis pathway" in text):
                suspects.append(f"POSSIBLE CLINICAL MISMATCH: Bank {number} Q{n} haemorrhage / reperfusion text")
    metrics.append({"bank":number,"questions":count,"correct_longest":longest,"correct_25pct_longer":long25,
                    "generic_pivots":vague_pivot,"alternate_management":alternate,"structured_management":structured_mgmt})
print("Study Garden QA AUDIT")
for row in metrics:
    print("Bank {bank:2d}: {questions:3d} q | correct longest {correct_longest:3d} | >25% longer {correct_25pct_longer:3d} | alternate management {alternate_management:3d} | structured plans {structured_management:3d} | vague pivots {generic_pivots:3d}".format(**row))
print(f"CONTENT REMAINING: {option_count_short} four-option questions; {wrong_explanations_short} questions have short wrong explanations; {missing_practical_alternates} management questions lack a concrete alternative-scenario plan")
print(f"TOTAL {total} questions, {sum(m['correct_25pct_longer'] for m in metrics)} strong answer-length cues, {sum(m['alternate_management'] for m in metrics)} specific alternative plans")
print(f"Review flags: {len(suspects)} (first 40 shown)")
for item in suspects[:40]:
    print(" REVIEW:", item)
for item in errors:
    print(" ERROR:", item, file=sys.stderr)
if total < 1090:
    errors.append(f"Total question count changed unexpectedly: {total}")
if "spaw.study.garden.online.v1" not in (ROOT / "app.js").read_text(encoding="utf-8"):
    errors.append("Progress storage key is missing/changed")
if args.release_ready:
    if total < 1240:
        release_violations.append(f"Only {total}/1240 total questions for requested minimum 100 per bank")
    if option_count_short:
        release_violations.append(f"{option_count_short} questions do not have 5 answer options")
    if wrong_explanations_short:
        release_violations.append(f"{wrong_explanations_short} questions have a wrong-option explanation shorter than 80 characters")
    strong = sum(m["correct_25pct_longer"] for m in metrics)
    if strong > 0.1 * total:
        release_violations.append(f"{strong} questions have correct options >=25% longer than distractors")
    if missing_practical_alternates > 0.3 * sum(m["structured_management"] for m in metrics):
        release_violations.append(f"{missing_practical_alternates} management questions lack concrete alternative-case treatment")
    errors.extend(release_violations)
if args.strict_parity and sum(m["correct_25pct_longer"] for m in metrics) > total * .2:
    errors.append("Excessive answer-length bias: >20% of correct options are >=25% longer than alternatives")
if errors:
    print(f"FAILED with {len(errors)} structural/quality-gate errors", file=sys.stderr)
    sys.exit(1)
print("STRUCTURAL CHECKS PASSED. Medical correctness requires clinician review; flagged parity issues remain.")
