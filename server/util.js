const { getStateValue } = require('./db');

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const getCurrentAtWork = async () => {
  const newCurrentWork = await getStateValue('at_work');
  let currentlyAtWork = Object.values(newCurrentWork).filter(
    (v) => v === true
  ).length;
  return currentlyAtWork;
};

module.exports = {
  delay,
  getCurrentAtWork,
};
