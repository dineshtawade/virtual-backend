import bcrypt from 'bcryptjs';

const defaultBrokerState = {
  brokerId: 'broker-demo-1',
  name: 'Prime Realty Broker',
  simulatedTime: new Date().toISOString(),
  baseSubscription: {
    active: false,
    accessSource: 'none', // 'none' | 'one_time' | 'auto_pay' | 'admin_grant'
    expiresAt: null,
    autoPayActive: false,
    autoPayPendingCancellation: false,
    paidThroughAt: null,
  },
  proPlusAddon: {
    active: false,
    expiresAt: null,
    autoPayActive: false,
    isBundledWithDI: false,
    autoPayPendingCancellation: false,
  },
};

const defaultCatalogFlags = {
  proPlusAutoPayPlansAvailable: true,
  disallowExceedingOneTimeSkus: false,
  requireBaseSubForProPlus: true,
};

const defaultSystemSettings = {
  smtp: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'globalinfotechindia07@gmail.com',
    smtpPass: 'milp oeru ubrf grtm',
    enableOtpEmail: true,
  },
  paymentGateway: {
    provider: 'razorpay',
    razorpayKeyId: 'rzp_test_9876543210AB',
    razorpayKeySecret: 'sec_test_RazorpayKey9999',
    environment: 'test',
    currency: 'INR',
    enableAutoProration: true,
  },
};

const defaultAccessMatrix = {
  free: {
    tierKey: 'free',
    label: 'Free / Explorer Tier',
    canUnlockRegular: false,
    canUnlockExclusive: false,
    canViewFullPhotos: false,
    maxDailyUnlocks: 0,
    description: 'Default tier for non-subscribing brokers.',
  },
  baseDI: {
    tierKey: 'baseDI',
    label: 'Base Plan (Direct Inventory - DI)',
    canUnlockRegular: true,
    canUnlockExclusive: false,
    canViewFullPhotos: false,
    maxDailyUnlocks: 50,
    description: 'Requires active Direct Inventory base subscription.',
  },
  proPlus: {
    tierKey: 'proPlus',
    label: 'Pro Plus / Combined Tier',
    canUnlockRegular: true,
    canUnlockExclusive: true,
    canViewFullPhotos: true,
    maxDailyUnlocks: 999,
    description: 'Requires active Pro Plus add-on or Combined Bundle.',
  },
};

const defaultPlans = [
  {
    planId: 'di_auto_pay_monthly',
    category: 'DI_AUTO_PAY',
    label: 'Direct Inventory Base Plan',
    price: 1999,
    durationMonths: 1,
    isBasePlan: true,
    requiresBasePlan: false,
    features: [
      'Unlock Regular Owner Contacts',
      'Monthly Auto-Pay Subscription',
      'Pro Plus Add-On Ready',
    ],
    isActive: true,
  },
  {
    planId: 'di_one_time_quarterly',
    category: 'DI_ONE_TIME',
    label: 'Direct Inventory 3-Month Pass',
    price: 5499,
    durationMonths: 3,
    isBasePlan: true,
    requiresBasePlan: false,
    features: [
      'Unlock Regular Owner Contacts',
      'Fixed 3-Month Pack (No Auto-Renew)',
      'Pro Plus Add-On Ready',
    ],
    isActive: true,
  },
  {
    planId: 'pro_plus_auto_pay_monthly',
    category: 'PRO_PLUS_AUTO_PAY',
    label: 'Pro Plus Add-On Plan',
    price: 999,
    durationMonths: 1,
    isBasePlan: false,
    requiresBasePlan: true,
    features: [
      'Unlock Exclusive Prime Listings',
      'Full HD Photo Gallery Unlocked',
      'Requires Active DI Base Plan',
    ],
    isActive: true,
  },
  {
    planId: 'pro_plus_one_time_monthly',
    category: 'PRO_PLUS_ONE_TIME',
    label: 'Pro Plus 1-Month Pack',
    price: 1199,
    durationMonths: 1,
    isBasePlan: false,
    requiresBasePlan: true,
    features: [
      'Fixed 1-Month Pro Plus Add-On',
      'Exclusive Inventory Access',
      'Capped to Base Plan Expiry Date',
    ],
    isActive: true,
  },
  {
    planId: 'combined_di_pro_plus_auto_pay',
    category: 'COMBINED_AUTO_PAY',
    label: 'Combined DI + Pro Plus Pack',
    primaryPlanId: 'di_auto_pay_monthly',
    addonPlanId: 'pro_plus_auto_pay_monthly',
    combinedPrice: 2699,
    price: 2699,
    durationMonths: 1,
    isBasePlan: true,
    requiresBasePlan: false,
    isRecommended: true,
    features: [
      'All Direct Inventory Base Contacts',
      'Exclusive Listing Unlocks',
      'Full HD Photo Access Unlocked',
      'Save 15% Monthly Bundle Special',
    ],
    isActive: true,
  },
];

