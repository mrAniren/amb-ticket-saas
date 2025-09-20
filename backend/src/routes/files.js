const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// POST /api/files/upload - загрузка одного файла
router.post('/upload', uploadSingle('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    
    // Определяем тип файла
    let fileType;
    if (file.mimetype === 'image/svg+xml') {
      fileType = 'svg';
    } else if (file.mimetype.startsWith('image/')) {
      fileType = 'photo';
    } else {
      fileType = 'other';
    }

    // Формируем путь для клиента
    const clientPath = file.path.replace(/.*uploads/, '/uploads');

    const fileData = {
      id: Math.floor(Math.random() * 10000), // Временный ID
      filename: file.filename,
      original_name: file.originalname,
      file_path: clientPath,
      file_size: file.size,
      mime_type: file.mimetype,
      file_type: fileType,
      created_at: new Date().toISOString()
    };

    res.json({ file: fileData });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;