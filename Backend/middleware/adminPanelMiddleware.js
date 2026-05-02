export const isSuperAdmin = (user) => user?.role === 'superadmin';

export const isStoreAdmin = (user) =>
  user?.role === 'admin' && Number(user?.store_id) > 0;

export const isDeliveryCompany = (user) =>
  user?.role === 'delivery_company';

export const canAccessAdminPanel = (user) =>
  isSuperAdmin(user) || isStoreAdmin(user);

export const requireAdminPanelAccess = (req, res, next) => {
  if (!canAccessAdminPanel(req.user)) {
    return res.status(403).json({
      message:
        'Access denied. Superadmin or store admin with a store assignment is required.',
    });
  }

  next();
};

export const requireSuperAdminAccess = (req, res, next) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({
      message: 'Access denied. Superadmin role required.',
    });
  }

  next();
};
