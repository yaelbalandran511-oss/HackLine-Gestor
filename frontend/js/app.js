// js/app.js - Versión API (conexión a backend PostgreSQL)

// ============================================
// CONFIGURACIÓN DE LA API
// ============================================
const API_URL = 'http://localhost:3000/api';

// Variables para edición
let participanteEditId = null;
let equipoEditId = null;
let proyectoEditId = null;
let mentorEditId = null;
let asignacionEditId = null;
let actividadEditId = null;
let evaluacionEditId = null;

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarMensaje(mensaje, esError = false) {
    const div = document.createElement('div');
    div.className = `mensaje-flotante alert ${esError ? 'alert-danger' : 'alert-success'}`;
    div.innerHTML = `<i class="fas ${esError ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-2"></i>${mensaje}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function fechaParaInput(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 10);
}

function limpiarFormularioEquipo() {
    const nombreInput = document.getElementById('equipoNombre');
    if (nombreInput) nombreInput.value = '';
    const eventoSelect = document.getElementById('equipoEventoId');
    if (eventoSelect) eventoSelect.value = '';
    const miembrosInput = document.getElementById('equipoMiembros');
    if (miembrosInput) miembrosInput.value = '';
}

function setupEquipoFormListeners() {
    const btnGuardar = document.getElementById('equipoGuardarBtn');
    if (btnGuardar) {
        btnGuardar.type = 'button';
        btnGuardar.addEventListener('click', guardarEquipo);
    }
    const btnCancelar = document.getElementById('equipoCancelarBtn');
    if (btnCancelar) {
        btnCancelar.type = 'button';
        btnCancelar.addEventListener('click', cancelarEdicionEquipo);
    }
}

function setupEventoFormListeners() {
    const btnGuardar = document.getElementById('eventoGuardarBtn');
    if (btnGuardar) {
        btnGuardar.type = 'button';
        btnGuardar.addEventListener('click', guardarEvento);
    }
}

// ============================================
// ================ DASHBOARD =================
// ============================================

// ============================================
// ================ DASHBOARD =================
// ============================================

async function renderizarDashboard() {
    const eventos = await obtenerEventos();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Filtrar eventos pasados (solo para uso interno, no se muestra)
    const eventosPasados = eventos.filter(evento => {
        const fechaFin = new Date(evento.fecha_fin);
        return fechaFin < hoy;
    });
    
    // Eventos recientes (últimos 5 eventos en general)
    const tbodyEventos = document.getElementById('eventosResumenBody');
    if (tbodyEventos) {
        tbodyEventos.innerHTML = '';
        const eventosRecientes = eventos.slice(0, 5);
        if (eventosRecientes.length === 0) {
            const row = tbodyEventos.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay eventos registrados";
            row.classList.add('text-center', 'text-muted');
        } else {
            eventosRecientes.forEach(e => {
                const row = tbodyEventos.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${e.id_evento}</span>`;
                row.insertCell(1).textContent = e.nombre;
                row.insertCell(2).textContent = formatearFecha(e.fecha_inicio);
                row.insertCell(3).textContent = e.lugar;
                row.insertCell(4).textContent = e.cupo_maximo;
            });
        }
    }
    
    // Actualizar stats (solo los 4 originales)
    await actualizarStats();
    
    // Ranking resumen (top 5)
    const ranking = await obtenerRanking();
    const tbodyRanking = document.getElementById('rankingResumenBody');
    if (tbodyRanking) {
        tbodyRanking.innerHTML = '';
        const topRanking = ranking.slice(0, 5);
        if (topRanking.length === 0) {
            const row = tbodyRanking.insertRow();
            row.insertCell(0).colSpan = 4;
            row.insertCell(0).textContent = "No hay evaluaciones registradas";
            row.classList.add('text-center', 'text-muted');
        } else {
            topRanking.forEach((r, index) => {
                const row = tbodyRanking.insertRow();
                row.insertCell(0).textContent = index + 1;
                row.insertCell(1).textContent = r.proyecto_nombre;
                row.insertCell(2).textContent = r.equipo_nombre;
                row.insertCell(3).textContent = `${parseFloat(r.promedio).toFixed(2)} pts`;
                if (index === 0) row.classList.add('table-success');
                else if (index === 1) row.classList.add('table-info');
                else if (index === 2) row.classList.add('table-warning');
            });
        }
    }
}

// ============================================
// ================= EVENTOS ==================
// ============================================

async function obtenerEventos() {
    try {
        const response = await fetch(`${API_URL}/eventos`);
        if (!response.ok) throw new Error('Error al cargar eventos');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerEventos:', error);
        return [];
    }
}

async function obtenerEventoPorId(id) {
    try {
        const response = await fetch(`${API_URL}/eventos/${id}`);
        if (!response.ok) throw new Error('Error al cargar evento');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerEventoPorId:', error);
        return null;
    }
}

