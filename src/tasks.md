# Implementation Plan: Drift Master Wallet Subaccount System

## Overview

This implementation plan breaks down the Drift Master Wallet Subaccount System into discrete, testable coding tasks. The system manages a centralized master wallet for fee collection, allocates unique subaccount IDs (0-255) to users, handles collateral deposits with automatic 5% fee deduction, and provides a React context for frontend integration.

The implementation follows a bottom-up approach: database models → service layer → API routes → React context → UI components.

## Tasks

- [ ] 1. Set up database models and schemas
  - [ ] 1.1 Create DriftSubaccount Mongoose model
    - Define schema with userId, subaccountId (0-255), futuresWalletAddress, timestamps
    - Add unique indexes on userId and subaccountId
    - Add index on futuresWalletAddress
    - Export TypeScript interface IDriftSubaccount
    - _Requirements: 13.1, 4.4_
  
  - [ ] 1.2 Create FeeAuditLog Mongoose model
    - Define schema with timestamp, userId, operationType, amounts, signatures
    - Add compound index on (userId, timestamp)
    - Add indexes on timestamp and operationType
    - Export TypeScript interface IFeeAuditLog
    - _Requirements: 18.4, 18.5_
  
  - [ ] 1.3 Enhance DashboardProfile model for futures wallet support
    - Verify wallets.solana structure includes encryptedPrivateKey, iv, authTag
    - Ensure proper TypeScript types for wallet encryption fields
    - _Requirements: 14.4, 3.1_

- [ ] 2. Create TypeScript type definitions
  - [ ] 2.1 Create core types file (src/types/drift-master-wallet.ts)
    - Define SubaccountInfo type
    - Define DepositResult type
    - Define PositionParams type
    - Define UserClientData type
    - Define DriftContextValue type extensions
    - Export all types for reuse
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 3. Create error handling infrastructure
  - [ ] 3.1 Create custom error classes
    - Implement ValidationError class (HTTP 400)
    - Implement NotFoundError class (HTTP 404)
    - Implement ResourceExhaustedError class (HTTP 409)
    - Implement SystemError class (HTTP 500)
    - Implement TransactionError class (HTTP 500)
    - _Requirements: 10.1, 10.2, 10.3, 20.5_
  
  - [ ] 3.2 Create API error handler utility
    - Implement handleApiError function
    - Map error types to HTTP status codes
    - Return consistent JSON error responses
    - Include error details and actionable messages
    - _Requirements: 15.7, 15.8, 20.5_

- [ ] 4. Implement MasterWalletManager service
  - [ ] 4.1 Create MasterWalletManager class structure
    - Define class with private masterKeypair, driftClient, connection properties
    - Implement constructor accepting RPC URL
    - _Requirements: 1.1, 1.4_
  
  - [ ] 4.2 Implement master wallet initialization
    - Load private key from MASTER_KEY environment variable
    - Fallback to secure vault if VAULT_URL configured
    - Throw error if no key found
    - Create Keypair from base58 private key
    - Initialize DriftClient with gRPC subscription
    - Subscribe to Drift Protocol updates
    - Verify minimum balance (0.1 SOL warning threshold)
    - Log initialization success with address
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.3_

  
  - [ ] 4.3 Implement balance verification methods
    - Implement getBalance() returning SOL balance
    - Implement verifyBalance(minAmount) checking threshold
    - Implement getAddress() returning public key string
    - Implement getMasterClient() returning DriftClient
    - Log all balance check operations
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 4.4 Write property test for balance verification
    - **Property 10: Master Wallet Balance Threshold Enforcement**
    - **Validates: Requirements 2.2**
    - Generate random balance amounts and thresholds
    - Verify verifyBalance returns false when balance < threshold
    - Verify verifyBalance returns true when balance >= threshold

