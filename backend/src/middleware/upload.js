const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем директории если их нет
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    if (file.mimetype.startsWith('image/svg')) {
      uploadPath = path.join(__dirname, '../../uploads/svg');
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(__dirname, '../../uploads/photos');
    } else {
      return cb(new Error('Invalid file type'), null);
    }
    
    createDirIfNotExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // SVG files
  if (file.mimetype === 'image/svg+xml') {
    cb(null, true);
  }
  // Image files
  else if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  else {
    cb(new Error('Only image and SVG files are allowed'), false);
  }
};

// Upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  }
});

// Upload fields configuration
const uploadFields = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'svg', maxCount: 1 }
]);

const uploadSingle = (fieldName) => upload.single(fieldName);

module.exports = {
  upload,
  uploadFields,
  uploadSingle
};