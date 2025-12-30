import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createActivityTracker } from '../utils/activityTracker';
import { clearSession } from '../utils/sessionManager';

/**
 * InactivityTimer Component
 * 
 * Monitors user activity and automatically logs out after 30 minutes of inactivity.
 * Shows a real-time countdown warning when 1 minute or less remains.
 * This component doesn't render anything - it just handles the inactivity logic.
 */
const InactivityTimer = () => {
  const navigate = useNavigate();
  const trackerRef = useRef(null);
  const warningToastRef = useRef(null);
  const warningIntervalRef = useRef(null);

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('authToken');
    
    if (!isAuthenticated) {

      return;
    }


    // Create activity tracker with 30-minute timeout
    const tracker = createActivityTracker({
      inactivityTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
      
      onActivity: () => {
        // Clear any warning toast when user becomes active again
        if (warningToastRef.current) {
          toast.dismiss('inactivity-warning');
          warningToastRef.current = null;
        }
      },
      
      onInactive: () => {

        // Clear session
        clearSession();
        
        // Show logout notification
        toast.info('You have been automatically logged out due to inactivity (30 minutes).', {
          autoClose: 5000,
        });
        
        // Redirect to login
        navigate('/login', { replace: true });
      },
    });

    trackerRef.current = tracker;
    
    // Start tracking
    tracker.start();

    // Show warning at 1 minute (1 minute before logout) with real-time countdown
    // Update every second to show live countdown
    warningIntervalRef.current = setInterval(() => {
      if (tracker.isActive()) {
        const timeRemaining = tracker.getTimeRemaining();
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        
        // Show warning when 1 minute or less remains
        if (secondsRemaining <= 60 && secondsRemaining > 0) {
          const minutes = Math.floor(secondsRemaining / 60);
          const seconds = secondsRemaining % 60;
          let timeText;
          
          if (minutes > 0) {
            timeText = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
          } else {
            timeText = `${seconds} second${seconds !== 1 ? 's' : ''}`;
          }
          
          // Update or create warning toast with real-time countdown
          const toastId = 'inactivity-warning';
          const autoCloseTime = Math.min(secondsRemaining * 1000, 60000);
          // Calculate progress: 1.0 when 60 seconds remain, 0.0 when 0 seconds remain
          const progressValue = Math.max(0, Math.min(1, secondsRemaining / 60));
          
          if (warningToastRef.current) {
            // Update existing toast with new countdown and progress
            toast.update(toastId, {
              render: `You will be logged out in ${timeText} due to inactivity.`,
              type: 'warning',
              autoClose: autoCloseTime,
              progress: progressValue, // Progress bar: 1.0 = full time, 0.0 = time up
            });
          } else {
            // Create new warning toast
            warningToastRef.current = toast.warning(
              `You will be logged out in ${timeText} due to inactivity.`,
              {
                autoClose: autoCloseTime, // Show until logout or max 1 minute
                position: 'top-center',
                toastId: toastId, // Use fixed ID so we can update it
                progress: progressValue, // Progress bar: 1.0 = full time, 0.0 = time up
                progressStyle: {
                  background: '#f59e0b', // Amber color for warning
                },
              }
            );
          }
        } else if (secondsRemaining > 60 && warningToastRef.current) {
          // More than 1 minute remaining, dismiss warning
          toast.dismiss('inactivity-warning');
          warningToastRef.current = null;
        }
      } else {
        // Tracker stopped, clear interval
        if (warningIntervalRef.current) {
          clearInterval(warningIntervalRef.current);
          warningIntervalRef.current = null;
        }
      }
    }, 1000); // Update every 1 second for real-time countdown

    // Cleanup function
    return () => {

      // Clear warning check interval
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
        warningIntervalRef.current = null;
      }
      
      // Dismiss any active warning toast
      if (warningToastRef.current) {
        toast.dismiss('inactivity-warning');
        warningToastRef.current = null;
      }
      
      // Stop activity tracker
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }
    };
  }, [navigate]);

  // This component doesn't render anything
  return null;
};

export default InactivityTimer;

