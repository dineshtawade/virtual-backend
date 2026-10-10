import express from 'express';
import {
  getBrokerState,
  updateBrokerState,
  setSimulatedClock,
  applyPreset,
} from '../controllers/brokerController.js';

const router = express.Router();

router.get('/state', getBrokerState);
router.put('/state', updateBrokerState);
router.post('/clock', setSimulatedClock);
router.post('/preset/:presetId', applyPreset);

export default router;
