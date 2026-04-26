const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { r2Client, r2BucketName, r2PublicUrl } = require("../config/r2");
const { getUploadDateFolder } = require("./uploadDateFolder");
const { appendExpiryToFilename } = require("./appendExpiryToFilename");

const hasR2Config = () =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY &&
      process.env.R2_SECRET_KEY &&
      r2BucketName &&
      r2PublicUrl,
  );

const safeName = (name = "image") => {
  const cleaned = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "image";
};

const tryRemoveFile = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
};

/**
 * Raster → WebP variants (thumb / card / full). Falls back to single WebP or original.
 * @returns {Promise<{ variants: { thumb: Buffer, card: Buffer, full: Buffer } } | null>}
 */
const tryEncodeWebpVariants = async (inputBuffer, mimetype) => {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    return null;
  }
  const mt = String(mimetype || "").toLowerCase();
  const supported = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  if (!supported.has(mt)) return null;

  const base = sharp(inputBuffer).rotate();
  const [thumb, card, full] = await Promise.all([
    base
      .clone()
      .resize(200, 200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer(),
    base
      .clone()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    base
      .clone()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
  ]);
  return { variants: { thumb, card, full } };
};

/** Single WebP (legacy path when variants fail mid-way). */
const tryEncodeWebpSingle = async (inputBuffer, mimetype) => {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    return null;
  }
  const mt = String(mimetype || "").toLowerCase();
  const supported = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  if (!supported.has(mt)) return null;
  const body = await sharp(inputBuffer).rotate().webp({ quality: 82 }).toBuffer();
  return { body, contentType: "image/webp", ext: ".webp" };
};

/**
 * @param {object} file - multer file
 * @param {string} folder - R2 prefix (e.g. "products")
 * @param {{ expireDate?: string }} [options] - if expireDate is set, filename gets `-exp-YYYY-MM-DD` before extension (products)
 * @returns {Promise<{ url: string, key: string|null, storage: string, urls?: { thumb: string, standard: string, full: string } }>}
 */
const uploadImage = async (file, folder = "images", options = {}) => {
  if (!file) {
    const err = new Error("No file uploaded");
    err.statusCode = 400;
    throw err;
  }

  let ext = path.extname(file.originalname || file.filename || "") || ".jpg";
  const base = safeName(path.basename(file.originalname || file.filename || "image", ext));
  const dateFolder = getUploadDateFolder();
  const expireRaw = options?.expireDate;

  const rawBuffer = file.buffer || fs.readFileSync(file.path);
  let contentType = file.mimetype || "application/octet-stream";

  const variants = await tryEncodeWebpVariants(rawBuffer, file.mimetype);
  const webpSingle =
    variants == null ? await tryEncodeWebpSingle(rawBuffer, file.mimetype) : null;

  const stemForKeys = (suffix) => {
    const name = `${base}-${suffix}.webp`;
    return expireRaw != null && String(expireRaw).trim() !== ""
      ? appendExpiryToFilename(name, expireRaw)
      : name;
  };

  const putLocalWebp = (buf, filename) => {
    const destPath = path.join("uploads", filename);
    fs.writeFileSync(destPath, buf);
    return `/uploads/${filename}`;
  };

  if (!hasR2Config()) {
    if (variants) {
      const stem = path.basename(file.filename, path.extname(file.filename));
      const thumbName = `${stem}-thumb.webp`;
      const cardName = `${stem}-card.webp`;
      const fullName = `${stem}-full.webp`;
      const thumbUrl = putLocalWebp(variants.variants.thumb, thumbName);
      const cardUrl = putLocalWebp(variants.variants.card, cardName);
      const fullUrl = putLocalWebp(variants.variants.full, fullName);
      tryRemoveFile(file.path);
      return {
        url: cardUrl,
        key: null,
        storage: "local",
        urls: { thumb: thumbUrl, standard: cardUrl, full: fullUrl },
      };
    }
    if (webpSingle) {
      const stem = path.basename(file.filename, path.extname(file.filename));
      const newFilename = `${stem}.webp`;
      const destPath = path.join("uploads", newFilename);
      fs.writeFileSync(destPath, webpSingle.body);
      tryRemoveFile(file.path);
      return {
        url: `/uploads/${newFilename}`,
        key: null,
        storage: "local",
      };
    }
    return {
      url: `/uploads/${file.filename}`,
      key: null,
      storage: "local",
    };
  }

  const ts = Date.now();

  if (variants) {
    const ct = "image/webp";
    const keyThumb = `${folder}/${dateFolder}/${ts}-${stemForKeys("thumb")}`;
    const keyCard = `${folder}/${dateFolder}/${ts}-${stemForKeys("card")}`;
    const keyFull = `${folder}/${dateFolder}/${ts}-${stemForKeys("full")}`;

    await Promise.all([
      r2Client.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: keyThumb,
          Body: variants.variants.thumb,
          ContentType: ct,
        }),
      ),
      r2Client.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: keyCard,
          Body: variants.variants.card,
          ContentType: ct,
        }),
      ),
      r2Client.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: keyFull,
          Body: variants.variants.full,
          ContentType: ct,
        }),
      ),
    ]);

    tryRemoveFile(file.path);

    return {
      url: `${r2PublicUrl}/${keyCard}`,
      key: keyCard,
      storage: "r2",
      urls: {
        thumb: `${r2PublicUrl}/${keyThumb}`,
        standard: `${r2PublicUrl}/${keyCard}`,
        full: `${r2PublicUrl}/${keyFull}`,
      },
    };
  }

  let body = rawBuffer;
  let outContentType = file.mimetype || "application/octet-stream";
  let outExt = ext;
  if (webpSingle) {
    body = webpSingle.body;
    outContentType = webpSingle.contentType;
    outExt = webpSingle.ext;
  }

  const nameWithExt =
    expireRaw != null && String(expireRaw).trim() !== ""
      ? appendExpiryToFilename(`${base}${outExt}`, expireRaw)
      : `${base}${outExt}`;
  const key = `${folder}/${dateFolder}/${ts}-${nameWithExt}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: body,
      ContentType: outContentType,
    }),
  );

  tryRemoveFile(file.path);

  return {
    url: `${r2PublicUrl}/${key}`,
    key,
    storage: "r2",
  };
};

module.exports = { uploadImage };
