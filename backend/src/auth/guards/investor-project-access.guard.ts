import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvestmentStatus, Role } from '@prisma/client';

@Injectable()
export class InvestorProjectAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id || request.params.projectId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin and Super Admin have access to all projects
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Project owners have access to their own projects
    if (user.role === Role.PROJECT_OWNER) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          ownerId: true
        }
      });

      if (project && project.ownerId === user.id) {
        return true;
      }
    }

    // Investors can only access projects they have approved investments in
    if (user.role === Role.INVESTOR) {
      const investment = await this.prisma.investment.findFirst({
        where: {
          investorId: user.id,
          projectId: projectId,
          status: {
            in: [InvestmentStatus.APPROVED, InvestmentStatus.ACTIVE],
          },
        },
      });

      if (investment) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have access to this project');
  }
}