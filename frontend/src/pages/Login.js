import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://what-s-bot.onrender.com/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Velammalitech Admin Panel</h1>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button type="submit">Login</button>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>Are you a Department Admin?</p>
            <button 
              type="button" 
              onClick={() => navigate('/dept-selection')}
              style={{ 
                background: 'transparent', 
                color: '#6366f1', 
                border: '1px solid #6366f1',
                width: '100%'
              }}
            >
              Go to Department Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
