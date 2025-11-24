# Feature: Demand Forecasting Powered by AI

## Overview
AI-driven demand forecasting that analyzes historical sales data, market trends, and seasonal variations to predict future demand accurately, minimizing overstocking and understocking risks.

## User Story
As an inventory manager, I want to see AI-generated demand forecasts so that I can optimize stock levels and prevent both stockouts and excess inventory.

---

## Problem Analysis

### Current Pain Points
- **Understocking**: Underestimating demand leads to stockouts, lost sales, damaged customer trust
- **Overstocking**: Overestimating demand ties up capital and increases storage costs
- **Manual forecasting**: Time-consuming and error-prone without data-driven insights
- **Expedited costs**: Rush orders to replenish stockouts incur premium shipping

### Root Causes
- Lack of historical sales analysis
- No visibility into seasonal patterns
- Reactive vs proactive inventory management

### Business Impact
- Lost revenue from stockouts (estimated 3-5% of annual sales)
- Carrying costs from excess inventory (20-30% of inventory value annually)
- Customer churn from unreliable availability

---

## Proposed Solution

### Core Capabilities
1. **Demand Prediction**: Forecast demand per product for configurable time horizons (7/30/90 days)
2. **Seasonal Analysis**: Identify and account for seasonal demand patterns
3. **Stockout Risk Alerts**: Flag products likely to stock out before next reorder
4. **Reorder Recommendations**: Suggest optimal reorder quantities and timing

### Technical Approach
- **Data Model**: New `salesHistory` dataset with historical transactions
- **API Changes**: New `/api/forecast` endpoints for predictions and recommendations
- **UI Changes**: Dashboard widgets for forecast visualization (future scope)

---

## Scenarios

### Scenario 1: Basic Demand Forecast
**Given** product "Widget A" has 12 months of sales history
**When** user requests forecast for next 30 days
**Then** system returns predicted demand quantity with confidence level

### Scenario 2: Seasonal Demand Spike
**Given** product "Holiday Gift Set" shows 3x sales in Q4 historically
**When** current date is October
**Then** forecast reflects elevated Q4 demand pattern

### Scenario 3: Stockout Risk Detection
**Given** product has 50 units on hand, forecast shows 80 units demand in 14 days
**When** user requests stockout risk report
**Then** product appears in recommendations with suggested reorder quantity

### Scenario 4: New Product (Insufficient History)
**Given** product was added 2 weeks ago
**When** user requests forecast
**Then** system returns "insufficient data" with minimum history requirement

---

## Verification Checklist

### Functional Requirements
- [ ] Returns 30-day demand forecast for any product with sufficient history
- [ ] Identifies seasonal patterns from historical data
- [ ] Generates list of products at stockout risk
- [ ] Calculates recommended reorder quantities
- [ ] Handles products with insufficient history gracefully

### Non-Functional Requirements
- [ ] Performance: Forecast calculation < 500ms per product
- [ ] Accuracy: Mock data demonstrates reasonable predictions
- [ ] API consistency: Follows existing endpoint patterns

### Edge Cases
- [ ] Product with no sales history returns appropriate message
- [ ] Product with sporadic sales handled correctly
- [ ] Very high/low demand products don't skew recommendations

---

## Implementation Notes

### Estimate of Scope
**M (Medium)** - New vertical slice following existing patterns

### Files to Create
- `modules/agent/src/mocks/data/salesHistory.json` - Historical sales mock data
- `modules/agent/src/mocks/repositories/salesHistoryRepo.ts` - Data access layer
- `modules/agent/src/mocks/services/forecastService.ts` - Forecasting logic
- `modules/agent/src/mocks/controllers/forecastController.ts` - Request handlers
- `modules/agent/src/mocks/routes/forecastRoutes.ts` - API endpoint definitions

### Files to Modify
- `modules/agent/src/mocks/routes/index.ts` - Register forecast routes

### API Endpoints
```
GET /api/forecast/:productId        - Demand forecast for specific product
GET /api/forecast/recommendations   - Products at risk with reorder suggestions
GET /api/forecast/seasonal/:productId - Seasonal pattern analysis
```

### Dependencies
- Existing `products.json` and `inventory.json` for cross-referencing
- `inventoryRepo.ts` for current stock levels

### Out of Scope
- Real ML/AI model training (mock uses simple moving averages)
- UI dashboard components
- External data integrations (weather, economic indicators)
- Multi-location forecasting
