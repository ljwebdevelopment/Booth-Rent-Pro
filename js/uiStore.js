const state = {
  currentUser: null,
  authReady: false,
  authViewMode: 'signin', // "signin" | "signup"
  authLoading: false,
  authError: '',
  selectedRenterId: null,
  drawerOpen: false,
  paymentMethod: '',
  otherMethod: '',
  notesDraftByRenterId: {}
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(partialState) {
  Object.assign(state, partialState);
  listeners.forEach((listener) => listener(state));
}

export function setRenterNoteDraft(renterId, value) {
  state.notesDraftByRenterId[renterId] = value;
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
