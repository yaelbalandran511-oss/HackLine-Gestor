const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================
// INICIALIZACIÓN DE TABLAS
// ============================================

async function inicializarTablaNotificaciones() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notificaciones_ignoradas (
                id SERIAL PRIMARY KEY,
                id_evento INTEGER NOT NULL UNIQUE,
                fecha_ignorada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_evento) REFERENCES eventos(id_evento) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla notificaciones_ignoradas inicializada');
    } catch (err) {
        console.error('❌ Error al crear tabla notificaciones_ignoradas:', err.message);
    }
}

async function inicializarTablaActividades() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS actividades (
                id_actividad SERIAL PRIMARY KEY,
                id_evento INTEGER NOT NULL,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT,
                fecha_hora TIMESTAMP NOT NULL,
                ubicacion VARCHAR(255),
                FOREIGN KEY (id_evento) REFERENCES eventos(id_evento) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla actividades inicializada');
    } catch (err) {
        console.error('❌ Error al crear tabla actividades:', err.message);
    }
}

async function inicializarColumnaMentorEnEquipos() {
    try {
        await db.query(`ALTER TABLE equipos ADD COLUMN IF NOT EXISTS id_mentor INTEGER`);
        console.log('✅ Columna id_mentor en equipos asegurada');
    } catch (err) {
        console.error('❌ Error al asegurar columna id_mentor en equipos:', err.message);
    }
}

// ============================================
// RUTAS DE PRUEBA
// ============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================
// ================ EVENTOS ==================
// ============================================

