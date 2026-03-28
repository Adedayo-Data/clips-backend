import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class ConnectWalletDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsEnum(['stellar'])
  chain: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}
