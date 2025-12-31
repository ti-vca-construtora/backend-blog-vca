import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateTaskDto{
    @IsString({message: 'O nome deve ser uma string'})
    @MinLength(5,{message: 'O nome deve ter no minimo 5 caracteres'})
    @IsNotEmpty()
   readonly name:string;

   @IsString()
   @IsNotEmpty()
   @MaxLength(200,{message: 'A descricao deve ter no maximo 200 caracteres'})   
   readonly description:string;
}