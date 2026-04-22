/**
 * Optional price fields: empty → undefined. Set values must be finite and ≥ 0.
 * @param {unknown} value
 * @param {string} fieldName - e.g. "previousPrice"
 * @returns {{ ok: true, value: number | undefined } | { ok: false, msg: string }}
 */
function parseOptionalNonNegativePrice(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return { ok: false, msg: `${fieldName} must be a valid number` };
  }
  if (n < 0) {
    return { ok: false, msg: `${fieldName} cannot be negative` };
  }
  return { ok: true, value: n };
}

module.exports = {
  parseOptionalNonNegativePrice,
};
