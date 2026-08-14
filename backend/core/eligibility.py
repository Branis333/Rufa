from typing import Final

QUESTION_RULES: Final[dict[str, bool]] = {
    "recent_donation": True,
    "illness": True,
    "medication": True,
    "tattoo": True,
    "weight": False,
}


def evaluate_eligibility(answers: dict[str, bool]) -> tuple[bool, list[str]]:
    missing = QUESTION_RULES.keys() - answers.keys()
    if missing:
        raise ValueError(f"Missing eligibility answers: {', '.join(sorted(missing))}.")

    failed = [
        question_id
        for question_id, disqualifying_answer in QUESTION_RULES.items()
        if answers[question_id] is disqualifying_answer
    ]
    return not failed, failed
