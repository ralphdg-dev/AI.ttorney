const { supabaseAdmin } = require('../config/supabase');
require('dotenv').config();

/**
 * Script to create admin users
 * Usage: node scripts/create-admin.js <email> <password> <full_name> <role>
 * Example: node scripts/create-admin.js admin@example.com password123 "Admin User" admin
 */

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.error('Usage: node scripts/create-admin.js <email> <password> <full_name> <role>');
    console.error('Example: node scripts/create-admin.js admin@example.com password123 "Admin User" admin');
    process.exit(1);
  }

  const [email, password, fullName, role] = args;

  if (!['admin', 'superadmin'].includes(role)) {
    console.error('Role must be either "admin" or "superadmin"');
    process.exit(1);
  }

  try {
    console.log('Creating admin user...');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (authError) {
      console.error('Error creating auth user:', authError.message);
      process.exit(1);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Add user to admin table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role
      })
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin record:', adminError.message);
      
      // Clean up auth user if admin creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.log('🧹 Cleaned up auth user due to admin creation failure');
      process.exit(1);
    }

    console.log('✅ Admin record created successfully!');
    console.log('📋 Admin Details:');
    console.log(`   ID: ${adminData.id}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Full Name: ${adminData.full_name}`);
    console.log(`   Role: ${adminData.role}`);
    console.log(`   Created: ${adminData.created_at}`);
    console.log('');
    console.log('🎉 Admin user is ready to login!');

  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdmin();
