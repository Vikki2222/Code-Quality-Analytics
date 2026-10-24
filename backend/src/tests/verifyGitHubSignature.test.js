jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const crypto = require('crypto');
const verifyGitHubSignature = require('../middleware/verifyGitHubSignature');

const SECRET = 'test-webhook-secret';
const BODY = Buffer.from(JSON.stringify({ action: 'opened' }));

function sign(body, secret = SECRET) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function run({ body = BODY, signature } = {}) {
  const req = { headers: signature ? { 'x-hub-signature-256': signature } : {}, body };
  const res = mockRes();
  const next = jest.fn();
  verifyGitHubSignature(req, res, next);
  return { res, next };
}

const ORIGINAL_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
beforeEach(() => {
  process.env.GITHUB_WEBHOOK_SECRET = SECRET;
});
afterAll(() => {
  process.env.GITHUB_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

describe('verifyGitHubSignature', () => {
  test('calls next for a correctly signed body', () => {
    const { res, next } = run({ signature: sign(BODY) });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects a missing signature with 401', () => {
    const { res, next } = run();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a signature made with the wrong secret', () => {
    const { res, next } = run({ signature: sign(BODY, 'wrong-secret') });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a valid signature for a different body (tampered payload)', () => {
    const { res, next } = run({ body: Buffer.from('{"action":"closed"}'), signature: sign(BODY) });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a signature of a different length without throwing', () => {
    const { res, next } = run({ signature: 'sha256=abc' });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a non-Buffer body (wrong content type) with 400', () => {
    const { res, next } = run({ body: {}, signature: sign(BODY) });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 instead of throwing when the secret is not configured', () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const { res, next } = run({ signature: sign(BODY) });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
