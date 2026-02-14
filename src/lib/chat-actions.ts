/**
 * Chat Actions - Sanity operations for messaging
 * Handles conversations, messages, read receipts, and real-time sync
 */

import {sanityWriteClient} from './sanity';
import {SanityDocument} from '@sanity/client';

// Types
export interface Message extends SanityDocument {
  _id: string;
  _type: 'message';
  _createdAt: string;
  conversation: {_ref: string; _type: 'reference'};
  sender: {_ref: string; _type: 'reference'};
  content: string;
  image?: {
    url: string;
    alt?: string;
  };
  readBy?: Array<{_ref: string; _type: 'reference'; _key: string}>;
  messageType: 'text' | 'image' | 'system';
}

export interface Conversation extends SanityDocument {
  _id: string;
  _type: 'conversation';
  _createdAt: string;
  participants: Array<{
    _ref: string;
    _type: 'reference';
    _key: string;
  }>;
  lastMessage?: {_ref: string; _type: 'reference'};
  lastMessageAt?: string;
  unreadCounts?: Array<{
    _key: string;
    userId: string;
    count: number;
  }>;
}

export interface ConversationWithDetails extends Conversation {
  otherUser?: {
    _id: string;
    name: string;
    username: string;
    image?: string;
  };
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  userId: string,
  otherUserId: string
): Promise<Conversation> {
  try {
    // Check if conversation already exists (bidirectional)
    const existingConversation = await sanityWriteClient.fetch<Conversation | null>(
      `*[_type == "conversation" && 
        $userId in participants[]._ref && 
        $otherUserId in participants[]._ref
      ] | order(_createdAt desc) [0]`,
      {userId, otherUserId}
    );

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const newConversation = await sanityWriteClient.create({
      _type: 'conversation',
      participants: [
        {_type: 'reference', _ref: userId, _key: `${userId}-key`},
        {_type: 'reference', _ref: otherUserId, _key: `${otherUserId}-key`},
      ],
      unreadCounts: [
        {_key: `${userId}-unread`, userId, count: 0},
        {_key: `${otherUserId}-unread`, userId: otherUserId, count: 0},
      ],
    });

    return newConversation as Conversation;
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user with details
 */
export async function getConversations(
  userId: string
): Promise<ConversationWithDetails[]> {
  try {
    const conversations = await sanityWriteClient.fetch<ConversationWithDetails[]>(
      `*[_type == "conversation" && $userId in participants[]._ref] | order(lastMessageAt desc) {
        _id,
        _type,
        _createdAt,
        participants,
        lastMessage,
        lastMessageAt,
        unreadCounts,
        "otherUser": participants[_ref != $userId][0]->{
          _id,
          name,
          username,
          image
        },
        "lastMessageText": lastMessage->content,
        "lastMessageTime": lastMessage->_createdAt,
        "unreadCount": unreadCounts[userId == $userId][0].count
      }`,
      {userId}
    );

    // Deduplicate: if multiple conversations exist with the same user,
    // keep only the most recent one (already sorted by lastMessageAt desc)
    const seen = new Set<string>();
    const deduped = (conversations || []).filter(c => {
      const otherId = c.otherUser?._id;
      if (!otherId || seen.has(otherId)) return false;
      seen.add(otherId);
      return true;
    });

    return deduped;
  } catch (error) {
    console.error('Error in getConversations:', error);
    throw error;
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50
): Promise<Message[]> {
  try {
    const messages = await sanityWriteClient.fetch<Message[]>(
      `*[_type == "message" && conversation._ref == $conversationId] | order(_createdAt desc) [0...$limit] {
        _id,
        _type,
        _createdAt,
        conversation,
        sender,
        content,
        image,
        readBy,
        messageType
      }`,
      {conversationId, limit}
    );

    // Reverse to show oldest first
    return (messages || []).reverse();
  } catch (error) {
    console.error('Error in getMessages:', error);
    throw error;
  }
}

/**
 * Send a new message
 */
export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image' | 'system';
  image?: {url: string; alt?: string};
}): Promise<Message> {
  try {
    const {conversationId, senderId, content, messageType = 'text', image} = data;

    // Create message
    const message = await sanityWriteClient.create({
      _type: 'message',
      conversation: {_type: 'reference', _ref: conversationId},
      sender: {_type: 'reference', _ref: senderId},
      content,
      messageType,
      image,
      readBy: [
        {_type: 'reference', _ref: senderId, _key: `${senderId}-read`},
      ],
    });

    // Update conversation lastMessage
    await sanityWriteClient
      .patch(conversationId)
      .set({
        lastMessage: {_type: 'reference', _ref: message._id},
        lastMessageAt: new Date().toISOString(),
      })
      .commit();

    return message as Message;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
  messageIds: string[]
): Promise<void> {
  try {
    if (messageIds.length === 0) return;

    // Add user to readBy array for each message
    const patches = messageIds.map(messageId =>
      sanityWriteClient
        .patch(messageId)
        .setIfMissing({readBy: []})
        .append('readBy', [
          {_type: 'reference', _ref: userId, _key: `${userId}-read-${Date.now()}`},
        ])
    );

    await Promise.all(patches.map(p => p.commit()));

    // Reset unread count for this user in the conversation
    try {
      const conversation = await sanityWriteClient.fetch<Conversation | null>(
        `*[_type == "conversation" && _id == $conversationId][0]`,
        {conversationId}
      );
      if (conversation?.unreadCounts) {
        const updatedCounts = conversation.unreadCounts.map(uc =>
          uc.userId === userId ? {...uc, count: 0} : uc
        );
        await sanityWriteClient
          .patch(conversationId)
          .set({unreadCounts: updatedCounts})
          .commit();
      }
    } catch (resetError) {
      console.error('Error resetting unread count:', resetError);
      // Non-critical, don't throw
    }

    console.log(`✅ Marked ${messageIds.length} messages as read + reset unread count`);
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    throw error;
  }
}

/**
 * Increment unread count for recipient
 */
export async function incrementUnreadCount(
  conversationId: string,
  recipientId: string
): Promise<void> {
  try {
    // Get current count
    const conversation = await sanityWriteClient.fetch<Conversation>(
      `*[_type == "conversation" && _id == $conversationId][0]`,
      {conversationId}
    );

    const unreadEntry = conversation?.unreadCounts?.find(
      uc => uc.userId === recipientId
    );
    const currentCount = unreadEntry?.count || 0;

    // Increment
    await sanityWriteClient
      .patch(conversationId)
      .set({
        [`unreadCounts[userId == "${recipientId}"].count`]: currentCount + 1,
      })
      .commit();
  } catch (error) {
    console.error('Error in incrementUnreadCount:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Get user details by ID
 */
export async function getUserById(userId: string) {
  try {
    const user = await sanityWriteClient.fetch(
      `*[_type == "author" && _id == $userId][0] {
        _id,
        name,
        username,
        image
      }`,
      {userId}
    );
    return user;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

/**
 * Search users for starting new conversations
 */
export async function searchUsers(query: string, currentUserId: string) {
  try {
    const searchQuery = `${query}*`;
    const users = await sanityWriteClient.fetch(
      `*[_type == "author" && _id != $currentUserId && (
        name match $searchQuery || 
        username match $searchQuery
      )][0...10] {
        _id,
        name,
        username,
        image
      }`,
      {searchQuery, currentUserId}
    );
    return users || [];
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
}
