const express = require('express');
const router = express.Router();
const upload = require('../utils/upload');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  let url;
  if (upload.useCloudinary) {
    url = req.file.path;
  } else {
    url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  res.json({ url });
}));

module.exports = router;