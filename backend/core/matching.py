from core.enums import BloodGroup

COMPATIBLE_RECIPIENTS: dict[BloodGroup, set[BloodGroup]] = {
    BloodGroup.O_NEGATIVE: set(BloodGroup),
    BloodGroup.O_POSITIVE: {
        BloodGroup.O_POSITIVE,
        BloodGroup.A_POSITIVE,
        BloodGroup.B_POSITIVE,
        BloodGroup.AB_POSITIVE,
    },
    BloodGroup.A_NEGATIVE: {
        BloodGroup.A_NEGATIVE,
        BloodGroup.A_POSITIVE,
        BloodGroup.AB_NEGATIVE,
        BloodGroup.AB_POSITIVE,
    },
    BloodGroup.A_POSITIVE: {BloodGroup.A_POSITIVE, BloodGroup.AB_POSITIVE},
    BloodGroup.B_NEGATIVE: {
        BloodGroup.B_NEGATIVE,
        BloodGroup.B_POSITIVE,
        BloodGroup.AB_NEGATIVE,
        BloodGroup.AB_POSITIVE,
    },
    BloodGroup.B_POSITIVE: {BloodGroup.B_POSITIVE, BloodGroup.AB_POSITIVE},
    BloodGroup.AB_NEGATIVE: {BloodGroup.AB_NEGATIVE, BloodGroup.AB_POSITIVE},
    BloodGroup.AB_POSITIVE: {BloodGroup.AB_POSITIVE},
}


def can_donate(donor: BloodGroup, recipient: BloodGroup) -> bool:
    return recipient in COMPATIBLE_RECIPIENTS[donor]
