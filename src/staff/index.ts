/**
 * The staff module's one wiring point (CH-13a). jobs/index.ts and server.ts
 * compose the pieces through here so neither has to know that a task card is a
 * template send, or that a door is a BKG-03 read.
 */
import type { Db } from '../db/client.js';
import type { Task } from '../db/tasks.js';
import type { EzeeClient } from '../ezee/client.js';
import type { AlertLogger } from '../ops/alerts.js';
import type { WaClient } from '../wa/client.js';
import { notifyTask, type NotifyMode } from './notifier.js';
import { assignFor, type Roster } from './roster.js';
import { resolveDoor, type DoorResolution } from './villaRoute.js';
import type { TaskKind } from '../db/tasks.js';
import type { TaskAssignment } from '../brain/tools/registry.js';

export interface StaffWiringDeps {
  db: Db;
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
  roster: Roster;
  /** Absent ⇒ no fresh door read; every card names the villa TYPE and routes
   * to the front desk. Survivable by design (eZee flaps). */
  ezee?: Pick<EzeeClient, 'fetchSingleBooking'>;
}

export interface StaffTaskDeps {
  resolveDoor: (reservationNo: string) => Promise<DoorResolution>;
  assign: (kind: TaskKind, villa: string | null) => TaskAssignment | null;
  notify: (
    task: Task,
    guestFirstName: string | null,
    mode?: NotifyMode,
  ) => Promise<{ delivered: boolean }>;
}

/** The three collaborators `create_staff_task` needs, bound to live deps. */
export function buildStaffTaskDeps(deps: StaffWiringDeps): StaffTaskDeps {
  return {
    resolveDoor: async (reservationNo) =>
      // No eZee client ⇒ `unreadable`, which is exactly right: we could not
      // read the door. It is NOT `not_found` (that would assert eZee has no
      // such booking) and it is emphatically not "cancelled".
      deps.ezee === undefined
        ? { resolved: false, reason: 'unreadable' }
        : resolveDoor({ ezee: deps.ezee, log: deps.log }, reservationNo),
    assign: (kind, villa) => assignFor(deps.roster, kind, villa),
    notify: async (task, guestFirstName, mode) =>
      notifyTask({ db: deps.db, log: deps.log, wa: deps.wa }, task, guestFirstName, mode),
  };
}
