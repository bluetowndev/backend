const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_START_HOUR_IST = 3;

const getTodayIST = (now) => {
  const d = now || new Date();
  const istTime = new Date(d.getTime() + IST_OFFSET_MS);
  const adjustedTime = new Date(istTime.getTime() - (DAY_START_HOUR_IST * 60 * 60 * 1000));
  return adjustedTime.toISOString().split('T')[0];
};

module.exports = { getTodayIST };
