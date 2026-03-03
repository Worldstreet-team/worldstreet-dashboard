# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive Drift Protocol integration system that manages a master wallet for fee collection, user subaccounts for futures trading, collateral deposits with automatic fee deduction, and position management. The system provides a TypeScript React context for frontend integration while maintaining secure server-side key management and database persistence.

## Glossary

- **Master_Wallet**: The primary Solana wallet controlled by the platform that collects fees and manages subaccount initialization costs
- **User_Futures_Wallet**: A Solana wallet owned by a user, used exclusively for futures trading operations
- **Drift_Subaccount**: A numbered account (0-255) within the Drift Protocol associated with a user's futures wallet
- **Subaccount_ID**: An integer identifier (0-255) uniquely assigned to each user's Drift subaccount
- **Drift_Client**: An active connection to the Drift Protocol for a specific subaccount, used for trading operations
- **Collateral_Deposit**: Transfer of funds from a user's futures wallet to their Drift subaccount for trading margin
- **Fee_Percentage**: The 5% platform fee deducted from all user deposits before collateral is deposited
- **gRPC_Subscription**: A Yellowstone gRPC connection used for real-time Drift Protocol data streaming
- **DriftContext**: A React context provider that exposes Drift Protocol operations to frontend components
- **user_futures_wallets_table**: Database table storing user futures wallet addresses and encrypted private keys
- **drift_subaccounts_table**: Database table storing subaccount assignments (user_id, subaccount_id, futures_wallet_address, timestamps)


## Requirements

### Requirement 1: Master Wallet Initialization

**User Story:** As a platform administrator, I want to initialize a master wallet from secure storage, so that the platform can manage fees and subaccount initialization costs.

#### Acceptance Criteria

1. WHEN the system starts, THE Master_Wallet_Manager SHALL load the master private key from the MASTER_KEY environment variable
2. IF the MASTER_KEY environment variable is not set, THEN THE Master_Wallet_Manager SHALL attempt to load the key from a secure vault
3. IF neither source provides a valid key, THEN THE Master_Wallet_Manager SHALL log an error and prevent system initialization
4. THE Master_Wallet_Manager SHALL expose a getMasterClient() method that returns a configured Drift_Client for the Master_Wallet
5. THE Master_Wallet_Manager SHALL verify the Master_Wallet has at least 0.1 SOL before allowing subaccount initialization operations

### Requirement 2: Master Wallet Balance Verification

**User Story:** As a platform administrator, I want to ensure the master wallet has sufficient SOL, so that subaccount initialization operations do not fail due to insufficient funds.

#### Acceptance Criteria

1. WHEN a subaccount initialization is requested, THE Master_Wallet_Manager SHALL check the Master_Wallet SOL balance
2. IF the Master_Wallet balance is below 0.05 SOL, THEN THE Master_Wallet_Manager SHALL reject the initialization request with an insufficient funds error
3. THE Master_Wallet_Manager SHALL log all balance check operations with the current balance and threshold values
4. THE Master_Wallet_Manager SHALL provide a getBalance() method that returns the current SOL balance of the Master_Wallet


### Requirement 3: User Futures Wallet Verification

**User Story:** As a system, I want to verify that a user has a futures wallet before initializing their subaccount, so that subaccount operations are only performed for valid users.

#### Acceptance Criteria

1. WHEN a subaccount initialization is requested for a user, THE Subaccount_Manager SHALL query the user_futures_wallets_table for the user's futures wallet address
2. IF no futures wallet exists for the user, THEN THE Subaccount_Manager SHALL reject the request with a "futures wallet not found" error
3. THE Subaccount_Manager SHALL log all futures wallet verification attempts with the user_id and verification result
4. THE Subaccount_Manager SHALL cache futures wallet addresses in memory for 5 minutes to reduce database queries

### Requirement 4: Subaccount ID Allocation

**User Story:** As a user, I want to be assigned a unique subaccount ID, so that I can trade on the Drift Protocol without conflicts with other users.

#### Acceptance Criteria

1. WHEN a new subaccount is initialized, THE Subaccount_Manager SHALL query the drift_subaccounts_table for all existing Subaccount_IDs
2. THE Subaccount_Manager SHALL allocate the lowest available Subaccount_ID between 0 and 255
3. IF all 256 subaccount IDs are allocated, THEN THE Subaccount_Manager SHALL reject the request with a "no available subaccount IDs" error
4. THE Subaccount_Manager SHALL insert a new record into the drift_subaccounts_table with (user_id, subaccount_id, futures_wallet_address, created_at, updated_at)
5. THE Subaccount_Manager SHALL prevent race conditions by using database transactions with row-level locking during ID allocation


