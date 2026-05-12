const ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'https://jeux.fmenguy.fr',
];

const MAX_SAVE_SIZE = 512 * 1024; // 512 Ko

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

function saveKey(uuid, slot) {
  return `save:${uuid}:${slot}`;
}

function isValidUuid(uuid) {
  return /^[0-9a-f-]{8,64}$/i.test(uuid);
}

function isValidSlot(slot) {
  const n = Number(slot);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const path = url.pathname;

    if (path === '/save' && request.method === 'GET') {
      const uuid = url.searchParams.get('uuid');
      const slot = url.searchParams.get('slot');

      if (!uuid || !isValidUuid(uuid)) {
        return jsonResponse({ error: 'uuid invalide' }, 400, origin);
      }
      if (!slot || !isValidSlot(slot)) {
        return jsonResponse({ error: 'slot invalide (1-5)' }, 400, origin);
      }

      const value = await env.STRATES_SAVES.get(saveKey(uuid, slot));
      if (value === null) {
        return jsonResponse({ empty: true }, 200, origin);
      }
      return new Response(value, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }

    if (path === '/save' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'body JSON invalide' }, 400, origin);
      }

      const { uuid, slot, data } = body;

      if (!uuid || !isValidUuid(uuid)) {
        return jsonResponse({ error: 'uuid invalide' }, 400, origin);
      }
      if (!slot || !isValidSlot(slot)) {
        return jsonResponse({ error: 'slot invalide (1-5)' }, 400, origin);
      }
      if (!data) {
        return jsonResponse({ error: 'data manquant' }, 400, origin);
      }

      const serialized = JSON.stringify(data);
      if (serialized.length > MAX_SAVE_SIZE) {
        return jsonResponse({ error: 'save trop volumineuse (max 512 Ko)' }, 413, origin);
      }

      await env.STRATES_SAVES.put(saveKey(uuid, slot), serialized);
      return jsonResponse({ ok: true }, 200, origin);
    }

    if (path === '/save' && request.method === 'DELETE') {
      const uuid = url.searchParams.get('uuid');
      const slot = url.searchParams.get('slot');

      if (!uuid || !isValidUuid(uuid)) {
        return jsonResponse({ error: 'uuid invalide' }, 400, origin);
      }
      if (!slot || !isValidSlot(slot)) {
        return jsonResponse({ error: 'slot invalide (1-5)' }, 400, origin);
      }

      await env.STRATES_SAVES.delete(saveKey(uuid, slot));
      return jsonResponse({ ok: true }, 200, origin);
    }

    return jsonResponse({ error: 'endpoint inconnu' }, 404, origin);
  },
};
