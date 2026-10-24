jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('../config/db', () => ({ query: jest.fn() }));

process.env.TOKEN_ENCRYPTION_KEY = 'ab'.repeat(32);

const { query } = require('../config/db');
const { encrypt } = require('../utils/encryption');
const userService = require('../services/user.service');

function userRow(storedToken) {
  return { id: 1, github_id: 555, username: 'octo', github_access_token: storedToken };
}

beforeEach(() => jest.clearAllMocks());

describe('user.service token handling', () => {
  test('returns the decrypted token', async () => {
    query.mockResolvedValue({ rows: [userRow(encrypt('gho_real'))] });
    const user = await userService.findById(1);
    expect(user.github_access_token).toBe('gho_real');
  });

  test('returns a null token (not a throw) when the ciphertext fails authentication', async () => {
    const [iv, tag, data] = encrypt('gho_real').split(':');
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}${data.endsWith('00') ? '11' : '00'}`;
    query.mockResolvedValue({ rows: [userRow(tampered)] });
    const user = await userService.findById(1);
    expect(user).not.toBeNull();
    expect(user.github_access_token).toBeNull();
  });

  test('findByGitHubId queries by numeric github_id', async () => {
    query.mockResolvedValue({ rows: [userRow(encrypt('gho_real'))] });
    await userService.findByGitHubId(555);
    expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE github_id = $1', [555]);
  });

  test('stores only the encrypted token on login', async () => {
    query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockImplementationOnce(async (sql, params) => ({ rows: [userRow(params[4])] }));
    await userService.findOrCreateFromGitHubProfile({ id: 555, username: 'octo' }, 'gho_plain');
    const insertParams = query.mock.calls[1][1];
    expect(insertParams).not.toContain('gho_plain');
  });
});
