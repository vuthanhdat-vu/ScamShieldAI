import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength, ValidateIf } from 'class-validator';

export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_COMBINED_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGES = 5;

export interface UploadedImage {
  readonly bytes: Buffer;
  readonly mediaType: ImageMediaType;
}

// The multipart handler separately checks the file bytes and signatures.
export class ImagesRequestDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    minItems: 1,
    maxItems: MAX_IMAGES,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMAGES)
  images!: UploadedImage[];

  @ApiPropertyOptional({ maxLength: 1000 })
  @ValidateIf((_: object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  context?: string;
}
