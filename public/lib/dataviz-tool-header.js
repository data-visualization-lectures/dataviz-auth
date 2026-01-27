// =========================================================================
// UI Component: Tool-specific Sub-Header (Web Component Standard)
// Implemented with Tailwind CSS
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
// =========================================================================
class DatavizToolHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = { buttons: [] };
    this.toastTimeout = null;
  }

  connectedCallback() {
    this.render();
  }

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
    toastContainer.innerHTML = ''; // Clear previous message
    toastContainer.classList.add('hidden');

    let bgColorClass = 'bg-gray-700';
    let textColorClass = 'text-white';
    if (type === 'success') {
      bgColorClass = 'bg-green-600';
    } else if (type === 'error') {
      bgColorClass = 'bg-red-600';
    } else if (type === 'info') {
      bgColorClass = 'bg-blue-600';
    }

    toastContainer.innerHTML = `
      <div class="px-3 py-2 rounded-md shadow-lg flex items-center space-x-2 ${bgColorClass} ${textColorClass}">
        <span>${message}</span>
      </div>
    `;
    toastContainer.classList.remove('hidden');
    toastContainer.classList.add('flex'); // Show with flex to center content

    this.toastTimeout = setTimeout(() => {
      toastContainer.classList.remove('flex');
      toastContainer.classList.add('hidden');
      toastContainer.innerHTML = '';
      this.toastTimeout = null;
    }, duration);
  }

  // Helper function to convert hex to RGB
  _hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
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

  getStyles() {
    // This is a minimal set of Tailwind-like utility classes that are conceptually
    // compiled into the Shadow DOM. In a real build, this would be generated.
    // For this demonstration, we'll embed common necessary styles.
    return `
      :host {
        display: block;
        /* Tailwind-like base styles */
        --tw-bg-opacity: 1;
        /* background-color: rgb(40 40 40 / var(--tw-bg-opacity)); /* bg-gray-800 */ */
        padding: 8px 16px; /* px-4 py-2 equivalent */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 2px 4px rgb(0 0 0 / 0.2); /* shadow-md equivalent */
        border-top: 1px solid rgb(68 68 68); /* border-t border-gray-600 equivalent */
        position: relative; /* For toast positioning */
        z-index: 9998;
      }
      .dv-tool-header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between; /* Added for left/right alignment */
        padding: 8px 16px; /* px-4 py-2 equivalent */
      }
      .dv-left-group, .dv-right-group {
        display: flex;
        align-items: center;
        gap: 12px; /* space-x-3 equivalent */
      }
      .dv-right-group {
        margin-left: auto; /* Force right alignment */
      }
      .dv-logo-image { /* Renamed from .dv-tool-logo */
        max-height: 24px;
      }
      .dv-logo-text {
        font-weight: 600; /* Semi-bold */
        color: #fff;
        font-size: 1.1em;
        line-height: 1; /* Adjust for vertical alignment */
      }
      .dv-logo-image-and-text {
        display: flex;
        align-items: center;
        gap: 8px; /* space-x-2 equivalent */
      }
      .dv-btn, a.dv-btn {
        /* Tailwind-like button styles */
        background-color: var(--dv-button-bg);
        border: 1px solid var(--dv-button-border);
        color: rgb(221 221 221); /* text-gray-300 */
        padding: 5px 12px; /* px-3 py-1 equivalent */
        border-radius: 4px; /* rounded-md equivalent */
        text-decoration: none;
        font-size: 13px; /* text-sm equivalent */
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
        white-space: nowrap; /* Prevent wrapping */
      }
      .dv-btn:hover, a.dv-btn:hover {
        background-color: var(--dv-button-hover-bg);
        border-color: var(--dv-button-hover-border);
        color: rgb(255 255 255); /* hover:text-white */
      }

      .dv-dropdown {
        position: relative;
        display: inline-block;
      }
      .dv-dropdown-content {
        display: none;
        position: absolute;
        background-color: rgb(40 40 40); /* bg-gray-800 */
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.5);
        z-index: 1000;
        border-radius: 4px;
        overflow: hidden; /* For rounded corners on items */
        border: 1px solid rgb(68 68 68); /* border-gray-600 */
        left: 0; /* Align dropdown content to the left of the toggle button */
      }
      .dv-dropdown-content a, .dv-dropdown-content button {
        color: rgb(221 221 221); /* text-gray-300 */
        padding: 8px 16px;
        text-decoration: none;
        display: block;
        background-color: transparent;
        border: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        font-size: 13px; /* text-sm */
      }
      .dv-dropdown-content a:hover, .dv-dropdown-content button:hover {
        background-color: rgb(74 74 74); /* hover:bg-gray-600 */
        color: white;
      }
      .dv-dropdown.active .dv-dropdown-content {
        display: block;
      }

      /* Toast styles */
      #dv-toast-container {
        position: absolute;
        bottom: 8px; /* Position at the bottom of the header */
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        pointer-events: none; /* Allow clicks through to elements behind */
        display: flex; /* Centered content */
        justify-content: center; /* Centered content */
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
      #dv-toast-container.flex {
        opacity: 1;
      }
      #dv-toast-container.hidden {
        display: none;
      }
      .bg-gray-700 { background-color: #4a5568; }
      .bg-green-600 { background-color: #38a169; }
      .bg-red-600   { background-color: #e53e3e; }
      .bg-blue-600  { background-color: #3182ce; }
      .text-white   { color: #fff; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .rounded-md { border-radius: 0.375rem; }
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-right: calc(0.5rem * var(--tw-space-x-reverse)); margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse))); }
    `;
  }

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

    const dynamicStyles = `
      :host {
        --dv-button-bg: ${buttonBgColor};
        --dv-button-border: ${buttonBorderColor};
        --dv-button-hover-bg: ${buttonHoverBgColor};
        --dv-button-hover-border: ${buttonHoverBorderColor};
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

        // Add a placeholder for the dropdown in the leftButtonsHtml
        leftButtonsHtml += `
          <div class="dv-dropdown" id="${dropdownId}">
            <button class="dv-btn dv-dropdown-toggle">${btn.label}</button>
            <div class="dv-dropdown-content">
              ${dropdownItemsHtml}
            </div>
          </div>
        `;
        dropdownsToAttachListeners.push({ dropdownId, originalButtonIndex: index, items: btn.items, label: btn.label });
      } else {
        const buttonHtml = btn.type === 'link'
          ? `<a href="${btn.href || '#'}" class="dv-btn" ${btn.target ? `target="${btn.target}"` : ''}>${btn.label}</a>`
          : `<button id="${id}" class="dv-btn">${btn.label}</button>`;

        if (btn.label === 'プロジェクトの保存' || btn.label === 'プロジェクトの読込') {
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
        <div id="dv-toast-container" class="absolute bottom-2 left-1/2 -translate-x-1/2 hidden opacity-0 transition-opacity duration-300"></div>
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
