const AdmissionApplication = require('../models/AdmissionApplication');

// GET /api/admissions — List all applications
exports.getAll = async (req, res) => {
  try {
    const { status, course, search } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (course && course !== 'all') {
      filter.$or = [
        { courseChoice1: course },
        { courseChoice2: course },
        { courseChoice3: course }
      ];
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchFilter = {
        $or: [
          { fullName: searchRegex },
          { applicationNumber: searchRegex },
          { mobile: searchRegex },
          { email: searchRegex }
        ]
      };
      // Merge with existing filter
      if (filter.$or) {
        // Already has $or from course filter, use $and
        const existing = { ...filter };
        delete existing.$or;
        Object.assign(filter, existing);
        filter.$and = [{ $or: filter.$or || [] }, searchFilter];
      } else {
        Object.assign(filter, searchFilter);
      }
    }

    const applications = await AdmissionApplication.find(filter).sort({ submittedAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching admissions:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// POST /api/admissions — Create a new application
exports.create = async (req, res) => {
  try {
    const newApp = new AdmissionApplication(req.body);
    const savedApp = await newApp.save();
    res.status(201).json({ application: savedApp });
  } catch (error) {
    console.error('Error saving admission application:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Application already exists with this data.' });
    }
    res.status(500).json({ error: 'Failed to save application' });
  }
};

// GET /api/admissions/stats
exports.getStats = async (req, res) => {
  try {
    const total = await AdmissionApplication.countDocuments();
    const submitted = await AdmissionApplication.countDocuments({ status: 'submitted' });
    const underReview = await AdmissionApplication.countDocuments({ status: 'under_review' });
    const approved = await AdmissionApplication.countDocuments({ status: 'approved' });
    const rejected = await AdmissionApplication.countDocuments({ status: 'rejected' });

    // Course-wise breakdown
    const courses = ['CSE', 'AIDS', 'ECE', 'EEE', 'IT', 'Mechanical', 'Mechatronics'];
    const courseStats = {};
    for (const course of courses) {
      courseStats[course] = await AdmissionApplication.countDocuments({ courseChoice1: course });
    }

    res.json({ total, submitted, underReview, approved, rejected, courseStats });
  } catch (error) {
    console.error('Error fetching admission stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/admissions/:id
exports.getById = async (req, res) => {
  try {
    const application = await AdmissionApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};

// PATCH /api/admissions/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await AdmissionApplication.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNotes: reviewNotes || '',
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// GET /api/admissions/export
exports.exportCSV = async (req, res) => {
  try {
    const applications = await AdmissionApplication.find().sort({ submittedAt: -1 });

    const headers = [
      'Application #', 'Full Name', 'Email', 'Mobile', 'WhatsApp', 'DOB', 'Gender', 'Community',
      'Parent Name', 'Parent Mobile',
      'Street', 'District', 'State', 'Pincode',
      '10th School', '10th Place', '10th Board', '10th %',
      '12th Reg No', '12th School', '12th Place', '12th Board', '12th Medium',
      'Maths', 'Physics', 'Chemistry', 'Cutoff',
      'Choice 1', 'Choice 2', 'Choice 3',
      'Status', 'Submitted At'
    ];

    const rows = applications.map(app => [
      app.applicationNumber, app.fullName, app.email, app.mobile, app.whatsappNumber,
      app.dateOfBirth, app.gender, app.community,
      app.parentName, app.parentMobile,
      app.address?.street, app.address?.district, app.address?.state, app.address?.pincode,
      app.tenthSchool, app.tenthPlace, app.tenthBoard, app.tenthPercentage,
      app.twelfthRegNumber, app.twelfthSchool, app.twelfthPlace, app.twelfthBoard, app.twelfthMedium,
      app.twelfthMaths, app.twelfthPhysics, app.twelfthChemistry, app.twelfthCutoff,
      app.courseChoice1, app.courseChoice2, app.courseChoice3,
      app.status, app.submittedAt?.toISOString()
    ]);

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=admissions_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting admissions:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
};

// DELETE /api/admissions/:id
exports.deleteApplication = async (req, res) => {
  try {
    const application = await AdmissionApplication.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json({ message: 'Application deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
};
