import { store } from '../models/store.js';
import { evaluateFeatureAccess, getConsistencyWarnings } from '../rules/ruleEngine.js';

export const getBrokerState = async (req, res) => {
  try {
    const brokerState = store.getBrokerState();
    const referenceTime = brokerState.simulatedTime || new Date().toISOString();
    const featureAccess = evaluateFeatureAccess(brokerState, referenceTime);
    const warnings = getConsistencyWarnings(brokerState);

    return res.status(200).json({
      success: true,
      data: {
        brokerState,
        featureAccess,
        warnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBrokerState = async (req, res) => {
  try {
    const { baseSubscription, proPlusAddon, simulatedTime } = req.body;
    const current = store.getBrokerState();

    const updated = store.updateBrokerState({
      ...current,
      ...(simulatedTime ? { simulatedTime } : {}),
      ...(baseSubscription ? { baseSubscription: { ...current.baseSubscription, ...baseSubscription } } : {}),
      ...(proPlusAddon ? { proPlusAddon: { ...current.proPlusAddon, ...proPlusAddon } } : {}),
    });

    const featureAccess = evaluateFeatureAccess(updated, updated.simulatedTime);
    const warnings = getConsistencyWarnings(updated);

    return res.status(200).json({
      success: true,
      data: {
        brokerState: updated,
        featureAccess,
        warnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const setSimulatedClock = async (req, res) => {
  try {
    const { simulatedTime } = req.body;
    if (!simulatedTime) {
      return res.status(400).json({ success: false, message: 'simulatedTime is required' });
    }

    const current = store.getBrokerState();
    const updated = store.updateBrokerState({
      ...current,
      simulatedTime,
    });

    const featureAccess = evaluateFeatureAccess(updated, simulatedTime);
    const warnings = getConsistencyWarnings(updated);

    store.logAction({
      action: 'CLOCK_ADVANCED',
      statusCode: 200,
      errorCode: 'NONE',
      message: `Simulated clock updated to ${new Date(simulatedTime).toLocaleString()}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        brokerState: updated,
        featureAccess,
        warnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const applyPreset = async (req, res) => {
  try {
    const { presetId } = req.params;
    const presets = store.getPresets();
    const foundPreset = presets.find((p) => p.id === presetId);

    if (!foundPreset) {
      return res.status(404).json({ success: false, message: 'Preset not found' });
    }

    const current = store.getBrokerState();
    const updated = store.updateBrokerState({
      ...current,
      baseSubscription: JSON.parse(JSON.stringify(foundPreset.state.baseSubscription)),
      proPlusAddon: JSON.parse(JSON.stringify(foundPreset.state.proPlusAddon)),
    });

    store.logAction({
      action: 'PRESET_APPLIED',
      statusCode: 200,
      errorCode: 'NONE',
      message: `Preset '${foundPreset.title}' applied to scenario.`,
    });

    const featureAccess = evaluateFeatureAccess(updated, updated.simulatedTime);
    const warnings = getConsistencyWarnings(updated);

    return res.status(200).json({
      success: true,
      data: {
        preset: foundPreset,
        brokerState: updated,
        featureAccess,
        warnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
