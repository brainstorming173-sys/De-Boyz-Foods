export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.code === '23505' ? 409 : 500);
  if (status >= 500) console.error(err);
  const message =
    err.code === '23505' ? 'That already exists' : status >= 500 ? 'Something went wrong on our side' : err.message;
  res.status(status).json({ error: message });
}

// Wrap async route handlers so rejected promises reach errorHandler.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const bad = (message, status = 400) => Object.assign(new Error(message), { status });