function limpiarFormularioEvento() {
    const campos = ['eventoNombre', 'eventoFechaInicio', 'eventoFechaFin', 'eventoLugar', 'eventoDescripcion'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const cupoInput = document.getElementById('eventoCupo');
    if (cupoInput) cupoInput.value = '50';
}

async function agregarEvento() {
    const nombre = document.getElementById('eventoNombre')?.value;
    const fecha_inicio = document.getElementById('eventoFechaInicio')?.value;
    const fecha_fin = document.getElementById('eventoFechaFin')?.value;
    const lugar = document.getElementById('eventoLugar')?.value;
    const cupo_maximo = document.getElementById('eventoCupo')?.value;
    const descripcion = document.getElementById('eventoDescripcion')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!fecha_inicio) return mostrarMensaje("Fecha de inicio obligatoria", true);
    if (!fecha_fin) return mostrarMensaje("Fecha de fin obligatoria", true);
    if (!lugar?.trim()) return mostrarMensaje("Lugar obligatorio", true);

    const cupo = cupo_maximo?.trim() ? parseInt(cupo_maximo, 10) : 50;
    if (cupo_maximo?.trim() && (isNaN(cupo) || cupo <= 0)) {
        return mostrarMensaje("Cupo debe ser mayor que cero", true);
    }

    try {
        const response = await fetch(`${API_URL}/eventos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre, 
                fecha_inicio, 
                fecha_fin, 
                lugar, 
                descripcion, 
                cupo_maximo: cupo 
            })
        });

        if (!response.ok) throw new Error('Error al crear evento');
        
        mostrarMensaje('Evento agregado correctamente');
        limpiarFormularioEvento();
        
        await renderizarEventos();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje('Error al agregar evento', true);
    }
}

async function guardarEvento() {
    await agregarEvento();
}

async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento? Se eliminarán también las actividades asociadas.')) return;
    try {
        await fetch(`${API_URL}/eventos/${id}`, { method: 'DELETE' });
        mostrarMensaje('Evento eliminado');
        await renderizarEventos();
        await actualizarStats();
        if (typeof renderizarHistorial === 'function') await renderizarHistorial();
        if (typeof renderizarCronograma === 'function') await renderizarCronograma();
    } catch (error) {
        mostrarMensaje('Error al eliminar evento', true);
    }
}

async function renderizarEventos() {
    const eventos = await obtenerEventos();
    const tbody = document.getElementById('eventosBody');
    if (tbody) {
        tbody.innerHTML = '';
        eventos.forEach(e => {
            const row = tbody.insertRow();
            row.insertCell(0).innerHTML = `<span class="badge-id">#${e.id_evento}</span>`;
            row.insertCell(1).textContent = e.nombre;
            row.insertCell(2).textContent = formatearFecha(e.fecha_inicio);
            row.insertCell(3).textContent = e.lugar;
            row.insertCell(4).textContent = e.cupo_maximo;
            row.insertCell(5).innerHTML = `
                <button class="btn btn-sm btn-danger" onclick="eliminarEvento(${e.id_evento})"><i class="fas fa-trash-alt"></i></button>
            `;
        });
    }
}

// ============================================
// ================ PARTICIPANTES =============
// ============================================

async function obtenerParticipantes() {
    try {
        const response = await fetch(`${API_URL}/participantes`);
        if (!response.ok) throw new Error('Error al cargar participantes');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerParticipantes:', error);
        return [];
    }
}

async function agregarParticipante() {
    const nombre = document.getElementById('partNombre')?.value;
    const email = document.getElementById('partEmail')?.value;
    const habilidades = document.getElementById('partHabilidades')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!email?.trim()) return mostrarMensaje("Email obligatorio", true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return mostrarMensaje("Email inválido", true);

    try {
        const response = await fetch(`${API_URL}/participantes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password_hash: 'temp123', habilidades: habilidades || '' })
        });

        if (!response.ok) throw new Error('Error al crear participante');

        mostrarMensaje('Participante agregado correctamente');
        document.getElementById('partNombre').value = '';
        document.getElementById('partEmail').value = '';
        document.getElementById('partHabilidades').value = '';

        await renderizarParticipantes();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

async function obtenerParticipantePorId(id) {
    try {
        const response = await fetch(`${API_URL}/participantes/${id}`);
        if (!response.ok) throw new Error('Participante no encontrado');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerParticipantePorId:', error);
        return null;
    }
}

async function actualizarParticipante(id) {
    const nombre = document.getElementById('partNombre')?.value;
    const email = document.getElementById('partEmail')?.value;
    const habilidades = document.getElementById('partHabilidades')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!email?.trim()) return mostrarMensaje("Email obligatorio", true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return mostrarMensaje("Email inválido", true);

    try {
        const response = await fetch(`${API_URL}/participantes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, habilidades: habilidades || '' })
        });

        if (!response.ok) throw new Error('Error al actualizar participante');

        mostrarMensaje('Participante actualizado correctamente');
        participanteEditId = null;
        document.getElementById('partNombre').value = '';
        document.getElementById('partEmail').value = '';
        document.getElementById('partHabilidades').value = '';
        const btnGuardar = document.getElementById('partGuardarBtn');
        if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-user-plus me-2"></i>Agregar Participante';
        const btnCancelar = document.getElementById('partCancelarBtn');
        if (btnCancelar) btnCancelar.style.display = 'none';

        await renderizarParticipantes();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

