import express from 'express';
import {
  getAllProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  unlockPropertyContact,
} from '../controllers/propertyController.js';
import { protect, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public property listing feed
router.get('/', getAllProperties);

// Protected contact unlock route
router.post('/:id/unlock', protect, unlockPropertyContact);

// Protected Super Admin property management routes
router.post('/', protect, requireSuperAdmin, createProperty);
router.put('/:id', protect, requireSuperAdmin, updateProperty);
router.delete('/:id', protect, requireSuperAdmin, deleteProperty);

export default router;
