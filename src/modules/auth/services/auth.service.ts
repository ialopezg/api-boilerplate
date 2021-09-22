import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UserRegistrationDto, UserLoginDto } from '../dtos';
import {
  RefreshTokenNotMatchingException,
  WrongCredentialsProvidedException,
} from '../exceptions';
import { TokenPayloadInterface, VerificationTokenPayload } from '../interfaces';
import { MailService } from '../../mail/services';
import { UserEntity } from '../../user/entities';
import { UserAuthService, UserService } from '../../user/services';
import { validateHash } from '../../../utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UserService,
    private readonly _userAuthService: UserAuthService,
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService,
    private readonly _mailService: MailService,
  ) {}

  public async register(
    userRegistrationDto: UserRegistrationDto,
  ): Promise<UserEntity> {
    const user = await this._userService.createUser(userRegistrationDto);

    return user;
  }

  public async login(user: UserEntity): Promise<string[]> {
    const accessTokenCookie = this._getCookieWithJwtToken(user.uuid);
    const { cookie: refreshTokenCookie, token: refreshToken } =
      this._getCookieWithJwtRefreshToken(user.uuid);

    await this._userAuthService.updateRefreshToken(
      user.userAuth.id,
      refreshToken,
    );

    return [accessTokenCookie, refreshTokenCookie];
  }

  public async logout(user: UserEntity): Promise<void> {
    await this._userAuthService.updateRefreshToken(user.userAuth.id, null);
  }

  public async validateUser(userLoginDto: UserLoginDto): Promise<UserEntity> {
    const { identifier, password } = userLoginDto;
    const user = await this._userService.findUser({
      pinCode: +identifier,
      email: identifier,
      uuid: identifier,
    });

    if (!user) {
      throw new WrongCredentialsProvidedException();
    }

    const isPasswordValid = await validateHash(
      password,
      user.userAuth.password,
    );

    if (!isPasswordValid) {
      throw new WrongCredentialsProvidedException();
    }

    return user;
  }

  public refreshToken(user: UserEntity): string {
    return this._getCookieWithJwtToken(user.uuid);
  }

  public getCookiesForLogout(): string[] {
    return [
      'Authentication=; HttpOnly; Path=/; Max-Age=0',
      'Refresh=; HttpOnly; Path=/; Max-Age=0',
    ];
  }

  public async getUserIfRefreshTokenMatches(
    refreshToken: string,
    user: UserEntity,
  ): Promise<UserEntity> {
    const isRefreshTokenMatching = await validateHash(
      refreshToken,
      user.userAuth.currentHashedRefreshToken,
    );

    if (!isRefreshTokenMatching) {
      throw new RefreshTokenNotMatchingException();
    }

    return user;
  }

  public getJwtConfirmToken(email: string): string {
    const payload: VerificationTokenPayload = { email };
    const token = this._jwtService.sign(payload, {
      secret: this._configService.get('JWT_VERIFICATION_TOKEN_SECRET_KEY'),
      expiresIn: `${this._configService.get(
        'JWT_VERIFICATION_TOKEN_EXPIRATION_TIME',
      )}s`,
    });

    return token;
  }

  public async resendConfirmationLink(user: UserEntity): Promise<void> {
    if (user.userAuth.isEmailConfirmed) {
      throw new BadRequestException('Email already confirmed');
    }

    await this._mailService.sendConfirmationEmail(user);
  }

  public async confirm(user: UserEntity): Promise<void> {
    await this._userAuthService.markEmailAsConfirmed(user.userAuth.email);
  }

  private _getCookieWithJwtToken(uuid: string): string {
    const payload: TokenPayloadInterface = { uuid };
    const token = this._jwtService.sign(payload, {
      secret: this._configService.get('JWT_ACCESS_TOKEN_SECRET_KEY'),
      expiresIn: `${this._configService.get(
        'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
      )}s`,
    });

    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this._configService.get(
      'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
    )}`;
  }

  private _getCookieWithJwtRefreshToken(uuid: string) {
    const payload: TokenPayloadInterface = { uuid };
    const token = this._jwtService.sign(payload, {
      secret: this._configService.get('JWT_REFRESH_TOKEN_SECRET_KEY'),
      expiresIn: `${this._configService.get(
        'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
      )}s`,
    });
    const cookie = `Refresh=${token}; HttpOnly; Path=/; Max-Age=${this._configService.get(
      'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
    )}`;

    return { cookie, token };
  }
}
