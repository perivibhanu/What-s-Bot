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
        <h1>🏠 Hostel Outings & Timings</h1>
        <p style={{color: '#64748b'}}>Live tracking of student outings, check-in status, and return timings.</p>
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
              <th>STATUS</th>
              <th>TIME OUT</th>
              <th>RETURN TIME</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign: 'center'}}>Loading...</td></tr>
            ) : outings.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center'}}>No outings recorded yet.</td></tr>
            ) : (
              outings.map((outing, index) => (
                <tr key={outing._id}>
                  <td>{index + 1}</td>
                  <td>{outing.studentId?.name || 'Student'}</td>
                  <td>{outing.studentId?.registrationNumber || '-'}</td>
                  <td>{outing.wardenId?.name ? `${outing.wardenId.name} (${outing.wardenId.block || 'Hostel'})` : 'Hostel Warden'}</td>
                  <td>{outing.reason}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      backgroundColor: outing.status === 'Returned' ? '#dcfce7' : outing.status === 'Out' ? '#e0f2fe' : outing.status === 'Pending' ? '#fef9c3' : '#fee2e2',
                      color: outing.status === 'Returned' ? '#166534' : outing.status === 'Out' ? '#0369a1' : outing.status === 'Pending' ? '#854d0e' : '#991b1b'
                    }}>
                      {outing.status}
                    </span>
                  </td>
                  <td>{outing.requestTime ? new Date(outing.requestTime).toLocaleString('en-IN') : '-'}</td>
                  <td>{outing.actualReturnTime ? new Date(outing.actualReturnTime).toLocaleTimeString('en-IN') : '-'}</td>
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
