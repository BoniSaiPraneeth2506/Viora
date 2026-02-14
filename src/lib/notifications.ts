import {sanityWriteClient} from './write-client';

export const createNotification = async ({
  recipientId,
  senderId,
  type,
  message,
  startupId,
  reelId,
  commentId,
  milestoneType,
  milestoneValue,
}: {
  recipientId: string;
  senderId?: string;
  type: string;
  message: string;
  startupId?: string;
  reelId?: string;
  commentId?: string;
  milestoneType?: string;
  milestoneValue?: number;
}) => {
  try {
    const notification = {
      _type: 'notification',
      recipient: {
        _type: 'reference',
        _ref: recipientId,
      },
      ...(senderId && {
        sender: {
          _type: 'reference',
          _ref: senderId,
        },
      }),
      type,
      message,
      read: false,
      ...(startupId && {
        startup: {
          _type: 'reference',
          _ref: startupId,
        },
      }),
      ...(reelId && {
        reel: {
          _type: 'reference',
          _ref: reelId,
        },
      }),
      ...(commentId && {
        comment: {
          _type: 'reference',
          _ref: commentId,
        },
      }),
      ...(milestoneType && {milestoneType}),
      ...(milestoneValue && {milestoneValue}),
    };

    const result = await sanityWriteClient.create(notification);
    console.log('Notification created:', result._id);
    return result;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const markNotificationRead = async (notificationId: string) => {
  try {
    const result = await sanityWriteClient
      .patch(notificationId)
      .set({read: true})
      .commit();
    return result;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  try {
    // First, get all unread notifications for the user
    const unreadNotifications = await sanityWriteClient.fetch(
      `*[_type == "notification" && recipient._ref == $userId && read == false]._id`,
      {userId}
    );

    if (unreadNotifications.length === 0) return;

    // Mark all as read using a transaction
    const transaction = sanityWriteClient.transaction();
    unreadNotifications.forEach((id: string) => {
      transaction.patch(id, {set: {read: true}});
    });

    const result = await transaction.commit();
    console.log(`Marked ${unreadNotifications.length} notifications as read`);
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};