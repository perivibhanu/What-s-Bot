import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Layout.css';

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>🎓 Velammalitech Admin</h2>
        </div>

        <div className="sidebar-menu">
          <Link to="/" className={`menu-item ${isActive('/')}`}>
            🏠 Dashboard
          </Link>

          <div className="menu-group">
            <h4 className="group-title">👩‍🎓 STUDENT MANAGEMENT</h4>
            <Link to="/students" className={`menu-item ${isActive('/students')}`}>
              👥 All Students
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">📋 ADMISSIONS</h4>
            <Link to="/admissions" className={`menu-item ${isActive('/admissions')}`}>
              📝 Applications
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">👨‍🏫 STAFF MANAGEMENT</h4>
            <Link to="/staff" className={`menu-item ${isActive('/staff')}`}>
              👔 All Staff
            </Link>
            <Link to="/hostel-wardens" className={`menu-item ${isActive('/hostel-wardens')}`}>
              👨‍✈️ Hostel Warden
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">🚌 CAMPUS SERVICES</h4>
            <Link to="/transport" className={`menu-item ${isActive('/transport')}`}>
              🚐 Transportation
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">📢 COMMUNICATIONS</h4>
            <Link to="/circulars" className={`menu-item ${isActive('/circulars')}`}>
              📄 Principal Circulars
            </Link>
            <Link to="/parent-circulars" className={`menu-item ${isActive('/parent-circulars')}`}>
              👨‍👩‍👧 Parents Circulars
            </Link>
            <Link to="/fee-defaulters" className={`menu-item ${isActive('/fee-defaulters')}`}>
              ⚠️ Fee Defaulters
            </Link>
            <Link to="/staff-messages" className={`menu-item ${isActive('/staff-messages')}`}>
              💬 Staff Messages
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">🗣️ FEEDBACK</h4>
            <Link to="/feedback/hostel" className={`menu-item ${isActive('/feedback/hostel')}`}>
              🏠 Hostel
            </Link>
            <Link to="/feedback/issues" className={`menu-item ${isActive('/feedback/issues')}`}>
              🛠️ Issues
            </Link>
          </div>


          <div className="menu-group">
            <h4 className="group-title">🏫 COLLEGE INFO</h4>
            <Link to="/college-media" className={`menu-item ${isActive('/college-media')}`}>
              🎥 About College Media
            </Link>
          </div>

          <div className="menu-group">
            <h4 className="group-title">🏛️ DEPARTMENTS</h4>
            <Link to="/dept-selection" className={`menu-item ${isActive('/dept-selection')}`}>
              🔑 Dept Login
            </Link>
          </div>

          <div className="menu-group" style={{ marginTop: 'auto' }}>
            <Link to="/settings" className={`menu-item ${isActive('/settings')}`}>
              ⚙️ Settings
            </Link>
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

export default Layout;
