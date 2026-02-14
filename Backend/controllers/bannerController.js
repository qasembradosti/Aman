import Banner from '../models/banner.js';

// Get all active banners (public)
export const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.getAllActive();
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    console.error('Error fetching active banners:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all banners (admin)
export const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.getAll();
    res.status(200).json({
      success: true,
      data: banners
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.getById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }
    res.status(200).json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create banner
export const createBanner = async (req, res) => {
  try {
    const { title, title_ar, title_ku, subtitle, subtitle_ar, subtitle_ku, link_url, is_active, display_order } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Check if image file was uploaded
    let image_url = null;
    if (req.file) {
      image_url = `/images/${req.file.filename}`;
    } else if (req.body.image_url) {
      image_url = req.body.image_url;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }

    const bannerData = {
      title,
      title_ar: title_ar || null,
      title_ku: title_ku || null,
      subtitle: subtitle || null,
      subtitle_ar: subtitle_ar || null,
      subtitle_ku: subtitle_ku || null,
      image_url,
      link_url: link_url || null,
      is_active: is_active !== undefined ? is_active : true,
      display_order: display_order || 0
    };

    const banner = await Banner.create(bannerData);
    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update banner
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, title_ar, title_ku, subtitle, subtitle_ar, subtitle_ku, link_url, is_active, display_order } = req.body;

    const existingBanner = await Banner.getById(id);
    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const bannerData = {};
    if (title !== undefined) bannerData.title = title;
    if (title_ar !== undefined) bannerData.title_ar = title_ar;
    if (title_ku !== undefined) bannerData.title_ku = title_ku;
    if (subtitle !== undefined) bannerData.subtitle = subtitle;
    if (subtitle_ar !== undefined) bannerData.subtitle_ar = subtitle_ar;
    if (subtitle_ku !== undefined) bannerData.subtitle_ku = subtitle_ku;
    if (link_url !== undefined) bannerData.link_url = link_url;
    if (is_active !== undefined) bannerData.is_active = is_active;
    if (display_order !== undefined) bannerData.display_order = display_order;
    
    // Handle image update
    if (req.file) {
      bannerData.image_url = `/images/${req.file.filename}`;
    } else if (req.body.image_url !== undefined) {
      bannerData.image_url = req.body.image_url;
    }

    const banner = await Banner.update(id, bannerData);
    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete banner
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBanner = await Banner.getById(id);
    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    await Banner.delete(id);
    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle banner active status
export const toggleBannerActive = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.toggleActive(id);
    res.status(200).json({
      success: true,
      message: 'Banner status updated successfully',
      data: banner
    });
  } catch (error) {
    console.error('Error toggling banner status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update banner display order
export const updateBannerOrder = async (req, res) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Orders array is required'
      });
    }

    await Banner.updateOrder(orders);
    res.status(200).json({
      success: true,
      message: 'Banner order updated successfully'
    });
  } catch (error) {
    console.error('Error updating banner order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Upload banner image
export const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/images/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Banner image uploaded successfully',
      data: {
        filename: req.file.filename,
        url: imageUrl,
        image_url: imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading banner image:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
