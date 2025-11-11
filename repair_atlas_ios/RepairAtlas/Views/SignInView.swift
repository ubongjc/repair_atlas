import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @EnvironmentObject var authViewModel: AuthenticationViewModel
    @State private var showingEmailLogin = false
    @State private var email = ""

    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()

                // Logo and Title
                VStack(spacing: 16) {
                    Image(systemName: "wrench.and.screwdriver")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)

                    Text("Repair Atlas")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Camera → Repair Plan")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Sign in options
                VStack(spacing: 16) {
                    // Passkey Sign In (Primary)
                    Button(action: {
                        Task {
                            await authViewModel.signInWithPasskey()
                        }
                    }) {
                        HStack {
                            Image(systemName: "person.badge.key")
                            Text("Sign in with Passkey")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }

                    // Email/Magic Link (Fallback)
                    Button(action: {
                        showingEmailLogin.toggle()
                    }) {
                        HStack {
                            Image(systemName: "envelope")
                            Text("Sign in with Email")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.secondary.opacity(0.2))
                        .foregroundColor(.primary)
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingEmailLogin) {
                EmailLoginView(email: $email)
                    .environmentObject(authViewModel)
            }
        }
    }
}

struct EmailLoginView: View {
    @EnvironmentObject var authViewModel: AuthenticationViewModel
    @Binding var email: String
    @Environment(\.dismiss) var dismiss
    @State private var isLoading = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Text("Sign in with Email")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top)

                Text("We'll send you a magic link to sign in")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                TextField("Email", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding(.horizontal)

                Button(action: {
                    Task {
                        isLoading = true
                        await authViewModel.signInWithEmail(email)
                        isLoading = false
                        if authViewModel.isAuthenticated {
                            dismiss()
                        }
                    }
                }) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Send Magic Link")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(email.isEmpty ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(email.isEmpty || isLoading)

                Spacer()
            }
            .navigationBarItems(trailing: Button("Cancel") {
                dismiss()
            })
        }
    }
}

#Preview {
    SignInView()
        .environmentObject(AuthenticationViewModel())
}
