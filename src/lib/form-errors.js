import { ApiError, errorMessage } from "./api";

/**
 * Splits an API error into messages shown under the matching form fields and
 * a banner for anything not tied to a field on this form.
 */
export function formErrors(error, fields) {
  if (!error) return { banner: null, field: {} };
  if (!(error instanceof ApiError)) return { banner: errorMessage(error), field: {} };

  const field = {};
  const other = [];
  for (const [key, msg] of Object.entries(error.fieldErrors)) {
    if (fields.includes(key)) field[key] = msg;
    else other.push(msg);
  }
  const hasFieldErrors = Object.keys(field).length > 0;
  const banner = other[0] ?? (hasFieldErrors ? null : error.message);
  return { banner, field };
}
