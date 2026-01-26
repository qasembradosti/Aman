import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  fetchOrders,
  fetchOrder,
  updateOrderStatus,
  withdrawCommission,
} from "../../store/slices/ordersSlice";
import { Eye, Loader2, Package, Search, Filter, X, Wallet, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

const statusColors = {
  pending: "bg-yellow-50 text-yellow-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const Orders = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.orders);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const openDetail = async (order) => {
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const fullOrder = await dispatch(fetchOrder(order.id)).unwrap();      console.log('Full order data:', fullOrder);
      console.log('Order items:', fullOrder.items);
      if (fullOrder.items && fullOrder.items.length > 0) {
        console.log('First item image:', fullOrder.items[0].image);
      }      setSelectedOrder(fullOrder);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Failed to load order details");
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedOrder(null);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const result = await dispatch(
        updateOrderStatus({ id: orderId, status: newStatus })
      ).unwrap();
      console.log("Status update result:", result);
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error(error || "Failed to update order status. Please try again.");
    }
  };

  const handleWithdrawCommission = async () => {
    if (!selectedOrder) return;

    try {
      const result = await dispatch(withdrawCommission(selectedOrder.id)).unwrap();
      toast.success(`Commission $${result.commission.toFixed(2)} sent to user's wallet!`);
      
      // Refresh the order details
      const fullOrder = await dispatch(fetchOrder(selectedOrder.id)).unwrap();
      setSelectedOrder(fullOrder);
    } catch (error) {
      console.error("Failed to withdraw commission:", error);
      toast.error(error || "Failed to withdraw commission. Please try again.");
    }
  };

  const calculateTotalCommission = (order) => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => {
      return sum + (Number(item.commission_price || 0) * Number(item.quantity));
    }, 0);
  };

  const filteredOrders = items.filter((order) => {
    const matchesSearch =
      order.id?.toString().includes(searchQuery) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount || 0).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Orders</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by order ID, customer name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        #{order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer_name || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.customer_email || order.customer_phone || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.items_count || order.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4">
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value)
                        }
                      >
                        <SelectTrigger
                          className={`w-32 h-8 text-xs font-medium ${
                            statusColors[order.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        onClick={() => openDetail(order)}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
            <DialogClose onClick={closeDetailModal} />
          </DialogHeader>

          <DialogBody className="space-y-6 max-h-[70vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              selectedOrder && (
                <>
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500">Order Date</Label>
                      <p className="text-sm font-medium">
                        {formatDate(selectedOrder.created_at)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Status</Label>
                      <p
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[selectedOrder.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {selectedOrder.status}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Customer Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">Name</Label>
                        <p className="text-sm font-medium">
                          {selectedOrder.user_first_name &&
                          selectedOrder.user_last_name
                            ? `${selectedOrder.user_first_name} ${selectedOrder.user_last_name}`
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Email</Label>
                        <p className="text-sm font-medium">
                          {selectedOrder.user_email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Phone</Label>
                        <p className="text-sm font-medium">
                          {(() => {
                            try {
                              const addr =
                                typeof selectedOrder.shipping_address ===
                                "string"
                                  ? JSON.parse(selectedOrder.shipping_address)
                                  : selectedOrder.shipping_address;
                              return (
                                addr?.phone || selectedOrder.user_phone || "N/A"
                              );
                            } catch {
                              return selectedOrder.user_phone || "N/A";
                            }
                          })()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-gray-500">
                          Shipping Address
                        </Label>
                        <p className="text-sm font-medium">
                          {(() => {
                            try {
                              const addr =
                                typeof selectedOrder.shipping_address ===
                                "string"
                                  ? JSON.parse(selectedOrder.shipping_address)
                                  : selectedOrder.shipping_address;
                              return addr
                                ? `${addr.city}, ${addr.address}`
                                : "N/A";
                            } catch {
                              return "N/A";
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Order Items
                    </h4>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                              {item.image ? (
                                <img
                                  src={item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.product_name || item.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} ×{" "}
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                        </div>
                      )) || (
                        <p className="text-sm text-gray-500">
                          No items available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium">
                          {formatCurrency(
                            selectedOrder.subtotal || selectedOrder.total_amount
                          )}
                        </span>
                      </div>
                      {selectedOrder.shipping_cost > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Shipping</span>
                          <span className="font-medium">
                            {formatCurrency(selectedOrder.shipping_cost)}
                          </span>
                        </div>
                      )}
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Discount</span>
                          <span className="font-medium text-green-600">
                            -{formatCurrency(selectedOrder.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold border-t pt-2">
                        <span>Total</span>
                        <span>
                          {formatCurrency(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Commission Section */}
                  {calculateTotalCommission(selectedOrder) > 0 && (
                    <div className="border-t pt-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-gray-900">
                              User Commission
                            </h4>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(calculateTotalCommission(selectedOrder))}
                          </span>
                        </div>
                        
                        {selectedOrder.status === 'delivered' && !selectedOrder.commission_withdrawn && (
                          <Button
                            onClick={handleWithdrawCommission}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Send Commission to User's Wallet
                          </Button>
                        )}
                        
                        {selectedOrder.commission_withdrawn && (
                          <div className="text-center text-sm text-green-700 font-medium">
                            ✓ Commission has been sent to user's wallet
                          </div>
                        )}

                        {selectedOrder.status !== 'delivered' && (
                          <div className="text-center text-sm text-gray-600">
                            Commission will be available after order is delivered
                          </div>
                        )}
                      </div>

                      {/* Commission Breakdown */}
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 mb-2">Commission Breakdown:</p>
                        {selectedOrder.items?.map((item, index) => (
                          item.commission_price > 0 && (
                            <div key={index} className="flex justify-between text-xs text-gray-600 pl-4">
                              <span>{item.product_name || item.title} (x{item.quantity})</span>
                              <span className="text-green-600 font-medium">
                                {formatCurrency(item.commission_price * item.quantity)}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Info */}
                  {selectedOrder.payment_method && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Payment Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-500">
                            Payment Method
                          </Label>
                          <p className="text-sm font-medium">
                            {selectedOrder.payment_method}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-500">
                            Payment Status
                          </Label>
                          <p className="text-sm font-medium">
                            {selectedOrder.payment_status || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={closeDetailModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
