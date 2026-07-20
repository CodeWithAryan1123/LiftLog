export default function requestLogger(req, _res, next) {
  try {
    const safeBody = { ...req.body };
    if (safeBody && typeof safeBody === 'object') {
      if ('password' in safeBody) safeBody.password = '[REDACTED]';
    }

    console.info(`--> ${req.method} ${req.originalUrl} - body:`, safeBody);
  } catch (err) {
    console.error('Logger failed:', err && err.message);
  }
  next();
}
