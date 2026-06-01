import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export async function getAccessToken(serviceAccountOptions) {
  const serviceAccount = await loadServiceAccount(serviceAccountOptions);
  const assertion = createJwtAssertion(serviceAccount);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to mint Google access token: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

async function loadServiceAccount({ keyPath, json } = {}) {
  if (json) {
    return normalizeServiceAccount(JSON.parse(json));
  }

  if (keyPath) {
    const resolvedPath = path.resolve(process.cwd(), keyPath);
    const raw = await fs.readFile(resolvedPath, 'utf8');
    return normalizeServiceAccount(JSON.parse(raw));
  }

  throw new Error(
    'Missing service account credentials. Set GA4_SERVICE_ACCOUNT_KEY_PATH, GA4_SERVICE_ACCOUNT_JSON, or pass --service-account-key-path.',
  );
}

function normalizeServiceAccount(serviceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Service account JSON must include client_email and private_key.');
  }

  return {
    client_email: serviceAccount.client_email,
    private_key: String(serviceAccount.private_key).replace(/\\n/g, '\n'),
    token_uri: serviceAccount.token_uri || TOKEN_URL,
  };
}

function createJwtAssertion(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(
    JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
    }),
  );
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: READONLY_SCOPE,
      aud: serviceAccount.token_uri,
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, 'base64url');
  return `${unsignedToken}.${signature}`;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}
