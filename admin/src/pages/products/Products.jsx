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
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import api from "../../services/api";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

// Memoized ProductCard to prevent unnecessary re-renders
const ProductCard = memo(({ product, onEdit, onDelete }) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300">
    {/* Product Image */}
    <div className="aspect-square bg-gray-100 relative">
      {product.images?.[0] ? (
        <img
          src={`${
            product.images[0].url
          }`}
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
));

ProductCard.displayName = "ProductCard";

// Memoized ProductRow for table view
const ProductRow = memo(({ product, onEdit, onDelete }) => (
  <TableRow>
    <TableCell>
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={`${
              product.images[0].url ||
              `/images/products/${product.images[0].image_url}`
            }`}
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
));

ProductRow.displayName = "ProductRow";

const Products = () => {
  const dispatch = useDispatch();
  const { items: productItems, loading, meta } = useSelector((state) => state.products);
  const { items: categoryItems } = useSelector((state) => state.categories);
  const items = Array.isArray(productItems) ? productItems : [];
  const categories = Array.isArray(categoryItems) ? categoryItems : [];
  const fileInputRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [imagePreviews, setImagePreviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
    description: "",
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
    minPrice,
    maxPrice,
    sortBy,
    itemsPerPage,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter, brandFilter, discountFilter, minPrice, maxPrice, sortBy]);

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_ar: "",
      name_ku: "",
      description_en: "",
      description_ar: "",
      description: "",
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
    });
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
    setActiveImageIndex(0);
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
      description_en: product.description_en || product.description || "",
      description_ar: product.description_ar || "",
      description: product.description || "",
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
    });
    if (product.images && product.images.length > 0) {
      setImagePreviews(
        product.images.map(
          (img) =>
            `${img.url || `/images/products/${img.image_url}`}`
        )
      );
    }
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, []);

  const handleImageSelect = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      const newFiles = [...imageFiles, ...files];
      setImageFiles(newFiles);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    },
    [imageFiles]
  );

  const removeImage = useCallback(
    (index) => {
      const newFiles = imageFiles.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      if (imagePreviews[index]?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviews[index]);
      }
      setImageFiles(newFiles);
      setImagePreviews(newPreviews);
      if (activeImageIndex >= newPreviews.length) {
        setActiveImageIndex(Math.max(0, newPreviews.length - 1));
      }
    },
    [imageFiles, imagePreviews, activeImageIndex]
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

  const handleSortChange = useCallback((val) => {
    setSortBy(val === "default" ? "" : val);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("");
    setStockFilter("");
    setBrandFilter("");
    setDiscountFilter("");
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
        description: formData.description,
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
        key_features_en: keyFeaturesEn && keyFeaturesEn.length ? keyFeaturesEn : null,
        key_features_ar: keyFeaturesAr && keyFeaturesAr.length ? keyFeaturesAr : null,
        key_features_ku: keyFeaturesKu && keyFeaturesKu.length ? keyFeaturesKu : null,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        discount_type: formData.discount_type || "percentage",
        in_stock: formData.in_stock,
        product_code: formData.product_code || null,
        size: formData.size || null,
        volume: formData.volume || null,
        colors: colors && colors.length ? colors : null,
      };
      await dispatch(updateProduct({ id: editingProduct.id, data }));
    } else {
      const fd = new FormData();
      fd.append("name_en", formData.name_en);
      fd.append("name_ar", formData.name_ar);
      fd.append("name_ku", formData.name_ku);
      fd.append("description_en", formData.description_en);
      fd.append("description_ar", formData.description_ar);
      fd.append("description", formData.description);
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
        formData.discount ? parseFloat(formData.discount) : 0
      );
      fd.append("discount_type", formData.discount_type || "percentage");
      if (formData.product_code) fd.append("product_code", formData.product_code);
      if (formData.size) fd.append("size", formData.size);
      if (formData.volume) fd.append("volume", formData.volume);
      if (formData.colors) fd.append("colors", formData.colors);
      imageFiles.forEach((file) => fd.append("images", file));
      await dispatch(createProduct(fd));
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
    [imagePreviews.length]
  );
  const prevImage = useCallback(
    () =>
      setActiveImageIndex(
        (prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length
      ),
    [imagePreviews.length]
  );

  // Calculate pagination
  const totalPages = meta ? Math.ceil(meta.total / itemsPerPage) : 1;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
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
                <SelectItem value="price_desc">Price (High to Low)</SelectItem>
                <SelectItem value="stock_asc">Stock (Low to High)</SelectItem>
                <SelectItem value="stock_desc">Stock (High to Low)</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || categoryFilter || stockFilter || brandFilter || discountFilter || minPrice || maxPrice || sortBy) && (
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
        <div className="text-center py-12 text-gray-500">No products found</div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl">
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
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {imagePreviews.map((preview, index) => (
                        <Button
                          key={index}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
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
                        onChange={(e) => handleFormChange("name_en", e.target.value)}
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
                        onChange={(e) => handleFormChange("name_ar", e.target.value)}
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
                        onChange={(e) => handleFormChange("name_ku", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Description (Kurdish)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) =>
                          handleFormChange("description", e.target.value)
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
                    value={formData.store_id ? String(formData.store_id) : "none"}
                    onValueChange={(value) =>
                      handleFormChange("store_id", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select store (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Store)</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name} {!store.is_active ? '(Inactive)' : ''}
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
                  <div>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.in_stock}
                        onChange={(e) =>
                          handleFormChange("in_stock", e.target.checked)
                        }
                        className="rounded border-gray-300"
                      />
                      In Stock
                    </Label>
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
                      onChange={(e) =>
                        handleFormChange("size", e.target.value)
                      }
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
    </div>
  );
};

export default Products;
