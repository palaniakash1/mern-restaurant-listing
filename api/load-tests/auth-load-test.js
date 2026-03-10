/* eslint-disable no-console, no-undef */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const authFailureRate = new Rate('auth_failures');
const sessionResponseTime = new Trend('session_response_time');
const refreshResponseTime = new Trend('refresh_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 }, // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 20 }, // Stay at 20 users for 5 minutes
    { duration: '2m', target: 50 }, // Ramp up to 50 users over 2 minutes
    { duration: '10m', target: 50 }, // Stay at 50 users for 10 minutes
    { duration: '5m', target: 0 } // Ramp down to 0 users over 5 minutes
  ],
  thresholds: {
    // Auth endpoints should have 99% success rate
    http_req_failed: ['rate<0.01'],
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Auth-specific thresholds
    auth_failures: ['rate<0.01'],
    // Session and refresh should be fast
    session_response_time: ['p(95)<300'],
    refresh_response_time: ['p(95)<300'],
    // Overall throughput
    http_reqs: ['rate>10']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  {
    email: 'loadtest1@example.com',
    password: 'Password123!',
    userName: 'loadtest1'
  },
  {
    email: 'loadtest2@example.com',
    password: 'Password123!',
    userName: 'loadtest2'
  },
  {
    email: 'loadtest3@example.com',
    password: 'Password123!',
    userName: 'loadtest3'
  },
  {
    email: 'loadtest4@example.com',
    password: 'Password123!',
    userName: 'loadtest4'
  },
  {
    email: 'loadtest5@example.com',
    password: 'Password123!',
    userName: 'loadtest5'
  }
];

export function setup() {
  console.log('Setting up load test environment...');

  // Create test users if they don't exist
  testUsers.forEach((user) => {
    const signupResponse = http.post(
      `${BASE_URL}/api/auth/signup`,
      JSON.stringify({
        email: user.email,
        password: user.password,
        userName: user.userName
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (signupResponse.status === 201) {
      console.log(`Created test user: ${user.email}`);
    } else if (signupResponse.status === 409) {
      console.log(`Test user already exists: ${user.email}`);
    } else {
      console.log(
        `Failed to create test user ${user.email}: ${signupResponse.status}`
      );
    }
  });

  return {
    baseUrl: BASE_URL,
    testUsers
  };
}

export default function (data) {
  const user =
    data.testUsers[Math.floor(Math.random() * data.testUsers.length)];

  // 1. Signup (10% of requests)
  if (Math.random() < 0.1) {
    const signupResponse = http.post(
      `${data.baseUrl}/api/auth/signup`,
      JSON.stringify({
        email: `newuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
        password: 'Password123!',
        userName: `newuser_${Math.random().toString(36).substr(2, 9)}`
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    check(signupResponse, {
      'signup status is 201': (r) => r.status === 201,
      'signup response has success true': (r) =>
        JSON.parse(r.body).success === true
    });

    authFailureRate.add(signupResponse.status !== 201);
    sleep(1);
    return;
  }

  // 2. Signin (30% of requests)
  if (Math.random() < 0.3) {
    const signinResponse = http.post(
      `${data.baseUrl}/api/auth/signin`,
      JSON.stringify({
        email: user.email,
        password: user.password
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const signinSuccess = check(signinResponse, {
      'signin status is 200': (r) => r.status === 200,
      'signin response has user data': (r) => {
        const body = JSON.parse(r.body);
        return body.email === user.email && body.userName === user.userName;
      },
      'signin sets refresh token cookie': (r) => {
        const cookies = r.headers['Set-Cookie'] || [];
        return cookies.some((cookie) => cookie.includes('refresh_token='));
      }
    });

    authFailureRate.add(!signinSuccess);
    sleep(1);
    return;
  }

  // 3. Session endpoint (25% of requests)
  if (Math.random() < 0.25) {
    // First signin to get cookies
    const signinResponse = http.post(
      `${data.baseUrl}/api/auth/signin`,
      JSON.stringify({
        email: user.email,
        password: user.password
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (signinResponse.status === 200) {
      const sessionStart = Date.now();
      const sessionResponse = http.get(`${data.baseUrl}/api/auth/session`, {
        cookies: {
          access_token: signinResponse.cookies['access_token'][0].value,
          csrf_token: signinResponse.cookies['csrf_token'][0].value,
          refresh_token: signinResponse.cookies['refresh_token'][0].value
        }
      });

      const sessionDuration = Date.now() - sessionStart;
      sessionResponseTime.add(sessionDuration);

      const sessionSuccess = check(sessionResponse, {
        'session status is 200': (r) => r.status === 200,
        'session response has success true': (r) =>
          JSON.parse(r.body).success === true,
        'session response has user data': (r) => {
          const body = JSON.parse(r.body);
          return body.data.email === user.email;
        }
      });

      authFailureRate.add(!sessionSuccess);
    }

    sleep(0.5);
    return;
  }

  // 4. Refresh endpoint (25% of requests)
  if (Math.random() < 0.25) {
    // First signin to get cookies
    const signinResponse = http.post(
      `${data.baseUrl}/api/auth/signin`,
      JSON.stringify({
        email: user.email,
        password: user.password
      }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (signinResponse.status === 200) {
      const refreshStart = Date.now();
      const refreshResponse = http.post(
        `${data.baseUrl}/api/auth/refresh`,
        {},
        {
          cookies: {
            refresh_token: signinResponse.cookies['refresh_token'][0].value
          }
        }
      );

      const refreshDuration = Date.now() - refreshStart;
      refreshResponseTime.add(refreshDuration);

      const refreshSuccess = check(refreshResponse, {
        'refresh status is 200': (r) => r.status === 200,
        'refresh response has user data': (r) => {
          const body = JSON.parse(r.body);
          return body.email === user.email;
        },
        'refresh sets new refresh token cookie': (r) => {
          const cookies = r.headers['Set-Cookie'] || [];
          return cookies.some((cookie) => cookie.includes('refresh_token='));
        }
      });

      authFailureRate.add(!refreshSuccess);
    }

    sleep(0.5);
    return;
  }

  // 5. Signout (10% of requests)
  // First signin to get cookies
  const signinResponse = http.post(
    `${data.baseUrl}/api/auth/signin`,
    JSON.stringify({
      email: user.email,
      password: user.password
    }),
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (signinResponse.status === 200) {
    const signoutResponse = http.post(
      `${data.baseUrl}/api/auth/signout`,
      {},
      {
        cookies: {
          access_token: signinResponse.cookies['access_token'][0].value,
          csrf_token: signinResponse.cookies['csrf_token'][0].value,
          refresh_token: signinResponse.cookies['refresh_token'][0].value
        }
      }
    );

    check(signoutResponse, {
      'signout status is 200': (r) => r.status === 200,
      'signout response has success true': (r) =>
        JSON.parse(r.body).success === true
    });

    authFailureRate.add(signoutResponse.status !== 200);
  }

  sleep(1);
}

export function teardown() {
  console.log('Tearing down load test environment...');
}