async function editarParticipante(id) {
    const participante = await obtenerParticipantePorId(id);
    if (!participante) return;

    participanteEditId = id;
    document.getElementById('partNombre').value = participante.nombre || '';
    document.getElementById('partEmail').value = participante.email || '';
    document.getElementById('partHabilidades').value = participante.habilidades || '';

    const btnGuardar = document.getElementById('partGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Participante';
    const btnCancelar = document.getElementById('partCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';

    document.querySelector('.card-custom')?.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicionParticipante() {
    participanteEditId = null;
    document.getElementById('partNombre').value = '';
    document.getElementById('partEmail').value = '';
    document.getElementById('partHabilidades').value = '';
    const btnGuardar = document.getElementById('partGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-user-plus me-2"></i>Agregar Participante';
    const btnCancelar = document.getElementById('partCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'none';
}

async function guardarParticipante() {
    if (participanteEditId !== null) {
        await actualizarParticipante(participanteEditId);
    } else {
        await agregarParticipante();
    }
}

async function eliminarParticipante(id) {
    if (!confirm('¿Eliminar este participante?')) return;
    try {
        await fetch(`${API_URL}/participantes/${id}`, { method: 'DELETE' });
        mostrarMensaje('Participante eliminado');
        await renderizarParticipantes();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje('Error al eliminar participante', true);
    }
}

async function renderizarParticipantes() {
    const participantes = await obtenerParticipantes();
    const tbody = document.getElementById('participantesBody');
    if (tbody) {
        tbody.innerHTML = '';
        participantes.forEach(p => {
            const row = tbody.insertRow();
            row.insertCell(0).innerHTML = `<span class="badge-id">#${p.id_part}</span>`;
            row.insertCell(1).textContent = p.nombre;
            row.insertCell(2).textContent = p.email;
            row.insertCell(3).textContent = p.habilidades || '-';
            row.insertCell(4).innerHTML = `
                <button class="btn btn-sm btn-warning me-1" onclick="editarParticipante(${p.id_part})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="eliminarParticipante(${p.id_part})"><i class="fas fa-trash-alt"></i></button>
            `;
        });
    }
}

// ============================================
// ================= EQUIPOS ==================
// ============================================

async function obtenerEquipos() {
    try {
        const response = await fetch(`${API_URL}/equipos`);
        if (!response.ok) throw new Error('Error al cargar equipos');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerEquipos:', error);
        return [];
    }
}

async function obtenerEquipoPorId(id) {
    try {
        const response = await fetch(`${API_URL}/equipos/${id}`);
        if (!response.ok) throw new Error('Error al cargar equipo');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerEquipoPorId:', error);
        return null;
    }
}

async function cargarSelectEventos() {
    const eventos = await obtenerEventos();
    const select = document.getElementById('equipoEventoId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un evento</option>';
        eventos.forEach(e => {
            select.innerHTML += `<option value="${e.id_evento}">${e.nombre}</option>`;
        });
    }
}

async function agregarEquipo() {
    const nombre = document.getElementById('equipoNombre')?.value;
    const id_evento = document.getElementById('equipoEventoId')?.value;
    const miembrosTexto = document.getElementById('equipoMiembros')?.value;
    const miembros = miembrosTexto?.trim()
        ? miembrosTexto.split(',').map(m => parseInt(m.trim(), 10))
        : [];

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!id_evento) return mostrarMensaje("Seleccione un evento", true);
    if (miembros.length < 1) return mostrarMensaje("Mínimo 1 miembro", true);
    if (miembros.length > 5) return mostrarMensaje("Máximo 5 miembros", true);
    if (miembros.some(id => isNaN(id) || id <= 0)) return mostrarMensaje("IDs de participantes deben ser números positivos", true);

    try {
        const response = await fetch(`${API_URL}/equipos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, id_evento: parseInt(id_evento, 10), miembros, activo: true })
        });

        if (!response.ok) throw new Error('Error al crear equipo');

        mostrarMensaje('Equipo agregado correctamente');
        document.getElementById('equipoNombre').value = '';
        document.getElementById('equipoMiembros').value = '';

        await renderizarEquipos();
        await actualizarStats();
        if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

async function actualizarEquipo(id) {
    const nombre = document.getElementById('equipoNombre')?.value;
    const id_evento = document.getElementById('equipoEventoId')?.value;
    const miembrosTexto = document.getElementById('equipoMiembros')?.value;
    const miembros = miembrosTexto?.trim()
        ? miembrosTexto.split(',').map(m => parseInt(m.trim(), 10))
        : [];

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!id_evento) return mostrarMensaje("Seleccione un evento", true);
    if (miembros.length < 1) return mostrarMensaje("Mínimo 1 miembro", true);
    if (miembros.length > 5) return mostrarMensaje("Máximo 5 miembros", true);
    if (miembros.some(id => isNaN(id) || id <= 0)) return mostrarMensaje("IDs de participantes deben ser números positivos", true);

    try {
        const response = await fetch(`${API_URL}/equipos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, id_evento: parseInt(id_evento, 10), miembros, activo: true })
        });

        if (!response.ok) throw new Error('Error al actualizar equipo');

        mostrarMensaje('Equipo actualizado correctamente');
        equipoEditId = null;
        limpiarFormularioEquipo();
        const btnGuardar = document.getElementById('equipoGuardarBtn');
        if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Agregar Equipo';
        const btnCancelar = document.getElementById('equipoCancelarBtn');
        if (btnCancelar) btnCancelar.style.display = 'none';

        await renderizarEquipos();
        await actualizarStats();
        if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

async function editarEquipo(id) {
    const equipo = await obtenerEquipoPorId(id);
    if (!equipo) return;

    equipoEditId = id;
    document.getElementById('equipoNombre').value = equipo.nombre || '';
    document.getElementById('equipoEventoId').value = equipo.id_evento || '';
    document.getElementById('equipoMiembros').value = (equipo.miembros || []).map(miembro => {
        if (typeof miembro === 'object') return miembro.id ?? miembro.id_participante ?? '';
        return miembro;
    }).filter(Boolean).join(', ');

    const btnGuardar = document.getElementById('equipoGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Equipo';
    const btnCancelar = document.getElementById('equipoCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';

    document.querySelector('.card-custom')?.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicionEquipo() {
    equipoEditId = null;
    limpiarFormularioEquipo();
    const btnGuardar = document.getElementById('equipoGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Agregar Equipo';
    const btnCancelar = document.getElementById('equipoCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'none';
}

async function guardarEquipo() {
    if (equipoEditId !== null) {
        await actualizarEquipo(equipoEditId);
    } else {
        await agregarEquipo();
    }
}

async function eliminarEquipo(id) {
    if (!confirm('¿Eliminar este equipo? También se eliminará su proyecto asociado.')) return;
    try {
        await fetch(`${API_URL}/equipos/${id}`, { method: 'DELETE' });
        mostrarMensaje('Equipo eliminado');
        await renderizarEquipos();
        await actualizarStats();
        if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
        if (typeof renderizarProyectos === 'function') await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al eliminar equipo', true);
    }
}

async function renderizarEquipos() {
    const equipos = await obtenerEquipos();
    const tbody = document.getElementById('equiposBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (equipos.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay equipos registrados";
            row.classList.add('text-center', 'text-muted');
        } else {
            equipos.forEach(eq => {
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${eq.id_equipo}</span>`;
                row.insertCell(1).textContent = eq.nombre;
                row.insertCell(2).innerHTML = `<span class="badge-id">Evento ${eq.id_evento}</span>`;
                
                const miembros = eq.miembros || [];
                let miembrosTexto = '';
                if (miembros.length > 0) {
                    if (typeof miembros[0] === 'object') {
                        miembrosTexto = miembros.map(m => `#${m.id}`).join(', ');
                    } else {
                        miembrosTexto = miembros.join(', ');
                    }
                }
                row.insertCell(3).textContent = miembrosTexto || '-';
                
                row.insertCell(4).innerHTML = `
                    <button class="btn btn-sm btn-warning me-1" onclick="editarEquipo(${eq.id_equipo})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarEquipo(${eq.id_equipo})"><i class="fas fa-trash-alt"></i></button>
                `;
            });
        }
    }
}

// ============================================
// ================= PROYECTOS ================
// ============================================

async function obtenerProyectos() {
    try {
        const response = await fetch(`${API_URL}/proyectos`);
        if (!response.ok) throw new Error('Error al cargar proyectos');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerProyectos:', error);
        return [];
    }
}

async function cargarSelectEquipos() {
    const equipos = await obtenerEquipos();
    const select = document.getElementById('proyectoEquipoId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un equipo</option>';
        equipos.forEach(e => {
            select.innerHTML += `<option value="${e.id_equipo}">${e.nombre}</option>`;
        });
    }
}

async function agregarProyecto() {
    const nombre = document.getElementById('proyectoNombre')?.value;
    const descripcion = document.getElementById('proyectoDescripcion')?.value;
    const tecnologias = document.getElementById('proyectoTecnologias')?.value;
    const repo_url = document.getElementById('proyectoRepo')?.value;
    const id_equipo = document.getElementById('proyectoEquipoId')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre del proyecto obligatorio", true);
    if (!descripcion?.trim()) return mostrarMensaje("Descripción obligatoria", true);
    if (!tecnologias?.trim()) return mostrarMensaje("Tecnologías obligatorias", true);
    if (!repo_url?.trim()) return mostrarMensaje("Repositorio obligatorio", true);
    if (!id_equipo) return mostrarMensaje("Seleccione un equipo", true);

    try {
        const response = await fetch(`${API_URL}/proyectos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion, tecnologias, repo_url, id_equipo: parseInt(id_equipo), estado: 'registrado' })
        });

        if (!response.ok) throw new Error('Error al crear proyecto');

        mostrarMensaje('Proyecto registrado correctamente');
        document.getElementById('proyectoNombre').value = '';
        document.getElementById('proyectoDescripcion').value = '';
        document.getElementById('proyectoTecnologias').value = '';
        document.getElementById('proyectoRepo').value = '';

        await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al agregar proyecto', true);
    }
}

async function renderizarProyectos() {
    const proyectos = await obtenerProyectos();
    const tbody = document.getElementById('proyectosBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (proyectos.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay proyectos registrados";
        } else {
            proyectos.forEach(p => {
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${p.id_proy}</span>`;
                row.insertCell(1).textContent = p.nombre;
                row.insertCell(2).textContent = p.tecnologias || '-';
                row.insertCell(3).textContent = p.equipo_nombre || '-';
                row.insertCell(4).innerHTML = `
                    <button class="btn btn-sm btn-danger" onclick="eliminarProyecto(${p.id_proy})"><i class="fas fa-trash-alt"></i></button>
                `;
            });
        }
    }
}

async function eliminarProyecto(id) {
    if (!confirm('¿Eliminar este proyecto? También se eliminarán sus avances.')) return;
    try {
        await fetch(`${API_URL}/proyectos/${id}`, { method: 'DELETE' });
        mostrarMensaje('Proyecto eliminado');
        await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al eliminar proyecto', true);
    }
}

// ============================================
// ================ EVALUACIONES ==============
// ============================================

async function obtenerEvaluaciones() {
    try {
        const response = await fetch(`${API_URL}/evaluaciones`);
        if (!response.ok) throw new Error('Error al cargar evaluaciones');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerEvaluaciones:', error);
        return [];
    }
}

async function obtenerEvaluacionPorId(id) {
    try {
        const response = await fetch(`${API_URL}/evaluaciones/${id}`);
        if (!response.ok) throw new Error('Error al cargar evaluación');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerEvaluacionPorId:', error);
        return null;
    }
}

async function actualizarSelectProyectosEvaluacion() {
    const proyectos = await obtenerProyectos();
    const select = document.getElementById('evaluacionProyectoId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un proyecto</option>';
        proyectos.forEach(p => {
            select.innerHTML += `<option value="${p.id_proy}">${p.nombre} ${p.equipo_nombre ? `- ${p.equipo_nombre}` : ''}</option>`;
        });
    }
}

async function guardarEvaluacion() {
    const proyectoId = parseInt(document.getElementById('evaluacionProyectoId')?.value, 10);
    const juez = document.getElementById('evaluacionJuez')?.value;
    const innovacionInput = document.getElementById('evaluacionInnovacion')?.value;
    const complejidadInput = document.getElementById('evaluacionComplejidad')?.value;
    const presentacionInput = document.getElementById('evaluacionPresentacion')?.value;
    const impactoInput = document.getElementById('evaluacionImpacto')?.value;
    const comentarios = document.getElementById('evaluacionComentarios')?.value;

    if (!proyectoId) return mostrarMensaje('Seleccione un proyecto', true);
    if (!juez?.trim()) return mostrarMensaje('Nombre del juez es obligatorio', true);
    
    if (innovacionInput === '' || innovacionInput === null) return mostrarMensaje('Innovación es obligatorio', true);
    if (complejidadInput === '' || complejidadInput === null) return mostrarMensaje('Complejidad es obligatorio', true);
    if (presentacionInput === '' || presentacionInput === null) return mostrarMensaje('Presentación es obligatorio', true);
    if (impactoInput === '' || impactoInput === null) return mostrarMensaje('Impacto es obligatorio', true);

    const innovacion = Number(innovacionInput);
    const complejidad = Number(complejidadInput);
    const presentacion = Number(presentacionInput);
    const impacto = Number(impactoInput);

    if (isNaN(innovacion) || innovacion < 0 || innovacion > 100) return mostrarMensaje('Innovación debe estar entre 0 y 100', true);
    if (isNaN(complejidad) || complejidad < 0 || complejidad > 100) return mostrarMensaje('Complejidad debe estar entre 0 y 100', true);
    if (isNaN(presentacion) || presentacion < 0 || presentacion > 100) return mostrarMensaje('Presentación debe estar entre 0 y 100', true);
    if (isNaN(impacto) || impacto < 0 || impacto > 100) return mostrarMensaje('Impacto debe estar entre 0 y 100', true);
    if (!comentarios?.trim()) return mostrarMensaje('Comentarios son obligatorios', true);

    try {
        let url = `${API_URL}/evaluaciones`;
        let method = 'POST';
        
        if (evaluacionEditId !== null) {
            url = `${API_URL}/evaluaciones/${evaluacionEditId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_proy: proyectoId,
                juez: juez.trim(),
                innovacion,
                complejidad,
                presentacion,
                impacto,
                comentarios: comentarios?.trim() || ''
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar evaluación');
        }

        mostrarMensaje(evaluacionEditId ? 'Evaluación actualizada correctamente' : 'Evaluación registrada correctamente');
        
        cancelarEdicionEvaluacion();
        
        await renderizarEvaluaciones();
        await renderizarResultados();
    } catch (error) {
        const message = error.message === 'Failed to fetch'
            ? 'No se puede conectar con el servidor. Asegúrate de iniciar backend en http://localhost:3000'
            : error.message || 'Error al guardar evaluación';
        mostrarMensaje(message, true);
    }
}

async function editarEvaluacion(id) {
    const evaluacion = await obtenerEvaluacionPorId(id);
    if (!evaluacion) {
        mostrarMensaje('No se pudo cargar la evaluación', true);
        return;
    }
    
    evaluacionEditId = id;
    
    document.getElementById('evaluacionProyectoId').value = evaluacion.id_proy;
    document.getElementById('evaluacionJuez').value = evaluacion.juez_nombre || '';
    document.getElementById('evaluacionInnovacion').value = evaluacion.innovacion;
    document.getElementById('evaluacionComplejidad').value = evaluacion.complejidad;
    document.getElementById('evaluacionPresentacion').value = evaluacion.presentacion;
    document.getElementById('evaluacionImpacto').value = evaluacion.impacto;
    document.getElementById('evaluacionComentarios').value = evaluacion.comentarios || '';
    
    const btnGuardar = document.getElementById('btnGuardarEvaluacion');
    if (btnGuardar) {
        btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Evaluación';
    }
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    if (btnCancelar) {
        btnCancelar.style.display = 'inline-flex';
    }
    
    document.querySelector('.card-custom')?.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicionEvaluacion() {
    evaluacionEditId = null;
    
    document.getElementById('evaluacionProyectoId').value = '';
    document.getElementById('evaluacionJuez').value = '';
    document.getElementById('evaluacionInnovacion').value = '';
    document.getElementById('evaluacionComplejidad').value = '';
    document.getElementById('evaluacionPresentacion').value = '';
    document.getElementById('evaluacionImpacto').value = '';
    document.getElementById('evaluacionComentarios').value = '';
    
    const btnGuardar = document.getElementById('btnGuardarEvaluacion');
    if (btnGuardar) {
        btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Evaluación';
    }
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    if (btnCancelar) {
        btnCancelar.style.display = 'none';
    }
}

async function eliminarEvaluacion(id) {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    try {
        const response = await fetch(`${API_URL}/evaluaciones/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar');
        mostrarMensaje('Evaluación eliminada');
        await renderizarEvaluaciones();
        await renderizarResultados();
    } catch (error) {
        mostrarMensaje('Error al eliminar evaluación', true);
    }
}

async function renderizarEvaluaciones() {
    const evaluaciones = await obtenerEvaluaciones();
    const container = document.getElementById('evaluacionesBody');
    if (!container) return;
    container.innerHTML = '';
    if (evaluaciones.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay evaluaciones registradas todavía.</p>';
        return;
    }
    evaluaciones.forEach(ev => {
        const row = document.createElement('div');
        row.className = 'mb-3 p-3 border rounded bg-light';
        row.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div><strong>${ev.proyecto_nombre}</strong> <span class="text-secondary">(${ev.equipo_nombre || 'Equipo no asignado'})</span></div>
                <div class="text-end">
                    <em>${ev.juez_nombre || 'Juez desconocido'}</em>
                    <div class="mt-1">
                        <button class="btn btn-sm btn-warning me-1" onclick="editarEvaluacion(${ev.id_eval})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarEvaluacion(${ev.id_eval})"><i class="fas fa-trash-alt"></i> Eliminar</button>
                    </div>
                </div>
            </div>
            <div>Promedio: <strong>${parseFloat(ev.promedio).toFixed(2)}</strong></div>
            <div>Innovación: ${ev.innovacion} · Complejidad: ${ev.complejidad} · Presentación: ${ev.presentacion} · Impacto: ${ev.impacto}</div>
            <div class="text-muted mt-2">${ev.comentarios || 'Sin comentarios'}</div>
        `;
        container.appendChild(row);
    });
}

async function renderizarResultados() {
    await renderizarRanking();
}

async function publicarResultados() {
    await renderizarResultados();
    mostrarMensaje('Resultados publicados correctamente');
}

// ============================================
// ================= MENTORES =================
// ============================================

async function obtenerMentores() {
    try {
        const response = await fetch(`${API_URL}/mentores`);
        if (!response.ok) throw new Error('Error al cargar mentores');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerMentores:', error);
        return [];
    }
}

function resetFormularioMentor() {
    mentorEditId = null;
    const button = document.getElementById('mentorGuardarBtn');
    const cancelBtn = document.getElementById('mentorCancelarBtn');
    if (button) button.textContent = 'Agregar Mentor';
    if (cancelBtn) cancelBtn.classList.add('d-none');
    document.getElementById('mentorNombre').value = '';
    document.getElementById('mentorEmail').value = '';
    document.getElementById('mentorEspecialidad').value = '';
    document.getElementById('mentorTelefono').value = '';
}

async function guardarMentor() {
    if (mentorEditId !== null) {
        return actualizarMentor();
    }
    return agregarMentor();
}

async function agregarMentor() {
    const nombre = document.getElementById('mentorNombre')?.value;
    const email = document.getElementById('mentorEmail')?.value;
    const especialidad = document.getElementById('mentorEspecialidad')?.value;
    const telefono = document.getElementById('mentorTelefono')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!email?.trim()) return mostrarMensaje("Email obligatorio", true);
    if (!especialidad?.trim()) return mostrarMensaje("Especialidad obligatoria", true);
    if (!telefono?.trim()) return mostrarMensaje("Teléfono obligatorio", true);

    try {
        const response = await fetch(`${API_URL}/mentores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, especialidad, telefono })
        });

        if (!response.ok) throw new Error('Error al crear mentor');

        mostrarMensaje('Mentor agregado correctamente');
        resetFormularioMentor();
        await renderizarMentores();
        if (typeof cargarSelectMentores === 'function') await cargarSelectMentores();
    } catch (error) {
        mostrarMensaje('Error al agregar mentor', true);
    }
}

async function actualizarMentor() {
    const nombre = document.getElementById('mentorNombre')?.value;
    const email = document.getElementById('mentorEmail')?.value;
    const especialidad = document.getElementById('mentorEspecialidad')?.value;
    const telefono = document.getElementById('mentorTelefono')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!email?.trim()) return mostrarMensaje("Email obligatorio", true);
    if (!especialidad?.trim()) return mostrarMensaje("Especialidad obligatoria", true);
    if (!telefono?.trim()) return mostrarMensaje("Teléfono obligatorio", true);

    try {
        const response = await fetch(`${API_URL}/mentores/${mentorEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, especialidad, telefono })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.error || 'Error al actualizar mentor');
        }

        mostrarMensaje('Mentor actualizado correctamente');
        resetFormularioMentor();
        await renderizarMentores();
        if (typeof cargarSelectMentores === 'function') await cargarSelectMentores();
    } catch (error) {
        mostrarMensaje(error.message || 'Error al actualizar mentor', true);
    }
}

function cancelarEdicionMentor() {
    resetFormularioMentor();
}

async function editarMentor(id) {
    const mentorId = parseInt(id, 10);
    const mentores = await obtenerMentores();
    const mentor = mentores.find(m => m.id_mentor === mentorId);
    if (!mentor) return mostrarMensaje('Mentor no encontrado', true);

    mentorEditId = mentorId;
    document.getElementById('mentorNombre').value = mentor.nombre || '';
    document.getElementById('mentorEmail').value = mentor.email || '';
    document.getElementById('mentorEspecialidad').value = mentor.especialidad || '';
    document.getElementById('mentorTelefono').value = mentor.telefono || '';

    const button = document.getElementById('mentorGuardarBtn');
    const cancelBtn = document.getElementById('mentorCancelarBtn');
    if (button) button.textContent = 'Guardar cambios';
    if (cancelBtn) cancelBtn.classList.remove('d-none');
}

async function renderizarMentores() {
    const mentores = await obtenerMentores();
    const tbody = document.getElementById('mentoresBody');
    if (tbody) {
        tbody.innerHTML = '';
        mentores.forEach(m => {
            const row = tbody.insertRow();
            row.insertCell(0).innerHTML = `<span class="badge-id">#${m.id_mentor}</span>`;
            row.insertCell(1).textContent = m.nombre;
            row.insertCell(2).textContent = m.email;
            row.insertCell(3).textContent = m.especialidad || '-';
            row.insertCell(4).textContent = m.telefono || '-';
            row.insertCell(5).innerHTML = `
                <button class="btn btn-sm btn-warning me-1" onclick="editarMentor(${m.id_mentor})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="eliminarMentor(${m.id_mentor})"><i class="fas fa-trash-alt"></i></button>
            `;
        });
    }
}

