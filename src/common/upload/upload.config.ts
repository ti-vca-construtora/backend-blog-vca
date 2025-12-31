import { diskStorage } from 'multer'
import { extname } from 'path'
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE,
  UPLOAD_BASE_PATH,
} from './upload.constants'

export function uploadConfig(folder: string) {
  return {
    storage: diskStorage({
      destination: `${UPLOAD_BASE_PATH}/${folder}`,
      filename: (_req, file, callback) => {
        const uniqueName =
          Date.now() + '-' + Math.round(Math.random() * 1e9)
        const ext = extname(file.originalname)
        callback(null, `${uniqueName}${ext}`)
      },
    }),
    fileFilter: (_req, file, callback) => {
      if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
        return callback(
          new Error('Tipo de arquivo não permitido'),
          false,
        )
      }
      callback(null, true)
    },
    limits: {
      fileSize: MAX_IMAGE_SIZE,
    },
  }
}
