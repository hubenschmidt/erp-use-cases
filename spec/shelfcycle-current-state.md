Product & Feature Delivery
• Shipped “Opportunities” MVP as the foundation of our order management system (OMS)
• Built PDF check printing (3-up AP vouchers) and dynamic order item barcode label generator (CODE128)
• Developed a tagging system for organizing and filtering products, customers, and other ERP records
• Created “ShelfCycle Intelligence” — semantic document search using OpenAI + pgvector embeddings

Infra, Scale & Cost Optimization
• Cut AWS cloud costs by up to 90% via serverless pipelines, downsizing, nightly shutdowns, and tagging
• Refactored legacy features to support higher load and multi-tenant scale
• Introduced async, serverless queueing for ERP workflows (importing, labeling, AI document processing)

Observability & Monitoring
• Added Datadog tracing across services/endpoints for full-stack visibility
• Built targeted monitors to proactively detect and resolve customer-impacting issues
• Leveraged logs/APM/RUM for real-time debugging and root cause analysis

Data Forensics & Customer Support
• Reconstruct broken or corrupted ledger states for customers through deep data forensics
• Help users recover financial integrity by recreating historical accounting snapshots (GL, AP, AR)

Developer Experience & Process
• Improved onboarding with scripts, quickstart guides, and enforced code standards
• Scoped and managed projects in Linear while acting as PM, engineer, and support
• Built RBAC for both system-wide and per-tenant custom roles
• Rebuilt the import pipeline into a resource-aware serverless flow, reducing onboarding from hours to minutes
