// Lightweight shared connectivity state for non-React consumers (e.g. api service)
let _isConnected = true;

export function setIsConnected(val) {
  _isConnected = !!val;
}

export function getIsConnected() {
  return _isConnected;
}

export default {
  setIsConnected,
  getIsConnected,
};