async function cargarSelectMentores() {
    const mentores = await obtenerMentores();
    const select = document.getElementById('asignacionMentorId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un mentor</option>';
        mentores.forEach(m => {
            select.innerHTML += `<option value="${m.id_mentor}">${m.nombre} (${m.especialidad || 'Sin especialidad'})</option>`;
        });
    }
}

async function cargarSelectEquiposAsignacion() {
    const equipos = await obtenerEquipos();
    const select = document.getElementById('asignacionEquipoId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un equipo</option>';
        equipos.forEach(e => {
            select.innerHTML += `<option value="${e.id_equipo}">${e.nombre}</option>`;
        });
    }
}

async function renderizarAsignaciones() {
    const equipos = await obtenerEquipos();
    const mentores = await obtenerMentores();
    const mentorMap = new Map(mentores.map(m => [m.id_mentor, m.nombre]));
    const tbody = document.getElementById('asignacionesBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (equipos.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 4;
            row.insertCell(0).textContent = 'No hay equipos registrados';
            row.classList.add('text-center', 'text-muted');
        } else {
            equipos.forEach(eq => {
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${eq.id_equipo}</span>`;
                row.insertCell(1).textContent = eq.nombre;
                const mentorName = eq.id_mentor ? mentorMap.get(eq.id_mentor) || `#${eq.id_mentor}` : '-';
                row.insertCell(2).textContent = mentorName;
                row.insertCell(3).innerHTML = `
                    <button class="btn btn-sm btn-warning" onclick="editarAsignacion(${eq.id_equipo}, ${eq.id_mentor || 'null'})"><i class="fas fa-edit"></i></button>
                `;
            });
        }
    }
}

