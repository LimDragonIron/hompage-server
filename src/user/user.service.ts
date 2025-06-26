import { DatabaseService } from '@app/database';
import { Injectable } from '@nestjs/common';
import { CreateUserDto, DeleteUserDto } from './dto/user.dto';
import { User } from '@prisma/client';
import { UserIdentifier } from '@app/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly dbService: DatabaseService) {}

  async findUser(where: Partial<UserIdentifier>): Promise<User | null> {
    try {
      const result = await this.dbService.user.findFirst({ where });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async findAllUser(): Promise<User[] | []> {
    try {
      const result = await this.dbService.user.findMany();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateUserToken(id: string, token: string): Promise<User> {
    try {
      const result = await this.dbService.user.update({
        where: {
          id,
        },
        data: {
          token,
        },
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  // async getUserToken(id:string): Promise<string> {
  //   try{
  //     const result = await this.dbService.user.findFirst({
  //       where: {
  //         id
  //       },
  //       select: {
  //         token: true
  //       }
  //     })
  //     return result.token
  //   }catch(error) {
  //     throw error
  //   }
  // }

  async createUser(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const { name, email, password } = createUserDto;
    const hash = await bcrypt.hash(password, 10);

    try {
      const result = await this.dbService.user.create({
        data: {
          name,
          email,
          password: hash,
        },
        select: {
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      if (!result) {
        throw new Error('User creation failed');
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(deleteUserDto: DeleteUserDto): Promise<User> {
    const { id } = deleteUserDto;
    try {
      const result = await this.dbService.$transaction(async (tx) => {
        const user = await tx.user.delete({
          where: {
            id,
          },
        });
        return user;
      });
      return result;
    } catch (error) {
      throw error;
    }
  }
}