- [ ] 5. Implement ClientManager service
  - [ ] 5.1 Create ClientManager class structure
    - Define class with activeClients Map, cleanupInterval, connection properties
    - Implement constructor accepting masterWalletManager, db, rpcUrl
    - Initialize inactivityTimeout from CLIENT_CLEANUP_TIMEOUT_MINUTES env var
    - _Requirements: 5.1, 19.1_
  
  - [ ] 5.2 Implement user client retrieval with caching
    - Implement getUserClient(userId) method
    - Check cache first, update lastAccessed timestamp on hit
    - On cache miss: query drift_subaccounts for subaccount info
    - Throw NotFoundError if no subaccount exists
    - Query dashboard_profiles for encrypted private key
    - Decrypt private key using AES-256-GCM
    - Create Keypair and Wallet from decrypted key
    - Initialize DriftClient with gRPC subscription and subaccountId
    - Subscribe to Drift Protocol updates
    - Cache client with lastAccessed timestamp
    - Return UserClientData
    - _Requirements: 5.2, 5.3, 5.4, 9.1, 9.4, 14.2_
  
  - [ ] 5.3 Implement private key decryption
    - Implement decryptPrivateKey(encryptedKey, iv, authTag) method
    - Use AES-256-GCM algorithm
    - Load encryption key from WALLET_ENCRYPTION_KEY env var
    - Return decrypted base58 private key
    - _Requirements: 14.2, 14.4_
  
  - [ ] 5.4 Implement client cleanup functionality
    - Implement removeClient(userId) method to unsubscribe and remove from cache
    - Implement startCleanup(intervalMs) to start periodic cleanup task
    - Implement stopCleanup() to stop cleanup task
    - Implement runCleanup() to identify and remove inactive clients (30 min threshold)
    - Log all cleanup operations with counts
    - _Requirements: 5.5, 5.6, 9.5, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  
  - [ ] 5.5 Implement utility methods
    - Implement getMasterClient() returning master DriftClient
    - Implement getStats() returning activeClients count and metrics
    - _Requirements: 5.1, 24.5_
  
  - [ ]* 5.6 Write property test for client caching
    - **Property 5: Client Caching Consistency**
    - **Validates: Requirements 5.2**
    - Generate random userId and number of calls (2-10)
    - Call getUserClient multiple times for same user
    - Verify all returned clients are the same instance
  
  - [ ]* 5.7 Write property test for gRPC cleanup
    - **Property 12: gRPC Subscription Cleanup**
    - **Validates: Requirements 9.5**
    - Create client, add to cache, then remove
    - Verify gRPC unsubscribe was called
    - Verify client removed from cache

- [ ] 6. Implement SubaccountManager service
  - [ ] 6.1 Create SubaccountManager class structure
    - Define class with clientManager, masterWalletManager, db, futuresWalletCache properties
    - Implement constructor
    - Initialize futuresWalletCache as Map with 5-minute TTL
    - _Requirements: 3.4, 4.1_
  
  - [ ] 6.2 Implement futures wallet verification
    - Implement getFuturesWallet(userId) private method
    - Check cache first (5 minute TTL)
    - Query dashboard_profiles for wallets.solana.address
    - Return null if not found
    - Cache result with timestamp
    - Log verification attempts
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 6.3 Implement subaccount ID allocation
    - Implement findLowestAvailableId(collection) private method
    - Query all existing subaccountIds from drift_subaccounts
    - Create Set of allocated IDs
    - Find lowest available ID (0-255)
    - Return -1 if all allocated
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 6.4 Implement subaccount initialization
    - Implement initializeSubaccount(userId) method
    - Verify user has futures wallet, throw ValidationError if not
    - Check if subaccount already exists, throw ResourceExhaustedError if yes
    - Verify master wallet balance >= 0.05 SOL, throw SystemError if not
    - Start database transaction with session
    - Lock drift_subaccounts table (FOR UPDATE)
    - Allocate lowest available subaccount ID
    - Throw ResourceExhaustedError if no IDs available
    - Initialize subaccount on-chain using master wallet
    - Insert record into drift_subaccounts with userId, subaccountId, futuresWalletAddress, timestamps
    - Commit transaction
    - Log initialization success
    - Return SubaccountInfo
    - _Requirements: 4.4, 4.5, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_
  
  - [ ] 6.5 Implement subaccount info retrieval
    - Implement getSubaccountInfo(userId) method
    - Query drift_subaccounts by userId
    - Return SubaccountInfo or null
    - _Requirements: 13.4_
  
  - [ ]* 6.6 Write property test for ID allocation uniqueness
    - **Property 1: Subaccount ID Allocation Uniqueness**
    - **Validates: Requirements 4.2**
    - Generate random set of allocated IDs (0-255)
    - Call allocateSubaccountId
    - Verify returned ID is lowest available
    - Verify ID not in allocated set
    - Verify ID in range 0-255
  
  - [ ]* 6.7 Write property test for race condition prevention
    - **Property 9: Subaccount ID Race Condition Prevention**
    - **Validates: Requirements 4.5, 17.2**
    - Simulate concurrent initialization requests
    - Verify no two requests get same subaccount ID
  
  - [ ]* 6.8 Write unit tests for subaccount initialization
    - Test rejection when user already has subaccount
    - Test rejection when user has no futures wallet
    - Test rejection when all 256 IDs allocated
    - Test rejection when master wallet balance insufficient

