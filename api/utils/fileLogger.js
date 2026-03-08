import { logger } from './logger.js';

const MAX_LOGS = 1000;
const logStack = [];

const addToStack = (entry) => {
  logStack.unshift(entry);
  while (logStack.length > MAX_LOGS) {
    logStack.pop();
  }
};

export const log = (type, data) => {
  const logEntry = {
    type,
    timestamp: new Date().toISOString(),
    ...(data || {})
  };
  addToStack(logEntry);

  if (type === 'error') {
    logger.error(type, logEntry);
    return;
  }
  if (type === 'warn') {
    logger.warn(type, logEntry);
    return;
  }
  logger.info(type, logEntry);
};

export const logRequest = (data) => log('request', data);
export const logResponse = (data) => log('response', data);
export const logError = (data) => log('error', data);
export const logInfo = (data) => log('info', data);
export const logWarn = (data) => log('warn', data);

export const getLogs = () => [...logStack];
export const getLogsByType = (type) => logStack.filter((entry) => entry.type === type);
export const getRecentLogs = (count = 50) => logStack.slice(0, count);
export const clearLogs = () => {
  logStack.length = 0;
  logger.clearRecentLogs();
};
export const getLogStats = () => {
  const byType = {};
  for (const entry of logStack) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  return {
    total: logStack.length,
    maxCapacity: MAX_LOGS,
    byType
  };
};
export const searchLogs = (criteria) =>
  logStack.filter((entry) =>
    Object.entries(criteria).every(([key, value]) => {
      if (value instanceof RegExp) {
        return value.test(String(entry[key] || ''));
      }
      return entry[key] === value;
    })
  );

export default {
  log,
  logRequest,
  logResponse,
  logError,
  logInfo,
  logWarn,
  getLogs,
  getLogsByType,
  getRecentLogs,
  clearLogs,
  getLogStats,
  searchLogs
};
