import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast"; // Import toast
import {
  fetchStores,
  createStore,
  updateStore,
  deleteStore,
} from "../../store/slices/storesSlice";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Store as StoreIcon,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Upload,
  Filter,
  X,
} from "lucide-react";
import api from "../../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Switch } from "../../components/ui/switch";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

const Stores = () => {
  const dispatch = useDispatch();
  const { items: storeItems, loading, error } = useSelector((state) => state.stores);
  const items = Array.isArray(storeItems) ? storeItems : [];

  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    name_ar: "",
    name_ku: "",
    description: "",
    location: "",
    phone: "",
    email: "",
    image_url: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedStoreForOrders, setSelectedStoreForOrders] = useState(null);
  const [storeOrders, setStoreOrders] = useState([]);
  const [ordersSummary, setOrdersSummary] = useState({
    total_orders: 0,
    total_amount: 0,
  });
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderDateFilter, setOrderDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log('Stores page: dispatching fetchStores');
    dispatch(fetchStores());
  }, [dispatch]);

  useEffect(() => {
    console.log('Stores state updated:', { items, loading, error, itemsLength: items?.length });
  }, [items, loading, error]);

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      name_ar: "",
      name_ku: "",
      description: "",
      location: "",
      phone: "",
      email: "",
      image_url: "",
      is_active: true,
    });
    setEditingStore(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (store) => {
    setEditingStore(store);
    setFormData({
      name: store.name || "",
      name_en: store.name_en || "",
      name_ar: store.name_ar || "",
      name_ku: store.name_ku || "",
      description: store.description || "",
      location: store.location || "",
      phone: store.phone || "",
      email: store.email || "",
      image_url: store.image_url || "",
      is_active: store.is_active ?? true,
    });
    setImagePreview(store.image_url || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = formData.image_url;

    // Upload new image if selected
    if (imageFile) {
      console.log('Uploading image file:', imageFile);
      setUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", imageFile);
        
        console.log('FormData created, file appended');
        console.log('File details:', {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        });

        const response = await api.post("/upload/image", uploadFormData);
        
        console.log('Upload response:', response.data);

        // Check response structure and extract URL
        if (response.data?.file?.url) {
          imageUrl = response.data.file.url;
          console.log('Image URL set to:', imageUrl);
        } else {
          console.error("Unexpected upload response:", response.data);
          throw new Error("Invalid upload response");
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        console.error("Error response:", error.response?.data);
        const errorMsg = error.response?.data?.message || error.message || "Image upload failed";
        toast.error(`Image upload failed: ${errorMsg}`);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    console.log('Submitting store data:', {
      ...formData,
      image_url: imageUrl || null,
    });

    const data = {
      ...formData,
      image_url: imageUrl || null,
    };

    try {
      if (editingStore) {
        await dispatch(updateStore({ id: editingStore.id, data })).unwrap();
      } else {
        await dispatch(createStore(data)).unwrap();
      }
      closeModal();
    } catch (error) {
      console.error("Store operation failed:", error);
      toast.error(typeof error === 'string' ? error : 'Failed to save store. Please check the form and try again.');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id) {
      dispatch(deleteStore(deleteConfirm.id));
    }
    setDeleteConfirm({ open: false, id: null });
  };

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

  const isWithinDateRange = (dateValue, filters) => {
    if (!dateValue) return false;
    const orderDate = new Date(dateValue);
    if (Number.isNaN(orderDate.getTime())) return false;

    if (filters.startDate) {
      const start = new Date(`${filters.startDate}T00:00:00`);
      if (orderDate < start) return false;
    }

    if (filters.endDate) {
      const end = new Date(`${filters.endDate}T23:59:59.999`);
      if (orderDate > end) return false;
    }

    return true;
  };

  const fetchStoreOrdersFallback = async (storeId, filters = orderDateFilter) => {
    const ordersResponse = await api.get("/orders", {
      params: { page: 1, limit: 200 },
    });

    const baseOrders = Array.isArray(ordersResponse.data?.orders)
      ? ordersResponse.data.orders
      : Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : [];

    if (baseOrders.length === 0) {
      setStoreOrders([]);
      setOrdersSummary({ total_orders: 0, total_amount: 0 });
      return;
    }

    const detailOrders = (
      await Promise.all(
        baseOrders.map(async (order) => {
          try {
            const detailResponse = await api.get(`/orders/${order.id}`);
            return detailResponse.data?.order || detailResponse.data;
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean);

    const productIds = [
      ...new Set(
        detailOrders.flatMap((order) =>
          (order.items || [])
            .map((item) => item.product_id)
            .filter(Boolean),
        ),
      ),
    ];

    const productStoreMap = new Map();
    await Promise.all(
      productIds.map(async (productId) => {
        try {
          const productResponse = await api.get(`/products/${productId}`);
          const product = productResponse.data?.data || productResponse.data;
          productStoreMap.set(Number(productId), Number(product?.store_id || 0));
        } catch {
          productStoreMap.set(Number(productId), 0);
        }
      }),
    );

    const parsedStoreId = Number(storeId);
    const mappedOrders = detailOrders
      .filter((order) => isWithinDateRange(order.created_at, filters))
      .map((order) => {
        const storeItems = (order.items || []).filter(
          (item) =>
            productStoreMap.get(Number(item.product_id)) === parsedStoreId,
        );

        if (storeItems.length === 0) return null;

        const storeItemsCount = storeItems.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        );
        const storeTotalAmount = storeItems.reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0) * Number(item.price || 0),
          0,
        );

        return {
          id: order.id,
          created_at: order.created_at,
          status: order.status,
          user_first_name: order.user_first_name,
          user_last_name: order.user_last_name,
          user_phone: order.user_phone,
          user_email: order.user_email,
          store_items_count: storeItemsCount,
          store_total_amount: storeTotalAmount,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const summary = mappedOrders.reduce(
      (acc, order) => {
        acc.total_orders += 1;
        acc.total_amount += Number(order.store_total_amount || 0);
        return acc;
      },
      { total_orders: 0, total_amount: 0 },
    );

    setStoreOrders(mappedOrders);
    setOrdersSummary(summary);
  };

  const fetchStoreOrders = async (storeId, filters = orderDateFilter) => {
    setLoadingOrders(true);
    try {
      await fetchStoreOrdersFallback(storeId, filters);
    } catch (err) {
      console.error("Fallback store-orders fetch failed:", err);
      toast.error(
        err.response?.data?.message || "Failed to load store orders",
      );
      setStoreOrders([]);
      setOrdersSummary({ total_orders: 0, total_amount: 0 });
    } finally {
      setLoadingOrders(false);
    }
  };

  const openStoreOrders = async (store) => {
    setSelectedStoreForOrders(store);
    setShowOrdersModal(true);
    const defaultFilters = { startDate: "", endDate: "" };
    setOrderDateFilter(defaultFilters);
    await fetchStoreOrders(store.id, defaultFilters);
  };

  const closeStoreOrders = () => {
    setShowOrdersModal(false);
    setSelectedStoreForOrders(null);
    setStoreOrders([]);
    setOrdersSummary({ total_orders: 0, total_amount: 0 });
    setOrderDateFilter({ startDate: "", endDate: "" });
  };

  const applyDateFilter = async () => {
    if (!selectedStoreForOrders) return;
    if (
      orderDateFilter.startDate &&
      orderDateFilter.endDate &&
      orderDateFilter.startDate > orderDateFilter.endDate
    ) {
      toast.error("From date cannot be after To date");
      return;
    }
    await fetchStoreOrders(selectedStoreForOrders.id, orderDateFilter);
  };

  const clearDateFilter = async () => {
    if (!selectedStoreForOrders) return;
    const clearedFilters = { startDate: "", endDate: "" };
    setOrderDateFilter(clearedFilters);
    await fetchStoreOrders(selectedStoreForOrders.id, clearedFilters);
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">
          Error loading stores: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <StoreIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stores</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your store locations
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </Button>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No stores found. Create your first store!
                </TableCell>
              </TableRow>
            ) : (
              items.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    {store.image_url ? (
                      <img
                        src={`${API_BASE}${store.image_url}`}
                        alt={store.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <StoreIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{store.name}</div>
                      {store.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {store.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {store.location || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {store.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {store.phone}
                        </div>
                      )}
                      {store.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {store.email}
                        </div>
                      )}
                      {!store.phone && !store.email && (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        store.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {store.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStoreOrders(store)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="View store orders"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(store)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(store.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Store Orders Modal */}
      <Dialog
        open={showOrdersModal}
        onOpenChange={(open) => {
          if (!open) {
            closeStoreOrders();
          } else {
            setShowOrdersModal(true);
          }
        }}
      >
        <DialogContent className="max-w-5xl!">
          <DialogHeader>
            <DialogTitle>
              Orders for {selectedStoreForOrders?.name || "Store"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">From Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={orderDateFilter.startDate}
                  onChange={(e) =>
                    setOrderDateFilter((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">To Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={orderDateFilter.endDate}
                  onChange={(e) =>
                    setOrderDateFilter((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {ordersSummary.total_orders}
                </span>{" "}
                orders
                <span className="mx-2 text-gray-300">|</span>
                Total:{" "}
                <span className="font-medium text-gray-900">
                  {formatCurrency(ordersSummary.total_amount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearDateFilter}
                  disabled={loadingOrders}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={applyDateFilter}
                  disabled={loadingOrders}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filter
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : storeOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  No orders found for this store
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Store Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-gray-900">
                              {order.user_first_name || order.user_last_name
                                ? `${order.user_first_name || ""} ${
                                    order.user_last_name || ""
                                  }`.trim()
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.user_phone || order.user_email || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {order.status || "pending"}
                          </span>
                        </TableCell>
                        <TableCell>{order.store_items_count || 0}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.store_total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeStoreOrders}>
                Close
              </Button>
            </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStore ? "Edit Store" : "Create New Store"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-5 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Store Image</Label>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={
                        imageFile
                          ? imagePreview
                          : `${API_BASE}${imagePreview}`
                      }
                      alt="Preview"
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload store image
                    </p>
                  </div>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter store name"
                  required
                />
              </div>

              {/* Multilingual Names */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_en">English Name</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="English"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">Arabic Name</Label>
                  <Input
                    id="name_ar"
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="عربي"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ku">Kurdish Name</Label>
                  <Input
                    id="name_ku"
                    value={formData.name_ku}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ku: e.target.value })
                    }
                    placeholder="کوردی"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Store description"
                  rows={3}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Store address"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+964 xxx xxx xxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="store@example.com"
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : editingStore ? (
                    "Update Store"
                  ) : (
                    "Create Store"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, id: deleteConfirm.id })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this store? This action cannot be
              undone. Products associated with this store will have their store
              reference removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteConfirm({ open: false, id: null })}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Stores;
