export const generateCourseCode = (courseName) => {
  const ignoredWords = ["OF", "IN", "AND", "THE"];

  const words = courseName
    .toUpperCase()
    .split(" ")
    .filter((word) => !ignoredWords.includes(word));

  if (words.length === 1) {
    return words[0].slice(0, 4);
  }

  return words.map((word) => word[0]).join("");
};
