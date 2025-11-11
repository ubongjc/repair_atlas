# Repair Atlas iOS

Native iOS application for Repair Atlas - Camera-powered repairability plans.

## Tech Stack

- **Language**: Swift 5.9+
- **Framework**: SwiftUI
- **Architecture**: MVVM
- **Networking**: URLSession with async/await
- **Authentication**: AuthenticationServices (Passkey/WebAuthn)
- **Encryption**: CryptoKit (AES-GCM)
- **Location**: CoreLocation
- **Camera**: AVFoundation
- **Payments**: StoreKit 2

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## Project Structure

```
RepairAtlas/
├── RepairAtlasApp.swift          # App entry point
├── Models/                       # Data models
│   ├── Item.swift               # Item identification models
│   └── ToolLibrary.swift        # Tool library models
├── Views/                       # SwiftUI views
│   ├── ContentView.swift        # Root view with tab navigation
│   ├── SignInView.swift         # Authentication flow
│   ├── IdentifyView.swift       # Camera/item identification
│   ├── ItemsListView.swift      # User's identified items
│   ├── ToolsMapView.swift       # Tool library map
│   ├── SettingsView.swift       # Settings and account
│   └── CameraView.swift         # Camera interface
├── ViewModels/                  # View models
│   ├── AuthenticationViewModel.swift
│   ├── IdentifyViewModel.swift
│   ├── ItemsListViewModel.swift
│   └── ToolsMapViewModel.swift
├── Services/                    # Business logic services
│   ├── NetworkService.swift     # API client
│   └── CryptoService.swift      # Client-side encryption
└── Info.plist                   # App configuration
```

## Features

### Authentication
- **Passkey-first**: Primary authentication using WebAuthn/Passkeys
- **Magic Links**: Fallback email-based authentication
- **Secure Storage**: Keychain integration for credentials

### Item Identification
- Camera capture or photo library selection
- Upload to backend for AI identification
- EXIF metadata extraction
- Results display with confidence scores

### Tool Libraries
- Map view of nearby tool lending locations
- Location-based search
- Contact information and directions
- Tool availability tracking

### Privacy & Security
- **Client-side Encryption**: Sensitive photos encrypted with AES-GCM before upload
- **Keychain Storage**: Secure credential management
- **Privacy-first**: Server only stores ciphertext for encrypted data

### Settings
- Account management
- Subscription handling (StoreKit)
- Data export (GDPR compliance)
- Account deletion

## Setup

1. Open `RepairAtlas.xcodeproj` in Xcode

2. Update `Info.plist` with your domain:
   - Replace `repairatlas.com` with your actual domain

3. Configure capabilities:
   - Sign in to your Apple Developer account in Xcode
   - Enable "Associated Domains" capability
   - Add domain: `webcredentials:yourdomain.com`

4. Update `NetworkService.swift` with your API endpoint:
   ```swift
   init(baseURL: String = "https://api.yourdomain.com") {
       self.baseURL = baseURL
   }
   ```

5. Build and run on a physical device (passkeys require physical device)

## Passkey Setup

1. Enable Associated Domains in Xcode capabilities
2. Add `apple-app-site-association` file to your web server:

```json
{
  "webcredentials": {
    "apps": ["TEAMID.com.yourcompany.repairatlas"]
  }
}
```

3. Serve at: `https://yourdomain.com/.well-known/apple-app-site-association`

## Client-Side Encryption

For sensitive uploads (e.g., photos of medical devices), the app encrypts data client-side:

```swift
// Encrypt before upload
let (encryptedData, keyId) = try CryptoService.encryptImage(imageData)

// Upload encrypted data to server
// Server stores ciphertext only

// Later, decrypt after download
let decryptedData = try CryptoService.decryptImage(encryptedData, keyIdentifier: keyId)
```

Keys are stored securely in the iOS Keychain and never leave the device.

## API Integration

The app communicates with the Next.js backend:

- `GET /api/health` - Health check
- `POST /api/item/identify` - Item identification
- `GET /api/item/identify` - List user's items
- More endpoints as implemented...

## Testing

Run tests in Xcode:
```bash
cmd + U
```

## Building for Production

1. Update version and build numbers
2. Configure code signing
3. Archive the app (Product → Archive)
4. Distribute via App Store Connect

## License

Proprietary
