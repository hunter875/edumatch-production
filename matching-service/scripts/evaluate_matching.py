"""
Evaluate rule-only matching quality on a small labeled dataset.

Usage:
  python scripts/evaluate_matching.py
  python scripts/evaluate_matching.py --dataset eval/eval_dataset.csv --k 10
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
import time
from pathlib import Path
from statistics import quantiles

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.matching import matching_engine  # noqa: E402


APPLICANTS = {
    "1001": {
        "gpa": 3.82,
        "major": "Computer Science",
        "level": "UNDERGRADUATE",
        "study_mode": "ONLINE",
        "location": "Remote",
        "skills": ["Python", "Machine Learning", "React", "SQL", "NLP"],
        "research_interests": ["Artificial Intelligence", "Natural Language Processing", "Education Technology"],
    },
    "1002": {
        "gpa": 3.55,
        "major": "Cybersecurity",
        "level": "MASTER",
        "study_mode": "HYBRID",
        "location": "Stanford, CA",
        "skills": ["Java", "Spring Boot", "Cybersecurity", "Networking"],
        "research_interests": ["Cybersecurity", "Distributed Systems", "Privacy"],
    },
}


OPPORTUNITIES = {
    "1001": {
        "min_gpa": 3.60,
        "scholarship_amount": 50000,
        "deadline_days": 90,
        "level": "UNDERGRADUATE",
        "study_mode": "ONLINE",
        "location": "Remote",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Computer Science", "Data Science"],
        "required_skills": ["Python", "Machine Learning", "Deep Learning", "NLP"],
        "research_areas": ["Artificial Intelligence", "Natural Language Processing"],
    },
    "1002": {
        "min_gpa": 3.40,
        "scholarship_amount": 45000,
        "deadline_days": 60,
        "level": "MASTER",
        "study_mode": "HYBRID",
        "location": "Stanford, CA",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Cybersecurity", "Computer Science"],
        "required_skills": ["Java", "Cybersecurity", "Networking"],
        "research_areas": ["Privacy", "Distributed Systems"],
    },
    "1003": {
        "min_gpa": 3.20,
        "scholarship_amount": 30000,
        "deadline_days": 45,
        "level": "UNDERGRADUATE",
        "study_mode": "ONLINE",
        "location": "Remote",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Computer Science", "Information Systems"],
        "required_skills": ["Cloud", "Python", "SQL", "Data Visualization"],
        "research_areas": ["Cloud Computing", "Education Technology"],
    },
    "1004": {
        "min_gpa": 3.30,
        "scholarship_amount": 35000,
        "deadline_days": 75,
        "level": None,
        "study_mode": "ONLINE",
        "location": "Remote",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Data Science", "Computer Science"],
        "required_skills": ["Python", "Statistics", "Machine Learning"],
        "research_areas": ["Healthcare", "Machine Learning"],
    },
    "1005": {
        "min_gpa": 3.10,
        "scholarship_amount": 25000,
        "deadline_days": 30,
        "level": "UNDERGRADUATE",
        "study_mode": "ONLINE",
        "location": "Remote",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Computer Science"],
        "required_skills": ["Python", "NLP", "React", "Machine Learning"],
        "research_areas": ["Natural Language Processing", "Education Technology"],
    },
    "1006": {
        "min_gpa": 3.50,
        "scholarship_amount": 42000,
        "deadline_days": 105,
        "level": "MASTER",
        "study_mode": "HYBRID",
        "location": "Stanford, CA",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Computer Science", "Cybersecurity"],
        "required_skills": ["Java", "Spring Boot", "Cloud", "Networking"],
        "research_areas": ["Distributed Systems", "Cloud Computing"],
    },
    "1007": {
        "min_gpa": 3.00,
        "scholarship_amount": 15000,
        "deadline_days": 40,
        "level": "MASTER",
        "study_mode": "HYBRID",
        "location": "Stanford, CA",
        "is_public": True,
        "moderation_status": "PENDING",
        "preferred_majors": ["Cybersecurity"],
        "required_skills": ["Cybersecurity", "Java"],
        "research_areas": ["Privacy"],
    },
    "1008": {
        "min_gpa": 3.00,
        "scholarship_amount": 15000,
        "deadline_days": -5,
        "level": "MASTER",
        "study_mode": "HYBRID",
        "location": "Stanford, CA",
        "is_public": True,
        "moderation_status": "APPROVED",
        "preferred_majors": ["Cybersecurity"],
        "required_skills": ["Cybersecurity", "Java"],
        "research_areas": ["Privacy"],
    },
}


def dcg(labels: list[int]) -> float:
    return sum((2**label - 1) / math.log2(index + 2) for index, label in enumerate(labels))


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def evaluate(dataset: Path, k: int) -> dict:
    rows = load_rows(dataset)
    by_applicant: dict[str, list[dict]] = {}
    latencies_ms: list[float] = []
    hard_constraint_cases = 0
    hard_constraint_violations = 0

    for row in rows:
        applicant = APPLICANTS[row["applicant_id"]]
        opportunity = OPPORTUNITIES[row["opportunity_id"]]
        start = time.perf_counter()
        score, breakdown = matching_engine.calculate_rule_based_score(applicant, opportunity)
        latencies_ms.append((time.perf_counter() - start) * 1000)

        label = int(row["label"])
        reason = row["reason"].lower()
        is_hard_constraint = any(
            token in reason
            for token in ["gpa below", "expired", "not approved", "not public", "level mismatch", "location mismatch", "study mode"]
        )
        if is_hard_constraint:
            hard_constraint_cases += 1
            if score > 0 or breakdown.get("_hardFiltersPassed") is True:
                hard_constraint_violations += 1

        by_applicant.setdefault(row["applicant_id"], []).append({
            "opportunity_id": row["opportunity_id"],
            "label": label,
            "score": score,
        })

    precision_values = []
    recall_values = []
    ndcg_values = []
    covered_users = 0

    for ranked_rows in by_applicant.values():
        ranked = sorted(ranked_rows, key=lambda item: item["score"], reverse=True)
        top_k = ranked[:k]
        relevant_total = sum(1 for item in ranked if item["label"] >= 2)
        relevant_top = sum(1 for item in top_k if item["label"] >= 2)

        if any(item["score"] > 0 for item in top_k):
            covered_users += 1

        precision_values.append(relevant_top / max(1, len(top_k)))
        recall_values.append(relevant_top / max(1, relevant_total))

        actual_dcg = dcg([item["label"] for item in top_k])
        ideal_dcg = dcg(sorted([item["label"] for item in ranked], reverse=True)[:k])
        ndcg_values.append(actual_dcg / ideal_dcg if ideal_dcg else 0.0)

    p95_latency = quantiles(latencies_ms, n=20)[18] if len(latencies_ms) >= 20 else max(latencies_ms, default=0.0)

    return {
        "dataset": str(dataset),
        "k": k,
        "rows": len(rows),
        "constraint_violation_rate": hard_constraint_violations / max(1, hard_constraint_cases),
        "precision_at_k": sum(precision_values) / max(1, len(precision_values)),
        "recall_at_k": sum(recall_values) / max(1, len(recall_values)),
        "ndcg_at_k": sum(ndcg_values) / max(1, len(ndcg_values)),
        "coverage": covered_users / max(1, len(by_applicant)),
        "p95_latency_ms": p95_latency,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=str(ROOT / "eval" / "eval_dataset.csv"))
    parser.add_argument("--k", type=int, default=10)
    args = parser.parse_args()

    result = evaluate(Path(args.dataset), args.k)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
