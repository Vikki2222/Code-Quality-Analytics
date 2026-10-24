const pino = require('pino');
const { AxiosError } = require('axios');

// Load the logger without the pino-pretty transport (avoids a worker thread in tests).
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
const { errSerializer } = require('../config/logger');
process.env.NODE_ENV = ORIGINAL_NODE_ENV;

const TOKEN = 'gho_supersecrettoken123';

function githubAxiosError() {
  const config = { url: '/repos/o/r', headers: { Authorization: `Bearer ${TOKEN}` } };
  const response = { status: 401, data: { message: 'Bad credentials' }, headers: {}, config };
  return new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, {}, response);
}

describe('logger errSerializer', () => {
  test('the default pino serializer would leak the token (guards this test stays meaningful)', () => {
    expect(JSON.stringify(pino.stdSerializers.err(githubAxiosError()))).toContain(TOKEN);
  });

  test('strips the GitHub token from serialized axios errors', () => {
    expect(JSON.stringify(errSerializer(githubAxiosError()))).not.toContain(TOKEN);
  });

  test('keeps message, stack and response status', () => {
    const out = errSerializer(githubAxiosError());
    expect(out.message).toBe('Request failed with status code 401');
    expect(out.stack).toBeDefined();
    expect(out.response).toEqual({ status: 401 });
  });

  test('serializes plain errors unchanged', () => {
    const out = errSerializer(new Error('boom'));
    expect(out.message).toBe('boom');
    expect(out.type).toBe('Error');
  });
});
