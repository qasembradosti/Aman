import db from '../config/knex.js';

const User = {
  // Create a new user
  create: async (userData) => {
    // Ensure default status if not provided
    const dataWithDefaults = {
      status: 'pending',
      phone_verified: false,
      ...userData
    };
    
    // Remove null/undefined values to avoid database NOT NULL constraint errors
    const cleanData = Object.fromEntries(
      Object.entries(dataWithDefaults).filter(([_, value]) => value !== null && value !== undefined)
    );
    
    const [id] = await db('users').insert(cleanData);
    return { id, ...cleanData };
  },

  // Find user by username
  findByUsername: async (username) => db('users').where({ username }).first(),

  // Find user by email
  findByEmail: async (email) => db('users').where({ email }).first(),

  // Find user by id
  findById: async (id) => db('users').where({ id }).first(),

  // Update user
  update: async (id, userData) => {
    await db('users').where({ id }).update(userData);
    return await User.findById(id);
  },

  // Delete user
  delete: async (id) => db('users').where({ id }).del(),
};

export default User;
