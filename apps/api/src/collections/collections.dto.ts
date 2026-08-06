import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Fiesta de cumpleaños' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Las que canta todo el mundo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class UpdateCollectionDto {
  @ApiProperty({ example: 'Fiesta de cumpleaños' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Las que canta todo el mundo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class ReorderTracksDto {
  @ApiProperty({ type: [String], description: 'Todas las canciones, en el orden que se quiere' })
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  trackIds!: string[];
}

export class DuplicateCollectionDto {
  @ApiPropertyOptional({ example: 'Mi versión de la colección demo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;
}
