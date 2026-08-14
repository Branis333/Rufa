class AppError(Exception):
    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class ForbiddenError(AppError):
    status_code = 403


class InvalidStateError(AppError):
    status_code = 409


class ProviderNotConfiguredError(AppError):
    status_code = 501


class RepositoryError(AppError):
    status_code = 503
