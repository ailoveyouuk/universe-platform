import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

const CATEGORIES = ["PROCUREMENT", "TECHNICAL_ASSISTANCE"] as const;
const PROJECT_TYPES = ["PHARMACEUTICAL", "NON_PHARMACEUTICAL"] as const;
const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;

export class CreateProjectDto {
  @IsString()
  referenceNumber!: string;

  @IsString()
  title!: string;

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsIn(PROJECT_TYPES)
  projectType!: (typeof PROJECT_TYPES)[number];

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  deliveryCountry?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  productCategory?: (typeof PRODUCT_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  clientProductDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
