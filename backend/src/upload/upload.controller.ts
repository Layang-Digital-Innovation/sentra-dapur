import {
  Controller,
  Post,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads/kyc',
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      const filename = `kyc-${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  fileFilter: (req, file, callback) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
      callback(null, true);
    } else {
      callback(new Error('Only image files (JPG, JPEG, PNG) and PDF are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
};

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('kyc')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async uploadKycDocuments(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploadedFiles = files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      url: this.uploadService.getFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    }));

    return {
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    };
  }

  @Post('transfer-proof')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/transfer-proof',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `transfer-proof-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        callback(null, true);
      } else {
        callback(new Error('Only image files (JPG, JPEG, PNG) and PDF are allowed!'), false);
      }
    },
  }))
  async uploadTransferProof(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Transfer proof uploaded successfully',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        url: this.uploadService.getTransferProofFileUrl(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Post('prospectus')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/prospectus',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `prospectus-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (file.mimetype === 'application/pdf') {
        callback(null, true);
      } else {
        callback(new Error('Only PDF files are allowed!'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  async uploadProspectus(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Prospectus uploaded successfully',
      url: this.uploadService.getProspectusFileUrl(file.filename),
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('financial-report')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/financial-reports',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `financial-report-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (file.mimetype === 'application/pdf') {
        callback(null, true);
      } else {
        callback(new Error('Only PDF files are allowed!'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  async uploadFinancialReport(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Financial report uploaded successfully',
      url: this.uploadService.getFinancialReportFileUrl(file.filename),
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('product-image')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads/product-images',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `product-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        callback(null, true);
      } else {
        callback(new Error('Only image files (JPG, JPEG, PNG) and PDF are allowed!'), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploadedFiles = files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      url: this.uploadService.getProductImageUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    }));

    return {
      message: 'Product images uploaded successfully',
      files: uploadedFiles,
    };
  }

  @Post('company-logo')
  @UseInterceptors(FileInterceptor('file', (new UploadService()).getCompanyLogoMulterOptions()))
  async uploadCompanyLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Company logo uploaded successfully',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        url: this.uploadService.getCompanyLogoUrl(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Post('company-profile')
  @UseInterceptors(FileInterceptor('file', (new UploadService()).getCompanyProfileMulterOptions()))
  async uploadCompanyProfile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Company profile uploaded successfully',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        url: this.uploadService.getCompanyProfileFileUrl(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Post('dapur-branding')
  @UseInterceptors(FileInterceptor('file', (new UploadService()).getDapurBrandingMulterOptions()))
  async uploadDapurBranding(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Dapur branding asset uploaded successfully',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        url: this.uploadService.getDapurBrandingUrl(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Post('evidence')
  @UseInterceptors(FileInterceptor('file', (new UploadService()).getEvidenceMulterOptions()))
  async uploadEvidence(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      message: 'Evidence uploaded successfully',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        url: this.uploadService.getEvidenceFileUrl(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }
}

