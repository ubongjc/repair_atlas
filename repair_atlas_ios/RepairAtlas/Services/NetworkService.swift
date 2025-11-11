import Foundation
import Combine

enum NetworkError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case serverError(statusCode: Int, message: String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .serverError(let statusCode, let message):
            return "Server error (\(statusCode)): \(message)"
        case .unauthorized:
            return "Unauthorized - please sign in"
        }
    }
}

@MainActor
class NetworkService: ObservableObject {
    private let baseURL: String
    private var authToken: String?

    init(baseURL: String = "http://localhost:3000") {
        self.baseURL = baseURL
    }

    func setAuthToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - Generic Request Methods

    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        contentType: String = "application/json"
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.noData
        }

        if httpResponse.statusCode == 401 {
            throw NetworkError.unauthorized
        }

        if !(200...299).contains(httpResponse.statusCode) {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw NetworkError.serverError(statusCode: httpResponse.statusCode, message: errorMessage)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error)")
            throw NetworkError.decodingError
        }
    }

    // MARK: - Health Check

    func healthCheck() async throws -> HealthResponse {
        return try await request(endpoint: "/api/health")
    }

    // MARK: - Item Identification

    func identifyItem(imageData: Data, category: String? = nil) async throws -> ItemIdentifyResponse {
        guard let url = URL(string: "\(baseURL)/api/item/identify") else {
            throw NetworkError.invalidURL
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()

        // Add image
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)

        // Add category if provided
        if let category = category {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"category\"\r\n\r\n".data(using: .utf8)!)
            body.append(category.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.noData
        }

        if httpResponse.statusCode == 401 {
            throw NetworkError.unauthorized
        }

        if !(200...299).contains(httpResponse.statusCode) {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw NetworkError.serverError(statusCode: httpResponse.statusCode, message: errorMessage)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(ItemIdentifyResponse.self, from: data)
    }

    func listItems() async throws -> ItemsListResponse {
        return try await request(endpoint: "/api/item/identify")
    }

    // MARK: - Tool Libraries

    func nearbyToolLibraries(latitude: Double, longitude: Double) async throws -> [ToolLibrary] {
        // TODO: Implement when endpoint is available
        return []
    }
}

struct HealthResponse: Codable {
    let status: String
    let timestamp: String
    let database: String
}
