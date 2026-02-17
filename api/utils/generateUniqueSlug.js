// utils/generateUniqueSlug.js

export const generateUniqueSlug = async ({
  model,
  baseValue,
  scope = {},
  session = null,
}) => {
  const baseSlug = baseValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug, ...scope };

    const exists = session
      ? await model.findOne(query).session(session).lean()
      : await model.findOne(query).lean();

    if (!exists) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};
