import Foundation

struct ToolLibrary: Identifiable, Codable {
    let id: String
    let name: String
    let address: String
    let city: String
    let state: String?
    let country: String
    let postalCode: String?
    let latitude: Double
    let longitude: Double
    let contactEmail: String?
    let contactPhone: String?
    let website: String?
}

struct Tool: Identifiable, Codable {
    let id: String
    let libraryId: String
    let name: String
    let category: String
    let brand: String?
    let model: String?
    let condition: String?
    let available: Bool
    let loanPeriodDays: Int
    let depositAmount: Double?
}
