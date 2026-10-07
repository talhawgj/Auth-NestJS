import {SafeUser} from  "../../users/types/safeuser"
export type AuthResult ={
  user:SafeUser
  accessToken: string;
  refreshToken: string;
}