/**
 * Script to check and display Stripe products/prices
 * Run with: tsx scripts/check-stripe-products.ts
 */

import Stripe from 'stripe';
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

async function checkProducts() {
  console.log('🔍 Checking Stripe Configuration...\n');

  const priceIds = {
    'Season Pass (Annual)': process.env.STRIPE_SEASON_ANNUAL_PRICE_ID,
    'Season Pass (Monthly)': process.env.STRIPE_SEASON_MONTHLY_PRICE_ID,
    'Unlimited (Annual)': process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
    'Unlimited (Monthly)': process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID,
  };

  console.log('📝 Configured Price IDs:\n');
  for (const [name, priceId] of Object.entries(priceIds)) {
    console.log(`  ${name}: ${priceId}`);
  }
  console.log('');

  console.log('🔎 Fetching product details from Stripe...\n');

  for (const [name, priceId] of Object.entries(priceIds)) {
    if (!priceId) {
      console.log(`❌ ${name}: No price ID configured\n`);
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product'],
      });

      const product = price.product as Stripe.Product;

      console.log(`✅ ${name}:`);
      console.log(`   Product ID: ${product.id}`);
      console.log(`   Product Name: ${product.name}`);
      console.log(`   Price: $${(price.unit_amount || 0) / 100}/${price.recurring?.interval || 'one-time'}`);
      console.log(`   Active: ${price.active ? 'Yes' : 'No'}`);
      console.log(`   Mode: ${price.livemode ? 'LIVE' : 'TEST'}`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ ${name}: Error - ${error.message}\n`);
    }
  }

  console.log('📊 All Products in Stripe:\n');
  try {
    const products = await stripe.products.list({ limit: 100 });

    if (products.data.length === 0) {
      console.log('   No products found in Stripe account');
    } else {
      for (const product of products.data) {
        console.log(`   • ${product.name} (${product.id})`);
        console.log(`     Active: ${product.active}, Created: ${new Date(product.created * 1000).toLocaleDateString()}`);
      }
    }
  } catch (error: any) {
    console.log(`   Error listing products: ${error.message}`);
  }

  console.log('\n💡 Stripe Dashboard Links:');
  const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live');
  const modePrefix = isLiveMode ? '' : 'test/';
  console.log(`   Products: https://dashboard.stripe.com/${modePrefix}products`);
  console.log(`   Prices: https://dashboard.stripe.com/${modePrefix}prices`);
}

checkProducts().catch(console.error);
