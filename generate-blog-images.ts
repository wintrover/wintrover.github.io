import path from "node:path";
import { convertMermaidToImage } from "./scripts/mermaid-to-image.ts";

const outputDir = "public/images";

async function generateImages() {
	// First mermaid diagram - Docker Network Architecture
	const dockerNetworkDiagram = `
graph TD
    A[Host Machine] --> B[Port 80]
    B --> C[Traefik Container]
    C --> D[Traefik Network]
    D --> E[Backend Container]
    D --> F[Frontend Container]
    D --> G[Database Container]

    style D fill:#e1f5fe
    style C fill:#f3e5f5
  `;

	// Second mermaid diagram - Final Architecture
	const finalArchitectureDiagram = `
graph TB
    subgraph "Development Machine"
        A[Traefik Proxy :80]
        B[Feature Env :8080]
        C[Hotfix Env :8081]
        D[Testing Env :8082]
    end

    subgraph "Feature Environment"
        E[Frontend Container]
        F[Backend Container]
        G[Database Container]
        H[Redis Container]
    end

    subgraph "Monorepo Structure"
        I[apps/backend]
        J[apps/frontend]
        K[packages/kyc-core]
        L[packages/shared-utils]
    end

    A --> B
    A --> C
    A --> D
    B --> E
    B --> F
    B --> G
    B --> H

    F --> I
    E --> J
    F --> K
    E --> L

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#f3e5f5
    style D fill:#f3e5f5
  `;

	try {
		// Generate first image
		await convertMermaidToImage(
			dockerNetworkDiagram,
			path.join(outputDir, "2025-11-30-14-docker-network.png"),
		);
		console.log("Generated Docker network diagram");

		// Generate second image
		await convertMermaidToImage(
			finalArchitectureDiagram,
			path.join(outputDir, "2025-11-30-14-final-architecture.png"),
		);
		console.log("Generated final architecture diagram");

		// --- New diagrams for 2026-01-08-16 ---

		// 1. Celery Sequence Diagram
		const celerySequence = `
sequenceDiagram
    participant U as User
    participant A as API Server
    participant W as Celery Worker
    participant R as Redis/DB

    U->>A: Upload Image
    A->>R: Save Image Path & Status
    A->>W: Trigger Check Task
    W->>R: Query: Is Video ready?
    Note over W: No, wait or exit

    U->>A: Upload Video
    A->>R: Save Video Path & Status
    A->>W: Trigger Check Task
    W->>R: Query: Is Image ready?
    Note over W: Yes, Proceed to Similarity Check
`;
		await convertMermaidToImage(
			celerySequence,
			path.join(outputDir, "2026-01-08-16-celery-sequence.png"),
		);
		console.log("Generated 2026-01-08-16-celery-sequence.png");

		// 2. Temporal Workflow Diagram
		const temporalWorkflow = `
graph TD
    Start((Start Workflow)) --> WaitCondition{Wait for Files}
    WaitCondition -- Image/Video missing --> WaitCondition
    WaitCondition -- Both files exist --> Activity[Execute Face Similarity Activity]
    Activity --> Success((Success))

    subgraph "Temporal Worker"
        WaitCondition
    end

    subgraph "GPU Worker"
        Activity
    end
`;
		await convertMermaidToImage(
			temporalWorkflow,
			path.join(outputDir, "2026-01-08-16-temporal-workflow.png"),
		);
		console.log("Generated 2026-01-08-16-temporal-workflow.png");

		// 3. Activity Idempotency Diagram
		const activityIdempotency = `
flowchart LR
    A[Start Activity] --> B{Check DB for<br/>Idempotency Key}
    B -- Exists --> C[Return Existing Result]
    B -- Not Exists --> D[Perform Heavy GPU Task]
    D --> E[Save Result with<br/>Idempotency Key]
    E --> F[Return Success]
`;
		await convertMermaidToImage(
			activityIdempotency,
			path.join(outputDir, "2026-01-08-16-activity-idempotency.png"),
		);
		console.log("Generated 2026-01-08-16-activity-idempotency.png");

		const testingToolbox = `
flowchart TB
    A[AI Agents\nShip More Code] --> B{QA Pressure}
    B -->|More change| C[Higher Regression Risk]
    B -->|More surface area| D[Input/State Explosion]

    C --> E[TDD\nFast Feedback Loop]
    D --> F[EP-BVA\nPartitions + Boundaries]
    D --> G[Pairwise\nCombinatorial Efficiency]
    C --> H[State Transition\nWorkflow Correctness]

    E --> I[Confidence\nWithout Slowing Down]
    F --> I
    G --> I
    H --> I

    style A fill:#e1f5fe,stroke:#0b7285,stroke-width:2px,color:#0b1f2a
    style I fill:#e6fcf5,stroke:#087f5b,stroke-width:2px,color:#0b1f2a
    style B fill:#fff3bf,stroke:#f08c00,stroke-width:2px,color:#0b1f2a
    style E fill:#f3e5f5,stroke:#6f42c1,stroke-width:1.5px,color:#0b1f2a
    style F fill:#f3e5f5,stroke:#6f42c1,stroke-width:1.5px,color:#0b1f2a
    style G fill:#f3e5f5,stroke:#6f42c1,stroke-width:1.5px,color:#0b1f2a
    style H fill:#f3e5f5,stroke:#6f42c1,stroke-width:1.5px,color:#0b1f2a
`;
		await convertMermaidToImage(
			testingToolbox,
			path.join(outputDir, "2026-01-12-17-testing-toolbox.png"),
		);
		console.log("Generated 2026-01-12-17-testing-toolbox.png");

		// --- New diagrams for 2026-02-01-18 ---
		const mutationFlow = `
flowchart LR
    A[Original Code] --> B{Mutator}
    B --> C1[Mutant 1]
    B --> C2[Mutant 2]
    B --> C3[Mutant N]

    C1 --> D1[Run Tests]
    C2 --> D2[Run Tests]
    C3 --> D3[Run Tests]

    D1 --> E1{Test Failed?}
    D2 --> E2{Test Failed?}
    D3 --> E3{Test Failed?}

    E1 -- Yes --> F1[Mutant Killed ✅]
    E1 -- No --> G1[Mutant Survived ❌]

    style F1 fill:#e6fcf5,stroke:#087f5b
    style G1 fill:#fff5f5,stroke:#c92a2a
    style A fill:#e1f5fe,stroke:#0b7285
`;
		await convertMermaidToImage(
			mutationFlow,
			path.join(outputDir, "2026-02-01-18-mutation-flow.png"),
		);
		console.log("Generated 2026-02-01-18-mutation-flow.png");

		console.log("All images generated successfully!");
	} catch (error) {
		console.error("Error generating images:", error);
	}
}

generateImages();
