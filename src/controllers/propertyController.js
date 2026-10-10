import { store } from '../models/store.js';

export const getAllProperties = async (req, res) => {
  try {
    const properties = store.getProperties();
    return res.status(200).json({
      success: true,
      data: properties,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createProperty = async (req, res) => {
  try {
    const { title, price, ownerName, ownerContact, fullPhotos } = req.body;

    if (!title || !price || !ownerName || !ownerContact) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Title, Price, Owner Name, and Owner Contact Number.',
      });
    }

    const formattedPhotos = typeof fullPhotos === 'string'
      ? fullPhotos.split(',').map((s) => s.trim()).filter(Boolean)
      : fullPhotos;

    const newProp = store.addProperty({
      ...req.body,
      fullPhotos: formattedPhotos,
    });

    store.logAction({
      action: 'CREATE_PROPERTY_LISTING',
      statusCode: 201,
      errorCode: 'NONE',
      message: `New property listing posted by Super Admin: "${newProp.title}" (${newProp.type.toUpperCase()})`,
      metadata: { propertyId: newProp.id, type: newProp.type },
    });

    return res.status(201).json({
      success: true,
      message: 'Property listing posted successfully!',
      data: newProp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = store.updateProperty(id, req.body);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    store.logAction({
      action: 'UPDATE_PROPERTY_LISTING',
      statusCode: 200,
      errorCode: 'NONE',
      message: `Property "${updated.title}" updated by Super Admin.`,
      metadata: { propertyId: id },
    });

    return res.status(200).json({
      success: true,
      message: 'Property updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = store.deleteProperty(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    store.logAction({
      action: 'DELETE_PROPERTY_LISTING',
      statusCode: 200,
      errorCode: 'NONE',
      message: `Property "${deleted.title}" deleted by Super Admin.`,
      metadata: { propertyId: id },
    });

    return res.status(200).json({
      success: true,
      message: 'Property listing deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const unlockPropertyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const properties = store.getProperties();
    const prop = properties.find((p) => p.id === id);

    if (!prop) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const brokerState = store.getBrokerState();
    const baseActive = brokerState?.baseSubscription?.active;
    const proActive = brokerState?.proPlusAddon?.active;

    const planTier = prop.planAccess || (prop.isFree ? 'free' : prop.isExclusive || prop.type === 'exclusive' || prop.type === 'pro' ? 'pro' : 'base');

    // Tier Verification Rules for 3 Plans: free, base, pro
    if (planTier === 'free') {
      // Free Tier Property — Always unlocked!
    } else if (planTier === 'pro') {
      if (!proActive) {
        store.logAction({
          action: 'UNLOCK_PRO_FAILED',
          statusCode: 403,
          errorCode: 'PRO_PLAN_REQUIRED',
          message: `Attempted to unlock Pro Plan listing "${prop.title}" without active Pro Plus plan.`,
        });
        return res.status(403).json({
          success: false,
          errorCode: 'PRO_PLAN_REQUIRED',
          message: '🔒 Pro Plan Exclusive Listings require an active Pro Plus Add-On or Combined Subscription Plan.',
        });
      }
    } else {
      // Base Plan Property
      if (!baseActive && !proActive) {
        store.logAction({
          action: 'UNLOCK_BASE_FAILED',
          statusCode: 403,
          errorCode: 'BASE_PLAN_REQUIRED',
          message: `Attempted to unlock Base Plan listing "${prop.title}" without active Direct Inventory plan.`,
        });
        return res.status(403).json({
          success: false,
          errorCode: 'BASE_PLAN_REQUIRED',
          message: '🔒 Unlocking Base Plan Owner Contacts requires an active Direct Inventory Base Subscription Plan.',
        });
      }
    }

    store.logAction({
      action: planTier === 'pro' ? 'UNLOCK_PRO_SUCCESS' : planTier === 'free' ? 'UNLOCK_FREE_SUCCESS' : 'UNLOCK_BASE_SUCCESS',
      statusCode: 200,
      errorCode: 'NONE',
      message: `Unlocked contact for "${prop.title}" (${prop.ownerName} - ${prop.ownerContact})`,
    });

    return res.status(200).json({
      success: true,
      message: `Contact unlocked for ${prop.title}!`,
      data: {
        propertyId: prop.id,
        ownerName: prop.ownerName,
        ownerContact: prop.ownerContact,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
