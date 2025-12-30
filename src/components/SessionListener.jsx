import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { listenForNewLogin, clearSession, getCurrentSessionId, getCurrentUserId, setSessionId, generateSessionId } from '../utils/sessionManager';

/**
 * SessionListener Component
 * 
 * Listens for new login events from other browser tabs.
 * When a new login is detected for the same user, it automatically
 * logs out the current session and redirects to login page.
 */
const SessionListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Always set up listener, but only act if authenticated
    const isAuthenticated = localStorage.getItem('authToken');
    
    // Ensure existing sessions also have a session ID
    // This is important for users who logged in before this feature was added
    const currentSessionId = getCurrentSessionId();
    const currentUserId = getCurrentUserId();
    
    if (isAuthenticated) {
      if (!currentSessionId && currentUserId) {

        const newSessionId = generateSessionId();
        setSessionId(newSessionId);

      }


    } else {

    }

    // Set up listener for cross-tab login events (always active)
    const cleanup = listenForNewLogin(() => {
      // Only process if currently authenticated
      const stillAuthenticated = localStorage.getItem('authToken');
      if (!stillAuthenticated) {

        return;
      }


      // Clear session data
      clearSession();
      
      // Show notification
      toast.info('You have been logged out because you logged in on another tab.', {
        autoClose: 5000,
      });

      // Redirect to login page
      navigate('/login', { replace: true });
    });

    // Cleanup listener on unmount
    return cleanup;
  }, [navigate]);

  // This component doesn't render anything
  return null;
};

export default SessionListener;