async function asignarMentorEquipo() {
    const mentorIdValue = document.getElementById('asignacionMentorId')?.value;
    const equipoIdValue = document.getElementById('asignacionEquipoId')?.value;
    const mentorId = mentorIdValue ? parseInt(mentorIdValue, 10) : null;
    const equipoId = equipoIdValue ? parseInt(equipoIdValue, 10) : null;

    if (!mentorId) return mostrarMensaje('Seleccione un mentor', true);
    if (!equipoId) return mostrarMensaje('Seleccione un equipo', true);

    try {
        const response = await fetch(`${API_URL}/equipos/${equipoId}/mentor`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_mentor: mentorId })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const message = errorBody?.error || 'Error al asignar mentor';
            throw new Error(message);
        }

        mostrarMensaje('Mentor asignado al equipo');
        asignacionEditId = null;
        const button = document.getElementById('asignacionGuardarBtn');
        const cancelBtn = document.getElementById('asignacionCancelarBtn');
        if (button) button.textContent = 'Asignar Mentor';
        if (cancelBtn) cancelBtn.classList.add('d-none');
        await renderizarAsignaciones();
        if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
        if (typeof cargarSelectMentores === 'function') await cargarSelectMentores();
        if (typeof cargarSelectEquiposAsignacion === 'function') await cargarSelectEquiposAsignacion();
    } catch (error) {
        mostrarMensaje(error.message || 'Error al asignar mentor', true);
    }
}

