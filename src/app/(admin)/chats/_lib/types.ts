export type ConvType = "DIRECT" | "GROUP" | "ORDER";
export type TypeFilter = "ALL" | ConvType;

export type ParticipantUser = {
  id: number;
  username: string;
  name: string | null;
  email: string;
  avatar: string | null;
  isBanned: boolean;
  suspendedUntil: string | null;
};

export type LatestMessage = {
  id: string;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  content: string | null;
  fileUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  senderId: number | null;
  sender: {
    id: number;
    username: string;
    name: string | null;
  } | null;
};

export type ConversationItem = {
  id: string;
  type: ConvType;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  messageCount: number;
  participantsPreview: ParticipantUser[];
  latestMessage: LatestMessage | null;
};

export type ConversationsResponse = {
  data: ConversationItem[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
  };
  filters: {
    search: string;
    type: string;
  };
};

export type MessageSender = {
  id: number;
  username: string;
  name: string | null;
  avatar: string | null;
};

export type MessageItem = {
  id: string;
  conversationId: string;
  senderId: number | null;
  type: "TEXT" | "IMAGE" | "SYSTEM";
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender | null;
};

export type ConversationDetail = {
  id: string;
  type: ConvType;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  messageCount: number;
  participants: Array<{
    id: string;
    joinedAt: string;
    user: ParticipantUser;
  }>;
};

export type MessagesResponse = {
  data: {
    conversation: ConversationDetail;
    items: MessageItem[];
  };
  meta: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    cursor: string | null;
    includeDeleted: boolean;
  };
};

export type StatsResponse = {
  data: {
    totalConversations: number;
    totalMessages: number;
    activeToday: number;
    totalDirect: number;
    totalGroup: number;
  };
};
