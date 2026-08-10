import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';

import { app } from '../src/app.js';

describe('GET /api/health', () => {
  it('reports that the API is available', async () => {
    const response = await request(app).get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.service, 'rufa-backend');
    assert.ok(response.body.timestamp);
  });
});

describe('unknown routes', () => {
  it('return a JSON 404 response', async () => {
    const response = await request(app).get('/api/unknown');

    assert.equal(response.status, 404);
    assert.match(response.body.error.message, /Route not found/);
  });
});
