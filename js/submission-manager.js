/**
 * Gestor de entregas para el frontend
 */

class SubmissionManager {
  constructor(firebaseAuth) {
    this.auth = firebaseAuth;
  }

  createSubmissionForm(unitNumber, unitName) {
    const form = document.createElement('form');
    form.className = 'submission-form';
    form.innerHTML = `
      <fieldset>
        <legend>Enviar trabajo - Unidad ${unitNumber}</legend>
        
        <div class="form-group">
          <label for="title-${unitNumber}">Título del trabajo</label>
          <input type="text" id="title-${unitNumber}" name="title" required />
        </div>

        <div class="form-group">
          <label for="content-${unitNumber}">Tu respuesta / Trabajo</label>
          <textarea id="content-${unitNumber}" name="content" rows="10" required></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-save-draft" data-unit="${unitNumber}">Guardar como borrador</button>
          <button type="submit" class="btn-submit" data-unit="${unitNumber}">Enviar para evaluación</button>
        </div>
      </fieldset>

      <div class="form-message" style="display:none;"></div>
    `;

    form.addEventListener('submit', (e) => this.handleSubmit(e, unitNumber, unitName, false));
    form.querySelector('.btn-save-draft').addEventListener('click', (e) => this.handleSubmit(e, unitNumber, unitName, true));

    return form;
  }

  async handleSubmit(e, unitNumber, unitName, isDraft) {
    e.preventDefault();

    const form = e.target.closest('form');
    const title = form.querySelector('[name="title"]').value;
    const content = form.querySelector('[name="content"]').value;
    const messageDiv = form.querySelector('.form-message');

    if (!content.trim()) {
      this.showMessage(messageDiv, 'El contenido no puede estar vacío', 'error');
      return;
    }

    try {
      this.showMessage(messageDiv, isDraft ? 'Guardando borrador...' : 'Enviando para evaluación...', 'info');

      const result = await this.auth.submitWork({
        unitNumber,
        unitName,
        title,
        content,
        submit: !isDraft
      });

      if (result.success) {
        if (!isDraft) {
          this.showMessage(messageDiv, 'Entrega enviada. Evaluando...', 'success');
          await this.requestEvaluation(result.submissionId, unitNumber, content);
        } else {
          this.showMessage(messageDiv, 'Borrador guardado correctamente', 'success');
        }
        form.reset();
      }
    } catch (error) {
      this.showMessage(messageDiv, `Error: ${error.message}`, 'error');
    }
  }

  async requestEvaluation(submissionId, unitNumber, content) {
    try {
      const result = await this.auth.requestEvaluation(submissionId, unitNumber, content);
      if (result.success) {
        this.displayFeedback(result);
      }
    } catch (error) {
      console.error('Error en evaluación:', error);
    }
  }

  displayFeedback(evaluation) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'evaluation-feedback';
    feedbackDiv.innerHTML = `
      <div class="feedback-header">
        <h3>Evaluación completada</h3>
        <div class="score-badge">${evaluation.score}/100</div>
      </div>
      <div class="feedback-content">
        <h4>Feedback:</h4>
        <p>${evaluation.feedback.replace(/\n/g, '<br>')}</p>
      </div>
    `;
    
    const container = document.querySelector('.submission-form-container');
    if (container) container.appendChild(feedbackDiv);
  }

  showMessage(element, text, type) {
    element.textContent = text;
    element.className = `form-message ${type}`;
    element.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => element.style.display = 'none', 5000);
    }
  }
}
