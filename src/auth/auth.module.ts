import { Global, Module } from '@nestjs/common'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { ConfigModule, ConfigType } from '@nestjs/config'
import jwtConfig from './config/jwt.config'
import { AuthService } from './auth.service'
import { PrismaModule } from 'src/prisma/prisma.module'
import { HashingServiceProtocol } from './hash/hashing.service'
import { BcryptService } from './hash/bcrypt.service'
import { SignOptions } from 'jsonwebtoken'
import { AuthController } from './auth.controller'
import { AuthTokenGuard } from './guard/auth-token-guard'

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(jwtConfig),

    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (
        jwt: ConfigType<typeof jwtConfig>,
      ): JwtModuleOptions => ({
        secret: jwt.secret,
        signOptions: {
          expiresIn: jwt.expiresIn as SignOptions['expiresIn'],
          audience: jwt.audience,
          issuer: jwt.issuer,
        },
      }),
    }),
  ],
  
  controllers:[
    AuthController
  ],

  providers: [
    AuthService,
    AuthTokenGuard,
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService,
    },
  ],

  exports: [AuthService, HashingServiceProtocol, JwtModule, AuthTokenGuard],
})
export class AuthModule {}
