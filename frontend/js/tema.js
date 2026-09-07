function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
}

function alternarTema() {
    const actual = document.documentElement.getAttribute("data-theme") || "dark";
    aplicarTema(actual === "dark" ? "light" : "dark");
}

document.addEventListener("DOMContentLoaded", function () {
    const boton = document.getElementById("boton-tema");
    if (boton) {
        boton.addEventListener("click", alternarTema);
    }
});