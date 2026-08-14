from enum import StrEnum


class BloodGroup(StrEnum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class AvailabilityStatus(StrEnum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    DONATING = "donating"


class Urgency(StrEnum):
    CRITICAL = "Critical"
    URGENT = "Urgent"


class RequestStatus(StrEnum):
    OPEN = "open"
    PARTIALLY_MATCHED = "partially_matched"
    MATCHED = "matched"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CommitmentStatus(StrEnum):
    PENDING_ELIGIBILITY = "pending_eligibility"
    ACCEPTED = "accepted"
    MOVING = "moving"
    ARRIVED = "arrived"
    COMPLETED = "completed"
    DECLINED = "declined"
    INELIGIBLE = "ineligible"
    CANCELLED = "cancelled"


class VerificationStatus(StrEnum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ActivityCategory(StrEnum):
    DONATION = "donation"
    REQUEST = "request"
    SUPPORT = "support"


class NotificationType(StrEnum):
    URGENT_REQUEST = "urgent_request"
    REQUEST_ACCEPTED = "request_accepted"
    REQUEST_UPDATE = "request_update"
    DONATION_REMINDER = "donation_reminder"
    DONATION_THANKS = "donation_thanks"
    VERIFICATION_UPDATE = "verification_update"
    CHAT_MESSAGE = "chat_message"
    CONTRIBUTION_THANKS = "contribution_thanks"


class ContributionStatus(StrEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