### Requirement 5: Drift Client Management

**User Story:** As a system, I want to maintain active Drift clients in memory, so that trading operations are fast and do not require repeated initialization.

#### Acceptance Criteria

1. THE Client_Manager SHALL maintain an in-memory map of active Drift_Clients keyed by user_id
2. WHEN getUserClient(userId) is called, THE Client_Manager SHALL return the cached Drift_Client if it exists
3. IF no cached client exists, THEN THE Client_Manager SHALL create a new Drift_Client with the user's futures wallet and Subaccount_ID
4. THE Client_Manager SHALL subscribe each Drift_Client to Yellowstone gRPC for real-time data updates
5. THE Client_Manager SHALL provide a cleanup method that unsubscribes and removes inactive Drift_Clients after 30 minutes of inactivity
6. THE Client_Manager SHALL log all client creation, retrieval, and cleanup operations with user_id and timestamp

### Requirement 6: Collateral Deposit with Fee Deduction

**User Story:** As a user, I want to deposit collateral to my Drift subaccount, so that I can open leveraged trading positions.

#### Acceptance Criteria

1. WHEN depositCollateral(userId, amount) is called, THE Deposit_Manager SHALL verify the user has a futures wallet and Drift_Subaccount
2. THE Deposit_Manager SHALL calculate the Fee_Percentage (5%) of the deposit amount
3. THE Deposit_Manager SHALL transfer the fee amount from the user's User_Futures_Wallet to the Master_Wallet
4. THE Deposit_Manager SHALL deposit the remaining 95% of the amount to the user's Drift_Subaccount as collateral
5. IF the fee transfer fails, THEN THE Deposit_Manager SHALL abort the operation and return an error without depositing collateral
6. THE Deposit_Manager SHALL log all deposit operations with user_id, total_amount, fee_amount, collateral_amount, and transaction signatures
7. THE Deposit_Manager SHALL return a DepositResult object containing success status, transaction signatures, and amounts


### Requirement 7: Concurrent Deposit Handling

**User Story:** As a platform, I want to handle concurrent deposits from multiple users, so that the system scales to support many simultaneous trading operations.

#### Acceptance Criteria

1. THE Deposit_Manager SHALL process deposit requests from different users concurrently without blocking
2. THE Deposit_Manager SHALL use atomic database operations to prevent race conditions when updating user balances
3. WHEN multiple deposits are requested for the same user simultaneously, THE Deposit_Manager SHALL serialize those requests to prevent double-spending
4. THE Deposit_Manager SHALL implement a per-user mutex or queue to ensure sequential processing of deposits for each user
5. THE Deposit_Manager SHALL complete each deposit operation within 10 seconds under normal network conditions

### Requirement 8: Position Management Placeholders

**User Story:** As a developer, I want placeholder functions for position management, so that the system architecture supports future trading functionality.

#### Acceptance Criteria

1. THE Position_Manager SHALL provide a createPosition(userId, params) function that accepts user_id and position parameters
2. THE Position_Manager SHALL provide a closePosition(userId, params) function that accepts user_id and position parameters
3. THE createPosition function SHALL validate that the user has an active Drift_Client before proceeding
4. THE closePosition function SHALL validate that the user has an active Drift_Client before proceeding
5. THE Position_Manager SHALL log all position operation attempts with user_id, operation type, and parameters
6. THE Position_Manager SHALL return a placeholder response indicating the operation is not yet implemented


### Requirement 9: gRPC Integration for Subscriptions

**User Story:** As a system, I want to use Yellowstone gRPC for all Drift Protocol subscriptions, so that I receive real-time data updates efficiently without polling.

#### Acceptance Criteria

1. THE Client_Manager SHALL use Yellowstone gRPC for all Drift_Client subscriptions
2. THE Client_Manager SHALL NOT use WebSocket connections for Drift Protocol data
3. THE Client_Manager SHALL NOT use polling RPC calls for Drift Protocol data
4. WHEN a Drift_Client is created, THE Client_Manager SHALL establish a gRPC_Subscription for that client's subaccount
5. WHEN a Drift_Client is removed, THE Client_Manager SHALL properly close the gRPC_Subscription to prevent resource leaks
6. THE Client_Manager SHALL reconnect gRPC_Subscriptions automatically if the connection is lost

### Requirement 10: Error Handling and Logging

**User Story:** As a platform administrator, I want comprehensive error logging, so that I can diagnose issues and maintain system reliability.

#### Acceptance Criteria

