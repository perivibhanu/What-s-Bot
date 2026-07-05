import React, { useEffect, useState } from 'react';

import axios from 'axios';
import DeptLayout from '../components/DeptLayout';
import '../styles/Dashboard.css'; // Reusing dashboard styles

function DeptDashboard() {

  const dept = localStorage.getItem('dept');
  const [stats, setStats] = useState({ total: 0, registered: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/students', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter by the current department
        const deptStudents = res.data.filter(s => s.branch === dept);
        
        setStats({
          total: deptStudents.length,
          registered: deptStudents.filter(s => s.isRegistered).length
        });
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchStats();
    // Auto-refresh every 30 seconds for always-open displays
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [dept]);

  return (
    <DeptLayout>
      <div style={{ marginBottom: '2rem' }}>
        <h1>🏛️ {dept} Department Dashboard</h1>
        <p style={{ color: '#64748b' }}>Overview of {dept} department statistics.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total {dept} Students</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Registered on WhatsApp</h3>
          <p>{stats.registered}</p>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem', background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Quick Actions</h2>
        <p style={{ marginTop: '1rem', color: '#64748b', lineHeight: '1.6' }}>
          Use the sidebar to navigate to:
        </p>
        <ul style={{ marginTop: '1rem', marginLeft: '1.5rem', color: '#475569', lineHeight: '1.8' }}>
          <li><strong>Send Marks:</strong> Broadcast exam results to {dept} students.</li>
          <li><strong>Upload Timetables:</strong> Send class schedules.</li>
          <li><strong>Update Attendance:</strong> Bulk update attendance percentages.</li>
          <li><strong>Placement Training:</strong> Upload and send placement materials.</li>
          <li><strong>HOD Circulars:</strong> Issue official circulars for the {dept} department.</li>
        </ul>
      </div>
    </DeptLayout>
  );
}

export default DeptDashboard;
