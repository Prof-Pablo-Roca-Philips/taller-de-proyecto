# Firebase Backend - Taller de Proyecto

Sistema de evaluación automática con Gemini API.

## Estructura

```
firebase/
├── functions/          # Cloud Functions (Node.js)
│   ├── index.js       # Endpoints: /api/submission, /api/evaluate, etc
│   └── package.json
├── config/
│   ├── firebase-auth.js    # Clase de autenticación frontend
│   └── rubrics.js          # Rúbricas por defecto
├── .firebaserc         # Configuración del proyecto
└── firestore.rules     # Reglas de seguridad
```

## Setup

### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. Instalar dependencias

```bash
cd firebase/functions
npm install
```

### 3. Obtener API key de Gemini

1. Ir a https://aistudio.google.com/app/apikeys
2. Crear una nueva clave API
3. Configurar en Firebase:
   ```bash
   firebase functions:config:set gemini.api_key="TU_CLAVE"
   ```

### 4. Deploy

```bash
# Deploying functions
firebase deploy --only functions

# O solo Firestore rules
firebase deploy --only firestore:rules
```

## Endpoints

### POST /api/submission
Guardar o actualizar una entrega de alumno.

```json
{
  "studentUid": "uid-del-alumno",
  "unitNumber": 1,
  "unitName": "La Ingeniería empieza Entendiendo",
  "title": "Mi análisis",
  "content": "Contenido del trabajo",
  "submit": true
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "id-generado"
}
```

### POST /api/evaluate
Evaluar una entrega con Gemini.

```json
{
  "submissionId": "id-de-la-entrega",
  "studentUid": "uid-del-alumno",
  "unitNumber": 1,
  "content": "Contenido a evaluar",
  "rubricId": "unit-1"
}
```

**Response:**
```json
{
  "success": true,
  "evaluationId": "id-generado",
  "feedback": "Feedback de Gemini",
  "score": 85,
  "rubricScores": {
    "Comprensión conceptual": 25,
    "Análisis del problema": 28,
    ...
  }
}
```

### GET /api/submissions/:studentUid
Obtener todas las entregas de un alumno.

**Response:**
```json
[
  {
    "id": "submission-id",
    "unitNumber": 1,
    "title": "Mi análisis",
    "status": "evaluated",
    "score": 85,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### GET /api/rubrics/:unitNumber
Obtener rúbrica de una unidad.

**Response:**
```json
{
  "unitNumber": 1,
  "unitName": "La Ingeniería empieza Entendiendo",
  "totalPoints": 100,
  "criteria": [
    {
      "name": "Comprensión conceptual",
      "description": "...",
      "maxPoints": 30
    }
  ]
}
```

## Rúbricas

Las rúbricas están definidas en `config/rubrics.js` y deben ser importadas a Firestore antes de que los alumnos puedan enviar trabajo.

Para cargar rúbricas por defecto, ejecutar desde el proyecto:
```bash
node scripts/init-rubrics.js
```

## Seguridad

- Autenticación via Google OAuth2
- Reglas Firestore: cada usuario solo ve sus datos
- Tokens JWT validados en cada request
- API key de Gemini almacenada en Firebase Environment Config

Ver `firestore.rules` para detalles.

## Próximos pasos

- [ ] Deploy a producción
- [ ] Crear panel de docente
- [ ] Tests automatizados
- [ ] Historial de versiones de entregas
