import { z } from "zod";

export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd in the visitor's local time
}

function tenDigitPhone(raw: string): boolean {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d);
}

/** Usability checks only. The server repeats every check and is the authority. */
export function makeClaimSchema(isMobile: boolean) {
  return z.object({
    productId: z.string().min(1, "Choose your product."),
    purchasePrice: z.string().trim().regex(/^\d{1,7}$/, "Enter the price in whole rupees, numbers only."),
    purchaseDate: z
      .string()
      .min(1, "Choose the purchase date.")
      .refine((v) => v <= todayIso(), "Purchase date cannot be in the future."),
    invoiceNumber: isMobile
      ? z.string().trim().min(1, "Enter the invoice number from your bill.").max(40, "Invoice number is too long.")
      : z.string().trim().max(40, "Invoice number is too long.").optional(),
    deviceIdentifier: isMobile
      ? z.string().refine((v) => /^\d{15}$/.test(v.replace(/[\s-]/g, "")), "Enter the 15-digit IMEI 1.")
      : z.string().trim().min(4, "Enter the serial number.").max(40, "That number is too long."),
    customerName: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
    phone: z.string().refine(tenDigitPhone, "Enter a valid 10-digit mobile number."),
    consent: z.boolean().refine((v) => v, "Please accept to continue."),
  });
}

export type ClaimFormValues = z.infer<ReturnType<typeof makeClaimSchema>>;
