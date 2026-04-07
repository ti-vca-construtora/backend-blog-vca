<<<<<<< HEAD
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
=======
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';


@Injectable()
export class PrismaService extends PrismaClient {
    async enableShutdownHooks() {
    await this.$disconnect()
  }
}
>>>>>>> c6ded7540776d2011921a19c4d062448741fb538
