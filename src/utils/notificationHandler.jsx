import React from 'react';
import { toast } from 'react-toastify';

// Track shown notifications to avoid duplicates
const shownNotificationIds = new Set();
// Track recent notifications to prevent rapid duplicates (debounce)
const recentNotificationHashes = new Map(); // hash -> timestamp
const DEBOUNCE_MS = 2000; // 2 seconds debounce

// Audio context for notification sounds
let audioContext = null;
let userHasInteracted = false;
let pendingSoundQueued = false;

// Initialize audio context
const initAudioContext = () => {
  if (typeof window === 'undefined') return null;
  
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  return audioContext;
};

// Play notification tone
const playNotificationTone = async () => {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.04;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (err) {
    console.warn('Notification sound failed:', err);
  }
};

// Mark user interaction for audio playback
const markUserInteraction = () => {
  userHasInteracted = true;
  if (pendingSoundQueued) {
    pendingSoundQueued = false;
    playNotificationTone();
  }
};

// Initialize user interaction listeners
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', markUserInteraction);
  window.addEventListener('keydown', markUserInteraction);
}

// Strip HTML tags for text preview
const stripHtml = (html) => {
  if (typeof document === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
};

// Create a hash for notification deduplication
const createNotificationHash = (notification) => {
  if ((notification.type === 'new_offer' || notification.type === 'offer_updated') && notification.offer) {
    // Use type + offer ID for unique identification
    return `${notification.type}-${notification.offer.id || notification.offer._id}`;
  }
  // For generic notifications, use type + message hash
  const message = notification.message || '';
  return `${notification.type}-${message.substring(0, 50)}`;
};

// Handle offer notification
const handleOfferNotification = (notification) => {
  const { offer, playSound } = notification;
  if (!offer) return;

  // Create unique ID for this notification using offer ID and type
  const offerId = offer.id || offer._id;
  if (!offerId) {
    console.warn('Offer notification missing ID, skipping');
    return;
  }
  
  const notificationType = notification.type || 'new_offer';
  const notificationId = `${notificationType}-${offerId}`;
  const notificationHash = createNotificationHash(notification);
  
  // Check if already shown (permanent tracking)
  if (shownNotificationIds.has(notificationId)) {
    return;
  }

  // Check debounce (recent duplicates within DEBOUNCE_MS)
  const now = Date.now();
  const lastShown = recentNotificationHashes.get(notificationHash);
  if (lastShown && (now - lastShown) < DEBOUNCE_MS) {
    return; // Skip if shown recently
  }

  // Mark as shown
  shownNotificationIds.add(notificationId);
  recentNotificationHashes.set(notificationHash, now);
  
  // Mark offer as highlighted for visual indication on offers page
  markOfferAsHighlighted(String(offerId), notificationType);
  
  // Clean up old debounce entries (older than 1 minute)
  for (const [hash, timestamp] of recentNotificationHashes.entries()) {
    if (now - timestamp > 60000) {
      recentNotificationHashes.delete(hash);
    }
  }

  // Extract offer details
  const content = stripHtml(offer.content || '');
  const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
  
  // Determine notification title based on type
  const title = notificationType === 'offer_updated' 
    ? '🔄 Offer Updated!' 
    : '🎁 New Offer Available!';

  // Create custom toast with offer details
  const toastId = toast.info(
    <div className="space-y-2 cursor-pointer">
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-gray-600">{preview || content}</div>
    </div>,
    {
      autoClose: 10000,
      closeOnClick: true,
      onClick: () => {
        toast.dismiss(toastId);
        window.location.href = '/offers';
      },
    }
  );

  // Play sound if requested
  if (playSound) {
    if (userHasInteracted) {
      playNotificationTone();
    } else {
      pendingSoundQueued = true;
    }
  }

  // Dispatch custom event for components that want to handle it
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('offerNotification', {
      detail: { notification, offer }
    }));
  }
};

// Handle generic notification
const handleGenericNotification = (notification) => {
  const { type, message, playSound } = notification;
  const notificationHash = createNotificationHash(notification);
  
  // Check debounce (recent duplicates within DEBOUNCE_MS)
  const now = Date.now();
  const lastShown = recentNotificationHashes.get(notificationHash);
  if (lastShown && (now - lastShown) < DEBOUNCE_MS) {
    return; // Skip if shown recently
  }

  // Mark as shown
  recentNotificationHashes.set(notificationHash, now);
  
  // Clean up old debounce entries (older than 1 minute)
  for (const [hash, timestamp] of recentNotificationHashes.entries()) {
    if (now - timestamp > 60000) {
      recentNotificationHashes.delete(hash);
    }
  }

  toast.info(message || 'New notification', {
    autoClose: 5000,
  });

  if (playSound) {
    if (userHasInteracted) {
      playNotificationTone();
    } else {
      pendingSoundQueued = true;
    }
  }
};

// Main handler for pending notifications
export const handlePendingNotifications = (responseData) => {
  if (!responseData || !responseData.data) return;

  const pendingNotifications = responseData.data.pendingNotifications;
  if (!pendingNotifications || !Array.isArray(pendingNotifications)) return;

  pendingNotifications.forEach((notification) => {
    if (!notification || !notification.type) return;

    switch (notification.type) {
      case 'new_offer':
      case 'offer_updated':
        handleOfferNotification(notification);
        break;
      default:
        handleGenericNotification(notification);
        break;
    }
  });
};

// Clear shown notifications (useful for testing or reset)
export const clearShownNotifications = () => {
  shownNotificationIds.clear();
};

// Store highlighted offer IDs (for visual highlighting on offers page)
const HIGHLIGHTED_OFFERS_KEY = 'highlighted_offers';

// Mark an offer as highlighted
export const markOfferAsHighlighted = (offerId, notificationType) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Normalize offer ID - handle ObjectId objects
    let normalizedId = offerId;
    if (offerId && typeof offerId === 'object' && offerId.toString) {
      normalizedId = offerId.toString();
    } else {
      normalizedId = String(offerId);
    }
    
    const highlighted = JSON.parse(localStorage.getItem(HIGHLIGHTED_OFFERS_KEY) || '{}');
    highlighted[normalizedId] = {
      type: notificationType, // 'new_offer' or 'offer_updated'
      timestamp: Date.now()
    };
    localStorage.setItem(HIGHLIGHTED_OFFERS_KEY, JSON.stringify(highlighted));
    
    // Dispatch event to update components
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('highlightedOffersUpdated', {
        detail: { highlighted }
      }));
    }
    
    console.log('[NotificationHandler] Marked offer as highlighted:', normalizedId, notificationType);
  } catch (error) {
    console.warn('Failed to save highlighted offer:', error);
  }
};

// Get highlighted offers
export const getHighlightedOffers = () => {
  if (typeof window === 'undefined') return {};
  
  try {
    return JSON.parse(localStorage.getItem(HIGHLIGHTED_OFFERS_KEY) || '{}');
  } catch (error) {
    console.warn('Failed to get highlighted offers:', error);
    return {};
  }
};

// Clear highlighted offers (called when user visits offers page)
export const clearHighlightedOffers = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(HIGHLIGHTED_OFFERS_KEY);
  } catch (error) {
    console.warn('Failed to clear highlighted offers:', error);
  }
};

