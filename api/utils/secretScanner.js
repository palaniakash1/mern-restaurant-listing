/* eslint-disable no-console */
/**
 * Secret Scanner Utility
 * Scans code for potential hardcoded secrets
 *
 * Usage:
 * node api/utils/secretScanner.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to detect secrets
const SECRET_PATTERNS = [
  { pattern: /password\s*=\s*['"][^'"]+['"]/gi, name: 'Hardcoded password' },
  { pattern: /apiKey\s*=\s*['"][^'"]+['"]/gi, name: 'Hardcoded API key' },
  { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, name: 'Hardcoded secret' },
  { pattern: /jwtSecret\s*=\s*['"][^'"]+['"]/gi, name: 'Hardcoded JWT secret' },
  { pattern: /privateKey\s*=\s*['"][^'"]+['"]/gi, name: 'Hardcoded private key' },
  { pattern: /aws_access_key\s*=\s*['"][^'"]+['"]/gi, name: 'AWS access key' },
  { pattern: /stripe_key\s*=\s*['"][^'"]+['"]/gi, name: 'Stripe key' }
];

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /package-lock\.json/,
  /\.env\.example/,
  /secretScanner\.js/
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const { pattern, name } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({ file: filePath, name, matches });
    }
  }

  return issues;
}

function scanDirectory(dirPath, issues = []) {
  if (IGNORE_PATTERNS.some(p => p.test(dirPath))) {
    return issues;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, issues);
    } else if (/\.js$|\.jsx$|\.ts$|\.tsx$/.test(file)) {
      const fileIssues = scanFile(fullPath);
      issues.push(...fileIssues);
    }
  }

  return issues;
}

function main() {
  const apiDir = path.join(__dirname, '..');

  console.log('🔍 Scanning for secrets...\n');

  const issues = scanDirectory(apiDir);

  if (issues.length === 0) {
    console.log('✅ No secrets found!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${issues.length} potential secret(s):\n`);

    for (const issue of issues) {
      console.log(`  📁 ${issue.file}`);
      console.log(`     ⚠️  ${issue.name}`);
      console.log(`     ${issue.matches.join(', ')}\n`);
    }

    process.exit(1);
  }
}

main();
