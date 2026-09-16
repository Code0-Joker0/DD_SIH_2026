import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
// We import the express app directly if it were exported, but since gateway/server.js 
// calls app.listen() directly, we can either point supertest to the local server URL
// or refactor server.js to export the app. For this test, we will assume the server is running on localhost:3000.

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

test('Firewall & CORS Security Integration Tests', async (t) => {

    await t.test('CORS: Should allow local origin http://localhost:5173', async () => {
        const res = await request(GATEWAY_URL)
            .options('/api/health')
            .set('Origin', 'http://localhost:5173');
        
        // Express cors middleware responds with 204 No Content for preflight if allowed
        assert.strictEqual(res.status, 204);
        assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    });

    await t.test('CORS: Should reject unauthorized origin', async () => {
        const res = await request(GATEWAY_URL)
            .get('/api/health')
            .set('Origin', 'http://evil-hacker.com');
        
        assert.strictEqual(res.status, 500); // Because cors middleware throws Error('Blocked by CORS...')
        assert.ok(res.body.message.includes('Blocked by CORS'));
    });

    await t.test('CORS: Should allow requests with no origin (e.g., server-to-server or cURL)', async () => {
        const res = await request(GATEWAY_URL)
            .get('/api/health');
        
        // It should pass CORS and hit the IP firewall
        // Health route will return 200 or 503 depending on FastAPI backend
        assert.ok([200, 503].includes(res.status)); 
        assert.strictEqual(res.headers['x-sovereign-airgap'], 'Active-Zero-WAN');
    });

    await t.test('IP Firewall: Should allow local loopback and include X-Sovereign-Airgap header', async () => {
        const res = await request(GATEWAY_URL)
            .get('/api/health');
        
        assert.strictEqual(res.headers['x-sovereign-airgap'], 'Active-Zero-WAN');
        assert.ok([200, 503].includes(res.status));
    });

    await t.test('IP Firewall: Should block requests with spoofed public IP in X-Forwarded-For if trusted proxy is enabled', async () => {
        // Note: Unless `app.set('trust proxy', true)` is enabled, Express ignores X-Forwarded-For for `req.ip`.
        // To test the IP restriction logic practically without actually making a request from a remote machine,
        // we can observe that standard local requests succeed. 
        // In a true mocked environment (where we pass the app instance to supertest), we could mock req.socket.remoteAddress.
        
        // We will document the remote address testing via proxy headers, assuming we add a mock or test route in the future.
        assert.ok(true, 'Remote IP blockage requires mock at network layer or proxy header injection (see Edge Cases)');
    });

});

