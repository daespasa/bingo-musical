import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ example: 'daft punk one more time' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q!: string;
}

export class ImportPlaylistDto {
  @ApiProperty({ example: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' })
  @IsString()
  @MinLength(6)
  @MaxLength(300)
  playlist!: string;

  @ApiPropertyOptional({ example: 'Mi fiesta' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class ResolvePreviewsDto {
  @ApiProperty()
  @IsUUID()
  collectionId!: string;
}
