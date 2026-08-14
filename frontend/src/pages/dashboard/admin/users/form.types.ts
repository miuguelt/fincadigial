export type UserRole = 'Administrador' | 'Instructor' | 'Aprendiz';

export type UserFormFields = {
  fullname: string;
  identification: number;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
};
