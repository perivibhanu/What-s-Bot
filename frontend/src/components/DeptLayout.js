import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Layout.css';

function DeptLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dept = localStorage.getItem('dept') || 'Department';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('dept');
    navigate('/dept-selection');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>🏛️ {dept} Admin</h2>
        </div>

        <div className="sidebar-menu">
          <Link to="/dept-dashboard" className={`menu-item ${isActive('/dept-dashboard')}`}>
            🏠 Dashboard
          </Link>

          <div className="menu-group">
            <h4 className="group-title">👩‍🎓 STUDENT MANAGEMENT</h4>
            <Link to="/students" className={`menu-item ${isActive('/students')}`}>
              👥 All Students
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">👨‍🏫 STAFF MANAGEMENT</h4>
            <Link to="/staff" className={`menu-item ${isActive('/staff')}`}>
              👔 All Staff
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">📚 ACADEMICS</h4>
            <Link to="/marks" className={`menu-item ${isActive('/marks')}`}>
              📊 Send Marks
            </Link>
            <Link to="/timetables" className={`menu-item ${isActive('/timetables')}`}>
              🕐 Upload Timetables
            </Link>
            <Link to="/attendance" className={`menu-item ${isActive('/attendance')}`}>
              📅 Update Attendance
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">🎓 PLACEMENT TRAINING</h4>
            <Link to="/placement-training" className={`menu-item ${isActive('/placement-training')}`}>
              💼 Placement Uploads
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">📢 CIRCULARS</h4>
            <Link to="/hod-circulars" className={`menu-item ${isActive('/hod-circulars')}`}>
              📄 HOD Circulars
            </Link>
            <Link to="/hod-parent-circulars" className={`menu-item ${isActive('/hod-parent-circulars')}`}>
              👨‍👩‍👧 Parents Circulars
            </Link>
            <Link to="/staff-messages" className={`menu-item ${isActive('/staff-messages')}`}>
              💬 Staff Messages
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">🏛️ DEPARTMENT INFO</h4>
            <Link to="/dept/media" className={`menu-item ${isActive('/dept/media')}`}>
              🎬 About Dept Media
            </Link>
          </div>

          <div className="menu-group" style={{ marginTop: 'auto' }}>
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>
      
      <main className="content">
        {children}
      </main>
      <img src="/spark-watermark.jpeg" alt="SPARK Watermark" className="watermark" />
    </div>
  );
}

export default DeptLayout;
