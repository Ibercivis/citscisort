import api from './api';

const notificationService = {
  getNotifications: async () => {
    const response = await api.get('/api/notifications/');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/api/notifications/unread_count/');
    return response.data.unread_count ?? 0;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await api.patch(`/api/notifications/${notificationId}/mark_as_read/`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.post('/api/notifications/mark_all_as_read/');
    return response.data;
  },
};

export default notificationService;
