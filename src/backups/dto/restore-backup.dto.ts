import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'filename invalido',
  })
  filename!: string;
}
