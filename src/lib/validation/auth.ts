// src/lib/validation/auth.ts
//
// Zod schemas for sign-up and log-in — same "one place defines valid input,
// both the form and the server action import it" pattern as
// lib/validation/wedding.ts. The server action's .safeParse() call is the
// real security boundary; anything client-side is just faster feedback.

import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type LogInInput = z.infer<typeof logInSchema>;
