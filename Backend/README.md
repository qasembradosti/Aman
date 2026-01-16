# Backend Setup with Knex.js (SQL)

## Features
- Express.js server
- Knex.js query builder for SQL databases
- User authentication (register/login) with JWT
- Password hashing with bcrypt
- MySQL/PostgreSQL/SQLite support

## Installation

1. Install dependencies:
```bash
npm install express knex mysql2 bcryptjs jsonwebtoken dotenv
```

For PostgreSQL, use: `npm install pg` instead of `mysql2`
For SQLite, use: `npm install sqlite3` instead of `mysql2`

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials

## Database Setup

1. Create your database:
```sql
CREATE DATABASE aman_db;
```

2. Run the migration to create the users table:
```bash
node migrations/create_users_table.js
```

3. Wallet tables

The server will automatically create `wallets` and `wallet_transactions` tables at startup if they are missing. Just start the server after configuring `.env` and the schema setup will ensure these tables exist.

## Running the Server

```bash
node index.js
```

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- **Body**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login
- **POST** `/api/auth/login`
- **Body**:
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```
- **Response**: Returns JWT token

### Wallet

#### Leaderboard (Top Users by Balance or Period Net Change)
- **GET** `/api/wallet/leaderboard`
- **Query params**:
  - `limit` (integer, default 10)
  - `offset` (integer, default 0)
  - `period` (string, optional, default `all`) — one of `all`, `weekly`, `monthly`
    - `all`: ranks by current wallet `balance` (descending)
    - `weekly` or `monthly`: ranks by `netChange` (credits - debits) within the current ISO week or calendar month; also returns `balance` for display
- **Response**: Array `[{ rank, id, username, balance, netChange, period }]`

### Products

#### Create Product (with optional images)
- **POST** `/api/products` (multipart/form-data or JSON)
  - Fields: `title` (required), `price` (required), `description`, `sku`, `discount_price`, `stock`, `vendor_id`, `status`, `category_id`
  - Images: `images[]` up to 10 files (`image/png`, `image/jpeg`, `image/webp`, `image/gif`)
  - Response includes `images: [{ filename, url }]` and `inStock` (derived from `stock > 0`).

Example:
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: multipart/form-data" \
  -F "title=Sample Product" \
  -F "price=19.99" \
  -F "stock=5" \
  -F "images=@C:/path/img1.png" \
  -F "images=@C:/path/img2.png"
```

#### Product Images
- **POST** `/api/products/{id}/images` (multipart/form-data)
  - Field `images`: up to 10 image files
  - Response: `{ images: [ { filename, url } ] }`
- **GET** `/api/products/{id}/images` (currently `{ images: [] }` placeholder; persistence optional)

#### In-Stock Flag
- All product responses include `inStock` boolean (true if `stock > 0`).

#### Product Reviews
- **POST** `/api/products/{id}/reviews` body `{ rating: 1..5, comment?, user_id? }`
- **GET** `/api/products/{id}/reviews` list reviews (placeholder until persistence added)
- **GET** `/api/products/{id}/reviews/summary` returns `{ average, count, breakdown }`

> Persistence for images & reviews can be added via `product_images` & `product_reviews` tables (FK `product_id`). Currently only file storage is used for images.

## Project Structure

```
Backend/
├── config/
│   └── knex.js          # Knex database configuration
├── controllers/
│   └── auth/
│       └── authController.js  # Authentication logic
├── models/
│   └── user.js          # User model with Knex queries
├── routes/
│   └── authRoutes.js    # Auth routes
├── migrations/
│   └── create_users_table.js  # Database migration
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Example environment variables
└── index.js             # Express server entry point
```

## Database Configuration

The `config/knex.js` file is configured for MySQL by default. To use a different database:

### For PostgreSQL:
```javascript
client: 'pg',
```

### For SQLite:
```javascript
client: 'sqlite3',
connection: {
  filename: './database.sqlite'
}
```

## Notes

- Make sure to change `JWT_SECRET` in production
- Password are hashed using bcrypt before storing
- JWT tokens expire in 1 hour by default
