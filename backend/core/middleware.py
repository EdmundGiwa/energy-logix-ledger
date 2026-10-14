from .request_context import bind_request_id, reset_request_id


class RequestCorrelationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id, token = bind_request_id()
        try:
            response = self.get_response(request)
            response["X-Request-ID"] = str(request.request_id)
            return response
        finally:
            reset_request_id(token)
