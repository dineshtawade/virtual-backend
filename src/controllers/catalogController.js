import { store } from '../models/store.js';

export const getCatalog = async (req, res) => {
  try {
    const plans = store.getPlans();
    const flags = store.getCatalogFlags();
    const presets = store.getPresets();
    const accessMatrix = store.getAccessMatrix();
    const systemSettings = store.getSystemSettings();

    return res.status(200).json({
      success: true,
      data: {
        plans,
        flags,
        presets,
        accessMatrix,
        paymentGateway: systemSettings?.paymentGateway || {
          provider: 'razorpay',
          razorpayKeyId: 'rzp_test_9876543210AB',
          environment: 'test',
          currency: 'INR',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCatalogFlags = async (req, res) => {
  try {
    const newFlags = store.updateCatalogFlags(req.body);
    store.logAction({
      action: 'CATALOG_FLAGS_UPDATED',
      statusCode: 200,
      errorCode: 'NONE',
      message: 'Catalog flags updated by Admin.',
      metadata: newFlags,
    });

    return res.status(200).json({
      success: true,
      data: newFlags,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAccessMatrix = async (req, res) => {
  try {
    const newMatrix = store.updateAccessMatrix(req.body);
    store.logAction({
      action: 'ACCESS_MATRIX_UPDATED',
      statusCode: 200,
      errorCode: 'NONE',
      message: 'Subscription access & permissions matrix updated by Super Admin.',
      metadata: newMatrix,
    });

    return res.status(200).json({
      success: true,
      data: newMatrix,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertPlan = async (req, res) => {
  try {
    const plan = req.body;
    if (!plan.planId || !plan.label || !plan.category) {
      return res.status(400).json({ success: false, message: 'planId, label, and category are required' });
    }

    const updatedPlans = store.addOrUpdatePlan(plan);
    store.logAction({
      action: 'CATALOG_PLAN_UPSERTED',
      statusCode: 200,
      errorCode: 'NONE',
      message: `Plan '${plan.label}' (${plan.planId}) saved to catalog.`,
    });

    return res.status(200).json({
      success: true,
      data: updatedPlans,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
