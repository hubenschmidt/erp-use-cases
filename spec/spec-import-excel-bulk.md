# Feature: Excel Bulk Import Pipeline

## Overview
A clean, user-friendly Excel import system that enables bulk data onboarding for products, customers, inventory, and orders. Provides validation, error reporting, and progress tracking to ensure data quality while streamlining the migration from legacy systems.

## User Story
As an implementation specialist, I want to import Excel files containing products, customers, inventory, and orders so that I can quickly onboard new customers and migrate data from legacy systems without manual data entry.

---

## Problem Analysis

### Current Pain Points
- **Manual data entry**: Time-consuming and error-prone process for bulk data migration
- **Multiple Excel files**: Need to import various data types (products, customers, inventory, orders) from separate spreadsheets
- **Format mismatches**: Excel files may have different column names, data types, or structures than expected
- **No validation**: Errors only discovered after import, requiring manual cleanup
- **Slow processing**: Large files cause system slowdowns or timeouts
- **No progress visibility**: Users unsure if import is working or stuck

### Root Causes
- Lack of standardized import process
- No field mapping/transformation layer
- Missing validation before data persistence
- Synchronous processing blocking user interface
- No error reporting or rollback mechanism

### Business Impact
- **Onboarding delays**: New customer implementations take weeks instead of days
- **Data quality issues**: Incorrect data leads to inventory discrepancies, order errors, and customer complaints
- **Customer frustration**: Slow onboarding process damages customer relationships
- **Resource waste**: Staff time spent on manual data entry and error correction
- **Revenue impact**: Delayed go-live dates postpone revenue recognition

---

## Proposed Solution

### Core Capabilities
1. **Multi-format Support**: Accept Excel (.xlsx, .xls) and CSV files for flexible data sources
2. **Field Mapping Configuration**: Allow users to map Excel columns to ERP fields with validation rules
3. **Row-level Validation**: Validate each row against business rules before import (required fields, data types, constraints)
4. **Progress Tracking**: Real-time progress updates with row count and estimated completion time
5. **Error Reporting**: Detailed error report with row numbers, field names, and actionable error messages
6. **Partial Import Support**: Import valid rows while logging failures for review
7. **Resumable Imports**: Ability to retry failed imports or continue from last successful row

### Technical Approach
- **Pipeline Architecture**: Async processing queue to handle large files without blocking the API
- **Streaming Parser**: Memory-efficient streaming parser for Excel files to avoid OOM errors
- **Validation Layer**: Schema validation using Zod or similar, plus business rule validation (duplicate SKUs, valid customer IDs, etc.)
- **Error Handling**: Row-level error collection with rollback strategy for failed batches
- **Resource Management**: Process files in chunks (e.g., 1000 rows at a time) to manage memory and provide progress updates
- **Import Templates**: Provide downloadable Excel templates with correct column headers and example data

---

## Scenarios

### Scenario 1: Successful Bulk Product Import
**Given** a valid Excel file with 10,000 product records (SKU, name, category, unit_price, etc.)
**When** user uploads file and initiates import
**Then** system validates all rows, imports products successfully, and generates summary report showing 10,000 products imported in 3 minutes

### Scenario 2: Partial Failure with Validation Errors
**Given** an Excel file with 5,000 products where 50 rows have missing SKUs and 20 rows have invalid price formats
**When** import processes the file
**Then** 4,930 products import successfully, 70 rows fail with detailed error messages (row numbers, field names, specific validation failures), and user receives downloadable error report

### Scenario 3: Customer Import with Address Validation
**Given** an Excel file with customer data including billing and shipping addresses
**When** user maps Excel columns to customer fields and initiates import
**Then** system validates required fields (name, email), checks for duplicate customer IDs, validates address formats, and imports valid customers while flagging duplicates for review

### Scenario 4: Large Inventory Import with Progress Tracking
**Given** an Excel file with 50,000 inventory records across multiple locations
**When** user uploads file and starts import
**Then** system processes in chunks, provides real-time progress (e.g., "Processing row 25,000 of 50,000 - 50% complete"), and completes import without memory issues

### Scenario 5: Order Import with Cross-Reference Validation
**Given** an Excel file with orders referencing customer IDs and product SKUs
**When** import processes orders
**Then** system validates customer IDs exist, validates product SKUs exist, checks inventory availability, and imports valid orders while logging errors for invalid references

---

