import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';

function HostelFeedback() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [distributionData, setDistributionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/feedback/distribution?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDistributionData(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    
    fetchFeedback();
  }, [selectedDate]);

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>🏠 Hostel Food Feedback</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Detailed daily rating distributions from hostel students.</p>

        <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ color: '#1e293b', margin: 0 }}>Rating Distribution</h2>
            <div>
              <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Date:</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Loading data...</p>
          ) : distributionData && distributionData.totalVotes > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              
              {/* Breakfast Chart */}
              <div>
                <h3 style={{ textAlign: 'center', color: '#f59e0b' }}>Breakfast</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData.breakfast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" name="Avg Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lunch Chart */}
              <div>
                <h3 style={{ textAlign: 'center', color: '#3b82f6' }}>Lunch</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData.lunch}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Avg Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dinner Chart */}
              <div>
                <h3 style={{ textAlign: 'center', color: '#10b981' }}>Dinner</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData.dinner}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" name="Avg Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>No feedback data available for {selectedDate}.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default HostelFeedback;
