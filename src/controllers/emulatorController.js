import { store } from '../models/store.js';
import { processUserAction, evaluateFeatureAccess, getConsistencyWarnings } from '../rules/ruleEngine.js';

export const handleUserAction = async (req, res) => {
  try {
    const { actionType, payload } = req.body;
    if (!actionType) {
      return res.status(400).json({ success: false, message: 'actionType is required' });
    }

    const brokerState = store.getBrokerState();
    const catalogFlags = store.getCatalogFlags();
    const referenceTime = brokerState.simulatedTime || new Date().toISOString();

    const result = processUserAction(
      brokerState,
      actionType,
      payload || {},
      catalogFlags,
      referenceTime
    );

    // Apply updated state if action succeeded
    if (result.updatedState) {
      store.updateBrokerState(result.updatedState);
    }

    // Append to action log
    const logEntry = store.logAction({
      action: actionType,
      statusCode: result.statusCode,
      errorCode: result.errorCode,
      message: result.message,
      targetTab: result.targetTab || null,
      metadata: payload || {},
    });

    const updatedBrokerState = store.getBrokerState();
    const featureAccess = evaluateFeatureAccess(updatedBrokerState, referenceTime);
    const warnings = getConsistencyWarnings(updatedBrokerState);

    return res.status(result.statusCode === 200 ? 200 : result.statusCode).json({
      success: result.success,
      statusCode: result.statusCode,
      errorCode: result.errorCode,
      message: result.message,
      targetTab: result.targetTab || null,
      logEntry,
      data: {
        brokerState: updatedBrokerState,
        featureAccess,
        warnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getActionLogs = async (req, res) => {
  try {
    const logs = store.getActionLogs();
    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearActionLogs = async (req, res) => {
  try {
    store.clearLogs();
    return res.status(200).json({
      success: true,
      message: 'Action logs cleared.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
