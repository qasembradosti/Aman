const CHECKOUT_BASE_URL = "https://checkout.aman-store.com/checkout";

export const buildPublicProductUrl = (productId, userId) => {
  if (!productId) return "";

  const params = new URLSearchParams({ productId: String(productId) });
  if (userId) params.append("userId", String(userId));

  return `${CHECKOUT_BASE_URL}?${params.toString()}`;
};
