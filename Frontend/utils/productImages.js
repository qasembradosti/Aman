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

// Extract video value from various formats
const extractVideoValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url || value.video_url || value.video || null;
};

// Resolve video URL (similar to image URL resolution)
export const resolveVideoUrl = (value) => {
  const videoValue = extractVideoValue(value);
  if (!videoValue) return null;
  const url = String(videoValue);
  if (ABSOLUTE_URL.test(url)) return url;
  return joinBaseUrl(getApiBaseUrl(), url);
};

// Get product video URL
export const getProductVideoUrl = (product, fallback) => {
  const videos = Array.isArray(product?.videos) ? product.videos : [];
  const preferred = videos.find((vid) => vid?.is_main) || videos[0];
  const candidate =
    extractVideoValue(preferred) ||
    product?.video ||
    product?.video_url ||
    product?.videoUrl;
  const resolved = resolveVideoUrl(candidate);
  return resolved || fallback || null;
};

// Get all product video URLs
export const getProductVideoUrls = (product, fallback) => {
  const videos = Array.isArray(product?.videos) ? product.videos : [];
  const urls = videos.map((vid) => resolveVideoUrl(vid)).filter(Boolean);
  if (urls.length > 0) return urls;

  const direct =
    resolveVideoUrl(product?.video || product?.video_url || product?.videoUrl);
  if (direct) return [direct];

  return fallback ? [fallback] : [];
};
