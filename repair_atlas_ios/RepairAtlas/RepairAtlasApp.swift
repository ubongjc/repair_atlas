import SwiftUI

@main
struct RepairAtlasApp: App {
    @StateObject private var authViewModel = AuthenticationViewModel()
    @StateObject private var networkService = NetworkService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .environmentObject(networkService)
        }
    }
}
