import React, { useState, useEffect } from 'react';
import axios from 'axios';

import Layout from '../components/Layout';
import '../styles/Students.css';

function FeeDefaulters() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ regNumber: '', amountPaid: '' });

  // Bulk Import State
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  


  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/data/fee-defaulters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDefaulters(res.data);
    } catch (err) {
      console.error('Error fetching defaulters:', err);
      alert('Failed to fetch fee defaulters');
    } finally {
      setLoading(false);
    }
  };

  const branches = [...new Set(defaulters.map(d => d.branch))].sort();

  const filteredDefaulters = defaulters.filter(d => {
    const matchSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.regNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = filterBranch ? d.branch === filterBranch : true;
    return matchSearch && matchBranch;
  });

  const handleUpdateFee = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/data/update-single-fee`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({ regNumber: '', amountPaid: '' });
      fetchDefaulters(); // Refresh list to instantly show updated balance
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update fee');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select a file first');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', 'fees');
      formData.append('isAllStudents', true); // Global upload by reg number

      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/data/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setImportResult(res.data);
      fetchDefaulters();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.error || 'Import failed',
        summary: { success: 0, skipped: 0, failed: 0 },
        isError: true
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="students-header">
        <div>
          <h1>⚠️ Fee Defaulters</h1>
          <p className="student-count">Monitor students with pending fee balances.</p>
        </div>
        <div className="header-actions">
          <button className="btn-import" onClick={() => { setShowImport(true); setImportResult(null); }}>
            📥 Bulk Import
          </button>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            ➕ Update Fee
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍  Search by name or reg number..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="filter-select"
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {(searchTerm || filterBranch) && (
          <button className="btn-clear" onClick={() => { setSearchTerm(''); setFilterBranch(''); }}>
            ✕ Clear
          </button>
        )}
        <span className="showing-count">Showing {filteredDefaulters.length} of {defaulters.length}</span>
      </div>

      {/* ── Defaulters Table ── */}
      {loading ? (
        <p style={{ padding: '20px' }}>Loading...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Reg Number</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Section</th>
                <th>Phone Number</th>
                <th>Total Fees (₹)</th>
                <th>Pending Fees (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefaulters.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    {defaulters.length === 0
                      ? '🎉 No fee defaulters found! Everyone has paid.'
                      : '🔍 No students match your search.'}
                  </td>
                </tr>
              ) : (
                filteredDefaulters.map((student, idx) => (
                  <tr key={student._id}>
                    <td style={{ color: '#999', fontSize: '13px' }}>{idx + 1}</td>
                    <td><strong>{student.regNumber}</strong></td>
                    <td>{student.name}</td>
                    <td><span className="branch-tag">{student.branch}</span></td>
                    <td>{student.section}</td>
                    <td>{student.phoneNumber || 'N/A'}</td>
                    <td>₹{student.fees?.totalFees || 0}</td>
                    <td style={{ color: 'red', fontWeight: 'bold' }}>₹{student.fees?.pendingFees || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Update Single Fee Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>➕ Record Payment</h2>
            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
              Quickly update a student's paid fees. The system will automatically recalculate their pending balance.
            </p>
            <form onSubmit={handleUpdateFee}>
              <input 
                placeholder="Reg Number (e.g. 21CS001)" 
                value={formData.regNumber}
                onChange={e => setFormData({ ...formData, regNumber: e.target.value })} 
                required 
              />
              <input 
                type="number"
                placeholder="Amount Paid Today (₹)" 
                value={formData.amountPaid}
                onChange={e => setFormData({ ...formData, amountPaid: e.target.value })} 
                required 
              />
              <div className="modal-actions">
                <button type="submit">Update Record</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ── */}
      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); setImportResult(null); }}>
          <div className="modal-box import-modal" onClick={e => e.stopPropagation()}>
            <h2>📥 Bulk Import Fee Data</h2>

            <div className="import-step" style={{ border: 'none', padding: '0', background: 'transparent' }}>
              <div className="step-content">
                <h4>Upload Your Filled Excel/CSV File</h4>
                <p>Ensure your file has <strong>Registration Number</strong>, <strong>Total Fees</strong>, and <strong>Paid Fees</strong> columns.</p>
                <form onSubmit={handleBulkImport}>
                  <label className="file-drop-zone">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={e => { setImportFile(e.target.files[0]); setImportResult(null); }}
                      style={{ display: 'none' }}
                    />
                    {importFile
                      ? <span>📄 {importFile.name}</span>
                      : <span>📂 Click to select Excel or CSV file</span>}
                  </label>

                  <button type="submit" className="btn-import-submit" disabled={importing || !importFile}>
                    {importing ? '⏳ Importing...' : '🚀 Update Fees'}
                  </button>
                </form>
              </div>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`import-result ${importResult.isError ? 'result-error' : 'result-success'}`}>
                <p className="result-message">{importResult.message}</p>
                {importResult.summary && (
                  <div className="result-stats">
                    <span className="stat-success">✅ Updated: {importResult.summary.success}</span>
                    <span className="stat-fail">❌ Failed: {importResult.summary.failed}</span>
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <details>
                    <summary>View {importResult.errors.length} errors</summary>
                    <ul className="error-list">
                      {importResult.errors.map((e, i) => (
                        <li key={i}>Row {e.row}: {e.reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <button className="btn-close-import" onClick={() => { setShowImport(false); setImportResult(null); }} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default FeeDefaulters;
