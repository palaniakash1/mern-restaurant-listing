/**
 * Retry Logic and Circuit Breaker Utilities
 * Provides robust error handling for database operations
 */

/**
 * Simple delay function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff calculator
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Calculated delay
 */
export const calculateBackoff = (attempt, baseDelay = 100, maxDelay = 5000) => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Retry decorator for async functions
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    baseDelay = 100,
    maxDelay = 5000,
    retryableErrors = [],
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = retryableErrors.length === 0 || 
        retryableErrors.some((errType) => error instanceof errType);

      if (!isRetryable || attempt === maxAttempts - 1) {
        throw error;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1, maxAttempts);
      }

      // Calculate and wait
      const waitTime = calculateBackoff(attempt, baseDelay, maxDelay);
      await delay(waitTime);
    }
  }

  throw lastError;
};

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: "closed",      // Normal operation
  OPEN: "open",          // Failing, reject calls
  HALF_OPEN: "half-open", // Testing if service recovered
};

/**
 * Circuit Breaker Class
 */
export class CircuitBreaker {
  /**
   * Create a circuit breaker
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute default
    this.name = options.name || "default";

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  /**
   * Execute a function through the circuit breaker
   * @param {Function} fn - Function to execute
   * @returns {Promise} Result of the function
   */
  async execute(fn) {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN. Try again later.`);
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  _onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }
}

/**
 * Registry for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker
   * @param {string} name - Breaker name
   * @param {Object} options - Breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  getOrCreate(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...options }));
    }
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breaker statuses
   * @returns {Array} Array of status objects
   */
  getAllStatuses() {
    return Array.from(this.breakers.values()).map((breaker) => breaker.getStatus());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.breakers.forEach((breaker) => breaker.reset());
  }
}

// Singleton instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Get a circuit breaker for a specific service
 * @param {string} name - Service name
 * @param {Object} options - Breaker options
 * @returns {CircuitBreaker} Circuit breaker instance
 */
export const getCircuitBreaker = (name, options) => {
  return circuitBreakerRegistry.getOrCreate(name, options);
};

export default {
  delay,
  calculateBackoff,
  withRetry,
  CircuitBreaker,
  circuitBreakerRegistry,
  getCircuitBreaker,
  CircuitState,
};
