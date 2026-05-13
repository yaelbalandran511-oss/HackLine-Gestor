// js/app.js - Versión localStorage (sin conexión a servidor)

// ============================================
// CONFIGURACIÓN DE ALMACENAMIENTO LOCAL
// ============================================
// Ahora todas las operaciones se hacen con localStorage a través del objeto 'DB'
// El proyecto es 100% localStorage - no requiere servidor ni base de datos

// Variables para controlar modo edición en cada módulo
let eventoEditId = null;
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

/** Muestra mensaje flotante (éxito o error) */
function mostrarMensaje(mensaje, esError = false) {
    const div = document.createElement('div');
    div.className = `mensaje-flotante alert ${esError ? 'alert-danger' : 'alert-success'}`;
    div.innerHTML = `<i class="fas ${esError ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-2"></i>${mensaje}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

/** Formatea fecha para mostrar en la interfaz (DD/MM/YYYY) */
function formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/** Convierte fecha para input date (YYYY-MM-DD) */
function fechaParaInput(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 10);
}

/** Limpia el formulario de eventos */
function limpiarFormularioEvento() {
    const campos = ['eventoNombre', 'eventoFechaInicio', 'eventoFechaFin', 'eventoLugar', 'eventoDescripcion'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const cupoInput = document.getElementById('eventoCupo');
    if (cupoInput) cupoInput.value = '50';
}

/** Limpia el formulario de equipos */
function limpiarFormularioEquipo() {
    const nombreInput = document.getElementById('equipoNombre');
    if (nombreInput) nombreInput.value = '';
    const eventoSelect = document.getElementById('equipoEventoId');
    if (eventoSelect) eventoSelect.value = '';
    const miembrosInput = document.getElementById('equipoMiembros');
    if (miembrosInput) miembrosInput.value = '';
}

// ============================================
// DASHBOARD - Panel de control principal
// ============================================

/** Renderiza el dashboard con estadísticas, eventos recientes y ranking */
async function renderizarDashboard() {
    const eventos = await obtenerEventos();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Filtrar eventos futuros (fecha_inicio >= hoy)
    const eventosFuturos = eventos.filter(evento => {
        const fechaInicio = new Date(evento.fecha_inicio);
        return fechaInicio >= hoy;
    }).slice(0, 5); // Últimos 5 eventos futuros
    
    // Eventos recientes (últimos 5)
    const tbodyEventos = document.getElementById('eventosResumenBody');
    if (tbodyEventos) {
        tbodyEventos.innerHTML = '';
        if (eventosFuturos.length === 0) {
            const row = tbodyEventos.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay eventos próximos";
            row.classList.add('text-center', 'text-muted');
        } else {
            eventosFuturos.forEach(e => {
                const row = tbodyEventos.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${e.id_evento}</span>`;
                row.insertCell(1).textContent = e.nombre;
                row.insertCell(2).textContent = formatearFecha(e.fecha_inicio);
                row.insertCell(3).textContent = e.lugar;
                row.insertCell(4).textContent = e.cupo_maximo;
            });
        }
    }
    
    // Ranking top 5
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
    
    await actualizarStats();
}

// ============================================
// EVENTOS - CRUD completo
// ============================================

/** Obtener todos los eventos */
async function obtenerEventos() {
    try {
        return DB.obtenerEventos();
    } catch (error) {
        console.error('Error obtenerEventos:', error);
        return [];
    }
}

/** Obtener un evento por ID */
async function obtenerEventoPorId(id) {
    try {
        return DB.obtenerEventoPorId(id);
    } catch (error) {
        console.error('Error obtenerEventoPorId:', error);
        return null;
    }
}

/** Agregar un nuevo evento (POST) */
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

    const cupo = parseInt(cupo_maximo) || 50;
    if (cupo <= 0) return mostrarMensaje("Cupo debe ser mayor que cero", true);

    try {
        DB.agregarEvento({ 
            nombre, 
            fecha_inicio, 
            fecha_fin, 
            lugar, 
            descripcion, 
            cupo_maximo: cupo,
            estado: 'proximo'
        });

        mostrarMensaje('Evento agregado correctamente');
        limpiarFormularioEvento();
        
        await renderizarEventos();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje('Error al agregar evento', true);
    }
}

