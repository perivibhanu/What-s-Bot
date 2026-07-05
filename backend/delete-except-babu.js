require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function deleteAllExceptBabu() {
  console.log('\n========================================');
  console.log('   DELETE ALL STUDENTS EXCEPT BABU (API MODE)');
  console.log('========================================\n');

  try {
    // Generate a valid token
    const token = jwt.sign({ id: 'system_script' }, process.env.JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}` };

    console.log('📡 Fetching all students from API...');
    const res = await axios.get('http://localhost:5000/api/students', { headers });
    const students = res.data;
    
    console.log(`📊 Found ${students.length} students total.`);

    // Find Babu
    const babu = students.find(s => s.name && s.name.toLowerCase().includes('babu'));

    if (!babu) {
      console.log('❌ Could not find student named "Babu". Aborting for safety.');
      process.exit(1);
    }

    console.log('\n🔒 Keeping this student SAFE:');
    console.log(`   Name    : ${babu.name}`);
    console.log(`   Reg No  : ${babu.regNumber}`);
    console.log(`   Branch  : ${babu.branch}`);
    console.log(`   ID      : ${babu._id}\n`);

    const studentsToDelete = students.filter(s => s._id !== babu._id);
    console.log(`🗑️  Will delete ${studentsToDelete.length} students...`);

    let deletedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < studentsToDelete.length; i++) {
      const student = studentsToDelete[i];
      try {
        await axios.delete(`http://localhost:5000/api/students/${student._id}`, { headers });
        deletedCount++;
        process.stdout.write(`\r✅ Deleted ${deletedCount}/${studentsToDelete.length}`);
      } catch (err) {
        failedCount++;
        console.error(`\n❌ Failed to delete ${student.name} (${student.regNumber}):`, err.response?.data?.error || err.message);
      }
    }

    console.log('\n\n✅ Deletion process complete!');
    console.log(`   Successfully deleted: ${deletedCount}`);
    console.log(`   Failed to delete    : ${failedCount}`);
    console.log(`   Remaining students  : 1 (Babu)\n`);

  } catch (err) {
    console.error('\n❌ Error:', err.response?.data?.error || err.message);
  }
}

deleteAllExceptBabu();
