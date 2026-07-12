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

  it('the snapshot has no room types villas.ts does not know', () => {
    const known = new Set(VILLAS.map((v) => v.roomTypeId));
    for (const roomType of snapshot.roomTypes) {
      expect(known.has(roomType.roomTypeId), roomType.typeName).toBe(true);
    }
  });
});
