const path = require('path');
const buildMeta = require('../libs/buildMeta.js');

describe('buildMeta', () => {
  const keys = [
    'TRIBES_LAST_COMMIT_DATE',
    'TRIBES_LAST_COMMIT_DATE_SHORT',
    'TRIBES_LAST_COMMIT_HASH',
    'SOURCE_COMMIT_DATE',
    'SOURCE_COMMIT',
  ];
  const saved = {};

  beforeEach(() => {
    keys.forEach((key) => {
      saved[key] = process.env[key];
      delete process.env[key];
    });
  });

  afterEach(() => {
    keys.forEach((key) => {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    });
  });

  test('prefers TRIBES_LAST_COMMIT_DATE from env', () => {
    process.env.TRIBES_LAST_COMMIT_DATE = '2026-08-01T12:00:00.000Z';
    process.env.TRIBES_LAST_COMMIT_HASH = 'abc1234';
    process.env.TRIBES_LAST_COMMIT_DATE_SHORT = '2026-08-01';

    const info = buildMeta.getBuildInfo(path.join(__dirname, '..'));
    expect(info.lastCommitDate).toBe('2026-08-01T12:00:00.000Z');
    expect(info.lastCommitHash).toBe('abc1234');
    expect(info.lastCommitDateShort).toBe('2026-08-01');
  });

  test('ignores empty env strings and still returns a date', () => {
    process.env.TRIBES_LAST_COMMIT_DATE = '   ';
    process.env.TRIBES_LAST_COMMIT_HASH = '';

    const info = buildMeta.getBuildInfo(path.join(__dirname, '..'));
    expect(info.lastCommitDate).toBeTruthy();
    expect(Number.isNaN(new Date(info.lastCommitDate).getTime())).toBe(false);
  });

  test('injectIntoHtml sets TRIBES_BUILD_INFO and refreshes interface-version meta', () => {
    const html =
      '<!DOCTYPE html><html><head>\n' +
      '    <meta name="interface-version" content="2026-06-18T00:00:00.000Z">\n' +
      '</head><body>hi</body></html>';

    const buildInfo = {
      lastCommitDate: '2026-08-03T15:30:00.000Z',
      lastCommitDateShort: '2026-08-03',
      lastCommitHash: 'deadbeef',
    };
    const out = buildMeta.injectIntoHtml(html, buildInfo, {
      port: 8000,
      protocol: 'http',
      host: 'localhost',
    });

    expect(out).toContain('window.TRIBES_BUILD_INFO');
    expect(out).toContain('2026-08-03T15:30:00.000Z');
    expect(out).toContain('window.TRIBES_WS_CONFIG');
    expect(out).toContain(
      '<meta name="interface-version" content="2026-08-03T15:30:00.000Z">'
    );
    expect(out).not.toContain('2026-06-18T00:00:00.000Z');
  });
});