- [ ] 7. Implement DepositManager service
  - [ ] 7.1 Create DepositManager class structure
    - Define class with clientManager, masterWalletManager, userLocks, feePercentage, db properties
    - Implement constructor
    - Initialize userLocks as Map<string, Mutex>
    - Load feePercentage from FEE_PERCENTAGE env var (default 5)
    - _Requirements: 6.1, 7.4_
  
  - [ ] 7.2 Implement fee calculation
    - Implement calculateFee(amount) method
    - Return amount * (feePercentage / 100)
    - _Requirements: 6.2_
  
  - [ ] 7.3 Implement deposit validation
    - Validate amount > 0, throw ValidationError if not
    - Calculate fee amount
    - Validate fee >= 0.000001 SOL, throw ValidationError if not
    - _Requirements: 21.1, 21.3_
  
  - [ ] 7.4 Implement per-user locking for deposits
    - Get or create Mutex for userId in userLocks Map
    - Acquire lock before processing deposit
    - Release lock after deposit completes or fails
    - _Requirements: 7.3, 7.4, 17.1_
  
  - [ ] 7.5 Implement deposit processing
    - Implement processDeposit(userId, amount, feeAmount) private method
    - Calculate collateralAmount = amount - feeAmount
    - Get user's Drift client from ClientManager
    - Verify user balance >= amount + 0.01 SOL (tx fees), throw ValidationError if not
    - Create and send fee transfer transaction to master wallet
    - Confirm fee transaction
    - Log fee transfer success with signature
    - If fee transfer fails, throw TransactionError and abort
    - Create and send collateral deposit transaction to Drift subaccount
    - Confirm deposit transaction
    - Log collateral deposit success with signature
    - If deposit fails, throw TransactionError (note: fee already deducted)
    - Update drift_subaccounts.updatedAt timestamp
    - Insert audit log entry into fee_audit_log collection
    - Return DepositResult with all details
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 13.2, 18.1, 18.2, 21.2, 21.6, 22.1, 22.2_
  
  - [ ] 7.6 Implement main depositCollateral method
    - Implement depositCollateral(userId, amount) method
    - Validate amount
    - Get or create per-user lock
    - Acquire lock and call processDeposit
    - Release lock in finally block
    - Return DepositResult
    - _Requirements: 6.1, 7.1, 7.2, 7.5_
  
  - [ ]* 7.7 Write property test for fee calculation
    - **Property 2: Fee Calculation Consistency**
    - **Validates: Requirements 6.2**
    - Generate random deposit amounts (0.000001 to 1000 SOL)
    - Calculate fee using calculateFee
    - Verify fee equals exactly 5% of amount (within floating point precision)
  
  - [ ]* 7.8 Write property test for collateral amount
    - **Property 3: Collateral Amount Correctness**
    - **Validates: Requirements 6.4**
    - Generate random deposit amounts
    - Verify collateralAmount = totalAmount - feeAmount (95% of total)
  
  - [ ]* 7.9 Write property test for concurrent deposits
    - **Property 7: Concurrent Deposit Serialization**
    - **Validates: Requirements 7.3, 17.1**
    - Generate random userId and multiple deposit amounts
    - Start all deposits concurrently for same user
    - Verify deposits executed sequentially (no overlaps)
  
  - [ ]* 7.10 Write property test for cross-user concurrency
    - **Property 8: Cross-User Deposit Concurrency**
    - **Validates: Requirements 7.1**
    - Generate two different userIds with deposit amounts
    - Start deposits concurrently for both users
    - Verify both can execute without blocking each other
  
  - [ ]* 7.11 Write unit tests for deposit validation
    - Test rejection when amount <= 0
    - Test rejection when fee < 0.000001 SOL
    - Test rejection when user balance insufficient
    - Test abort when fee transfer fails (no collateral deposit)