const defaultPresets = [
  {
    id: 'preset_new_broker',
    title: 'New broker — no DI',
    description: 'Broker has no active base subscription or add-ons.',
    state: {
      baseSubscription: {
        active: false,
        accessSource: 'none',
        expiresAt: null,
        autoPayActive: false,
        autoPayPendingCancellation: false,
        paidThroughAt: null,
      },
      proPlusAddon: {
        active: false,
        expiresAt: null,
        autoPayActive: false,
        isBundledWithDI: false,
        autoPayPendingCancellation: false,
      },
    },
  },
  {
    id: 'preset_di_autopay_midcycle',
    title: 'DI auto-pay mid-cycle — no Pro Plus',
    description: 'Broker has active DI auto-pay with 15 days paid through.',
    state: {
      baseSubscription: {
        active: true,
        accessSource: 'auto_pay',
        expiresAt: null,
        autoPayActive: true,
        autoPayPendingCancellation: false,
        paidThroughAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      proPlusAddon: {
        active: false,
        expiresAt: null,
        autoPayActive: false,
        isBundledWithDI: false,
        autoPayPendingCancellation: false,
      },
    },
  },
  {
    id: 'preset_di_onetime_12days',
    title: 'DI one-time — 12 days left — no Pro Plus',
    description: 'Broker has active one-time DI subscription expiring in 12 days.',
    state: {
      baseSubscription: {
        active: true,
        accessSource: 'one_time',
        expiresAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        autoPayActive: false,
        autoPayPendingCancellation: false,
        paidThroughAt: null,
      },
      proPlusAddon: {
        active: false,
        expiresAt: null,
        autoPayActive: false,
        isBundledWithDI: false,
        autoPayPendingCancellation: false,
      },
    },
  },
  {
    id: 'preset_bundled_active',
    title: 'Bundled DI + Pro Plus Auto-Pay Active',
    description: 'Broker has active combined auto-pay for both DI and Pro Plus.',
    state: {
      baseSubscription: {
        active: true,
        accessSource: 'auto_pay',
        expiresAt: null,
        autoPayActive: true,
        autoPayPendingCancellation: false,
        paidThroughAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      proPlusAddon: {
        active: true,
        expiresAt: null,
        autoPayActive: true,
        isBundledWithDI: true,
        autoPayPendingCancellation: false,
      },
    },
  },
];

const defaultProperties = [
  {
    id: 'prop-100',
    title: '1 BHK Compact Studio in Vashi',
    location: 'Sector 17, Vashi, Navi Mumbai',
    price: '₹35.00 Lac',
    category: 'Apartment',
    planAccess: 'free', // 'free' | 'base' | 'pro'
    type: 'free',
    isExclusive: false,
    isFree: true,
    ownerName: 'Sunita Patil (Direct Owner)',
    ownerContact: '+91 98700 11223',
    thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
    fullPhotos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=90',
    ],
    description: 'Free Tier Listing — Unlocked for all users. Ideal for entry-level buyers.',
    postedBy: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prop-101',
    title: '3 BHK Luxury Apartment in Seawoods',
    location: 'Sector 44, Seawoods, Navi Mumbai',
    price: '₹1.85 Cr',
    category: 'Apartment',
    planAccess: 'base',
    type: 'base',
    isExclusive: false,
    isFree: false,
    ownerName: 'Ramesh Sharma (Direct Owner)',
    ownerContact: '+91 98201 44512',
    thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
    fullPhotos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=90',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=90',
    ],
    description: 'Base Plan Listing — Requires active Direct Inventory (DI) Base Subscription.',
    postedBy: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prop-102',
    title: 'Exclusive Sea-Facing Prime Villa',
    location: 'Palm Beach Road, Nerul, Navi Mumbai',
    price: '₹5.50 Cr',
    category: 'Villa',
    planAccess: 'pro',
    type: 'pro',
    isExclusive: true,
    isFree: false,
    ownerName: 'Vikramaditya Roy (Direct Owner)',
    ownerContact: '+91 99870 12345',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
    fullPhotos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=90',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=90',
    ],
    description: 'Pro Plan Exclusive Listing — Requires Pro Plus Add-On or Combined Pack.',
    postedBy: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prop-103',
    title: 'Commercial Office Space in Hiranandani',
    location: 'Hiranandani Business Park, Powai, Mumbai',
    price: '₹2.75 Cr',
    category: 'Commercial',
    planAccess: 'base',
    type: 'base',
    isExclusive: false,
    isFree: false,
    ownerName: 'Sunil Mehta (Direct Builder)',
    ownerContact: '+91 98112 33445',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    fullPhotos: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=90',
    ],
    description: 'Base Plan Listing — Fully furnished 1,400 sq.ft office space for IT or finance firm.',
    postedBy: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prop-104',
    title: 'Penthouse with Private Sky Deck',
    location: 'Bandra West, Mumbai',
    price: '₹12.00 Cr',
    category: 'Penthouse',
    planAccess: 'pro',
    type: 'pro',
    isExclusive: true,
    isFree: false,
    ownerName: 'Ananya Singhania (Direct Owner)',
    ownerContact: '+91 97690 99887',
    thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    fullPhotos: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=90',
    ],
    description: 'Pro Plan Exclusive Listing — Bespoke 4 BHK penthouse offering 360-degree panoramic skyline views.',
    postedBy: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
];

