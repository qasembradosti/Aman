import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../store/slices/usersSlice";
import {
  Pencil,
  Trash2,
  Loader2,
  Users as UsersIcon,
  Search,
  Filter,
  X,
  Eye,
  ShoppingBag,
  Package,
  Plus,
} from "lucide-react";
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
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { isSuperAdmin } from "../../lib/access";

const statusColors = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-50 text-gray-700",
  suspended: "bg-red-50 text-red-700",
};

const roleColors = {
  superadmin: "bg-purple-50 text-purple-700 border-purple-200",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  seller: "bg-amber-50 text-amber-700 border-amber-200",
};

const getInitialEditFormData = () => ({
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  status: "active",
  role: "seller",
  store_id: "",
});

const getInitialCreateFormData = () => ({
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  status: "active",
  role: "admin",
  store_id: "",
});

const Users = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.users);
  const authUser = useSelector((state) => state.auth.user);
  const canCreateUsers = isSuperAdmin(authUser);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [stores, setStores] = useState([]);
  const [orderFilters, setOrderFilters] = useState({
    startDate: "",
    endDate: "",
    status: "all",
    sortBy: "date-desc",
  });
  const [createFormData, setCreateFormData] = useState(getInitialCreateFormData());
  const [formData, setFormData] = useState(getInitialEditFormData());

  useEffect(() => {
    dispatch(fetchUsers());
    const loadStores = async () => {
      try {
        const response = await api.get("/stores");
        setStores(response.data?.data || []);
      } catch (error) {
        console.error("Failed to load stores:", error);
        setStores([]);
      }
    };

    loadStores();
  }, [dispatch]);

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      username: user.username || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      status: user.status || "active",
      role: user.role || "seller",
      store_id: user.store_id ? String(user.store_id) : "",
    });
    setShowEditModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateFormData(getInitialCreateFormData());
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setFormData(getInitialEditFormData());
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    try {
      await dispatch(
        createUser({
          ...createFormData,
          phone: createFormData.phone.trim() || null,
          store_id:
            createFormData.role === "admin"
              ? createFormData.store_id || null
              : null,
        })
      ).unwrap();
      toast.success("User created successfully");
      closeCreateModal();
    } catch (error) {
      toast.error(error || "Failed to create user");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUser) {
      try {
        await dispatch(
          updateUser({
            id: selectedUser.id,
            data: {
              ...formData,
              password: formData.password.trim() || undefined,
              store_id: formData.role === "admin" ? formData.store_id || null : null,
            },
          })
        ).unwrap();
        toast.success("User updated successfully");
        closeEditModal();
      } catch (error) {
        toast.error(error || "Failed to update user");
      }
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id) {
      try {
        await dispatch(deleteUser(deleteConfirm.id)).unwrap();
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error(error || "Failed to delete user");
      }
    }
    setDeleteConfirm({ open: false, id: null });
  };

  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setLoadingOrders(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      // First, get the list of orders for this user
      const response = await fetch(`${API_URL}/orders?user_id=${user.id}&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const ordersList = data.orders || [];
        
        // Fetch full details for each order to get items
        const ordersWithDetails = await Promise.all(
          ordersList.map(async (order) => {
            try {
              const detailResponse = await fetch(`${API_URL}/orders/${order.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                return detailData;
              }
              return order;
            } catch (err) {
              console.error(`Failed to fetch details for order ${order.id}:`, err);
              return order;
            }
          })
        );
        
        setUserOrders(ordersWithDetails);
      } else {
        setUserOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedUser(null);
    setUserOrders([]);
    setOrderFilters({
      startDate: "",
      endDate: "",
      status: "all",
      sortBy: "date-desc",
    });
  };

  const getFilteredAndSortedOrders = () => {
    let filtered = [...userOrders];

    // Filter by date range
    if (orderFilters.startDate) {
      filtered = filtered.filter(
        (order) =>
          new Date(order.created_at) >= new Date(orderFilters.startDate)
      );
    }
    if (orderFilters.endDate) {
      const endDate = new Date(orderFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (order) => new Date(order.created_at) <= endDate
      );
    }

    // Filter by status
    if (orderFilters.status !== "all") {
      filtered = filtered.filter(
        (order) => order.status === orderFilters.status
      );
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (orderFilters.sortBy) {
        case "date-desc":
          return new Date(b.created_at) - new Date(a.created_at);
        case "date-asc":
          return new Date(a.created_at) - new Date(b.created_at);
        case "amount-desc":
          return parseFloat(b.total_price || 0) - parseFloat(a.total_price || 0);
        case "amount-asc":
          return parseFloat(a.total_price || 0) - parseFloat(b.total_price || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const clearOrderFilters = () => {
    setOrderFilters({
      startDate: "",
      endDate: "",
      status: "all",
      sortBy: "date-desc",
    });
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await dispatch(updateUser({ id: userId, data: { status: newStatus } })).unwrap();
    } catch (error) {
      toast.error(error || "Failed to update status");
    }
  };

  const filteredUsers = items.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `${Number(amount || 0).toLocaleString()} IQD`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Users</h2>
        {canCreateUsers && (
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by username or phone..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {user.username || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          roleColors[user.role] || roleColors.seller
                        }`}
                      >
                        {user.role || "seller"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.store_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Select
                        value={user.status || "active"}
                        onValueChange={(value) =>
                          handleStatusChange(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              statusColors[user.status] || statusColors.active
                            }`}
                          >
                            {user.status || "active"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleViewDetails(user)}
                          className="text-gray-500 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(user)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClick(user.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal();
            return;
          }

          setShowCreateModal(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogClose onClick={closeCreateModal} />
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create_first_name">First Name</Label>
                  <Input
                    id="create_first_name"
                    value={createFormData.first_name}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        first_name: e.target.value,
                      })
                    }
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create_last_name">Last Name</Label>
                  <Input
                    id="create_last_name"
                    value={createFormData.last_name}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        last_name: e.target.value,
                      })
                    }
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create_username">Username</Label>
                  <Input
                    id="create_username"
                    value={createFormData.username}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        username: e.target.value,
                      })
                    }
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create_email">Email</Label>
                  <Input
                    id="create_email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        email: e.target.value,
                      })
                    }
                    placeholder="Enter email"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create_password">Password</Label>
                  <Input
                    id="create_password"
                    type="password"
                    value={createFormData.password}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        password: e.target.value,
                      })
                    }
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create_phone">Phone</Label>
                  <Input
                    id="create_phone"
                    value={createFormData.phone}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="07XXXXXXXX"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create_status">Status</Label>
                  <Select
                    value={createFormData.status}
                    onValueChange={(value) =>
                      setCreateFormData({ ...createFormData, status: value })
                    }
                  >
                    <SelectTrigger id="create_status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create_role">Role</Label>
                  <Select
                    value={createFormData.role}
                    onValueChange={(value) =>
                      setCreateFormData({
                        ...createFormData,
                        role: value,
                        store_id: value === "admin" ? createFormData.store_id : "",
                      })
                    }
                  >
                    <SelectTrigger id="create_role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${roleColors.admin}`}>
                            Admin
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="seller">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${roleColors.seller}`}>
                            Seller
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {createFormData.role === "admin" && (
                <div className="space-y-2">
                  <Label htmlFor="create_store_id">Assigned Store</Label>
                  <Select
                    value={createFormData.store_id || ""}
                    onValueChange={(value) =>
                      setCreateFormData({ ...createFormData, store_id: value })
                    }
                  >
                    <SelectTrigger id="create_store_id">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {stores.length === 0 && (
                    <p className="text-sm text-red-600">
                      Create a store first before creating an admin user.
                    </p>
                  )}
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            closeEditModal();
            return;
          }

          setShowEditModal(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogClose onClick={closeEditModal} />
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_username">Username</Label>
                  <Input
                    id="edit_username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input
                    id="edit_phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_password">New Password</Label>
                  <Input
                    id="edit_password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </div>
              <div className="flex w-full items-center gap-2 justify-around" >
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value,
                      store_id: value === "admin" ? formData.store_id : "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${roleColors.superadmin}`}>
                          Superadmin
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${roleColors.admin}`}>
                          Admin
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="seller">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${roleColors.seller}`}>
                          Seller
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>
              {formData.role === "admin" && (
                <div className="space-y-2">
                  <Label htmlFor="store_id">Assigned Store</Label>
                  <Select
                    value={formData.store_id || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, store_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-5xl! w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold">User Profile & Orders</DialogTitle>
            <DialogClose onClick={closeDetailsModal} />
          </DialogHeader>
          <DialogBody className="overflow-y-auto flex-1">
            {/* User Information Card */}
            <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {selectedUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser?.username || 'N/A'}</h3>
                    <p className="text-gray-600 text-sm">User ID: #{selectedUser?.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${roleColors[selectedUser?.role] || roleColors.seller}`}>
                    {selectedUser?.role || 'seller'}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusColors[selectedUser?.status] || statusColors.active}`}>
                    {selectedUser?.status || 'active'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Phone Number</p>
                  <p className="font-semibold text-gray-900">{selectedUser?.phone || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Member Since</p>
                  <p className="font-semibold text-gray-900">{formatDate(selectedUser?.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  Order History
                  <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                    {getFilteredAndSortedOrders().length}
                    {userOrders.length !== getFilteredAndSortedOrders().length && 
                      <span className="text-gray-400"> / {userOrders.length}</span>
                    }
                  </span>
                </h3>
              </div>

              {/* Filters & Sort */}
              {userOrders.length > 0 && !loadingOrders && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-700">Filter & Sort Orders</span>
                    </div>
                    {(orderFilters.startDate || orderFilters.endDate || orderFilters.status !== "all" || orderFilters.sortBy !== "date-desc") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearOrderFilters}
                        className="h-8 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-xs font-medium">
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={orderFilters.startDate}
                        onChange={(e) =>
                          setOrderFilters({ ...orderFilters, startDate: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-xs font-medium">
                        End Date
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={orderFilters.endDate}
                        onChange={(e) =>
                          setOrderFilters({ ...orderFilters, endDate: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Status</Label>
                      <Select
                        value={orderFilters.status}
                        onValueChange={(value) =>
                          setOrderFilters({ ...orderFilters, status: value })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Status" />
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

                    {/* Sort By */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Sort By</Label>
                      <Select
                        value={orderFilters.sortBy}
                        onValueChange={(value) =>
                          setOrderFilters({ ...orderFilters, sortBy: value })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date-desc">📅 Newest First</SelectItem>
                          <SelectItem value="date-asc">📅 Oldest First</SelectItem>
                          <SelectItem value="amount-desc">💰 Highest Amount</SelectItem>
                          <SelectItem value="amount-asc">💰 Lowest Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : userOrders.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 font-medium text-lg">No orders found</p>
                  <p className="text-gray-500 text-sm mt-1">This user hasn't placed any orders yet</p>
                </div>
              ) : getFilteredAndSortedOrders().length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Filter className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No orders found</h3>
                  <p className="text-sm text-gray-500 mb-4">Try adjusting your filters</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearOrderFilters}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredAndSortedOrders().map((order) => {
                    const totalCommission = order.items?.reduce((sum, item) => sum + (parseFloat(item.commission_price) || 0) * (item.quantity || 1), 0) || 0;
                    
                    return (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-gray-900">Order #{order.id}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-700 border border-green-300' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                              order.status === 'processing' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-300' :
                              order.status === 'shipped' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                              {order.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span>{formatDate(order.created_at)}</span>
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>{order.items?.length || 0} item(s)</span>
                          </p>
                        </div>
                        <div className="text-right">
                          {totalCommission > 0 && (
                            <p className="text-xs text-green-600 font-semibold mt-1">
                              Commission: {formatCurrency(totalCommission)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="mb-4 border-t border-gray-100 pt-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Order Items
                          </h4>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                                {item.image && (
                                  <img 
                                    src={item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${item.image}`}
                                    alt={item.product_name || 'Product'}
                                    className="w-14 h-14 object-cover rounded-md border border-gray-200"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm truncate">
                                    {item.product_name || 'Product'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Qty: {item.quantity || 1} × {formatCurrency(item.price)}
                                  </p>
                                  {item.commission_price && parseFloat(item.commission_price) > 0 && (
                                    <p className="text-xs text-green-600 font-medium">
                                      Commission: {formatCurrency(item.commission_price)} per item
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900">
                                    {formatCurrency(parseFloat(item.price || 0) * (item.quantity || 1))}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Order Summary */}
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                          <p className="font-semibold text-gray-900 capitalize">{order.payment_method || 'Cash'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Delivery Fee</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(order.delivery_fee || 0)}</p>
                        </div>
                      </div>
                      
                      {order.address && (
                        <div className="mt-3 bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-700 font-medium mb-1">📍 Delivery Address</p>
                          <p className="text-sm text-gray-800">{order.address}</p>
                          {order.phone && (
                            <p className="text-sm text-gray-700 mt-1">📞 {order.phone}</p>
                          )}
                        </div>
                      )}
                      
                      {order.notes && (
                        <div className="mt-3 bg-amber-50 rounded-lg p-3">
                          <p className="text-xs text-amber-700 font-medium mb-1">📝 Order Notes</p>
                          <p className="text-sm text-gray-800">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="border-t pt-4 mt-4">
            <Button onClick={closeDetailsModal} className="px-6">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
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

export default Users;
