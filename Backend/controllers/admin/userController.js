import db from '../../config/knex.js';

/**
 * Get all users
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await db('users')
            .select('id', 'username', 'email', 'phone', 'status', 'role', 'first_name', 'last_name', 'created_at')
            .orderBy('created_at', 'desc');

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
        const user = await db('users')
            .select('id', 'username', 'email', 'phone', 'status', 'role', 'first_name', 'last_name', 'created_at')
            .where({ id })
            .first();

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
 * Update user
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, phone, status, role } = req.body;

        const user = await db('users').where({ id }).first();
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Only superadmin can update roles
        if (role !== undefined && req.user.role !== 'superadmin') {
            return res.status(403).json({
                message: 'Only superadmin can update user roles'
            });
        }

        // Validate role value if provided
        if (role !== undefined) {
            const validRoles = ['superadmin', 'seller', 'admin'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    message: 'Invalid role. Must be one of: superadmin, seller, admin'
                });
            }
        }

        const updateData = {};
        if (username !== undefined) updateData.username = username;
        if (phone !== undefined) updateData.phone = phone;
        if (status !== undefined) updateData.status = status;
        if (role !== undefined) updateData.role = role;

        await db('users').where({ id }).update(updateData);

        const updatedUser = await db('users')
            .select('id', 'username', 'phone', 'status', 'created_at')
            .where({ id })
            .first();

        res.json({
            message: 'User updated successfully',
            user: updatedUser
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
