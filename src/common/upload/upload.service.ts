import { Injectable } from '@nestjs/common'
import { UPLOAD_BASE_PATH } from './upload.constants'

@Injectable()
export class UploadService {
  buildFileUrl(folder: string, filename: string): string {
    return `/${UPLOAD_BASE_PATH}/${folder}/${filename}`
  }
}
