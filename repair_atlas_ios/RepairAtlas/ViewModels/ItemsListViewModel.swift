import Foundation
import Combine

@MainActor
class ItemsListViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false
    @Published var error: String?

    private let networkService: NetworkService

    init(networkService: NetworkService = NetworkService()) {
        self.networkService = networkService
    }

    func loadItems() async {
        isLoading = true
        error = nil

        do {
            let response = try await networkService.listItems()

            let dateFormatter = ISO8601DateFormatter()

            items = response.items.map { itemResponse in
                Item(
                    id: itemResponse.id,
                    category: itemResponse.category,
                    brand: itemResponse.brand,
                    model: itemResponse.model,
                    modelNumber: itemResponse.modelNumber,
                    confidence: itemResponse.confidence,
                    photoUrls: itemResponse.photoUrls,
                    metadata: itemResponse.metadata,
                    createdAt: dateFormatter.date(from: itemResponse.createdAt) ?? Date()
                )
            }

            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }
}
