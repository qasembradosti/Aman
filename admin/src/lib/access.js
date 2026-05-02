export const isSuperAdmin = (user) => user?.role === "superadmin";

export const isStoreAdmin = (user) =>
  user?.role === "admin" && Number(user?.store_id) > 0;

export const isDeliveryCompany = (user) =>
  user?.role === "delivery_company";

export const canAccessAdminPanel = (user) =>
  isSuperAdmin(user) || isStoreAdmin(user) || isDeliveryCompany(user);

export const canManageFullProducts = (user) => isSuperAdmin(user);

export const getDefaultAdminPath = (user) =>
  isStoreAdmin(user) ? "/products" : isDeliveryCompany(user) ? "/orders" : "/";

export const canAccessAdminPath = (user, pathname = "/") => {
  if (isSuperAdmin(user)) {
    return true;
  }

  if (isStoreAdmin(user)) {
    return pathname.startsWith("/products") || pathname.startsWith("/orders");
  }

  if (isDeliveryCompany(user)) {
    return pathname.startsWith("/orders");
  }

  return false;
};
