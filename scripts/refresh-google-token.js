#!/usr/bin/env node
/**
 * refresh-google-token.js
 *
 * Generates a new Google OAuth2 refresh token for the Indexing API.
 *
 * Usage:
 *   node scripts/refresh-google-token.js
 *
 * Requires in .env (or environment):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * Steps:
 *   1. Opens your browser to Google's consent screen
 *   2. You approve access
 *   3. Prints the new refresh token — paste it into GitHub Secrets
 */

'use strict';

require('dotenv').config();

const http  = require('http');
const https = require('https');
const { exec } = require('child_process');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT          = 4242;
const REDIRECT_URI  = `http://localhost:${PORT}/callback`;
const SCOPE         = 'https://www.googleapis.com/auth/indexing';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

// ── Exchange auth code for tokens ─────────────────────────────────────────────

function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const body = [
      `code=${encodeURIComponent(code)}`,
      `client_id=${encodeURIComponent(CLIENT_ID)}`,
      `client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      `grant_type=authorization_code`,
    ].join('&');

    const bodyBuf = Buffer.from(body);
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': bodyBuf.length,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ── Open browser (cross-platform) ─────────────────────────────────────────────

function openBrowser(url) {
  const cmds = {
    darwin: `open "${url}"`,
    win32:  `start "" "${url}"`,
    linux:  `xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null || true`,
  };
  const cmd = cmds[process.platform] || cmds.linux;
  exec(cmd, (err) => { if (err) { /* silently ignore — URL was already printed */ } });
}

// ── Local callback server ─────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
  const code   = params.get('code');
  const error  = params.get('error');

  if (error || !code) {
    const msg = `Authorization failed: ${error || 'no code returned'}`;
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h2 style="color:red">❌ ${msg}</h2><p>Close this tab and try again.</p>`);
    console.error('\n❌ ', msg);
    server.close();
    process.exit(1);
  }

  // Success page — show immediately while we exchange the code
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html><body style="font-family:sans-serif;padding:40px;max-width:600px">
      <h2>✅ Authorization successful!</h2>
      <p>Exchanging code for tokens… check your terminal for the refresh token.</p>
      <p style="color:#888">You can close this tab.</p>
    </body></html>
  `);

  console.log('\n✅ Authorization code received. Exchanging for tokens…\n');

  try {
    const { status, data } = await exchangeCode(code);

    if (status !== 200 || !data.refresh_token) {
      console.error('❌ Token exchange failed:');
      console.error('   Status:', status);
      console.error('   Response:', JSON.stringify(data, null, 2));
      server.close();
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ New Google OAuth Refresh Token');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('  GOOGLE_REFRESH_TOKEN=');
    console.log(' ', data.refresh_token);
    console.log('');
    console.log('  Access token (expires in', data.expires_in, 's):');
    console.log(' ', data.access_token.slice(0, 40) + '…');
    console.log('');
    console.log('  Scope:', data.scope);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Next steps:');
    console.log('  1. Copy GOOGLE_REFRESH_TOKEN above');
    console.log('  2. GitHub → Settings → Secrets → GOOGLE_REFRESH_TOKEN → Update');
    console.log('  3. Vercel → Project → Settings → Env → GOOGLE_REFRESH_TOKEN → Update');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (e) {
    console.error('❌ Network error during token exchange:', e.message);
    server.close();
    process.exit(1);
  }

  server.close();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Google OAuth2 — Refresh Token Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Client ID:', CLIENT_ID.slice(0, 40) + '…');
  console.log('  Scope:    ', SCOPE);
  console.log('  Callback: ', REDIRECT_URI);
  console.log('');
  console.log('  Opening browser… (if it doesn\'t open, visit:)');
  console.log('');
  console.log(' ', authUrl);
  console.log('');
  console.log('  Waiting for authorization…');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  openBrowser(authUrl);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the process and retry.`);
  } else {
    console.error('❌ Server error:', e.message);
  }
  process.exit(1);
});
