export enum ChatType {
  INVESTMENT_INQUIRY = 'INVESTMENT_INQUIRY',
  GENERAL_SUPPORT = 'GENERAL_SUPPORT',
  PROJECT_DISCUSSION = 'PROJECT_DISCUSSION',
  TRADING = 'TRADING',
  SUPPORT = 'SUPPORT',
  INVESTMENT = 'INVESTMENT'
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  SYSTEM = 'SYSTEM'
}

export enum ChatStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED'
}

export enum Role {
  INVESTOR = 'INVESTOR',
  PROJECT_OWNER = 'PROJECT_OWNER',
  ADMIN = 'ADMIN',
  ADMIN_INVESTMENT = 'ADMIN_INVESTMENT',
  ADMIN_TRADING = 'ADMIN_TRADING',
  SUPER_ADMIN = 'SUPER_ADMIN',
  BUYER = 'BUYER',
  SUPPLIER = 'SUPPLIER'
}

export interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  avatar?: string;
  profile?: {
    fullName?: string;
    photoUrl?: string;
  };
}

export interface Project {
  id: string;
  title: string;
}

export interface MessageAttachment {
  id?: string;
  messageId?: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  sender: User;
  attachments: MessageAttachment[];
}

export interface Chat {
  id: string;
  title?: string;
  type: ChatType;
  status: ChatStatus;
  investorId?: string;
  projectOwnerId?: string;
  buyerId?: string;
  sellerId?: string;
  adminId?: string;
  projectId?: string;
  unreadCount?: number;
  investor?: User;
  projectOwner?: User;
  buyer?: User;
  seller?: User;
  admin?: User | {
    id: string;
    email: string;
    role: Role;
  };
  project?: Project | {
    id: string;
    title: string;
  };
  messages?: Message[];
  _count?: {
    messages: number;
  };
  lastMessage?: Message | string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatDto {
  investorId?: string;
  projectOwnerId?: string;
  buyerId?: string;
  sellerId?: string;
  adminId?: string;
  projectId?: string;
  type?: ChatType;
  title?: string;
  firstMessage?: string;
  userId?: string;
}

export interface SendMessageDto {
  chatId: string;
  senderId: string;
  content?: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
}

export interface ChatWithRelations extends Chat {
  investor?: User;
  projectOwner?: User;
  buyer?: User;
  seller?: User;
  admin?: User;
  project?: Project;
  messages?: Array<Message>;
}