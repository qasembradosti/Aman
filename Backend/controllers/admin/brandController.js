import Brand from '../../models/brand.js';

// Get all brands (admin - includes inactive)
export const getAllBrands = async (req, res) => {
  try {
    const { q, is_active, sort, order, limit, offset } = req.query;

    const filters = {
      q,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      sort,
      order,
      limit,
      offset,
    };

    const result = await Brand.findAll(filters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands',
      error: error.message,
    });
  }
};

// Get brand by id
export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    res.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand',
      error: error.message,
    });
  }
};

// Create new brand
export const createBrand = async (req, res) => {
  try {
    const { name, logo_url, description, website, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required',
      });
    }

    const brand = await Brand.create({
      name,
      logo_url,
      description,
      website,
      is_active,
    });

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand,
    });
  } catch (error) {
    console.error('Error creating brand:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create brand',
      error: error.message,
    });
  }
};

// Update brand
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo_url, description, website, is_active } = req.body;

    const brand = await Brand.update(id, {
      name,
      logo_url,
      description,
      website,
      is_active,
    });

    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: brand,
    });
  } catch (error) {
    console.error('Error updating brand:', error);

    if (error.message === 'Brand not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update brand',
      error: error.message,
    });
  }
};

// Delete brand
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    await Brand.delete(id);

    res.json({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting brand:', error);

    if (error.message === 'Brand not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('Cannot delete brand')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete brand',
      error: error.message,
    });
  }
};

// Get products by brand
export const getBrandProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    const result = await Brand.getProducts(id, { limit, offset });

    res.json({
      success: true,
      brand,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching brand products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand products',
      error: error.message,
    });
  }
};
