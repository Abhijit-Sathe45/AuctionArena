const express = require('express');
const router = express.Router();
const upload = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Image upload failed:', err);
      return res.status(400).json({ message: err.message || 'Image upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let url;
    if (upload.useCloudinary) {
      url = req.file.secure_url || req.file.path;
      if (url && url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
    } else {
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      url = `${proto}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    res.json({ url });
  });
});

module.exports = router;