// In-memory database facade that mirrors Firestore shapes used by the app.

const dbState = {
  rentersByUid: {},
  eventsByUidAndRenter: {},
  ledgerByUid: {},
};

const rentersListeners = new Set();
const reminderMonthListeners = new Set();

function uidRenters(uid) {
  if (!dbState.rentersByUid[uid]) {
    dbState.rentersByUid[uid] = [];
  }
  return dbState.rentersByUid[uid];
}

function uidLedger(uid) {
  if (!dbState.ledgerByUid[uid]) {
    dbState.ledgerByUid[uid] = [];
  }
  return dbState.ledgerByUid[uid];
}

function uidEvents(uid, renterId) {
  if (!dbState.eventsByUidAndRenter[uid]) {
    dbState.eventsByUidAndRenter[uid] = {};
  }
  if (!dbState.eventsByUidAndRenter[uid][renterId]) {
    dbState.eventsByUidAndRenter[uid][renterId] = [];
  }

  return dbState.eventsByUidAndRenter[uid][renterId];
}

function toMonthKey(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toSerializableDate(value) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function notifyRentersListeners(uid) {
  rentersListeners.forEach((listener) => {
    if (listener.uid !== uid) {
      return;
    }

    const renters = uidRenters(uid)
      .filter((renter) => {
        if (!listener.filters?.status) {
          return true;
        }

        return renter.status === listener.filters.status;
      })
      .map((renter) => ({ ...renter }));

    listener.onChange(renters);
  });
}

function getReminderEventsForMonth(uid, monthKey) {
  const userEvents = dbState.eventsByUidAndRenter[uid] || {};
  const allEvents = Object.values(userEvents).flat();

  return allEvents.filter((event) => {
    return (
      event.userUid === uid
      && event.type === 'reminder_marked_sent'
      && event.monthKey === monthKey
    );
  });
}

function notifyReminderListeners(uid) {
  reminderMonthListeners.forEach((listener) => {
    if (listener.uid !== uid) {
      return;
    }

    listener.onChange(getReminderEventsForMonth(uid, listener.monthKey));
  });
}

export function seedInMemoryDb(uid, { renters = [], eventsByRenterId = {}, ledger = [] }) {
  dbState.rentersByUid[uid] = renters.map((renter) => ({ ...renter, status: renter.status || 'active' }));
  dbState.eventsByUidAndRenter[uid] = {};

  Object.entries(eventsByRenterId).forEach(([renterId, events]) => {
    dbState.eventsByUidAndRenter[uid][renterId] = events.map((eventData) => ({ ...eventData }));
  });

  dbState.ledgerByUid[uid] = ledger.map((entry) => ({ ...entry }));
}

export async function fetchRentersForUser(uid) {
  return { ok: true, uid, renters: uidRenters(uid).map((renter) => ({ ...renter })) };
}

export async function saveRenter(uid, renter) {
  const renters = uidRenters(uid);
  const existingIndex = renters.findIndex((item) => item.id === renter.id);

  if (existingIndex >= 0) {
    renters[existingIndex] = { ...renters[existingIndex], ...renter, updatedAt: new Date() };
  } else {
    renters.push({ ...renter, status: renter.status || 'active', updatedAt: new Date() });
  }

  notifyRentersListeners(uid);
  return { ok: true, uid, renter };
}

export async function fetchLedgerEntries(uid, renterId) {
  const entries = uidLedger(uid).filter((entry) => entry.renterId === renterId);
  return { ok: true, uid, renterId, entries };
}

export const renters = {
  listen(uid, filters, onChange) {
    const listener = { uid, filters, onChange };
    rentersListeners.add(listener);
    notifyRentersListeners(uid);

    return () => {
      rentersListeners.delete(listener);
    };
  },

  async archive(uid, renterId) {
    const renter = uidRenters(uid).find((item) => item.id === renterId);
    if (!renter) {
      return { ok: false, error: 'Renter not found.' };
    }

    renter.status = 'archived';
    renter.updatedAt = new Date();
    notifyRentersListeners(uid);
    return { ok: true };
  },

  async restore(uid, renterId) {
    const renter = uidRenters(uid).find((item) => item.id === renterId);
    if (!renter) {
      return { ok: false, error: 'Renter not found.' };
    }

    renter.status = 'active';
    renter.updatedAt = new Date();
    notifyRentersListeners(uid);
    return { ok: true };
  },

  async permanentlyDelete(uid, renterId) {
    let deletedEvents = 0;
    let deletedLedger = 0;
    const chunkSize = 200;

    // 1) delete events subcollection in chunks
    const renterEvents = uidEvents(uid, renterId);
    while (renterEvents.length > 0) {
      const chunk = renterEvents.splice(0, chunkSize);
      deletedEvents += chunk.length;
    }

    // 2) delete ledger entries where renterId matches, chunked loop
    const ledgerEntries = uidLedger(uid);
    let removedInLoop = true;
    while (removedInLoop) {
      removedInLoop = false;
      const matches = ledgerEntries.filter((entry) => entry.renterId === renterId).slice(0, chunkSize);

      if (matches.length > 0) {
        removedInLoop = true;
        matches.forEach((match) => {
          const index = ledgerEntries.findIndex((entry) => entry.id === match.id);
          if (index >= 0) {
            ledgerEntries.splice(index, 1);
            deletedLedger += 1;
          }
        });
      }
    }

    // 3) delete renter document
    const rentersList = uidRenters(uid);
    const renterIndex = rentersList.findIndex((item) => item.id === renterId);
    const deletedRenter = renterIndex >= 0;

    if (deletedRenter) {
      rentersList.splice(renterIndex, 1);
    }

    delete dbState.eventsByUidAndRenter[uid]?.[renterId];

    notifyRentersListeners(uid);
    notifyReminderListeners(uid);

    return { deletedRenter, deletedEvents, deletedLedger };
  },
};

export const events = {
  async logReminderSent(uid, renterId, sentAt = new Date()) {
    const sentAtDate = toSerializableDate(sentAt);

    const reminderEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userUid: uid,
      renterId,
      type: 'reminder_marked_sent',
      monthKey: toMonthKey(sentAtDate),
      sentAt: sentAtDate,
      createdAt: new Date(),
      message: 'Marked sent',
    };

    uidEvents(uid, renterId).push(reminderEvent);
    notifyReminderListeners(uid);

    return { ok: true, event: reminderEvent };
  },

  listenRemindersForMonth(uid, monthKey, onChange) {
    const listener = { uid, monthKey, onChange };
    reminderMonthListeners.add(listener);
    onChange(getReminderEventsForMonth(uid, monthKey));

    return () => {
      reminderMonthListeners.delete(listener);
    };
  },

  async listByRenter(uid, renterId) {
    return uidEvents(uid, renterId).map((eventData) => ({ ...eventData }));
  },
};
