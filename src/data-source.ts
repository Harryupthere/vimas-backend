import { DataSource } from 'typeorm';
import { User } from './shared/entities/user.entity';
import { UserType } from './shared/entities/user_types.entity';
import { RegistrationType } from './shared/entities/registration_types.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',     // your DB password
  database: 'vimas',
  entities: [User, UserType, RegistrationType],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
