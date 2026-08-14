import pytest

from core.eligibility import evaluate_eligibility
from core.enums import BloodGroup, CommitmentStatus
from core.exceptions import InvalidStateError
from core.lifecycle import ensure_commitment_transition
from core.matching import can_donate
from core.privacy import project_coordinates


def test_blood_compatibility_uses_red_cell_rules() -> None:
    assert can_donate(BloodGroup.O_NEGATIVE, BloodGroup.AB_POSITIVE)
    assert can_donate(BloodGroup.A_POSITIVE, BloodGroup.AB_POSITIVE)
    assert not can_donate(BloodGroup.A_POSITIVE, BloodGroup.O_POSITIVE)


def test_eligibility_returns_failed_question_ids() -> None:
    eligible, failed = evaluate_eligibility(
        {
            "recent_donation": False,
            "illness": True,
            "medication": False,
            "tattoo": False,
            "weight": True,
        }
    )
    assert eligible is False
    assert failed == ["illness"]


def test_invalid_commitment_transition_is_rejected() -> None:
    with pytest.raises(InvalidStateError):
        ensure_commitment_transition(
            CommitmentStatus.ACCEPTED,
            CommitmentStatus.COMPLETED,
        )


def test_public_coordinates_are_approximately_projected() -> None:
    assert project_coordinates(0.34789, 32.58256, precise=False) == {
        "lat": 0.35,
        "lng": 32.58,
    }
    assert project_coordinates(0.34789, 32.58256, precise=True) == {
        "lat": 0.34789,
        "lng": 32.58256,
    }
