import Order from '../models/order.js';
import User from '../models/user.js';

// Get all orders with pagination and filters
export const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    const result = await Order.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.getById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log(`📦 Order ${id} items:`, order.items?.map(item => ({
      id: item.id,
      product_name: item.product_name,
      image: item.image,
    })));

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
};

// Create new order
export const createOrder = async (req, res) => {

  try {
    const orderData = req.body;

    // Validate required fields
    if (!orderData.user_id || !orderData.items || !orderData.items.length) {
      return res.status(400).json({ message: 'Missing required fields: user_id and items' });
    }

    if (!orderData.total_amount) {
      return res.status(400).json({ message: 'Total amount is required' });
    }

    // Check if user exists
    const user = await User.findById(orderData.user_id);
    if (!user) {
      return res.status(404).json({ 
        message: `User with ID ${orderData.user_id} not found. Please provide a valid user ID.` 
      });
    }

    const orderId = await Order.create(orderData);

    res.status(201).json({
      message: 'Order created successfully',
      orderId
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle foreign key constraint error
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        message: 'Invalid user ID. The user does not exist in the system.' 
      });
    }
    
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updated = await Order.updateStatus(id, status);
    console.log('✅ Update result:', updated);

    if (!updated) {
      console.log('❌ Order not found:', id);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Fetch and return the updated order
    const order = await Order.getById(id);
    console.log('✅ Returning updated order:', order.id, order.status);
    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    await Order.delete(id);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Failed to delete order', error: error.message });
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ message: 'Failed to fetch order statistics', error: error.message });
  }
};
