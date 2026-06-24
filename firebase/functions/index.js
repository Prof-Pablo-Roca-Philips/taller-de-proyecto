const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google-cloud/generative-ai');
const express = require('express');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * evaluateSubmission
 * Recibe una entrega y la evalúa con Gemini
 */
app.post('/api/evaluate', async (req, res) => {
  try {
    const { submissionId, studentUid, unitNumber, content, rubricId } = req.body;

    if (!submissionId || !studentUid || !unitNumber || !content) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Obtener rúbrica
    const rubricDoc = await db.collection('rubrics')
      .doc(rubricId || `unit-${unitNumber}`)
      .get();

    if (!rubricDoc.exists) {
      return res.status(404).json({ error: 'Rúbrica no encontrada' });
    }

    const rubric = rubricDoc.data();
    const prompt = buildEvaluationPrompt(content, rubric, unitNumber);

    // Llamar a Gemini
    const result = await model.generateContent(prompt);
    const geminiFeedback = result.response.text();

    // Parsear feedback
    const evaluation = parseGeminiFeedback(geminiFeedback, rubric);

    // Guardar evaluación
    const evaluationRef = db.collection('evaluations').doc();
    await evaluationRef.set({
      submissionId,
      studentUid,
      unitNumber,
      geminiFeedback: evaluation.feedback,
      geminiScore: evaluation.score,
      rubricAlignment: evaluation.rubricScores,
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      modelVersion: 'gemini-1.5-flash'
    });

    // Actualizar submission
    await db.collection('submissions').doc(submissionId).update({
      status: 'evaluated',
      feedback: evaluation.feedback,
      score: evaluation.score,
      rubricScores: evaluation.rubricScores,
      evaluatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      evaluationId: evaluationRef.id,
      feedback: evaluation.feedback,
      score: evaluation.score,
      rubricScores: evaluation.rubricScores
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * saveSubmission
 */
app.post('/api/submission', async (req, res) => {
  try {
    const { studentUid, unitNumber, unitName, title, content, submit } = req.body;

    const submissionRef = db.collection('submissions').doc();
    await submissionRef.set({
      uid: studentUid,
      unitNumber,
      unitName,
      title,
      content,
      status: submit ? 'submitted' : 'draft',
      submittedAt: submit ? admin.firestore.FieldValue.serverTimestamp() : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, submissionId: submissionRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * getSubmissions
 */
app.get('/api/submissions/:studentUid', async (req, res) => {
  try {
    const { studentUid } = req.params;
    const snapshot = await db.collection('submissions')
      .where('uid', '==', studentUid)
      .orderBy('createdAt', 'desc')
      .get();

    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * getRubric
 */
app.get('/api/rubrics/:unitNumber', async (req, res) => {
  try {
    const { unitNumber } = req.params;
    const doc = await db.collection('rubrics').doc(`unit-${unitNumber}`).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Rúbrica no encontrada' });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funciones exportadas
exports.api = functions.https.onRequest(app);
