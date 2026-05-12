"use client";

import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import type {
  FlagReason,
  FlagSeverity,
} from "../_components/FlagConversationModal";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function useFlagConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      reason: FlagReason;
      severity: FlagSeverity;
      note: string;
    }) => {
      const response = await apiClient.post(
        `/chats/conversations/${payload.id}/flag`,
        {
          reason: payload.reason,
          severity: payload.severity,
          note: payload.note,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Conversation flagged");
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to flag conversation"));
    },
  });
}

export function usePurgeConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      confirm: string;
      reason: string;
    }) => {
      const response = await apiClient.delete(
        `/chats/conversations/${payload.id}`,
        {
          data: { confirm: payload.confirm, reason: payload.reason },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Conversation purged");
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-stats"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to purge conversation"));
    },
  });
}

export function useOpenTicket() {
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      subject: string;
      description: string;
      priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    }) => {
      const response = await apiClient.post<{
        data: { id: string };
      }>(`/chats/conversations/${payload.id}/ticket`, {
        subject: payload.subject,
        description: payload.description,
        priority: payload.priority ?? "NORMAL",
      });
      return response.data;
    },
    onSuccess: (response) => {
      toast.success(`Ticket #${response.data.id.slice(0, 8)} created`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to open ticket"));
    },
  });
}
