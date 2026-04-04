import express from "express";
import {
  listProducts,
  listAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getAdminProduct,
  updateProductStock,
} from "../controllers/home/productsController.js";
import { createReview, listProductReviews, getReviewSummary } from "../controllers/home/reviewsController.js";
import { upload, flexibleUpload } from "../middleware/uploadMiddleware.js";
import { videoUpload } from "../middleware/videoUploadMiddleware.js";
import { productValidation } from "../middleware/productValidation.js";
import { uploadValidation } from "../middleware/uploadValidation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  requireAdminPanelAccess,
  requireSuperAdminAccess,
} from "../middleware/adminPanelMiddleware.js";
import { uploadProductImages, listProductImages, deleteProductImage, setMainProductImage } from "../controllers/home/productImagesController.js";
import { uploadProductVideos, listProductVideos, deleteProductVideo, setMainProductVideo } from "../controllers/home/productVideosController.js";

const router = express.Router();

// Product CRUD
router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.get("/admin/products", authenticateToken, requireAdminPanelAccess, listAdminProducts);
router.get("/admin/products/:id", authenticateToken, requireAdminPanelAccess, getAdminProduct);
router.post(
  "/products",
  authenticateToken,
  requireSuperAdminAccess,
  upload.array('images', 10),
  productValidation,
  validateRequest,
  createProduct,
);
router.patch(
  "/products/:id",
  authenticateToken,
  requireAdminPanelAccess,
  flexibleUpload.any(),
  updateProduct,
);
router.delete("/products/:id", authenticateToken, requireSuperAdminAccess, deleteProduct);

// Stock update (increment or set)
router.patch(
  "/products/:id/stock",
  authenticateToken,
  requireAdminPanelAccess,
  updateProductStock,
);

// Reviews
router.post("/products/:id/reviews", createReview);
router.get("/products/:id/reviews", listProductReviews);
router.get("/products/:id/reviews/summary", getReviewSummary);

// Images upload
router.post(
  "/products/:id/images",
  authenticateToken,
  requireSuperAdminAccess,
  upload.array('images', 10),
  uploadValidation,
  validateRequest,
  uploadProductImages,
);
router.get("/products/:id/images", listProductImages);
router.delete(
  "/products/:id/images/:imageId",
  authenticateToken,
  requireSuperAdminAccess,
  deleteProductImage,
);
router.patch(
  "/products/:id/images/:imageId/set-main",
  authenticateToken,
  requireSuperAdminAccess,
  setMainProductImage,
);

// Videos upload (single video per product)
router.post(
  "/products/:id/videos",
  authenticateToken,
  requireSuperAdminAccess,
  videoUpload.any(),
  uploadProductVideos,
);
router.get("/products/:id/videos", listProductVideos);
router.delete(
  "/products/:id/videos/:videoId",
  authenticateToken,
  requireSuperAdminAccess,
  deleteProductVideo,
);
// Removed setMainProductVideo route since only one video per product




export default router;
