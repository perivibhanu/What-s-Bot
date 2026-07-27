import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Html5QrcodeScanner } from 'html5-qrcode';
import '../styles/Students.css';

function GuardScanner() {
  const [gateNumber, setGateNumber] = useState(1);
  const [direction, setDirection] = useState('exit');
  const [manualToken, setManualToken] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let scanner = null;
    if (scanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, gateNumber, direction]);

  const onScanSuccess = (decodedText) => {
    // Prevent double scan
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error(e));
      setScanning(false);
    }
    handleQRSubmission(decodedText);
  };

  const onScanFailure = (error) => {
    // Ignore routine scan frame failures
  };

  const handleQRSubmission = async (tokenToScan) => {
    setResult(null);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/outings/scan`,
        {
          qrToken: tokenToScan,
          gateNumber: Number(gateNumber),
          direction: direction
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setResult(res.data);
      setManualToken('');
    } catch (err) {
      console.error('QR Scan Error:', err);
      setError(err.response?.data?.error || 'Failed to scan QR Code. Please check validity.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleQRSubmission(manualToken.trim());
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>🛡️ Velammal Security Gate QR Scanner</h1>
        <p style={{color: '#64748b'}}>Scan student Digital Outing Passes at Gate 1 (Hostel) & Gate 2 (Main College Gate).</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '25px'
      }}>
        {/* Gate Selection Card */}
        <div style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{marginTop: 0, marginBottom: '15px', color: '#1e293b'}}>1. Select Gate</h3>
          <div style={{display: 'flex', gap: '10px'}}>
            <button
              onClick={() => setGateNumber(1)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: gateNumber === 1 ? '#2563eb' : '#f1f5f9',
                color: gateNumber === 1 ? '#ffffff' : '#475569'
              }}
            >
              🏢 Gate 1 (Hostel Gate)
            </button>
            <button
              onClick={() => setGateNumber(2)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: gateNumber === 2 ? '#2563eb' : '#f1f5f9',
                color: gateNumber === 2 ? '#ffffff' : '#475569'
              }}
            >
              🏛️ Gate 2 (Main Gate)
            </button>
          </div>
        </div>

        {/* Direction Selection Card */}
        <div style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{marginTop: 0, marginBottom: '15px', color: '#1e293b'}}>2. Select Check-In Direction</h3>
          <div style={{display: 'flex', gap: '10px'}}>
            <button
              onClick={() => setDirection('exit')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: direction === 'exit' ? '#ea580c' : '#f1f5f9',
                color: direction === 'exit' ? '#ffffff' : '#475569'
              }}
            >
              🚪 EXIT (Leaving Campus)
            </button>
            <button
              onClick={() => setDirection('entry')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: direction === 'entry' ? '#16a34a' : '#f1f5f9',
                color: direction === 'entry' ? '#ffffff' : '#475569'
              }}
            >
              🔙 ENTRY (Returning)
            </button>
          </div>
        </div>
      </div>

      {/* Scanner & Manual Input Container */}
      <div style={{
        background: '#ffffff',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <div style={{marginBottom: '20px'}}>
          {!scanning ? (
            <button
              onClick={() => { setResult(null); setError(null); setScanning(true); }}
              style={{
                padding: '14px 28px',
                fontSize: '1.05rem',
                fontWeight: '700',
                borderRadius: '12px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              📸 Start Camera QR Scanner
            </button>
          ) : (
            <button
              onClick={() => setScanning(false)}
              style={{
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: '600',
                borderRadius: '10px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ⏹️ Stop Scanner
            </button>
          )}
        </div>

        {/* Camera viewport */}
        <div id="reader" style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          display: scanning ? 'block' : 'none',
          borderRadius: '12px',
          overflow: 'hidden'
        }}></div>

        {/* Manual Token Entry */}
        <div style={{marginTop: '25px', borderTop: '1px solid #e2e8f0', paddingTop: '20px'}}>
          <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '10px'}}>Or enter Outing QR Pass Token manually (for testing / scanner fallback):</p>
          <form onSubmit={handleManualSubmit} style={{display: 'flex', gap: '10px', maxWidth: '450px', margin: '0 auto'}}>
            <input
              type="text"
              placeholder="e.g. VCET-OUT-66a3..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 15px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Submit
            </button>
          </form>
        </div>
      </div>

      {/* Result Display Box */}
      {result && (
        <div style={{
          marginTop: '25px',
          padding: '25px',
          borderRadius: '16px',
          backgroundColor: '#dcfce7',
          border: '2px solid #22c55e',
          color: '#14532d',
          textAlign: 'center'
        }}>
          <h2 style={{margin: '0 0 10px 0', fontSize: '1.6rem'}}>✅ ACCESS GRANTED</h2>
          <p style={{fontSize: '1.15rem', fontWeight: 'bold', margin: '5px 0'}}>
            {result.outing?.studentId?.name} ({result.outing?.studentId?.registrationNumber})
          </p>
          <p style={{margin: '5px 0', color: '#166534'}}>{result.message}</p>
          <p style={{fontSize: '0.9rem', color: '#15803d', marginTop: '10px'}}>
            Hostel Block: {result.outing?.wardenId?.block || 'Hostel'} | Warden: {result.outing?.wardenId?.name}
          </p>
        </div>
      )}

      {/* Error Display Box */}
      {error && (
        <div style={{
          marginTop: '25px',
          padding: '25px',
          borderRadius: '16px',
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          color: '#7f1d1d',
          textAlign: 'center'
        }}>
          <h2 style={{margin: '0 0 10px 0', fontSize: '1.6rem'}}>❌ ACCESS DENIED</h2>
          <p style={{fontSize: '1.1rem', fontWeight: '600', margin: 0}}>{error}</p>
        </div>
      )}
    </Layout>
  );
}

export default GuardScanner;
