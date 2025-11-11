import Foundation
import UIKit
import Combine

@MainActor
class IdentifyViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var identifiedItem: Item?
    @Published var error: String?

    private let networkService: NetworkService
    private let cryptoService = CryptoService.self

    init(networkService: NetworkService = NetworkService()) {
        self.networkService = networkService
    }

    func identifyItem(image: UIImage, category: String? = nil) async {
        isLoading = true
        error = nil

        do {
            // Convert image to data
            guard let imageData = image.jpegData(compressionQuality: 0.8) else {
                throw NSError(domain: "IdentifyViewModel", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Failed to convert image to data"
                ])
            }

            // Optionally encrypt sensitive images before upload
            // For demo items, we'll skip encryption
            // For sensitive repairs (e.g., medical devices), enable encryption:
            // let (encryptedData, keyId) = try cryptoService.encryptImage(imageData)

            // Call API
            let response = try await networkService.identifyItem(
                imageData: imageData,
                category: category
            )

            // Convert response to Item
            let dateFormatter = ISO8601DateFormatter()
            let createdAt = dateFormatter.date(from: response.createdAt) ?? Date()

            identifiedItem = Item(
                id: response.id,
                category: response.category,
                brand: response.brand,
                model: response.model,
                modelNumber: response.modelNumber,
                confidence: response.confidence,
                photoUrls: response.photoUrls,
                metadata: response.metadata,
                createdAt: createdAt
            )

            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func reset() {
        identifiedItem = nil
        error = nil
    }
}
