const CHECKOUT_TOKEN_QUERY_KEYS = ["token", "accessToken", "authToken"];
const CHECKOUT_TOKEN_STORAGE_KEY = "checkout_auth_token";
const LAST_ORDER_STORAGE_KEY = "checkout_last_order";

const canUseBrowserStorage = () => typeof window !== "undefined";

const readStorageValue = (storage, key) => {
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (storage, key, value) => {
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures. The app can still operate without persistence.
  }
};

const removeStorageValue = (storage, key) => {
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const getSearchParams = () => {
  if (!canUseBrowserStorage()) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
};

export const getCheckoutQueryValue = (...keys) => {
  const params = getSearchParams();

  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      return value;
    }
  }

  return null;
};

export const persistCheckoutToken = (token) => {
  if (!canUseBrowserStorage() || !token) return token;

  writeStorageValue(window.sessionStorage, CHECKOUT_TOKEN_STORAGE_KEY, token);
  return token;
};

export const getCheckoutToken = () => {
  if (!canUseBrowserStorage()) return null;

  for (const key of CHECKOUT_TOKEN_QUERY_KEYS) {
    const queryToken = getCheckoutQueryValue(key);
    if (queryToken) {
      return persistCheckoutToken(queryToken);
    }
  }

  const storedToken =
    readStorageValue(window.sessionStorage, CHECKOUT_TOKEN_STORAGE_KEY) ||
    readStorageValue(window.localStorage, CHECKOUT_TOKEN_STORAGE_KEY) ||
    readStorageValue(window.localStorage, "token") ||
    readStorageValue(window.localStorage, "authToken") ||
    readStorageValue(window.localStorage, "accessToken");

  if (storedToken) {
    persistCheckoutToken(storedToken);
  }

  return storedToken;
};

export const clearPersistedOrder = () => {
  if (!canUseBrowserStorage()) return;

  removeStorageValue(window.sessionStorage, LAST_ORDER_STORAGE_KEY);
};

export const persistOrderSnapshot = (order) => {
  if (!canUseBrowserStorage() || !order) return;

  try {
    writeStorageValue(
      window.sessionStorage,
      LAST_ORDER_STORAGE_KEY,
      JSON.stringify(order),
    );
  } catch {
    // Ignore serialization issues and continue without persistence.
  }
};

export const getPersistedOrderSnapshot = () => {
  if (!canUseBrowserStorage()) return null;

  const rawOrder = readStorageValue(window.sessionStorage, LAST_ORDER_STORAGE_KEY);
  if (!rawOrder) return null;

  try {
    return JSON.parse(rawOrder);
  } catch {
    clearPersistedOrder();
    return null;
  }
};

export const extractOrderId = (payload) => {
  if (payload === null || payload === undefined) return null;

  if (typeof payload === "string" || typeof payload === "number") {
    const value = String(payload).trim();
    return value || null;
  }

  const candidates = [
    payload.orderId,
    payload.order_id,
    payload.id,
    payload.order?.orderId,
    payload.order?.order_id,
    payload.order?.id,
    payload.data?.orderId,
    payload.data?.order_id,
    payload.data?.id,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const value = String(candidate).trim();
    if (value) {
      return value;
    }
  }

  return null;
};

export const normalizeOrderResponse = (payload, fallback = {}) => {
  const base =
    payload && typeof payload === "object"
      ? payload.order || payload.data || payload
      : {};

  const orderId = extractOrderId(payload) || extractOrderId(base) || extractOrderId(fallback);

  return {
    ...fallback,
    ...base,
    id: base.id ?? fallback.id ?? orderId ?? null,
    orderId: orderId ?? fallback.orderId ?? fallback.id ?? null,
    items: Array.isArray(base.items)
      ? base.items
      : Array.isArray(fallback.items)
        ? fallback.items
        : [],
    shipping_address:
      base.shipping_address ?? fallback.shipping_address ?? null,
    total_amount: base.total_amount ?? fallback.total_amount ?? null,
    payment_method: base.payment_method ?? fallback.payment_method ?? null,
    notes: base.notes ?? fallback.notes ?? null,
    status: base.status ?? fallback.status ?? "pending",
    user_id: base.user_id ?? fallback.user_id ?? null,
  };
};
