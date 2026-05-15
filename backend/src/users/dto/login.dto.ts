import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(250)
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}