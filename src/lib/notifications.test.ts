import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Capacitor } from '@capacitor/core';

// Inline mocks to avoid hoisting issues
vi.mock('@capacitor/local-notifications', () => {
  const schedule = vi.fn();
  const requestPermissions = vi.fn();
  return {
    LocalNotifications: {
      schedule,
      requestPermissions
    }
  };
});

vi.mock('@capacitor/core', () => {
  const isNativePlatform = vi.fn(() => true);
  return {
    Capacitor: {
      isNativePlatform
    }
  };
});

// Import after mocking
import { schedulePostMealReminder, requestNotificationPermission } from './notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (LocalNotifications.requestPermissions as any).mockResolvedValue({ display: 'granted' });
    (Capacitor.isNativePlatform as any).mockReturnValue(true);
  });

  it('should request permission and schedule notification 2 hours later', async () => {
    const mealTime = Date.now();
    await schedulePostMealReminder(mealTime);

    expect(LocalNotifications.requestPermissions).toHaveBeenCalled();
    expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);

    const callArgs = (LocalNotifications.schedule as any).mock.calls[0][0];
    const scheduledTime = callArgs.notifications[0].schedule.at;

    // Check if scheduled time is approx 2 hours later
    const diff = scheduledTime.getTime() - mealTime;
    expect(diff).toBeCloseTo(2 * 60 * 60 * 1000, -3); // Within 1 second tolerance
  });

  it('should not schedule if permission denied', async () => {
    (LocalNotifications.requestPermissions as any).mockResolvedValue({ display: 'denied' });
    await schedulePostMealReminder(Date.now());
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it('should handle web platform', async () => {
    (Capacitor.isNativePlatform as any).mockReturnValue(false);

    // Mock window object for web platform test
    vi.stubGlobal('window', { Notification: {} });

    // Mock Notification API
    const webRequestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('Notification', {
      requestPermission: webRequestPermission,
      permission: 'default'
    });

    await schedulePostMealReminder(Date.now());

    expect(webRequestPermission).toHaveBeenCalled();
    expect(LocalNotifications.schedule).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
