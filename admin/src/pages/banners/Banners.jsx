import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "",
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await api.get("/banners");
      setBanners(response.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch banners");
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("subtitle", formData.subtitle);
      submitData.append("link_url", formData.link_url);
      submitData.append("is_active", formData.is_active);
      submitData.append("display_order", formData.display_order);
      
      if (imageFile) {
        submitData.append("image", imageFile);
      } else if (editingBanner) {
        submitData.append("image_url", formData.image_url);
      }

      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner updated successfully");
      } else {
        await api.post("/banners", submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner created successfully");
      }
      setShowModal(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save banner");
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/banners/${deleteConfirm.id}`);
      toast.success("Banner deleted successfully");
      setDeleteConfirm({ open: false, id: null });
      fetchBanners();
    } catch (error) {
      toast.error("Failed to delete banner");
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.patch(`/banners/${id}/toggle`);
      toast.success("Banner status updated");
      fetchBanners();
    } catch (error) {
      toast.error("Failed to update banner status");
    }
  };

  const handleMoveUp = async (banner, index) => {
    if (index === 0) return;
    const prevBanner = banners[index - 1];

    try {
      await api.put("/banners/order/update", {
        orders: [
          { id: banner.id, display_order: prevBanner.display_order },
          { id: prevBanner.id, display_order: banner.display_order },
        ],
      });
      fetchBanners();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveDown = async (banner, index) => {
    if (index === banners.length - 1) return;
    const nextBanner = banners[index + 1];

    try {
      await api.put("/banners/order/update", {
        orders: [
          { id: banner.id, display_order: nextBanner.display_order },
          { id: nextBanner.id, display_order: banner.display_order },
        ],
      });
      fetchBanners();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      is_active: banner.is_active,
      display_order: banner.display_order,
    });
    setImagePreview(banner.image_url ? `${API_BASE}${banner.image_url}` : "");
    setShowModal(true);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      subtitle: "",
      image_url: "",
      link_url: "",
      is_active: true,
      display_order: 0,
    });
    setImageFile(null);
    setImagePreview("");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Banners
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage home page banner sliders
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="w-5 h-5" />
          Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
                !banner.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex">
                {/* Banner Image */}
                <div className="w-64 h-40 bg-gray-100 dark:bg-gray-700 shrink-0">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Banner Details */}
                <div className="flex-1 p-4 flex justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {banner.subtitle}
                      </p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>Order: {banner.display_order}</span>
                      <span>
                        Status: {banner.is_active ? "🟢 Active" : "🔴 Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-2">
                    {/* Move Up/Down */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(banner, index)}
                        disabled={index === 0}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                        title="Move Up"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(banner, index)}
                        disabled={index === banners.length - 1}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                        title="Move Down"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Toggle Active */}
                    <button
                      onClick={() => handleToggleActive(banner.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title={banner.is_active ? "Deactivate" : "Activate"}
                    >
                      {banner.is_active ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteClick(banner.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {banners.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No banners found. Create your first banner to get started.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Edit Banner" : "Create New Banner"}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Special Offers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Discover amazing deals"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banner Image *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-2 w-full h-40 object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) =>
                    setFormData({ ...formData, link_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/offers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label
                  htmlFor="is_active"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Active
                </label>
              </div>
            </form>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
            >
              {editingBanner ? "Update" : "Create"}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              banner from the system.
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
}
