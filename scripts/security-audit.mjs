#!/usr/bin/env node
// Read-only baseline. Never print suspected secret values; never mutate manuscript assets.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const errors = [];
const warnings = [];
const report = (list, message) => list.push(message);
const exists = file => fs.existsSync(file) && fs.statSync(file).isFile();
const read = file => fs.readFileSync(file, 'utf8');

for (const file of [
  'SECURITY.md',
  '.github/dependabot.yml',
  '.github/workflows/protect-library-assets.yml',
  'scripts/guard-library-assets.mjs'
]) {
  if (!exists(file)) report(errors, 'Required file missing: ' + file);
}

if (exists('.github/workflows/protect-library-assets.yml')) {
  const guard = read('.github/workflows/protect-library-assets.yml');
  if (!guard.includes('scripts/guard-library-assets.mjs')) {
    report(errors, 'The manuscript and folio integrity check is missing from its workflow');
  }
  if (!/^\s*contents:\s*read\s*$/m.test(guard)) {
    report(errors, 'Manuscript protection workflow must remain read-only');
  }
}

if (exists('.github/workflows/security-audit.yml')) {
  const self = read('.github/workflows/security-audit.yml');
  if (!/^\s*contents:\s*read\s*$/m.test(self) ||
      !/persist-credentials:\s*false/.test(self)) {
    report(errors, 'Security audit must be read-only and avoid persisted credentials');
  }
}

const workflows = fs.readdirSync('.github/workflows')
  .filter(name => /\.ya?ml$/i.test(name))
  .map(name => path.posix.join('.github/workflows', name));

const writeWorkflows = [];
for (const file of workflows) {
  const value = read(file);
  if (/^\s*permissions:\s*write-all\s*$/m.test(value)) {
    report(errors, 'Unrestricted write-all token permission: ' + file);
  }
  if (/^\s*pull_request_target\s*:/m.test(value) ||
      /^\s*workflow_run\s*:/m.test(value)) {
    report(warnings, 'Privileged workflow trigger requires manual review: ' + file);
  }
  if (/^\s*contents:\s*write\s*$/m.test(value)) {
    writeWorkflows.push(file);
  }
}

if (writeWorkflows.length) {
  report(warnings, writeWorkflows.length +
    ' existing workflow(s) request contents: write; audit least-privilege and publication paths separately');
}

let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
  }).split('\0').filter(Boolean);
} catch (e) {
  report(errors, 'Unable to list tracked files for secret-pattern scan');
}

const secretPatterns = [
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g
];
const sources = tracked.filter(file =>
  !file.startsWith('data/') &&
  !file.startsWith('documents/') &&
  !file.startsWith('corpus/') &&
  !file.startsWith('images/') &&
  !file.startsWith('covers/') &&
  !file.startsWith('bibliotecas/') &&
  file !== 'scripts/security-audit.mjs' &&
  /(?:\.html?|\.js|\.mjs|\.cjs|\.ts|\.json|\.ya?ml|\.toml|\.sh|\.env)$/i.test(file)
);
let examined = 0;
let largeFiles = 0;
for (const file of sources) {
  if (!exists(file)) continue;
  if (fs.statSync(file).size > 2 * 1024 * 1024) {
    largeFiles++;
    continue;
  }
  const value = read(file);
  examined++;
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0;
    const found = pattern.exec(value);
    if (found) {
      const line = value.slice(0, found.index).split('\n').length;
      report(errors, 'Possible credential in public source: ' + file + ':' + line +
        ' (value intentionally omitted)');
      break;
    }
  }
}

console.log('Security audit: workflows=' + workflows.length +
  ', source files inspected=' + examined +
  ', oversized sources not scanned=' + largeFiles);
for (const message of warnings) console.log('::warning::' + message);
for (const message of errors) console.log('::error::' + message);
if (errors.length) {
  console.error('Security audit failed with ' + errors.length + ' actionable issue(s).');
  process.exitCode = 1;
} else {
  console.log('Security baseline passed. This is not a substitute for professional penetration testing.');
}
