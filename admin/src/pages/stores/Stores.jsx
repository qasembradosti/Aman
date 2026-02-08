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
  MapPin,
  Phone,
  Mail,
  Upload,
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
  DialogClose,
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