1. WHEN a user lacks a futures wallet, THE system SHALL log an error with the user_id and operation attempted
2. WHEN a user lacks a Drift_Subaccount, THE system SHALL log an error with the user_id and operation attempted
3. WHEN the Master_Wallet has insufficient funds, THE system SHALL log an error with the current balance and required amount
4. THE system SHALL log all successful operations including: subaccount initialization, collateral deposits, client creation, and fee transfers
5. THE system SHALL use structured logging with fields: timestamp, log_level, operation_type, user_id, subaccount_id, amounts, transaction_signatures, and error_messages
6. THE system SHALL log all database operations with query type, affected tables, and execution time
7. THE system SHALL provide log aggregation tags for filtering by operation type (initialization, deposit, position, error)


### Requirement 11: React Context Provider

**User Story:** As a frontend developer, I want a React context for Drift operations, so that I can integrate trading functionality into UI components.

#### Acceptance Criteria

1. THE DriftContext SHALL provide a React context provider component that wraps the application
2. THE DriftContext SHALL expose a useDrift() hook that returns all available Drift operations
3. THE useDrift() hook SHALL return the following functions: initializeMasterWallet(), initializeUserSubaccount(), depositCollateral(), createPosition(), closePosition(), getUserClient(), getMasterClient()
4. THE DriftContext SHALL maintain loading states for async operations (isInitializing, isDepositing, isCreatingPosition, isClosingPosition)
5. THE DriftContext SHALL maintain error states for failed operations with descriptive error messages
6. THE DriftContext SHALL provide a clearError() function to reset error states
7. THE DriftContext SHALL call backend API routes for all operations and never expose private keys to the frontend

### Requirement 12: TypeScript Type Definitions

**User Story:** As a developer, I want comprehensive TypeScript types, so that I have type safety and autocomplete for all Drift operations.

#### Acceptance Criteria

1. THE system SHALL define a UserClient type representing a user's Drift client connection
2. THE system SHALL define a MasterClient type representing the master wallet's Drift client connection
3. THE system SHALL define a DepositResult type with fields: success (boolean), feeAmount (number), collateralAmount (number), feeSignature (string), depositSignature (string)
4. THE system SHALL define a PositionParams type with fields: marketIndex (number), direction (string), baseAssetAmount (number), leverage (number)
5. THE system SHALL define a SubaccountInfo type with fields: userId (string), subaccountId (number), futuresWalletAddress (string), createdAt (Date), updatedAt (Date)
6. THE system SHALL export all types from a central types file for reuse across the application


### Requirement 13: Database Integration

**User Story:** As a system, I want to persist subaccount data in the database, so that user subaccount assignments survive server restarts.

#### Acceptance Criteria

1. WHEN a subaccount is initialized, THE Subaccount_Manager SHALL insert a record into the drift_subaccounts_table
2. WHEN a deposit is completed, THE Deposit_Manager SHALL update the updated_at timestamp in the drift_subaccounts_table
3. THE system SHALL query the user_futures_wallets_table before any subaccount operation to verify the user has a futures wallet
4. THE system SHALL query the drift_subaccounts_table to retrieve existing Subaccount_IDs before allocating a new ID
5. THE system SHALL use database transactions to ensure atomicity of multi-step operations (fee transfer + collateral deposit)
6. THE system SHALL handle database connection failures gracefully and return appropriate error messages to the caller

### Requirement 14: Security and Key Management

**User Story:** As a security-conscious platform, I want to protect user private keys, so that funds are secure and keys are never exposed to the frontend.

#### Acceptance Criteria

1. THE system SHALL never transmit private keys to the frontend or include them in API responses
2. THE system SHALL decrypt user futures wallet private keys only on the server side when needed for transactions
3. THE system SHALL store the master wallet private key in environment variables or a secure vault, never in the database
4. THE system SHALL use encrypted storage for all user private keys in the user_futures_wallets_table
5. THE system SHALL validate all user inputs to prevent injection attacks in database queries
6. THE system SHALL implement rate limiting on deposit and position operations to prevent abuse
7. THE system SHALL log all security-relevant events including failed authentication attempts and suspicious activity


### Requirement 15: API Route Structure

**User Story:** As a frontend developer, I want well-organized API routes, so that I can easily integrate Drift functionality into the application.

#### Acceptance Criteria

