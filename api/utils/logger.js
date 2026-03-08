import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
const DEFAULT_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_LOG_BUFFER = 1000;

const levelWeight = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const runningInTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test');
const shouldWriteToConsole = !runningInTest;
const runtimeLevel = LOG_LEVELS.includes(DEFAULT_LEVEL) ? DEFAULT_LEVEL : 'info';
let logStream = null;
const recentLogs = [];

const ensureLogStream = () => {
  if (runningInTest) {
    return null;
  }

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  if (!logStream) {
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf8' });
    logStream.on('error', () => {
      logStream = null;
    });
  }

  return logStream;
};

const truncate = (value, max = 256) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const redactValue = (key, value) => {
  const normalized = String(key || '').toLowerCase();
  if (
    normalized.includes('password') ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized === 'authorization'
  ) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return truncate(value, 2000);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) =>
      typeof item === 'object' && item !== null ? sanitize(item) : item
    );
  }

  if (value && typeof value === 'object') {
    return sanitize(value);
  }

  return value;
};

const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const output = {};
  for (const [key, value] of Object.entries(obj)) {
    output[key] = redactValue(key, value);
  }
  return output;
};

const pushRecentLog = (entry) => {
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOG_BUFFER) {
    recentLogs.pop();
  }
};

const canLog = (level) => levelWeight[level] >= levelWeight[runtimeLevel];

const writeEntry = (entry) => {
  const serialized = `${JSON.stringify(entry)}\n`;
  const stream = ensureLogStream();
  if (stream) {
    stream.write(serialized);
  }
  if (shouldWriteToConsole) {
    const consoleMethod = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
    // eslint-disable-next-line no-console
    console[consoleMethod](serialized.trim());
  }
};

const baseLog = (level, message, metadata = {}) => {
  if (!LOG_LEVELS.includes(level) || !canLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: truncate(String(message || ''), 2000),
    ...sanitize(metadata)
  };

  pushRecentLog(entry);
  writeEntry(entry);
};

export const logger = {
  debug: (message, metadata) => baseLog('debug', message, metadata),
  info: (message, metadata) => baseLog('info', message, metadata),
  warn: (message, metadata) => baseLog('warn', message, metadata),
  error: (message, metadata) => baseLog('error', message, metadata),
  child: (baseMetadata = {}) => ({
    debug: (message, metadata) =>
      baseLog('debug', message, { ...baseMetadata, ...metadata }),
    info: (message, metadata) =>
      baseLog('info', message, { ...baseMetadata, ...metadata }),
    warn: (message, metadata) =>
      baseLog('warn', message, { ...baseMetadata, ...metadata }),
    error: (message, metadata) =>
      baseLog('error', message, { ...baseMetadata, ...metadata })
  }),
  getRecentLogs: (count = 100) => recentLogs.slice(0, Math.max(0, count)),
  clearRecentLogs: () => {
    recentLogs.length = 0;
  }
};

export default logger;
