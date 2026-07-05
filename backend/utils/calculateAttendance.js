// Utility to calculate attendance percentage
exports.calculateAttendancePercentage = (attended, total) => {
  if (total === 0) return 0;
  return Math.round((attended / total) * 100);
};
