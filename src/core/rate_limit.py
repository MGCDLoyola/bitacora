from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def obtener_ip_cliente(request: Request) -> str:
    ip_cloudflare = request.headers.get("CF-Connecting-IP")

    if ip_cloudflare:
        return ip_cloudflare

    return get_remote_address(request)


limiter = Limiter(key_func=obtener_ip_cliente)