class MemoryStore {
  constructor() {
    this.brokerState = JSON.parse(JSON.stringify(defaultBrokerState));
    this.catalogFlags = JSON.parse(JSON.stringify(defaultCatalogFlags));
    this.systemSettings = JSON.parse(JSON.stringify(defaultSystemSettings));
    this.accessMatrix = JSON.parse(JSON.stringify(defaultAccessMatrix));
    this.plans = JSON.parse(JSON.stringify(defaultPlans));
    this.presets = JSON.parse(JSON.stringify(defaultPresets));
    this.properties = JSON.parse(JSON.stringify(defaultProperties));
    this.actionLogs = [];
    this.users = [];

    this.seedDefaultUsers();
  }

  seedDefaultUsers() {
    const salt = bcrypt.genSaltSync(10);

    const adminPasswordHash = bcrypt.hashSync('AdminPassword123!', salt);
    this.users.push({
      id: 'usr_admin_1',
      name: 'Super Admin',
      company: 'BrokerSim HQ',
      email: 'admin@brokersim.com',
      passwordHash: adminPasswordHash,
      role: 'superadmin',
      createdAt: new Date().toISOString(),
    });

    const brokerPasswordHash = bcrypt.hashSync('BrokerPassword123!', salt);
    this.users.push({
      id: 'usr_broker_1',
      name: 'Rohan Sharma (Prime Realty)',
      company: 'Prime Realty Broker',
      email: 'broker@prime-realty.com',
      passwordHash: brokerPasswordHash,
      role: 'broker',
      brokerState: JSON.parse(JSON.stringify(defaultBrokerState)),
      createdAt: new Date().toISOString(),
    });
  }

  findUserByEmail(email) {
    if (!email) return null;
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.users.find((u) => u.id === id);
  }

  createUser({ name, company, email, password, role = 'broker', initialPlan = 'none' }) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUserState = JSON.parse(JSON.stringify(defaultBrokerState));

