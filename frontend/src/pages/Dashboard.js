import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, registered: 0 });


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('https://what-s-bot.onrender.com/api/students', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats({
          total: res.data.length,
          registered: res.data.filter(s => s.isRegistered).length
        });
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchStats();
    // Auto-refresh every 30 seconds for always-open displays
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Registered Students</h3>
          <p>{stats.registered}</p>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
