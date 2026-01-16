import db from '../config/knex.js';

const User = {
  // Create a new user
  create: async (userData) => {
    const [id] = await db('users').insert(userData);
    return { id, ...userData };
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
