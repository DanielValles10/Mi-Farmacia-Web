// Referencias a los elementos del HTML
const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');
const medDisplay = document.getElementById('medDisplay');

let baseDeDatos = [];
let currentFocus = -1;

// 1. Cargar y procesar el archivo .txt
async function cargarDatos() {
    try {
        const respuesta = await fetch('InfoFarmacos.txt');
        const texto = await respuesta.text();
        procesarTexto(texto);
    } catch (error) {
        console.error("Error al cargar el archivo:", error);
        medDisplay.innerHTML = `<p style="color: red;">Error al cargar InfoFarmacos.txt. Asegúrate de usar Live Server.</p>`;
    }
}

// 2. Traducir símbolos y saltos de línea
function procesarTexto(texto) {
    const lineas = texto.split('\n');
    let medicamentoActual = null;
    let detalleActual = null;

    for (let linea of lineas) {
        let lineaLimpia = linea.trim();
        if (lineaLimpia === '') continue;

        if (lineaLimpia.startsWith('->')) {
            if (medicamentoActual) baseDeDatos.push(medicamentoActual);
            medicamentoActual = {
                nombre: lineaLimpia.substring(2).trim(),
                detalles: []
            };
            detalleActual = null;
        } 
        else if (lineaLimpia.startsWith('$') && medicamentoActual) {
            const indiceDosPuntos = lineaLimpia.indexOf(':');
            if (indiceDosPuntos !== -1) {
                detalleActual = {
                    subtema: lineaLimpia.substring(1, indiceDosPuntos).trim(),
                    texto: lineaLimpia.substring(indiceDosPuntos + 1).trim()
                };
                medicamentoActual.detalles.push(detalleActual);
            }
        }
        else if (medicamentoActual && detalleActual) {
            if (detalleActual.texto !== '') {
                detalleActual.texto += '<br>' + lineaLimpia;
            } else {
                detalleActual.texto += lineaLimpia;
            }
        }
    }
    if (medicamentoActual) baseDeDatos.push(medicamentoActual);
}

// 3. Lógica del buscador
searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    suggestions.innerHTML = ''; 
    currentFocus = -1; 

    if (query) {
        const resultados = baseDeDatos.filter(med => med.nombre.toLowerCase().startsWith(query));
        const nombresUnicos = [...new Set(resultados.map(m => m.nombre.toLowerCase()))];
        
        if (nombresUnicos.length > 0) {
            suggestions.style.display = 'block';
            nombresUnicos.forEach(nombre => {
                const div = document.createElement('div');
                div.classList.add('suggestion-item');
                div.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
                div.onclick = () => realizarBusqueda(nombre, 'exacto');
                suggestions.appendChild(div);
            });
        } else {
            suggestions.style.display = 'none';
        }
    } else {
        suggestions.style.display = 'none';
    }
});

// 4. Lógica de navegación con teclado
searchInput.addEventListener('keydown', function(e) {
    let items = suggestions.getElementsByTagName('div');
    
    if (e.keyCode === 40) { 
        if (suggestions.style.display !== 'none' && items.length > 0) {
            currentFocus++;
            marcarActivo(items);
        }
    } else if (e.keyCode === 38) { 
        if (suggestions.style.display !== 'none' && items.length > 0) {
            currentFocus--;
            marcarActivo(items);
        }
    } else if (e.keyCode === 13) { 
        e.preventDefault();
        if (currentFocus > -1 && suggestions.style.display !== 'none') {
            items[currentFocus].click();
        } else {
            realizarBusqueda(searchInput.value, 'parcial');
        }
    }
});

function marcarActivo(items) {
    if (!items) return false;
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('suggestion-active');
    }
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (items.length - 1);
    items[currentFocus].classList.add('suggestion-active');
    items[currentFocus].scrollIntoView({ block: "nearest" });
}

// 5. Función central de búsqueda
function realizarBusqueda(termino, modo) {
    suggestions.style.display = 'none'; 
    const busqueda = termino.toLowerCase().trim();
    
    if (busqueda === '') return;
    searchInput.value = busqueda.charAt(0).toUpperCase() + busqueda.slice(1);
    
    let resultadosFiltrados = [];
    if (modo === 'exacto') {
        resultadosFiltrados = baseDeDatos.filter(med => med.nombre.toLowerCase() === busqueda);
    } else if (modo === 'parcial') {
        resultadosFiltrados = baseDeDatos.filter(med => med.nombre.toLowerCase().startsWith(busqueda));
    }
    mostrarTarjetas(resultadosFiltrados);
}

// 6. Renderizar las tarjetas
function mostrarTarjetas(arregloMeds) {
    medDisplay.innerHTML = ''; 

    if (arregloMeds.length === 0) {
        medDisplay.innerHTML = `
            <div class="med-card" style="text-align: center; border: 2px solid #ef4444;">
                <h2 style="color: #ef4444; margin-bottom: 10px;">Medicamento no encontrado</h2>
                <p>No hay resultados en tus apuntes para esta búsqueda.</p>
            </div>
        `;
        return;
    }

    let htmlFinal = '';
    
    arregloMeds.forEach((med, index) => {
        let detallesHTML = '';
        med.detalles.forEach(detalle => {
            detallesHTML += `<p><strong>${detalle.subtema}:</strong> <br> ${detalle.texto}</p>`;
        });

        // IMPORTANTE: Aquí añadimos el id="card-${index}" a la tarjeta
        htmlFinal += `
            <div class="med-card" id="card-${index}" onclick="toggleDetalles(${index})">
                <div class="med-header">
                    <h2>${med.nombre}</h2>
                    <span class="toggle-icon" id="toggleIcon-${index}">▼ Mostrar detalles</span>
                </div>
                <div class="med-details" id="medDetails-${index}">
                    ${detallesHTML}
                </div>
            </div>
        `;
    });

    medDisplay.innerHTML = htmlFinal;
}

// 7. Expandir/contraer con animación de ocultamiento para las demás tarjetas
function toggleDetalles(index) {
    const details = document.getElementById('medDetails-' + index);
    const icon = document.getElementById('toggleIcon-' + index);
    
    // Obtenemos TODAS las tarjetas que están en pantalla
    const todasLasTarjetas = document.querySelectorAll('.med-card');
    
    // Verificamos si estamos abriendo o cerrando la tarjeta actual
    const estaAbriendo = !details.classList.contains('show');
    
    // Alternamos el estado visual de la tarjeta clickeada
    details.classList.toggle('show');
    
    if (estaAbriendo) {
        // SI ESTAMOS ABRIENDO: Cambiamos el icono...
        icon.textContent = '▲ Ocultar detalles';
        
        // ...y ocultamos las DEMÁS tarjetas
        todasLasTarjetas.forEach(tarjeta => {
            if (tarjeta.id !== 'card-' + index) {
                tarjeta.classList.add('oculto');
            }
        });
    } else {
        // SI ESTAMOS CERRANDO: Cambiamos el icono a su estado original...
        icon.textContent = '▼ Mostrar detalles';
        
        // ...y mostramos TODAS las tarjetas de nuevo
        todasLasTarjetas.forEach(tarjeta => {
            tarjeta.classList.remove('oculto');
        });
    }
}

// 8. Ocultar sugerencias al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.style.display = 'none';
    }
});

// Arrancamos
cargarDatos();
