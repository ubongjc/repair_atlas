import Foundation
import CryptoKit

enum CryptoError: Error, LocalizedError {
    case encryptionFailed
    case decryptionFailed
    case keyGenerationFailed
    case invalidData

    var errorDescription: String? {
        switch self {
        case .encryptionFailed:
            return "Failed to encrypt data"
        case .decryptionFailed:
            return "Failed to decrypt data"
        case .keyGenerationFailed:
            return "Failed to generate encryption key"
        case .invalidData:
            return "Invalid data format"
        }
    }
}

/// Client-side encryption service using AES-GCM
/// Sensitive data is encrypted before upload; server stores ciphertext only
class CryptoService {

    // MARK: - Key Management

    /// Generate a new symmetric key for encryption
    static func generateKey() -> SymmetricKey {
        return SymmetricKey(size: .bits256)
    }

    /// Store key securely in Keychain
    static func storeKey(_ key: SymmetricKey, forIdentifier identifier: String) throws {
        let keyData = key.withUnsafeBytes { Data($0) }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier,
            kSecValueData as String: keyData,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        // Delete existing key if present
        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw CryptoError.keyGenerationFailed
        }
    }

    /// Retrieve key from Keychain
    static func retrieveKey(forIdentifier identifier: String) throws -> SymmetricKey {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let keyData = result as? Data else {
            throw CryptoError.keyGenerationFailed
        }

        return SymmetricKey(data: keyData)
    }

    // MARK: - Encryption/Decryption

    /// Encrypt data using AES-GCM
    /// - Parameters:
    ///   - data: Plain data to encrypt
    ///   - key: Symmetric key for encryption
    /// - Returns: Encrypted data with nonce prepended
    static func encrypt(_ data: Data, using key: SymmetricKey) throws -> Data {
        do {
            let sealedBox = try AES.GCM.seal(data, using: key)

            guard let combined = sealedBox.combined else {
                throw CryptoError.encryptionFailed
            }

            return combined
        } catch {
            throw CryptoError.encryptionFailed
        }
    }

    /// Decrypt data using AES-GCM
    /// - Parameters:
    ///   - data: Encrypted data with nonce prepended
    ///   - key: Symmetric key for decryption
    /// - Returns: Decrypted plain data
    static func decrypt(_ data: Data, using key: SymmetricKey) throws -> Data {
        do {
            let sealedBox = try AES.GCM.SealedBox(combined: data)
            let decrypted = try AES.GCM.open(sealedBox, using: key)
            return decrypted
        } catch {
            throw CryptoError.decryptionFailed
        }
    }

    // MARK: - Image Encryption

    /// Encrypt image data before upload
    /// - Parameter imageData: Image data to encrypt
    /// - Returns: Tuple of (encrypted data, key identifier for retrieval)
    static func encryptImage(_ imageData: Data) throws -> (encryptedData: Data, keyIdentifier: String) {
        // Generate unique key for this image
        let key = generateKey()
        let keyIdentifier = UUID().uuidString

        // Store key in keychain
        try storeKey(key, forIdentifier: keyIdentifier)

        // Encrypt image
        let encryptedData = try encrypt(imageData, using: key)

        return (encryptedData, keyIdentifier)
    }

    /// Decrypt image data after download
    /// - Parameters:
    ///   - encryptedData: Encrypted image data
    ///   - keyIdentifier: Key identifier for retrieval
    /// - Returns: Decrypted image data
    static func decryptImage(_ encryptedData: Data, keyIdentifier: String) throws -> Data {
        let key = try retrieveKey(forIdentifier: keyIdentifier)
        return try decrypt(encryptedData, using: key)
    }

    // MARK: - Hashing

    /// Generate SHA256 hash of data
    static func sha256(_ data: Data) -> String {
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
}
