import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class AdjuntarOrdenesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ordenIds!: number[];
}
