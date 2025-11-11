import SwiftUI
import MapKit

struct ToolsMapView: View {
    @StateObject private var viewModel = ToolsMapViewModel()
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )

    var body: some View {
        NavigationView {
            ZStack(alignment: .bottom) {
                Map(coordinateRegion: $region, annotationItems: viewModel.toolLibraries) { library in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(
                        latitude: library.latitude,
                        longitude: library.longitude
                    )) {
                        LibraryAnnotationView(library: library)
                    }
                }
                .ignoresSafeArea()

                if let selectedLibrary = viewModel.selectedLibrary {
                    LibraryDetailCard(library: selectedLibrary) {
                        viewModel.selectedLibrary = nil
                    }
                    .transition(.move(edge: .bottom))
                }
            }
            .navigationTitle("Tool Libraries")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadNearbyLibraries()
            }
        }
    }
}

struct LibraryAnnotationView: View {
    let library: ToolLibrary

    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: "wrench.and.screwdriver.fill")
                .foregroundColor(.white)
                .padding(8)
                .background(Color.blue)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color.white, lineWidth: 2)
                )
        }
    }
}

struct LibraryDetailCard: View {
    let library: ToolLibrary
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(library.name)
                        .font(.headline)

                    Text(library.address)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }

            if let contactPhone = library.contactPhone {
                HStack {
                    Image(systemName: "phone.fill")
                        .foregroundColor(.blue)
                    Text(contactPhone)
                        .font(.subheadline)
                }
            }

            if let website = library.website {
                Link(destination: URL(string: website)!) {
                    HStack {
                        Image(systemName: "globe")
                        Text("Visit Website")
                    }
                    .font(.subheadline)
                }
            }

            Button(action: {
                // Open directions in Maps
                let coordinate = CLLocationCoordinate2D(
                    latitude: library.latitude,
                    longitude: library.longitude
                )
                let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
                mapItem.name = library.name
                mapItem.openInMaps(launchOptions: [:])
            }) {
                Text("Get Directions")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 10)
        .padding()
    }
}

#Preview {
    ToolsMapView()
}
