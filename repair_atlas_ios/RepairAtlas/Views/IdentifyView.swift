import SwiftUI
import PhotosUI

struct IdentifyView: View {
    @StateObject private var viewModel = IdentifyViewModel()
    @State private var selectedItem: PhotosPickerItem?
    @State private var showCamera = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                if let identifiedItem = viewModel.identifiedItem {
                    // Show identified item result
                    ItemResultView(item: identifiedItem)
                } else {
                    // Show camera/photo picker
                    VStack(spacing: 32) {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 100))
                            .foregroundColor(.blue)

                        Text("Identify Your Item")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("Take a photo or choose from your library to identify your item and get repair information")
                            .multilineTextAlignment(.center)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)

                        VStack(spacing: 16) {
                            Button(action: {
                                showCamera = true
                            }) {
                                HStack {
                                    Image(systemName: "camera.fill")
                                    Text("Take Photo")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }

                            PhotosPicker(selection: $selectedItem, matching: .images) {
                                HStack {
                                    Image(systemName: "photo.fill")
                                    Text("Choose from Library")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.secondary.opacity(0.2))
                                .foregroundColor(.primary)
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal, 32)
                    }
                }

                if viewModel.isLoading {
                    ProgressView("Identifying...")
                        .padding()
                }

                Spacer()
            }
            .navigationTitle("Identify")
            .sheet(isPresented: $showCamera) {
                CameraView { image in
                    Task {
                        await viewModel.identifyItem(image: image)
                    }
                }
            }
            .onChange(of: selectedItem) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        await viewModel.identifyItem(image: image)
                    }
                }
            }
            .alert("Error", isPresented: .constant(viewModel.error != nil)) {
                Button("OK") {
                    viewModel.error = nil
                }
            } message: {
                if let error = viewModel.error {
                    Text(error)
                }
            }
        }
    }
}

struct ItemResultView: View {
    let item: Item

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let photoUrl = item.photoUrls.first {
                AsyncImage(url: URL(string: photoUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    ProgressView()
                }
                .frame(height: 200)
                .cornerRadius(12)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Category")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(item.category)
                    .font(.title2)
                    .fontWeight(.semibold)
            }

            if let brand = item.brand {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Brand")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(brand)
                        .font(.body)
                }
            }

            if let model = item.model {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Model")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(model)
                        .font(.body)
                }
            }

            if let confidence = item.confidence {
                HStack {
                    Text("Confidence")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    ProgressView(value: confidence)
                    Text("\(Int(confidence * 100))%")
                        .font(.caption)
                }
            }

            Button(action: {
                // Navigate to defect reporting
            }) {
                Text("Report a Problem")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
        .padding()
    }
}

#Preview {
    IdentifyView()
}
