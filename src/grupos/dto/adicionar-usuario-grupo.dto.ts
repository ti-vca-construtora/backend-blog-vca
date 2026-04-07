import { IsInt, Min } from 'class-validator';

export class AdicionarUsuarioGrupoDto {
  @IsInt()
  @Min(1)
  userId!: number;
}