1. THE system SHALL provide a POST /api/futures/master/initialize route for master wallet initialization
2. THE system SHALL provide a POST /api/futures/subaccount/initialize route for user subaccount initialization
3. THE system SHALL provide a POST /api/futures/collateral/deposit route for collateral deposits with fee deduction
4. THE system SHALL provide a POST /api/futures/position/create route for creating positions (placeholder)
5. THE system SHALL provide a POST /api/futures/position/close route for closing positions (placeholder)
6. THE system SHALL provide a GET /api/futures/subaccount/:userId route for retrieving user subaccount information
7. THE system SHALL return consistent JSON responses with fields: success (boolean), data (object), error (string)
8. THE system SHALL return appropriate HTTP status codes: 200 for success, 400 for validation errors, 500 for server errors

### Requirement 16: Existing Context Enhancement

**User Story:** As a developer, I want to enhance the existing DriftContext, so that new functionality integrates seamlessly with existing code.

#### Acceptance Criteria

1. THE system SHALL preserve all existing DriftContext functionality including account status and initialization
2. THE system SHALL add master wallet management functions to the existing context without breaking existing components
3. THE system SHALL add fee collection functionality to the existing context without breaking existing components
4. THE system SHALL add multi-user subaccount support to the existing context without breaking existing components
5. THE system SHALL maintain backward compatibility with existing components that use the DriftContext
6. THE system SHALL update the context's TypeScript types to include new functions and state properties


### Requirement 17: Race Condition Prevention

**User Story:** As a platform, I want to prevent race conditions in concurrent operations, so that user funds are protected and data integrity is maintained.

#### Acceptance Criteria

1. WHEN multiple deposit requests arrive for the same user, THE Deposit_Manager SHALL process them sequentially using a per-user lock
2. WHEN multiple subaccount initialization requests arrive simultaneously, THE Subaccount_Manager SHALL use database row-level locking to prevent duplicate ID allocation
3. THE system SHALL use optimistic locking with version numbers for updating critical records in the drift_subaccounts_table
4. THE system SHALL implement idempotency keys for deposit operations to prevent duplicate processing of the same request
5. THE system SHALL detect and reject concurrent operations that would violate business rules (e.g., double-spending)
6. THE system SHALL log all detected race conditions and lock contentions for monitoring and optimization

### Requirement 18: Fee Collection Audit Trail

**User Story:** As a platform administrator, I want an audit trail of all fee collections, so that I can verify fee calculations and track platform revenue.

#### Acceptance Criteria

1. WHEN a fee is collected, THE Deposit_Manager SHALL log the user_id, deposit_amount, fee_amount, fee_percentage, and transaction_signature
2. THE system SHALL maintain a running total of collected fees in memory for real-time monitoring
3. THE system SHALL provide a GET /api/futures/fees/summary route that returns total fees collected, number of deposits, and average fee amount
4. THE system SHALL store fee collection events in a dedicated audit log table with fields: timestamp, user_id, operation_type, fee_amount, transaction_signature
5. THE system SHALL ensure fee audit logs are immutable and cannot be modified after creation
6. THE system SHALL provide filtering and pagination for fee audit logs by date range and user_id


### Requirement 19: Client Cleanup and Resource Management

**User Story:** As a system administrator, I want automatic cleanup of inactive clients, so that the system does not leak memory or maintain unnecessary connections.

#### Acceptance Criteria

1. THE Client_Manager SHALL track the last access time for each cached Drift_Client
2. THE Client_Manager SHALL run a cleanup task every 10 minutes to identify inactive clients
3. WHEN a Drift_Client has not been accessed for 30 minutes, THE Client_Manager SHALL unsubscribe the client's gRPC_Subscription
4. WHEN a Drift_Client has not been accessed for 30 minutes, THE Client_Manager SHALL remove the client from the in-memory cache
5. THE Client_Manager SHALL log all cleanup operations with the number of clients removed and memory freed
6. THE Client_Manager SHALL provide a manual cleanup method for administrative use

### Requirement 20: Subaccount Initialization Validation

**User Story:** As a user, I want clear error messages when subaccount initialization fails, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. IF a user already has a Drift_Subaccount, THEN THE Subaccount_Manager SHALL reject initialization with "subaccount already exists" error
2. IF a user does not have a User_Futures_Wallet, THEN THE Subaccount_Manager SHALL reject initialization with "futures wallet required" error
3. IF the Master_Wallet has insufficient SOL, THEN THE Subaccount_Manager SHALL reject initialization with "insufficient platform funds" error
4. IF all 256 subaccount IDs are allocated, THEN THE Subaccount_Manager SHALL reject initialization with "no available subaccount slots" error
5. THE Subaccount_Manager SHALL return error responses with HTTP 400 status for validation errors and HTTP 500 for system errors
6. THE Subaccount_Manager SHALL include actionable guidance in error messages (e.g., "Please create a futures wallet first")


