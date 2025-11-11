import SwiftUI

/**
 * Loading View Component
 * - Smooth animations
 * - Customizable message
 * - Multiple loading styles
 */
struct LoadingView: View {
    var message: String = "Loading..."
    var style: LoadingStyle = .circular

    enum LoadingStyle {
        case circular
        case dots
        case pulse
    }

    var body: some View {
        VStack(spacing: 20) {
            switch style {
            case .circular:
                CircularLoadingView()
            case .dots:
                DotsLoadingView()
            case .pulse:
                PulseLoadingView()
            }

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

/**
 * Circular Loading Indicator
 */
struct CircularLoadingView: View {
    @State private var isAnimating = false

    var body: some View {
        Circle()
            .trim(from: 0, to: 0.7)
            .stroke(
                AngularGradient(
                    gradient: Gradient(colors: [.blue, .blue.opacity(0.3)]),
                    center: .center
                ),
                style: StrokeStyle(lineWidth: 4, lineCap: .round)
            )
            .frame(width: 50, height: 50)
            .rotationEffect(Angle(degrees: isAnimating ? 360 : 0))
            .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: isAnimating)
            .onAppear {
                isAnimating = true
            }
    }
}

/**
 * Dots Loading Indicator
 */
struct DotsLoadingView: View {
    @State private var animationPhase = 0

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color.blue)
                    .frame(width: 12, height: 12)
                    .scaleEffect(animationPhase == index ? 1.3 : 1.0)
                    .opacity(animationPhase == index ? 1.0 : 0.5)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever()) {
                animationPhase = 0
            }

            Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { _ in
                withAnimation(.easeInOut(duration: 0.6)) {
                    animationPhase = (animationPhase + 1) % 3
                }
            }
        }
    }
}

/**
 * Pulse Loading Indicator
 */
struct PulseLoadingView: View {
    @State private var isPulsing = false

    var body: some View {
        ZStack {
            ForEach(0..<3) { index in
                Circle()
                    .stroke(Color.blue.opacity(0.3), lineWidth: 2)
                    .frame(width: 60, height: 60)
                    .scaleEffect(isPulsing ? 1.5 : 0.8)
                    .opacity(isPulsing ? 0 : 1)
                    .animation(
                        .easeOut(duration: 1.5)
                        .repeatForever(autoreverses: false)
                        .delay(Double(index) * 0.5),
                        value: isPulsing
                    )
            }
        }
        .onAppear {
            isPulsing = true
        }
    }
}

/**
 * Preview
 */
struct LoadingView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 40) {
            LoadingView(message: "Loading...", style: .circular)
            LoadingView(message: "Please wait...", style: .dots)
            LoadingView(message: "Processing...", style: .pulse)
        }
    }
}
