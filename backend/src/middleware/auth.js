const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Логируем информацию о токене для диагностики проблем с залами
  if (req.path.includes('/halls/')) {
    console.log('🔐 Проверка авторизации для зала:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : null,
      jwtSecret: !!process.env.JWT_SECRET
    });
  }

  if (!token) {
    if (req.path.includes('/halls/')) {
      console.log('❌ Токен отсутствует для запроса зала');
    }
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (req.path.includes('/halls/')) {
        console.log('❌ Ошибка верификации токена для зала:', err.message);
      }
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    if (req.path.includes('/halls/')) {
      console.log('✅ Авторизация успешна для зала:', user.username || user.id);
    }
    
    req.user = user;
    next();
  });
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

module.exports = {
  authenticateToken,
  generateToken
};