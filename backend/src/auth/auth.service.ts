import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcryptjs'
import { SubscriptionService } from '../subscription/subscription.service'
import { Role } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private subscriptionService: SubscriptionService,
  ) {}

  async validateUser(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmail(email)
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (isPasswordValid) {
        const { password, ...result } = user
        return result
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role }

    // Backfill: ensure eligible users get a 7-day trial automatically on first login
    try {
      if (user.role !== Role.ADMIN) {
        await this.subscriptionService.startTrialForEligibleUser(user.id, (user.role as Role))
      }
    } catch (err) {
      // Do not block login
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
      },
    }
  }

  async register(email: string, password: string, role: any, fullname?: string) {
    const user = await this.usersService.create({
      email,
      password,
      role,
      fullname,
    })

    // Start 7-day trial for eligible roles
    try {
      await this.subscriptionService.startTrialForEligibleUser(user.id, (role as Role) || Role.INVESTOR)
    } catch (err) {
      // Log but don't block registration
      console.error('Failed to start trial for user', user.id, err)
    }

    const { password: _, ...result } = user
    return result
  }
}