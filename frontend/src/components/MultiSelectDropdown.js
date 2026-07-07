import React, { useState, useRef, useEffect } from 'react';

const MultiSelectDropdown = ({ options, selected, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let displayText = placeholder || 'Select Options';
  if (selected.length > 0) {
    if (selected.length === options.length && options.length > 0) {
        displayText = 'All Selected';
    } else {
        displayText = selected.join(', ');
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#f9f9f9' : '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: disabled ? '#999' : '#333'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>
          {displayText}
        </span>
        <span style={{ fontSize: '12px', color: '#666' }}>▼</span>
      </div>
      
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginTop: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '14px', margin: 0 }}>
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => onChange(opt)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
