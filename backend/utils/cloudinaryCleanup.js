const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config');

const cloudName = (CLOUDINARY_CLOUD_NAME || '').trim();
const apiKey = (CLOUDINARY_API_KEY || '').trim();
const apiSecret = (CLOUDINARY_API_SECRET || '').trim();

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

/**
 * Extracts the Cloudinary public_id from any Cloudinary URL.
 * Handles:
 * - Transformations with or without version prefix (e.g. c_limit,w_800/v12345/...)
 * - URLs with folder prefixes (e.g. tennis-auction/...)
 * - Query strings and multiple extensions
 * 
 * Example URL:
 * https://res.cloudinary.com/dd7ifhg5g/image/upload/v1790778420/tennis-auction/eoc5n2cvf7tjcze6ulgs.png
 * Returns: 'tennis-auction/eoc5n2cvf7tjcze6ulgs'
 */
function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;

  const parts = url.split('/upload/');
  if (parts.length < 2) return null;

  // Strip query parameters
  let pathAfterUpload = parts[1].split('?')[0];

  // If URL contains our designated application folder, slice starting from it
  if (pathAfterUpload.includes('tennis-auction/')) {
    pathAfterUpload = pathAfterUpload.slice(pathAfterUpload.indexOf('tennis-auction/'));
  } else {
    // Strip dynamic transformation segments (e.g. c_limit,w_800) and version tags (v123456)
    const segments = pathAfterUpload.split('/');
    while (
      segments.length > 1 &&
      (segments[0].match(/^[a-z]_[a-z0-9_,]+$/i) || segments[0].match(/^v\d+$/i))
    ) {
      segments.shift();
    }
    pathAfterUpload = segments.join('/');
  }

  // Remove file extension
  return pathAfterUpload.replace(/\.[^/.]+$/, '');
}

/**
 * Deletes a list of image URLs from Cloudinary (or local uploads directory).
 * Handles batching in chunks of 100 for Cloudinary's Admin API.
 */
async function deleteImages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return { deletedCount: 0 };

  const validUrls = [...new Set(urls.filter(u => u && typeof u === 'string'))];
  const publicIds = [];

  for (const url of validUrls) {
    const publicId = extractCloudinaryPublicId(url);
    if (publicId) {
      publicIds.push(publicId);
    } else if (url.includes('/uploads/')) {
      // Local fallback file deletion
      try {
        const filename = url.split('/uploads/').pop().split('?')[0];
        const localPath = path.join(__dirname, '..', 'uploads', filename);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (err) {
        console.warn('Failed to delete local upload file:', err.message);
      }
    }
  }

  if (publicIds.length === 0 || !cloudName || !apiKey || !apiSecret) {
    return { deletedCount: 0 };
  }

  const uniquePublicIds = [...new Set(publicIds)];
  let totalDeleted = 0;
  const chunkSize = 100;

  for (let i = 0; i < uniquePublicIds.length; i += chunkSize) {
    const chunk = uniquePublicIds.slice(i, i + chunkSize);
    try {
      const res = await cloudinary.api.delete_resources(chunk);
      if (res && res.deleted) {
        totalDeleted += Object.keys(res.deleted).length;
      }
    } catch (err) {
      console.warn('Batch deletion failed, falling back to individual destroy:', err.message || err);
      // Fallback: delete individually using uploader.destroy
      for (const pid of chunk) {
        try {
          const singleRes = await cloudinary.uploader.destroy(pid);
          if (singleRes && (singleRes.result === 'ok' || singleRes.result === 'not found')) {
            totalDeleted += 1;
          }
        } catch (_) {}
      }
    }
  }

  return { deletedCount: totalDeleted };
}

module.exports = {
  extractCloudinaryPublicId,
  deleteImages,
};
