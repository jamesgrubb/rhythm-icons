#!/usr/bin/env node
// =============================================
//  test-auth.js — Acquire Azure AD token for API testing
//  Usage: node test-auth.js
// =============================================

const msal = require('@azure/msal-node');
require('dotenv').config();

const config = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'dbd0413f-9515-4bd1-945a-1948b655558b'}`,
  }
};

const pca = new msal.PublicClientApplication(config);

// Device code flow - user-friendly for CLI testing
async function getTokenDeviceCode() {
  const deviceCodeRequest = {
    deviceCodeCallback: (response) => {
      console.log('\n' + '='.repeat(60));
      console.log('AUTHENTICATION REQUIRED');
      console.log('='.repeat(60));
      console.log('\n📱 Please visit:', response.verificationUri);
      console.log('🔑 Enter code:', response.userCode);
      console.log('\n⏳ Waiting for authentication...\n');
    },
    scopes: [`api://${config.auth.clientId}/Icons.Read`],
  };

  try {
    const response = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
    return response;
  } catch (error) {
    console.error('❌ Error acquiring token:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n🔐 Azure AD Token Acquisition Test\n');
  console.log('Client ID:', config.auth.clientId);
  console.log('Tenant ID:', process.env.AZURE_TENANT_ID || 'dbd0413f-9515-4bd1-945a-1948b655558b');
  console.log('Scope:', `api://${config.auth.clientId}/Icons.Read`);

  try {
    const tokenResponse = await getTokenDeviceCode();

    console.log('\n' + '='.repeat(60));
    console.log('✅ TOKEN ACQUIRED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\n📋 Token Details:');
    console.log('   Account:', tokenResponse.account.username);
    console.log('   Scopes:', tokenResponse.scopes.join(', '));
    console.log('   Expires:', new Date(tokenResponse.expiresOn).toLocaleString());

    // Decode JWT to show claims
    const token = tokenResponse.accessToken;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    console.log('\n📜 Token Claims:');
    console.log('   Audience (aud):', payload.aud);
    console.log('   Issuer (iss):', payload.iss);
    console.log('   Subject (sub):', payload.sub);
    console.log('   Tenant ID (tid):', payload.tid);

    console.log('\n🧪 Test Commands:\n');
    console.log('# Test GET /api/icons');
    console.log(`curl -X GET http://localhost:3001/api/icons \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" | jq\n`);

    console.log('# Test GET /api/icons/:id (replace ICON_ID with actual ID)');
    console.log(`curl -X GET http://localhost:3001/api/icons/ICON_ID \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" | jq\n`);

    console.log('# Test POST /api/icons (create new icon)');
    console.log(`curl -X POST http://localhost:3001/api/icons \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"id":"test-icon","name":"Test Icon","category":"Test","svg":"<svg viewBox=\\"0 0 24 24\\"><circle cx=\\"12\\" cy=\\"12\\" r=\\"10\\"/></svg>"}' | jq\n`);

    // Save token to file for easy reuse
    const fs = require('fs');
    fs.writeFileSync('.test-token', token);
    console.log('💾 Token saved to .test-token\n');
    console.log('💡 Quick test: curl http://localhost:3001/api/icons -H "Authorization: Bearer $(cat .test-token)"\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
