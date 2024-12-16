/**
 * Encrypt sensitive data using AES-GCM
 * @param data - The data to encrypt
 */
export async function encrypt(data: string): Promise<string> {
    try {
      // Generate a random key for encryption
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );
  
      // Generate a random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
      // Encrypt the data
      const encodedData = new TextEncoder().encode(data);
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        encodedData
      );
  
      // Export the key
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  
      // Combine IV, key, and encrypted data
      const combined = new Uint8Array(iv.length + exportedKey.byteLength + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(exportedKey), iv.length);
      combined.set(new Uint8Array(encryptedData), iv.length + exportedKey.byteLength);
  
      // Convert to base64 for storage
      return btoa(Array.from(combined).map(byte => String.fromCharCode(byte)).join(''));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt sensitive data using AES-GCM
   * @param encryptedData - The data to decrypt
   */
  export async function decrypt(encryptedData: string): Promise<string> {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );
  
      // Extract IV, key, and encrypted data
      const iv = combined.slice(0, 12);
      const keyData = combined.slice(12, 44);
      const data = combined.slice(44);
  
      // Import the key
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
      );
  
      // Decrypt the data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        data
      );
  
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }