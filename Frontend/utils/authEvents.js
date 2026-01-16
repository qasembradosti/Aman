// Simple global event bus for auth-related signals without creating circular imports
export const authEvents = {
  _listeners: new Set(),
  on(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  },
  emit(event, payload) {
    for (const cb of Array.from(this._listeners)) {
      try { cb(event, payload); } catch (e) { /* no-op */ }
    }
  },
};

export default authEvents;