function cancelarEdicionAsignacion() {
    asignacionEditId = null;
    const button = document.getElementById('asignacionGuardarBtn');
    const cancelBtn = document.getElementById('asignacionCancelarBtn');
    if (button) button.textContent = 'Asignar Mentor';
    if (cancelBtn) cancelBtn.classList.add('d-none');
    const mentorSelect = document.getElementById('asignacionMentorId');
    const equipoSelect = document.getElementById('asignacionEquipoId');
    if (mentorSelect) mentorSelect.value = '';
    if (equipoSelect) equipoSelect.value = '';
}

function editarAsignacion(equipoId, mentorId) {
    asignacionEditId = equipoId;
    const mentorSelect = document.getElementById('asignacionMentorId');
    const equipoSelect = document.getElementById('asignacionEquipoId');
    const button = document.getElementById('asignacionGuardarBtn');
    const cancelBtn = document.getElementById('asignacionCancelarBtn');
    if (mentorSelect) mentorSelect.value = mentorId || '';
    if (equipoSelect) equipoSelect.value = equipoId;
    if (button) button.textContent = 'Actualizar asignación';
    if (cancelBtn) cancelBtn.classList.remove('d-none');
}

async function eliminarMentor(id) {
    if (!confirm('¿Eliminar este mentor?')) return;
    try {
        await fetch(`${API_URL}/mentores/${id}`, { method: 'DELETE' });
        mostrarMensaje('Mentor eliminado');
        await renderizarMentores();
    } catch (error) {
        mostrarMensaje('Error al eliminar mentor', true);
    }
}

