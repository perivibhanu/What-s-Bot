import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css'; // Reusing standard login styles

function DeptLogin({ setToken }) {
  const [searchParams] = useSearchParams();
  const department = searchParams.get('dept');
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'https://what-s-bot.onrender.com'}/api/auth/dept-login`, {
        department,
        username,
        password
      });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'dept_admin');
      localStorage.setItem('dept', department);
      navigate('/dept-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  if (!department) {
    navigate('/dept-selection');
    return null;
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🏛️ {department} Department Login</h1>
          <p>Sign in to manage {department} resources</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g., cse_admin"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
        
        <button 
          onClick={() => navigate('/dept-selection')} 
          className="back-btn"
          style={{ marginTop: '1rem', background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' }}
        >
          ← Back to Departments
        </button>
      </div>
    </div>
  );
}

export default DeptLogin;
