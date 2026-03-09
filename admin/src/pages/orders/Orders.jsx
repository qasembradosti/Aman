import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  fetchOrders,
  fetchOrder,
  updateOrderStatus,
  withdrawCommission,
} from "../../store/slices/ordersSlice";
import {
  Eye,
  Loader2,
  Package,
  Search,
  Filter,
  X,
  Wallet,
  DollarSign,
  Printer,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
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
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") ;

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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [sortBy, setSortBy] = useState("date_desc");
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  useEffect(() => {
    // Add print styles when component mounts
    const styleId = 'print-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .print-header {
            padding: 1.5cm 2cm 1cm 2cm;
            border-bottom: 3px solid #000;
            margin-bottom: 0;
          }
          .print-body {
            padding: 1.5cm 2cm;
          }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print-section {
            page-break-inside: avoid;
            margin-bottom: 1.5rem;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const openDetail = async (order) => {
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const fullOrder = await dispatch(fetchOrder(order.id)).unwrap();
      console.log("Full order data:", fullOrder);
      console.log("Order items:", fullOrder.items);
      if (fullOrder.items && fullOrder.items.length > 0) {
        console.log("First item image:", fullOrder.items[0].image);
      }
      setSelectedOrder(fullOrder);
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
        updateOrderStatus({ id: orderId, status: newStatus }),
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
      const result = await dispatch(
        withdrawCommission(selectedOrder.id),
      ).unwrap();
      toast.success(
        `Commission $${result.commission.toFixed(2)} sent to user's wallet!`,
      );

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
      return sum + Number(item.commission_price || 0) * Number(item.quantity);
    }, 0);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateFrom(null);
    setDateTo(null);
    setSortBy("date_desc");
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const fromDate = dateFrom
      ? new Date(
          dateFrom.getFullYear(),
          dateFrom.getMonth(),
          dateFrom.getDate(),
          0,
          0,
          0,
          0,
        )
      : null;
    const toDate = dateTo
      ? new Date(
          dateTo.getFullYear(),
          dateTo.getMonth(),
          dateTo.getDate(),
          23,
          59,
          59,
          999,
        )
      : null;

    const filtered = (Array.isArray(items) ? items : []).filter((order) => {
      const fullName = `${order.user_first_name || ""} ${order.user_last_name || ""}`
        .trim()
        .toLowerCase();
      const searchableFields = [
        order.id,
        order.user_phone,
        order.user_email,
        fullName,
        order.status,
        order.payment_status,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matchesSearch =
        !normalizedSearch ||
        searchableFields.some((value) => value.includes(normalizedSearch));
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesPaymentStatus =
        paymentStatusFilter === "all" ||
        (order.payment_status || "").toLowerCase() === paymentStatusFilter;

      const createdAt = order.created_at ? new Date(order.created_at) : null;
      const matchesDateFrom = !fromDate || (createdAt && createdAt >= fromDate);
      const matchesDateTo = !toDate || (createdAt && createdAt <= toDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentStatus &&
        matchesDateFrom &&
        matchesDateTo
      );
    });

    filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      const aTotal = Number(a.total_amount || 0);
      const bTotal = Number(b.total_amount || 0);

      switch (sortBy) {
        case "date_asc":
          return aDate - bDate;
        case "total_desc":
          return bTotal - aTotal;
        case "total_asc":
          return aTotal - bTotal;
        case "id_desc":
          return Number(b.id || 0) - Number(a.id || 0);
        case "id_asc":
          return Number(a.id || 0) - Number(b.id || 0);
        case "date_desc":
        default:
          return bDate - aDate;
      }
    });

    return filtered;
  }, [
    items,
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

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
    return `${Number(amount || 0).toLocaleString()} IQD`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Orders</h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by order ID, user name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
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
        <Select
          value={paymentStatusFilter}
          onValueChange={setPaymentStatusFilter}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
            >
              {dateFrom ? format(dateFrom, "PPP") : "From Date"}
              <CalendarIcon className="ml-2 h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
            >
              {dateTo ? format(dateTo, "PPP") : "To Date"}
              <CalendarIcon className="ml-2 h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest First</SelectItem>
            <SelectItem value="date_asc">Oldest First</SelectItem>
            <SelectItem value="total_desc">Total High to Low</SelectItem>
            <SelectItem value="total_asc">Total Low to High</SelectItem>
            <SelectItem value="id_desc">Order ID Desc</SelectItem>
            <SelectItem value="id_asc">Order ID Asc</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(searchQuery ||
        statusFilter !== "all" ||
        paymentStatusFilter !== "all" ||
        dateFrom ||
        dateTo ||
        sortBy !== "date_desc") && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClearFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
      <div className="text-sm text-gray-500">
        Showing {filteredOrders.length} of {Array.isArray(items) ? items.length : 0} orders
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
                    User
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
                      <div className="text-xs text-gray-700 space-y-0.5">
                        <div className="font-medium text-gray-900">
                          {order.user_first_name || order.user_last_name
                            ? `${order.user_first_name || ""} ${
                                order.user_last_name || ""
                              }`.trim()
                            : "N/A"}
                        </div>
                        <div className="text-gray-500">
                          {order.user_email || "No email"}
                        </div>
                        <div className="text-gray-500">
                          {order.user_phone || "No phone"}
                        </div>
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
        <DialogContent className="max-w-2xl print:max-w-none print:w-full print:shadow-none print:border-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
            <DialogClose onClick={closeDetailModal} />
          </DialogHeader>

          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block print-header mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              {/* Logo placeholder - replace src with actual logo path */}
              <div className="w-20 h-20 bg-linear-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                A
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold text-gray-900 leading-none">AMAN STORE</h1>
                <p className="text-gray-600 text-sm mt-1">E-Commerce Platform</p>
              </div>
            </div>
            
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-900">
              <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Invoice To:</h3>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedOrder?.user_first_name && selectedOrder?.user_last_name
                    ? `${selectedOrder.user_first_name} ${selectedOrder.user_last_name}`
                    : "N/A"}
                </p>
                <p className="text-sm text-gray-600">{selectedOrder?.user_email || "N/A"}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">Invoice Details:</h3>
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">Order Number:</span> #{selectedOrder?.id}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">Date:</span> {new Date(selectedOrder?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">Status:</span> 
                  <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 uppercase">
                    {selectedOrder?.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <DialogBody className="space-y-6 max-h-[70vh] overflow-y-auto print:max-h-full print:overflow-visible print:space-y-0 print-content">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              selectedOrder && (
                <div className="print:print-body">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 print-section">
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
                  <div className="border-t pt-4 print-section">
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
                                addr?.phone || selectedOrder.phone || "N/A"
                              );
                            } catch {
                              return selectedOrder.phone || "N/A";
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

                      {/* Location Map */}
                      <div className="col-span-2 mt-3 print:hidden">
                        {(() => {
                          try {
                            const addr =
                              typeof selectedOrder.shipping_address === "string"
                                ? JSON.parse(selectedOrder.shipping_address)
                                : selectedOrder.shipping_address;

                            if (addr?.location_points) {
                              const coords = addr.location_points.split(",");
                              const lat = parseFloat(coords[0]?.trim());
                              const lng = parseFloat(coords[1]?.trim());

                              if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                                return (
                                  <>
                                    <Label className="text-gray-500 mb-2 block">
                                      Delivery Location
                                    </Label>
                                    <div className="bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
                                      <div className="relative bg-gray-100 h-60">
                                        <iframe
                                          title="Delivery Location Map"
                                          width="100%"
                                          height="100%"
                                          frameBorder="0"
                                          className="select-none"
                                          style={{ border: 0 }}
                                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
                                          allowFullScreen
                                        />
                                      </div>
                                    </div>
                                  </>
                                );
                              }
                            }
                          } catch (error) {
                            console.error("Error parsing location:", error);
                          }
                          return null;
                        })()}
                      </div>


                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border-t pt-4 print-section">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Order Items
                    </h4>
                    
                    {/* Mobile/Screen View */}
                    <div className="space-y-3 print:hidden">
                      {selectedOrder.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-25 h-25 bg-gray-200 rounded flex items-center justify-center overflow-hidden shrink-0">
                              {item.image ? (
                                <img
                                  src={
                                    item.image.startsWith("http")
                                      ? item.image
                                      : `${API_BASE}${item.image}`
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 wrap-break-word leading-tight mb-1">
                                {item.product_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} ×{" "}
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-900 shrink-0 whitespace-nowrap">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                        </div>
                      )) || (
                        <p className="text-sm text-gray-500">
                          No items available
                        </p>
                      )}
                    </div>

                    {/* Print Table View */}
                    <div className="hidden print:block">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b-2 border-gray-900">
                            <th className="text-left py-2 font-semibold text-gray-900">Product</th>
                            <th className="text-center py-2 font-semibold text-gray-900">Quantity</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Unit Price</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items?.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="py-3 text-sm">{item.product_name}</td>
                              <td className="py-3 text-sm text-center">{item.quantity}</td>
                              <td className="py-3 text-sm text-right">{formatCurrency(item.price)}</td>
                              <td className="py-3 text-sm text-right font-medium">{formatCurrency(item.quantity * item.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4 print-section print:mb-20">
                    <div className="space-y-2 max-w-md ml-auto">
                      <div className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            selectedOrder.subtotal ||
                              selectedOrder.total_amount,
                          )}
                        </span>
                      </div>
                      {selectedOrder.shipping_cost > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(selectedOrder.shipping_cost)}
                          </span>
                        </div>
                      )}
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-green-600">
                            -{formatCurrency(selectedOrder.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t-2 border-gray-900 pt-3 mt-2">
                        <span className="text-gray-900">Total Amount:</span>
                        <span className="text-gray-900">
                          {formatCurrency(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Commission Section */}
                  {calculateTotalCommission(selectedOrder) > 0 && (
                    <div className="border-t pt-4 print-section print:hidden">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-gray-900">
                              User Commission
                            </h4>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(
                              calculateTotalCommission(selectedOrder),
                            )}
                          </span>
                        </div>

                        {selectedOrder.status === "delivered" &&
                          !selectedOrder.commission_withdrawn && (
                            <Button
                              onClick={handleWithdrawCommission}
                              className="w-full bg-green-600 hover:bg-green-700 text-white print:hidden"
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

                        {selectedOrder.status !== "delivered" && (
                          <div className="text-center text-sm text-gray-600">
                            Commission will be available after order is
                            delivered
                          </div>
                        )}
                      </div>

                      {/* Commission Breakdown */}
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Commission Breakdown:
                        </p>
                        {selectedOrder.items?.map(
                          (item, index) =>
                            item.commission_price > 0 && (
                              <div
                                key={index}
                                className="flex justify-between text-xs text-gray-600 pl-4"
                              >
                                <span>
                                  {item.product_name || item.title} (x
                                  {item.quantity})
                                </span>
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(
                                    item.commission_price * item.quantity,
                                  )}
                                </span>
                              </div>
                            ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Info */}
                  {selectedOrder.payment_method && (
                    <div className="border-t pt-4 print-section print:hidden">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Payment Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-500">
                            Payment Method
                          </Label>
                          <p className="text-sm font-medium">Pay on Delivary</p>
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
                </div>
              )
            )}
          </DialogBody>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
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
