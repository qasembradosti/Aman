import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../store/slices/categoriesSlice";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
  LayoutGrid,
  List,
  Image as ImageIcon,
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

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

const Categories = () => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.categories);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    name_ar: "",
    name_ku: "",
    description: "",
    parent_id: "",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log('Categories page: dispatching fetchCategories');
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    console.log('Categories state updated:', { items, loading, error, itemsLength: items?.length });
  }, [items, loading, error]);

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      name_ar: "",
      name_ku: "",
      description: "",
      parent_id: "",
      image_url: "",
    });
    setEditingCategory(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || "",
      name_en: category.name_en || "",
      name_ar: category.name_ar || "",
      name_ku: category.name_ku || "",
      description: category.description || "",
      parent_id: category.parent_id || "",
      image_url: category.image_url || "",
    });
    setImagePreview(category.image_url || null);
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
      setUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", imageFile);

        const response = await api.post("/upload/image", uploadFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        imageUrl = response.data.file.url;
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Image upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const data = {
      ...formData,
      parent_id: formData.parent_id || null,
      image_url: imageUrl || null,
    };

    if (editingCategory) {
      await dispatch(updateCategory({ id: editingCategory.id, data }));
    } else {
      await dispatch(createCategory(data));
    }
    closeModal();
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id) {
      dispatch(deleteCategory(deleteConfirm.id));
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

  // Get parent category name
  const getParentName = (parentId) => {
    const parent = items.find((c) => c.id === parentId);
    return parent?.name || "-";
  };

  // Get subcategories count
  const getSubcategoriesCount = (categoryId) => {
    return items.filter((c) => c.parent_id === categoryId).length;
  };

  // Organize categories into hierarchy
  const parentCategories = items.filter((c) => !c.parent_id);
  const getSubcategories = (parentId) =>
    items.filter((c) => c.parent_id === parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Categories</h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">Error loading categories</div>
          <div className="text-gray-500 text-sm">{error}</div>
          <Button 
            onClick={() => dispatch(fetchCategories())} 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No categories found
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View - Hierarchical */
        <div className="space-y-6">
          {parentCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              {/* Parent Category Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {category.image_url ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden">
                        <img
                          src={category.image_url.startsWith('http') ? category.image_url : `${API_BASE}${category.image_url}`}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                        <FolderTree className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500">{category.slug}</p>
                    </div>
                    {getSubcategoriesCount(category.id) > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        {getSubcategoriesCount(category.id)} subcategories
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => openEdit(category)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(category.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {category.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Subcategories Grid */}
              {getSubcategories(category.id).length > 0 && (
                <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {getSubcategories(category.id).map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-white hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {sub.image_url ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                              <img
                                src={sub.image_url.startsWith('http') ? sub.image_url : `${API_BASE}${sub.image_url}`}
                                alt={sub.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                              <FolderTree className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {sub.name}
                            </h4>
                            <p className="text-xs text-gray-500">{sub.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => openEdit(sub)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(sub.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Orphan subcategories (parent was deleted) */}
          {items.filter(
            (c) => c.parent_id && !items.find((p) => p.id === c.parent_id)
          ).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">
                Unassigned Subcategories
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items
                  .filter(
                    (c) =>
                      c.parent_id && !items.find((p) => p.id === c.parent_id)
                  )
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {sub.name}
                          </h4>
                          <p className="text-xs text-yellow-600">
                            Parent missing
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => openEdit(sub)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(sub.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Table View - Hierarchical */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Subcategories</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentCategories.map((category) => (
                <>
                  {/* Parent Row */}
                  <TableRow key={category.id} className="bg-gray-50/50">
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {category.image_url ? (
                          <img
                            src={category.image_url.startsWith('http') ? category.image_url : `${API_BASE}${category.image_url}`}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-gray-500" />
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {category.slug}
                    </TableCell>
                    <TableCell>
                      {getSubcategoriesCount(category.id) > 0 ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {getSubcategoriesCount(category.id)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-gray-500">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => openEdit(category)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(category.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Subcategory Rows */}
                  {getSubcategories(category.id).map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex items-center justify-center ml-4">
                          {sub.image_url ? (
                            <img
                              src={sub.image_url.startsWith('http') ? sub.image_url : `${API_BASE}${sub.image_url}`}
                              alt={sub.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-gray-300">└</span>
                          <FolderTree className="w-3.5 h-3.5 text-gray-400" />
                          {sub.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {sub.slug}
                      </TableCell>
                      <TableCell className="text-gray-400">-</TableCell>
                      <TableCell className="max-w-xs truncate text-gray-500">
                        {sub.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => openEdit(sub)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(sub.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogClose onClick={closeModal} />
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <DialogBody className="space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Name (Default)</Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Category name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Name (English)</Label>
                  <Input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="English name"
                  />
                </div>
                <div>
                  <Label>Name (Arabic)</Label>
                  <Input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="الاسم بالعربية"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label>Name (Kurdish)</Label>
                  <Input
                    type="text"
                    value={formData.name_ku}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ku: e.target.value })
                    }
                    placeholder="ناوی کوردی"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <Label>Parent Category</Label>
                <Select
                  value={
                    formData.parent_id ? String(formData.parent_id) : "none"
                  }
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parent_id: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {items
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <Label>Category Image</Label>
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative w-full h-40 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        Click to upload image
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : editingCategory ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone.
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

export default Categories;
