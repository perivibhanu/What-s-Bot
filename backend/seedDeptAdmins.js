const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const DeptAdmin = require('./models/DeptAdmin');

const departments = [
  { name: 'AIDS', username: 'aids_admin' },
  { name: 'CSE', username: 'cse_admin' },
  { name: 'ECE', username: 'ece_admin' },
  { name: 'EEE', username: 'eee_admin' },
  { name: 'IT', username: 'it_admin' },
  { name: 'Mechanical', username: 'mech_admin' },
  { name: 'Mechatronics', username: 'mecha_admin' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    for (const dept of departments) {
      const existing = await DeptAdmin.findOne({ department: dept.name });
      if (!existing) {
        await DeptAdmin.create({
          department: dept.name,
          username: dept.username,
          password: 'password123' // default password
        });
        console.log(`Created account for ${dept.name}`);
      } else {
        console.log(`Account for ${dept.name} already exists`);
      }
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