/** Actualizar un evento existente (PUT) */
async function actualizarEvento(id) {
    const nombre = document.getElementById('eventoNombre')?.value;
    const fecha_inicio = document.getElementById('eventoFechaInicio')?.value;
    const fecha_fin = document.getElementById('eventoFechaFin')?.value;
    const lugar = document.getElementById('eventoLugar')?.value;
    const cupo_maximo = parseInt(document.getElementById('eventoCupo')?.value);
    const descripcion = document.getElementById('eventoDescripcion')?.value;

    try {
        DB.actualizarEvento(id, { 
            nombre, 
            fecha_inicio, 
            fecha_fin, 
            lugar, 
            descripcion, 
            cupo_maximo 
        });
        
        mostrarMensaje('Evento actualizado correctamente');
        limpiarFormularioEvento();
        
        eventoEditId = null;
        const btn = document.getElementById('eventoGuardarBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Agregar Evento';
        }
        
        await renderizarEventos();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

/** Editar evento (cargar datos en formulario) */
async function editarEvento(id) {
    const evento = await obtenerEventoPorId(id);
    if (evento) {
        eventoEditId = id;
        
        document.getElementById('eventoNombre').value = evento.nombre;
        document.getElementById('eventoFechaInicio').value = fechaParaInput(evento.fecha_inicio);
        document.getElementById('eventoFechaFin').value = fechaParaInput(evento.fecha_fin);
        document.getElementById('eventoLugar').value = evento.lugar;
        document.getElementById('eventoDescripcion').value = evento.descripcion || '';
        document.getElementById('eventoCupo').value = evento.cupo_maximo;
        
        const btn = document.getElementById('eventoGuardarBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Evento';
        }
        
        document.querySelector('.card-custom')?.scrollIntoView({ behavior: 'smooth' });
    }
}

/** Guardar evento (decide entre agregar o actualizar) */
async function guardarEvento() {
    if (eventoEditId !== null) {
        await actualizarEvento(eventoEditId);
    } else {
        await agregarEvento();
    }
}

/** Eliminar evento (DELETE) */
async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento? Se eliminarán también las actividades asociadas.')) return;
    try {
        DB.eliminarEvento(id);
        mostrarMensaje('Evento eliminado');
        await renderizarEventos();
        await actualizarStats();
        if (typeof renderizarHistorial === 'function') await renderizarHistorial();
        if (typeof renderizarCronograma === 'function') await renderizarCronograma();
    } catch (error) {
        mostrarMensaje('Error al eliminar evento', true);
    }
}

/** Renderizar tabla de eventos */
async function renderizarEventos() {
    const eventos = await obtenerEventos();
    const tbody = document.getElementById('eventosBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (eventos.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 6;
            row.insertCell(0).textContent = "No hay eventos registrados";
            row.classList.add('text-center', 'text-muted');
        } else {
            eventos.forEach(e => {
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${e.id_evento}</span>`;
                row.insertCell(1).textContent = e.nombre;
                row.insertCell(2).textContent = formatearFecha(e.fecha_inicio);
                row.insertCell(3).textContent = e.lugar;
                row.insertCell(4).textContent = e.cupo_maximo;
                row.insertCell(5).innerHTML = `
                    <button class="btn btn-sm btn-warning me-1" onclick="editarEvento(${e.id_evento})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarEvento(${e.id_evento})"><i class="fas fa-trash-alt"></i></button>
                `;
            });
        }
    }
}

// ============================================
// PARTICIPANTES - CRUD completo
// ============================================

/** Obtener todos los participantes */
async function obtenerParticipantes() {
    try {
        return DB.obtenerParticipantes();
    } catch (error) {
        console.error('Error obtenerParticipantes:', error);
        return [];
    }
}

/** Obtener un participante por ID */
async function obtenerParticipantePorId(id) {
    try {
        return DB.obtenerParticipantePorId(id);
    } catch (error) {
        console.error('Error obtenerParticipantePorId:', error);
        return null;
    }
}

/** Agregar un nuevo participante */
async function agregarParticipante() {
    const nombre = document.getElementById('partNombre')?.value;
    const email = document.getElementById('partEmail')?.value;
    const habilidades = document.getElementById('partHabilidades')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!email?.trim()) return mostrarMensaje("Email obligatorio", true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return mostrarMensaje("Email inválido", true);

    try {
        DB.agregarParticipante({ 
            nombre, 
            email, 
            password_hash: 'temp123', 
            habilidades: habilidades || '' 
        });

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

/** Actualizar un participante existente */
async function actualizarParticipante(id) {
    const nombre = document.getElementById('partNombre')?.value;
    const email = document.getElementById('partEmail')?.value;
    const habilidades = document.getElementById('partHabilidades')?.value;

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!email?.trim()) return mostrarMensaje("Email obligatorio", true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return mostrarMensaje("Email inválido", true);

    try {
        DB.actualizarParticipante(id, { 
            nombre, 
            email, 
            habilidades: habilidades || '' 
        });

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

/** Editar participante (cargar datos en formulario) */
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

/** Cancelar edición de participante */
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

/** Guardar participante (decide entre agregar o actualizar) */
async function guardarParticipante() {
    if (participanteEditId !== null) {
        await actualizarParticipante(participanteEditId);
    } else {
        await agregarParticipante();
    }
}

/** Eliminar participante */
async function eliminarParticipante(id) {
    if (!confirm('¿Eliminar este participante?')) return;
    try {
        DB.eliminarParticipante(id);
        mostrarMensaje('Participante eliminado');
        await renderizarParticipantes();
        await actualizarStats();
    } catch (error) {
        mostrarMensaje('Error al eliminar participante', true);
    }
}

/** Renderizar tabla de participantes */
async function renderizarParticipantes() {
    const participantes = await obtenerParticipantes();
    const tbody = document.getElementById('participantesBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (participantes.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay participantes registrados";
            row.classList.add('text-center', 'text-muted');
        } else {
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
}

// ============================================
// EQUIPOS - CRUD completo
// ============================================

/** Obtener todos los equipos */
async function obtenerEquipos() {
    try {
        return DB.obtenerEquipos();
    } catch (error) {
        console.error('Error obtenerEquipos:', error);
        return [];
    }
}

/** Obtener un equipo por ID */
async function obtenerEquipoPorId(id) {
    try {
        return DB.obtenerEquipoPorId(id);
    } catch (error) {
        console.error('Error obtenerEquipoPorId:', error);
        return null;
    }
}

/** Cargar eventos en el select de equipos */
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

/** Agregar un nuevo equipo */
async function agregarEquipo() {
    const nombre = document.getElementById('equipoNombre')?.value;
    const id_evento = document.getElementById('equipoEventoId')?.value;
    const miembrosTexto = document.getElementById('equipoMiembros')?.value;
    const miembros = miembrosTexto?.trim() ? miembrosTexto.split(',').map(m => parseInt(m.trim(), 10)) : [];

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!id_evento) return mostrarMensaje("Seleccione un evento", true);
    if (miembros.length < 1) return mostrarMensaje("Mínimo 1 miembro", true);
    if (miembros.length > 5) return mostrarMensaje("Máximo 5 miembros", true);
    if (miembros.some(id => isNaN(id) || id <= 0)) return mostrarMensaje("IDs de participantes deben ser números positivos", true);

    try {
        DB.agregarEquipo({ 
            nombre, 
            id_evento: parseInt(id_evento, 10), 
            miembros, 
            activo: true 
        });

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

/** Actualizar un equipo existente */
async function actualizarEquipo(id) {
    const nombre = document.getElementById('equipoNombre')?.value;
    const id_evento = document.getElementById('equipoEventoId')?.value;
    const miembrosTexto = document.getElementById('equipoMiembros')?.value;
    const miembros = miembrosTexto?.trim() ? miembrosTexto.split(',').map(m => parseInt(m.trim(), 10)) : [];

    if (!nombre?.trim()) return mostrarMensaje("Nombre obligatorio", true);
    if (!id_evento) return mostrarMensaje("Seleccione un evento", true);
    if (miembros.length < 1) return mostrarMensaje("Mínimo 1 miembro", true);
    if (miembros.length > 5) return mostrarMensaje("Máximo 5 miembros", true);
    if (miembros.some(id => isNaN(id) || id <= 0)) return mostrarMensaje("IDs de participantes deben ser números positivos", true);

    try {
        DB.actualizarEquipo(id, { 
            nombre, 
            id_evento: parseInt(id_evento, 10), 
            miembros, 
            activo: true 
        });

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

/** Editar equipo (cargar datos en formulario) */
async function editarEquipo(id) {
    const equipo = await obtenerEquipoPorId(id);
    if (!equipo) return;

    equipoEditId = id;
    document.getElementById('equipoNombre').value = equipo.nombre || '';
    document.getElementById('equipoEventoId').value = equipo.id_evento || '';
    const miembrosIds = (equipo.miembros || []).map(m => m.id || m).filter(Boolean);
    document.getElementById('equipoMiembros').value = miembrosIds.join(', ');

    const btnGuardar = document.getElementById('equipoGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Equipo';
    const btnCancelar = document.getElementById('equipoCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';

    document.querySelector('.card-custom')?.scrollIntoView({ behavior: 'smooth' });
}

/** Cancelar edición de equipo */
function cancelarEdicionEquipo() {
    equipoEditId = null;
    limpiarFormularioEquipo();
    const btnGuardar = document.getElementById('equipoGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Agregar Equipo';
    const btnCancelar = document.getElementById('equipoCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'none';
}

/** Guardar equipo (decide entre agregar o actualizar) */
async function guardarEquipo() {
    if (equipoEditId !== null) {
        await actualizarEquipo(equipoEditId);
    } else {
        await agregarEquipo();
    }
}

/** Eliminar equipo */
async function eliminarEquipo(id) {
    if (!confirm('¿Eliminar este equipo? También se eliminará su proyecto asociado.')) return;
    try {
        DB.eliminarEquipo(id);
        mostrarMensaje('Equipo eliminado');
        await renderizarEquipos();
        await actualizarStats();
        if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
        if (typeof renderizarProyectos === 'function') await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al eliminar equipo', true);
    }
}

/** Renderizar tabla de equipos */
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
                const eventoTexto = eq.evento_nombre || eq.evento || (eq.id_evento ? `Evento ${eq.id_evento}` : '-');
                row.insertCell(2).textContent = eventoTexto;
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
                    <button class="btn-icon btn-edit me-2" onclick="editarEquipo(${eq.id_equipo})" title="Editar equipo"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" onclick="eliminarEquipo(${eq.id_equipo})" title="Eliminar equipo"><i class="fas fa-trash-alt"></i></button>
                `;
            });
        }
    }
}

