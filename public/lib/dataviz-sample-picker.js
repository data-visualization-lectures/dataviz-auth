// =========================================================================
// dataviz-sample-picker.js
// サンプルデータピッカー Web Component
//
// カタログJSONからサンプルデータを取得し、ツールに互換性のあるデータを
// モーダルで一覧表示する。選択時に CustomEvent を発火する。
// =========================================================================

const _dvPickerLocale = (() => {
  const lang = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
  return lang.startsWith('ja') ? 'ja' : 'en';
})();

const _dvPickerI18n = {
  'picker.title':       { ja: 'サンプルデータ', en: 'Sample Data' },
  'picker.search':      { ja: 'データを検索...', en: 'Search datasets...' },
  'picker.empty':       { ja: '利用できるサンプルデータがありません', en: 'No sample data available' },
  'picker.noResults':   { ja: '条件に一致するデータがありません', en: 'No matching datasets' },
  'picker.rows':        { ja: '行', en: 'rows' },
  'picker.loading':     { ja: '読み込み中...', en: 'Loading...' },
  'picker.error':       { ja: 'データの取得に失敗しました', en: 'Failed to load data' },
};
function _dvPickerT(key) { return (_dvPickerI18n[key] && _dvPickerI18n[key][_dvPickerLocale]) || key; }

// d3.schemeTableau10 — フォーマット別カラー
const _dvFormatColors = {
  csv: '#4e79a7', tsv: '#f28e2b', json: '#e15759', geojson: '#76b7b2',
  topojson: '#59a14f', gexf: '#edc948', graphml: '#b07aa1', 'vega-spec': '#ff9da7',
};

// カタログキャッシュ（一度取得したら再利用）
let _dvCatalogCache = null;
const _dvCatalogUrl = (window.datavizAuthUrl || 'https://app.dataviz.jp') + '/catalog.json';

async function _dvFetchCatalog() {
  if (_dvCatalogCache) return _dvCatalogCache;
  const res = await fetch(_dvCatalogUrl);
  if (!res.ok) throw new Error('fetch failed');
  const data = await res.json();
  _dvCatalogCache = data.entries;
  return _dvCatalogCache;
}

class DatavizSamplePicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._toolId = null;
    this._isOpen = false;
    this._entries = [];
    this._filteredEntries = [];
    this._searchQuery = '';
  }

  static get observedAttributes() { return ['tool-id']; }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'tool-id') this._toolId = newVal;
  }

  setToolId(id) {
    this._toolId = id;
    this.setAttribute('tool-id', id);
  }

  async open() {
    this._isOpen = true;
    this._searchQuery = '';
    this._renderModal();

    try {
      const catalog = await _dvFetchCatalog();
      this._entries = catalog.filter(e =>
        e.compatibleTools && e.compatibleTools.includes(this._toolId)
      );
      this._filteredEntries = this._entries;
      this._renderModal();
    } catch (err) {
      this._entries = [];
      this._filteredEntries = [];
      this._renderModal(true);
    }
  }

  close() {
    this._isOpen = false;
    this.shadowRoot.innerHTML = '';
  }

  _onSearch(query) {
    this._searchQuery = query;
    const q = query.toLowerCase();
    this._filteredEntries = q
      ? this._entries.filter(e =>
          e.name.toLowerCase().includes(q) ||
          e.nameEn.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.tags && e.tags.some(t => t.toLowerCase().includes(q)))
        )
      : this._entries;
    this._renderList();
  }

  _onSelect(entry) {
    const fileUrl = (_dvPickerLocale === 'en' && entry.fileUrlEn)
      ? entry.fileUrlEn : entry.fileUrl;
    this.dispatchEvent(new CustomEvent('sample-data-selected', {
      bubbles: true,
      composed: true,
      detail: { url: fileUrl, format: entry.format, name: entry.name, nameEn: entry.nameEn, extra: entry.extra || null }
    }));
    this.close();
  }

  _renderModal(isError = false) {
    if (!this._isOpen) { this.shadowRoot.innerHTML = ''; return; }

    const isLoading = !isError && this._entries.length === 0 && !this._searchQuery;

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <div class="dv-picker-overlay">
        <div class="dv-picker-modal">
          <div class="dv-picker-header">
            <h2>${_dvPickerT('picker.title')}</h2>
            <button class="dv-picker-close">&times;</button>
          </div>
          <div class="dv-picker-search-wrap">
            <input type="text" class="dv-picker-search" placeholder="${_dvPickerT('picker.search')}" value="${this._searchQuery}">
          </div>
          <div class="dv-picker-list" id="dv-picker-list">
            ${isError
              ? `<div class="dv-picker-empty">${_dvPickerT('picker.error')}</div>`
              : isLoading
                ? `<div class="dv-picker-empty">${_dvPickerT('picker.loading')}</div>`
                : this._getListHtml()
            }
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.shadowRoot.querySelector('.dv-picker-close').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('.dv-picker-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('dv-picker-overlay')) this.close();
    });

    const searchInput = this.shadowRoot.querySelector('.dv-picker-search');
    searchInput.addEventListener('input', (e) => this._onSearch(e.target.value));
    searchInput.focus();

    this._attachItemListeners();
  }

  _renderList() {
    const listEl = this.shadowRoot.getElementById('dv-picker-list');
    if (!listEl) return;
    listEl.innerHTML = this._getListHtml();
    this._attachItemListeners();
  }

  _getListHtml() {
    if (this._filteredEntries.length === 0) {
      const msg = this._entries.length === 0
        ? _dvPickerT('picker.empty')
        : _dvPickerT('picker.noResults');
      return `<div class="dv-picker-empty">${msg}</div>`;
    }

    return this._filteredEntries.map((entry, i) => {
      const name = _dvPickerLocale === 'ja' ? entry.name : entry.nameEn;
      const desc = _dvPickerLocale === 'ja' ? entry.description : entry.descriptionEn;
      const color = _dvFormatColors[entry.format] || '#888';
      const rowInfo = entry.rowCount > 0
        ? `${entry.rowCount.toLocaleString()} ${_dvPickerT('picker.rows')}`
        : '';

      return `
        <button class="dv-picker-item" data-index="${i}">
          <div class="dv-picker-item-color" style="background:${color}"></div>
          <div class="dv-picker-item-body">
            <div class="dv-picker-item-title">${name}</div>
            <div class="dv-picker-item-desc">${desc}</div>
            <div class="dv-picker-item-meta">
              <span class="dv-picker-item-format" style="color:${color}">${entry.format.toUpperCase()}</span>
              ${rowInfo ? `<span class="dv-picker-item-rows">${rowInfo}</span>` : ''}
            </div>
          </div>
        </button>
      `;
    }).join('');
  }

  _attachItemListeners() {
    this.shadowRoot.querySelectorAll('.dv-picker-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        if (this._filteredEntries[idx]) this._onSelect(this._filteredEntries[idx]);
      });
    });
  }

  _getStyles() {
    return `
      .dv-picker-overlay {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(0,0,0,0.6);
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 10vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .dv-picker-modal {
        background: rgb(30,30,30); color: #ddd;
        border: 1px solid rgb(60,60,60);
        border-radius: 12px;
        width: 90vw; max-width: 520px;
        max-height: 70vh;
        display: flex; flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      }
      .dv-picker-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid rgb(60,60,60);
      }
      .dv-picker-header h2 {
        margin: 0; font-size: 16px; font-weight: 600; color: #fff;
      }
      .dv-picker-close {
        background: none; border: none; color: #999; font-size: 24px;
        cursor: pointer; padding: 0 4px; line-height: 1;
      }
      .dv-picker-close:hover { color: #fff; }
      .dv-picker-search-wrap {
        padding: 12px 20px;
      }
      .dv-picker-search {
        width: 100%; box-sizing: border-box;
        background: rgb(45,45,45); border: 1px solid rgb(70,70,70);
        border-radius: 6px; padding: 8px 12px;
        color: #ddd; font-size: 14px; outline: none;
      }
      .dv-picker-search:focus {
        border-color: #4e79a7;
      }
      .dv-picker-search::placeholder { color: #777; }
      .dv-picker-list {
        flex: 1; overflow-y: auto; padding: 0 12px 12px;
      }
      .dv-picker-empty {
        text-align: center; color: #777; padding: 32px 16px; font-size: 14px;
      }
      .dv-picker-item {
        display: flex; align-items: stretch; gap: 0;
        width: 100%; text-align: left;
        background: rgb(38,38,38); border: 1px solid rgb(55,55,55);
        border-radius: 8px; margin-bottom: 8px;
        cursor: pointer; overflow: hidden;
        transition: border-color 0.15s, background 0.15s;
        padding: 0; font-family: inherit;
        color: inherit;
      }
      .dv-picker-item:hover {
        border-color: rgb(90,90,90);
        background: rgb(45,45,45);
      }
      .dv-picker-item-color {
        width: 6px; flex-shrink: 0;
      }
      .dv-picker-item-body {
        padding: 10px 14px; flex: 1; min-width: 0;
      }
      .dv-picker-item-title {
        font-size: 14px; font-weight: 600; color: #eee;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dv-picker-item-desc {
        font-size: 12px; color: #999; margin-top: 2px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dv-picker-item-meta {
        display: flex; gap: 8px; margin-top: 4px; font-size: 11px;
      }
      .dv-picker-item-format {
        font-weight: 700; text-transform: uppercase;
      }
      .dv-picker-item-rows { color: #777; }
      .dv-picker-list::-webkit-scrollbar { width: 6px; }
      .dv-picker-list::-webkit-scrollbar-track { background: transparent; }
      .dv-picker-list::-webkit-scrollbar-thumb { background: rgb(60,60,60); border-radius: 3px; }
    `;
  }
}

if (!window.customElements.get('dataviz-sample-picker')) {
  window.customElements.define('dataviz-sample-picker', DatavizSamplePicker);
}
