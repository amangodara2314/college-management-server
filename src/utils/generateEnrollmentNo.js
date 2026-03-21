// Generate enrollment number utility

export const generateEnrollmentNo = async (tx, courseCode, year) => {
  const prefix = `${courseCode}${year}`;

  const count = await tx.admission.count({
    where: {
      enrollmentNo: {
        startsWith: prefix,
      },
    },
  });

  const serial = (count + 1).toString().padStart(3, "0");

  return `${prefix}${serial}`;
};
