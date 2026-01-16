// Development-only static authentication for frontend
// Set USE_STATIC_AUTH to true to bypass backend login for specified users

export const USE_STATIC_AUTH = true; // toggle off to use real API login

// Define one or more static users for development
export const STATIC_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    user: {
      id: 10000,
      username: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      phone: null,
      status: 'active',
      phone_verified: true,
    },
  },
];

export function tryStaticLogin({ username, password }) {
  const match = STATIC_USERS.find(
    (u) => u.username === String(username) && u.password === String(password)
  );
  if (!match) return null;
  // Mint a deterministic dev token
  const token = `static-dev-token-${match.user.username}`;
  return { token, user: match.user };
}