// ============================================
// PROYECTOS - CRUD completo
// ============================================

/** Obtener todos los proyectos */
async function obtenerProyectos() {
    try {
        return DB.obtenerProyectos();
    } catch (error) {
        console.error('Error obtenerProyectos:', error);
        return [];
    }
}

/** Cargar equipos en el select de proyectos */
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

/** Agregar un nuevo proyecto */
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
        DB.agregarProyecto({ 
            nombre, 
            descripcion, 
            tecnologias, 
            repo_url, 
            id_equipo: parseInt(id_equipo), 
            estado: 'registrado' 
        });

        mostrarMensaje('Proyecto registrado correctamente');
        document.getElementById('proyectoNombre').value = '';
        document.getElementById('proyectoDescripcion').value = '';
        document.getElementById('proyectoTecnologias').value = '';
        document.getElementById('proyectoRepo').value = '';
        document.getElementById('proyectoEquipoId').value = '';

        await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al agregar proyecto', true);
    }
}

/** Obtener un proyecto por ID */
async function obtenerProyectoPorId(id) {
    try {
        return DB.obtenerProyectoPorId(id);
    } catch (error) {
        console.error('Error obtenerProyectoPorId:', error);
        return null;
    }
}

/** Actualizar un proyecto existente */
async function actualizarProyecto(id) {
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
        DB.actualizarProyecto(id, { 
            nombre, 
            descripcion, 
            tecnologias, 
            repo_url, 
            id_equipo: parseInt(id_equipo), 
            estado: 'registrado' 
        });

        mostrarMensaje('Proyecto actualizado correctamente');
        proyectoEditId = null;
        document.getElementById('proyectoNombre').value = '';
        document.getElementById('proyectoDescripcion').value = '';
        document.getElementById('proyectoTecnologias').value = '';
        document.getElementById('proyectoRepo').value = '';
        document.getElementById('proyectoEquipoId').value = '';
        const btnGuardar = document.getElementById('proyectoGuardarBtn');
        if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Registrar Proyecto';
        const btnCancelar = document.getElementById('proyectoCancelarBtn');
        if (btnCancelar) btnCancelar.style.display = 'none';

        await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al actualizar proyecto', true);
    }
}

