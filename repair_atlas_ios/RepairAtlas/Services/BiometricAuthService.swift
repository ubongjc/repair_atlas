import Foundation
import LocalAuthentication

/**
 * Biometric Authentication Service
 * - Face ID / Touch ID support
 * - Fallback to device passcode
 * - Secure credential storage
 */
class BiometricAuthService {
    enum BiometricType {
        case faceID
        case touchID
        case none
    }

    enum BiometricError: Error {
        case notAvailable
        case notEnrolled
        case authenticationFailed
        case cancelled
        case fallback
        case passcodeNotSet
        case systemCancel
    }

    // MARK: - Check Biometric Availability

    static func getBiometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        default:
            return .none
        }
    }

    static func isBiometricAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    // MARK: - Authenticate

    static func authenticate(reason: String = "Authenticate to access Repair Atlas") async throws {
        let context = LAContext()
        context.localizedFallbackTitle = "Use Passcode"
        context.localizedCancelTitle = "Cancel"

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            if let error = error {
                throw mapError(error)
            }
            throw BiometricError.notAvailable
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            if !success {
                throw BiometricError.authenticationFailed
            }
        } catch let error as LAError {
            throw mapError(error as NSError)
        }
    }

    // MARK: - Authenticate with Fallback to Passcode

    static func authenticateWithPasscode(reason: String = "Authenticate to access Repair Atlas") async throws {
        let context = LAContext()

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            if let error = error {
                throw mapError(error)
            }
            throw BiometricError.notAvailable
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )

            if !success {
                throw BiometricError.authenticationFailed
            }
        } catch let error as LAError {
            throw mapError(error as NSError)
        }
    }

    // MARK: - Error Mapping

    private static func mapError(_ error: NSError) -> BiometricError {
        guard let laError = LAError.Code(rawValue: error.code) else {
            return .authenticationFailed
        }

        switch laError {
        case .biometryNotAvailable:
            return .notAvailable
        case .biometryNotEnrolled:
            return .notEnrolled
        case .authenticationFailed:
            return .authenticationFailed
        case .userCancel:
            return .cancelled
        case .userFallback:
            return .fallback
        case .passcodeNotSet:
            return .passcodeNotSet
        case .systemCancel:
            return .systemCancel
        default:
            return .authenticationFailed
        }
    }

    // MARK: - Helper Methods

    static func getBiometricDescription() -> String {
        let type = getBiometricType()
        switch type {
        case .faceID:
            return "Face ID"
        case .touchID:
            return "Touch ID"
        case .none:
            return "Biometric Authentication"
        }
    }

    static func getAuthenticationIcon() -> String {
        let type = getBiometricType()
        switch type {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .none:
            return "lock.fill"
        }
    }
}
