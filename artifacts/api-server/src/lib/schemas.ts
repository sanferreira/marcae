import { z } from "zod";

export const DAY_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

export const WorkDay = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export const ScheduleSchema = z.object({
  seg: WorkDay, ter: WorkDay, qua: WorkDay, qui: WorkDay,
  sex: WorkDay, sab: WorkDay, dom: WorkDay,
});
export type Schedule = z.infer<typeof ScheduleSchema>;
export const IntakeFieldSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "textarea", "date", "phone"]).default("text"),
});

export const DEFAULT_SCHEDULE: Schedule = {
  seg: { enabled: true, startTime: "08:00", endTime: "18:00" },
  ter: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qua: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qui: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sex: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sab: { enabled: true, startTime: "08:00", endTime: "13:00" },
  dom: { enabled: false, startTime: "08:00", endTime: "12:00" },
};

export const ServiceCreate = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  duration: z.number().int().positive(),
  loyaltyPoints: z.number().int().min(0).max(50).default(1),
  description: z.string().default(""),
  category: z.string().default("Geral"),
  imageUrl: z.string().max(1_200_000).nullish(),
  isActive: z.boolean().default(true),
});
export const ServiceUpdate = ServiceCreate.partial();

export const ProductCreate = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  category: z.string().default("Geral"),
  description: z.string().default(""),
  isActive: z.boolean().default(true),
});
export const ProductUpdate = ProductCreate.partial();

export const CategoryCreate = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["service", "product", "income", "expense"]),
});

const OptionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed || null;
  },
  z.string().email("Informe um email valido.").nullish(),
);

export const ProfessionalCreate = z.object({
  name: z.string().trim().min(1),
  specialty: z.string().trim().default(""),
  bio: z.string().trim().default(""),
  avatar: z.string().trim().default(""),
  avatarImage: z.string().nullish(),
  phone: z.string().trim().nullish(),
  email: OptionalEmail,
  commissionRate: z.number().int().min(0).max(100).default(50),
  isAvailable: z.boolean().default(true),
  rating: z.number().min(0).max(5).default(5),
  appointmentsCount: z.number().int().nonnegative().default(0),
  schedule: ScheduleSchema.optional(),
  serviceIds: z.array(z.string().uuid()).default([]),
});
export const ProfessionalUpdate = ProfessionalCreate.partial();

const ClientProfile = z.object({
  name: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
  birthDate: z.string().nullish(),
  notes: z.string().nullish(),
  allergies: z.string().default(""),
  restrictions: z.string().default(""),
  preferences: z.string().default(""),
  emergencyContact: z.string().default(""),
  intakeData: z.record(z.string().max(2000)).default({}),
});
export const ClientCreate = ClientProfile.extend({
  password: z.string().optional(),
});
export const ClientUpdate = ClientProfile.partial();
export const ClientAccessUpsert = z.object({
  email: z.string().email("Informe um email valido.").optional(),
  password: z.string().min(1, "Informe uma senha."),
});

export const ServiceLineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().nonnegative(),
  duration: z.number().int().positive(),
});
export const AppointmentCreate = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  professionalId: z.string().uuid(),
  professionalName: z.string(),
  services: z.array(ServiceLineSchema).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  totalPrice: z.number().nonnegative(),
  totalDuration: z.number().int().positive(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).default("pending"),
  paymentMethod: z.string().nullish(),
  isFreeByLoyalty: z.boolean().default(false),
  clientNotes: z.string().max(1000).default(""),
});
export const AppointmentUpdate = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  paymentMethod: z.string().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  clientNotes: z.string().max(1000).optional(),
  professionalNotes: z.string().max(2000).optional(),
});

export const CashEntryCreate = z.object({
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  type: z.enum(["income", "expense"]),
  category: z.string().default("Outro"),
  paymentMethod: z.string().default("Dinheiro"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  professionalId: z.string().uuid().nullish(),
  professionalName: z.string().nullish(),
});

export const ProductOrderLineCreate = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});
export const ProductOrderCreate = z.object({
  items: z.array(ProductOrderLineCreate).min(1),
  notes: z.string().max(500).default(""),
  appointmentId: z.string().uuid().nullish(),
});
export const ProductOrderUpdate = z.object({
  status: z.enum(["pending", "paid", "delivered", "cancelled"]),
  paymentMethod: z.string().default("Dinheiro"),
});

export const LoyaltySettingsUpdate = z.object({
  requiredPoints: z.number().int().min(1).max(100),
  benefitDescription: z.string().min(1),
});
export const LoyaltyAdjust = z.object({
  points: z.number().int(),
  description: z.string().min(1),
});

export const ServicePackageCreate = z.object({
  name: z.string().min(1).max(120),
  description: z.string().default(""),
  serviceId: z.string().uuid().nullish(),
  sessionsTotal: z.number().int().min(1).max(100),
  price: z.number().nonnegative(),
  validityDays: z.number().int().min(1).max(3650).default(90),
  isActive: z.boolean().default(true),
});
export const ServicePackageUpdate = ServicePackageCreate.partial();

export const ClientPackageCreate = z.object({
  clientId: z.string().uuid(),
  packageId: z.string().uuid(),
  pricePaid: z.number().nonnegative().nullish(),
});

export const EmployeeUpsert = z.object({
  professionalId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  phone: z.string().nullish(),
});

export const SelfProfileUpdate = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullish(),
  avatar: z.string().max(4).optional(),
  avatarImage: z.string().nullish(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
});

export const AuthPasswordChange = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z.string().min(1, "Informe a nova senha."),
});