- [ ] 8. Implement PositionManager service (placeholders)
  - [ ] 8.1 Create PositionManager class structure
    - Define class with clientManager property
    - Implement constructor
    - _Requirements: 8.1, 8.2_
  
  - [ ] 8.2 Implement placeholder position methods
    - Implement createPosition(userId, params) method
    - Validate user has active Drift client
    - Log operation with userId and params
    - Return placeholder response: { success: false, message: 'not yet implemented' }
    - Implement closePosition(userId, params) method with same pattern
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 9. Create service initialization and singleton management
  - [ ] 9.1 Create service initialization module (src/services/drift/index.ts)
    - Define singleton variables for all managers
    - Implement initializeDriftServices() function
    - Connect to MongoDB
    - Initialize MasterWalletManager and call initialize()
    - Initialize ClientManager and start cleanup
    - Initialize SubaccountManager
    - Initialize DepositManager
    - Initialize PositionManager
    - Log all initialization steps
    - Return all manager instances
    - _Requirements: 1.1, 5.5, 19.2_
  
  - [ ] 9.2 Implement service getter functions
    - Implement getMasterWalletManager() with null check
    - Implement getClientManager() with null check
    - Implement getSubaccountManager() with null check
    - Implement getDepositManager() with null check
    - Implement getPositionManager() with null check
    - Throw error if service not initialized
    - _Requirements: 1.4, 5.1_
  
  - [ ] 9.3 Implement service shutdown function
    - Implement shutdownDriftServices() function
    - Stop ClientManager cleanup task
    - Unsubscribe all active clients
    - Log shutdown completion
    - _Requirements: 19.6_

- [ ] 10. Checkpoint - Ensure all service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement API routes for master wallet
  - [ ] 11.1 Create POST /api/futures/master/initialize route
    - Import ensureDriftServicesInitialized startup hook
    - Call startup hook to ensure services initialized
    - Get MasterWalletManager instance
    - Return success response with address and balance
    - Use handleApiError for error handling
    - _Requirements: 15.1, 15.7, 15.8_
  
  - [ ] 11.2 Create GET /api/futures/master/balance route
    - Ensure services initialized
    - Get MasterWalletManager instance
    - Call getBalance() and getAddress()
    - Return success response with balance and address
    - Use handleApiError for error handling
    - _Requirements: 15.7, 15.8, 22.3_
  
  - [ ] 11.3 Create GET /api/futures/master/fees route
    - Ensure services initialized
    - Query fee_audit_log collection for aggregate stats
    - Calculate totalFees, depositCount, averageFee
    - Return success response with fee summary
    - Use handleApiError for error handling
    - _Requirements: 18.3, 15.7, 15.8_

- [ ] 12. Implement API routes for subaccounts
  - [ ] 12.1 Create POST /api/futures/subaccount/initialize route
    - Authenticate user with getAuthUser()
    - Return 401 if not authenticated
    - Ensure services initialized
    - Get SubaccountManager instance
    - Call initializeSubaccount(userId)
    - Return success response with SubaccountInfo
    - Use handleApiError for error handling
    - _Requirements: 15.2, 15.7, 15.8_
  
  - [ ] 12.2 Create GET /api/futures/subaccount/:userId route
    - Authenticate user
    - Ensure services initialized
    - Get SubaccountManager instance
    - Call getSubaccountInfo(userId)
    - Return success response with SubaccountInfo or null
    - Use handleApiError for error handling
    - _Requirements: 15.6, 15.7, 15.8_

- [ ] 13. Implement API routes for collateral
  - [ ] 13.1 Create POST /api/futures/collateral/deposit route
    - Authenticate user with getAuthUser()
    - Return 401 if not authenticated
    - Parse and validate request body (amount field)
    - Validate amount is a number
    - Ensure services initialized
    - Get DepositManager instance
    - Call depositCollateral(userId, amount)
    - Return success response with DepositResult
    - Use handleApiError for error handling
    - _Requirements: 15.3, 15.7, 15.8_

