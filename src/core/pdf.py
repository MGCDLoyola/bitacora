import base64
from pathlib import Path

from playwright.sync_api import sync_playwright


def imagen_base64(ruta: Path, mime: str = "image/png") -> str:
    contenido = ruta.read_bytes()
    codificado = base64.b64encode(contenido).decode("ascii")
    return f"data:{mime};base64,{codificado}"


def renderizar_pdf(html: str) -> bytes:
    with sync_playwright() as playwright:
        navegador = playwright.chromium.launch()

        try:
            pagina = navegador.new_page()

            pagina.set_content(html, wait_until="load")

            return pagina.pdf(
                format="Letter",
                print_background=True,
                margin={
                    "top": "1.5cm",
                    "bottom": "1.5cm",
                    "left": "1.5cm",
                    "right": "1.5cm",
                }
            )
        finally:
            navegador.close()