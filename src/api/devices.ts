import { useMutation } from "@tanstack/react-query";
import { apiPost } from "./client";

export interface DeviceStatus {
  registered: boolean;
  claimReference: string | null;
  claimStatus: string | null;
  productName: string | null;
  sku: string | null;
  purchaseDate: string | null;
  rewardState: string | null;
  canRelease: boolean;
  blockedReason: string | null;
}

/** Looks up the claim that currently uses a device number. The number goes in the body, never the URL. */
export function useCheckDevice() {
  return useMutation({
    mutationFn: (deviceIdentifier: string) => apiPost<DeviceStatus>("/api/staff/devices/check", { deviceIdentifier }),
  });
}

export function useReleaseDevice() {
  return useMutation({
    mutationFn: (body: { deviceIdentifier: string; secondHand: boolean; reason: string }) =>
      apiPost<DeviceStatus>("/api/staff/devices/release", body),
  });
}
