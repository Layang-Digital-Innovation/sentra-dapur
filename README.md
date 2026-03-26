# Trade Invest Center

Trade Invest Center adalah platform investasi dan trading yang menyediakan layanan komprehensif untuk investor, project owner, buyer, dan seller. Platform ini dibangun dengan arsitektur modern menggunakan Next.js untuk frontend dan NestJS untuk backend.

## 🚀 Fitur Utama

- **Manajemen Pengguna**: Sistem autentikasi dan otorisasi dengan berbagai role (Admin, Super Admin, Investor, Project Owner, Buyer, Seller)
- **Sistem Langganan**: Manajemen subscription dengan berbagai plan (Trial, Gold Monthly/Yearly, Enterprise Custom)
- **Dashboard Interaktif**: Dashboard yang responsif dengan berbagai widget dan analytics
- **Sistem Chat**: Real-time messaging dengan dukungan file attachment
- **Manajemen Investasi**: Tools untuk mengelola portofolio dan tracking investasi
- **Laporan Keuangan**: Generate dan view laporan keuangan dalam format PDF
- **Trading Tools**: Interface untuk aktivitas trading dan monitoring pasar
- **Upload Management**: Sistem upload file dengan berbagai kategori (KYC, company profiles, dll)
- **Notification System**: Sistem notifikasi real-time untuk berbagai aktivitas

## 🏗️ Arsitektur Teknologi

### Frontend
- **Framework**: Next.js 15.5.4 dengan React 19.1.0
- **UI Library**: Material-UI (MUI) v7.3.4
- **Styling**: Emotion untuk CSS-in-JS
- **State Management**: React Context API
- **HTTP Client**: Axios
- **PDF Generation**: jsPDF dengan jsPDF-AutoTable
- **Rich Text Editor**: TipTap
- **Icons**: React Icons
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **Notifications**: React Hot Toast

### Backend
- **Framework**: NestJS 10.0.0
- **Database**: PostgreSQL dengan Prisma ORM
- **Authentication**: JWT dengan Passport.js
- **File Upload**: Multer
- **Real-time**: Socket.IO
- **Queue Management**: Bull Queue
- **Email**: Nodemailer
- **Payment Gateway**: Xendit integration and paypal
- **Validation**: Class Validator
- **Documentation**: Swagger/OpenAPI

## 📁 Struktur Proyek

```
TradeInvestCenter/
├── backend/                 # NestJS Backend Application
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── chat/           # Chat and messaging
│   │   ├── dashboard/      # Dashboard data and analytics
│   │   ├── financial-reports/ # Financial reporting
│   │   ├── investment/     # Investment management
│   │   ├── notification/   # Notification system
│   │   ├── prisma/         # Database service
│   │   ├── settings/       # Application settings
│   │   ├── subscription/   # Subscription management
│   │   ├── trading/        # Trading functionality
│   │   ├── upload/         # File upload handling
│   │   └── users/          # User management
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── uploads/            # Uploaded files storage
│   └── package.json
├── frontend/               # Next.js Frontend Application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React Context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── package.json
├── .gitignore
├── README.md
└── LICENSE
```

## 🛠️ Setup dan Instalasi

### Prerequisites
- Node.js (v18 atau lebih baru)
- PostgreSQL
- npm atau yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd TradeInvestCenter
```

### 2. Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env file dengan konfigurasi database dan API keys

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development server
npm run start:dev
```

### 3. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local dengan URL backend API

# Start development server
npm run dev
```

## 🚀 Menjalankan Aplikasi

### Development Mode
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Production Mode
```bash
# Build backend
cd backend
npm run build
npm run start:prod

# Build frontend
cd frontend
npm run build
npm start
```

## 📊 Database Schema

Aplikasi menggunakan PostgreSQL dengan Prisma ORM. Schema utama meliputi:

- **Users**: Manajemen pengguna dengan berbagai role
- **Subscriptions**: Sistem langganan dan billing
- **Investments**: Data investasi dan portofolio
- **Chats & Messages**: Sistem messaging
- **Financial Reports**: Laporan keuangan
- **Notifications**: Sistem notifikasi
- **File Uploads**: Metadata file yang diupload

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/tradeinvestcenter"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"
XENDIT_SECRET_KEY="your-xendit-secret"
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASS="your-password"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd frontend
npm run test
```

## 📝 API Documentation

API documentation tersedia melalui Swagger UI setelah menjalankan backend:
- Development: http://localhost:3001/api
- Production: https://your-domain.com/api

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## 👥 Tim Pengembang

- **Backend Development**: NestJS, PostgreSQL, Prisma
- **Frontend Development**: Next.js, React, Material-UI
- **DevOps**: Docker, CI/CD Pipeline
- **Database**: PostgreSQL, Redis

## 📞 Support

Untuk pertanyaan atau dukungan, silakan hubungi:
- Email: support@tradeinvestcenter.com
- Documentation: [Wiki](https://github.com/your-repo/wiki)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release dengan fitur dasar
- Sistem autentikasi dan otorisasi
- Dashboard dan analytics
- Sistem subscription
- Chat dan messaging
- File upload management
- Financial reporting

---

**Trade Invest Center** - Platform Investasi dan Trading Modern