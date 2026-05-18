export interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  identification_number: string;
  role: string;
  address?: string;
}

export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  identification_number?: string;
  address?: string;
  general?: string;
}

