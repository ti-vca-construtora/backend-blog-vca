import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

import {TokenPayloadParam} from "src/auth/param/token-payload.param";
import {PayloadTokenDto} from "src/auth/dto/payload-token.dto";
import { AuthTokenGuard } from 'src/auth/guard/auth-token-guard';

import { LoggerInterceptor } from 'src/common/interceptors/logger.interceptor'

@Controller('tasks')
@UseInterceptors(LoggerInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

@Get()
findAllTasks(@Query() paginationDto: PaginationDto) {
    console.log(paginationDto);
 return this.tasksService.findAll(paginationDto);   
}

@Get(':id')
findOneTask(@Param('id', ParseIntPipe) id: number) {
return this.tasksService.findOne(id);
}

@UseGuards(AuthTokenGuard)
@Post()
createTask(@Body() createTaskDto:CreateTaskDto,
    @TokenPayloadParam() tokenPayload:PayloadTokenDto
    ){
    this.tasksService.create(createTaskDto, tokenPayload);
    return createTaskDto;    
}

@UseGuards(AuthTokenGuard)
@Patch(':id')
updateTask(@Param('id', ParseIntPipe) id:number, 
    @Body() updateTaskDto:UpdateTaskDto,
    @TokenPayloadParam() tokenPayload:PayloadTokenDto
    ){
    return this.tasksService.update(id, updateTaskDto, tokenPayload);        
}

@UseGuards(AuthTokenGuard)
@Delete(':id')
deleteTask(@Param('id', ParseIntPipe) id: number,
    @TokenPayloadParam() tokenPayload:PayloadTokenDto
    ){   
    return this.tasksService.delete(id, tokenPayload);
}         

}