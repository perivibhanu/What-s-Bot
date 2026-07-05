import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DeptSelection.css';

const departments = [
  { id: 'AIDS', name: 'Artificial Intelligence & Data Science', icon: '🤖' },
  { id: 'CSE', name: 'Computer Science Engineering', icon: '💻' },
  { id: 'ECE', name: 'Electronics & Communication', icon: '📡' },
  { id: 'EEE', name: 'Electrical & Electronics', icon: '⚡' },
  { id: 'IT', name: 'Information Technology', icon: '🌐' },
  { id: 'Mechanical', name: 'Mechanical Engineering', icon: '⚙️' },
  { id: 'Mechatronics', name: 'Mechatronics Engineering', icon: '🦾' }
];

function DeptSelection() {
  const navigate = useNavigate();

  const handleDeptClick = (deptId) => {
    navigate(`/dept-login?dept=${deptId}`);
  };

  return (
    <div className="dept-selection-container">
      <div className="dept-selection-header">
        <h1>🏛️ Department Login</h1>
        <p>Select your department to access your specific dashboard</p>
      </div>

      <div className="dept-grid">
        {departments.map((dept) => (
          <div 
            key={dept.id} 
            className="dept-card"
            onClick={() => handleDeptClick(dept.id)}
          >
            <div className="dept-icon">{dept.icon}</div>
            <h3>{dept.id}</h3>
            <p>{dept.name}</p>
          </div>
        ))}
        <div 
          className="dept-card"
          onClick={() => navigate('/login')}
          style={{ border: '2px solid #6366f1', backgroundColor: '#eff6ff' }}
        >
          <div className="dept-icon">🏢</div>
          <h3 style={{ color: '#4f46e5' }}>College Dashboard</h3>
          <p>Super Admin Login</p>
        </div>
      </div>
    </div>
  );
}

export default DeptSelection;