## Verification Checklist

### Functional Requirements
- [ ] Support for Excel formats (.xlsx, .xls) and CSV
- [ ] Field mapping configuration UI/API for mapping Excel columns to ERP fields
- [ ] Import templates available for download (products, customers, inventory, orders)
- [ ] Row-level validation with business rules (required fields, data types, constraints)
- [ ] Duplicate detection (SKUs, customer IDs, etc.)
- [ ] Cross-reference validation (customer IDs exist, product SKUs exist, etc.)
- [ ] Partial import support (import valid rows, log failures)
- [ ] Detailed error reporting with row numbers and field-level errors
- [ ] Progress tracking with real-time updates
- [ ] Import history/audit log

### Non-Functional Requirements
- [ ] Performance: Process 10,000 rows in < 5 minutes
- [ ] Memory: Stream large files without OOM errors (handle files up to 100MB)
- [ ] Scalability: Support concurrent imports (queue-based processing)
- [ ] Reliability: Resume failed imports or retry from last successful row
- [ ] User Experience: Clear error messages with actionable guidance

### Edge Cases
- [ ] Empty file handling (no rows)
- [ ] File with only headers (no data rows)
- [ ] Malformed Excel files (corrupted, wrong format)
- [ ] Encoding issues (UTF-8, Latin-1, special characters)
- [ ] Very large files (>100MB, >100k rows)
- [ ] Mixed data types in columns (numbers stored as text, dates in various formats)
- [ ] Missing required columns
- [ ] Extra columns not mapped to ERP fields
- [ ] Import cancellation mid-process

---

## Implementation Notes

### Estimate of Scope
**L (Large)** - New vertical slice with async processing, validation engine, and error handling

### Files to Create
- `modules/agent/src/mocks/services/importService.ts` - Core import orchestration logic
- `modules/agent/src/mocks/services/importValidator.ts` - Validation rules and schema validation
- `modules/agent/src/mocks/services/excelParser.ts` - Excel/CSV parsing with streaming support
- `modules/agent/src/mocks/services/importMapper.ts` - Field mapping and transformation logic
- `modules/agent/src/mocks/controllers/importController.ts` - Request handlers for import endpoints
- `modules/agent/src/mocks/routes/importRoutes.ts` - API endpoint definitions
- `modules/agent/src/mocks/repositories/importRepo.ts` - Import job tracking and history
- `modules/agent/src/mocks/data/importTemplates/` - Excel template files for download

### Files to Modify
- `modules/agent/src/mocks/routes/index.ts` - Register import routes
- `modules/agent/src/mocks/repositories/productRepo.ts` - Add bulk insert methods
- `modules/agent/src/mocks/repositories/customerRepo.ts` - Add bulk insert methods
- `modules/agent/src/mocks/repositories/inventoryRepo.ts` - Add bulk insert methods
- `modules/agent/src/mocks/repositories/orderRepo.ts` - Add bulk insert methods

### API Endpoints
```
POST /api/import/upload              - Upload Excel/CSV file
GET  /api/import/templates/:type    - Download import template (products/customers/inventory/orders)
POST /api/import/map                 - Configure field mapping
POST /api/import/start               - Start import job
GET  /api/import/status/:jobId      - Get import progress and status
GET  /api/import/errors/:jobId      - Download error report
GET  /api/import/history            - List import history
```

### Dependencies
- **Excel Parser**: `xlsx` or `exceljs` library for Node.js Excel parsing
- **CSV Parser**: `csv-parse` for CSV file handling
- **Validation**: `zod` for schema validation (already in use)
- **Queue Service**: In-memory queue or Redis for async job processing (start with in-memory, scale to Redis if needed)
- **File Storage**: Temporary file storage for uploads (local filesystem or S3-compatible storage)

### Integration Points
- **Products Module**: Validate SKU uniqueness, category existence
- **Customers Module**: Validate customer ID format, email uniqueness
- **Inventory Module**: Validate location IDs, SKU references
- **Orders Module**: Validate customer IDs, product SKUs, inventory availability

### Out of Scope
- Real-time UI dashboard (API-only for now)
- Import scheduling/recurring imports
- Data transformation/ETL pipelines beyond field mapping
- Integration with external data sources (APIs, databases)
- Import from other formats (JSON, XML, database dumps)
- Automatic data deduplication/merging strategies
- Import rollback/undo functionality (manual cleanup required)

