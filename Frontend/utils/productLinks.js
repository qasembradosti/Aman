const CHECKOUT_BASE_URL = "https://checkout.aman-store.com/checkout";

export const buildPublicProductUrl = (productId) => {
  if (!productId) return "";

  return `${CHECKOUT_BASE_URL}?productId=${encodeURIComponent(String(productId))}`;
};

export const buildAuthenticatedCheckoutUrl = ({
  userId,
  productId,
  quantity,
} = {}) => {
  if (!userId || !productId) return "";

  const params = new URLSearchParams({
    userId: String(userId),
    productId: String(productId),
  });

  if (quantity !== undefined && quantity !== null && quantity !== "") {
    params.set("quantity", String(quantity));
  }

  return `${CHECKOUT_BASE_URL}?${params.toString()}`;
};
