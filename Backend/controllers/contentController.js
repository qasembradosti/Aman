import Content from '../models/content.js';

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

const hasAnyLocalizedField = (obj, baseField) =>
  ['en', 'ar', 'ku'].some((lang) => hasValue(obj[`${baseField}_${lang}`]));

export const getAboutScreenContent = async (req, res) => {
  try {
    const [about, faqs] = await Promise.all([
      Content.getAboutSettings(),
      Content.listFaqs(true),
    ]);

    res.json({
      success: true,
      about,
      faqs,
    });
  } catch (error) {
    console.error('Error getting about screen content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch about screen content',
      error: error.message,
    });
  }
};

export const getAdminAboutContent = async (req, res) => {
  try {
    const [about, faqs] = await Promise.all([
      Content.getAboutSettings(),
      Content.listFaqs(false),
    ]);

    res.json({
      success: true,
      about,
      faqs,
    });
  } catch (error) {
    console.error('Error getting admin about content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: error.message,
    });
  }
};

export const updateAboutContent = async (req, res) => {
  try {
    const about = await Content.updateAboutSettings(req.body || {});
    res.json({
      success: true,
      about,
    });
  } catch (error) {
    console.error('Error updating about content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update about content',
      error: error.message,
    });
  }
};

export const listAdminFaqItems = async (req, res) => {
  try {
    const faqs = await Content.listFaqs(false);
    res.json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error('Error listing FAQ items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list FAQ items',
      error: error.message,
    });
  }
};

export const createFaqItem = async (req, res) => {
  try {
    const payload = req.body || {};

    if (!hasAnyLocalizedField(payload, 'question')) {
      return res.status(400).json({
        success: false,
        message: 'At least one localized question is required',
      });
    }

    if (!hasAnyLocalizedField(payload, 'answer')) {
      return res.status(400).json({
        success: false,
        message: 'At least one localized answer is required',
      });
    }

    const faq = await Content.createFaq(payload);
    res.status(201).json({
      success: true,
      faq,
    });
  } catch (error) {
    console.error('Error creating FAQ item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ item',
      error: error.message,
    });
  }
};

export const updateFaqItem = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Content.getFaqById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'FAQ item not found',
      });
    }

    const payload = req.body || {};
    const candidate = { ...existing, ...payload };

    if (!hasAnyLocalizedField(candidate, 'question')) {
      return res.status(400).json({
        success: false,
        message: 'At least one localized question is required',
      });
    }

    if (!hasAnyLocalizedField(candidate, 'answer')) {
      return res.status(400).json({
        success: false,
        message: 'At least one localized answer is required',
      });
    }

    const faq = await Content.updateFaq(id, payload);
    res.json({
      success: true,
      faq,
    });
  } catch (error) {
    console.error('Error updating FAQ item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ item',
      error: error.message,
    });
  }
};

export const deleteFaqItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Content.deleteFaq(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'FAQ item not found',
      });
    }

    res.json({
      success: true,
      message: 'FAQ item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting FAQ item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ item',
      error: error.message,
    });
  }
};
