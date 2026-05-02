const sendReminder = (vehicle) => {
  const msg = `Reminder: Service due for ${vehicle.name}`;
  console.log(msg);
};

const notifyAll = (vehicles) => {
  vehicles.forEach(v => {
    sendReminder(v);
  });
};

module.exports = {
  sendReminder,
  notifyAll
};
