/**
 * Admin peek route (plan.md CH-09 step 5, §3.3) — the repo's FIRST admin
 * surface. POST with the phone in the BODY (PII stays out of URLs and the
 * path-only request log); double-gated: server.ts registers this plugin ONLY
 * when ADMIN_ROUTES_ENABLED=1 (unmounted ⇒ Fastify's default 404, no
 * disclosure), and every request needs the bearer token (timing-safe).
 *
 * Logging discipline: the phone value is NOT key-redacted by logger.ts, so
 * nothing here ever logs the request body or the phone — ids, counts and
 * summarizeError only.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { getAllGuestFacts, getGuestByPhone } from '../db/guestMemory.js';
import { getGuestStays } from '../db/stays.js';
import { projectAll } from '../brain/stayView.js';
import { istCalendarDay } from '../lib/time.js';
import { summarizeError } from '../lib/logger.js';
import { normalizePhone } from '../lib/phone.js';
import { timingSafeStringEqual } from '../wa/signature.js';
import { alertOps } from './alerts.js';

export interface AdminRouteOptions {
  db: Db;
  /** Boot-guaranteed ≥16 chars when routes are enabled (config.ts guard). */
  bearerToken: string;
}

const bodySchema = z.object({ phone: z.string().min(1).max(32) });

/** Fastify plugin carrying the admin routes; register at boot ONLY when enabled. */
export const adminRoutes: FastifyPluginAsync<AdminRouteOptions> = async (app, opts) => {
  // §3.3 "failed admin auths counted into ops alerts" — process-lifetime
  // counter, webhook-401 precedent. onRequest runs BEFORE body parsing, so
  // an unauthenticated body is never even parsed.
  let failedAuthCount = 0;
  app.addHook('onRequest', async (request, reply) => {
    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token !== '' && timingSafeStringEqual(token, opts.bearerToken)) return;
    failedAuthCount += 1;
    await alertOps(request.log, {
      kind: 'admin_auth_failed',
      summary: 'admin route rejected: bad or missing bearer token',
      detail: { count: failedAuthCount, ip: request.ip },
    });
    return reply.code(401).send();
  });

  app.post('/admin/guest-lookup', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
    // Fixed string — never echo the input (it may be garbage OR someone's PII).
    if (phone === null) return reply.code(400).send({ error: 'invalid phone' });
    try {
      const guest = await getGuestByPhone(opts.db, phone);
      if (guest === null) return reply.code(404).send({ error: 'not found' });
      // Admin sees everything on file — expired facts included (unlike the
      // model's block [5], which filters them).
      const facts = await getAllGuestFacts(opts.db, guest.id);
      return await reply.send({
        guest: {
          id: guest.id,
          phone: guest.phone,
          waProfileName: guest.waProfileName,
          firstName: guest.firstName,
          lastName: guest.lastName,
          registerPref: guest.registerPref,
          langPref: guest.langPref,
          marketingOptIn: guest.marketingOptIn,
          notes: guest.notes,
          createdAt: guest.createdAt,
        },
        facts: facts.map((fact) => ({
          id: fact.id,
          kind: fact.kind,
          content: fact.content,
          sourceMessageId: fact.sourceMessageId,
          expiresAt: fact.expiresAt,
          createdAt: fact.createdAt,
        })),
        // CH-11: the real guest_stays join — PROJECTED, never raw. A mirror row
        // still carries the guest's address/city/zip inside `raw` (CH-10 strips
        // only card and identity-document fields), so handing rows out whole
        // would newly expose them on an admin surface. The stay view is the only
        // door, here as everywhere.
        stays: projectAll(await getGuestStays(opts.db, guest.id), istCalendarDay(new Date())),
      });
    } catch (error) {
      request.log.error({ err: summarizeError(error) }, 'admin guest-lookup failed');
      return reply.code(500).send({ error: 'internal' });
    }
  });
};