### Requirement 21: Deposit Amount Validation

**User Story:** As a user, I want deposit validation, so that I don't accidentally deposit invalid amounts or amounts I cannot afford.

#### Acceptance Criteria

1. WHEN depositCollateral is called, THE Deposit_Manager SHALL validate that the amount is greater than zero
2. THE Deposit_Manager SHALL validate that the amount is less than or equal to the user's User_Futures_Wallet balance
3. THE Deposit_Manager SHALL validate that the fee amount (5% of deposit) is at least 0.000001 SOL to ensure it's economically viable
4. IF the deposit amount is invalid, THEN THE Deposit_Manager SHALL reject the request with a descriptive validation error
5. THE Deposit_Manager SHALL return the calculated fee amount and collateral amount in the validation error for user transparency
6. THE Deposit_Manager SHALL check that the user's wallet has sufficient SOL for both the deposit and transaction fees

### Requirement 22: Master Wallet Fee Accumulation

**User Story:** As a platform administrator, I want fees to accumulate in the master wallet, so that platform revenue is centralized and easy to manage.

#### Acceptance Criteria

1. WHEN a deposit fee is collected, THE Deposit_Manager SHALL transfer the fee amount to the Master_Wallet address
2. THE Master_Wallet SHALL accumulate all fees from all users in a single wallet
3. THE system SHALL provide a GET /api/futures/master/balance route that returns the current Master_Wallet SOL balance
4. THE system SHALL provide a GET /api/futures/master/fees route that returns the total fees collected since system initialization
5. THE system SHALL log all fee transfers with source user_id, amount, and transaction_signature for reconciliation
6. THE system SHALL ensure fee transfers are atomic and cannot be partially completed


### Requirement 23: UI Component Integration

**User Story:** As a frontend developer, I want UI components for Drift operations, so that users can interact with the system through an intuitive interface.

#### Acceptance Criteria

1. THE system SHALL provide a CollateralDepositModal component in src/components/futures/ for deposit operations
2. THE system SHALL provide a SubaccountInitializationButton component in src/components/futures/ for subaccount setup
3. THE system SHALL provide a MasterWalletStatus component in src/components/futures/ for displaying master wallet balance (admin only)
4. THE CollateralDepositModal SHALL display the deposit amount, calculated fee (5%), and net collateral amount before confirmation
5. THE CollateralDepositModal SHALL show loading states during deposit processing and success/error messages after completion
6. THE SubaccountInitializationButton SHALL be disabled if the user already has a subaccount or lacks a futures wallet

### Requirement 24: Monitoring and Health Checks

**User Story:** As a platform administrator, I want health check endpoints, so that I can monitor system status and detect issues proactively.

#### Acceptance Criteria

1. THE system SHALL provide a GET /api/futures/health route that returns system health status
2. THE health check SHALL verify Master_Wallet connectivity and balance is above minimum threshold
3. THE health check SHALL verify database connectivity and query response time
4. THE health check SHALL verify gRPC connection status to Yellowstone
5. THE health check SHALL return the number of active Drift_Clients and cached connections
6. THE health check SHALL return HTTP 200 if all checks pass, HTTP 503 if any critical check fails
7. THE health check SHALL include response times for each component (database, gRPC, wallet) in the response


### Requirement 25: Configuration Management

**User Story:** As a developer, I want configurable system parameters, so that I can adjust behavior without code changes.

#### Acceptance Criteria

1. THE system SHALL read the Fee_Percentage from an environment variable FEE_PERCENTAGE with a default of 5
2. THE system SHALL read the minimum Master_Wallet balance threshold from MASTER_WALLET_MIN_BALANCE with a default of 0.05 SOL
3. THE system SHALL read the client cleanup timeout from CLIENT_CLEANUP_TIMEOUT_MINUTES with a default of 30 minutes
4. THE system SHALL read the Yellowstone gRPC endpoint from YELLOWSTONE_GRPC_ENDPOINT environment variable
5. THE system SHALL validate all configuration values at startup and log warnings for invalid or missing values
6. THE system SHALL provide default values for all optional configuration parameters
7. THE system SHALL reload configuration values without requiring a server restart when possible

---

## Summary

This requirements document defines a comprehensive Drift Protocol integration system with 25 requirements covering master wallet management, user subaccount allocation, fee collection, collateral deposits, position management placeholders, gRPC integration, security, database persistence, React context integration, and monitoring. The system ensures secure key management, prevents race conditions, provides comprehensive logging, and offers a developer-friendly API for frontend integration.
