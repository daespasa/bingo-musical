import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty()
  @IsUUID()
  gameId!: string;

  @ApiProperty({ enum: ['PROJECTOR', 'REMOTE'] })
  @IsIn(['PROJECTOR', 'REMOTE'])
  mode!: 'PROJECTOR' | 'REMOTE';
}

/** La revancha hereda la partida de la sala anterior: solo hace falta el modo. */
export class RematchDto {
  @ApiProperty({ enum: ['PROJECTOR', 'REMOTE'] })
  @IsIn(['PROJECTOR', 'REMOTE'])
  mode!: 'PROJECTOR' | 'REMOTE';
}

export class JoinRoomDto {
  @ApiProperty({ minLength: 2, maxLength: 20, example: 'Marta' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  alias!: string;
}
