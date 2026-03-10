# Load Testing

This directory contains load testing configurations for the MERN Restaurant API.

## Prerequisites

- [K6](https://k6.io/) installed on your system
- Node.js and MongoDB running
- API server running on localhost:3000 (or specified BASE_URL)

## Running Load Tests

### Auth Load Test

The auth load test simulates realistic user behavior across authentication endpoints:

```bash
# Run with default configuration (localhost:3000)
k6 run api/load-tests/auth-load-test.js

# Run against a different base URL
k6 run -e BASE_URL=https://api.example.com api/load-tests/auth-load-test.js

# Run with custom duration and users
k6 run --vus 50 --duration 10m api/load-tests/auth-load-test.js

# Generate HTML report
k6 run --out html=auth-load-report.html api/load-tests/auth-load-test.js

# Generate JSON summary
k6 run --out json=auth-load-results.json api/load-tests/auth-load-test.js
```

### Load Test Scenarios

The auth load test includes these scenarios with their respective weights:

1. **Signup (10%)** - New user registration
2. **Signin (30%)** - User login
3. **Session (25%)** - Session validation
4. **Refresh (25%)** - Token refresh
5. **Signout (10%)** - User logout

### Test Configuration

- **Ramp-up**: 10 → 20 → 50 users over 9 minutes
- **Sustained load**: 50 users for 10 minutes
- **Ramp-down**: 50 → 0 users over 5 minutes
- **Total duration**: 24 minutes

### Performance Thresholds

- **Success rate**: >99% for all auth endpoints
- **Response time**: 95% of requests <500ms
- **Session endpoint**: 95% of requests <300ms
- **Refresh endpoint**: 95% of requests <300ms
- **Throughput**: >10 requests/second

### Metrics Tracked

- `auth_failures` - Rate of authentication failures
- `session_response_time` - Session endpoint response time
- `refresh_response_time` - Refresh endpoint response time
- Standard K6 metrics (http_req_duration, http_req_failed, etc.)

## Interpreting Results

### Success Criteria

- All thresholds should pass
- No significant error rates
- Response times within acceptable limits
- No memory leaks or performance degradation over time

### Common Issues

- **High failure rate**: Check server logs, database connections, or rate limiting
- **Slow response times**: Check database performance, caching, or server resources
- **Memory issues**: Monitor server memory usage during test
- **Timeout errors**: Check server timeout configurations

### Performance Baselines

Document your baseline performance metrics:

| Metric            | Baseline | Target | Current |
| ----------------- | -------- | ------ | ------- |
| Auth Success Rate | 99.5%    | >99%   | -       |
| Avg Response Time | 150ms    | <500ms | -       |
| 95th Percentile   | 250ms    | <500ms | -       |
| Session Response  | 100ms    | <300ms | -       |
| Refresh Response  | 120ms    | <300ms | -       |

## Continuous Integration

Add load testing to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    k6 run --out json=results.json api/load-tests/auth-load-test.js
    k6 run --summary-export=summary.json api/load-tests/auth-load-test.js
```

## Environment Variables

- `BASE_URL`: API base URL (default: http://localhost:3000)
- `K6_PROMETHEUS_RW_SERVER_URL`: Prometheus server URL for metrics
- `K6_INFLUXDB_ADDR`: InfluxDB address for metrics storage
