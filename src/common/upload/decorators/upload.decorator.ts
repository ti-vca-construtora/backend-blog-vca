import { applyDecorators, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { uploadConfig } from '../upload.config'

export function UploadImage(folder: string) {
  return applyDecorators(
    UseInterceptors(FileInterceptor('file', uploadConfig(folder))),
  )
}
