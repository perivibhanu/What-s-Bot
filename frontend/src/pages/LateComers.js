import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Students.css'; 

function LateComers() {
  const [lateComers, setLateComers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLateComers();
  }, []);

  const fetchLateComers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/outings/late`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLateComers(res.data);
    } catch (err) {
      console.error('Error fetching late comers:', err);
      setError('Failed to fetch late comers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header" style={{ borderBottomColor: '#fecaca' }}>
        <h1 style={{ color: '#dc2626' }}>🚨 Late Comers</h1>
        <p style={{color: '#ef4444'}}>Students who missed the 6:00 PM return deadline.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>STUDENT</th>
              <th>REG NO</th>
              <th>STUDENT MOBILE</th>
              <th>PARENT MOBILE</th>
              <th>WARDEN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading...</td></tr>
            ) : lateComers.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', color: '#10b981', fontWeight: 'bold'}}>🎉 All clear! No late comers.</td></tr>
            ) : (
              lateComers.map((outing, index) => (
                <tr key={outing._id} style={{ backgroundColor: '#fef2f2' }}>
                  <td>{index + 1}</td>
                  <td style={{ fontWeight: 'bold', color: '#dc2626' }}>{outing.studentId?.name}</td>
                  <td>{outing.studentId?.registrationNumber}</td>
                  <td>{outing.studentId?.mobileNumber}</td>
                  <td>{outing.studentId?.parentPhoneNumber}</td>
                  <td>{outing.wardenId?.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default LateComers;
