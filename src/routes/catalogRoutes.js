import express from 'express';
import { getCatalog, updateCatalogFlags, updateAccessMatrix, upsertPlan } from '../controllers/catalogController.js';

const router = express.Router();

router.get('/', getCatalog);
router.put('/flags', updateCatalogFlags);
router.put('/access-matrix', updateAccessMatrix);
router.post('/plan', upsertPlan);

export default router;
