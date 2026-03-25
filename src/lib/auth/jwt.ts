import jwt from 'jsonwebtoken';

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export const generateAccessToken = (userId: number, email: string, role: string) => {
  return jwt.sign({ sub: userId, email, role }, requireJwtSecret(), { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign({ sub: userId }, requireJwtSecret(), { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, requireJwtSecret());
  } catch (error) {
    return null;
  }
};
