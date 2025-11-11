import SwiftUI

struct ItemsListView: View {
    @StateObject private var viewModel = ItemsListViewModel()

    var body: some View {
        NavigationView {
            List {
                ForEach(viewModel.items) { item in
                    NavigationLink(destination: ItemDetailView(item: item)) {
                        ItemRowView(item: item)
                    }
                }
            }
            .navigationTitle("My Items")
            .refreshable {
                await viewModel.loadItems()
            }
            .task {
                await viewModel.loadItems()
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.items.isEmpty {
                    ContentUnavailableView(
                        "No Items Yet",
                        systemImage: "tray",
                        description: Text("Identify an item to get started")
                    )
                }
            }
        }
    }
}

struct ItemRowView: View {
    let item: Item

    var body: some View {
        HStack(spacing: 12) {
            if let photoUrl = item.photoUrls.first {
                AsyncImage(url: URL(string: photoUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.gray.opacity(0.2)
                }
                .frame(width: 60, height: 60)
                .cornerRadius(8)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(item.brand ?? item.category)
                    .font(.headline)

                if let model = item.model {
                    Text(model)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Text(item.createdAt, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ItemDetailView: View {
    let item: Item

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let photoUrl = item.photoUrls.first {
                    AsyncImage(url: URL(string: photoUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        ProgressView()
                    }
                    .cornerRadius(12)
                }

                VStack(alignment: .leading, spacing: 12) {
                    DetailRow(label: "Category", value: item.category)

                    if let brand = item.brand {
                        DetailRow(label: "Brand", value: brand)
                    }

                    if let model = item.model {
                        DetailRow(label: "Model", value: model)
                    }

                    if let modelNumber = item.modelNumber {
                        DetailRow(label: "Model Number", value: modelNumber)
                    }

                    if let confidence = item.confidence {
                        HStack {
                            Text("Confidence")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(Int(confidence * 100))%")
                                .font(.subheadline)
                        }
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
        .navigationTitle(item.brand ?? "Item Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline)
        }
    }
}

#Preview {
    ItemsListView()
}
