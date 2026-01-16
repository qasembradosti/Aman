import { getApiBaseUrl } from "./apiConfig";

const ABSOLUTE_URL = /^https?:\/\//i;

const extractImageValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url || value.image_url || value.image || null;
};

const joinBaseUrl = (baseUrl, path) => {
  if (!baseUrl || !path) return path;
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = String(path).replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
};

export const resolveImageUrl = (value) => {
  const imageValue = extractImageValue(value);
  if (!imageValue) return null;
  const url = String(imageValue);
  if (ABSOLUTE_URL.test(url)) return url;
  return joinBaseUrl(getApiBaseUrl(), url);
};

export const getProductImageUrl = (product, fallback) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const preferred = images.find((img) => img?.is_main) || images[0];
  const candidate =
    extractImageValue(preferred) ||
    product?.image ||
    product?.image_url ||
    product?.imageUrl;
  const resolved = resolveImageUrl(candidate);
  return resolved || fallback || null;
};

export const getProductImageUrls = (product, fallback) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const urls = images.map((img) => resolveImageUrl(img)).filter(Boolean);
  if (urls.length > 0) return urls;

  const direct =
    resolveImageUrl(product?.image || product?.image_url || product?.imageUrl);
  if (direct) return [direct];

  return fallback ? [fallback] : [];
};
