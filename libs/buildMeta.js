const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function nonEmpty(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function runGit(command, cwd) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      cwd: cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_error) {
    return '';
  }
}

/**
 * Resolve build/update metadata for the UI footer.
 * Prefer env (Docker/CI), then git, then tribes-interface.html mtime.
 */
function getBuildInfo(appRoot) {
  const root = appRoot || path.join(__dirname, '..');

  let lastCommitDate =
    nonEmpty(process.env.TRIBES_LAST_COMMIT_DATE) ||
    nonEmpty(process.env.SOURCE_COMMIT_DATE);
  let lastCommitDateShort = nonEmpty(process.env.TRIBES_LAST_COMMIT_DATE_SHORT);
  let lastCommitHash =
    nonEmpty(process.env.TRIBES_LAST_COMMIT_HASH) ||
    nonEmpty(process.env.SOURCE_COMMIT);

  if (!lastCommitDate) {
    const isRepo = runGit('git rev-parse --is-inside-work-tree', root);
    if (isRepo === 'true') {
      lastCommitDate = nonEmpty(runGit('git log -1 --format=%cI', root));
      if (!lastCommitDateShort) {
        lastCommitDateShort = nonEmpty(runGit('git log -1 --format=%cs', root));
      }
      if (!lastCommitHash) {
        lastCommitHash = nonEmpty(runGit('git rev-parse --short HEAD', root));
      }
    }
  }

  if (!lastCommitDate) {
    try {
      const htmlPath = path.join(root, 'tribes-interface.html');
      lastCommitDate = fs.statSync(htmlPath).mtime.toISOString();
    } catch (_error) {
      lastCommitDate = new Date().toISOString();
    }
  }

  if (!lastCommitDateShort && lastCommitDate) {
    const parsed = new Date(lastCommitDate);
    if (!Number.isNaN(parsed.getTime())) {
      lastCommitDateShort = parsed.toISOString().slice(0, 10);
    }
  }

  return {
    lastCommitDate,
    lastCommitDateShort: lastCommitDateShort || null,
    lastCommitHash: lastCommitHash || null,
  };
}

/**
 * Inject WS config + build info scripts and refresh the interface-version meta.
 */
function injectIntoHtml(html, buildInfo, wsConfig) {
  const configScript = `<script>window.TRIBES_WS_CONFIG = ${JSON.stringify(wsConfig)};</script>`;
  const buildInfoScript = `<script>window.TRIBES_BUILD_INFO = ${JSON.stringify(buildInfo)};</script>`;

  let modified = String(html || '').replace(
    '<head>',
    '<head>\n    ' + configScript + '\n    ' + buildInfoScript
  );

  if (buildInfo && buildInfo.lastCommitDate) {
    const metaTag =
      '<meta name="interface-version" content="' +
      String(buildInfo.lastCommitDate).replace(/"/g, '') +
      '">';
    if (/<meta\s+name=["']interface-version["']\s+content=["'][^"']*["']\s*\/?>/i.test(modified)) {
      modified = modified.replace(
        /<meta\s+name=["']interface-version["']\s+content=["'][^"']*["']\s*\/?>/i,
        metaTag
      );
    } else {
      modified = modified.replace('<head>', '<head>\n    ' + metaTag);
    }
  }

  return modified;
}

module.exports = {
  getBuildInfo,
  injectIntoHtml,
  nonEmpty,
  runGit,
};
