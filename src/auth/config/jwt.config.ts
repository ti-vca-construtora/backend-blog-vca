import { registerAs } from '@nestjs/config'

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_TTL || '1d',
  audience: process.env.JWT_TOKEN_AUDIENCE,
  issuer: process.env.JWT_TOKEN_ISSUER,
}))