    if (initialPlan === 'di_auto_pay' || initialPlan === 'di_auto_pay_monthly') {
      const paidThrough = new Date();
      paidThrough.setMonth(paidThrough.getMonth() + 1);
      newUserState.baseSubscription.active = true;
      newUserState.baseSubscription.accessSource = 'auto_pay';
      newUserState.baseSubscription.autoPayActive = true;
      newUserState.baseSubscription.paidThroughAt = paidThrough.toISOString();
    } else if (initialPlan === 'combined_auto_pay' || initialPlan === 'combined_di_pro_plus_auto_pay') {
      const paidThrough = new Date();
      paidThrough.setMonth(paidThrough.getMonth() + 1);
      newUserState.baseSubscription.active = true;
      newUserState.baseSubscription.accessSource = 'auto_pay';
      newUserState.baseSubscription.autoPayActive = true;
      newUserState.baseSubscription.paidThroughAt = paidThrough.toISOString();

      newUserState.proPlusAddon.active = true;
      newUserState.proPlusAddon.autoPayActive = true;
      newUserState.proPlusAddon.isBundledWithDI = true;
    }

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      company,
      email: email.toLowerCase(),
      passwordHash,
      role,
      brokerState: newUserState,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    return newUser;
  }

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.passwordHash);
  }

  getBrokerState() {
    return this.brokerState;
  }

  updateBrokerState(newState) {
    this.brokerState = { ...this.brokerState, ...newState };
    return this.brokerState;
  }

  getCatalogFlags() {
    return this.catalogFlags;
  }

  updateCatalogFlags(newFlags) {
    this.catalogFlags = { ...this.catalogFlags, ...newFlags };
    return this.catalogFlags;
  }

  getSystemSettings() {
    return this.systemSettings;
  }

  updateSystemSettings(newSettings) {
    this.systemSettings = {
      smtp: { ...this.systemSettings.smtp, ...(newSettings.smtp || {}) },
      paymentGateway: { ...this.systemSettings.paymentGateway, ...(newSettings.paymentGateway || {}) },
    };
    return this.systemSettings;
  }

  getAccessMatrix() {
    return this.accessMatrix;
  }

  updateAccessMatrix(newMatrix) {
    this.accessMatrix = { ...this.accessMatrix, ...newMatrix };
    return this.accessMatrix;
  }

  getPlans() {
    return this.plans;
  }

  addOrUpdatePlan(plan) {
    const idx = this.plans.findIndex((p) => p.planId === plan.planId);
    if (idx >= 0) {
      this.plans[idx] = { ...this.plans[idx], ...plan };
    } else {
      this.plans.push(plan);
    }
    return this.plans;
  }

  getPresets() {
    return this.presets;
  }

  getActionLogs() {
    return this.actionLogs;
  }

  logAction(entry) {
    const logItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      action: entry.action,
      statusCode: entry.statusCode,
      errorCode: entry.errorCode,
      message: entry.message,
      targetTab: entry.targetTab || null,
      metadata: entry.metadata || {},
    };
    this.actionLogs.unshift(logItem);
    if (this.actionLogs.length > 100) this.actionLogs.pop();
    return logItem;
  }

  clearLogs() {
    this.actionLogs = [];
  }

  getProperties() {
    return this.properties;
  }

  addProperty(propertyData) {
    const targetPlans = Array.isArray(propertyData.targetPlans) && propertyData.targetPlans.length > 0
      ? propertyData.targetPlans
      : [propertyData.planAccess || propertyData.type || 'base'];

    const planAccess = targetPlans.includes('pro') ? 'pro' : targetPlans.includes('base') ? 'base' : 'free';
    const isFree = targetPlans.includes('free');
    const isExclusive = targetPlans.includes('pro');

    const newProp = {
      id: `prop-${Date.now()}`,
      title: propertyData.title || 'Untitled Property',
      location: propertyData.location || 'Location Not Specified',
      price: propertyData.price || 'Price on Request',
      category: propertyData.category || 'Apartment',
      targetPlans,
      planAccess,
      type: planAccess,
      isFree,
      isExclusive,
      bhk: propertyData.bhk || '3 BHK',
      bathrooms: propertyData.bathrooms || '2',
      carpetArea: propertyData.carpetArea || '1,200 sq.ft',
      furnishing: propertyData.furnishing || 'Semi-Furnished',
      ownerName: propertyData.ownerName || 'Direct Owner',
      ownerContact: propertyData.ownerContact || '+91 99000 00000',
      thumbnail: propertyData.thumbnail || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
      fullPhotos: propertyData.fullPhotos && propertyData.fullPhotos.length > 0
        ? propertyData.fullPhotos
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=90'],
      description: propertyData.description || 'No description provided.',
      postedBy: 'Super Admin',
      createdAt: new Date().toISOString(),
    };
    this.properties.unshift(newProp);
    return newProp;
  }

  updateProperty(id, updateData) {
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const targetPlans = Array.isArray(updateData.targetPlans) && updateData.targetPlans.length > 0
        ? updateData.targetPlans
        : this.properties[idx].targetPlans || [updateData.planAccess || 'base'];

      const planAccess = targetPlans.includes('pro') ? 'pro' : targetPlans.includes('base') ? 'base' : 'free';
      const isFree = targetPlans.includes('free');
      const isExclusive = targetPlans.includes('pro');

      this.properties[idx] = {
        ...this.properties[idx],
        ...updateData,
        targetPlans,
        planAccess,
        type: planAccess,
        isFree,
        isExclusive,
      };
      return this.properties[idx];
    }
    return null;
  }

  deleteProperty(id) {
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const removed = this.properties.splice(idx, 1);
      return removed[0];
    }
    return null;
  }

  reset() {
    this.brokerState = JSON.parse(JSON.stringify(defaultBrokerState));
    this.catalogFlags = JSON.parse(JSON.stringify(defaultCatalogFlags));
    this.systemSettings = JSON.parse(JSON.stringify(defaultSystemSettings));
    this.accessMatrix = JSON.parse(JSON.stringify(defaultAccessMatrix));
    this.plans = JSON.parse(JSON.stringify(defaultPlans));
    this.properties = JSON.parse(JSON.stringify(defaultProperties));
    this.actionLogs = [];
    this.users = [];
    this.seedDefaultUsers();
  }
}

export const store = new MemoryStore();
