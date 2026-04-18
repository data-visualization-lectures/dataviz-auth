// ============================================================
// Settings Compat Helpers
// Schema-driven save/restore for chart module settings.
// ============================================================

(function () {
  'use strict';

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function coerceNumber(value) {
    if (value === null || value === undefined || value === '') return NaN;
    const n = +value;
    return Number.isFinite(n) ? n : NaN;
  }

  function pickNumber(value, { min, max, fallback } = {}) {
    const n = coerceNumber(value);
    if (!Number.isFinite(n)) return fallback;
    if (Number.isFinite(min) && n < min) return fallback;
    if (Number.isFinite(max) && n > max) return fallback;
    return n;
  }

  function pickEnum(value, values, fallback) {
    if (Array.isArray(values) && values.includes(value)) return value;
    return fallback;
  }

  function pickString(value, { fallback = '', nullable = false } = {}) {
    if (value === null && nullable) return null;
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return nullable ? null : fallback;
    return value;
  }

  function pickBoolean(value, { fallback = false } = {}) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  function pickArray(value, { itemType, fallback = [], minLength } = {}) {
    if (!Array.isArray(value)) return fallback;
    let items = value;
    if (itemType === 'string') {
      items = items.filter((x) => typeof x === 'string');
    } else if (itemType === 'number') {
      items = items.map(coerceNumber).filter(Number.isFinite);
    }
    if (Number.isFinite(minLength) && items.length < minLength) return fallback;
    return items;
  }

  function pickObject(value, { fallback = {} } = {}) {
    return isPlainObject(value) ? value : fallback;
  }

  // Validate a single field from settings according to its spec entry.
  function validateField(rawValue, fieldSpec) {
    const { type, default: defaultValue } = fieldSpec;
    const fallback = defaultValue;
    switch (type) {
      case 'number':
        return pickNumber(rawValue, { min: fieldSpec.min, max: fieldSpec.max, fallback });
      case 'enum':
        return pickEnum(rawValue, fieldSpec.values, fallback);
      case 'string':
        return pickString(rawValue, { fallback, nullable: !!fieldSpec.nullable });
      case 'boolean':
        return pickBoolean(rawValue, { fallback });
      case 'array':
        return pickArray(rawValue, { itemType: fieldSpec.itemType, fallback, minLength: fieldSpec.minLength });
      case 'object':
        // Optional nested schema support
        if (isPlainObject(fieldSpec.fields)) {
          return validateSettings(rawValue, fieldSpec.fields);
        }
        return pickObject(rawValue, { fallback });
      case 'any':
        return rawValue === undefined ? fallback : rawValue;
      default:
        return rawValue === undefined ? fallback : rawValue;
    }
  }

  function validateSettings(rawSettings, fields) {
    const input = isPlainObject(rawSettings) ? rawSettings : {};
    const out = {};
    const known = new Set(Object.keys(fields));
    for (const key of known) {
      const spec = fields[key];
      // Resolve value, also honoring aliases if provided
      let value = input[key];
      if (value === undefined && Array.isArray(spec.aliases)) {
        for (const alias of spec.aliases) {
          if (alias in input) { value = input[alias]; break; }
        }
      }
      out[key] = validateField(value, spec);
    }
    // Log unknown keys in dev (non-fatal)
    if (typeof console !== 'undefined') {
      const extras = Object.keys(input).filter((k) => !known.has(k));
      if (extras.length) {
        console.debug('[settings-compat] unknown keys ignored:', extras);
      }
    }
    return out;
  }

  // Run migrations sequentially from payload.version up to spec.version.
  function applyMigrations(payload, spec) {
    const migrations = Array.isArray(spec.migrations) ? spec.migrations : [];
    let current = payload;
    let fromVersion = Number.isFinite(current?.version) ? current.version : 0;
    while (fromVersion < spec.version) {
      const step = migrations.find((m) => m.from === fromVersion && m.to === fromVersion + 1);
      if (!step || typeof step.up !== 'function') break;
      try {
        current = step.up(current) || current;
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn(`[settings-compat] migration ${fromVersion}->${fromVersion + 1} failed:`, err);
        }
        break;
      }
      fromVersion += 1;
    }
    return current;
  }

  // Public API
  // Build a payload for saving, from current module state.
  // { data, settings, chartType? } -> { version, chartType, data, settings }
  function build(spec, { data, settings, chartType } = {}) {
    if (!spec) throw new Error('[settings-compat] build: spec required');
    const validatedSettings = validateSettings(settings, spec.fields);
    return {
      version: spec.version,
      chartType: chartType || spec.chartType,
      data: data,
      settings: validatedSettings,
    };
  }

  // Normalize an incoming payload: apply migrations, validate settings.
  // Returns { ...migrated, version, chartType, data, settings } — preserves any
  // framework-level top-level keys (e.g. annotateTitle, annotateSource,
  // annotateSourceUrl, legendPosition that share-service injects).
  function normalize(payload, spec) {
    if (!spec) throw new Error('[settings-compat] normalize: spec required');
    const base = isPlainObject(payload) ? payload : {};
    const migrated = applyMigrations(base, spec);
    return {
      ...migrated,
      version: spec.version,
      chartType: migrated.chartType || spec.chartType,
      data: migrated.data,
      settings: validateSettings(migrated.settings, spec.fields),
    };
  }

  window.DVZSettingsCompat = {
    build,
    normalize,
    pickNumber,
    pickEnum,
    pickString,
    pickBoolean,
    pickArray,
    pickObject,
  };
})();
