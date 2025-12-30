/**
 * Activity Tracker Utility
 * 
 * Monitors user activity (mouse movements, clicks, keyboard input, scroll, touch)
 * and provides callbacks for activity detection and inactivity timeout.
 */

class ActivityTracker {
  constructor(options = {}) {
    this.inactivityTimeout = options.inactivityTimeout || 4 * 60 * 1000; // 4 minutes default
    this.onInactive = options.onInactive || null;
    this.onActivity = options.onActivity || null;
    this.timer = null;
    this.isTracking = false;
    this.lastActivityTime = Date.now();
    
    // Bind methods to preserve context
    this.handleActivity = this.handleActivity.bind(this);
    this.resetTimer = this.resetTimer.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Handle user activity - reset the timer
   */
  handleActivity() {
    if (!this.isTracking) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    // Only reset if significant time has passed (avoid too frequent resets)
    if (timeSinceLastActivity > 1000) { // At least 1 second between resets
      this.lastActivityTime = now;
      this.resetTimer();
      
      if (this.onActivity) {
        this.onActivity();
      }
    }
  }

  /**
   * Reset the inactivity timer
   */
  resetTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    this.timer = setTimeout(() => {
      if (this.onInactive) {
        this.onInactive();
      }
    }, this.inactivityTimeout);
  }

  /**
   * Start tracking user activity
   */
  start() {
    if (this.isTracking) {

      this.stop();
    }
    
    this.isTracking = true;
    this.lastActivityTime = Date.now();
    
    // Events to track
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });
    
    // Also track visibility changes (when user switches tabs/windows)
    document.addEventListener('visibilitychange', this.handleActivity, { passive: true });
    
    // Listen for custom activity events (e.g., from API calls)
    window.addEventListener('userActivity', this.handleActivity, { passive: true });
    
    // Start the timer
    this.resetTimer();
    

  }

  /**
   * Stop tracking user activity
   */
  stop() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    // Clear the timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // Remove event listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'visibilitychange',
    ];
    
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity);
    });
    
    // Remove custom activity event listener
    window.removeEventListener('userActivity', this.handleActivity);
    

  }

  /**
   * Get time remaining until inactivity timeout (in milliseconds)
   */
  getTimeRemaining() {
    if (!this.isTracking || !this.timer) {
      return 0;
    }
    
    const elapsed = Date.now() - this.lastActivityTime;
    return Math.max(0, this.inactivityTimeout - elapsed);
  }

  /**
   * Check if currently tracking
   */
  isActive() {
    return this.isTracking;
  }
}

// Export singleton instance creator
export const createActivityTracker = (options) => {
  return new ActivityTracker(options);
};

export default ActivityTracker;

