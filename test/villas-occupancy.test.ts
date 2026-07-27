/**
 * Pins src/lib/villas.ts occupancy to kb/source/roomtypes.json (the eZee
 * CFG-05 RoomTypeList snapshot). The CH-06 review flagged these as two
 * unreconciled copies of the same truth — this equality test closes it: a
 * RoomTypeList refresh that changes occupancy now fails CI until villas.ts
 * agrees. The ONE sanctioned divergence: Siolim's baseAdults is null in
 * villas.ts (eZee's base_adult_occupancy: 2 oddity, OQ-10 — deliberately
 * kept out of guest-facing copy).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VILLAS } from '../src/lib/villas.js';

interface RoomType {
  roomTypeId: string;
  typeName: string;
  baseAdults: number;
  baseChildren: number;
  maxAdults: number;
  maxChildren: number;
}

const snapshot = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'kb', 'source', 'roomtypes.json'), 'utf8'),
) as { roomTypes: RoomType[] };

const byId = new Map(snapshot.roomTypes.map((rt) => [rt.roomTypeId, rt]));

describe('villas.ts occupancy ≡ roomtypes.json (single truth)', () => {
  it('every villa maps to a snapshot room type with the same name', () => {
    for (const villa of VILLAS) {
      const roomType = byId.get(villa.roomTypeId);
      expect(roomType, `${villa.label} roomTypeId missing from snapshot`).toBeDefined();
      expect(roomType?.typeName).toBe(villa.typeName);
    }
  });

  it('max occupancy matches everywhere (the guest-facing "sleeps up to N")', () => {
    for (const villa of VILLAS) {
      const roomType = byId.get(villa.roomTypeId)!;
      expect(villa.occupancy.maxAdults, villa.label).toBe(roomType.maxAdults);
      expect(villa.occupancy.maxChildren, villa.label).toBe(roomType.maxChildren);
    }
  });

  it('base occupancy matches, except the sanctioned Siolim null (OQ-10)', () => {
    for (const villa of VILLAS) {
      const roomType = byId.get(villa.roomTypeId)!;
      if (villa.typeName === 'Nistula 4BHK Siolim') {
        expect(villa.occupancy.baseAdults).toBeNull();
      } else {
        expect(villa.occupancy.baseAdults, villa.label).toBe(roomType.baseAdults);
      }
    }
  });

  it('the snapshot has no room types villas.ts does not know — except the RETIRED one', () => {
    // 🚨 CH-20. roomtypes.json is a DATED eZee CFG-05 capture, and on its capture
    // date the property really did have five room types. The three-bedroom
    // Assagao type (…0003, "Nistula Villa") was retired 2026-07-24 and dropped
    // from VILLAS, so a strict "everything in the snapshot is known" now fails.
    //
    // The tempting fix — deleting the entry from the snapshot — is the wrong
    // one: it is an external record of what eZee returned, not our config, and
    // editing it to make a test pass destroys the evidence the equality checks
    // above are anchored to. (A refreshed capture belongs at cutover.)
    //
    // So the invariant is narrowed by NAME, not weakened: a snapshot type must
    // be either modelled or on the explicit retired list. A genuinely NEW type
    // eZee starts returning still fails this test, which is the whole point —
    // that is inventory we would otherwise never learn we cannot sell.
    const RETIRED_ROOM_TYPE_IDS = new Set(['5220300000000000003']); // "Nistula Villa"
    const known = new Set(VILLAS.map((v) => v.roomTypeId));
    for (const roomType of snapshot.roomTypes) {
      const accounted = known.has(roomType.roomTypeId) || RETIRED_ROOM_TYPE_IDS.has(roomType.roomTypeId);
      expect(accounted, `${roomType.typeName} is neither modelled nor a known retirement`).toBe(true);
    }
  });

  it('the retired type is genuinely ABSENT from villas.ts, not merely unreferenced', () => {
    // The other direction of the same fact: nothing sellable may still point at
    // the departed room type. Without this, a stray row would keep it quotable.
    for (const villa of VILLAS) {
      expect(villa.roomTypeId, villa.label).not.toBe('5220300000000000003');
      expect(villa.typeName, villa.label).not.toBe('Nistula Villa');
    }
    expect(VILLAS).toHaveLength(4); // 3 apartments + Siolim
  });
});
