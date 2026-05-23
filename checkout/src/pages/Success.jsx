import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import {
  extractOrderId,
  getCheckoutQueryValue,
  getPersistedOrderSnapshot,
  normalizeOrderResponse,
} from '../utils/checkoutSession';
import { translations } from '../utils/translations';

const Success = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get language from localStorage
  const [language] = useState(() => localStorage.getItem('language') || 'en');
  const t = translations[language];

  useEffect(() => {
    const fetchOrder = async () => {
      const orderId = getCheckoutQueryValue('orderId', 'order_id');
      const cachedOrder = getPersistedOrderSnapshot();
      const normalizedCachedOrder = cachedOrder
        ? normalizeOrderResponse(cachedOrder)
        : null;
      const cachedOrderId = extractOrderId(normalizedCachedOrder);
      const matchingCachedOrder =
        orderId &&
        cachedOrderId &&
        String(cachedOrderId) === String(orderId)
          ? normalizedCachedOrder
          : null;

      try {
        if (!orderId && !matchingCachedOrder) {
          setError('No order ID found');
          setLoading(false);
          return;
        }

        if (matchingCachedOrder) {
          setOrder(matchingCachedOrder);
        }

        if (!orderId) {
          setLoading(false);
          return;
        }

        const orderData = await orderService.getOrderById(orderId);
        setOrder(normalizeOrderResponse(orderData, matchingCachedOrder || {}));
        setError(null);
      } catch (err) {
        console.error('Error fetching order:', err);
        if (!matchingCachedOrder) {
          setError(
            err.response?.data?.message ||
            err.message ||
            'Failed to load order details'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
            <p className="mt-4 text-lg text-gray-600 font-medium">
              Loading order details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-lg w-full">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 rounded-full p-6 mb-6">
              <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              Order Not Found
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              {error || 'Unable to load order details'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayOrderId = extractOrderId(order);

  // Parse shipping address if it's a string
  let shippingAddress = order.shipping_address;
  if (typeof shippingAddress === 'string') {
    try {
      shippingAddress = JSON.parse(shippingAddress);
    } catch (e) {
      console.error('Failed to parse shipping address:', e);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-linear-to-r from-green-500 to-green-600 p-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
            <p className="text-green-100 text-lg">Thank you for your order. We'll process it shortly.</p>
          </div>

          {/* Order Info */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="text-xl font-bold text-gray-800">#{displayOrderId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Shipping Address */}
            {shippingAddress && (
              <div className="mb-8 border-t pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Shipping Address</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">City:</span> {shippingAddress.city}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Address:</span> {shippingAddress.address}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Phone:</span> {shippingAddress.phone}
                  </p>
                </div>
              </div>
            )}

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <div className="mb-8 border-t pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.items.map((item, index) => {
                    // Construct proper image URL
                    let imageUrl = item.image;
                    if (imageUrl && !imageUrl.startsWith('http')) {
                      const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
                      imageUrl = `https://backend.aman-store.com${cleanPath}`;
                    }
                    
                    return (
                      <div key={index} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
                        <img
                          src={imageUrl}
                          alt={item.product_name || 'Product'}
                          className="w-20 h-20 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{item.product_name || 'Product'}</h3>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          <p className="text-sm font-medium text-gray-800">
                            {(item.price * item.quantity).toLocaleString()} IQD
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-gray-800">Total Amount</span>
                <span className="text-3xl font-bold text-green-600">
                  {order.total_amount?.toLocaleString()} IQD
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
