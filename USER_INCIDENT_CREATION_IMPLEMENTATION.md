# User and Incident Creation Implementation

## Overview
This implementation enhances the Hellas Direct chat system to automatically create user records and incident records when a license plate is provided during the chat flow, even if the license plate is not found in the existing database.

## Changes Made

### 1. Enhanced DatabaseService (`lib/supabase.ts`)

#### Added Methods:
- **`createUser(userData)`**: Creates a new user record in the database
- **`updateUser(userId, updates)`**: Updates an existing user record

These methods handle the creation and modification of user records when new license plates are encountered.

### 2. Enhanced Registration Handler (`lib/flow-handlers-simple.ts`)

#### Updated `handleRegistrationNumber()`:
- **Previous behavior**: If license plate not found → return error message
- **New behavior**: If license plate not found → create new user record automatically
- Creates user with registration number and placeholder data
- Sets appropriate session parameters for new users
- Returns success message asking for customer name

#### Updated `handleCustomerName()`:
- **Enhanced logic**: Handles both existing and new users
- **For new users**: Updates the user record with the provided name
- **For all users**: Creates incident record linked to the user
- **Improved messaging**: Different responses for new vs existing users
- **Better error handling**: More resilient to missing data

## Flow Changes

### Original Flow:
1. User provides license plate
2. System looks up license plate in database
3. If not found → Error message, flow stops
4. If found → Ask for customer name
5. Create incident for existing user

### New Flow:
1. User provides license plate
2. System looks up license plate in database
3. If not found → **Create new user record**, ask for customer name
4. If found → Verify policy status, ask for customer name
5. **Create incident for both new and existing users**

## Database Operations

### New User Creation:
```typescript
const newUserData = {
  registration_number: registrationNumber,
  full_name: null, // Updated later with customer name
  afm: null,
  starting_date: new Date().toISOString(),
  ending_at: null,
  phone_number: null,
  email: null,
  address: null
};
```

### Incident Creation:
- Links to user via `user_id` foreign key
- Records registration number for quick lookup
- Includes different descriptions for new vs existing users
- Sets default values for all required fields

## Session Parameters

### New Parameters Added:
- `is_new_user`: Boolean flag indicating if this is a newly created user
- `policy_active`: Set to false for new users (no active policy yet)
- `policy_verified_at`: Timestamp when registration was processed

### Updated Parameters:
- `policy_holder_name`: Null for new users until name is collected
- `user_id`: Always populated with the user database ID

## Benefits

1. **No More Dead Ends**: Users with unregistered license plates can still report incidents
2. **Data Collection**: System captures new customer information automatically
3. **Unified Flow**: Same incident creation process for all users
4. **Better UX**: Seamless experience regardless of existing policy status
5. **Data Integrity**: All incidents properly linked to user records

## Testing

The implementation can be tested by:
1. Starting the chat with a new/unknown license plate
2. Verifying user creation in database
3. Providing customer name
4. Verifying incident creation linked to user
5. Checking that session parameters are properly maintained

## Error Handling

- User creation failures are handled gracefully
- Incident creation has fallback error messages
- Session state is maintained even if some operations fail
- Logging provides detailed information for debugging

## Future Enhancements

- Policy validation for new users
- Email/phone collection for new users
- Integration with external registration databases
- Automatic policy creation workflow
