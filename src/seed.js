import dotenv from 'dotenv';
import { store } from './models/store.js';

dotenv.config();

console.log('🌱 Seeding Super Admin Data & System Defaults...');

// Reset memory store & seed default users
store.reset();

const plans = store.getPlans();
const flags = store.getCatalogFlags();
const presets = store.getPresets();

console.log(`✅ Seeded ${store.users.length} Users:`);
store.users.forEach((u) => {
  console.log(`   - [${u.role.toUpperCase()}] ${u.name} (${u.email})`);
});

console.log(`✅ Seeded ${plans.length} Catalog Plans`);
console.log(`✅ Seeded Catalog Flags:`, flags);
console.log(`✅ Seeded ${presets.length} Quick Presets`);

console.log('\n🎉 Super Admin & Demo Data Seeding Completed Successfully!\n');