- [ ] 14. Implement API routes for positions (placeholders)
  - [ ] 14.1 Create POST /api/futures/position/create route
    - Authenticate user
    - Parse and validate request body (PositionParams)
    - Ensure services initialized
    - Get PositionManager instance
    - Call createPosition(userId, params)
    - Return placeholder response
    - Use handleApiError for error handling
    - _Requirements: 15.4, 15.7, 15.8_
  
  - [ ] 14.2 Create POST /api/futures/position/close route
    - Authenticate user
    - Parse and validate request body
    - Ensure services initialized
    - Get PositionManager instance
    - Call closePosition(userId, params)
    - Return placeholder response
    - Use handleApiError for error handling
    - _Requirements: 15.5, 15.7, 15.8_

- [ ] 15. Implement health check API route
  - [ ] 15.1 Create GET /api/futures/health route
    - Ensure services initialized
    - Check master wallet connectivity and balance
    - Check database connectivity with test query
    - Check gRPC connection status
    - Get ClientManager stats (active clients count)
    - Measure response times for each check
    - Return 200 if all checks pass, 503 if any critical check fails
    - Return detailed health status with all check results
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

- [ ] 16. Checkpoint - Ensure all API routes work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Enhance DriftContext with master wallet functionality
  - [ ] 17.1 Add master wallet state to DriftContext
    - Add masterWallet state object with address, balance, isInitialized
    - Initialize state in DriftProvider
    - _Requirements: 11.1, 11.2_
  
  - [ ] 17.2 Implement master wallet operations in DriftContext
    - Implement initializeMasterWallet() function
    - Call POST /api/futures/master/initialize
    - Update masterWallet state on success
    - Set loading and error states appropriately
    - Implement getMasterBalance() function
    - Call GET /api/futures/master/balance
    - Update masterWallet.balance state
    - _Requirements: 11.3, 11.4, 11.5_

- [ ] 18. Enhance DriftContext with subaccount functionality
  - [ ] 18.1 Add subaccount state to DriftContext
    - Add subaccount state object with id, futuresWalletAddress, exists
    - Initialize state in DriftProvider
    - _Requirements: 11.1, 11.2_
  
  - [ ] 18.2 Implement subaccount operations in DriftContext
    - Implement initializeUserSubaccount() function
    - Call POST /api/futures/subaccount/initialize
    - Update subaccount state on success
    - Call checkStatus() to refresh account status
    - Set loading and error states appropriately
    - Implement getSubaccountInfo() function
    - Call GET /api/futures/subaccount/:userId
    - Update subaccount state
    - _Requirements: 11.3, 11.4, 11.5_
  
  - [ ] 18.3 Add useEffect to load subaccount info on mount
    - Call getSubaccountInfo() when user.userId changes
    - _Requirements: 11.2_

- [ ] 19. Enhance DriftContext with collateral functionality
  - [ ] 19.1 Add deposit state to DriftContext
    - Add isDepositing boolean state
    - Add lastDeposit state for DepositResult
    - Initialize states in DriftProvider
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [ ] 19.2 Implement deposit operation in DriftContext
    - Implement depositCollateral(amount) function
    - Validate user is authenticated
    - Set isDepositing to true
    - Call POST /api/futures/collateral/deposit
    - Update lastDeposit state on success
    - Call refreshSummary() to update collateral display
    - Set error state on failure
    - Set isDepositing to false in finally block
    - _Requirements: 11.3, 11.4, 11.5_

- [ ] 20. Enhance DriftContext with position functionality (placeholders)
  - [ ] 20.1 Add position state to DriftContext
    - Add isCreatingPosition boolean state
    - Add isClosingPosition boolean state
    - Initialize states in DriftProvider
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [ ] 20.2 Implement position operations in DriftContext
    - Implement createPosition(params) function
    - Call POST /api/futures/position/create
    - Set isCreatingPosition state appropriately
    - Implement closePosition(params) function
    - Call POST /api/futures/position/close
    - Set isClosingPosition state appropriately
    - _Requirements: 11.3, 11.4, 11.5_

- [ ] 21. Add utility functions to DriftContext
  - [ ] 21.1 Implement clearError function
    - Reset error state to null
    - _Requirements: 11.6_
  
  - [ ] 21.2 Update DriftContextValue interface
    - Add all new state properties
    - Add all new function signatures
    - Ensure TypeScript types are complete
    - _Requirements: 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 16.3_
  
  - [ ] 21.3 Verify backward compatibility
    - Ensure all existing DriftContext functionality preserved
    - Test existing components still work
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 22. Checkpoint - Ensure DriftContext integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Create UI components for subaccount initialization
  - [ ] 23.1 Create SubaccountInitializationButton component
    - Import useDrift hook
    - Get subaccount state and initializeUserSubaccount function
    - Disable button if subaccount already exists or no futures wallet
    - Show loading state during initialization
    - Call initializeUserSubaccount on click
    - Display success message on completion
    - Display error message on failure
    - _Requirements: 23.2, 23.6_

