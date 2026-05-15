type TimerCallback = () => void | Promise<void>;

const getHoursMinutesDate = (): string => {
  // produces time like 18:30 or 05:30
  return new Date()
    .toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
    })
    .slice(0, 5);
};

let time = getHoursMinutesDate();

const events: Record<string, TimerCallback[]> = {};
const startTimer = (): void => {
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
const at = (time: string, task: TimerCallback): void => {
  if (!events[time]) events[time] = [];
  events[time].push(task);
};

const getSecondsToSlackTimestamp = (ts: string): number => {
  const secondsNow = parseInt(Date.now().toString().slice(0, 10));
  return secondsNow - parseFloat(ts);
};

export { at, startTimer, getSecondsToSlackTimestamp };
