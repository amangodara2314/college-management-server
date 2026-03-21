const subjectRepository = require("./subject.repository");
const { generateSubjectCode } = require("../../utils/generateSubjectCode");

/**
 * Create a new subject
 */
const createSubject = async (data) => {
  const { name, code } = data;

  // Check if subject with same name already exists
  const nameExists = await subjectRepository.subjectExistsByName(name);
  if (nameExists) {
    throw new Error("Subject with this name already exists");
  }

  // If code is provided, check if it's unique
  if (code) {
    const codeExistsBool = await subjectRepository.codeExists(code);
    if (codeExistsBool) {
      throw new Error("Subject code already exists");
    }
  } else {
    // Generate code automatically
    data.code = await generateSubjectCode(name);
  }

  return await subjectRepository.createSubject(data);
};

/**
 * Get all subjects with pagination and filters
 */
const getAllSubjects = async (filters) => {
  return await subjectRepository.getAllSubjects(filters);
};

/**
 * Get subject by ID
 */
const getSubjectById = async (id) => {
  const subject = await subjectRepository.getSubjectById(id);
  if (!subject) {
    throw new Error("Subject not found");
  }
  return subject;
};

/**
 * Update subject
 */
const updateSubject = async (id, data) => {
  // Check if subject exists
  const existingSubject = await subjectRepository.getSubjectById(id);
  if (!existingSubject) {
    throw new Error("Subject not found");
  }

  // If name is being updated, check for duplicates
  if (data.name && data.name !== existingSubject.name) {
    const nameExists = await subjectRepository.subjectExistsByName(
      data.name,
      id,
    );
    if (nameExists) {
      throw new Error("Subject with this name already exists");
    }
  }

  // If code is being updated, check if it's unique
  if (data.code && data.code !== existingSubject.code) {
    const codeExistsBool = await subjectRepository.codeExists(data.code, id);
    if (codeExistsBool) {
      throw new Error("Subject code already exists");
    }
  }

  return await subjectRepository.updateSubject(id, data);
};

/**
 * Delete subject
 */
const deleteSubject = async (id) => {
  // Check if subject exists
  const subject = await subjectRepository.getSubjectById(id);
  if (!subject) {
    throw new Error("Subject not found");
  }

  // Check if subject is being used (has student subjects or marks)
  if (subject._count.studentSubjects > 0) {
    throw new Error(
      "Cannot delete subject. It is assigned to students. Please remove student assignments first.",
    );
  }

  if (subject._count.marks > 0) {
    throw new Error(
      "Cannot delete subject. It has exam marks recorded. Please remove marks first.",
    );
  }

  return await subjectRepository.deleteSubject(id);
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
