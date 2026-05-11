"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import type {
  ModerateUserPayload,
  ModerateUserResponse,
  UpdateUserPayload,
  UserItem,
} from "../_lib/types";

export function useUserMutations() {
  const queryClient = useQueryClient();

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
  };

  const update = useMutation({
    mutationFn: async (payload: { id: number; data: UpdateUserPayload }) => {
      const response = await apiClient.patch(
        `/users/${payload.id}`,
        payload.data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      invalidateUsers();
    },
    onError: () => toast.error("Failed to update user. Please try again."),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to delete user. Please try again."),
  });

  const quickToggleVerify = useMutation({
    mutationFn: async (user: UserItem) => {
      const response = await apiClient.patch(`/users/${user.id}`, {
        verified: !user.verified,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.verified
          ? "Verification revoked"
          : "User verified successfully",
      );
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to update verification status"),
  });

  const approveArtist = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiClient.patch(`/users/${userId}`, {
        verifiedArtists: true,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Artist approved successfully");
      invalidateUsers();
    },
    onError: () => toast.error("Failed to approve artist"),
  });

  const moderate = useMutation({
    mutationFn: async (payload: ModerateUserPayload) => {
      const response = await apiClient.post<ModerateUserResponse>(
        `/users/${payload.id}/moderation`,
        {
          action: payload.action,
          ...(payload.reason ? { reason: payload.reason } : {}),
          ...(payload.durationHours
            ? { durationHours: payload.durationHours }
            : {}),
        },
      );
      return response.data;
    },
    onSuccess: (response) => {
      toast.success(response.message);
      invalidateUsers();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to moderate user";
      toast.error(message);
    },
  });

  return { update, remove, quickToggleVerify, approveArtist, moderate };
}
