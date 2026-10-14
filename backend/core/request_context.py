from contextvars import ContextVar
import uuid


_request_id = ContextVar("request_id", default=None)


def bind_request_id():
    request_id = uuid.uuid4()
    token = _request_id.set(request_id)
    return request_id, token


def reset_request_id(token):
    _request_id.reset(token)


def current_request_id():
    return _request_id.get() or uuid.uuid4()