// ============================================
// ================= RANKING ==================
// ============================================

async function obtenerRanking() {
    try {
        const response = await fetch(`${API_URL}/ranking`);
        if (!response.ok) throw new Error('Error al cargar ranking');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerRanking:', error);
        return [];
    }
}

async function renderizarRanking() {
    const ranking = await obtenerRanking();
    const tbody = document.getElementById('rankingBody') || document.getElementById('rankingResumenBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (ranking.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 4;
            row.insertCell(0).textContent = "No hay evaluaciones registradas";
        } else {
            ranking.forEach((r, index) => {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = index + 1;
                row.insertCell(1).textContent = r.proyecto_nombre;
                row.insertCell(2).textContent = r.equipo_nombre;
                row.insertCell(3).textContent = `${parseFloat(r.promedio).toFixed(2)} pts`;
                if (index === 0) row.classList.add('table-success');
                else if (index === 1) row.classList.add('table-info');
                else if (index === 2) row.classList.add('table-warning');
            });
        }
    }
}

// ============================================
// ================= ACTIVIDADES ==============
// ============================================

async function obtenerActividades() {
    try {
        const response = await fetch(`${API_URL}/actividades`);
        if (!response.ok) throw new Error('Error al cargar actividades');
        return await response.json();
    } catch (error) {
        console.error('Error obtenerActividades:', error);
        return [];
    }
}

async function actualizarSelectEventosCronograma() {
    const eventos = await obtenerEventos();
    const select = document.getElementById('actividadEventoId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un evento</option>';
        eventos.forEach(e => {
            select.innerHTML += `<option value="${e.id_evento}">${e.nombre}</option>`;
        });
    }
}

async function agregarActividad() {
    const id_evento = document.getElementById('actividadEventoId')?.value;
    const nombre = document.getElementById('actividadNombre')?.value;
    const descripcion = document.getElementById('actividadDescripcion')?.value;
    const fecha_hora = document.getElementById('actividadFechaHora')?.value;
    const ubicacion = document.getElementById('actividadUbicacion')?.value;

    if (!id_evento) return mostrarMensaje('Seleccione un evento', true);
    if (!nombre?.trim()) return mostrarMensaje('Nombre de la actividad es obligatorio', true);
    if (!fecha_hora) return mostrarMensaje('Fecha y hora son obligatorias', true);

    try {
        const response = await fetch(`${API_URL}/actividades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_evento: parseInt(id_evento),
                nombre: nombre.trim(),
                descripcion: descripcion || '',
                fecha_hora: fecha_hora,
                ubicacion: ubicacion || ''
            })
        });

        if (!response.ok) throw new Error('Error al crear actividad');

        mostrarMensaje('Actividad agregada correctamente');
        
        document.getElementById('actividadNombre').value = '';
        document.getElementById('actividadDescripcion').value = '';
        document.getElementById('actividadFechaHora').value = '';
        document.getElementById('actividadUbicacion').value = '';
        
        await renderizarCronograma();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

async function eliminarActividad(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
        const response = await fetch(`${API_URL}/actividades/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar');
        mostrarMensaje('Actividad eliminada');
        await renderizarCronograma();
    } catch (error) {
        mostrarMensaje('Error al eliminar actividad', true);
    }
}

async function renderizarCronograma() {
    const actividades = await obtenerActividades();
    const tbody = document.getElementById('cronogramaBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (actividades.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 6;
            row.insertCell(0).textContent = "No hay actividades registradas";
            row.classList.add('text-center', 'text-muted');
        } else {
            actividades.forEach(act => {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = act.evento_nombre || '-';
                row.insertCell(1).textContent = act.nombre;
                row.insertCell(2).textContent = act.descripcion || '-';
                row.insertCell(3).textContent = new Date(act.fecha_hora).toLocaleString();
                row.insertCell(4).textContent = act.ubicacion || '-';
                row.insertCell(5).innerHTML = `
                    <button class="btn btn-sm btn-danger" onclick="eliminarActividad(${act.id_actividad})">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                `;
            });
        }
    }
}

// ============================================
// ================= STATS ====================
// ============================================