/** Cargar proyecto en el formulario para editar */
async function editarProyecto(id) {
    const proyecto = await obtenerProyectoPorId(id);
    if (!proyecto) return;

    proyectoEditId = id;
    document.getElementById('proyectoNombre').value = proyecto.nombre || '';
    document.getElementById('proyectoDescripcion').value = proyecto.descripcion || '';
    document.getElementById('proyectoTecnologias').value = proyecto.tecnologias || '';
    document.getElementById('proyectoRepo').value = proyecto.repo_url || '';
    document.getElementById('proyectoEquipoId').value = proyecto.id_equipo || '';
    const btnGuardar = document.getElementById('proyectoGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Proyecto';
    const btnCancelar = document.getElementById('proyectoCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
}

/** Cancelar edición de proyecto */
function cancelarEdicionProyecto() {
    proyectoEditId = null;
    document.getElementById('proyectoNombre').value = '';
    document.getElementById('proyectoDescripcion').value = '';
    document.getElementById('proyectoTecnologias').value = '';
    document.getElementById('proyectoRepo').value = '';
    document.getElementById('proyectoEquipoId').value = '';
    const btnGuardar = document.getElementById('proyectoGuardarBtn');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Registrar Proyecto';
    const btnCancelar = document.getElementById('proyectoCancelarBtn');
    if (btnCancelar) btnCancelar.style.display = 'none';
}

/** Guardar proyecto (agregar o actualizar) */
async function guardarProyecto() {
    if (proyectoEditId !== null) {
        await actualizarProyecto(proyectoEditId);
    } else {
        await agregarProyecto();
    }
}

/** Renderizar tabla de proyectos */
async function renderizarProyectos() {
    const proyectos = await obtenerProyectos();
    const equipos = await obtenerEquipos();
    const tbody = document.getElementById('proyectosBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (proyectos.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 5;
            row.insertCell(0).textContent = "No hay proyectos registrados";
        } else {
            proyectos.forEach(p => {
                const equipo = equipos.find(e => e.id_equipo == p.id_equipo || e.id == p.id_equipo);
                const nombreEquipo = equipo?.nombre || '-';
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<span class="badge-id">#${p.id_proy}</span>`;
                row.insertCell(1).textContent = p.nombre;
                row.insertCell(2).textContent = p.tecnologias || '-';
                row.insertCell(3).textContent = nombreEquipo;
                row.insertCell(4).innerHTML = `
                    <button class="btn btn-sm btn-warning me-1" onclick="editarProyecto(${p.id_proy})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarProyecto(${p.id_proy})"><i class="fas fa-trash-alt"></i></button>
                `;
            });
        }
    }
}

/** Eliminar proyecto */
async function eliminarProyecto(id) {
    if (!confirm('¿Eliminar este proyecto? También se eliminarán sus avances.')) return;
    try {
        DB.eliminarProyecto(id);
        mostrarMensaje('Proyecto eliminado');
        await renderizarProyectos();
    } catch (error) {
        mostrarMensaje('Error al eliminar proyecto', true);
    }
}

// ============================================
// EVALUACIONES - CRUD completo con edición
// ============================================

/** Obtener todas las evaluaciones */
async function obtenerEvaluaciones() {
    try {
        return DB.obtenerEvaluaciones();
    } catch (error) {
        console.error('Error obtenerEvaluaciones:', error);
        return [];
    }
}

/** Obtener una evaluación por ID */
async function obtenerEvaluacionPorId(id) {
    try {
        return DB.obtenerEvaluacionPorId(id);
    } catch (error) {
        console.error('Error obtenerEvaluacionPorId:', error);
        return null;
    }
}

/** Cargar proyectos en el select de evaluaciones */
async function actualizarSelectProyectosEvaluacion() {
    const proyectos = await obtenerProyectos();
    const equipos = await obtenerEquipos();
    const select = document.getElementById('evaluacionProyectoId');
    if (select) {
        select.innerHTML = '<option value="">Seleccione un proyecto</option>';
        proyectos.forEach(p => {
            const equipo = equipos.find(eq => eq.id_equipo == p.id_equipo || eq.id == p.id_equipo);
            const equipoEtiqueta = equipo ? ` - ${equipo.nombre}` : '';
            select.innerHTML += `<option value="${p.id_proy}">${p.nombre}${equipoEtiqueta}</option>`;
        });
    }
}

/** Guardar evaluación (POST o PUT según modo) */
async function guardarEvaluacion() {
    const proyectoId = parseInt(document.getElementById('evaluacionProyectoId')?.value, 10);
    const juez = document.getElementById('evaluacionJuez')?.value;
    const innovacion = Number(document.getElementById('evaluacionInnovacion')?.value);
    const complejidad = Number(document.getElementById('evaluacionComplejidad')?.value);
    const presentacion = Number(document.getElementById('evaluacionPresentacion')?.value);
    const impacto = Number(document.getElementById('evaluacionImpacto')?.value);
    const comentarios = document.getElementById('evaluacionComentarios')?.value;

    if (!proyectoId) return mostrarMensaje('Seleccione un proyecto', true);
    if (!juez?.trim()) return mostrarMensaje('Nombre del juez es obligatorio', true);
    if (isNaN(innovacion) || innovacion < 0 || innovacion > 100) return mostrarMensaje('Innovación debe estar entre 0 y 100', true);
    if (isNaN(complejidad) || complejidad < 0 || complejidad > 100) return mostrarMensaje('Complejidad debe estar entre 0 y 100', true);
    if (isNaN(presentacion) || presentacion < 0 || presentacion > 100) return mostrarMensaje('Presentación debe estar entre 0 y 100', true);
    if (isNaN(impacto) || impacto < 0 || impacto > 100) return mostrarMensaje('Impacto debe estar entre 0 y 100', true);
    if (!comentarios?.trim()) return mostrarMensaje('Comentarios son obligatorios', true);

    try {
        const promedio = Number(((innovacion + complejidad + presentacion + impacto) / 4).toFixed(2));
        const data = {
            id_proy: proyectoId,
            juez: juez.trim(),
            juez_nombre: juez.trim(),
            innovacion,
            complejidad,
            presentacion,
            impacto,
            promedio,
            comentarios: comentarios?.trim() || ''
        };
        
        if (evaluacionEditId !== null) {
            DB.actualizarEvaluacion(evaluacionEditId, data);
        } else {
            DB.agregarEvaluacion(data);
        }

        mostrarMensaje(evaluacionEditId ? 'Evaluación actualizada correctamente' : 'Evaluación registrada correctamente');
        
        cancelarEdicionEvaluacion();
        
        await renderizarEvaluaciones();
        await renderizarResultados();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

/** Editar evaluación (cargar datos en formulario) */
async function editarEvaluacion(id) {
    const evaluacion = await obtenerEvaluacionPorId(id);
    if (!evaluacion) {
        mostrarMensaje('No se pudo cargar la evaluación', true);
        return;
    }
    
    evaluacionEditId = id;
    
    document.getElementById('evaluacionProyectoId').value = evaluacion.id_proy;
    document.getElementById('evaluacionJuez').value = evaluacion.juez || evaluacion.juez_nombre || '';
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
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
    
    document.querySelector('.card-custom')?.scrollIntoView({ behavior: 'smooth' });
}

/** Cancelar edición de evaluación */
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
    if (btnCancelar) btnCancelar.style.display = 'none';
}

/** Eliminar evaluación */
async function eliminarEvaluacion(id) {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    try {
        DB.eliminarEvaluacion(id);
        mostrarMensaje('Evaluación eliminada');
        await renderizarEvaluaciones();
        await renderizarResultados();
    } catch (error) {
        mostrarMensaje('Error al eliminar evaluación', true);
    }
}

/** Renderizar lista de evaluaciones */
async function renderizarEvaluaciones() {
    const evaluaciones = await obtenerEvaluaciones();
    const proyectos = await obtenerProyectos();
    const equipos = await obtenerEquipos();
    const container = document.getElementById('evaluacionesBody');
    if (!container) return;
    container.innerHTML = '';
    if (evaluaciones.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay evaluaciones registradas todavía.</p>';
        return;
    }
    evaluaciones.forEach(ev => {
        const proyecto = proyectos.find(p => p.id_proy == ev.id_proy || p.id_proyecto == ev.id_proy);
        const equipo = proyecto ? equipos.find(eq => eq.id_equipo == proyecto.id_equipo || eq.id == proyecto.id_equipo) : null;
        const proyectoNombre = proyecto?.nombre || `Proyecto ${ev.id_proy}`;
        const equipoNombre = equipo?.nombre || 'Equipo no asignado';
        const juezNombre = ev.juez || ev.juez_nombre || 'Juez desconocido';
        const promedio = !isNaN(ev.promedio) ? Number(ev.promedio) : Number(((Number(ev.innovacion) || 0) + (Number(ev.complejidad) || 0) + (Number(ev.presentacion) || 0) + (Number(ev.impacto) || 0)) / 4);
        const row = document.createElement('div');
        row.className = 'mb-3 p-3 border rounded bg-light';
        row.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div><strong>${proyectoNombre}</strong> <span class="text-secondary">(${equipoNombre})</span></div>
                <div class="text-end">
                    <em>${juezNombre}</em>
                    <div class="mt-1">
                        <button class="btn btn-sm btn-warning me-1" onclick="editarEvaluacion(${ev.id_eval})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarEvaluacion(${ev.id_eval})"><i class="fas fa-trash-alt"></i> Eliminar</button>
                    </div>
                </div>
            </div>
            <div>Promedio: <strong>${promedio.toFixed(2)}</strong></div>
            <div>Innovación: ${ev.innovacion} · Complejidad: ${ev.complejidad} · Presentación: ${ev.presentacion} · Impacto: ${ev.impacto}</div>
            <div class="text-muted mt-2">${ev.comentarios || 'Sin comentarios'}</div>
        `;
        container.appendChild(row);
    });
    await renderizarRanking();
}

/** Renderizar resultados (ranking) */
async function renderizarResultados() {
    await renderizarRanking();
}

/** Publicar resultados */
async function publicarResultados() {
    await renderizarResultados();
    mostrarMensaje('Resultados publicados correctamente');
}

// ============================================
// MENTORES - CRUD completo y asignaciones
// ============================================

/** Obtener todos los mentores */
async function obtenerMentores() {
    try {
        return DB.obtenerMentores();
    } catch (error) {
        console.error('Error obtenerMentores:', error);
        return [];
    }
}

/** Cargar mentores en el select de asignación */
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

/** Cargar equipos en el select de asignación */
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

/** Agregar un nuevo mentor */
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
        DB.agregarMentor({ nombre, email, especialidad, telefono });

        mostrarMensaje('Mentor agregado correctamente');
        resetFormularioMentor();
        await renderizarMentores();
        await cargarSelectMentores();
    } catch (error) {
        mostrarMensaje('Error al agregar mentor', true);
    }
}

/** Renderizar tabla de mentores */
async function renderizarMentores() {
    const mentores = await obtenerMentores();
    const tbody = document.getElementById('mentoresBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (mentores.length === 0) {
            const row = tbody.insertRow();
            row.insertCell(0).colSpan = 6;
            row.insertCell(0).textContent = "No hay mentores registrados";
            row.classList.add('text-center', 'text-muted');
        } else {
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
}

/** Editar mentor */
async function editarMentor(id) {
    const mentores = await obtenerMentores();
    const mentor = mentores.find(m => m.id_mentor === id);
    if (!mentor) return mostrarMensaje('Mentor no encontrado', true);

    mentorEditId = id;
    document.getElementById('mentorNombre').value = mentor.nombre || '';
    document.getElementById('mentorEmail').value = mentor.email || '';
    document.getElementById('mentorEspecialidad').value = mentor.especialidad || '';
    document.getElementById('mentorTelefono').value = mentor.telefono || '';

    const button = document.getElementById('mentorGuardarBtn');
    const cancelBtn = document.getElementById('mentorCancelarBtn');
    if (button) button.textContent = 'Guardar cambios';
    if (cancelBtn) cancelBtn.classList.remove('d-none');
}

/** Guardar mentor (agregar o actualizar) */
async function guardarMentor() {
    if (mentorEditId !== null) {
        await actualizarMentor();
    } else {
        await agregarMentor();
    }
}

/** Actualizar mentor existente */
async function actualizarMentor() {
    const nombre = document.getElementById('mentorNombre')?.value;
    const email = document.getElementById('mentorEmail')?.value;
    const especialidad = document.getElementById('mentorEspecialidad')?.value;
    const telefono = document.getElementById('mentorTelefono')?.value;

    try {
        DB.actualizarMentor(mentorEditId, { nombre, email, especialidad, telefono });

        mostrarMensaje('Mentor actualizado correctamente');
        resetFormularioMentor();
        await renderizarMentores();
        await cargarSelectMentores();
        mentorEditId = null;
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

/** Cancelar edición de mentor */
function cancelarEdicionMentor() {
    resetFormularioMentor();
}

function resetFormularioMentor() {
    mentorEditId = null;
    document.getElementById('mentorNombre').value = '';
    document.getElementById('mentorEmail').value = '';
    document.getElementById('mentorEspecialidad').value = '';
    document.getElementById('mentorTelefono').value = '';
    const button = document.getElementById('mentorGuardarBtn');
    const cancelBtn = document.getElementById('mentorCancelarBtn');
    if (button) button.textContent = 'Agregar Mentor';
    if (cancelBtn) cancelBtn.classList.add('d-none');
}

/** Eliminar mentor */
async function eliminarMentor(id) {
    if (!confirm('¿Eliminar este mentor?')) return;
    try {
        DB.eliminarMentor(id);
        mostrarMensaje('Mentor eliminado');
        await renderizarMentores();
        await cargarSelectMentores();
    } catch (error) {
        mostrarMensaje('Error al eliminar mentor', true);
    }
}

/** Renderizar asignaciones de mentores a equipos */
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

/** Asignar mentor a equipo */
async function asignarMentorEquipo() {
    const mentorId = parseInt(document.getElementById('asignacionMentorId')?.value, 10);
    const equipoId = parseInt(document.getElementById('asignacionEquipoId')?.value, 10);

    if (!mentorId) return mostrarMensaje('Seleccione un mentor', true);
    if (!equipoId) return mostrarMensaje('Seleccione un equipo', true);

    try {
        DB.asignarMentorEquipo(equipoId, mentorId);
        mostrarMensaje('Mentor asignado al equipo');
        await renderizarAsignaciones();
        await cargarSelectEquiposAsignacion();
        await cargarSelectMentores();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

/** Editar asignación */
function editarAsignacion(equipoId, mentorId) {
    asignacionEditId = equipoId;
    const mentorSelect = document.getElementById('asignacionMentorId');
    const equipoSelect = document.getElementById('asignacionEquipoId');
    if (mentorSelect) mentorSelect.value = mentorId || '';
    if (equipoSelect) equipoSelect.value = equipoId;
    const button = document.getElementById('asignacionGuardarBtn');
    const cancelBtn = document.getElementById('asignacionCancelarBtn');
    if (button) button.textContent = 'Actualizar asignación';
    if (cancelBtn) cancelBtn.classList.remove('d-none');
}

/** Cancelar edición de asignación */
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

// ============================================
// RANKING - Cálculo de puntajes
// ============================================

/** Obtener ranking de proyectos */
async function obtenerRanking() {
    try {
        return DB.obtenerRanking();
    } catch (error) {
        console.error('Error obtenerRanking:', error);
        return [];
    }
}

/** Renderizar ranking */
async function renderizarRanking() {
    const ranking = await obtenerRanking();
    const tbody = document.getElementById('rankingBody') || document.getElementById('rankingResumenBody');
    if (tbody) {
        tbody.innerHTML = '';
        if (ranking.length === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 4;
            cell.textContent = "No hay evaluaciones registradas";
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
// ACTIVIDADES - Cronograma
// ============================================

/** Obtener todas las actividades */
async function obtenerActividades() {
    try {
        return DB.obtenerActividades();
    } catch (error) {
        console.error('Error obtenerActividades:', error);
        return [];
    }
}

/** Cargar eventos en el select del cronograma */
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

/** Agregar una actividad */
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
        let url = `agregar`;
        let method = 'POST';
        const editId = actividadEditId || document.getElementById('actividadEditId')?.value;

        if (editId) {
            method = 'PUT';
            DB.actualizarActividad(parseInt(editId), {
                id_evento: parseInt(id_evento),
                nombre: nombre.trim(),
                descripcion: descripcion || '',
                fecha_hora: fecha_hora,
                ubicacion: ubicacion || ''
            });
        } else {
            DB.agregarActividad({
                id_evento: parseInt(id_evento),
                nombre: nombre.trim(),
                descripcion: descripcion || '',
                fecha_hora: fecha_hora,
                ubicacion: ubicacion || ''
            });
        }

        mostrarMensaje(editId ? 'Actividad actualizada correctamente' : 'Actividad agregada correctamente');
        cancelarEdicionActividad();

        document.getElementById('actividadNombre').value = '';
        document.getElementById('actividadDescripcion').value = '';
        document.getElementById('actividadFechaHora').value = '';
        document.getElementById('actividadUbicacion').value = '';

        await renderizarCronograma();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

/** Obtener una actividad por id */
async function obtenerActividadPorId(id) {
    try {
        return DB.obtenerActividadPorId(id);
    } catch (error) {
        console.error('Error obtenerActividadPorId:', error);
        return null;
    }
}

/** Editar actividad (cargar datos en el formulario) */
async function editarActividad(id) {
    const actividad = await obtenerActividadPorId(id);
    if (!actividad) {
        mostrarMensaje('No se pudo cargar la actividad', true);
        return;
    }

    actividadEditId = id;
    document.getElementById('actividadEditId').value = id;
    document.getElementById('actividadEventoId').value = actividad.id_evento;
    document.getElementById('actividadNombre').value = actividad.nombre || '';
    document.getElementById('actividadDescripcion').value = actividad.descripcion || '';
    document.getElementById('actividadFechaHora').value = actividad.fecha_hora || '';
    document.getElementById('actividadUbicacion').value = actividad.ubicacion || '';

    const btnGuardar = document.getElementById('btnGuardarActividad');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Actividad';
    const btnCancelar = document.getElementById('btnCancelarActividad');
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
}

/** Cancelar edición de actividad */
function cancelarEdicionActividad() {
    actividadEditId = null;
    const hiddenInput = document.getElementById('actividadEditId');
    if (hiddenInput) hiddenInput.value = '';

    document.getElementById('actividadEventoId').value = '';
    document.getElementById('actividadNombre').value = '';
    document.getElementById('actividadDescripcion').value = '';
    document.getElementById('actividadFechaHora').value = '';
    document.getElementById('actividadUbicacion').value = '';

    const btnGuardar = document.getElementById('btnGuardarActividad');
    if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Agregar Actividad';
    const btnCancelar = document.getElementById('btnCancelarActividad');
    if (btnCancelar) btnCancelar.style.display = 'none';
}

/** Eliminar actividad */
async function eliminarActividad(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
        DB.eliminarActividad(id);
        mostrarMensaje('Actividad eliminada');
        await renderizarCronograma();
    } catch (error) {
        mostrarMensaje('Error al eliminar actividad', true);
    }
}

/** Renderizar cronograma */
async function renderizarCronograma() {
    const actividades = await obtenerActividades();
    const eventos = await obtenerEventos();
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
                const evento = eventos.find(e => e.id_evento == act.id_evento || e.id == act.id_evento);
                const eventoTexto = evento?.nombre || `Evento ${act.id_evento}`;
                const row = tbody.insertRow();
                row.insertCell(0).textContent = eventoTexto;
                row.insertCell(1).textContent = act.nombre;
                row.insertCell(2).textContent = act.descripcion || '-';
                row.insertCell(3).textContent = new Date(act.fecha_hora).toLocaleString();
                row.insertCell(4).textContent = act.ubicacion || '-';
                row.insertCell(5).innerHTML = `
                    <button class="btn btn-sm btn-warning me-1" onclick="editarActividad(${act.id_actividad})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarActividad(${act.id_actividad})"><i class="fas fa-trash-alt"></i></button>
                `;
            });
        }
    }
}

// ============================================
// HISTORIAL - Eventos pasados
// ============================================

/** Renderizar historial (eventos pasados) */
async function renderizarHistorial() {
    const eventos = await obtenerEventos();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
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

/** Ver resultados de un evento pasado */
async function verResultadosEvento(idEvento) {
    const evento = await obtenerEventoPorId(idEvento);
    const evaluaciones = await obtenerEvaluaciones();
    const proyectos = await obtenerProyectos();
    const equipos = await obtenerEquipos();
    
    const equiposEvento = equipos.filter(eq => eq.id_evento === idEvento);
    const proyectosEvento = proyectos.filter(p => equiposEvento.some(eq => eq.id_equipo === p.id_equipo));
    
    const ranking = [];
    proyectosEvento.forEach(p => {
        const evals = evaluaciones.filter(e => e.id_proy === p.id_proy);
        if (evals.length > 0) {
            const promedio = evals.reduce((sum, e) => sum + e.promedio, 0) / evals.length;
            const equipo = equiposEvento.find(eq => eq.id_equipo === p.id_equipo);
            ranking.push({
                proyecto: p.nombre,
                equipo: equipo?.nombre || 'N/A',
                promedio: promedio
            });
        }
    });
    ranking.sort((a, b) => b.promedio - a.promedio);
    
    // Crear modal con resultados
    let modalHTML = `
        <div class="modal fade" id="modalResultados" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-trophy me-2"></i>Resultados: ${evento.nombre}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
    `;
    
    if (ranking.length === 0) {
        modalHTML += `<p class="text-muted text-center">No hay evaluaciones disponibles para este evento.</p>`;
    } else {
        modalHTML += `<table class="table table-striped align-middle">
            <thead class="table-primary">
                <tr>
                    <th>#</th>
                    <th>Proyecto</th>
                    <th>Equipo</th>
                    <th>Puntaje</th>
                </tr>
            </thead>
            <tbody>`;
        ranking.forEach((r, idx) => {
            let tableClass = '';
            if (idx === 0) tableClass = 'table-success';
            else if (idx === 1) tableClass = 'table-info';
            else if (idx === 2) tableClass = 'table-warning';
            modalHTML += `
                <tr ${tableClass ? `class="${tableClass}"` : ''}>
                    <td><span class="badge bg-primary">${idx + 1}</span></td>
                    <td><strong>${r.proyecto}</strong></td>
                    <td>${r.equipo}</td>
                    <td><strong>${r.promedio.toFixed(2)} pts</strong></td>
                </tr>
            `;
        });
        modalHTML += `
            </tbody>
        </table>`;
    }
    
    modalHTML += `
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior si existe
    const existingModal = document.getElementById('modalResultados');
    if (existingModal) existingModal.remove();
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalResultados'));
    modal.show();
}

// ============================================
// ESTADÍSTICAS - Contadores del dashboard
// ============================================

/** Actualizar tarjetas de estadísticas */
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
// PERFIL - Admin profile
// ============================================

/** Actualizar y mostrar información del perfil administrativo */
async function actualizarPerfil() {
    const eventos = await obtenerEventos();
    const participantes = await obtenerParticipantes();
    const equipos = await obtenerEquipos();
    const proyectos = await obtenerProyectos();

    // Actualizar estadísticas en el perfil
    const totalEventosEl = document.getElementById('totalEventos');
    if (totalEventosEl) totalEventosEl.textContent = eventos.length;

    const totalParticipantesEl = document.getElementById('totalParticipantes');
    if (totalParticipantesEl) totalParticipantesEl.textContent = participantes.length;

    const totalEquiposEl = document.getElementById('totalEquipos');
    if (totalEquiposEl) totalEquiposEl.textContent = equipos.length;

    const totalProyectosEl = document.getElementById('totalProyectos');
    if (totalProyectosEl) totalProyectosEl.textContent = proyectos.length;

    // Información del administrador
    const adminName = document.getElementById('adminName');
    if (adminName) adminName.textContent = 'Administrador HackLine';

    const adminEmail = document.getElementById('adminEmail');
    if (adminEmail) adminEmail.textContent = 'admin@hackline.local';

    const adminDescription = document.getElementById('adminDescription');
    if (adminDescription) adminDescription.textContent = 'Sistema de gestión integral para hackatones. Gestation de eventos, participantes, equipos, proyectos y evaluaciones.';
}

// ============================================
// INICIALIZACIÓN
// ============================================

/** Función principal que inicializa todos los módulos */
async function inicializar() {
    if (typeof renderizarEventos === 'function') await renderizarEventos();
    if (typeof renderizarParticipantes === 'function') await renderizarParticipantes();
    if (typeof renderizarEquipos === 'function') await renderizarEquipos();
    if (typeof renderizarProyectos === 'function') await renderizarProyectos();
    if (typeof renderizarMentores === 'function') await renderizarMentores();
    if (typeof renderizarAsignaciones === 'function') await renderizarAsignaciones();
    if (typeof renderizarRanking === 'function') await renderizarRanking();
    if (typeof renderizarEvaluaciones === 'function') await renderizarEvaluaciones();
    if (typeof renderizarCronograma === 'function') await renderizarCronograma();
    if (typeof actualizarStats === 'function') await actualizarStats();
    if (typeof cargarSelectEventos === 'function') await cargarSelectEventos();
    if (typeof cargarSelectEquipos === 'function') await cargarSelectEquipos();
    if (typeof cargarSelectMentores === 'function') await cargarSelectMentores();
    if (typeof cargarSelectEquiposAsignacion === 'function') await cargarSelectEquiposAsignacion();
    if (typeof actualizarSelectEventosCronograma === 'function') await actualizarSelectEventosCronograma();
    if (typeof actualizarSelectProyectosEvaluacion === 'function') await actualizarSelectProyectosEvaluacion();
}

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================

// Eventos
window.agregarEvento = agregarEvento;
window.editarEvento = editarEvento;
window.guardarEvento = guardarEvento;
window.eliminarEvento = eliminarEvento;
window.renderizarEventos = renderizarEventos;

// Participantes
window.agregarParticipante = agregarParticipante;
window.editarParticipante = editarParticipante;
window.guardarParticipante = guardarParticipante;
window.cancelarEdicionParticipante = cancelarEdicionParticipante;
window.eliminarParticipante = eliminarParticipante;
window.renderizarParticipantes = renderizarParticipantes;

// Equipos
window.agregarEquipo = agregarEquipo;
window.editarEquipo = editarEquipo;
window.cancelarEdicionEquipo = cancelarEdicionEquipo;
window.guardarEquipo = guardarEquipo;
window.eliminarEquipo = eliminarEquipo;
window.renderizarEquipos = renderizarEquipos;
window.cargarSelectEventos = cargarSelectEventos;

// Proyectos
window.agregarProyecto = agregarProyecto;
window.editarProyecto = editarProyecto;
window.guardarProyecto = guardarProyecto;
window.cancelarEdicionProyecto = cancelarEdicionProyecto;
window.eliminarProyecto = eliminarProyecto;
window.renderizarProyectos = renderizarProyectos;
window.cargarSelectEquipos = cargarSelectEquipos;

// Evaluaciones
window.obtenerEvaluaciones = obtenerEvaluaciones;
window.actualizarSelectProyectosEvaluacion = actualizarSelectProyectosEvaluacion;
window.guardarEvaluacion = guardarEvaluacion;
window.editarEvaluacion = editarEvaluacion;
window.cancelarEdicionEvaluacion = cancelarEdicionEvaluacion;
window.eliminarEvaluacion = eliminarEvaluacion;
window.renderizarEvaluaciones = renderizarEvaluaciones;
window.renderizarResultados = renderizarResultados;
window.publicarResultados = publicarResultados;

// Mentores
window.agregarMentor = agregarMentor;
window.editarMentor = editarMentor;
window.guardarMentor = guardarMentor;
window.cancelarEdicionMentor = cancelarEdicionMentor;
window.eliminarMentor = eliminarMentor;
window.renderizarMentores = renderizarMentores;
window.cargarSelectMentores = cargarSelectMentores;
window.cargarSelectEquiposAsignacion = cargarSelectEquiposAsignacion;
window.asignarMentorEquipo = asignarMentorEquipo;
window.editarAsignacion = editarAsignacion;
window.cancelarEdicionAsignacion = cancelarEdicionAsignacion;
window.renderizarAsignaciones = renderizarAsignaciones;

// Actividades
window.obtenerActividades = obtenerActividades;
window.actualizarSelectEventosCronograma = actualizarSelectEventosCronograma;
window.agregarActividad = agregarActividad;
window.editarActividad = editarActividad;
window.cancelarEdicionActividad = cancelarEdicionActividad;
window.eliminarActividad = eliminarActividad;
window.renderizarCronograma = renderizarCronograma;

// Ranking y Stats
window.obtenerRanking = obtenerRanking;
window.renderizarRanking = renderizarRanking;
window.actualizarStats = actualizarStats;

// Historial
window.renderizarHistorial = renderizarHistorial;
window.verResultadosEvento = verResultadosEvento;

// Dashboard
window.renderizarDashboard = renderizarDashboard;

// Inicialización
window.inicializar = inicializar;

// ============================================
// INICIAR APLICACIÓN
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}
