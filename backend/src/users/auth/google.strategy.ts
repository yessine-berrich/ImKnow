// users/auth/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      throw new Error(
        'Google OAuth credentials are missing. Please check your .env file.\n' +
          'Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos } = profile;

    // BUG FIX: lastName (family_name) can be absent on some Google accounts
    // (e.g. accounts that use a single name). Fall back to empty string.
    const user = {
      email: emails?.[0]?.value,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      profileImage: photos?.[0]?.value ?? null,
      googleId: profile.id,
    };

    // BUG FIX: the original code passed `accessToken` inside the user object.
    // This is the short-lived Google access token, NOT our JWT — it must not
    // be forwarded to the client. Only the fields above are needed.

    if (!user.email) {
      return done(new Error('No email returned from Google'), false);
    }

    done(null, user);
  }
}