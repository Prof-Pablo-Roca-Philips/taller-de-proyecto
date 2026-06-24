/**
 * Rúbricas de evaluación automática por unidad
 */

const DEFAULT_RUBRICS = {
  1: {
    unitNumber: 1,
    unitName: 'La Ingeniería empieza Entendiendo',
    totalPoints: 100,
    criteria: [
      {
        name: 'Comprensión conceptual',
        description: 'Demuestra entendimiento de conceptos base de ingeniería',
        maxPoints: 30
      },
      {
        name: 'Análisis del problema',
        description: 'Identifica y analiza correctamente el problema planteado',
        maxPoints: 30
      },
      {
        name: 'Presentación y claridad',
        description: 'Presenta ideas de forma clara y ordenada',
        maxPoints: 20
      },
      {
        name: 'Originalidad y pensamiento crítico',
        description: 'Aporta perspectivas propias y análisis crítico',
        maxPoints: 20
      }
    ]
  },
  2: {
    unitNumber: 2,
    unitName: 'Preguntas Disparadoras',
    totalPoints: 100,
    criteria: [
      {
        name: 'Transformación de problema',
        description: 'Convierte adecuadamente un problema vago en técnico',
        maxPoints: 35
      },
      {
        name: 'Definición de objetivos',
        description: 'Establece objetivos claros y medibles',
        maxPoints: 25
      },
      {
        name: 'Alcance y limitaciones',
        description: 'Define correctamente el alcance del proyecto',
        maxPoints: 20
      },
      {
        name: 'Documentación',
        description: 'Organización lógica y documentación completa',
        maxPoints: 20
      }
    ]
  }
};

module.exports = DEFAULT_RUBRICS;
