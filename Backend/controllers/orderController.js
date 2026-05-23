import Order from '../models/order.js';
import User from '../models/user.js';
import Wallet from '../models/wallet.js';
import {
  isDeliveryCompany,
  isStoreAdmin,
  isSuperAdmin,
} from '../middleware/adminPanelMiddleware.js';
import { deliverNotificationToUser } from '../services/notificationDeliveryService.js';

// Get all orders with pagination and filters
export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      user_id: requestedUserId,
      start_date,
      end_date,
      sort_by,
      payment_status,
    } = req.query;
    const userId = req.user?.userId; // Get user ID from JWT token
    const normalizedPage = Math.max(parseInt(page, 10) || 1, 1);
    const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    
    const filters = {
      page: normalizedPage,
      limit: normalizedLimit,
      status,
      search,
      start_date,
      end_date,
      sort_by,
      payment_status,
    };
    
    if (isStoreAdmin(req.user)) {
      filters.store_id = Number(req.user.store_id);
    } else if (isSuperAdmin(req.user) || isDeliveryCompany(req.user)) {
      if (requestedUserId) {
        filters.user_id = Number(requestedUserId);
      }
    } else if (userId) {
      filters.user_id = userId;
    }
    
    const result = await Order.getAll(filters);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedStoreId = Number(req.query?.store_id);
    const hasRequestedStoreId = Number.isFinite(requestedStoreId) && requestedStoreId > 0;
    let order = null;

    if (isStoreAdmin(req.user)) {
      order = await Order.getById(id, { store_id: Number(req.user.store_id) });
    } else if (isSuperAdmin(req.user) && hasRequestedStoreId) {
      order = await Order.getById(id, { store_id: requestedStoreId });
    } else {
      order = await Order.getById(id);
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log(`📦 Order ${id} items:`, order.items?.map(item => ({
      id: item.id,
      product_name: item.product_name,
      image: item.image,
    })));

    if (
      !isSuperAdmin(req.user) &&
      !isStoreAdmin(req.user) &&
      !isDeliveryCompany(req.user)
    ) {
      if (Number(order.user_id) !== Number(req.user?.userId)) {
        return res.status(404).json({ message: 'Order not found' });
      }
    }

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
    const requestedUserId = Number.parseInt(orderData.user_id, 10);
    const authenticatedUserId = Number.parseInt(req.user?.userId, 10);
    const effectiveUserId = Number.isInteger(authenticatedUserId) && authenticatedUserId > 0
      ? authenticatedUserId
      : Number.isInteger(requestedUserId) && requestedUserId > 0
        ? requestedUserId
        : null;

    // Validate required fields
    if (!effectiveUserId || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields: user_id (or auth token) and items',
      });
    }

    if (orderData.total_amount === undefined || orderData.total_amount === null) {
      return res.status(400).json({ message: 'Total amount is required' });
    }

    if (
      Number.isInteger(authenticatedUserId) &&
      authenticatedUserId > 0 &&
      Number.isInteger(requestedUserId) &&
      requestedUserId > 0 &&
      requestedUserId !== authenticatedUserId
    ) {
      console.warn(
        `Checkout user mismatch detected. Request user_id=${requestedUserId} overridden by token user_id=${authenticatedUserId}.`,
      );
    }

    const normalizedOrderData = {
      ...orderData,
      user_id: effectiveUserId,
    };

    // Check if user exists
    const user = await User.findById(effectiveUserId);
    if (!user) {
      return res.status(404).json({ 
        message: `User with ID ${effectiveUserId} not found. Please provide a valid user ID.` 
      });
    }

    const orderId = await Order.create(normalizedOrderData);

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
    const storeAdmin = isStoreAdmin(req.user);

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Get current order status to validate transition
    if (storeAdmin && status !== 'processing') {
      return res.status(403).json({
        message: 'Store admins can only update order status to processing.',
      });
    }

    const currentOrder = storeAdmin
      ? await Order.getById(id, { store_id: Number(req.user.store_id) })
      : await Order.getById(id);
    if (!currentOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const currentStatus = currentOrder.status;

    // Check if order is already in a final state
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
      return res.status(400).json({ 
        message: `Order is already ${currentStatus}` 
      });
    }

    // Validate sequential transition (Pending -> Processing -> Shipped -> Delivered)
    // Also allow cancellation from non-final states
    const validTransitions = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled']
    };

    if (status !== currentStatus && (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status))) {
      return res.status(400).json({ 
        message: `Invalid status transition. Cannot change from '${currentStatus}' to '${status}'.` 
      });
    }

    const updated = await Order.updateStatus(id, status);
    console.log(' Update result:', updated);

    if (!updated) {
      console.log('❌ Order update failed:', id);
      return res.status(500).json({ message: 'Failed to update order status' });
    }

    // Fetch and return the updated order
    const order = storeAdmin
      ? await Order.getById(id, { store_id: Number(req.user.store_id) })
      : await Order.getById(id);

    // Process commission if order is delivered
    if (status === 'delivered') {
      try {
        const isWithdrawn = await Order.isCommissionWithdrawn(id);
        if (!isWithdrawn) {
          const commission = await Order.calculateCommission(id);
          
          if (commission > 0) {
            console.log(`Processing commission for order #${id}: ${commission}`);
            
            // Add to wallet
            await Wallet.credit(
              order.user_id,
              commission,
              `Commission for Order #${order.id}`,
              { order_id: order.id, type: 'order_commission' }
            );
            
            // Mark as withdrawn
            await Order.markCommissionWithdrawn(id);
            console.log(`Commission of ${commission} added to user ${order.user_id}`);
          }
        }
      } catch (err) {
        console.error('❌ Error processing commission:', err);
        // Continue to return response even if commission fails
      }
    }

    try {
      const statusLabels = {
        pending: 'Pending',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
      };

      await deliverNotificationToUser({
        userId: order.user_id,
        title: 'Order Status Updated',
        message: `Your order #${order.id} is now ${statusLabels[status] || status}.`,
        data: {
          route: `/order/${order.id}`,
          type: 'order-status',
          orderId: order.id,
          status,
        },
      });
    } catch (notificationError) {
      console.error('Failed to deliver order status notification:', notificationError);
    }

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

// Withdraw commission for delivered order
export const withdrawCommission = async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const order = await Order.getById(id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ 
        message: 'Commission can only be withdrawn for delivered orders' 
      });
    }

    // Check if commission already withdrawn
    const alreadyWithdrawn = await Order.isCommissionWithdrawn(id);
    if (alreadyWithdrawn) {
      return res.status(400).json({ 
        message: 'Commission has already been withdrawn for this order' 
      });
    }

    // Calculate total commission
    const totalCommission = await Order.calculateCommission(id);

    if (totalCommission <= 0) {
      return res.status(400).json({ 
        message: 'No commission available for this order' 
      });
    }

    // Credit the user's wallet
    const result = await Wallet.credit(
      order.user_id, 
      totalCommission,
      `Commission for order #${id}`,
      { order_id: id, type: 'commission' }
    );

    // Mark commission as withdrawn
    await Order.markCommissionWithdrawn(id);

    res.json({ 
      message: 'Commission withdrawn successfully',
      commission: totalCommission,
      newBalance: result.balance,
      orderId: id
    });
  } catch (error) {
    console.error('Error withdrawing commission:', error);
    res.status(500).json({ 
      message: 'Failed to withdraw commission', 
      error: error.message 
    });
  }
};
