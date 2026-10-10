import { store } from '../models/store.js';
import { sendOtpNotificationEmail } from '../utils/emailService.js';

export const getAdminDashboardStats = async (req, res) => {
  try {
    const plans = store.getPlans();
    const flags = store.getCatalogFlags();
    const presets = store.getPresets();
    const logs = store.getActionLogs();
    const brokerState = store.getBrokerState();
    const users = store.users;

    // Revenue Trend Analytics Data (Monthly MRR)
    const revenueTrend = [
      { month: 'May', baseDI: 42000, proPlus: 18000, combined: 65000, total: 125000 },
      { month: 'Jun', baseDI: 48000, proPlus: 22000, combined: 72000, total: 142000 },
      { month: 'Jul', baseDI: 54000, proPlus: 28000, combined: 88000, total: 170000 },
      { month: 'Aug', baseDI: 51000, proPlus: 32000, combined: 95000, total: 178000 },
      { month: 'Sep', baseDI: 62000, proPlus: 39000, combined: 112000, total: 213000 },
      { month: 'Oct', baseDI: 68000, proPlus: 45000, combined: 128000, total: 241000 },
    ];

    // Subscription Distribution Analytics
    const subscriptionDistribution = [
      { name: 'Combined Bundle (DI + Pro)', value: 48, color: '#6366f1' },
      { name: 'Direct Inventory Only', value: 32, color: '#3b82f6' },
      { name: 'Pro Plus Standalone', value: 14, color: '#f59e0b' },
      { name: 'Free / Trial Brokers', value: 6, color: '#94a3b8' },
    ];

    // Activity Stream Operations Bar Chart
    const activityTrend = [
      { day: 'Mon', unlocks: 42, upgrades: 12, cancels: 2 },
      { day: 'Tue', unlocks: 58, upgrades: 18, cancels: 1 },
      { day: 'Wed', unlocks: 64, upgrades: 22, cancels: 3 },
      { day: 'Thu', unlocks: 72, upgrades: 25, cancels: 2 },
      { day: 'Fri', unlocks: 89, upgrades: 31, cancels: 4 },
      { day: 'Sat', unlocks: 45, upgrades: 14, cancels: 1 },
      { day: 'Sun', unlocks: 38, upgrades: 9, cancels: 0 },
    ];

    return res.status(200).json({
      success: true,
      data: {
        totalPlans: plans.length,
        totalPresets: presets.length,
        totalActionLogs: logs.length,
        totalUsers: users.length,
        mrr: '₹2,41,000',
        mrrGrowth: '+14.8%',
        proPlusAttachRate: '68.4%',
        arpu: '₹2,450',
        catalogFlags: flags,
        brokerState,
        revenueTrend,
        subscriptionDistribution,
        activityTrend,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = store.users.map((u) => {
      // Determine active plan label
      let currentPlanLabel = 'No Active Plan (Free)';
      const base = u.brokerState?.baseSubscription;
      const pro = u.brokerState?.proPlusAddon;

      if (base?.active && pro?.active && pro?.isBundledWithDI) {
        currentPlanLabel = 'Combined DI + Pro Plus Bundle (₹2,699/mo)';
      } else if (base?.active) {
        if (base.accessSource === 'auto_pay') currentPlanLabel = 'Direct Inventory Auto-Pay (₹1,999/mo)';
        else if (base.accessSource === 'one_time') currentPlanLabel = 'Direct Inventory 3-Month Pack (₹5,499)';
        else currentPlanLabel = 'Direct Inventory Grant';
      } else if (pro?.active) {
        currentPlanLabel = 'Pro Plus Standalone Add-On (₹999/mo)';
      }

      return {
        id: u.id,
        name: u.name,
        company: u.company,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt || new Date().toISOString(),
        currentPlanLabel,
        brokerState: u.brokerState || store.getBrokerState(),
      };
    });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSystemSettings = async (req, res) => {
  try {
    const settings = store.getSystemSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSystemSettings = async (req, res) => {
  try {
    const newSettings = req.body;
    const updated = store.updateSystemSettings(newSettings);
    store.logAction({
      action: 'UPDATE_SYSTEM_SETTINGS',
      statusCode: 200,
      errorCode: 'NONE',
      message: 'SMTP & Payment Gateway settings updated by Super Admin.',
    });

    return res.status(200).json({
      success: true,
      message: 'System & Payment Gateway settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const testEmailConfig = async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const recipient = targetEmail || store.getSystemSettings()?.smtp?.smtpUser || 'globalinfotechindia07@gmail.com';
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await sendOtpNotificationEmail(recipient, randomOtp, 'Super Admin');

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Test OTP notification email sent successfully to ${recipient}! Message ID: ${result.messageId}`,
        otpCode: randomOtp,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Failed to send test OTP email: ${result.error}`,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetSimulatorSystem = async (req, res) => {
  try {
    store.reset();
    store.logAction({
      action: 'SYSTEM_RESET',
      statusCode: 200,
      errorCode: 'NONE',
      message: 'System reset to default initial state by Super Admin.',
    });

    return res.status(200).json({
      success: true,
      message: 'Simulator system reset to initial factory defaults.',
      data: {
        brokerState: store.getBrokerState(),
        catalogFlags: store.getCatalogFlags(),
        plans: store.getPlans(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

