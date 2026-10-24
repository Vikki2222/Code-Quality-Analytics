const pino = require('pino');

/**
 * Axios errors carry the outgoing request config - including the GitHub
 * `Authorization: Bearer <token>` header. Pino's default serializer copies
 * every enumerable property, so without this the user's token is written
 * to the logs on any failed GitHub call. Keep only the response status.
 */
function errSerializer(err) {
  const serialized = pino.stdSerializers.err(err);
  if (serialized && typeof serialized === 'object') {
    delete serialized.config;
    delete serialized.request;
    if (serialized.response) {
      serialized.response = { status: err.response && err.response.status };
    }
  }
  return serialized;
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: { err: errSerializer },
  // Defence in depth in case a token is ever logged as a plain field.
  redact: {
    paths: ['accessToken', '*.accessToken', 'github_access_token', '*.github_access_token'],
    censor: '[redacted]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
});

module.exports = logger;
module.exports.errSerializer = errSerializer;
