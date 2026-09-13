import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/Students.css'; // Reusing students CSS for layout

function AttendanceReports() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  
  const role = localStorage.getItem('role');
  const dept = localStorage.getItem('dept');
  const Wrapper = role === 'dept_admin' ? DeptLayout : Layout;

  useEffect(() => {
    fetchRecords();
  }, [filterDate]);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance?`;
      
      if (role === 'dept_admin') {
        url += `department=${dept}&`;
      }
      if (filterDate) {
        url += `date=${filterDate}&`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <div className="students-page">
        <div className="students-header">
          <div>
            <h1>📅 Daily Attendance Reports</h1>
            <p>View attendance submitted by staff via WhatsApp Flow</p>
          </div>
          <div className="header-actions">
            <input 
              type="date" 
              className="search-input" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              title="Filter by Date"
            />
            <button className="add-btn" onClick={() => setFilterDate('')}>
              Clear Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading records...</div>
        ) : (
          <div className="table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  {role !== 'dept_admin' && <th>Department</th>}
                  <th>Class (Yr-Sec)</th>
                  <th>Absentees</th>
                  <th>Leave</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={role !== 'dept_admin' ? 6 : 5} style={{ textAlign: 'center' }}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  records.map(record => (
                    <tr key={record._id}>
                      <td>{new Date(record.date).toLocaleString()}</td>
                      {role !== 'dept_admin' && (
                        <td><span className={`status-badge active`}>{record.department}</span></td>
                      )}
                      <td><strong>{record.year} - {record.section}</strong></td>
                      <td>
                        {record.absentees && record.absentees.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {record.absentees.map(s => (
                              <span key={s._id} style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                                • {s.regNumber} ({s.name})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>100% Present</span>
                        )}
                      </td>
                      <td>
                        {record.leave && record.leave.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {record.leave.map(s => (
                              <span key={s._id} style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                                • {s.regNumber} ({s.name})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280' }}>-</span>
                        )}
                      </td>
                      <td>{record.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default AttendanceReports;
