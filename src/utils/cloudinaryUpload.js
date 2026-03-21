const cloudinary = require("../config/cloudinary");

const streamUpload = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
};

exports.uploadSingle = async (file, folder = "uploads") => {
  return streamUpload(file.buffer, folder);
};

exports.uploadMultiple = async (files, folder = "uploads") => {
  const uploads = files.map((file) => streamUpload(file.buffer, folder));
  return Promise.all(uploads);
};

exports.deleteFile = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

exports.replaceFile = async (file, oldPublicId, folder) => {
  if (oldPublicId) {
    await cloudinary.uploader.destroy(oldPublicId);
  }

  return streamUpload(file.buffer, folder);
};
