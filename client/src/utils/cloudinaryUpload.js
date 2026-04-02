import imageCompression from "browser-image-compression";
import { buildCsrfHeaders } from "./http";

const MAX_IMAGE_SIZE_MB = 2;
const MAX_VIDEO_SIZE_MB = 50;

const buildPublicId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const prepareImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return file;
  }

  return imageCompression(file, {
    maxSizeMB: MAX_IMAGE_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
};

const prepareVideo = async (file) => {
  if (!file.type.startsWith("video/")) {
    throw new Error("Please choose a video file.");
  }

  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    throw new Error(`Video must be ${MAX_VIDEO_SIZE_MB}MB or smaller.`);
  }

  return file;
};

const getUploadSignature = async ({ folder, resourceType, publicId }) => {
  const res = await fetch("/api/media/signature", {
    method: "POST",
    headers: buildCsrfHeaders({
      "Content-Type": "application/json",
    }),
    credentials: "include",
    body: JSON.stringify({
      folder,
      resourceType,
      publicId,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to prepare upload.");
  }

  return data.data;
};

export const uploadToCloudinary = async ({
  file,
  folder,
  resourceType = "image",
  publicIdPrefix = "file",
}) => {
  const preparedFile =
    resourceType === "video" ? await prepareVideo(file) : await prepareImage(file);
  const publicId = buildPublicId(publicIdPrefix);
  const signatureData = await getUploadSignature({
    folder,
    resourceType,
    publicId,
  });

  const formData = new FormData();
  formData.append("file", preparedFile);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);

  if (signatureData.publicId) {
    formData.append("public_id", signatureData.publicId);
  }

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const uploadData = await uploadRes.json();

  if (!uploadRes.ok) {
    throw new Error(uploadData.error?.message || "Upload failed.");
  }

  return {
    url: uploadData.secure_url,
    publicId: uploadData.public_id,
    format: uploadData.format,
    resourceType: uploadData.resource_type,
  };
};
