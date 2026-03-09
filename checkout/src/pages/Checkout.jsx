import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";
import "../styles/plyr-custom.css";
import { productService } from "../services/productService";
import { orderService } from "../services/orderService";
import { translations, getDirection, getAlign } from "../utils/translations";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ImageSlider = ({ images, video }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle images array - extract URLs from image objects
  let imageList = [];
  if (Array.isArray(images) && images.length > 0) {
    // If images is array of objects with url/image_url property
    imageList = images.map((img) => {
      if (typeof img === "string") return img;
      return img.url || img.image_url || img.filename || img;
    });
  } else if (typeof images === "string") {
    imageList = [images];
  }

  // Build media array with images and video
  const mediaList = imageList.map((url) => ({ type: "image", url }));

  if (video) {
    mediaList.push({ type: "video", url: video });
    console.log("Video added to media list:", video);
  } else {
    console.log("No video to add - video prop is:", video);
  }
  console.log("ImageSlider - Final media list:", mediaList);

  if (mediaList.length === 0) {
    // No valid images or video
    return (
      <div className="relative h-96 overflow-hidden rounded-2xl bg-gray-200 flex items-center justify-center">
        <svg
          className="w-24 h-24 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? mediaList.length - 1 : prevIndex - 1,
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === mediaList.length - 1 ? 0 : prevIndex + 1,
    );
  };

  return (
    <div className="relative group">
      <div className="relative w-full aspect-4/3 overflow-hidden rounded-2xl bg-gray-100">
        {mediaList[currentIndex].type === "video" ? (
          <div className="w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden">
            <Plyr
              key={mediaList[currentIndex].url}
              source={{
                type: "video",
                sources: [
                  {
                    src: mediaList[currentIndex].url,
                    type: "video/mp4",
                  },
                ],
              }}
              options={{
                quality: { default: 720, options: [360, 720, 1080] },
                disableContextMenu: false,
                ratio: "16:9",
                autoplay: true,
                hideControls: true,
                resetOnEnd: true,
              }}
            />
          </div>
        ) : (
          <img
            src={mediaList[currentIndex].url}
            alt={`Product ${currentIndex + 1}`}
            className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              e.target.src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20"%3EImage not available%3C/text%3E%3C/svg%3E';
            }}
          />
        )}

        {/* linear Overlays */}
        <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {mediaList.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Next Button */}
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {mediaList.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex items-center justify-center transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-white w-8 h-2.5 rounded-full"
                      : "bg-white/50 hover:bg-white/75 w-2.5 h-2.5 rounded-full"
                  }`}
                >
                  {item.type === "video" && index === currentIndex && (
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {mediaList.length > 1 && (
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
          {mediaList.map((item, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 relative ${
                index === currentIndex
                  ? "border-blue-500 ring-blue-200"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              {item.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Iraqi cities with delivery fees (in IQD)
const iraqiCities = [
  { name_en: "Baghdad", name_ar: "بغداد", name_ku: "بەغدا", fee: 5000 },
  { name_en: "Erbil", name_ar: "أربيل", name_ku: "هەولێر", fee: 2500 },
  { name_en: "Sulaymaniyah", name_ar: "السليمانية", name_ku: "سلێمانی", fee: 3000 },
  { name_en: "Duhok", name_ar: "دهوك", name_ku: "دهۆک", fee: 3000 },
  { name_en: "Basra", name_ar: "البصرة", name_ku: "بەسرە", fee: 5000 },
  { name_en: "Mosul", name_ar: "الموصل", name_ku: "موسڵ", fee: 5000 },
  { name_en: "Kirkuk", name_ar: "كركوك", name_ku: "کەرکووک", fee: 3000 },
  { name_en: "Najaf", name_ar: "النجف", name_ku: "نەجەف", fee: 5000 },
  { name_en: "Karbala", name_ar: "كربلاء", name_ku: "کەربەلا", fee: 5000 },
  { name_en: "Hillah", name_ar: "الحلة", name_ku: "حیللە", fee: 5000 },
  { name_en: "Nasiriyah", name_ar: "الناصرية", name_ku: "نەسریە", fee: 5000 },
  { name_en: "Amarah", name_ar: "العمارة", name_ku: "ئەمارە", fee: 5000 },
  { name_en: "Diwaniyah", name_ar: "الديوانية", name_ku: "دیوانیە", fee: 5000 },
  { name_en: "Kut", name_ar: "الكوت", name_ku: "کووت", fee: 5000 },
  { name_en: "Samawah", name_ar: "السماوة", name_ku: "سەماوە", fee: 5000 },
  { name_en: "Ramadi", name_ar: "الرمادي", name_ku: "ڕەمادی", fee: 5000 },
  { name_en: "Fallujah", name_ar: "الفلوجة", name_ku: "فەڵووجە", fee: 5000 },
  { name_en: "Tikrit", name_ar: "تكريت", name_ku: "تکریت", fee: 5000 },
  { name_en: "Samarra", name_ar: "سامراء", name_ku: "سامەڕا", fee: 5000 },
  { name_en: "Baqubah", name_ar: "بعقوبة", name_ku: "بەعقووبە", fee: 5000 },
  { name_en: "Halabja", name_ar: "حلبجة", name_ku: "هەڵەبجە", fee: 3500 },
  { name_en: "Zakho", name_ar: "زاخو", name_ku: "زاخۆ", fee: 3500 },
  { name_en: "Soran", name_ar: "سوران", name_ku: "سۆران", fee: 3500 },
  { name_en: "Rania", name_ar: "رانية", name_ku: "ڕانیە", fee: 3500 },
  { name_en: "Khanaqin", name_ar: "خانقين", name_ku: "خانەقین", fee: 5000 },
];

// Utility function to calculate discount
const calculateDiscount = (product) => {
  const basePrice = product.base_price || product.price || 0;
  const discount = product.discount || 0;
  const discountType = product.discount_type || 'percentage';
  
  if (!discount || discount <= 0) {
    return {
      hasDiscount: false,
      originalPrice: basePrice,
      discountAmount: 0,
      finalPrice: product.sell_price || basePrice,
      discountPercentage: 0
    };
  }
  
  let discountAmount = 0;
  let finalPrice = basePrice;
  
  if (discountType === 'percentage') {
    // Percentage discount
    discountAmount = (basePrice * discount) / 100;
    finalPrice = basePrice - discountAmount;
  } else if (discountType === 'fixed') {
    // Fixed amount discount
    discountAmount = discount;
    finalPrice = basePrice - discount;
  }
  
  // Ensure final price doesn't go below zero
  finalPrice = Math.max(0, finalPrice);
  
  // Calculate percentage for display
  const discountPercentage = basePrice > 0 ? ((discountAmount / basePrice) * 100).toFixed(0) : 0;
  
  return {
    hasDiscount: true,
    originalPrice: basePrice,
    discountAmount: Math.round(discountAmount),
    finalPrice: Math.round(finalPrice),
    discountPercentage: discountPercentage,
    discountType: discountType,
    discount: discount
  };
};

const Checkout = () => {
  const navigate = useNavigate();

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("productId");
  const userId = urlParams.get("userId");

  // Language state
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "en";
  });
  const t = translations[language];
  const dir = getDirection(language);

  const [product, setProduct] = useState(null);
  const [productVideo, setProductVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [cartError, setCartError] = useState(null);

  const [formData, setFormData] = useState({
    quantity: 1,
    city: "",
    address: "",
    district: "",
    phone: "",
    delivery_price: 5000, // Default delivery price
    commission_price: 0,
  });

  // Map state
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locationError, setLocationError] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Save language preference
  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGettingLocation(false);
        toast.success("Location detected successfully!");
      },
      (error) => {
        let errorMessage = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        setGettingLocation(false);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  const getProductDisplayName = (item) => {
    if (!item) return "Product";

    const nameEn = item?.name_en?.trim();
    const nameAr = item?.name_ar?.trim();
    const nameKu = item?.name_ku?.trim();
    const legacyName =
      item?.title?.trim() || item?.name?.trim() || item?.product_name?.trim();

    if (language === "ar") return nameAr || legacyName || nameEn || nameKu || "Product";
    if (language === "ku") return nameKu || legacyName || nameEn || nameAr || "Product";
    return nameEn || legacyName || nameAr || nameKu || "Product";
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = relatedProducts.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(relatedProducts.length / itemsPerPage);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({
      top: document.getElementById("related-products")?.offsetTop - 100,
      behavior: "smooth",
    });
  };

  const handleProductClick = (productIdToShow) => {
    // Update URL with new product ID
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("productId", productIdToShow);
    if (userId) {
      newUrl.searchParams.set("userId", userId);
    }
    window.history.pushState({}, "", newUrl);

    // Scroll to top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Fetch the new product
    fetchProductById(productIdToShow);
  };

  const fetchProductById = async (id) => {
    try {
      setLoading(true);
      const data = await productService.getProduct(id);
      console.log("Product data received:", data);
      console.log("Product video data:", data.video);
      setProduct(data);

      // Set video from product data if available
      if (data.video && data.video.video_url) {
        console.log("Setting product video URL:", data.video.video_url);
        setProductVideo(data.video.video_url);
      } else {
        console.log("No video found for product");
        setProductVideo(null);
      }

      // Don't automatically add to cart when viewing different products
      // User can manually add if they want

      // Fetch related products
      if (data.brand_id || data.category_id) {
        fetchRelatedProducts(data.brand_id, data.category_id, data.id);
      }

      setError(null);
    } catch (err) {
      setError("Failed to load product. Please try again.");
      console.error("Product fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
    } else {
      setError("Product ID is required");
      setLoading(false);
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getProduct(productId);
      console.log("Product data received:", data);
      console.log("Product video data:", data.video);
      setProduct(data);

      // Set video from product data if available
      if (data.video && data.video.video_url) {
        console.log("Setting product video URL:", data.video.video_url);
        setProductVideo(data.video.video_url);
      } else {
        console.log("No video found for product");
        setProductVideo(null);
      }

      // Add product to cart by default
      setCart([
        {
          ...data,
          quantity: 1,
        },
      ]);

      // Fetch related products
      if (data.brand_id || data.category_id) {
        fetchRelatedProducts(data.brand_id, data.category_id, data.id);
      }

      setError(null);
    } catch (err) {
      setError("Failed to load product. Please try again.");
      console.error("Product fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async (brandId, categoryId, excludeId) => {
    try {
      setLoadingRelated(true);
      // If product has store_id, fetch products from same store
      const storeId = product?.store_id;
      if (storeId) {
        const related = await productService.getProductsByStore(
          storeId,
          excludeId,
        );
        setRelatedProducts(related);
      } else {
        const related = await productService.getRelatedProducts(
          brandId,
          categoryId,
          excludeId,
        );
        setRelatedProducts(related);
      }
    } catch (err) {
      console.error("Failed to fetch related products:", err);
    } finally {
      setLoadingRelated(false);
    }
  };

  const addToCart = (product) => {
    // Check if cart has items from a different store
    if (cart.length > 0) {
      const firstStoreId = cart[0].store_id;
      if (
        firstStoreId &&
        product.store_id &&
        firstStoreId !== product.store_id
      ) {
        setCartError(
          "You can only order products from one store at a time. Please clear your cart first.",
        );
        setTimeout(() => setCartError(null), 3000);
        return;
      }
    }

    const existingItem = cart.find((item) => item.id === product.id);
    const stock = product.stock || product.quantity_in_stock || 999;

    if (existingItem) {
      if (existingItem.quantity >= stock) {
        setCartError(t.stockError.replace("{stock}", stock));
        setTimeout(() => setCartError(null), 3000);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setCartError(null);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((item) => item.id === productId);
    if (item) {
      const stock = item.stock || item.quantity_in_stock || 999;
      if (quantity > stock) {
        setCartError(t.stockError.replace("{stock}", stock));
        setTimeout(() => setCartError(null), 3000);
        return;
      }
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
    setCartError(null);
  };

  const calculateCartTotal = () => {
    const productsTotal = cart.reduce((sum, item) => {
      const discountInfo = calculateDiscount(item);
      const price = discountInfo.finalPrice;
      return sum + price * item.quantity;
    }, 0);
    return productsTotal + formData.delivery_price + formData.commission_price;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "quantity" ||
        name === "delivery_price" ||
        name === "commission_price"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    const selectedCity = iraqiCities.find(
      (city) => city.name_en === cityName
    );
    
    if (selectedCity) {
      setFormData((prev) => ({
        ...prev,
        city: cityName,
        delivery_price: selectedCity.fee,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        city: cityName,
      }));
    }
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    const productTotal = product.sell_price * formData.quantity;
    return productTotal + formData.delivery_price + formData.commission_price;
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.city || !formData.phone || !formData.address || !formData.district) {
      toast.error(t.fillAllFields);
      return;
    }

    if (cart.length === 0) {
      toast.error(t.cartEmpty);
      return;
    }

    // Validate userId
    if (!userId) {
      toast.error("User ID is required. Please check the URL.");
      return;
    }

    try {
      setSubmitting(true);

      // Prepare order items from cart
      const items = cart.map((item) => {
        const discountInfo = calculateDiscount(item);
        return {
          product_id: item.id,
          quantity: item.quantity,
          price: discountInfo.finalPrice,
        };
      });

      // Calculate total price
      const totalPrice = calculateCartTotal();

      // Prepare shipping address
      const shipping_address = {
        city: formData.city,
        district: formData.district,
        address: formData.address,
        phone: formData.phone,
        location_points:
          location.lat && location.lng
            ? `${location.lat},${location.lng}`
            : null,
      };

      // Create single order with all items
      const orderData = {
        user_id: parseInt(userId, 10), // Convert to number
        items: items,
        total_amount: totalPrice,
        shipping_address: shipping_address,
        payment_method: "cash_on_delivery",
        notes: `Delivery Price: ${formData.delivery_price}, Commission: ${formData.commission_price}`,
        status: "pending",
      };

      console.log("Creating order:", orderData);
      const response = await orderService.createOrder(orderData);
      console.log("Order response:", response);

      toast.success(
        t.orderSuccess.replace(
          "{total}",
          `${totalPrice.toLocaleString()} ${t.currency}`,
        ),
        { duration: 3000 },
      );

      // Clear cart
      setCart([]);

      // Redirect to success page with order ID
      setTimeout(() => {
        navigate(`/success?orderId=${response.orderId}`);
      }, 1000);
    } catch (err) {
      console.error("Order creation error:", err);
      const errorMessage =
        err.response?.data?.message || err.message || t.orderFailed;
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if required parameters are missing
  if (!userId || !productId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-lg w-full">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 rounded-full p-6 mb-6">
              <svg
                className="w-16 h-16 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              Page Not Found
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {!userId && !productId
                ? "User ID and Product ID are required."
                : !userId
                  ? "User ID is required."
                  : "Product ID is required."}
            </p>
            <p className="text-sm text-gray-500">
              Please check the URL and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-lg text-gray-600 font-medium">
              {t.loading}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 rounded-full p-4 mb-4">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-lg w-full">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 rounded-full p-6 mb-6">
              <svg
                className="w-16 h-16 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              {t.productNotFound}
            </h1>
            <p className="text-lg text-gray-600">{t.productNotFoundDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"
      dir={dir}
    >
      <div className="max-w-7xl mx-auto">
        {/* Language Switcher */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-lg font-bold text-gray-900">Aman</span>
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => changeLanguage("en")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all text-sm whitespace-nowrap ${
                language === "en"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage("ar")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all text-sm whitespace-nowrap ${
                language === "ar"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              ع
            </button>
            <button
              onClick={() => changeLanguage("ku")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all text-sm whitespace-nowrap ${
                language === "ku"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              ک
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Product Details Card - Takes 3 columns */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                {t.productDetails}
              </h2>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {/* Image Slider */}
              {(product.image || product.images) && (
                <div className="mb-8">
                  <ImageSlider
                    images={product.images || product.image}
                    video={productVideo}
                  />
                </div>
              )}

              {/* Product Info */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {getProductDisplayName(product)}
                  </h3>
                  
                  {(() => {
                    const discountInfo = calculateDiscount(product);
                    return (
                      <div className="mb-4">
                        {discountInfo.hasDiscount ? (
                          <div className="space-y-3">
                            {/* Discount Badge */}
                            <div className="inline-flex items-center bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg font-bold text-sm">
                              {discountInfo.discountType === 'percentage'
                                ? `${discountInfo.discount}% ${t.off}`
                                : `${discountInfo.discount.toLocaleString()} ${t.currency} ${t.off}`
                              }
                            </div>
                            
                            {/* Original Price - Strikethrough */}
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-lg line-through">
                                {discountInfo.originalPrice.toLocaleString()} {t.currency}
                              </span>
                              <span className="text-sm text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                                {t.save} {discountInfo.discountAmount.toLocaleString()} {t.currency}
                              </span>
                            </div>
                            
                            {/* Discounted Price */}
                            <div className="flex items-baseline gap-2 py-2">
                              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-green-600">
                                {discountInfo.finalPrice.toLocaleString()}
                              </span>
                              <span className="text-xl sm:text-2xl text-green-700 font-semibold">
                                {t.currency}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2 py-2">
                            <span className="text-3xl sm:text-4xl font-extrabold text-blue-600">
                              {(product.sell_price || product.base_price)?.toLocaleString()}
                            </span>
                            <span className="text-lg text-blue-700 font-semibold">
                              {t.currency}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Stock Badge */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                    <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold text-sm">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t.inStock}
                    </div>
                  </div>
                </div>

                {(product.description_en ||
                  product.description_ar ||
                  product.description_ku) && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold gap-2 text-gray-900 mb-3 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p>{t.productDescription}</p>
                    </h4>
                    <p className="text-gray-700 leading-relaxed text-base">
                      {language === "en"
                        ? product.description_en
                        : language === "ar"
                          ? product.description_ar
                          : product.description_ku}
                    </p>
                  </div>
                )}

                {/* Product Features */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    <p className="text-sm font-semibold text-blue-700">
                      {t.freePackaging}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <p className="text-sm font-semibold text-blue-700">
                      {t.securePayment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form Card - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200 lg:sticky lg:top-8 h-fit">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                {t.deliveryInformation}
              </h2>
            </div>

            <form
              onSubmit={handleCheckout}
              className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"
            >
              {/* City Select */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  {t.selectCity}
                  <span className="text-red-500">{t.required}</span>
                </Label>
                <Select value={formData.city} onValueChange={(value) => {
                  const selectedCity = iraqiCities.find(city => city.name_en === value);
                  if (selectedCity) {
                    setFormData((prev) => ({
                      ...prev,
                      city: value,
                      delivery_price: selectedCity.fee,
                    }));
                  }
                }} required>
                  <SelectTrigger id="city">
                    <SelectValue placeholder={t.selectCityPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {iraqiCities.map((city, index) => (
                      <SelectItem key={index} value={city.name_en}>
                        {language === 'en' ? city.name_en : language === 'ar' ? city.name_ar : city.name_ku}
                        {' - '}{city.fee.toLocaleString()} {t.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.deliveryFeeWillUpdate}
                </p>
              </div>

              {/* District/Area */}
              <div className="space-y-2">
                <Label htmlFor="district" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  {t.district}
                  <span className="text-red-500">{t.required}</span>
                </Label>
                <Input
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  placeholder={t.enterDistrict}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  {t.phone}
                  <span className="text-red-500">{t.required}</span>
                </Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t.enterPhone}
                  required
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  {t.address}
                  <span className="text-red-500">{t.required}</span>
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder={t.enterAddress}
                  rows={4}
                  required
                />
              </div>

              {/* Map Location */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.yourLocation || "Your Location"}
                </label>

                <div className="bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden">
                  {/* Location Status */}
                  <div className="p-4 bg-white border-b border-gray-200">
                    {location.lat && location.lng ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-green-600">
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sm font-semibold">
                            Location Detected
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm">
                          {t.locationNotDetected || "Location not detected yet"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Map Container */}
                  <div className="relative bg-gray-100 h-48">
                    {location.lat && location.lng ? (
                      <iframe
                        title="Location Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lng}`}
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg
                          className="w-16 h-16 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                          />
                        </svg>
                        <p className="text-sm font-medium">
                          {t.clickToDetectLocation ||
                            "Click below to detect your location"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Get Location Button */}
                  <div className="p-4 bg-white">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {gettingLocation ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{t.detecting || "Detecting..."}</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>
                            {location.lat && location.lng
                              ? t.updateLocation || "Update Location"
                              : t.getMyLocation || "Get My Location"}
                          </span>
                        </>
                      )}
                    </button>
                    {locationError && (
                      <p className="text-red-600 text-sm mt-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {locationError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Summary - Cart Items */}
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 mt-6 sm:mt-8">
                {/* Cart Error Notification */}
                {cartError && (
                  <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start animate-fade-in">
                    <svg
                      className="w-5 h-5 mr-3 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold">{cartError}</span>
                  </div>
                )}

                <h3 className="text-base font-bold text-gray-900 mb-4 sm:mb-5 flex items-center border-l-4 border-blue-600 pl-3">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {t.shoppingCart} ({cart.length})
                </h3>

                {cart.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">
                    {t.yourCartEmpty}
                  </p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg p-3 sm:p-4 shadow-sm"
                      >
                        <div className="flex gap-3">
                          {item.images && item.images[0] && (
                            <img
                              src={
                                item.images[0].url || item.images[0].image_url
                              }
                              alt={getProductDisplayName(item)}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 mb-1">
                              {getProductDisplayName(item)}
                            </h4>
                            {(() => {
                              const discountInfo = calculateDiscount(item);
                              return (
                                <div>
                                  {discountInfo.hasDiscount ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 line-through">
                                          {discountInfo.originalPrice.toLocaleString()}
                                        </span>
                                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">
                                          {discountInfo.discountType === 'percentage' 
                                            ? `-${discountInfo.discount}%`
                                            : `-${discountInfo.discount.toLocaleString()}`
                                          }
                                        </span>
                                      </div>
                                      <p className="text-sm sm:text-base text-green-600 font-bold">
                                        {discountInfo.finalPrice.toLocaleString()} {t.currency}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs sm:text-sm text-blue-600 font-semibold">
                                      {(item.sell_price || item.price)?.toLocaleString()} {t.currency}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-800 shrink-0 self-start"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        {/* Quantity Controls Row */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs sm:text-sm text-gray-600 font-medium">
                            Quantity:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(item.id, item.quantity - 1)
                              }
                              className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center transition-colors font-semibold text-gray-700"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(item.id, item.quantity + 1)
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors font-semibold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center text-gray-600 py-1.5 gap-2">
                    <span className="text-sm font-medium">
                      {t.productsTotal}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {cart
                        .reduce(
                          (sum, item) => {
                            const discountInfo = calculateDiscount(item);
                            return sum + discountInfo.finalPrice * item.quantity;
                          },
                          0,
                        )
                        .toLocaleString()}{" "}
                      {t.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 py-1.5 gap-2">
                    <span className="text-sm font-medium">
                      {t.deliveryFee}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {formData.delivery_price.toLocaleString()} {t.currency}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center bg-blue-600 text-white rounded-xl px-4 py-3 gap-2">
                      <span className="text-base font-bold">
                        {t.total}
                      </span>
                      <span className="text-lg font-extrabold">
                        {calculateCartTotal().toLocaleString()} {t.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base sm:text-lg"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>{t.processing}</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{t.completeCheckout}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div id="related-products" className="mt-12">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1 border-l-4 border-blue-600 pl-3">
                {t.youMayAlsoLike}
              </h2>
              <p className="text-sm text-gray-500 pl-4">
                {t.showing} {indexOfFirstItem + 1}-
                {Math.min(indexOfLastItem, relatedProducts.length)} {t.of}{" "}
                {relatedProducts.length} {t.products}
              </p>
            </div>

            {/* Error Notification for Related Products */}
            {cartError && (
              <div className="mb-6 mx-auto max-w-2xl bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start animate-fade-in shadow-lg">
                <svg
                  className="w-5 h-5 mr-3 shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">{cartError}</span>
              </div>
            )}

            {loadingRelated ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {currentProducts.map((relatedProduct) => (
                    <div
                      key={relatedProduct.id}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-2 cursor-pointer flex flex-col"
                      onClick={() => handleProductClick(relatedProduct.id)}
                    >
                      {relatedProduct.images && relatedProduct.images[0] && (
                        <div className="aspect-4/3 overflow-hidden bg-gray-100">
                          <img
                            src={
                              relatedProduct.images[0].url ||
                              relatedProduct.images[0].image_url
                            }
                            alt={getProductDisplayName(relatedProduct)}
                            className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <div className="p-5 flex flex-col grow">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                          {getProductDisplayName(relatedProduct)}
                        </h3>

                        {(() => {
                          const discountInfo = calculateDiscount(relatedProduct);
                          return (
                            <div className="mb-4">
                              {discountInfo.hasDiscount ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400 line-through">
                                      {discountInfo.originalPrice.toLocaleString()}
                                    </span>
                                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                                      {discountInfo.discountType === 'percentage' 
                                        ? `-${discountInfo.discount}%`
                                        : `-${discountInfo.discount.toLocaleString()}`
                                      }
                                    </span>
                                  </div>
                                  <div className="flex items-baseline space-x-2">
                                    <span className="text-2xl font-bold text-green-600">
                                      {discountInfo.finalPrice.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-green-700 font-medium">
                                      {t.currency}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-baseline space-x-2">
                                  <span className="text-2xl font-bold text-blue-600">
                                    {(relatedProduct.sell_price || relatedProduct.price)?.toLocaleString()}
                                  </span>
                                  <span className="text-sm text-gray-600 font-medium">
                                    {t.currency}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the card click
                            addToCart(relatedProduct);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 mt-auto"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span>{t.addToCart}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center mt-10 space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-white border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex space-x-2">
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 &&
                            pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => goToPage(pageNumber)}
                              className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                                currentPage === pageNumber
                                  ? "bg-blue-600 text-white shadow-lg"
                                  : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return (
                            <span
                              key={pageNumber}
                              className="px-2 text-gray-500"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-white border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