async function actualizarStats() {
    const eventos = await obtenerEventos();
    const participantes = await obtenerParticipantes();
    const equipos = await obtenerEquipos();
    const proyectos = await obtenerProyectos();

    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="col-md-3"><div class="stats-card"><h3>${eventos.length}</h3><p><i class="fas fa-calendar-alt me-1"></i> Eventos</p></div></div>
            <div class="col-md-3"><div class="stats-card"><h3>${participantes.length}</h3><p><i class="fas fa-users me-1"></i> Participantes</p></div></div>
            <div class="col-md-3"><div class="stats-card"><h3>${equipos.length}</h3><p><i class="fas fa-user-friends me-1"></i> Equipos</p></div></div>
            <div class="col-md-3"><div class="stats-card"><h3>${proyectos.length}</h3><p><i class="fas fa-project-diagram me-1"></i> Proyectos</p></div></div>
        `;
    }
}

// ============================================
// ================ HISTORIAL =================
// ============================================

async function renderizarHistorial() {
    const eventos = await obtenerEventos();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // MISMA LÓGICA que en el Dashboard
    const eventosPasados = eventos.filter(evento => {
        const fechaFin = new Date(evento.fecha_fin);
        return fechaFin < hoy;
    });
    
    const tbody = document.getElementById('historialBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (eventosPasados.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay eventos pasados registrados";
            row.classList.add('text-center', 'text-muted');
        } else {
            eventosPasados.forEach(e => {
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${e.id_evento}</span>`;
                row.insertCell(1).textContent = e.nombre;
                row.insertCell(2).textContent = formatearFecha(e.fecha_inicio);
                row.insertCell(3).textContent = e.lugar;
                row.insertCell(4).innerHTML = `
                    <button class="btn btn-sm btn-info" onclick="verResultadosEvento(${e.id_evento})">
                        <i class="fas fa-chart-line me-1"></i>Ver resultados
                    </button>
                `;
            });
        }
    }
}

// ============================================
// ================ INICIALIZACIÓN ============
// ============================================

async function inicializar() {
    setupEquipoFormListeners();
    setupEventoFormListeners();
    if (typeof renderizarEventos === 'function') await renderizarEventos();
    if (typeof renderizarParticipantes === 'function') await renderizarParticipantes();
    if (typeof renderizarEquipos === 'function') await renderizarEquipos();
    if (typeof renderizarProyectos === 'function') await renderizarProyectos();
    if (typeof renderizarMentores === 'function') await renderizarMentores();
    if (typeof renderizarAsignaciones === 'function') await renderizarAsignaciones();
    if (typeof renderizarRanking === 'function') await renderizarRanking();
    if (typeof actualizarSelectProyectosEvaluacion === 'function') await actualizarSelectProyectosEvaluacion();
    if (typeof renderizarEvaluaciones === 'function') await renderizarEvaluaciones();
    if (typeof cargarSelectEventos === 'function') await cargarSelectEventos();
    if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
    if (typeof cargarSelectMentores === 'function') await cargarSelectMentores();
    if (typeof cargarSelectEquiposAsignacion === 'function') await cargarSelectEquiposAsignacion();
    if (typeof actualizarSelectEventosCronograma === 'function') await actualizarSelectEventosCronograma();
    if (typeof renderizarCronograma === 'function') await renderizarCronograma();
    
    if (typeof actualizarBadgeNotificaciones === 'function') actualizarBadgeNotificaciones();
}

// Exportar funciones globales
window.agregarEvento = agregarEvento;
window.guardarEvento = guardarEvento;
window.eliminarEvento = eliminarEvento;
window.renderizarEventos = renderizarEventos;

window.agregarParticipante = agregarParticipante;
window.guardarParticipante = guardarParticipante;
window.editarParticipante = editarParticipante;
window.cancelarEdicionParticipante = cancelarEdicionParticipante;
window.eliminarParticipante = eliminarParticipante;
window.renderizarParticipantes = renderizarParticipantes;

window.agregarEquipo = agregarEquipo;
window.editarEquipo = editarEquipo;
window.cancelarEdicionEquipo = cancelarEdicionEquipo;
window.guardarEquipo = guardarEquipo;
window.eliminarEquipo = eliminarEquipo;
window.renderizarEquipos = renderizarEquipos;
window.cargarSelectEventos = cargarSelectEventos;

window.agregarProyecto = agregarProyecto;
window.eliminarProyecto = eliminarProyecto;
window.renderizarProyectos = renderizarProyectos;
window.cargarSelectEquipos = cargarSelectEquipos;

window.obtenerEvaluaciones = obtenerEvaluaciones;
window.actualizarSelectProyectosEvaluacion = actualizarSelectProyectosEvaluacion;
window.guardarEvaluacion = guardarEvaluacion;
window.editarEvaluacion = editarEvaluacion;
window.cancelarEdicionEvaluacion = cancelarEdicionEvaluacion;
window.eliminarEvaluacion = eliminarEvaluacion;
window.renderizarEvaluaciones = renderizarEvaluaciones;
window.renderizarResultados = renderizarResultados;
window.publicarResultados = publicarResultados;

window.agregarMentor = agregarMentor;
window.guardarMentor = guardarMentor;
window.editarMentor = editarMentor;
window.cancelarEdicionMentor = cancelarEdicionMentor;
window.eliminarMentor = eliminarMentor;
window.renderizarMentores = renderizarMentores;
window.cargarSelectMentores = cargarSelectMentores;
window.cargarSelectEquiposAsignacion = cargarSelectEquiposAsignacion;
window.asignarMentorEquipo = asignarMentorEquipo;
window.editarAsignacion = editarAsignacion;
window.cancelarEdicionAsignacion = cancelarEdicionAsignacion;
window.renderizarAsignaciones = renderizarAsignaciones;

window.obtenerActividades = obtenerActividades;
window.actualizarSelectEventosCronograma = actualizarSelectEventosCronograma;
window.agregarActividad = agregarActividad;
window.eliminarActividad = eliminarActividad;
window.renderizarCronograma = renderizarCronograma;

window.obtenerEventos = obtenerEventos;
window.obtenerParticipantes = obtenerParticipantes;
window.obtenerEquipos = obtenerEquipos;
window.obtenerProyectos = obtenerProyectos;
window.obtenerRanking = obtenerRanking;
window.renderizarRanking = renderizarRanking;
window.actualizarStats = actualizarStats;

window.renderizarHistorial = renderizarHistorial;
window.verResultadosEvento = verResultadosEvento;
window.renderizarDashboard = renderizarDashboard;

window.inicializar = inicializar;

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}