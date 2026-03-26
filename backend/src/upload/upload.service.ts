import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadPath = './uploads/kyc';
  private readonly transferProofPath = './uploads/transfer-proof';
  private readonly prospectusPath = './uploads/prospectus';
  private readonly financialReportsPath = './uploads/financial-reports';
  private readonly productImagesPath = './uploads/product-images';
  private readonly companyLogosPath = './uploads/company-logos';
  private readonly companyProfilesPath = './uploads/company-profiles';
  private readonly dapurBrandingPath = './uploads/dapur-branding';
  private readonly evidencePath = './uploads/evidence';

  constructor() {
    // Ensure upload directories exist
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
    if (!fs.existsSync(this.transferProofPath)) {
      fs.mkdirSync(this.transferProofPath, { recursive: true });
    }
    if (!fs.existsSync(this.prospectusPath)) {
      fs.mkdirSync(this.prospectusPath, { recursive: true });
    }
    if (!fs.existsSync(this.financialReportsPath)) {
      fs.mkdirSync(this.financialReportsPath, { recursive: true });
    }
    if (!fs.existsSync(this.productImagesPath)) {
      fs.mkdirSync(this.productImagesPath, { recursive: true });
    }
    if (!fs.existsSync(this.companyLogosPath)) {
      fs.mkdirSync(this.companyLogosPath, { recursive: true });
    }
    if (!fs.existsSync(this.companyProfilesPath)) {
      fs.mkdirSync(this.companyProfilesPath, { recursive: true });
    }
    if (!fs.existsSync(this.dapurBrandingPath)) {
      fs.mkdirSync(this.dapurBrandingPath, { recursive: true });
    }
    if (!fs.existsSync(this.evidencePath)) {
      fs.mkdirSync(this.evidencePath, { recursive: true });
    }
  }

  getMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.uploadPath,
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
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = `${this.uploadPath}/${filename}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFileUrl(filename: string): string {
    return `/uploads/kyc/${filename}`;
  }

  getTransferProofMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.transferProofPath,
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
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    };
  }

  getTransferProofFileUrl(filename: string): string {
    return `/uploads/transfer-proof/${filename}`;
  }

  async deleteTransferProofFile(filename: string): Promise<void> {
    const filePath = `${this.transferProofPath}/${filename}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getProspectusFileUrl(filename: string): string {
    return `/uploads/prospectus/${filename}`;
  }

  async deleteProspectusFile(filename: string): Promise<void> {
    const filePath = `${this.prospectusPath}/${filename}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFinancialReportFileUrl(filename: string): string {
    return `/uploads/financial-reports/${filename}`;
  }

  async deleteFinancialReportFile(filename: string): Promise<void> {
    const filePath = `${this.financialReportsPath}/${filename}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Product images
  getProductImagesMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.productImagesPath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
    };
  }

  getProductImageUrl(filename: string): string {
    return `/uploads/product-images/${filename}`;
  }

  async deleteProductImageFile(filename: string): Promise<void> {
    const filePath = `${this.productImagesPath}/${filename}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Company assets
  getCompanyLogoMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.companyLogosPath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `company-logo-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          callback(null, true);
        } else {
          callback(new Error('Only image files (JPG, JPEG, PNG) are allowed!'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    };
  }

  getCompanyLogoUrl(filename: string): string {
    return `/uploads/company-logos/${filename}`;
  }

  getCompanyProfileMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.companyProfilesPath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `company-profile-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/) || file.mimetype === 'application/pdf') {
          callback(null, true);
        } else {
          callback(new Error('Only image files (JPG, JPEG, PNG) or PDF are allowed!'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    };
  }

  getCompanyProfileFileUrl(filename: string): string {
    return `/uploads/company-profiles/${filename}`;
  }

  getDapurBrandingMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.dapurBrandingPath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const type = (req as any).query?.type || 'logo';
          const filename = `dapur-${type}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req: any, file: any, callback: any) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          callback(null, true);
        } else {
          callback(new Error('Only image files (JPG, JPEG, PNG) are allowed!'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    };
  }

  getDapurBrandingUrl(filename: string): string {
    return `/uploads/dapur-branding/${filename}`;
  }
  getEvidenceMulterOptions() {
    return {
      storage: diskStorage({
        destination: this.evidencePath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = 'evidence-' + uniqueSuffix + ext;
          callback(null, filename);
        },
      }),
      fileFilter: (req: any, file: any, callback: any) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          callback(null, true);
        } else {
          callback(new Error('Only image files (JPG, JPEG, PNG, PDF) are allowed!'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    };
  }

  getEvidenceFileUrl(filename: string): string {
    return '/uploads/evidence/' + filename;
  }
}
