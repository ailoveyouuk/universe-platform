import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateProductFamilyDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() category!: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() regulatoryClass?: string;
  @IsOptional() @IsString() intendedUse?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateProductFamilyDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @IsNotEmpty() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() regulatoryClass?: string;
  @IsOptional() @IsString() intendedUse?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isArchived?: boolean;
}

export class AssignFamilyDto {
  /** null/omitted removes the product from its family. */
  @IsOptional() @IsString() familyId?: string | null;
  @IsOptional() @IsString() variantLabel?: string;
}
