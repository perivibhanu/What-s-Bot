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

  const getBatchFromYear = (y) => {
    if (!y) return 'Other';
    const str = y.toString().toUpperCase().trim();
    
    // 1. Check if user already entered a batch number directly (e.g., "23", "2023")
    // This matches numbers like 22, 23, 24, 25, 26 or 2022, 2023, etc.
    const batchMatch = str.match(/(?:20)?(2[0-9])/);
    if (batchMatch) {
      return batchMatch[1]; // Returns just '23'
    }

    // 2. Otherwise, treat it as a Year of Study (1st Year, 2nd Year, etc.)
    if (str === '1' || str === '1ST' || str === 'I' || str === 'FIRST') return '25';
    if (str === '2' || str === '2ND' || str === 'II' || str === 'SECOND') return '24';
    if (str === '3' || str === '3RD' || str === 'III' || str === 'THIRD') return '23';
    if (str === '4' || str === '4TH' || str === 'IV' || str === 'FOURTH') return '22';
    
    return 'Other';
  };

  // Calculate batch-level totals
  const batchTotals = {};

  records.forEach(r => {
    let y = getBatchFromYear(r.year);

    if (!grouped[y]) grouped[y] = [];
    grouped[y].push(r);

    if (!batchTotals[y]) batchTotals[y] = { absentees: 0, leave: 0 };
    batchTotals[y].absentees += (r.absentees?.length || 0);
    batchTotals[y].leave += (r.leave?.length || 0);

    totalAbsentees += (r.absentees?.length || 0);
    totalLeave += (r.leave?.length || 0);
  });

  // Sort sections alphabetically within each batch
  Object.keys(grouped).forEach(batch => {
    grouped[batch].sort((a, b) => a.section.localeCompare(b.section));
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
            {/* Display grouped data by Batch */}
            {['22', '23', '24', '25', 'Other'].map(batch => {
              const batchRecords = grouped[batch];
              if (!batchRecords || batchRecords.length === 0) return null;

              const totals = batchTotals[batch];
              const batchLabel = batch === 'Other' ? 'Other Years' : `Batch ${batch}`;

              return (
                <div key={batch} className="table-container" style={{ padding: '1.5rem', marginBottom: 0 }}>
                  <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#111827' }}>
                    {batchLabel}
                  </h2>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'stretch' }}>
                    
                    {/* Section Cards */}
                    {batchRecords.map(record => (
                      <div key={record._id} style={{ flex: '1 1 250px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', backgroundColor: '#f9fafb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h3 style={{ margin: 0, color: '#374151' }}>Section {record.section}</h3>
                          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>By: {record.recordedBy}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ backgroundColor: '#fee2e2', padding: '8px', borderRadius: '6px' }}>
                            <strong style={{ color: '#991b1b', display: 'block', marginBottom: '4px' }}>
                              Absentees ({record.absentees?.length || 0})
                            </strong>
                            {record.absentees?.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#b91c1c', fontSize: '0.9rem' }}>
                                {record.absentees.map(s => <li key={s._id}>{s.name}</li>)}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>None</span>
                            )}
                          </div>

                          <div style={{ backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
                            <strong style={{ color: '#92400e', display: 'block', marginBottom: '4px' }}>
                              Leave ({record.leave?.length || 0})
                            </strong>
                            {record.leave?.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#b45309', fontSize: '0.9rem' }}>
                                {record.leave.map(s => <li key={s._id}>{s.name}</li>)}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Batch Analysis Card */}
                    <div style={{ flex: '0 0 200px', border: '1px solid #d1d5db', borderRadius: '8px', padding: '1rem', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '1rem', textTransform: 'uppercase' }}>Analysis</h3>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'block' }}>Total Absentees</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f87171' }}>{totals.absentees}</span>
                      </div>
                      
                      <div>
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'block' }}>Total on Leave</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>{totals.leave}</span>
                      </div>
                    </div>

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
