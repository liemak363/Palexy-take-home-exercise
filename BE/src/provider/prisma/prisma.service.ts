import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    // Lấy URL kết nối từ môi trường
    const connectionString = configService.get<string>('DATABASE_URL');

    // Khởi tạo Pool của pg
    const pool = new Pool({ connectionString });

    // Bọc Pool vào Driver Adapter
    const adapter = new PrismaPg(pool);

    // Khởi tạo PrismaClient với adapter
    super({ adapter });
  }

  // Khởi tạo kết nối khi module NestJS load
  async onModuleInit() {
    await this.$connect();
  }

  // Đóng kết nối an toàn (graceful shutdown) khi ứng dụng dừng
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
