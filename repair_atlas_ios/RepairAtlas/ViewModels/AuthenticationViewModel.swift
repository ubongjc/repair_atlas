import Foundation
import AuthenticationServices
import Combine

@MainActor
class AuthenticationViewModel: NSObject, ObservableObject {
    @Published var isAuthenticated = false
    @Published var userEmail: String?
    @Published var authToken: String?
    @Published var error: String?

    private let domain = "repairatlas.com" // Replace with your domain

    override init() {
        super.init()
        checkAuthStatus()
    }

    // MARK: - Authentication Status

    private func checkAuthStatus() {
        // Check if we have a stored auth token
        if let token = retrieveAuthToken() {
            self.authToken = token
            self.isAuthenticated = true
            // TODO: Verify token validity with backend
        }
    }

    // MARK: - Passkey Authentication

    func signInWithPasskey() async {
        do {
            // Create passkey request
            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: domain)

            // For sign-in, we need to get the challenge from the server
            // TODO: Get challenge from backend
            let challenge = Data(UUID().uuidString.utf8)

            let assertionRequest = provider.createCredentialAssertionRequest(challenge: challenge)

            let authController = ASAuthorizationController(authorizationRequests: [assertionRequest])
            authController.delegate = self
            authController.presentationContextProvider = self

            authController.performRequests()
        } catch {
            self.error = "Failed to initiate passkey sign in: \(error.localizedDescription)"
        }
    }

    func signUpWithPasskey(email: String) async {
        do {
            // Create passkey registration request
            let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: domain)

            // TODO: Get challenge and user ID from backend
            let challenge = Data(UUID().uuidString.utf8)
            let userID = Data(UUID().uuidString.utf8)

            let registrationRequest = provider.createCredentialRegistrationRequest(
                challenge: challenge,
                name: email,
                userID: userID
            )

            let authController = ASAuthorizationController(authorizationRequests: [registrationRequest])
            authController.delegate = self
            authController.presentationContextProvider = self

            authController.performRequests()
        } catch {
            self.error = "Failed to create passkey: \(error.localizedDescription)"
        }
    }

    // MARK: - Email/Magic Link Authentication

    func signInWithEmail(_ email: String) async {
        // TODO: Implement magic link flow with backend
        // 1. Send email to backend
        // 2. Backend sends magic link
        // 3. User clicks link
        // 4. App receives callback with token

        // Placeholder implementation
        self.userEmail = email
        print("Sending magic link to \(email)")
    }

    // MARK: - Sign Out

    func signOut() async {
        // Clear stored credentials
        deleteAuthToken()

        self.isAuthenticated = false
        self.authToken = nil
        self.userEmail = nil
    }

    // MARK: - Token Storage

    private func storeAuthToken(_ token: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "authToken",
            kSecValueData as String: token.data(using: .utf8)!,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    private func retrieveAuthToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "authToken",
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }

        return token
    }

    private func deleteAuthToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "authToken"
        ]

        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AuthenticationViewModel: ASAuthorizationControllerDelegate {
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        Task { @MainActor in
            switch authorization.credential {
            case let credential as ASAuthorizationPlatformPublicKeyCredentialAssertion:
                // Sign in with existing passkey
                // TODO: Send credential to backend for verification
                print("Passkey sign in successful")
                self.isAuthenticated = true

            case let credential as ASAuthorizationPlatformPublicKeyCredentialRegistration:
                // Registration with new passkey
                // TODO: Send credential to backend for registration
                print("Passkey registration successful")
                self.isAuthenticated = true

            default:
                self.error = "Unknown credential type"
            }
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        Task { @MainActor in
            if let authError = error as? ASAuthorizationError {
                switch authError.code {
                case .canceled:
                    // User canceled - don't show error
                    break
                case .failed:
                    self.error = "Authentication failed"
                case .notHandled:
                    self.error = "Authentication not handled"
                case .unknown:
                    self.error = "Unknown authentication error"
                @unknown default:
                    self.error = "Authentication error: \(error.localizedDescription)"
                }
            } else {
                self.error = error.localizedDescription
            }
        }
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension AuthenticationViewModel: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Get the key window
        let scenes = UIApplication.shared.connectedScenes
        let windowScene = scenes.first as? UIWindowScene
        let window = windowScene?.windows.first

        return window ?? ASPresentationAnchor()
    }
}
