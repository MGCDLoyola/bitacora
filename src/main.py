import logging
import mimetypes
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")

from src.core.deps import usuario_actual
from src.core.exceptions import (
    BitacoraError,
    CambioPasswordRequerido,
    ConflictoNegocio,
    ErrorEnvioCredenciales,
    NoAutorizado,
    NoEncontrado,
    OperacionInvalida,
    PermisoDenegado,
)
from src.core.logging import configurar_logging
from src.core.pg import pg
from src.core.rate_limit import limiter
from src.models.usuario import Usuario
from src.routers.auth import router as auth_router
from src.routers.cobranzas import router as cobranzas_router
from src.routers.documentos import router as documentos_router
from src.routers.evidencias import router as evidencias_router
from src.routers.expedientes import router as expedientes_router
from src.routers.roles import router as roles_router
from src.routers.usuarios import router as usuarios_router

configurar_logging()

logger = logging.getLogger("bitacora")


@asynccontextmanager
async def lifespan(app: FastAPI):
    pg.conectar()

    try:
        yield
    finally:
        pg.desconectar()


app = FastAPI(lifespan=lifespan)

app.state.limiter = limiter

app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
def pagina_inicio(
    usuario: Usuario = Depends(usuario_actual),
):
    return FileResponse("frontend/app.html")


@app.get("/login")
def pagina_login():
    return FileResponse("frontend/login.html")


@app.get("/cambiar-password")
def pagina_cambiar_password():
    return FileResponse("frontend/cambiar-password.html")


app.include_router(auth_router)
app.include_router(roles_router)
app.include_router(usuarios_router)
app.include_router(expedientes_router)
app.include_router(evidencias_router)
app.include_router(cobranzas_router)
app.include_router(documentos_router)


@app.exception_handler(NoEncontrado)
def handle_no_encontrado(request: Request, exc: NoEncontrado):
    return JSONResponse(status_code=404, content={"detail": exc.mensaje})


@app.exception_handler(NoAutorizado)
def handle_no_autorizado(request: Request, exc: NoAutorizado):
    if request.url.path == "/":
        return RedirectResponse(url="/login", status_code=303)

    return JSONResponse(status_code=401, content={"detail": exc.mensaje})


@app.exception_handler(CambioPasswordRequerido)
def handle_cambio_password_requerido(request: Request, exc: CambioPasswordRequerido):
    return JSONResponse(status_code=403, content={"detail": exc.mensaje})


@app.exception_handler(PermisoDenegado)
def handle_permiso_denegado(request: Request, exc: PermisoDenegado):
    return JSONResponse(status_code=403, content={"detail": exc.mensaje})


@app.exception_handler(ErrorEnvioCredenciales)
def handle_error_envio_credenciales(request: Request, exc: ErrorEnvioCredenciales):
    logger.error(
        "Error al enviar credenciales en %s: %s", request.url.path, exc.mensaje
    )

    return JSONResponse(status_code=500, content={"detail": exc.mensaje})


@app.exception_handler(ConflictoNegocio)
def handle_conflicto(request: Request, exc: ConflictoNegocio):
    logger.warning("Conflicto de negocio en %s: %s", request.url.path, exc.mensaje)

    return JSONResponse(status_code=409, content={"detail": exc.mensaje})


@app.exception_handler(OperacionInvalida)
def handle_operacion_invalida(request: Request, exc: OperacionInvalida):
    return JSONResponse(status_code=400, content={"detail": exc.mensaje})


@app.exception_handler(RateLimitExceeded)
def handle_rate_limit_excedido(request: Request, exc: RateLimitExceeded):
    logger.warning(
        "Límite de solicitudes excedido en %s desde %s",
        request.url.path,
        request.headers.get("CF-Connecting-IP", request.client.host),
    )

    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiados intentos. Intenta de nuevo más tarde."},
    )


@app.exception_handler(BitacoraError)
def handle_bitacora_error(request: Request, exc: BitacoraError):
    logger.warning(
        "Error de dominio sin handler específico en %s: %s",
        request.url.path,
        exc.mensaje,
    )

    return JSONResponse(status_code=400, content={"detail": exc.mensaje})


@app.exception_handler(Exception)
def handle_no_esperado(request: Request, exc: Exception):
    logger.exception("Error no manejado en %s %s", request.method, request.url.path)

    return JSONResponse(
        status_code=500, content={"detail": "Error interno del servidor"}
    )
