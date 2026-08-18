import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.core.exceptions import (BitacoraError, 
                                 NoEncontrado, 
                                 ConflictoNegocio, 
                                 OperacionInvalida, 
                                 NoAutorizado, 
                                 CambioPasswordRequerido,
                                 PermisoDenegado)
from src.core.logging import configurar_logging
from src.routers.auth import router as auth_router
from src.routers.roles import router as roles_router

configurar_logging()

logger = logging.getLogger("bitacora")

app = FastAPI()

app.include_router(auth_router)
app.include_router(roles_router)


@app.exception_handler(NoEncontrado)
def handle_no_encontrado(request: Request, exc: NoEncontrado):
    return JSONResponse(status_code=404, content={"detail": exc.mensaje})


@app.exception_handler(NoAutorizado)
def handle_no_autorizado(request: Request, exc: NoAutorizado):
    return JSONResponse(status_code=401, content={"detail": exc.mensaje})


@app.exception_handler(CambioPasswordRequerido)
def handle_cambio_password_requerido(request: Request, exc: CambioPasswordRequerido):
    return JSONResponse(status_code=403, content={"detail": exc.mensaje})

@app.exception_handler(PermisoDenegado)
def handle_permiso_denegado(request: Request, exc: PermisoDenegado):
    return JSONResponse(status_code=403, content={"detail": exc.mensaje})

@app.exception_handler(ConflictoNegocio)
def handle_conflicto(request: Request, exc: ConflictoNegocio):
    logger.warning("Conflicto de negocio en %s: %s", request.url.path, exc.mensaje)
    return JSONResponse(status_code=409, content={"detail": exc.mensaje})


@app.exception_handler(OperacionInvalida)
def handle_operacion_invalida(request: Request, exc: OperacionInvalida):
    return JSONResponse(status_code=400, content={"detail": exc.mensaje})


@app.exception_handler(BitacoraError)
def handle_bitacora_error(request: Request, exc: BitacoraError):
    logger.warning("Error de dominio sin handler específico en %s: %s", request.url.path, exc.mensaje)
    return JSONResponse(status_code=400, content={"detail": exc.mensaje})


@app.exception_handler(Exception)
def handle_no_esperado(request: Request, exc: Exception):
    logger.exception("Error no manejado en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})