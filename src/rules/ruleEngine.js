import { store } from '../models/store.js';

export const isFutureDate = (targetDate, referenceDate) => {
  if (!targetDate) return false;
  return new Date(targetDate).getTime() > new Date(referenceDate).getTime();
};

export const evaluateDiAccess = (brokerState, referenceTime = new Date()) => {
  const refTime = new Date(referenceTime);
  const { baseSubscription } = brokerState;

  if (!baseSubscription) return false;

  const { active, autoPayActive, expiresAt } = baseSubscription;

  if (!active) return false;

  if (autoPayActive) return true;

  if (expiresAt && isFutureDate(expiresAt, refTime)) {
    return true;
  }

  return false;
};

export const evaluateProPlusAccess = (brokerState, referenceTime = new Date()) => {
  const refTime = new Date(referenceTime);
  const { proPlusAddon } = brokerState;

  if (!proPlusAddon) return false;

  const { active, autoPayActive, expiresAt } = proPlusAddon;

  if (!active) return false;

  if (autoPayActive) return true;

  if (expiresAt && isFutureDate(expiresAt, refTime)) {
    return true;
  }

  return false;
};

// Feature Access Evaluations with Dynamic Super Admin Access Matrix
export const evaluateFeatureAccess = (brokerState, referenceTime = new Date()) => {
  const isDiActive = evaluateDiAccess(brokerState, referenceTime);
  const isProPlusActive = evaluateProPlusAccess(brokerState, referenceTime);

  const matrix = store.getAccessMatrix();

  // Determine active tier permissions
  let tierPermissions = matrix.free;
  if (isDiActive && isProPlusActive) {
    tierPermissions = matrix.proPlus;
  } else if (isDiActive) {
    tierPermissions = matrix.baseDI;
  } else if (isProPlusActive) {
    tierPermissions = matrix.proPlus;
  }

  return {
    isDiActive,
    isProPlusActive,
    canUnlockRegular: tierPermissions.canUnlockRegular,
    canUnlockExclusive: tierPermissions.canUnlockExclusive,
    canViewFullPhotos: tierPermissions.canViewFullPhotos,
    maxDailyUnlocks: tierPermissions.maxDailyUnlocks,
    activeTierLabel: tierPermissions.label,
  };
};

export const getConsistencyWarnings = (brokerState) => {
  const warnings = [];
  const { baseSubscription, proPlusAddon } = brokerState;

  if (!baseSubscription) return warnings;

  const { accessSource, active, expiresAt, autoPayActive, paidThroughAt } = baseSubscription;

  if (accessSource === 'none') {
    if (active) {
      warnings.push({
        field: 'accessSource',
        code: 'WARN_SOURCE_NONE_ACTIVE',
        message: 'Access source is "none" but DI access is toggled ON.',
      });
    }
    if (expiresAt) {
      warnings.push({
        field: 'expiresAt',
        code: 'WARN_SOURCE_NONE_EXPIRY',
        message: 'Access source is "none" but DI expires_at is set.',
      });
    }
  }

  if (accessSource === 'auto_pay') {
    if (!autoPayActive) {
      warnings.push({
        field: 'autoPayActive',
        code: 'WARN_AUTO_PAY_INCONSISTENT',
        message: 'Access source is "auto_pay" but auto-pay switch is OFF.',
      });
    }
    if (!paidThroughAt) {
      warnings.push({
        field: 'paidThroughAt',
        code: 'WARN_NO_PAID_THROUGH',
        message: 'Auto-pay active but paid_through_at date is not specified.',
      });
    }
  }

  if (accessSource === 'one_time') {
    if (autoPayActive) {
      warnings.push({
        field: 'autoPayActive',
        code: 'WARN_ONE_TIME_AUTOPAY',
        message: 'Access source is "one_time" but auto-pay is enabled.',
      });
    }
    if (!expiresAt) {
      warnings.push({
        field: 'expiresAt',
        code: 'WARN_ONE_TIME_NO_EXPIRY',
        message: 'Access source is "one_time" but expires_at date is missing.',
      });
    }
  }

  if (proPlusAddon?.isBundledWithDI && !autoPayActive) {
    warnings.push({
      field: 'isBundledWithDI',
      code: 'WARN_BUNDLED_WITHOUT_DI_AUTOPAY',
      message: 'Pro Plus marked as bundled, but Direct Inventory auto-pay is not active.',
    });
  }

  return warnings;
};

