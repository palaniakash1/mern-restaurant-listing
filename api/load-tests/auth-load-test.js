/* eslint-disable no-console, no-undef */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const authFailureRate = new Rate('auth_failures');
const sessionResponseTime = new Trend('session_response_time');
const refreshResponseTime = new Trend('refresh_response_time');

const baselineStages = [
  { duration: '2m', target: 10 },
  { duration: '5m', target: 10 },
  { duration: '2m', target: 20 },
  { duration: '5m', target: 20 },
  { duration: '2m', target: 50 },
  { duration: '10m', target: 50 },
  { duration: '5m', target: 0 }
];

const smokeStages = [
  { duration: '15s', target: 5 },
  { duration: '30s', target: 5 },
  { duration: '15s', target: 0 }
];

const loadProfile = __ENV.LOAD_PROFILE || 'baseline';

const isSmokeProfile = loadProfile === 'smoke';
const userPoolSize = isSmokeProfile ? 5 : 50;

function buildTestUsers(count) {
  return Array.from({ length: count }, (_, index) => ({
    email: `loadtest${index + 1}@example.com`,
    password: 'Password123!',
    userName: `loadtest${index + 1}`
  }));
}

function hasCookie(response, cookieName) {
  const cookies = response?.cookies?.[cookieName];

  return Array.isArray(cookies) && cookies.length > 0;
}

function getCookieValue(response, cookieName) {
  const cookies = response?.cookies?.[cookieName];

  if (!Array.isArray(cookies) || cookies.length === 0) {
    return null;
  }

  return cookies[0].value;
}

export const options = {
  stages: isSmokeProfile ? smokeStages : baselineStages,
  thresholds: {
    http_req_failed: [isSmokeProfile ? 'rate<0.05' : 'rate<0.01'],
    http_req_duration: [isSmokeProfile ? 'p(95)<900' : 'p(95)<500'],
    auth_failures: [isSmokeProfile ? 'rate<0.05' : 'rate<0.01'],
    session_response_time: [isSmokeProfile ? 'p(95)<500' : 'p(95)<300'],
    refresh_response_time: [isSmokeProfile ? 'p(95)<700' : 'p(95)<300'],
    http_reqs: [isSmokeProfile ? 'rate>2' : 'rate>5']
  },
  tags: {
    profile: loadProfile
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = buildTestUsers(userPoolSize);

export function setup() {
  console.log(`Setting up load test environment for profile: ${loadProfile}`);

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
    } else if ([400, 409].includes(signupResponse.status)) {
      console.log(`Test user already exists: ${user.email}`);
    } else {
      console.log(
        `Failed to create test user ${user.email}: ${signupResponse.status}`
      );
    }
  });

  const sessions = isSmokeProfile
    ? testUsers
      .map((user) => {
        const signinResponse = http.post(
          `${BASE_URL}/api/auth/signin`,
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
        if (signinResponse.status !== 200) {
          console.log(
            `Failed to initialize smoke session for ${user.email}: ${signinResponse.status}`
          );
          return null;
        }

        const refreshResponse = http.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          {
            cookies: {
              refresh_token: getCookieValue(signinResponse, 'refresh_token')
            }
          }
        );

        if (refreshResponse.status !== 200) {
          console.log(
            `Failed to validate smoke refresh for ${user.email}: ${refreshResponse.status}`
          );
          return null;
        }

        return {
          ...user,
          accessToken:
            getCookieValue(refreshResponse, 'access_token') ||
            getCookieValue(signinResponse, 'access_token'),
          csrfToken:
            getCookieValue(refreshResponse, 'csrf_token') ||
            getCookieValue(signinResponse, 'csrf_token'),
          refreshToken:
            getCookieValue(refreshResponse, 'refresh_token') ||
            getCookieValue(signinResponse, 'refresh_token')
        };
      })
      .filter(Boolean)
    : [];

  return {
    baseUrl: BASE_URL,
    testUsers,
    sessions
  };
}

export default function (data) {
  if (isSmokeProfile) {
    const vuIndex = Math.max(0, (__VU || 1) - 1);
    const sessionUser = data.sessions[vuIndex % data.sessions.length];

    if (!sessionUser || !sessionUser.refreshToken) {
      authFailureRate.add(true);
      sleep(1);
      return;
    }

    const sessionStart = Date.now();
    const sessionResponse = http.get(`${data.baseUrl}/api/auth/session`, {
      cookies: {
        access_token: sessionUser.accessToken,
        csrf_token: sessionUser.csrfToken,
        refresh_token: sessionUser.refreshToken
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
        return body.data.email === sessionUser.email;
      }
    });

    authFailureRate.add(!sessionSuccess);
    sleep(0.5);
    return;
  }

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
      'signin sets refresh token cookie': (r) => hasCookie(r, 'refresh_token')
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
        'refresh sets new refresh token cookie': (r) =>
          hasCookie(r, 'refresh_token')
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
  console.log(`Tearing down load test environment for profile: ${loadProfile}`);
}
