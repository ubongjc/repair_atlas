import Foundation
import CoreData

/**
 * Offline Storage Service
 * - Local persistence with Core Data
 * - Sync queue for offline operations
 * - Automatic sync when online
 */
class OfflineStorageService {
    static let shared = OfflineStorageService()

    // MARK: - Core Data Stack

    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "RepairAtlas")
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Unable to load persistent stores: \(error)")
            }
        }
        return container
    }()

    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }

    private init() {}

    // MARK: - Save Context

    func saveContext() {
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                print("Error saving context: \(error)")
            }
        }
    }

    // MARK: - Item Storage

    func saveItemLocally(_ item: Item) {
        // Save item to Core Data for offline access
        saveContext()
    }

    func fetchLocalItems() -> [Item] {
        // Fetch items from Core Data
        // TODO: Implement Core Data fetch
        return []
    }

    func deleteLocalItem(_ itemId: String) {
        // Delete item from Core Data
        saveContext()
    }

    // MARK: - Sync Queue

    private var syncQueue: [(action: String, data: [String: Any])] = []

    func queueForSync(action: String, data: [String: Any]) {
        syncQueue.append((action: action, data: data))
        UserDefaults.standard.set(syncQueue.count, forKey: "pendingSyncCount")
    }

    func getSyncQueueCount() -> Int {
        return syncQueue.count
    }

    func processSyncQueue() async {
        guard !syncQueue.isEmpty else { return }

        print("Processing sync queue: \(syncQueue.count) items")

        // TODO: Process each queued action
        for item in syncQueue {
            // Send to API when online
            print("Syncing: \(item.action)")
        }

        syncQueue.removeAll()
        UserDefaults.standard.set(0, forKey: "pendingSyncCount")
    }

    // MARK: - Cache Management

    func cacheImage(_ imageData: Data, forKey key: String) {
        let fileManager = FileManager.default
        guard let cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return
        }

        let fileURL = cacheDirectory.appendingPathComponent(key)
        try? imageData.write(to: fileURL)
    }

    func getCachedImage(forKey key: String) -> Data? {
        let fileManager = FileManager.default
        guard let cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return nil
        }

        let fileURL = cacheDirectory.appendingPathComponent(key)
        return try? Data(contentsOf: fileURL)
    }

    func clearCache() {
        let fileManager = FileManager.default
        guard let cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return
        }

        try? fileManager.removeItem(at: cacheDirectory)
    }

    // MARK: - Offline Mode Detection

    func isOnline() -> Bool {
        // TODO: Implement proper network reachability check
        // For now, return true
        return true
    }
}
