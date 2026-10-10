import express from 'express';
import {
  getAdminDashboardStats,
  getAllUsers,
  getSystemSettings,
  updateSystemSettings,
  testEmailConfig,
  resetSimulatorSystem,
} from '../controllers/adminController.js';
import { protect, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce JWT authentication & Super Admin privileges on all admin endpoints
router.use(protect);
router.use(requireSuperAdmin);

router.get('/stats', getAdminDashboardStats);
router.get('/users', getAllUsers);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.post('/settings/test-email', testEmailConfig);
router.post('/reset', resetSimulatorSystem);

export default router;
