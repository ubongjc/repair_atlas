import Foundation
import CoreLocation
import Combine

@MainActor
class ToolsMapViewModel: NSObject, ObservableObject {
    @Published var toolLibraries: [ToolLibrary] = []
    @Published var selectedLibrary: ToolLibrary?
    @Published var userLocation: CLLocationCoordinate2D?
    @Published var error: String?

    private let networkService: NetworkService
    private let locationManager = CLLocationManager()

    override init() {
        self.networkService = NetworkService()
        super.init()

        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
    }

    func loadNearbyLibraries() async {
        // Request location if not already available
        if userLocation == nil {
            locationManager.requestLocation()
        }

        // TODO: Load from API when available
        // For now, use mock data
        toolLibraries = [
            ToolLibrary(
                id: "1",
                name: "Community Tool Library",
                address: "123 Main St",
                city: "San Francisco",
                state: "CA",
                country: "USA",
                postalCode: "94102",
                latitude: 37.7749,
                longitude: -122.4194,
                contactEmail: "contact@tooltlibrary.org",
                contactPhone: "(555) 123-4567",
                website: "https://toollibrary.org"
            ),
            ToolLibrary(
                id: "2",
                name: "Makerspace Tools",
                address: "456 Market St",
                city: "San Francisco",
                state: "CA",
                country: "USA",
                postalCode: "94103",
                latitude: 37.7849,
                longitude: -122.4094,
                contactEmail: "info@makerspace.org",
                contactPhone: "(555) 987-6543",
                website: "https://makerspace.org"
            )
        ]
    }

    func selectLibrary(_ library: ToolLibrary) {
        selectedLibrary = library
    }
}

extension ToolsMapViewModel: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.first {
            userLocation = location.coordinate
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        self.error = "Failed to get location: \(error.localizedDescription)"
    }
}
