import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Students.css'; 

function ActiveOutings() {
  const [outings, setOutings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveOutings();
  }, []);

  const fetchActiveOutings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/outings/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutings(res.data);
    } catch (err) {
      console.error('Error fetching active outings:', err);
      setError('Failed to fetch active outings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>🏠 Active Outings</h1>
        <p style={{color: '#64748b'}}>Students currently outside the hostel.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>STUDENT</th>
              <th>REG NO</th>
              <th>WARDEN / BLOCK</th>
              <th>REASON</th>
              <th>TIME OUT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading...</td></tr>
            ) : outings.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>No students are currently outside.</td></tr>
            ) : (
              outings.map((outing, index) => (
                <tr key={outing._id}>
                  <td>{index + 1}</td>
                  <td>{outing.studentId?.name}</td>
                  <td>{outing.studentId?.registrationNumber}</td>
                  <td>{outing.wardenId?.name} ({outing.wardenId?.block})</td>
                  <td>{outing.reason}</td>
                  <td>{new Date(outing.requestTime).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default ActiveOutings;
