import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../store/slices/productsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  Video,
  Film,
  Eye,
} from "lucide-react";
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
import { Checkbox } from "../../components/ui/checkbox";
import api from "../../services/api";
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

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

const isMainImageRecord = (img) =>
  img?.is_main === true || img?.is_main === 1 || img?.is_main === "1";

const getMainProductImage = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  return images.find(isMainImageRecord) || images[0] || null;
};

const getProductImageSrc = (image) => {
  if (!image) return null;
  const value = image.url || image.image_url || image.image || image.filename;
  if (!value) return null;
  const raw = String(value);
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, "");
  if (normalized.includes("/")) return `${API_BASE}/${normalized}`;
  return `${API_BASE}/images/products/${normalized}`;
};

// Memoized ProductCard to prevent unnecessary re-renders
const ProductCard = memo(({ product, onView, onEdit, onDelete }) => {
  const mainImageSrc = getProductImageSrc(getMainProductImage(product));
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300">
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 relative">
        {mainImageSrc ? (
          <img
            src={mainImageSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
        {/* Stock Badge */}
        <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          {product.commission_price} IQD
        </span>
        {/* Discount Badge */}
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded-full bg-red-500 text-white">
            {product.discount_type === "fixed"
              ? `${product.discount}IQD OFF`
              : `${product.discount}% OFF`}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {product.name}
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">
            IQD {Number(product.base_price)}
          </span>
          {product.sell_price && (
            <span className="text-sm text-green-600">
              IQD {Number(product.sell_price)}
            </span>
          )}
        </div>
        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={() => onView(product)}
            className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(product.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

// Memoized ProductRow for table view
const ProductRow = memo(({ product, onView, onEdit, onDelete }) => {
  const mainImageSrc = getProductImageSrc(getMainProductImage(product));
  return (
    <TableRow>
      <TableCell>
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          {mainImageSrc ? (
            <img
              src={mainImageSrc}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell> {Number(product.base_price)} IQD</TableCell>
      <TableCell>
        {product.sell_price ? `${Number(product.sell_price)} IQD` : "-"}
      </TableCell>
      <TableCell>
        {product.discount > 0 ? (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            {product.discount_type === "fixed"
              ? `$${product.discount}`
              : `${product.discount}%`}
          </span>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            product.in_stock
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {product.in_stock > 0 ? "In Stock" : "Out of Stock"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => onView(product)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onEdit(product)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(product.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

ProductRow.displayName = "ProductRow";

const Products = () => {
  const dispatch = useDispatch();
  const {
    items: productItems,
    loading,
    meta,
  } = useSelector((state) => state.products);
  const { items: categoryItems } = useSelector((state) => state.categories);
  const items = Array.isArray(productItems) ? productItems : [];
  const categories = Array.isArray(categoryItems) ? categoryItems : [];
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]); // Track existing server images with IDs
  const [existingVideos, setExistingVideos] = useState([]); // Track existing server videos with IDs
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [brands, setBrands] = useState([]);
  const [stores, setStores] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState("en");

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [discountFilter, setDiscountFilter] = useState("");
  const [specialFilter, setSpecialFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("");
  const itemsPerPage = 20;
  const [formData, setFormData] = useState({
    name_en: "",
    name_ar: "",
    name_ku: "",
    description_en: "",
    description_ar: "",
    description_ku: "",
    base_price: "",
    sell_price: "",
    commission_price: "",
    category_id: "",
    brand_id: "",
    store_id: "",
    in_stock: true,
    key_features_en: "",
    key_features_ar: "",
    key_features_ku: "",
    discount: "",
    discount_type: "percentage",
    product_code: "",
    size: "",
    volume: "",
    colors: "",
    is_trend: false,
    is_important: false,
  });

  useEffect(() => {
    dispatch(fetchCategories());
    fetchBrands();
    fetchStores();
  }, [dispatch]);

  const fetchBrands = async () => {
    try {
      const response = await api.get("/admin/brands", {
        params: { is_active: true },
      });
      setBrands(response.data.data || []);
    } catch (error) {
      toast.error("Failed to load brands. Please try again.");
      setBrands([]);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api.get("/stores");
      setStores(response.data.data || []);
    } catch (error) {
      toast.error("Failed to load stores. Please try again.");
      setStores([]);
    }
  };

  // Debounced fetch with filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };
      if (searchQuery) params.q = searchQuery;
      if (categoryFilter) params.category_id = categoryFilter;
      if (stockFilter) params.in_stock = stockFilter === "in_stock";
      if (brandFilter) params.brand_id = brandFilter;
      if (discountFilter === "with_discount") params.has_discount = true;
      if (discountFilter === "no_discount") params.has_discount = false;
      if (specialFilter === "is_trend") params.is_trend = 1;
      if (specialFilter === "is_important") params.is_important = 1;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (sortBy) params.sort = sortBy;

      dispatch(fetchProducts(params));
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [
    dispatch,
    searchQuery,
    currentPage,
    categoryFilter,
    stockFilter,
    brandFilter,
    discountFilter,
    specialFilter,
    minPrice,
    maxPrice,
    sortBy,
    itemsPerPage,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    categoryFilter,
    stockFilter,
    brandFilter,
    discountFilter,
    specialFilter,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_ar: "",
      name_ku: "",
      description_en: "",
      description_ar: "",
      description_ku: "",
      base_price: "",
      sell_price: "",
      commission_price: "",
      category_id: "",
      brand_id: "",
      store_id: "",
      in_stock: true,
      key_features_en: "",
      key_features_ar: "",
      key_features_ku: "",
      discount: "",
      discount_type: "percentage",
      product_code: "",
      size: "",
      volume: "",
      colors: "",
      is_trend: false,
      is_important: false,
    });
    setEditingProduct(null);
    setImageFiles([]);
    setVideoFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setVideoPreviews([]);
    setExistingVideos([]);
    setActiveImageIndex(0);
    setMainImageIndex(0);
    setActiveVideoIndex(0);
    setActiveLanguage("en");
  };

  const openCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, []);

  const openEdit = useCallback((product) => {
    setEditingProduct(product);
    setFormData({
      name_en: product.name_en || product.name || "",
      name_ar: product.name_ar || "",
      name_ku: product.name_ku || "",
      description_en: product.description_en || "",
      description_ar: product.description_ar || "",
      description_ku: product.description_ku || "",
      base_price: product.base_price || "",
      sell_price: product.sell_price || "",
      commission_price: product.commission_price || "",
      category_id: product.category_id || "",
      brand_id: product.brand_id || "",
      store_id: product.store_id || "",
      in_stock: product.in_stock !== undefined ? product.in_stock : true,
      key_features_en: Array.isArray(product.key_features)
        ? product.key_features.join(", ")
        : product.key_features_en || product.key_features || "",
      key_features_ar: product.key_features_ar || "",
      key_features_ku: product.key_features_ku || "",
      discount: product.discount || "",
      discount_type: product.discount_type || "percentage",
      product_code: product.product_code || "",
      size: product.size || "",
      volume: product.volume || "",
      colors: Array.isArray(product.colors)
        ? product.colors.join(", ")
        : product.colors || "",
      is_trend: product.is_trend || false,
      is_important: product.is_important || false,
    });
    if (product.images && product.images.length > 0) {
      const initialMainIndex = Math.max(
        0,
        product.images.findIndex(isMainImageRecord),
      );
      // Store existing images with their IDs  
      setExistingImages(product.images);
      setImagePreviews(
        product.images.map(
          (img) => img.url || `${API_BASE}/images/products/${img.image_url}`,
        ),
      );
      setMainImageIndex(initialMainIndex);
      setActiveImageIndex(initialMainIndex);
    } else {
      setExistingImages([]);
      setMainImageIndex(0);
      setActiveImageIndex(0);
    }
    if (product.videos && product.videos.length > 0) {
      setExistingVideos(product.videos);
      setVideoPreviews(
        product.videos.map(
          (vid) => vid.video_url || vid.url || `${API_BASE}/videos/products/${vid.filename || vid.video_url}`,
        ),
      );
    } else if (product.video) {
      // Handle single video object
      const videoUrl = product.video.video_url || product.video.url || `${API_BASE}/videos/products/${product.video.filename || product.video.video_url}`;
      setExistingVideos([product.video]);
      setVideoPreviews([videoUrl]);
    } else {
      setExistingVideos([]);
    }
    setShowModal(true);
  }, []);

  const openView = useCallback((product) => {
    setViewProduct(product);
  }, []);

  const closeView = useCallback(() => {
    setViewProduct(null);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, []);

  const handleImageSelect = useCallback(
    async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      // If editing, upload images immediately
      if (editingProduct) {
        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));
        
        try {
          const response = await api.post(
            `/products/${editingProduct.id}/images`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          
          toast.success("Images uploaded successfully");
          
          // Add new images to existing images
          const newImages = response.data.images || [];
          const mergedImages = [...existingImages, ...newImages];
          setExistingImages(mergedImages);
          
          // Add previews
          const newPreviews = newImages.map((img) => img.url || img.image_url);
          setImagePreviews((prev) => [...prev, ...newPreviews]);

          const nextMainIndex = mergedImages.findIndex(isMainImageRecord);
          if (nextMainIndex >= 0) {
            setMainImageIndex(nextMainIndex);
          }
        } catch (error) {
          toast.error("Failed to upload images");
          console.error("Error uploading images:", error);
        }
      } else {
        // Creating new product, just add to local state
        const newFiles = [...imageFiles, ...files];
        setImageFiles(newFiles);
        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImagePreviews((prev) => [...prev, ...newPreviews]);
        if (imageFiles.length === 0) {
          setMainImageIndex(0);
        }
      }
    },
    [imageFiles, editingProduct, existingImages],
  );

  const setMainImage = useCallback(
    async (index) => {
      if (index < 0 || index >= imagePreviews.length) return;

      if (editingProduct) {
        const imageToSetMain = existingImages[index];
        if (!imageToSetMain?.id) {
          toast.error("Image is not ready yet");
          return;
        }

        try {
          await api.patch(
            `/products/${editingProduct.id}/images/${imageToSetMain.id}/set-main`,
          );
          setExistingImages((prev) =>
            prev.map((img, i) => ({
              ...img,
              is_main: i === index,
            })),
          );
          setMainImageIndex(index);
          toast.success("Main image updated");
        } catch (error) {
          toast.error("Failed to set main image");
          console.error("Error setting main image:", error);
        }
        return;
      }

      setMainImageIndex(index);
      toast.success("Main image selected");
    },
    [editingProduct, existingImages, imagePreviews.length],
  );

  const removeImage = useCallback(
    async (index) => {
      // Check if this is an existing server image
      if (editingProduct && existingImages[index]) {
        const imageToDelete = existingImages[index];
        let newExistingImages = existingImages.filter((_, i) => i !== index);
        try {
          await api.delete(`/products/${editingProduct.id}/images/${imageToDelete.id}`);
          toast.success("Image deleted successfully");

          // Keep one main image selected if any image remains
          if (
            newExistingImages.length > 0 &&
            !newExistingImages.some(isMainImageRecord)
          ) {
            try {
              await api.patch(
                `/products/${editingProduct.id}/images/${newExistingImages[0].id}/set-main`,
              );
              newExistingImages = newExistingImages.map((img, i) => ({
                ...img,
                is_main: i === 0,
              }));
            } catch (error) {
              console.error("Error setting fallback main image:", error);
            }
          }

          setExistingImages(newExistingImages);
          const nextMainIndex = newExistingImages.findIndex(isMainImageRecord);
          setMainImageIndex(nextMainIndex >= 0 ? nextMainIndex : 0);
        } catch (error) {
          toast.error("Failed to delete image");
          console.error("Error deleting image:", error);
          return; // Don't proceed if API call failed
        }
      } else {
        // It's a new file, just remove from local state
        const newFiles = imageFiles.filter((_, i) => i !== index);
        setImageFiles(newFiles);

        if (index === mainImageIndex) {
          setMainImageIndex(0);
        } else if (index < mainImageIndex) {
          setMainImageIndex((prev) => Math.max(0, prev - 1));
        }
      }
      
      // Remove preview
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      if (imagePreviews[index]?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviews[index]);
      }
      setImagePreviews(newPreviews);
      if (activeImageIndex >= newPreviews.length) {
        setActiveImageIndex(Math.max(0, newPreviews.length - 1));
      }
    },
    [
      imageFiles,
      imagePreviews,
      activeImageIndex,
      editingProduct,
      existingImages,
      mainImageIndex,
    ],
  );

  const handleVideoSelect = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      const newFiles = [...videoFiles, ...files];
      setVideoFiles(newFiles);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setVideoPreviews((prev) => [...prev, ...newPreviews]);
    },
    [videoFiles],
  );

  const removeVideo = useCallback(
    async (index) => {
      // Existing server video in edit mode
      if (editingProduct && index < existingVideos.length) {
        const videoToDelete = existingVideos[index];
        if (!videoToDelete?.id) {
          toast.error("Video ID not found");
          return;
        }

        try {
          await api.delete(
            `/products/${editingProduct.id}/videos/${videoToDelete.id}`,
          );
          toast.success("Video deleted successfully");
          setExistingVideos((prev) => prev.filter((_, i) => i !== index));
        } catch (error) {
          toast.error("Failed to delete video");
          console.error("Error deleting video:", error);
          return;
        }
      } else {
        // Local new video file
        const fileIndex = Math.max(0, index - existingVideos.length);
        const newFiles = videoFiles.filter((_, i) => i !== fileIndex);
        setVideoFiles(newFiles);
      }

      const newPreviews = videoPreviews.filter((_, i) => i !== index);
      if (videoPreviews[index]?.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreviews[index]);
      }
      setVideoPreviews(newPreviews);
      if (activeVideoIndex >= newPreviews.length) {
        setActiveVideoIndex(Math.max(0, newPreviews.length - 1));
      }
    },
    [videoFiles, videoPreviews, activeVideoIndex, editingProduct, existingVideos],
  );

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleCategoryFilterChange = useCallback((val) => {
    setCategoryFilter(val === "all" ? "" : val);
  }, []);

  const handleStockFilterChange = useCallback((val) => {
    setStockFilter(val === "all" ? "" : val);
  }, []);

  const handleBrandFilterChange = useCallback((val) => {
    setBrandFilter(val === "all" ? "" : val);
  }, []);

  const handleDiscountFilterChange = useCallback((val) => {
    setDiscountFilter(val === "all" ? "" : val);
  }, []);

  const handleSpecialFilterChange = useCallback((val) => {
    setSpecialFilter(val === "all" ? "" : val);
  }, []);

  const handleSortChange = useCallback((val) => {
    setSortBy(val === "default" ? "" : val);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("");
    setStockFilter("");
    setBrandFilter("");
    setDiscountFilter("");
    setSpecialFilter("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingProduct) {
      const keyFeaturesEn = formData.key_features_en
        ? formData.key_features_en
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : null;
      const keyFeaturesAr = formData.key_features_ar
        ? formData.key_features_ar
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : null;
      const keyFeaturesKu = formData.key_features_ku
        ? formData.key_features_ku
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : null;
      const colors = formData.colors
        ? formData.colors
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : null;
      const data = {
        name_en: formData.name_en,
        name_ar: formData.name_ar,
        name_ku: formData.name_ku,
        description_en: formData.description_en,
        description_ar: formData.description_ar,
        description_ku: formData.description_ku,
        base_price: parseFloat(formData.base_price) || 0,
        sell_price: formData.sell_price
          ? parseFloat(formData.sell_price)
          : null,
        commission_price: formData.commission_price
          ? parseFloat(formData.commission_price)
          : null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        store_id: formData.store_id || null,
        key_features_en:
          keyFeaturesEn && keyFeaturesEn.length ? keyFeaturesEn : null,
        key_features_ar:
          keyFeaturesAr && keyFeaturesAr.length ? keyFeaturesAr : null,
        key_features_ku:
          keyFeaturesKu && keyFeaturesKu.length ? keyFeaturesKu : null,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        discount_type: formData.discount_type || "percentage",
        in_stock: formData.in_stock,
        product_code: formData.product_code || null,
        size: formData.size || null,
        volume: formData.volume || null,
        colors: colors && colors.length ? colors : null,
        is_trend: formData.is_trend ? 1 : 0,
        is_important: formData.is_important ? 1 : 0,
      };
      await dispatch(updateProduct({ id: editingProduct.id, data }));
      // Upload videos if any
      if (videoFiles.length > 0) {
        const videoFormData = new FormData();
        videoFiles.forEach((file) => videoFormData.append("videos", file));
        try {
          await api.post(
            `/products/${editingProduct.id}/videos`,
            videoFormData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          toast.success("Videos uploaded successfully");
        } catch (error) {
          toast.error("Failed to upload videos");
        }
      }
    } else {
      const fd = new FormData();
      fd.append("name_en", formData.name_en);
      fd.append("name_ar", formData.name_ar);
      fd.append("name_ku", formData.name_ku);
      fd.append("description_en", formData.description_en);
      fd.append("description_ar", formData.description_ar);
      fd.append("description_ku", formData.description_ku);
      fd.append("base_price", parseFloat(formData.base_price) || 0);
      if (formData.sell_price)
        fd.append("sell_price", parseFloat(formData.sell_price));
      if (formData.commission_price)
        fd.append("commission_price", parseFloat(formData.commission_price));
      if (formData.category_id) fd.append("category_id", formData.category_id);
      if (formData.brand_id) fd.append("brand_id", formData.brand_id);
      if (formData.store_id) fd.append("store_id", formData.store_id);
      fd.append("in_stock", formData.in_stock);
      if (formData.key_features_en) {
        fd.append("key_features_en", formData.key_features_en);
      }
      if (formData.key_features_ar) {
        fd.append("key_features_ar", formData.key_features_ar);
      }
      if (formData.key_features_ku) {
        fd.append("key_features_ku", formData.key_features_ku);
      }
      fd.append(
        "discount",
        formData.discount ? parseFloat(formData.discount) : 0,
      );
      fd.append("discount_type", formData.discount_type || "percentage");
      if (formData.product_code)
        fd.append("product_code", formData.product_code);
      if (formData.size) fd.append("size", formData.size);
      if (formData.volume) fd.append("volume", formData.volume);
      if (formData.colors) fd.append("colors", formData.colors);
      fd.append("is_trend", formData.is_trend ? 1 : 0);
      fd.append("is_important", formData.is_important ? 1 : 0);
      const orderedImageFiles = [...imageFiles];
      if (
        mainImageIndex > 0 &&
        mainImageIndex < orderedImageFiles.length
      ) {
        const [mainFile] = orderedImageFiles.splice(mainImageIndex, 1);
        orderedImageFiles.unshift(mainFile);
      }
      orderedImageFiles.forEach((file) => fd.append("images", file));
      const result = await dispatch(createProduct(fd));
      // Upload videos if any and product was created
      if (videoFiles.length > 0 && result.payload?.id) {
        const videoFormData = new FormData();
        videoFiles.forEach((file) => videoFormData.append("videos", file));
        try {
          await api.post(
            `/products/${result.payload.id}/videos`,
            videoFormData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          toast.success("Videos uploaded successfully");
        } catch (error) {
          toast.error("Failed to upload videos");
        }
      }
    }
    closeModal();
  };

  const handleDeleteClick = useCallback((id) => {
    setDeleteConfirm({ open: true, id });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm.id) {
      dispatch(deleteProduct(deleteConfirm.id));
    }
    setDeleteConfirm({ open: false, id: null });
  }, [deleteConfirm.id, dispatch]);

  const nextImage = useCallback(
    () => setActiveImageIndex((prev) => (prev + 1) % imagePreviews.length),
    [imagePreviews.length],
  );
  const prevImage = useCallback(
    () =>
      setActiveImageIndex(
        (prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length,
      ),
    [imagePreviews.length],
  );

  const nextVideo = useCallback(
    () => setActiveVideoIndex((prev) => (prev + 1) % videoPreviews.length),
    [videoPreviews.length],
  );
  const prevVideo = useCallback(
    () =>
      setActiveVideoIndex(
        (prev) => (prev - 1 + videoPreviews.length) % videoPreviews.length,
      ),
    [videoPreviews.length],
  );

  // Calculate pagination
  const totalPages = meta ? Math.ceil(meta.total / itemsPerPage) : 1;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Products</h2>
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
              Add Product
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label>Search</Label>
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div>
              <Label>Category</Label>
              <Select
                value={categoryFilter || "all"}
                onValueChange={handleCategoryFilterChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div>
              <Label>Brand</Label>
              <Select
                value={brandFilter || "all"}
                onValueChange={handleBrandFilterChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Filter */}
            <div>
              <Label>Stock Status</Label>
              <Select
                value={stockFilter || "all"}
                onValueChange={handleStockFilterChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Filter */}
            <div>
              <Label>Discount</Label>
              <Select
                value={discountFilter || "all"}
                onValueChange={handleDiscountFilterChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Discount Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="with_discount">With Discount</SelectItem>
                  <SelectItem value="no_discount">No Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Special Filter (Trending/Important) */}
            <div>
              <Label>Special</Label>
              <Select
                value={specialFilter || "all"}
                onValueChange={handleSpecialFilterChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Special Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="is_trend">Trending Only</SelectItem>
                  <SelectItem value="is_important">Important Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Price */}
            <div>
              <Label>Min Price</Label>
              <Input
                type="number"
                placeholder="Min Price (IQD)"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full"
                min="0"
              />
            </div>

            {/* Max Price */}
            <div>
              <Label>Max Price</Label>
              <Input
                type="number"
                placeholder="Max Price (IQD)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full"
                min="0"
              />
            </div>

            {/* Sort By */}
            <div>
              <Label>Sort By</Label>
              <Select
                value={sortBy || "default"}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price_asc">Price (Low to High)</SelectItem>
                  <SelectItem value="price_desc">
                    Price (High to Low)
                  </SelectItem>
                  <SelectItem value="stock_asc">Stock (Low to High)</SelectItem>
                  <SelectItem value="stock_desc">
                    Stock (High to Low)
                  </SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery ||
            categoryFilter ||
            stockFilter ||
            brandFilter ||
            discountFilter ||
            specialFilter ||
            minPrice ||
            maxPrice ||
            sortBy) && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="text-gray-600 hover:text-gray-900"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={openView}
                onEdit={openEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onView={openView}
                    onEdit={openEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, meta?.total || 0)} of{" "}
              {meta?.total || 0} products
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrevPage}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm({ open: false, id: null })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[50vw]! max-w-7xl!">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "New Product"}
            </DialogTitle>
            <DialogClose onClick={closeModal} />
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <DialogBody className="space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Image Gallery */}
              <div>
                <Label className="mb-2">Images</Label>
                {imagePreviews.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={imagePreviews[activeImageIndex]}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                      {activeImageIndex === mainImageIndex && (
                        <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded bg-green-600 text-white">
                          Main Image
                        </span>
                      )}
                      {imagePreviews.length > 1 && (
                        <>
                          <Button
                            type="button"
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        onClick={() => removeImage(activeImageIndex)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setMainImage(activeImageIndex)}
                        disabled={activeImageIndex === mainImageIndex}
                        className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-white/90 text-gray-900 rounded shadow hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {activeImageIndex === mainImageIndex
                          ? "Main Selected"
                          : "Set As Main"}
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {imagePreviews.map((preview, index) => (
                        <Button
                          key={index}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${
                            index === activeImageIndex
                              ? "border-gray-900"
                              : "border-transparent"
                          }`}
                        >
                          <img
                            src={preview}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {index === mainImageIndex && (
                            <span className="absolute top-0 right-0 px-1 py-0.5 text-[10px] font-medium rounded-bl bg-green-600 text-white">
                              Main
                            </span>
                          )}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400"
                      >
                        <Plus className="w-5 h-5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 hover:border-gray-400"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Click to upload images
                    </span>
                  </Button>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Video Gallery */}
              <div>
                <Label className="mb-2">Videos</Label>
                {videoPreviews.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <video
                        src={videoPreviews[activeVideoIndex]}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Video preview load error:', e.target.error);
                        }}
                      />
                      {videoPreviews.length > 1 && (
                        <>
                          <Button
                            type="button"
                            onClick={prevVideo}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={nextVideo}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        onClick={() => removeVideo(activeVideoIndex)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {videoPreviews.map((preview, index) => (
                        <Button
                          key={index}
                          type="button"
                          onClick={() => setActiveVideoIndex(index)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex items-center justify-center ${
                            index === activeVideoIndex
                              ? "border-gray-900 bg-gray-100"
                              : "border-transparent bg-gray-50"
                          }`}
                        >
                          <Film className="w-8 h-8 text-gray-400" />
                        </Button>
                      ))}
                      <Button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400"
                      >
                        <Plus className="w-5 h-5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 hover:border-gray-400"
                  >
                    <Video className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Click to upload videos (MP4, MOV, WebM)
                    </span>
                  </Button>
                )}
                <Input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>

              {/* Basic Information */}
              <div className="space-y-4 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Basic Information
                  </h3>
                  {/* Language Tabs */}
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      type="button"
                      variant={activeLanguage === "en" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveLanguage("en")}
                      className="px-3 py-1 text-xs"
                    >
                      EN
                    </Button>
                    <Button
                      type="button"
                      variant={activeLanguage === "ar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveLanguage("ar")}
                      className="px-3 py-1 text-xs"
                    >
                      AR
                    </Button>
                    <Button
                      type="button"
                      variant={activeLanguage === "ku" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveLanguage("ku")}
                      className="px-3 py-1 text-xs"
                    >
                      KU
                    </Button>
                  </div>
                </div>

                {/* English Fields */}
                {activeLanguage === "en" && (
                  <>
                    <div>
                      <Label>Name (English)</Label>
                      <Input
                        type="text"
                        value={formData.name_en}
                        onChange={(e) =>
                          handleFormChange("name_en", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Description (English)</Label>
                      <Textarea
                        value={formData.description_en}
                        onChange={(e) =>
                          handleFormChange("description_en", e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {/* Arabic Fields */}
                {activeLanguage === "ar" && (
                  <>
                    <div>
                      <Label>Name (Arabic)</Label>
                      <Input
                        type="text"
                        value={formData.name_ar}
                        onChange={(e) =>
                          handleFormChange("name_ar", e.target.value)
                        }
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label>Description (Arabic)</Label>
                      <Textarea
                        value={formData.description_ar}
                        onChange={(e) =>
                          handleFormChange("description_ar", e.target.value)
                        }
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                  </>
                )}

                {/* Kurdish Fields */}
                {activeLanguage === "ku" && (
                  <>
                    <div>
                      <Label>Name (Kurdish)</Label>
                      <Input
                        type="text"
                        value={formData.name_ku}
                        onChange={(e) =>
                          handleFormChange("name_ku", e.target.value)
                        }
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label>Description (Kurdish)</Label>
                      <Textarea
                        value={formData.description_ku}
                        dir="rtl"
                        onChange={(e) =>
                          handleFormChange("description_ku", e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Category</Label>
                  <Select
                    value={
                      formData.category_id ? String(formData.category_id) : ""
                    }
                    onValueChange={(value) =>
                      handleFormChange("category_id", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Brand</Label>
                  <Select
                    value={formData.brand_id ? String(formData.brand_id) : ""}
                    onValueChange={(value) =>
                      handleFormChange("brand_id", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={String(brand.id)}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Store</Label>
                  <Select
                    value={
                      formData.store_id ? String(formData.store_id) : "none"
                    }
                    onValueChange={(value) =>
                      handleFormChange(
                        "store_id",
                        value === "none" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select store (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Store)</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name} {!store.is_active ? "(Inactive)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Base Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) =>
                        handleFormChange("base_price", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Sell Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sell_price}
                      onChange={(e) =>
                        handleFormChange("sell_price", e.target.value)
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>Commission</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_price}
                      onChange={(e) =>
                        handleFormChange("commission_price", e.target.value)
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">
                  Discount (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) =>
                        handleFormChange("discount", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Discount Type</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value) =>
                        handleFormChange("discount_type", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          Percentage (%)
                        </SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Stock & Inventory */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Stock & Inventory
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <Checkbox
                        id="in_stock"
                        checked={formData.in_stock}
                        onCheckedChange={(checked) =>
                          handleFormChange("in_stock", checked)
                        }
                      />
                      <Label 
                        htmlFor="in_stock" 
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        In Stock
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <Checkbox
                        id="is_trend"
                        checked={formData.is_trend}
                        onCheckedChange={(checked) =>
                          handleFormChange("is_trend", checked)
                        }
                      />
                      <Label 
                        htmlFor="is_trend" 
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        Trending Product
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <Checkbox
                        id="is_important"
                        checked={formData.is_important}
                        onCheckedChange={(checked) =>
                          handleFormChange("is_important", checked)
                        }
                      />
                      <Label 
                        htmlFor="is_important" 
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        Important Product
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label>Key Features (comma separated)</Label>
                    <Textarea
                      value={formData.key_features}
                      onChange={(e) =>
                        handleFormChange("key_features", e.target.value)
                      }
                      rows={2}
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>
                </div>
              </div>

              {/* Product Details (Optional) */}
              <div className="space-y-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">
                  Product Details (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product Code</Label>
                    <Input
                      type="text"
                      value={formData.product_code}
                      onChange={(e) =>
                        handleFormChange("product_code", e.target.value)
                      }
                      placeholder="SKU or product code"
                    />
                  </div>
                  <div>
                    <Label>Size</Label>
                    <Input
                      type="text"
                      value={formData.size}
                      onChange={(e) => handleFormChange("size", e.target.value)}
                      placeholder="e.g., XL, 42, 1L"
                    />
                  </div>
                  <div>
                    <Label>Volume</Label>
                    <Input
                      type="text"
                      value={formData.volume}
                      onChange={(e) =>
                        handleFormChange("volume", e.target.value)
                      }
                      placeholder="e.g., 500ml, 1L, 250g"
                    />
                  </div>
                  <div>
                    <Label>Colors (comma separated)</Label>
                    <Input
                      type="text"
                      value={formData.colors}
                      onChange={(e) =>
                        handleFormChange("colors", e.target.value)
                      }
                      placeholder="Red, Blue, Black"
                    />
                  </div>
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProduct ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => !open && closeView()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogClose onClick={closeView} />
          </DialogHeader>

          {viewProduct && (
            <>
              <DialogBody className="space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Images Gallery */}
              {viewProduct.images && viewProduct.images.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Images
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {viewProduct.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                      >
                        <img
                          src={
                            img.url ||
                            `${API_BASE}/images/products/${img.image_url}`
                          }
                          alt={`Product ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Gallery */}
              {((viewProduct.videos && viewProduct.videos.length > 0) || viewProduct.video) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Videos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(viewProduct.videos || (viewProduct.video ? [viewProduct.video] : [])).map((vid, idx) => (
                      <div
                        key={idx}
                        className="aspect-video bg-gray-100 rounded-lg overflow-hidden"
                      >
                        <video
                          src={
                            vid.video_url ||
                            vid.url ||
                            `${API_BASE}/videos/products/${vid.filename || vid.video_url}`
                          }
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('Video load error:', e.target.error);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs">
                      Name (English)
                    </Label>
                    <p className="text-sm font-medium">
                      {viewProduct.name_en || viewProduct.name || "-"}
                    </p>
                  </div>
                  {viewProduct.name_ar && (
                    <div>
                      <Label className="text-gray-500 text-xs">
                        Name (Arabic)
                      </Label>
                      <p className="text-sm font-medium" dir="rtl">
                        {viewProduct.name_ar}
                      </p>
                    </div>
                  )}
                  {viewProduct.name_ku && (
                    <div>
                      <Label className="text-gray-500 text-xs">
                        Name (Kurdish)
                      </Label>
                      <p className="text-sm font-medium" dir="rtl">
                        {viewProduct.name_ku}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500 text-xs">Category</Label>
                    <p className="text-sm font-medium">
                      {viewProduct.category_name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">Brand</Label>
                    <p className="text-sm font-medium">
                      {viewProduct.brand_name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">Store</Label>
                    <p className="text-sm font-medium">
                      {viewProduct.store_name || "-"}
                    </p>
                  </div>
                </div>

                {(viewProduct.description_en ||
                  viewProduct.description_ar ||
                  viewProduct.description_ku) && (
                  <div className="space-y-2">
                    {viewProduct.description_en && (
                      <div>
                        <Label className="text-gray-500 text-xs">
                          Description (English)
                        </Label>
                        <p className="text-sm text-gray-700">
                          {viewProduct.description_en}
                        </p>
                      </div>
                    )}
                    {viewProduct.description_ar && (
                      <div>
                        <Label className="text-gray-500 text-xs">
                          Description (Arabic)
                        </Label>
                        <p className="text-sm text-gray-700" dir="rtl">
                          {viewProduct.description_ar}
                        </p>
                      </div>
                    )}
                    {viewProduct.description_ku && (
                      <div>
                        <Label className="text-gray-500 text-xs">
                          Description (Kurdish)
                        </Label>
                        <p className="text-sm text-gray-700" dir="rtl">
                          {viewProduct.description_ku}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs">Base Price</Label>
                    <p className="text-lg font-semibold text-gray-900">
                      {Number(viewProduct.base_price)} IQD
                    </p>
                  </div>
                  {viewProduct.sell_price && (
                    <div>
                      <Label className="text-gray-500 text-xs">
                        Sell Price
                      </Label>
                      <p className="text-lg font-semibold text-green-600">
                        {Number(viewProduct.sell_price)} IQD
                      </p>
                    </div>
                  )}
                  {viewProduct.commission_price && (
                    <div>
                      <Label className="text-gray-500 text-xs">
                        Commission
                      </Label>
                      <p className="text-lg font-semibold text-blue-600">
                        {Number(viewProduct.commission_price)} IQD
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Discount */}
              {viewProduct.discount > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Discount
                  </h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">
                        Discount Amount
                      </Label>
                      <p className="text-lg font-semibold text-red-600">
                        {viewProduct.discount_type === "fixed"
                          ? `${viewProduct.discount} IQD`
                          : `${viewProduct.discount}%`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Product Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs">
                      Stock Status
                    </Label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        viewProduct.in_stock
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {viewProduct.in_stock ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>
                  {viewProduct.product_code && (
                    <div>
                      <Label className="text-gray-500 text-xs">
                        Product Code
                      </Label>
                      <p className="text-sm font-medium">
                        {viewProduct.product_code}
                      </p>
                    </div>
                  )}
                  {viewProduct.size && (
                    <div>
                      <Label className="text-gray-500 text-xs">Size</Label>
                      <p className="text-sm font-medium">{viewProduct.size}</p>
                    </div>
                  )}
                  {viewProduct.volume && (
                    <div>
                      <Label className="text-gray-500 text-xs">Volume</Label>
                      <p className="text-sm font-medium">
                        {viewProduct.volume}
                      </p>
                    </div>
                  )}
                  {viewProduct.colors && (
                    <div className="col-span-2">
                      <Label className="text-gray-500 text-xs">Colors</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(Array.isArray(viewProduct.colors)
                          ? viewProduct.colors
                          : viewProduct.colors.split(",").map((c) => c.trim())
                        ).map((color, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 rounded text-xs"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Features */}
              {(viewProduct.key_features_en ||
                viewProduct.key_features_ar ||
                viewProduct.key_features_ku) && (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Key Features
                  </h3>
                  {viewProduct.key_features_en && (
                    <div>
                      <Label className="text-gray-500 text-xs">English</Label>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {(Array.isArray(viewProduct.key_features_en)
                          ? viewProduct.key_features_en
                          : viewProduct.key_features_en
                              .split(",")
                              .map((f) => f.trim())
                        ).map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viewProduct.key_features_ar && (
                    <div>
                      <Label className="text-gray-500 text-xs">Arabic</Label>
                      <ul
                        className="list-disc list-inside text-sm text-gray-700 space-y-1"
                        dir="rtl"
                      >
                        {(Array.isArray(viewProduct.key_features_ar)
                          ? viewProduct.key_features_ar
                          : viewProduct.key_features_ar
                              .split(",")
                              .map((f) => f.trim())
                        ).map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viewProduct.key_features_ku && (
                    <div>
                      <Label className="text-gray-500 text-xs">Kurdish</Label>
                      <ul
                        className="list-disc list-inside text-sm text-gray-700 space-y-1"
                        dir="rtl"
                      >
                        {(Array.isArray(viewProduct.key_features_ku)
                          ? viewProduct.key_features_ku
                          : viewProduct.key_features_ku
                              .split(",")
                              .map((f) => f.trim())
                        ).map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeView}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  closeView();
                  openEdit(viewProduct);
                }}
                disabled={!viewProduct}
              >
                Edit Product
              </Button>
            </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Products;
