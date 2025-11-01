#!/usr/bin/env node

/**
 * Test Script for Lifted Suspension Acknowledgment Feature
 * 
 * Usage:
 * node test-acknowledgment.js [command] [options]
 * 
 * Commands:
 * - suspend <user_id>     : Create a test suspension
 * - lift <user_id>        : Lift the most recent active suspension
 * - check <user_id>       : Check unacknowledged lifts
 * - acknowledge <user_id> <suspension_id> : Mark lift as acknowledged
 * - status <user_id>      : Show user's suspension history
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  const fetch = (await import('node-fetch')).default;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`\n📡 ${method} ${endpoint}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Command: Create test suspension
async function createSuspension(userId) {
  console.log(`\n🔨 Creating test suspension for user: ${userId}`);
  
  const suspensionData = {
    violation_type: 'forum_post',
    content_id: `test-content-${Date.now()}`,
    content_text: 'Test content for acknowledgment feature testing',
    admin_reason: 'Testing acknowledgment feature - automated test',
    action: 'suspend_7days'
  };
  
  const result = await apiCall('POST', `/admin/moderation/apply-action/${userId}`, suspensionData);
  
  if (result.success) {
    console.log('✅ Suspension created successfully');
    console.log(`   Action: ${result.data.data?.action_taken}`);
    console.log(`   Strike Count: ${result.data.data?.strike_count}`);
    console.log(`   Account Status: ${result.data.data?.account_status}`);
  } else {
    console.log('❌ Failed to create suspension');
  }
  
  return result;
}

// Command: Lift suspension
async function liftSuspension(userId) {
  console.log(`\n🔓 Lifting suspension for user: ${userId}`);
  
  const liftData = {
    reason: 'Testing acknowledgment workflow - automated test lift'
  };
  
  const result = await apiCall('POST', `/admin/moderation/lift-suspension/${userId}`, liftData);
  
  if (result.success) {
    console.log('✅ Suspension lifted successfully');
    console.log('   lifted_acknowledged should be set to false');
  } else {
    console.log('❌ Failed to lift suspension');
  }
  
  return result;
}

// Command: Check unacknowledged lifts
async function checkUnacknowledged(userId) {
  console.log(`\n🔍 Checking unacknowledged lifts for user: ${userId}`);
  
  const result = await apiCall('GET', `/admin/moderation/unacknowledged-lifts/${userId}`);
  
  if (result.success) {
    const lifts = result.data.data || [];
    console.log(`✅ Found ${lifts.length} unacknowledged lift(s)`);
    
    lifts.forEach((lift, index) => {
      console.log(`\n   Lift ${index + 1}:`);
      console.log(`   - ID: ${lift.id}`);
      console.log(`   - Type: ${lift.suspension_type}`);
      console.log(`   - Lifted At: ${lift.lifted_at}`);
      console.log(`   - Lifted Reason: ${lift.lifted_reason}`);
      console.log(`   - Acknowledged: ${lift.lifted_acknowledged}`);
    });
    
    return lifts;
  } else {
    console.log('❌ Failed to check unacknowledged lifts');
    return [];
  }
}

// Command: Acknowledge lift
async function acknowledgeLift(userId, suspensionId) {
  console.log(`\n✅ Acknowledging lift for user: ${userId}, suspension: ${suspensionId}`);
  
  const result = await apiCall('POST', `/admin/moderation/acknowledge-lift/${userId}/${suspensionId}`);
  
  if (result.success) {
    console.log('✅ Lift acknowledged successfully');
  } else {
    console.log('❌ Failed to acknowledge lift');
  }
  
  return result;
}

// Command: Get user suspension status
async function getUserStatus(userId) {
  console.log(`\n📊 Getting suspension history for user: ${userId}`);
  
  const result = await apiCall('GET', `/admin/moderation/suspensions/${userId}`);
  
  if (result.success) {
    const suspensions = result.data.data || [];
    console.log(`✅ Found ${suspensions.length} suspension(s)`);
    
    suspensions.forEach((suspension, index) => {
      console.log(`\n   Suspension ${index + 1}:`);
      console.log(`   - ID: ${suspension.id}`);
      console.log(`   - Type: ${suspension.suspension_type} #${suspension.suspension_number}`);
      console.log(`   - Status: ${suspension.status}`);
      console.log(`   - Started: ${suspension.started_at}`);
      console.log(`   - Ends: ${suspension.ends_at || 'N/A'}`);
      
      if (suspension.status === 'lifted') {
        console.log(`   - Lifted At: ${suspension.lifted_at}`);
        console.log(`   - Lifted Reason: ${suspension.lifted_reason}`);
        console.log(`   - Acknowledged: ${suspension.lifted_acknowledged}`);
      }
    });
    
    return suspensions;
  } else {
    console.log('❌ Failed to get user status');
    return [];
  }
}

// Full workflow test
async function runFullTest(userId) {
  console.log(`\n🧪 Running full acknowledgment test workflow for user: ${userId}`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create suspension
    console.log('\n📋 Step 1: Creating test suspension...');
    await createSuspension(userId);
    
    // Step 2: Lift suspension
    console.log('\n📋 Step 2: Lifting suspension...');
    await liftSuspension(userId);
    
    // Step 3: Check unacknowledged
    console.log('\n📋 Step 3: Checking unacknowledged lifts...');
    const lifts = await checkUnacknowledged(userId);
    
    if (lifts.length > 0) {
      // Step 4: Acknowledge first lift
      console.log('\n📋 Step 4: Acknowledging first lift...');
      await acknowledgeLift(userId, lifts[0].id);
      
      // Step 5: Verify acknowledgment
      console.log('\n📋 Step 5: Verifying acknowledgment...');
      await checkUnacknowledged(userId);
      
      // Step 6: Show final status
      console.log('\n📋 Step 6: Final suspension history...');
      await getUserStatus(userId);
    }
    
    console.log('\n🎉 Full test workflow completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check admin panel User Sanctions page');
    console.log('   2. View user details to see acknowledgment status');
    console.log('   3. Look for 🟢 ✓ in the Ack column');
    
  } catch (error) {
    console.error('\n❌ Test workflow failed:', error.message);
  }
}

// Main CLI handler
async function main() {
  const [,, command, ...args] = process.argv;
  
  if (!ADMIN_TOKEN || ADMIN_TOKEN === 'your-admin-token-here') {
    console.log('❌ Please set ADMIN_TOKEN environment variable');
    console.log('   export ADMIN_TOKEN="your-actual-admin-token"');
    process.exit(1);
  }
  
  console.log('🔧 Acknowledgment Feature Test Script');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Admin Token: ${ADMIN_TOKEN.substring(0, 10)}...`);
  
  switch (command) {
    case 'suspend':
      if (!args[0]) {
        console.log('❌ Usage: node test-acknowledgment.js suspend <user_id>');
        process.exit(1);
      }
      await createSuspension(args[0]);
      break;
      
    case 'lift':
      if (!args[0]) {
        console.log('❌ Usage: node test-acknowledgment.js lift <user_id>');
        process.exit(1);
      }
      await liftSuspension(args[0]);
      break;
      
    case 'check':
      if (!args[0]) {
        console.log('❌ Usage: node test-acknowledgment.js check <user_id>');
        process.exit(1);
      }
      await checkUnacknowledged(args[0]);
      break;
      
    case 'acknowledge':
      if (!args[0] || !args[1]) {
        console.log('❌ Usage: node test-acknowledgment.js acknowledge <user_id> <suspension_id>');
        process.exit(1);
      }
      await acknowledgeLift(args[0], args[1]);
      break;
      
    case 'status':
      if (!args[0]) {
        console.log('❌ Usage: node test-acknowledgment.js status <user_id>');
        process.exit(1);
      }
      await getUserStatus(args[0]);
      break;
      
    case 'test':
      if (!args[0]) {
        console.log('❌ Usage: node test-acknowledgment.js test <user_id>');
        process.exit(1);
      }
      await runFullTest(args[0]);
      break;
      
    default:
      console.log('\n📖 Available commands:');
      console.log('   suspend <user_id>                    - Create test suspension');
      console.log('   lift <user_id>                       - Lift active suspension');
      console.log('   check <user_id>                      - Check unacknowledged lifts');
      console.log('   acknowledge <user_id> <suspension_id> - Mark lift as acknowledged');
      console.log('   status <user_id>                     - Show suspension history');
      console.log('   test <user_id>                       - Run full test workflow');
      console.log('\n📝 Examples:');
      console.log('   export ADMIN_TOKEN="your-admin-token"');
      console.log('   node test-acknowledgment.js test user-uuid-here');
      console.log('   node test-acknowledgment.js check user-uuid-here');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createSuspension,
  liftSuspension,
  checkUnacknowledged,
  acknowledgeLift,
  getUserStatus,
  runFullTest
};
