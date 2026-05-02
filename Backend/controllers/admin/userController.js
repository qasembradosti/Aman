import db from '../../config/knex.js';
import bcrypt from 'bcryptjs';
import Wallet from '../../models/wallet.js';

const buildUsersQuery = () =>
  db('users')
    .leftJoin('stores', 'users.store_id', 'stores.id')
    .select(
      'users.id',
      'users.username',
      'users.email',
      'users.phone',
      'users.status',
      'users.role',
      'users.store_id',
      'stores.name as store_name',
      'users.first_name',
      'users.last_name',
      'users.created_at',
    );

const normalizeIraqPhone = (input) => {
  if (!input) return null;

  let digits = String(input).replace(/\D/g, '');

  if (digits.startsWith('00964')) digits = digits.slice(5);
  else if (digits.startsWith('964')) digits = digits.slice(3);

  if (digits.startsWith('07')) digits = digits.slice(1);
  if (!/^7\d{9}$/.test(digits)) {
    return null;
  }

  return `+964${digits}`;
};

const parseStoreId = (storeId) => {
  if (storeId === '' || storeId === null || storeId === undefined) {
    return null;
  }

  const resolvedStoreId = Number(storeId);
  return Number.isInteger(resolvedStoreId) ? resolvedStoreId : Number.NaN;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Get all users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await buildUsersQuery().orderBy('users.created_at', 'desc');

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await buildUsersQuery().where('users.id', id).first();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

/**
 * Create user
 */
export const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      phone,
      status,
      role,
      store_id,
      first_name,
      last_name,
    } = req.body;

    const resolvedUsername = username?.trim();
    const resolvedEmail = email?.trim().toLowerCase();
    const resolvedRole = role || 'admin';
    const resolvedStatus = status || 'active';
    const resolvedStoreId = parseStoreId(store_id);

    if (!resolvedUsername || !resolvedEmail || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required',
      });
    }

    if (resolvedUsername.length < 3) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters long',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    if (!isValidEmail(resolvedEmail)) {
      return res.status(400).json({
        message: 'Email must be valid',
      });
    }

    const validRoles = ['seller', 'admin', 'delivery_company'];
    if (!validRoles.includes(resolvedRole)) {
      return res.status(400).json({
        message: 'Invalid role. Must be one of: seller, admin, delivery_company',
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(resolvedStatus)) {
      return res.status(400).json({
        message: 'Invalid status. Must be one of: active, inactive, suspended',
      });
    }

    if (Number.isNaN(resolvedStoreId)) {
      return res.status(400).json({
        message: 'store_id must be a valid store identifier',
      });
    }

    if (resolvedRole === 'admin' && !resolvedStoreId) {
      return res.status(400).json({
        message: 'Admin users must be assigned to a store',
      });
    }

    if (resolvedStoreId) {
      const store = await db('stores').where({ id: resolvedStoreId }).first();
      if (!store) {
        return res.status(400).json({
          message: 'Assigned store was not found',
        });
      }
    }

    const normalizedPhone = phone ? normalizeIraqPhone(phone) : null;
    if (phone && !normalizedPhone) {
      return res.status(400).json({
        message:
          'Invalid phone format. Use 7XXXXXXXXX or 07XXXXXXXX, saved as +9647XXXXXXXX',
      });
    }

    const [existingUsername, existingEmail, existingPhone] = await Promise.all([
      db('users').where({ username: resolvedUsername }).first(),
      db('users').where({ email: resolvedEmail }).first(),
      normalizedPhone ? db('users').where({ phone: normalizedPhone }).first() : null,
    ]);

    if (existingUsername) {
      return res.status(400).json({
        message: 'Username already in use',
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already in use',
      });
    }

    if (existingPhone) {
      return res.status(400).json({
        message: 'Phone number already in use',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUserId = await db.transaction(async (trx) => {
      const [insertedId] = await trx('users').insert({
        username: resolvedUsername,
        email: resolvedEmail,
        password: hashedPassword,
        phone: normalizedPhone,
        status: resolvedStatus,
        role: resolvedRole,
        first_name: first_name?.trim() || resolvedUsername,
        last_name: last_name?.trim() || '',
        phone_verified: false,
        store_id: resolvedRole === 'admin' ? resolvedStoreId : null,
      });

      await Wallet.createIfMissing(insertedId, 'IQD', trx);

      return insertedId;
    });

    const createdUser = await buildUsersQuery()
      .where('users.id', createdUserId)
      .first();

    res.status(201).json({
      message: 'User created successfully',
      user: createdUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};

/**
 * Update user
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      phone,
      status,
      role,
      store_id,
      first_name,
      last_name,
    } = req.body;

    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (role !== undefined && req.user.role !== 'superadmin') {
      return res.status(403).json({
        message: 'Only superadmin can update user roles',
      });
    }

    const resolvedUsername = username?.trim();
    const resolvedEmail = email?.trim().toLowerCase();
    const resolvedPassword = typeof password === 'string' ? password.trim() : '';

    if (username !== undefined && !resolvedUsername) {
      return res.status(400).json({
        message: 'Username is required',
      });
    }

    if (username !== undefined && resolvedUsername.length < 3) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters long',
      });
    }

    if (email !== undefined) {
      if (!resolvedEmail) {
        return res.status(400).json({
          message: 'Email is required',
        });
      }

      if (!isValidEmail(resolvedEmail)) {
        return res.status(400).json({
          message: 'Email must be valid',
        });
      }
    }

    if (password !== undefined && resolvedPassword && resolvedPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    if (role !== undefined) {
      const validRoles = ['superadmin', 'seller', 'admin', 'delivery_company'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message:
            'Invalid role. Must be one of: superadmin, seller, admin, delivery_company',
        });
      }
    }

    const resolvedRole = role !== undefined ? role : user.role;
    const rawStoreId = store_id !== undefined ? store_id : user.store_id;
    const resolvedStoreId =
      rawStoreId === '' || rawStoreId === null || rawStoreId === undefined
        ? null
        : Number(rawStoreId);

    if (resolvedStoreId !== null && !Number.isInteger(resolvedStoreId)) {
      return res.status(400).json({
        message: 'store_id must be a valid store identifier',
      });
    }

    if (resolvedRole === 'admin' && !resolvedStoreId) {
      return res.status(400).json({
        message: 'Admin users must be assigned to a store',
      });
    }

    if (resolvedStoreId) {
      const store = await db('stores').where({ id: resolvedStoreId }).first();
      if (!store) {
        return res.status(400).json({
          message: 'Assigned store was not found',
        });
      }
    }

    let normalizedPhone = user.phone;
    if (phone !== undefined) {
      if (phone === null || phone === '') {
        normalizedPhone = null;
      } else {
        normalizedPhone = normalizeIraqPhone(phone);
      }
    }

    if (phone !== undefined && phone && !normalizedPhone) {
      return res.status(400).json({
        message:
          'Invalid phone format. Use 7XXXXXXXXX or 07XXXXXXXX, saved as +9647XXXXXXXX',
      });
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Invalid status. Must be one of: active, inactive, suspended',
        });
      }
    }

    const [existingUsername, existingEmail, existingPhone] = await Promise.all([
      username !== undefined && resolvedUsername !== user.username
        ? db('users').where({ username: resolvedUsername }).whereNot({ id }).first()
        : null,
      email !== undefined && resolvedEmail !== user.email
        ? db('users').where({ email: resolvedEmail }).whereNot({ id }).first()
        : null,
      phone !== undefined && normalizedPhone !== user.phone && normalizedPhone
        ? db('users').where({ phone: normalizedPhone }).whereNot({ id }).first()
        : null,
    ]);

    if (existingUsername) {
      return res.status(400).json({
        message: 'Username already in use',
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already in use',
      });
    }

    if (existingPhone) {
      return res.status(400).json({
        message: 'Phone number already in use',
      });
    }

    const updateData = {};
    if (username !== undefined) updateData.username = resolvedUsername;
    if (email !== undefined) updateData.email = resolvedEmail;
    if (phone !== undefined) updateData.phone = normalizedPhone;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;
    if (first_name !== undefined) updateData.first_name = first_name?.trim() || '';
    if (last_name !== undefined) updateData.last_name = last_name?.trim() || '';
    if (resolvedPassword) {
      updateData.password = await bcrypt.hash(resolvedPassword, 10);
    }

    if (resolvedRole === 'admin') {
      updateData.store_id = resolvedStoreId;
    } else if (store_id !== undefined || role !== undefined) {
      updateData.store_id = null;
    }

    await db('users').where({ id }).update(updateData);

    const updatedUser = await buildUsersQuery().where('users.id', id).first();

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db('users').where({ id }).del();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};
