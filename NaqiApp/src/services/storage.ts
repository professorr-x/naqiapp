/**
 * Firebase Storage Service
 *
 * Handles file uploads to Firebase Storage for chat attachments.
 */

import storage from '@react-native-firebase/storage';

/**
 * Upload a chat image to Firebase Storage
 * @param imageUri - Local file URI of the image
 * @param sessionId - Chat session ID for organizing uploads
 * @returns Promise<string> - Download URL of the uploaded image
 */
export const uploadChatImage = async (
  imageUri: string,
  sessionId: string,
): Promise<string> => {
  try {
    const filename = `chat_${sessionId}_${Date.now()}.jpg`;
    const reference = storage().ref(`chat_images/${filename}`);

    // Upload file
    await reference.putFile(imageUri);

    // Get download URL
    const url = await reference.getDownloadURL();

    return url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete a chat image from Firebase Storage
 * @param imageUrl - Full download URL of the image
 */
export const deleteChatImage = async (imageUrl: string): Promise<void> => {
  try {
    const reference = storage().refFromURL(imageUrl);
    await reference.delete();
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
