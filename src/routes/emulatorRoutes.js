import express from 'express';
import { handleUserAction, getActionLogs, clearActionLogs } from '../controllers/emulatorController.js';

const router = express.Router();

router.post('/action', handleUserAction);
router.get('/logs', getActionLogs);
router.delete('/logs', clearActionLogs);

export default router;
