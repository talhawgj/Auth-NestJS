import { User } from '../../db/schema';

export type SafeUser = Omit<User, 'password'>;
