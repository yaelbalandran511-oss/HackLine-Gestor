// Storage abstraction layer - replaces all backend API calls
// All data is stored in localStorage

const DB = {
  _fallbackStorage: {},
  storageAvailable: null,

  /** Comprueba si localStorage está disponible en el navegador */
  isStorageAvailable() {
    if (this.storageAvailable !== null) {
      return this.storageAvailable;
    }

    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      this.storageAvailable = true;
    } catch (error) {
      console.warn('localStorage no está disponible. Se usará almacenamiento en memoria temporal.', error);
      this.storageAvailable = false;
    }

    return this.storageAvailable;
  },

  getRawItem(key) {
    if (this.isStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return this._fallbackStorage[key] ?? null;
  },

  setRawItem(key, value) {
    if (this.isStorageAvailable()) {
      localStorage.setItem(key, value);
    } else {
      this._fallbackStorage[key] = value;
    }
  },

  safeParseJSON(value) {
    if (value === null || value === undefined || value === '') {
      return [];
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('DB.safeParseJSON fallo:', error);
      return [];
    }
  },

  readArray(key) {
    const raw = this.getRawItem(key);
    const parsed = this.safeParseJSON(raw);
    return Array.isArray(parsed) ? parsed : [];
  },

  writeArray(key, array) {
    if (!Array.isArray(array)) {
      array = [];
    }
    this.setRawItem(key, JSON.stringify(array));
  },

  // Initialize default data if it doesn't exist
  init() {
    const keys = ['eventos', 'participantes', 'equipos', 'proyectos', 'evaluaciones', 'mentores', 'actividades'];
    keys.forEach(key => {
      const raw = this.getRawItem(key);
      const parsed = this.safeParseJSON(raw);
      if (raw === null || !Array.isArray(parsed)) {
        this.writeArray(key, []);
      }
    });
  },

  // ============================================
  // EVENTOS
  // ============================================
  obtenerEventos() {
    return this.readArray('eventos');
  },

  obtenerEventoPorId(id) {
    const eventos = this.obtenerEventos();
    return eventos.find(e => e.id_evento == id || e.id == id) || null;
  },

  agregarEvento(evento) {
    const eventos = this.obtenerEventos();
    const maxId = eventos.length > 0 ? Math.max(...eventos.map(e => e.id_evento || 0)) : 0;
    evento.id_evento = maxId + 1;
    eventos.push(evento);
    this.writeArray('eventos', eventos);
    return evento;
  },

  actualizarEvento(id, datos) {
    let eventos = this.obtenerEventos();
    eventos = eventos.map(e => e.id_evento == id ? { ...e, ...datos, id_evento: id } : e);
    this.writeArray('eventos', eventos);
    return eventos.find(e => e.id_evento == id);
  },

  eliminarEvento(id) {
    let eventos = this.obtenerEventos();
    eventos = eventos.filter(e => e.id_evento != id);
    this.writeArray('eventos', eventos);
    
    // Eliminar equipos y actividades asociadas
    this.eliminarEquiposPorEvento(id);
    this.eliminarActividadesPorEvento(id);
  },

  // ============================================
  // PARTICIPANTES
  // ============================================
  obtenerParticipantes() {
    return this.readArray('participantes');
  },

  obtenerParticipantePorId(id) {
    const participantes = this.obtenerParticipantes();
    return participantes.find(p => p.id_part == id || p.id == id) || null;
  },

  agregarParticipante(participante) {
    const participantes = this.obtenerParticipantes();
    const maxId = participantes.length > 0 ? Math.max(...participantes.map(p => p.id_part || 0)) : 0;
    participante.id_part = maxId + 1;
    participante.id = participante.id_part;
    participantes.push(participante);
    this.writeArray('participantes', participantes);
    return participante;
  },

  actualizarParticipante(id, datos) {
    let participantes = this.obtenerParticipantes();
    participantes = participantes.map(p => 
      (p.id_part == id || p.id == id) ? { ...p, ...datos } : p
    );
    this.writeArray('participantes', participantes);
    return participantes.find(p => p.id_part == id || p.id == id);
  },

  eliminarParticipante(id) {
    let participantes = this.obtenerParticipantes();
    participantes = participantes.filter(p => p.id_part != id && p.id != id);
    this.writeArray('participantes', participantes);
  },

  // ============================================
  // EQUIPOS
  // ============================================
  obtenerEquipos() {
    return this.readArray('equipos');
  },

  obtenerEquipoPorId(id) {
    const equipos = this.obtenerEquipos();
    return equipos.find(e => e.id_equipo == id || e.id == id) || null;
  },

  agregarEquipo(equipo) {
    const equipos = this.obtenerEquipos();
    const maxId = equipos.length > 0 ? Math.max(...equipos.map(e => e.id_equipo || 0)) : 0;
    equipo.id_equipo = maxId + 1;
    equipo.id = equipo.id_equipo;
    equipos.push(equipo);
    this.writeArray('equipos', equipos);
    return equipo;
  },

  actualizarEquipo(id, datos) {
    let equipos = this.obtenerEquipos();
    equipos = equipos.map(e => 
      (e.id_equipo == id || e.id == id) ? { ...e, ...datos } : e
    );
    this.writeArray('equipos', equipos);
    return equipos.find(e => e.id_equipo == id || e.id == id);
  },

  eliminarEquipo(id) {
    let equipos = this.obtenerEquipos();
    equipos = equipos.filter(e => e.id_equipo != id && e.id != id);
    this.writeArray('equipos', equipos);
    
    // Eliminar proyectos asociados
    this.eliminarProyectosPorEquipo(id);
  },

  eliminarEquiposPorEvento(idEvento) {
    let equipos = this.obtenerEquipos();
    const equiposAEliminar = equipos.filter(e => e.id_evento == idEvento).map(e => e.id_equipo || e.id);
    equipos = equipos.filter(e => e.id_evento != idEvento);
    this.writeArray('equipos', equipos);
    
    equiposAEliminar.forEach(id => this.eliminarProyectosPorEquipo(id));
  },

  asignarMentorEquipo(equipoId, mentorId) {
    return this.actualizarEquipo(equipoId, { id_mentor: mentorId });
  },

  // ============================================
  // PROYECTOS
  // ============================================
  obtenerProyectos() {
    return this.readArray('proyectos');
  },

  obtenerProyectoPorId(id) {
    const proyectos = this.obtenerProyectos();
    return proyectos.find(p => p.id_proy == id || p.id_proyecto == id) || null;
  },

  agregarProyecto(proyecto) {
    const proyectos = this.obtenerProyectos();
    const maxId = proyectos.length > 0 ? Math.max(...proyectos.map(p => p.id_proy || 0)) : 0;
    proyecto.id_proy = maxId + 1;
    proyecto.id_proyecto = proyecto.id_proy;
    proyectos.push(proyecto);
    this.writeArray('proyectos', proyectos);
    return proyecto;
  },

  actualizarProyecto(id, datos) {
    let proyectos = this.obtenerProyectos();
    proyectos = proyectos.map(p => 
      (p.id_proy == id || p.id_proyecto == id) ? { ...p, ...datos } : p
    );
    this.writeArray('proyectos', proyectos);
    return proyectos.find(p => p.id_proy == id || p.id_proyecto == id);
  },

  eliminarProyecto(id) {
    let proyectos = this.obtenerProyectos();
    proyectos = proyectos.filter(p => p.id_proy != id && p.id_proyecto != id);
    this.writeArray('proyectos', proyectos);
    
    // Eliminar evaluaciones asociadas
    this.eliminarEvaluacionesPorProyecto(id);
  },

  eliminarProyectosPorEquipo(idEquipo) {
    let proyectos = this.obtenerProyectos();
    const proyectosAEliminar = proyectos.filter(p => p.id_equipo == idEquipo).map(p => p.id_proy || p.id_proyecto);
    proyectos = proyectos.filter(p => p.id_equipo != idEquipo);
    this.writeArray('proyectos', proyectos);
    
    proyectosAEliminar.forEach(id => this.eliminarEvaluacionesPorProyecto(id));
  },

  // ============================================
  // MENTORES
  // ============================================
  obtenerMentores() {
    return this.readArray('mentores');
  },

  obtenerMentorPorId(id) {
    const mentores = this.obtenerMentores();
    return mentores.find(m => m.id_mentor == id || m.id == id) || null;
  },

  agregarMentor(mentor) {
    const mentores = this.obtenerMentores();
    const maxId = mentores.length > 0 ? Math.max(...mentores.map(m => m.id_mentor || 0)) : 0;
    mentor.id_mentor = maxId + 1;
    mentor.id = mentor.id_mentor;
    mentores.push(mentor);
    this.writeArray('mentores', mentores);
    return mentor;
  },

  actualizarMentor(id, datos) {
    let mentores = this.obtenerMentores();
    mentores = mentores.map(m => 
      (m.id_mentor == id || m.id == id) ? { ...m, ...datos } : m
    );
    this.writeArray('mentores', mentores);
    return mentores.find(m => m.id_mentor == id || m.id == id);
  },

  eliminarMentor(id) {
    let mentores = this.obtenerMentores();
    mentores = mentores.filter(m => m.id_mentor != id && m.id != id);
    this.writeArray('mentores', mentores);
  },

  // ============================================
  // EVALUACIONES
  // ============================================
  obtenerEvaluaciones() {
    return this.readArray('evaluaciones');
  },

  obtenerEvaluacionPorId(id) {
    const evaluaciones = this.obtenerEvaluaciones();
    return evaluaciones.find(e => e.id_eval == id || e.id == id) || null;
  },

  agregarEvaluacion(evaluacion) {
    const evaluaciones = this.obtenerEvaluaciones();
    const maxId = evaluaciones.length > 0 ? Math.max(...evaluaciones.map(e => e.id_eval || 0)) : 0;
    evaluacion.id_eval = maxId + 1;
    evaluacion.id = evaluacion.id_eval;
    evaluaciones.push(evaluacion);
    this.writeArray('evaluaciones', evaluaciones);
    return evaluacion;
  },

  actualizarEvaluacion(id, datos) {
    let evaluaciones = this.obtenerEvaluaciones();
    evaluaciones = evaluaciones.map(e => 
      (e.id_eval == id || e.id == id) ? { ...e, ...datos } : e
    );
    this.writeArray('evaluaciones', evaluaciones);
    return evaluaciones.find(e => e.id_eval == id || e.id == id);
  },

  eliminarEvaluacion(id) {
    let evaluaciones = this.obtenerEvaluaciones();
    evaluaciones = evaluaciones.filter(e => e.id_eval != id && e.id != id);
    this.writeArray('evaluaciones', evaluaciones);
  },

  eliminarEvaluacionesPorProyecto(idProyecto) {
    let evaluaciones = this.obtenerEvaluaciones();
    evaluaciones = evaluaciones.filter(e => e.id_proy != idProyecto && e.id_proyecto != idProyecto);
    this.writeArray('evaluaciones', evaluaciones);
  },

  // ============================================
  // ACTIVIDADES (Cronograma)
  // ============================================
  obtenerActividades() {
    return this.readArray('actividades');
  },

  obtenerActividadPorId(id) {
    const actividades = this.obtenerActividades();
    return actividades.find(a => a.id_actividad == id || a.id == id) || null;
  },

  agregarActividad(actividad) {
    const actividades = this.obtenerActividades();
    const maxId = actividades.length > 0 ? Math.max(...actividades.map(a => a.id_actividad || 0)) : 0;
    actividad.id_actividad = maxId + 1;
    actividad.id = actividad.id_actividad;
    actividades.push(actividad);
    this.writeArray('actividades', actividades);
    return actividad;
  },

  actualizarActividad(id, datos) {
    let actividades = this.obtenerActividades();
    actividades = actividades.map(a => 
      (a.id_actividad == id || a.id == id) ? { ...a, ...datos } : a
    );
    this.writeArray('actividades', actividades);
    return actividades.find(a => a.id_actividad == id || a.id == id);
  },

  eliminarActividad(id) {
    let actividades = this.obtenerActividades();
    actividades = actividades.filter(a => a.id_actividad != id && a.id != id);
    this.writeArray('actividades', actividades);
  },

  eliminarActividadesPorEvento(idEvento) {
    let actividades = this.obtenerActividades();
    actividades = actividades.filter(a => a.id_evento != idEvento);
    this.writeArray('actividades', actividades);
  },

  // ============================================
  // RANKING
  // ============================================
  obtenerRanking() {
    const evaluaciones = this.obtenerEvaluaciones();
    const proyectos = this.obtenerProyectos();
    const equipos = this.obtenerEquipos();
    
    const ranking = {};
    evaluaciones.forEach(ev => {
      const idProyecto = ev.id_proy || ev.id_proyecto;
      if (!ranking[idProyecto]) {
        ranking[idProyecto] = {
          id_proy: idProyecto,
          puntajes: [],
          proyecto_nombre: '',
          equipo_nombre: ''
        };
      }
      const promedio = (parseFloat(ev.innovacion || 0) + 
                       parseFloat(ev.complejidad || 0) + 
                       parseFloat(ev.presentacion || 0) + 
                       parseFloat(ev.impacto || 0)) / 4;
      ranking[idProyecto].puntajes.push(promedio);
    });

    const resultado = Object.values(ranking).map(r => {
      const proyecto = proyectos.find(p => (p.id_proy || p.id_proyecto) === r.id_proy);
      const idEquipo = proyecto ? (proyecto.id_equipo || proyecto.id) : null;
      const equipo = idEquipo ? equipos.find(e => (e.id_equipo || e.id) === idEquipo) : null;
      
      const promedio = r.puntajes.length > 0 
        ? r.puntajes.reduce((a, b) => a + b, 0) / r.puntajes.length 
        : 0;

      return {
        ...r,
        proyecto_nombre: proyecto?.nombre || `Proyecto ${r.id_proy}`,
        equipo_nombre: equipo?.nombre || 'Sin equipo',
        promedio: promedio.toFixed(2)
      };
    }).sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio));

    return resultado;
  }
};

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    DB.init();
  });
} else {
  DB.init();
}
