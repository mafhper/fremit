import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockfile = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const policy = JSON.parse(
  readFileSync(join(root, '.github', 'dependency-audit-exceptions.json'), 'utf8'),
);
const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath
  ? process.execPath
  : process.platform === 'win32'
    ? 'npm.cmd'
    : 'npm';
const npmArgs = npmExecPath
  ? [npmExecPath, 'audit', '--json', '--audit-level=high']
  : ['audit', '--json', '--audit-level=high'];
const audit = spawnSync(npmCommand, npmArgs, {
  cwd: root,
  encoding: 'utf8',
  shell: !npmExecPath && process.platform === 'win32',
});

if (audit.error) {
  console.error(`Unable to run npm audit: ${audit.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('npm audit did not return valid JSON.');
  if (audit.stdout) console.error(audit.stdout);
  if (audit.stderr) console.error(audit.stderr);
  process.exit(audit.status || 1);
}

const isAuditReport =
  report &&
  typeof report === 'object' &&
  report.auditReportVersion &&
  report.vulnerabilities &&
  report.metadata?.vulnerabilities &&
  !report.error;

if (!isAuditReport) {
  console.error(`npm audit returned an invalid or error-shaped report (exit ${audit.status ?? 'unknown'}).`);
  console.error(JSON.stringify(report, null, 2));
  if (audit.stderr) console.error(audit.stderr);
  process.exit(1);
}

const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

function versionParts(version) {
  return String(version)
    .split('.')
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function isAtLeast(version, minimum) {
  const actual = versionParts(version);
  const expected = versionParts(minimum);
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) return actual[index] > expected[index];
  }
  return true;
}

function packageVersion(name) {
  return lockfile.packages?.[`node_modules/${name}`]?.version;
}

function advisoryIds(vulnerability) {
  return (vulnerability?.via ?? [])
    .filter((item) => typeof item === 'object' && item !== null)
    .flatMap((item) => {
      const text = `${item.url ?? ''} ${item.title ?? ''}`;
      return text.match(/GHSA-[a-z0-9-]+/gi) ?? [];
    })
    .map((id) => id.toUpperCase());
}

function matchesException(name, vulnerability, exception, vulnerabilities) {
  if (!exception.packages.includes(name)) return false;
  if (severityRank[vulnerability.severity] > severityRank[exception.maxSeverity]) return false;

  for (const [packageName, minimum] of Object.entries(exception.minimumVersions ?? {})) {
    const installed = packageVersion(packageName);
    if (!installed || versionParts(installed)[0] !== exception.major || !isAtLeast(installed, minimum)) {
      return false;
    }
  }

  if (name === 'react-router-dom') {
    const upstream = vulnerabilities['react-router'];
    return (
      vulnerability.via?.length === 1 &&
      vulnerability.via[0] === 'react-router' &&
      upstream &&
      advisoryIds(upstream).includes(exception.advisory.toUpperCase())
    );
  }

  const ids = advisoryIds(vulnerability);
  return ids.length === 1 && ids[0] === exception.advisory.toUpperCase();
}

const unresolved = [];
const ignored = [];

for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  if (severityRank[vulnerability.severity] < severityRank.high) continue;

  const exception = policy.exceptions.find((candidate) =>
    matchesException(name, vulnerability, candidate, report.vulnerabilities),
  );

  if (exception) {
    ignored.push(`${exception.advisory} (${name}@${packageVersion(name)})`);
  } else {
    unresolved.push({ name, severity: vulnerability.severity, via: vulnerability.via });
  }
}

for (const item of ignored) console.warn(`Accepted documented audit exception: ${item}`);

if (unresolved.length > 0) {
  console.error('Unapproved high or critical vulnerabilities remain:');
  console.error(JSON.stringify(unresolved, null, 2));
  process.exit(1);
}

console.log('npm audit passed with no unapproved high or critical vulnerabilities.');
