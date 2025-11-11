import SwiftUI

/**
 * Animated Button Component
 * - Smooth scale and opacity animations
 * - Haptic feedback
 * - Loading state support
 * - Disabled state styling
 */
struct AnimatedButton: View {
    let title: String
    let icon: String?
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false
    var style: ButtonStyle = .primary

    @State private var isPressed = false

    enum ButtonStyle {
        case primary
        case secondary
        case destructive
        case ghost

        var backgroundColor: Color {
            switch self {
            case .primary:
                return .blue
            case .secondary:
                return .gray.opacity(0.2)
            case .destructive:
                return .red
            case .ghost:
                return .clear
            }
        }

        var foregroundColor: Color {
            switch self {
            case .primary, .destructive:
                return .white
            case .secondary, .ghost:
                return .primary
            }
        }
    }

    var body: some View {
        Button(action: {
            // Haptic feedback
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.impactOccurred()

            action()
        }) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: style.foregroundColor))
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                            .font(.body.weight(.semibold))
                    }

                    Text(title)
                        .font(.body.weight(.semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .foregroundColor(isDisabled ? .gray : style.foregroundColor)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isDisabled ? Color.gray.opacity(0.3) : style.backgroundColor)
            )
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .opacity(isPressed ? 0.8 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        }
        .disabled(isDisabled || isLoading)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    isPressed = true
                }
                .onEnded { _ in
                    isPressed = false
                }
        )
    }
}

/**
 * Animated Icon Button
 * - Circular icon button with animations
 */
struct AnimatedIconButton: View {
    let icon: String
    let action: () -> Void
    var size: CGFloat = 44
    var backgroundColor: Color = .blue
    var foregroundColor: Color = .white

    @State private var isPressed = false

    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .light)
            impact.impactOccurred()
            action()
        }) {
            Image(systemName: icon)
                .font(.system(size: size * 0.45, weight: .semibold))
                .foregroundColor(foregroundColor)
                .frame(width: size, height: size)
                .background(
                    Circle()
                        .fill(backgroundColor)
                        .shadow(color: backgroundColor.opacity(0.3), radius: isPressed ? 4 : 8, x: 0, y: isPressed ? 2 : 4)
                )
                .scaleEffect(isPressed ? 0.9 : 1.0)
                .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    isPressed = true
                }
                .onEnded { _ in
                    isPressed = false
                }
        )
    }
}

/**
 * Preview
 */
struct AnimatedButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            AnimatedButton(title: "Primary Button", icon: "checkmark", action: {}, style: .primary)
            AnimatedButton(title: "Secondary Button", icon: "gear", action: {}, style: .secondary)
            AnimatedButton(title: "Loading...", icon: nil, action: {}, isLoading: true)
            AnimatedButton(title: "Disabled", icon: nil, action: {}, isDisabled: true)

            HStack(spacing: 20) {
                AnimatedIconButton(icon: "heart.fill", action: {}, backgroundColor: .red)
                AnimatedIconButton(icon: "star.fill", action: {}, backgroundColor: .yellow)
                AnimatedIconButton(icon: "bookmark.fill", action: {}, backgroundColor: .green)
            }
        }
        .padding()
    }
}
