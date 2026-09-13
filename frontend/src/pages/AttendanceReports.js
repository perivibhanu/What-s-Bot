import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/Students.css';

function AttendanceReports() {
  const role = localStorage.getItem('role');
  const loggedInDept = localStorage.getItem('dept');
  const Wrapper = role === 'dept_admin' ? DeptLayout : Layout;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date defaults to today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);
  const [filterDept, setFilterDept] = useState(role === 'dept_admin' ? loggedInDept : 'ECE');
  
  const [sendingAlerts, setSendingAlerts] = useState(false);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, filterDept]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance?`;
      
      if (filterDept) url += `department=${filterDept.toLowerCase()}&`;
      if (filterDate) url += `date=${filterDate}&`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlerts = async () => {
    if (!filterDept || !filterDate) {
      alert("Please select a Department and Date first.");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to send WhatsApp alerts to all Absentees and Leave students for ${filterDept} on ${filterDate}?`)) {
      return;
    }

    try {
      setSendingAlerts(true);
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/send-alerts`;
      
      const res = await axios.post(url, {
        department: filterDept,
        date: filterDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(res.data.message || 'Alerts dispatched successfully!');
    } catch (err) {
      console.error('Error sending alerts:', err);
      alert(err.response?.data?.error || 'Failed to send alerts.');
    } finally {
      setSendingAlerts(false);
    }
  };

  // ─── Grouping & Analysis Logic ───
  const grouped = {
    'I': [], 'II': [], 'III': [], 'IV': []
  };
  
  let totalAbsentees = 0;
  let totalLeave = 0;

  const mapYear = (y) => {
    if (!y) return 'Other';
    const str = y.toString().toUpperCase().trim();
    if (str.includes('1') || str === 'I' || str === 'FIRST') return 'I';
    if (str.includes('2') || str === 'II' || str === 'SECOND') return 'II';
    if (str.includes('3') || str === 'III' || str === 'THIRD') return 'III';
    if (str.includes('4') || str === 'IV' || str === 'FOURTH') return 'IV';
    return 'Other';
  };

  records.forEach(r => {
    const y = mapYear(r.year);
    if (grouped[y]) {
      grouped[y].push(r);
    } else {
      if (!grouped['Other']) grouped['Other'] = [];
      grouped['Other'].push(r);
    }
    totalAbsentees += (r.absentees?.length || 0);
    totalLeave += (r.leave?.length || 0);
  });

  // Sort sections alphabetically within each year
  Object.keys(grouped).forEach(year => {
    grouped[year].sort((a, b) => a.section.localeCompare(b.section));
  });

  return (
    <Wrapper>
      <div className="students-page">
        <div className="students-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1>📅 Department Attendance Analysis</h1>
            <p>View and manage attendance segregated by Year & Section</p>
          </div>
          
          <div className="header-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {role !== 'dept_admin' && (
                <select 
                  className="search-input" 
                  value={filterDept} 
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  <option value="">Select Dept</option>
                  <option value="ECE">ECE</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="AIDS">AIDS</option>
                </select>
              )}
              <input 
                type="date" 
                className="search-input" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filter by Date"
              />
            </div>
            
            <button 
              className="add-btn" 
              style={{ backgroundColor: '#25D366', color: 'white', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              onClick={handleSendAlerts}
              disabled={sendingAlerts || records.length === 0}
            >
              {sendingAlerts ? 'Sending...' : '📲 Send WhatsApp Alerts'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading attendance data...</div>
        ) : records.length === 0 ? (
          <div className="table-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>No attendance records found for {filterDept} on {filterDate}.</p>
            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Staff members need to submit the Attendance Flow on WhatsApp first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Display grouped data */}
            {['I', 'II', 'III', 'IV', 'Other'].map(year => {
              const yearRecords = grouped[year];
              if (!yearRecords || yearRecords.length === 0) return null;

              return (
                <div key={year} className="table-container" style={{ padding: '1.5rem', marginBottom: 0 }}>
                  <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#111827' }}>
                    Year: {year}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {yearRecords.map(record => (
                      <div key={record._id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: '#f9fafb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h3 style={{ margin: 0, color: '#374151' }}>Section {record.section}</h3>
                          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>By: {record.recordedBy}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Absentees */}
                          <div style={{ backgroundColor: '#fee2e2', padding: '8px', borderRadius: '6px' }}>
                            <strong style={{ color: '#991b1b', display: 'block', marginBottom: '4px' }}>
                              Absentees ({record.absentees?.length || 0})
                            </strong>
                            {record.absentees?.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#b91c1c', fontSize: '0.9rem' }}>
                                {record.absentees.map(s => <li key={s._id}>{s.name} ({s.regNumber})</li>)}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>None</span>
                            )}
                          </div>

                          {/* Leave */}
                          <div style={{ backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
                            <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>
                              Leave ({record.leave?.length || 0})
                            </strong>
                            {record.leave?.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#b45309', fontSize: '0.9rem' }}>
                                {record.leave.map(s => <li key={s._id}>{s.name} ({s.regNumber})</li>)}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Analysis / Summary Box */}
            <div className="table-container" style={{ padding: '2rem', backgroundColor: '#1e1e2f', color: 'white', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#9ca3af', fontSize: '1rem', textTransform: 'uppercase' }}>Total Absentees</h3>
                <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ef4444' }}>{totalAbsentees}</span>
              </div>
              <div style={{ width: '2px', height: '60px', backgroundColor: '#374151' }}></div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#9ca3af', fontSize: '1rem', textTransform: 'uppercase' }}>Total on Leave</h3>
                <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f59e0b' }}>{totalLeave}</span>
              </div>
              <div style={{ width: '2px', height: '60px', backgroundColor: '#374151' }}></div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#9ca3af', fontSize: '1rem', textTransform: 'uppercase' }}>Total Classes Recorded</h3>
                <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>{records.length}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default AttendanceReports;
