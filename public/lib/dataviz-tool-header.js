// =========================================================================
// UI Component: Tool-specific Sub-Header (Web Component Standard)
//
// HOW TO USE:
// 1. Include this script in your tool's HTML file:
//    <script src="https://auth.dataviz.jp/lib/dataviz-tool-header.js"></script>
//
// 2. Place the component tag where you want the sub-header to appear:
//    <dataviz-tool-header></dataviz-tool-header>
//
// 3. In your tool's main JavaScript, get the component and pass your configuration:
//    const header = document.querySelector('dataviz-tool-header');
//    if (header) {
//      header.setConfig({
//        logoUrl: '/path/to/your/tool-logo.png', // Optional: URL for the tool's logo image
//        buttons: [
//          {
//            label: 'Load Sample Data',
//            action: () => { console.log('Loading sample data...'); },
//            type: 'button'
//          },
//          {
//            label: 'Export as JSON',
//            action: () => { console.log('Exporting...'); },
//            type: 'button'
//          },
//          {
//            label: 'Help',
//            type: 'link',
//            href: '/help.html'
//          }
//        ]
//      });
//
//      // To display a toast message
//      header.showMessage('プロジェクトが正常に保存されました！', 'success');
//      header.showMessage('プロジェクトの読み込みに失敗しました。', 'error', 5000);
//    }
//
// 4. (Optional) Project management — load/save modals with Supabase:
//    header.setProjectConfig({
//      appName: 'my-tool',
//      onProjectLoad: (projectData) => { restoreState(projectData); },
//      onProjectSave: (meta) => { currentId = meta.id; }
//    });
//    // Then trigger modals:
//    header.showLoadModal();
//    header.showSaveModal({ name: 'My Project', data: getState(), thumbnailDataUri: '...' });
//
// =========================================================================

// ── i18n for project modals ──
const _dvToolLocale = (() => {
  const lang = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
  return lang.startsWith('ja') ? 'ja' : 'en';
})();
const _dvToolI18n = {
  'modal.loadTitle':       { ja: 'プロジェクトを開く', en: 'Open Project' },
  'modal.saveTitle':       { ja: 'プロジェクトを保存', en: 'Save Project' },
  'modal.loading':         { ja: '読み込み中...', en: 'Loading...' },
  'modal.empty':           { ja: '保存されたプロジェクトはありません', en: 'No saved projects' },
  'modal.error':           { ja: 'エラーが発生しました', en: 'An error occurred' },
  'modal.retry':           { ja: '再試行', en: 'Retry' },
  'modal.delete':          { ja: '削除', en: 'Delete' },
  'modal.deleteConfirm':   { ja: '削除する？', en: 'Delete?' },
  'modal.cancel':          { ja: 'キャンセル', en: 'Cancel' },
  'modal.save':            { ja: '保存', en: 'Save' },
  'modal.saving':          { ja: '保存中...', en: 'Saving...' },
  'modal.overwrite':       { ja: '上書き保存', en: 'Overwrite' },
  'modal.saveAsNew':       { ja: '新規保存', en: 'Save as New' },
  'modal.nameLabel':       { ja: 'プロジェクト名', en: 'Project Name' },
  'modal.namePlaceholder': { ja: 'プロジェクト名を入力', en: 'Enter project name' },
  'toast.saved':           { ja: '保存しました', en: 'Saved' },
  'toast.loaded':          { ja: '読み込みました', en: 'Loaded' },
  'toast.deleted':         { ja: '削除しました', en: 'Deleted' },
  'toast.saveFailed':      { ja: '保存に失敗しました', en: 'Save failed' },
  'toast.loadFailed':      { ja: '読み込みに失敗しました', en: 'Load failed' },
  'toast.deleteFailed':    { ja: '削除に失敗しました', en: 'Delete failed' },
  'auth.required':         { ja: 'ログインが必要です', en: 'Login required' },
};
function _dvToolT(key) { return (_dvToolI18n[key] && _dvToolI18n[key][_dvToolLocale]) || key; }


class DatavizToolHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = { buttons: [] };
    this.toastTimeout = null;

    // Project management state
    this._projectConfig = null;
    this._deleteConfirmTimers = {};
    this._thumbnailObjectUrls = [];
    this._modalEscHandler = null;
  }

  connectedCallback() {
    this.render();
    // Enforce fixed positioning to override potential external CSS
    this.style.position = 'fixed';
    this.style.top = '48px';
    this.style.left = '0';
    this.style.right = '0';
    this.style.width = '100%';
    this.style.zIndex = '9999';
  }

  // =========================================================================
  // Public API: Header configuration (existing)
  // =========================================================================

  /**
   * Sets the configuration for the header, including logo and buttons, and re-renders.
   * @param {object} config - The configuration object.
   * @param {string} [config.backgroundColor] - Background color for the tool header (any valid CSS color string).
   * @param {object} [config.logo] - Configuration for the tool's logo.
   * @param {string} [config.logo.type='image'] - Type of logo: 'image', 'text', or 'image-and-text'.
   * @param {string} [config.logo.src] - URL of the logo image (required if type is 'image' or 'image-and-text').
   * @param {string} [config.logo.text] - Text to display as part of the logo (required if type is 'text' or 'image-and-text').
   * @param {string} [config.logo.alt] - Alt text for the image.
   * @param {string} [config.logo.textClass] - Additional Tailwind classes for the text.
   * @param {string} [config.logo.imgClass] - Additional Tailwind classes for the image.
   * @param {Array<object>} [config.buttons] - Array of button/link configurations.
   * @param {string} [config.buttons[].align] - Alignment of the button ('left' or 'right'). Default is 'left'.
   */
  setConfig(config) {
    this.config = { ...{ buttons: [] }, ...config };
    this.render();
  }

  /**
   * Displays a transient toast message within the tool header.
   * @param {string} message - The message to display.
   * @param {'success'|'error'|'info'} [type='info'] - Type of message for styling.
   * @param {number} [duration=3000] - Duration in milliseconds before the toast disappears.
   */
  showMessage(message, type = 'info', duration = 3000) {
    const toastContainer = this.shadowRoot.getElementById('dv-toast-container');
    if (!toastContainer) return;

    // Clear existing timeout and hide any existing toast
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    toastContainer.innerHTML = '';
    toastContainer.classList.remove('dv-toast-visible');

    const bgColors = { success: '#38a169', error: '#e53e3e', info: '#3182ce' };
    const bgColor = bgColors[type] || '#4a5568';

    toastContainer.innerHTML = `
      <div class="dv-toast-message" style="background-color: ${bgColor};">
        <span>${message}</span>
      </div>
    `;

    // Force reflow then fade in
    toastContainer.offsetHeight;
    toastContainer.classList.add('dv-toast-visible');

    this.toastTimeout = setTimeout(() => {
      toastContainer.classList.remove('dv-toast-visible');
      // Clear content after fade-out transition
      setTimeout(() => { toastContainer.innerHTML = ''; }, 300);
      this.toastTimeout = null;
    }, duration);
  }

  // =========================================================================
  // Public API: Project management
  // =========================================================================

  /**
   * Configures project management for this tool.
   * Must be called before using showLoadModal / showSaveModal.
   * @param {object} projectConfig
   * @param {string} projectConfig.appName - App identifier (e.g., 'cartogram-japan')
   * @param {string} [projectConfig.apiBaseUrl] - Override API base URL
   * @param {function} projectConfig.onProjectLoad - Called with (projectData) when user selects a project to load
   * @param {function} [projectConfig.onProjectSave] - Called with (projectMeta) after successful save
   * @param {function} [projectConfig.onProjectDelete] - Called with (projectId) after successful delete
   */
  setProjectConfig(projectConfig) {
    this._projectConfig = projectConfig;
  }

  /**
   * Opens the Load Project modal.
   * Fetches and displays the user's saved projects for the configured appName.
   */
  showLoadModal() {
    if (!this._projectConfig || !this._projectConfig.appName) {
      console.error('[dataviz-tool-header] setProjectConfig({ appName }) must be called before showLoadModal()');
      return;
    }
    this._closeAnyModal();
    this._openLoadModal();
  }

  /**
   * Opens the Save Project modal.
   * @param {object} saveOptions
   * @param {string} [saveOptions.name=''] - Pre-filled project name
   * @param {object} saveOptions.data - The project data to save (any JSON-serializable object)
   * @param {string|null} [saveOptions.thumbnailDataUri=null] - Base64 data URI for thumbnail
   * @param {string|null} [saveOptions.existingProjectId=null] - If provided, enables "Overwrite" in addition to "Save as New"
   */
  showSaveModal(saveOptions) {
    if (!this._projectConfig || !this._projectConfig.appName) {
      console.error('[dataviz-tool-header] setProjectConfig({ appName }) must be called before showSaveModal()');
      return;
    }
    this._closeAnyModal();
    this._openSaveModal(saveOptions || {});
  }

  /**
   * Programmatic save without showing a modal.
   * Returns the saved project metadata directly — does NOT invoke onProjectSave callback.
   * @param {object} payload
   * @param {string} payload.name - Project name
   * @param {object} payload.data - Project data
   * @param {string|null} [payload.thumbnailDataUri=null] - Thumbnail
   * @param {string|null} [payload.existingProjectId=null] - If set, updates existing; otherwise creates new
   * @returns {Promise<object>} - The saved project metadata
   */
  async saveProject(payload) {
    if (!this._projectConfig || !this._projectConfig.appName) {
      throw new Error('setProjectConfig({ appName }) must be called first');
    }
    try {
      let result;
      if (payload.existingProjectId) {
        result = await this._updateProject(payload.existingProjectId, {
          name: payload.name,
          data: payload.data,
          thumbnail: payload.thumbnailDataUri || undefined,
        });
      } else {
        result = await this._createProject({
          name: payload.name,
          app_name: this._projectConfig.appName,
          data: payload.data,
          thumbnail: payload.thumbnailDataUri || undefined,
        });
      }
      this.showMessage(_dvToolT('toast.saved'), 'success');
      return result;
    } catch (err) {
      this.showMessage(_dvToolT('toast.saveFailed'), 'error');
      throw err;
    }
  }

  /**
   * Programmatic load without showing a modal.
   * Returns the project data directly — does NOT invoke onProjectLoad callback.
   * (The caller is responsible for handling the returned data.)
   * @param {string} projectId
   * @returns {Promise<object>} - The full project data
   */
  async loadProject(projectId) {
    try {
      const data = await this._getProject(projectId);
      this.showMessage(_dvToolT('toast.loaded'), 'success');
      return data;
    } catch (err) {
      this.showMessage(_dvToolT('toast.loadFailed'), 'error');
      throw err;
    }
  }

  /**
   * Programmatic delete without showing a modal.
   * Does NOT invoke onProjectDelete callback.
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    try {
      await this._deleteProjectApi(projectId);
      this.showMessage(_dvToolT('toast.deleted'), 'success');
    } catch (err) {
      this.showMessage(_dvToolT('toast.deleteFailed'), 'error');
      throw err;
    }
  }

  // =========================================================================
  // Internal: API Client
  // =========================================================================

  _getApiBaseUrl() {
    return (this._projectConfig && this._projectConfig.apiBaseUrl) || window.datavizApiUrl || 'https://api.dataviz.jp';
  }

  async _getAccessToken() {
    const sb = window.datavizSupabase;
    if (!sb || !sb.auth) return null;
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  }

  async _apiRequest(path, options = {}) {
    const token = await this._getAccessToken();
    if (!token) throw new Error(_dvToolT('auth.required'));

    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this._getApiBaseUrl()}${path}`, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || `API Error: ${response.status}`);
    }

    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) return response.json();
    return response;
  }

  async _listProjects(appName) {
    const res = await this._apiRequest(`/api/projects?app=${encodeURIComponent(appName)}`);
    return res.projects || [];
  }

  async _getProject(id) {
    return this._apiRequest(`/api/projects/${encodeURIComponent(id)}`);
  }

  async _createProject(payload) {
    return this._apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async _updateProject(id, payload) {
    return this._apiRequest(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async _deleteProjectApi(id) {
    return this._apiRequest(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async _getThumbnailBlob(id) {
    const token = await this._getAccessToken();
    if (!token) throw new Error(_dvToolT('auth.required'));

    const res = await fetch(`${this._getApiBaseUrl()}/api/projects/${encodeURIComponent(id)}/thumbnail`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Thumbnail error: ${res.status}`);
    return res.blob();
  }

  // =========================================================================
  // Internal: Modal management
  // =========================================================================

  _closeAnyModal() {
    const existing = this.shadowRoot.querySelector('.dv-modal-overlay');
    if (existing) existing.remove();

    // Revoke thumbnail object URLs
    this._thumbnailObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this._thumbnailObjectUrls = [];

    // Clear delete confirm timers
    Object.values(this._deleteConfirmTimers).forEach(t => clearTimeout(t));
    this._deleteConfirmTimers = {};

    // Remove ESC handler
    if (this._modalEscHandler) {
      document.removeEventListener('keydown', this._modalEscHandler);
      this._modalEscHandler = null;
    }
  }

  _setupModalClose(overlay) {
    // Click on overlay background to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeAnyModal();
    });

    // Close button
    const closeBtn = overlay.querySelector('.dv-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this._closeAnyModal());

    // ESC key
    this._modalEscHandler = (e) => {
      if (e.key === 'Escape') this._closeAnyModal();
    };
    document.addEventListener('keydown', this._modalEscHandler);
  }

  // =========================================================================
  // Internal: Load Modal
  // =========================================================================

  _openLoadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'dv-modal-overlay';
    overlay.innerHTML = `
      <div class="dv-modal dv-modal-load">
        <div class="dv-modal-header">
          <h2 class="dv-modal-title">${_dvToolT('modal.loadTitle')}</h2>
          <button class="dv-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="dv-modal-body">
          <div class="dv-modal-loading">${_dvToolT('modal.loading')}</div>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(overlay);
    // Force reflow then fade in
    overlay.offsetHeight;
    overlay.classList.add('dv-modal-visible');

    this._setupModalClose(overlay);
    this._fetchAndRenderProjects(overlay);
  }

  async _fetchAndRenderProjects(overlay) {
    const body = overlay.querySelector('.dv-modal-body');
    try {
      const projects = await this._listProjects(this._projectConfig.appName);
      body.innerHTML = '';

      if (projects.length === 0) {
        body.innerHTML = `<div class="dv-modal-empty">${_dvToolT('modal.empty')}</div>`;
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'dv-project-grid';
      body.appendChild(grid);

      projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'dv-project-card';
        card.dataset.projectId = project.id;

        const dateStr = new Date(project.updated_at).toLocaleString(
          _dvToolLocale === 'ja' ? 'ja-JP' : 'en-US'
        );

        card.innerHTML = `
          <div class="dv-project-thumb">
            <div class="dv-thumb-placeholder"></div>
          </div>
          <div class="dv-project-info">
            <div class="dv-project-name" title="${this._escapeHtml(project.name)}">${this._escapeHtml(project.name)}</div>
            <time class="dv-project-date">${dateStr}</time>
          </div>
          <button class="dv-project-delete-btn" title="${_dvToolT('modal.delete')}">&#x1F5D1;</button>
        `;

        // Click card to load project
        card.addEventListener('click', (e) => {
          if (e.target.closest('.dv-project-delete-btn')) return;
          this._handleProjectSelect(project.id, overlay);
        });

        // Delete button
        const deleteBtn = card.querySelector('.dv-project-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._handleDeleteClick(project.id, deleteBtn, card, grid);
        });

        grid.appendChild(card);

        // Lazy-load thumbnail
        this._loadThumbnail(project.id, card.querySelector('.dv-project-thumb'));
      });
    } catch (err) {
      console.error('[dataviz-tool-header] Failed to load projects', err);
      body.innerHTML = `
        <div class="dv-modal-error">
          <div>${_dvToolT('modal.error')}</div>
          <button class="dv-btn-modal dv-btn-retry">${_dvToolT('modal.retry')}</button>
        </div>
      `;
      body.querySelector('.dv-btn-retry').addEventListener('click', () => {
        body.innerHTML = `<div class="dv-modal-loading">${_dvToolT('modal.loading')}</div>`;
        this._fetchAndRenderProjects(overlay);
      });
    }
  }

  async _handleProjectSelect(projectId, overlay) {
    // Show loading state on the card
    const card = overlay.querySelector(`[data-project-id="${projectId}"]`);
    if (card) card.classList.add('dv-card-loading');

    try {
      const projectData = await this._getProject(projectId);
      this._closeAnyModal();
      this.showMessage(_dvToolT('toast.loaded'), 'success');
      if (this._projectConfig.onProjectLoad) this._projectConfig.onProjectLoad(projectData);
    } catch (err) {
      console.error('[dataviz-tool-header] Failed to load project', err);
      if (card) card.classList.remove('dv-card-loading');
      this.showMessage(_dvToolT('toast.loadFailed'), 'error');
    }
  }

  _handleDeleteClick(projectId, deleteBtn, card, grid) {
    if (this._deleteConfirmTimers[projectId]) {
      // Second click — confirm delete
      clearTimeout(this._deleteConfirmTimers[projectId]);
      delete this._deleteConfirmTimers[projectId];
      this._performDelete(projectId, card, grid);
    } else {
      // First click — enter confirm state
      deleteBtn.textContent = _dvToolT('modal.deleteConfirm');
      deleteBtn.classList.add('dv-delete-confirm');
      this._deleteConfirmTimers[projectId] = setTimeout(() => {
        deleteBtn.textContent = '\u{1F5D1}';
        deleteBtn.classList.remove('dv-delete-confirm');
        delete this._deleteConfirmTimers[projectId];
      }, 3000);
    }
  }

  async _performDelete(projectId, card, grid) {
    try {
      await this._deleteProjectApi(projectId);
      card.remove();
      this.showMessage(_dvToolT('toast.deleted'), 'success');
      if (this._projectConfig.onProjectDelete) this._projectConfig.onProjectDelete(projectId);

      // Show empty state if no cards left
      if (grid.children.length === 0) {
        const body = grid.parentElement;
        body.innerHTML = `<div class="dv-modal-empty">${_dvToolT('modal.empty')}</div>`;
      }
    } catch (err) {
      console.error('[dataviz-tool-header] Failed to delete project', err);
      this.showMessage(_dvToolT('toast.deleteFailed'), 'error');
    }
  }

  _loadThumbnail(projectId, thumbContainer) {
    this._getThumbnailBlob(projectId)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        this._thumbnailObjectUrls.push(url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.className = 'dv-thumb-img';
        const placeholder = thumbContainer.querySelector('.dv-thumb-placeholder');
        if (placeholder) placeholder.replaceWith(img);
      })
      .catch(() => {
        // Keep placeholder on error
      });
  }

  // =========================================================================
  // Internal: Save Modal
  // =========================================================================

  _openSaveModal(options) {
    const { name = '', data, thumbnailDataUri = null, existingProjectId = null } = options;

    const hasExisting = !!existingProjectId;
    const thumbnailHtml = thumbnailDataUri
      ? `<div class="dv-save-thumbnail"><img src="${thumbnailDataUri}" alt="Preview"></div>`
      : '';

    const actionsHtml = hasExisting
      ? `<button type="button" class="dv-btn-modal dv-btn-secondary dv-save-cancel">${_dvToolT('modal.cancel')}</button>
         <button type="button" class="dv-btn-modal dv-btn-secondary dv-save-as-new">${_dvToolT('modal.saveAsNew')}</button>
         <button type="submit" class="dv-btn-modal dv-btn-primary dv-save-submit">${_dvToolT('modal.overwrite')}</button>`
      : `<button type="button" class="dv-btn-modal dv-btn-secondary dv-save-cancel">${_dvToolT('modal.cancel')}</button>
         <button type="submit" class="dv-btn-modal dv-btn-primary dv-save-submit">${_dvToolT('modal.save')}</button>`;

    const overlay = document.createElement('div');
    overlay.className = 'dv-modal-overlay';
    overlay.innerHTML = `
      <div class="dv-modal dv-modal-save">
        <div class="dv-modal-header">
          <h2 class="dv-modal-title">${_dvToolT('modal.saveTitle')}</h2>
          <button class="dv-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="dv-modal-body">
          <form class="dv-save-form">
            ${thumbnailHtml}
            <div class="dv-save-field">
              <label for="dv-project-name-input">${_dvToolT('modal.nameLabel')}</label>
              <input type="text" id="dv-project-name-input" value="${this._escapeHtml(name)}"
                     placeholder="${_dvToolT('modal.namePlaceholder')}" required />
            </div>
            <div class="dv-modal-error-inline dv-hidden"></div>
            <div class="dv-save-actions">${actionsHtml}</div>
          </form>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add('dv-modal-visible');

    this._setupModalClose(overlay);

    // Focus input
    const input = overlay.querySelector('#dv-project-name-input');
    setTimeout(() => input && input.focus(), 50);

    // Cancel button
    overlay.querySelector('.dv-save-cancel').addEventListener('click', () => this._closeAnyModal());

    // Form submit (overwrite or new save)
    const form = overlay.querySelector('.dv-save-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const projectName = input.value.trim();
      if (!projectName) return;
      this._performSave(overlay, projectName, data, thumbnailDataUri, existingProjectId);
    });

    // Save as new button (when updating existing)
    const saveAsNewBtn = overlay.querySelector('.dv-save-as-new');
    if (saveAsNewBtn) {
      saveAsNewBtn.addEventListener('click', () => {
        const projectName = input.value.trim();
        if (!projectName) { input.focus(); return; }
        this._performSave(overlay, projectName, data, thumbnailDataUri, null);
      });
    }
  }

  async _performSave(overlay, projectName, data, thumbnailDataUri, existingProjectId) {
    const submitBtn = overlay.querySelector('.dv-save-submit');
    const saveAsNewBtn = overlay.querySelector('.dv-save-as-new');
    const errorEl = overlay.querySelector('.dv-modal-error-inline');
    const originalText = submitBtn.textContent;

    // Disable buttons
    submitBtn.disabled = true;
    submitBtn.textContent = _dvToolT('modal.saving');
    if (saveAsNewBtn) saveAsNewBtn.disabled = true;
    errorEl.classList.add('dv-hidden');

    try {
      let result;
      if (existingProjectId) {
        result = await this._updateProject(existingProjectId, {
          name: projectName,
          data: data,
          thumbnail: thumbnailDataUri || undefined,
        });
      } else {
        result = await this._createProject({
          name: projectName,
          app_name: this._projectConfig.appName,
          data: data,
          thumbnail: thumbnailDataUri || undefined,
        });
      }
      this._closeAnyModal();
      this.showMessage(_dvToolT('toast.saved'), 'success');
      if (this._projectConfig.onProjectSave) this._projectConfig.onProjectSave(result);
    } catch (err) {
      console.error('[dataviz-tool-header] Save failed', err);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      if (saveAsNewBtn) saveAsNewBtn.disabled = false;
      errorEl.textContent = err.message || _dvToolT('toast.saveFailed');
      errorEl.classList.remove('dv-hidden');
      this.showMessage(_dvToolT('toast.saveFailed'), 'error');
    }
  }

  // =========================================================================
  // Internal: Helpers
  // =========================================================================

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Helper function to convert hex to RGB
  _hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Helper function to darken a color by a percentage, handling hex and rgb/rgba
  _darkenColor(color, percent) {
    let r, g, b, a;

    // Handle hex colors
    if (color.startsWith('#')) {
      const rgb = this._hexToRgb(color);
      if (!rgb) return color; // Return original if hex parse fails
      r = rgb.r; g = rgb.g; b = rgb.b; a = 1;
    } else if (color.startsWith('rgb')) { // Handle rgb/rgba
      const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
      if (!rgbaMatch) return color; // Return original if rgb parse fails
      r = parseInt(rgbaMatch[1]);
      g = parseInt(rgbaMatch[2]);
      b = parseInt(rgbaMatch[3]);
      a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    } else {
      return color; // Unhandled color format, return as is
    }

    const darkenFactor = (100 - percent) / 100;
    r = Math.round(r * darkenFactor);
    g = Math.round(g * darkenFactor);
    b = Math.round(b * darkenFactor);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Helper function to lighten a color by a percentage, handling hex and rgb/rgba
  _lightenColor(color, percent) {
    let r, g, b, a;

    // Handle hex colors
    if (color.startsWith('#')) {
      const rgb = this._hexToRgb(color);
      if (!rgb) return color;
      r = rgb.r; g = rgb.g; b = rgb.b; a = 1;
    } else if (color.startsWith('rgb')) { // Handle rgb/rgba
      const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
      if (!rgbaMatch) return color;
      r = parseInt(rgbaMatch[1]);
      g = parseInt(rgbaMatch[2]);
      b = parseInt(rgbaMatch[3]);
      a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    } else {
      return color;
    }

    const lightenFactor = (100 + percent) / 100;
    r = Math.min(255, Math.round(r * lightenFactor));
    g = Math.min(255, Math.round(g * lightenFactor));
    b = Math.min(255, Math.round(b * lightenFactor));

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // =========================================================================
  // Styles
  // =========================================================================

  getStyles() {
    return `
      :host {
        display: block;
        --tw-bg-opacity: 1;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 2px 4px rgb(0 0 0 / 0.2);
        border-top: 1px solid var(--dv-border-top-color, rgb(68 68 68));
        border-bottom: 1px solid var(--dv-border-top-color, rgb(68 68 68));

        /* Fixed positioning below the global header (48px height) */
        position: fixed;
        top: 48px;
        left: 0;
        right: 0;
        width: 100%;
        box-sizing: border-box;

        z-index: 9998;
      }
      .dv-tool-header-inner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
      }
      .dv-left-group, .dv-right-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .dv-right-group {
        margin-left: auto;
      }
      .dv-logo-image {
        max-height: 24px;
      }
      .dv-logo-text {
        font-weight: 600;
        color: #fff;
        font-size: 1.1em;
        line-height: 1;
      }
      .dv-logo-image-and-text {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dv-btn, a.dv-btn {
        background-color: var(--dv-button-bg);
        border: 1px solid var(--dv-button-border);
        color: rgb(221 221 221);
        padding: 5px 12px;
        border-radius: 4px;
        text-decoration: none;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
        white-space: nowrap;
      }
      .dv-btn:hover, a.dv-btn:hover {
        background-color: var(--dv-button-hover-bg);
        border-color: var(--dv-button-hover-border);
        color: rgb(255 255 255);
      }

      .dv-dropdown {
        position: relative;
        display: inline-block;
      }
      .dv-dropdown-content {
        display: none;
        position: absolute;
        background-color: rgb(40 40 40);
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.5);
        z-index: 1000;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid rgb(68 68 68);
        left: 0;
      }
      .dv-dropdown-content a, .dv-dropdown-content button {
        color: rgb(221 221 221);
        padding: 8px 16px;
        text-decoration: none;
        display: block;
        background-color: transparent;
        border: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        font-size: 13px;
      }
      .dv-dropdown-content a:hover, .dv-dropdown-content button:hover {
        background-color: rgb(74 74 74);
        color: white;
      }
      .dv-dropdown.active .dv-dropdown-content {
        display: block;
      }

      /* Toast styles */
      #dv-toast-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
      #dv-toast-container.dv-toast-visible {
        opacity: 1;
      }
      .dv-toast-message {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 14px;
        border-radius: 4px;
        font-size: 13px;
        color: #fff;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      }

      /* ============================================= */
      /* Modal styles                                  */
      /* ============================================= */

      .dv-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 10001;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 100px;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
      }
      .dv-modal-overlay.dv-modal-visible {
        opacity: 1;
      }
      .dv-modal {
        background: rgb(30, 30, 30);
        border: 1px solid rgb(60, 60, 60);
        border-radius: 8px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        width: 90%;
        max-height: calc(80vh);
        display: flex;
        flex-direction: column;
        color: #ddd;
      }
      .dv-modal-load {
        max-width: 640px;
      }
      .dv-modal-save {
        max-width: 480px;
      }
      .dv-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgb(60, 60, 60);
        flex-shrink: 0;
      }
      .dv-modal-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
      }
      .dv-modal-close {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        transition: color 0.2s;
      }
      .dv-modal-close:hover {
        color: #fff;
      }
      .dv-modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        min-height: 120px;
      }

      /* Loading / Empty / Error states */
      .dv-modal-loading, .dv-modal-empty, .dv-modal-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        color: #888;
        font-size: 14px;
        gap: 12px;
      }

      /* Project grid */
      .dv-project-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }
      .dv-project-card {
        position: relative;
        background: rgb(45, 45, 45);
        border: 1px solid rgb(60, 60, 60);
        border-radius: 6px;
        cursor: pointer;
        transition: border-color 0.2s, background-color 0.2s;
        overflow: hidden;
      }
      .dv-project-card:hover {
        border-color: rgb(100, 100, 100);
        background: rgb(55, 55, 55);
      }
      .dv-project-card.dv-card-loading {
        opacity: 0.5;
        pointer-events: none;
      }
      .dv-project-thumb {
        width: 100%;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        background: rgb(35, 35, 35);
      }
      .dv-thumb-placeholder {
        width: 100%;
        height: 100%;
        background: rgb(35, 35, 35);
      }
      .dv-thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .dv-project-info {
        padding: 8px 10px;
      }
      .dv-project-name {
        font-size: 13px;
        font-weight: 500;
        color: #eee;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dv-project-date {
        font-size: 11px;
        color: #888;
        display: block;
        margin-top: 2px;
      }
      .dv-project-delete-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.5);
        border: none;
        border-radius: 4px;
        color: #aaa;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 6px;
        opacity: 0;
        transition: opacity 0.2s, background-color 0.2s, color 0.2s;
      }
      .dv-project-card:hover .dv-project-delete-btn {
        opacity: 1;
      }
      .dv-project-delete-btn:hover {
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
      }
      .dv-project-delete-btn.dv-delete-confirm {
        opacity: 1;
        background: #e53e3e;
        color: #fff;
        font-size: 11px;
        padding: 2px 8px;
      }

      /* Save modal form */
      .dv-save-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .dv-save-thumbnail {
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgb(60, 60, 60);
        max-height: 200px;
      }
      .dv-save-thumbnail img {
        width: 100%;
        display: block;
        object-fit: contain;
      }
      .dv-save-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .dv-save-field label {
        font-size: 13px;
        color: #aaa;
      }
      .dv-save-field input {
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid rgb(70, 70, 70);
        background: rgb(40, 40, 40);
        color: #eee;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      .dv-save-field input:focus {
        border-color: #5a9cf5;
      }
      .dv-save-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 4px;
      }

      /* Modal buttons */
      .dv-btn-modal {
        padding: 7px 16px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: background-color 0.2s, opacity 0.2s;
      }
      .dv-btn-modal:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .dv-btn-primary {
        background: #5a9cf5;
        color: #fff;
        border-color: #5a9cf5;
      }
      .dv-btn-primary:hover:not(:disabled) {
        background: #4a8ce5;
      }
      .dv-btn-secondary {
        background: rgb(55, 55, 55);
        color: #ddd;
        border-color: rgb(70, 70, 70);
      }
      .dv-btn-secondary:hover:not(:disabled) {
        background: rgb(70, 70, 70);
      }
      .dv-btn-retry {
        background: rgb(55, 55, 55);
        color: #ddd;
        border-color: rgb(70, 70, 70);
      }
      .dv-btn-retry:hover {
        background: rgb(70, 70, 70);
      }

      /* Error inline */
      .dv-modal-error-inline {
        color: #e53e3e;
        font-size: 13px;
      }
      .dv-hidden {
        display: none;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .dv-modal-overlay {
          padding-top: 60px;
        }
        .dv-modal {
          width: 95%;
        }
        .dv-project-grid {
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 8px;
        }
      }
    `;
  }

  // =========================================================================
  // Render (header bar only — modals are appended dynamically)
  // =========================================================================

  render() {
    const { logo, buttons, backgroundColor } = this.config;

    let logoHtml = '';
    if (logo) {
      const imgClass = `dv-logo-image ${logo.imgClass || ''}`.trim();
      const textClass = `dv-logo-text ${logo.textClass || ''}`.trim();

      if (logo.type === 'image' && logo.src) {
        logoHtml = `<img src="${logo.src}" alt="${logo.alt || ''}" class="${imgClass}">`;
      } else if (logo.type === 'text' && logo.text) {
        logoHtml = `<span class="${textClass}">${logo.text}</span>`;
      } else if (logo.type === 'image-and-text' && logo.src && logo.text) {
        logoHtml = `
          <div class="dv-logo-image-and-text">
            <img src="${logo.src}" alt="${logo.alt || ''}" class="${imgClass}">
            <span class="${textClass}">${logo.text}</span>
          </div>
        `;
      }
    }

    let leftButtonsHtml = '';
    let rightButtonsHtml = '';
    const dropdownsToAttachListeners = []; // Store dropdown buttons to attach listeners

    const headerBgColor = backgroundColor || 'rgb(40, 40, 40)'; // Default dark gray
    const buttonBgColor = this._darkenColor(headerBgColor, 20); // 20% darker
    const buttonBorderColor = this._darkenColor(headerBgColor, 10); // 10% darker for border
    const buttonHoverBgColor = this._lightenColor(headerBgColor, 20); // 20% lighter for hover
    const buttonHoverBorderColor = this._lightenColor(headerBgColor, 10); // 10% lighter for hover border
    const borderTopColor = this._darkenColor(headerBgColor, 10); // 10% darker for border-top

    const dynamicStyles = `
      :host {
        --dv-button-bg: ${buttonBgColor};
        --dv-button-border: ${buttonBorderColor};
        --dv-button-hover-bg: ${buttonHoverBgColor};
        --dv-button-hover-border: ${buttonHoverBorderColor};
        --dv-border-top-color: ${borderTopColor};
      }
      .dv-dropdown-content {
        background-color: ${buttonBgColor}; /* Dropdown content background same as buttons */
        border: 1px solid ${buttonBorderColor};
      }
      .dv-dropdown-content a:hover, .dv-dropdown-content button:hover {
        background-color: ${buttonHoverBgColor};
      }
    `;

    buttons.forEach((btn, index) => {
      const id = `dv-tool-btn-${index}`;

      if (btn.type === 'dropdown') {
        const dropdownId = `dv-dropdown-${index}`;
        let dropdownItemsHtml = '';
        btn.items.forEach((item, itemIndex) => {
          const itemId = `dv-dropdown-item-${index}-${itemIndex}`;
          if (item.type === 'link') {
            dropdownItemsHtml += `<a href="${item.href || '#'}" class="dv-btn-dropdown-item" ${item.target ? `target="${item.target}"` : ''}>${item.label}</a>`;
          } else {
            dropdownItemsHtml += `<button id="${itemId}" class="dv-btn-dropdown-item">${item.label}</button>`;
          }
        });

        const dropdownHtml = `
          <div class="dv-dropdown" id="${dropdownId}">
            <button class="dv-btn dv-dropdown-toggle">${btn.label}</button>
            <div class="dv-dropdown-content">
              ${dropdownItemsHtml}
            </div>
          </div>
        `;

        if (btn.align === 'right') {
          rightButtonsHtml += dropdownHtml;
        } else {
          leftButtonsHtml += dropdownHtml;
        }

        dropdownsToAttachListeners.push({ dropdownId, originalButtonIndex: index, items: btn.items, label: btn.label });
      } else {
        const buttonHtml = btn.type === 'link'
          ? `<a href="${btn.href || '#'}" class="dv-btn" ${btn.target ? `target="${btn.target}"` : ''}>${btn.label}</a>`
          : `<button id="${id}" class="dv-btn">${btn.label}</button>`;

        if (btn.align === 'right') {
          rightButtonsHtml += buttonHtml;
        } else {
          leftButtonsHtml += buttonHtml;
        }
      }
    });

    this.shadowRoot.innerHTML = `
      <style>
        ${dynamicStyles}
        ${this.getStyles()}
      </style>
      <div class="dv-tool-header-inner relative" style="background-color: ${headerBgColor};">
        <div class="dv-left-group">
          ${logoHtml}
          ${leftButtonsHtml}
        </div>
        <div class="dv-right-group">
          ${rightButtonsHtml}
        </div>
        <div id="dv-toast-container"></div>
      </div>
    `;

    // Re-attach event listeners for regular buttons
    buttons.forEach((btn, index) => {
      if (btn.action && typeof btn.action === 'function' && btn.type !== 'link' && btn.type !== 'dropdown') {
        const id = `dv-tool-btn-${index}`;
        const buttonEl = this.shadowRoot.getElementById(id);
        if (buttonEl) {
          buttonEl.addEventListener('click', btn.action);
        }
      }
    });

    // Attach event listeners for dropdowns
    dropdownsToAttachListeners.forEach(dropdownInfo => {
      const dropdownElement = this.shadowRoot.getElementById(dropdownInfo.dropdownId);
      const toggleButton = dropdownElement.querySelector('.dv-dropdown-toggle');
      const dropdownContent = dropdownElement.querySelector('.dv-dropdown-content');

      // Toggle dropdown visibility
      toggleButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing immediately
        dropdownElement.classList.toggle('active');
      });

      // Close dropdown if clicked outside
      document.addEventListener('click', (event) => {
        // Check if the click is outside the dropdown element
        const path = event.composedPath(); // Use composedPath for Shadow DOM
        if (!path.includes(dropdownElement)) {
          dropdownElement.classList.remove('active');
        }
      });

      // Attach listeners to dropdown items
      dropdownInfo.items.forEach((item, itemIndex) => {
        if (item.action && typeof item.action === 'function' && item.type !== 'link') {
          const itemId = `dv-dropdown-item-${dropdownInfo.originalButtonIndex}-${itemIndex}`;
          const itemButton = dropdownElement.querySelector(`#${itemId}`);
          if (itemButton) {
            itemButton.addEventListener('click', (event) => {
              event.stopPropagation(); // Prevent closing immediately
              item.action();
              dropdownElement.classList.remove('active'); // Close after click
            });
          }
        }
      });
    });
  }
}

// Define the custom element if it's not already defined
if (!window.customElements.get('dataviz-tool-header')) {
  window.customElements.define('dataviz-tool-header', DatavizToolHeader);
}
