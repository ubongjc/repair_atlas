import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthenticationViewModel

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                MainTabView()
            } else {
                SignInView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            IdentifyView()
                .tabItem {
                    Label("Identify", systemImage: "camera")
                }

            ItemsListView()
                .tabItem {
                    Label("Items", systemImage: "list.bullet")
                }

            ToolsMapView()
                .tabItem {
                    Label("Tools", systemImage: "map")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthenticationViewModel())
        .environmentObject(NetworkService())
}
