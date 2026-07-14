import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Settings from './pages/Settings';
import Circulars from './pages/Circulars';
import ParentCirculars from './pages/ParentCirculars';
import Marks from './pages/Marks';
import Timetables from './pages/Timetables';
import DataUpdate from './pages/DataUpdate';
import CollegeMedia from './pages/CollegeMedia';

import DeptSelection from './pages/DeptSelection';
import DeptLogin from './pages/DeptLogin';
import DeptDashboard from './pages/DeptDashboard';
import PlacementTraining from './pages/PlacementTraining';
import HodCirculars from './pages/HodCirculars';
import HodParentCirculars from './pages/HodParentCirculars';
import StaffManagement from './pages/StaffManagement';
import StaffMessages from './pages/StaffMessages';
import DeptMedia from './pages/DeptMedia';
import Admissions from './pages/Admissions';
import ApplicationForm from './pages/ApplicationForm';
import FeeDefaulters from './pages/FeeDefaulters';
import HostelFeedback from './pages/HostelFeedback';
import HostelWardens from './pages/HostelWardens';
import ActiveOutings from './pages/ActiveOutings';
import LateComers from './pages/LateComers';

import IssuesFeedback from './pages/IssuesFeedback';

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const role = localStorage.getItem('role');

  const PrivateRoute = ({ children, allowedRole }) => {
    if (!token) return <Navigate to="/login" />;
    
    // Fallback for existing sessions that don't have a role set
    const currentRole = role || 'super_admin';
    
    // If a specific role is required and user doesn't have it, redirect them appropriately
    if (allowedRole) {
      if (allowedRole === 'super_admin' && currentRole !== 'super_admin') {
        return <Navigate to="/dept-dashboard" />;
      }
      if (allowedRole === 'dept_admin' && currentRole !== 'dept_admin') {
        return <Navigate to="/" />;
      }
    }
    
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/apply" element={<ApplicationForm />} />
        <Route path="/dept-selection" element={<DeptSelection />} />
        <Route path="/dept-login" element={<DeptLogin setToken={setToken} />} />
        
        {/* Dept Admin Routes */}
        <Route path="/dept-dashboard" element={<PrivateRoute allowedRole="dept_admin"><DeptDashboard /></PrivateRoute>} />
        <Route path="/marks" element={<PrivateRoute allowedRole="dept_admin"><Marks /></PrivateRoute>} />
        <Route path="/timetables" element={<PrivateRoute allowedRole="dept_admin"><Timetables /></PrivateRoute>} />
        <Route path="/attendance" element={<PrivateRoute allowedRole="dept_admin">
          <DataUpdate type="attendance" title="Update Attendance" description="Bulk upload attendance percentages" icon="📅" />
        </PrivateRoute>} />
        <Route path="/placement-training" element={<PrivateRoute allowedRole="dept_admin"><PlacementTraining /></PrivateRoute>} />
        <Route path="/hod-circulars" element={<PrivateRoute allowedRole="dept_admin"><HodCirculars /></PrivateRoute>} />
        <Route path="/hod-parent-circulars" element={<PrivateRoute allowedRole="dept_admin"><HodParentCirculars /></PrivateRoute>} />
        <Route path="/dept/media" element={<PrivateRoute allowedRole="dept_admin"><DeptMedia /></PrivateRoute>} />

        {/* Shared Routes */}
        <Route path="/students" element={<PrivateRoute><Students /></PrivateRoute>} />
        <Route path="/students/:id" element={<PrivateRoute><StudentDetails /></PrivateRoute>} />
        <Route path="/staff" element={<PrivateRoute><StaffManagement /></PrivateRoute>} />
        <Route path="/hostel-wardens" element={<PrivateRoute><HostelWardens /></PrivateRoute>} />
        <Route path="/staff-messages" element={<PrivateRoute><StaffMessages /></PrivateRoute>} />

        {/* Super Admin Routes */}
        <Route path="/" element={<PrivateRoute allowedRole="super_admin"><Dashboard /></PrivateRoute>} />
        <Route path="/circulars" element={<PrivateRoute allowedRole="super_admin"><Circulars /></PrivateRoute>} />
        <Route path="/parent-circulars" element={<PrivateRoute allowedRole="super_admin"><ParentCirculars /></PrivateRoute>} />
        <Route path="/transport" element={<PrivateRoute allowedRole="super_admin">
          <DataUpdate type="transport" title="Update Transportation" description="Bulk assign bus routes and plate numbers" icon="🚐" />
        </PrivateRoute>} />

        <Route path="/college-media" element={<PrivateRoute allowedRole="super_admin"><CollegeMedia /></PrivateRoute>} />
        <Route path="/admissions" element={<PrivateRoute allowedRole="super_admin"><Admissions /></PrivateRoute>} />
        <Route path="/fee-defaulters" element={<PrivateRoute allowedRole="super_admin"><FeeDefaulters /></PrivateRoute>} />
        <Route path="/active-outings" element={<PrivateRoute allowedRole="super_admin"><ActiveOutings /></PrivateRoute>} />
        <Route path="/late-comers" element={<PrivateRoute allowedRole="super_admin"><LateComers /></PrivateRoute>} />
        
        {/* Feedback Routes */}
        <Route path="/feedback/hostel" element={<PrivateRoute allowedRole="super_admin"><HostelFeedback /></PrivateRoute>} />
        <Route path="/feedback/issues" element={<PrivateRoute allowedRole="super_admin"><IssuesFeedback /></PrivateRoute>} />

        <Route path="/settings" element={<PrivateRoute allowedRole="super_admin"><Settings /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