// Obtener todos los eventos
app.get('/api/eventos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM eventos ORDER BY id_evento');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Obtener un evento por ID
app.get('/api/eventos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM eventos WHERE id_evento = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Crear un evento
app.post('/api/eventos', async (req, res) => {
    try {
        const { nombre, fecha_inicio, fecha_fin, lugar, descripcion, cupo_maximo, estado } = req.body;
        const result = await db.query(
            `INSERT INTO eventos (nombre, fecha_inicio, fecha_fin, lugar, descripcion, cupo_maximo, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [nombre, fecha_inicio, fecha_fin, lugar, descripcion, cupo_maximo || 50, estado || 'proximo']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar un evento
app.put('/api/eventos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, fecha_inicio, fecha_fin, lugar, descripcion, cupo_maximo, estado } = req.body;
        const result = await db.query(
            `UPDATE eventos SET nombre = $1, fecha_inicio = $2, fecha_fin = $3, lugar = $4, descripcion = $5, cupo_maximo = $6, estado = COALESCE($7, estado)
             WHERE id_evento = $8 RETURNING *`,
            [nombre, fecha_inicio, fecha_fin, lugar, descripcion, cupo_maximo || 50, estado || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar un evento
app.delete('/api/eventos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM eventos WHERE id_evento = $1', [id]);
        res.json({ message: 'Evento eliminado' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================ PARTICIPANTES =============
// ============================================

app.get('/api/participantes', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM participantes ORDER BY id_part');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/participantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM participantes WHERE id_part = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Participante no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/participantes', async (req, res) => {
    try {
        const { nombre, email, password_hash, habilidades } = req.body;
        const result = await db.query(
            `INSERT INTO participantes (nombre, email, password_hash, habilidades)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, email, password_hash || 'temp123', habilidades || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/participantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, habilidades } = req.body;
        const result = await db.query(
            `UPDATE participantes SET nombre = $1, email = $2, habilidades = $3 WHERE id_part = $4 RETURNING *`,
            [nombre, email, habilidades || '', id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Participante no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/participantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM participantes WHERE id_part = $1', [id]);
        res.json({ message: 'Participante eliminado' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================= EQUIPOS ==================
// ============================================

app.get('/api/equipos', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT e.*, ev.nombre as evento_nombre 
            FROM equipos e 
            JOIN eventos ev ON e.id_evento = ev.id_evento 
            ORDER BY e.id_equipo
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM equipos WHERE id_equipo = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, id_evento, activo } = req.body;
        const result = await db.query(
            `INSERT INTO equipos (nombre, id_evento, activo) VALUES ($1, $2, $3) RETURNING *`,
            [nombre, id_evento, activo !== false]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, id_evento, activo } = req.body;
        const result = await db.query(
            `UPDATE equipos SET nombre = $1, id_evento = $2, activo = $3 WHERE id_equipo = $4 RETURNING *`,
            [nombre, id_evento, activo !== false, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM equipos WHERE id_equipo = $1', [id]);
        res.json({ message: 'Equipo eliminado' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/equipos/:id/mentor', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_mentor } = req.body;
        const mentorId = id_mentor ? parseInt(id_mentor, 10) : null;

        if (mentorId !== null) {
            const mentorCheck = await db.query('SELECT id_mentor FROM mentores WHERE id_mentor = $1', [mentorId]);
            if (mentorCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Mentor no encontrado' });
            }
        }

        const result = await db.query(
            'UPDATE equipos SET id_mentor = $1 WHERE id_equipo = $2 RETURNING *',
            [mentorId, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================= PROYECTOS ================
// ============================================

app.get('/api/proyectos', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, e.nombre as equipo_nombre
            FROM proyectos p
            LEFT JOIN equipos e ON p.id_equipo = e.id_equipo
            ORDER BY p.id_proy
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/proyectos', async (req, res) => {
    try {
        const { nombre, descripcion, tecnologias, repo_url, id_equipo, estado } = req.body;
        const result = await db.query(
            `INSERT INTO proyectos (nombre, descripcion, tecnologias, repo_url, id_equipo, estado)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nombre, descripcion || '', tecnologias || '', repo_url || '', id_equipo, estado || 'registrado']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/proyectos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM proyectos WHERE id_proy = $1', [id]);
        res.json({ message: 'Proyecto eliminado' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================ EVALUACIONES ==============
// ============================================

// ============================================
// ================ EVALUACIONES ==============
// ============================================

// OBTENER todas las evaluaciones
app.get('/api/evaluaciones', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT ev.*, p.nombre as proyecto_nombre, e.nombre as equipo_nombre, j.nombre as juez_nombre
            FROM evaluaciones ev
            JOIN proyectos p ON ev.id_proy = p.id_proy
            LEFT JOIN equipos e ON p.id_equipo = e.id_equipo
            LEFT JOIN jueces j ON ev.id_juez = j.id_juez
            ORDER BY ev.id_eval DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en GET /api/evaluaciones:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// OBTENER una evaluación por ID
app.get('/api/evaluaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT ev.*, p.nombre as proyecto_nombre, e.nombre as equipo_nombre, j.nombre as juez_nombre
            FROM evaluaciones ev
            JOIN proyectos p ON ev.id_proy = p.id_proy
            LEFT JOIN equipos e ON p.id_equipo = e.id_equipo
            LEFT JOIN jueces j ON ev.id_juez = j.id_juez
            WHERE ev.id_eval = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error en GET /api/evaluaciones/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// CREAR evaluación (POST)
app.post('/api/evaluaciones', async (req, res) => {
    console.log('📝 POST /api/evaluaciones - Body:', req.body);
    try {
        const { id_proy, juez, innovacion, complejidad, presentacion, impacto, comentarios } = req.body;
        
        if (!id_proy) {
            return res.status(400).json({ error: 'id_proy es requerido' });
        }
        if (!juez) {
            return res.status(400).json({ error: 'juez es requerido' });
        }
        if (innovacion === undefined || innovacion === null) {
            return res.status(400).json({ error: 'innovacion es requerido' });
        }
        if (complejidad === undefined || complejidad === null) {
            return res.status(400).json({ error: 'complejidad es requerido' });
        }
        if (presentacion === undefined || presentacion === null) {
            return res.status(400).json({ error: 'presentacion es requerido' });
        }
        if (impacto === undefined || impacto === null) {
            return res.status(400).json({ error: 'impacto es requerido' });
        }

        // Verificar proyecto
        const proyectoResult = await db.query('SELECT id_proy FROM proyectos WHERE id_proy = $1', [id_proy]);
        if (proyectoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        // Buscar o crear juez
        const juezResult = await db.query('SELECT id_juez FROM jueces WHERE nombre = $1', [juez.trim()]);
        let id_juez;
        if (juezResult.rows.length > 0) {
            id_juez = juezResult.rows[0].id_juez;
        } else {
            const sanitizedEmail = `${juez.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@hackline.local`;
            const newJuezResult = await db.query(
                'INSERT INTO jueces (nombre, email, institucion) VALUES ($1, $2, $3) RETURNING id_juez',
                [juez.trim(), sanitizedEmail, '']
            );
            id_juez = newJuezResult.rows[0].id_juez;
        }

        const promedio = Number(((Number(innovacion) + Number(complejidad) + Number(presentacion) + Number(impacto)) / 4).toFixed(2));

        const result = await db.query(
            `INSERT INTO evaluaciones (id_proy, id_juez, innovacion, complejidad, presentacion, impacto, promedio, comentarios, fecha_eval)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
             RETURNING *`,
            [id_proy, id_juez, innovacion, complejidad, presentacion, impacto, promedio, comentarios || '']
        );

        console.log('✅ Evaluación creada:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error en POST /api/evaluaciones:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ACTUALIZAR evaluación (PUT)
app.put('/api/evaluaciones/:id', async (req, res) => {
    console.log('📝 PUT /api/evaluaciones/' + req.params.id + ' - Body:', req.body);
    try {
        const { id } = req.params;
        const { id_proy, juez, innovacion, complejidad, presentacion, impacto, comentarios } = req.body;
        
        // Validar datos
        if (innovacion === undefined || innovacion === null) {
            return res.status(400).json({ error: 'innovacion es requerido' });
        }
        if (complejidad === undefined || complejidad === null) {
            return res.status(400).json({ error: 'complejidad es requerido' });
        }
        if (presentacion === undefined || presentacion === null) {
            return res.status(400).json({ error: 'presentacion es requerido' });
        }
        if (impacto === undefined || impacto === null) {
            return res.status(400).json({ error: 'impacto es requerido' });
        }
        
        // Buscar o crear el juez
        let id_juez;
        if (juez) {
            const juezResult = await db.query('SELECT id_juez FROM jueces WHERE nombre = $1', [juez.trim()]);
            if (juezResult.rows.length > 0) {
                id_juez = juezResult.rows[0].id_juez;
            } else {
                const sanitizedEmail = `${juez.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@hackline.local`;
                const newJuezResult = await db.query(
                    'INSERT INTO jueces (nombre, email, institucion) VALUES ($1, $2, $3) RETURNING id_juez',
                    [juez.trim(), sanitizedEmail, '']
                );
                id_juez = newJuezResult.rows[0].id_juez;
            }
        } else {
            const currentEval = await db.query('SELECT id_juez FROM evaluaciones WHERE id_eval = $1', [id]);
            if (currentEval.rows.length === 0) {
                return res.status(404).json({ error: 'Evaluación no encontrada' });
            }
            id_juez = currentEval.rows[0].id_juez;
        }
        
        const promedio = Number(((Number(innovacion) + Number(complejidad) + Number(presentacion) + Number(impacto)) / 4).toFixed(2));
        
        const result = await db.query(
            `UPDATE evaluaciones 
             SET innovacion = $1, complejidad = $2, presentacion = $3, impacto = $4, 
                 promedio = $5, comentarios = $6, id_juez = $7, fecha_eval = CURRENT_DATE
             WHERE id_eval = $8 RETURNING *`,
            [innovacion, complejidad, presentacion, impacto, promedio, comentarios || '', id_juez, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }
        
        console.log('✅ Evaluación actualizada:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error actualizando evaluación:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ELIMINAR evaluación (DELETE)
app.delete('/api/evaluaciones/:id', async (req, res) => {
    console.log('📝 DELETE /api/evaluaciones/' + req.params.id);
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM evaluaciones WHERE id_eval = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }
        console.log('✅ Evaluación eliminada:', result.rows[0]);
        res.json({ message: 'Evaluación eliminada correctamente' });
    } catch (err) {
        console.error('❌ Error eliminando evaluación:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================= MENTORES =================
// ============================================

app.get('/api/mentores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM mentores ORDER BY id_mentor');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mentores', async (req, res) => {
    try {
        const { nombre, email, especialidad, telefono } = req.body;
        const result = await db.query(
            `INSERT INTO mentores (nombre, email, especialidad, telefono)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, email, especialidad || '', telefono || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/mentores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, especialidad, telefono } = req.body;
        const result = await db.query(
            `UPDATE mentores SET nombre = $1, email = $2, especialidad = $3, telefono = $4 WHERE id_mentor = $5 RETURNING *`,
            [nombre, email, especialidad || '', telefono || '', id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Mentor no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/mentores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM mentores WHERE id_mentor = $1', [id]);
        res.json({ message: 'Mentor eliminado' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================= RANKING ==================
// ============================================

app.get('/api/ranking', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                p.id_proy,
                p.nombre AS proyecto_nombre,
                e.nombre AS equipo_nombre,
                COALESCE(AVG(ev.promedio), 0) AS promedio
            FROM proyectos p
            LEFT JOIN equipos e ON p.id_equipo = e.id_equipo
            LEFT JOIN evaluaciones ev ON p.id_proy = ev.id_proy
            GROUP BY p.id_proy, p.nombre, e.nombre
            ORDER BY promedio DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================ ACTIVIDADES ===============
// ============================================

// Obtener todas las actividades
app.get('/api/actividades', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, e.nombre as evento_nombre
            FROM actividades a
            JOIN eventos e ON a.id_evento = e.id_evento
            ORDER BY a.fecha_hora ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en GET /api/actividades:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Crear una actividad
app.post('/api/actividades', async (req, res) => {
    console.log('📝 POST /api/actividades - Body:', req.body);
    try {
        const { id_evento, nombre, descripcion, fecha_hora, ubicacion } = req.body;
        
        if (!id_evento) return res.status(400).json({ error: 'id_evento es requerido' });
        if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
        if (!fecha_hora) return res.status(400).json({ error: 'fecha_hora es requerido' });
        
        const result = await db.query(
            `INSERT INTO actividades (id_evento, nombre, descripcion, fecha_hora, ubicacion)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_evento, nombre, descripcion || '', fecha_hora, ubicacion || '']
        );
        
        console.log('✅ Actividad creada:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error en POST /api/actividades:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar una actividad
app.delete('/api/actividades/:id', async (req, res) => {
    console.log('📝 DELETE /api/actividades/' + req.params.id);
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM actividades WHERE id_actividad = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actividad no encontrada' });
        }
        res.json({ message: 'Actividad eliminada' });
    } catch (err) {
        console.error('❌ Error eliminando actividad:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================ NOTIFICACIONES ============
// ============================================

app.get('/api/notificaciones-ignoradas', async (req, res) => {
    try {
        const result = await db.query('SELECT id_evento FROM notificaciones_ignoradas');
        res.json(result.rows.map(r => r.id_evento));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notificaciones-ignoradas', async (req, res) => {
    try {
        const { id_evento } = req.body;
        await db.query(
            'INSERT INTO notificaciones_ignoradas (id_evento) VALUES ($1) ON CONFLICT (id_evento) DO NOTHING',
            [id_evento]
        );
        res.json({ message: 'Notificación ignorada' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notificaciones-ignoradas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM notificaciones_ignoradas WHERE id_evento = $1', [id]);
        res.json({ message: 'Notificación restaurada' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ================ FRONTEND ==================
// ============================================

app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Ruta para páginas individuales
app.get('/:page.html', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '../frontend', `${page}.html`);
    res.sendFile(filePath);
});

// ============================================
// ================ INICIAR SERVIDOR ==========
// ============================================

app.listen(PORT, async () => {
    await inicializarTablaNotificaciones();
    await inicializarTablaActividades();
    await inicializarColumnaMentorEnEquipos();
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`API eventos: http://localhost:${PORT}/api/eventos`);
    console.log(`API equipos: http://localhost:${PORT}/api/equipos`);
    console.log(`Prueba: http://localhost:${PORT}/api/test`);
});