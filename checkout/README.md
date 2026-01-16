# Checkout Application

A simple React checkout application for handling product orders.

## Features

- Product display with details
- Checkout form with delivery information
- Order creation with complete details
- Success page confirmation

## Installation

```bash
npm install
```

## Running the Application

```bash
npm run dev
```

The application will start on `http://localhost:3000`

## Usage

Access the checkout page with the following URL format:
```
http://localhost:4000/?productId=123&userId=456
```

### Required URL Parameters:
- `productId`: The ID of the product to checkout
- `userId`: The ID of the user making the order (optional, used for order tracking)

### Order Fields:
The order will be created with the following information:
- Product title
- Price
- Quantity
- Total price
- Delivery price
- Commission price
- City
- Phone
- Address
- User ID
- Status
- Created at

## API Configuration

Update the API base URL in `src/services/api.js` to match your backend server:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## Build for Production

```bash
npm run build
```

## Technologies Used

- React 18
- React Router DOM
- Axios
- Vite
