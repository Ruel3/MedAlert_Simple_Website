import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

test('administrator can approve staff before they sign in', { timeout: 30_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'medalert-admin-'));
  const databasePath = join(directory, 'medalert.sqlite');
  const legacyDb = new DatabaseSync(databasePath);
  legacyDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('patient', 'staff')),
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      phone TEXT NOT NULL,
      national_id TEXT,
      staff_type TEXT,
      hospital TEXT,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);
  legacyDb.close();
  const port = await unusedPort();
  const child = spawn(process.execPath, [join(projectRoot, 'backend', 'server.js')], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      MEDALERT_DB_PATH: databasePath,
      MEDALERT_CORS_ORIGINS: 'https://frontend.example.test',
      MEDALERT_ADMIN_EMAIL: 'admin@example.test',
      MEDALERT_ADMIN_PASSWORD: 'TestAdminPassword!234',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
    await rm(directory, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited during startup: ${stderr}`);
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the server to start listening. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, `Server did not start: ${stderr}`);

  const request = async (path, { body, cookie, origin } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
        ...(origin ? { origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
      headers: response.headers,
    };
  };

  const anonymousSession = await request('/api/auth/me');
  assert.equal(anonymousSession.status, 200);
  assert.equal(anonymousSession.data.user, null);

  const preflight = await fetch(`${base}/api/auth/admin-login`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://frontend.example.test',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://frontend.example.test');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');

  const blockedOrigin = await request('/api/auth/me', { origin: 'https://untrusted.example.test' });
  assert.equal(blockedOrigin.status, 403);

  const adminLogin = await request('/api/auth/admin-login', {
    body: { email: 'admin@example.test', password: 'TestAdminPassword!234' },
    origin: 'https://frontend.example.test',
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.headers.get('access-control-allow-origin'), 'https://frontend.example.test');
  assert.equal(adminLogin.data.user.role, 'admin');
  assert.equal((await request('/api/auth/login', {
    body: { email: 'admin@example.test', password: 'TestAdminPassword!234' },
  })).status, 403);
  const adminCookie = adminLogin.cookie;

  const registration = await request('/api/auth/register-staff', {
    body: {
      name: 'Pending Nurse',
      email: 'nurse@example.test',
      phone: '+254700000003',
      staff_type: 'nurse',
      hospital: 'Example Hospital',
      password: 'nurse123',
    },
  });
  assert.equal(registration.status, 200);
  assert.equal((await request('/api/auth/login', {
    body: { email: 'nurse@example.test', password: 'nurse123' },
  })).status, 403);

  const pending = await request('/api/admin/staff', { cookie: adminCookie });
  assert.equal(pending.status, 200);
  assert.equal(pending.data.staff.length, 1);
  assert.equal(pending.data.staff[0].email, 'nurse@example.test');
  assert.equal(pending.data.staff[0].staff_label, 'Nurse');

  const approval = await request(`/api/admin/staff/${pending.data.staff[0].id}/approve`, { body: {}, cookie: adminCookie });
  assert.equal(approval.status, 200);
  const staffLogin = await request('/api/auth/login', {
    body: { email: 'nurse@example.test', password: 'nurse123' },
  });
  assert.equal(staffLogin.status, 200);
  assert.equal(staffLogin.data.user.role, 'staff');
  assert.equal((await request('/api/admin/staff', { cookie: staffLogin.cookie })).status, 403);

  const patientRegistration = await request('/api/auth/register-patient', {
    body: {
      name: 'Test Patient',
      email: 'patient@example.test',
      phone: '+254700000004',
      national_id: '12345678',
      password: 'patient123',
    },
  });
  assert.equal(patientRegistration.status, 200);
  const patientLogin = await request('/api/auth/login', {
    body: { email: 'patient@example.test', password: 'patient123' },
  });
  assert.equal(patientLogin.status, 200);
  const emptyProfile = await request('/api/profile', { cookie: patientLogin.cookie });
  assert.equal(emptyProfile.status, 200);
  assert.equal(emptyProfile.data.profile, null);
});