- [ ] 24. Create UI components for collateral deposits
  - [ ] 24.1 Create CollateralDepositModal component
    - Import useDrift hook
    - Get depositCollateral, isDepositing, lastDeposit, error states
    - Create form with amount input field
    - Calculate and display fee amount (5%) and net collateral (95%)
    - Disable form during deposit processing
    - Call depositCollateral on form submit
    - Show loading spinner during deposit
    - Display success message with transaction details on completion
    - Display error message on failure
    - Provide dismiss button for errors
    - _Requirements: 23.1, 23.4, 23.5_

- [ ] 25. Create UI components for master wallet (admin only)
  - [ ] 25.1 Create MasterWalletStatus component
    - Import useDrift hook
    - Get masterWallet state and getMasterBalance function
    - Display master wallet address
    - Display current SOL balance
    - Add refresh button to update balance
    - Show warning if balance below threshold
    - Restrict visibility to admin users only
    - _Requirements: 23.3_

- [ ] 26. Integrate UI components into existing pages
  - [ ] 26.1 Add SubaccountInitializationButton to futures page
    - Import component into src/app/(DashboardLayout)/futures/page.tsx
    - Display button in appropriate location
    - Show only when user lacks subaccount
    - _Requirements: 23.6_
  
  - [ ] 26.2 Add CollateralDepositModal to futures page
    - Import component into futures page
    - Add trigger button to open modal
    - Show only when user has initialized subaccount
    - _Requirements: 23.1, 23.4_
  
  - [ ] 26.3 Add MasterWalletStatus to admin dashboard
    - Import component into admin page (if exists)
    - Display in admin-only section
    - _Requirements: 23.3_

- [ ] 27. Create environment configuration documentation
  - [ ] 27.1 Document all required environment variables
    - Create .env.example file with all variables
    - Document MASTER_KEY, VAULT_URL, FEE_PERCENTAGE, CLIENT_CLEANUP_TIMEOUT_MINUTES
    - Document YELLOWSTONE_GRPC_ENDPOINT, YELLOWSTONE_GRPC_TOKEN
    - Document WALLET_ENCRYPTION_KEY, MONGODB_URI
    - Include descriptions and default values
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

- [ ] 28. Create startup hook for service initialization
  - [ ] 28.1 Create ensureDriftServicesInitialized function
    - Create src/lib/startup.ts file
    - Implement ensureDriftServicesInitialized() function
    - Check if services already initialized (singleton pattern)
    - Call initializeDriftServices() if not initialized
    - Set initialized flag on success
    - Log errors and throw on failure
    - _Requirements: 1.1, 1.3_
  
  - [ ] 28.2 Add startup hook to API middleware or routes
    - Call ensureDriftServicesInitialized in API routes
    - Ensure services initialized before handling requests
    - _Requirements: 1.1_

- [ ] 29. Add comprehensive logging throughout the system
  - [ ] 29.1 Add structured logging to all managers
    - Log all operations with timestamp, log_level, operation_type, user_id
    - Log successful operations with transaction signatures
    - Log errors with error messages and stack traces
    - Log balance checks with current balance and thresholds
    - Log client creation, retrieval, and cleanup
    - Log database operations with query type and execution time
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ] 29.2 Add security event logging
    - Log failed authentication attempts
    - Log suspicious activity
    - Log unauthorized access attempts
    - _Requirements: 14.7, 26.1_

- [ ] 30. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All code uses TypeScript for type safety
- The implementation follows a bottom-up approach: models → services → API → context → UI
- Master wallet initialization should be done by admin before user operations
- All private keys are encrypted at rest and never exposed to frontend
- gRPC subscriptions are used for all Drift Protocol data (no WebSockets or polling)
- Per-user locks prevent race conditions in concurrent deposits
- Database transactions with row-level locking prevent subaccount ID conflicts
- Fee audit logs are immutable for compliance and revenue tracking
