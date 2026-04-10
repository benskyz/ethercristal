#!/data/data/com.termux/files/usr/bin/bash

SUPABASE_URL="https://czmhgljqtumnbnmeiuzb.supabase.co"

printf "Colle ta clé ANON Supabase puis Enter: "
read -r SUPABASE_ANON_KEY

printf "Colle ton PAYMENT_WEBHOOK_SECRET puis Enter: "
read -r PAYMENT_WEBHOOK_SECRET

echo
echo "===== SHOP WEBHOOK TEST ====="

curl -s -X POST "$SUPABASE_URL/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" \
  --data-raw '{"paymentId":"c3f3c02a-8ae7-4abf-bb61-f33e333e6f77","eventType":"payment.completed","eventStatus":"paid","provider":"manual","providerEventId":"evt_support_shop_004_test5","providerPaymentId":"pay_support_shop_004_test5","rawPayload":{"source":"termux-test-shop-retry-3"}}'

echo
echo
echo "===== DONE ====="
