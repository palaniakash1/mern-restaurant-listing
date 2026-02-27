/**
 * File-Based Logger with Rotating Log Stack
 * Maintains last 500 logs in memory and writes to file with rotation
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_LOGS = 500;
const MAX_FILE_LINES = 1000; // Rotate file after this many lines
const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

// In-memory log storage
const logStack = [];

// Track file lines for rotation
let fileLineCount = 0;

// Ensure log directory exists
const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

/**
 * Rotate log file if too large
 */
const rotateLogFile = () => {
  const backupFile = path.join(LOG_DIR, "app.old.log");
  
  // If backup exists, remove it
  if (fs.existsSync(backupFile)) {
    fs.unlinkSync(backupFile);
  }
  
  // Rename current to backup
  if (fs.existsSync(LOG_FILE)) {
    fs.renameSync(LOG_FILE, backupFile);
  }
  
  fileLineCount = 0;
};

/**
 * Count existing lines in log file (on startup)
 */
const countExistingLines = () => {
  if (!fs.existsSync(LOG_FILE)) return 0;
  const content = fs.readFileSync(LOG_FILE, "utf8");
  return content.split("\n").filter(line => line.trim()).length;
};

/**
 * Initialize file line count
 */
const initFileLogger = () => {
  ensureLogDir();
  fileLineCount = countExistingLines();
  
  // Rotate if file too large
  if (fileLineCount >= MAX_FILE_LINES) {
    rotateLogFile();
  }
};

// Initialize on module load
initFileLogger();

/**
 * Adds a log entry to the stack
 * @param {Object} logEntry - The log entry to add
 */
const addToStack = (logEntry) => {
  // Add to beginning of array
  logStack.unshift(logEntry);
  
  // Remove oldest logs if exceeding MAX_LOGS
  while (logStack.length > MAX_LOGS) {
    logStack.pop();
  }
};

/**
 * Writes log entry to file
 * Only writes errors by default to reduce I/O
 * @param {Object} logEntry - The log entry to write
 * @param {boolean} forceWrite - Force write even for non-errors
 */
const writeToFile = (logEntry, forceWrite = false) => {
  // Only write errors to file by default (reduce I/O)
  // Or if forceWrite is true (for important logs)
  if (!forceWrite && logEntry.type !== "error") {
    return;
  }
  
  ensureLogDir();
  
  // Check if rotation needed
  if (fileLineCount >= MAX_FILE_LINES) {
    rotateLogFile();
  }
  
  const logLine = JSON.stringify(logEntry) + "\n";
  fs.appendFileSync(LOG_FILE, logLine, "utf8");
  fileLineCount++;
};

/**
 * Main logging function
 * @param {string} type - Log type (request, response, error, info, warn)
 * @param {Object} data - Log data
 */
export const log = (type, data) => {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    type,
    timestamp,
    ...data,
  };
  
  // Add to in-memory stack (always)
  addToStack(logEntry);
  
  // Write to file (only errors by default, or force for important logs)
  writeToFile(logEntry, type === "error");
  
  // Also output to console for development
  if (process.env.NODE_ENV !== "production") {
    console.log(JSON.stringify(logEntry));
  }
};

/**
 * Convenience methods for different log types
 */
export const logRequest = (data) => log("request", data);
export const logResponse = (data) => log("response", data);
export const logError = (data) => log("error", data);
export const logInfo = (data) => log("info", data);
export const logWarn = (data) => log("warn", data);

/**
 * Get all logs from the stack
 * @returns {Array} Array of log entries
 */
export const getLogs = () => [...logStack];

/**
 * Get logs by type
 * @param {string} type - Log type to filter by
 * @returns {Array} Filtered log entries
 */
export const getLogsByType = (type) => logStack.filter((log) => log.type === type);

/**
 * Get recent logs
 * @param {number} count - Number of logs to retrieve
 * @returns {Array} Array of recent log entries
 */
export const getRecentLogs = (count = 50) => logStack.slice(0, count);

/**
 * Clear the log stack (useful for testing)
 */
export const clearLogs = () => {
  logStack.length = 0;
};

/**
 * Get log statistics
 * @returns {Object} Statistics about logs
 */
export const getLogStats = () => {
  const stats = {
    total: logStack.length,
    maxCapacity: MAX_LOGS,
    byType: {},
  };
  
  logStack.forEach((log) => {
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
  });
  
  return stats;
};

/**
 * Search logs by key-value pairs
 * @param {Object} criteria - Search criteria
 * @returns {Array} Matching log entries
 */
export const searchLogs = (criteria) => {
  return logStack.filter((log) => {
    return Object.entries(criteria).every(([key, value]) => {
      if (value instanceof RegExp) {
        return value.test(log[key]);
      }
      return log[key] === value;
    });
  });
};

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
  searchLogs,
};
