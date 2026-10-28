/**
 * POST /api/quest/judge — checks one Gion photo-quest photo with Claude.
 *
 * Body: { code, spot, image }  (image = base64 JPEG, already shrunk in the browser)
 * Reply: { verdict: 'ok' | 'miss' | 'people', hint } or { error }
 *
 * - Only guests with the tour passcode (QUEST_PASSCODE, printed in the QR) can use it.
 * - Photos are never stored or logged; they go to the model and are dropped.
 * - Per-IP limit is in memory, so it is best-effort per server instance.
 * - Error replies say nothing about the cause (details go to the server log only).
 */
import type { APIRoute } from 'astro';
import { ANTHROPIC_API_KEY, QUEST_PASSCODE, QUEST_MODEL } from 'astro:env/server';
import { SPOTS, MAX_IMAGE_BASE64_LENGTH } from '../../../config/gionQuest';

export const prerender = false;

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const UPSTREAM_TIMEOUT_MS = 25_000;

const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

/** Compares without stopping at the first different character. */
function sameCode(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const SYSTEM_PROMPT = `You check photos for a photo game played on a night walking tour in Gion, Kyoto.
Decide whether the photo plausibly shows the target place.
Be lenient: photos are taken at night and may be dark, blurry, tilted, partly blocked by people, or taken from a different angle or distance. Accept if the main features of the target are recognizable or reasonably consistent with it.
Reject only when the photo clearly shows something else (for example a plain wall, the ground, a screen, food, or a different kind of place).
Separately, report whether a person is the main subject of the photo (a portrait or selfie, or a person filling a large part of the frame). People small in the background do not count.
The hint is one short, friendly English sentence for the player (at most 15 words) that helps them find or frame the target. Never mention people in the hint.`;

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    match: { type: 'boolean' },
    person_is_main_subject: { type: 'boolean' },
    hint: { type: 'string' },
  },
  required: ['match', 'person_is_main_subject', 'hint'],
  additionalProperties: false,
};

const BASE64_JPEG = /^\/9j\/[A-Za-z0-9+/]+={0,2}$/;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!ANTHROPIC_API_KEY || !QUEST_PASSCODE) return reply(503, { error: 'unavailable' });

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return reply(415, { error: 'bad_request' });
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_IMAGE_BASE64_LENGTH + 2000) return reply(413, { error: 'too_large' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  const { code, spot: spotId, image } = (body ?? {}) as Record<string, unknown>;
  if (typeof code !== 'string' || typeof spotId !== 'string' || typeof image !== 'string' || code.length > 64) {
    return reply(400, { error: 'bad_request' });
  }

  if (!sameCode(code.trim(), QUEST_PASSCODE)) return reply(401, { error: 'code' });

  let ip = 'unknown';
  try {
    ip = clientAddress || ip;
  } catch {
    // clientAddress throws when the platform does not provide it
  }
  if (rateLimited(ip)) return reply(429, { error: 'slow_down' });

  const spot = SPOTS.find((s) => s.id === spotId && s.judge === 'ai');
  if (!spot || !spot.visual) return reply(400, { error: 'bad_request' });
  if (image.length > MAX_IMAGE_BASE64_LENGTH) return reply(413, { error: 'too_large' });
  if (!BASE64_JPEG.test(image)) return reply(400, { error: 'bad_request' });

  let upstream: Response;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2026-10-21',
      },
      body: JSON.stringify({
        model: QUEST_MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              { type: 'text', text: `Target place: ${spot.place}.\nWhat it looks like: ${spot.visual}` },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('quest judge: request failed', err instanceof Error ? err.name : 'unknown');
    return reply(502, { error: 'judge' });
  }

  if (!upstream.ok) {
    console.error('quest judge: upstream status', upstream.status);
    return reply(502, { error: 'judge' });
  }

  try {
    const data = (await upstream.json()) as {
      stop_reason?: string;
      content?: { type: string; text?: string }[];
    };
    if (data.stop_reason !== 'end_turn') {
      console.error('quest judge: stop_reason', data.stop_reason);
      return reply(502, { error: 'judge' });
    }
    const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
    const parsed = JSON.parse(text) as { match?: unknown; person_is_main_subject?: unknown; hint?: unknown };
    const hint = typeof parsed.hint === 'string' ? parsed.hint.slice(0, 160) : '';
    const verdict = parsed.person_is_main_subject === true ? 'people' : parsed.match === true ? 'ok' : 'miss';
    return reply(200, { verdict, hint });
  } catch {
    console.error('quest judge: unreadable reply');
    return reply(502, { error: 'judge' });
  }
};

export const ALL: APIRoute = () => reply(405, { error: 'method' });
