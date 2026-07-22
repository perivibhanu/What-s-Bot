import React, { useState } from 'react';
import '../styles/ApplicationForm.css';

const ApplicationForm = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    whatsappNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    community: '',
    parentName: '',
    parentMobile: '',
    address: {
      street: '',
      district: '',
      state: '',
      pincode: ''
    },
    tenthSchool: '',
    tenthPlace: '',
    tenthBoard: '',
    tenthBatch: '',
    tenthPercentage: '',
    twelfthRegNumber: '',
    twelfthSchool: '',
    twelfthPlace: '',
    twelfthBoard: '',
    twelfthBatch: '',
    twelfthPercentage: '',
    twelfthMedium: '',
    twelfthMaths: '',
    twelfthPhysics: '',
    twelfthChemistry: '',
    twelfthMathsIIA: '',
    twelfthMathsIIB: '',
    twelfthPhysicsTheory: '',
    twelfthPhysicsLab: '',
    twelfthChemistryTheory: '',
    twelfthChemistryLab: '',
    courseChoice1: '',
    courseChoice2: '',
    courseChoice3: ''
  });

  const courses = ['CSE', 'AIDS', 'ECE', 'EEE', 'IT', 'Mechanical', 'Mechatronics'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      const requiredFields = ['fullName', 'email', 'mobile', 'whatsappNumber', 'dateOfBirth', 'gender', 'parentName', 'parentMobile'];
      const requiredAddress = ['street', 'district', 'state', 'pincode'];
      
      for (const field of requiredFields) {
        if (!formData[field] || formData[field].trim() === '') return false;
      }
      for (const field of requiredAddress) {
        if (!formData.address[field] || formData.address[field].trim() === '') return false;
      }
      return true;
    }
    
    if (currentStep === 2) {
      let requiredFields = ['tenthSchool', 'tenthPlace', 'tenthBoard', 'tenthBatch', 'tenthPercentage', 'twelfthRegNumber', 'twelfthMedium', 'twelfthSchool', 'twelfthPlace', 'twelfthBoard', 'twelfthBatch', 'twelfthPercentage'];
      if (formData.twelfthBoard === 'Board of Intermediate Education, Andhra Pradesh (BIEAP)' || formData.twelfthBoard === 'Telangana State Board of Intermediate Education (TSBIE)') {
        requiredFields = [...requiredFields, 'twelfthMathsIIA', 'twelfthMathsIIB', 'twelfthPhysicsTheory', 'twelfthPhysicsLab', 'twelfthChemistryTheory', 'twelfthChemistryLab'];
      } else {
        requiredFields = [...requiredFields, 'twelfthMaths', 'twelfthPhysics', 'twelfthChemistry'];
      }
      for (const field of requiredFields) {
        if (!formData[field] || String(formData[field]).trim() === '') return false;
      }
      return true;
    }
    
    if (currentStep === 3) {
      if (!formData.courseChoice1 || !formData.courseChoice2 || !formData.courseChoice3) return false;
      return true;
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 4));
    } else {
      alert("Please fill in all required fields before proceeding.");
    }
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const calculateCutoff = () => {
    if (formData.twelfthBoard === 'Board of Intermediate Education, Andhra Pradesh (BIEAP)' || formData.twelfthBoard === 'Telangana State Board of Intermediate Education (TSBIE)') {
      const m1 = Number(formData.twelfthMathsIIA) || 0;
      const m2 = Number(formData.twelfthMathsIIB) || 0;
      const pt = Number(formData.twelfthPhysicsTheory) || 0;
      const pl = Number(formData.twelfthPhysicsLab) || 0;
      const ct = Number(formData.twelfthChemistryTheory) || 0;
      const cl = Number(formData.twelfthChemistryLab) || 0;
      return (((m1 + m2) / 1.5) + ((pt + pl) / 1.8) + ((ct + cl) / 1.8)).toFixed(2);
    }
    const m = Number(formData.twelfthMaths) || 0;
    const p = Number(formData.twelfthPhysics) || 0;
    const c = Number(formData.twelfthChemistry) || 0;
    return (m + p / 2 + c / 2).toFixed(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        twelfthCutoff: parseFloat(calculateCutoff()),
        phoneNumber: formData.whatsappNumber // Use whatsapp as primary identifier if needed
      };

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessData(data);
      } else {
        alert(data.message || 'Error submitting application');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPersonal = () => (
    <div className="form-section">
      <h2>Personal Information</h2>
      <div className="form-grid">
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Mobile Number</label>
          <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>WhatsApp Number</label>
          <input type="tel" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Date of Birth (DD/MM/YYYY)</label>
          <input type="text" name="dateOfBirth" placeholder="15/06/2007" value={formData.dateOfBirth} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Gender</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Community (Optional)</label>
          <select name="community" value={formData.community} onChange={handleChange}>
            <option value="">Select...</option>
            <option value="OC">OC</option>
            <option value="BC">BC</option>
            <option value="MBC">MBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
          </select>
        </div>
        <div className="form-group"></div>

        <h3 className="section-title">Parent/Guardian Details</h3>
        <div className="section-divider"></div>
        <div className="form-group">
          <label>Parent/Guardian Name</label>
          <input type="text" name="parentName" value={formData.parentName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Parent Mobile</label>
          <input type="tel" name="parentMobile" value={formData.parentMobile} onChange={handleChange} required />
        </div>

        <h3 className="section-title">Address</h3>
        <div className="section-divider"></div>
        <div className="form-group full" style={{ gridColumn: '1 / -1' }}>
          <label>Street Address</label>
          <input type="text" name="address.street" value={formData.address.street} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>District</label>
          <input type="text" name="address.district" value={formData.address.district} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>State</label>
          <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Pincode</label>
          <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleChange} required />
        </div>
      </div>
    </div>
  );

  const renderAcademic = () => (
    <div className="form-section">
      <h2>Academic Information</h2>
      
      <h3 className="section-title">10th Standard Details</h3>
      <div className="section-divider"></div>
      <div className="form-grid">
        <div className="form-group">
          <label>10th School Name</label>
          <input type="text" name="tenthSchool" value={formData.tenthSchool} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>School Place / City</label>
          <input type="text" name="tenthPlace" value={formData.tenthPlace} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Board of Study</label>
          <select name="tenthBoard" value={formData.tenthBoard} onChange={handleChange} required>
            <option value="">Select Board</option>
            <option value="TN-state board">TN-state board</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="Board of Intermediate Education, Andhra Pradesh (BIEAP)">Board of Intermediate Education, Andhra Pradesh (BIEAP)</option>
            <option value="Telangana State Board of Intermediate Education (TSBIE)">Telangana State Board of Intermediate Education (TSBIE)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Batch</label>
          <input type="text" name="tenthBatch" placeholder="e.g. 2019-2020" value={formData.tenthBatch} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Overall Percentage (%)</label>
          <input type="number" step="0.01" name="tenthPercentage" value={formData.tenthPercentage} onChange={handleChange} required />
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: '2rem' }}>12th Standard Details</h3>
      <div className="section-divider"></div>
      <div className="form-grid">
        <div className="form-group">
          <label>12th Registration Number</label>
          <input type="text" name="twelfthRegNumber" value={formData.twelfthRegNumber} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Medium of Instruction</label>
          <input type="text" name="twelfthMedium" placeholder="e.g. English, Tamil" value={formData.twelfthMedium} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>12th School Name</label>
          <input type="text" name="twelfthSchool" value={formData.twelfthSchool} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>School Place / City</label>
          <input type="text" name="twelfthPlace" value={formData.twelfthPlace} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Board of Study (12th)</label>
          <select name="twelfthBoard" value={formData.twelfthBoard} onChange={handleChange} required>
            <option value="">Select Board</option>
            <option value="TN-state board">TN-state board</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="Board of Intermediate Education, Andhra Pradesh (BIEAP)">Board of Intermediate Education, Andhra Pradesh (BIEAP)</option>
            <option value="Telangana State Board of Intermediate Education (TSBIE)">Telangana State Board of Intermediate Education (TSBIE)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Batch</label>
          <input type="text" name="twelfthBatch" placeholder="e.g. 2021-2022" value={formData.twelfthBatch} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Overall Percentage (%)</label>
          <input type="number" step="0.01" name="twelfthPercentage" value={formData.twelfthPercentage} onChange={handleChange} required />
        </div>
      </div>

      {(formData.twelfthBoard === 'Board of Intermediate Education, Andhra Pradesh (BIEAP)' || formData.twelfthBoard === 'Telangana State Board of Intermediate Education (TSBIE)') ? (
        <>
          <h3 className="section-title" style={{ marginTop: '2rem' }}>AP/Telangana Intermediate cutoff calculation</h3>
          <div className="section-divider"></div>
          <div className="form-grid">
            <div className="form-group">
              <label>Maths II A (75)</label>
              <input type="number" max="75" name="twelfthMathsIIA" value={formData.twelfthMathsIIA} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Maths II B (75)</label>
              <input type="number" max="75" name="twelfthMathsIIB" value={formData.twelfthMathsIIB} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Physics Theory (60)</label>
              <input type="number" max="60" name="twelfthPhysicsTheory" value={formData.twelfthPhysicsTheory} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Chemistry Theory (60)</label>
              <input type="number" max="60" name="twelfthChemistryTheory" value={formData.twelfthChemistryTheory} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Physics Lab (30)</label>
              <input type="number" max="30" name="twelfthPhysicsLab" value={formData.twelfthPhysicsLab} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Chemistry Lab (30)</label>
              <input type="number" max="30" name="twelfthChemistryLab" value={formData.twelfthChemistryLab} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Cutoff / 200</label>
              <input type="text" value={calculateCutoff()} disabled style={{ background: '#f1f5f9', fontWeight: 'bold' }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <h3 className="section-title" style={{ marginTop: '2rem' }}>12th / Inter 2nd Year Marks (Out of 100)</h3>
          <div className="section-divider"></div>
          <div className="form-grid">
            <div className="form-group">
              <label>Maths</label>
              <input type="number" max="100" name="twelfthMaths" value={formData.twelfthMaths} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Physics</label>
              <input type="number" max="100" name="twelfthPhysics" value={formData.twelfthPhysics} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Chemistry</label>
              <input type="number" max="100" name="twelfthChemistry" value={formData.twelfthChemistry} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Cutoff (PCM) / 200</label>
              <input type="text" value={calculateCutoff()} disabled style={{ background: '#f1f5f9', fontWeight: 'bold' }} />
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderCourses = () => {
    const availableFor2 = courses.filter(c => c !== formData.courseChoice1);
    const availableFor3 = availableFor2.filter(c => c !== formData.courseChoice2);

    return (
      <div className="form-section">
        <h2>Course Preferences</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Please select your preferred courses in order of priority.</p>
        
        <div className="form-grid full">
          <div className="form-group">
            <label>Choice 1 (Highest Priority)</label>
            <select name="courseChoice1" value={formData.courseChoice1} onChange={handleChange} required>
              <option value="">Select a course...</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Choice 2</label>
            <select name="courseChoice2" value={formData.courseChoice2} onChange={handleChange} disabled={!formData.courseChoice1}>
              <option value="">Select a course...</option>
              {availableFor2.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Choice 3</label>
            <select name="courseChoice3" value={formData.courseChoice3} onChange={handleChange} disabled={!formData.courseChoice2}>
              <option value="">Select a course...</option>
              {availableFor3.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="form-section">
      <h2>Review Your Application</h2>
      
      <div className="review-container">
        <div className="review-section">
          <h3>Personal Details</h3>
          <div className="review-grid">
            <div className="review-item"><span className="review-label">Name</span><span className="review-value">{formData.fullName}</span></div>
            <div className="review-item"><span className="review-label">Email</span><span className="review-value">{formData.email}</span></div>
            <div className="review-item"><span className="review-label">Mobile</span><span className="review-value">{formData.mobile}</span></div>
            <div className="review-item"><span className="review-label">DOB</span><span className="review-value">{formData.dateOfBirth}</span></div>
          </div>
        </div>

        <div className="review-section">
          <h3>Academic Details</h3>
          <div className="review-grid">
            <div className="review-item"><span className="review-label">10th Board</span><span className="review-value">{formData.tenthBoard} ({formData.tenthBatch})</span></div>
            <div className="review-item"><span className="review-label">10th %</span><span className="review-value">{formData.tenthPercentage}%</span></div>
            
            <div className="review-item" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <span className="review-label">12th Board</span>
              <span className="review-value">{formData.twelfthBoard} ({formData.twelfthBatch})</span>
            </div>
            
            <div className="review-item"><span className="review-label">12th Reg No</span><span className="review-value">{formData.twelfthRegNumber}</span></div>
            <div className="review-item"><span className="review-label">12th %</span><span className="review-value">{formData.twelfthPercentage}%</span></div>
            
            {(formData.twelfthBoard === 'Board of Intermediate Education, Andhra Pradesh (BIEAP)' || formData.twelfthBoard === 'Telangana State Board of Intermediate Education (TSBIE)') ? (
              <>
                <div className="review-item"><span className="review-label">Maths II A/B</span><span className="review-value">{formData.twelfthMathsIIA} / {formData.twelfthMathsIIB}</span></div>
                <div className="review-item"><span className="review-label">Phy (Th/Lab)</span><span className="review-value">{formData.twelfthPhysicsTheory} / {formData.twelfthPhysicsLab}</span></div>
                <div className="review-item"><span className="review-label">Chem (Th/Lab)</span><span className="review-value">{formData.twelfthChemistryTheory} / {formData.twelfthChemistryLab}</span></div>
              </>
            ) : (
              <div className="review-item"><span className="review-label">M / P / C</span><span className="review-value">{formData.twelfthMaths} / {formData.twelfthPhysics} / {formData.twelfthChemistry}</span></div>
            )}
            
            <div className="review-item"><span className="review-label">Cutoff</span><span className="review-value" style={{ color: '#2a5298' }}>{calculateCutoff()} / 200</span></div>
          </div>
        </div>

        <div className="review-section">
          <h3>Course Preferences</h3>
          <div className="review-grid">
            <div className="review-item"><span className="review-label">Choice 1</span><span className="review-value">{formData.courseChoice1 || 'None'}</span></div>
            <div className="review-item"><span className="review-label">Choice 2</span><span className="review-value">{formData.courseChoice2 || 'None'}</span></div>
            <div className="review-item"><span className="review-label">Choice 3</span><span className="review-value">{formData.courseChoice3 || 'None'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (successData) {
    return (
      <div className="application-container">
        <div className="application-card">
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>Application Submitted!</h2>
            <p>Thank you, {successData.application.fullName}. Your application has been successfully submitted.</p>
            <p>Your Application Number is:</p>
            <div className="app-number">{successData.application.applicationNumber}</div>
            <p>We will contact you shortly regarding the next steps.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="application-container">
      <div className="application-card">
        <div className="application-header">
          <h1>Admission Application</h1>
          <p>Velammal Institute of Technology</p>
        </div>
        
        <div className="stepper-container">
          {['Personal', 'Academic', 'Courses', 'Review'].map((label, index) => {
            const stepNum = index + 1;
            return (
              <div key={label} className={`step ${step === stepNum ? 'active' : ''} ${step > stepNum ? 'completed' : ''}`}>
                <div className="step-circle">{step > stepNum ? '✓' : stepNum}</div>
                <div className="step-label">{label}</div>
              </div>
            );
          })}
        </div>

        <div className="form-content">
          {step === 1 && renderPersonal()}
          {step === 2 && renderAcademic()}
          {step === 3 && renderCourses()}
          {step === 4 && renderReview()}
        </div>

        <div className="form-actions">
          {step > 1 ? (
            <button className="btn-prev" onClick={prevStep} disabled={isSubmitting}>Back</button>
          ) : <div></div>}
          
          {step < 4 ? (
            <button className="btn-next" onClick={nextStep}>Continue</button>
          ) : (
            <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;
