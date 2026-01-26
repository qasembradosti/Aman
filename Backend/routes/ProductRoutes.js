import express from "express";
import { listProducts, createProduct, updateProduct, deleteProduct, getProduct, updateProductStock } from "../controllers/home/productsController.js";
import { createReview, listProductReviews, getReviewSummary } from "../controllers/home/reviewsController.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { videoUpload } from "../middleware/videoUploadMiddleware.js";
import { productValidation } from "../middleware/productValidation.js";
import { uploadValidation } from "../middleware/uploadValidation.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { uploadProductImages, listProductImages } from "../controllers/home/productImagesController.js";
import { uploadProductVideos, listProductVideos, deleteProductVideo, setMainProductVideo } from "../controllers/home/productVideosController.js";

const router = express.Router();

// Product CRUD
router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.post("/products", upload.array('images', 10), productValidation, validateRequest, createProduct);
router.patch("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Stock update (increment or set)
router.patch("/products/:id/stock", updateProductStock);

// Reviews
router.post("/products/:id/reviews", createReview);
router.get("/products/:id/reviews", listProductReviews);
router.get("/products/:id/reviews/summary", getReviewSummary);

// Images upload
router.post("/products/:id/images", upload.array('images', 10), uploadValidation, validateRequest, uploadProductImages);
router.get("/products/:id/images", listProductImages);

// Videos upload
router.post("/products/:id/videos", videoUpload.array('videos', 5), uploadProductVideos);
router.get("/products/:id/videos", listProductVideos);
router.delete("/products/:id/videos/:videoId", deleteProductVideo);
router.patch("/products/:id/videos/:videoId/main", setMainProductVideo);




export default router;