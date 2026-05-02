const axios = require('axios');

const API_URL = 'http://20.207.122.201/evaluation-service/notifications';
const TOKEN = 'paste_your_token_here';

const priorityRank = {
  Placement: 3,
  Result: 2,
  Event: 1
};

const toArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  if (data && Array.isArray(data.notifications)) {
    return data.notifications;
  }

  return [];
};

const getType = (item) => item.type || item.notificationType || item.category || 'Event';
const getTime = (item) => item.createdAt || item.timestamp || item.time || 0;

const getTopNotifications = async () => {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    const notifications = toArray(response.data);

    const sorted = [...notifications].sort((a, b) => {
      const p1 = priorityRank[getType(a)] || 0;
      const p2 = priorityRank[getType(b)] || 0;

      if (p1 !== p2) {
        return p2 - p1;
      }

      return new Date(getTime(b)) - new Date(getTime(a));
    });

    const top10 = sorted.slice(0, 10);
    console.log(top10);
    return top10;
  } catch (error) {
    console.log('Error fetching notifications:', error.message);
    return [];
  }
};

getTopNotifications();
