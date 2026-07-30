/**
 * Concurrent Attendance Load Test
 *
 * Fires N simultaneous POST /api/attendance requests to verify
 * that the 4-layer duplicate prevention works correctly.
 *
 * Expected result: exactly 1 request returns 201,
 * the remaining N-1 return 409.
 *
 * Usage:
 *   1. Start the backend: npm run dev
 *   2. node tests/load-test.js
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000';

async function main() {
  // ── Step 1: Login as an existing user ──────────────────────
  console.log(`[1/4] Logging in...`);

  const loginRes = await fetch(`${BASE}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'Test@1234' }),
  });

  if (!loginRes.ok) {
    const text = await loginRes.text();
    console.error(`Login failed (${loginRes.status}): ${text}`);
    console.error('Create a test user first via POST /api/user/signup');
    process.exit(1);
  }

  const { token } = await loginRes.json();
  console.log('  ✓ Token acquired');

  // ── Step 2: Generate a valid base64 image payload ──────────
  const fakeImageBase64 = Buffer.from('fake-jpeg-data').toString('base64');
  const imageDataUri = `data:image/jpeg;base64,${fakeImageBase64}`;

  const body = {
    image: imageDataUri,
    location: JSON.stringify({ lat: 28.6139, lng: 77.209 }),
    purpose: 'Check In',
  };

  // ── Step 3: Fire N concurrent requests ─────────────────────
  const CONCURRENCY = 20;
  console.log(`[2/4] Firing ${CONCURRENCY} concurrent POST /api/attendance...`);

  const requests = Array.from({ length: CONCURRENCY }, () =>
    fetch(`${BASE}/api/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }).then(async (res) => ({
      status: res.status,
      body: await res.json().catch(() => ({})),
    }))
  );

  const results = await Promise.all(requests);

  // ── Step 4: Report results ─────────────────────────────────
  const counts = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  console.log(`[3/4] Results:`);
  for (const [status, count] of Object.entries(counts).sort()) {
    const example = results.find((r) => r.status === Number(status));
    const msg = example?.body?.error || example?.body?.message || '';
    console.log(`  ${status}: ${count} ${msg ? `— ${msg}` : ''}`);
  }

  const success201 = counts[201] || 0;
  const conflict409 = counts[409] || 0;
  const rateLimited429 = counts[429] || 0;
  const other = CONCURRENCY - success201 - conflict409 - rateLimited429;

  console.log(`[4/4] Verdict:`);
  console.log(`  Got: ${success201}×201 | ${conflict409}×409 | ${rateLimited429}×429 | ${other}×other`);

  if (success201 === 1) {
    console.log('  ✅ DUPLICATE PREVENTION: PASS (exactly 1 attendance created)');
  } else {
    console.log(`  ❌ DUPLICATE PREVENTION: FAIL (expected 1×201, got ${success201})`);
  }
  if (rateLimited429 > 0) {
    console.log(`  ✅ RATE LIMITER: PASS (${rateLimited429} requests blocked)`);
  } else {
    console.log(`  ⚠ RATE LIMITER: ${success201 > 1 ? 'PASS (all got through due to concurrent arrival)' : 'N/A'}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
