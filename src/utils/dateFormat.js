const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const convertToUtc = (date) => {
  // If date is already a Date object, return it
  if (date instanceof Date) {
    return date;
  }

  // Parse the date using dayjs
  const parsedDate = dayjs(date);

  // Check if the date is valid
  if (!parsedDate.isValid()) {
    throw new Error(`Invalid date: ${date}`);
  }

  // Convert to UTC and return as Date object
  return parsedDate.utc().toDate();
};

module.exports = { convertToUtc };
