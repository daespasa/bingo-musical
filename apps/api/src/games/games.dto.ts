import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GameSettingsDto {
  @ApiPropertyOptional({ enum: [3, 4, 5], default: 3 })
  @IsOptional()
  @IsIn([3, 4, 5])
  cardSize?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  freeCenter?: boolean;

  @ApiPropertyOptional({ default: 15000, minimum: 5000, maximum: 30000 })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(30000)
  snippetDurationMs?: number;

  @ApiPropertyOptional({ default: 10000, minimum: 0, maximum: 60000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  answerWindowMs?: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Revela la canción automáticamente al cerrarse la ventana de respuesta',
  })
  @IsOptional()
  @IsBoolean()
  autoReveal?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Encadena la siguiente ronda automáticamente tras los resultados',
  })
  @IsOptional()
  @IsBoolean()
  autoAdvance?: boolean;

  @ApiPropertyOptional({ default: 6000, minimum: 2000, maximum: 30000 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(30000)
  roundResultsMs?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  lineEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  bingoEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showLeaderboard?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleTracks?: boolean;
}

export class CreateGameDto {
  @ApiProperty({ example: 'Fiesta de cumpleaños' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsUUID()
  collectionId!: string;

  @ApiPropertyOptional({ type: GameSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameSettingsDto)
  settings?: GameSettingsDto;
}
