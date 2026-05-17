/**
 * Notification Template System
 * Extracts parameters from notification messages and renders with i18n
 */

export interface NotificationParams {
  scholarshipName?: string;
  provider?: string;
  count?: number;
  days?: number;
  userName?: string;
  [key: string]: string | number | undefined;
}

/**
 * Extract template type and params from notification
 */
export function parseNotification(notification: {
  type: string;
  title: string;
  message: string;
  opportunityTitle?: string; // Added from backend
}): { templateKey: string; params: NotificationParams } {
  const { type, message, opportunityTitle } = notification;

  // Validate message exists
  if (!message || typeof message !== 'string') {
    return {
      templateKey: 'notification.default',
      params: {},
    };
  }

  // Use opportunityTitle from backend if available, otherwise try to extract from message
  let scholarshipName = opportunityTitle;
  
  if (!scholarshipName) {
    // Fallback: Extract scholarship name from message
    // Match patterns like "to MIT AI Research Fellowship has been", "for Stanford Program is", "to Google Scholarship matches"
    const scholarshipMatch = message.match(/(?:to|for|cho học bổng)\s+"?([^"]+)"?\s+(?:has been|has|is being|is|matches|đã|được)/);
    scholarshipName = scholarshipMatch ? scholarshipMatch[1].trim() : undefined;
  }

  // Extract user name from message
  const userMatch = message.match(/^([^\s]+(?:\s+[^\s]+)?)\s+has applied/);
  const userName = userMatch ? userMatch[1].trim() : undefined;

  // Extract numbers
  const countMatch = message.match(/(\d+)\s+(?:pending|new scholarships?)/);
  const count = countMatch ? parseInt(countMatch[1]) : undefined;

  const daysMatch = message.match(/\((\d+)\s+days?\s+left\)|(?:in\s+)?(\d+)\s+(?:weeks?|days?)/);
  const days = daysMatch ? parseInt(daysMatch[1] || daysMatch[2]) : undefined;

  // Map type to template key
  let templateKey = 'notification.default';

  switch (type) {
    case 'APPLICATION_STATUS':
      if (message.includes('accepted') || message.includes('chấp nhận')) {
        templateKey = 'notification.applicationAccepted';
      } else if (message.includes('rejected') || message.includes('từ chối')) {
        templateKey = 'notification.applicationRejected';
      } else if (message.includes('received') || message.includes('nhận được')) {
        templateKey = 'notification.applicationReceived';
      } else if (message.includes('reviewed') || message.includes('being reviewed') || message.includes('xem xét')) {
        templateKey = 'notification.applicationUnderReview';
      } else if (message.includes('waitlist') || message.includes('danh sách chờ')) {
        templateKey = 'notification.applicationWaitlist';
      }
      break;

    case 'MATCH':
      templateKey = 'notification.newMatch';
      break;

    case 'REMINDER':
      if (message.includes('deadline')) {
        templateKey = 'notification.deadlineReminder';
      } else if (message.includes('pending')) {
        templateKey = 'notification.reviewReminder';
      }
      break;

    case 'APPLICATION':
      templateKey = 'notification.newApplication';
      break;

    case 'NEW_SCHOLARSHIP':
      templateKey = 'notification.newScholarship';
      break;

    default:
      templateKey = 'notification.default';
  }

  return {
    templateKey,
    params: {
      scholarshipName,
      userName,
      count,
      days,
    },
  };
}

/**
 * Get notification icon emoji based on type
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'APPLICATION_STATUS':
      return '📋';
    case 'NEW_SCHOLARSHIP':
      return '🎓';
    case 'MESSAGE':
      return '💬';
    case 'REMINDER':
      return '⏰';
    case 'MATCH':
      return '✨';
    case 'APPLICATION':
      return '📝';
    default:
      return '🔔';
  }
}
