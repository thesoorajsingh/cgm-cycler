import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export async function requestNotificationPermission(): Promise<boolean> {
  // If not running on native platform or PWA with notification support, return false
  // Capacitor LocalNotifications works on Web too if implemented, or we can use Notification API directly.
  // The plugin handles web support via standard API.

  if (Capacitor.isNativePlatform()) {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  } else {
    // Web Fallback
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}

export async function schedulePostMealReminder(mealTimestamp: number): Promise<void> {
  // 2 Hours after meal
  const triggerTime = new Date(mealTimestamp + (2 * 60 * 60 * 1000));

  // Don't schedule if in the past
  if (triggerTime.getTime() <= Date.now()) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission denied');
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'Check your Glucose',
        body: 'It has been 2 hours since your meal. Time to check your levels!',
        id: Math.floor(Math.random() * 100000), // Random ID
        schedule: { at: triggerTime },
        sound: undefined,
        attachments: undefined,
        actionTypeId: "",
        extra: null
      }]
    });
    console.log(`Notification scheduled for ${triggerTime.toLocaleTimeString()}`);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}