export const processUserAction = (brokerState, actionType, payload = {}, catalogFlags = {}, referenceTime = new Date()) => {
  const refTime = new Date(referenceTime);
  const featureAccess = evaluateFeatureAccess(brokerState, refTime);
  const updatedState = JSON.parse(JSON.stringify(brokerState));

  switch (actionType) {
    case 'UNLOCK_REGULAR_LISTING': {
      if (!featureAccess.canUnlockRegular) {
        return {
          success: false,
          statusCode: 403,
          errorCode: 'DI_REQUIRED',
          message: 'Owner subscription (DI) required to unlock contact details for this listing.',
          updatedState: brokerState,
        };
      }
      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: 'Regular inventory contact details unlocked successfully.',
        updatedState,
      };
    }

    case 'UNLOCK_EXCLUSIVE_LISTING': {
      if (!featureAccess.isDiActive) {
        return {
          success: false,
          statusCode: 403,
          errorCode: 'DI_REQUIRED',
          message: 'Owner subscription (DI) base plan required before exclusive inventory unlock.',
          targetTab: 'owner_subscription',
          updatedState: brokerState,
        };
      }
      if (!featureAccess.canUnlockExclusive) {
        return {
          success: false,
          statusCode: 403,
          errorCode: 'PRO_PLUS_REQUIRED',
          message: 'Pro Plus add-on required for exclusive inventory unlock.',
          targetTab: 'addons',
          updatedState: brokerState,
        };
      }
      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: 'Exclusive inventory contact details unlocked successfully.',
        updatedState,
      };
    }

    case 'OPEN_FULL_PHOTO': {
      if (!featureAccess.canViewFullPhotos) {
        return {
          success: false,
          statusCode: 403,
          errorCode: 'PRO_PLUS_MEDIA_LOCKED',
          message: 'Upgrade to Pro Plus to view full-resolution listing photos.',
          targetTab: 'addons',
          updatedState: brokerState,
        };
      }
      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: 'Full-resolution photos unlocked successfully.',
        updatedState,
      };
    }

    case 'PURCHASE_DI_ONE_TIME': {
      const durationMonths = payload.durationMonths || 1;
      const currentExpiry = updatedState.baseSubscription.expiresAt && isFutureDate(updatedState.baseSubscription.expiresAt, refTime)
        ? new Date(updatedState.baseSubscription.expiresAt)
        : new Date(refTime);

      currentExpiry.setMonth(currentExpiry.getMonth() + durationMonths);

      updatedState.baseSubscription.active = true;
      updatedState.baseSubscription.accessSource = 'one_time';
      updatedState.baseSubscription.expiresAt = currentExpiry.toISOString();
      updatedState.baseSubscription.autoPayActive = false;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: `Direct Inventory one-time pack activated. Valid until ${currentExpiry.toLocaleDateString()}.`,
        updatedState,
      };
    }

    case 'START_DI_AUTO_PAY': {
      const paidThrough = new Date(refTime);
      paidThrough.setMonth(paidThrough.getMonth() + 1);

      updatedState.baseSubscription.active = true;
      updatedState.baseSubscription.accessSource = 'auto_pay';
      updatedState.baseSubscription.autoPayActive = true;
      updatedState.baseSubscription.paidThroughAt = paidThrough.toISOString();
      updatedState.baseSubscription.autoPayPendingCancellation = false;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: `Direct Inventory auto-pay started. Next billing cycle: ${paidThrough.toLocaleDateString()}.`,
        updatedState,
      };
    }

    case 'CANCEL_DI_AUTO_PAY': {
      if (!updatedState.baseSubscription.autoPayActive) {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'NO_ACTIVE_AUTOPAY',
          message: 'No active Direct Inventory auto-pay subscription to cancel.',
          updatedState: brokerState,
        };
      }

      updatedState.baseSubscription.autoPayPendingCancellation = true;
      if (updatedState.proPlusAddon.isBundledWithDI) {
        updatedState.proPlusAddon.autoPayPendingCancellation = true;
      }

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: 'Direct Inventory auto-pay set to pending cancellation at end of billing cycle.',
        updatedState,
      };
    }

    case 'PURCHASE_PRO_PLUS_ONE_TIME': {
      if (!featureAccess.isDiActive) {
        return {
          success: false,
          statusCode: 403,
          errorCode: 'DI_REQUIRED',
          message: 'Direct Inventory base plan required before purchasing Pro Plus add-on.',
          targetTab: 'owner_subscription',
          updatedState: brokerState,
        };
      }

      const durationMonths = payload.durationMonths || 1;
      const requestedExpiry = new Date(refTime);
      requestedExpiry.setMonth(requestedExpiry.getMonth() + durationMonths);

      const diExpiresAt = updatedState.baseSubscription.expiresAt
        ? new Date(updatedState.baseSubscription.expiresAt)
        : null;

      if (updatedState.baseSubscription.accessSource === 'one_time' && diExpiresAt) {
        if (requestedExpiry > diExpiresAt) {
          if (catalogFlags.disallowExceedingOneTimeSkus) {
            return {
              success: false,
              statusCode: 400,
              errorCode: 'EXCEEDS_DI_EXPIRY',
              message: `Cannot purchase Pro Plus pack exceeding Direct Inventory expiry (${diExpiresAt.toLocaleDateString()}).`,
              updatedState: brokerState,
            };
          }
          updatedState.proPlusAddon.expiresAt = diExpiresAt.toISOString();
        } else {
          updatedState.proPlusAddon.expiresAt = requestedExpiry.toISOString();
        }
      } else {
        updatedState.proPlusAddon.expiresAt = requestedExpiry.toISOString();
      }

      updatedState.proPlusAddon.active = true;
      updatedState.proPlusAddon.autoPayActive = false;
      updatedState.proPlusAddon.isBundledWithDI = false;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: `Pro Plus one-time pack activated until ${new Date(updatedState.proPlusAddon.expiresAt).toLocaleDateString()}.`,
        updatedState,
      };
    }

    case 'START_STANDALONE_PRO_PLUS_AUTO_PAY': {
      if (catalogFlags.proPlusAutoPayPlansAvailable === false) {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'PRO_PLUS_AUTOPAY_UNAVAILABLE',
          message: 'Standalone Pro Plus auto-pay plans are currently disabled in catalog.',
          updatedState: brokerState,
        };
      }

      if (!featureAccess.isDiActive) {
        return {
          success: false,
          statusCode: 403,
          errorCode: 'DI_REQUIRED',
          message: 'Direct Inventory base plan required before starting Pro Plus auto-pay.',
          targetTab: 'owner_subscription',
          updatedState: brokerState,
        };
      }

      updatedState.proPlusAddon.active = true;
      updatedState.proPlusAddon.autoPayActive = true;
      updatedState.proPlusAddon.isBundledWithDI = false;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: 'Standalone Pro Plus auto-pay subscription activated.',
        updatedState,
      };
    }

    case 'BUNDLE_UPGRADE': {
      if (!updatedState.baseSubscription.autoPayActive) {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'DI_AUTOPAY_REQUIRED',
          message: 'Bundle upgrade requires an active Direct Inventory auto-pay plan.',
          updatedState: brokerState,
        };
      }

      if (updatedState.baseSubscription.autoPayPendingCancellation) {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'DI_AUTOPAY_PENDING_CANCEL',
          message: 'Cannot upgrade bundle while Direct Inventory auto-pay cancellation is pending.',
          updatedState: brokerState,
        };
      }

      const proPlusPrice = payload.proPlusMonthlyPrice || 999;
      const paidThrough = new Date(updatedState.baseSubscription.paidThroughAt || refTime);
      const remainingDays = Math.max(1, Math.ceil((paidThrough - refTime) / (1000 * 60 * 60 * 24)));
      const proratedProPlus = Math.round((proPlusPrice / 30) * remainingDays);

      updatedState.proPlusAddon.active = true;
      updatedState.proPlusAddon.autoPayActive = true;
      updatedState.proPlusAddon.isBundledWithDI = true;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: `Upgraded to Combined DI + Pro Plus. Charged ₹${proratedProPlus} prorated Pro Plus today. Recurring combined rate applies on ${paidThrough.toLocaleDateString()}.`,
        updatedState,
      };
    }

    case 'ALIGN_AUTO_PAY': {
      if (updatedState.baseSubscription.accessSource !== 'one_time') {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'DI_ONE_TIME_REQUIRED',
          message: 'Align auto-pay applies when Direct Inventory is on an active one-time plan.',
          updatedState: brokerState,
        };
      }

      const diExpiry = new Date(updatedState.baseSubscription.expiresAt || refTime);
      const daysUntilExpiry = Math.max(1, Math.ceil((diExpiry - refTime) / (1000 * 60 * 60 * 24)));
      const proPlusPrice = payload.proPlusMonthlyPrice || 999;
      const proratedProPlus = Math.round((proPlusPrice / 30) * daysUntilExpiry);

      updatedState.proPlusAddon.active = true;
      updatedState.proPlusAddon.autoPayActive = true;
      updatedState.proPlusAddon.isBundledWithDI = true;

      updatedState.baseSubscription.autoPayActive = true;
      updatedState.baseSubscription.paidThroughAt = diExpiry.toISOString();

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: `Aligned auto-pay scheduled. Charged ₹${proratedProPlus} prorated Pro Plus until DI expiry (${diExpiry.toLocaleDateString()}), then full combined auto-pay starts.`,
        updatedState,
      };
    }

    case 'NEW_SUBSCRIBER_BUNDLED_CHECKOUT': {
      const paidThrough = new Date(refTime);
      paidThrough.setMonth(paidThrough.getMonth() + 1);

      updatedState.baseSubscription.active = true;
      updatedState.baseSubscription.accessSource = 'auto_pay';
      updatedState.baseSubscription.autoPayActive = true;
      updatedState.baseSubscription.paidThroughAt = paidThrough.toISOString();

      updatedState.proPlusAddon.active = true;
      updatedState.proPlusAddon.autoPayActive = true;
      updatedState.proPlusAddon.isBundledWithDI = true;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: `Combined DI + Pro Plus auto-pay activated! Next billing date: ${paidThrough.toLocaleDateString()}.`,
        updatedState,
      };
    }

    case 'CANCEL_PRO_PLUS_AUTO_PAY': {
      if (!updatedState.proPlusAddon.autoPayActive) {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'NO_ACTIVE_PRO_PLUS_AUTOPAY',
          message: 'No active Pro Plus auto-pay to cancel.',
          updatedState: brokerState,
        };
      }

      if (updatedState.proPlusAddon.isBundledWithDI) {
        return {
          success: false,
          statusCode: 400,
          errorCode: 'CANNOT_CANCEL_BUNDLED_PRO_PLUS',
          message: 'Pro Plus is bundled with Direct Inventory auto-pay. Cancel your base subscription to modify billing.',
          updatedState: brokerState,
        };
      }

      updatedState.proPlusAddon.autoPayActive = false;
      updatedState.proPlusAddon.autoPayPendingCancellation = true;

      return {
        success: true,
        statusCode: 200,
        errorCode: 'NONE',
        message: 'Standalone Pro Plus auto-pay cancelled.',
        updatedState,
      };
    }

    default:
      return {
        success: false,
        statusCode: 400,
        errorCode: 'UNKNOWN_ACTION',
        message: `Action '${actionType}' is not recognized by rule engine.`,
        updatedState: brokerState,
      };
  }
};
