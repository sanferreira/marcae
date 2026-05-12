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
  description: z.string().default(""),
  category: z.string().default("Geral"),
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

export const ProfessionalCreate = z.object({
  name: z.string().min(1),
  specialty: z.string().default(""),
  bio: z.string().default(""),
  avatar: z.string().default(""),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  commissionRate: z.number().int().min(0).max(100).default(50),
  isAvailable: z.boolean().default(true),
  rating: z.number().min(0).max(5).default(5),
  appointmentsCount: z.number().int().nonnegative().default(0),
  schedule: ScheduleSchema.optional(),
});
export const ProfessionalUpdate = ProfessionalCreate.partial();

export const ClientCreate = z.object({
  name: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
  birthDate: z.string().nullish(),
  notes: z.string().nullish(),
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
});
export const AppointmentUpdate = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  paymentMethod: z.string().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
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

export const LoyaltySettingsUpdate = z.object({
  requiredPoints: z.number().int().min(1).max(100),
  benefitDescription: z.string().min(1),
});
export const LoyaltyAdjust = z.object({
  points: z.number().int(),
  description: z.string().min(1),
});

export const EmployeeUpsert = z.object({
  professionalId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  phone: z.string().nullish(),
});
