import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Import our components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for login state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // We force the spinner to stay for 1 second so it looks professional
      setTimeout(() => setLoading(false), 1000); 
    });
    return () => unsubscribe();
  }, []);

  // --- THIS IS THE ROLLING CIRCLE SECTION ---
  if (loading) {
    return (
      <div className="min-h-screen bg-verbatim-navy flex flex-col items-center justify-center text-white">
        {/* The Spinner */}
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-verbatim-orange mb-6 shadow-[0_0_20px_rgba(255,77,0,0.6)]"></div>
        
        {/* Optional Branding Text */}
        <p className="text-verbatim-orange font-bold text-xl animate-pulse tracking-[0.3em]">
          VERBATIM
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* If user is NOT logged in, show Landing Page */}
        <Route 
          path="/" 
          element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} 
        />

        {/* Protected Route: Only show Dashboard if user is logged in */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard user={user} /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;