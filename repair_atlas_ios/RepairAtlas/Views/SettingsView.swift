import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthenticationViewModel
    @State private var showingDataExport = false
    @State private var showingDeleteAccount = false

    var body: some View {
        NavigationView {
            List {
                Section("Account") {
                    if let email = authViewModel.userEmail {
                        HStack {
                            Text("Email")
                            Spacer()
                            Text(email)
                                .foregroundColor(.secondary)
                        }
                    }

                    NavigationLink("Subscription") {
                        SubscriptionView()
                    }
                }

                Section("Privacy & Data") {
                    Button(action: {
                        showingDataExport = true
                    }) {
                        HStack {
                            Image(systemName: "arrow.down.doc")
                            Text("Export My Data")
                        }
                    }

                    Button(role: .destructive, action: {
                        showingDeleteAccount = true
                    }) {
                        HStack {
                            Image(systemName: "trash")
                            Text("Delete Account")
                        }
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    Link(destination: URL(string: "https://repairatlas.com/privacy")!) {
                        HStack {
                            Text("Privacy Policy")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundColor(.secondary)
                        }
                    }

                    Link(destination: URL(string: "https://repairatlas.com/terms")!) {
                        HStack {
                            Text("Terms of Service")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Section {
                    Button(action: {
                        Task {
                            await authViewModel.signOut()
                        }
                    }) {
                        Text("Sign Out")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Export Data", isPresented: $showingDataExport) {
                Button("Cancel", role: .cancel) { }
                Button("Export") {
                    Task {
                        await exportUserData()
                    }
                }
            } message: {
                Text("Your data will be prepared and sent to your email address.")
            }
            .alert("Delete Account", isPresented: $showingDeleteAccount) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    Task {
                        await deleteAccount()
                    }
                }
            } message: {
                Text("This action cannot be undone. All your data will be permanently deleted.")
            }
        }
    }

    private func exportUserData() async {
        // TODO: Call API endpoint to request data export
        print("Requesting data export...")
    }

    private func deleteAccount() async {
        // TODO: Call API endpoint to delete account
        print("Deleting account...")
    }
}

struct SubscriptionView: View {
    @State private var isPro = false

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Repair Atlas Pro")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Unlock premium features")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 8)
            }

            Section("Pro Features") {
                FeatureRow(icon: "checkmark.circle.fill", text: "Unlimited item identifications")
                FeatureRow(icon: "checkmark.circle.fill", text: "Advanced repair guides")
                FeatureRow(icon: "checkmark.circle.fill", text: "Priority support")
                FeatureRow(icon: "checkmark.circle.fill", text: "Offline access")
            }

            Section {
                if isPro {
                    Button("Manage Subscription") {
                        // Open App Store subscriptions
                    }
                } else {
                    Button(action: {
                        Task {
                            await purchaseSubscription()
                        }
                    }) {
                        Text("Subscribe for $9.99/month")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .navigationTitle("Subscription")
    }

    private func purchaseSubscription() async {
        // TODO: Implement StoreKit purchase flow
        print("Initiating purchase...")
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.green)
            Text(text)
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthenticationViewModel())
}
