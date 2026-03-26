import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, Query, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

// Use string-cast constants so new roles work even if Prisma client cache is stale
const R = {
  SUPER_ADMIN:   'SUPER_ADMIN'   as Role,
  PROJECT_OWNER: 'PROJECT_OWNER' as Role,
  ADMIN_PUSAT:   'ADMIN_PUSAT'   as Role,
  ADMIN_DAPUR:   'ADMIN_DAPUR'   as Role,
  PRODUKSI:      'PRODUKSI'      as Role,
  INVESTOR:      'INVESTOR'      as Role,
  ADMIN:         'ADMIN'         as Role,
  SUPPLIER:      'SUPPLIER'      as Role,
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Profile endpoints ───────────────────────────────────────────────────────
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Post('kyc')
  @UseGuards(JwtAuthGuard)
  async updateKycDocs(
    @Request() req,
    @Body() data: { idCardUrl: string; selfieUrl: string },
  ) {
    return this.usersService.updateKycDocs(req.user.id, JSON.stringify(data));
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req,
    @Body() data: { email?: string; password?: string; fullname?: string }
  ) {
    return this.usersService.update(req.user.id, {
      email: data.email,
      password: data.password,
      fullname: data.fullname,
    });
  }

  // ─── Admin view (ADMIN / SUPER_ADMIN — excludes SUPER_ADMIN users) ───────────
  @Get('admin-view')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(R.ADMIN, R.SUPER_ADMIN)
  async getUsersForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.usersService.findAllExcludingSuperAdmin({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      role,
    });
  }

  // ─── SUPER_ADMIN / PROJECT_OWNER / ADMIN_PUSAT / ADMIN_DAPUR user management ─
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(R.SUPER_ADMIN, R.PROJECT_OWNER, R.ADMIN_PUSAT, R.ADMIN_DAPUR)
  async getAllUsers(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    // PROJECT_OWNER can only see ADMIN_PUSAT accounts
    if (req.user.role === R.PROJECT_OWNER) {
      return this.usersService.findAll({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        search,
        role: R.ADMIN_PUSAT,
      });
    }
    // ADMIN_PUSAT can see ADMIN_DAPUR, INVESTOR, SUPPLIER
    if (req.user.role === R.ADMIN_PUSAT) {
      const allowedRoles: Role[] = [R.ADMIN_DAPUR, R.INVESTOR, R.SUPPLIER];
      const filteredRole = role && allowedRoles.includes(role) ? role : undefined;
      return this.usersService.findAll({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        search,
        role: filteredRole,
      });
    }
    if (req.user.role === R.ADMIN_DAPUR) {
      const allowedRoles: Role[] = [R.PRODUKSI, R.SUPPLIER];
      const filteredRole = role && allowedRoles.includes(role) ? role : undefined;
      return this.usersService.findAll({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        search,
        role: filteredRole || R.PRODUKSI, // Default check only PRODUKSI or requested explicit allowing
      });
    }
    return this.usersService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      role,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(R.SUPER_ADMIN, R.PROJECT_OWNER, R.ADMIN_PUSAT, R.ADMIN_DAPUR)
  async createUser(
    @Request() req,
    @Body() data: { email: string; password: string; role: Role; kycDocs?: string; fullName?: string; whatsapp?: string; }
  ) {
    // PROJECT_OWNER can only create ADMIN_PUSAT accounts
    if (req.user.role === R.PROJECT_OWNER) {
      return this.usersService.create({ ...data, fullname: data.fullName, role: R.ADMIN_PUSAT });
    }
    // ADMIN_PUSAT can only create ADMIN_DAPUR, INVESTOR, SUPPLIER
    if (req.user.role === R.ADMIN_PUSAT) {
      const allowedRoles: Role[] = [R.ADMIN_DAPUR, R.INVESTOR, R.SUPPLIER];
      if (!allowedRoles.includes(data.role)) {
        throw new ForbiddenException('Admin Pusat hanya dapat membuat akun Admin Dapur, Investor, atau Supplier');
      }
      return this.usersService.create({ ...data, fullname: data.fullName });
    }
    // ADMIN_DAPUR can only create PRODUKSI accounts
    if (req.user.role === R.ADMIN_DAPUR) {
      return this.usersService.create({ ...data, fullname: data.fullName, role: R.PRODUKSI });
    }
    return this.usersService.create({ ...data, fullname: data.fullName });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(R.SUPER_ADMIN, R.PROJECT_OWNER, R.ADMIN_PUSAT, R.ADMIN_DAPUR)
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(R.SUPER_ADMIN, R.PROJECT_OWNER, R.ADMIN_PUSAT, R.ADMIN_DAPUR)
  async updateUser(
    @Request() req,
    @Param('id') id: string,
    @Body() data: Partial<{ email: string; password: string; role: Role; kycDocs?: string; fullName?: string; whatsapp?: string; }>
  ) {
    const target = await this.usersService.findById(id);
    if (req.user.role === R.PROJECT_OWNER) {
      if (target.role !== R.ADMIN_PUSAT) throw new ForbiddenException('Tidak diizinkan mengubah akun role ini');
    }
    if (req.user.role === R.ADMIN_PUSAT) {
      const allowed: Role[] = [R.ADMIN_DAPUR, R.INVESTOR, R.SUPPLIER];
      if (!allowed.includes(target.role as Role)) throw new ForbiddenException('Tidak diizinkan mengubah akun role ini');
    }
    if (req.user.role === R.ADMIN_DAPUR) {
      if (target.role !== R.PRODUKSI) throw new ForbiddenException('Admin Dapur hanya dapat mengubah akun Produksi');
    }
    return this.usersService.update(id, { ...data, fullname: data.fullName });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(R.SUPER_ADMIN, R.PROJECT_OWNER, R.ADMIN_PUSAT, R.ADMIN_DAPUR)
  async deleteUser(
    @Request() req,
    @Param('id') id: string
  ) {
    const target = await this.usersService.findById(id);
    if (req.user.role === R.PROJECT_OWNER) {
      if (target.role !== R.ADMIN_PUSAT) throw new ForbiddenException('Tidak diizinkan menghapus akun role ini');
    }
    if (req.user.role === R.ADMIN_PUSAT) {
      const allowed: Role[] = [R.ADMIN_DAPUR, R.INVESTOR, R.SUPPLIER];
      if (!allowed.includes(target.role as Role)) throw new ForbiddenException('Tidak diizinkan menghapus akun role ini');
    }
    if (req.user.role === R.ADMIN_DAPUR) {
      if (target.role !== R.PRODUKSI) throw new ForbiddenException('Admin Dapur hanya dapat menghapus akun Produksi');
    }
    return this.usersService.delete(id);
  }
}