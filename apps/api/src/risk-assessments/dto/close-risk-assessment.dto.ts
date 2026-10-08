import { IsString, MinLength } from "class-validator";

/** PATCH /risk-assessments/:id/close body — a dedicated action, distinct
 * from the generic UpdateRiskAssessmentDto, because closing a risk is a
 * deliberate decision that always needs a stated reason — see
 * CloseRiskAssessmentInput's doc comment in @universe/types. */
export class CloseRiskAssessmentDto {
  @IsString() @MinLength(1) reason!: string;
}
