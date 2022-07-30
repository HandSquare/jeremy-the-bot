const getHoursMinutesDate = () => {
  // produces time like 18:30 or 05:30
  return new Date()
    .toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
    })
    .slice(0, 5);
};

let time = getHoursMinutesDate();

const events = {};
const startTimer = () => {
  setInterval(() => {
    time = getHoursMinutesDate();

    if (events[time] && events[time].length > 0) {
      events[time].forEach((evt) => {
        if (typeof evt === 'function') evt();
      });
    }
  }, 60000);
};

// at('12:30', console.log)
const at = (time, task) => {
  if (!events[time]) events[time] = [];
  events[time].push(task);
};

startTimer();

console.log(time);

at('12:22', () => console.log('its 12:22'));

module.exports = {
  at,
  startTimer,
};
